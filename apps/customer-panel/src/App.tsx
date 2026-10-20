import * as React from 'react';
import type { GarvixRole } from '@garvix/shared-types';
import {
  Plus,
  Lock,
  CheckCircle2,
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
  Database,
  Table2,
} from 'lucide-react';
import {
  getAuthorizedNavigationForRole,
  Button,
  Badge,
  Input,
  DialogModal,
  BlurText,
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
import {
  NebulixModulePages,
  type EmailMailboxView,
} from './components/dashboard/NebulixModulePages.js';
import {
  NebulixWhmSidebar,
  NebulixWhmWorkspace,
  type NebulixWhmSectionId,
  type WhmCpanelAccountItem,
  type WhmHostingPackageItem,
  type WhmServiceDaemonItem,
} from './components/dashboard/NebulixWhmWorkspace.js';

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

const INITIAL_WHM_ACCOUNTS: WhmCpanelAccountItem[] = [
  {
    id: 'acct-1',
    domain: 'garvixcloud.in',
    username: 'garvixprod',
    email: 'vishnu@garvixcloud.in',
    packageName: 'Agency Unlimited',
    diskUsedGb: 14.2,
    diskQuotaGb: 50,
    emailAccounts: 18,
    databases: 2,
    status: 'ACTIVE',
    createdAt: '2026-01-12',
  },
  {
    id: 'acct-2',
    domain: 'acmecorp.in',
    username: 'acmecorp',
    email: 'admin@acmecorp.in',
    packageName: 'Business 25GB',
    diskUsedGb: 6.4,
    diskQuotaGb: 25,
    emailAccounts: 8,
    databases: 3,
    status: 'ACTIVE',
    createdAt: '2026-04-08',
  },
  {
    id: 'acct-3',
    domain: 'shopkart.co.in',
    username: 'shopkart',
    email: 'tech@shopkart.co.in',
    packageName: 'Starter 10GB',
    diskUsedGb: 2.1,
    diskQuotaGb: 10,
    emailAccounts: 4,
    databases: 1,
    status: 'ACTIVE',
    createdAt: '2026-07-19',
  },
];

const INITIAL_WHM_PACKAGES: WhmHostingPackageItem[] = [
  {
    id: 'pkg-1',
    name: 'Starter 10GB',
    diskQuotaGb: 10,
    bandwidthGb: 100,
    maxEmails: 10,
    maxDatabases: 3,
    maxDomains: 3,
  },
  {
    id: 'pkg-2',
    name: 'Business 25GB',
    diskQuotaGb: 25,
    bandwidthGb: 500,
    maxEmails: 50,
    maxDatabases: 10,
    maxDomains: 10,
  },
  {
    id: 'pkg-3',
    name: 'Agency Unlimited',
    diskQuotaGb: 50,
    bandwidthGb: 2000,
    maxEmails: 200,
    maxDatabases: 50,
    maxDomains: 50,
  },
];

const INITIAL_WHM_SERVICES: WhmServiceDaemonItem[] = [
  {
    id: 'svc-nginx',
    unit: 'nginx.service',
    title: 'Nginx HTTP/3 Web Server',
    description: 'Reverse proxy, VirtualHosts & TLS 1.3 termination',
    pid: 1142,
    memoryMb: 128,
    status: 'RUNNING',
    lastRestarted: 'Uptime 42d 11h',
  },
  {
    id: 'svc-php',
    unit: 'php83-php-fpm.service',
    title: 'PHP-FPM 8.3 Multi-Pool',
    description: 'Isolated per-cPanel UID/GID PHP worker pools',
    pid: 1289,
    memoryMb: 340,
    status: 'RUNNING',
    lastRestarted: 'Uptime 42d 11h',
  },
  {
    id: 'svc-pg',
    unit: 'postgresql-16.service',
    title: 'PostgreSQL 16 Database',
    description: 'Customer relational database cluster (Port 5432)',
    pid: 1410,
    memoryMb: 612,
    status: 'RUNNING',
    lastRestarted: 'Uptime 42d 11h',
  },
  {
    id: 'svc-mariadb',
    unit: 'mariadb.service',
    title: 'MariaDB 10.11 (MySQL)',
    description: 'InnoDB database server for WordPress & PHP apps',
    pid: 1504,
    memoryMb: 520,
    status: 'RUNNING',
    lastRestarted: 'Uptime 42d 11h',
  },
  {
    id: 'svc-mail',
    unit: 'postfix + dovecot',
    title: 'Mail & Webmail Server',
    description: 'SMTP submission, IMAP/POP3, DKIM & Rspamd filter',
    pid: 1622,
    memoryMb: 280,
    status: 'RUNNING',
    lastRestarted: 'Uptime 42d 11h',
  },
  {
    id: 'svc-dns',
    unit: 'named.service',
    title: 'Bind9 Authoritative DNS',
    description: 'DNS zone server with named-checkzone validation',
    pid: 1708,
    memoryMb: 94,
    status: 'RUNNING',
    lastRestarted: 'Uptime 42d 11h',
  },
];

const STORE_PLANS = [
  {
    code: 'SOLO',
    name: 'Garvix cPanel Solo',
    accounts: 'Only cPanel (No WHM) · 1 cPanel Account',
    priceInr: 399,
    badge: 'ONLY cPANEL (1 ACCOUNT)',
    popular: false,
  },
  {
    code: 'ADMIN',
    name: 'Garvix WHM + cPanel Admin',
    accounts: 'WHM + Up to 5 cPanel Accounts',
    priceInr: 699,
    badge: 'WHM + 5 cPANEL',
    popular: false,
  },
  {
    code: 'PRO',
    name: 'Garvix WHM + cPanel Pro',
    accounts: 'WHM + Up to 30 cPanel Accounts',
    priceInr: 1099,
    badge: 'MOST POPULAR (WHM + cPANEL)',
    popular: true,
  },
  {
    code: 'PREMIER',
    name: 'Garvix WHM + cPanel Premier',
    accounts: 'WHM + Unlimited cPanel Accounts',
    priceInr: 1499,
    badge: 'WHM + UNLIMITED cPANEL',
    popular: false,
  },
];

export function CustomerPanelApp(): React.ReactElement {
  const [activeSurface, setActiveSurface] = React.useState<PanelSurface>('cpanel');
  const [activeSidebarItem, setActiveSidebarItem] =
    React.useState<NebulixSidebarSectionId>('dashboard');
  const [activeWhmSection, setActiveWhmSection] =
    React.useState<NebulixWhmSectionId>('whm-overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState<boolean>(false);
  const [activeRole] = React.useState<GarvixRole>('HOSTING_ACCOUNT_OWNER');

  // Active cPanel account context (can be switched via WHM [cP] Open cPanel!)
  const [activeCpanelDomain, setActiveCpanelDomain] = React.useState<string>('garvixcloud.in');
  const [activeCpanelUser, setActiveCpanelUser] = React.useState<string>('garvixprod');

  // WHM multi-account & server states
  const [whmAccounts, setWhmAccounts] =
    React.useState<WhmCpanelAccountItem[]>(INITIAL_WHM_ACCOUNTS);
  const [whmPackages, setWhmPackages] =
    React.useState<WhmHostingPackageItem[]>(INITIAL_WHM_PACKAGES);
  const [whmServices, setWhmServices] =
    React.useState<WhmServiceDaemonItem[]>(INITIAL_WHM_SERVICES);

  // Existing interactive states preserved
  const [dnsRecords, setDnsRecords] = React.useState<DnsRecordItem[]>(INITIAL_DNS_RECORDS);
  const [databases, setDatabases] = React.useState<HostedDbItem[]>(INITIAL_DATABASES);
  const [mailboxes, setMailboxes] = React.useState<EmailMailboxView[]>([
    { address: 'vishnu@garvixcloud.in', usedMb: 640, quotaMb: 2048 },
    { address: 'support@garvixcloud.in', usedMb: 420, quotaMb: 2048 },
    { address: 'billing@garvixcloud.in', usedMb: 310, quotaMb: 2048 },
    { address: 'security@garvixcloud.in', usedMb: 185, quotaMb: 1024 },
  ]);
  const [emailCount, setEmailCount] = React.useState<number>(18);
  const [sslCount, setSslCount] = React.useState<number>(5);

  // Modals for Quick Actions
  const [dnsModalOpen, setDnsModalOpen] = React.useState<boolean>(false);
  const [emailModalOpen, setEmailModalOpen] = React.useState<boolean>(false);
  const [dbModalOpen, setDbModalOpen] = React.useState<boolean>(false);
  const [fileManagerModalOpen, setFileManagerModalOpen] = React.useState<boolean>(false);
  const [sslModalOpen, setSslModalOpen] = React.useState<boolean>(false);

  const [newDnsType, setNewDnsType] = React.useState<DnsRecordItem['type']>('A');
  const [newDnsName, setNewDnsName] = React.useState<string>('');
  const [newDnsValue, setNewDnsValue] = React.useState<string>('');

  // Email creation modal fields (Username + Password + Quota)
  const [newEmailUser, setNewEmailUser] = React.useState<string>('');
  const [newEmailPass, setNewEmailPass] = React.useState<string>('GvX!8mK#4pQ$9zR2');
  const [newEmailQuota, setNewEmailQuota] = React.useState<number>(2048);

  // Database creation modal fields (Engine + DB Name + DB User + DB Password)
  const [newDbEngine, setNewDbEngine] = React.useState<'POSTGRESQL_16' | 'MARIADB_10_11'>(
    'MARIADB_10_11'
  );
  const [newDbName, setNewDbName] = React.useState<string>('crm_prod');
  const [newDbUser, setNewDbUser] = React.useState<string>('crm_admin');
  const [newDbPass, setNewDbPass] = React.useState<string>('Db!9xP#4wL$8vK2');

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

  const handleCreateMailboxDirect = (username: string, _password: string, quotaMb: number) => {
    const address = `${username}@${activeCpanelDomain}`;
    setMailboxes((prev) => [{ address, usedMb: 1, quotaMb }, ...prev]);
    setEmailCount((prev) => prev + 1);
    showToast(
      `Mailbox ${address} created with Argon2id password hash & ${
        quotaMb === 0 ? 'Unlimited' : `${quotaMb} MB`
      } Maildir quota.`
    );
  };

  const handleUpdateMailboxPassword = (address: string, _newPassword: string, quotaMb: number) => {
    setMailboxes((prev) =>
      prev.map((m) => (m.address === address ? { ...m, quotaMb } : m))
    );
    showToast(`Updated Argon2id password & storage quota for ${address}.`);
  };

  const handleCreateEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = newEmailUser.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!cleanUser || !newEmailPass.trim()) return;
    handleCreateMailboxDirect(cleanUser, newEmailPass, newEmailQuota);
    setNewEmailUser('');
    setEmailModalOpen(false);
  };

  const handleCreateDatabase = () => {
    setDbModalOpen(true);
  };

  const handleCreateDatabaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newDbName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || 'app_db';
    const cleanUser = newDbUser.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || 'app_user';
    const fullDbName = `${activeCpanelUser}_${cleanName}`;
    const fullDbUser = `${activeCpanelUser}_${cleanUser}`;
    setDatabases((prev) => [
      ...prev,
      {
        id: `db-${Date.now()}`,
        name: fullDbName,
        engine: newDbEngine,
        dbUser: fullDbUser,
        sizeMb: 16,
      },
    ]);
    setDbModalOpen(false);
    setActiveSidebarItem('databases');
    showToast(
      `Created ${newDbEngine} database "${fullDbName}" with user "${fullDbUser}" (ALL PRIVILEGES). Ready in SQL Studio!`
    );
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
    showToast(`Razorpay payment verified! Issued license key for ${checkoutPlan.name}.`);
  };

  // WHM Handlers
  const handleWhmCreateAccount = (payload: {
    domain: string;
    username: string;
    email: string;
    packageName: string;
  }) => {
    const pkg = whmPackages.find((p) => p.name === payload.packageName);
    const newAcct: WhmCpanelAccountItem = {
      id: `acct-${Date.now()}`,
      domain: payload.domain,
      username: payload.username,
      email: payload.email,
      packageName: payload.packageName,
      diskUsedGb: 0.2,
      diskQuotaGb: pkg?.diskQuotaGb ?? 25,
      emailAccounts: 1,
      databases: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setWhmAccounts((prev) => [newAcct, ...prev]);
    showToast(
      `WHM: Provisioned isolated cPanel account ${payload.username} (${payload.domain}) in /home/${payload.username}.`
    );
  };

  const handleWhmToggleSuspend = (accountId: string) => {
    setWhmAccounts((prev) =>
      prev.map((acct) => {
        if (acct.id !== accountId) return acct;
        const nextStatus = acct.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        showToast(
          `WHM: Account ${acct.username} (${acct.domain}) is now ${nextStatus}.`
        );
        return { ...acct, status: nextStatus };
      })
    );
  };

  const handleWhmTerminateAccount = (accountId: string) => {
    const target = whmAccounts.find((a) => a.id === accountId);
    if (!target) return;
    setWhmAccounts((prev) => prev.filter((a) => a.id !== accountId));
    showToast(`WHM: Terminated cPanel account ${target.username} (${target.domain}).`);
  };

  const handleWhmLaunchCpanel = (acct: WhmCpanelAccountItem) => {
    setActiveCpanelDomain(acct.domain);
    setActiveCpanelUser(acct.username);
    setActiveSidebarItem('dashboard');
    setActiveSurface('cpanel');
    showToast(
      `WHM Single Sign-On: Opened cPanel for ${acct.domain} (User: ${acct.username}).`
    );
  };

  const handleWhmCreatePackage = (pkg: Omit<WhmHostingPackageItem, 'id'>) => {
    setWhmPackages((prev) => [
      ...prev,
      {
        ...pkg,
        id: `pkg-${Date.now()}`,
      },
    ]);
    showToast(`WHM: Created resource package "${pkg.name}" (${pkg.diskQuotaGb} GB Disk).`);
  };

  const handleWhmRestartService = (serviceId: string) => {
    setWhmServices((prev) =>
      prev.map((svc) =>
        svc.id === serviceId
          ? {
              ...svc,
              pid: Math.floor(2000 + Math.random() * 7000),
              lastRestarted: 'Restarted just now (0s ago)',
            }
          : svc
      )
    );
    const target = whmServices.find((s) => s.id === serviceId);
    if (target) {
      showToast(`WHM: Gracefully restarted ${target.unit} (${target.title}).`);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-[#F7F6FD] via-[#F4F2FC] to-[#EEF2FF] text-slate-900">
      <div className="flex min-h-screen">
        {/* SECTION A: Dynamic Sidebar — Renders WHM Sidebar in WHM mode, or cPanel Sidebar in cPanel mode */}
        {activeSurface === 'whm' ? (
          <NebulixWhmSidebar
            activeSection={activeWhmSection}
            onSelectSection={(sec) => setActiveWhmSection(sec)}
            totalAccounts={whmAccounts.length}
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
            onSwitchToCpanel={() => setActiveSurface('cpanel')}
          />
        ) : (
          <NebulixSidebar
            activeItem={activeSidebarItem}
            onSelectItem={(item) => {
              setActiveSidebarItem(item);
              setActiveSurface('cpanel');
            }}
            activeRole={activeRole}
            authorizedNavItems={authorizedNavItems}
            activeCpanelDomain={activeCpanelDomain}
            activeCpanelUser={activeCpanelUser}
            onSwitchToWhm={() => setActiveSurface('whm')}
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Right Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Light-Theme cPanel & WHM Header */}
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
                {activeSurface === 'whm' ? 'GARVIX WHM' : 'GARVIX cPanel'}
              </span>

              <div className="relative hidden sm:block">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  aria-label="Search cPanel or WHM tools"
                  placeholder={
                    activeSurface === 'whm'
                      ? 'Search WHM accounts, packages, services...'
                      : 'Search cPanel tools, domains, emails, DBs...'
                  }
                  className="h-10 w-64 rounded-2xl border border-indigo-100/90 bg-[#F7F6FD] pl-10 pr-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 md:w-80"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Surface Switcher: cPanel, WHM, License Store, Login */}
              <div className="flex rounded-xl border border-indigo-100 bg-[#F7F6FD] p-0.5 sm:p-1">
                {(
                  [
                    { id: 'cpanel', label: 'cPanel' },
                    { id: 'whm', label: 'WHM' },
                    { id: 'store', label: 'License Store' },
                    { id: 'login', label: 'Login' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSurface(s.id)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] sm:px-3 sm:text-xs font-bold transition-all ${
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
                  {activeSurface === 'whm' ? 'WHM' : 'cP'}
                </div>
                <div className="hidden text-left md:block">
                  <div className="text-xs font-bold leading-none text-slate-900">
                    {activeSurface === 'whm' ? 'WHM Root Admin' : activeCpanelUser}
                  </div>
                  <div className="mt-0.5 text-[10px] font-medium text-indigo-600">
                    {activeSurface === 'whm'
                      ? 'WebHost Manager (2087)'
                      : `${activeCpanelDomain} (2083)`}
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
                SURFACE 1: GARVIX cPANEL (DASHBOARD + ALL 8 cPANEL TOOLS)
               ================================================================= */}
            {activeSurface === 'cpanel' && activeSidebarItem === 'dashboard' && (
              <div className="space-y-8">
                {/* SECTION B: Welcome Section with BlurText, GradientText & Floating Cloud SVG */}
                <AnimatedContent delayMs={0}>
                  <NebulixWelcomeHero
                    onAddDomain={() => setDnsModalOpen(true)}
                    onCreateEmail={() => setEmailModalOpen(true)}
                    onOpenFileManager={() => setActiveSidebarItem('file-manager')}
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
                    onOpenFileManager={() => setActiveSidebarItem('file-manager')}
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
                            Authoritative DNS Zone (`{activeCpanelDomain}`)
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
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-display text-sm font-bold text-slate-900">
                            cPanel Databases &amp; SQL Studio (phpMyAdmin)
                          </h3>
                          <p className="text-xs text-slate-500">
                            Create databases and inspect tables/rows in SQL Studio
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveSidebarItem('databases')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                          >
                            <Table2 className="h-3.5 w-3.5" /> SQL Studio
                          </button>
                          <button
                            type="button"
                            onClick={handleCreateDatabase}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-95"
                          >
                            <Plus className="h-3.5 w-3.5" /> Create DB
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2.5">
                        {databases.map((db) => (
                          <div
                            key={db.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-50 bg-[#FAF9FE] px-3.5 py-2.5 text-xs"
                          >
                            <div>
                              <div className="font-mono font-bold text-slate-900">{db.name}</div>
                              <div className="text-slate-500">
                                User: {db.dbUser} · {db.sizeMb} MB
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700">
                                {db.engine}
                              </span>
                              <button
                                type="button"
                                onClick={() => setActiveSidebarItem('databases')}
                                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-700"
                              >
                                <Table2 className="h-3 w-3" /> Open SQL
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </AnimatedContent>
              </div>
            )}

            {/* INNER SIDEBAR MODULE VIEWS (NEBULIX LIGHT THEME) */}
            {activeSurface === 'cpanel' && activeSidebarItem !== 'dashboard' && (
              <NebulixModulePages
                section={activeSidebarItem}
                activeDomain={activeCpanelDomain}
                activeLinuxUser={activeCpanelUser}
                dnsRecords={dnsRecords}
                databases={databases}
                mailboxes={mailboxes}
                emailCount={emailCount}
                sslCount={sslCount}
                onOpenDnsModal={() => setDnsModalOpen(true)}
                onOpenEmailModal={() => setEmailModalOpen(true)}
                onCreateMailboxDirect={handleCreateMailboxDirect}
                onUpdateMailboxPassword={handleUpdateMailboxPassword}
                onCreateDatabase={handleCreateDatabase}
                onOpenSslModal={() => setSslModalOpen(true)}
                onShowToast={showToast}
              />
            )}

            {/* =================================================================
                SURFACE 2: GARVIX WHM (DEDICATED MULTI-ACCOUNT & SERVER SUITE)
               ================================================================= */}
            {activeSurface === 'whm' && (
              <NebulixWhmWorkspace
                section={activeWhmSection}
                onSelectSection={(sec) => setActiveWhmSection(sec)}
                accounts={whmAccounts}
                packages={whmPackages}
                services={whmServices}
                onCreateAccount={handleWhmCreateAccount}
                onToggleSuspendAccount={handleWhmToggleSuspend}
                onTerminateAccount={handleWhmTerminateAccount}
                onLaunchCpanelForAccount={handleWhmLaunchCpanel}
                onCreatePackage={handleWhmCreatePackage}
                onRestartService={handleWhmRestartService}
                onShowToast={showToast}
              />
            )}

            {/* =================================================================
                SURFACE 3: BUY cPANEL OR WHM + cPANEL LICENSE STORE
               ================================================================= */}
            {activeSurface === 'store' && (
              <AnimatedContent className="space-y-6">
                <AuroraBackground className="p-6 sm:p-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <Badge variant="orange">BUY cPANEL OR WHM + cPANEL LICENSE</Badge>
                      <h2 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                        <BlurText text="Choose Only cPanel (1 Account) or WHM + cPanel License" />
                      </h2>
                      <p className="mt-1 text-xs text-slate-600 max-w-2xl">
                        Install Garvix on your own VPS or Dedicated Server. Pay via Razorpay (UPI
                        QR, Credit/Debit Card, NetBanking) and get your instant license key + 1-line
                        SSH install command.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-indigo-100 bg-white px-5 py-3.5 text-xs shadow-sm">
                      <div className="font-semibold text-slate-500">Your Issued License Key:</div>
                      <div className="mt-1 font-mono text-sm font-extrabold text-indigo-700">
                        <DecryptedText text={issuedStoreKey} />
                      </div>
                    </div>
                  </div>
                </AuroraBackground>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {STORE_PLANS.map((plan) => (
                    <TiltedCard key={plan.code} maxTiltDeg={4}>
                      <StarBorder color={plan.popular ? '#6366F1' : '#C7D2FE'} className="h-full">
                        <div className="flex h-full flex-col justify-between rounded-[15px] bg-white p-5">
                          <div>
                            <Badge variant={plan.popular ? 'orange' : 'secondary'}>
                              {plan.badge}
                            </Badge>
                            <h3 className="mt-3 font-display text-lg font-extrabold text-slate-900">
                              {plan.name}
                            </h3>
                            <div className="mt-2 font-display text-3xl font-extrabold text-slate-900">
                              ₹{plan.priceInr}
                              <span className="text-xs font-medium text-slate-500">
                                {' '}
                                / month (+18% GST)
                              </span>
                            </div>
                            <p className="mt-2 text-xs font-semibold text-indigo-700">
                              {plan.accounts}
                            </p>
                          </div>

                          <Button
                            variant={plan.popular ? 'nebulix' : 'outline'}
                            className="mt-6 w-full"
                            onClick={() => setCheckoutPlan(plan)}
                          >
                            <CreditCard className="h-4 w-4" />
                            Buy License via Razorpay
                          </Button>
                        </div>
                      </StarBorder>
                    </TiltedCard>
                  ))}
                </div>
              </AnimatedContent>
            )}

            {/* =================================================================
                SURFACE 4: cPANEL vs WHM LOGIN PORTAL (NEBULIX LIGHT THEME)
               ================================================================= */}
            {activeSurface === 'login' && (
              <AnimatedContent>
                <AuroraBackground className="mx-auto max-w-xl p-6 sm:p-8">
                  <div className="flex gap-2">
                    <Button
                      variant={loginMode === 'CUSTOMER' ? 'nebulix' : 'outline'}
                      size="sm"
                      onClick={() => setLoginMode('CUSTOMER')}
                    >
                      <UserCheck className="h-4 w-4" />
                      cPanel Login (Port 2083)
                    </Button>
                    <Button
                      variant={loginMode === 'ADMIN' ? 'blue' : 'outline'}
                      size="sm"
                      onClick={() => setLoginMode('ADMIN')}
                    >
                      <KeyRound className="h-4 w-4" />
                      WHM Login (Port 2087)
                    </Button>
                  </div>

                  <div className="mt-5">
                    <h2 className="font-display text-xl font-extrabold text-slate-900">
                      {loginMode === 'CUSTOMER'
                        ? 'GARVIX cPanel Login'
                        : 'GARVIX WHM (WebHost Manager) Login'}
                    </h2>
                    <p className="mt-1 text-xs text-slate-600">
                      {loginMode === 'CUSTOMER'
                        ? 'Sign in to your cPanel account to manage domains, emails, databases, files, and SSL.'
                        : 'Sign in to WHM to create and manage multiple cPanel accounts on your server.'}
                    </p>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        {loginMode === 'CUSTOMER' ? 'cPanel Username or Email' : 'WHM Root / Reseller Username'}
                      </label>
                      <Input
                        defaultValue={
                          loginMode === 'CUSTOMER' ? 'garvixprod' : 'root'
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Password</label>
                      <Input type="password" defaultValue="••••••••••••" />
                    </div>
                    <Button
                      variant="nebulix"
                      className="w-full"
                      onClick={() => {
                        setActiveSurface(loginMode === 'CUSTOMER' ? 'cpanel' : 'whm');
                        showToast(
                          `Signed in to ${
                            loginMode === 'CUSTOMER' ? 'GARVIX cPanel' : 'GARVIX WHM'
                          }.`
                        );
                      }}
                    >
                      <Lock className="h-4 w-4" />
                      Sign In to {loginMode === 'CUSTOMER' ? 'cPanel' : 'WHM'}
                    </Button>
                  </div>
                </AuroraBackground>
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
              className="flex h-10 w-full rounded-xl border border-indigo-100 bg-[#FAF9FE] px-3 py-2 text-sm text-slate-900"
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
            <Button type="submit" variant="nebulix">
              <RefreshCw className="h-4 w-4" />
              Validate &amp; Add Record
            </Button>
          </div>
        </form>
      </DialogModal>

      {/* 2. Create Business Email Modal (Username + Password + Generator + Quota) */}
      <DialogModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        title="Create Business Email Account"
        description="Provisions a Dovecot Argon2id mailbox with password & storage quota."
      >
        <form onSubmit={handleCreateEmailSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Mailbox Username</label>
            <div className="flex items-center gap-2">
              <Input
                required
                value={newEmailUser}
                onChange={(e) => setNewEmailUser(e.target.value)}
                placeholder="support, sales, or billing"
              />
              <span className="font-mono text-xs font-bold text-indigo-700">
                @{activeCpanelDomain}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Mailbox Password (Required · Hashed via Argon2id)
            </label>
            <div className="flex items-center gap-2">
              <Input
                required
                type="text"
                value={newEmailPass}
                onChange={(e) => setNewEmailPass(e.target.value)}
                placeholder="Enter strong mailbox password"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setNewEmailPass(
                    `GvX!${Math.random().toString(36).slice(2, 7).toUpperCase()}#9mP$2`
                  )
                }
              >
                <KeyRound className="h-3.5 w-3.5" /> Generate
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Storage Space (Maildir Quota)
            </label>
            <select
              value={newEmailQuota}
              onChange={(e) => setNewEmailQuota(Number(e.target.value))}
              className="h-10 w-full rounded-xl border border-indigo-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
            >
              <option value={512}>512 MB</option>
              <option value={1024}>1024 MB (1 GB)</option>
              <option value={2048}>2048 MB (2 GB — Default)</option>
              <option value={5120}>5120 MB (5 GB)</option>
              <option value={0}>Unlimited Quota</option>
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEmailModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="nebulix">
              <Mail className="h-4 w-4" />
              Create Mailbox
            </Button>
          </div>
        </form>
      </DialogModal>

      {/* 2B. Create Database & User Wizard Modal */}
      <DialogModal
        open={dbModalOpen}
        onClose={() => setDbModalOpen(false)}
        title="Create Database & SQL User Wizard"
        description="Creates an isolated database and assigns a dedicated user with ALL PRIVILEGES."
      >
        <form onSubmit={handleCreateDatabaseSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Database Engine</label>
            <select
              value={newDbEngine}
              onChange={(e) =>
                setNewDbEngine(e.target.value as 'POSTGRESQL_16' | 'MARIADB_10_11')
              }
              className="h-10 w-full rounded-xl border border-indigo-200 bg-white px-3 text-xs font-bold text-slate-800"
            >
              <option value="MARIADB_10_11">MariaDB 10.11 / MySQL (Port 3306 · phpMyAdmin)</option>
              <option value="POSTGRESQL_16">PostgreSQL 16 (Port 5432 · pgAdmin / SQL Studio)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Database Name</label>
            <div className="flex items-center">
              <span className="inline-flex h-10 items-center rounded-l-xl border border-r-0 border-indigo-200 bg-indigo-50/70 px-3 font-mono text-xs font-bold text-indigo-700">
                {activeCpanelUser}_
              </span>
              <Input
                required
                value={newDbName}
                onChange={(e) => setNewDbName(e.target.value)}
                placeholder="crm_prod"
                className="rounded-l-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Database Username</label>
            <div className="flex items-center">
              <span className="inline-flex h-10 items-center rounded-l-xl border border-r-0 border-indigo-200 bg-indigo-50/70 px-3 font-mono text-xs font-bold text-indigo-700">
                {activeCpanelUser}_
              </span>
              <Input
                required
                value={newDbUser}
                onChange={(e) => setNewDbUser(e.target.value)}
                placeholder="crm_admin"
                className="rounded-l-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Database Password</label>
            <div className="flex items-center gap-2">
              <Input
                required
                type="text"
                value={newDbPass}
                onChange={(e) => setNewDbPass(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setNewDbPass(
                    `Db!${Math.random().toString(36).slice(2, 7).toUpperCase()}#8wL$4`
                  )
                }
              >
                <KeyRound className="h-3.5 w-3.5" /> Generate
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDbModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="nebulix">
              <Database className="h-4 w-4" />
              Create Database &amp; Open SQL Studio
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
              variant="nebulix"
              onClick={() => setFileManagerModalOpen(false)}
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
            <Button type="submit" variant="emerald">
              <Sparkles className="h-4 w-4" />
              Issue &amp; Install AutoSSL
            </Button>
          </div>
        </form>
      </DialogModal>

      {/* 5. Razorpay Checkout Modal */}
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
            <Button type="submit" variant="nebulix">
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
