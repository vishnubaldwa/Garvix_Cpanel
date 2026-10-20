package registry_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/garvix/hosting-manager/agents/linux-agent/internal/protocol"
	"github.com/garvix/hosting-manager/agents/linux-agent/internal/registry"
)

func TestPipeline12StepDryRunAndCrossTenantDefense(t *testing.T) {
	tmpHome := t.TempDir()
	acctDir := filepath.Join(tmpHome, "acmeweb", "public_html")
	if err := os.MkdirAll(acctDir, 0750); err != nil {
		t.Fatal(err)
	}

	sink := registry.NewMemoryAuditSink()
	policy := registry.DefaultAgentPolicy(tmpHome)
	pipeline := registry.NewPipeline(protocol.ModeMock, policy, sink)
	pipeline.RegisterTenantOwnership("acmeweb", "tenant-acme-01")

	// 1. Valid dry-run request
	req := &protocol.OperationRequest{
		ProtocolVersion: protocol.ProtocolVersion,
		RequestID:       "req-001",
		CorrelationID:   "corr-001",
		IdempotencyKey:  "idem-001",
		Timestamp:       time.Now().UTC(),
		Operation:       protocol.OpCreateVirtualHost,
		DryRun:          true,
		TenantID:        "tenant-acme-01",
		AccountUsername: "acmeweb",
		AccountUID:      1005,
		ResourceKey:     "vhost:example.com",
		Arguments: map[string]string{
			"domain":      "example.com",
			"docroot":     acctDir,
			"php_version": "8.3",
		},
		Caller: protocol.CallerIdentity{
			Transport: protocol.AuthTransportMockLocal,
			UID:       990,
			GID:       990,
			ActorID:   "user-01",
			ActorRole: "HOSTING_ACCOUNT_OWNER",
			TenantID:  "tenant-acme-01",
		},
	}

	res := pipeline.Execute(context.Background(), req)
	if res.Status != protocol.StatusDryRunReady {
		t.Fatalf("expected DRY_RUN_READY, got %s (%s)", res.Status, res.ErrorMessage)
	}
	if len(res.PlannedChanges) == 0 {
		t.Fatal("expected planned changes in dry-run response")
	}
	if len(sink.Records()) != 2 {
		t.Fatalf("expected pre and post audit records, got %d", len(sink.Records()))
	}

	// 2. Cross-tenant access attempt must be denied in Step 2
	crossTenantReq := *req
	crossTenantReq.RequestID = "req-002"
	crossTenantReq.TenantID = "tenant-attacker-99"
	crossTenantReq.Caller.TenantID = "tenant-attacker-99"
	crossRes := pipeline.Execute(context.Background(), &crossTenantReq)
	if crossRes.Status != protocol.StatusUnauthorized {
		t.Fatalf("expected UNAUTHORIZED on cross-tenant access, got %s", crossRes.Status)
	}

	// 3. Unauthorized role (BILLING_ADMIN attempting Linux mutation) must be denied
	billingReq := *req
	billingReq.RequestID = "req-003"
	billingReq.Caller.ActorRole = "BILLING_ADMIN"
	billingRes := pipeline.Execute(context.Background(), &billingReq)
	if billingRes.Status != protocol.StatusUnauthorized {
		t.Fatalf("expected UNAUTHORIZED for BILLING_ADMIN, got %s", billingRes.Status)
	}
}
