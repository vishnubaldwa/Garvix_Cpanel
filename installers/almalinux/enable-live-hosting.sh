#!/usr/bin/env bash
# ==============================================================================
# Garvix Hosting Manager — Enable Live Linux Website & PostgreSQL Hosting Engine
# Installs & starts PostgreSQL 16 + Nginx + PHP-FPM 8.x + MariaDB + Certbot SSL
# ==============================================================================

set -euo pipefail

echo "=============================================================================="
echo " Enabling Real Linux Website & PostgreSQL Engine (PostgreSQL + Nginx + PHP)"
echo "=============================================================================="

if command -v dnf >/dev/null 2>&1; then
  echo "[1/5] Installing PostgreSQL Server, PHP-FPM (+ php-pgsql), MariaDB, and Certbot..."
  dnf install -y epel-release || true
  dnf install -y postgresql-server postgresql-contrib nginx php php-fpm php-cli \
    php-pgsql php-mysqlnd php-pdo php-gd php-xml php-mbstring php-json php-curl \
    php-zip mariadb-server certbot python3-certbot-nginx || true
fi

echo "[2/5] Initializing & Starting PostgreSQL Database Engine (Port 5432)..."
if [[ ! -f /var/lib/pgsql/data/PG_VERSION ]]; then
  postgresql-setup --initdb || true
fi

if [[ -f /var/lib/pgsql/data/pg_hba.conf ]]; then
  sed -i 's/^local\s\+all\s\+all\s\+peer/local   all             all                                     trust/g' /var/lib/pgsql/data/pg_hba.conf || true
  sed -i 's/^host\s\+all\s\+all\s\+127\.0\.0\.1\/32\s\+ident/host    all             all             127.0.0.1\/32            trust/g' /var/lib/pgsql/data/pg_hba.conf || true
  sed -i 's/^host\s\+all\s\+all\s\+::1\/128\s\+ident/host    all             all             ::1\/128                 trust/g' /var/lib/pgsql/data/pg_hba.conf || true
fi

systemctl enable --now postgresql || true
systemctl reload postgresql || true

# Create primary Garvix Control Panel PostgreSQL database (garvix_panel_db)
su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname = 'garvix_panel_db'\" | grep -q 1 || psql -c 'CREATE DATABASE garvix_panel_db;'" || true

echo "[3/5] Configuring PHP-FPM (/etc/php-fpm.d/www.conf) for Nginx..."
if [[ -f /etc/php-fpm.d/www.conf ]]; then
  sed -i 's/^user = apache/user = nginx/g' /etc/php-fpm.d/www.conf || true
  sed -i 's/^group = apache/group = nginx/g' /etc/php-fpm.d/www.conf || true
  sed -i 's/^;listen.acl_users = apache,nginx/listen.acl_users = apache,nginx/g' /etc/php-fpm.d/www.conf || true
fi
mkdir -p /run/php-fpm /var/www/vhosts
chmod 755 /var/www/vhosts

if command -v setsebool >/dev/null 2>&1; then
  setsebool -P httpd_can_network_connect 1 2>/dev/null || true
  setsebool -P httpd_can_network_connect_db 1 2>/dev/null || true
  setsebool -P httpd_unified 1 2>/dev/null || true
fi
if command -v restorecon >/dev/null 2>&1; then
  restorecon -Rv /var/www/vhosts 2>/dev/null || true
fi

echo "[4/5] Starting & enabling MariaDB, PHP-FPM, and Nginx..."
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

echo "[5/5] PostgreSQL (garvix_panel_db) + Live Linux Website Hosting Engine is READY!"
su - postgres -c "psql -d garvix_panel_db -c '\dt'" || true
