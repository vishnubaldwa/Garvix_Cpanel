# 02 — Inter-Plane Communication Flows & IPC Protocols

**Document ID:** `GHM-ARCH-02`  
**Owner:** Garvix Software Solutions Pvt Ltd  
**Status:** Approved  

---

## 1. Communication Security Matrix

| Source Plane | Target Plane | Transport Protocol | Authentication & Integrity | Framing & Serialization |
| :--- | :--- | :--- | :--- | :--- |
| **Browser / CLI** | **Plane A (`cloud-api`)** | HTTPS (TLS 1.3) | Bearer JWT + HTTP-Only Refresh Cookie + CSRF + Step-Up Token | JSON (`application/json`) |
| **Browser / CLI** | **Plane B (`local-panel-api`)** | HTTPS (TLS 1.3, port 8443/2083) | Bearer JWT + Session ID + TOTP/WebAuthn Step-Up Token | JSON (`application/json`) |
| **Plane B (`local-panel-api`)** | **Plane A (`cloud-api`)** | HTTPS + Mutual TLS (mTLS) | Client X.509 Cert (`CN=srv_<id>`) + Ed25519 Signed Payloads | JSON (`application/json`) |
| **Plane B (`local-panel-api` / Worker)** | **Plane C (`garvix-agentd`)** | Unix Domain Socket (`/run/garvix/agent.sock`) | Kernel `SO_PEERCRED` (`UID == garvix-panel`) + HMAC-SHA256 Request Signature | 4-Byte Big-Endian Length Prefix + JSON-RPC 2.0 |

---

## 2. Flow 1: Server Enrollment & mTLS Bootstrap

When a customer purchases a license in the Garvix Cloud Console and runs the enrollment command on a fresh AlmaLinux 10 server, the server establishes a cryptographic identity and receives its signed license and client certificate.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Server Admin
    participant CloudUI as Plane A: Cloud Console
    participant CloudAPI as Plane A: Cloud API & PKI CA
    participant Agent as Plane C: garvix-agentd (AlmaLinux 10)
    participant LocalAPI as Plane B: Local Panel API

    Admin->>CloudUI: Request "Enroll New Server" (Select License Plan)
    CloudUI->>CloudAPI: POST /cloud/api/v1/servers/enrollment-tokens
    CloudAPI-->>CloudUI: One-Time Enrollment Token (TTL: 15m, single-use)
    Admin->>Agent: Run `garvix-ctl enroll --token <token>`
    Agent->>Agent: Collect Hardware Fingerprint (DMI UUID, Machine ID, Root FS UUID, CPU/RAM)
    Agent->>Agent: Generate Ed25519 Keypair & ECDSA P-384 CSR (Private Key never leaves server)
    Agent->>CloudAPI: POST /cloud/api/v1/servers/enroll (Token, CSR, Hardware Fingerprint, OS Metadata)
    CloudAPI->>CloudAPI: Validate Token, Bind License to Hardware Fingerprint, Sign Client X.509 Cert
    CloudAPI->>CloudAPI: Sign Initial Offline License Token (Ed25519)
    CloudAPI-->>Agent: 201 Created (Client Cert, CA Chain, Signed License JWT, Server ID)
    Agent->>Agent: Persist Certs to /etc/garvix/pki/ (0600 root:garvix-panel) & License to /etc/garvix/license.jwt
    Agent->>LocalAPI: Trigger systemd reload `garvix-panel.service`
    LocalAPI->>CloudAPI: POST /cloud/api/v1/servers/heartbeat (over mTLS)
    CloudAPI-->>LocalAPI: 200 OK (Sync Acknowledged)
```

---

## 3. Flow 2: Local Panel <-> Privileged Agent IPC over Unix Domain Socket (`SO_PEERCRED`)

All OS mutations requested by `local-panel-api` or the BullMQ provisioning worker pass over `/run/garvix/agent.sock`. The Go agent enforces a strict **5-stage transactional pipeline**:
1. **Kernel Credential & Schema Check:** Verify `SO_PEERCRED` UID/GID/PID and validate parameters against strict regex/type constraints.
2. **Snapshot Current State:** Copy affected files in `/etc` or `/var/lib` into `/var/lib/garvix/tx/<tx_id>/backup/`.
3. **Stage & Dry-Run Validate:** Render new config from compiled Go templates into `/var/lib/garvix/tx/<tx_id>/staged/` and run native syntax checkers (`nginx -t`, `named-checkzone`, `postconf -n`, `doveconf -n`).
4. **Atomic Apply & Reload:** Atomically `rename(2)` staged files into target paths, apply SELinux contexts (`restorecon`), and reload systemd units.
5. **Post-Reload Health Check & Auto-Rollback:** Verify systemd unit active state and socket responsiveness; if unhealthy, restore snapshot files and reload immediately.

```mermaid
sequenceDiagram
    autonumber
    participant Worker as Plane B: BullMQ Worker (UID: garvix-panel)
    participant UDS as Plane C: garvix-agentd UDS Server
    participant Validator as Plane C: Schema & Policy Engine
    participant TxMgr as Plane C: Transactional Config Engine
    participant OS as Plane D: AlmaLinux 10 (systemd / Nginx / SELinux)

    Worker->>UDS: Connect /run/garvix/agent.sock + Send RPC (op: "vhost.upsert", correlationId, payload)
    UDS->>UDS: getsockopt(SO_PEERCRED) -> Verify UID == 988 (garvix-panel)
    UDS->>Validator: Validate RPC Method Allowlist & Strict Parameter Schema
    Validator-->>UDS: Validation Passed
    UDS->>TxMgr: BeginTransaction(tx_id, correlationId)
    TxMgr->>TxMgr: Snapshot existing /etc/nginx/conf.d/tenant.conf -> /var/lib/garvix/tx/<tx_id>/
    TxMgr->>TxMgr: Render template to /etc/nginx/conf.d/.tenant.conf.staging
    TxMgr->>OS: execve("/usr/sbin/nginx", ["-t", "-c", "/etc/nginx/nginx.conf"])
    alt Dry-Run Validation Succeeds
        OS-->>TxMgr: Exit Code 0 (Syntax OK)
        TxMgr->>OS: Atomic rename() + restorecon + systemctl reload nginx
        OS-->>TxMgr: Reload Exit Code 0
        TxMgr->>OS: Verify systemd ActiveState == "active"
        TxMgr-->>UDS: CommitTransaction(tx_id, checksum, durationMs)
        UDS-->>Worker: RPC Response { status: "SUCCESS", txId, auditHash }
    else Dry-Run or Reload Fails
        OS-->>TxMgr: Non-Zero Exit Code + Stderr
        TxMgr->>OS: Restore Snapshot from /var/lib/garvix/tx/<tx_id>/ & Reload Nginx
        TxMgr-->>UDS: RollbackTransaction(tx_id, errorDetails)
        UDS-->>Worker: RPC Error { code: "AGENT_CONFIG_ROLLBACK", rolledBack: true, stderr }
    end
