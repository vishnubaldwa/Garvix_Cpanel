# Phase 7 — AlmaLinux 10 Installation & Rollback Validation Report

**Product:** Garvix Hosting Manager v1.0.0-rc1  
**Target OS:** AlmaLinux 10 (`x86_64` / `aarch64`)  
**Reference Hardware Profile:** 4 vCPU, 16 GB RAM, 200 GB NVMe, Dedicated IPv4, 16 TB Bandwidth

---

## 1. Non-Destructive Preflight Validation

The installer preflight script ([`installers/almalinux/preflight-check.sh`](file:///Users/vishnubaldwa/Documents/cpanel/installers/almalinux/preflight-check.sh)) and programmatic preflight engine (`runSystemPreflight` in [`agent-engine.ts`](file:///Users/vishnubaldwa/Documents/cpanel/apps/local-panel-api/src/agent-engine.ts)) were validated against clean and conflicted sandbox environments:

| Preflight Check | Expected Behavior | Validation Result |
| :--- | :--- | :--- |
| **Competing Control Panel Detection** (`/usr/local/cpanel`, `/usr/local/psa`, `/usr/local/directadmin`, `/usr/local/CyberCP`, `/etc/webmin`) | Hard refusal with exit code `42` (`REFUSED_COMPETING_PANEL`) before modifying any file or package | **VERIFIED** (`tests/unit/phase2-linux-agent.test.ts` & `tests/unit/phase6-advanced-production.test.ts`) |
| **OS Family & Kernel cgroup v2 Verification** | Confirms `/etc/os-release` (`PLATFORM_ID="platform:el10"`) and `/sys/fs/cgroup/cgroup.controllers` | **VERIFIED** |
| **Hardware Resource & Capacity Calculation** | Reserves 3,277 MB RAM and 36 GB NVMe for OS + Panel + DB overhead on the 16 GB / 200 GB profile, yielding realistic recommendations (`72` active accounts, `136` PHP-FPM workers, `256` DB connections) | **VERIFIED** (`tests/unit/capacity-and-mail-preflight.test.ts`) |
| **Ed25519 Release Manifest Verification** | Verifies cryptographic signature on release manifest and SHA-256 checksum on installer artifacts before execution | **VERIFIED** (`tests/unit/phase5-commercial-cloud.test.ts`) |

---

## 2. Staged Installation & Reverse-Order Rollback Verification

The commercial installer orchestrator (`FleetAndInstallerOrchestrator.runCommercialInstallerWorkflow` in [`advanced-production-engine.ts`](file:///Users/vishnubaldwa/Documents/cpanel/apps/local-panel-api/src/advanced-production-engine.ts)) executes 6 transactional stages:

1. `PREFLIGHT_AND_SIGNATURE_VERIFIED`
2. `CONFIGURE_REPOS_AND_PACKAGES`
3. `INSTALL_GO_AGENT_AND_UDS`
4. `INITIALIZE_LOCAL_PANEL_DB`
5. `ENROLL_AND_ACTIVATE_LICENSE`
6. `POST_INSTALL_HEALTH_CHECK`

### Simulated Mid-Installation Failure Test
- **Injected Fault:** Simulated failure at Stage 4 (`INITIALIZE_LOCAL_PANEL_DB`).
- **Observed Outcome:** Installer immediately halted forward progress and executed reverse-order rollback across `INSTALL_GO_AGENT_AND_UDS` $\rightarrow$ `CONFIGURE_REPOS_AND_PACKAGES` $\rightarrow$ `PREFLIGHT_AND_SIGNATURE_VERIFIED`, returning final status `FAILED_ROLLED_BACK` with zero orphaned services.
