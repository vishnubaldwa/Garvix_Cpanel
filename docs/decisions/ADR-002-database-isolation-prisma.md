# ADR-002: Strict Database Isolation Between Cloud Control Plane, Local Panel, and Customer Workloads

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** Garvix Principal Systems & Cloud Architecture Team
- **Applies To:** `prisma/cloud/schema.prisma`, `prisma/local-panel/schema.prisma`, Customer Workload Databases

---

## 1. Context and Problem Statement

Many legacy open-source and commercial hosting control panels store panel administrative credentials, session tokens, and server configuration tables inside the same MySQL/MariaDB instance that hosts customer WordPress/application databases—often sharing the same `root` MySQL socket or credentials.

This creates three severe failure modes:
1. **Security Blast Radius:** A SQL injection or local file read vulnerability in a customer's PHP application or a misconfigured database grant could expose panel admin password hashes, DKIM private keys, or backup encryption secrets.
2. **Resource Contention (Noisy Neighbor Outage):** A runaway customer SQL query exhausting MariaDB connection slots (`max_connections`) or I/O locks out the hosting control panel itself, preventing the Server Admin from logging in to suspend the offending tenant.
3. **Cloud vs. On-Premises Boundary Confusion:** Mixing Garvix SaaS billing/license tables (`Plane A`) with on-server hosting metadata (`Plane B`) violates multi-tenant SaaS boundaries and breaks offline server autonomy.

## 2. Decision Outcome

We enforce **Three Strictly Isolated Database Domains** with zero shared instances, sockets, credentials, or Prisma schemas:

1. **Domain 1 — Garvix Cloud Control Plane DB (`garvix_cloud`):**
   - **Schema:** `prisma/cloud/schema.prisma`
   - **Location:** Garvix Managed Cloud Infrastructure (Plane A).
   - **Contents:** Organizations, Cloud Users, Subscriptions, License Tokens, Enrolled Server Hardware Fingerprints, Indian GST Tax Invoices, Credit Notes, Immutable Financial Ledger, and Signed Release Manifests.

2. **Domain 2 — Garvix Local Server Panel DB (`garvix_local`):**
   - **Schema:** `prisma/local-panel/schema.prisma`
   - **Location:** Dedicated private PostgreSQL instance running on the customer's server under `/var/lib/garvix/postgres`, listening exclusively on a restricted Unix Domain Socket (`/run/garvix/postgres/.s.PGSQL.5432`, `0600 garvix-panel:garvix-panel`) inside `garvix-system.slice`.
   - **Contents:** Local Panel Users, RBAC Roles, Hosting Packages, Hosting Accounts, Domains, DNS Zones, Mailboxes, Backup Snapshots, Provisioning Jobs, and Hash-Chained Audit Logs.

3. **Domain 3 — Customer Workload Databases (Plane D MariaDB 10.11 & Customer PostgreSQL 16):**
   - **Location:** System `/var/lib/mysql` and `/var/lib/pgsql` managed by `garvix-agentd` inside workload slices.
   - **Contents:** Customer application databases (`ghm_<tenant>_<dbname>`) accessed exclusively by scoped per-database users (`127.0.0.1` / local socket only by default).

## 3. Consequences

- **Positive:**
  - Even if a customer overloads system MariaDB (`too many connections`), the Local Panel (`garvix_local` on dedicated PostgreSQL) remains 100% responsive so the administrator can inspect telemetry and throttle or suspend the tenant.
  - Zero possibility of cross-Database SQL grants leaking `garvix_local` tables to customer database users.
  - Independent schema migrations for Cloud SaaS (`prisma/cloud`) vs. Self-Hosted Server releases (`prisma/local-panel`).
- **Negative / Mitigation:** Dedicated local PostgreSQL instance consumes ~120 MB baseline RAM on the customer server; accounted for explicitly in the 1,024 MB Plane B memory budget in `00-prd.md`.
