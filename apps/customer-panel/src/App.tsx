import * as React from 'react';
import type { GarvixRole } from '@garvix/shared-types';
import {
  Plus,
  Lock,
  CheckCircle2,
  ServerCog,
  CreditCard,
  KeyRound,
  UserCheck,
  RefreshCw,
  Menu,
  Search,
  Bell,
  Sparkles,
  FolderOpen,
  ShieldCheck,
  Mail,
} from 'lucide-react';
import {
  getAuthorizedNavigationForRole,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Input,
  Separator,
  DialogModal,
  DecryptedText,
  AuroraBackground,
  StarBorder,
  TiltedCard,
  AnimatedContent,
} from '@garvix/ui-components';
import { CUSTOMER_PANEL_APP_METADATA } from './index.js';
import {
  NebulixSidebar,
  type NebulixSidebarSectionId,
} from './components/dashboard/NebulixSidebar.js';
import { NebulixWelcomeHero } from './components/dashboard/NebulixWelcomeHero.js';
import { NebulixStatsGrid } from './components/dashboard/NebulixStatsGrid.js';
import { NebulixServerMonitoring } from './components/dashboard/NebulixServerMonitoring.js';
import { NebulixQuickActions } from './components/dashboard/NebulixQuickActions.js';

type PanelSurface = 'cpanel' | 'whm' | 'store' | 'login';

interface DnsRecordItem {
  id: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT';
  name: string;
  value: string;
  ttl: number;
}

interface HostedDbItem {
  id: string;
  name: string;
  engine: 'POSTGRESQL_16' | 'MARIADB_10_11';
  dbUser: string;
  sizeMb: number;
}

const INITIAL_DNS_RECORDS: DnsRecordItem[] = [
  { id: 'dns-1', type: 'A', name: '@', value: '72.61.236.175', ttl: 3600 },
  { id: 'dns-2', type: 'A', name: 'mail', value: '72.61.236.175', ttl: 3600 },
  { id: 'dns-3', type: 'MX', name: '@', value: '10 mail.garvixcloud.in.', ttl: 3600 },
  {
    id: 'dns-4',
    type: 'TXT',
    name: '@',
    value: 'v=spf1 ip4:72.61.236.175 -all',
    ttl: 3600,
  },
  {
    id: 'dns-5',
    type: 'TXT',
    name: 'default._domainkey',
    value: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...',
    ttl: 3600,
  },
];

const INITIAL_DATABASES: HostedDbItem[] = [
  {
    id: 'db-1',
    name: 'garvixprod_app',
    engine: 'POSTGRESQL_16',
    dbUser: 'garvixprod_pguser',
    sizeMb: 148,
  },
  {
    id: 'db-2',
    name: 'garvixprod_wp',
    engine: 'MARIADB_10_11',
    dbUser: 'garvixprod_myuser',
    sizeMb: 84,
  },
];

const STORE_PLANS = [
  {
    code: 'TRIAL',
    name: 'Garvix Trial',
    accounts: '1 cPanel Account (15 Days)',
    priceInr: 0,
    badge: 'FREE 15-DAY TRIAL',
    popular: false,
  },
  {
    code: 'SOLO',
    name: 'Garvix Solo',
    accounts: '1 Hosting Account · Dedicated VPS',
    priceInr: 799,
    badge: 'SOLO VPS',
    popular: false,
  },
  {
    code: 'PRO',
    name: 'Garvix Pro',
    accounts: 'Up to 5 Hosting Accounts · WHM + cPanel',
    priceInr: 1499,
    badge: 'MOST POPULAR',
    popular: true,
  },
  {
    code: 'PREMIER',
    name: 'Garvix Premier',
    accounts: 'Up to 100 Hosting Accounts · Cloud / Dedicated',
    priceInr: 2999,
    badge: 'ENTERPRISE',
    popular: false,
  },
];

