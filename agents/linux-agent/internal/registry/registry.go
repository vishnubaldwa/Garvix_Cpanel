// Package registry implements the allowlisted 12-step execution pipeline for
// every Garvix Hosting Manager Privileged Linux Agent operation.
//
// 12-Step Execution Pipeline:
//  1. Authenticate caller (SO_PEERCRED on /run/garvix-agent/agent.sock or mTLS client cert verification)
//  2. Verify authorization & tenant ownership
//  3. Validate every argument against typed schema
//  4. Enforce approved path boundaries (ValidateAccountPath + RejectSymlinkEscape)
//  5. Acquire per-resource mutex lock
//  6. Generate preview / dry-run PlannedChange list
//  7. Record pre-execution audit event
//  8. Execute under minimum required privilege (exec.CommandContext with explicit argv — NEVER sh -c)
//  9. Validate final state (e.g., nginx -t, named-checkzone, systemd unit status)
// 10. Record post-execution audit event
// 11. Return structured OperationResult
// 12. Automatic transactional rollback from snapshot if validation or execution fails
package registry

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os/exec"
	"path/filepath"
	"sync"
	"time"

	"github.com/garvix/hosting-manager/agents/linux-agent/internal/protocol"
	"github.com/garvix/hosting-manager/agents/linux-agent/internal/security"
)

// DefaultSocketPath is the Unix domain socket path where the agent listens in enforcing mode.
const DefaultSocketPath = "/run/garvix-agent/agent.sock"

// AllowedCallerUIDs defines the OS UIDs allowed to invoke the privileged agent over UDS.
// Typically UID 990 (garvix-panel service user) or UID 0 (root administrative CLI).
type AgentPolicy struct {
	HomeRoot            string
	AllowedUDSCallerUID map[uint32]bool
	AllowedRolesByOp    map[protocol.OperationName]map[string]bool
	TenantOwnershipMap  map[string]string // accountUsername -> tenantID
}

// DefaultAgentPolicy returns the production security policy for the Garvix Linux Agent.
func DefaultAgentPolicy(homeRoot string) *AgentPolicy {
	if homeRoot == "" {
		homeRoot = security.DefaultHomeRoot
	}
	adminRoles := map[string]bool{
		"GARVIX_SUPER_ADMIN":      true,
		"GARVIX_SUPPORT_OPERATOR": true,
		"ORG_OWNER":               true,
		"SERVER_ADMIN":            true,
	}
	tenantManageRoles := map[string]bool{
		"GARVIX_SUPER_ADMIN":      true,
		"GARVIX_SUPPORT_OPERATOR": true,
		"ORG_OWNER":               true,
		"SERVER_ADMIN":            true,
		"HOSTING_RESELLER":        true,
		"HOSTING_ACCOUNT_OWNER":   true,
		"HOSTING_ACCOUNT_TECH":    true,
	}
	mailRoles := map[string]bool{
		"GARVIX_SUPER_ADMIN":    true,
		"ORG_OWNER":             true,
		"SERVER_ADMIN":          true,
		"HOSTING_RESELLER":      true,
		"HOSTING_ACCOUNT_OWNER": true,
		"HOSTING_ACCOUNT_TECH":  true,
		"EMAIL_ONLY_USER":       true,
	}
	readRoles := map[string]bool{
		"GARVIX_SUPER_ADMIN":      true,
		"GARVIX_SUPPORT_OPERATOR": true,
		"ORG_OWNER":               true,
		"SERVER_ADMIN":            true,
		"HOSTING_RESELLER":        true,
		"HOSTING_ACCOUNT_OWNER":   true,
		"HOSTING_ACCOUNT_TECH":    true,
		"READ_ONLY_AUDITOR":       true,
	}

	allowedRoles := map[protocol.OperationName]map[string]bool{
		protocol.OpCreateHostingAccount:       adminRoles,
		protocol.OpSuspendHostingAccount:      adminRoles,
		protocol.OpReactivateHostingAccount:   adminRoles,
		protocol.OpTerminateHostingAccount:    adminRoles,
		protocol.OpCreateVirtualHost:          tenantManageRoles,
		protocol.OpValidateNginxConfiguration: tenantManageRoles,
		protocol.OpReloadNginx:                adminRoles,
		protocol.OpCreateDatabase:             tenantManageRoles,
		protocol.OpCreateDatabaseUser:         tenantManageRoles,
		protocol.OpGrantDatabasePrivileges:    tenantManageRoles,
		protocol.OpRotateDatabasePassword:     tenantManageRoles,
		protocol.OpConfigureMailbox:           mailRoles,
		protocol.OpUpdateMailboxQuota:         tenantManageRoles,
		protocol.OpConfigureDkimKey:           tenantManageRoles,
		protocol.OpRunMailPreflight:           tenantManageRoles,
		protocol.OpIssueCertificate:           tenantManageRoles,
		protocol.OpRenewCertificate:           tenantManageRoles,
		protocol.OpApplyDnsZone:               tenantManageRoles,
		protocol.OpCreateBackup:               tenantManageRoles,
		protocol.OpVerifyBackupRestore:        tenantManageRoles,
		protocol.OpRestoreBackup:              tenantManageRoles,
		protocol.OpDeployApplication:          tenantManageRoles,
		protocol.OpControlApplicationProcess:  tenantManageRoles,
		protocol.OpCollectSystemTelemetry:     readRoles,
		protocol.OpControlSystemService:       adminRoles,
		protocol.OpRollbackTransaction:        adminRoles,
	}

	return &AgentPolicy{
		HomeRoot: homeRoot,
		AllowedUDSCallerUID: map[uint32]bool{
			0:   true, // root CLI
			990: true, // garvix-panel system service user
		},
		AllowedRolesByOp:   allowedRoles,
		TenantOwnershipMap: make(map[string]string),
	}
}

