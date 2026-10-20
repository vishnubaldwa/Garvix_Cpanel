#!/usr/bin/env bash
# ==============================================================================
# Garvix Hosting Manager — Safe AlmaLinux 10 Installer Preflight Diagnostic
# Copyright (c) Garvix Software Solutions Pvt Ltd. All rights reserved.
#
# SECURITY & SAFETY GUARANTEE:
#   - Strictly READ-ONLY and NON-DESTRUCTIVE.
#   - Modifies zero files, installs zero packages, and alters zero services.
#   - Performs a HARD REFUSAL (exit code 42) if a competing control panel
#     (cPanel/WHM, Plesk, DirectAdmin, CyberPanel, Webmin) is detected.
# ==============================================================================

set -euo pipefail

readonly GARVIX_VERSION="1.0.0"
readonly EXIT_OK=0
readonly EXIT_OS_UNSUPPORTED=10
readonly EXIT_COMPETING_PANEL=42
readonly EXIT_INSUFFICIENT_HW=20
readonly EXIT_PORT_CONFLICT=30
readonly EXIT_SIGNATURE_INVALID=50

OUTPUT_JSON=0
MANIFEST_FILE=""
SIGNATURE_FILE=""
PUBKEY_FILE=""
ALLOW_ADAPTER_OS=0

for arg in "$@"; do
  case "$arg" in
    --json)
      OUTPUT_JSON=1
      ;;
    --allow-adapter-os)
      ALLOW_ADAPTER_OS=1
      ;;
    --manifest=*)
      MANIFEST_FILE="${arg#*=}"
      ;;
    --signature=*)
      SIGNATURE_FILE="${arg#*=}"
      ;;
    --pubkey=*)
      PUBKEY_FILE="${arg#*=}"
      ;;
    --help|-h)
      cat <<'EOF'
Usage: preflight-check.sh [OPTIONS]

Read-only, non-destructive preflight diagnostic for Garvix Hosting Manager.

Options:
  --json                 Emit machine-readable JSON diagnostic report
  --allow-adapter-os     Permit Tier-2 OS adapters (Rocky Linux, Ubuntu LTS, Debian)
  --manifest=<path>      Path to release manifest file for Ed25519 verification
  --signature=<path>     Path to Ed25519 signature file (.sig)
  --pubkey=<path>        Path to Garvix Release Signing Ed25519 public key (.pub)
  -h, --help             Show this help message
EOF
      exit 0
      ;;
  esac
done

log_info() {
  if [[ "$OUTPUT_JSON" -eq 0 ]]; then
    printf "[INFO]  %s\n" "$*"
  fi
}

log_warn() {
  if [[ "$OUTPUT_JSON" -eq 0 ]]; then
    printf "[WARN]  %s\n" "$*" >&2
  fi
}

log_error() {
  if [[ "$OUTPUT_JSON" -eq 0 ]]; then
    printf "[ERROR] %s\n" "$*" >&2
  fi
}

# ==============================================================================
# 1. Operating System & Distribution Adapter Verification
# ==============================================================================
OS_ID="unknown"
OS_VERSION_ID="unknown"
OS_PRETTY_NAME="Unknown OS"
OS_ADAPTER="none"
OS_TIER="unsupported"

