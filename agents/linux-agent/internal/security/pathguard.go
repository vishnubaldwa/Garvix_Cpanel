// Package security implements strict path confinement, symlink escape prevention,
// UID/username reservation checks, and shell metacharacter rejection for the
// Garvix Hosting Manager Privileged Linux Agent.
package security

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"syscall"
)

const (
	// DefaultHomeRoot is the canonical base directory for all tenant hosting accounts.
	DefaultHomeRoot = "/home"

	// MinTenantUID is the minimum Linux UID permitted for a hosting account.
	// All UIDs < 1000 are reserved for the Linux kernel, systemd, and system daemons.
	MinTenantUID uint32 = 1000

	// MaxTenantUID bounds valid normal tenant UIDs (excluding nobody/65534).
	MaxTenantUID uint32 = 60000
)

var (
	// ErrNullByteDetected is returned when any input contains a NUL byte (\x00).
	ErrNullByteDetected = errors.New("security violation: input contains null byte")

	// ErrShellMetacharacter is returned when an input contains dangerous shell characters.
	ErrShellMetacharacter = errors.New("security violation: input contains forbidden shell metacharacters")

	// ErrPathTraversal is returned when a path attempts directory traversal (..).
	ErrPathTraversal = errors.New("security violation: path traversal sequence detected")

	// ErrSymlinkEscape is returned when a path or ancestor resolves outside the tenant root
	// or is a symbolic link when O_NOFOLLOW confinement is required.
	ErrSymlinkEscape = errors.New("security violation: symlink escape or boundary breakout detected")

	// ErrReservedUID is returned when an operation targets a privileged or reserved system UID.
	ErrReservedUID = errors.New("security violation: UID is outside the allowed tenant range (1000..60000)")

	// ErrReservedUsername is returned when an operation targets a system or reserved username.
	ErrReservedUsername = errors.New("security violation: username is reserved or invalid")
)

// strictIdentifierRegex matches POSIX-safe lowercase usernames, database identifiers, and service slugs.
var strictIdentifierRegex = regexp.MustCompile(`^[a-z][a-z0-9_-]{1,31}$`)

// strictDomainRegex validates RFC-1123 domain names.
var strictDomainRegex = regexp.MustCompile(`^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$`)

// reservedSystemUsernames is an explicit blocklist of system accounts, control plane accounts,
// and well-known privileged usernames that can never be used as tenant hosting accounts.
var reservedSystemUsernames = map[string]struct{}{
	"root":             {},
	"bin":              {},
	"daemon":           {},
	"adm":              {},
	"lp":               {},
	"sync":             {},
	"shutdown":         {},
	"halt":             {},
	"mail":             {},
	"operator":         {},
	"games":            {},
	"ftp":              {},
	"nobody":           {},
	"nfsnobody":        {},
	"systemd-network":  {},
	"systemd-resolve":  {},
	"systemd-coredump": {},
	"dbus":             {},
	"polkitd":          {},
	"sshd":             {},
	"postfix":          {},
	"dovecot":          {},
	"dovenull":         {},
	"rspamd":           {},
	"nginx":            {},
	"apache":           {},
	"www-data":         {},
	"postgres":         {},
	"mysql":            {},
	"mariadb":          {},
	"redis":            {},
	"named":            {},
	"bind":             {},
	"chrony":           {},
	"tss":              {},
	"garvix":           {},
	"garvix-agent":     {},
	"garvix-panel":     {},
	"garvix-backup":    {},
	"cpanel":           {},
	"psa":              {},
	"directadmin":      {},
}

// shellMetacharacters lists characters that must never appear in identifiers, paths, or arguments.
const shellMetacharacters = ";|&$`><*?()[]{}!#~\n\r\t\\'\"\x00"

// RejectShellMetacharacters inspects raw input for NUL bytes and shell metacharacters.
func RejectShellMetacharacters(input string) error {
	if strings.IndexByte(input, 0) != -1 {
		return ErrNullByteDetected
	}
	if strings.ContainsAny(input, shellMetacharacters) {
		return fmt.Errorf("%w: rejected input %q", ErrShellMetacharacter, input)
	}
	return nil
}

// ValidateTenantUID enforces that the target Linux UID belongs to an unprivileged tenant account.
func ValidateTenantUID(uid uint32) error {
	if uid < MinTenantUID || uid > MaxTenantUID || uid == 65534 {
		return fmt.Errorf("%w: got UID %d", ErrReservedUID, uid)
	}
	return nil
}

// ValidateIdentifier verifies that a Linux username, database name, or resource slug
// conforms to strict alphanumeric rules, contains no shell metacharacters, and is not
// a reserved system account.
func ValidateIdentifier(identifier string) error {
	if err := RejectShellMetacharacters(identifier); err != nil {
		return err
	}
	normalized := strings.ToLower(strings.TrimSpace(identifier))
	if normalized != identifier {
		return fmt.Errorf("%w: identifier %q must be lowercase with no surrounding whitespace", ErrReservedUsername, identifier)
	}
	if _, reserved := reservedSystemUsernames[normalized]; reserved {
		return fmt.Errorf("%w: %q is a protected system username", ErrReservedUsername, identifier)
	}
	if strings.HasPrefix(normalized, "garvix-") || strings.HasPrefix(normalized, "systemd-") {
		return fmt.Errorf("%w: %q uses a reserved system prefix", ErrReservedUsername, identifier)
	}
	if !strictIdentifierRegex.MatchString(normalized) {
		return fmt.Errorf("%w: %q does not match ^[a-z][a-z0-9_-]{1,31}$", ErrReservedUsername, identifier)
	}
	return nil
}

