#!/usr/bin/env bash
# ==============================================================================
# Garvix Hosting Manager — Enable Live Linux Website Hosting Engine (AlmaLinux 10/9)
# Installs & starts Nginx + PHP-FPM 8.x + MariaDB (MySQL) + Certbot Let's Encrypt
# ==============================================================================

set -euo pipefail

echo "=============================================================================="
echo " Enabling Real Linux Website Hosting Engine (Nginx + PHP-FPM + MariaDB + SSL)"
echo "=============================================================================="

if command -v dnf >/dev/null 2>&1; then
  echo "[1/4] Installing PHP-FPM, MariaDB Server, and Certbot Nginx plugin..."
  dnf install -y epel-release || true
  dnf install -y nginx php php-fpm php-cli php-mysqlnd php-pdo php-gd php-xml \
    php-mbstring php-json php-curl php-zip mariadb-server certbot python3-certbot-nginx || true
fi

echo "[2/4] Configuring PHP-FPM (/etc/php-fpm.d/www.conf) for Nginx..."
if [[ -f /etc/php-fpm.d/www.conf ]]; then
  sed -i 's/^user = apache/user = nginx/g' /etc/php-fpm.d/www.conf || true
  sed -i 's/^group = apache/group = nginx/g' /etc/php-fpm.d/www.conf || true
  sed -i 's/^;listen.acl_users = apache,nginx/listen.acl_users = apache,nginx/g' /etc/php-fpm.d/www.conf || true
fi
mkdir -p /run/php-fpm /var/www/vhosts
chmod 755 /var/www/vhosts

if command -v setsebool >/dev/null 2>&1; then
  setsebool -P httpd_can_network_connect 1 2>/dev/null || true
  setsebool -P httpd_unified 1 2>/dev/null || true
fi
if command -v restorecon >/dev/null 2>&1; then
  restorecon -Rv /var/www/vhosts 2>/dev/null || true
fi

echo "[3/4] Starting & enabling MariaDB, PHP-FPM, and Nginx..."
systemctl enable --now mariadb || true
systemctl enable --now php-fpm || true
systemctl restart php-fpm || true

# Ensure default Garvix Panel Nginx block uses default_server so hosted domain VHosts work side-by-side
if [[ -d /etc/nginx/conf.d ]]; then
  cat >/etc/nginx/conf.d/garvix-panel.conf <<'EOF'
server {
    listen 80 default_server;
    server_name 200.234.39.100 srv2075790.hstgr.cloud _;

    location / {
        proxy_pass http://127.0.0.1:4100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
  nginx -t && systemctl enable --now nginx && systemctl reload nginx || true
fi

echo "[4/4] Live Linux Hosting Engine is READY!"
