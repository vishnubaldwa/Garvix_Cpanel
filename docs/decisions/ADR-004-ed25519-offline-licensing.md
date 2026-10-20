# ADR-004: Ed25519 Asymmetric Offline Licensing & Non-Destructive Expiration Policy

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** Garvix Principal Systems & Cloud Architecture Team
- **Applies To:** `apps/cloud-api`, `apps/local-panel-api`, `apps/linux-agent`

---

## 1. Context and Problem Statement

Commercial self-hosted server software must protect intellectual property and enforce subscription entitlements (such as maximum hosting accounts or reseller tiers) while avoiding two failure modes that plague legacy hosting panels:
1. **Fragile Online Check-Ins:** Panels that perform synchronous HTTP license checks on every login fail whenever the vendor's licensing API experiences a network outage or DNS failure.
2. **Hostile / Destructive Expiration:** Panels that shut down customer web servers, mail servers, or block backup downloads when a billing card fails cause catastrophic business damage to end customers and violate trust.

## 2. Decision Outcome

We adopt **Ed25519 Asymmetric Digital Signatures (RFC 8032)** for both license tokens and software release manifests, paired with a **72-hour offline grace period** and a strict **Non-Destructive Expiration Policy**:

1. **Asymmetric Ed25519 Signing (`crypto.sign(null, payload, privateKey)`):**
   - The Ed25519 private signing key resides exclusively inside the Garvix Cloud Control Plane (`Plane A`) HSM/KMS vault.
   - Only the 32-byte Ed25519 public verification key is embedded in `local-panel-api` and `garvix-agentd`. Even a user with full `root` access on the customer server cannot forge a license token without the Cloud private key.
2. **2-of-3 Composite Hardware Fingerprint (IP-Agnostic):**
   - Licenses bind to a 2-of-3 quorum of hashed hardware anchors (`DMI Product UUID`, `/etc/machine-id` + node identity key, `Root Filesystem UUID`), tolerating IPv4/IPv6 reassignments and kernel updates without invalidating the license.
3. **72-Hour Offline Grace Window:**
   - Local servers sync via mTLS heartbeat every 6 hours. If `Plane A` is unreachable, the local verifier validates the cached Ed25519 signature locally and permits 100% read/write operations for up to 72 hours past the sync window.
4. **Non-Destructive `EXPIRED_RESTRICTED` Mode:**
   - When a license expires past the 72-hour grace window, **customer websites (Nginx/PHP-FPM), databases (MariaDB/PostgreSQL), email (Postfix/Dovecot/Rspamd), DNS (PowerDNS), ACME SSL renewals, and scheduled Restic backups continue running 100% uninterrupted**.
   - Only administrative creation of *new* hosting accounts, domains, or mailboxes in the Local Panel UI/API is restricted (`402 LICENSE_RESTRICTED_READONLY`), while backup exports, telemetry viewing, and security password rotations remain accessible.

## 3. Consequences

- **Positive:** Zero single point of failure on Garvix Cloud uptime; deterministic cryptographic tamper resistance; industry-leading customer safety guarantee.
- **Negative / Mitigation:** Requires key-rotation support (`kid` header with pinned primary + backup Ed25519 public keys) in case of key rollover.