```

---

## 4. Flow 3: Asynchronous Provisioning State Machine (BullMQ -> Local API -> Go Agent -> Audit Log)

Operations that mutate multiple OS subsystems (such as provisioning a hosting account, issuing ACME certificates, or running a Restic backup) execute asynchronously using idempotent BullMQ jobs.

```mermaid
sequenceDiagram
    autonumber
    actor User as Admin / Reseller
    participant API as Plane B: Local Panel API
    participant DB as Plane B: PostgreSQL (garvix_local)
    participant Queue as Plane B: Redis / BullMQ
    participant Worker as Plane B: Provisioning Worker
    participant Agent as Plane C: garvix-agentd

    User->>API: POST /api/v1/accounts (Idempotency-Key: <uuid>)
    API->>DB: Check Idempotency-Key & Quota Capacity
    API->>DB: Insert HostingAccount (state: PENDING) & ProvisioningJob (state: QUEUED)
    API->>Queue: Enqueue Job "account.provision" (jobId, accountId, correlationId)
    API-->>User: 202 Accepted { jobId, status: "QUEUED", pollUrl: "/api/v1/jobs/<jobId>" }

    Queue->>Worker: Dequeue "account.provision"
    Worker->>DB: Update Job state -> RUNNING (step 1/5: Linux User & Cgroup)
    Worker->>Agent: RPC "account.create_os_user" (username, uid, quotaMb, cgroupLimits)
    Agent-->>Worker: OK (UID, Slice Created, XFS Quota Set)

    Worker->>DB: Update Job progress (step 2/5: PHP-FPM & Web Root)
    Worker->>Agent: RPC "php.upsert_pool" + "vhost.upsert"
    Agent-->>Worker: OK (Pool Socket & Nginx Vhost Active)

    Worker->>DB: Update Job progress (step 3/5: DNS Zone & DKIM)
    Worker->>Agent: RPC "dns.create_zone" + "mail.generate_dkim"
    Agent-->>Worker: OK (Zone Serial & DKIM Public Key)

    Worker->>DB: Update HostingAccount state -> ACTIVE, Job state -> COMPLETED
    Worker->>DB: Append Hash-Chained Audit Log Entry (prevHash + currentHash)

    User->>API: GET /api/v1/jobs/<jobId>
    API->>DB: Fetch Job Status & Steps
    API-->>User: 200 OK { jobId, status: "COMPLETED", progress: 100, resourceId: "<accountId>" }
```

---

## 5. Flow 4: Offline-Capable Ed25519 License Validation & Heartbeat Sync

```mermaid
sequenceDiagram
    autonumber
    participant Scheduler as Plane B: Heartbeat Cron (Every 6h)
    participant Verifier as Plane B: Local Ed25519 Verifier
    participant CloudAPI as Plane A: Cloud License API
    participant Signer as Plane A: Ed25519 License Signer

    Scheduler->>Verifier: Read /etc/garvix/license.jwt & Hardware Fingerprint
    Verifier->>CloudAPI: POST /cloud/api/v1/licenses/heartbeat (mTLS, licenseId, fingerprint, accountCount)
    alt Cloud Control Plane Reachable
        CloudAPI->>CloudAPI: Check Subscription Status & Hardware Drift Score (>= 2 of 3 anchor IDs match)
        CloudAPI->>Signer: Sign Refreshed License Token (valid +7 days, offlineGraceHours: 72)
        Signer-->>CloudAPI: Signed Ed25519 Token
        CloudAPI-->>Verifier: 200 OK { licenseToken, status: "ACTIVE", nextSyncSeconds: 21600 }
        Verifier->>Verifier: Verify Ed25519 Signature with Embedded Public Key & Persist Atomically
    else Cloud Control Plane Unreachable (Network Outage / Timeout)
        CloudAPI--xVerifier: Connection Timeout / 5xx
        Verifier->>Verifier: Verify Cached /etc/garvix/license.jwt Signature & Claims Locally
        alt CurrentTime <= (expiresAt + 72h Offline Grace Window)
            Verifier->>Verifier: Set Panel Mode = ACTIVE (Offline Grace Mode, Banner Warning Only)
        else CurrentTime > (expiresAt + 72h Offline Grace Window)
            Verifier->>Verifier: Set Panel Mode = RESTRICTED_READONLY (Plane D Workloads Remain 100% Running)
        end
    end
```
