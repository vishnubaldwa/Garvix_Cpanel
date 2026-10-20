// Command garvix-agent is the Privileged Linux Agent daemon and CLI entrypoint
// for Garvix Hosting Manager (Garvix Software Solutions Pvt Ltd).
//
// Supported Modes:
//   - --mode=mock (default): Safe simulation mode for local macOS development and CI pipelines.
//     Validates all 12 security pipeline steps without modifying host state.
//   - --mode=enforcing: Production mode for AlmaLinux 10 hosts with Unix domain socket
//     SO_PEERCRED verification on /run/garvix-agent/agent.sock or mTLS client certificate checks.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/garvix/hosting-manager/agents/linux-agent/internal/protocol"
	"github.com/garvix/hosting-manager/agents/linux-agent/internal/registry"
	"github.com/garvix/hosting-manager/agents/linux-agent/internal/security"
)

func main() {
	modeFlag := flag.String("mode", string(protocol.ModeMock), "Agent execution mode: 'mock' (default for dev/CI) or 'enforcing' (AlmaLinux 10 production)")
	socketPath := flag.String("socket", registry.DefaultSocketPath, "Unix domain socket path for enforcing RPC listener")
	homeRoot := flag.String("home-root", security.DefaultHomeRoot, "Base directory for tenant hosting accounts")
	selfTest := flag.Bool("self-test", false, "Run a built-in dry-run self-test through the 12-step pipeline and exit")
	flag.Parse()

	mode := protocol.ExecutionMode(*modeFlag)
	if mode != protocol.ModeMock && mode != protocol.ModeEnforcing {
		log.Fatalf("invalid --mode=%q (must be %q or %q)", mode, protocol.ModeMock, protocol.ModeEnforcing)
	}

	auditSink := registry.NewMemoryAuditSink()
	policy := registry.DefaultAgentPolicy(*homeRoot)
	pipeline := registry.NewPipeline(mode, policy, auditSink)

	if *selfTest || mode == protocol.ModeMock {
		if err := runSelfTest(pipeline, *homeRoot); err != nil {
			log.Fatalf("self-test failed: %v", err)
		}
		if *selfTest || flag.NArg() == 0 {
			return
		}
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if err := serveUnixSocket(ctx, pipeline, *socketPath); err != nil {
		log.Fatalf("garvix-agent socket server terminated with error: %v", err)
	}
}

func runSelfTest(pipeline *registry.Pipeline, homeRoot string) error {
	req := &protocol.OperationRequest{
		ProtocolVersion: protocol.ProtocolVersion,
		RequestID:       "req-selftest-0001",
		CorrelationID:   "corr-selftest-0001",
		IdempotencyKey:  "idem-selftest-0001",
		Timestamp:       time.Now().UTC(),
		Operation:       protocol.OpCreateVirtualHost,
		DryRun:          true,
		TenantID:        "tenant-acme-01",
		AccountUsername: "acmeweb",
		AccountUID:      1005,
		ResourceKey:     "vhost:example.com",
		Arguments: map[string]string{
			"domain":      "example.com",
			"docroot":     homeRoot + "/acmeweb/public_html",
			"php_version": "8.3",
		},
		Caller: protocol.CallerIdentity{
			Transport: protocol.AuthTransportMockLocal,
			PID:       int32(os.Getpid()),
			UID:       990,
			GID:       990,
			ActorID:   "usr-admin-01",
			ActorRole: "SERVER_ADMIN",
			TenantID:  "tenant-acme-01",
		},
	}

	result := pipeline.Execute(context.Background(), req)
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(result); err != nil {
		return err
	}
	if result.Status != protocol.StatusDryRunReady && result.Status != protocol.StatusSucceeded {
		return fmt.Errorf("unexpected self-test status %s: %s", result.Status, result.ErrorMessage)
	}
	return nil
}

func serveUnixSocket(ctx context.Context, pipeline *registry.Pipeline, socketPath string) error {
	_ = os.Remove(socketPath)
	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		return fmt.Errorf("failed to listen on Unix socket %q: %w", socketPath, err)
	}
	defer func() {
		_ = listener.Close()
		_ = os.Remove(socketPath)
	}()

	// Restrict socket permissions to 0660 (root:garvix-panel).
	if err := os.Chmod(socketPath, 0660); err != nil {
		return fmt.Errorf("failed to chmod 0660 on %q: %w", socketPath, err)
	}

	go func() {
		<-ctx.Done()
		_ = listener.Close()
	}()

	for {
		conn, err := listener.Accept()
		if err != nil {
			select {
			case <-ctx.Done():
				return nil
			default:
				return fmt.Errorf("accept failed: %w", err)
			}
		}
		go handleConnection(ctx, pipeline, conn)
	}
}

func handleConnection(ctx context.Context, pipeline *registry.Pipeline, conn net.Conn) {
	defer func() { _ = conn.Close() }()
	_ = conn.SetDeadline(time.Now().Add(30 * time.Second))

	var req protocol.OperationRequest
	dec := json.NewDecoder(io.LimitReader(conn, 1<<20)) // 1 MiB max RPC payload
	if err := dec.Decode(&req); err != nil {
		resp := &protocol.OperationResult{
			ProtocolVersion: protocol.ProtocolVersion,
			Status:          protocol.StatusRejected,
			ErrorCode:       "ERR_MALFORMED_JSON",
			ErrorMessage:    err.Error(),
			CompletedAt:     time.Now().UTC(),
		}
		_ = json.NewEncoder(conn).Encode(resp)
		return
	}

	result := pipeline.Execute(ctx, &req)
	_ = json.NewEncoder(conn).Encode(result)
}
