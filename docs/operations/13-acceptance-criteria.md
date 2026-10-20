# 13 — Quantitative Release Acceptance Criteria & Capability Status Matrix

**Document ID:** `GHM-OPS-13`  
**Owner:** Garvix Software Solutions Pvt Ltd  
**Status:** Approved  

---

## 1. Quantitative Release Acceptance Gates

No release candidate of Garvix Hosting Manager may be promoted to the `stable` channel unless every gate below passes in automated CI and staging verification:

### 1.1 Unit, Schema & Static Analysis Gates
| Gate ID | Metric / Verification Target | Mandatory Threshold |
| :--- | :--- | :--- |
| **`GATE-UNIT-01`** | TypeScript Strict Compilation (`npm run typecheck`) | **0 errors, 0 warnings** (`strict: true`, `noImplicitAny: true`) |
| **`GATE-UNIT-02`** | Prisma Schema Validation (`cloud` & `local-panel`) | **100% valid**, zero shared credentials/tables between Plane A and Plane B |
| **`GATE-UNIT-03`** | Core Domain Logic Coverage (Licensing, GST Billing, Capacity, RBAC, Validators, Audit Hash Chain) | **>= 90% branch & statement coverage**, **100% pass rate** |
| **`GATE-UNIT-04`** | GST Tax Calculation Accuracy (Paise Integer Arithmetic) | **0 paise discrepancy** across intra-state (`CGST+SGST`), inter-state (`IGST`), B2B/B2C, and Credit Note test vectors |

