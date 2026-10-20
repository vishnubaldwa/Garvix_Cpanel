# Garvix Hosting Manager — Database Migration & Lifecycle Policy

**Owner:** Garvix Software Solutions Pvt Ltd  
**Scope:** Cloud Control Plane (`database/cloud/schema.prisma`) & Customer Local Hosting Panel (`database/local/schema.prisma`)

---

## 1. Zero-Downtime Expand / Migrate / Contract Protocol

Because Garvix Hosting Manager operates across both a multi-tenant **Cloud Control Plane** and thousands of self-hosted **Customer Local Hosting Panels**, every schema evolution must adhere to a three-phase **Expand → Migrate → Contract** release cycle:

1. **Phase 1 — Expand (Release $N$):**
   - Add new nullable columns, new tables, or new enum values (`ALTER TYPE ... ADD VALUE IF NOT EXISTS`).
   - Create new indexes with `CREATE INDEX CONCURRENTLY` on high-volume tables (`server_heartbeats`, `license_validation_events`, `monitoring_samples`, `audit_logs`, `security_events`).
   - Dual-write in application code if a column or table is being refactored.
2. **Phase 2 — Backfill & Cutover (Release $N$ / Background Worker):**
   - Run idempotent, batched background backfill jobs (chunk size $\le 1000$ rows per transaction) to populate new columns/tables.
   - Switch application reads to the new schema structure and verify parity.
3. **Phase 3 — Contract (Release $N+1$):**
   - Remove deprecated dual-write paths from application code.
   - Apply `NOT NULL` constraints using `ALTER TABLE ... ADD CONSTRAINT ... NOT VALID` followed by `VALIDATE CONSTRAINT` to avoid table-wide `ACCESS EXCLUSIVE` locks during validation.
   - Drop obsolete columns or tables only after at least one full stable release boundary.

---

## 2. Customer Local Panel Autonomous Upgrade Safety

When `garvix-agent` updates a customer's self-hosted panel (`ServerUpdateHistory` state machine):

1. **Pre-Upgrade Logical Snapshot:**
   - Before `prisma migrate deploy --schema database/local/schema.prisma` executes, `garvix-agent` takes a consistent compressed dump (`pg_dump --format=custom`) of the Local Panel PostgreSQL database into `/var/backups/garvix/panel-db/pre-upgrade-<version>-<timestamp>.dump` with `0600` permissions.
2. **Lock Timeout & Statement Timeout Guards:**
   - All migration sessions run with `SET lock_timeout = '5s'` and `SET statement_timeout = '60s'` so a blocked DDL statement fails fast rather than stalling live panel requests.
3. **Automated Rollback on Failure:**
   - If `prisma migrate deploy` or the post-migration health check fails, `garvix-agent` halts the new panel binary, restores the pre-upgrade `.dump` snapshot into the isolated panel PostgreSQL cluster, and reverts the systemd unit to the previous version (`UpdateExecutionStatus.ROLLED_BACK`).

---

## 3. Prohibited Destructive Operations in Automated Migrations

The CI/CD migration linter rejects any migration SQL file containing:
- `DROP TABLE` or `DROP COLUMN` without an explicit `@garvix-migration-approve-contract` annotation signed by a Release Engineer.
- `TRUNCATE` on any table.
- `ALTER COLUMN ... TYPE` that requires a full table rewrite on tables exceeding 100,000 rows.
- Modifications to `database_instances` that allow `isPanelInstance = true` for customer workload instances.
