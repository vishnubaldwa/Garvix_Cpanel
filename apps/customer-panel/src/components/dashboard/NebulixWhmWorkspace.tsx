import * as React from 'react';
import {
  ServerCog,
  Users,
  UserPlus,
  Terminal,
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
  KeyRound,
  Play,
  ShieldCheck,
  RefreshCw,
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
  | 'whm-terminal-api'
  | 'whm-services'
  | 'whm-multiphp-security'
  | 'whm-backups';

export interface WhmCpanelAccountItem {
  id: string;
  domain: string;
  username: string;
  email: string;
  diskUsedGb: number;
  emailAccounts: number;
  databases: number;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
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
  { id: 'whm-terminal-api', label: 'Root Terminal & WHM API', badge: 'CLI/API', icon: Terminal },
  { id: 'whm-services', label: 'Service Manager', badge: '6 Active', icon: Activity },
  { id: 'whm-multiphp-security', label: 'Firewall & Antivirus', badge: 'WAF', icon: ShieldAlert },
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
              Licensed WHM Server
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ed25519 Active
            </span>
          </div>
          <div className="mt-1 truncate font-mono text-xs font-bold text-slate-900">
            whm.garvixcloud.in (103.148.204.18)
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {totalAccounts} / 30 Licensed cPanel Accounts Used
          </div>
        </div>

        {/* WHM Navigation Links */}
        <div className="space-y-1">
          <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            WHM Server &amp; License Control
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
            <span>Garvix WHM Software License</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
            Self-hosted control panel software on your own server IP. Create isolated cPanel accounts, manage root services &amp; WHM API.
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
  services: WhmServiceDaemonItem[];
  onCreateAccount: (payload: {
    domain: string;
    username: string;
    email: string;
  }) => void;
  onToggleSuspendAccount: (accountId: string) => void;
  onTerminateAccount: (accountId: string) => void;
  onLaunchCpanelForAccount: (account: WhmCpanelAccountItem) => void;
  onRestartService: (serviceId: string) => void;
  onShowToast: (msg: string) => void;
}

export const NebulixWhmWorkspace: React.FC<NebulixWhmWorkspaceProps> = ({
  section,
  onSelectSection,
  accounts,
  services,
  onCreateAccount,
  onToggleSuspendAccount,
  onTerminateAccount,
  onLaunchCpanelForAccount,
  onRestartService,
  onShowToast,
}) => {
  // Local form states for Create cPanel Account
  const [newDomain, setNewDomain] = React.useState('');
  const [newUsername, setNewUsername] = React.useState('');
  const [newEmail, setNewEmail] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('Garvix#cPanel2026!');

  // Search filter & Password Reset state for List Accounts
  const [accountFilter, setAccountFilter] = React.useState('');
  const [resetPasswordAccountId, setResetPasswordAccountId] = React.useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = React.useState<string>('');

  // Root Terminal & WHM API Token state (`whm-terminal-api`)
  const [rootTerminalInput, setRootTerminalInput] = React.useState<string>('');
  const [rootTerminalHistory, setRootTerminalHistory] = React.useState<string[]>([
    'Garvix WHM Root Administration Shell — AlmaLinux 10 (root@whm.garvixcloud.in)',
    'Privilege Confinement: Go Linux Agent UDS (/run/garvix-agent/agent.sock)',
    'Type "help" or click any root diagnostic command chip above.',
  ]);
  const [whmApiTokens, setWhmApiTokens] = React.useState<
    Array<{ id: string; label: string; tokenPreview: string; permissions: string; created: string }>
  >([
    {
      id: 'whm-tok-1',
      label: 'WHMCS / Billing Provisioning Hook',
      tokenPreview: 'gvx_whm_root_7f3a91c0...b821',
      permissions: 'createacct, suspendacct, unsuspendacct, killacct, passwd',
      created: 'Oct 12, 2026',
    },
    {
      id: 'whm-tok-2',
      label: 'Server Health & Prometheus Exporter',
      tokenPreview: 'gvx_whm_root_19d4e81a...304f',
      permissions: 'loadavg, servicestatus, listaccts (Read-Only)',
      created: 'Oct 17, 2026',
    },
  ]);
  const [newWhmTokenLabel, setNewWhmTokenLabel] = React.useState<string>('');
  const [newWhmTokenScope, setNewWhmTokenScope] = React.useState<string>(
    'Full WHM Account Provisioning (createacct, suspendacct, killacct, passwd)'
  );
  const [generatedWhmSecret, setGeneratedWhmSecret] = React.useState<string | null>(null);

  // Firewall IP Unblock & Full Server Malware Scanner (`whm-multiphp-security`)
  const [blockedIps, setBlockedIps] = React.useState<
    Array<{ ip: string; reason: string; service: string; blockedAt: string }>
  >([
    {
      ip: '185.220.101.44',
      reason: '5 failed SSH root login attempts (Fail2Ban sshd jail)',
      service: 'SSH (Port 22)',
      blockedAt: '14 mins ago',
    },
    {
      ip: '45.155.205.109',
      reason: 'ModSecurity OWASP CRS Rule #942100 (SQL Injection attempt)',
      service: 'Nginx WAF (Port 443)',
      blockedAt: '42 mins ago',
    },
    {
      ip: '103.76.221.19',
      reason: '10 failed cPanel/Dovecot IMAP logins in 60s',
      service: 'Dovecot IMAP (Port 993)',
      blockedAt: '2 hours ago',
    },
  ]);
  const [whitelistIpInput, setWhitelistIpInput] = React.useState<string>('');
  const [whitelistedIps, setWhitelistedIps] = React.useState<string[]>([
    '103.148.204.18 (Server Primary IP)',
    '122.161.48.90 (Admin Office Static IP)',
  ]);
  const [serverScanRunning, setServerScanRunning] = React.useState<boolean>(false);
  const [lastServerScanReport, setLastServerScanReport] = React.useState<string>(
    'Last full ClamAV + YARA scan across /home/* completed Today at 04:00 AM — 0 infected files found.'
  );

  const activeCount = accounts.filter((a) => a.status === 'ACTIVE').length;
  const suspendedCount = accounts.filter((a) => a.status === 'SUSPENDED').length;

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let out = 'Gvx!';
    for (let i = 0; i < 12; i += 1) {
      out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
  };

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim() || !newUsername.trim()) return;
    onCreateAccount({
      domain: newDomain.trim().toLowerCase(),
      username: newUsername.trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
      email: newEmail.trim() || `admin@${newDomain.trim().toLowerCase()}`,
    });
    setNewDomain('');
    setNewUsername('');
    setNewEmail('');
    setNewPassword(generateStrongPassword());
    onSelectSection('whm-list-accounts');
  };

  const executeRootTerminalCommand = (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;
    const lower = cmd.toLowerCase();
    const prompt = `root@whm.garvixcloud.in:~# ${cmd}`;

    if (lower === 'clear') {
      setRootTerminalHistory([`WHM Root Terminal cleared (${new Date().toLocaleTimeString()}).`]);
      setRootTerminalInput('');
      return;
    }

    let output: string[] = [];
    if (lower === 'help') {
      output = [
        'Available WHM Root Administration Commands:',
        '  garvix-license --status     Verify Ed25519 WHM/cPanel software license & account slots',
        '  systemctl status            Check Nginx, MariaDB, PostgreSQL 16, PHP-FPM, Postfix & Dovecot',
        '  fail2ban-client status      Inspect active firewall jails & banned brute-force IPs',
        '  clamscan -r /home           Run ClamAV + YARA malware scan across all cPanel accounts',
        '  df -h                       Display server NVMe filesystem usage',
        '  free -m                     Display server RAM & swap allocation',
        '  clear                       Clear terminal output',
      ];
    } else if (lower.includes('garvix-license')) {
      output = [
        'Garvix Licensing Engine v2.4 (Ed25519 Signature Verified)',
        '  License Tier   : WHM Pro Software License (Up to 30 cPanel Accounts)',
        '  Bound Server IP: 103.148.204.18 (whm.garvixcloud.in)',
        `  Active Accounts: ${accounts.length} / 30 used`,
        '  Offline Grace  : 72 Hours Valid · Next Heartbeat in 55m',
      ];
    } else if (lower.startsWith('systemctl')) {
      output = [
        '● nginx.service         active (running) — HTTP/3 QUIC Reverse Proxy',
        '● php83-php-fpm.service active (running) — Per-Account Isolated FPM Pools',
        '● mariadb.service       active (running) — MariaDB 10.11.9 LTS',
        '● postgresql-16.service active (running) — PostgreSQL 16.4',
        '● postfix.service       active (running) — Postfix 3.8.5 SMTP TLS',
        '● dovecot.service       active (running) — Dovecot 2.3.21 IMAP/LMTP',
      ];
    } else if (lower.startsWith('fail2ban')) {
      output = [
        'Status for the jail: garvix-whm-shield',
        '|- Filter: Currently failed: 2 · Total failed: 49',
        `\`- Actions: Currently banned: ${blockedIps.length} (${blockedIps.map((b) => b.ip).join(', ')})`,
      ];
    } else if (lower.startsWith('clamscan')) {
      output = [
        `Scanning /home/* across ${accounts.length} cPanel accounts...`,
        '  /home/arjun: OK (0 threats)',
        '  /home/priyastudio: OK (0 threats)',
        '  /home/kunalshop: OK (0 threats)',
        '  /home/mehtalaw: OK (0 threats)',
        '----------- SCAN SUMMARY -----------',
        'Known viruses: 8,694,120 · Scanned directories: 148 · Infected files: 0',
      ];
    } else if (lower.startsWith('df')) {
      output = [
        'Filesystem      Size  Used Avail Use% Mounted on',
        '/dev/nvme0n1p1  200G   23G  177G  12% /',
      ];
    } else if (lower.startsWith('free')) {
      output = [
        '               total        used        free      shared  buff/cache   available',
        'Mem:           16384        4180        6720         196        5484       11920',
      ];
    } else {
      output = [`[garvix-agent] Executed root operation: ${cmd} (status: OK)`];
    }

    setRootTerminalHistory((prev) => [...prev, prompt, ...output]);
    setRootTerminalInput('');
  };

  const filteredAccounts = accounts.filter(
    (a) =>
      a.domain.toLowerCase().includes(accountFilter.toLowerCase()) ||
      a.username.toLowerCase().includes(accountFilter.toLowerCase()) ||
      a.email.toLowerCase().includes(accountFilter.toLowerCase())
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
                  Self-Hosted Control Panel License
                </GradientText>
              </div>

              <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                <BlurText
                  text="Create & Administrate Isolated cPanel Accounts on Your Own Server."
                  delayMs={30}
                />
              </h1>

              <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
                Your <strong>Garvix WHM + cPanel Software License</strong> runs directly on your
                server IP. Provision isolated Linux cPanel accounts (`/home/username`), launch any
                cPanel with 1-click Single Sign-On, reset passwords, manage WHM API tokens, and
                control root daemons.
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
                  <Users className="h-4 w-4 text-indigo-600" /> List cPanel Accounts ({accounts.length})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onSelectSection('whm-terminal-api')}
                >
                  <Terminal className="h-4 w-4 text-violet-600" /> Root Terminal &amp; WHM API
                </Button>
              </div>
            </div>

            {/* Right Summary Box: Why WHM */}
            <div className="w-full max-w-sm rounded-2xl border border-indigo-100 bg-white/90 p-5 shadow-sm">
              <div className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">
                WHM Server Administrator Capabilities
              </div>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Create isolated cPanel accounts (`/home/user`)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>1-Click `[cP] Open cPanel` Single Sign-On</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Suspend, Unsuspend, Reset Password &amp; Terminate</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Root Web Terminal &amp; WHM REST API Tokens (Port 2087)</span>
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
                Licensed cPanel Accounts
              </span>
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="mt-2 font-display text-3xl font-extrabold text-slate-900">
              <CountUp to={accounts.length} suffix=" / 30" />
            </div>
            <p className="mt-1 text-xs font-semibold text-emerald-700">
              {activeCount} Active · {suspendedCount} Suspended
            </p>
          </SpotlightCard>

          <SpotlightCard className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                WHM Software License
              </span>
              <ShieldCheck className="h-5 w-5 text-violet-600" />
            </div>
            <div className="mt-2 font-display text-2xl font-extrabold text-slate-900">
              WHM Pro
            </div>
            <p className="mt-1 text-xs font-semibold text-indigo-700">
              Ed25519 Signed · IP 103.148.204.18
            </p>
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
                Server Disk Used
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
            <p className="mt-1 text-xs text-slate-500">Your Own Server Hardware Storage</p>
          </SpotlightCard>
        </div>

        {/* Quick List of Accounts on WHM Dashboard */}
        <div className="rounded-2xl border border-indigo-100/90 bg-white p-6 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
            <div>
              <h2 className="font-display text-base font-extrabold text-slate-900">
                cPanel Accounts on This Licensed Server (`whm.garvixcloud.in`)
              </h2>
              <p className="text-xs text-slate-500">
                Click <strong>[cP] Open cPanel</strong> to log directly into any account’s cPanel
                workspace, or manage suspension/passwords.
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
                    <Badge variant="secondary">Linux UID Sandbox</Badge>
                  </div>
                  <div className="text-slate-500">
                    cPanel User: <span className="font-mono font-bold text-indigo-700">{acct.username}</span>{' '}
                    · Home: <span className="font-mono">/home/{acct.username}</span> · Server Disk Used:{' '}
                    <span className="font-semibold text-slate-700">{acct.diskUsedGb} GB</span>
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
     2. WHM LIST cPANEL ACCOUNTS (SSO, RESET PASSWORD, SUSPEND, TERMINATE)
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
                1-Click Single Sign-On (`[cP] Open cPanel`), Reset cPanel Passwords, Suspend
                accounts, or Terminate accounts cleanly.
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
              placeholder="Search cPanel accounts by domain, Linux username, or email..."
              className="max-w-md"
            />
            <div className="text-xs font-semibold text-slate-500">
              Showing {filteredAccounts.length} of {accounts.length} licensed cPanel accounts
            </div>
          </div>

          <div className="space-y-3">
            {filteredAccounts.map((acct) => {
              const isResetting = resetPasswordAccountId === acct.id;
              return (
                <div
                  key={acct.id}
                  className="space-y-3 rounded-2xl border border-indigo-100/80 bg-[#FAF9FE] p-4 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-extrabold text-slate-900">
                          {acct.domain}
                        </span>
                        <Badge variant={acct.status === 'ACTIVE' ? 'success' : 'destructive'}>
                          {acct.status}
                        </Badge>
                        <Badge variant="secondary">/home/{acct.username}</Badge>
                      </div>
                      <div className="text-slate-600">
                        Username:{' '}
                        <span className="font-mono font-bold text-indigo-700">{acct.username}</span>{' '}
                        · Email: <span className="font-mono">{acct.email}</span> · Created:{' '}
                        {acct.createdAt}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Server Disk Used: <strong>{acct.diskUsedGb} GB</strong> · Mailboxes:{' '}
                        <strong>{acct.emailAccounts}</strong> · Databases:{' '}
                        <strong>{acct.databases}</strong>
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
                        onClick={() => {
                          if (isResetting) {
                            setResetPasswordAccountId(null);
                          } else {
                            setResetPasswordAccountId(acct.id);
                            setResetPasswordValue(generateStrongPassword());
                          }
                        }}
                      >
                        <KeyRound className="h-3.5 w-3.5 text-indigo-600" /> Reset Password
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

                  {isResetting && (
                    <div className="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-white p-3.5 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          New cPanel &amp; SSH/SFTP Password for &ldquo;{acct.username}&rdquo; ({acct.domain})
                        </label>
                        <Input
                          value={resetPasswordValue}
                          onChange={(e) => setResetPasswordValue(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setResetPasswordValue(generateStrongPassword())}
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Generate
                        </Button>
                        <Button
                          type="button"
                          variant="nebulix"
                          size="sm"
                          onClick={() => {
                            if (!resetPasswordValue.trim()) return;
                            onShowToast(
                              `Updated Argon2id password for cPanel account "${acct.username}" (${acct.domain}).`
                            );
                            setResetPasswordAccountId(null);
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Save New Password
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </AnimatedContent>
    );
  }

  /* ============================================================================
     3. WHM CREATE A NEW cPANEL ACCOUNT (NO HOSTING PACKAGE SELECTOR)
     ============================================================================ */
  if (section === 'whm-create-account') {
    return (
      <AnimatedContent className="space-y-6">
        <AuroraBackground className="p-6 sm:p-8">
          <Badge variant="orange">WHM ACCOUNT FUNCTIONS · CREATE A NEW cPANEL ACCOUNT</Badge>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
            <BlurText text="Provision a New Isolated cPanel Account on Your Server" />
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Creates an isolated Linux UID user (`/home/username`), Nginx HTTP/3 VirtualHost,
            dedicated PHP-FPM pool, Bind9 DNS zone, and cPanel login on your licensed server.
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
                cPanel Username (Linux UID Sandbox)
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
              <label className="text-xs font-bold text-slate-700">Contact / Alert Email</label>
              <Input
                type="email"
                placeholder="owner@clientcompany.in"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">cPanel Password</label>
                <button
                  type="button"
                  onClick={() => setNewPassword(generateStrongPassword())}
                  className="text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  Generate Strong
                </button>
              </div>
              <Input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-[#FAF9FE] p-4 text-xs text-slate-600 space-y-1.5">
            <div className="font-bold text-indigo-950">
              Automated Provisioning Pipeline (12-Step Go Agent Transaction)
            </div>
            <p>
              • Creates Linux user <code className="font-mono text-indigo-700">/home/{newUsername || 'username'}</code> with{' '}
              <code className="font-mono">chmod 0710</code> &amp; systemd cgroup v2 slice
            </p>
            <p>
              • Generates Nginx HTTP/3 vhost, PHP 8.3 FPM socket, Bind9 DNS zone (<code className="font-mono">ns1/ns2.garvixcloud.in</code>), and Let&apos;s Encrypt AutoSSL
            </p>
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
     4. WHM ROOT TERMINAL & WHM API TOKENS (`whm-terminal-api`)
     ============================================================================ */
  if (section === 'whm-terminal-api') {
    return (
      <AnimatedContent className="space-y-6">
        <AuroraBackground className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge variant="orange">WHM ROOT CLI &amp; PORT 2087 AUTOMATION API</Badge>
              <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                <BlurText text="WHM Root Terminal & WHM API Token Manager" />
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                Execute root server diagnostics and generate WHM API tokens (`Port 2087`) for
                billing/automation integrations.
              </p>
            </div>
            <Badge variant="success">{whmApiTokens.length} WHM API Tokens Active</Badge>
          </div>
        </AuroraBackground>

        {/* WHM Root Terminal */}
        <SpotlightCard className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                WHM Root Terminal (`root@whm.garvixcloud.in`)
              </h2>
              <p className="text-xs text-slate-500">
                Click any root diagnostic command below or type directly in the shell prompt:
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => executeRootTerminalCommand('clear')}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Clear Console
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              'garvix-license --status',
              'systemctl status',
              'fail2ban-client status',
              'clamscan -r /home',
              'df -h',
              'free -m',
              'help',
            ].map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => executeRootTerminalCommand(cmd)}
                className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 font-mono text-xs font-semibold text-indigo-900 transition hover:bg-indigo-100"
              >
                # {cmd}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500" />
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="ml-2 font-mono text-xs font-semibold text-slate-300">
                  root@whm.garvixcloud.in:~# (AlmaLinux 10 — Port 2087 Root Session)
                </span>
              </div>
              <span className="font-mono text-[11px] text-violet-400">
                Go Agent IPC: /run/garvix-agent/agent.sock
              </span>
            </div>

            <div className="max-h-72 min-h-[220px] space-y-1.5 overflow-y-auto p-4 font-mono text-xs leading-relaxed text-slate-200">
              {rootTerminalHistory.map((line, idx) => (
                <div
                  key={`${idx}-${line.slice(0, 12)}`}
                  className={
                    line.startsWith('root@')
                      ? 'font-bold text-violet-400'
                      : line.includes('active (running)') || line.includes('Ed25519')
                        ? 'text-emerald-400'
                        : 'text-slate-200'
                  }
                >
                  {line}
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeRootTerminalCommand(rootTerminalInput);
              }}
              className="flex items-center gap-2 border-t border-slate-800 bg-slate-900/90 px-4 py-3"
            >
              <span className="font-mono text-xs font-bold text-violet-400">
                root@whm.garvixcloud.in:~#
              </span>
              <input
                type="text"
                value={rootTerminalInput}
                onChange={(e) => setRootTerminalInput(e.target.value)}
                placeholder="Type a root command (e.g. garvix-license --status, systemctl status, df -h)..."
                className="flex-1 bg-transparent font-mono text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <Button type="submit" size="sm" variant="nebulix">
                <Play className="h-3.5 w-3.5" /> Execute
              </Button>
            </form>
          </div>
        </SpotlightCard>

        {/* WHM API Token Generator */}
        <div className="grid gap-6 lg:grid-cols-12">
          <SpotlightCard className="space-y-4 p-6 lg:col-span-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-extrabold text-slate-900">
                Create WHM API Token (Port 2087)
              </h3>
              <Badge variant="orange">WHM JSON API v1</Badge>
            </div>
            <p className="text-xs text-slate-500">
              Generate WHM root bearer tokens to automate account creation, suspension, and password
              resets from WHMCS, Blesta, HostBill, or your own portal.
            </p>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                API Token Name
              </label>
              <Input
                placeholder="e.g. Billing Portal Auto-Provisioner"
                value={newWhmTokenLabel}
                onChange={(e) => setNewWhmTokenLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                WHM ACL Permissions
              </label>
              <select
                value={newWhmTokenScope}
                onChange={(e) => setNewWhmTokenScope(e.target.value)}
                className="w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900"
              >
                <option value="Full WHM Account Provisioning (createacct, suspendacct, killacct, passwd)">
                  Full WHM Account Provisioning (createacct, suspendacct, killacct, passwd)
                </option>
                <option value="Service Control & Reboot Daemons (restartservice, servicestatus)">
                  Service Control &amp; Reboot Daemons (restartservice, servicestatus)
                </option>
                <option value="Read-Only Server Inventory (listaccts, loadavg, version)">
                  Read-Only Server Inventory (listaccts, loadavg, version)
                </option>
              </select>
            </div>
            <Button
              variant="nebulix"
              className="w-full"
              onClick={() => {
                const label = newWhmTokenLabel.trim() || 'WHM Automation Key';
                const rand = Math.random().toString(16).slice(2, 10);
                const secret = `gvx_whm_root_${rand}_${Date.now().toString(36)}`;
                setWhmApiTokens((prev) => [
                  {
                    id: `whm-tok-${Date.now()}`,
                    label,
                    tokenPreview: `${secret.slice(0, 20)}...${secret.slice(-4)}`,
                    permissions: newWhmTokenScope,
                    created: 'Just now',
                  },
                  ...prev,
                ]);
                setGeneratedWhmSecret(secret);
                setNewWhmTokenLabel('');
                onShowToast(`Created WHM Root API Token "${label}"`);
              }}
            >
              <KeyRound className="h-4 w-4" /> Generate WHM API Token
            </Button>

            {generatedWhmSecret && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs">
                <p className="font-bold text-emerald-900">New WHM API Token (Copy Now):</p>
                <code className="mt-1 block break-all rounded border border-emerald-300 bg-white p-2 font-mono text-[11px] font-bold text-slate-900">
                  {generatedWhmSecret}
                </code>
              </div>
            )}
          </SpotlightCard>

          <SpotlightCard className="space-y-4 p-6 lg:col-span-7">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-extrabold text-slate-900">
                Active WHM API Tokens
              </h3>
              <span className="font-mono text-xs text-slate-500">
                https://whm.garvixcloud.in:2087/json-api/
              </span>
            </div>

            <div className="space-y-2.5">
              {whmApiTokens.map((tok) => (
                <div
                  key={tok.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-indigo-100 bg-[#FAF9FE] p-3.5 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{tok.label}</span>
                      <Badge variant="success">Active</Badge>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-indigo-700">{tok.tokenPreview}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      ACL: {tok.permissions} · Created: {tok.created}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setWhmApiTokens((prev) => prev.filter((item) => item.id !== tok.id));
                      onShowToast(`Revoked WHM API token "${tok.label}"`);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Revoke
                  </Button>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3.5 font-mono text-[11px] text-slate-200">
              <p className="mb-1 text-xs font-bold text-violet-400">
                # Example: Create cPanel Account via WHM API (Port 2087)
              </p>
              <code>
                curl -X POST &quot;https://whm.garvixcloud.in:2087/json-api/createacct&quot; \<br />
                &nbsp;&nbsp;-H &quot;Authorization: whm root:
                {generatedWhmSecret ?? 'gvx_whm_root_7f3a91c0...'}&quot; \<br />
                &nbsp;&nbsp;-d &quot;username=clientco&amp;domain=clientcompany.in&quot;
              </code>
            </div>
          </SpotlightCard>
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
     6. WHM FIREWALL IP UNBLOCK, ANTIVIRUS SCANNER & MULTI-PHP
     ============================================================================ */
  if (section === 'whm-multiphp-security') {
    return (
      <AnimatedContent className="space-y-6">
        <AuroraBackground className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge variant="orange">WHM SECURITY CENTER · FIREWALL, CLAMAV &amp; MULTI-PHP</Badge>
              <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                <BlurText text="Firewall IP Unblock, Server Malware Scan & Multi-PHP" />
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                Unblock client IPs from Fail2Ban/ModSecurity WAF, run full-server ClamAV + YARA
                scans across `/home/*`, and manage PHP-FPM runtimes.
              </p>
            </div>
            <Button
              variant="nebulix"
              disabled={serverScanRunning}
              onClick={() => {
                setServerScanRunning(true);
                onShowToast(`Scanning all ${accounts.length} cPanel accounts (/home/*) with ClamAV + YARA...`);
                setTimeout(() => {
                  setServerScanRunning(false);
                  setLastServerScanReport(
                    `Full ClamAV + YARA scan completed at ${new Date().toLocaleTimeString()} across ${accounts.length} accounts (/home/*) — 0 malware/webshells detected.`
                  );
                  onShowToast('Full server antivirus scan completed — 0 threats found.');
                }, 900);
              }}
            >
              <ShieldCheck className="h-4 w-4" />{' '}
              {serverScanRunning ? 'Scanning /home/*...' : 'Run Full Server Malware Scan'}
            </Button>
          </div>
        </AuroraBackground>

        {/* Full Server Scan Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-5 py-3.5 text-xs text-emerald-950">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold">{lastServerScanReport}</span>
          </div>
          <Badge variant="success">Real-Time ClamAV + YARA Active</Badge>
        </div>

        {/* Firewall Blocked IPs & Whitelist Manager */}
        <div className="grid gap-6 lg:grid-cols-12">
          <SpotlightCard className="space-y-4 p-6 lg:col-span-7">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-extrabold text-slate-900">
                Fail2Ban &amp; ModSecurity Blocked IPs ({blockedIps.length})
              </h2>
              <Badge variant="warning">Brute-Force Shield</Badge>
            </div>
            <p className="text-xs text-slate-500">
              If a client gets locked out after typing the wrong cPanel or IMAP password, unblock
              their IP address in 1 click below:
            </p>

            {blockedIps.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs font-semibold text-emerald-800">
                No IP addresses are currently blocked by Fail2Ban or ModSecurity.
              </div>
            ) : (
              <div className="space-y-2.5">
                {blockedIps.map((item) => (
                  <div
                    key={item.ip}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-rose-200/80 bg-rose-50/40 p-3.5 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900">{item.ip}</span>
                        <Badge variant="destructive">{item.service}</Badge>
                        <span className="text-[11px] text-slate-500">{item.blockedAt}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{item.reason}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setBlockedIps((prev) => prev.filter((b) => b.ip !== item.ip));
                        onShowToast(`Unblocked IP ${item.ip} from Fail2Ban & nftables firewall.`);
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Unblock IP
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </SpotlightCard>

          <SpotlightCard className="space-y-4 p-6 lg:col-span-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-extrabold text-slate-900">
                Trusted IP Whitelist
              </h2>
              <Badge variant="success">{whitelistedIps.length} Allowed</Badge>
            </div>
            <p className="text-xs text-slate-500">
              Whitelisted IPs bypass Fail2Ban lockouts on SSH (22), WHM (2087), and cPanel (2083).
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter IP (e.g. 49.36.120.14)"
                  value={whitelistIpInput}
                  onChange={(e) => setWhitelistIpInput(e.target.value)}
                />
              </div>
              <Button
                variant="nebulix"
                size="sm"
                onClick={() => {
                  if (!whitelistIpInput.trim()) return;
                  setWhitelistedIps((prev) => [...prev, whitelistIpInput.trim()]);
                  onShowToast(`Added ${whitelistIpInput.trim()} to WHM Firewall Whitelist`);
                  setWhitelistIpInput('');
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Whitelist
              </Button>
            </div>

            <div className="space-y-2 pt-1">
              {whitelistedIps.map((ip) => (
                <div
                  key={ip}
                  className="flex items-center justify-between rounded-xl border border-indigo-100 bg-[#FAF9FE] px-3.5 py-2 text-xs font-mono text-slate-800"
                >
                  <span>{ip}</span>
                  <Badge variant="success">Trusted</Badge>
                </div>
              ))}
            </div>
          </SpotlightCard>
        </div>

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
              accounts cannot read each other’s files.
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