if [[ -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  OS_ID="${ID:-unknown}"
  OS_VERSION_ID="${VERSION_ID:-unknown}"
  OS_PRETTY_NAME="${PRETTY_NAME:-Unknown Linux}"
elif [[ "$(uname -s)" == "Darwin" ]]; then
  OS_ID="darwin"
  OS_VERSION_ID="$(sw_vers -productVersion 2>/dev/null || echo 'macos')"
  OS_PRETTY_NAME="macOS ${OS_VERSION_ID} (Local Development / Mock Host)"
fi

MAJOR_VER="${OS_VERSION_ID%%.*}"

case "${OS_ID}" in
  almalinux)
    if [[ "${MAJOR_VER}" == "10" ]]; then
      OS_ADAPTER="rhel10-almalinux"
      OS_TIER="tier1-primary"
    elif [[ "${MAJOR_VER}" == "9" ]]; then
      OS_ADAPTER="rhel9-almalinux-compat"
      OS_TIER="tier2-adapter"
    fi
    ;;
  rocky)
    if [[ "${MAJOR_VER}" == "10" || "${MAJOR_VER}" == "9" ]]; then
      OS_ADAPTER="rhel-rocky-adapter"
      OS_TIER="tier2-adapter"
    fi
    ;;
  ubuntu)
    if [[ "${OS_VERSION_ID}" == "24.04" || "${OS_VERSION_ID}" == "22.04" ]]; then
      OS_ADAPTER="debian-ubuntu-lts-adapter"
      OS_TIER="tier2-adapter"
    fi
    ;;
  debian)
    if [[ "${MAJOR_VER}" == "12" || "${MAJOR_VER}" == "13" ]]; then
      OS_ADAPTER="debian-bookworm-trixie-adapter"
      OS_TIER="tier2-adapter"
    fi
    ;;
  darwin)
    OS_ADAPTER="darwin-mock-dev"
    OS_TIER="tier2-adapter"
    ;;
esac

log_info "Detected OS: ${OS_PRETTY_NAME} (id=${OS_ID}, version=${OS_VERSION_ID}, adapter=${OS_ADAPTER}, tier=${OS_TIER})"

if [[ "${OS_TIER}" == "unsupported" ]]; then
  log_error "Unsupported Operating System (${OS_PRETTY_NAME}). AlmaLinux 10 is required for Tier-1 production."
  exit "${EXIT_OS_UNSUPPORTED}"
fi

if [[ "${OS_TIER}" == "tier2-adapter" && "${ALLOW_ADAPTER_OS}" -eq 0 && "${OS_ID}" != "darwin" ]]; then
  log_error "OS ${OS_PRETTY_NAME} requires --allow-adapter-os flag (AlmaLinux 10 is Tier-1 default)."
  exit "${EXIT_OS_UNSUPPORTED}"
fi

# ==============================================================================
# 2. Competing Control Panel Conflict Detector (HARD REFUSAL)
# ==============================================================================
DETECTED_PANELS=()

if [[ -d /usr/local/cpanel || -e /var/cpanel ]]; then
  DETECTED_PANELS+=("cPanel/WHM (/usr/local/cpanel)")
fi
if [[ -d /usr/local/psa || -e /etc/psa ]]; then
  DETECTED_PANELS+=("Plesk (/usr/local/psa)")
fi
if [[ -d /usr/local/directadmin ]]; then
  DETECTED_PANELS+=("DirectAdmin (/usr/local/directadmin)")
fi
if [[ -d /usr/local/CyberCP || -d /home/cyberpanel ]]; then
  DETECTED_PANELS+=("CyberPanel (/usr/local/CyberCP)")
fi
if [[ -d /etc/webmin || -d /usr/libexec/webmin ]]; then
  DETECTED_PANELS+=("Webmin (/etc/webmin)")
fi

if [[ "${#DETECTED_PANELS[@]}" -gt 0 ]]; then
  log_error "HARD REFUSAL: Competing hosting control panel installation detected:"
  for panel in "${DETECTED_PANELS[@]}"; do
    log_error "  - ${panel}"
  done
  log_error "Garvix Hosting Manager requires a clean AlmaLinux 10 host and will NEVER overwrite an existing control panel."
  exit "${EXIT_COMPETING_PANEL}"
fi
log_info "Competing control panel check passed: no conflicting panels found."

# ==============================================================================
# 3. Hardware Resource Verification & Realistic Capacity Sizing
# ==============================================================================
CPU_CORES=1
RAM_MB=1024
DISK_FREE_GB=20
INODES_FREE=100000

if command -v nproc >/dev/null 2>&1; then
  CPU_CORES="$(nproc)"
elif [[ "$(uname -s)" == "Darwin" ]]; then
  CPU_CORES="$(sysctl -n hw.ncpu 2>/dev/null || echo 2)"
