package security_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/garvix/hosting-manager/agents/linux-agent/internal/security"
)

func TestValidateIdentifierAndUID(t *testing.T) {
	if err := security.ValidateIdentifier("acmeweb01"); err != nil {
		t.Fatalf("expected valid identifier, got %v", err)
	}
	if err := security.ValidateIdentifier("root"); err == nil {
		t.Fatal("expected root username to be rejected")
	}
	if err := security.ValidateIdentifier("garvix-agent"); err == nil {
		t.Fatal("expected reserved garvix-agent username to be rejected")
	}
	if err := security.ValidateIdentifier("bad;user"); err == nil {
		t.Fatal("expected shell metacharacter in username to be rejected")
	}
	if err := security.ValidateTenantUID(999); err == nil {
		t.Fatal("expected UID < 1000 to be rejected")
	}
	if err := security.ValidateTenantUID(1005); err != nil {
		t.Fatalf("expected UID 1005 to be allowed, got %v", err)
	}
}

func TestValidateAccountPathAndSymlinkEscape(t *testing.T) {
	tmpHome := t.TempDir()
	acctDir := filepath.Join(tmpHome, "acmeweb", "public_html")
	if err := os.MkdirAll(acctDir, 0750); err != nil {
		t.Fatal(err)
	}

	// Valid path inside tenant home
	if err := security.RejectSymlinkEscape(tmpHome, "acmeweb", filepath.Join(acctDir, "index.php")); err != nil {
		t.Fatalf("expected valid tenant path to pass, got %v", err)
	}

	// Traversal outside tenant home
	if _, err := security.ValidateAccountPath(tmpHome, "acmeweb", filepath.Join(tmpHome, "acmeweb", "..", "otheruser", "secret")); err == nil {
		t.Fatal("expected '..' path traversal to be rejected")
	}

	// Symlink escape inside tenant home pointing to /etc/shadow
	escapeLink := filepath.Join(acctDir, "shadow_link")
	if err := os.Symlink("/etc/passwd", escapeLink); err != nil {
		t.Fatal(err)
	}
	if err := security.RejectSymlinkEscape(tmpHome, "acmeweb", escapeLink); err == nil {
		t.Fatal("expected symlink escape to be rejected")
	}
}
