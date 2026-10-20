// Package protocol defines the versioned RPC structures, allowlisted operations,
// caller identity credentials, dry-run change previews, and audit telemetry records
// for the Garvix Hosting Manager Privileged Linux Agent.
//
// SECURITY INVARIANT: The agent never accepts arbitrary shell commands, scripts,
// or unvalidated file paths. Only operations explicitly enumerated in OperationName
// may be invoked over the Unix domain socket (/run/garvix-agent/agent.sock) or mTLS channel.
package protocol

import (
	"fmt"
	"time"
)

// ProtocolVersion is the strict wire protocol version enforced by the agent.
const ProtocolVersion = "v1.0"

// ExecutionMode controls whether the agent runs in mock/simulation mode (for macOS/CI)
// or enforcing mode on target AlmaLinux 10 hosts.
type ExecutionMode string

const (
	ModeMock      ExecutionMode = "mock"
	ModeEnforcing ExecutionMode = "enforcing"
)

// OperationName represents a strictly allowlisted privileged action.
type OperationName string

const (
	OpCreateHostingAccount       OperationName = "CreateHostingAccount"
	OpSuspendHostingAccount      OperationName = "SuspendHostingAccount"
	OpReactivateHostingAccount   OperationName = "ReactivateHostingAccount"
	OpTerminateHostingAccount    OperationName = "TerminateHostingAccount"
	OpCreateVirtualHost          OperationName = "CreateVirtualHost"
	OpValidateNginxConfiguration OperationName = "ValidateNginxConfiguration"
	OpReloadNginx                OperationName = "ReloadNginx"
	OpCreateDatabase             OperationName = "CreateDatabase"
	OpCreateDatabaseUser         OperationName = "CreateDatabaseUser"
	OpGrantDatabasePrivileges    OperationName = "GrantDatabasePrivileges"
	OpRotateDatabasePassword     OperationName = "RotateDatabasePassword"
	OpConfigureMailbox           OperationName = "ConfigureMailbox"
	OpUpdateMailboxQuota         OperationName = "UpdateMailboxQuota"
	OpConfigureDkimKey           OperationName = "ConfigureDkimKey"
	OpRunMailPreflight           OperationName = "RunMailPreflight"
	OpIssueCertificate           OperationName = "IssueCertificate"
	OpRenewCertificate           OperationName = "RenewCertificate"
	OpApplyDnsZone               OperationName = "ApplyDnsZone"
	OpCreateBackup               OperationName = "CreateBackup"
	OpVerifyBackupRestore        OperationName = "VerifyBackupRestore"
	OpRestoreBackup              OperationName = "RestoreBackup"
	OpDeployApplication          OperationName = "DeployApplication"
	OpControlApplicationProcess  OperationName = "ControlApplicationProcess"
	OpCollectSystemTelemetry     OperationName = "CollectSystemTelemetry"
	OpControlSystemService       OperationName = "ControlSystemService"
	OpRollbackTransaction        OperationName = "RollbackTransaction"
)

// allowedOperations is the closed set of valid agent operations.
var allowedOperations = map[OperationName]struct{}{
	OpCreateHostingAccount:       {},
	OpSuspendHostingAccount:      {},
	OpReactivateHostingAccount:   {},
	OpTerminateHostingAccount:    {},
	OpCreateVirtualHost:          {},
	OpValidateNginxConfiguration: {},
	OpReloadNginx:                {},
	OpCreateDatabase:             {},
	OpCreateDatabaseUser:         {},
	OpGrantDatabasePrivileges:    {},
	OpRotateDatabasePassword:     {},
	OpConfigureMailbox:           {},
	OpUpdateMailboxQuota:         {},
	OpConfigureDkimKey:           {},
	OpRunMailPreflight:           {},
	OpIssueCertificate:           {},
	OpRenewCertificate:           {},
	OpApplyDnsZone:               {},
	OpCreateBackup:               {},
	OpVerifyBackupRestore:        {},
	OpRestoreBackup:              {},
	OpDeployApplication:          {},
	OpControlApplicationProcess:  {},
	OpCollectSystemTelemetry:     {},
	OpControlSystemService:       {},
	OpRollbackTransaction:        {},
}