fi

if [[ -r /proc/meminfo ]]; then
  MEM_KB="$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)"
  RAM_MB=$(( MEM_KB / 1024 ))
elif [[ "$(uname -s)" == "Darwin" ]]; then
  MEM_BYTES="$(sysctl -n hw.memsize 2>/dev/null || echo 4294967296)"
  RAM_MB=$(( MEM_BYTES / 1048576 ))
fi

DISK_KB="$(df -Pk / 2>/dev/null | awk 'NR==2 {print $4}' || echo 41943040)"
DISK_FREE_GB=$(( DISK_KB / 1048576 ))

INODES_FREE="$(df -Pi / 2>/dev/null | awk 'NR==2 {print $4}' || echo 500000)"

# Realistic capacity estimation formula:
# Reserve 1200 MB RAM for OS + Garvix Control Plane + PostgreSQL + Nginx + Mail Stack.
# Estimate ~90 MB active footprint per standard PHP/WordPress tenant account,
# bounded by CPU (18 accounts per vCPU core) and disk (2 GB per account after 15 GB system reserve).
USABLE_RAM_MB=$(( RAM_MB > 1200 ? RAM_MB - 1200 : 0 ))
MAX_BY_RAM=$(( USABLE_RAM_MB / 90 ))
MAX_BY_CPU=$(( CPU_CORES * 18 ))
USABLE_DISK_GB=$(( DISK_FREE_GB > 15 ? DISK_FREE_GB - 15 : 0 ))
MAX_BY_DISK=$(( USABLE_DISK_GB / 2 ))

RECOMMENDED_MAX_ACCOUNTS="${MAX_BY_RAM}"
if [[ "${MAX_BY_CPU}" -lt "${RECOMMENDED_MAX_ACCOUNTS}" ]]; then
  RECOMMENDED_MAX_ACCOUNTS="${MAX_BY_CPU}"
fi
if [[ "${MAX_BY_DISK}" -lt "${RECOMMENDED_MAX_ACCOUNTS}" ]]; then
  RECOMMENDED_MAX_ACCOUNTS="${MAX_BY_DISK}"
fi
if [[ "${RECOMMENDED_MAX_ACCOUNTS}" -lt 0 ]]; then
  RECOMMENDED_MAX_ACCOUNTS=0
fi

log_info "Hardware Resources: CPU=${CPU_CORES} cores, RAM=${RAM_MB} MB, DiskFree=${DISK_FREE_GB} GB, FreeInodes=${INODES_FREE}"
log_info "Capacity Estimate: Recommended max WordPress/PHP hosting accounts = ${RECOMMENDED_MAX_ACCOUNTS}"

if [[ "${CPU_CORES}" -lt 2 || "${RAM_MB}" -lt 1800 || "${DISK_FREE_GB}" -lt 20 ]]; then
  log_warn "Host is below production minimum requirements (2 vCPU, 2048 MB RAM, 20 GB free disk)."
fi

# ==============================================================================
# 4. Port Conflict & Existing Workload Inspection
# ==============================================================================
REQUIRED_PORTS=(80 443 25 465 587 993 53 5432 3306)
OCCUPIED_PORTS=()

check_port_listening() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -tuln 2>/dev/null | grep -E "(:|\\.)(${port})[[:space:]]" >/dev/null 2>&1 && return 0
  elif command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1 && return 0
  fi
  return 1
}

for port in "${REQUIRED_PORTS[@]}"; do
  if check_port_listening "${port}"; then
    OCCUPIED_PORTS+=("${port}")
  fi
done

if [[ "${#OCCUPIED_PORTS[@]}" -gt 0 ]]; then
  log_warn "Active listeners detected on managed ports: ${OCCUPIED_PORTS[*]} (verified in read-only mode)"
else
  log_info "Port availability check passed: all managed ports (80, 443, 25, 465, 587, 993, 53, 5432, 3306) are free."
fi

