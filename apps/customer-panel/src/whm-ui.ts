/**
 * Garvix WHM (WebHost Manager) — Dedicated Server Administrator & Reseller Portal (`/whm`)
 * Modeled after WHM's classic dark-header + searchable left tree + List Accounts (`[cP]` SSO launch) layout.
 */
export function renderWhmPanelWebUiHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Garvix WHM — Server &amp; Reseller Admin Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --whm-orange: #ff6c2c;
      --whm-orange-hover: #e55a1d;
      --whm-top: #0f172a;
      --whm-sidebar: #1e293b;
      --whm-sidebar-border: #0f172a;
      --whm-bg: #f4f6fb;
      --whm-card: #ffffff;
      --whm-border: #e2e8f0;
      --whm-text: #0f172a;
      --whm-muted: #64748b;
      --whm-blue: #2563eb;
      --whm-green: #16a34a;
      --whm-warn: #d97706;
      --whm-danger: #dc2626;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--whm-bg);
      color: var(--whm-text);
      font-size: 13.5px;
      -webkit-font-smoothing: antialiased;
    }
    .sandbox-banner {
      background: #991b1b;
      color: #ffffff;
      padding: 8px 22px;
      font-size: 12.5px;
      display: none;
      justify-content: space-between;
      align-items: center;
    }
    /* Modern WHM Top Header Bar */
    .whm-header {
      background: var(--whm-top);
      color: #ffffff;
      height: 62px;
      padding: 0 22px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      border-bottom: 1px solid #1e293b;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.15);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .whm-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }
    .whm-logo-box {
      background: linear-gradient(135deg, #ff6c2c, #ea580c);
      color: #ffffff;
      font-weight: 800;
      font-size: 15px;
      padding: 6px 11px;
      border-radius: 8px;
      letter-spacing: 0.3px;
      box-shadow: 0 2px 8px rgba(255, 108, 44, 0.35);
    }
    .whm-host-meta {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
    }
    .whm-host-name {
      font-weight: 800;
      font-size: 14.5px;
      color: #f8fafc;
    }
    .whm-host-sub {
      font-size: 11px;
      color: #94a3b8;
      font-weight: 500;
    }
    .whm-telemetry-pills {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 12px;
      color: #cbd5e1;
      background: #1e293b;
      padding: 7px 14px;
      border-radius: 10px;
      border: 1px solid #334155;
    }
    .whm-top-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .whm-btn {
      background: var(--whm-orange);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 7px 14px;
      font-size: 12.5px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .whm-btn:hover { background: var(--whm-orange-hover); transform: translateY(-1px); }
    .whm-btn.blue { background: var(--whm-blue); }
    .whm-btn.blue:hover { background: #1d4ed8; }
    .whm-btn.secondary {
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .whm-btn.secondary:hover { background: #f8fafc; }
    .whm-btn.danger {
      background: var(--whm-danger);
      color: #ffffff;
    }
    .cp-launch-btn {
      background: linear-gradient(135deg, #ff6c2c, #ea580c);
      color: #ffffff;
      font-weight: 800;
      font-size: 11.5px;
      padding: 4px 10px;
      border-radius: 6px;
      text-decoration: none;
      display: inline-block;
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 6px rgba(255, 108, 44, 0.25);
    }
    .cp-launch-btn:hover { background: var(--whm-orange-hover); }

    /* WHM 2-Column Layout */
    .whm-layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      min-height: calc(100vh - 62px);
    }
    .whm-sidebar {
      background: var(--whm-sidebar);
      color: #e2e8f0;
      border-right: 1px solid var(--whm-sidebar-border);
      padding: 16px 10px;
    }
    .whm-search-box {
      padding: 0 6px 14px;
      border-bottom: 1px solid #334155;
    }
    .whm-search-input {
      width: 100%;
      background: #0f172a;
      border: 1px solid #334155;
      color: #ffffff;
      padding: 9px 13px;
      border-radius: 10px;
      font-size: 12.5px;
      font-family: inherit;
    }
    .whm-search-input::placeholder { color: #94a3b8; }
    .whm-search-input:focus {
      outline: none;
      border-color: var(--whm-orange);
    }
    .whm-cat-title {
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      padding: 14px 12px 6px;
      font-weight: 700;
    }
    .whm-nav-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .whm-nav-item {
      padding: 9px 12px;
      cursor: pointer;
      color: #cbd5e1;
      display: flex;
      align-items: center;
      gap: 10px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.12s;
    }
    .whm-nav-item:hover {
      background: rgba(255,255,255,0.07);
      color: #ffffff;
    }
    .whm-nav-item.active {
      background: var(--whm-orange);
      color: #ffffff;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(255, 108, 44, 0.3);
    }

    /* WHM Main Content */
    .whm-main {
      padding: 24px 28px;
      overflow-x: auto;
    }
    .whm-breadcrumb {
      font-size: 12px;
      color: var(--whm-muted);
      margin-bottom: 6px;
      font-weight: 500;
    }
    .whm-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.3px;
      margin: 0 0 18px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .whm-card {
      background: var(--whm-card);
      border: 1px solid var(--whm-border);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 18px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
    }
    .whm-card h3 {
      margin: 0 0 14px 0;
      font-size: 15.5px;
      font-weight: 700;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .whm-stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
      margin-bottom: 18px;
    }
    .whm-stat-box {
      background: var(--whm-card);
      border: 1px solid var(--whm-border);
      border-top: 4px solid var(--whm-blue);
      border-radius: 14px;
      padding: 16px 18px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
    }
    .whm-stat-box.orange { border-top-color: var(--whm-orange); }
    .whm-stat-box.green { border-top-color: var(--whm-green); }
    .whm-stat-label { font-size: 11.5px; color: var(--whm-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.03em; }
    .whm-stat-val { font-size: 23px; font-weight: 800; margin-top: 6px; letter-spacing: -0.4px; }

    .whm-filter-bar {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      background: #f8fafc;
      border: 1px solid var(--whm-border);
      padding: 14px;
      border-radius: 10px;
      margin-bottom: 16px;
    }
    .whm-input, .whm-select {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      font-family: inherit;
      color: var(--whm-text);
    }

    table.whm-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    table.whm-table th, table.whm-table td {
      text-align: left;
      padding: 11px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    table.whm-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    table.whm-table tr:hover {
      background: #f8fafc;
    }
    .expand-drawer {
      background: #f8fafc;
      padding: 14px 18px;
      border-left: 4px solid var(--whm-orange);
      border-radius: 0 8px 8px 0;
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .whm-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      background: #dcfce7;
      color: #15803d;
    }
    .whm-badge.suspended {
      background: #fee2e2;
      color: #b91c1c;
    }
    code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 5px;
      font-size: 12px;
    }
    #toast {
      position: fixed;
      bottom: 22px;
      right: 22px;
      background: #0f172a;
      color: #ffffff;
      border-left: 4px solid var(--whm-orange);
      padding: 13px 18px;
      border-radius: 10px;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.3);
      display: none;
      z-index: 999;
      font-size: 13px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="sandbox-banner">
    <span><strong>GARVIX WHM SERVER NODE ACTIVE</strong></span>
    <span id="whmMfaStatus" class="whm-badge">root / Server Admin</span>
  </div>

  <!-- WHM Top Bar -->
  <header class="whm-header">
    <div class="whm-brand" onclick="openWhmPage('list-accounts')">
      <span class="whm-logo-box">WHM</span>
      <div class="whm-host-meta">
        <span class="whm-host-name">srv2075790.hstgr.cloud (200.234.39.100)</span>
        <span class="whm-host-sub">AlmaLinux 10.2 • Garvix WebHost Manager</span>
      </div>
    </div>

    <div class="whm-telemetry-pills">
      <span><strong>LOAD:</strong> <span id="topLoad">Live...</span></span>
      <span>•</span>
      <span><strong>RAM:</strong> <span id="topRam">Live...</span></span>
      <span>•</span>
      <span><strong>DISK:</strong> <span id="topDisk">Live...</span></span>
    </div>

    <div class="whm-top-right">
      <a href="/store" class="whm-btn" style="background:#16a34a;">🛒 License Store</a>
      <a href="/portal" class="whm-btn blue">🔑 My License</a>
      <a href="/" class="whm-btn">🟠 Customer cPanel</a>
    </div>
  </header>

  <div class="whm-layout">
    <!-- Left WHM Tree Sidebar -->
    <aside class="whm-sidebar">
      <div class="whm-search-box">
        <input
          class="whm-search-input"
          placeholder="🔍 Search WHM menu..."
          oninput="filterWhmNav(this.value)"
        />
      </div>

      <div class="whm-cat-title">Server Administration</div>
      <ul class="whm-nav-list" id="whmNavList">
        <li class="whm-nav-item active" id="wnav-list-accounts" data-label="list accounts domain cpanel" onclick="openWhmPage('list-accounts')">
          <span>📋</span><span>List Accounts</span>
        </li>
        <li class="whm-nav-item" id="wnav-create-account" data-label="create a new account provision" onclick="openWhmPage('create-account')">
          <span>➕</span><span>Create a New Account</span>
        </li>
        <li class="whm-nav-item" id="wnav-packages" data-label="add a package hosting plans" onclick="openWhmPage('packages')">
          <span>📦</span><span>Hosting Packages</span>
        </li>
        <li class="whm-nav-item" id="wnav-services" data-label="service status restart nginx postgres mariadb postfix" onclick="openWhmPage('services')">
          <span>⚙️</span><span>Service Status &amp; Restart</span>
        </li>
        <li class="whm-nav-item" id="wnav-mail-preflight" data-label="mail queue deliverability preflight dkim" onclick="openWhmPage('mail-preflight')">
          <span>✉️</span><span>Mail Health Check</span>
        </li>
        <li class="whm-nav-item" id="wnav-backups" data-label="backup configuration restic disaster recovery" onclick="openWhmPage('backups')">
          <span>💾</span><span>Backups &amp; Restore</span>
        </li>
        <li class="whm-nav-item" id="wnav-security" data-label="security center firewalld kek rotation" onclick="openWhmPage('security')">
          <span>🛡️</span><span>Security &amp; Firewall</span>
        </li>
        <li class="whm-nav-item" id="wnav-whm-terminal" data-label="terminal ssh console root shell bash" onclick="openWhmPage('whm-terminal')">
          <span>&gt;_</span><span>Root Web Terminal</span>
        </li>
        <li class="whm-nav-item" id="wnav-whm-api" data-label="manage api tokens whm api shell developer" onclick="openWhmPage('whm-api')">
          <span>🔑</span><span>API Tokens &amp; Explorer</span>
        </li>
        <li class="whm-nav-item" id="wnav-audit" data-label="audit logs jobs history" onclick="openWhmPage('audit')">
          <span>🔍</span><span>Activity &amp; Audit Logs</span>
        </li>
        <li class="whm-nav-item" data-label="software license portal key renew" onclick="window.location.href='/portal'">
          <span>💳</span><span>Software License Portal</span>
        </li>
      </ul>
    </aside>

    <!-- Main WHM Area -->
    <main class="whm-main" id="whmMain">
      <div class="whm-card">Loading Garvix WHM...</div>
    </main>
  </div>

  <div id="toast"></div>

  <script>
    let sessionToken = '';
    let activePage = 'list-accounts';
    let expandedAccountId = null;
    let searchFilterText = '';
    let whmTermCwd = 'public_html';
    let whmTermHistory = [
      'Garvix WebHost Manager (WHM) — Root Administrative Diagnostic Shell',
      'Host: srv2075790.hstgr.cloud (200.234.39.100 • AlmaLinux 10.2 x86_64)',
      'Type "help" or click a quick command above (systemctl status, garvix-agent --status, firewall-cmd --list-all, df -h)',
      ''
    ];
    let whmNewTokenSecret = '';

    function showToast(msg, isErr = false) {
      const el = document.getElementById('toast');
      el.style.display = 'block';
      el.style.borderLeftColor = isErr ? '#dc2626' : '#ff6c2c';
      el.textContent = msg;
      setTimeout(() => { el.style.display = 'none'; }, 4000);
    }

    async function api(path, options = {}) {
      const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
      if (sessionToken) headers['Authorization'] = 'Bearer ' + sessionToken;
      const res = await fetch(path, Object.assign({}, options, { headers }));
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'WHM request failed');
      }
      return body.data;
    }

    function filterWhmNav(q) {
      const term = q.trim().toLowerCase();
      document.querySelectorAll('#whmNavList .whm-nav-item').forEach((li) => {
        const label = li.getAttribute('data-label') || '';
        li.style.display = !term || label.includes(term) ? 'flex' : 'none';
      });
    }

    function updateTopTelemetry(srv) {
      if (!srv) return;
      const loadEl = document.getElementById('topLoad');
      const ramEl = document.getElementById('topRam');
      const diskEl = document.getElementById('topDisk');
      if (loadEl && Array.isArray(srv.loadAvg)) {
        loadEl.textContent = srv.loadAvg.join('  ');
      }
      if (ramEl && srv.memoryTotalGb) {
        ramEl.textContent = (srv.memoryUsedGb || 0) + ' / ' + srv.memoryTotalGb + ' GB';
      }
      if (diskEl && srv.diskTotalGb) {
        diskEl.textContent = (srv.diskUsedGb || 0) + ' / ' + srv.diskTotalGb + ' GB';
      }
    }

    async function bootWhm() {
      try {
        try {
          const licNode = await api('/api/v1/license-store/node-status');
          if (licNode && licNode.status === 'EXPIRED_LOCKED') {
            document.body.innerHTML = \`
              <div style="min-height:100vh;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;font-family:sans-serif;">
                <div style="max-width:620px;background:#1e293b;border:2px solid #dc2626;border-radius:14px;padding:32px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
                  <div style="font-size:48px;margin-bottom:12px;">🔒</div>
                  <h1 style="margin:0 0 10px 0;color:#f87171;font-size:24px;">Garvix WHM License Locked (Monthly Subscription Unpaid)</h1>
                  <p style="color:#cbd5e1;line-height:1.6;margin-bottom:20px;">
                    The monthly software license (<code>\${licNode.licenseKey}</code>) for server IP <code>\${licNode.serverIp}</code> has expired and passed its 72-hour grace period.
                    <br/><strong>All hosted customer websites, databases, and email services continue running untouched</strong>, but WHM &amp; cPanel administration is locked until renewed.
                  </p>
                  <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                    <a href="/portal" style="background:#16a34a;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;">💳 Pay &amp; Renew Monthly License Now →</a>
                    <a href="/store" style="background:#334155;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Open License Store</a>
                  </div>
                </div>
              </div>
            \`;
            return;
          }
          if (licNode && licNode.status === 'GRACE_PERIOD') {
            const banner = document.querySelector('.sandbox-banner');
            if (banner) {
              banner.style.display = 'flex';
              banner.style.background = '#991b1b';
              banner.innerHTML = \`<span>⚠️ <strong>WHM LICENSE IN 72-HOUR GRACE PERIOD (<code>\${licNode.licenseKey}</code>)</strong> — Renew your monthly license now before WHM administration locks.</span> <a href="/portal" style="color:#fde047;font-weight:800;">[Pay &amp; Renew Now →]</a>\`;
            }
          }
        } catch (_) {}

        const totp = await api('/api/v1/auth/demo-totp');
        const login = await api('/api/v1/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            username: 'admin',
            password: 'GarvixAdmin#2026',
            totpCode: totp.totpCode,
          }),
        });
        sessionToken = login.sessionId;
        await openWhmPage('list-accounts');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    function toggleExpandAccount(acctId) {
      expandedAccountId = expandedAccountId === acctId ? null : acctId;
      openWhmPage('list-accounts');
    }

    async function openWhmPage(page) {
      activePage = page;
      document.querySelectorAll('.whm-nav-item').forEach((el) => el.classList.remove('active'));
      const navEl = document.getElementById('wnav-' + page);
      if (navEl) navEl.classList.add('active');

      const main = document.getElementById('whmMain');

      try {
        if (page === 'list-accounts') {
          const [accounts, summary] = await Promise.all([
            api('/api/v1/hosting-accounts'),
            api('/api/v1/dashboard/summary'),
          ]);
          updateTopTelemetry(summary.server);
          const srv = summary.server || {};
          const filtered = accounts.filter(a =>
            !searchFilterText ||
            a.primaryDomain.toLowerCase().includes(searchFilterText) ||
            a.linuxUsername.toLowerCase().includes(searchFilterText) ||
            a.ownerEmail.toLowerCase().includes(searchFilterText)
          );

          main.innerHTML = \`
            <div class="whm-breadcrumb">Home » Account Information » List Accounts</div>
            <div class="whm-title">
              <span>📋 List Accounts (\${filtered.length} Total)</span>
              <button class="whm-btn" onclick="openWhmPage('create-account')">+ Create a New Account</button>
            </div>

            <div class="whm-stats-row">
              <div class="whm-stat-box orange">
                <div class="whm-stat-label">Active Hosting Accounts</div>
                <div class="whm-stat-val">\${accounts.filter(a => a.status === 'ACTIVE').length} Active</div>
              </div>
              <div class="whm-stat-box">
                <div class="whm-stat-label">Suspended Accounts</div>
                <div class="whm-stat-val">\${accounts.filter(a => a.status === 'SUSPENDED').length}</div>
              </div>
              <div class="whm-stat-box green">
                <div class="whm-stat-label">Server Memory Usage</div>
                <div class="whm-stat-val">\${srv.memoryUsedGb || 0} / \${srv.memoryTotalGb || 16} GB</div>
              </div>
              <div class="whm-stat-box">
                <div class="whm-stat-label">Server Disk Usage</div>
                <div class="whm-stat-val">\${srv.diskUsedGb || 0} / \${srv.diskTotalGb || 200} GB</div>
              </div>
            </div>

            <div class="whm-card">
              <div class="whm-filter-bar">
                <strong>Search Accounts:</strong>
                <input
                  class="whm-input"
                  placeholder="Filter by domain, username, or email..."
                  value="\${searchFilterText}"
                  oninput="searchFilterText=this.value.toLowerCase();openWhmPage('list-accounts')"
                  style="width:280px"
                />
                <span style="color:var(--whm-muted);font-size:12px;">Click <strong>[+]</strong> on any row to Suspend or Unsuspend an account, or click <strong>[cP]</strong> to open its Customer cPanel.</span>
              </div>

              <table class="whm-table">
                <thead>
                  <tr>
                    <th style="width:36px">+</th>
                    <th>Domain</th>
                    <th>cPanel</th>
                    <th>Username</th>
                    <th>UID</th>
                    <th>IP Address</th>
                    <th>Contact Email</th>
                    <th>Partition</th>
                    <th>Quota</th>
                    <th>Disk Used</th>
                    <th>Package</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  \${filtered.length === 0 ? \`
                    <tr>
                      <td colspan="12" style="text-align:center;padding:28px;color:var(--whm-muted);">
                        No hosting accounts created on this server yet. Click <strong>"+ Create a New Account"</strong> above to add your first domain and Linux user.
                      </td>
                    </tr>
                  \` : filtered.map(a => \`
                    <tr>
                      <td>
                        <button class="whm-btn secondary" style="padding:2px 7px;font-weight:700;" onclick="toggleExpandAccount('\${a.id}')">
                          \${expandedAccountId === a.id ? '−' : '+'}
                        </button>
                      </td>
                      <td><strong>\${a.primaryDomain}</strong></td>
                      <td>
                        <a href="/?account=\${a.linuxUsername}" class="cp-launch-btn" title="Launch Customer cPanel for \${a.linuxUsername}">cP</a>
                      </td>
                      <td><code>\${a.linuxUsername}</code></td>
                      <td>\${a.linuxUid}</td>
                      <td><code>200.234.39.100</code></td>
                      <td>\${a.ownerEmail}</td>
                      <td><code>/home</code></td>
                      <td>\${(a.diskQuotaMb / 1024).toFixed(0)} GB</td>
                      <td>\${a.diskUsedMb} MB</td>
                      <td>\${a.packageName}</td>
                      <td>
                        <span class="whm-badge \${a.status === 'ACTIVE' ? '' : 'suspended'}">
                          \${a.provisioningState}
                        </span>
                      </td>
                    </tr>
                    \${expandedAccountId === a.id ? \`
                      <tr>
                        <td colspan="12" style="padding:0;">
                          <div class="expand-drawer">
                            <strong>Account Actions for <code>\${a.linuxUsername}</code> (\${a.primaryDomain}):</strong>
                            <a href="/?account=\${a.linuxUsername}" class="whm-btn">🟠 Open Customer cPanel</a>
                            \${a.status === 'ACTIVE' ? \`
                              <input id="suspReason_\${a.id}" class="whm-input" placeholder="Suspension reason..." value="Administrative hold" style="width:240px;" />
                              <button class="whm-btn danger" onclick="suspendAcct('\${a.id}')">Suspend Account</button>
                            \` : \`
                              <button class="whm-btn blue" onclick="reactivateAcct('\${a.id}')">Unsuspend (Reactivate) Account</button>
                              <span style="color:var(--whm-danger);font-size:12px;">Reason: \${a.suspendedReason || 'Suspended'}</span>
                            \`}
                          </div>
                        </td>
                      </tr>
                    \` : ''}
                  \`).join('')}
                </tbody>
              </table>
            </div>
          \`;
          return;
        }

        if (page === 'create-account') {
          const whm = await api('/api/v1/whm/overview');
          main.innerHTML = \`
            <div class="whm-breadcrumb">Home » Account Functions » Create a New Account</div>
            <div class="whm-title">
              <span>➕ Create a New Hosting Account</span>
              <button class="whm-btn secondary" onclick="openWhmPage('list-accounts')">← Back to List Accounts</button>
            </div>

            <div class="whm-card">
              <h3><span>Domain Information &amp; Linux Account Setup</span></h3>
              <div style="display:grid;grid-template-columns:220px 1fr;gap:12px;max-width:680px;align-items:center;margin-bottom:16px;">
                <label><strong>Domain Name:</strong></label>
                <input id="caDomain" class="whm-input" placeholder="e.g. yourdomain.com" />

                <label><strong>Linux Username:</strong></label>
                <input id="caUser" class="whm-input" placeholder="e.g. myuser" />

                <label><strong>Contact Email:</strong></label>
                <input id="caEmail" class="whm-input" placeholder="e.g. admin@yourdomain.com" />

                <label><strong>Choose a Package:</strong></label>
                <select id="caPkg" class="whm-select">
                  \${whm.packages.map(p => \`<option value="\${p.id}">\${p.name} (\${(p.diskQuotaMb/1024).toFixed(0)} GB Disk / \${p.memoryLimitMb} MB RAM)</option>\`).join('')}
                </select>
              </div>
              <div style="display:flex;gap:12px;">
                <button class="whm-btn" onclick="createWhmAccount(false)">+ Create Hosting Account</button>
              </div>
            </div>
          \`;
          return;
        }

        if (page === 'packages') {
          const whm = await api('/api/v1/whm/overview');
          main.innerHTML = \`
            <div class="whm-breadcrumb">Home » Packages » Hosting Packages</div>
            <div class="whm-title"><span>📦 Hosting Packages (Add / Manage Plans)</span></div>

            <div class="whm-card">
              <h3><span>Add a New Hosting Package</span></h3>
              <div class="whm-filter-bar">
                <input id="pkgName" class="whm-input" placeholder="Package Name (e.g. Pro 50GB)" style="width:220px;" />
                <input id="pkgDisk" type="number" class="whm-input" value="51200" style="width:110px;" /> <span>MB Disk</span>
                <input id="pkgRam" type="number" class="whm-input" value="4096" style="width:100px;" /> <span>MB RAM</span>
                <button class="whm-btn" onclick="addWhmPackage()">+ Add Package</button>
              </div>

              <table class="whm-table">
                <thead>
                  <tr>
                    <th>Package Name</th>
                    <th>Disk Quota</th>
                    <th>Memory cgroup Limit</th>
                    <th>CPU Quota</th>
                    <th>Shell Access</th>
                  </tr>
                </thead>
                <tbody>
                  \${whm.packages.map(p => \`
                    <tr>
                      <td><strong>\${p.name}</strong></td>
                      <td>\${(p.diskQuotaMb / 1024).toFixed(0)} GB</td>
                      <td>\${p.memoryLimitMb} MB</td>
                      <td>\${p.cpuQuotaPercent}%</td>
                      <td>\${p.sshAccessAllowed ? 'Enabled' : 'Disabled (/sbin/nologin)'}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          \`;
          return;
        }

        if (page === 'services') {
          const summary = await api('/api/v1/dashboard/summary');
          updateTopTelemetry(summary.server);
          main.innerHTML = \`
            <div class="whm-breadcrumb">Home » Server Configuration » Service Status &amp; Restart</div>
            <div class="whm-title"><span>⚙️ System Service Status &amp; Safe Restart</span></div>

            <div class="whm-card">
              <h3><span>Server Daemons Status</span></h3>
              <table class="whm-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Category</th>
                    <th>Version</th>
                    <th>Port</th>
                    <th>PID</th>
                    <th>Memory</th>
                    <th>State</th>
                    <th>WHM Action</th>
                  </tr>
                </thead>
                <tbody>
                  \${summary.telemetry.services.map(s => \`
                    <tr>
                      <td><strong>\${s.displayName}</strong></td>
                      <td>\${s.category}</td>
                      <td><code>\${s.version}</code></td>
                      <td>\${s.port}</td>
                      <td>\${s.pid}</td>
                      <td>\${s.memoryMb} MB</td>
                      <td><span class="whm-badge">\${s.state.toUpperCase()}</span></td>
                      <td><button class="whm-btn secondary" onclick="restartWhmService('\${s.name}')">Restart Service</button></td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          \`;
          return;
        }

        if (page === 'mail-preflight') {
          const preflight = await api('/api/v1/email/preflight');
          main.innerHTML = \`
            <div class="whm-breadcrumb">Home » Email » Mail Server Deliverability Preflight</div>
            <div class="whm-title">
              <span>✉️ 13-Point Mail Server Preflight Diagnostics</span>
              <span class="whm-badge">\${preflight.overallStatus}</span>
            </div>
            <div class="whm-card">
              <p style="margin-top:0;color:var(--whm-muted);">\${preflight.disclaimer}</p>
              <table class="whm-table">
                <thead>
                  <tr>
                    <th>Check</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  \${preflight.checks.map(c => \`
                    <tr>
                      <td><strong>\${c.title}</strong></td>
                      <td><span class="whm-badge">\${c.status}</span></td>
                      <td>\${c.details}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          \`;
          return;
        }

        if (page === 'backups') {
          const b = await api('/api/v1/backups');
          main.innerHTML = \`
            <div class="whm-breadcrumb">Home » Backup » Backups &amp; Restore</div>
            <div class="whm-title"><span>💾 Server Backups &amp; Restore</span></div>
            <div class="whm-card">
              <div class="whm-filter-bar">
                <button class="whm-btn" onclick="triggerWhmBackup()">+ Run Immediate Encrypted Backup</button>
              </div>
              <table class="whm-table">
                <thead>
                  <tr>
                    <th>Restic Snapshot ID</th>
                    <th>Account</th>
                    <th>Created</th>
                    <th>Verification Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  \${b.snapshots.length === 0 ? \`
                    <tr><td colspan="5" style="text-align:center;color:var(--whm-muted);padding:20px;">No backups created yet. Click "+ Run Immediate Encrypted Backup" above.</td></tr>
                  \` : b.snapshots.map(s => \`
                    <tr>
                      <td><code>\${s.resticSnapshotId.slice(0, 22)}…</code></td>
                      <td><code>\${s.linuxUsername}</code></td>
                      <td>\${s.createdAtIso}</td>
                      <td><span class="whm-badge \${s.restoreVerified ? '' : 'suspended'}">\${s.status}</span></td>
                      <td>
                        <button class="whm-btn blue" onclick="verifyWhmSnap('\${s.id}')">Verify Backup</button>
                      </td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          \`;
          return;
        }

        if (page === 'security') {
          const sec = await api('/api/v1/security/overview');
          main.innerHTML = \`
            <div class="whm-breadcrumb">Home » Security Center » Firewalld &amp; Master Key Rotation</div>
            <div class="whm-title"><span>🛡️ WHM Security Center</span></div>
            <div class="whm-card">
              <h3><span>Envelope Encryption Master Key (KEK) Rotation</span></h3>
              <button class="whm-btn" onclick="rotateWhmKek()">Rotate Master KEK</button>
            </div>
            <div class="whm-card">
              <h3><span>SIEM CEF Security Audit Feed</span></h3>
              <pre style="background:#18202c;color:#e2e8f0;padding:12px;border-radius:4px;overflow-x:auto;">\${sec.incidentsCef || 'No security alerts triggered.'}</pre>
            </div>
          \`;
          return;
        }

        if (page === 'audit') {
          const logs = await api('/api/v1/audit-logs');
          main.innerHTML = \`
            <div class="whm-breadcrumb">Home » Server Configuration » WHM Audit Trail</div>
            <div class="whm-title"><span>🔍 Activity &amp; Audit Log</span></div>
            <div class="whm-card">
              <table class="whm-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Role</th>
                    <th>Operation</th>
                    <th>Target</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  \${logs.map(l => \`
                    <tr>
                      <td><code>\${l.createdAt}</code></td>
                      <td>\${l.actorUsername}</td>
                      <td><span class="whm-badge">\${l.actorRole}</span></td>
                      <td><code>\${l.action}</code></td>
                      <td><code>\${l.resourceType}:\${l.resourceId}</code></td>
                      <td>\${l.summary}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          \`;
          return;
        }

        if (page === 'whm-terminal') {
          main.innerHTML = \`
            <div class="whm-breadcrumb">Home » Server Configuration » Terminal (Root / Admin Shell)</div>
            <div class="whm-title"><span>&gt;_ WHM Terminal — Server Admin Diagnostic Shell</span></div>

            <div class="whm-card">
              <h3>
                <span>Privileged Agent &amp; Node Diagnostic Console</span>
                <span class="whm-badge">root@srv2075790.hstgr.cloud</span>
              </h3>
              <div class="whm-filter-bar">
                <button class="whm-btn secondary" onclick="runWhmTerm('systemctl status')">systemctl status</button>
                <button class="whm-btn secondary" onclick="runWhmTerm('garvix-agent --status')">garvix-agent --status</button>
                <button class="whm-btn secondary" onclick="runWhmTerm('firewall-cmd --list-all')">firewall-cmd --list-all</button>
                <button class="whm-btn secondary" onclick="runWhmTerm('df -h')">df -h</button>
                <button class="whm-btn secondary" onclick="runWhmTerm('free -m')">free -m</button>
                <button class="whm-btn secondary" onclick="runWhmTerm('ls -la')">ls -la</button>
                <button class="whm-btn secondary" onclick="runWhmTerm('uname -a')">uname -a</button>
                <button class="whm-btn secondary" onclick="runWhmTerm('help')">help</button>
                <button class="whm-btn secondary" onclick="runWhmTerm('clear')">clear</button>
              </div>

              <div id="whmTermScreen" style="background:#0d1117;color:#58a6ff;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;padding:16px;border-radius:6px;height:360px;overflow-y:auto;white-space:pre-wrap;line-height:1.5;border:1px solid #30363d;">\${whmTermHistory.join('\\n')}</div>

              <div style="display:flex;gap:8px;margin-top:10px;align-items:center;background:#161b22;padding:8px 12px;border-radius:6px;border:1px solid #30363d;">
                <span id="whmTermPrompt" style="color:#ff6c2c;font-family:monospace;font-weight:700;font-size:13px;">root@srv2075790:~#</span>
                <input id="whmTermInput" type="text" placeholder="Enter WHM Admin command (e.g. systemctl status, firewall-cmd --list-all, df -h) and press Enter..."
                  style="flex:1;background:transparent;border:none;color:#f0f6fc;font-family:monospace;font-size:13px;outline:none;"
                  onkeydown="if(event.key==='Enter'){runWhmTerm(this.value);}" />
                <button class="whm-btn" onclick="runWhmTerm(document.getElementById('whmTermInput').value)">Execute</button>
              </div>
            </div>
          \`;
          const scr = document.getElementById('whmTermScreen');
          if (scr) scr.scrollTop = scr.scrollHeight;
          const inp = document.getElementById('whmTermInput');
          if (inp) inp.focus();
          return;
        }

        if (page === 'whm-api') {
          const allTokens = await api('/api/v1/api-tokens');
          main.innerHTML = \`
            <div class="whm-breadcrumb">Home » Development » Manage WHM API Tokens &amp; WHM API Shell</div>
            <div class="whm-title"><span>🔑 Manage WHM API Tokens &amp; WHM API v1 Shell</span></div>

            \${whmNewTokenSecret ? \`
              <div class="whm-card" style="border-left:4px solid var(--whm-green);background:#f0fdf4;">
                <h3 style="color:var(--whm-green);"><span>✅ New WHM Root API Token Generated (Copy Now — Shown Once)</span></h3>
                <code style="display:block;padding:10px;background:#0f172a;color:#38bdf8;border-radius:4px;font-size:13px;word-break:break-all;">\${whmNewTokenSecret}</code>
              </div>
            \` : ''}

            <div class="whm-card">
              <h3><span>Generate WHM API Token (For Automation &amp; Integrations)</span></h3>
              <div class="whm-filter-bar">
                <input id="whmTokName" class="whm-input" placeholder="Token Name (e.g. Server Automation)" style="width:260px;" />
                <input id="whmTokIp" class="whm-input" value="127.0.0.1/32" style="width:220px;" />
                <button class="whm-btn" onclick="createWhmApiToken()">+ Generate WHM API Token</button>
              </div>

              <table class="whm-table">
                <thead>
                  <tr>
                    <th>Portal</th>
                    <th>Token Name</th>
                    <th>Token Prefix</th>
                    <th>ACL Scopes</th>
                    <th>IP Allowlist</th>
                    <th>Expires</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  \${allTokens.length === 0 ? \`
                    <tr><td colspan="7" style="text-align:center;color:var(--whm-muted);padding:20px;">No API tokens created yet.</td></tr>
                  \` : allTokens.map(t => \`
                    <tr>
                      <td><span class="whm-badge">\${t.portal}</span></td>
                      <td><strong>\${t.name}</strong></td>
                      <td><code>\${t.tokenPrefix}...</code></td>
                      <td>\${t.scopes.map(s => '<code>' + s + '</code>').join(' ')}</td>
                      <td><code>\${t.ipAllowlist}</code></td>
                      <td>\${t.expiresAt.slice(0, 10)}</td>
                      <td><button class="whm-btn danger" onclick="revokeWhmToken('\${t.id}')">Revoke</button></td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>

            <div class="whm-card">
              <h3><span>⚡ WHM API Shell (Interactive v1 Endpoint Tester)</span></h3>
              <div class="whm-filter-bar">
                <select id="whmApiEndpoint" class="whm-select" style="flex:1;" onchange="updateWhmCurlPreview()">
                  <option value="GET|/api/v1/whm/overview">GET /api/v1/whm/overview — List WHM Packages</option>
                  <option value="GET|/api/v1/hosting-accounts">GET /api/v1/hosting-accounts — List All cPanel Accounts</option>
                  <option value="GET|/api/v1/dashboard/summary">GET /api/v1/dashboard/summary — Server Hardware &amp; Services Status</option>
                  <option value="GET|/api/v1/security/overview">GET /api/v1/security/overview — Export SIEM Security Incidents (JSON/CEF)</option>
                  <option value="GET|/api/v1/audit-logs">GET /api/v1/audit-logs — Query Audit Trail</option>
                  <option value="POST|/api/v1/email/preflight">POST /api/v1/email/preflight — Run 13-Point Mail Deliverability Check</option>
                </select>
                <button class="whm-btn blue" onclick="runWhmApiShell()">▶ Call WHM API</button>
              </div>
              <pre id="whmCurlPreview" style="background:#1e293b;color:#e2e8f0;padding:10px;border-radius:4px;font-size:12px;overflow-x:auto;margin-bottom:10px;"></pre>
              <pre id="whmApiResult" style="background:#0f172a;color:#38bdf8;padding:12px;border-radius:4px;font-size:12px;max-height:300px;overflow-y:auto;">Click "Call WHM API" to inspect live JSON response...</pre>
            </div>
          \`;
          updateWhmCurlPreview();
          return;
        }
      } catch (err) {
        main.innerHTML = \`
          <div class="whm-card">
            <h3 style="color:var(--whm-danger)">WHM Error</h3>
            <p>\${err.message}</p>
          </div>
        \`;
      }
    }

    async function runWhmTerm(cmdText) {
      const cmd = (cmdText || '').trim();
      const inp = document.getElementById('whmTermInput');
      if (inp) inp.value = '';
      if (cmd === 'clear') {
        whmTermHistory = [];
        const scr = document.getElementById('whmTermScreen');
        if (scr) scr.textContent = '';
        return;
      }
      try {
        const res = await api('/api/v1/terminal/exec', {
          method: 'POST',
          body: JSON.stringify({
            command: cmd,
            linuxUsername: 'root',
            scope: 'whm',
            cwd: whmTermCwd,
          }),
        });
        whmTermHistory.push('root@srv2075790:~# ' + cmd);
        if (res.output) whmTermHistory.push(res.output);
        whmTermCwd = res.cwd;
        const scr = document.getElementById('whmTermScreen');
        if (scr) {
          scr.textContent = whmTermHistory.join('\\n');
          scr.scrollTop = scr.scrollHeight;
        }
      } catch (err) {
        whmTermHistory.push('root@srv2075790:~# ' + cmd);
        whmTermHistory.push('Error: ' + err.message);
        const scr = document.getElementById('whmTermScreen');
        if (scr) {
          scr.textContent = whmTermHistory.join('\\n');
          scr.scrollTop = scr.scrollHeight;
        }
      }
    }

    async function createWhmApiToken() {
      try {
        const name = document.getElementById('whmTokName').value.trim();
        const ipAllowlist = document.getElementById('whmTokIp').value.trim();
        const res = await api('/api/v1/api-tokens', {
          method: 'POST',
          body: JSON.stringify({
            name,
            portal: 'WHM',
            ipAllowlist,
            scopes: ['whm:api1:full', 'accounts:create', 'accounts:suspend', 'packages:manage', 'services:restart'],
          }),
        });
        whmNewTokenSecret = res.secretPlaintextOnce;
        showToast('Generated WHM API Token!');
        await openWhmPage('whm-api');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function revokeWhmToken(tokenId) {
      try {
        await api('/api/v1/api-tokens', {
          method: 'DELETE',
          body: JSON.stringify({ tokenId }),
        });
        showToast('Revoked API Token');
        await openWhmPage('whm-api');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    function updateWhmCurlPreview() {
      const sel = document.getElementById('whmApiEndpoint');
      const pre = document.getElementById('whmCurlPreview');
      if (!sel || !pre) return;
      const [method, path] = sel.value.split('|');
      const baseOrigin = window.location.origin || 'http://200.234.39.100';
      pre.textContent = \`curl -X \${method} "\${baseOrigin}\${path}" \\\\\\n  -H "Authorization: Bearer \${sessionToken || 'gv_whm_live_4c10e9b2...'}" \\\\\\n  -H "Content-Type: application/json"\`;
    }

    async function runWhmApiShell() {
      const sel = document.getElementById('whmApiEndpoint');
      const out = document.getElementById('whmApiResult');
      if (!sel || !out) return;
      const [method, path] = sel.value.split('|');
      try {
        const opts = method === 'POST' ? { method: 'POST', body: '{}' } : { method: 'GET' };
        const data = await api(path, opts);
        out.textContent = JSON.stringify({ success: true, endpoint: path, data }, null, 2);
      } catch (err) {
        out.textContent = JSON.stringify({ success: false, error: err.message }, null, 2);
      }
    }

    async function createWhmAccount(simulateFail) {
      try {
        const primaryDomain = document.getElementById('caDomain').value.trim();
        const linuxUsername = document.getElementById('caUser').value.trim();
        const ownerEmail = document.getElementById('caEmail').value.trim();
        const packageId = document.getElementById('caPkg').value;
        const res = await api('/api/v1/hosting-accounts', {
          method: 'POST',
          body: JSON.stringify({
            linuxUsername,
            primaryDomain,
            ownerEmail,
            packageId,
            sshEnabled: false,
            simulateAgentFailure: simulateFail,
          }),
        });
        showToast('Account ' + linuxUsername + ' finished in state: ' + res.account.provisioningState);
        if (res.account.provisioningState === 'ACTIVE') {
          await openWhmPage('list-accounts');
        }
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function suspendAcct(accountId) {
      try {
        const reason = document.getElementById('suspReason_' + accountId)?.value || 'Administrative suspension';
        await api('/api/v1/whm/accounts/suspend', {
          method: 'POST',
          body: JSON.stringify({ accountId, reason }),
        });
        showToast('Account suspended');
        await openWhmPage('list-accounts');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function reactivateAcct(accountId) {
      try {
        await api('/api/v1/whm/accounts/reactivate', {
          method: 'POST',
          body: JSON.stringify({ accountId }),
        });
        showToast('Account unsuspended (ACTIVE)');
        await openWhmPage('list-accounts');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function addWhmPackage() {
      try {
        const name = document.getElementById('pkgName').value.trim();
        const diskQuotaMb = Number(document.getElementById('pkgDisk').value);
        const bandwidthQuotaMb = 1024000;
        const memoryLimitMb = Number(document.getElementById('pkgRam').value);
        await api('/api/v1/whm/packages', {
          method: 'POST',
          body: JSON.stringify({
            name,
            diskQuotaMb,
            bandwidthQuotaMb,
            memoryLimitMb,
            cpuQuotaPercent: 200,
            sshAccessAllowed: false,
          }),
        });
        showToast('Created WHM Package: ' + name);
        await openWhmPage('packages');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function restartWhmService(serviceName) {
      try {
        await api('/api/v1/servers/service-control', {
          method: 'POST',
          body: JSON.stringify({ serviceName, action: 'restart' }),
        });
        showToast('Service ' + serviceName + ' restarted cleanly');
        await openWhmPage('services');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function triggerWhmBackup() {
      try {
        await api('/api/v1/backups/create', { method: 'POST', body: '{}' });
        showToast('Encrypted Restic snapshot created');
        await openWhmPage('backups');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function verifyWhmSnap(backupArtifactId) {
      try {
        await api('/api/v1/backups/verify', {
          method: 'POST',
          body: JSON.stringify({ backupArtifactId }),
        });
        showToast('ADR-005 Sandbox Restore Verification Passed!');
        await openWhmPage('backups');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function rotateWhmKek() {
      try {
        const res = await api('/api/v1/security/rotate-kek', { method: 'POST', body: '{}' });
        showToast('Master KEK rotated to v' + res.newKeyVersion);
        await openWhmPage('security');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    bootWhm();
  </script>
</body>
</html>`;
}
