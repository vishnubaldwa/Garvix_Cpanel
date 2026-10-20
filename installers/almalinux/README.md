# Garvix Hosting Manager — AlmaLinux 10 Installer & Preflight Diagnostics

**Garvix Software Solutions Pvt Ltd**

This directory contains the read-only preflight verification suite and distribution adapter specifications for installing **Garvix Hosting Manager** on **AlmaLinux 10** (Tier-1 primary target) and compatible Linux distributions.

---

## 1. Safety & Non-Destructive Guarantees

[`preflight-check.sh`](file:///Users/vishnubaldwa/Documents/cpanel/installers/almalinux/preflight-check.sh) is strictly **read-only** and **non-destructive**:
- Modifies zero system files, zero users, and zero systemd units.
- Performs no outbound network mutations or package installations.
- Emits either human-readable structured logs or a machine-parseable JSON report (`--json`).

---

## 2. Competing Control Panel Hard Refusal (Exit Code `42`)

To prevent catastrophic data corruption on production servers, `preflight-check.sh` inspects the host for existing control panels and immediately exits with code `42` (`EXIT_COMPETING_PANEL`) if any of the following are present:
- **cPanel / WHM**: `/usr/local/cpanel` or `/var/cpanel`
- **Plesk**: `/usr/local/psa` or `/etc/psa`
- **DirectAdmin**: `/usr/local/directadmin`
- **CyberPanel**: `/usr/local/CyberCP` or `/home/cyberpanel`
- **Webmin / Virtualmin**: `/etc/webmin` or `/usr/libexec/webmin`

---

## 3. Distribution Adapter Matrix

| Distribution | Version | Support Tier | Adapter Identifier |
| :--- | :--- | :--- | :--- |
| **AlmaLinux** | `10.x` | **Tier-1 (Primary Production)** | `rhel10-almalinux` |
| **AlmaLinux** | `9.x` | Tier-2 (Adapter Flag `--allow-adapter-os`) | `rhel9-almalinux-compat` |
| **Rocky Linux** | `10.x` / `9.x` | Tier-2 (Adapter Flag `--allow-adapter-os`) | `rhel-rocky-adapter` |
| **Ubuntu LTS** | `24.04` / `22.04` | Tier-2 (Adapter Flag `--allow-adapter-os`) | `debian-ubuntu-lts-adapter` |
| **Debian** | `12` / `13` | Tier-2 (Adapter Flag `--allow-adapter-os`) | `debian-bookworm-trixie-adapter` |

---

## 4. Usage Examples

### Standard Interactive Preflight Check
```bash
bash ./installers/almalinux/preflight-check.sh
```

### Machine-Readable JSON Report
```bash
bash ./installers/almalinux/preflight-check.sh --json
```

### Ed25519 Signed Release Manifest Verification
```bash
bash ./installers/almalinux/preflight-check.sh \
  --manifest=/tmp/garvix-release-manifest.json \
  --signature=/tmp/garvix-release-manifest.json.sig \
  --pubkey=/etc/garvix/keys/release-ed25519.pub
```
