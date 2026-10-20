import * as React from 'react';
import {
  ServerCog,
  Users,
  UserPlus,
  PackagePlus,
  Activity,
  ShieldAlert,
  CloudDownload,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Trash2,
  RotateCw,
  ExternalLink,
  Plus,
  Sparkles,
  ChevronRight,
  X,
  HardDrive,
  Cpu,
  Lock,
  Layers,
} from 'lucide-react';
import {
  Button,
  Badge,
  Input,
  SpotlightCard,
  BlurText,
  CountUp,
  AnimatedContent,
  AuroraBackground,
  GradientText,
} from '@garvix/ui-components';

export type NebulixWhmSectionId =
  | 'whm-overview'
  | 'whm-list-accounts'
  | 'whm-create-account'
  | 'whm-packages'
  | 'whm-services'
  | 'whm-multiphp-security'
  | 'whm-backups';

export interface WhmCpanelAccountItem {
  id: string;
  domain: string;
  username: string;
  email: string;
  packageName: string;
  diskUsedGb: number;
  diskQuotaGb: number;
  emailAccounts: number;
  databases: number;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface WhmHostingPackageItem {
  id: string;
  name: string;
  diskQuotaGb: number;
  bandwidthGb: number;
  maxEmails: number;
  maxDatabases: number;
  maxDomains: number;
}

export interface WhmServiceDaemonItem {
  id: string;
  unit: string;
  title: string;
  description: string;
  pid: number;
  memoryMb: number;
  status: 'RUNNING' | 'RESTARTING';
  lastRestarted: string;
}

export const NEBULIX_WHM_SIDEBAR_ITEMS: readonly {
  id: NebulixWhmSectionId;
  label: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'whm-overview', label: 'WHM Dashboard', badge: 'Root', icon: ServerCog },
  { id: 'whm-list-accounts', label: 'List cPanel Accounts', badge: '[cP]', icon: Users },
  { id: 'whm-create-account', label: 'Create cPanel Account', badge: '+ New', icon: UserPlus },
  { id: 'whm-packages', label: 'Packages & Quotas', icon: PackagePlus },
  { id: 'whm-services', label: 'Service Manager', badge: '6 Active', icon: Activity },
  { id: 'whm-multiphp-security', label: 'Multi-PHP & Security', icon: ShieldAlert },
  { id: 'whm-backups', label: 'Master Server Backups', badge: 'Bulk', icon: CloudDownload },
];

export interface NebulixWhmSidebarProps {
  activeSection: NebulixWhmSectionId;
  onSelectSection: (section: NebulixWhmSectionId) => void;
  totalAccounts: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSwitchToCpanel: () => void;
}

