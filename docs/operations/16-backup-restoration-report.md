# Phase 7 — Encrypted Backup & Bare-Metal Disaster Recovery Report

**Product:** Garvix Hosting Manager v1.0.0-rc1  
**Engine:** `BackupAndDisasterRecoveryEngine` ([`advanced-production-engine.ts`](file:///Users/vishnubaldwa/Documents/cpanel/apps/local-panel-api/src/advanced-production-engine.ts))  
**Architectural Standard:** [ADR-005](file:///Users/vishnubaldwa/Documents/cpanel/docs/decisions/ADR-005-restic-backup-verification.md)

---

## 1. Backup Encryption & Logical Consistency Architecture

Every backup snapshot produced by Garvix Hosting Manager enforces:
- **Authenticated Encryption:** Key derivation via `scrypt` (`N=16384, r=8, p=1`, 32-byte key) and payload encryption via **AES-256-GCM** with a unique 96-bit IV and 128-bit authentication tag.
- **Logical Database Consistency:** Before capturing filesystem snapshots, PostgreSQL 16 databases are exported using `pg_dump --format=custom` (`PGDMP_GARVIX_V16` header) and MariaDB 10.11 databases are exported using `mariadb-dump --single-transaction` (`-- MARIADB_DUMP_SINGLE_TRANSACTION_V10_11` header).
- **Secret Redaction in Panel Metadata:** Account metadata bundled into the snapshot is sanitized via `redactSensitiveFields` so raw panel tokens are never written in cleartext.

---

## 2. Mandatory Automated Sandbox Verification (ADR-005)

Backups are **never** marked `VERIFIED` merely because the backup command exited with code `0`:
1. Newly created snapshots receive `status: 'COMPLETED_UNVERIFIED'` and `restoreVerified: false`.
2. Attempting to run `restoreFromBackup` on an unverified snapshot is rejected with `BACKUP_NOT_RESTORE_VERIFIED`.
3. `verifyBackupInSandbox(backupArtifactId)` decrypts the `.enc` snapshot into an isolated temporary directory (`/tmp/verify_<resticSnapshotId>_<timestamp>`), recomputes the SHA-256 hash of every extracted file on disk, verifies every PostgreSQL/MariaDB logical dump header, deletes the ephemeral sandbox, and promotes the artifact to `status: 'VERIFIED'` (`restoreVerified: true`).

---

## 3. Disaster Recovery Drill Results (`tests/recovery/phase7-chaos-and-dr-readiness.test.ts`)

| Drill Scenario | Scope | Verification Method | Result |
| :--- | :--- | :--- | :--- |
| **Accidental Single-File Corruption** | `FULL_ACCOUNT` | Overwrote `public_html/app.js` with corrupted bytes, restored from verified snapshot, verified exact content recovery | **PASS** |
| **Catastrophic Bare-Metal `/home` Loss** | `BARE_METAL_SERVER_DR` | Deleted entire `/home/gv_ent01` directory tree, restored web files + Maildir messages + PostgreSQL 16 dump + MariaDB 10.11 dump, verified byte-for-byte SHA-256 parity | **PASS** |
| **Disk Bit-Rot / Ciphertext Tampering** | Ciphertext Integrity | Flipped 1 byte at the end of `.enc` snapshot file; `verifyBackupInSandbox` caught AES-256-GCM authTag mismatch, cleaned up sandbox, and marked artifact `CORRUPTED_REJECTED` | **PASS** |