// IsValid checks whether the operation is in the strict allowlist.
func (op OperationName) IsValid() bool {
	_, ok := allowedOperations[op]
	return ok
}

// AllowedOperationsList returns a slice of all allowlisted operation names.
func AllowedOperationsList() []OperationName {
	out := make([]OperationName, 0, len(allowedOperations))
	for k := range allowedOperations {
		out = append(out, k)
	}
	return out
}

// AuthTransportType identifies how the caller was authenticated.
type AuthTransportType string

const (
	AuthTransportUDSPeerCred AuthTransportType = "UDS_SO_PEERCRED"
	AuthTransportMTLS        AuthTransportType = "MTLS_CLIENT_CERT"
	AuthTransportMockLocal   AuthTransportType = "MOCK_LOCAL"
)

// CallerIdentity captures the verified OS-level and cryptographic identity of the RPC caller.
type CallerIdentity struct {
	Transport           AuthTransportType `json:"transport"`
	PID                 int32             `json:"pid"`
	UID                 uint32            `json:"uid"`
	GID                 uint32            `json:"gid"`
	LinuxUsername       string            `json:"linux_username,omitempty"`
	MTLSCertFingerprint string            `json:"mtls_cert_fingerprint,omitempty"`
	MTLSSubjectCN       string            `json:"mtls_subject_cn,omitempty"`
	ActorID             string            `json:"actor_id"`
	ActorRole           string            `json:"actor_role"`
	TenantID            string            `json:"tenant_id"`
	SourceIP            string            `json:"source_ip,omitempty"`
}

// ChangeActionType describes the type of system mutation planned or executed.
type ChangeActionType string

const (
	ChangeCreateFile      ChangeActionType = "CREATE_FILE"
	ChangeUpdateFile      ChangeActionType = "UPDATE_FILE"
	ChangeDeleteFile      ChangeActionType = "DELETE_FILE"
	ChangeCreateDirectory ChangeActionType = "CREATE_DIRECTORY"
	ChangeChownChmod      ChangeActionType = "CHOWN_CHMOD"
	ChangeExecCommand     ChangeActionType = "EXEC_ARGV_COMMAND"
	ChangeReloadService   ChangeActionType = "RELOAD_SYSTEM_SERVICE"
	ChangeSnapshotState   ChangeActionType = "SNAPSHOT_STATE"
)

// PlannedChange represents a deterministic preview of a single atomic mutation
// that an operation will perform (or simulated during DryRun).
type PlannedChange struct {
	StepOrder       int              `json:"step_order"`
	Action          ChangeActionType `json:"action"`
	TargetResource  string           `json:"target_resource"`
	TargetPath      string           `json:"target_path,omitempty"`
	CommandArgv     []string         `json:"command_argv,omitempty"`
	PrivilegeUser   string           `json:"privilege_user"`
	PrivilegeUID    uint32           `json:"privilege_uid"`
	RollbackCommand []string         `json:"rollback_command,omitempty"`
	SnapshotPath    string           `json:"snapshot_path,omitempty"`
	Description     string           `json:"description"`
}

// OperationRequest is the versioned RPC request envelope sent by the control plane to the agent.
type OperationRequest struct {
	ProtocolVersion string            `json:"protocol_version"`
	RequestID       string            `json:"request_id"`
	CorrelationID   string            `json:"correlation_id"`
	IdempotencyKey  string            `json:"idempotency_key"`
	Timestamp       time.Time         `json:"timestamp"`
	Operation       OperationName     `json:"operation"`
	DryRun          bool              `json:"dry_run"`
	TenantID        string            `json:"tenant_id"`
	AccountUsername string            `json:"account_username,omitempty"`
	AccountUID      uint32            `json:"account_uid,omitempty"`
	ResourceKey     string            `json:"resource_key"`
	Arguments       map[string]string `json:"arguments"`
	Caller          CallerIdentity    `json:"caller"`
}

