import { getAuthorizedNavigationForRole } from '@garvix/ui-components';
export { renderWhmPanelWebUiHtml } from './whm-ui.js';
export { renderLicenseStoreHtml } from './license-store-ui.js';
export { CustomerPanelApp } from './App.js';
export { NebulixSidebar } from './components/dashboard/NebulixSidebar.js';
export { NebulixWelcomeHero } from './components/dashboard/NebulixWelcomeHero.js';
export { NebulixStatsGrid } from './components/dashboard/NebulixStatsGrid.js';
export { NebulixServerMonitoring } from './components/dashboard/NebulixServerMonitoring.js';
export { NebulixQuickActions } from './components/dashboard/NebulixQuickActions.js';


/**
 * Garvix Customer Local Hosting Panel — cPanel Jupiter & WHM Style Web Interface
 * Provides permission-scoped experiences for Server Admin (WHM), Hosting Reseller,
 * Hosting Account Owner, Hosting Account Technician, Email-Only User, and Read-Only Auditor.
 */
export const CUSTOMER_PANEL_APP_METADATA = {
  appName: 'Garvix Customer Hosting Panel',
  version: '1.0.0-rc1',
  getNavigationForRole: getAuthorizedNavigationForRole,
};

export function renderCustomerPanelWebUiHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Garvix cPanel — Web Hosting Control Panel</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --cp-orange: #ff6c2c;
      --cp-orange-dark: #e05519;
      --cp-header: #0f172a;
      --cp-sidebar: #1e293b;
      --cp-sidebar-active: #0f172a;
      --cp-bg: #f4f6fb;
      --cp-card: #ffffff;
      --cp-border: #e2e8f0;
      --cp-text: #0f172a;
      --cp-muted: #64748b;
      --cp-blue: #2563eb;
      --cp-green: #16a34a;
      --cp-warn: #d97706;
      --cp-danger: #dc2626;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--cp-bg);
      color: var(--cp-text);
      font-size: 13.5px;
      -webkit-font-smoothing: antialiased;
    }
    /* Grace period notice bar (hidden during normal active operation) */
    .sandbox-strip {
      background: #991b1b;
      color: #ffffff;
      padding: 8px 22px;
      font-size: 12.5px;
      display: none;
      justify-content: space-between;
      align-items: center;
    }
    /* Modern cPanel Top Navbar */
    .cp-topbar {
      background: var(--cp-header);
      color: #ffffff;
      height: 62px;
      padding: 0 22px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.15);
      border-bottom: 1px solid #1e293b;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .cp-logo-group {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      flex-shrink: 0;
    }
    .cp-badge {
      background: linear-gradient(135deg, #ff6c2c, #ea580c);
      color: #fff;
      font-weight: 800;
      font-size: 15px;
      padding: 6px 11px;
      border-radius: 8px;
      letter-spacing: -0.5px;
      box-shadow: 0 2px 8px rgba(255, 108, 44, 0.35);
    }
    .cp-brand-title {
      font-weight: 800;
      font-size: 16px;
      letter-spacing: -0.2px;
      color: #ffffff;
    }
    .cp-brand-sub {
      font-size: 11px;
      color: #94a3b8;
      margin-left: 6px;
      font-weight: 500;
      background: #1e293b;
      padding: 2px 8px;
      border-radius: 999px;
    }
    .cp-search-wrap {
      flex: 1;
      max-width: 460px;
      min-width: 220px;
      margin: 0 12px;
    }
    .cp-search-input {
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      color: #ffffff;
      padding: 9px 15px;
      border-radius: 10px;
      font-size: 13px;
      font-family: inherit;
      transition: all 0.15s;
    }
    .cp-search-input::placeholder { color: #94a3b8; }
    .cp-search-input:focus {
      outline: none;
      border-color: var(--cp-orange);
      background: #0f172a;
      box-shadow: 0 0 0 3px rgba(255, 108, 44, 0.2);
    }
    .cp-top-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .cp-top-select {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 7px 10px;
      font-size: 12px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
    }
    .cp-btn {
      background: var(--cp-orange);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 7px 14px;
      font-size: 12.5px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .cp-btn:hover { background: var(--cp-orange-dark); transform: translateY(-1px); }
    .cp-btn.blue { background: var(--cp-blue); }
    .cp-btn.blue:hover { background: #1d4ed8; }
    .cp-btn.secondary {
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .cp-btn.secondary:hover { background: #f8fafc; }
    .cp-btn.danger {
      background: var(--cp-danger);
      color: #ffffff;
    }
    .cp-user-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #1e293b;
      border: 1px solid #334155;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 12.5px;
      color: #f8fafc;
    }

    /* Main 3-Column cPanel Layout */
    .cp-shell {
      display: grid;
      grid-template-columns: 235px 1fr 305px;
      min-height: calc(100vh - 62px);
    }
    @media (max-width: 1180px) {
      .cp-shell { grid-template-columns: 220px 1fr; }
      .cp-right-info { display: none; }
    }

    /* Left Sidebar */
    .cp-left-nav {
      background: var(--cp-sidebar);
      color: #cbd5e1;
      padding: 16px 10px;
      border-right: 1px solid #0f172a;
    }
    .cp-nav-group-title {
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      padding: 12px 12px 6px;
      font-weight: 700;
    }
    .cp-nav-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .cp-nav-item {
      padding: 9px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      color: #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.12s;
    }
    .cp-nav-item:hover {
      background: rgba(255,255,255,0.07);
      color: #ffffff;
    }
    .cp-nav-item.active {
      background: var(--cp-orange);
      color: #ffffff;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(255, 108, 44, 0.3);
    }
    .cp-nav-icon {
      width: 20px;
      text-align: center;
      font-size: 15px;
      flex-shrink: 0;
    }

    /* Center Workspace */
    .cp-center {
      padding: 24px 28px;
      overflow-x: auto;
    }
    .cp-page-title {
      margin: 0 0 18px 0;
      font-size: 21px;
      font-weight: 800;
      letter-spacing: -0.3px;
      color: var(--cp-text);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Welcome Quick-Launch Hero Card */
    .cp-hero-card {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      border-radius: 16px;
      padding: 22px 24px;
      margin-bottom: 22px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .cp-hero-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .cp-hero-domain {
      font-size: 19px;
      font-weight: 800;
      letter-spacing: -0.3px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .cp-hero-sub {
      font-size: 12.5px;
      color: #94a3b8;
      margin-top: 4px;
    }
    .cp-quick-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
      gap: 10px;
    }
    .cp-quick-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: #ffffff;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 9px;
      transition: all 0.15s;
    }
    .cp-quick-btn:hover {
      background: rgba(255, 108, 44, 0.9);
      border-color: var(--cp-orange);
      transform: translateY(-1px);
    }

    /* Feature Category Box */
    .cp-category-box {
      background: var(--cp-card);
      border: 1px solid var(--cp-border);
      border-radius: 14px;
      margin-bottom: 18px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
      overflow: hidden;
    }
    .cp-category-header {
      background: #f8fafc;
      border-bottom: 1px solid var(--cp-border);
      padding: 13px 18px;
      font-weight: 700;
      font-size: 13.5px;
      color: #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cp-tools-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 10px;
      padding: 14px 16px;
    }
    .cp-tool-tile {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 13px;
      border-radius: 10px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s;
    }
    .cp-tool-tile:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
    }
    .cp-tool-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #fff7ed;
      border: 1px solid #ffedd5;
      color: var(--cp-orange);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .cp-tool-icon.blue {
      background: #eff6ff;
      border-color: #dbeafe;
      color: var(--cp-blue);
    }
    .cp-tool-icon.green {
      background: #f0fdf4;
      border-color: #dcfce7;
      color: var(--cp-green);
    }
    .cp-tool-label {
      font-weight: 700;
      color: #0f172a;
      font-size: 13.5px;
      margin-bottom: 2px;
    }
    .cp-tool-desc {
      font-size: 11.5px;
      color: var(--cp-muted);
      line-height: 1.35;
    }

    /* Right Sidebar: Account Summary & Quotas */
    .cp-right-info {
      padding: 24px 22px 24px 0;
    }
    .cp-side-card {
      background: var(--cp-card);
      border: 1px solid var(--cp-border);
      border-radius: 14px;
      margin-bottom: 18px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
      overflow: hidden;
    }
    .cp-side-header {
      background: #f8fafc;
      border-bottom: 1px solid var(--cp-border);
      padding: 12px 16px;
      font-weight: 700;
      font-size: 12.5px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #334155;
    }
    .cp-side-item {
      padding: 11px 16px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 12.5px;
    }
    .cp-side-item:last-child { border-bottom: none; }
    .cp-side-label {
      color: var(--cp-muted);
      font-size: 11.5px;
      margin-bottom: 3px;
      font-weight: 500;
    }
    .cp-side-val {
      font-weight: 700;
      color: var(--cp-text);
      word-break: break-all;
    }
    .cp-progress {
      height: 7px;
      background: #e2e8f0;
      border-radius: 999px;
      margin-top: 6px;
      overflow: hidden;
    }
    .cp-progress-bar {
      height: 100%;
      background: var(--cp-blue);
      border-radius: 999px;
    }
    .cp-progress-bar.green { background: var(--cp-green); }
    .cp-progress-bar.orange { background: var(--cp-orange); }

    /* Content Cards & Tables */
    .cp-panel-card {
      background: var(--cp-card);
      border: 1px solid var(--cp-border);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 18px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
    }
    .cp-panel-card h3 {
      margin: 0 0 14px 0;
      font-size: 15.5px;
      font-weight: 700;
      color: var(--cp-text);
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cp-form-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 16px;
      background: #f8fafc;
      padding: 14px;
      border: 1px solid var(--cp-border);
      border-radius: 10px;
    }
    .cp-input, .cp-select {
      background: #ffffff;
      color: var(--cp-text);
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      font-family: inherit;
    }
    .cp-input:focus, .cp-select:focus {
      outline: none;
      border-color: var(--cp-blue);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }
    table.cp-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    table.cp-table th, table.cp-table td {
      text-align: left;
      padding: 11px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    table.cp-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .cp-pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      background: #dcfce7;
      color: #15803d;
    }
    .cp-pill.warn {
      background: #fef3c7;
      color: #b45309;
    }
    .cp-pill.danger {
      background: #fee2e2;
      color: #b91c1c;
    }
    code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 5px;
      font-size: 12px;
      color: #0f172a;
    }
    #toast {
      position: fixed;
      bottom: 22px;
      right: 22px;
      background: #0f172a;
      color: #ffffff;
      border-left: 4px solid var(--cp-orange);
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
  <div class="sandbox-strip" id="graceStrip"></div>

  <!-- Top cPanel Navbar -->
  <header class="cp-topbar">
    <div class="cp-logo-group" onclick="openView('tools-home')">
      <span class="cp-badge">cP</span>
      <div>
        <span class="cp-brand-title">Garvix cPanel</span>
        <span class="cp-brand-sub">Control Panel</span>
      </div>
    </div>

    <div class="cp-search-wrap">
      <input
        id="quickFindInput"
        class="cp-search-input"
        placeholder="🔍 Search tools... (e.g. File Manager, Email, Databases, Domains, SSL, Terminal)"
        oninput="filterToolsGrid(this.value)"
      />
    </div>

    <div class="cp-top-actions">
      <a href="/portal" class="cp-btn" style="text-decoration:none;background:#16a34a;">🔑 Software License</a>
      <a href="/whm" class="cp-btn blue" style="text-decoration:none;">🏢 WHM Admin</a>
      <select id="activeAccountSelect" class="cp-top-select" onchange="switchActiveAccount(this.value)" title="Select active website account">
        <option value="">Account: serveradmin</option>
      </select>
      <span class="cp-user-pill">👤 <strong id="topUsername">serveradmin</strong></span>
    </div>
  </header>

  <!-- 3-Column cPanel Shell -->
  <div class="cp-shell">
    <!-- Left Navigation Sidebar -->
    <aside class="cp-left-nav">
      <div class="cp-nav-group-title">Hosting Menu</div>
      <ul class="cp-nav-list">
        <li class="cp-nav-item active" id="nav-tools-home" onclick="openView('tools-home')">
          <span class="cp-nav-icon">🏠</span><span>Home Dashboard</span>
        </li>
        <li class="cp-nav-item" id="nav-file-manager" onclick="openView('file-manager')">
          <span class="cp-nav-icon">📁</span><span>File Manager</span>
        </li>
        <li class="cp-nav-item" id="nav-email-hosting" onclick="openView('email-hosting')">
          <span class="cp-nav-icon">✉️</span><span>Email Accounts</span>
        </li>
        <li class="cp-nav-item" id="nav-databases" onclick="openView('databases')">
          <span class="cp-nav-icon">🗄️</span><span>Databases</span>
        </li>
        <li class="cp-nav-item" id="nav-domains-dns" onclick="openView('domains-dns')">
          <span class="cp-nav-icon">🌐</span><span>Domains &amp; DNS</span>
        </li>
        <li class="cp-nav-item" id="nav-ssl-certificates" onclick="openView('ssl-certificates')">
          <span class="cp-nav-icon">🔒</span><span>Free SSL (HTTPS)</span>
        </li>
        <li class="cp-nav-item" id="nav-applications" onclick="openView('applications')">
          <span class="cp-nav-icon">🚀</span><span>Node.js &amp; PHP Apps</span>
        </li>
        <li class="cp-nav-item" id="nav-backups" onclick="openView('backups')">
          <span class="cp-nav-icon">💾</span><span>Backups &amp; Restore</span>
        </li>
        <li class="cp-nav-item" id="nav-web-terminal" onclick="openView('web-terminal')">
          <span class="cp-nav-icon">&gt;_</span><span>Web Terminal</span>
        </li>
        <li class="cp-nav-item" id="nav-api-system" onclick="openView('api-system')">
          <span class="cp-nav-icon">🔑</span><span>API &amp; Developer</span>
        </li>
        <li class="cp-nav-item" id="nav-cron-jobs" onclick="openView('cron-jobs')">
          <span class="cp-nav-icon">⏱️</span><span>Cron Jobs</span>
        </li>
        <li class="cp-nav-item" id="nav-ssh-keys" onclick="openView('ssh-keys')">
          <span class="cp-nav-icon">🔐</span><span>SSH Keys</span>
        </li>
        <li class="cp-nav-item" id="nav-security-center" onclick="openView('security-center')">
          <span class="cp-nav-icon">🛡️</span><span>Security &amp; Firewall</span>
        </li>
      </ul>

      <div class="cp-nav-group-title">Server Admin (WHM)</div>
      <ul class="cp-nav-list">
        <li class="cp-nav-item" onclick="window.location.href='/whm'" style="background:rgba(255,108,44,0.15);color:#fff;font-weight:700;">
          <span class="cp-nav-icon">↗</span><span>Open WHM Portal</span>
        </li>
        <li class="cp-nav-item" id="nav-whm-reseller" onclick="openView('whm-reseller')">
          <span class="cp-nav-icon">🏢</span><span>Website Accounts</span>
        </li>
        <li class="cp-nav-item" id="nav-server-overview" onclick="openView('server-overview')">
          <span class="cp-nav-icon">⚙️</span><span>Server Services</span>
        </li>
        <li class="cp-nav-item" onclick="window.location.href='/portal'">
          <span class="cp-nav-icon">🔑</span><span>Software License</span>
        </li>
        <li class="cp-nav-item" id="nav-audit-logs" onclick="openView('audit-logs')">
          <span class="cp-nav-icon">📋</span><span>Activity Logs</span>
        </li>
      </ul>
    </aside>

    <!-- Center Main View -->
    <main class="cp-center" id="centerView">
      <div class="cp-panel-card">Loading Garvix cPanel...</div>
    </main>

    <!-- Right Sidebar: Account Summary & Live Server Resources -->
    <aside class="cp-right-info">
      <div class="cp-side-card">
        <div class="cp-side-header">Account Summary</div>
        <div class="cp-side-item">
          <div class="cp-side-label">Primary Website</div>
          <div class="cp-side-val">🔒 <a href="#" id="infoDomain" onclick="openView('domains-dns');return false;" style="color:var(--cp-blue);text-decoration:none;">srv2075790.hstgr.cloud</a></div>
        </div>
        <div class="cp-side-item">
          <div class="cp-side-label">Linux Username</div>
          <div class="cp-side-val" id="infoUser">serveradmin</div>
        </div>
        <div class="cp-side-item">
          <div class="cp-side-label">Server IPv4 Address</div>
          <div class="cp-side-val"><code id="infoServerIp">200.234.39.100</code></div>
        </div>
        <div class="cp-side-item">
          <div class="cp-side-label">Home Folder</div>
          <div class="cp-side-val"><code id="infoHomeDir">/home/serveradmin</code></div>
        </div>
        <div class="cp-side-item">
          <div class="cp-side-label">Server OS</div>
          <div class="cp-side-val" id="infoOs">AlmaLinux 10.2 (64-bit)</div>
        </div>
        <div class="cp-side-item">
          <div class="cp-side-label">Software License</div>
          <div class="cp-side-val"><span class="cp-pill" id="infoLicBadge">ACTIVE • Verified</span></div>
        </div>
      </div>

      <div class="cp-side-card">
        <div class="cp-side-header">Server Resource Usage</div>
        <div class="cp-side-item">
          <div class="cp-side-label">Server Disk Space</div>
          <div class="cp-side-val" id="statDisk">-- GB / -- GB</div>
          <div class="cp-progress"><div class="cp-progress-bar green" id="barDisk" style="width:8%"></div></div>
        </div>
        <div class="cp-side-item">
          <div class="cp-side-label" id="labelCpu">CPU Load</div>
          <div class="cp-side-val" id="statCpu">--% / 100%</div>
          <div class="cp-progress"><div class="cp-progress-bar green" id="barCpu" style="width:5%"></div></div>
        </div>
        <div class="cp-side-item">
          <div class="cp-side-label">RAM Memory</div>
          <div class="cp-side-val" id="statRam">-- GB / -- GB</div>
          <div class="cp-progress"><div class="cp-progress-bar orange" id="barRam" style="width:15%"></div></div>
        </div>
        <div class="cp-side-item">
          <div class="cp-side-label">Hosted Domains</div>
          <div class="cp-side-val" id="statDomains">0</div>
        </div>
        <div class="cp-side-item">
          <div class="cp-side-label">Email Accounts</div>
          <div class="cp-side-val" id="statMailboxes">0</div>
        </div>
        <div class="cp-side-item">
          <div class="cp-side-label">Active Databases</div>
          <div class="cp-side-val" id="statDbCount">0</div>
        </div>
      </div>
    </aside>
  </div>

  <div id="toast"></div>

  <script>
    let sessionToken = '';
    let currentView = 'tools-home';
    let currentFileDir = 'public_html';
    let terminalCwd = 'public_html';
    let activeAccountId = 'acc_primary';
    let activeLinuxUsername = 'serveradmin';
    let activePrimaryDomain = 'srv2075790.hstgr.cloud';
    let cachedAccounts = [];
    let terminalHistory = [
      'Garvix Control Panel — Interactive Web Terminal (srv2075790.hstgr.cloud)',
      'Type "help" for available commands, or try: ls -la, pwd, df -h, free -m, uptime, node -v',
      ''
    ];
    let lastCreatedApiTokenPlaintext = '';

    const CPANEL_CATEGORIES = [
      {
        title: '✉️ Email & Inbox Management',
        items: [
          { icon: '✉️', color: '', label: 'Email Accounts', desc: 'Create & manage business email boxes', view: 'email-hosting' },
          { icon: '↪️', color: 'blue', label: 'Email Forwarders', desc: 'Auto-forward emails to another address', view: 'email-hosting' },
          { icon: '🛡️', color: 'green', label: 'Email Deliverability', desc: 'One-click DKIM, SPF & DMARC setup', view: 'email-hosting' },
          { icon: '📡', color: 'blue', label: 'Mail Health Check', desc: 'Check mail server health & ports', view: 'email-hosting' },
          { icon: '🏖️', color: '', label: 'Autoresponders', desc: 'Set automatic out-of-office replies', view: 'email-hosting' },
          { icon: '🧹', color: 'green', label: 'Spam Filters', desc: 'Block spam & configure inbox filters', view: 'email-hosting' },
        ],
      },
      {
        title: '📁 Files & Backups',
        items: [
          { icon: '📁', color: '', label: 'File Manager', desc: 'Upload, edit & manage website files', view: 'file-manager' },
          { icon: '💾', color: 'blue', label: 'Account Backups', desc: 'Create or download encrypted backups', view: 'backups' },
          { icon: '🧙', color: 'green', label: 'Restore Wizard', desc: 'Test & restore backups in one click', view: 'backups' },
          { icon: '📊', color: '', label: 'Disk Space Usage', desc: 'View folder sizes & storage space', view: 'file-manager' },
        ],
      },
      {
        title: '🗄️ Databases (PostgreSQL & MySQL/MariaDB)',
        items: [
          { icon: '🐘', color: 'blue', label: 'PostgreSQL Databases', desc: 'Create & manage PostgreSQL 16 databases', view: 'databases' },
          { icon: '🐬', color: '', label: 'MariaDB / MySQL', desc: 'Create & manage MariaDB 10.11 databases', view: 'databases' },
          { icon: '🔑', color: 'green', label: 'Database Users', desc: 'Manage database users & passwords', view: 'databases' },
        ],
      },
      {
        title: '🌐 Domains & DNS Records',
        items: [
          { icon: '🌐', color: 'blue', label: 'Domains', desc: 'Add new websites & domain names', view: 'domains-dns' },
          { icon: '📝', color: '', label: 'DNS Zone Editor', desc: 'Manage A, CNAME, MX & TXT records', view: 'domains-dns' },
          { icon: '🔗', color: 'green', label: 'Subdomains & Aliases', desc: 'Create subdomains & domain redirects', view: 'domains-dns' },
        ],
      },
      {
        title: '🔒 Security & Free SSL',
        items: [
          { icon: '⚡', color: 'green', label: "Let's Encrypt™ Free SSL", desc: 'Install free 1-click HTTPS certificates', view: 'ssl-certificates' },
          { icon: '🔒', color: 'blue', label: 'SSL/TLS Status', desc: 'View & auto-renew domain SSL certificates', view: 'ssl-certificates' },
          { icon: '🔐', color: 'blue', label: 'SSH Keys', desc: 'Manage SSH keys for secure terminal login', view: 'ssh-keys' },
          { icon: '🔑', color: '', label: 'API Tokens', desc: 'Create API keys for external apps', view: 'api-system' },
          { icon: '🧱', color: 'blue', label: 'Firewall & IP Blocker', desc: 'Manage server firewall & block IPs', view: 'security-center' },
        ],
      },
      {
        title: '🚀 Applications (Node.js & PHP)',
        items: [
          { icon: '🟢', color: 'green', label: 'Node.js App Manager', desc: 'Deploy & manage Node.js web apps', view: 'applications' },
          { icon: '🐘', color: 'blue', label: 'PHP Version Manager', desc: 'Configure PHP 8.2 / 8.3 FPM settings', view: 'applications' },
          { icon: '⚙️', color: '', label: 'App Environment (.env)', desc: 'Manage encrypted app secret variables', view: 'applications' },
        ],
      },
      {
        title: '>_ Developer Tools (Terminal, API & Cron)',
        items: [
          { icon: '>_', color: '', label: 'Web Terminal', desc: 'Run Linux commands in your browser', view: 'web-terminal' },
          { icon: '⚡', color: 'blue', label: 'API Explorer', desc: 'Test API endpoints & copy curl commands', view: 'api-system' },
          { icon: '⏱️', color: 'green', label: 'Cron Jobs', desc: 'Run scheduled tasks automatically', view: 'cron-jobs' },
        ],
      },
      {
        title: '🏢 Server Administration (WHM Shortcuts)',
        items: [
          { icon: '🏢', color: '', label: 'Website Accounts', desc: 'Create & manage website cPanel accounts', view: 'whm-reseller' },
          { icon: '🖥️', color: 'green', label: 'Server Services', desc: 'Check or restart Nginx, DB & Mail services', view: 'server-overview' },
          { icon: '📋', color: 'blue', label: 'Activity & Audit Logs', desc: 'View complete server action history', view: 'audit-logs' },
        ],
      },
    ];

    function showToast(msg, isErr = false) {
      const t = document.getElementById('toast');
      t.style.display = 'block';
      t.style.borderLeftColor = isErr ? '#dc2626' : '#ff6c2c';
      t.textContent = msg;
      setTimeout(() => { t.style.display = 'none'; }, 4000);
    }

    async function api(path, options = {}) {
      const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
      if (sessionToken) headers['Authorization'] = 'Bearer ' + sessionToken;
      const res = await fetch(path, Object.assign({}, options, { headers }));
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Request failed');
      }
      return body.data;
    }

    function applyActiveAccountToSidebar(acc) {
      if (acc) {
        activeAccountId = acc.id;
        activeLinuxUsername = acc.linuxUsername;
        activePrimaryDomain = acc.primaryDomain;
      }
      document.getElementById('topUsername').textContent = activeLinuxUsername;
      document.getElementById('infoUser').textContent = activeLinuxUsername;
      document.getElementById('infoDomain').textContent = activePrimaryDomain;
      document.getElementById('infoHomeDir').textContent = '/home/' + activeLinuxUsername;
    }

    async function switchActiveAccount(linuxUsername) {
      const found = cachedAccounts.find((a) => a.linuxUsername === linuxUsername);
      if (found) {
        applyActiveAccountToSidebar(found);
        showToast('Switched active account to ' + found.linuxUsername + ' (' + found.primaryDomain + ')');
        await openView(currentView);
      }
    }

    async function initApp() {
      try {
        try {
          const licNode = await api('/api/v1/license-store/node-status');
          if (licNode && licNode.status === 'EXPIRED_LOCKED') {
            document.body.innerHTML = \`
              <div style="min-height:100vh;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;font-family:sans-serif;">
                <div style="max-width:620px;background:#1e293b;border:2px solid #dc2626;border-radius:14px;padding:32px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
                  <div style="font-size:48px;margin-bottom:12px;">🔒</div>
                  <h1 style="margin:0 0 10px 0;color:#f87171;font-size:24px;">Garvix Control Panel License Expired</h1>
                  <p style="color:#cbd5e1;line-height:1.6;margin-bottom:20px;">
                    The monthly software license (<code>\${licNode.licenseKey}</code>) for server IP <code>\${licNode.serverIp}</code> has expired and passed its 72-hour grace period.
                    <br/><strong>Your hosted websites, databases, and emails remain online</strong>, but cPanel &amp; WHM management is locked until the monthly subscription is renewed.
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
            const banner = document.getElementById('graceStrip');
            if (banner) {
              banner.style.display = 'flex';
              banner.innerHTML = \`<span>⚠️ <strong>MONTHLY LICENSE IN 72-HOUR GRACE PERIOD (<code>\${licNode.licenseKey}</code>)</strong> — Please renew your subscription before the control panel locks.</span> <a href="/portal" style="color:#fde047;font-weight:800;">[Pay &amp; Renew Now →]</a>\`;
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
        const params = new URLSearchParams(window.location.search);
        const ssoAccount = params.get('account');
        await refreshSidebarStats(ssoAccount);
        await openView('tools-home');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function refreshSidebarStats(preferredUsername = null) {
      try {
        const [summary, accounts, domains, dbs, mailboxes] = await Promise.all([
          api('/api/v1/dashboard/summary'),
          api('/api/v1/hosting-accounts'),
          api('/api/v1/domains'),
          api('/api/v1/databases'),
          api('/api/v1/email/mailboxes'),
        ]);
        cachedAccounts = accounts;
        const sel = document.getElementById('activeAccountSelect');
        if (accounts.length > 0) {
          const chosen = (preferredUsername && accounts.find((a) => a.linuxUsername === preferredUsername)) ||
                         accounts.find((a) => a.linuxUsername === activeLinuxUsername) ||
                         accounts[0];
          applyActiveAccountToSidebar(chosen);
          if (sel) {
            sel.innerHTML = accounts
              .map((a) => \`<option value="\${a.linuxUsername}" \${a.linuxUsername === activeLinuxUsername ? 'selected' : ''}>Account: \${a.linuxUsername} (\${a.primaryDomain})</option>\`)
              .join('');
          }
        } else {
          if (sel) {
            sel.innerHTML = '<option value="serveradmin">Account: serveradmin (Primary Server)</option>';
          }
          applyActiveAccountToSidebar({
            id: 'acc_primary',
            linuxUsername: preferredUsername || 'serveradmin',
            primaryDomain: domains[0]?.domainName || 'srv2075790.hstgr.cloud',
          });
        }

        const t = summary.telemetry;
        document.getElementById('statDisk').textContent = t.disk.usedGb + ' GB / ' + t.disk.totalGb + ' GB (' + t.disk.usagePercent + '%)';
        document.getElementById('barDisk').style.width = Math.min(100, Math.max(2, t.disk.usagePercent)) + '%';
        document.getElementById('labelCpu').textContent = 'CPU Load (' + t.cpu.cores + ' vCPU)';
        document.getElementById('statCpu').textContent = t.cpu.usagePercent + '% / 100%';
        document.getElementById('barCpu').style.width = Math.min(100, Math.max(2, t.cpu.usagePercent)) + '%';
        const usedRamGb = (t.memory.usedMb / 1024).toFixed(2);
        const totalRamGb = (t.memory.totalMb / 1024).toFixed(1);
        document.getElementById('statRam').textContent = usedRamGb + ' GB / ' + totalRamGb + ' GB';
        document.getElementById('barRam').style.width = Math.min(100, Math.max(2, t.memory.usagePercent)) + '%';
        document.getElementById('statDomains').textContent = String(domains.length);
        document.getElementById('statMailboxes').textContent = String(mailboxes.length);
        document.getElementById('statDbCount').textContent = String(dbs.length);
      } catch (_) {}
    }

    function filterToolsGrid(query) {
      if (currentView !== 'tools-home') {
        openView('tools-home', query);
      } else {
        renderToolsHome(query);
      }
    }

    function renderToolsHome(filterText = '') {
      const q = filterText.trim().toLowerCase();
      const center = document.getElementById('centerView');
      let html = '';

      if (!q) {
        html += \`
          <div class="cp-hero-card">
            <div class="cp-hero-top">
              <div>
                <div class="cp-hero-domain">
                  <span>🌐 \${activePrimaryDomain}</span>
                  <span class="cp-pill" style="background:#16a34a;color:#fff;">🔒 Active</span>
                </div>
                <div class="cp-hero-sub">Server IP: <strong style="color:#e2e8f0;">200.234.39.100</strong> • Home: <strong style="color:#e2e8f0;">/home/\${activeLinuxUsername}</strong> • AlmaLinux 10.2</div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="cp-btn" onclick="openView('whm-reseller')">+ Add Website Account</button>
                <a href="/whm" class="cp-btn blue" style="text-decoration:none;">🏢 Open WHM Admin</a>
              </div>
            </div>
            <div class="cp-quick-bar">
              <button class="cp-quick-btn" onclick="openView('file-manager')"><span>📁</span><span>File Manager</span></button>
              <button class="cp-quick-btn" onclick="openView('email-hosting')"><span>✉️</span><span>Email Accounts</span></button>
              <button class="cp-quick-btn" onclick="openView('databases')"><span>🗄️</span><span>Databases</span></button>
              <button class="cp-quick-btn" onclick="openView('domains-dns')"><span>🌐</span><span>Domains &amp; DNS</span></button>
              <button class="cp-quick-btn" onclick="openView('ssl-certificates')"><span>🔒</span><span>Free SSL</span></button>
              <button class="cp-quick-btn" onclick="openView('web-terminal')"><span>&gt;_</span><span>Web Terminal</span></button>
            </div>
          </div>
        \`;
      } else {
        html += \`<div class="cp-page-title"><span>Search Results for "\${filterText}"</span><button class="cp-btn secondary" onclick="document.getElementById('quickFindInput').value='';renderToolsHome('');">Clear Search</button></div>\`;
      }

      CPANEL_CATEGORIES.forEach((cat) => {
        const filtered = cat.items.filter(
          (i) => !q || i.label.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q) || cat.title.toLowerCase().includes(q)
        );
        if (filtered.length === 0) return;

        html += \`
          <section class="cp-category-box">
            <div class="cp-category-header">
              <span>\${cat.title}</span>
              <span style="color:#94a3b8;font-size:12px;">\${filtered.length} tools</span>
            </div>
            <div class="cp-tools-grid">
              \${filtered.map(item => \`
                <div class="cp-tool-tile" onclick="openView('\${item.view}')">
                  <div class="cp-tool-icon \${item.color}">\${item.icon}</div>
                  <div>
                    <div class="cp-tool-label">\${item.label}</div>
                    <div class="cp-tool-desc">\${item.desc}</div>
                  </div>
                </div>
              \`).join('')}
            </div>
          </section>
        \`;
      });

      center.innerHTML = html;
    }

    async function openView(viewName, filterQuery = '') {
      currentView = viewName;
      document.querySelectorAll('.cp-nav-item').forEach((el) => el.classList.remove('active'));
      const navEl = document.getElementById('nav-' + viewName);
      if (navEl) navEl.classList.add('active');

      const center = document.getElementById('centerView');

      try {
        if (viewName === 'tools-home') {
          renderToolsHome(filterQuery);
          return;
        }

        if (viewName === 'file-manager') {
          const data = await api('/api/v1/files?linuxUsername=' + encodeURIComponent(activeLinuxUsername) + '&path=' + encodeURIComponent(currentFileDir));
          center.innerHTML = \`
            <div class="cp-page-title">
              <span>📁 File Manager — <code>/home/\${activeLinuxUsername}/\${data.currentPath}</code></span>
              <button class="cp-btn secondary" onclick="openView('tools-home')">← Back to Dashboard</button>
            </div>

            <div class="cp-panel-card">
              <h3>
                <span>Create / Edit File in <code>/home/\${activeLinuxUsername}/\${data.currentPath}</code></span>
                <span class="cp-pill">Path Guard Active</span>
              </h3>
              <div class="cp-form-row">
                <input id="fmFileName" class="cp-input" placeholder="Relative path (e.g. public_html/index.html)" value="public_html/index.html" style="width:260px;" />
                <input id="fmContent" class="cp-input" placeholder="File contents..." value="<h1>Welcome to \${activePrimaryDomain}</h1>" style="flex:1;" />
                <select id="fmMode" class="cp-select">
                  <option value="0644">0644 (Standard File)</option>
                  <option value="0640">0640 (Group Read)</option>
                  <option value="0600">0600 (Owner Private)</option>
                  <option value="0755">0755 (Executable/Dir)</option>
                </select>
                <button class="cp-btn" onclick="saveFile()">Save File</button>
              </div>

              \${data.entries.length === 0 ? '<p style="color:var(--cp-muted);margin:10px 0;">No files in this directory yet. Use the form above to create your first file.</p>' : \`
                <table class="cp-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Path</th>
                      <th>Type</th>
                      <th>Size</th>
                      <th>Permissions</th>
                      <th>SHA-256</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${data.entries.map(e => \`
                      <tr>
                        <td><strong>📄 \${e.name}</strong></td>
                        <td><code>\${e.relativePath}</code></td>
                        <td>\${e.type}</td>
                        <td>\${e.sizeBytes} B</td>
                        <td><code>\${e.modeOctal}</code></td>
                        <td><code>\${e.sha256Checksum ? e.sha256Checksum.slice(0, 12) + '…' : '-'}</code></td>
                        <td>
                          <button class="cp-btn secondary" onclick="chmodFile('\${e.relativePath}', '0600')">chmod 0600</button>
                          <button class="cp-btn danger" onclick="trashFile('\${e.relativePath}')">Move to Trash</button>
                        </td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              \`}
            </div>

            <div class="cp-panel-card">
              <h3><span>🗑️ Account Trash Bin (<code>/home/\${activeLinuxUsername}/.trash</code>)</span></h3>
              \${data.trashItems.length === 0 ? '<p style="color:var(--cp-muted)">Trash bin is empty.</p>' : \`
                <table class="cp-table">
                  <thead>
                    <tr>
                      <th>Original Path</th>
                      <th>Size</th>
                      <th>Deleted At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${data.trashItems.map(t => \`
                      <tr>
                        <td><code>\${t.originalRelativePath}</code></td>
                        <td>\${t.sizeBytes} B</td>
                        <td>\${t.deletedAtIso}</td>
                        <td><button class="cp-btn blue" onclick="restoreTrash('\${t.trashId}')">Restore File</button></td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              \`}
            </div>
          \`;
          return;
        }

        if (viewName === 'backups') {
          const b = await api('/api/v1/backups');
          center.innerHTML = \`
            <div class="cp-page-title">
              <span>💾 Encrypted Account Backups &amp; Restore</span>
              <button class="cp-btn secondary" onclick="openView('tools-home')">← Back to Dashboard</button>
            </div>

            <div class="cp-panel-card">
              <h3>
                <span>Backup Policy: \${b.policy.name}</span>
                <span class="cp-pill">AES-256-GCM Encrypted</span>
              </h3>
              <p style="margin-top:0;color:var(--cp-muted)">
                <strong>Repository URI:</strong> <code>\${b.policy.repositoryUri}</code> •
                <strong>Schedule:</strong> <code>\${b.policy.scheduleCron}</code> •
                <strong>Retention:</strong> \${b.policy.retentionDaily}D / \${b.policy.retentionWeekly}W / \${b.policy.retentionMonthly}M
              </p>
              <div class="cp-form-row">
                <button class="cp-btn" onclick="createBackupSnapshot()">+ Create New Backup Snapshot Now</button>
              </div>

              \${b.snapshots.length === 0 ? '<p style="color:var(--cp-muted);">No backup snapshots created yet. Click "+ Create New Backup Snapshot Now" above to create one.</p>' : \`
                <table class="cp-table">
                  <thead>
                    <tr>
                      <th>Snapshot ID</th>
                      <th>Created At</th>
                      <th>Files &amp; DB Dumps</th>
                      <th>Verification Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${b.snapshots.map(s => \`
                      <tr>
                        <td><code>\${s.resticSnapshotId.slice(0, 22)}…</code></td>
                        <td>\${s.createdAtIso}</td>
                        <td>\${s.entries.length} items</td>
                        <td>
                          <span class="cp-pill \${s.restoreVerified ? '' : 'warn'}">
                            \${s.restoreVerified ? 'VERIFIED' : 'UNVERIFIED'}
                          </span>
                        </td>
                        <td>
                          <button class="cp-btn blue" onclick="verifySnapshot('\${s.id}')">Verify Integrity</button>
                          <button class="cp-btn secondary" onclick="restoreSnapshot('\${s.id}')">Restore Account</button>
                        </td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              \`}
            </div>
          \`;
          return;
        }

        if (viewName === 'whm-reseller') {
          const [accounts, whm] = await Promise.all([
            api('/api/v1/hosting-accounts'),
            api('/api/v1/whm/overview'),
          ]);
          center.innerHTML = \`
            <div class="cp-page-title">
              <span>🏢 Website Hosting Accounts</span>
              <button class="cp-btn secondary" onclick="openView('tools-home')">← Back to Dashboard</button>
            </div>

            <div class="cp-panel-card">
              <h3>
                <span>Create a New Website Hosting Account</span>
                <span class="cp-pill">Isolated Linux User + Auto-SSL</span>
              </h3>
              <div class="cp-form-row">
                <input id="whmUser" class="cp-input" placeholder="Linux username (e.g. mywebsite)" />
                <input id="whmDomain" class="cp-input" placeholder="Primary domain (e.g. example.com)" />
                <input id="whmEmail" class="cp-input" placeholder="Admin email (e.g. admin@example.com)" />
                <button class="cp-btn" onclick="provisionWhmAccount()">+ Create Account</button>
              </div>

              \${accounts.length === 0 ? '<p style="color:var(--cp-muted);">No hosting accounts created yet. Enter a username and domain above to create your first account.</p>' : \`
                <table class="cp-table">
                  <thead>
                    <tr>
                      <th>Linux User</th>
                      <th>UID</th>
                      <th>Primary Domain</th>
                      <th>Home Dir</th>
                      <th>Package</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${accounts.map(a => \`
                      <tr>
                        <td><code>\${a.linuxUsername}</code></td>
                        <td>\${a.linuxUid}</td>
                        <td><strong>\${a.primaryDomain}</strong></td>
                        <td><code>\${a.homeDirectory}</code></td>
                        <td>\${a.packageName}</td>
                        <td><span class="cp-pill \${a.provisioningState === 'ACTIVE' ? '' : 'danger'}">\${a.provisioningState}</span></td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              \`}
            </div>
          \`;
          return;
        }

        if (viewName === 'email-hosting') {
          const [mailboxes, domains, preflight] = await Promise.all([
            api('/api/v1/email/mailboxes'),
            api('/api/v1/domains'),
            api('/api/v1/email/preflight'),
          ]);
          center.innerHTML = \`
            <div class="cp-page-title">
              <span>✉️ Email Accounts &amp; Deliverability</span>
              <button class="cp-btn secondary" onclick="openView('tools-home')">← Back to Dashboard</button>
            </div>

            <div class="cp-panel-card">
              <h3><span>Create Email Mailbox (Postfix + Dovecot + Rspamd)</span></h3>
              <div class="cp-form-row">
                <input id="mbxLocal" class="cp-input" placeholder="username (e.g. info)" />
                <span>@</span>
                <select id="mbxDomainId" class="cp-select">
                  \${domains.length > 0 ? domains.map(d => \`<option value="\${d.id}">\${d.domainName}</option>\`).join('') : \`<option value="default">\${activePrimaryDomain}</option>\`}
                </select>
                <input id="mbxPass" type="password" class="cp-input" placeholder="Mailbox password" />
                <input id="mbxQuota" type="number" class="cp-input" value="2048" style="width:100px" /> <span>MB</span>
                <button class="cp-btn" onclick="createMailbox()">+ Create Mailbox</button>
              </div>

              \${mailboxes.length === 0 ? '<p style="color:var(--cp-muted);">No email mailboxes created yet.</p>' : \`
                <table class="cp-table">
                  <thead>
                    <tr>
                      <th>Email Address</th>
                      <th>Storage Quota</th>
                      <th>Protocols</th>
                      <th>Spam Filter</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${mailboxes.map(m => \`
                      <tr>
                        <td><strong>\${m.emailAddress}</strong></td>
                        <td>\${m.usedMb} / \${m.quotaMb} MB</td>
                        <td>IMAPS (993) • SMTP (587)</td>
                        <td>\${m.spamFilterLevel}</td>
                        <td><span class="cp-pill">\${m.status}</span></td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              \`}
            </div>

            <div class="cp-panel-card">
              <h3>
                <span>Mail Server Deliverability Checks</span>
                <span class="cp-pill">\${preflight.overallStatus}</span>
              </h3>
              <table class="cp-table">
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
                      <td><span class="cp-pill \${c.status === 'PASS' ? '' : 'warn'}">\${c.status}</span></td>
                      <td>\${c.details}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          \`;
          return;
        }

        if (viewName === 'databases') {
          const dbs = await api('/api/v1/databases');
          center.innerHTML = \`
            <div class="cp-page-title">
              <span>🗄️ PostgreSQL 16 &amp; MariaDB 10.11 Databases</span>
              <button class="cp-btn secondary" onclick="openView('tools-home')">← Back to Dashboard</button>
            </div>

            <div class="cp-panel-card">
              <h3>
                <span>Create New Database (Prefix: <code>gv_\${activeLinuxUsername}_</code>)</span>
                <span class="cp-pill">Isolated User Privileges</span>
              </h3>
              <div class="cp-form-row">
                <select id="dbEngine" class="cp-select">
                  <option value="POSTGRESQL">PostgreSQL 16</option>
                  <option value="MARIADB">MariaDB 10.11 LTS</option>
                </select>
                <span><code>gv_\${activeLinuxUsername}_</code></span>
                <input id="dbSuffix" class="cp-input" placeholder="database name (e.g. appdb)" />
                <button class="cp-btn" onclick="createDatabase()">+ Create Database</button>
              </div>

              \${dbs.length === 0 ? '<p style="color:var(--cp-muted);">No databases created yet. Use the form above to create a PostgreSQL or MariaDB database.</p>' : \`
                <table class="cp-table">
                  <thead>
                    <tr>
                      <th>Engine</th>
                      <th>Database Name</th>
                      <th>Database User</th>
                      <th>Host : Port</th>
                      <th>Collation</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${dbs.map(db => \`
                      <tr>
                        <td><span class="cp-pill">\${db.engine}</span></td>
                        <td><code>\${db.name}</code></td>
                        <td><code>\${db.assignedUsers.map(u => u.username + ' (' + u.privileges + ')').join(', ')}</code></td>
                        <td>\${db.connectionHost}:\${db.connectionPort}</td>
                        <td>\${db.collation}</td>
                        <td><span class="cp-pill">\${db.status}</span></td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              \`}
            </div>
          \`;
          return;
        }

        if (viewName === 'domains-dns') {
          const domains = await api('/api/v1/domains');
          const firstDomainId = domains[0]?.id || '';
          const zone = firstDomainId ? await api('/api/v1/dns/zones?domainId=' + firstDomainId) : null;
          center.innerHTML = \`
            <div class="cp-page-title">
              <span>🌐 Domains &amp; DNS Zone Editor</span>
              <button class="cp-btn secondary" onclick="openView('tools-home')">← Back to Dashboard</button>
            </div>

            <div class="cp-panel-card">
              <h3><span>Hosted Domains</span></h3>
              <div class="cp-form-row">
                <input id="domName" class="cp-input" placeholder="Enter domain name (e.g. mydomain.com)" style="width:280px;" />
                <select id="domTemplate" class="cp-select">
                  <option value="PHP">PHP-FPM 8.3</option>
                  <option value="NODEJS">Node.js 22</option>
                  <option value="STATIC">Static HTML/React</option>
                </select>
                <button class="cp-btn" onclick="addDomain()">+ Add Domain &amp; Auto-SSL</button>
              </div>

              \${domains.length === 0 ? '<p style="color:var(--cp-muted);">No domains added yet. Add your first domain above to generate its Nginx vhost and DNS zone.</p>' : \`
                <table class="cp-table">
                  <thead>
                    <tr>
                      <th>Domain</th>
                      <th>Document Root</th>
                      <th>Stack</th>
                      <th>SSL Status</th>
                      <th>DNS Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${domains.map(d => \`
                      <tr>
                        <td><strong>\${d.domainName}</strong></td>
                        <td><code>\${d.documentRoot}</code></td>
                        <td>\${d.templateType}</td>
                        <td><span class="cp-pill">\${d.sslStatus}</span></td>
                        <td>\${d.dnsManagementMode}</td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              \`}
            </div>

            \${zone ? \`
              <div class="cp-panel-card">
                <h3>
                  <span>DNS Zone Editor — <code>\${zone.zoneName}</code> (SOA Serial: <code>\${zone.soaSerial}</code>)</span>
                  <span class="cp-pill">DNSSEC Active</span>
                </h3>
                <div class="cp-form-row">
                  <input id="dnsRecName" class="cp-input" placeholder="Name (e.g. www or @)" value="www" style="width:130px" />
                  <select id="dnsRecType" class="cp-select">
                    <option value="A">A</option>
                    <option value="AAAA">AAAA</option>
                    <option value="CNAME">CNAME</option>
                    <option value="TXT">TXT</option>
                    <option value="MX">MX</option>
                  </select>
                  <input id="dnsRecContent" class="cp-input" placeholder="Record value (e.g. 200.234.39.100)" value="200.234.39.100" style="width:220px" />
                  <input id="dnsRecTtl" type="number" class="cp-input" value="3600" style="width:90px" />
                  <button class="cp-btn blue" onclick="addDnsRecord('\${firstDomainId}')">+ Add Record</button>
                </div>
                <table class="cp-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>TTL</th>
                      <th>Type</th>
                      <th>Record Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${zone.records.map(r => \`
                      <tr>
                        <td><code>\${r.name}</code></td>
                        <td>\${r.ttl}</td>
                        <td><span class="cp-pill">\${r.type}</span></td>
                        <td><code>\${r.content}</code></td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              </div>
            \` : ''}
          \`;
          return;
        }

        if (viewName === 'ssl-certificates') {
          const [certs, domains] = await Promise.all([
            api('/api/v1/ssl/certificates'),
            api('/api/v1/domains'),
          ]);
          center.innerHTML = \`
            <div class="cp-page-title">
              <span>🔒 SSL/TLS Status &amp; Let's Encrypt™ Free HTTPS</span>
              <button class="cp-btn secondary" onclick="openView('tools-home')">← Back to Dashboard</button>
            </div>

            <div class="cp-panel-card">
              <h3>
                <span>Issue Let's Encrypt™ Certificate</span>
                <span class="cp-pill">Auto-Renew Enabled</span>
              </h3>
              <div class="cp-form-row">
                <select id="sslDomain" class="cp-select">
                  \${domains.length > 0 ? domains.map(d => \`<option value="\${d.id}">\${d.domainName}</option>\`).join('') : \`<option value="default">\${activePrimaryDomain}</option>\`}
                </select>
                <select id="sslChallenge" class="cp-select">
                  <option value="HTTP_01">HTTP-01 Validation</option>
                  <option value="DNS_01">DNS-01 Wildcard (*.domain)</option>
                </select>
                <button class="cp-btn" onclick="issueCertificate()">Issue / Renew SSL Certificate</button>
              </div>

              \${certs.length === 0 ? '<p style="color:var(--cp-muted);">No SSL certificates issued yet. Select a domain above and click Issue / Renew SSL Certificate.</p>' : \`
                <table class="cp-table">
                  <thead>
                    <tr>
                      <th>Domain</th>
                      <th>Covered Hostnames</th>
                      <th>Challenge</th>
                      <th>Issuer</th>
                      <th>Certificate Path</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${certs.map(c => \`
                      <tr>
                        <td><strong>\${c.domainName}</strong></td>
                        <td><code>\${(c.sanDomains || []).join(', ')}</code></td>
                        <td>\${c.challengeType}</td>
                        <td>\${c.issuer}</td>
                        <td><code>\${c.certPath}</code></td>
                        <td><span class="cp-pill">\${c.status}</span></td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              \`}
            </div>
          \`;
          return;
        }

        if (viewName === 'applications') {
          const [apps, domains] = await Promise.all([
            api('/api/v1/applications'),
            api('/api/v1/domains'),
          ]);
          center.innerHTML = \`
            <div class="cp-page-title">
              <span>🚀 Application Manager (Node.js &amp; PHP-FPM)</span>
              <button class="cp-btn secondary" onclick="openView('tools-home')">← Back to Dashboard</button>
            </div>

            <div class="cp-panel-card">
              <h3><span>Deploy New Application</span><span class="cp-pill">systemd + Nginx Reverse Proxy</span></h3>
              <div class="cp-form-row">
                <input id="appName" class="cp-input" placeholder="App Name (e.g. My Node App)" />
                <select id="appType" class="cp-select">
                  <option value="NODEJS|node-22">Node.js 22 LTS</option>
                  <option value="PHP|php-8.3">PHP 8.3 FPM</option>
                </select>
                <select id="appDomainId" class="cp-select">
                  \${domains.length > 0 ? domains.map(d => \`<option value="\${d.id}">\${d.domainName}</option>\`).join('') : \`<option value="default">\${activePrimaryDomain}</option>\`}
                </select>
                <input id="appRootRel" class="cp-input" placeholder="App path (e.g. public_html)" value="public_html" />
                <button class="cp-btn" onclick="deployNewApp()">+ Deploy Application</button>
              </div>

              \${apps.length === 0 ? '<p style="color:var(--cp-muted);">No applications deployed yet.</p>' : \`
                <table class="cp-table">
                  <thead>
                    <tr>
                      <th>Application Name</th>
                      <th>Runtime</th>
                      <th>Domain</th>
                      <th>App Root</th>
                      <th>Resources</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${apps.map(a => \`
                      <tr>
                        <td><strong>\${a.name}</strong></td>
                        <td><code>\${a.runtimeVersion}</code></td>
                        <td>\${a.domainName}</td>
                        <td><code>\${a.appRoot}</code></td>
                        <td>\${a.memoryLimitMb} MB / \${a.cpuQuotaPercent}% CPU</td>
                        <td><span class="cp-pill">\${a.status}</span></td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              \`}
            </div>
          \`;
          return;
        }

        if (viewName === 'security-center') {
          const sec = await api('/api/v1/security/overview');
          center.innerHTML = \`
            <div class="cp-page-title">
              <span>🛡️ Security &amp; Firewall Manager</span>
              <button class="cp-btn secondary" onclick="openView('tools-home')">← Back to Dashboard</button>
            </div>

            <div class="cp-panel-card">
              <h3><span>Encryption Master Key (KEK) Rotation</span></h3>
              <div class="cp-form-row">
                <button class="cp-btn" onclick="rotateKek()">Rotate Master Encryption Key</button>
                <span style="font-size:12px;color:var(--cp-muted)">Rotates AES-256-GCM key version for stored panel secrets.</span>
              </div>
            </div>

            <div class="cp-panel-card">
              <h3><span>Firewall Port Policy Manager</span></h3>
              <div class="cp-form-row">
                <input id="fwPort" type="number" class="cp-input" value="8080" style="width:110px" />
                <select id="fwAction" class="cp-select">
                  <option value="ALLOW">ALLOW Port in public zone</option>
                  <option value="REMOVE_OR_DROP">DROP / Block Port</option>
                </select>
                <button class="cp-btn blue" onclick="applyFirewall()">Apply Firewall Rule</button>
              </div>
            </div>

            <div class="cp-panel-card">
              <h3><span>Security Event Log</span></h3>
              <pre style="background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;overflow-x:auto;font-size:12px;">\${sec.incidentsCef || 'No security events recorded.'}</pre>
            </div>
          \`;
          return;
        }

        if (viewName === 'server-overview') {
          const summary = await api('/api/v1/dashboard/summary');
          const t = summary.telemetry;
          center.innerHTML = \`
            <div class="cp-page-title">
              <span>⚙️ Server Status &amp; System Services</span>
              <button class="cp-btn secondary" onclick="openView('tools-home')">← Back to Dashboard</button>
            </div>

            <div class="cp-panel-card">
              <h3><span>Managed System Services</span></h3>
              <table class="cp-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Category</th>
                    <th>Version</th>
                    <th>Port</th>
                    <th>Memory</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  \${t.services.map(s => \`
                    <tr>
                      <td><strong>\${s.displayName}</strong></td>
                      <td>\${s.category}</td>
                      <td><code>\${s.version}</code></td>
                      <td>\${s.port}</td>
                      <td>\${s.memoryMb} MB</td>
                      <td><span class="cp-pill">\${s.state.toUpperCase()}</span></td>
                      <td><button class="cp-btn secondary" onclick="restartSvc('\${s.name}')">Restart Service</button></td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          \`;
          return;
        }

        if (viewName === 'audit-logs') {
          const logs = await api('/api/v1/audit-logs');
          center.innerHTML = \`
            <div class="cp-page-title">
              <span>📋 Activity &amp; Audit Logs</span>
              <button class="cp-btn secondary" onclick="openView('tools-home')">← Back to Dashboard</button>
            </div>
            <div class="cp-panel-card">
              \${logs.length === 0 ? '<p style="color:var(--cp-muted);">No activity logs recorded yet.</p>' : \`
                <table class="cp-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Resource</th>
                      <th>Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${logs.map(l => \`
                      <tr>
                        <td><code>\${l.createdAt}</code></td>
                        <td>\${l.actorUsername}</td>
                        <td><code>\${l.action}</code></td>
                        <td><code>\${l.resourceType}:\${l.resourceId}</code></td>
                        <td>\${l.summary}</td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              \`}
            </div>
          \`;
          return;
        }

        if (viewName === 'web-terminal') {
          center.innerHTML = \`
            <div class="cp-page-title">
              <span>&gt;_ Web Terminal — <code>/home/\${activeLinuxUsername}</code></span>
              <button class="cp-btn secondary" onclick="openView('tools-home')">← Back to Dashboard</button>
            </div>
            <div class="cp-panel-card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
                <div style="font-size:12.5px;color:var(--cp-muted);">
                  Quick Commands:
                  <button class="cp-btn secondary" style="padding:3px 8px;font-size:11.5px;" onclick="runTermCmd('ls -la')">ls -la</button>
                  <button class="cp-btn secondary" style="padding:3px 8px;font-size:11.5px;" onclick="runTermCmd('pwd')">pwd</button>
                  <button class="cp-btn secondary" style="padding:3px 8px;font-size:11.5px;" onclick="runTermCmd('df -h')">df -h</button>
                  <button class="cp-btn secondary" style="padding:3px 8px;font-size:11.5px;" onclick="runTermCmd('free -m')">free -m</button>
                  <button class="cp-btn secondary" style="padding:3px 8px;font-size:11.5px;" onclick="runTermCmd('uptime')">uptime</button>
                  <button class="cp-btn secondary" style="padding:3px 8px;font-size:11.5px;" onclick="runTermCmd('uname -a')">uname -a</button>
                  <button class="cp-btn secondary" style="padding:3px 8px;font-size:11.5px;" onclick="runTermCmd('node -v')">node -v</button>
                  <button class="cp-btn secondary" style="padding:3px 8px;font-size:11.5px;" onclick="runTermCmd('help')">help</button>
                  <button class="cp-btn secondary" style="padding:3px 8px;font-size:11.5px;" onclick="runTermCmd('clear')">clear</button>
                </div>
                <span class="cp-pill">Isolated Shell</span>
              </div>

              <div id="termScreen" style="background:#0d1117;color:#3fb950;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;padding:16px;border-radius:8px;height:360px;overflow-y:auto;white-space:pre-wrap;line-height:1.5;border:1px solid #30363d;">\${terminalHistory.join('\\n')}</div>

              <div style="display:flex;gap:8px;margin-top:10px;align-items:center;background:#161b22;padding:8px 12px;border-radius:8px;border:1px solid #30363d;">
                <span id="termPromptLabel" style="color:#58a6ff;font-family:monospace;font-weight:700;font-size:13px;">\${activeLinuxUsername}@srv2075790:~/\${terminalCwd}$</span>
                <input id="termInput" type="text" placeholder="Type command (e.g. ls -la, df -h, free -m, uptime, touch hello.txt) and press Enter..."
                  style="flex:1;background:transparent;border:none;color:#f0f6fc;font-family:monospace;font-size:13px;outline:none;"
                  onkeydown="if(event.key==='Enter'){runTermCmd(this.value);}" />
                <button class="cp-btn" onclick="runTermCmd(document.getElementById('termInput').value)">Execute</button>
              </div>
            </div>
          \`;
          const scr = document.getElementById('termScreen');
          if (scr) scr.scrollTop = scr.scrollHeight;
          const inp = document.getElementById('termInput');
          if (inp) inp.focus();
          return;
        }

        if (viewName === 'api-system') {
          const allTokens = await api('/api/v1/api-tokens');
          const tokens = allTokens.filter(t => t.portal === 'CPANEL');
          center.innerHTML = \`
            <div class="cp-page-title">
              <span>🔑 API Tokens &amp; Developer Explorer</span>
              <button class="cp-btn secondary" onclick="openView('tools-home')">← Back to Dashboard</button>
            </div>

            \${lastCreatedApiTokenPlaintext ? \`
              <div class="cp-panel-card" style="border-left:4px solid var(--cp-green);background:#f0fdf4;">
                <h3 style="margin-top:0;color:var(--cp-green);">✅ New cPanel API Token Generated (Copy Now — Shown Once)</h3>
                <code style="display:block;padding:10px;background:#0f172a;color:#38bdf8;border-radius:6px;font-size:13px;word-break:break-all;">\${lastCreatedApiTokenPlaintext}</code>
              </div>
            \` : ''}

            <div class="cp-panel-card">
              <h3>Generate New cPanel API Token</h3>
              <div class="cp-form-row">
                <input id="apiTokName" class="cp-input" placeholder="Token Name (e.g. CI/CD Deploy Key)" style="width:240px;" />
                <input id="apiTokIp" class="cp-input" placeholder="Allowed IP CIDR" value="0.0.0.0/0" style="width:160px;" />
                <select id="apiTokScopes" class="cp-select">
                  <option value="full">Full cPanel REST v1 Access</option>
                  <option value="dns_ssl">DNS &amp; SSL Only</option>
                  <option value="files_apps">Files &amp; Apps Only</option>
                </select>
                <button class="cp-btn" onclick="createCpanelApiToken()">+ Generate API Token</button>
              </div>

              \${tokens.length === 0 ? '<p style="color:var(--cp-muted);">No API tokens created yet.</p>' : \`
                <table class="cp-table">
                  <thead>
                    <tr>
                      <th>Token Name</th>
                      <th>Token Prefix</th>
                      <th>Granted Scopes</th>
                      <th>IP Allowlist</th>
                      <th>Expires</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${tokens.map(t => \`
                      <tr>
                        <td><strong>\${t.name}</strong></td>
                        <td><code>\${t.tokenPrefix}...</code></td>
                        <td>\${t.scopes.map(s => '<span class="cp-pill">' + s + '</span>').join(' ')}</td>
                        <td><code>\${t.ipAllowlist}</code></td>
                        <td>\${t.expiresAt.slice(0, 10)}</td>
                        <td><button class="cp-btn danger" style="padding:4px 9px;font-size:11.5px;" onclick="revokeApiToken('\${t.id}')">Revoke</button></td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              \`}
            </div>

            <div class="cp-panel-card">
              <h3>⚡ Live API Explorer</h3>
              <div class="cp-form-row">
                <select id="apiShellEndpoint" class="cp-select" style="flex:1;" onchange="updateApiShellCurl()">
                  <option value="GET|/api/v1/dashboard/summary">GET /api/v1/dashboard/summary — Server &amp; Account Telemetry</option>
                  <option value="GET|/api/v1/domains">GET /api/v1/domains — List Hosted Domains</option>
                  <option value="GET|/api/v1/databases">GET /api/v1/databases — List Databases</option>
                  <option value="GET|/api/v1/email/mailboxes">GET /api/v1/email/mailboxes — List Email Accounts</option>
                  <option value="GET|/api/v1/ssl/certificates">GET /api/v1/ssl/certificates — List SSL Certificates</option>
                  <option value="GET|/api/v1/files?path=public_html">GET /api/v1/files?path=public_html — List Files</option>
                  <option value="GET|/api/v1/backups">GET /api/v1/backups — List Encrypted Backups</option>
                  <option value="GET|/api/v1/cron-jobs">GET /api/v1/cron-jobs — List Cron Jobs</option>
                </select>
                <button class="cp-btn blue" onclick="executeApiShellCall()">▶ Execute API Call</button>
              </div>
              <div style="margin-bottom:10px;">
                <label style="font-size:11.5px;font-weight:700;color:#475569;display:block;margin-bottom:4px;">cURL Command</label>
                <pre id="apiShellCurl" style="margin:0;background:#1e293b;color:#e2e8f0;padding:10px;border-radius:6px;font-size:12px;overflow-x:auto;"></pre>
              </div>
              <div>
                <label style="font-size:11.5px;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Live JSON Response</label>
                <pre id="apiShellOutput" style="margin:0;background:#0f172a;color:#38bdf8;padding:12px;border-radius:6px;font-size:12px;max-height:300px;overflow-y:auto;">Click "Execute API Call" to inspect live JSON response...</pre>
              </div>
            </div>
          \`;
          updateApiShellCurl();
          return;
        }

        if (viewName === 'cron-jobs') {
          const jobs = await api('/api/v1/cron-jobs');
          center.innerHTML = \`
            <div class="cp-page-title">
              <span>⏱️ Cron Jobs — Scheduled Tasks</span>
              <button class="cp-btn secondary" onclick="openView('tools-home')">← Back to Dashboard</button>
            </div>

            <div class="cp-panel-card">
              <h3>Add New Cron Job</h3>
              <div class="cp-form-row">
                <select class="cp-select" onchange="document.getElementById('cronSched').value=this.value">
                  <option value="*/5 * * * *">Every 5 Minutes (*/5 * * * *)</option>
                  <option value="0 * * * *">Once Per Hour (0 * * * *)</option>
                  <option value="0 3 * * *">Once Per Day at 3:00 AM (0 3 * * *)</option>
                  <option value="0 0 * * 0">Once Per Week (0 0 * * 0)</option>
                </select>
                <input id="cronSched" class="cp-input" value="*/5 * * * *" style="width:130px;" />
                <input id="cronCmd" class="cp-input" placeholder="Command (e.g. /usr/bin/php /home/\${activeLinuxUsername}/public_html/cron.php)" value="/usr/bin/php /home/\${activeLinuxUsername}/public_html/cron.php" style="flex:1;" />
                <input id="cronEmail" class="cp-input" placeholder="Alert email" value="admin@\${activePrimaryDomain}" style="width:200px;" />
                <button class="cp-btn" onclick="addCronJob()">+ Add Cron Job</button>
              </div>

              \${jobs.length === 0 ? '<p style="color:var(--cp-muted);">No scheduled cron jobs configured yet.</p>' : \`
                <table class="cp-table">
                  <thead>
                    <tr>
                      <th>Schedule</th>
                      <th>Command</th>
                      <th>Notification Email</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${jobs.map(j => \`
                      <tr>
                        <td><code>\${j.schedule}</code></td>
                        <td><code>\${j.command}</code></td>
                        <td>\${j.emailNotification}</td>
                        <td><span class="cp-pill">ACTIVE</span></td>
                        <td><button class="cp-btn danger" style="padding:4px 9px;font-size:11.5px;" onclick="deleteCronJob('\${j.id}')">Delete</button></td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              \`}
            </div>
          \`;
          return;
        }

        if (viewName === 'ssh-keys') {
          const keys = await api('/api/v1/ssh-keys');
          center.innerHTML = \`
            <div class="cp-page-title">
              <span>🔐 SSH Keys (<code>/home/\${activeLinuxUsername}/.ssh/authorized_keys</code>)</span>
              <button class="cp-btn secondary" onclick="openView('tools-home')">← Back to Dashboard</button>
            </div>

            <div class="cp-panel-card">
              <h3>Authorize SSH Public Key</h3>
              <div class="cp-form-row">
                <input id="sshKeyName" class="cp-input" placeholder="Key Name (e.g. laptop-ed25519)" style="width:220px;" />
                <input id="sshKeyPub" class="cp-input" placeholder="Paste ssh-ed25519 or ssh-rsa public key..." style="flex:1;" />
                <button class="cp-btn" onclick="addSshKey()">+ Authorize SSH Key</button>
              </div>

              \${keys.length === 0 ? '<p style="color:var(--cp-muted);">No SSH public keys authorized yet.</p>' : \`
                <table class="cp-table">
                  <thead>
                    <tr>
                      <th>Key Name</th>
                      <th>Type</th>
                      <th>Fingerprint</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${keys.map(k => \`
                      <tr>
                        <td><strong>\${k.name}</strong></td>
                        <td><code>\${k.keyType}</code></td>
                        <td><code>\${k.fingerprint}</code></td>
                        <td><span class="cp-pill">AUTHORIZED</span></td>
                        <td><button class="cp-btn danger" style="padding:4px 9px;font-size:11.5px;" onclick="deleteSshKey('\${k.id}')">Remove</button></td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              \`}
            </div>
          \`;
          return;
        }
      } catch (err) {
        center.innerHTML = \`
          <div class="cp-panel-card">
            <h3 style="color:var(--cp-danger)">Action Error</h3>
            <p>\${err.message}</p>
            <button class="cp-btn secondary" onclick="openView('tools-home')">← Back to Dashboard</button>
          </div>
        \`;
      }
    }

    // Terminal, API System, Cron & SSH Handlers
    async function runTermCmd(cmdText) {
      const cmd = (cmdText || '').trim();
      const inp = document.getElementById('termInput');
      if (inp) inp.value = '';
      if (cmd === 'clear') {
        terminalHistory = [];
        const scr = document.getElementById('termScreen');
        if (scr) scr.textContent = '';
        return;
      }
      try {
        const res = await api('/api/v1/terminal/exec', {
          method: 'POST',
          body: JSON.stringify({
            command: cmd,
            linuxUsername: activeLinuxUsername,
            scope: 'cpanel',
            cwd: terminalCwd,
          }),
        });
        terminalHistory.push(activeLinuxUsername + '@srv2075790:~/' + terminalCwd + '$ ' + cmd);
        if (res.output) terminalHistory.push(res.output);
        terminalCwd = res.cwd;
        const scr = document.getElementById('termScreen');
        if (scr) {
          scr.textContent = terminalHistory.join('\\n');
          scr.scrollTop = scr.scrollHeight;
        }
        const promptEl = document.getElementById('termPromptLabel');
        if (promptEl) promptEl.textContent = res.prompt;
      } catch (err) {
        terminalHistory.push(activeLinuxUsername + '@srv2075790:~/' + terminalCwd + '$ ' + cmd);
        terminalHistory.push('Error: ' + err.message);
        const scr = document.getElementById('termScreen');
        if (scr) {
          scr.textContent = terminalHistory.join('\\n');
          scr.scrollTop = scr.scrollHeight;
        }
      }
    }

    async function createCpanelApiToken() {
      try {
        const name = document.getElementById('apiTokName').value.trim() || 'cPanel API Token';
        const ipAllowlist = document.getElementById('apiTokIp').value.trim() || '0.0.0.0/0';
        const scopePreset = document.getElementById('apiTokScopes').value;
        const scopes = scopePreset === 'dns_ssl'
          ? ['dns:write', 'ssl:write']
          : scopePreset === 'files_apps'
            ? ['files:write', 'apps:deploy']
            : ['cpanel:uapi:full', 'domains:write', 'email:manage', 'databases:write', 'files:write'];
        const res = await api('/api/v1/api-tokens', {
          method: 'POST',
          body: JSON.stringify({ name, portal: 'CPANEL', ipAllowlist, scopes }),
        });
        lastCreatedApiTokenPlaintext = res.secretPlaintextOnce;
        showToast('API Token generated!');
        await openView('api-system');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function revokeApiToken(tokenId) {
      try {
        await api('/api/v1/api-tokens', {
          method: 'DELETE',
          body: JSON.stringify({ tokenId }),
        });
        showToast('API Token revoked');
        await openView('api-system');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    function updateApiShellCurl() {
      const sel = document.getElementById('apiShellEndpoint');
      const curlEl = document.getElementById('apiShellCurl');
      if (!sel || !curlEl) return;
      const [method, path] = sel.value.split('|');
      const baseOrigin = window.location.origin || 'http://200.234.39.100';
      curlEl.textContent = \`curl -X \${method} "\${baseOrigin}\${path}" \\\\\\n  -H "Authorization: Bearer \${sessionToken || 'gv_cpanel_live_...'}" \\\\\\n  -H "Content-Type: application/json"\`;
    }

    async function executeApiShellCall() {
      const sel = document.getElementById('apiShellEndpoint');
      const outEl = document.getElementById('apiShellOutput');
      if (!sel || !outEl) return;
      const [method, path] = sel.value.split('|');
      try {
        const data = await api(path, { method });
        outEl.textContent = JSON.stringify({ success: true, endpoint: path, data }, null, 2);
      } catch (err) {
        outEl.textContent = JSON.stringify({ success: false, error: err.message }, null, 2);
      }
    }

    async function addCronJob() {
      try {
        const schedule = document.getElementById('cronSched').value.trim();
        const command = document.getElementById('cronCmd').value.trim();
        const emailNotification = document.getElementById('cronEmail').value.trim();
        await api('/api/v1/cron-jobs', {
          method: 'POST',
          body: JSON.stringify({ linuxUsername: activeLinuxUsername, schedule, command, emailNotification }),
        });
        showToast('Cron job added!');
        await openView('cron-jobs');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function deleteCronJob(cronId) {
      try {
        await api('/api/v1/cron-jobs', {
          method: 'DELETE',
          body: JSON.stringify({ cronId }),
        });
        showToast('Cron job deleted');
        await openView('cron-jobs');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function addSshKey() {
      try {
        const name = document.getElementById('sshKeyName').value.trim() || 'deploy-key';
        const publicKey = document.getElementById('sshKeyPub').value.trim();
        await api('/api/v1/ssh-keys', {
          method: 'POST',
          body: JSON.stringify({ name, publicKey }),
        });
        showToast('SSH key authorized!');
        await openView('ssh-keys');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function deleteSshKey(keyId) {
      try {
        await api('/api/v1/ssh-keys', {
          method: 'DELETE',
          body: JSON.stringify({ keyId }),
        });
        showToast('SSH key removed');
        await openView('ssh-keys');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    // Action Handlers
    async function saveFile() {
      try {
        const relativePath = document.getElementById('fmFileName').value.trim();
        const content = document.getElementById('fmContent').value;
        const modeOctal = document.getElementById('fmMode').value;
        await api('/api/v1/files/write', {
          method: 'POST',
          body: JSON.stringify({ linuxUsername: activeLinuxUsername, relativePath, content, modeOctal }),
        });
        showToast('Saved ' + relativePath + ' (' + modeOctal + ')');
        await openView('file-manager');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function chmodFile(relativePath, modeOctal) {
      try {
        await api('/api/v1/files/chmod', {
          method: 'POST',
          body: JSON.stringify({ linuxUsername: activeLinuxUsername, relativePath, modeOctal }),
        });
        showToast('Permissions updated to ' + modeOctal + ' on ' + relativePath);
        await openView('file-manager');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function trashFile(relativePath) {
      try {
        await api('/api/v1/files/trash', {
          method: 'POST',
          body: JSON.stringify({ linuxUsername: activeLinuxUsername, relativePath }),
        });
        showToast('Moved ' + relativePath + ' to .trash');
        await openView('file-manager');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function restoreTrash(trashId) {
      try {
        await api('/api/v1/files/restore', {
          method: 'POST',
          body: JSON.stringify({ linuxUsername: activeLinuxUsername, trashId }),
        });
        showToast('Restored file from Trash');
        await openView('file-manager');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function createBackupSnapshot() {
      try {
        const snap = await api('/api/v1/backups/create', { method: 'POST', body: '{}' });
        showToast('Created encrypted snapshot ' + snap.resticSnapshotId.slice(0, 16));
        await openView('backups');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function verifySnapshot(backupArtifactId) {
      try {
        const rep = await api('/api/v1/backups/verify', {
          method: 'POST',
          body: JSON.stringify({ backupArtifactId }),
        });
        showToast('Backup Verification Passed: ' + rep.filesChecked + ' files & ' + rep.databaseDumpsValidated + ' DB dumps verified!');
        await openView('backups');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function restoreSnapshot(backupArtifactId) {
      try {
        const res = await api('/api/v1/backups/restore', {
          method: 'POST',
          body: JSON.stringify({ backupArtifactId, scope: 'FULL_ACCOUNT' }),
        });
        showToast('Restored ' + res.restoredFilesCount + ' files and ' + res.restoredDatabasesCount + ' DB dumps!');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function provisionWhmAccount() {
      try {
        const linuxUsername = document.getElementById('whmUser').value.trim();
        const primaryDomain = document.getElementById('whmDomain').value.trim();
        const ownerEmail = document.getElementById('whmEmail').value.trim();
        if (!linuxUsername || !primaryDomain || !ownerEmail) {
          showToast('Please enter username, domain, and email', true);
          return;
        }
        const res = await api('/api/v1/hosting-accounts', {
          method: 'POST',
          body: JSON.stringify({
            linuxUsername,
            primaryDomain,
            ownerEmail,
            packageId: 'pkg_business_nvme',
            sshEnabled: true,
          }),
        });
        showToast('Created account ' + linuxUsername + ' (' + primaryDomain + ')!');
        await refreshSidebarStats(linuxUsername);
        await openView('whm-reseller');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function createMailbox() {
      try {
        const localPart = document.getElementById('mbxLocal').value.trim();
        const domainId = document.getElementById('mbxDomainId').value;
        const password = document.getElementById('mbxPass').value || 'StrongMailPass#2026';
        const quotaMb = Number(document.getElementById('mbxQuota').value);
        if (!localPart) {
          showToast('Please enter a mailbox username', true);
          return;
        }
        await api('/api/v1/email/mailboxes', {
          method: 'POST',
          body: JSON.stringify({
            accountId: activeAccountId,
            domainId,
            localPart,
            password,
            quotaMb,
            spamFilterLevel: 'STANDARD',
          }),
        });
        showToast('Mailbox created successfully!');
        await refreshSidebarStats();
        await openView('email-hosting');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function createDatabase() {
      try {
        const engine = document.getElementById('dbEngine').value;
        const dbSuffix = document.getElementById('dbSuffix').value.trim();
        if (!dbSuffix) {
          showToast('Please enter a database name suffix', true);
          return;
        }
        await api('/api/v1/databases', {
          method: 'POST',
          body: JSON.stringify({
            accountId: activeAccountId,
            engine,
            dbSuffix,
          }),
        });
        showToast(engine + ' database gv_' + activeLinuxUsername + '_' + dbSuffix + ' created!');
        await refreshSidebarStats();
        await openView('databases');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function addDomain() {
      try {
        const domainName = document.getElementById('domName').value.trim();
        const templateType = document.getElementById('domTemplate').value;
        if (!domainName) {
          showToast('Please enter a domain name', true);
          return;
        }
        await api('/api/v1/domains', {
          method: 'POST',
          body: JSON.stringify({
            accountId: activeAccountId,
            domainName,
            documentRootRelative: 'public_html/' + domainName,
            templateType,
            phpVersion: '8.3',
            forceHttps: true,
            hstsEnabled: true,
            http3Enabled: true,
            autoIssueSsl: true,
          }),
        });
        showToast('Domain ' + domainName + ' added!');
        await refreshSidebarStats();
        await openView('domains-dns');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function addDnsRecord(domainId) {
      try {
        const name = document.getElementById('dnsRecName').value.trim();
        const type = document.getElementById('dnsRecType').value;
        const content = document.getElementById('dnsRecContent').value.trim();
        const ttl = Number(document.getElementById('dnsRecTtl').value);
        await api('/api/v1/dns/records', {
          method: 'POST',
          body: JSON.stringify({ domainId, name, type, content, ttl, priority: type === 'MX' ? 10 : null }),
        });
        showToast('Added DNS ' + type + ' record for ' + name);
        await openView('domains-dns');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function issueCertificate() {
      try {
        const domainId = document.getElementById('sslDomain').value;
        const challengeType = document.getElementById('sslChallenge').value;
        await api('/api/v1/ssl/certificates', {
          method: 'POST',
          body: JSON.stringify({
            domainId,
            challengeType,
            wildcard: challengeType === 'DNS_01',
          }),
        });
        showToast("Let's Encrypt SSL certificate issued!");
        await openView('ssl-certificates');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function deployNewApp() {
      try {
        const name = document.getElementById('appName').value.trim() || 'Web Application';
        const [appType, runtimeVersion] = document.getElementById('appType').value.split('|');
        const domainId = document.getElementById('appDomainId').value;
        const appRootRelative = document.getElementById('appRootRel').value.trim() || 'public_html';
        await api('/api/v1/applications', {
          method: 'POST',
          body: JSON.stringify({
            accountId: activeAccountId,
            domainId,
            name,
            appType,
            runtimeVersion,
            appRootRelative,
            publicDirRelative: appRootRelative,
            entryPoint: appType === 'NODEJS' ? 'app.js' : 'index.php',
            instances: 1,
            memoryLimitMb: 512,
            cpuQuotaPercent: 100,
          }),
        });
        showToast('Deployed ' + name + ' (' + runtimeVersion + ')!');
        await openView('applications');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function rotateKek() {
      try {
        const res = await api('/api/v1/security/rotate-kek', { method: 'POST', body: '{}' });
        showToast('Master encryption key rotated from v' + res.previousKeyVersion + ' to v' + res.newKeyVersion);
        await openView('security-center');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function applyFirewall() {
      try {
        const port = Number(document.getElementById('fwPort').value);
        const action = document.getElementById('fwAction').value;
        await api('/api/v1/security/firewall', {
          method: 'POST',
          body: JSON.stringify({ zone: 'public', port, protocol: 'tcp', action }),
        });
        showToast('Firewall rule applied for port ' + port + '/tcp');
        await openView('security-center');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function restartSvc(serviceName) {
      try {
        await api('/api/v1/servers/service-control', {
          method: 'POST',
          body: JSON.stringify({ serviceName, action: 'restart' }),
        });
        showToast('Restarted ' + serviceName);
        await openView('server-overview');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    initApp();
  </script>
</body>
</html>`;
}

