# ADR-003: Privileged Linux Agent in Go with `SO_PEERCRED` Unix Domain Socket & mTLS

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** Garvix Principal Systems & Cloud Architecture Team
- **Applies To:** `apps/linux-agent` (`garvix-agentd`), `apps/local-panel-api`

---

## 1. Context and Problem Statement

A web hosting control panel must perform privileged Linux administration tasks: creating OS users (`useradd`), configuring systemd cgroup v2 slices, setting XFS disk quotas (`xfs_quota`), writing Nginx/PHP-FPM/Postfix/Dovecot configs under `/etc`, and running Restic backups.

Historically, panels achieved this in one of two unsafe ways:
- Running the entire web server/API as `root` (catastrophic if any web dependency has an RCE vulnerability).
- Granting the web user broad `sudo NOPASSWD: ALL` or `sudo /bin/sh` scripts (trivial privilege escalation via environment variables or shell argument injection).

## 2. Decision Outcome

We isolate all root privileges inside **`garvix-agentd` (`apps/linux-agent`)**, a compiled, memory-safe, statically typed **Go daemon** with the following non-negotiable security controls:

1. **Unix Domain Socket IPC with Kernel `SO_PEERCRED` Verification:**
   - `garvix-agentd` listens on `/run/garvix/agent.sock` (`0660 root:garvix-panel`).
   - On every connection, the Go listener extracts kernel peer credentials via `unix.GetsockoptUcred(fd, unix.SOL_SOCKET, unix.SO_PEERCRED)` and verifies that `ucred.Uid` matches the unprivileged `garvix-panel` UID (`988`). Forging `SO_PEERCRED` is prevented by the Linux kernel.
2. **Closed Allowlist of Typed RPC Operations (Zero Arbitrary Command Execution):**
   - `garvix-agentd` does **not** expose a generic `"run_command"` or `"exec_shell"` RPC method.
   - It exposes only a closed registry of typed domain operations (`account.create_os_user`, `vhost.upsert`, `php.upsert_pool`, `dns.create_zone`, `mail.provision_domain`, `backup.create_and_verify`, etc.).
   - Every operation validates its strongly typed request struct against strict regex/bounds before invoking `exec.CommandContext` with explicit argument slices (`argv`) and a stripped environment (`PATH=/usr/sbin:/usr/bin`).
3. **Mandatory Transactional Config Pipeline (Stage -> Dry-Run -> Snapshot -> Atomic Apply -> Health Check -> Auto-Rollback):**
   - Config files are never edited in place without validation. Every change snapshots the previous working file, validates syntax (`nginx -t`, `postconf`, `doveconf`, `pdnsutil check-zone`), atomically renames into place, reloads the service, and rolls back automatically if the dry-run or reload fails.
4. **Mutual TLS (mTLS) for Optional Remote Fleet Management:**
   - When remote fleet management is enabled, `garvix-agentd` accepts connections only with a client X.509 certificate signed by the Garvix Cloud Fleet CA and pinned to the server's `organizationId` and `serverId`.

## 3. Consequences

- **Positive:**
  - Complete elimination of shell injection (`sh -c`) and `sudo` escalation vectors from the Node.js web tier.
  - Single-binary deployment (~18 MB static Go binary) with zero runtime interpreter dependencies on the host OS.
  - Deterministic automatic rollback prevents broken Nginx or Postfix configurations from taking down customer servers.
- **Negative / Mitigation:** Adding a new OS capability requires defining its typed contract in `@garvix/api-contracts` and implementing the Go handler in `apps/linux-agent`.