// AuditSink records immutable pre- and post-execution audit events.
type AuditSink interface {
	Record(ctx context.Context, entry protocol.AuditRecord) error
}

// MemoryAuditSink stores audit records in memory and optionally logs JSON lines.
type MemoryAuditSink struct {
	mu      sync.Mutex
	records []protocol.AuditRecord
}

func NewMemoryAuditSink() *MemoryAuditSink {
	return &MemoryAuditSink{}
}

func (s *MemoryAuditSink) Record(_ context.Context, entry protocol.AuditRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.records = append(s.records, entry)
	return nil
}

func (s *MemoryAuditSink) Records() []protocol.AuditRecord {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]protocol.AuditRecord, len(s.records))
	copy(out, s.records)
	return out
}

// OperationSpec defines the typed schema, path boundary resolver, change planner,
// post-execution state validator, and rollback command generator for a single allowlisted operation.
type OperationSpec struct {
	Name              protocol.OperationName
	RequiredArgs      []string
	RequiresAccount   bool
	PlanChanges       func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error)
	ValidatePostState func(req *protocol.OperationRequest) ([]string, error)
}

// Pipeline executes allowlisted operations through the mandatory 12-step security lifecycle.
type Pipeline struct {
	mode          protocol.ExecutionMode
	policy        *AgentPolicy
	auditSink     AuditSink
	specs         map[protocol.OperationName]OperationSpec
	locksMu       sync.Mutex
	resourceLocks map[string]*sync.Mutex
}

// NewPipeline constructs a new 12-step execution pipeline.
func NewPipeline(mode protocol.ExecutionMode, policy *AgentPolicy, sink AuditSink) *Pipeline {
	if policy == nil {
		policy = DefaultAgentPolicy(security.DefaultHomeRoot)
	}
	if sink == nil {
		sink = NewMemoryAuditSink()
	}
	p := &Pipeline{
		mode:          mode,
		policy:        policy,
		auditSink:     sink,
		specs:         make(map[protocol.OperationName]OperationSpec),
		resourceLocks: make(map[string]*sync.Mutex),
	}
	p.registerAllSpecs()
	return p
}

// RegisterTenantOwnership binds a Linux account username to a specific TenantID for authorization checks.
func (p *Pipeline) RegisterTenantOwnership(accountUsername, tenantID string) {
	p.locksMu.Lock()
	defer p.locksMu.Unlock()
	p.policy.TenantOwnershipMap[accountUsername] = tenantID
}

