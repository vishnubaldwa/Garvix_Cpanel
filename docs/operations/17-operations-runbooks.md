# Phase 7 — Production SRE & Support Operations Runbooks

**Product:** Garvix Hosting Manager  
**Audience:** Garvix Platform SREs, Support Operators, and Customer Server Administrators

---

## Runbook 1: Emergency Recovery Mode & Bad Configuration Rollback

### Symptoms
- Nginx, Postfix, or PowerDNS fails to reload after a configuration change.
- A hosting account provisioning job enters `FAILED_ROLLED_BACK`.

### Automated Behavior
The Privileged Linux Agent (`SandboxedLinuxAgentEngine`) automatically captures a pre-change filesystem snapshot (`snap_<requestId>`) before modifying any configuration file and runs `nginx -t` / syntax validation before reload. If validation fails, the agent automatically restores the pre-change snapshot.

### Manual Verification Steps
1. Inspect the local agent audit chain via `GET /api/v1/audit-logs` or `verifyAuditChainIntegrity()`.
2. Confirm the failed operation recorded `status: 'FAILED_ROLLED_BACK'` and `rollbackVerified: true`.
3. Verify service health on the Server Management dashboard (`/api/v1/server/services`).

---

## Runbook 2: Cloud Control Plane Outage & Offline License Grace Operations

### Symptoms
- Local Customer Hosting Panel cannot reach `cloud.garvix.io` for heartbeat or license sync.

### Automated Behavior
- The Local Panel verifies the cached `SignedLicenseEnvelope` offline using the embedded Garvix Cloud Ed25519 public key (`verifyLicenseLocally`).
- If the license timestamp is within the **72-hour offline grace window** (`OFFLINE_GRACE_PERIOD`), all local panel operations, account provisioning, SSL renewals, backups, and customer workloads continue with **100% functionality**.
- Even if the 72-hour grace period expires (`EXPIRED_READ_ONLY_ADMIN`), **customer websites, databases, DNS zones, and email services continue running uninterrupted**, and backups/exports remain enabled.

---

## Runbook 3: Compromised Mailbox & Outbound Spam Spike Response

### Symptoms
- Security alert `MAILBOX_AUTO_SUSPENDED_BOUNCE_SPIKE` or `SASL_BRUTE_FORCE_IP_LOCKED`.
- Outbound bounce rate exceeds $15\%$ over $\ge 20$ messages.

### Remediation Steps
1. The `EmailInfrastructureManager` automatically suspends outbound SMTP submission for the affected mailbox while preserving inbound mail delivery.
2. Rotate the mailbox password (enforcing Argon2id/scrypt hashing) and revoke active webmail/IMAP sessions.
3. Inspect the outbound mail queue and remove spam messages.
4. Run the 13-point Mail Preflight Check (`evaluateMailServerPreflight`) to verify the server IP has not been listed on DNSBLs (`IP_REPUTATION_RBL`).
5. Reactivate outbound sending for the mailbox once credentials are rotated.

---

## Runbook 4: VPS Hardware Migration & License Transfer

### Procedure
1. Provision the new target AlmaLinux 10 VPS and run `installers/almalinux/preflight-check.sh`.
2. In the Garvix Cloud Console, generate a single-use enrollment token (`createServerEnrollmentToken`) and enroll the new VPS (`completeServerEnrollment`).
3. Restore the latest `VERIFIED` Restic backup snapshot onto the new VPS (`restoreFromBackup` with scope `BARE_METAL_SERVER_DR`).
4. Execute `transferServerLicense(principal, { licenseId, fromServerId, toServerId })` with Step-Up MFA. This atomically binds the Ed25519 license to the new VPS hardware fingerprint and revokes the old server's mTLS certificate.

---

## Runbook 5: Master Encryption Key (KEK) Rotation

### Procedure
1. Authenticate as `SERVER_ADMIN` or `CUSTOMER_ORG_OWNER` and complete Step-Up MFA (TOTP or WebAuthn passkey).
2. Trigger `SecurityCenterEngine.rotateEncryptionKeys({ actorUserId, stepUpMfaVerified: true, ipAddress })`.
3. Verify the returned `newKeyVersion` incremented and `reEncryptedCount` matches the total count of stored envelope secrets.
4. Confirm event `ENVELOPE_KEK_ROTATED` appears in the SIEM/CEF security audit log.
