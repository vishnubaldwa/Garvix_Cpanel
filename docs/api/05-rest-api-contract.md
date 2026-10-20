# 05 — Versioned REST API Contract & Security Standards

**Document ID:** `GHM-API-05`  
**Owner:** Garvix Software Solutions Pvt Ltd  
**Status:** Approved  

---

## 1. API Surface & Versioning Strategy

Garvix Hosting Manager exposes two distinct, strictly versioned REST APIs built on **Fastify + Zod/TypeBox JSON Schema validation**:

1. **Local Panel API (`Plane B`):**
   - **Base URI:** `https://<server-hostname>:8443/api/v1` (Admin/Reseller) and `https://<server-hostname>:2083/api/v1` (Customer Panel)
   - **Audience:** `SERVER_ADMIN`, `RESELLER_ADMIN`, `ACCOUNT_OWNER`, and scoped Sub-Users (`DEVELOPER_SUBUSER`, `EMAIL_SUBUSER`, `BILLING_SUBUSER`).
2. **Garvix Cloud Control Plane API (`Plane A`):**
   - **Base URI:** `https://api.garvix.io/cloud/api/v1`
   - **Audience:** Cloud Console customers (`ORG_OWNER`, `BILLING_ADMIN`), Garvix Staff (`SUPER_ADMIN`, `SUPPORT_ENGINEER`), and enrolled Local Panels authenticating via mTLS.

---

## 2. Authentication, Step-Up MFA & Request Headers

### 2.1 Required & Standard Security Headers
| Header Name | Requirement | Purpose |
| :--- | :--- | :--- |
| `Authorization` | Required (Protected Routes) | `Bearer <access_jwt>` (15-minute TTL) or `Bearer ghm_pat_<scoped_api_token>` |
| `X-Request-Id` | Optional (Auto-generated if absent) | UUIDv4 correlation ID propagated across Fastify -> BullMQ -> `garvix-agentd` -> Audit Ledger |
| `Idempotency-Key` | Required on `POST` / `PATCH` mutations | UUIDv4/ULID key cached in Redis + PostgreSQL for 24 hours to guarantee safe retries without duplicate OS side-effects |
| `X-Garvix-Step-Up-Token` | Required on Destructive Endpoints | Short-lived (5-minute TTL, single-action-bound) token obtained via `POST /api/v1/auth/step-up` using TOTP or WebAuthn |
| `X-Garvix-Tenant-Id` | Optional (Admin/Reseller Impersonation) | Scopes the request to a target `accountId` when an authorized Admin or Reseller acts on behalf of a tenant |

### 2.2 Destructive Actions Requiring `X-Garvix-Step-Up-Token`
The following endpoints reject requests with `403 AUTH_STEP_UP_REQUIRED` unless a valid `X-Garvix-Step-Up-Token` is supplied:
- `DELETE /api/v1/accounts/{accountId}` (Terminate hosting account & purge `/home/<user>`)
- `DELETE /api/v1/databases/{databaseId}` (Drop customer MariaDB/PostgreSQL database)
- `DELETE /api/v1/domains/{domainId}` (Remove domain and associated vhost)
- `POST /api/v1/backups/{snapshotId}/restore` (Overwrite live files/DBs with snapshot state)
- `POST /api/v1/security/firewall/flush` or modifying SSH listener port
- `POST /cloud/api/v1/licenses/{licenseId}/reissue` (Reset hardware binding)

---

## 3. Standard Response Envelope & Asynchronous Job Pattern