// ValidateEnvelope performs baseline structural validation on the request envelope.
func (req *OperationRequest) ValidateEnvelope() error {
	if req.ProtocolVersion != ProtocolVersion {
		return fmt.Errorf("unsupported protocol version %q (expected %q)", req.ProtocolVersion, ProtocolVersion)
	}
	if req.RequestID == "" {
		return fmt.Errorf("request_id is required")
	}
	if req.CorrelationID == "" {
		return fmt.Errorf("correlation_id is required")
	}
	if req.IdempotencyKey == "" {
		return fmt.Errorf("idempotency_key is required")
	}
	if !req.Operation.IsValid() {
		return fmt.Errorf("operation %q is not in the strict agent allowlist", req.Operation)
	}
	if req.TenantID == "" {
		return fmt.Errorf("tenant_id is required for tenant ownership verification")
	}
	if req.ResourceKey == "" {
		return fmt.Errorf("resource_key is required for per-resource mutex locking")
	}
	return nil
}

// OperationStatus indicates the lifecycle outcome of an operation.
type OperationStatus string

const (
	StatusSucceeded    OperationStatus = "SUCCEEDED"
	StatusDryRunReady  OperationStatus = "DRY_RUN_READY"
	StatusFailed       OperationStatus = "FAILED"
	StatusRolledBack   OperationStatus = "ROLLED_BACK"
	StatusUnauthorized OperationStatus = "UNAUTHORIZED"
	StatusRejected     OperationStatus = "REJECTED_VALIDATION"
)

// OperationResult is the structured RPC response returned by the agent.
type OperationResult struct {
	ProtocolVersion   string            `json:"protocol_version"`
	RequestID         string            `json:"request_id"`
	CorrelationID     string            `json:"correlation_id"`
	Operation         OperationName     `json:"operation"`
	Status            OperationStatus   `json:"status"`
	DryRun            bool              `json:"dry_run"`
	ExecutionMode     ExecutionMode     `json:"execution_mode"`
	PlannedChanges    []PlannedChange   `json:"planned_changes"`
	ValidationSummary string            `json:"validation_summary"`
	RollbackPerformed bool              `json:"rollback_performed"`
	SnapshotID        string            `json:"snapshot_id,omitempty"`
	ErrorCode         string            `json:"error_code,omitempty"`
	ErrorMessage      string            `json:"error_message,omitempty"`
	Outputs           map[string]string `json:"outputs,omitempty"`
	StartedAt         time.Time         `json:"started_at"`
	CompletedAt       time.Time         `json:"completed_at"`
	DurationMs        int64             `json:"duration_ms"`
	PreAuditID        string            `json:"pre_audit_id"`
	PostAuditID       string            `json:"post_audit_id"`
}

// AuditPhase distinguishes pre-execution intent records from post-execution outcome records.
type AuditPhase string

const (
	AuditPhasePreExecution  AuditPhase = "PRE_EXECUTION"
	AuditPhasePostExecution AuditPhase = "POST_EXECUTION"
)

// AuditRecord is an immutable structured audit entry emitted to the append-only audit log
// before and after every privileged operation.
type AuditRecord struct {
	AuditID           string          `json:"audit_id"`
	Phase             AuditPhase      `json:"phase"`
	Timestamp         time.Time       `json:"timestamp"`
	RequestID         string          `json:"request_id"`
	CorrelationID     string          `json:"correlation_id"`
	IdempotencyKey    string          `json:"idempotency_key"`
	Operation         OperationName   `json:"operation"`
	DryRun            bool            `json:"dry_run"`
	ExecutionMode     ExecutionMode   `json:"execution_mode"`
	Caller            CallerIdentity  `json:"caller"`
	TenantID          string          `json:"tenant_id"`
	AccountUsername   string          `json:"account_username,omitempty"`
	ResourceKey       string          `json:"resource_key"`
	PlannedChangeHash string          `json:"planned_change_hash"`
	Status            OperationStatus `json:"status"`
	RollbackPerformed bool            `json:"rollback_performed"`
	ErrorCode         string          `json:"error_code,omitempty"`
	ErrorMessage      string          `json:"error_message,omitempty"`
}
