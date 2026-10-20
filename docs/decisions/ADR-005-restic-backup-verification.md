# ADR-005: Restic Deduplicated Encrypted Backups with Mandatory Automated Test-Restore Verification

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** Garvix Principal Systems & Cloud Architecture Team
- **Applies To:** `apps/linux-agent`, `apps/local-panel-api`, Module 11 (Backups & DR)

---

## 1. Context and Problem Statement

Traditional hosting panels generate monolithic `.tar.gz` archives for every daily backup run. On a 200 GB NVMe server with 110 GB of tenant data:
1. Full daily `.tar.gz` archives quickly exhaust local disk space and incur high outbound bandwidth and S3 storage costs.
2. Unencrypted or weakly encrypted archives stored on external S3/FTP buckets risk severe data breaches.
3. Most importantly, backup jobs frequently report `"Success"` simply because `tar` exited with `0`, only for the administrator to discover during an actual disaster that the SQL dump was truncated or the repository pack index was corrupted.

## 2. Considered Options

1. **Restic (Content-Defined Chunking + AES-256-CTR/Poly1305) + Automated Ephemeral Sandbox Restore Verification**
2. **Legacy Full/Incremental `tar.gz` + `gpg` + `rclone`**
3. **BorgBackup (SSH-only native repositories)**

## 3. Decision Outcome

Chosen option: **Option 1 — Restic with mandatory pre-backup logical DB dumps and post-backup automated sandbox restore verification**.

### Rationale
1. **Authenticated Encryption by Default:** Every Restic repository uses AES-256-CTR with Poly1305-AES MACs. No plaintext customer file or database dump ever touches S3, Backblaze B2, Wasabi, or SFTP targets.
2. **Content-Defined Deduplication:** Using Rabin fingerprinting chunking, daily snapshots after the initial baseline transfer and store only changed byte blocks, reducing local staging and S3 storage usage by 75%–90%.
3. **Cloud-Native Multi-Backend Support:** Restic natively supports Local paths, S3-compatible object storage (AWS S3, Cloudflare R2, Backblaze B2, Wasabi, MinIO), and SFTP without requiring remote shell execution on storage buckets.
4. **Mandatory `VERIFIED` State Gate:**
   - A backup job starts in `RUNNING`, transitions to `SNAPSHOT_CREATED` when `restic backup` completes, and transitions to `VERIFIED` **only** after `garvix-agentd`:
     1. Runs `restic check --read-data-subset=10%`.
     2. Restores `account-manifest.json`, sample web files, and the logical database dump (`mariadb-dump` / `pg_dump`) into an isolated ephemeral directory (`/var/cache/garvix-backups/verify-<id>`).
     3. Verifies SHA-256 file checksums and performs a real test import into a disposable verification database schema (`ghm_verify_<random>`), immediately dropping the temporary schema afterward.

## 4. Consequences

- **Positive:** Eliminates silent backup corruption; dramatically reduces S3 storage bills and NVMe wear; guarantees that every backup badged `VERIFIED` in the UI has been proven restorable.
- **Negative / Mitigation:** Verification adds ~15–45 seconds per backup job and requires up to 20 GB of local staging/sandbox space on the 200 GB NVMe drive (explicitly reserved in `00-prd.md` Section 2.3).
