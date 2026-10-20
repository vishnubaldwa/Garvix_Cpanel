# 00 — Product Requirements Document (PRD): Garvix Hosting Manager

**Document ID:** `GHM-ARCH-00`  
**Owner:** Garvix Software Solutions Pvt Ltd  
**Status:** Approved for Engineering Execution  
**Target OS Tier 1:** AlmaLinux 10 (64-bit x86_64 / ARM64)  

---

## 1. Executive Summary & Vision

**Garvix Hosting Manager (GHM)** is a commercial, security-hardened, multi-tenant Linux web hosting control panel, privileged server automation platform, and cloud licensing/billing control plane built by **Garvix Software Solutions Pvt Ltd**.

GHM replaces legacy monolithic scripts and fragile root-running web panels with a modern 4-plane hybrid architecture:
1. **Plane A — Garvix Cloud Control Plane:** Commercial licensing, GST-compliant billing (SAC 998315), signed release channels, fleet telemetry, and partner/reseller management.
2. **Plane B — Customer Hosting Panel:** Unprivileged local control plane running on customer servers for server admins, resellers, Hosting Account Owners, and sub-users.
3. **Plane C — Garvix Privileged Linux Agent (`garvix-agentd`):** Hardened Go daemon executing strictly allowlisted, schema-validated, transactional OS operations over Unix Domain Socket (`SO_PEERCRED`) and mTLS.
4. **Plane D — Customer Server Workloads:** Isolated per-account Linux users, systemd cgroup v2 slices, Nginx/OpenLiteSpeed vhosts, PHP-FPM pools, MariaDB/PostgreSQL databases, Postfix/Dovecot/Rspamd mail stacks, and Restic encrypted backup repositories.

---

## 2. Target Hardware Baseline & Realistic Capacity Engineering

### 2.1 Reference Baseline Node Profile
GHM is engineered and benchmarked against the following reference VPS/dedicated node specification:

| Resource | Reference Baseline Specification |
| :--- | :--- |
| **Operating System** | AlmaLinux 10 (64-bit, SELinux Enforcing, systemd + cgroups v2) |
| **CPU** | 4 Dedicated vCPU (x86_64 v3+ or ARM64 Neoverse) |
| **Memory (RAM)** | 16 GB ECC RAM + 4 GB swap (zram + NVMe swapfile, `vm.swappiness=10`) |
| **Primary Storage** | 200 GB NVMe SSD (XFS with `prjquota,uquota,gquota` enabled) |
| **Network Connectivity** | 1 Dedicated Static IPv4 + `/64` IPv6 Subnet |
| **Monthly Transfer** | 16 TB Outbound/Inbound Bandwidth @ 1 Gbps+ |

### 2.2 Strict Anti-"Unlimited" Engineering Policy
GHM **prohibits fake "unlimited" resource promises** at the infrastructure enforcement layer. Every hosting plan and tenant account must resolve to bounded, quantifiable OS kernel limits (`systemd` cgroup v2 CPU/Memory parameters, XFS quota blocks/inodes, PHP-FPM `pm.max_children`, and Postfix outbound rate limits).

### 2.3 Realistic Capacity Calculation Model (4 vCPU / 16 GB RAM / 200 GB NVMe)

#### Memory Budget Allocation (16,384 MB Total)
| Subsystem | Reserved / Bounded RAM | Notes |
| :--- | :--- | :--- |
| **Linux Kernel, Page Cache & XFS Metadata** | 1,536 MB | Kernel slab, network buffers, filesystem cache |
| **Garvix Local Panel + Go Agent + Local Postgres/Redis** | 1,024 MB | `garvix-panel` (Fastify/Next.js), `garvix-agentd`, metadata DB |
| **Web Server (Nginx) + DNS (PowerDNS)** | 512 MB | Master/worker processes, TLS session cache, zone cache |
| **Database Engine (MariaDB 10.11 / PostgreSQL 16)** | 4,096 MB | `innodb_buffer_pool_size = 2.5G`, connection buffers |
| **Email Stack (Postfix + Dovecot + Rspamd + Redis)** | 2,048 MB | Rspamd hyperscan workers (~1.1 GB), IMAP/LMTP workers |
| **Customer Workloads (PHP-FPM / Node / Python)** | **7,168 MB** | Available for active tenant processes under cgroup v2 limits |

#### Storage Budget Allocation (200 GB NVMe Total)
| Partition / Logical Allocation | Size | Purpose |
| :--- | :--- | :--- |
| **OS Root, Packages & System Logs (`/`, `/var/log`)** | 20 GB | AlmaLinux 10 base, systemd journal (capped at 4 GB), audit logs |
| **Garvix Binaries, Local Metadata DB & Staging** | 15 GB | `/var/lib/garvix`, transactional config snapshots, staging |
| **Local Database Storage (`/var/lib/mysql`, `/var/lib/pgsql`)** | 35 GB | Customer relational databases + binary/WAL logs |
| **Local Ephemeral Backup Staging (`/var/cache/garvix-backups`)** | 20 GB | Pre-upload Restic deduplication cache and restore sandbox |
| **Customer Tenant Home & Mail Data (`/home`)** | **110 GB** | Websites, application code, assets, and `/home/<user>/mail` |