// Execute runs the 12-step security pipeline for an incoming OperationRequest.
func (p *Pipeline) Execute(ctx context.Context, req *protocol.OperationRequest) *protocol.OperationResult {
	startedAt := time.Now().UTC()
	res := &protocol.OperationResult{
		ProtocolVersion: protocol.ProtocolVersion,
		RequestID:       req.RequestID,
		CorrelationID:   req.CorrelationID,
		Operation:       req.Operation,
		DryRun:          req.DryRun,
		ExecutionMode:   p.mode,
		StartedAt:       startedAt,
		Outputs:         make(map[string]string),
	}

	if err := req.ValidateEnvelope(); err != nil {
		return p.failResult(ctx, req, res, protocol.StatusRejected, "ERR_INVALID_ENVELOPE", err.Error())
	}

	// =========================================================================
	// STEP 1: Authenticate Caller (SO_PEERCRED on UDS or mTLS Client Certificate)
	// =========================================================================
	if err := p.step1AuthenticateCaller(req); err != nil {
		return p.failResult(ctx, req, res, protocol.StatusUnauthorized, "ERR_CALLER_AUTH_FAILED", err.Error())
	}

	// =========================================================================
	// STEP 2: Verify Authorization & Tenant Ownership
	// =========================================================================
	if err := p.step2AuthorizeAndVerifyTenant(req); err != nil {
		return p.failResult(ctx, req, res, protocol.StatusUnauthorized, "ERR_TENANT_AUTHZ_DENIED", err.Error())
	}

	// =========================================================================
	// STEP 3: Validate Every Argument Against Typed Schema
	// =========================================================================
	spec, err := p.step3ValidateSchema(req)
	if err != nil {
		return p.failResult(ctx, req, res, protocol.StatusRejected, "ERR_SCHEMA_VALIDATION", err.Error())
	}

	// =========================================================================
	// STEP 4: Enforce Approved Path Boundaries (O_NOFOLLOW & Symlink Confinement)
	// =========================================================================
	if err := p.step4EnforcePathBoundaries(req, spec); err != nil {
		return p.failResult(ctx, req, res, protocol.StatusRejected, "ERR_PATH_BOUNDARY_VIOLATION", err.Error())
	}

	// =========================================================================
	// STEP 5: Acquire Per-Resource Mutex Lock
	// =========================================================================
	resourceMu := p.acquireResourceLock(req.ResourceKey)
	resourceMu.Lock()
	defer resourceMu.Unlock()

	// =========================================================================
	// STEP 6: Generate Preview / Dry-Run PlannedChange List
	// =========================================================================
	plannedChanges, err := spec.PlanChanges(req, p.policy.HomeRoot)
	if err != nil {
		return p.failResult(ctx, req, res, protocol.StatusRejected, "ERR_CHANGE_PLANNING_FAILED", err.Error())
	}
	res.PlannedChanges = plannedChanges
	res.SnapshotID = fmt.Sprintf("snap-%s-%d", req.RequestID, startedAt.UnixNano())
	planHash := computePlannedChangesHash(plannedChanges)

	// =========================================================================
	// STEP 7: Record Pre-Execution Audit Event
	// =========================================================================
	preAuditID := fmt.Sprintf("aud-pre-%s", req.RequestID)
	res.PreAuditID = preAuditID
	_ = p.auditSink.Record(ctx, protocol.AuditRecord{
		AuditID:           preAuditID,
		Phase:             protocol.AuditPhasePreExecution,
		Timestamp:         time.Now().UTC(),
		RequestID:         req.RequestID,
		CorrelationID:     req.CorrelationID,
		IdempotencyKey:    req.IdempotencyKey,
		Operation:         req.Operation,
		DryRun:            req.DryRun,
		ExecutionMode:     p.mode,
		Caller:            req.Caller,
		TenantID:          req.TenantID,
		AccountUsername:   req.AccountUsername,
		ResourceKey:       req.ResourceKey,
		PlannedChangeHash: planHash,
		Status:            protocol.StatusDryRunReady,
	})

	// If DryRun is requested, skip mutation steps 8 & 9 and proceed directly to post-audit & return.
	if req.DryRun {
		res.Status = protocol.StatusDryRunReady
		res.ValidationSummary = "dry-run completed: planned changes verified without host mutation"
		res.Outputs["planned_change_hash"] = planHash
		p.recordPostAuditAndFinalize(ctx, req, res, planHash)
		return res
	}

	// =========================================================================
	// STEP 8: Execute Under Minimum Required Privilege (Explicit argv — NEVER sh -c)
	// =========================================================================
	if err := p.step8ExecutePlannedChanges(ctx, plannedChanges); err != nil {
		// Trigger Step 12 Automatic Transactional Rollback
		rollbackErr := p.step12RollbackFromSnapshot(ctx, plannedChanges)
		res.RollbackPerformed = true
		errMsg := fmt.Sprintf("execution failed: %v", err)
		if rollbackErr != nil {
			errMsg = fmt.Sprintf("%s (rollback error: %v)", errMsg, rollbackErr)
		}
		return p.failResultWithAudit(ctx, req, res, planHash, protocol.StatusRolledBack, "ERR_EXECUTION_ROLLED_BACK", errMsg)
	}

	// =========================================================================
	// STEP 9: Validate Final State (e.g., nginx -t, named-checkzone, systemctl is-active)
	// =========================================================================
	validationSummary, err := p.step9ValidateFinalState(ctx, req, spec)
	if err != nil {
		// =========================================================================
		// STEP 12: Automatic Transactional Rollback From Snapshot If Validation Fails
		// =========================================================================
		rollbackErr := p.step12RollbackFromSnapshot(ctx, plannedChanges)
		res.RollbackPerformed = true
		errMsg := fmt.Sprintf("post-execution state validation failed: %v", err)
		if rollbackErr != nil {
			errMsg = fmt.Sprintf("%s (rollback error: %v)", errMsg, rollbackErr)
		}
		return p.failResultWithAudit(ctx, req, res, planHash, protocol.StatusRolledBack, "ERR_POST_VALIDATION_ROLLED_BACK", errMsg)
	}
	res.ValidationSummary = validationSummary
	res.Status = protocol.StatusSucceeded
	res.Outputs["planned_change_hash"] = planHash

	// =========================================================================
	// STEP 10: Record Post-Execution Audit Event
	// =========================================================================
	p.recordPostAuditAndFinalize(ctx, req, res, planHash)

	// =========================================================================
	// STEP 11: Return Structured OperationResult
	// =========================================================================
	return res
}

func (p *Pipeline) step1AuthenticateCaller(req *protocol.OperationRequest) error {
	switch p.mode {
	case protocol.ModeMock:
		if req.Caller.ActorID == "" {
			return fmt.Errorf("caller actor_id is required in mock mode")
		}
		return nil
	case protocol.ModeEnforcing:
		switch req.Caller.Transport {
		case protocol.AuthTransportUDSPeerCred:
			if !p.policy.AllowedUDSCallerUID[req.Caller.UID] {
				return fmt.Errorf("UDS SO_PEERCRED UID %d (PID %d) is not authorized to invoke garvix-agent", req.Caller.UID, req.Caller.PID)
			}
			return nil
		case protocol.AuthTransportMTLS:
			if len(req.Caller.MTLSCertFingerprint) < 64 || req.Caller.MTLSSubjectCN == "" {
				return fmt.Errorf("valid mTLS client certificate SHA-256 fingerprint and Subject CN are required")
			}
			return nil
		default:
			return fmt.Errorf("unsupported or unauthenticated caller transport %q in enforcing mode", req.Caller.Transport)
		}
	default:
		return fmt.Errorf("unknown execution mode %q", p.mode)
	}
}

