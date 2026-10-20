# 08 — Multi-Tenancy & Workload Isolation Model

**Product:** Garvix Hosting Manager  
**Organization:** Garvix Software Solutions Pvt Ltd  
**Target OS:** AlmaLinux 10 (Tier-1)

---

## 1. Ten-Role RBAC Hierarchy

Garvix Hosting Manager enforces a zero-trust, 10-role Role-Based Access Control (RBAC) model across both the API Control Plane and the Privileged Linux Agent ([`DefaultAgentPolicy`](file:///Users/vishnubaldwa/Documents/cpanel/agents/linux-agent/internal/registry/registry.go#L35-L120)):

| # | Role Identifier | Scope | Primary Responsibilities & Boundaries |
| :--- | :--- | :--- | :--- |
| 1 | `GARVIX_SUPER_ADMIN` | Global Platform | Full platform administration, server node registration, emergency transaction rollback, global security policy management. |
| 2 | `GARVIX_SUPPORT_OPERATOR` | Global Support (Scoped) | Time-bound, audited support diagnostics, service health checks, account suspension/reactivation, and dry-run previews. Cannot silently exfiltrate tenant secrets. |
| 3 | `ORG_OWNER` | Organization /MSP | Owns a customer organization, manages billing, delegates `SERVER_ADMIN` and `HOSTING_RESELLER` roles within the organization. |
| 4 | `SERVER_ADMIN` | Managed Server Node(s) | Manages hosting accounts, Nginx reloads, system services, mail preflight, and backups on assigned server nodes. |
| 5 | `HOSTING_RESELLER` | Reseller Tenant Pool | Creates and manages customer hosting accounts strictly within allocated reseller quota limits (CPU/RAM/disk/account count). |
| 6 | `HOSTING_ACCOUNT_OWNER` | Single Hosting Account | Full management of websites, domains, databases, mailboxes, DNS zones, TLS certificates, and backups for their own hosting account. |
| 7 | `HOSTING_ACCOUNT_TECH` | Single Hosting Account | Technical developer/Collaborator role: manages deployments, virtual hosts, databases, and logs, but cannot delete the hosting account or alter billing. |
| 8 | `EMAIL_ONLY_USER` | Single Mailbox | Self-service mailbox password rotation, autoresponders, Sieve filters, and quota visibility for their own mailbox only. |
| 9 | `BILLING_ADMIN` | Organization Billing | Access to invoices, usage metering, quota plans, and subscription lifecycle; **zero access** to Linux agent operations, files, or databases. |
| 10 | `READ_ONLY_AUDITOR` | Compliance & Audit | Read-only access to immutable audit trails (`AuditRecord`), system telemetry, and security posture reports; cannot mutate any state. |

---

## 2. Role-to-Operation Permission Matrix

| Agent Operation / Capability | `GARVIX_SUPER_ADMIN` | `GARVIX_SUPPORT_OPERATOR` | `ORG_OWNER` | `SERVER_ADMIN` | `HOSTING_RESELLER` | `HOSTING_ACCOUNT_OWNER` | `HOSTING_ACCOUNT_TECH` | `EMAIL_ONLY_USER` | `BILLING_ADMIN` | `READ_ONLY_AUDITOR` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `CreateHostingAccount` / `TerminateHostingAccount` | Allow | Allow | Allow | Allow | Scoped* | Deny | Deny | Deny | Deny | Deny |
| `SuspendHostingAccount` / `ReactivateHostingAccount` | Allow | Allow | Allow | Allow | Scoped* | Deny | Deny | Deny | Deny | Deny |
| `CreateVirtualHost` / `ValidateNginxConfiguration` | Allow | Allow | Allow | Allow | Own Pool | Own Acct | Own Acct | Deny | Deny | Deny |
| `ReloadNginx` / `ControlSystemService` | Allow | Allow | Allow | Allow | Deny | Deny | Deny | Deny | Deny | Deny |
| `CreateDatabase` / `CreateDatabaseUser` / `GrantDatabasePrivileges` | Allow | Allow | Allow | Allow | Own Pool | Own Acct | Own Acct | Deny | Deny | Deny |
| `RotateDatabasePassword` | Allow | Allow | Allow | Allow | Own Pool | Own Acct | Own Acct | Deny | Deny | Deny |
| `ConfigureMailbox` | Allow | Deny | Allow | Allow | Own Pool | Own Acct | Own Acct | Self Only | Deny | Deny |
| `UpdateMailboxQuota` / `ConfigureDkimKey` | Allow | Deny | Allow | Allow | Own Pool | Own Acct | Own Acct | Deny | Deny | Deny |
| `IssueCertificate` / `RenewCertificate` / `ApplyDnsZone` | Allow | Allow | Allow | Allow | Own Pool | Own Acct | Own Acct | Deny | Deny | Deny |
| `CreateBackup` / `VerifyBackupRestore` / `RestoreBackup` | Allow | Allow | Allow | Allow | Own Pool | Own Acct | Own Acct | Deny | Deny | Deny |
| `DeployApplication` / `ControlApplicationProcess` | Allow | Allow | Allow | Allow | Own Pool | Own Acct | Own Acct | Deny | Deny | Deny |
| `CollectSystemTelemetry` / View Audit Logs | Allow | Allow | Allow | Allow | Own Pool | Own Acct | Own Acct | Deny | Deny | Allow |
| Billing & Subscription Management (Control Plane API) | Allow | Deny | Allow | Deny | Own Pool | Own Acct | Deny | Deny | Allow | Read-Only |

*\*Note: `HOSTING_RESELLER` account creation/suspension is mediated via the Control Plane quota engine and bound to the reseller's `tenant_id` subtree.*

---

## 3. Linux UID/GID & Filesystem Isolation

Every hosting account provisioned on AlmaLinux 10 receives a dedicated POSIX user and primary group:
1. **Dedicated UID/GID Allocation**:
   - Tenant UIDs and GIDs are strictly allocated within `1000..60000` ([`ValidateTenantUID`](file:///Users/vishnubaldwa/Documents/cpanel/agents/linux-agent/internal/security/pathguard.go#L97-L102)).
   - All UIDs `< 1000` and `65534` (`nobody`) are permanently blocked by the agent.
2. **Home Directory Permissions (`0710` / `0750`)**:
   - `/home/<username>` is created with mode `0710` (`rwx--x---`), owned by `<username>:<username>` (or `<username>:nginx` with ACLs strictly on `/home/<username>/public_html` as `0750`).
   - Other tenant users on the same server have **`0` permissions** (neither read, write, nor execute/traverse) on `/home/<other_username>`.
3. **Kernel Hardlink & Symlink Protection (`sysctl`)**:
   - `fs.protected_symlinks = 1`
   - `fs.protected_hardlinks = 1`
   - `fs.protected_fifos = 2`
   - `fs.protected_regular = 2`
   - `/tmp` and `/var/tmp` are mounted with `noexec,nosuid,nodev` and isolated per service via systemd `PrivateTmp=yes`.

---

## 4. Application Runtime Isolation (PHP-FPM, Node.js, Python)

### 4.1 Per-Account PHP-FPM Pools
- Garvix never runs PHP under a shared `apache` or `www-data` user.
- Each hosting account has an isolated pool file `/etc/php-fpm.d/tenants/<username>.conf`:
  - `user = <username>`
  - `group = <username>`
  - `listen = /run/php-fpm/<username>.sock` (`listen.owner = <username>`, `listen.group = nginx`, `listen.mode = 0660`)
  - `php_admin_value[open_basedir] = /home/<username>/:/tmp/`
  - `php_admin_value[disable_functions] = exec,passthru,shell_exec,system,proc_open,popen,pcntl_exec` (configurable per security profile)

### 4.2 Node.js & Python Workload Units
- Long-running Node.js or Python applications run as dedicated systemd service units (`garvix-app-<username>-<appslug>.service`) with:
  - `User=<username>` and `Group=<username>`
  - `WorkingDirectory=/home/<username>/apps/<appslug>`
  - `PrivateTmp=yes`, `NoNewPrivileges=yes`, `ProtectSystem=strict`, `ProtectHome=tmpfs`, `BindPaths=/home/<username>`
  - Consequently, when a tenant's Node.js or Python process inspects `/home`, `/home/<other_tenant>` does not even exist in its mount namespace.

---

## 5. Database Multi-Tenancy Isolation (PostgreSQL & MariaDB)

1. **No Shared Database Users**: Every tenant database user is prefixed with `<username>_` and validated via [`ValidateIdentifier`](file:///Users/vishnubaldwa/Documents/cpanel/agents/linux-agent/internal/security/pathguard.go#L107-L128).
2. **PostgreSQL Isolation**:
   - Databases are created with `OWNER <username>_dbadmin` and `REVOKE ALL ON DATABASE <db> FROM PUBLIC;`.
   - `pg_hba.conf` enforces `scram-sha-256` authentication and restricts local socket connections so tenant UIDs can only authenticate to their own mapped roles.
3. **MariaDB Isolation**:
   - `GRANT ALL PRIVILEGES ON `<username>\_db`.* TO '<username>_user'@'localhost'`; `SUPER`, `FILE`, `GRANT OPTION`, and global privileges are never granted to tenant users.

---

## 6. Zero-Trust Tenant Ownership Verification

Every request from the Control Plane to `garvix-agent` carries both `Caller.TenantID` and `Request.TenantID`:
- In **Step 2 (`step2AuthorizeAndVerifyTenant`)** of [`registry.go`](file:///Users/vishnubaldwa/Documents/cpanel/agents/linux-agent/internal/registry/registry.go#L303-L327), the agent verifies:
  1. The caller's `ActorRole` is permitted to invoke `OperationName`.
  2. For non-global roles, `Caller.TenantID == Request.TenantID`.
  3. The target `AccountUsername` is registered to `Request.TenantID` in the agent's `TenantOwnershipMap`. Any mismatch immediately aborts with `ERR_TENANT_AUTHZ_DENIED` and emits a high-severity `UNAUTHORIZED` audit event.
