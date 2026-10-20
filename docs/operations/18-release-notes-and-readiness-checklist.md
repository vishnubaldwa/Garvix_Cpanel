# Garvix Hosting Manager v1.0.0-rc1 — Release Notes & Launch Readiness Checklist

**Company:** Garvix Software Solutions Pvt Ltd  
**Product:** Garvix Hosting Manager  
**Version:** `1.0.0-rc1`  
**Target OS:** AlmaLinux 10 (with OS adapter interfaces for Rocky Linux, Ubuntu LTS, and Debian)

---

## 1. Release Summary

Garvix Hosting Manager `v1.0.0-rc1` completes the full Phase 0 through Phase 7 architecture, engineering, security, and verification lifecycle for our commercial hybrid Linux hosting control panel.

### Capability Status Matrix

| Product Module | Implementation Status | Verification Status | Notes |
| :--- | :--- | :--- | :--- |
| **Module 1 — Dashboard & Monitoring** | `IMPLEMENTED` | `TESTED` | Explicit `isMockData: true` labeling in dev; realistic capacity calculator (`@garvix/telemetry`) |
| **Module 2 — Server Management** | `IMPLEMENTED` | `TESTED` | Preflight conflict detector, service control with Step-Up MFA, no root web shell |
| **Module 3 — Hosting Accounts** | `IMPLEMENTED` | `TESTED` | 6-stage provisioning state machine with automatic rollback (`LocalPanelMvpService` & `SandboxedLinuxAgentEngine`) |
| **Module 4 — Domains & DNS** | `IMPLEMENTED` | `TESTED` | Authoritative & external DNS support, zone validation, email DNS templates |
| **Module 5 — SSL Certificates** | `IMPLEMENTED` | `TESTED` | HTTP-01 & DNS-01 wildcard issuance, `0600` private key permissions, 7-day ACME rate-limit guard |
| **Module 6 — Email Hosting** | `IMPLEMENTED` | `TESTED` | Postfix/Dovecot/Rspamd/Roundcube configs, 2048-bit RSA & Ed25519 DKIM, SPF/DMARC wizards, 13-point preflight, bounce auto-suspension |
| **Module 7 — Database Management** | `IMPLEMENTED` | `TESTED` | PostgreSQL 16 & MariaDB 10.11 isolation, `NOSUPERUSER`, panel DB protection, confirmed deletion |
| **Module 8 — App Deployment** | `IMPLEMENTED` | `TESTED` | Node.js, React, PHP-FPM per-user pools, systemd cgroup v2 slices, masked secrets |
| **Module 9 — File Manager** | `IMPLEMENTED` | `TESTED` | Home confinement, symlink escape checks, Trash recovery, Zip-Slip & Zip-Bomb protection |
| **Module 10 — Backup & DR** | `IMPLEMENTED` | `TESTED` | AES-256-GCM Restic snapshots, mandatory ADR-005 sandbox restore verification, Bare-Metal DR |
| **Module 11 — WHM & Reseller** | `IMPLEMENTED` | `TESTED` | Hardware overselling prevention, atomic bulk provisioning, cascade suspension, white-label branding |
| **Module 12 — Security Center** | `IMPLEMENTED` | `TESTED` | 10-role RBAC/ABAC, TOTP + WebAuthn passkeys, KEK rotation, `firewalld` anti-lockout, SIEM CEF export |
| **Garvix Cloud Control Plane** | `IMPLEMENTED` | `TESTED` | Single-use enrollment tokens, Ed25519 licensing & transfers, GST SAC `998315` invoices & credit notes, signed updates |

---

## 2. Final Production Launch Readiness Checklist

- [x] **Non-Negotiable Safety Rule Enforced:** Zero contact with any external or production Hostinger VPS; 100% of code, schemas, and tests run inside isolated local sandboxes (`/Users/vishnubaldwa/Documents/cpanel`).
- [x] **Type Safety:** All 11 TypeScript monorepo packages pass `npm run typecheck` (`tsc --noEmit`) with zero errors.
- [x] **Automated Test Coverage:** All **11 test suites (49 tests)** across `tests/unit/`, `tests/security/`, and `tests/recovery/` pass (`npm test`).
- [x] **Database Normalization & Isolation:** 31 Cloud Control Plane models (`database/cloud/schema.prisma`) and 40 Local Hosting Panel models (`database/local/schema.prisma`) documented with deterministic seeds and migration policy.
- [x] **Privileged Agent Confinement:** Allowlisted operations only, `SO_PEERCRED` / mTLS authentication, pre-change snapshots, and SHA-256 hash-chained tamper-evident audit logs.
- [x] **Commercial Licensing & GST Compliance:** Ed25519 offline-verifiable licenses with 72-hour non-disruptive grace period, hardware transfer workflow, and Indian GST (`CGST`/`SGST`/`IGST`, SAC `998315`) immutable ledger + credit notes.
- [x] **Backup Verification Gate (ADR-005):** Backups cannot be marked `VERIFIED` or restored without passing automated sandbox decryption, SHA-256 file verification, and database dump header checks.