export const NebulixWhmSidebar: React.FC<NebulixWhmSidebarProps> = ({
  activeSection,
  onSelectSection,
  totalAccounts,
  mobileOpen,
  onCloseMobile,
  onSwitchToCpanel,
}) => {
  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white/95 px-4 py-6 backdrop-blur-xl">
      <div>
        {/* GARVIX WHM Brand Header */}
        <div className="flex items-center justify-between px-2 pb-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-700 via-violet-600 to-blue-600 text-white shadow-[0_8px_22px_-4px_rgba(79,70,229,0.55)]">
              <span className="font-display text-sm font-extrabold tracking-tight">WHM</span>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-lg font-extrabold tracking-tight text-slate-900">
                  GARVIX
                </span>
                <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                  WHM
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">WebHost Manager · Port 2087</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close WHM navigation"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Master Server Status Card */}
        <div className="mb-5 rounded-2xl border border-indigo-100 bg-gradient-to-r from-[#F5F3FF] via-[#EEF2FF] to-[#EFF6FF] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              WHM Master Server
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Root Active
            </span>
          </div>
          <div className="mt-1 truncate font-mono text-xs font-bold text-slate-900">
            whm.garvixcloud.in
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {totalAccounts} cPanel Accounts Managed
          </div>
        </div>

        {/* WHM Navigation Links */}
        <div className="space-y-1">
          <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            WHM Multi-Account Administration
          </div>
          <nav aria-label="WHM Navigation" className="space-y-1">
            {NEBULIX_WHM_SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              const badgeText =
                item.id === 'whm-list-accounts' ? `${totalAccounts} [cP]` : item.badge;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectSection(item.id);
                    onCloseMobile();
                  }}
                  className={`group relative flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-[0_8px_20px_-6px_rgba(99,102,241,0.55)]'
                      : 'text-slate-600 hover:bg-indigo-50/80 hover:text-indigo-950'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100/90 text-slate-600 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="tracking-tight">{item.label}</span>
                  </span>

                  <span className="flex items-center gap-1.5">
                    {badgeText && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100/80'
                        }`}
                      >
                        {badgeText}
                      </span>
                    )}
                    <ChevronRight
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        isActive
                          ? 'translate-x-0.5 text-white'
                          : 'text-slate-300 opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100'
                      }`}
                    />
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom WHM License & Quick Switch to cPanel */}
      <div className="mt-6 space-y-2.5">
        <button
          type="button"
          onClick={onSwitchToCpanel}
          className="flex w-full items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/80 px-3.5 py-2.5 text-xs font-bold text-indigo-800 transition-colors hover:bg-indigo-100"
        >
          <span>Open Active cPanel (2083)</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>

        <div className="rounded-2xl border border-indigo-100/90 bg-gradient-to-br from-violet-50/90 via-indigo-50/60 to-blue-50/90 p-3.5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span>WHM + cPanel Multi-Account</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
            Create isolated cPanel accounts, set quota packages &amp; control server daemons.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-[272px] shrink-0 border-r border-indigo-100/80 bg-white/90 shadow-[4px_0_30px_-15px_rgba(99,102,241,0.10)] lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">{sidebarContent}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 h-full w-[280px] max-w-[85vw] overflow-y-auto border-r border-indigo-100 bg-white shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};

export interface NebulixWhmWorkspaceProps {
  section: NebulixWhmSectionId;
  onSelectSection: (section: NebulixWhmSectionId) => void;
  accounts: WhmCpanelAccountItem[];
  packages: WhmHostingPackageItem[];
  services: WhmServiceDaemonItem[];
  onCreateAccount: (payload: {
    domain: string;
    username: string;
    email: string;
    packageName: string;
  }) => void;
  onToggleSuspendAccount: (accountId: string) => void;
  onTerminateAccount: (accountId: string) => void;
  onLaunchCpanelForAccount: (account: WhmCpanelAccountItem) => void;
  onCreatePackage: (pkg: Omit<WhmHostingPackageItem, 'id'>) => void;
  onRestartService: (serviceId: string) => void;
  onShowToast: (msg: string) => void;
}

export const NebulixWhmWorkspace: React.FC<NebulixWhmWorkspaceProps> = ({
  section,
  onSelectSection,
  accounts,
  packages,
  services,
  onCreateAccount,
  onToggleSuspendAccount,
  onTerminateAccount,
  onLaunchCpanelForAccount,
  onCreatePackage,
  onRestartService,
  onShowToast,
}) => {
  // Local form states for Create cPanel Account
  const [newDomain, setNewDomain] = React.useState('');
  const [newUsername, setNewUsername] = React.useState('');
  const [newEmail, setNewEmail] = React.useState('');
  const [selectedPkg, setSelectedPkg] = React.useState(
    packages[1]?.name ?? 'Business 25GB'
  );

  // Local form states for Create Package
  const [pkgName, setPkgName] = React.useState('');
  const [pkgDisk, setPkgDisk] = React.useState('20');
  const [pkgBw, setPkgBw] = React.useState('500');
  const [pkgEmails, setPkgEmails] = React.useState('30');
  const [pkgDbs, setPkgDbs] = React.useState('10');

  // Search filter for List Accounts
  const [accountFilter, setAccountFilter] = React.useState('');

  const activeCount = accounts.filter((a) => a.status === 'ACTIVE').length;
  const suspendedCount = accounts.filter((a) => a.status === 'SUSPENDED').length;

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim() || !newUsername.trim()) return;
    onCreateAccount({
      domain: newDomain.trim().toLowerCase(),
      username: newUsername.trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
      email: newEmail.trim() || `admin@${newDomain.trim().toLowerCase()}`,
      packageName: selectedPkg,
    });
    setNewDomain('');
    setNewUsername('');
    setNewEmail('');
    onSelectSection('whm-list-accounts');
  };

  const handlePackageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgName.trim()) return;
    onCreatePackage({
      name: pkgName.trim(),
      diskQuotaGb: Number(pkgDisk) || 10,
      bandwidthGb: Number(pkgBw) || 200,
      maxEmails: Number(pkgEmails) || 10,
      maxDatabases: Number(pkgDbs) || 5,
      maxDomains: 10,
    });
    setPkgName('');
  };

  const filteredAccounts = accounts.filter(
    (a) =>
      a.domain.toLowerCase().includes(accountFilter.toLowerCase()) ||
      a.username.toLowerCase().includes(accountFilter.toLowerCase()) ||
      a.packageName.toLowerCase().includes(accountFilter.toLowerCase())
  );

  /* ============================================================================
     1. WHM OVERVIEW DASHBOARD
     ============================================================================ */
  if (section === 'whm-overview') {
    return (
      <AnimatedContent className="space-y-8">
        {/* WHM Hero Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-indigo-100/90 bg-gradient-to-br from-white via-[#F6F4FF] to-[#EEF4FF] p-6 shadow-[0_18px_50px_-15px_rgba(99,102,241,0.16)] sm:p-8">
          <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="space-y-4">
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-indigo-200/80 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs">
                <ServerCog className="h-3.5 w-3.5 text-violet-600" />
                <span>GARVIX WHM (WebHost Manager · Port 2087)</span>
                <span className="text-slate-300">•</span>
                <GradientText
                  colors={['#7C3AED', '#4F46E5', '#2563EB', '#7C3AED']}
                  className="text-xs font-bold"
                >
                  Multi-Account Server Administration
                </GradientText>
              </div>

              <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                <BlurText
                  text="Create & Manage Multiple Isolated cPanel Accounts on Your Server."
                  delayMs={30}
                />
              </h1>

              <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
                With your <strong>WHM + cPanel License</strong>, you can create separate cPanel
                logins for every client or website, assign Disk/Bandwidth packages, suspend or
                terminate accounts in 1 click, and restart server services.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  variant="nebulix"
                  onClick={() => onSelectSection('whm-create-account')}
                >
                  <UserPlus className="h-4 w-4" /> + Create New cPanel Account
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onSelectSection('whm-list-accounts')}
                >
                  <Users className="h-4 w-4 text-indigo-600" /> List All cPanel Accounts ({accounts.length})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onSelectSection('whm-packages')}
                >
                  <PackagePlus className="h-4 w-4 text-violet-600" /> Manage Quota Packages
                </Button>
              </div>
            </div>

            {/* Right Summary Box: Why WHM */}
            <div className="w-full max-w-sm rounded-2xl border border-indigo-100 bg-white/90 p-5 shadow-sm">
              <div className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">
                What WHM Gives You Over Solo cPanel
              </div>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Create multiple isolated cPanel accounts (`/home/user`)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>1-Click `[cP] Open cPanel` without client password</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Suspend, Unsuspend &amp; Terminate client accounts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Custom Disk, Bandwidth, Email &amp; DB Packages</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Restart Nginx, MySQL, PostgreSQL, PHP-FPM &amp; Mail</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* WHM KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SpotlightCard className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total cPanel Accounts
              </span>
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="mt-2 font-display text-3xl font-extrabold text-slate-900">
              <CountUp to={accounts.length} />
            </div>
            <p className="mt-1 text-xs font-semibold text-emerald-700">
              {activeCount} Active · {suspendedCount} Suspended
            </p>
          </SpotlightCard>

          <SpotlightCard className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Hosting Packages
              </span>
              <PackagePlus className="h-5 w-5 text-violet-600" />
            </div>
            <div className="mt-2 font-display text-3xl font-extrabold text-slate-900">
              <CountUp to={packages.length} />
            </div>
            <p className="mt-1 text-xs text-slate-500">Custom Disk &amp; Quota Templates</p>
          </SpotlightCard>

          <SpotlightCard className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Server Daemons
              </span>
              <Activity className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="mt-2 font-display text-3xl font-extrabold text-slate-900">
              <CountUp to={services.length} suffix=" / 6" />
            </div>
            <p className="mt-1 text-xs font-semibold text-emerald-700">
              Nginx, PHP-FPM, DB &amp; Mail Healthy
            </p>
          </SpotlightCard>

          <SpotlightCard className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Server Disk Allocated
              </span>
              <HardDrive className="h-5 w-5 text-blue-600" />
            </div>
            <div className="mt-2 font-display text-3xl font-extrabold text-slate-900">
              <CountUp
                to={accounts.reduce((acc, item) => acc + item.diskUsedGb, 0)}
                decimals={1}
                suffix=" GB"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">of 200 GB Server NVMe Capacity</p>
          </SpotlightCard>
        </div>

        {/* Quick List of Accounts on WHM Dashboard */}
        <div className="rounded-2xl border border-indigo-100/90 bg-white p-6 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
            <div>
              <h2 className="font-display text-base font-extrabold text-slate-900">
                cPanel Accounts on This Server (`whm.garvixcloud.in`)
              </h2>
              <p className="text-xs text-slate-500">
                Click <strong>[cP] Open cPanel</strong> to log directly into any client’s cPanel, or
                suspend/unsuspend access.
              </p>
            </div>
            <Button size="sm" variant="nebulix" onClick={() => onSelectSection('whm-create-account')}>
              <Plus className="h-3.5 w-3.5" /> Create cPanel Account
            </Button>
          </div>

          <div className="space-y-2.5">
            {accounts.map((acct) => (
              <div
                key={acct.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-50 bg-[#FAF9FE] p-4 text-xs transition-colors hover:border-indigo-200"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {acct.domain}
                    </span>
                    <Badge variant={acct.status === 'ACTIVE' ? 'success' : 'destructive'}>
                      {acct.status}
                    </Badge>
                    <Badge variant="secondary">{acct.packageName}</Badge>
                  </div>
                  <div className="text-slate-500">
                    cPanel User: <span className="font-mono font-bold text-indigo-700">{acct.username}</span>{' '}
                    · Home: <span className="font-mono">/home/{acct.username}</span> · Disk:{' '}
                    <span className="font-semibold text-slate-700">
                      {acct.diskUsedGb} GB / {acct.diskQuotaGb} GB
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="nebulix"
                    onClick={() => onLaunchCpanelForAccount(acct)}
                  >
                    [cP] Open cPanel
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onToggleSuspendAccount(acct.id)}
                  >
                    {acct.status === 'ACTIVE' ? (
                      <>
                        <PauseCircle className="h-3.5 w-3.5 text-amber-600" /> Suspend
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-3.5 w-3.5 text-emerald-600" /> Unsuspend
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedContent>
    );
  }

  /* ============================================================================
     2. WHM LIST cPANEL ACCOUNTS (FULL MANAGEMENT TABLE)
     ============================================================================ */
  if (section === 'whm-list-accounts') {
    return (
      <AnimatedContent className="space-y-6">
        <AuroraBackground className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge variant="orange">WHM ACCOUNT FUNCTIONS · LIST ACCOUNTS</Badge>
              <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                <BlurText text="List & Control All cPanel Accounts on Your Server" />
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                1-Click Single Sign-On (`[cP] Open cPanel`), Suspend unpaid/abusive accounts, or
                Terminate accounts cleanly.
              </p>
            </div>
            <Button variant="nebulix" onClick={() => onSelectSection('whm-create-account')}>
              <UserPlus className="h-4 w-4" /> + Create New cPanel Account
            </Button>
          </div>
        </AuroraBackground>

        <div className="rounded-2xl border border-indigo-100/90 bg-white p-6 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              placeholder="Filter accounts by domain, username, or package..."
              className="max-w-md"
            />
            <div className="text-xs font-semibold text-slate-500">
              Showing {filteredAccounts.length} of {accounts.length} cPanel accounts
            </div>
          </div>

          <div className="space-y-3">
            {filteredAccounts.map((acct) => (
              <div
                key={acct.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-100/80 bg-[#FAF9FE] p-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-extrabold text-slate-900">
                      {acct.domain}
                    </span>
                    <Badge variant={acct.status === 'ACTIVE' ? 'success' : 'destructive'}>
                      {acct.status}
                    </Badge>
                    <Badge variant="secondary">{acct.packageName}</Badge>
                  </div>
                  <div className="text-slate-600">
                    Username: <span className="font-mono font-bold text-indigo-700">{acct.username}</span>{' '}
                    · Email: <span className="font-mono">{acct.email}</span> · Created: {acct.createdAt}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Disk: <strong>{acct.diskUsedGb} / {acct.diskQuotaGb} GB</strong> · Mailboxes:{' '}
                    <strong>{acct.emailAccounts}</strong> · Databases: <strong>{acct.databases}</strong>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="nebulix"
                    onClick={() => onLaunchCpanelForAccount(acct)}
                  >
                    [cP] Open cPanel
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onToggleSuspendAccount(acct.id)}
                  >
                    {acct.status === 'ACTIVE' ? (
                      <>
                        <PauseCircle className="h-3.5 w-3.5 text-amber-600" /> Suspend
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-3.5 w-3.5 text-emerald-600" /> Unsuspend
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onTerminateAccount(acct.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" /> Terminate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedContent>
    );
  }

  /* ============================================================================
     3. WHM CREATE A NEW cPANEL ACCOUNT
     ============================================================================ */
  if (section === 'whm-create-account') {
    return (
      <AnimatedContent className="space-y-6">
        <AuroraBackground className="p-6 sm:p-8">
          <Badge variant="orange">WHM ACCOUNT FUNCTIONS · CREATE A NEW cPANEL ACCOUNT</Badge>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
            <BlurText text="Create a New Isolated cPanel Account" />
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Creates a dedicated Linux user (`/home/username`), Nginx HTTP/3 VirtualHost, PHP-FPM
            pool, Bind9 DNS zone, and cPanel login for your client or website.
          </p>
        </AuroraBackground>

        <form
          onSubmit={handleAccountSubmit}
          className="mx-auto max-w-2xl rounded-2xl border border-indigo-100/90 bg-white p-6 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)] space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Primary Domain Name</label>
              <Input
                required
                placeholder="clientcompany.in"
                value={newDomain}
                onChange={(e) => {
                  setNewDomain(e.target.value);
                  if (!newUsername) {
                    setNewUsername(
                      e.target.value
                        .split('.')[0]
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, '')
                        .slice(0, 12)
                    );
                  }
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                cPanel Username (Linux User)
              </label>
              <Input
                required
                placeholder="clientco"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Client Contact Email</label>
              <Input
                type="email"
                placeholder="owner@clientcompany.in"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">cPanel Password</label>
              <Input type="password" defaultValue="Garvix#cPanel2026!" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Select WHM Resource Package
            </label>
            <select
              value={selectedPkg}
              onChange={(e) => setSelectedPkg(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-indigo-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900"
            >
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.name}>
                  {pkg.name} — {pkg.diskQuotaGb} GB Disk · {pkg.bandwidthGb} GB Bandwidth ·{' '}
                  {pkg.maxEmails} Emails · {pkg.maxDatabases} DBs
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onSelectSection('whm-list-accounts')}
            >
              Cancel
            </Button>
            <Button type="submit" variant="nebulix">
              <UserPlus className="h-4 w-4" /> Provision cPanel Account Now
            </Button>
          </div>
        </form>
      </AnimatedContent>
    );
  }

  /* ============================================================================
     4. WHM PACKAGES & QUOTAS CREATOR
     ============================================================================ */
  if (section === 'whm-packages') {
    return (
      <AnimatedContent className="space-y-6">
        <AuroraBackground className="p-6 sm:p-8">
          <Badge variant="orange">WHM PACKAGES · QUOTA &amp; LIMIT TEMPLATES</Badge>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
            <BlurText text="Create & Manage cPanel Resource Packages" />
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Define Disk Space, Bandwidth, Mailbox, and Database limits so no single client account
            can exhaust your server resources.
          </p>
        </AuroraBackground>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Existing Packages */}
          <div className="space-y-3">
            {packages.map((pkg) => (
              <SpotlightCard key={pkg.id} className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Layers className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-display text-base font-extrabold text-slate-900">
                      {pkg.name}
                    </h3>
                  </div>
                  <Badge variant="default">{pkg.diskQuotaGb} GB NVMe Quota</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-[#FAF9FE] p-3 text-xs text-slate-600">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">Bandwidth</div>
                    <div className="font-bold text-slate-900">{pkg.bandwidthGb} GB / mo</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">Max Emails</div>
                    <div className="font-bold text-slate-900">{pkg.maxEmails} Mailboxes</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">Max DBs</div>
                    <div className="font-bold text-slate-900">{pkg.maxDatabases} Databases</div>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>

          {/* Add New Package Form */}
          <form
            onSubmit={handlePackageSubmit}
            className="rounded-2xl border border-indigo-100/90 bg-white p-6 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)] space-y-4"
          >
            <h3 className="font-display text-base font-extrabold text-slate-900">
              + Add a New WHM Package
            </h3>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Package Name</label>
              <Input
                required
                placeholder="e.g. Agency Gold 50GB"
                value={pkgName}
                onChange={(e) => setPkgName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Disk Quota (GB)</label>
                <Input
                  type="number"
                  value={pkgDisk}
                  onChange={(e) => setPkgDisk(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Bandwidth (GB)</label>
                <Input type="number" value={pkgBw} onChange={(e) => setPkgBw(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Max Emails</label>
                <Input
                  type="number"
                  value={pkgEmails}
                  onChange={(e) => setPkgEmails(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Max Databases</label>
                <Input type="number" value={pkgDbs} onChange={(e) => setPkgDbs(e.target.value)} />
              </div>
            </div>
            <Button type="submit" variant="nebulix" className="w-full">
              <PackagePlus className="h-4 w-4" /> Save WHM Package
            </Button>
          </form>
        </div>
      </AnimatedContent>
    );
  }

  /* ============================================================================
     5. WHM SERVER SERVICE MANAGER (RESTART DAEMONS)
     ============================================================================ */
  if (section === 'whm-services') {
    return (
      <AnimatedContent className="space-y-6">
        <AuroraBackground className="p-6 sm:p-8">
          <Badge variant="orange">WHM SERVICE CONFIGURATION · SYSTEMD DAEMON CONTROL</Badge>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
            <BlurText text="Server Service Status & 1-Click Daemon Restart" />
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Only WHM Administrators can restart server-wide Web, Database, PHP-FPM, Mail, and DNS
            daemons.
          </p>
        </AuroraBackground>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((svc) => (
            <SpotlightCard key={svc.id} className="flex flex-col justify-between p-5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-700">{svc.unit}</span>
                  <Badge variant="success">{svc.status}</Badge>
                </div>
                <h3 className="mt-2 font-display text-sm font-extrabold text-slate-900">
                  {svc.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{svc.description}</p>
                <div className="mt-3 text-[11px] font-mono text-slate-500">
                  PID {svc.pid} · RAM {svc.memoryMb} MB · {svc.lastRestarted}
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="mt-4 w-full"
                onClick={() => onRestartService(svc.id)}
              >
                <RotateCw className="h-3.5 w-3.5 text-indigo-600" /> Restart {svc.title}
              </Button>
            </SpotlightCard>
          ))}
        </div>
      </AnimatedContent>
    );
  }

  /* ============================================================================
     6. WHM MULTI-PHP & SERVER SECURITY
     ============================================================================ */
  if (section === 'whm-multiphp-security') {
    return (
      <AnimatedContent className="space-y-6">
        <AuroraBackground className="p-6 sm:p-8">
          <Badge variant="orange">WHM SOFTWARE &amp; SECURITY CENTER</Badge>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
            <BlurText text="Multi-PHP Manager, cgroup v2 Limits & Firewall" />
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Configure server-wide PHP-FPM versions, per-account CPU/RAM isolation, and Fail2Ban
            brute-force protection.
          </p>
        </AuroraBackground>

        <div className="grid gap-4 sm:grid-cols-3">
          <SpotlightCard className="p-5 space-y-2.5">
            <Cpu className="h-6 w-6 text-violet-600" />
            <h3 className="font-display text-sm font-bold text-slate-900">
              Multi-PHP &amp; Node.js Engine
            </h3>
            <p className="text-xs text-slate-500">
              PHP 8.1, PHP 8.2, PHP 8.3 FPM pools + Node.js 20/22 LTS available to all cPanel
              accounts.
            </p>
            <Badge variant="success">All Runtimes Active</Badge>
          </SpotlightCard>

          <SpotlightCard className="p-5 space-y-2.5">
            <Lock className="h-6 w-6 text-indigo-600" />
            <h3 className="font-display text-sm font-bold text-slate-900">
              Linux UID &amp; cgroup v2 Isolation
            </h3>
            <p className="text-xs text-slate-500">
              Every cPanel account is locked inside `/home/username` (`chmod 0710` + `O_NOFOLLOW`) so
              clients cannot read each other’s files.
            </p>
            <Badge variant="success">Strict Isolation Enforced</Badge>
          </SpotlightCard>

          <SpotlightCard className="p-5 space-y-2.5">
            <ShieldAlert className="h-6 w-6 text-emerald-600" />
            <h3 className="font-display text-sm font-bold text-slate-900">
              ModSecurity WAF &amp; Fail2Ban
            </h3>
            <p className="text-xs text-slate-500">
              Automatic IP blocking for SSH, Dovecot/Postfix, and cPanel login brute-force attempts.
            </p>
            <Badge variant="success">Firewall Enforcing</Badge>
          </SpotlightCard>
        </div>
      </AnimatedContent>
    );
  }

  /* ============================================================================
     7. WHM MASTER SERVER BACKUPS (ALL cPANEL ACCOUNTS)
     ============================================================================ */
  return (
    <AnimatedContent className="space-y-6">
      <AuroraBackground className="p-6 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge variant="orange">WHM BACKUP CONFIGURATION · BULK SERVER BACKUPS</Badge>
            <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
              <BlurText text="Master Server Backups for All cPanel Accounts" />
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Automated nightly Restic AES-256-GCM backups across all {accounts.length} cPanel
              accounts on this server.
            </p>
          </div>
          <Button
            variant="nebulix"
            onClick={() =>
              onShowToast(
                `Started bulk server backup across all ${accounts.length} cPanel accounts.`
              )
            }
          >
            <CloudDownload className="h-4 w-4" /> Run Full Server Backup Now
          </Button>
        </div>
      </AuroraBackground>

      <div className="rounded-2xl border border-indigo-100/90 bg-white p-6 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)] space-y-3">
        {accounts.map((acct) => (
          <div
            key={acct.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-50 bg-[#FAF9FE] p-4 text-xs"
          >
            <div>
              <div className="font-mono font-bold text-slate-900">
                {acct.domain} (`{acct.username}`)
              </div>
              <div className="text-slate-500">
                Includes `/home/{acct.username}`, {acct.databases} Databases, and {acct.emailAccounts}{' '}
                Mailboxes ({acct.diskUsedGb} GB)
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Badge variant="success">NIGHTLY SNAPSHOT VERIFIED</Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onShowToast(`Restored cPanel account ${acct.username} (${acct.domain}) from WHM snapshot.`)
                }
              >
                Restore Account
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AnimatedContent>
  );
};