### 3.1 Synchronous Success Envelope (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "correlationId": "req_01J9Z9B2C4D6E8F0G2H4J6K8M0",
  "data": {
    "id": "dom_01J9Z9C0D2E4F6G8H0J2K4L6M8",
    "domain": "example.co.in",
    "phpVersion": "8.3",
    "sslStatus": "ACTIVE"
  },
  "meta": {
    "timestamp": "2026-10-19T06:30:00.124Z"
  }
}
```

### 3.2 Asynchronous Provisioning Envelope (`202 Accepted`)
Any endpoint that triggers privileged OS changes via `garvix-agentd` (account creation, SSL issuance, backup execution, database restore, migration import) returns `202 Accepted` within `< 150ms`:
```json
{
  "success": true,
  "correlationId": "req_01J9Z9B2C4D6E8F0G2H4J6K8M0",
  "data": {
    "jobId": "job_01J9Z9D4E6F8G0H2J4K6L8M0N2",
    "operation": "account.provision",
    "status": "QUEUED",
    "resourceType": "HOSTING_ACCOUNT",
    "resourceId": "acc_01J9Z9E0F2G4H6J8K0L2M4N6P8",
    "pollUrl": "/api/v1/jobs/job_01J9Z9D4E6F8G0H2J4K6L8M0N2",
    "estimatedDurationSeconds": 8
  }
}
```

### 3.3 Job Status Polling Response (`GET /api/v1/jobs/{jobId}`)
```json
{
  "success": true,
  "correlationId": "req_01J9Z9F2G4H6J8K0L2M4N6P8Q0",
  "data": {
    "jobId": "job_01J9Z9D4E6F8G0H2J4K6L8M0N2",
    "operation": "account.provision",
    "status": "RUNNING",
    "progressPercent": 60,
    "steps": [
      { "step": "os_user_and_cgroup", "status": "COMPLETED", "durationMs": 420 },
      { "step": "php_fpm_pool", "status": "COMPLETED", "durationMs": 310 },
      { "step": "nginx_vhost", "status": "COMPLETED", "durationMs": 290 },
      { "step": "dns_zone_and_dkim", "status": "RUNNING", "durationMs": null },
      { "step": "acme_ssl_certificate", "status": "PENDING", "durationMs": null }
    ],
    "startedAt": "2026-10-19T06:30:00.200Z",
    "completedAt": null,
    "error": null
  }
}
```

---

## 4. Local Panel API Endpoint Catalog (`/api/v1/*`)

| Module | Method & Path | Sync/Async | Required Role(s) | Description |
| :--- | :--- | :--- | :--- | :--- |
| **M01 Auth** | `POST /api/v1/auth/login` | `200 OK` | Public | Authenticate with email/username + password (+ TOTP/Passkey challenge) |
| **M01 Auth** | `POST /api/v1/auth/step-up` | `200 OK` | Authenticated | Exchange TOTP code or WebAuthn assertion for `X-Garvix-Step-Up-Token` |
| **M01 Auth** | `POST /api/v1/auth/api-tokens` | `201 Created` | All Roles | Create scoped Personal Access Token with CIDR restriction |
| **M02 Server** | `GET /api/v1/server/health` | `200 OK` | `SERVER_ADMIN` | System load, cgroup pressure (PSI), NVMe SMART/disk usage, service status |
| **M02 Server** | `POST /api/v1/server/services/{service}/reload` | `202 Accepted` | `SERVER_ADMIN` | Safe syntax-checked reload of `nginx`, `php-fpm`, `postfix`, `dovecot`, `pdns` |
| **M03 Accounts** | `GET /api/v1/packages` | `200 OK` | `SERVER_ADMIN`, `RESELLER_ADMIN` | List hosting resource packages (CPU/RAM/Disk/Inode/Domain limits) |
| **M03 Accounts** | `POST /api/v1/packages` | `201 Created` | `SERVER_ADMIN`, `RESELLER_ADMIN` | Create bounded hosting plan (validates against node capacity model) |
| **M03 Accounts** | `POST /api/v1/accounts` | `202 Accepted` | `SERVER_ADMIN`, `RESELLER_ADMIN` | Provision new isolated Linux hosting account |
| **M03 Accounts** | `POST /api/v1/accounts/{id}/suspend` | `202 Accepted` | `SERVER_ADMIN`, `RESELLER_ADMIN` | Suspend tenant website, PHP-FPM, SFTP, and outbound SMTP |
| **M03 Accounts** | `POST /api/v1/accounts/{id}/unsuspend` | `202 Accepted` | `SERVER_ADMIN`, `RESELLER_ADMIN` | Restore tenant services to `ACTIVE` state |
| **M03 Accounts** | `DELETE /api/v1/accounts/{id}` | `202 Accepted` | `SERVER_ADMIN`, `RESELLER_ADMIN` | Terminate account (Step-Up MFA required) |
| **M04 Domains** | `POST /api/v1/domains` | `202 Accepted` | `ACCOUNT_OWNER`+ | Add primary/addon/subdomain/alias and provision vhost + DNS |
| **M04 DNS** | `GET /api/v1/domains/{id}/dns-records` | `200 OK` | `ACCOUNT_OWNER`+ | List authoritative DNS zone records |
| **M04 DNS** | `PUT /api/v1/domains/{id}/dns-records` | `202 Accepted` | `ACCOUNT_OWNER`+ | Validate (`named-checkzone` / pdnsutil) and atomically update DNS records |
| **M04 SSL** | `POST /api/v1/domains/{id}/ssl/acme` | `202 Accepted` | `ACCOUNT_OWNER`+ | Issue/renew Let's Encrypt HTTP-01 or DNS-01 certificate |
| **M05 Web/App** | `PATCH /api/v1/domains/{id}/runtime` | `202 Accepted` | `ACCOUNT_OWNER`, `DEVELOPER_SUBUSER` | Switch PHP version (`8.1`–`8.4`) or configure Node.js/Python app proxy |
| **M06 Files** | `GET /api/v1/files/list` | `200 OK` | `ACCOUNT_OWNER`, `DEVELOPER_SUBUSER` | List directory contents inside chrooted `/home/<user>` |
| **M06 Git** | `POST /api/v1/git/repositories/{id}/deploy` | `202 Accepted` | `ACCOUNT_OWNER`, `DEVELOPER_SUBUSER` | Pull latest commit and run atomic release symlink swap |
| **M07 DBs** | `POST /api/v1/databases` | `202 Accepted` | `ACCOUNT_OWNER`, `DEVELOPER_SUBUSER` | Provision MariaDB 10.11 or PostgreSQL 16 database & scoped user |
| **M08 Email** | `POST /api/v1/mail/mailboxes` | `202 Accepted` | `ACCOUNT_OWNER`, `EMAIL_SUBUSER` | Create mailbox with Argon2id password and quota |
| **M08 Email** | `POST /api/v1/mail/preflight-check` | `200 OK` | `SERVER_ADMIN`, `ACCOUNT_OWNER` | Execute 13-point email deliverability diagnostic |
| **M08 Email** | `PUT /api/v1/mail/relay-config` | `202 Accepted` | `SERVER_ADMIN`, `ACCOUNT_OWNER` | Configure outbound SMTP smart host fallback for port-25-blocked VPS |
| **M09 Security** | `PUT /api/v1/security/waf/{domainId}` | `202 Accepted` | `SERVER_ADMIN`, `ACCOUNT_OWNER` | Toggle ModSecurity OWASP CRS v4 rules and exclusions |
| **M10 Audit** | `GET /api/v1/audit-logs` | `200 OK` | `SERVER_ADMIN`, `ACCOUNT_OWNER` | Query tamper-evident hash-chained audit trail |
| **M11 Backups** | `POST /api/v1/backups/run` | `202 Accepted` | `SERVER_ADMIN`, `ACCOUNT_OWNER` | Trigger encrypted Restic backup snapshot |
| **M11 Backups** | `POST /api/v1/backups/{snapshotId}/verify` | `202 Accepted` | `SERVER_ADMIN` | Run isolated sandbox restore verification |
| **M11 Backups** | `POST /api/v1/backups/{snapshotId}/restore` | `202 Accepted` | `SERVER_ADMIN`, `ACCOUNT_OWNER` | Granular restore of files, databases, or mailboxes (Step-Up MFA required) |
| **M11 Migrate** | `POST /api/v1/migrations/analyze` | `202 Accepted` | `SERVER_ADMIN`, `RESELLER_ADMIN` | Inspect archive, verify checksums, and build dry-run mapping report |

---

## 5. Cloud Control Plane API Endpoint Catalog (`/cloud/api/v1/*`)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/cloud/api/v1/servers/enrollment-tokens` | `POST` | Bearer JWT (`ORG_OWNER`) | Generate 15-minute single-use server enrollment token |
| `/cloud/api/v1/servers/enroll` | `POST` | Enrollment Token | Verify hardware fingerprint, sign mTLS client cert, issue initial Ed25519 license |
| `/cloud/api/v1/licenses/heartbeat` | `POST` | mTLS Client Cert | Validate subscription & hardware quorum, return refreshed Ed25519 license JWT |
| `/cloud/api/v1/licenses/{id}/reissue` | `POST` | Bearer JWT + Step-Up | Reset hardware binding for server migration |
| `/cloud/api/v1/billing/subscriptions` | `POST` | Bearer JWT (`BILLING_ADMIN`) | Create subscription & Razorpay checkout session with GST calculation |
| `/cloud/api/v1/billing/webhooks/razorpay` | `POST` | `X-Razorpay-Signature` | Idempotent Razorpay webhook ingestion (`payment.captured`, `subscription.charged`) |
| `/cloud/api/v1/billing/invoices/{id}/pdf` | `GET` | Bearer JWT | Download statutory Indian GST Tax Invoice / Credit Note (SAC 998315) |
| `/cloud/api/v1/releases/latest` | `GET` | mTLS / Public | Fetch Ed25519-signed release manifest for channel (`stable`, `beta`, `security`) |

---

## 6. Structured Error Envelope & Canonical Error Catalog

All errors return a deterministic JSON payload with HTTP status codes mapped to machine-readable error codes:

```json
{
  "success": false,
  "correlationId": "req_01J9Z9B2C4D6E8F0G2H4J6K8M0",
  "error": {
    "code": "QUOTA_PACKAGE_LIMIT_EXCEEDED",
    "message": "Cannot create mailbox: Hosting account has reached its package limit of 25 mailboxes.",
    "details": {
      "resource": "MAILBOX",
      "currentCount": 25,
      "maxAllowed": 25
    },
    "retryable": false
  }
}
```

| Error Code | HTTP Status | Retryable | Description |
| :--- | :--- | :--- | :--- |
| `VALIDATION_SCHEMA_ERROR` | `400` | `false` | Request payload or query failed strict Zod/JSON Schema validation |
| `AUTH_INVALID_CREDENTIALS` | `401` | `false` | Invalid credentials or expired JWT |
| `AUTH_STEP_UP_REQUIRED` | `403` | `false` | Destructive action requires valid `X-Garvix-Step-Up-Token` |
| `AUTH_FORBIDDEN_SCOPE` | `403` | `false` | Actor role or tenant scope does not permit access to target resource |
| `LICENSE_RESTRICTED_READONLY` | `402` | `false` | License expired past 72h grace; new resource creation blocked while workloads remain online |
| `IDEMPOTENCY_CONFLICT` | `409` | `false` | Same `Idempotency-Key` reused with a different request payload hash |
| `RESOURCE_LOCKED_BY_JOB` | `409` | `true` | Target account/domain currently has an active mutating job in progress |
| `QUOTA_PACKAGE_LIMIT_EXCEEDED` | `422` | `false` | Requested action exceeds hosting package or server capacity guardrails |
| `RATE_LIMIT_EXCEEDED` | `429` | `true` | Client exceeded sliding-window rate limit (`Retry-After` header included) |
| `AGENT_CONFIG_ROLLBACK` | `500` | `false` | OS config dry-run or reload failed; `garvix-agentd` automatically restored the prior snapshot |
| `AGENT_IPC_UNAVAILABLE` | `503` | `true` | Local Panel could not reach `/run/garvix/agent.sock` within timeout |

---

## 7. Sliding-Window Rate Limiting Tiers

| Endpoint Category | Limit Window | Unauthenticated IP Limit | Authenticated User / Token Limit |
| :--- | :--- | :--- | :--- |
| **Login / Password Reset / MFA** | 15 minutes | 10 requests / IP (triggers Fail2ban after 15) | 20 requests / user |
| **Standard Read APIs (`GET`)** | 1 minute | N/A | 300 requests / minute |
| **Mutating / Provisioning APIs (`POST/PUT/DELETE`)** | 1 minute | N/A | 60 requests / minute |
| **Cloud Heartbeat (`/licenses/heartbeat`)** | 5 minutes | N/A | 10 requests / server (`CN=srv_*`) |