# ==============================================================================
# 5. Hostname FQDN, rDNS/PTR, and Outbound Port 25 Preflight
# ==============================================================================
HOSTNAME_FQDN="$(hostname -f 2>/dev/null || hostname)"
FQDN_VALID="false"
if [[ "${HOSTNAME_FQDN}" =~ ^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$ ]]; then
  FQDN_VALID="true"
  log_info "Hostname FQDN check passed: ${HOSTNAME_FQDN}"
else
  log_warn "Hostname '${HOSTNAME_FQDN}' is not a fully-qualified domain name (FQDN). Mail deliverability requires a valid FQDN."
fi

RDNS_STATUS="unchecked"
if command -v dig >/dev/null 2>&1; then
  RDNS_STATUS="dig-available"
elif command -v host >/dev/null 2>&1; then
  RDNS_STATUS="host-available"
fi
log_info "Mail/DNS preflight: FQDN_VALID=${FQDN_VALID}, rDNS_Tool=${RDNS_STATUS} (no external network probes executed)"

# ==============================================================================
# 6. Ed25519 Release Manifest Signature Verification Check
# ==============================================================================
SIGNATURE_STATUS="skipped"
if [[ -n "${MANIFEST_FILE}" || -n "${SIGNATURE_FILE}" || -n "${PUBKEY_FILE}" ]]; then
  if [[ ! -r "${MANIFEST_FILE}" || ! -r "${SIGNATURE_FILE}" || ! -r "${PUBKEY_FILE}" ]]; then
    log_error "Ed25519 verification requires readable --manifest, --signature, and --pubkey files."
    exit "${EXIT_SIGNATURE_INVALID}"
  fi
  if command -v openssl >/dev/null 2>&1; then
    if openssl pkeyutl -verify -pubin -inkey "${PUBKEY_FILE}" -rawin -in "${MANIFEST_FILE}" -sigfile "${SIGNATURE_FILE}" >/dev/null 2>&1; then
      SIGNATURE_STATUS="verified"
      log_info "Ed25519 release manifest signature verified successfully."
    else
      log_error "Ed25519 release manifest signature verification FAILED."
      exit "${EXIT_SIGNATURE_INVALID}"
    fi
  else
    log_error "openssl binary not found for Ed25519 signature verification."
    exit "${EXIT_SIGNATURE_INVALID}"
  fi
else
  log_info "Ed25519 signature verification: ready (pass --manifest, --signature, and --pubkey during release install)."
fi

# ==============================================================================
# 7. Output Summary Report
# ==============================================================================
if [[ "${OUTPUT_JSON}" -eq 1 ]]; then
  OCCUPIED_JSON=""
  if [[ "${#OCCUPIED_PORTS[@]}" -gt 0 ]]; then
    OCCUPIED_JSON="$(printf '%s,' "${OCCUPIED_PORTS[@]}")"
    OCCUPIED_JSON="${OCCUPIED_JSON%,}"
  fi
  cat <<EOF
{
  "garvix_preflight_version": "${GARVIX_VERSION}",
  "read_only": true,
  "os": {
    "id": "${OS_ID}",
    "version_id": "${OS_VERSION_ID}",
    "pretty_name": "${OS_PRETTY_NAME}",
    "adapter": "${OS_ADAPTER}",
    "tier": "${OS_TIER}"
  },
  "competing_panels_detected": false,
  "hardware": {
    "cpu_cores": ${CPU_CORES},
    "ram_mb": ${RAM_MB},
    "disk_free_gb": ${DISK_FREE_GB},
    "inodes_free": ${INODES_FREE},
    "recommended_max_accounts": ${RECOMMENDED_MAX_ACCOUNTS}
  },
  "network": {
    "hostname_fqdn": "${HOSTNAME_FQDN}",
    "fqdn_valid": ${FQDN_VALID},
    "occupied_ports": [${OCCUPIED_JSON}]
  },
  "ed25519_manifest_signature": "${SIGNATURE_STATUS}",
  "status": "READY"
}
EOF
else
  log_info "Garvix Hosting Manager preflight check completed cleanly (status=READY)."
fi

exit "${EXIT_OK}"