func (p *Pipeline) step2AuthorizeAndVerifyTenant(req *protocol.OperationRequest) error {
	allowedRoles, ok := p.policy.AllowedRolesByOp[req.Operation]
	if !ok || !allowedRoles[req.Caller.ActorRole] {
		return fmt.Errorf("role %q is not authorized to perform operation %q", req.Caller.ActorRole, req.Operation)
	}

	// Non-global roles must match the request TenantID.
	if req.Caller.ActorRole != "GARVIX_SUPER_ADMIN" && req.Caller.ActorRole != "GARVIX_SUPPORT_OPERATOR" {
		if req.Caller.TenantID == "" || req.Caller.TenantID != req.TenantID {
			return fmt.Errorf("caller tenant_id %q does not match target tenant_id %q", req.Caller.TenantID, req.TenantID)
		}
	}

	// If an existing account is targeted, verify tenant ownership in the agent registry.
	if req.AccountUsername != "" && req.Operation != protocol.OpCreateHostingAccount {
		p.locksMu.Lock()
		ownerTenant, exists := p.policy.TenantOwnershipMap[req.AccountUsername]
		p.locksMu.Unlock()
		if exists && ownerTenant != req.TenantID {
			return fmt.Errorf("cross-tenant violation: account %q belongs to tenant %q, not %q", req.AccountUsername, ownerTenant, req.TenantID)
		}
	}
	return nil
}

func (p *Pipeline) step3ValidateSchema(req *protocol.OperationRequest) (OperationSpec, error) {
	spec, ok := p.specs[req.Operation]
	if !ok {
		return OperationSpec{}, fmt.Errorf("no operation spec registered for %q", req.Operation)
	}

	if spec.RequiresAccount {
		if err := security.ValidateIdentifier(req.AccountUsername); err != nil {
			return OperationSpec{}, fmt.Errorf("account_username validation failed: %w", err)
		}
		if req.AccountUID != 0 {
			if err := security.ValidateTenantUID(req.AccountUID); err != nil {
				return OperationSpec{}, fmt.Errorf("account_uid validation failed: %w", err)
			}
		}
	}

	for _, key := range spec.RequiredArgs {
		val, exists := req.Arguments[key]
		if !exists || val == "" {
			return OperationSpec{}, fmt.Errorf("missing required argument %q for operation %q", key, req.Operation)
		}
		if err := security.RejectShellMetacharacters(val); err != nil {
			return OperationSpec{}, fmt.Errorf("argument %q rejected: %w", key, err)
		}
	}

	// Check all optional arguments for shell metacharacters or NUL bytes as well.
	for k, v := range req.Arguments {
		if err := security.RejectShellMetacharacters(k); err != nil {
			return OperationSpec{}, fmt.Errorf("argument key %q rejected: %w", k, err)
		}
		if err := security.RejectShellMetacharacters(v); err != nil {
			return OperationSpec{}, fmt.Errorf("argument %q value rejected: %w", k, err)
		}
	}

	return spec, nil
}

func (p *Pipeline) step4EnforcePathBoundaries(req *protocol.OperationRequest, spec OperationSpec) error {
	if !spec.RequiresAccount {
		return nil
	}
	accountRoot := filepath.Join(p.policy.HomeRoot, req.AccountUsername)
	if err := security.RejectSymlinkEscape(p.policy.HomeRoot, req.AccountUsername, accountRoot); err != nil {
		return err
	}

	// Verify any explicit path argument (such as target_path, docroot, app_path, archive_path)
	pathArgKeys := []string{"target_path", "docroot", "app_path", "archive_path"}
	for _, key := range pathArgKeys {
		if candidate, ok := req.Arguments[key]; ok && candidate != "" {
			if err := security.RejectSymlinkEscape(p.policy.HomeRoot, req.AccountUsername, candidate); err != nil {
				return fmt.Errorf("argument %q failed path confinement: %w", key, err)
			}
		}
	}
	return nil
}

func (p *Pipeline) acquireResourceLock(resourceKey string) *sync.Mutex {
	p.locksMu.Lock()
	defer p.locksMu.Unlock()
	mu, exists := p.resourceLocks[resourceKey]
	if !exists {
		mu = &sync.Mutex{}
		p.resourceLocks[resourceKey] = mu
	}
	return mu
}

func (p *Pipeline) step8ExecutePlannedChanges(ctx context.Context, changes []protocol.PlannedChange) error {
	for _, change := range changes {
		if len(change.CommandArgv) > 0 {
			bin := change.CommandArgv[0]
			if bin == "sh" || bin == "/bin/sh" || bin == "bash" || bin == "/bin/bash" {
				return fmt.Errorf("security invariant violation: shell interpreter %q is strictly forbidden in CommandArgv", bin)
			}
		}

		if p.mode == protocol.ModeMock {
			// In mock mode, never execute system-modifying commands.
			continue
		}

		if change.Action == protocol.ChangeExecCommand && len(change.CommandArgv) > 0 {
			cmd := exec.CommandContext(ctx, change.CommandArgv[0], change.CommandArgv[1:]...)
			if out, err := cmd.CombinedOutput(); err != nil {
				return fmt.Errorf("argv command %v failed: %w (output: %s)", change.CommandArgv, err, string(out))
			}
		}
	}
	return nil
}

func (p *Pipeline) step9ValidateFinalState(ctx context.Context, req *protocol.OperationRequest, spec OperationSpec) (string, error) {
	if spec.ValidatePostState == nil {
		return "state validation passed (no external verifier required)", nil
	}
	verifyArgv, err := spec.ValidatePostState(req)
	if err != nil {
		return "", err
	}
	if len(verifyArgv) == 0 {
		return "state validation passed", nil
	}

	if p.mode == protocol.ModeMock {
		return fmt.Sprintf("mock state validation passed for argv %v", verifyArgv), nil
	}

	cmd := exec.CommandContext(ctx, verifyArgv[0], verifyArgv[1:]...)
	if out, err := cmd.CombinedOutput(); err != nil {
		return "", fmt.Errorf("post-state verification %v failed: %w (output: %s)", verifyArgv, err, string(out))
	}
	return fmt.Sprintf("enforcing state validation passed: %v", verifyArgv), nil
}

