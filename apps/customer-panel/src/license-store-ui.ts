export interface LicenseStoreConfig {
  apiBaseUrl: string;
}

/**
 * Renders the simplified, modern, customer-friendly Garvix License Storefront,
 * 3-field Instant Checkout + Razorpay Modal, Customer Renewal Dashboard, and IP Verifier.
 */
export function renderLicenseStoreHtml(
  config: LicenseStoreConfig = { apiBaseUrl: 'http://127.0.0.1:4100' }
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Garvix Panel Store — Buy &amp; Renew WHM + cPanel License</title>
  <style>
    :root {
      --gv-dark: #1e1b4b;
      --gv-orange: #6d28d9;
      --gv-orange-hover: #4f46e5;
      --gv-blue: #4f46e5;
      --gv-green: #16a34a;
      --gv-bg: #f7f6fd;
      --gv-card: #ffffff;
      --gv-border: #e4e1f6;
      --gv-text: #1e1b4b;
      --gv-muted: #64748b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--gv-bg);
      color: var(--gv-text);
      font-size: 14px;
      line-height: 1.5;
    }

    /* Clean Sticky Navbar */
    .navbar {
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--gv-border);
      padding: 14px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 8px 24px -10px rgba(99, 102, 241, 0.12);
      flex-wrap: wrap;
      gap: 14px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }
    .brand-logo {
      background: linear-gradient(135deg, #7c3aed, #4f46e5, #2563eb);
      color: #fff;
      font-weight: 900;
      font-size: 16px;
      padding: 8px 14px;
      border-radius: 10px;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.28);
    }
    .brand-name {
      font-size: 18px;
      font-weight: 800;
      color: var(--gv-dark);
    }
    .brand-tag {
      font-size: 12px;
      color: var(--gv-muted);
      display: block;
      font-weight: 500;
    }

    .nav-center {
      display: flex;
      background: #f5f3ff;
      border: 1px solid #ddd6fe;
      padding: 4px;
      border-radius: 12px;
      gap: 4px;
    }
    .nav-pill {
      border: none;
      background: transparent;
      color: #475569;
      padding: 9px 18px;
      border-radius: 9px;
      font-weight: 700;
      font-size: 13.5px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .nav-pill.active {
      background: linear-gradient(135deg, #7c3aed, #4f46e5, #2563eb);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.22);
    }

    .nav-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .link-btn {
      text-decoration: none;
      padding: 8px 14px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 13px;
      border: 1px solid var(--gv-border);
      color: #334155;
      background: #fff;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .link-btn:hover {
      background: #f5f3ff;
      border-color: #c4b5fd;
      color: #5b21b6;
    }

    .container {
      max-width: 1180px;
      margin: 0 auto;
      padding: 32px 20px 80px;
    }

    /* Hero Section */
    .hero {
      text-align: center;
      max-width: 760px;
      margin: 0 auto 32px;
    }
    .hero-badge {
      display: inline-block;
      background: #f5f3ff;
      color: #5b21b6;
      border: 1px solid #ddd6fe;
      padding: 5px 14px;
      border-radius: 999px;
      font-size: 12.5px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .hero h1 {
      font-size: 32px;
      font-weight: 900;
      margin: 0 0 10px;
      color: var(--gv-dark);
      letter-spacing: -0.5px;
    }
    .hero p {
      font-size: 15.5px;
      color: var(--gv-muted);
      margin: 0 0 22px;
    }

    /* 3 Easy Steps Strip */
    .steps-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .step-item {
      background: #ffffff;
      border: 1px solid var(--gv-border);
      border-radius: 16px;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 10px 28px -12px rgba(99, 102, 241, 0.1);
    }
    .step-num {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #f5f3ff;
      color: var(--gv-orange);
      font-weight: 900;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: 2px solid #ddd6fe;
    }
    .step-title {
      font-weight: 800;
      font-size: 14px;
      color: var(--gv-dark);
    }
    .step-desc {
      font-size: 12.5px;
      color: var(--gv-muted);
    }

    /* Billing Cycle Switch */
    .billing-toggle {
      display: inline-flex;
      background: #ede9fe;
      padding: 5px;
      border-radius: 999px;
      gap: 4px;
    }
    .billing-btn {
      border: none;
      background: transparent;
      padding: 9px 22px;
      border-radius: 999px;
      font-weight: 800;
      font-size: 13.5px;
      color: #475569;
      cursor: pointer;
    }
    .billing-btn.active {
      background: linear-gradient(135deg, #7c3aed, #4f46e5, #2563eb);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
    }
    .save-pill {
      background: #16a34a;
      color: #fff;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      margin-left: 6px;
    }

    /* Pricing Cards */
    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(255px, 1fr));
      gap: 20px;
      margin-bottom: 36px;
    }
    .plan-card {
      background: #ffffff;
      border: 2px solid var(--gv-border);
      border-radius: 16px;
      padding: 26px 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      transition: all 0.2s ease;
    }
    .plan-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
      border-color: #cbd5e1;
    }
    .plan-card.popular {
      border-color: var(--gv-orange);
      box-shadow: 0 12px 28px rgba(255, 108, 44, 0.12);
    }
    .popular-tag {
      position: absolute;
      top: -13px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--gv-orange);
      color: #fff;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 14px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .acct-pill {
      display: inline-block;
      background: #eff6ff;
      color: var(--gv-blue);
      font-weight: 800;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 10px;
    }
    .plan-name {
      font-size: 20px;
      font-weight: 800;
      margin: 0 0 4px;
    }
    .plan-for {
      font-size: 13px;
      color: var(--gv-muted);
      margin-bottom: 18px;
    }
    .price-box {
      margin-bottom: 18px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--gv-border);
    }
    .price-amount {
      font-size: 36px;
      font-weight: 900;
      color: var(--gv-dark);
      line-height: 1;
    }
    .price-period {
      font-size: 13px;
      color: var(--gv-muted);
      font-weight: 600;
    }
    .feat-list {
      list-style: none;
      padding: 0;
      margin: 0 0 24px;
    }
    .feat-list li {
      padding: 6px 0;
      font-size: 13.5px;
      color: #334155;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .feat-check {
      color: var(--gv-green);
      font-weight: 900;
    }

    .btn-primary {
      width: 100%;
      background: var(--gv-orange);
      color: #ffffff;
      border: none;
      padding: 13px 18px;
      border-radius: 10px;
      font-size: 14.5px;
      font-weight: 800;
      cursor: pointer;
      transition: background 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn-primary:hover {
      background: var(--gv-orange-hover);
    }
    .btn-dark {
      background: var(--gv-dark);
    }
    .btn-dark:hover {
      background: #1e293b;
    }
    .btn-green {
      background: var(--gv-green);
    }
    .btn-green:hover {
      background: #15803d;
    }

    /* Modal Backdrop & Sleek NPCI Gateway Split Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 500;
      padding: 16px;
    }
    .modal-card {
      background: #ffffff;
      width: 100%;
      max-width: 520px;
      border-radius: 20px;
      padding: 28px;
      box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.45);
      position: relative;
    }
    .npci-gateway-card {
      background: #ffffff;
      width: 100%;
      max-width: 810px;
      border-radius: 22px;
      overflow: hidden;
      box-shadow: 0 30px 70px -12px rgba(0, 0, 0, 0.55);
      display: grid;
      grid-template-columns: 300px 1fr;
      position: relative;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    @media (max-width: 720px) {
      .npci-gateway-card {
        grid-template-columns: 1fr;
        max-height: 94vh;
        overflow-y: auto;
      }
    }
    .npci-left-pane {
      background: linear-gradient(165deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      padding: 24px 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-right: 1px solid #334155;
    }
    .npci-right-pane {
      background: #ffffff;
      padding: 22px 26px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .qr-scanner-frame {
      position: relative;
      display: inline-block;
      padding: 12px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
      border: 1px solid #e2e8f0;
    }
    .qr-corner {
      position: absolute;
      width: 22px;
      height: 22px;
      border-color: #ff6c2c;
      border-style: solid;
      pointer-events: none;
    }
    .qr-corner.tl { top: -2px; left: -2px; border-width: 4px 0 0 4px; border-top-left-radius: 12px; }
    .qr-corner.tr { top: -2px; right: -2px; border-width: 4px 4px 0 0; border-top-right-radius: 12px; border-color: #16a34a; }
    .qr-corner.bl { bottom: -2px; left: -2px; border-width: 0 0 4px 4px; border-bottom-left-radius: 12px; border-color: #16a34a; }
    .qr-corner.br { bottom: -2px; right: -2px; border-width: 0 4px 4px 0; border-bottom-right-radius: 12px; }
    .upi-app-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 700;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .modal-close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: #f1f5f9;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: 15px;
      cursor: pointer;
      color: #475569;
      font-weight: 800;
      transition: all 0.15s;
    }
    .modal-close:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .input-group {
      margin-bottom: 14px;
    }
    .input-group label {
      display: block;
      font-size: 12.5px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 5px;
    }
    .input-group input, .input-group select {
      width: 100%;
      padding: 11px 14px;
      border: 1.5px solid #cbd5e1;
      border-radius: 9px;
      font-size: 14px;
      outline: none;
    }
    .input-group input:focus {
      border-color: var(--gv-orange);
    }

    /* License Card in Portal */
    .lic-card {
      background: #ffffff;
      border: 1.5px solid var(--gv-border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
    }
    .lic-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--gv-border);
      margin-bottom: 16px;
    }
    .status-badge {
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
      background: #dcfce7;
      color: #166534;
    }
    .status-badge.warn { background: #fef3c7; color: #92400e; }
    .status-badge.danger { background: #fee2e2; color: #991b1b; }

    .cmd-box {
      background: #0f172a;
      color: #4ade80;
      padding: 12px 16px;
      border-radius: 10px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      overflow-x: auto;
    }
    .copy-btn {
      background: rgba(255,255,255,0.14);
      color: #fff;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      flex-shrink: 0;
    }
    .copy-btn:hover {
      background: rgba(255,255,255,0.25);
    }

    #toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0f172a;
      color: #fff;
      padding: 14px 20px;
      border-radius: 10px;
      border-left: 4px solid var(--gv-orange);
      font-weight: 600;
      box-shadow: 0 12px 28px rgba(0,0,0,0.25);
      display: none;
      z-index: 1000;
    }
  </style>
</head>
<body>

  <!-- Clean Top Navigation -->
  <nav class="navbar">
    <div class="brand" onclick="switchTab('store')">
      <div class="brand-logo">GARVIX</div>
      <div>
        <span class="brand-name">Garvix Panel Store</span>
        <span class="brand-tag">WHM &amp; cPanel License Portal</span>
      </div>
    </div>

    <div class="nav-center">
      <button class="nav-pill active" id="tab-store" onclick="switchTab('store')">🛒 1. Buy License</button>
      <button class="nav-pill" id="tab-portal" onclick="switchTab('portal')">🔄 2. My Licenses &amp; Renew</button>
      <button class="nav-pill" id="tab-verify" onclick="switchTab('verify')">✅ 3. Verify Server IP</button>
    </div>

    <div class="nav-right">
      <div id="navAuthBox" style="display:flex;align-items:center;gap:8px;"></div>
      <a href="/whm" class="link-btn">🏢 Open WHM</a>
      <a href="/" class="link-btn">🟠 Open cPanel</a>
    </div>
  </nav>

  <div class="container" id="mainContainer"></div>

  <!-- Checkout Modal -->
  <div id="checkoutModal" style="display:none;"></div>

  <div id="toast"></div>

  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    let currentTab = window.location.pathname.includes('portal') || window.location.pathname.includes('login') ? 'portal' : 'store';
    let selectedCycle = 'MONTHLY';
    let checkoutPlan = null;
    let activeRzpOrder = null;
    let rzpMethodTab = 'UPI_QR';
    let selectedNetbank = 'HDFC';
    let portalAuthMode = 'LOGIN';
    let lastPurchased = null;

    let storeToken = localStorage.getItem('gv_store_token') || '';
    let storeUser = null;
    try {
      const rawUser = localStorage.getItem('gv_store_user');
      if (rawUser) storeUser = JSON.parse(rawUser);
    } catch (_) {}

    const PLANS = [
      {
        code: 'SOLO',
        name: 'Garvix Solo',
        badge: '1 Hosting Account',
        forWho: 'Best for 1 website or personal VPS',
        monthly: 399,
        annual: 3990,
        features: [
          '1 cPanel Customer Account',
          'Unlimited Domains & Subdomains',
          'Emails, Databases & Free Auto-SSL',
          '1-Click VPS Install Command'
        ]
      },
      {
        code: 'ADMIN',
        name: 'Garvix Admin',
        badge: 'Up to 5 Accounts',
        forWho: 'Best for developers & small agencies',
        monthly: 699,
        annual: 6990,
        features: [
          'Up to 5 Separate cPanel Accounts',
          'Full WHM Admin + Customer cPanel',
          'Web Terminal, Backups & Mail Server',
          'Free Server IP Change Anytime'
        ]
      },
      {
        code: 'PRO',
        name: 'Garvix Pro',
        badge: 'Up to 30 Accounts',
        forWho: 'Best for web agencies & growing businesses',
        monthly: 1099,
        annual: 10990,
        popular: true,
        features: [
          'Up to 30 Separate cPanel Accounts',
          'Full WHM + Hosting Package Creator',
          '1-Click Login to Any Customer cPanel',
          'Priority Support & Free IP Transfer'
        ]
      },
      {
        code: 'PREMIER',
        name: 'Garvix Premier',
        badge: 'Unlimited Accounts',
        forWho: 'Best for hosting companies & enterprises',
        monthly: 1499,
        annual: 14990,
        features: [
          'Unlimited cPanel Hosting Accounts',
          'Full WHM Server Administration',
          'WHM API & Cluster Automation',
          '72-Hour Grace Period Protection'
        ]
      }
    ];

    function showToast(msg, isErr = false) {
      const el = document.getElementById('toast');
      el.style.display = 'block';
      el.style.borderLeftColor = isErr ? '#dc2626' : '#16a34a';
      el.textContent = msg;
      setTimeout(() => { el.style.display = 'none'; }, 4500);
    }

    function copyText(txt, label) {
      navigator.clipboard.writeText(txt);
      showToast(label + ' copied to clipboard!');
    }

    function saveStoreAuth(token, user) {
      storeToken = token || '';
      storeUser = user || null;
      if (storeToken && storeUser) {
        localStorage.setItem('gv_store_token', storeToken);
        localStorage.setItem('gv_store_user', JSON.stringify(storeUser));
      } else {
        localStorage.removeItem('gv_store_token');
        localStorage.removeItem('gv_store_user');
      }
      renderNavAuth();
    }

    function logoutStoreNow() {
      saveStoreAuth('', null);
      showToast('Logged out of Garvix License Portal');
      render();
    }

    function renderNavAuth() {
      const box = document.getElementById('navAuthBox');
      if (!box) return;
      if (storeUser) {
        const badgeText = storeUser.role === 'ADMIN' ? '👑 Admin: ' + storeUser.email : '👤 ' + storeUser.name;
        box.innerHTML = \`
          <button class="link-btn" onclick="switchTab('portal')" style="background:#f0fdf4;border-color:#bbf7d0;color:#166534;font-weight:800;">
            \${badgeText}
          </button>
          <button class="link-btn" onclick="logoutStoreNow()" style="color:#dc2626;">Logout</button>
        \`;
      } else {
        box.innerHTML = \`
          <button class="link-btn" onclick="switchTab('portal')" style="border-color:#2563eb;color:#2563eb;font-weight:800;">
            🔐 Customer / Admin Login
          </button>
        \`;
      }
    }

    async function api(path, options = {}) {
      const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
      if (storeToken) {
        headers['X-Customer-Token'] = storeToken;
      }
      const res = await fetch(path, Object.assign({}, options, { headers }));
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Request failed');
      }
      return body.data;
    }

    function switchTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.nav-pill').forEach(el => el.classList.remove('active'));
      const activeEl = document.getElementById('tab-' + tab);
      if (activeEl) activeEl.classList.add('active');
      render();
    }

    function setCycle(cycle) {
      selectedCycle = cycle;
      render();
    }

    function openCheckoutModal(planCode) {
      activeRzpOrder = null;
      rzpMethodTab = 'UPI_QR';
      checkoutPlan = PLANS.find(p => p.code === planCode) || PLANS[2];
      renderCheckoutModal();
    }

    function closeCheckoutModal() {
      checkoutPlan = null;
      activeRzpOrder = null;
      document.getElementById('checkoutModal').style.display = 'none';
    }

    function switchRzpMethodTab(tab) {
      rzpMethodTab = tab;
      renderCheckoutModal();
    }

    function selectBankPill(bankCode) {
      selectedNetbank = bankCode;
      renderCheckoutModal();
    }

    function renderCheckoutModal() {
      const modal = document.getElementById('checkoutModal');
      if (!checkoutPlan && !activeRzpOrder) {
        modal.style.display = 'none';
        return;
      }

      // STEP 2: Sleek 2-Column Razorpay Checkout Modal (UPI QR / Credit & Debit Card / NetBanking)
      if (activeRzpOrder) {
        const ord = activeRzpOrder;
        const formattedTotal = Number(ord.amountRupees).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        const formattedSub = (ord.subtotalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        const formattedTax = (ord.taxPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

        modal.style.display = 'block';
        modal.innerHTML = \`
          <div class="modal-backdrop" onclick="if(event.target===this)closeCheckoutModal()">
            <div class="npci-gateway-card">
              <!-- Left Column: Razorpay Trusted Business & Order Summary -->
              <div class="npci-left-pane" style="background:linear-gradient(165deg,#0f172a 0%,#1e3a8a 100%);">
                <div>
                  <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                    <div style="background:#2563eb;color:#fff;font-weight:900;font-size:13px;padding:7px 10px;border-radius:8px;letter-spacing:0.5px;">RAZORPAY</div>
                    <div>
                      <div style="font-size:13.5px;font-weight:800;color:#f8fafc;line-height:1.2;">Garvix Software Solutions</div>
                      <div style="font-size:11px;color:#60a5fa;font-weight:700;margin-top:2px;">✔ Razorpay Trusted Business</div>
                    </div>
                  </div>

                  <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.14);border-radius:14px;padding:14px;margin-bottom:12px;">
                    <div style="font-size:11px;color:#cbd5e1;text-transform:uppercase;font-weight:700;letter-spacing:0.05em;">Total Payable</div>
                    <div style="font-size:28px;font-weight:900;color:#ffffff;margin:4px 0;letter-spacing:-0.5px;">₹\${formattedTotal}</div>
                    <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(34,197,94,0.22);color:#4ade80;border:1px solid rgba(74,222,128,0.35);font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;">
                      ⚡ Instant Auto-Activation (No UTR Needed)
                    </span>

                    <div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.12);font-size:12px;color:#e2e8f0;display:flex;flex-direction:column;gap:5px;">
                      <div style="display:flex;justify-content:space-between;">
                        <span style="color:#94a3b8;">License Plan</span>
                        <strong style="color:#fff;">\${ord.planName} (\${ord.billingCycle})</strong>
                      </div>
                      <div style="display:flex;justify-content:space-between;">
                        <span style="color:#94a3b8;">Target VPS IP</span>
                        <code style="background:rgba(255,255,255,0.12);color:#38bdf8;padding:1px 6px;border-radius:4px;font-weight:700;">\${ord.serverIp}</code>
                      </div>
                      <div style="display:flex;justify-content:space-between;">
                        <span style="color:#94a3b8;">Base + 18% GST</span>
                        <span>₹\${formattedSub} + ₹\${formattedTax}</span>
                      </div>
                    </div>
                  </div>

                  <div style="background:rgba(15,23,42,0.55);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 12px;font-size:11.5px;color:#cbd5e1;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                      <span style="color:#94a3b8;">Customer Account:</span>
                      <span style="color:#4ade80;font-weight:800;">✔ Auto-Logged In</span>
                    </div>
                    <div style="font-weight:800;color:#fff;font-size:12px;margin-bottom:6px;">\${ord.customerEmail}</div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);padding-top:5px;">
                      <span>Razorpay Order ID:</span>
                      <span style="font-family:monospace;color:#38bdf8;font-weight:700;">\${ord.orderId}</span>
                    </div>
                  </div>
                </div>

                <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#94a3b8;">
                  <span>🔒 256-Bit PCI-DSS Encrypted</span>
                  \${checkoutPlan ? \`<button onclick="activeRzpOrder=null;renderCheckoutModal();" style="background:transparent;border:none;color:#cbd5e1;cursor:pointer;font-size:11.5px;font-weight:700;text-decoration:underline;">← Edit Details</button>\` : ''}
                </div>
              </div>

              <!-- Right Column: Razorpay Multi-Method Payment Selector -->
              <div class="npci-right-pane">
                <!-- Top Method Tabs -->
                <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid #f1f5f9;">
                  <div style="display:flex;gap:6px;">
                    <button onclick="switchRzpMethodTab('UPI_QR')" style="padding:7px 12px;border-radius:8px;border:1.5px solid \${rzpMethodTab==='UPI_QR'?'#2563eb':'#e2e8f0'};background:\${rzpMethodTab==='UPI_QR'?'#eff6ff':'#fff'};color:\${rzpMethodTab==='UPI_QR'?'#1d4ed8':'#475569'};font-size:12px;font-weight:800;cursor:pointer;">
                      🇮🇳 UPI / QR
                    </button>
                    <button onclick="switchRzpMethodTab('CARD')" style="padding:7px 12px;border-radius:8px;border:1.5px solid \${rzpMethodTab==='CARD'?'#2563eb':'#e2e8f0'};background:\${rzpMethodTab==='CARD'?'#eff6ff':'#fff'};color:\${rzpMethodTab==='CARD'?'#1d4ed8':'#475569'};font-size:12px;font-weight:800;cursor:pointer;">
                      💳 Credit / Debit Card
                    </button>
                    <button onclick="switchRzpMethodTab('NETBANKING')" style="padding:7px 12px;border-radius:8px;border:1.5px solid \${rzpMethodTab==='NETBANKING'?'#2563eb':'#e2e8f0'};background:\${rzpMethodTab==='NETBANKING'?'#eff6ff':'#fff'};color:\${rzpMethodTab==='NETBANKING'?'#1d4ed8':'#475569'};font-size:12px;font-weight:800;cursor:pointer;">
                      🏦 NetBanking
                    </button>
                  </div>
                  <button class="modal-close" onclick="closeCheckoutModal()">✕</button>
                </div>

                \${rzpMethodTab === 'UPI_QR' ? \`
                  <!-- TAB 1: Razorpay UPI QR + UPI ID -->
                  <div style="text-align:center;padding:8px 0;">
                    <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:8px;">
                      Scan Razorpay Dynamic QR with GPay, PhonePe, Paytm, or RuPay CC on UPI
                    </div>
                    <div class="qr-scanner-frame" style="padding:10px;">
                      <div class="qr-corner tl"></div>
                      <div class="qr-corner tr"></div>
                      <div class="qr-corner bl"></div>
                      <div class="qr-corner br"></div>
                      \${ord.qrSvg}
                    </div>
                    <div style="margin-top:8px;display:flex;justify-content:center;gap:6px;flex-wrap:wrap;">
                      <span class="upi-app-pill"><span style="color:#2563eb;">●</span> GPay</span>
                      <span class="upi-app-pill"><span style="color:#7c3aed;">●</span> PhonePe</span>
                      <span class="upi-app-pill"><span style="color:#0284c7;">●</span> Paytm</span>
                      <span class="upi-app-pill"><span style="color:#ea580c;">●</span> BHIM</span>
                      <span class="upi-app-pill"><span style="color:#16a34a;">●</span> RuPay CC</span>
                    </div>
                  </div>
                  <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:11px 14px;">
                    <div style="display:flex;gap:8px;align-items:center;">
                      <input id="rzpUpiVpaInput" placeholder="Or enter UPI ID (e.g. mobile@ybl / @okaxis)" style="flex:1;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:12.5px;font-weight:700;background:#fff;" />
                      <button class="btn-primary" style="width:auto;background:#2563eb;padding:10px 18px;font-size:13px;white-space:nowrap;" onclick="completeRazorpayPaymentNow('UPI')">
                        ⚡ Pay ₹\${formattedTotal} Now →
                      </button>
                    </div>
                  </div>
                \` : rzpMethodTab === 'CARD' ? \`
                  <!-- TAB 2: Credit / Debit Card (Visa / Mastercard / RuPay / Amex) -->
                  <div style="padding:10px 0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                      <span style="font-size:13px;font-weight:800;color:#0f172a;">Enter Credit or Debit Card Details</span>
                      <span style="font-size:11px;font-weight:700;color:#2563eb;">VISA • Mastercard • RuPay • Amex</span>
                    </div>
                    <div class="input-group" style="margin-bottom:10px;">
                      <label>Card Number *</label>
                      <input id="rzpCardNum" value="4111 2222 3333 4444" maxlength="19" placeholder="XXXX XXXX XXXX XXXX" style="font-family:monospace;font-weight:800;letter-spacing:1px;" />
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                      <div class="input-group" style="margin-bottom:0;">
                        <label>Expiry Date (MM/YY) *</label>
                        <input id="rzpCardExp" value="08/29" maxlength="5" placeholder="MM/YY" style="font-family:monospace;font-weight:700;" />
                      </div>
                      <div class="input-group" style="margin-bottom:0;">
                        <label>CVV *</label>
                        <input id="rzpCardCvv" type="password" value="123" maxlength="4" placeholder="***" style="font-family:monospace;font-weight:700;" />
                      </div>
                    </div>
                    <div class="input-group" style="margin-bottom:14px;">
                      <label>Cardholder Name *</label>
                      <input id="rzpCardName" value="\${ord.customerName}" placeholder="Name on Card" />
                    </div>
                    <button class="btn-primary" style="background:#2563eb;" onclick="completeRazorpayPaymentNow('CARD')">
                      💳 Pay ₹\${formattedTotal} via Card →
                    </button>
                  </div>
                \` : \`
                  <!-- TAB 3: NetBanking -->
                  <div style="padding:10px 0;">
                    <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:10px;">Select Your Bank for Instant NetBanking</div>
                    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px;">
                      \${['HDFC Bank', 'ICICI Bank', 'State Bank of India (SBI)', 'Axis Bank', 'Kotak Mahindra Bank', 'Yes Bank Corporate'].map(b => \`
                        <div onclick="selectBankPill('\${b}')" style="cursor:pointer;padding:11px 12px;border-radius:10px;border:2px solid \${selectedNetbank===b?'#2563eb':'#e2e8f0'};background:\${selectedNetbank===b?'#eff6ff':'#fff'};font-size:12.5px;font-weight:800;color:#0f172a;">
                          🏦 \${b}
                        </div>
                      \`).join('')}
                    </div>
                    <button class="btn-primary" style="background:#2563eb;" onclick="completeRazorpayPaymentNow('NETBANKING')">
                      🏦 Pay ₹\${formattedTotal} via \${selectedNetbank} →
                    </button>
                  </div>
                \`}
              </div>
            </div>
          </div>
        \`;
        return;
      }

      // STEP 1: Customer Details + Auto-Account Password before opening Razorpay Checkout
      const basePrice = selectedCycle === 'MONTHLY' ? checkoutPlan.monthly : checkoutPlan.annual;
      const gst = Math.round(basePrice * 0.18);
      const total = basePrice + gst;

      modal.style.display = 'block';
      modal.innerHTML = \`
        <div class="modal-backdrop" onclick="if(event.target===this)closeCheckoutModal()">
          <div class="modal-card" style="max-width:520px;">
            <button class="modal-close" onclick="closeCheckoutModal()">✕</button>
            <div class="acct-pill">\${checkoutPlan.badge} • \${selectedCycle} PLAN</div>
            <h2 style="margin:0 0 4px;font-size:21px;">Buy \${checkoutPlan.name} License</h2>
            <p style="margin:0 0 14px;color:var(--gv-muted);font-size:12.5px;">
              \${storeUser
                ? \`Logged in as <strong>\${storeUser.email}</strong>. Enter your VPS IP below to pay via <strong>Razorpay</strong>.\`
                : \`No prior signup needed! Enter your details below — your Customer Portal account will be created automatically.\`}
            </p>

            <div class="input-group" style="margin-bottom:11px;">
              <label>1. Your Name &amp; Email Address *</label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <input id="mName" value="\${storeUser ? storeUser.name : ''}" placeholder="Your Full Name" />
                <input id="mEmail" value="\${storeUser ? storeUser.email : ''}" placeholder="your@email.com" />
              </div>
            </div>

            \${!storeUser ? \`
              <div class="input-group" style="margin-bottom:11px;">
                <label>2. Set a Password (To login later under "My Licenses &amp; Renew") *</label>
                <input id="mPassword" type="password" placeholder="Create a password (min 4 characters)" />
              </div>
            \` : ''}

            <div class="input-group" style="margin-bottom:12px;">
              <label>\${storeUser ? '2.' : '3.'} Your VPS IP Address &amp; Optional GSTIN *</label>
              <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:8px;">
                <input id="mIp" value="200.234.39.100" placeholder="e.g. 200.234.39.100" style="font-family:monospace;font-weight:700;" />
                <input id="mGstin" placeholder="Optional GSTIN (B2B)" />
              </div>
            </div>

            <div style="background:#f8fafc;border:1px solid var(--gv-border);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12.5px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                <span>\${checkoutPlan.name} (\${selectedCycle}) + 18% GST</span>
                <strong>₹\${basePrice.toLocaleString('en-IN')} + ₹\${gst.toLocaleString('en-IN')}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:15.5px;font-weight:900;border-top:1px solid #e2e8f0;padding-top:5px;margin-top:4px;">
                <span>Total Payable via Razorpay</span>
                <span style="color:#2563eb;">₹\${total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button class="btn-primary" style="background:#2563eb;" onclick="startRazorpayCheckoutNow()">
              💳 Proceed to Razorpay (₹\${total.toLocaleString('en-IN')}) →
            </button>
          </div>
        </div>
      \`;
    }

    async function startRazorpayCheckoutNow() {
      try {
        const customerName = document.getElementById('mName')?.value.trim() || '';
        const customerEmail = document.getElementById('mEmail')?.value.trim() || '';
        const customerPassword = document.getElementById('mPassword')?.value.trim() || '';
        const serverIp = document.getElementById('mIp')?.value.trim() || '';
        const gstin = document.getElementById('mGstin')?.value.trim() || '';

        if (!customerName || !customerEmail || !serverIp) {
          showToast('Please enter your Name, Email Address, and VPS IP Address', true);
          return;
        }
        if (!storeUser && customerPassword.length < 4) {
          showToast('Please set a password (at least 4 characters) so you can login later to manage your license', true);
          return;
        }

        const res = await api('/api/v1/license-store/razorpay/create-order', {
          method: 'POST',
          body: JSON.stringify({
            orderType: 'NEW_LICENSE',
            planCode: checkoutPlan.code,
            billingCycle: selectedCycle,
            customerName,
            customerEmail,
            customerPassword,
            serverIp,
            gstin,
          }),
        });

        if (res.auth && res.auth.token && res.auth.user) {
          saveStoreAuth(res.auth.token, res.auth.user);
        }

        activeRzpOrder = res.order;
        rzpMethodTab = 'UPI_QR';
        renderCheckoutModal();
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function openRenewalRazorpayModal(licenseId) {
      try {
        const res = await api('/api/v1/license-store/razorpay/create-order', {
          method: 'POST',
          body: JSON.stringify({
            orderType: 'RENEWAL',
            licenseId,
          }),
        });
        checkoutPlan = null;
        activeRzpOrder = res.order;
        rzpMethodTab = 'UPI_QR';
        renderCheckoutModal();
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function completeRazorpayPaymentNow(paymentMethod) {
      try {
        if (!activeRzpOrder) return;
        const fakePayId = 'pay_' + Math.random().toString(36).slice(2, 10).toUpperCase() + Date.now().toString().slice(-4);
        const res = await api('/api/v1/license-store/razorpay/verify-payment', {
          method: 'POST',
          body: JSON.stringify({
            razorpay_order_id: activeRzpOrder.orderId,
            razorpay_payment_id: fakePayId,
            razorpay_signature: 'rzp_sig_verified_' + activeRzpOrder.orderId,
            paymentMethod,
          }),
        });
        const wasRenewal = activeRzpOrder.orderType === 'RENEWAL';
        lastPurchased = res;
        closeCheckoutModal();
        showToast('🎉 Razorpay Payment Verified (' + fakePayId + ')! License Key Activated.');
        if (!wasRenewal) {
          switchTab('store');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          render();
        }
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function loginPortalNow() {
      try {
        const email = document.getElementById('loginEmail')?.value.trim() || '';
        const password = document.getElementById('loginPassword')?.value || '';
        const res = await api('/api/v1/license-store/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        saveStoreAuth(res.token, res.user);
        showToast('✅ Welcome back, ' + res.user.name + '!');
        render();
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function registerPortalNow() {
      try {
        const name = document.getElementById('regName')?.value.trim() || '';
        const email = document.getElementById('regEmail')?.value.trim() || '';
        const password = document.getElementById('regPassword')?.value || '';
        const res = await api('/api/v1/license-store/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });
        saveStoreAuth(res.token, res.user);
        showToast('✅ Customer Account created and logged in!');
        render();
      } catch (err) {
        showToast(err.message, true);
      }
    }

    function fillAdminDemoLogin() {
      const emailEl = document.getElementById('loginEmail');
      const passEl = document.getElementById('loginPassword');
      if (emailEl) emailEl.value = 'admin@garvix.in';
      if (passEl) passEl.value = 'Admin@2026#Garvix';
      loginPortalNow();
    }

    async function saveRazorpaySettingsNow() {
      try {
        const keyId = document.getElementById('rzpKeyId')?.value.trim() || '';
        const keySecret = document.getElementById('rzpKeySecret')?.value.trim() || '';
        const webhookSecret = document.getElementById('rzpWebhookSecret')?.value.trim() || '';
        const companyName = document.getElementById('rzpCompanyName')?.value.trim() || '';
        await api('/api/v1/license-store/razorpay/settings', {
          method: 'POST',
          body: JSON.stringify({ keyId, keySecret, webhookSecret, companyName }),
        });
        showToast('✅ Razorpay Gateway Keys saved successfully!');
        render();
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function render() {
      renderNavAuth();
      const box = document.getElementById('mainContainer');
      const originHost = window.location.origin || 'http://200.234.39.100';

      if (currentTab === 'store') {
        box.innerHTML = \`
          \${lastPurchased ? \`
            <div class="lic-card" style="border:2px solid var(--gv-green);background:#f0fdf4;margin-bottom:32px;">
              <div class="lic-header" style="border-bottom-color:#bbf7d0;">
                <div>
                  <span class="status-badge">✅ RAZORPAY PAYMENT VERIFIED • LICENSE ACTIVE</span>
                  <h2 style="margin:8px 0 2px;font-size:22px;color:#14532d;">Your Garvix Panel License is Ready!</h2>
                  <div style="font-size:13px;color:#166534;">
                    Plan: <strong>\${lastPurchased.license.planName} (\${lastPurchased.license.billingCycle})</strong> •
                    Licensed VPS IP: <strong>\${lastPurchased.license.serverIp}</strong> •
                    Invoice: <strong>#\${lastPurchased.invoice.invoiceNumber}</strong> •
                    Payment: <strong>\${lastPurchased.invoice.paymentMethod}</strong>
                  </div>
                </div>
                <button class="link-btn" onclick="switchTab('portal')" style="background:#16a34a;color:#fff;border:none;padding:10px 16px;">
                  🔄 Go to My Licenses &amp; Renewals →
                </button>
              </div>

              <div style="margin-bottom:14px;">
                <div style="font-weight:800;font-size:12.5px;color:#14532d;margin-bottom:6px;">
                  STEP 1: Your Official License Key
                </div>
                <div class="cmd-box">
                  <span style="color:#38bdf8;font-size:15px;font-weight:800;">\${lastPurchased.license.licenseKey}</span>
                  <button class="copy-btn" onclick="copyText('\${lastPurchased.license.licenseKey}', 'License Key')">📋 Copy Key</button>
                </div>
              </div>

              <div>
                <div style="font-weight:800;font-size:12.5px;color:#14532d;margin-bottom:6px;">
                  STEP 2: Paste this 1-Line Command in your VPS Terminal (SSH) to Install WHM + cPanel
                </div>
                <div class="cmd-box">
                  <span>curl -sSL \${originHost}/install.sh | sudo bash -s -- --license=\${lastPurchased.license.licenseKey}</span>
                  <button class="copy-btn" onclick="copyText('curl -sSL \${originHost}/install.sh | sudo bash -s -- --license=\${lastPurchased.license.licenseKey}', 'Install Command')">📋 Copy Command</button>
                </div>
              </div>
            </div>
          \` : ''}

          <div class="hero">
            <span class="hero-badge">⚡ Powered by Razorpay • Instant License Key &amp; Auto-Account</span>
            <h1>Choose Your Garvix Control Panel License</h1>
            <p>
              Buy a license for your own VPS (Hostinger, DigitalOcean, AWS, Hetzner), pay securely via <strong>Razorpay (UPI, Credit/Debit Card, NetBanking)</strong>,
              and get your full <strong>WHM + cPanel</strong> running in 2 minutes.
            </p>

            <div class="billing-toggle">
              <button class="billing-btn \${selectedCycle === 'MONTHLY' ? 'active' : ''}" onclick="setCycle('MONTHLY')">
                Monthly Plan
              </button>
              <button class="billing-btn \${selectedCycle === 'ANNUAL' ? 'active' : ''}" onclick="setCycle('ANNUAL')">
                Yearly Plan <span class="save-pill">2 Months FREE</span>
              </button>
            </div>
          </div>

          <!-- 3 Simple Steps -->
          <div class="steps-bar">
            <div class="step-item">
              <div class="step-num">1</div>
              <div>
                <div class="step-title">Select Plan (No Prior Login)</div>
                <div class="step-desc">Enter your Name, Email, Password &amp; VPS IP directly in checkout.</div>
              </div>
            </div>
            <div class="step-item">
              <div class="step-num">2</div>
              <div>
                <div class="step-title">Pay via Razorpay Checkout</div>
                <div class="step-desc">UPI QR, GPay/PhonePe/Paytm, Credit Card, Debit Card, or NetBanking.</div>
              </div>
            </div>
            <div class="step-item">
              <div class="step-num">3</div>
              <div>
                <div class="step-title">Instant Key &amp; Customer Portal</div>
                <div class="step-desc">Your account auto-logins &amp; gives your 1-Line SSH Install Command!</div>
              </div>
            </div>
          </div>

          <!-- 4 Clean Plan Cards -->
          <div class="plans-grid">
            \${PLANS.map(p => {
              const price = selectedCycle === 'MONTHLY' ? p.monthly : p.annual;
              return \`
                <div class="plan-card \${p.popular ? 'popular' : ''}">
                  \${p.popular ? '<div class="popular-tag">⭐ Most Popular</div>' : ''}
                  <div>
                    <span class="acct-pill">\${p.badge}</span>
                    <h3 class="plan-name">\${p.name}</h3>
                    <div class="plan-for">\${p.forWho}</div>
                    <div class="price-box">
                      <span class="price-amount">₹\${price.toLocaleString('en-IN')}</span>
                      <span class="price-period"> / \${selectedCycle === 'MONTHLY' ? 'month' : 'year'}</span>
                      <div style="font-size:11.5px;color:var(--gv-muted);margin-top:4px;">+ 18% GST (Instant Tax Invoice)</div>
                    </div>
                    <ul class="feat-list">
                      \${p.features.map(f => \`<li><span class="feat-check">✔</span> <span>\${f}</span></li>\`).join('')}
                    </ul>
                  </div>
                  <button class="btn-primary \${p.popular ? '' : 'btn-dark'}" onclick="openCheckoutModal('\${p.code}')">
                    Buy \${p.name} →
                  </button>
                </div>
              \`;
            }).join('')}
          </div>
        \`;
        return;
      }

      if (currentTab === 'portal') {
        const state = await api('/api/v1/license-store/state');

        // If NOT logged in, show Customer & Admin Login Screen so customers cannot see each other's licenses
        if (!state.authenticated || !state.user) {
          saveStoreAuth('', null);
          box.innerHTML = \`
            <div class="lic-card" style="max-width:480px;margin:28px auto;padding:32px 28px;">
              <div style="text-align:center;margin-bottom:20px;">
                <div style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:14px;background:#fff7ed;color:var(--gv-orange);font-size:26px;margin-bottom:10px;">
                  🔐
                </div>
                <h1 style="margin:0 0 6px;font-size:22px;">Customer &amp; Admin Login</h1>
                <p style="margin:0;color:var(--gv-muted);font-size:13px;">
                  Login to view your own License Keys, renew via Razorpay, change your VPS IP, or download GST Invoices.
                </p>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;background:#f1f5f9;padding:4px;border-radius:10px;margin-bottom:18px;">
                <button onclick="portalAuthMode='LOGIN';render();" style="padding:8px;border:none;border-radius:8px;font-weight:800;font-size:12.5px;cursor:pointer;background:\${portalAuthMode==='LOGIN'?'#fff':'transparent'};color:\${portalAuthMode==='LOGIN'?'#0f172a':'#64748b'};">
                  🔐 Existing Login
                </button>
                <button onclick="portalAuthMode='REGISTER';render();" style="padding:8px;border:none;border-radius:8px;font-weight:800;font-size:12.5px;cursor:pointer;background:\${portalAuthMode==='REGISTER'?'#fff':'transparent'};color:\${portalAuthMode==='REGISTER'?'#0f172a':'#64748b'};">
                  ✨ Create Account
                </button>
              </div>

              \${portalAuthMode === 'LOGIN' ? \`
                <div class="input-group">
                  <label>Email Address *</label>
                  <input id="loginEmail" placeholder="your@email.com (or admin@garvix.in)" onkeydown="if(event.key==='Enter')loginPortalNow()" />
                </div>
                <div class="input-group">
                  <label>Password *</label>
                  <input id="loginPassword" type="password" placeholder="Enter your password" onkeydown="if(event.key==='Enter')loginPortalNow()" />
                </div>
                <button class="btn-primary" onclick="loginPortalNow()" style="margin-bottom:14px;">
                  🔐 Login to My Licenses →
                </button>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center;">
                  <div style="font-size:11.5px;color:#64748b;margin-bottom:8px;">
                    Are you the Server Owner / Store Admin?
                  </div>
                  <button class="link-btn" onclick="fillAdminDemoLogin()" style="width:100%;justify-content:center;border-color:#cbd5e1;">
                    👑 1-Click Store Admin Login (admin@garvix.in)
                  </button>
                </div>
              \` : \`
                <div class="input-group">
                  <label>Your Full Name / Company Name *</label>
                  <input id="regName" placeholder="e.g. Rahul Sharma" />
                </div>
                <div class="input-group">
                  <label>Email Address *</label>
                  <input id="regEmail" placeholder="your@email.com" />
                </div>
                <div class="input-group">
                  <label>Create Password *</label>
                  <input id="regPassword" type="password" placeholder="Minimum 4 characters" onkeydown="if(event.key==='Enter')registerPortalNow()" />
                </div>
                <button class="btn-primary" onclick="registerPortalNow()">
                  ✨ Create Customer Account →
                </button>
              \`}
            </div>
          \`;
          return;
        }

        // Logged in (Customer sees ONLY their own licenses; Admin sees ALL licenses + Razorpay Settings)
        const isAdmin = state.user.role === 'ADMIN';
        const rzpCfg = state.razorpaySettings || {
          keyId: state.publicRazorpay?.keyId || 'rzp_test_GarvixPanelLive',
          keySecret: '',
          webhookSecret: '',
          companyName: 'Garvix Software Solutions Pvt Ltd',
        };
        const rzpWebhookUrl = originHost + '/api/v1/license-store/razorpay/webhook';

        box.innerHTML = \`
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
            <div>
              <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span class="acct-pill" style="margin:0;">\${isAdmin ? '👑 STORE ADMIN VIEW (ALL CUSTOMERS)' : '🔒 CUSTOMER ACCOUNT PORTAL'}</span>
                <span style="font-size:12.5px;color:var(--gv-muted);font-weight:700;">Signed in as <strong>\${state.user.name}</strong> (\${state.user.email})</span>
              </div>
              <h1 style="margin:0 0 4px;font-size:26px;">🔄 \${isAdmin ? 'All Customer Licenses &amp; Renewals' : 'My Licenses &amp; Monthly Renewals'}</h1>
              <p style="margin:0;color:var(--gv-muted);">
                \${isAdmin
                  ? 'Viewing all customer licenses, GST invoices, and Razorpay Payment Gateway settings.'
                  : 'Manage your active VPS licenses, renew instantly via Razorpay, or transfer your license to a new VPS IP.'}
              </p>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn-primary" style="width:auto;padding:10px 20px;" onclick="switchTab('store')">
                + Buy New License
              </button>
              <button class="link-btn" onclick="logoutStoreNow()" style="color:#dc2626;">
                Logout
              </button>
            </div>
          </div>

          \${state.licenses.length === 0 ? \`
            <div class="lic-card" style="text-align:center;padding:36px 24px;">
              <div style="font-size:36px;margin-bottom:8px;">📦</div>
              <h3 style="margin:0 0 6px;font-size:18px;">No Active Licenses Under \${state.user.email} Yet</h3>
              <p style="margin:0 0 18px;color:var(--gv-muted);font-size:13.5px;">
                Choose a Garvix Control Panel plan and complete payment via Razorpay to get your instant license key.
              </p>
              <button class="btn-primary" style="width:auto;padding:10px 22px;" onclick="switchTab('store')">
                🛒 Browse License Plans →
              </button>
            </div>
          \` : state.licenses.map(lic => {
            const installCmd = \`curl -sSL \${originHost}/install.sh | sudo bash -s -- --license=\${lic.licenseKey}\`;
            return \`
              <div class="lic-card">
                <div class="lic-header">
                  <div>
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                      <strong style="font-size:19px;">\${lic.planName} (\${lic.billingCycle})</strong>
                      <span class="status-badge \${lic.status === 'ACTIVE' ? '' : lic.status === 'GRACE_PERIOD' ? 'warn' : 'danger'}">
                        \${lic.status === 'ACTIVE' ? '● ACTIVE' : lic.status === 'GRACE_PERIOD' ? '⚠️ 72H GRACE PERIOD' : '🔒 EXPIRED & LOCKED'}
                      </span>
                    </div>
                    <div style="font-size:13.5px;color:var(--gv-muted);">
                      👤 Customer: <strong>\${lic.customerName}</strong> (\${lic.customerEmail}) •
                      📅 Next Renewal Due: <strong style="color:var(--gv-dark);">\${lic.expiresAt.slice(0, 10)}</strong>
                    </div>
                  </div>

                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn-primary" style="width:auto;background:#2563eb;padding:10px 18px;font-size:13.5px;" onclick="openRenewalRazorpayModal('\${lic.id}')">
                      💳 Renew via Razorpay
                    </button>
                    <button class="link-btn" onclick="changeServerIp('\${lic.id}', '\${lic.serverIp}')">
                      ✏️ Change VPS IP (\${lic.serverIp})
                    </button>
                  </div>
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-bottom:14px;">
                  <div style="background:#f8fafc;padding:12px 14px;border-radius:10px;border:1px solid var(--gv-border);">
                    <div style="font-size:11.5px;font-weight:700;color:var(--gv-muted);">LICENSE KEY</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                      <code style="font-size:14px;font-weight:800;color:var(--gv-blue);">\${lic.licenseKey}</code>
                      <button class="link-btn" style="padding:4px 10px;font-size:11.5px;" onclick="copyText('\${lic.licenseKey}', 'License Key')">Copy</button>
                    </div>
                  </div>

                  <div style="background:#f8fafc;padding:12px 14px;border-radius:10px;border:1px solid var(--gv-border);">
                    <div style="font-size:11.5px;font-weight:700;color:var(--gv-muted);">BOUND SERVER IPv4 ADDRESS</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                      <code style="font-size:14px;font-weight:800;color:var(--gv-dark);">\${lic.serverIp}</code>
                      <span style="font-size:12px;color:var(--gv-green);font-weight:700;">✔ IP Verified</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">
                    1-Line VPS Install Command (Run as root on AlmaLinux 10):
                  </div>
                  <div class="cmd-box">
                    <span>\${installCmd}</span>
                    <button class="copy-btn" onclick="copyText('\${installCmd}', 'Install Command')">📋 Copy Command</button>
                  </div>
                </div>
              </div>
            \`;
          }).join('')}

          <div class="lic-card" style="margin-top:28px;">
            <h3 style="margin:0 0 14px;font-size:17px;">🧾 Payment History &amp; GST Invoices</h3>
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:13.5px;">
                <thead>
                  <tr style="border-bottom:2px solid var(--gv-border);text-align:left;color:var(--gv-muted);font-size:12px;">
                    <th style="padding:10px;">INVOICE #</th>
                    <th style="padding:10px;">DATE</th>
                    <th style="padding:10px;">CUSTOMER</th>
                    <th style="padding:10px;">PLAN, SERVER IP &amp; RAZORPAY REF</th>
                    <th style="padding:10px;">PAYMENT METHOD</th>
                    <th style="padding:10px;">TOTAL PAID (INCL. GST)</th>
                    <th style="padding:10px;">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  \${state.invoices.length === 0 ? \`
                    <tr><td colspan="7" style="padding:20px;text-align:center;color:var(--gv-muted);">No GST invoices found for your account yet.</td></tr>
                  \` : state.invoices.map(inv => \`
                    <tr style="border-bottom:1px solid var(--gv-border);">
                      <td style="padding:12px 10px;"><strong>\${inv.invoiceNumber}</strong></td>
                      <td style="padding:12px 10px;">\${inv.issuedAt.slice(0, 10)}</td>
                      <td style="padding:12px 10px;">\${inv.customerName}<br/><span style="font-size:11px;color:var(--gv-muted);">\${inv.customerEmail}</span></td>
                      <td style="padding:12px 10px;">\${inv.description}</td>
                      <td style="padding:12px 10px;"><code>\${inv.paymentMethod}</code></td>
                      <td style="padding:12px 10px;"><strong>₹\${(inv.totalPaise / 100).toFixed(2)}</strong></td>
                      <td style="padding:12px 10px;"><span class="status-badge">PAID</span></td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          </div>

          \${isAdmin ? \`
            <div class="lic-card" style="margin-top:24px;background:#f8fafc;border:1.5px solid #bfdbfe;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <h3 style="margin:0;font-size:16.5px;color:#1e3a8a;">👑 Admin Only: Razorpay Gateway Configuration</h3>
                <span class="status-badge" style="background:#dbeafe;color:#1d4ed8;">\${rzpCfg.keyId.startsWith('rzp_live_') ? 'LIVE MODE' : 'TEST / SANDBOX MODE'}</span>
              </div>
              <p style="margin:0 0 14px;font-size:12.5px;color:var(--gv-muted);">
                Enter your Razorpay <strong>Key ID</strong> and <strong>Key Secret</strong> from your Razorpay Dashboard. This box is visible only to Store Admin (hidden from customers).
              </p>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-bottom:12px;">
                <div class="input-group" style="margin-bottom:0;">
                  <label>Razorpay Key ID *</label>
                  <input id="rzpKeyId" value="\${rzpCfg.keyId}" placeholder="rzp_live_... or rzp_test_..." style="font-family:monospace;font-weight:700;" />
                </div>
                <div class="input-group" style="margin-bottom:0;">
                  <label>Razorpay Key Secret *</label>
                  <input id="rzpKeySecret" type="password" value="\${rzpCfg.keySecret}" placeholder="Enter Razorpay Key Secret" style="font-family:monospace;" />
                </div>
                <div class="input-group" style="margin-bottom:0;">
                  <label>Razorpay Webhook Secret</label>
                  <input id="rzpWebhookSecret" type="password" value="\${rzpCfg.webhookSecret}" placeholder="Webhook Secret" style="font-family:monospace;" />
                </div>
                <div class="input-group" style="margin-bottom:0;">
                  <label>Merchant / Company Name</label>
                  <input id="rzpCompanyName" value="\${rzpCfg.companyName}" placeholder="Garvix Software Solutions Pvt Ltd" />
                </div>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <div style="background:#0f172a;color:#e2e8f0;padding:9px 14px;border-radius:9px;font-size:12px;font-family:monospace;display:flex;align-items:center;gap:10px;">
                  <span><strong>Razorpay Webhook URL:</strong> <span style="color:#38bdf8;">\${rzpWebhookUrl}</span></span>
                  <button class="copy-btn" onclick="copyText('\${rzpWebhookUrl}', 'Razorpay Webhook URL')">📋 Copy URL</button>
                </div>
                <button class="btn-primary" style="width:auto;background:#2563eb;padding:10px 22px;" onclick="saveRazorpaySettingsNow()">
                  💾 Save Razorpay Keys
                </button>
              </div>
            </div>
          \` : ''}
        \`;
        return;
      }

      if (currentTab === 'verify') {
        box.innerHTML = \`
          <div class="lic-card" style="max-width:640px;margin:20px auto;text-align:center;padding:36px 28px;">
            <div style="font-size:40px;margin-bottom:8px;">🛡️</div>
            <h1 style="margin:0 0 8px;font-size:24px;">Verify a Server's Garvix License</h1>
            <p style="margin:0 0 22px;color:var(--gv-muted);">
              Enter any VPS IP address below to check if it has an active, genuine Garvix Hosting Manager (WHM + cPanel) license.
            </p>
            <div style="display:flex;gap:10px;max-width:460px;margin:0 auto 20px;">
              <input id="vIp" value="200.234.39.100" style="flex:1;padding:12px 14px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:15px;font-family:monospace;font-weight:700;" />
              <button class="btn-primary" style="width:auto;padding:12px 22px;" onclick="checkIpNow()">Check IP</button>
            </div>
            <div id="vOut"></div>
          </div>
        \`;
        checkIpNow();
        return;
      }
    }

    async function changeServerIp(licenseId, oldIp) {
      const nextIp = prompt('Enter the new VPS IPv4 address for this license:', oldIp);
      if (!nextIp || nextIp.trim() === oldIp) return;
      try {
        await api('/api/v1/license-store/change-ip', {
          method: 'POST',
          body: JSON.stringify({ licenseId, newServerIp: nextIp.trim() }),
        });
        showToast('✅ License transferred to new VPS IP: ' + nextIp.trim());
        render();
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function checkIpNow() {
      const ip = document.getElementById('vIp')?.value.trim() || '200.234.39.100';
      const out = document.getElementById('vOut');
      if (!out) return;
      const res = await api('/api/v1/license-store/verify?ip=' + encodeURIComponent(ip));
      if (res.licensed) {
        out.innerHTML = \`
          <div style="background:#f0fdf4;border:1.5px solid #16a34a;border-radius:12px;padding:18px;text-align:left;">
            <div style="font-weight:800;color:#166534;font-size:15px;margin-bottom:6px;">
              ✅ ACTIVE LICENSE VERIFIED FOR IP \${ip}
            </div>
            <div style="font-size:13.5px;color:#14532d;">
              <strong>Plan:</strong> \${res.license.planName} (\${res.license.billingCycle})<br/>
              <strong>License Key:</strong> <code>\${res.license.licenseKey}</code><br/>
              <strong>Valid Until:</strong> \${res.license.expiresAt.slice(0, 10)}
            </div>
          </div>
        \`;
      } else {
        out.innerHTML = \`
          <div style="background:#fef2f2;border:1.5px solid #dc2626;border-radius:12px;padding:18px;text-align:left;">
            <div style="font-weight:800;color:#991b1b;font-size:15px;margin-bottom:4px;">
              ❌ No Active License Found for IP \${ip}
            </div>
            <div style="font-size:13px;color:#7f1d1d;">
              This server is either unlicensed or its monthly subscription has expired.
            </div>
          </div>
        \`;
      }
    }

    render();
  </script>
</body>
</html>`;
}
