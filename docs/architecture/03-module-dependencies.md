# 03 — Module Dependency Graph & State Machines

**Document ID:** `GHM-ARCH-03`  
**Owner:** Garvix Software Solutions Pvt Ltd  
**Status:** Approved  

---

## 1. Monorepo Package & Application Dependency Graph

Garvix Hosting Manager is structured as a strict, acyclic TypeScript + Go monorepo. Shared packages (`packages/*`) have zero circular dependencies and are consumed by the deployable applications (`apps/*`).

```mermaid
flowchart TD
    subgraph SharedPackages["Shared Foundational Packages (packages/*)"]
        SharedTypes["@garvix/shared-types (Domain Entities, Enums, Errors)"]
        Validation["@garvix/validation (Zod Schemas, Safe Input Validators)"]
        AuthZ["@garvix/authorization (RBAC Policy Matrix, Scope Guards)"]
        ApiContracts["@garvix/api-contracts (OpenAPI / REST & Agent IPC Contracts)"]
        Telemetry["@garvix/telemetry (Pino Structured Logger, Redaction, Audit Hash)"]
        UIComponents["@garvix/ui-components (Accessible Design System Primitives)"]

        Validation --> SharedTypes
        AuthZ --> SharedTypes
        ApiContracts --> SharedTypes
        ApiContracts --> Validation
        Telemetry --> SharedTypes
        UIComponents --> SharedTypes
    end

    subgraph Applications["Deployable Plane Applications (apps/*)"]
        CloudConsole["apps/cloud-console (Plane A Next.js UI)"]
        CustomerPanel["apps/customer-panel (Plane B Next.js UI)"]
        CloudAPI["apps/cloud-api (Plane A Fastify Service)"]
        LocalPanelAPI["apps/local-panel-api (Plane B Fastify + BullMQ Service)"]
        LinuxAgent["apps/linux-agent (Plane C Go Daemon: garvix-agentd)"]
    end

    CloudConsole --> UIComponents
    CloudConsole --> ApiContracts
    CloudConsole --> AuthZ

    CustomerPanel --> UIComponents
    CustomerPanel --> ApiContracts
    CustomerPanel --> AuthZ

    CloudAPI --> ApiContracts
    CloudAPI --> AuthZ
    CloudAPI --> Validation
    CloudAPI --> Telemetry

    LocalPanelAPI --> ApiContracts
    LocalPanelAPI --> AuthZ
    LocalPanelAPI --> Validation
    LocalPanelAPI --> Telemetry

    LocalPanelAPI -->|"JSON-RPC 2.0 over UDS"| LinuxAgent
    LocalPanelAPI <-->|"mTLS Heartbeat & License Sync"| CloudAPI
```

---

## 2. Product Module Inter-Dependency Graph (All 12 Modules)

Every product capability belongs to one of the 12 core modules. Lower-level infrastructure modules (`M01 Identity`, `M02 Server Lifecycle`, `M10 Observability`) provide foundational primitives to higher-level tenant workload modules (`M03 Accounts`, `M04 Domains/DNS/SSL`, `M05 Web/App`, `M06 Files/Git`, `M07 Databases`, `M08 Email`, `M09 Security`, `M11 Backups`).

```mermaid
flowchart TD
    M01["M01: Identity, RBAC, MFA & Step-Up Auth"]
    M12["M12: Commercial Licensing & GST Billing"]
    M02["M02: Server Enrollment & OS Lifecycle"]
    M10["M10: Observability, Metering & Audit Ledger"]
    M09["M09: Firewall, Fail2ban, WAF & Malware Defense"]
    M03["M03: Multi-Tenant Hosting Account & Package Manager"]
    M04["M04: Domain, Authoritative DNS & ACME SSL"]
    M05["M05: Web Server (Nginx/OLS) & Multi-PHP/Node/Python"]
    M06["M06: Jailed File Manager, SFTP & Git Deploy"]
    M07["M07: MariaDB, PostgreSQL & Redis Manager"]
    M08["M08: Email Stack (Postfix/Dovecot/Rspamd/DKIM)"]
    M11["M11: Restic Encrypted Backups, DR & Staged Migration"]

    M12 --> M01
    M02 --> M01
    M02 --> M12
    M09 --> M02
    M03 --> M01
    M03 --> M02
    M03 --> M12

    M04 --> M03
    M05 --> M03
    M05 --> M04
    M06 --> M03
    M06 --> M05
    M07 --> M03
    M08 --> M03
    M08 --> M04

    M11 --> M03
    M11 --> M04
    M11 --> M05
    M11 --> M06
    M11 --> M07
    M11 --> M08

    M03 --> M10
    M04 --> M10
    M05 --> M10
    M07 --> M10
    M08 --> M10
    M09 --> M10
    M11 --> M10
```

