#!/usr/bin/env bash
# ==============================================================================
# Garvix Hosting Manager — 1-Click Mac-to-VPS Deployment Helper
# Target Fresh AlmaLinux 10 VPS: srv2075790.hstgr.cloud (200.234.39.100)
# ==============================================================================

set -euo pipefail

TARGET_IP="${1:-200.234.39.100}"
TARGET_USER="${2:-root}"

# Strict safety block against old production VPS
if [[ "${TARGET_IP}" == "136.0.0.28" ]]; then
  echo "[HARD REFUSAL] 136.0.0.28 is your existing production server and will NEVER be touched." >&2
  exit 42
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "=============================================================================="
echo " Deploying Garvix Hosting Manager (WHM + cPanel) to ${TARGET_USER}@${TARGET_IP}"
echo " (You will be prompted for your new VPS root password)"
echo "=============================================================================="

cd "${REPO_ROOT}"

# Package project (excluding node_modules and .git) and stream over SSH
COPYFILE_DISABLE=1 tar --no-xattrs --no-mac-metadata -czf - \
  --exclude='./node_modules' \
  --exclude='./.git' \
  --exclude='./dist' \
  --exclude='./.garvix-data' \
  . | ssh -o StrictHostKeyChecking=accept-new "${TARGET_USER}@${TARGET_IP}" \
  "mkdir -p /opt/garvix-hosting-manager && tar --warning=no-unknown-keyword -xzf - -C /opt/garvix-hosting-manager && cd /opt/garvix-hosting-manager && if [ -f /etc/systemd/system/garvix-panel.service ]; then echo '[INFO] Updating existing Garvix Hosting Manager installation...'; systemctl restart garvix-panel && sleep 2 && systemctl is-active garvix-panel && echo '==============================================================================' && echo ' GARVIX HOSTING MANAGER UPDATED & RESTARTED SUCCESSFULLY!' && echo '  • WHM Portal:      http://${TARGET_IP}/whm' && echo '  • Customer cPanel: http://${TARGET_IP}/' && echo '  • License Store:   http://${TARGET_IP}/store' && echo '=============================================================================='; else bash installers/almalinux/install-garvix-panel.sh; fi"