#### Tenant Density & Workload Sizing Formulas
To prevent OOM kills and CPU thrashing, the Local Panel Capacity Planner computes admission control using:

$$\text{Max Safe Concurrent PHP Workers} = \left\lfloor \frac{\text{Available Customer RAM (7,168 MB)}}{\text{Avg PHP Worker RSS (64 MB)}} \right\rfloor = 112 \text{ concurrent workers}$$

| Workload Tier | Profile Characteristics | Recommended Max Accounts on 4 vCPU / 16 GB / 200 GB | Per-Account Cgroup v2 & Quota Guardrails |
| :--- | :--- | :--- | :--- |
| **Tier 1: Static / Brochure / Low-Traffic Sites** | Cached WordPress, static HTML, < 10k visits/mo, light mail | **60 – 80 Accounts** | `CPUQuota=50%`, `MemoryMax=512M`, Disk `1.5 GB`, `pm.max_children=5` |
| **Tier 2: Active Dynamic SMB Sites** | Active WordPress/Laravel, 25k–50k visits/mo, active IMAP | **25 – 35 Accounts** | `CPUQuota=100%`, `MemoryMax=1024M`, Disk `3.5 GB`, `pm.max_children=10` |
| **Tier 3: High-Concurrency WooCommerce / SaaS** | Uncached cart/checkout, heavy DB queries, background workers | **8 – 12 Accounts** | `CPUQuota=200%`, `MemoryMax=2048M`, Disk `10 GB`, `pm.max_children=20` |

---

## 3. Product Modules Scope (All 12 Modules)

### Module 1: Identity, RBAC, MFA & Session Security
- **Roles:** `SUPER_ADMIN` (Garvix Cloud), `BILLING_ADMIN`, `SUPPORT_ENGINEER`, `SERVER_ADMIN` (Root Equivalent), `RESELLER_ADMIN`, `ACCOUNT_OWNER` (cPanel Tenant Equivalent), `DEVELOPER_SUBUSER`, `EMAIL_SUBUSER`, `BILLING_SUBUSER`.
- **Capabilities:** Argon2id password hashing, TOTP + WebAuthn/Passkeys, step-up authentication (`X-Garvix-Step-Up-Token`) for destructive actions, scoped API tokens with CIDR allowlists, and impersonation with immutable audit trails.

### Module 2: Server Enrollment, Provisioning & OS Lifecycle
- **Capabilities:** One-line token-authenticated enrollment bootstrap, mTLS certificate issuance via Garvix Cloud CA, OS package baseline installation, kernel sysctl hardening, and zero-downtime service reloads.

### Module 3: Multi-Tenant Hosting Account & Package Manager
- **Capabilities:** Hosting plan templates (`CPUQuota`, `MemoryHigh`, `MemoryMax`, `IOWeight`, `TasksMax`, disk block/inode quotas, max domains/mailboxes/DBs), atomic Linux user provisioning (`/home/<username>`), and instant account suspend/unsuspend/terminate workflows.