// ValidateDomainName ensures a domain name is strictly RFC-1123 compliant and free of metacharacters.
func ValidateDomainName(domain string) error {
	if err := RejectShellMetacharacters(domain); err != nil {
		return err
	}
	if len(domain) < 4 || len(domain) > 253 || !strictDomainRegex.MatchString(domain) {
		return fmt.Errorf("invalid domain name %q", domain)
	}
	return nil
}

// ValidateAccountPath ensures that candidatePath is strictly confined under
// `<homeRoot>/<linuxUsername>` (where homeRoot defaults to `/home` if empty).
// It rejects any `..` traversal components, null bytes, shell metacharacters,
// reserved usernames, or paths resolving to `/home/<linuxUsername>`'s parent.
func ValidateAccountPath(homeRoot, linuxUsername, candidatePath string) (string, error) {
	if homeRoot == "" {
		homeRoot = DefaultHomeRoot
	}
	if err := ValidateIdentifier(linuxUsername); err != nil {
		return "", fmt.Errorf("invalid account username: %w", err)
	}
	if err := RejectShellMetacharacters(candidatePath); err != nil {
		return "", fmt.Errorf("invalid candidate path: %w", err)
	}
	if !filepath.IsAbs(candidatePath) {
		return "", fmt.Errorf("%w: path %q must be absolute", ErrPathTraversal, candidatePath)
	}

	// Check raw path segments for any explicit ".." before lexical cleaning.
	for _, segment := range strings.Split(candidatePath, "/") {
		if segment == ".." {
			return "", fmt.Errorf("%w: explicit '..' segment in %q", ErrPathTraversal, candidatePath)
		}
	}

	cleanRoot := filepath.Clean(homeRoot)
	accountBase := filepath.Join(cleanRoot, linuxUsername)
	cleanCandidate := filepath.Clean(candidatePath)

	// Ensure cleanCandidate is either accountBase itself or strictly inside accountBase + "/"
	if cleanCandidate != accountBase && !strings.HasPrefix(cleanCandidate, accountBase+string(filepath.Separator)) {
		return "", fmt.Errorf(
			"%w: path %q escapes tenant boundary %q",
			ErrSymlinkEscape,
			cleanCandidate,
			accountBase,
		)
	}

	return cleanCandidate, nil
}

// RejectSymlinkEscape verifies on the live filesystem that neither candidatePath nor any existing
// ancestor directory within the tenant boundary is a symbolic link, and that `filepath.EvalSymlinks`
// on the deepest existing ancestor remains strictly confined under `<homeRoot>/<linuxUsername>`.
// It also performs an `O_NOFOLLOW` open check when the target already exists on disk.
func RejectSymlinkEscape(homeRoot, linuxUsername, candidatePath string) error {
	cleanCandidate, err := ValidateAccountPath(homeRoot, linuxUsername, candidatePath)
	if err != nil {
		return err
	}

	if homeRoot == "" {
		homeRoot = DefaultHomeRoot
	}
	cleanRoot := filepath.Clean(homeRoot)

	// Resolve real homeRoot if it exists on the host (e.g., on macOS /var -> /private/var during tests).
	realRoot := cleanRoot
	if resolvedRoot, err := filepath.EvalSymlinks(cleanRoot); err == nil {
		realRoot = resolvedRoot
	}
	accountBase := filepath.Join(cleanRoot, linuxUsername)
	realAccountBase := filepath.Join(realRoot, linuxUsername)

	// Walk every prefix from accountBase down to cleanCandidate and verify Lstat is never a symlink.
	rel, err := filepath.Rel(accountBase, cleanCandidate)
	if err != nil || strings.HasPrefix(rel, "..") {
		return fmt.Errorf("%w: relative path computation failed for %q", ErrSymlinkEscape, cleanCandidate)
	}

	parts := []string{}
	if rel != "." {
		parts = strings.Split(rel, string(filepath.Separator))
	}

	current := accountBase
	deepestExisting := ""

	// Check accountBase itself first, then each child component.
	checkPaths := make([]string, 0, len(parts)+1)
	checkPaths = append(checkPaths, current)
	for _, part := range parts {
		current = filepath.Join(current, part)
		checkPaths = append(checkPaths, current)
	}

	for _, p := range checkPaths {
		fi, lstatErr := os.Lstat(p)
		if errors.Is(lstatErr, os.ErrNotExist) {
			break
		}
		if lstatErr != nil {
			return fmt.Errorf("lstat failed on %q: %w", p, lstatErr)
		}
		if fi.Mode()&os.ModeSymlink != 0 {
			return fmt.Errorf("%w: symbolic link detected at %q", ErrSymlinkEscape, p)
		}
		deepestExisting = p
	}

	// If any portion of the tenant path exists on disk, verify its canonical target via EvalSymlinks
	// and open with O_NOFOLLOW to prevent TOCTOU races.
	if deepestExisting != "" {
		resolved, evalErr := filepath.EvalSymlinks(deepestExisting)
		if evalErr != nil {
			return fmt.Errorf("%w: EvalSymlinks failed on %q: %v", ErrSymlinkEscape, deepestExisting, evalErr)
		}
		if resolved != realAccountBase && !strings.HasPrefix(resolved, realAccountBase+string(filepath.Separator)) {
			return fmt.Errorf(
				"%w: resolved path %q escapes canonical account root %q",
				ErrSymlinkEscape,
				resolved,
				realAccountBase,
			)
		}

		fd, openErr := syscall.Open(deepestExisting, syscall.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_CLOEXEC, 0)
		if openErr != nil {
			return fmt.Errorf("%w: O_NOFOLLOW open rejected on %q: %v", ErrSymlinkEscape, deepestExisting, openErr)
		}
		_ = syscall.Close(fd)
	}

	return nil
}