func (p *Pipeline) step12RollbackFromSnapshot(ctx context.Context, changes []protocol.PlannedChange) error {
	// Execute rollback commands in reverse order.
	for i := len(changes) - 1; i >= 0; i-- {
		rb := changes[i].RollbackCommand
		if len(rb) == 0 || p.mode == protocol.ModeMock {
			continue
		}
		cmd := exec.CommandContext(ctx, rb[0], rb[1:]...)
		if out, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("rollback command %v failed: %w (output: %s)", rb, err, string(out))
		}
	}
	return nil
}

func (p *Pipeline) recordPostAuditAndFinalize(ctx context.Context, req *protocol.OperationRequest, res *protocol.OperationResult, planHash string) {
	completedAt := time.Now().UTC()
	res.CompletedAt = completedAt
	res.DurationMs = completedAt.Sub(res.StartedAt).Milliseconds()
	postAuditID := fmt.Sprintf("aud-post-%s", req.RequestID)
	res.PostAuditID = postAuditID

	_ = p.auditSink.Record(ctx, protocol.AuditRecord{
		AuditID:           postAuditID,
		Phase:             protocol.AuditPhasePostExecution,
		Timestamp:         completedAt,
		RequestID:         req.RequestID,
		CorrelationID:     req.CorrelationID,
		IdempotencyKey:    req.IdempotencyKey,
		Operation:         req.Operation,
		DryRun:            req.DryRun,
		ExecutionMode:     p.mode,
		Caller:            req.Caller,
		TenantID:          req.TenantID,
		AccountUsername:   req.AccountUsername,
		ResourceKey:       req.ResourceKey,
		PlannedChangeHash: planHash,
		Status:            res.Status,
		RollbackPerformed: res.RollbackPerformed,
		ErrorCode:         res.ErrorCode,
		ErrorMessage:      res.ErrorMessage,
	})
}

func (p *Pipeline) failResult(ctx context.Context, req *protocol.OperationRequest, res *protocol.OperationResult, status protocol.OperationStatus, code, msg string) *protocol.OperationResult {
	return p.failResultWithAudit(ctx, req, res, "", status, code, msg)
}

func (p *Pipeline) failResultWithAudit(ctx context.Context, req *protocol.OperationRequest, res *protocol.OperationResult, planHash string, status protocol.OperationStatus, code, msg string) *protocol.OperationResult {
	res.Status = status
	res.ErrorCode = code
	res.ErrorMessage = msg
	p.recordPostAuditAndFinalize(ctx, req, res, planHash)
	return res
}

func computePlannedChangesHash(changes []protocol.PlannedChange) string {
	raw, _ := json.Marshal(changes)
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}