### 1.2 Security & Isolation Acceptance Gates
| Gate ID | Security Verification Scenario | Mandatory Pass Criterion |
| :--- | :--- | :--- |
| **`GATE-SEC-01`** | Command Injection & Shell Metacharacter Fuzzing (`;`, `|`, `&&`, `` ` ``, `$()`, `\x00`, `\n`) | **100% rejected** at `@garvix/validation` and `garvix-agentd` schema layer; zero `sh -c` calls in codebase |
| **`GATE-SEC-02`** | File Manager Path Traversal & Symlink Escape (`../../etc/shadow`, URL-encoded `%2e%2e%2f`, null-byte injection) | **100% blocked** with `VALIDATION_PATH_TRAVERSAL_DETECTED` |
| **`GATE-SEC-03`** | Cross-Tenant Horizontal Privilege Escalation (`Tenant A` accessing `Tenant B` domain/DB/mailbox/backup) | **100% rejected** with `403 AUTH_FORBIDDEN_SCOPE` |
| **`GATE-SEC-04`** | Destructive Action Without `X-Garvix-Step-Up-Token` (Account termination, DB drop, backup restore, license reissue) | **100% rejected** with `403 AUTH_STEP_UP_REQUIRED` |
| **`GATE-SEC-05`** | Secret Redaction in Logs & Error Envelopes | **0 occurrences** of plaintext passwords, JWTs, Ed25519/DKIM private keys, or Razorpay secrets in Pino logs |
| **`GATE-SEC-06`** | Audit Log Tamper Detection | Modifying any historical audit log record breaks SHA-256 hash chain verification **100% of the time** |
| **`GATE-SEC-07`** | Mail Server Open Relay Self-Test | Unauthenticated external relay attempt returns **`554 5.7.1 Relay access denied`** |

### 1.3 Reliability, Performance & Disaster Recovery Gates (AlmaLinux 10 Reference Node)
| Gate ID | Operational Metric | Mandatory Threshold |
| :--- | :--- | :--- |
| **`GATE-OPS-01`** | Local Panel API Synchronous Latency (`p95` / `p99`) | `p95 < 80ms`, `p99 < 200ms` under 50 RPS concurrent load |
| **`GATE-OPS-02`** | Invalid Config Injection Auto-Rollback (`nginx`, `postfix`, `pdns`) | Corrupted staged config is detected by dry-run validator and rolled back in **`< 2.0 seconds`** with **0 seconds** of daemon downtime |
| **`GATE-OPS-03`** | Offline Cloud Control Plane Outage Survival | Unplugging Plane A connectivity for **72 hours** results in **0 failed customer requests** and **100% Local Panel availability** |
| **`GATE-OPS-04`** | Expired License Non-Destructive Verification | Forcing license expiration (`now > expiresAt + 72h`) leaves Nginx, PHP-FPM, MariaDB/PostgreSQL, Postfix/Dovecot, and ACME renewals **100% running** |
| **`GATE-OPS-05`** | Restic Backup & Automated Sandbox Restore Verification (5 GB Tenant Account) | Full backup + `restic check` + ephemeral sandbox restore + DB import verification completes in **`< 180 seconds`** with matching SHA-256 manifest hashes |

---

## 2. Explicit Capability Status Matrix (Current Phase 0 + Phase 1 Baseline)

To maintain complete engineering transparency, every subsystem is tracked across four lifecycle maturity states:
- **`IMPLEMENTED`:** Production TypeScript/Go code or Prisma schema written in the repository.
- **`MOCKED`:** OS-level privileged side effects simulated safely in-memory for local/CI execution without modifying host Linux files.
- **`TESTED`:** Verified by automated unit, contract, and negative security tests in CI.
- **`PRODUCTION_VALIDATED`:** Validated against live system daemons on a dedicated AlmaLinux 10 target node (scheduled for Phases 2–7).

| Subsystem / Capability | Current Status | Notes & Verification Method |
| :--- | :--- | :--- |
| **Architecture, PRD, ADRs (`001`–`005`) & API Contracts** | `IMPLEMENTED` / `TESTED` | Complete documentation suite under `docs/` |
| **Dual PostgreSQL Prisma Schemas (`garvix_cloud` & `garvix_local`)** | `IMPLEMENTED` / `TESTED` | Validated via schema checks; zero shared tables/credentials |
| **Capacity Calculator (4 vCPU / 16 GB RAM / 200 GB NVMe)** | `IMPLEMENTED` / `TESTED` | Enforces bounded CPU/RAM/Disk admission control in `@garvix/shared-types` |
| **Input Validation & Path Traversal / Command Injection Guards** | `IMPLEMENTED` / `TESTED` | Tested against traversal, null-byte, shell metacharacter, and GSTIN vectors |
| **9-Role RBAC, Tenant Scope Isolation & Step-Up MFA Policy** | `IMPLEMENTED` / `TESTED` | Verified by automated cross-tenant and step-up MFA security test suites |
| **Ed25519 Offline License Signer, Verifier & 72h Grace Engine** | `IMPLEMENTED` / `TESTED` | Real Node `crypto` Ed25519 asymmetric signing & non-destructive expiry verified |
| **Indian GST Billing Engine (SAC 998315, CGST/SGST/IGST, Credit Notes)** | `IMPLEMENTED` / `TESTED` | Exact paise arithmetic & Razorpay HMAC-SHA256 webhook verification tested |
| **Tamper-Evident SHA-256 Hash-Chained Audit Ledger & Secret Redaction** | `IMPLEMENTED` / `TESTED` | Verified by tamper-injection and secret-redaction test suites |
| **Cloud Control Plane API (`apps/cloud-api`)** | `IMPLEMENTED` / `TESTED` | Fastify routes for enrollment, license heartbeat, GST invoicing, and releases |
| **Local Panel API (`apps/local-panel-api`)** | `IMPLEMENTED` / `TESTED` | Fastify routes for auth, packages, accounts, domains, mail preflight, backups |
| **Privileged Linux Agent (`apps/linux-agent` in Go)** | `IMPLEMENTED` / `MOCKED` | Go UDS server, `SO_PEERCRED` auth, transactional rollback engine; mocked in Node CI |
| **Cloud Console & Customer Panel UI (`apps/cloud-console`, `apps/customer-panel`)** | `IMPLEMENTED` | Next.js App Router views + `@garvix/ui-components` |
| **Live AlmaLinux 10 Cgroups v2, Nginx, PHP-FPM, Postfix/Dovecot, Restic OS Mutation** | `MOCKED` (Phase 1) | Mocked via `MockLinuxAgentClient` in Phase 1; live container execution in Phases 2–6 |