---

## 3. Hosting Account Provisioning & Lifecycle State Machine

A Hosting Account in `garvix_local` transitions deterministically through explicit states. No partial failure leaves orphan Linux users, dangling PHP-FPM sockets, or broken Nginx configs on the host.

```mermaid
stateDiagram-v2
    [*] --> PENDING : POST /api/v1/accounts (Quota & License Checked)

    PENDING --> PROVISIONING : BullMQ Worker Dequeues Job
    PROVISIONING --> ACTIVE : All 5 OS Steps Committed (User, Cgroup, Web/PHP, DNS, Mail)
    PROVISIONING --> ROLLING_BACK : Any OS Step Fails or Times Out
    ROLLING_BACK --> PROVISION_FAILED : Compensating Rollback Completed Cleanly

    PROVISION_FAILED --> PROVISIONING : Admin Triggers Idempotent Retry
    PROVISION_FAILED --> TERMINATED : Admin Purges Failed Record

    ACTIVE --> UPDATING_QUOTA : Package Upgrade / Quota Change Requested
    UPDATING_QUOTA --> ACTIVE : Cgroup v2 & XFS Quota Applied
    UPDATING_QUOTA --> ACTIVE : Quota Update Rolled Back (Previous Limits Retained)

    ACTIVE --> SUSPENDING : Admin/Reseller/Billing Suspension Triggered
    SUSPENDING --> SUSPENDED : Web Vhost Redirected to 503, PHP-FPM Stopped, SFTP/SMTP Locked

    SUSPENDED --> UNSUSPENDING : Admin/Reseller Unsuspends Account
    UNSUSPENDING --> ACTIVE : PHP-FPM Started, Web Vhost Restored, SFTP/SMTP Unlocked

    ACTIVE --> BACKING_UP : Scheduled or Manual Restic Snapshot Started
    BACKING_UP --> ACTIVE : Snapshot + Sandbox Test-Restore Verified

    ACTIVE --> RESTORING : Point-in-Time Restore Triggered
    SUSPENDED --> RESTORING : Point-in-Time Restore Triggered
    RESTORING --> ACTIVE : Pre-Restore Safety Snapshot Taken & Target Snapshot Applied

    ACTIVE --> TERMINATING : Step-Up MFA Confirmed Account Deletion
    SUSPENDED --> TERMINATING : Step-Up MFA Confirmed Account Deletion
    TERMINATING --> TERMINATED : Final Archive Optional -> Vhost, Mail, DBs, Cgroup, Linux User Purged
    TERMINATED --> [*]
```

---

## 4. Compensating Rollback Matrix During Account Provisioning

If `PROVISIONING` fails at Step $N$, the BullMQ worker invokes `garvix-agentd` compensating actions in reverse order ($N-1 \dots 1$) before transitioning the record to `PROVISION_FAILED`:

| Step # | Provisioning Action | Forward Agent RPC | Compensating Rollback RPC |
| :--- | :--- | :--- | :--- |
| **Step 1** | Create Linux user, `/home/<user>` skeleton, XFS quota, `garvix-tenant-<id>.slice` | `account.create_os_user` | `account.purge_os_user` (removes slice, quota, user, `/home/<user>`) |
| **Step 2** | Create per-user PHP-FPM pool config & start socket | `php.upsert_pool` | `php.remove_pool` |
| **Step 3** | Render Nginx/OLS vhost for primary domain & reload web server | `vhost.upsert` | `vhost.remove` |
| **Step 4** | Create authoritative DNS zone & default records (`A`, `AAAA`, `MX`, `SPF`, `DMARC`) | `dns.create_zone` | `dns.delete_zone` |
| **Step 5** | Generate 2048-bit/Ed25519 DKIM keypair, publish DNS TXT, enable mail domain | `mail.provision_domain` | `mail.remove_domain` |