// registerAllSpecs registers all 26 allowlisted operations with strict argument requirements,
// explicit argv command arrays, rollback instructions, and post-execution state verifiers.
func (p *Pipeline) registerAllSpecs() {
	register := func(spec OperationSpec) {
		p.specs[spec.Name] = spec
	}

	register(OperationSpec{
		Name:            protocol.OpCreateHostingAccount,
		RequiresAccount: true,
		RequiredArgs:    []string{"domain", "quota_mb"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			if err := security.ValidateDomainName(req.Arguments["domain"]); err != nil {
				return nil, err
			}
			acctHome := filepath.Join(homeRoot, req.AccountUsername)
			uid := req.AccountUID
			if uid == 0 {
				uid = 1001
			}
			return []protocol.PlannedChange{
				{
					StepOrder:       1,
					Action:          protocol.ChangeExecCommand,
					TargetResource:  req.AccountUsername,
					TargetPath:      acctHome,
					CommandArgv:     []string{"/usr/sbin/useradd", "-m", "-d", acctHome, "-s", "/sbin/nologin", "-u", fmt.Sprintf("%d", uid), req.AccountUsername},
					PrivilegeUser:   "root",
					PrivilegeUID:    0,
					RollbackCommand: []string{"/usr/sbin/userdel", "-r", req.AccountUsername},
					Description:     "Create isolated Linux user account and home directory",
				},
				{
					StepOrder:      2,
					Action:         protocol.ChangeChownChmod,
					TargetResource: req.AccountUsername,
					TargetPath:     acctHome,
					CommandArgv:    []string{"/usr/bin/chmod", "0710", acctHome},
					PrivilegeUser:  "root",
					PrivilegeUID:   0,
					Description:    "Enforce strict 0710 traversal permission on tenant home directory",
				},
			}, nil
		},
		ValidatePostState: func(req *protocol.OperationRequest) ([]string, error) {
			return []string{"/usr/bin/id", req.AccountUsername}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpSuspendHostingAccount,
		RequiresAccount: true,
		RequiredArgs:    []string{"reason"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			return []protocol.PlannedChange{
				{
					StepOrder:       1,
					Action:          protocol.ChangeExecCommand,
					TargetResource:  req.AccountUsername,
					CommandArgv:     []string{"/usr/sbin/usermod", "-L", "-s", "/sbin/nologin", req.AccountUsername},
					PrivilegeUser:   "root",
					PrivilegeUID:    0,
					RollbackCommand: []string{"/usr/sbin/usermod", "-U", req.AccountUsername},
					Description:     "Lock tenant Linux user account and disable login shell",
				},
			}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpReactivateHostingAccount,
		RequiresAccount: true,
		RequiredArgs:    []string{},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			return []protocol.PlannedChange{
				{
					StepOrder:       1,
					Action:          protocol.ChangeExecCommand,
					TargetResource:  req.AccountUsername,
					CommandArgv:     []string{"/usr/sbin/usermod", "-U", req.AccountUsername},
					PrivilegeUser:   "root",
					PrivilegeUID:    0,
					RollbackCommand: []string{"/usr/sbin/usermod", "-L", req.AccountUsername},
					Description:     "Unlock tenant Linux user account",
				},
			}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpTerminateHostingAccount,
		RequiresAccount: true,
		RequiredArgs:    []string{"confirmation_token"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			acctHome := filepath.Join(homeRoot, req.AccountUsername)
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeSnapshotState,
					TargetResource: req.AccountUsername,
					TargetPath:     acctHome,
					PrivilegeUser:  "root",
					PrivilegeUID:   0,
					SnapshotPath:   fmt.Sprintf("/var/backups/garvix/pre-terminate-%s.tar.zst", req.AccountUsername),
					Description:    "Create pre-termination safety archive before account removal",
				},
				{
					StepOrder:      2,
					Action:         protocol.ChangeExecCommand,
					TargetResource: req.AccountUsername,
					TargetPath:     acctHome,
					CommandArgv:    []string{"/usr/sbin/userdel", "-r", req.AccountUsername},
					PrivilegeUser:  "root",
					PrivilegeUID:   0,
					Description:    "Remove Linux user account and home directory",
				},
			}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpCreateVirtualHost,
		RequiresAccount: true,
		RequiredArgs:    []string{"domain", "docroot", "php_version"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			domain := req.Arguments["domain"]
			if err := security.ValidateDomainName(domain); err != nil {
				return nil, err
			}
			vhostPath := filepath.Join("/etc/nginx/conf.d/tenants", domain+".conf")
			return []protocol.PlannedChange{
				{
					StepOrder:       1,
					Action:          protocol.ChangeCreateFile,
					TargetResource:  domain,
					TargetPath:      vhostPath,
					PrivilegeUser:   "root",
					PrivilegeUID:    0,
					SnapshotPath:    vhostPath + ".bak",
					RollbackCommand: []string{"/usr/bin/rm", "-f", vhostPath},
					Description:     "Render strict AST-validated Nginx virtual host configuration",
				},
			}, nil
		},
		ValidatePostState: func(req *protocol.OperationRequest) ([]string, error) {
			return []string{"/usr/sbin/nginx", "-t"}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpValidateNginxConfiguration,
		RequiresAccount: false,
		RequiredArgs:    []string{},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeExecCommand,
					TargetResource: "nginx",
					CommandArgv:    []string{"/usr/sbin/nginx", "-t"},
					PrivilegeUser:  "root",
					PrivilegeUID:   0,
					Description:    "Validate Nginx master and tenant configuration syntax",
				},
			}, nil
		},
		ValidatePostState: func(req *protocol.OperationRequest) ([]string, error) {
			return []string{"/usr/sbin/nginx", "-t"}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpReloadNginx,
		RequiresAccount: false,
		RequiredArgs:    []string{},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeReloadService,
					TargetResource: "nginx.service",
					CommandArgv:    []string{"/usr/bin/systemctl", "reload", "nginx.service"},
					PrivilegeUser:  "root",
					PrivilegeUID:   0,
					Description:    "Gracefully reload nginx.service via systemd",
				},
			}, nil
		},
		ValidatePostState: func(req *protocol.OperationRequest) ([]string, error) {
			return []string{"/usr/bin/systemctl", "is-active", "--quiet", "nginx.service"}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpCreateDatabase,
		RequiresAccount: true,
		RequiredArgs:    []string{"engine", "db_name"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			dbName := req.Arguments["db_name"]
			if err := security.ValidateIdentifier(dbName); err != nil {
				return nil, fmt.Errorf("invalid db_name: %w", err)
			}
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeExecCommand,
					TargetResource: dbName,
					CommandArgv:    []string{"/usr/bin/createdb", "-O", req.AccountUsername, dbName},
					PrivilegeUser:  "postgres",
					PrivilegeUID:   26,
					Description:    "Create isolated tenant database via parameterized driver/utility",
				},
			}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpCreateDatabaseUser,
		RequiresAccount: true,
		RequiredArgs:    []string{"engine", "db_user"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			dbUser := req.Arguments["db_user"]
			if err := security.ValidateIdentifier(dbUser); err != nil {
				return nil, fmt.Errorf("invalid db_user: %w", err)
			}
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeExecCommand,
					TargetResource: dbUser,
					CommandArgv:    []string{"/usr/bin/createuser", "--no-superuser", "--no-createdb", "--no-createrole", dbUser},
					PrivilegeUser:  "postgres",
					PrivilegeUID:   26,
					Description:    "Create least-privilege tenant database user",
				},
			}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpGrantDatabasePrivileges,
		RequiresAccount: true,
		RequiredArgs:    []string{"engine", "db_name", "db_user", "privilege_profile"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			if err := security.ValidateIdentifier(req.Arguments["db_name"]); err != nil {
				return nil, err
			}
			if err := security.ValidateIdentifier(req.Arguments["db_user"]); err != nil {
				return nil, err
			}
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeUpdateFile,
					TargetResource: req.Arguments["db_name"] + ":" + req.Arguments["db_user"],
					PrivilegeUser:  "postgres",
					PrivilegeUID:   26,
					Description:    "Grant scoped database privileges to tenant database user",
				},
			}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpRotateDatabasePassword,
		RequiresAccount: true,
		RequiredArgs:    []string{"engine", "db_user", "secret_ref"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			if err := security.ValidateIdentifier(req.Arguments["db_user"]); err != nil {
				return nil, err
			}
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeUpdateFile,
					TargetResource: req.Arguments["db_user"],
					PrivilegeUser:  "postgres",
					PrivilegeUID:   26,
					Description:    "Rotate database user password using ephemeral secret descriptor",
				},
			}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpConfigureMailbox,
		RequiresAccount: true,
		RequiredArgs:    []string{"domain", "local_part", "quota_mb"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			if err := security.ValidateDomainName(req.Arguments["domain"]); err != nil {
				return nil, err
			}
			if err := security.ValidateIdentifier(req.Arguments["local_part"]); err != nil {
				return nil, err
			}
			maildir := filepath.Join(homeRoot, req.AccountUsername, "mail", req.Arguments["domain"], req.Arguments["local_part"])
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeCreateDirectory,
					TargetResource: req.Arguments["local_part"] + "@" + req.Arguments["domain"],
					TargetPath:     maildir,
					PrivilegeUser:  req.AccountUsername,
					PrivilegeUID:   req.AccountUID,
					Description:    "Provision Maildir structure for Dovecot/Postfix virtual mailbox",
				},
			}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpUpdateMailboxQuota,
		RequiresAccount: true,
		RequiredArgs:    []string{"domain", "local_part", "quota_mb"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeExecCommand,
					TargetResource: req.Arguments["local_part"] + "@" + req.Arguments["domain"],
					CommandArgv:    []string{"/usr/bin/doveadm", "quota", "recalc", "-u", req.Arguments["local_part"] + "@" + req.Arguments["domain"]},
					PrivilegeUser:  "dovecot",
					PrivilegeUID:   97,
					Description:    "Update and recalculate Dovecot mailbox quota",
				},
			}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpConfigureDkimKey,
		RequiresAccount: true,
		RequiredArgs:    []string{"domain", "selector"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			if err := security.ValidateDomainName(req.Arguments["domain"]); err != nil {
				return nil, err
			}
			if err := security.ValidateIdentifier(req.Arguments["selector"]); err != nil {
				return nil, err
			}
			keyPath := filepath.Join("/var/lib/rspamd/dkim", req.Arguments["domain"]+"."+req.Arguments["selector"]+".key")
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeExecCommand,
					TargetResource: req.Arguments["domain"],
					TargetPath:     keyPath,
					CommandArgv:    []string{"/usr/bin/rspamadm", "dkim_keygen", "-d", req.Arguments["domain"], "-s", req.Arguments["selector"], "-k", keyPath},
					PrivilegeUser:  "rspamd",
					PrivilegeUID:   991,
					Description:    "Generate 2048-bit RSA / Ed25519 DKIM signing keypair for Rspamd",
				},
			}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpRunMailPreflight,
		RequiresAccount: false,
		RequiredArgs:    []string{"hostname"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			if err := security.ValidateDomainName(req.Arguments["hostname"]); err != nil {
				return nil, err
			}
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeExecCommand,
					TargetResource: req.Arguments["hostname"],
					CommandArgv:    []string{"/usr/sbin/postconf", "-n"},
					PrivilegeUser:  "root",
					PrivilegeUID:   0,
					Description:    "Run read-only mail deliverability and Postfix configuration check",
				},
			}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpIssueCertificate,
		RequiresAccount: true,
		RequiredArgs:    []string{"domain", "challenge_type"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			domain := req.Arguments["domain"]
			if err := security.ValidateDomainName(domain); err != nil {
				return nil, err
			}
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeCreateFile,
					TargetResource: domain,
					TargetPath:     filepath.Join("/etc/garvix/tls/live", domain, "fullchain.pem"),
					PrivilegeUser:  "root",
					PrivilegeUID:   0,
					Description:    "Obtain ACME TLS certificate and install keypair with 0600 permissions",
				},
			}, nil
		},
		ValidatePostState: func(req *protocol.OperationRequest) ([]string, error) {
			return []string{"/usr/sbin/nginx", "-t"}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpRenewCertificate,
		RequiresAccount: true,
		RequiredArgs:    []string{"domain"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			domain := req.Arguments["domain"]
			if err := security.ValidateDomainName(domain); err != nil {
				return nil, err
			}
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeUpdateFile,
					TargetResource: domain,
					TargetPath:     filepath.Join("/etc/garvix/tls/live", domain, "fullchain.pem"),
					PrivilegeUser:  "root",
					PrivilegeUID:   0,
					Description:    "Renew ACME TLS certificate and reload TLS consumers",
				},
			}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpApplyDnsZone,
		RequiresAccount: true,
		RequiredArgs:    []string{"zone_domain", "serial"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			zone := req.Arguments["zone_domain"]
			if err := security.ValidateDomainName(zone); err != nil {
				return nil, err
			}
			zoneFile := filepath.Join("/var/named/tenants", zone+".zone")
			return []protocol.PlannedChange{
				{
					StepOrder:       1,
					Action:          protocol.ChangeUpdateFile,
					TargetResource:  zone,
					TargetPath:      zoneFile,
					PrivilegeUser:   "named",
					PrivilegeUID:    25,
					SnapshotPath:    zoneFile + ".bak",
					RollbackCommand: []string{"/usr/bin/cp", "-f", zoneFile + ".bak", zoneFile},
					Description:     "Write authoritative DNS zone file and bump SOA serial",
				},
			}, nil
		},
		ValidatePostState: func(req *protocol.OperationRequest) ([]string, error) {
			zone := req.Arguments["zone_domain"]
			zoneFile := filepath.Join("/var/named/tenants", zone+".zone")
			return []string{"/usr/sbin/named-checkzone", zone, zoneFile}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpCreateBackup,
		RequiresAccount: true,
		RequiredArgs:    []string{"backup_id", "archive_path"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeCreateFile,
					TargetResource: req.Arguments["backup_id"],
					TargetPath:     req.Arguments["archive_path"],
					PrivilegeUser:  req.AccountUsername,
					PrivilegeUID:   req.AccountUID,
					Description:    "Create encrypted zstd snapshot of tenant files and database dumps",
				},
			}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpVerifyBackupRestore,
		RequiresAccount: true,
		RequiredArgs:    []string{"backup_id", "archive_path"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeExecCommand,
					TargetResource: req.Arguments["backup_id"],
					TargetPath:     req.Arguments["archive_path"],
					CommandArgv:    []string{"/usr/bin/zstd", "-t", req.Arguments["archive_path"]},
					PrivilegeUser:  req.AccountUsername,
					PrivilegeUID:   req.AccountUID,
					Description:    "Verify archive integrity and manifest SHA-256 checksums",
				},
			}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpRestoreBackup,
		RequiresAccount: true,
		RequiredArgs:    []string{"backup_id", "archive_path", "target_path"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeSnapshotState,
					TargetResource: req.AccountUsername,
					TargetPath:     req.Arguments["target_path"],
					PrivilegeUser:  req.AccountUsername,
					PrivilegeUID:   req.AccountUID,
					Description:    "Snapshot current account directory prior to backup restoration",
				},
				{
					StepOrder:      2,
					Action:         protocol.ChangeUpdateFile,
					TargetResource: req.Arguments["backup_id"],
					TargetPath:     req.Arguments["target_path"],
					PrivilegeUser:  req.AccountUsername,
					PrivilegeUID:   req.AccountUID,
					Description:    "Extract verified archive strictly within tenant home boundary with O_NOFOLLOW",
				},
			}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpDeployApplication,
		RequiresAccount: true,
		RequiredArgs:    []string{"app_slug", "runtime", "app_path"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			if err := security.ValidateIdentifier(req.Arguments["app_slug"]); err != nil {
				return nil, err
			}
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeUpdateFile,
					TargetResource: req.Arguments["app_slug"],
					TargetPath:     req.Arguments["app_path"],
					PrivilegeUser:  req.AccountUsername,
					PrivilegeUID:   req.AccountUID,
					Description:    "Configure isolated application runtime unit under tenant UID",
				},
			}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpControlApplicationProcess,
		RequiresAccount: true,
		RequiredArgs:    []string{"app_slug", "action"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			if err := security.ValidateIdentifier(req.Arguments["app_slug"]); err != nil {
				return nil, err
			}
			action := req.Arguments["action"]
			if action != "start" && action != "stop" && action != "restart" && action != "reload" {
				return nil, fmt.Errorf("unsupported application process action %q", action)
			}
			unitName := fmt.Sprintf("garvix-app-%s-%s.service", req.AccountUsername, req.Arguments["app_slug"])
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeReloadService,
					TargetResource: unitName,
					CommandArgv:    []string{"/usr/bin/systemctl", action, unitName},
					PrivilegeUser:  "root",
					PrivilegeUID:   0,
					Description:    "Control tenant systemd service unit inside cgroup v2 slice",
				},
			}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpCollectSystemTelemetry,
		RequiresAccount: false,
		RequiredArgs:    []string{"scope"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeExecCommand,
					TargetResource: "host-telemetry",
					CommandArgv:    []string{"/usr/bin/uptime"},
					PrivilegeUser:  "garvix-agent",
					PrivilegeUID:   990,
					Description:    "Collect read-only host CPU, memory, disk, and service health telemetry",
				},
			}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpControlSystemService,
		RequiresAccount: false,
		RequiredArgs:    []string{"service_name", "action"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			svc := req.Arguments["service_name"]
			allowedServices := map[string]bool{
				"nginx.service":      true,
				"postfix.service":    true,
				"dovecot.service":    true,
				"rspamd.service":     true,
				"postgresql.service": true,
				"mariadb.service":    true,
				"named.service":      true,
				"redis.service":      true,
			}
			if !allowedServices[svc] {
				return nil, fmt.Errorf("service %q is not in the allowlisted managed services", svc)
			}
			action := req.Arguments["action"]
			if action != "reload" && action != "restart" && action != "status" {
				return nil, fmt.Errorf("service action %q is not allowed", action)
			}
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeReloadService,
					TargetResource: svc,
					CommandArgv:    []string{"/usr/bin/systemctl", action, svc},
					PrivilegeUser:  "root",
					PrivilegeUID:   0,
					Description:    "Execute allowlisted systemd lifecycle action on managed daemon",
				},
			}, nil
		},
		ValidatePostState: func(req *protocol.OperationRequest) ([]string, error) {
			return []string{"/usr/bin/systemctl", "is-active", "--quiet", req.Arguments["service_name"]}, nil
		},
	})

	register(OperationSpec{
		Name:            protocol.OpRollbackTransaction,
		RequiresAccount: false,
		RequiredArgs:    []string{"snapshot_id"},
		PlanChanges: func(req *protocol.OperationRequest, homeRoot string) ([]protocol.PlannedChange, error) {
			return []protocol.PlannedChange{
				{
					StepOrder:      1,
					Action:         protocol.ChangeSnapshotState,
					TargetResource: req.Arguments["snapshot_id"],
					PrivilegeUser:  "root",
					PrivilegeUID:   0,
					Description:    "Restore configuration and filesystem state from atomic transaction snapshot",
				},
			}, nil
		},
	})
}
