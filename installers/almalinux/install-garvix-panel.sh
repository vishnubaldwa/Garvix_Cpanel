#!/usr/bin/env bash
# ==============================================================================
# Garvix Hosting Manager — Automated Fresh VPS Installer (AlmaLinux 10 / 9)
# Copyright (c) Garvix Software Solutions Pvt Ltd. All rights reserved.
#
# Target Fresh VPS: AlmaLinux 10 (e.g. srv2075790.hstgr.cloud / 200.234.39.100)
# ==============================================================================

set -euo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "[ERROR] Please run this installer as root: sudo bash installers/almalinux/install-garvix-panel.sh" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
INSTALL_DIR="/opt/garvix-hosting-manager"
PANEL_PORT="${PANEL_PORT:-4100}"
HOSTNAME_FQDN="${HOSTNAME_FQDN:-$(hostname -f 2>/dev/null || echo 'srv2075790.hstgr.cloud')}"

echo "=============================================================================="
echo " Garvix Hosting Manager — Fresh AlmaLinux 10 VPS Automated Setup"
echo " Hostname: ${HOSTNAME_FQDN}"
echo "=============================================================================="

# Step 1: Mandatory Read-Only Preflight Check
echo "[STEP 1/7] Running mandatory preflight-check.sh..."
bash "${SCRIPT_DIR}/preflight-check.sh" --allow-adapter-os

# Step 2: Set FQDN Hostname if needed
echo "[STEP 2/7] Verifying server hostname (${HOSTNAME_FQDN})..."
if command -v hostnamectl >/dev/null 2>&1; then
  hostnamectl set-hostname "${HOSTNAME_FQDN}" || true
fi

# Step 3: Install AlmaLinux 10 Base Packages, Node.js, Nginx & Go
echo "[STEP 3/7] Installing system packages via dnf..."
if command -v dnf >/dev/null 2>&1; then
  dnf install -y epel-release || true
  dnf install -y curl git tar unzip jq firewalld nginx golang nodejs npm \
    postgresql-server mariadb-server postfix dovecot bind bind-utils || true

  if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - || true
    dnf install -y nodejs || true
  fi
fi

# Step 4: Copy Project to /opt/garvix-hosting-manager & Install Node Dependencies
echo "[STEP 4/7] Deploying Garvix Hosting Manager into ${INSTALL_DIR}..."
mkdir -p "${INSTALL_DIR}"
if [[ "${REPO_ROOT}" != "${INSTALL_DIR}" ]]; then
  cp -R "${REPO_ROOT}/." "${INSTALL_DIR}/"
fi

cd "${INSTALL_DIR}"
npm install
npm run typecheck

# Step 5: Compile Go Privileged Linux Agent (if Go is installed)
echo "[STEP 5/7] Building Garvix Privileged Linux Agent..."
if command -v go >/dev/null 2>&1 && [[ -f "${INSTALL_DIR}/agents/linux-agent/cmd/garvix-agent/main.go" ]]; then
  mkdir -p /usr/local/bin /run/garvix-agent
  (cd "${INSTALL_DIR}/agents/linux-agent" && go build -o /usr/local/bin/garvix-agent ./cmd/garvix-agent) || true
fi

# Step 6: Create systemd Service for 24/7 Automatic Startup + Nginx Proxy
echo "[STEP 6/7] Configuring systemd service (garvix-panel.service) & Nginx..."
NPX_BIN="$(command -v npx || echo '/usr/bin/npx')"
NODE_DIR="$(dirname "${NPX_BIN}")"

cat >/etc/systemd/system/garvix-panel.service <<EOF
[Unit]
Description=Garvix Hosting Manager (WHM & cPanel Jupiter Control Panel)
After=network.target

[Service]
Type=simple
WorkingDirectory=${INSTALL_DIR}
Environment=NODE_ENV=production
Environment=HOST=0.0.0.0
Environment=PORT=${PANEL_PORT}
Environment=PATH=${NODE_DIR}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=${NPX_BIN} tsx apps/local-panel-api/src/cli.ts
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now garvix-panel.service

# Configure Nginx reverse proxy on port 80 -> 127.0.0.1:4100 so both :80 and :4100 work
if [[ -d /etc/nginx/conf.d ]]; then
  if command -v setsebool >/dev/null 2>&1; then
    setsebool -P httpd_can_network_connect 1 2>/dev/null || true
  fi
  cat >/etc/nginx/conf.d/garvix-panel.conf <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:${PANEL_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
  # Remove default server block conflict if present
  nginx -t && systemctl enable --now nginx && systemctl reload nginx || true
fi

# Step 7: Configure Firewalld (Anti-Lockout Protected)
echo "[STEP 7/7] Opening firewall ports (SSH 22, HTTP 80, HTTPS 443, Panel ${PANEL_PORT})..."
if command -v firewall-cmd >/dev/null 2>&1; then
  systemctl enable --now firewalld || true
  firewall-cmd --permanent --add-service=ssh || true
  firewall-cmd --permanent --add-service=http || true
  firewall-cmd --permanent --add-service=https || true
  firewall-cmd --permanent --add-port="${PANEL_PORT}/tcp" || true
  firewall-cmd --reload || true
fi

PUBLIC_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || echo '200.234.39.100')"

echo "=============================================================================="
echo " GARVIX HOSTING MANAGER INSTALLATION COMPLETE!"
echo "------------------------------------------------------------------------------"
echo "  WHM (Server Admin Portal) : http://${PUBLIC_IP}:${PANEL_PORT}/whm"
echo "                              http://${PUBLIC_IP}/whm"
echo "  cPanel (Customer Portal)  : http://${PUBLIC_IP}:${PANEL_PORT}/"
echo "                              http://${PUBLIC_IP}/"
echo "  Service Status Command    : systemctl status garvix-panel"
echo "=============================================================================="