### Module 4: Domain, DNS & Automated SSL/TLS Lifecycle
- **Capabilities:** Primary, addon, subdomain, and parked alias management; authoritative DNS via PowerDNS (or external Cloudflare/Route53 API adapters); DNSSEC key management; automated ACME (Let's Encrypt / ZeroSSL) HTTP-01 and DNS-01 wildcard issuance with 30-day pre-expiry renewal.

### Module 5: Web Server & Multi-Runtime Application Engine
- **Capabilities:** Per-domain Nginx (default) or OpenLiteSpeed vhosts; side-by-side multi-PHP (8.1, 8.2, 8.3, 8.4) with dedicated per-account PHP-FPM Unix sockets (`/run/garvix-php/<user>-php83.sock`); Node.js (18, 20, 22) and Python (3.11, 3.12) reverse-proxied systemd user units.

### Module 6: File Manager, SFTP/SSH & Git Deployment
- **Capabilities:** Chrooted/jailed web file manager with path-traversal and symlink-escape protection (`openat2` `RESOLVE_BENEATH`), SSH key manager, SFTP-only jail toggle, and push-to-deploy Git webhook pipelines with atomic symlink releases.

### Module 7: Relational Database & Cache Management
- **Capabilities:** MariaDB 10.11 / MySQL 8.0 and PostgreSQL 16 database provisioning, isolated database user credentials, privilege matrix editor, phpMyAdmin/pgAdmin SSO launch, and optional per-account Redis unix socket instances.

### Module 8: Complete Email Hosting & Deliverability Suite
- **Capabilities:** Postfix + Dovecot + Rspamd + Roundcube stack, mailbox quota management, aliases/forwarders/autoresponders, automated 2048-bit/Ed25519 DKIM, SPF/DMARC wizard, 13-point deliverability preflight check, outbound rate limiting, and SMTP relay fallback for port-25-blocked VPS nodes.

### Module 9: Server Security, Firewall, WAF & Malware Defense
- **Capabilities:** nftables/firewalld port management, Fail2ban brute-force jails (SSH, Postfix, Dovecot, Panel Auth), ModSecurity + OWASP CRS v4 WAF ruleset toggles per domain, ClamAV + YARA scheduled malware scans, and SELinux context enforcement.

### Module 10: Observability, Resource Metering & Audit Ledger
- **Capabilities:** Real-time per-account CPU/RAM/Disk/IO/Bandwidth telemetry from cgroup v2 and Nginx/Postfix logs, service health watchdogs with bounded auto-restart, and hash-chained tamper-evident audit logs.

### Module 11: Restic Encrypted Backups, DR & Staged Migration
- **Capabilities:** Scheduled and on-demand deduplicated Restic backups (local + S3/B2/Wasabi/SFTP), AES-256-CTR + Poly1305 encryption, granular file/DB/mailbox restoration, automated sandbox restore verification, and staged cPanel/CyberPanel/DirectAdmin import wizards.

### Module 12: Commercial Licensing, Cloud Fleet & GST Billing Engine
- **Capabilities:** Ed25519 offline-verifiable license tokens, 72-hour offline grace period, non-destructive license expiry mode, Razorpay subscription/webhook adapter, Indian GST invoicing (CGST/SGST/IGST, SAC 998315, GSTIN validation), and double-entry immutable ledger.

---

## 4. Operating System Adapter Interface (Multi-Distro Portability)

To guarantee that business logic in `local-panel-api` and `linux-agent` never hardcodes OS-specific paths or commands, the Privileged Linux Agent implements the `OSAdapter` interface:

```go
type OSAdapter interface {
    DetectOS(ctx context.Context) (OSMetadata, error)
    PackageManager() PackageManagerAdapter
    ServiceManager() ServiceManagerAdapter
    FirewallManager() FirewallAdapter
    QuotaManager() QuotaAdapter
    MACManager() MandatoryAccessControlAdapter
    WebStackPaths() WebStackPathMap
}
```

| Capability | Tier 1: AlmaLinux 10 / Rocky Linux 10 | Tier 2: Ubuntu 24.04 LTS / Debian 12 |
| :--- | :--- | :--- |
| **Package Manager** | `dnf` (DNF5 transactional API + Remi PHP) | `apt-get` (non-interactive + Ondrej Sury PPA) |
| **Mandatory Access Control** | SELinux (`enforcing`, `semanage fcontext`, `restorecon`) | AppArmor (`aa-enforce`, `/etc/apparmor.d/garvix/*`) |
| **PHP-FPM Pool Config Path** | `/etc/opt/remi/php83/php-fpm.d/<user>.conf` | `/etc/php/8.3/fpm/pool.d/<user>.conf` |
| **Web Server User** | `nginx` | `www-data` |
| **Firewall Backend** | `nftables` / `firewalld` DBus API | `nftables` / `ufw` wrapper |
| **Quota Subsystem** | XFS `xfs_quota` (`uquota,pquota`) | XFS `xfs_quota` or ext4 `quotactl` |

---

## 5. Non-Negotiable Safety & Security Rules

> [!CAUTION]
> Every line of code in Garvix Hosting Manager must adhere to the following 7 invariant rules:

1. **Zero Arbitrary Shell Execution:** No API endpoint or UI input may ever be concatenated into `sh -c`, `bash -c`, `exec()`, or `eval()`. All privileged mutations execute through typed Go structs using `exec.CommandContext` with explicit argument arrays (`argv`) and sanitized environment variables.
2. **Unprivileged Web Panel:** `garvix-panel` runs strictly as unprivileged user `garvix-panel` (`UID 988`). It has zero direct write access to `/etc`, `/var/spool`, or `/home/<tenant>`.
3. **Transactional Config Mutations with Automatic Rollback:** Every system configuration edit must follow `Stage -> Dry-Run Validate (e.g., nginx -t, postconf, named-checkzone) -> Snapshot Current -> Atomic Rename -> Reload -> Verify Health -> Rollback on Failure`.
4. **Strict Database Separation:** Garvix Cloud Control Plane (`garvix_cloud`), Garvix Local Server Panel (`garvix_local`), and Customer Hosting Databases must never share credentials, schemas, or database users.
5. **Non-Destructive Commercial Licensing:** An expired, suspended, or unreachable license must **never** stop Nginx, PHP-FPM, MariaDB/PostgreSQL, Postfix/Dovecot, or ACME SSL auto-renewals, and must **never** delete customer files. It only switches the Local Panel UI/API into administrative read-only/restricted mode.
6. **Verified Backups Only:** A backup snapshot is marked `VERIFIED` only after an automated integrity check (`restic check`) and scheduled test-restore verification pass.
7. **Isolated Development & Testing:** Never access or mutate external production servers during development or CI testing. All tests run against isolated mocks or disposable local containers.