export function CustomerPanelApp(): React.ReactElement {
  const [activeSurface, setActiveSurface] = React.useState<PanelSurface>('cpanel');
  const [activeSidebarItem, setActiveSidebarItem] =
    React.useState<NebulixSidebarSectionId>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState<boolean>(false);
  const [activeRole, setActiveRole] = React.useState<GarvixRole>('HOSTING_ACCOUNT_OWNER');

  // Existing interactive states preserved
  const [dnsRecords, setDnsRecords] = React.useState<DnsRecordItem[]>(INITIAL_DNS_RECORDS);
  const [databases, setDatabases] = React.useState<HostedDbItem[]>(INITIAL_DATABASES);
  const [emailCount, setEmailCount] = React.useState<number>(18);
  const [sslCount, setSslCount] = React.useState<number>(5);

  // Modals for Quick Actions
  const [dnsModalOpen, setDnsModalOpen] = React.useState<boolean>(false);
  const [emailModalOpen, setEmailModalOpen] = React.useState<boolean>(false);
  const [fileManagerModalOpen, setFileManagerModalOpen] = React.useState<boolean>(false);
  const [sslModalOpen, setSslModalOpen] = React.useState<boolean>(false);

  const [newDnsType, setNewDnsType] = React.useState<DnsRecordItem['type']>('A');
  const [newDnsName, setNewDnsName] = React.useState<string>('');
  const [newDnsValue, setNewDnsValue] = React.useState<string>('');
  const [newEmailUser, setNewEmailUser] = React.useState<string>('');

  const [checkoutPlan, setCheckoutPlan] = React.useState<(typeof STORE_PLANS)[number] | null>(
    null
  );
  const [checkoutEmail, setCheckoutEmail] = React.useState<string>('customer@company.in');
  const [checkoutIp, setCheckoutIp] = React.useState<string>('72.61.236.175');
  const [issuedStoreKey, setIssuedStoreKey] = React.useState<string>(
    'GVX-PRO-882A-94CF-E25519'
  );
  const [loginMode, setLoginMode] = React.useState<'CUSTOMER' | 'ADMIN'>('CUSTOMER');
  const [toastBanner, setToastBanner] = React.useState<string | null>(null);

  const authorizedNavItems = React.useMemo(
    () => getAuthorizedNavigationForRole(activeRole),
    [activeRole]
  );

  const showToast = (msg: string) => {
    setToastBanner(msg);
    setTimeout(() => setToastBanner(null), 3500);
  };

  const handleAddDnsRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDnsName.trim() || !newDnsValue.trim()) return;
    setDnsRecords((prev) => [
      ...prev,
      {
        id: `dns-${Date.now()}`,
        type: newDnsType,
        name: newDnsName.trim(),
        value: newDnsValue.trim(),
        ttl: 3600,
      },
    ]);
    setNewDnsName('');
    setNewDnsValue('');
    setDnsModalOpen(false);
    showToast(`DNS ${newDnsType} record added and validated via named-checkzone.`);
  };

  const handleCreateEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailUser.trim()) return;
    setEmailCount((prev) => prev + 1);
    setNewEmailUser('');
    setEmailModalOpen(false);
    showToast(`Mailbox ${newEmailUser.trim()}@garvixcloud.in provisioned with Argon2id + DKIM.`);
  };

  const handleCreateDatabase = () => {
    const suffix = Math.floor(100 + Math.random() * 900);
    const dbName = `garvixprod_db${suffix}`;
    setDatabases((prev) => [
      ...prev,
      {
        id: `db-${Date.now()}`,
        name: dbName,
        engine: prev.length % 2 === 0 ? 'POSTGRESQL_16' : 'MARIADB_10_11',
        dbUser: `garvixprod_u${suffix}`,
        sizeMb: 12,
      },
    ]);
    showToast(`Isolated database ${dbName} created on workload instance.`);
  };

  const handleInstallSslSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSslCount((prev) => prev + 1);
    setSslModalOpen(false);
    showToast('Let’s Encrypt AutoSSL TLS 1.3 certificate issued and reloaded in Nginx.');
  };

  const handleRazorpayCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPlan) return;
    const rand = Math.random().toString(16).substring(2, 6).toUpperCase();
    setIssuedStoreKey(`GVX-${checkoutPlan.code}-${rand}-77E1-E25519`);
    setCheckoutPlan(null);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-[#F7F6FD] via-[#F4F2FC] to-[#EEF2FF] text-slate-900">
      <div className="flex min-h-screen">
        {/* SECTION A: Premium Nebulix Sidebar */}
        <NebulixSidebar
          activeItem={activeSidebarItem}
          onSelectItem={(item) => {
            setActiveSidebarItem(item);
            setActiveSurface('cpanel');
          }}
          activeRole={activeRole}
          authorizedNavItems={authorizedNavItems}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Right Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Light-Theme SaaS Header */}
          <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center justify-between gap-2 border-b border-indigo-100/80 bg-white/90 px-3 py-2.5 backdrop-blur-xl sm:px-8">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label="Open navigation sidebar"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-slate-700 shadow-xs hover:bg-indigo-50 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <span className="font-display text-sm font-extrabold tracking-tight text-slate-900 lg:hidden">
                GARVIX
              </span>

              <div className="relative hidden sm:block">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  aria-label="Search domains, mailboxes, databases"
                  placeholder="Search domains, emails, databases..."
                  className="h-10 w-64 rounded-2xl border border-indigo-100/90 bg-[#F7F6FD] pl-10 pr-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 md:w-80"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Role Selector (Preserves RBAC Verification) */}
              <select
                aria-label="Active RBAC Role"
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value as GarvixRole)}
                className="hidden h-9 rounded-xl border border-indigo-100 bg-[#F7F6FD] px-3 text-xs font-semibold text-slate-700 xl:block"
              >
                <option value="HOSTING_ACCOUNT_OWNER">Role: HOSTING_ACCOUNT_OWNER</option>
                <option value="SERVER_ADMIN">Role: SERVER_ADMIN (WHM Root)</option>
                <option value="HOSTING_RESELLER">Role: HOSTING_RESELLER</option>
                <option value="HOSTING_ACCOUNT_TECH">Role: HOSTING_ACCOUNT_TECH</option>
                <option value="EMAIL_ONLY_USER">Role: EMAIL_ONLY_USER</option>
                <option value="READ_ONLY_AUDITOR">Role: READ_ONLY_AUDITOR</option>
              </select>

              {/* Surface Switcher (Preserves access to WHM, Store, and Login without modifying them) */}
              <div className="flex rounded-xl border border-indigo-100 bg-[#F7F6FD] p-0.5 sm:p-1">
                {(
                  [
                    { id: 'cpanel', label: 'Dashboard' },
                    { id: 'whm', label: 'WHM' },
                    { id: 'store', label: 'Store' },
                    { id: 'login', label: 'Login' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSurface(s.id)}
                    className={`rounded-lg px-2 py-1 text-[11px] sm:px-2.5 sm:text-xs font-bold transition-all ${
                      activeSurface === s.id
                        ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-indigo-900'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                aria-label="Notifications"
                className="relative hidden h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 sm:inline-flex"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-600" />
              </button>

              <div className="hidden items-center gap-2.5 rounded-2xl border border-indigo-100 bg-white px-3 py-1.5 shadow-2xs sm:flex">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-xs font-bold text-white">
                  VB
                </div>
                <div className="hidden text-left md:block">
                  <div className="text-xs font-bold leading-none text-slate-900">Vishnu Baldwa</div>
                  <div className="mt-0.5 text-[10px] font-medium text-indigo-600">
                    {CUSTOMER_PANEL_APP_METADATA.appName}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Toast Feedback Banner */}
          {toastBanner && (
            <div className="mx-6 mt-4 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-sm sm:mx-8">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {toastBanner}
              </span>
              <button
                type="button"
                onClick={() => setToastBanner(null)}
                className="text-emerald-700 hover:text-emerald-950"
              >
                ✕
              </button>
            </div>
          )}

          {/* Main Workspace Container */}
          <main className="mx-auto w-full max-w-[1400px] min-w-0 flex-1 space-y-8 px-4 py-6 sm:px-8 sm:py-8">
            {/* =================================================================
                SURFACE 1: REDESIGNED NEBULIX CUSTOMER PANEL DASHBOARD HOMEPAGE
               ================================================================= */}
            {activeSurface === 'cpanel' && (
              <div className="space-y-8">
                {/* SECTION B: Welcome Section with BlurText, GradientText & Floating Cloud SVG */}
                <AnimatedContent delayMs={0}>
                  <NebulixWelcomeHero
                    onAddDomain={() => setDnsModalOpen(true)}
                    onCreateEmail={() => setEmailModalOpen(true)}
                    onOpenFileManager={() => setFileManagerModalOpen(true)}
                  />
                </AnimatedContent>

                {/* SECTION C: Animated Statistics (6 SpotlightCard + CountUp cards) */}
                <AnimatedContent delayMs={70}>
                  <NebulixStatsGrid
                    activeWebsitesCount={3}
                    domainsCount={dnsRecords.length}
                    emailAccountsCount={emailCount}
                    storageUsedGb={14.2}
                    storageTotalGb={50}
                    monthlyBandwidthGb={412}
                    bandwidthLimitGb={2000}
                    sslCertificatesCount={sslCount}
                  />
                </AnimatedContent>

                {/* SECTION E: Quick Actions (5 One-Click Action Cards) */}
                <AnimatedContent delayMs={130}>
                  <NebulixQuickActions
                    onAddDomain={() => setDnsModalOpen(true)}
                    onCreateEmail={() => setEmailModalOpen(true)}
                    onOpenFileManager={() => setFileManagerModalOpen(true)}
                    onManageDatabase={handleCreateDatabase}
                    onInstallSsl={() => setSslModalOpen(true)}
                  />
                </AnimatedContent>

                {/* SECTION D: Server Monitoring (CPU, RAM, Storage, Animated Bandwidth Chart, Health) */}
                <AnimatedContent delayMs={190}>
                  <NebulixServerMonitoring />
                </AnimatedContent>

                {/* Active DNS Zone & Isolated Customer Databases Summary Row */}
                <AnimatedContent delayMs={240}>
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Authoritative DNS Records Card */}
                    <div className="min-w-0 rounded-2xl border border-indigo-100/90 bg-white p-5 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-display text-sm font-bold text-slate-900">
                            Authoritative DNS Zone (`garvixcloud.in`)
                          </h3>
                          <p className="text-xs text-slate-500">
                            Validated via `named-checkzone` before atomic reload
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDnsModalOpen(true)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Record
                        </button>
                      </div>

                      <div className="mt-4 space-y-2">
                        {dnsRecords.map((rec) => (
                          <div
                            key={rec.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-indigo-50 bg-[#FAF9FE] px-3 py-2 text-xs"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="shrink-0 rounded-lg bg-indigo-100 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700">
                                {rec.type}
                              </span>
                              <span className="truncate font-mono font-bold text-slate-800">
                                {rec.name}
                              </span>
                            </div>
                            <span className="max-w-[130px] shrink-0 truncate font-mono text-slate-500 sm:max-w-[230px]">
                              {rec.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Isolated Customer Databases Card */}
                    <div className="min-w-0 rounded-2xl border border-indigo-100/90 bg-white p-5 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-display text-sm font-bold text-slate-900">
                            Isolated Customer Databases
                          </h3>
                          <p className="text-xs text-slate-500">
                            Physically separated from `garvix_local_panel` control metadata
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleCreateDatabase}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-95"
                        >
                          <Plus className="h-3.5 w-3.5" /> Provision DB
                        </button>
                      </div>

                      <div className="mt-4 space-y-2.5">
                        {databases.map((db) => (
                          <div
                            key={db.id}
                            className="flex items-center justify-between rounded-xl border border-indigo-50 bg-[#FAF9FE] px-3.5 py-2.5 text-xs"
                          >
                            <div>
                              <div className="font-mono font-bold text-slate-900">{db.name}</div>
                              <div className="text-slate-500">User: {db.dbUser}</div>
                            </div>
                            <div className="text-right">
                              <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700">
                                {db.engine}
                              </span>
                              <div className="mt-1 font-mono text-slate-500">{db.sizeMb} MB</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </AnimatedContent>
              </div>
            )}

            {/* =================================================================
                OTHER SURFACES (WHM, STORE, LOGIN) — PRESERVED UNCHANGED
               ================================================================= */}
            {activeSurface === 'whm' && (
              <AnimatedContent className="space-y-6">
                <Card className="border-slate-800 bg-slate-900/95 text-slate-100">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="orange">WHM ROOT &amp; RESELLER CONSOLE</Badge>
                      <Badge variant="success">12-Step Go Agent Pipeline Active</Badge>
                    </div>
                    <CardTitle className="mt-2 text-xl text-white flex items-center gap-2">
                      <ServerCog className="h-5 w-5 text-orange-400" />
                      Transactional Account Provisioning &amp; systemd Service Control
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Every privileged operation executes over `/run/garvix-agent/agent.sock` with
                      SO_PEERCRED verification, dry-run preview, and automatic rollback on failure.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        {
                          unit: 'nginx.service',
                          desc: 'Reverse Proxy & HTTP/3 VirtualHosts',
                          state: 'ACTIVE (running)',
                        },
                        {
                          unit: 'php83-php-fpm.service',
                          desc: 'Per-Tenant UID/GID FPM Pools',
                          state: 'ACTIVE (running)',
                        },
                        {
                          unit: 'garvix-agent.service',
                          desc: 'Go 1.22 Privileged IPC Daemon',
                          state: 'ACTIVE (enforcing)',
                        },
                      ].map((svc) => (
                        <div
                          key={svc.unit}
                          className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-white">
                              {svc.unit}
                            </span>
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{svc.desc}</p>
                          <Badge variant="success" className="mt-3">
                            {svc.state}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    <Separator className="bg-slate-800" />

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Account Provisioning State Machine
                      </h4>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-mono">
                        {[
                          'PREFLIGHT',
                          'PROVISIONING_LINUX_USER',
                          'PROVISIONING_HOME_FS',
                          'PROVISIONING_WEB_VHOST',
                          'PROVISIONING_DNS',
                          'ACTIVE',
                        ].map((step) => (
                          <Badge key={step} variant={step === 'ACTIVE' ? 'success' : 'secondary'}>
                            {step}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedContent>
            )}

            {activeSurface === 'store' && (
              <AnimatedContent className="space-y-6">
                <AuroraBackground className="border border-slate-800 p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <Badge variant="orange">RAZORPAY CHECKOUT + INSTANT ED25519 LICENSE</Badge>
                      <h2 className="mt-2 text-2xl font-black text-white">
                        Garvix Commercial License Store (SAC 998315 · 18% GST)
                      </h2>
                      <p className="mt-1 text-xs text-slate-300">
                        Pay via UPI QR, Credit Card, Debit Card, or NetBanking. Automatically
                        creates your Customer Portal account and binds an Ed25519 license key to
                        your server IP.
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-xs">
                      <div className="text-slate-400">Latest Issued License Key:</div>
                      <div className="mt-1 font-mono text-sm font-bold text-orange-400">
                        <DecryptedText text={issuedStoreKey} />
                      </div>
                    </div>
                  </div>
                </AuroraBackground>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {STORE_PLANS.map((plan) => (
                    <TiltedCard key={plan.code} maxTiltDeg={4}>
                      <StarBorder color={plan.popular ? '#ff6c2c' : '#334155'} className="h-full">
                        <div className="flex h-full flex-col justify-between rounded-[15px] bg-slate-900 p-5">
                          <div>
                            <Badge variant={plan.popular ? 'orange' : 'secondary'}>
                              {plan.badge}
                            </Badge>
                            <h3 className="mt-3 text-lg font-extrabold text-white">{plan.name}</h3>
                            <div className="mt-2 text-2xl font-black text-white">
                              {plan.priceInr === 0 ? 'Free' : `₹${plan.priceInr}`}
                              {plan.priceInr > 0 && (
                                <span className="text-xs font-normal text-slate-400">
                                  {' '}
                                  / month (incl. GST)
                                </span>
                              )}
                            </div>
                            <p className="mt-2 text-xs text-slate-300">{plan.accounts}</p>
                          </div>

                          <Button
                            variant={plan.popular ? 'orange' : 'blue'}
                            className="mt-5 w-full"
                            onClick={() => setCheckoutPlan(plan)}
                          >
                            <CreditCard className="h-4 w-4" />
                            {plan.priceInr === 0 ? 'Activate Free Trial' : 'Buy with Razorpay'}
                          </Button>
                        </div>
                      </StarBorder>
                    </TiltedCard>
                  ))}
                </div>
              </AnimatedContent>
            )}

            {activeSurface === 'login' && (
              <AnimatedContent>
                <Card className="border-slate-800 bg-slate-900/95 text-slate-100 max-w-xl mx-auto">
                  <CardHeader>
                    <div className="flex gap-2">
                      <Button
                        variant={loginMode === 'CUSTOMER' ? 'orange' : 'outline'}
                        size="sm"
                        onClick={() => setLoginMode('CUSTOMER')}
                      >
                        <UserCheck className="h-4 w-4" />
                        Customer Portal Login
                      </Button>
                      <Button
                        variant={loginMode === 'ADMIN' ? 'blue' : 'outline'}
                        size="sm"
                        onClick={() => setLoginMode('ADMIN')}
                      >
                        <KeyRound className="h-4 w-4" />
                        Super Admin Login
                      </Button>
                    </div>
                    <CardTitle className="mt-4 text-white">
                      {loginMode === 'CUSTOMER'
                        ? 'Customer License & Billing Portal'
                        : 'Garvix Super Admin Portal'}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {loginMode === 'CUSTOMER'
                        ? 'View only your own purchased Ed25519 licenses, rebind server IPs, and download GST invoices.'
                        : 'Restricted to Garvix Super Administrators with hardware MFA / TOTP verification.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Email Address</label>
                      <Input
                        defaultValue={
                          loginMode === 'CUSTOMER' ? 'customer@company.in' : 'admin@garvix.com'
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Password</label>
                      <Input type="password" defaultValue="••••••••••••" />
                    </div>
                    <Button
                      variant={loginMode === 'CUSTOMER' ? 'orange' : 'blue'}
                      className="w-full"
                      onClick={() => setActiveSurface('cpanel')}
                    >
                      <Lock className="h-4 w-4" />
                      Sign In to {loginMode === 'CUSTOMER' ? 'Customer Portal' : 'Admin Console'}
                    </Button>
                  </CardContent>
                </Card>
              </AnimatedContent>
            )}
          </main>
        </div>
      </div>

      {/* =====================================================================
          MODALS FOR QUICK ACTIONS (Smooth Modal Openings)
         ===================================================================== */}
      {/* 1. Add Domain / DNS Record Modal */}
      <DialogModal
        open={dnsModalOpen}
        onClose={() => setDnsModalOpen(false)}
        title="Add Domain or Authoritative DNS Record"
        description="Staged and verified with named-checkzone before reloading Bind9."
      >
        <form onSubmit={handleAddDnsRecord} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Record Type</label>
            <select
              value={newDnsType}
              onChange={(e) => setNewDnsType(e.target.value as DnsRecordItem['type'])}
              className="flex h-10 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="A">A (IPv4 Address)</option>
              <option value="AAAA">AAAA (IPv6 Address)</option>
              <option value="CNAME">CNAME (Canonical Name)</option>
              <option value="MX">MX (Mail Exchange)</option>
              <option value="TXT">TXT (SPF / DKIM / DMARC)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Host / Subdomain</label>
            <Input
              required
              value={newDnsName}
              onChange={(e) => setNewDnsName(e.target.value)}
              placeholder="@ or app or staging"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Record Value / IPv4</label>
            <Input
              required
              value={newDnsValue}
              onChange={(e) => setNewDnsValue(e.target.value)}
              placeholder="72.61.236.175"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDnsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-violet-600 to-blue-600 text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Validate &amp; Add Record
            </Button>
          </div>
        </form>
      </DialogModal>

      {/* 2. Create Business Email Modal */}
      <DialogModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        title="Create Business Email Account"
        description="Provisions a Dovecot Argon2id mailbox with 2048-bit DKIM signing."
      >
        <form onSubmit={handleCreateEmailSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Mailbox Username</label>
            <div className="flex items-center gap-2">
              <Input
                required
                value={newEmailUser}
                onChange={(e) => setNewEmailUser(e.target.value)}
                placeholder="support or billing"
              />
              <span className="font-mono text-xs font-bold text-indigo-700">@garvixcloud.in</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEmailModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-violet-600 to-blue-600 text-white"
            >
              <Mail className="h-4 w-4" />
              Create Mailbox
            </Button>
          </div>
        </form>
      </DialogModal>

      {/* 3. Sandboxed File Manager Modal */}
      <DialogModal
        open={fileManagerModalOpen}
        onClose={() => setFileManagerModalOpen(false)}
        title="Sandboxed File Manager — /home/garvixprod"
        description="Confinement enforced via Go Agent O_NOFOLLOW & filepath.EvalSymlinks."
      >
        <div className="space-y-2.5 text-xs">
          {[
            { name: 'public_html/', perms: '0750', size: '4.2 GB' },
            { name: 'mail/garvixcloud.in/', perms: '0700', size: '1.9 GB' },
            { name: 'logs/nginx-access.log', perms: '0640', size: '142 MB' },
            { name: 'backups/restic-latest.snap', perms: '0600', size: '812 MB' },
          ].map((entry) => (
            <div
              key={entry.name}
              className="flex items-center justify-between rounded-xl border border-indigo-100 bg-[#FAF9FE] px-3.5 py-2.5"
            >
              <span className="flex items-center gap-2 font-mono font-bold text-slate-800">
                <FolderOpen className="h-4 w-4 text-indigo-600" />
                {entry.name}
              </span>
              <span className="font-mono text-slate-500">
                chmod {entry.perms} · {entry.size}
              </span>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={() => setFileManagerModalOpen(false)}
              className="bg-gradient-to-r from-violet-600 to-blue-600 text-white"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogModal>

      {/* 4. Install AutoSSL Certificate Modal */}
      <DialogModal
        open={sslModalOpen}
        onClose={() => setSslModalOpen(false)}
        title="Install Let’s Encrypt AutoSSL Certificate"
        description="Issues a 90-day ECDSA P-384 TLS 1.3 certificate via HTTP-01 / DNS-01 ACME challenge."
      >
        <form onSubmit={handleInstallSslSubmit} className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              ACME Pre-Flight Ready for `*.garvixcloud.in`
            </div>
            <p className="mt-1 text-[11px] text-emerald-700">
              Nginx configuration will be validated with `nginx -t` before zero-downtime reload.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setSslModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              <Sparkles className="h-4 w-4" />
              Issue &amp; Install AutoSSL
            </Button>
          </div>
        </form>
      </DialogModal>

      {/* 5. Razorpay Checkout Modal (Preserved for Store surface) */}
      <DialogModal
        open={checkoutPlan !== null}
        onClose={() => setCheckoutPlan(null)}
        title={checkoutPlan ? `Razorpay Checkout — ${checkoutPlan.name}` : 'Razorpay Checkout'}
        description="Supports UPI QR, Credit/Debit Cards (Visa/Mastercard/RuPay), and NetBanking."
      >
        <form onSubmit={handleRazorpayCheckoutSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Customer Email</label>
            <Input
              required
              type="email"
              value={checkoutEmail}
              onChange={(e) => setCheckoutEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Server IPv4 for Ed25519 License Binding
            </label>
            <Input
              required
              value={checkoutIp}
              onChange={(e) => setCheckoutIp(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCheckoutPlan(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="orange">
              <CreditCard className="h-4 w-4" />
              Complete Razorpay Verification &amp; Issue Key
            </Button>
          </div>
        </form>
      </DialogModal>
    </div>
  );
}

export default CustomerPanelApp;
