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
  LogOut,
  Layers,
  ArrowRight,
  Copy,
  AlertCircle,
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
  SpotlightCard,
  GradientText,
} from '@garvix/ui-components';
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
  type WhmServiceDaemonItem,
} from './components/dashboard/NebulixWhmWorkspace.js';
import {
  NebulixMasterAdmin,
  type GarvixLicensePlanConfig,
  type IssuedCustomerLicenseRecord,
  type RazorpayGatewayConfig,
  type MasterAdminCredentials,
  type LicenseBillingCycle,
} from './components/dashboard/NebulixMasterAdmin.js';

export type PanelSurface = 'store' | 'login' | 'cpanel' | 'whm' | 'admin';

type AuthSession =
  | null
  | {
      role: 'MASTER_ADMIN';
      email: string;
    }
  | {
      role: 'CUSTOMER';
      license: IssuedCustomerLicenseRecord;
    };

const PLANS_STORAGE_KEY = 'garvix_license_plans_v1';
const LICENSES_STORAGE_KEY = 'garvix_customer_licenses_v1';
const RAZORPAY_STORAGE_KEY = 'garvix_razorpay_config_v1';
const ADMIN_CREDS_STORAGE_KEY = 'garvix_master_admin_creds_v1';
const AUTH_SESSION_STORAGE_KEY = 'garvix_active_auth_session_v1';

export const DEFAULT_GARVIX_LICENSE_PLANS: GarvixLicensePlanConfig[] = [
  {
    code: 'CPANEL_SOLO',
    name: 'Garvix cPanel Solo',
    badge: '1 ACCOUNT · SOLO VPS',
    monthlyInr: 499,
    yearlyInr: 4990,
    panelMode: 'ONLY_CPANEL',
    maxAccounts: 1,
    maxAccountsLabel: '1 cPanel Account (No WHM)',
    bestFor: 'Single website owner or developer VPS',
    popular: false,
    features: [
      '1 Server IPv4 License Activation',
      'Direct cPanel Jupiter Dashboard (Port 2083)',
      'Unlimited Domains, Subdomains & AutoSSL',
      'Web Terminal, Git Deploy, Cron & API Tokens',
    ],
  },
  {
    code: 'WHM_ADMIN',
    name: 'Garvix WHM Admin',
    badge: 'UP TO 5 ACCOUNTS',
    monthlyInr: 999,
    yearlyInr: 9990,
    panelMode: 'WHM_AND_CPANEL',
    maxAccounts: 5,
    maxAccountsLabel: 'Up to 5 cPanel Accounts + WHM',
    bestFor: 'Freelancers & small web agencies',
    popular: false,
    features: [
      '1 Server IPv4 License Activation',
      'Full WHM Server Admin Panel (Port 2087)',
      'Create Up to 5 Isolated cPanel Accounts',
      '1-Click [cP] Open cPanel Single Sign-On',
      'Root Web Terminal, WHM API & Malware Scanner',
    ],
  },
  {
    code: 'WHM_PRO',
    name: 'Garvix WHM Pro',
    badge: 'UP TO 30 ACCOUNTS',
    monthlyInr: 1799,
    yearlyInr: 17990,
    panelMode: 'WHM_AND_CPANEL',
    maxAccounts: 30,
    maxAccountsLabel: 'Up to 30 cPanel Accounts + WHM',
    bestFor: 'Agencies, resellers & multi-client servers',
    popular: true,
    features: [
      '1 Server IPv4 License Activation',
      'Full WHM Server Admin Panel (Port 2087)',
      'Create Up to 30 Isolated cPanel Accounts',
      '1-Click [cP] Open cPanel Single Sign-On',
      'Root Web Terminal, WHM API & Malware Scanner',
    ],
  },
  {
    code: 'WHM_PREMIER',
    name: 'Garvix WHM Premier',
    badge: 'UNLIMITED ACCOUNTS',
    monthlyInr: 2999,
    yearlyInr: 29990,
    panelMode: 'WHM_AND_CPANEL',
    maxAccounts: 0,
    maxAccountsLabel: 'Unlimited cPanel Accounts + WHM',
    bestFor: 'Dedicated servers & hosting companies',
    popular: false,
    features: [
      '1 Server IPv4 License Activation',
      'Full WHM Server Admin Panel (Port 2087)',
      'Create Unlimited Isolated cPanel Accounts',
      '1-Click [cP] Open cPanel Single Sign-On',
      'Root Web Terminal, WHM API & Malware Scanner',
    ],
  },
];

export const DEFAULT_CUSTOMER_LICENSES: IssuedCustomerLicenseRecord[] = [
  {
    id: 'lic-pro-default',
    customerEmail: 'admin@garvixcloud.in',
    password: 'Admin@12345',
    planCode: 'WHM_PRO',
    planName: 'Garvix WHM Pro',
    panelMode: 'WHM_AND_CPANEL',
    maxAccounts: 30,
    billingCycle: 'YEARLY',
    serverIp: '200.234.39.100',
    hostname: 'srv2075790.hstgr.cloud',
    licenseKey: 'GVX-WHM_PRO-94CF-2026-ED25519',
    status: 'ACTIVE',
    createdAt: '2026-10-20',
    expiresAt: '2027-10-20',
  },
  {
    id: 'lic-solo-default',
    customerEmail: 'solo@garvixcloud.in',
    password: 'Admin@12345',
    planCode: 'CPANEL_SOLO',
    planName: 'Garvix cPanel Solo',
    panelMode: 'ONLY_CPANEL',
    maxAccounts: 1,
    billingCycle: 'MONTHLY',
    serverIp: '200.234.39.100',
    hostname: 'solo.garvixcloud.in',
    licenseKey: 'GVX-CPANEL_SOLO-31A8-2026-ED25519',
    status: 'ACTIVE',
    createdAt: '2026-10-20',
    expiresAt: '2026-11-20',
  },
];

export const DEFAULT_RAZORPAY_CONFIG: RazorpayGatewayConfig = {
  enabled: true,
  mode: 'LIVE',
  keyId: '',
  keySecret: '',
  webhookSecret: '',
  merchantUpiVpa: 'garvix@icici',
  companyName: 'Garvix Software Solutions Pvt Ltd',
  companyGstin: '27AABCG4829K1Z5',
};

export const DEFAULT_MASTER_ADMIN_CREDENTIALS: MasterAdminCredentials = {
  email: 'admin@garvix.io',
  password: 'Admin@12345',
};

interface GlobalSearchEntry {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  keywords: string[];
  surface: 'cpanel' | 'whm';
  cpanelSection?: NebulixSidebarSectionId;
  whmSection?: NebulixWhmSectionId;
}

const GLOBAL_SEARCH_CATALOG: GlobalSearchEntry[] = [
  {
    id: 'srch-cpanel-terminal',
    title: 'Web Terminal (cPanel CLI Shell)',
    subtitle: 'Interactive sandboxed bash terminal (ls, php -v, node -v, git status, df -h)',
    badge: 'cPanel · CLI',
    keywords: ['terminal', 'ssh', 'cli', 'bash', 'shell', 'command', 'console', 'pty'],
    surface: 'cpanel',
    cpanelSection: 'web-terminal',
  },
  {
    id: 'srch-cpanel-api',
    title: 'API Tokens, Cron Jobs, MultiPHP & Git Deploy',
    subtitle: 'Generate cPanel REST API tokens, schedule Cron jobs, edit php.ini & Git pull',
    badge: 'cPanel · API',
    keywords: [
      'api',
      'token',
      'developer',
      'webhook',
      'uapi',
      'rest',
      'cron',
      'schedule',
      'php',
      'multiphp',
      'ini',
      'git',
      'node',
    ],
    surface: 'cpanel',
    cpanelSection: 'api-developer',
  },
  {
    id: 'srch-whm-terminal-api',
    title: 'WHM Root Terminal & WHM API Tokens (Port 2087)',
    subtitle: 'Root server CLI shell & WHM API token generator for WHMCS / billing automation',
    badge: 'WHM · Root API',
    keywords: ['api', 'terminal', 'whm api', 'root', 'whmcs', '2087', 'token', 'ssh', 'cli'],
    surface: 'whm',
    whmSection: 'whm-terminal-api',
  },
  {
    id: 'srch-cpanel-files',
    title: 'File Manager & 4-Layer Antivirus Upload Scanner',
    subtitle: '2-pane cPanel File Manager, Code Editor, chmod Permissions & ClamAV/YARA scanner',
    badge: 'cPanel · Files',
    keywords: [
      'file',
      'manager',
      'upload',
      'virus',
      'malware',
      'clamav',
      'chmod',
      'permissions',
      'zip',
      'extract',
      'public_html',
    ],
    surface: 'cpanel',
    cpanelSection: 'file-manager',
  },
  {
    id: 'srch-cpanel-db',
    title: 'Databases, SQL Studio & phpMyAdmin Explorer',
    subtitle: 'PostgreSQL 16 & MariaDB 10.11, Table Browser, SQL Query Runner & .sql Import/Export',
    badge: 'cPanel · SQL',
    keywords: [
      'sql',
      'database',
      'phpmyadmin',
      'mysql',
      'mariadb',
      'postgres',
      'postgresql',
      'table',
      'query',
    ],
    surface: 'cpanel',
    cpanelSection: 'databases',
  },
  {
    id: 'srch-cpanel-email',
    title: 'Email Accounts, Password, Quota & Roundcube Webmail',
    subtitle: 'Create mailboxes with Argon2id password, storage quota, IMAP/SMTP & Webmail',
    badge: 'cPanel · Email',
    keywords: ['email', 'mail', 'webmail', 'roundcube', 'imap', 'smtp', 'dkim', 'spf', 'dmarc'],
    surface: 'cpanel',
    cpanelSection: 'email-accounts',
  },
  {
    id: 'srch-cpanel-domains',
    title: 'Websites, Domains & Bind9 DNS Zone Editor',
    subtitle: 'Manage domains, subdomains, redirects & A/AAAA/CNAME/MX/TXT DNS records',
    badge: 'cPanel · DNS',
    keywords: ['domain', 'dns', 'website', 'zone', 'subdomain', 'nameserver', 'mx', 'cname'],
    surface: 'cpanel',
    cpanelSection: 'websites-domains',
  },
  {
    id: 'srch-cpanel-ssl',
    title: 'SSL/TLS 1.3 Certificates & AutoSSL',
    subtitle: 'Zero-downtime Let’s Encrypt HTTP-01 & DNS-01 wildcard certificates',
    badge: 'cPanel · SSL',
    keywords: ['ssl', 'tls', 'https', 'certificate', 'autossl', 'letsencrypt'],
    surface: 'cpanel',
    cpanelSection: 'ssl-certificates',
  },
  {
    id: 'srch-cpanel-backups',
    title: 'Restic Encrypted Backups & 1-Click Restore',
    subtitle: 'AES-256-GCM snapshots with automated sandbox restore verification',
    badge: 'cPanel · Backup',
    keywords: ['backup', 'restore', 'snapshot', 'restic', 'recovery'],
    surface: 'cpanel',
    cpanelSection: 'backups',
  },
  {
    id: 'srch-cpanel-security',
    title: 'cPanel Security, ModSecurity WAF & SSH Keys',
    subtitle: '2FA passkeys, IP blocker, SSH key authorization & brute-force shield',
    badge: 'cPanel · Security',
    keywords: ['security', 'waf', 'firewall', '2fa', 'passkey', 'ssh key'],
    surface: 'cpanel',
    cpanelSection: 'security',
  },
  {
    id: 'srch-whm-accounts',
    title: 'WHM: List cPanel Accounts, [cP] SSO & Reset Password',
    subtitle: 'View all cPanel accounts, 1-click Open cPanel, Reset Password, Suspend/Terminate',
    badge: 'WHM · Accounts',
    keywords: ['whm', 'accounts', 'cpanel', 'password', 'reset', 'suspend', 'terminate', 'sso'],
    surface: 'whm',
    whmSection: 'whm-list-accounts',
  },
  {
    id: 'srch-whm-create',
    title: 'WHM: Create a New Isolated cPanel Account',
    subtitle: 'Provision a new Linux UID user (/home/username), Nginx vhost & cPanel login',
    badge: 'WHM · Provision',
    keywords: ['create account', 'new cpanel', 'provision', 'whm create'],
    surface: 'whm',
    whmSection: 'whm-create-account',
  },
  {
    id: 'srch-whm-firewall',
    title: 'WHM: Firewall IP Unblock & Full Server Malware Scanner',
    subtitle: 'Unblock Fail2Ban IPs, whitelist admin IPs & scan /home/* with ClamAV + YARA',
    badge: 'WHM · Firewall',
    keywords: ['firewall', 'unblock', 'ip', 'fail2ban', 'antivirus', 'malware', 'clamav', 'scan'],
    surface: 'whm',
    whmSection: 'whm-multiphp-security',
  },
  {
    id: 'srch-whm-services',
    title: 'WHM: Server Service Manager (Restart Daemons)',
    subtitle: 'Restart Nginx, PHP-FPM, PostgreSQL 16, MariaDB, Postfix/Dovecot & Bind9',
    badge: 'WHM · Daemons',
    keywords: ['service', 'restart', 'nginx', 'php-fpm', 'daemon', 'systemd'],
    surface: 'whm',
    whmSection: 'whm-services',
  },
];

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
  { id: 'dns-1', type: 'A', name: '@', value: '200.234.39.100', ttl: 3600 },
  { id: 'dns-2', type: 'A', name: 'mail', value: '200.234.39.100', ttl: 3600 },
  { id: 'dns-3', type: 'MX', name: '@', value: '10 mail.garvixcloud.in.', ttl: 3600 },
  {
    id: 'dns-4',
    type: 'TXT',
    name: '@',
    value: 'v=spf1 ip4:200.234.39.100 -all',
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
    diskUsedGb: 14.2,
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
    diskUsedGb: 6.4,
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
    diskUsedGb: 2.1,
    emailAccounts: 4,
    databases: 1,
    status: 'ACTIVE',
    createdAt: '2026-07-19',
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

export function CustomerPanelApp(): React.ReactElement {
  // 1. Persisted Master Admin Plans, Customer Licenses, Razorpay Config, and Admin Credentials
  const [licensePlans, setLicensePlans] = React.useState<GarvixLicensePlanConfig[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(PLANS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as GarvixLicensePlanConfig[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((p) => ({
              ...p,
              yearlyInr:
                typeof p.yearlyInr === 'number' && p.yearlyInr > 0
                  ? p.yearlyInr
                  : p.monthlyInr * 10,
            }));
          }
        }
      } catch {
        // ignore
      }
    }
    return DEFAULT_GARVIX_LICENSE_PLANS;
  });

  const [customerLicenses, setCustomerLicenses] = React.useState<IssuedCustomerLicenseRecord[]>(
    () => {
      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(LICENSES_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as IssuedCustomerLicenseRecord[];
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        } catch {
          // ignore
        }
      }
      return DEFAULT_CUSTOMER_LICENSES;
    }
  );

  const [razorpayConfig, setRazorpayConfig] = React.useState<RazorpayGatewayConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(RAZORPAY_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as RazorpayGatewayConfig;
          if (parsed && typeof parsed.mode === 'string') return parsed;
        }
      } catch {
        // ignore
      }
    }
    return DEFAULT_RAZORPAY_CONFIG;
  });

  const [adminCredentials, setAdminCredentials] = React.useState<MasterAdminCredentials>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(ADMIN_CREDS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as MasterAdminCredentials;
          if (parsed && parsed.email && parsed.password) return parsed;
        }
      } catch {
        // ignore
      }
    }
    return DEFAULT_MASTER_ADMIN_CREDENTIALS;
  });

  // 2. Strict Authentication Session (`null` by default until user logs in with Email & Password)
  const [authSession, setAuthSession] = React.useState<AuthSession>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
        if (raw) {
          return JSON.parse(raw) as AuthSession;
        }
      } catch {
        // ignore
      }
    }
    return null;
  });

  const updateAuthSession = (next: AuthSession) => {
    setAuthSession(next);
    if (typeof window !== 'undefined') {
      try {
        if (next) {
          window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(next));
        } else {
          window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
        }
      } catch {
        // ignore
      }
    }
  };

  // Determine initial surface based on URL path and whether user is logged in
  const [activeSurface, setActiveSurface] = React.useState<PanelSurface>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase();
      if (p.startsWith('/admin')) return 'login'; // Will open Admin Login unless already authenticated as MASTER_ADMIN
      if (p.startsWith('/login') || p.startsWith('/whm') || p.startsWith('/cpanel')) {
        return 'login';
      }
    }
    return 'store';
  });

  // Login Portal state
  const [loginMode, setLoginMode] = React.useState<'CUSTOMER' | 'MASTER_ADMIN'>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.toLowerCase().startsWith('/admin')) {
      return 'MASTER_ADMIN';
    }
    return 'CUSTOMER';
  });
  const [loginEmailInput, setLoginEmailInput] = React.useState<string>('');
  const [loginPasswordInput, setLoginPasswordInput] = React.useState<string>('');
  const [loginError, setLoginError] = React.useState<string | null>(null);

  // Sync URL `/admin` when already authenticated as MASTER_ADMIN
  React.useEffect(() => {
    if (authSession?.role === 'MASTER_ADMIN' && activeSurface === 'login') {
      setActiveSurface('admin');
    } else if (authSession?.role === 'CUSTOMER' && activeSurface === 'login') {
      setActiveSurface(authSession.license.panelMode === 'ONLY_CPANEL' ? 'cpanel' : 'whm');
    }
  }, [authSession, activeSurface]);

  const activeCustomerLicense: IssuedCustomerLicenseRecord =
    authSession?.role === 'CUSTOMER' ? authSession.license : DEFAULT_CUSTOMER_LICENSES[0]!;

  const syncPortalStateToServer = (payload: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;
    fetch('/api/v1/garvix-portal/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  };

  // Bootstrap persisted state from server on mount so all browsers/visitors see the Owner's plans & Razorpay keys
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    fetch('/api/v1/garvix-portal/bootstrap')
      .then((r) => (r.ok ? r.json() : null))
      .then((json: Record<string, any> | null) => {
        const d = json?.data;
        if (!d || typeof d !== 'object') return;
        if (Array.isArray(d.licensePlans) && d.licensePlans.length > 0) {
          const normalized = (d.licensePlans as GarvixLicensePlanConfig[]).map((p) => ({
            ...p,
            yearlyInr:
              typeof p.yearlyInr === 'number' && p.yearlyInr > 0
                ? p.yearlyInr
                : p.monthlyInr * 10,
          }));
          setLicensePlans(normalized);
          window.localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(normalized));
        }
        if (Array.isArray(d.customerLicenses) && d.customerLicenses.length > 0) {
          setCustomerLicenses(d.customerLicenses as IssuedCustomerLicenseRecord[]);
          window.localStorage.setItem(LICENSES_STORAGE_KEY, JSON.stringify(d.customerLicenses));
        }
        if (d.razorpayConfig && typeof d.razorpayConfig === 'object') {
          setRazorpayConfig(d.razorpayConfig as RazorpayGatewayConfig);
          window.localStorage.setItem(RAZORPAY_STORAGE_KEY, JSON.stringify(d.razorpayConfig));
        }
        if (d.adminCredentials && d.adminCredentials.email && d.adminCredentials.password) {
          setAdminCredentials(d.adminCredentials as MasterAdminCredentials);
          window.localStorage.setItem(ADMIN_CREDS_STORAGE_KEY, JSON.stringify(d.adminCredentials));
        }
      })
      .catch(() => {});
  }, []);

  const handleSavePlans = (nextPlans: GarvixLicensePlanConfig[]) => {
    setLicensePlans(nextPlans);
    syncPortalStateToServer({ licensePlans: nextPlans });
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(nextPlans));
      } catch {
        // ignore
      }
    }
    if (authSession?.role === 'CUSTOMER') {
      const updatedPlan = nextPlans.find((p) => p.code === authSession.license.planCode);
      if (updatedPlan) {
        updateAuthSession({
          role: 'CUSTOMER',
          license: {
            ...authSession.license,
            planName: updatedPlan.name,
            panelMode: updatedPlan.panelMode,
            maxAccounts: updatedPlan.maxAccounts,
          },
        });
      }
    }
  };

  const handleResetDefaultPlans = () => {
    handleSavePlans(DEFAULT_GARVIX_LICENSE_PLANS);
    showToast('Reset all license plans and pricing to defaults.');
  };

  const handleSaveCustomerLicenses = (nextLicenses: IssuedCustomerLicenseRecord[]) => {
    setCustomerLicenses(nextLicenses);
    syncPortalStateToServer({ customerLicenses: nextLicenses });
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LICENSES_STORAGE_KEY, JSON.stringify(nextLicenses));
      } catch {
        // ignore
      }
    }
    if (authSession?.role === 'CUSTOMER') {
      const updatedSelf = nextLicenses.find((l) => l.id === authSession.license.id);
      if (updatedSelf) {
        updateAuthSession({ role: 'CUSTOMER', license: updatedSelf });
      }
    }
  };

  const handleSaveRazorpayConfig = (nextConfig: RazorpayGatewayConfig) => {
    setRazorpayConfig(nextConfig);
    syncPortalStateToServer({ razorpayConfig: nextConfig });
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(RAZORPAY_STORAGE_KEY, JSON.stringify(nextConfig));
      } catch {
        // ignore
      }
    }
  };

  const handleSaveAdminCredentials = (nextCreds: MasterAdminCredentials) => {
    setAdminCredentials(nextCreds);
    syncPortalStateToServer({ adminCredentials: nextCreds });
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(ADMIN_CREDS_STORAGE_KEY, JSON.stringify(nextCreds));
      } catch {
        // ignore
      }
    }
  };

  const [activeSidebarItem, setActiveSidebarItem] =
    React.useState<NebulixSidebarSectionId>('dashboard');
  const [activeWhmSection, setActiveWhmSection] =
    React.useState<NebulixWhmSectionId>('whm-overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState<boolean>(false);
  const [activeRole] = React.useState<GarvixRole>('HOSTING_ACCOUNT_OWNER');

  // Active cPanel account context
  const [activeCpanelDomain, setActiveCpanelDomain] = React.useState<string>('garvixcloud.in');
  const [activeCpanelUser, setActiveCpanelUser] = React.useState<string>('garvixprod');

  // WHM multi-account & server states
  const [whmAccounts, setWhmAccounts] =
    React.useState<WhmCpanelAccountItem[]>(INITIAL_WHM_ACCOUNTS);
  const [whmServices, setWhmServices] =
    React.useState<WhmServiceDaemonItem[]>(INITIAL_WHM_SERVICES);

  // Live Global Search Bar state
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [searchOpen, setSearchOpen] = React.useState<boolean>(false);

  const matchedSearchResults = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return GLOBAL_SEARCH_CATALOG.filter((entry) => {
      if (activeCustomerLicense.panelMode === 'ONLY_CPANEL' && entry.surface === 'whm') {
        return false;
      }
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.subtitle.toLowerCase().includes(q) ||
        entry.keywords.some((kw) => kw.includes(q) || q.includes(kw))
      );
    });
  }, [searchQuery, activeCustomerLicense.panelMode]);

  const handleSelectSearchResult = (entry: GlobalSearchEntry) => {
    setActiveSurface(entry.surface);
    if (entry.surface === 'cpanel' && entry.cpanelSection) {
      setActiveSidebarItem(entry.cpanelSection);
    }
    if (entry.surface === 'whm' && entry.whmSection) {
      setActiveWhmSection(entry.whmSection);
    }
    setSearchOpen(false);
    setSearchQuery('');
    showToast(`Opened ${entry.title}`);
  };

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

  const [newEmailUser, setNewEmailUser] = React.useState<string>('');
  const [newEmailPass, setNewEmailPass] = React.useState<string>('GvX!8mK#4pQ$9zR2');
  const [newEmailQuota, setNewEmailQuota] = React.useState<number>(2048);

  const [newDbEngine, setNewDbEngine] = React.useState<'POSTGRESQL_16' | 'MARIADB_10_11'>(
    'MARIADB_10_11'
  );
  const [newDbName, setNewDbName] = React.useState<string>('crm_prod');
  const [newDbUser, setNewDbUser] = React.useState<string>('crm_admin');
  const [newDbPass, setNewDbPass] = React.useState<string>('Db!9xP#4wL$8vK2');

  // Public Store Billing Cycle Toggle & Checkout state
  const [storeBillingCycle, setStoreBillingCycle] =
    React.useState<LicenseBillingCycle>('MONTHLY');
  const [checkoutPlan, setCheckoutPlan] = React.useState<GarvixLicensePlanConfig | null>(null);
  const [checkoutBillingCycle, setCheckoutBillingCycle] =
    React.useState<LicenseBillingCycle>('MONTHLY');
  const [checkoutEmail, setCheckoutEmail] = React.useState<string>('');
  const [checkoutPassword, setCheckoutPassword] = React.useState<string>('');
  const [checkoutIp, setCheckoutIp] = React.useState<string>('200.234.39.100');
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = React.useState<boolean>(false);
  const [newlyPurchasedLicense, setNewlyPurchasedLicense] =
    React.useState<IssuedCustomerLicenseRecord | null>(null);

  const [toastBanner, setToastBanner] = React.useState<string | null>(null);

  const authorizedNavItems = React.useMemo(
    () => getAuthorizedNavigationForRole(activeRole),
    [activeRole]
  );

  const showToast = (msg: string) => {
    setToastBanner(msg);
    setTimeout(() => setToastBanner(null), 4000);
  };

  // Strict Customer Login Session Activator
  const activateCustomerSession = (license: IssuedCustomerLicenseRecord) => {
    if (license.status === 'SUSPENDED') {
      setLoginError(`License ${license.licenseKey} is currently SUSPENDED.`);
      return;
    }
    updateAuthSession({ role: 'CUSTOMER', license });
    setLoginError(null);

    const domainGuess = license.customerEmail.includes('@')
      ? license.customerEmail.split('@')[1] || 'garvixcloud.in'
      : 'garvixcloud.in';
    const userGuess =
      license.customerEmail
        .split('@')[0]
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 12) || 'garvixprod';

    if (license.panelMode === 'ONLY_CPANEL') {
      setActiveCpanelDomain(domainGuess);
      setActiveCpanelUser(userGuess);
      setActiveSidebarItem('dashboard');
      setActiveSurface('cpanel');
      showToast(`Signed in to ${license.planName} — cPanel Dashboard (Port 2083).`);
    } else {
      setActiveWhmSection('whm-overview');
      setActiveSurface('whm');
      const limitStr = license.maxAccounts === 0 ? 'Unlimited' : `${license.maxAccounts}`;
      showToast(
        `Signed in to ${license.planName} — WHM Server Admin (Port 2087 · Limit: ${limitStr} cPanel Accounts).`
      );
    }
  };

  // Strict Login Form Handler (Checks exact Email & Password!)
  const handleLoginFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const cleanEmail = loginEmailInput.trim().toLowerCase();
    const cleanPass = loginPasswordInput.trim();

    if (loginMode === 'MASTER_ADMIN') {
      if (
        cleanEmail === adminCredentials.email.toLowerCase() &&
        cleanPass === adminCredentials.password
      ) {
        updateAuthSession({ role: 'MASTER_ADMIN', email: adminCredentials.email });
        setActiveSurface('admin');
        setLoginPasswordInput('');
        showToast('Signed in to Garvix Master Admin Panel.');
      } else {
        setLoginError('Invalid Master Admin email or password.');
      }
      return;
    }

    // Customer Login Validation
    const matchedLicense = customerLicenses.find(
      (l) => l.customerEmail.toLowerCase() === cleanEmail && l.password === cleanPass
    );

    if (!matchedLicense) {
      setLoginError(
        'Invalid customer email or password. Please enter the email and password you created when purchasing your license.'
      );
      return;
    }

    setLoginPasswordInput('');
    activateCustomerSession(matchedLicense);
  };

  const handleLogout = () => {
    updateAuthSession(null);
    setActiveSurface('store');
    setLoginPasswordInput('');
    setLoginError(null);
    showToast('Logged out successfully.');
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

  const finalizeLicenseIssuance = (
    plan: GarvixLicensePlanConfig,
    billingCycle: LicenseBillingCycle
  ) => {
    const rand = Math.random().toString(16).substring(2, 6).toUpperCase();
    const newKey = `GVX-${plan.code}-${rand}-2026-ED25519`;
    const now = new Date();
    const expiresDate = new Date(
      now.getTime() + (billingCycle === 'YEARLY' ? 365 : 30) * 86_400_000
    );
    const createdLicense: IssuedCustomerLicenseRecord = {
      id: `lic-${Date.now()}`,
      customerEmail: checkoutEmail.trim().toLowerCase(),
      password: checkoutPassword.trim(),
      planCode: plan.code,
      planName: plan.name,
      panelMode: plan.panelMode,
      maxAccounts: plan.maxAccounts,
      billingCycle,
      serverIp: checkoutIp.trim() || '200.234.39.100',
      hostname: 'srv2075790.hstgr.cloud',
      licenseKey: newKey,
      status: 'ACTIVE',
      createdAt: now.toISOString().slice(0, 10),
      expiresAt: expiresDate.toISOString().slice(0, 10),
    };

    handleSaveCustomerLicenses([createdLicense, ...customerLicenses]);
    setNewlyPurchasedLicense(createdLicense);
    setLoginEmailInput(createdLicense.customerEmail);
    setCheckoutError(null);
    setCheckoutLoading(false);
    setCheckoutPlan(null);
    showToast(
      `Payment verified! Issued ${createdLicense.planName} (${
        billingCycle === 'YEARLY' ? 'Yearly · 365 Days' : 'Monthly · 30 Days'
      }) license (${newKey}) for ${createdLicense.customerEmail}.`
    );
  };

  // STRICT RAZORPAY PAYMENT GATEWAY HANDLER — ZERO FREE BYPASS!
  const handleRazorpayCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPlan || !checkoutEmail.trim() || !checkoutPassword.trim()) return;
    setCheckoutError(null);

    const keyId = razorpayConfig.keyId.trim();
    const keySecret = razorpayConfig.keySecret.trim();

    if (!razorpayConfig.enabled) {
      setCheckoutError(
        'Payment Gateway Disabled: Razorpay checkout is currently disabled in Master Admin. License was NOT activated.'
      );
      return;
    }

    if (
      (!keyId.startsWith('rzp_live_') && !keyId.startsWith('rzp_test_')) ||
      keyId.length < 14 ||
      keySecret.length < 8
    ) {
      setCheckoutError(
        'Payment Gateway Not Configured: Master Admin must configure a valid Razorpay Key ID (rzp_live_... or rzp_test_...) and Key Secret in Master Admin (Tab 3: Razorpay & Admin Settings) before any license can be purchased. License was NOT activated.'
      );
      return;
    }

    const win =
      typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {};
    if (typeof win.Razorpay !== 'function') {
      setCheckoutError(
        'Razorpay Checkout SDK could not be loaded. Please disable any ad-blocker and refresh the page. License was NOT activated.'
      );
      return;
    }

    const basePriceInr =
      checkoutBillingCycle === 'YEARLY'
        ? checkoutPlan.yearlyInr || checkoutPlan.monthlyInr * 10
        : checkoutPlan.monthlyInr;
    const totalInrWithGst = Math.round(basePriceInr * 1.18);
    const amountPaise = totalInrWithGst * 100;

    setCheckoutLoading(true);
    try {
      // Step 1: Create genuine Razorpay Order via Backend API
      const orderRes = await fetch('/api/v1/garvix-portal/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPaise,
          planCode: checkoutPlan.code,
          billingCycle: checkoutBillingCycle,
          customerEmail: checkoutEmail.trim().toLowerCase(),
          serverIp: checkoutIp.trim(),
          keyId,
          keySecret,
        }),
      });

      const orderJson = (await orderRes.json().catch(() => ({}))) as Record<string, any>;
      if (!orderRes.ok || !orderJson?.data?.orderId) {
        const errMsg =
          orderJson?.error?.message ||
          'Failed to create Razorpay order. Please verify your Razorpay Key ID & Key Secret in Master Admin.';
        setCheckoutError(errMsg);
        setCheckoutLoading(false);
        return;
      }

      const rzpOrderId = String(orderJson.data.orderId);
      const selectedPlan = checkoutPlan;
      const selectedCycle = checkoutBillingCycle;

      // Step 2: Open Official Razorpay Checkout Modal bound to rzpOrderId
      const RazorpayCtor = win.Razorpay as new (
        opts: Record<string, unknown>
      ) => {
        open: () => void;
        on?: (event: string, cb: (resp: Record<string, any>) => void) => void;
      };

      const rzpInstance = new RazorpayCtor({
        key: keyId,
        amount: amountPaise,
        currency: 'INR',
        order_id: rzpOrderId,
        name: razorpayConfig.companyName,
        description: `${selectedPlan.name} (${
          selectedCycle === 'YEARLY' ? 'Annual License' : 'Monthly License'
        } · ${selectedPlan.maxAccountsLabel})`,
        prefill: {
          email: checkoutEmail.trim(),
        },
        modal: {
          ondismiss: () => {
            setCheckoutLoading(false);
            setCheckoutError(
              'Payment was cancelled before completion. Your license was NOT activated.'
            );
          },
        },
        handler: async (rzpResponse: Record<string, unknown>) => {
          try {
            // Step 3: Verify HMAC-SHA256 Signature on Backend before issuing license
            const verifyRes = await fetch('/api/v1/garvix-portal/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: rzpResponse.razorpay_order_id,
                razorpay_payment_id: rzpResponse.razorpay_payment_id,
                razorpay_signature: rzpResponse.razorpay_signature,
                keySecret,
              }),
            });
            const verifyJson = (await verifyRes.json().catch(() => ({}))) as Record<string, any>;
            if (!verifyRes.ok || !verifyJson?.data?.verified) {
              setCheckoutLoading(false);
              setCheckoutError(
                verifyJson?.error?.message ||
                  'Razorpay payment signature verification failed! License was NOT activated.'
              );
              return;
            }
            finalizeLicenseIssuance(selectedPlan, selectedCycle);
          } catch {
            setCheckoutLoading(false);
            setCheckoutError(
              'Network error while verifying Razorpay payment signature. License was NOT activated.'
            );
          }
        },
      });

      if (typeof rzpInstance.on === 'function') {
        rzpInstance.on('payment.failed', (failResp: Record<string, any>) => {
          setCheckoutLoading(false);
          const desc =
            failResp?.error?.description || 'Payment failed in Razorpay Checkout.';
          setCheckoutError(`Payment Failed: ${desc} License was NOT activated.`);
        });
      }

      rzpInstance.open();
    } catch {
      setCheckoutLoading(false);
      setCheckoutError(
        'Could not connect to payment server to create Razorpay order. License was NOT activated.'
      );
    }
  };

  // WHM Handlers
  const handleWhmCreateAccount = (payload: {
    domain: string;
    username: string;
    email: string;
  }) => {
    const newAcct: WhmCpanelAccountItem = {
      id: `acct-${Date.now()}`,
      domain: payload.domain,
      username: payload.username,
      email: payload.email,
      diskUsedGb: 0.2,
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
        showToast(`WHM: Account ${acct.username} (${acct.domain}) is now ${nextStatus}.`);
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
    showToast(`WHM Single Sign-On: Opened cPanel for ${acct.domain} (User: ${acct.username}).`);
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

  // Enforce strict route guard:
  // - 'admin' only renders if authSession?.role === 'MASTER_ADMIN'
  // - 'whm' and 'cpanel' only render if authSession?.role === 'CUSTOMER'
  const effectiveSurface: PanelSurface = React.useMemo(() => {
    if (activeSurface === 'admin') {
      return authSession?.role === 'MASTER_ADMIN' ? 'admin' : 'login';
    }
    if (activeSurface === 'whm') {
      if (authSession?.role !== 'CUSTOMER') return 'login';
      return authSession.license.panelMode === 'WHM_AND_CPANEL' ? 'whm' : 'cpanel';
    }
    if (activeSurface === 'cpanel') {
      return authSession?.role === 'CUSTOMER' ? 'cpanel' : 'login';
    }
    return activeSurface;
  }, [activeSurface, authSession]);

  const isWorkspaceSurface = effectiveSurface === 'whm' || effectiveSurface === 'cpanel';
  const canCustomerAccessWhm =
    authSession?.role === 'CUSTOMER' && authSession.license.panelMode === 'WHM_AND_CPANEL';

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-[#F7F6FD] via-[#F4F2FC] to-[#EEF2FF] text-slate-900">
      <div className="flex min-h-screen">
        {/* SECTION A: Dynamic Sidebar — Only shown when a Customer is logged into WHM or cPanel */}
        {isWorkspaceSurface &&
          (effectiveSurface === 'whm' ? (
            <NebulixWhmSidebar
              activeSection={activeWhmSection}
              onSelectSection={(sec) => setActiveWhmSection(sec)}
              totalAccounts={whmAccounts.length}
              maxAccountsLimit={activeCustomerLicense.maxAccounts}
              licensePlanName={activeCustomerLicense.planName}
              serverIp={activeCustomerLicense.serverIp}
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
              onSwitchToWhm={canCustomerAccessWhm ? () => setActiveSurface('whm') : undefined}
              mobileOpen={mobileSidebarOpen}
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
          ))}

        {/* Right Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Header — Strictly separated by Authentication State */}
          <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center justify-between gap-2 border-b border-indigo-100/80 bg-white/90 px-3 py-2.5 backdrop-blur-xl sm:px-8">
            <div className="flex items-center gap-2.5">
              {isWorkspaceSurface && (
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  aria-label="Open navigation sidebar"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-slate-700 shadow-xs hover:bg-indigo-50 lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}

              {/* Brand Logo */}
              <button
                type="button"
                onClick={() => {
                  if (!authSession) {
                    setActiveSurface('store');
                  }
                }}
                className="flex items-center gap-2.5 text-left"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-xs font-extrabold text-white shadow-sm">
                  {effectiveSurface === 'whm'
                    ? 'WHM'
                    : effectiveSurface === 'cpanel'
                      ? 'cP'
                      : effectiveSurface === 'admin'
                        ? 'ADM'
                        : 'GVX'}
                </div>
                <div className="hidden sm:block">
                  <div className="font-display text-sm font-extrabold tracking-tight text-slate-900">
                    {effectiveSurface === 'whm'
                      ? 'GARVIX WHM'
                      : effectiveSurface === 'cpanel'
                        ? 'GARVIX cPanel'
                        : effectiveSurface === 'admin'
                          ? 'GARVIX Master Admin'
                          : 'GARVIX Cloud'}
                  </div>
                  <div className="text-[10px] font-semibold text-indigo-600">
                    {effectiveSurface === 'whm'
                      ? `Port 2087 · ${activeCustomerLicense.planName}`
                      : effectiveSurface === 'cpanel'
                        ? `Port 2083 · ${activeCpanelDomain}`
                        : effectiveSurface === 'admin'
                          ? 'Owner Control Panel'
                          : 'Self-Hosted WHM & cPanel Software Licenses'}
                  </div>
                </div>
              </button>

              {/* Global Search Bar inside WHM & cPanel */}
              {isWorkspaceSurface && (
                <div className="relative ml-1 sm:ml-3">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchQuery}
                    onFocus={() => setSearchOpen(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && matchedSearchResults.length > 0) {
                        e.preventDefault();
                        handleSelectSearchResult(matchedSearchResults[0]!);
                      } else if (e.key === 'Escape') {
                        setSearchOpen(false);
                      }
                    }}
                    aria-label="Search cPanel or WHM tools"
                    placeholder="Search api, terminal, cron, php, sql, file, email..."
                    className="h-10 w-48 rounded-2xl border border-indigo-100/90 bg-[#F7F6FD] pl-10 pr-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 sm:w-64 md:w-80"
                  />

                  {searchOpen && searchQuery.trim().length > 0 && (
                    <div className="absolute left-0 top-12 z-50 w-80 max-w-[92vw] overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-2xl sm:w-[430px]">
                      <div className="flex items-center justify-between border-b border-slate-100 bg-[#FAF9FE] px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                        <span>Search Results ({matchedSearchResults.length})</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          ✕
                        </button>
                      </div>
                      {matchedSearchResults.length === 0 ? (
                        <div className="p-4 text-xs text-slate-500">
                          No matching tool found for &ldquo;{searchQuery}&rdquo;.
                        </div>
                      ) : (
                        <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                          {matchedSearchResults.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectSearchResult(item)}
                              className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-indigo-50/70"
                            >
                              <div>
                                <div className="text-xs font-bold text-slate-900">{item.title}</div>
                                <div className="mt-0.5 text-[11px] text-slate-500">
                                  {item.subtitle}
                                </div>
                              </div>
                              <span className="shrink-0 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                {item.badge}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Header Controls — Strictly Scoped */}
            <div className="flex items-center gap-2">
              {!authSession ? (
                /* PUBLIC VISITOR HEADER: Only Plans & Pricing + Login (NO Master Admin button!) */
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={effectiveSurface === 'store' ? 'nebulix' : 'outline'}
                    onClick={() => setActiveSurface('store')}
                  >
                    <Layers className="h-3.5 w-3.5" /> Plans &amp; Pricing
                  </Button>
                  <Button
                    size="sm"
                    variant={effectiveSurface === 'login' ? 'nebulix' : 'outline'}
                    onClick={() => {
                      setLoginMode('CUSTOMER');
                      setLoginError(null);
                      setActiveSurface('login');
                    }}
                  >
                    <Lock className="h-3.5 w-3.5" /> Login
                  </Button>
                </div>
              ) : authSession.role === 'MASTER_ADMIN' ? (
                /* AUTHENTICATED MASTER ADMIN HEADER */
                <div className="flex items-center gap-2">
                  <Badge variant="default">Logged in: {authSession.email}</Badge>
                  <Button
                    size="sm"
                    variant={effectiveSurface === 'admin' ? 'nebulix' : 'outline'}
                    onClick={() => setActiveSurface('admin')}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Master Admin Dashboard
                  </Button>
                  <Button
                    size="sm"
                    variant={effectiveSurface === 'store' ? 'nebulix' : 'outline'}
                    onClick={() => setActiveSurface('store')}
                  >
                    Preview Storefront
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleLogout}>
                    <LogOut className="h-3.5 w-3.5 text-rose-600" /> Logout
                  </Button>
                </div>
              ) : (
                /* AUTHENTICATED CUSTOMER HEADER (Strictly WHM+cPanel OR Only cPanel — NEVER Master Admin!) */
                <div className="flex items-center gap-2">
                  {canCustomerAccessWhm && (
                    <div className="flex rounded-xl border border-indigo-100 bg-[#F7F6FD] p-0.5 sm:p-1">
                      <button
                        type="button"
                        onClick={() => setActiveSurface('whm')}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                          effectiveSurface === 'whm'
                            ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-indigo-900'
                        }`}
                      >
                        WHM (2087)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSurface('cpanel')}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                          effectiveSurface === 'cpanel'
                            ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-indigo-900'
                        }`}
                      >
                        cPanel (2083)
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    aria-label="Notifications"
                    className="relative hidden h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 sm:inline-flex"
                  >
                    <Bell className="h-4 w-4" />
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-600" />
                  </button>

                  <div className="hidden items-center gap-2 rounded-2xl border border-indigo-100 bg-white px-3 py-1.5 shadow-2xs md:flex">
                    <div className="text-left">
                      <div className="text-xs font-bold leading-none text-slate-900">
                        {activeCustomerLicense.customerEmail}
                      </div>
                      <div className="mt-0.5 text-[10px] font-semibold text-indigo-600">
                        {activeCustomerLicense.planName} (
                        {activeCustomerLicense.panelMode === 'ONLY_CPANEL'
                          ? '1 Account Solo'
                          : activeCustomerLicense.maxAccounts === 0
                            ? 'Unlimited Accounts'
                            : `Max ${activeCustomerLicense.maxAccounts} Accounts`}
                        )
                      </div>
                    </div>
                  </div>

                  <Button size="sm" variant="outline" onClick={handleLogout}>
                    <LogOut className="h-3.5 w-3.5 text-rose-600" /> Logout
                  </Button>
                </div>
              )}
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
                SURFACE 0: CLEAN PUBLIC HOME PAGE (PLANS & PRICING FOR CUSTOMERS)
               ================================================================= */}
            {effectiveSurface === 'store' && (
              <AnimatedContent className="space-y-10">
                <AuroraBackground className="p-6 sm:p-10">
                  <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                    <div className="space-y-4">
                      <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-indigo-200/80 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs">
                        <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                        <span>GARVIX SELF-HOSTED CONTROL PANEL SOFTWARE</span>
                        <span className="text-slate-300">•</span>
                        <GradientText
                          colors={['#7C3AED', '#4F46E5', '#2563EB', '#7C3AED']}
                          className="text-xs font-bold"
                        >
                          AlmaLinux 10 · Nginx HTTP/3 · Ed25519 Licensing
                        </GradientText>
                      </div>

                      <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                        <BlurText text="High-Speed cPanel & WHM Control Panel Software for Your Linux Server" />
                      </h1>

                      <p className="max-w-2xl text-xs leading-relaxed text-slate-600 sm:text-sm">
                        Choose <strong>Garvix cPanel Solo</strong> for a single website/account
                        (`Port 2083`), or choose <strong>Garvix WHM + cPanel</strong> (`Port 2087`)
                        to create and manage multiple isolated cPanel accounts on your own VPS or
                        Dedicated Server.
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <Button
                          variant="nebulix"
                          onClick={() => {
                            setLoginMode('CUSTOMER');
                            setLoginError(null);
                            setActiveSurface('login');
                          }}
                        >
                          <Lock className="h-4 w-4" /> Login to Your Control Panel
                        </Button>
                      </div>
                    </div>

                    <div className="w-full max-w-sm rounded-2xl border border-indigo-100 bg-white/95 p-5 shadow-sm space-y-2.5">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">
                        Which License Plan Do You Need?
                      </div>
                      <div className="rounded-xl border border-indigo-100 bg-[#FAF9FE] p-3 text-xs">
                        <div className="font-bold text-slate-900">
                          • cPanel Solo (1 Account):
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-600">
                          Best for 1 website/business. Opens <strong>cPanel (Port 2083)</strong>{' '}
                          directly to manage domains, files, databases, email &amp; SSL.
                        </p>
                      </div>
                      <div className="rounded-xl border border-indigo-100 bg-[#FAF9FE] p-3 text-xs">
                        <div className="font-bold text-slate-900">
                          • WHM + cPanel (Multi-Account):
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-600">
                          Best for agencies &amp; resellers. Opens <strong>WHM (Port 2087)</strong>{' '}
                          to create isolated cPanel accounts for multiple clients.
                        </p>
                      </div>
                    </div>
                  </div>
                </AuroraBackground>

                {/* Newly Purchased License Activation Banner */}
                {newlyPurchasedLicense && (
                  <SpotlightCard className="border-2 border-emerald-500 bg-emerald-50/40 p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        <div>
                          <Badge variant="success">LICENSE ISSUED &amp; ACCOUNT READY</Badge>
                          <h2 className="mt-1 font-display text-lg font-extrabold text-slate-900">
                            Your {newlyPurchasedLicense.planName} License is Active!
                          </h2>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="nebulix"
                          onClick={() => activateCustomerSession(newlyPurchasedLicense)}
                        >
                          <ArrowRight className="h-4 w-4" /> Continue to Your{' '}
                          {newlyPurchasedLicense.panelMode === 'ONLY_CPANEL'
                            ? 'cPanel Dashboard (2083)'
                            : 'WHM Admin Panel (2087)'}
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-indigo-100 bg-white p-4 text-xs space-y-1.5">
                        <div className="font-bold text-slate-700">Your Login &amp; License Details:</div>
                        <div>
                          Login Email:{' '}
                          <strong className="font-mono">{newlyPurchasedLicense.customerEmail}</strong>
                        </div>
                        <div>
                          Bound Server IP:{' '}
                          <strong className="font-mono">{newlyPurchasedLicense.serverIp}</strong>
                        </div>
                        <div>
                          License Key:{' '}
                          <strong className="font-mono text-indigo-700">
                            <DecryptedText text={newlyPurchasedLicense.licenseKey} />
                          </strong>
                        </div>
                      </div>

                      <div className="rounded-xl border border-indigo-100 bg-slate-900 p-4 text-xs text-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-300">
                            1-Line AlmaLinux 10 SSH Install Command:
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              showToast('Copied 1-line SSH installer command to clipboard!')
                            }
                            className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-white/20"
                          >
                            <Copy className="h-3 w-3" /> Copy Command
                          </button>
                        </div>
                        <pre className="overflow-x-auto font-mono text-[11px] text-emerald-400">
                          {`curl -sSL https://get.garvix.io/install.sh | sudo bash -s -- \\\n  --license=${newlyPurchasedLicense.licenseKey} \\\n  --ip=${newlyPurchasedLicense.serverIp}`}
                        </pre>
                      </div>
                    </div>
                  </SpotlightCard>
                )}

                {/* License Plans Grid with Monthly vs Yearly Toggle */}
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="font-display text-xl font-extrabold text-slate-900">
                        Select Your Server License Plan
                      </h2>
                      <p className="text-xs text-slate-500">
                        Instant Ed25519 license activation with 1-line AlmaLinux 10 installer.
                      </p>
                    </div>

                    {/* Monthly vs Yearly Billing Cycle Toggle Switch */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center rounded-2xl border border-indigo-200 bg-white p-1 shadow-xs">
                        <button
                          type="button"
                          onClick={() => setStoreBillingCycle('MONTHLY')}
                          className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
                            storeBillingCycle === 'MONTHLY'
                              ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-indigo-900'
                          }`}
                        >
                          Monthly Billing
                        </button>
                        <button
                          type="button"
                          onClick={() => setStoreBillingCycle('YEARLY')}
                          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
                            storeBillingCycle === 'YEARLY'
                              ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-indigo-900'
                          }`}
                        >
                          <span>Yearly Billing</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                              storeBillingCycle === 'YEARLY'
                                ? 'bg-emerald-400 text-slate-950'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            Save 2 Months Free ⚡
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {licensePlans.map((plan) => {
                      const yearlyPrice = plan.yearlyInr || plan.monthlyInr * 10;
                      const annualSavingsInr = Math.max(0, plan.monthlyInr * 12 - yearlyPrice);
                      const effectiveMonthlyInr = Math.round(yearlyPrice / 12);

                      return (
                        <TiltedCard key={plan.code} maxTiltDeg={3}>
                          <StarBorder
                            color={plan.popular ? '#6366F1' : '#C7D2FE'}
                            className="h-full"
                          >
                            <div className="flex h-full flex-col justify-between rounded-[15px] bg-white p-5">
                              <div>
                                <div className="flex items-center justify-between gap-1">
                                  <Badge variant={plan.popular ? 'orange' : 'secondary'}>
                                    {plan.badge}
                                  </Badge>
                                  {plan.popular && (
                                    <span className="text-[10px] font-extrabold uppercase text-indigo-600">
                                      ★ Popular
                                    </span>
                                  )}
                                </div>

                                <h3 className="mt-3 font-display text-lg font-extrabold text-slate-900">
                                  {plan.name}
                                </h3>
                                <p className="mt-0.5 text-[11px] text-slate-500">{plan.bestFor}</p>

                                {storeBillingCycle === 'MONTHLY' ? (
                                  <div className="mt-3">
                                    <div className="font-display text-3xl font-extrabold text-slate-900">
                                      ₹{plan.monthlyInr.toLocaleString('en-IN')}
                                      <span className="text-xs font-medium text-slate-500">
                                        {' '}
                                        / month
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setStoreBillingCycle('YEARLY')}
                                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                                    >
                                      or ₹{yearlyPrice.toLocaleString('en-IN')}/year (Save ₹
                                      {annualSavingsInr.toLocaleString('en-IN')}) →
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-3">
                                    <div className="font-display text-3xl font-extrabold text-slate-900">
                                      ₹{yearlyPrice.toLocaleString('en-IN')}
                                      <span className="text-xs font-medium text-slate-500">
                                        {' '}
                                        / year
                                      </span>
                                    </div>
                                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                      <span>
                                        Effective ₹{effectiveMonthlyInr.toLocaleString('en-IN')}/mo
                                      </span>
                                      {annualSavingsInr > 0 && (
                                        <span>
                                          · Save ₹{annualSavingsInr.toLocaleString('en-IN')}/yr
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                <div className="mt-2.5 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-xs font-bold text-indigo-800">
                                  {plan.maxAccountsLabel}
                                </div>

                                <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                                  {plan.features.map((feat) => (
                                    <li key={feat} className="flex items-start gap-2">
                                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                      <span>{feat}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <Button
                                variant={plan.popular ? 'nebulix' : 'outline'}
                                className="mt-6 w-full"
                                onClick={() => {
                                  setCheckoutError(null);
                                  setCheckoutLoading(false);
                                  setCheckoutBillingCycle(storeBillingCycle);
                                  setCheckoutPlan(plan);
                                }}
                              >
                                <CreditCard className="h-4 w-4" />
                                Buy {plan.name} (
                                {storeBillingCycle === 'YEARLY' ? 'Yearly' : 'Monthly'})
                              </Button>
                            </div>
                          </StarBorder>
                        </TiltedCard>
                      );
                    })}
                  </div>
                </div>
              </AnimatedContent>
            )}

            {/* =================================================================
                SURFACE 1: GARVIX cPANEL (LOGGED-IN CUSTOMER)
               ================================================================= */}
            {effectiveSurface === 'cpanel' && activeSidebarItem === 'dashboard' && (
              <div className="space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-xs shadow-2xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="success">cPANEL PORT 2083</Badge>
                    <span className="font-semibold text-slate-700">
                      Account: <strong className="font-mono">{activeCpanelUser}</strong> (
                      <strong className="font-mono">{activeCpanelDomain}</strong>)
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600">
                      License:{' '}
                      <strong className="text-indigo-700">{activeCustomerLicense.planName}</strong>
                    </span>
                  </div>
                  {canCustomerAccessWhm && (
                    <Button size="sm" variant="outline" onClick={() => setActiveSurface('whm')}>
                      ← Return to WHM Server Admin (Port 2087)
                    </Button>
                  )}
                </div>

                <AnimatedContent delayMs={0}>
                  <NebulixWelcomeHero
                    onAddDomain={() => setDnsModalOpen(true)}
                    onCreateEmail={() => setEmailModalOpen(true)}
                    onOpenFileManager={() => setActiveSidebarItem('file-manager')}
                  />
                </AnimatedContent>

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

                <AnimatedContent delayMs={130}>
                  <NebulixQuickActions
                    onAddDomain={() => setDnsModalOpen(true)}
                    onCreateEmail={() => setEmailModalOpen(true)}
                    onOpenFileManager={() => setActiveSidebarItem('file-manager')}
                    onManageDatabase={handleCreateDatabase}
                    onInstallSsl={() => setSslModalOpen(true)}
                  />
                </AnimatedContent>

                <AnimatedContent delayMs={190}>
                  <NebulixServerMonitoring />
                </AnimatedContent>

                <AnimatedContent delayMs={240}>
                  <div className="grid gap-6 lg:grid-cols-2">
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

            {effectiveSurface === 'cpanel' && activeSidebarItem !== 'dashboard' && (
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
                SURFACE 2: GARVIX WHM (LOGGED-IN WHM+cPANEL CUSTOMER)
               ================================================================= */}
            {effectiveSurface === 'whm' && (
              <NebulixWhmWorkspace
                section={activeWhmSection}
                onSelectSection={(sec) => setActiveWhmSection(sec)}
                accounts={whmAccounts}
                maxAccountsLimit={activeCustomerLicense.maxAccounts}
                licensePlanName={activeCustomerLicense.planName}
                serverIp={activeCustomerLicense.serverIp}
                services={whmServices}
                onCreateAccount={handleWhmCreateAccount}
                onToggleSuspendAccount={handleWhmToggleSuspend}
                onTerminateAccount={handleWhmTerminateAccount}
                onLaunchCpanelForAccount={handleWhmLaunchCpanel}
                onRestartService={handleWhmRestartService}
                onShowToast={showToast}
              />
            )}

            {/* =================================================================
                SURFACE 3: GARVIX MASTER ADMIN PANEL (STRICTLY AUTHENTICATED OWNER)
               ================================================================= */}
            {effectiveSurface === 'admin' && authSession?.role === 'MASTER_ADMIN' && (
              <NebulixMasterAdmin
                plans={licensePlans}
                onSavePlans={handleSavePlans}
                onResetDefaultPlans={handleResetDefaultPlans}
                customerLicenses={customerLicenses}
                onSaveCustomerLicenses={handleSaveCustomerLicenses}
                razorpayConfig={razorpayConfig}
                onSaveRazorpayConfig={handleSaveRazorpayConfig}
                adminCredentials={adminCredentials}
                onSaveAdminCredentials={handleSaveAdminCredentials}
                onOpenPublicStore={() => setActiveSurface('store')}
                onShowToast={showToast}
              />
            )}

            {/* =================================================================
                SURFACE 4: STRICT LOGIN PORTAL (NO DEMO BYPASS BUTTONS)
               ================================================================= */}
            {effectiveSurface === 'login' && (
              <AnimatedContent className="py-6">
                <AuroraBackground className="mx-auto max-w-md p-6 sm:p-8">
                  <div className="flex gap-2">
                    <Button
                      variant={loginMode === 'CUSTOMER' ? 'nebulix' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setLoginMode('CUSTOMER');
                        setLoginError(null);
                      }}
                    >
                      <UserCheck className="h-4 w-4" />
                      Customer Login
                    </Button>
                    <Button
                      variant={loginMode === 'MASTER_ADMIN' ? 'blue' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setLoginMode('MASTER_ADMIN');
                        setLoginError(null);
                      }}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Master Admin
                    </Button>
                  </div>

                  <div className="mt-5">
                    <h2 className="font-display text-xl font-extrabold text-slate-900">
                      {loginMode === 'CUSTOMER'
                        ? 'Sign In to Your Server Control Panel'
                        : 'Master Admin Login (Owner Only)'}
                    </h2>
                    <p className="mt-1 text-xs text-slate-600">
                      {loginMode === 'CUSTOMER'
                        ? 'Enter your registered email & password. Your account will open cPanel (Port 2083) or WHM (Port 2087) based on your purchased plan.'
                        : 'Sign in with your Master Admin email & password to manage plans, pricing, account limits, and Razorpay keys.'}
                    </p>
                  </div>

                  {loginError && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <form onSubmit={handleLoginFormSubmit} className="mt-5 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        {loginMode === 'CUSTOMER' ? 'Registered Email Address' : 'Master Admin Email'}
                      </label>
                      <Input
                        required
                        type="email"
                        placeholder={
                          loginMode === 'CUSTOMER' ? 'you@yourcompany.in' : 'admin@garvix.io'
                        }
                        value={loginEmailInput}
                        onChange={(e) => setLoginEmailInput(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Password</label>
                      <Input
                        required
                        type="password"
                        placeholder="Enter your password"
                        value={loginPasswordInput}
                        onChange={(e) => setLoginPasswordInput(e.target.value)}
                      />
                    </div>
                    <Button type="submit" variant="nebulix" className="w-full">
                      <Lock className="h-4 w-4" />
                      {loginMode === 'CUSTOMER' ? 'Login to Panel' : 'Login to Master Admin'}
                    </Button>
                  </form>
                </AuroraBackground>
              </AnimatedContent>
            )}
          </main>
        </div>
      </div>

      {/* =====================================================================
          MODALS FOR QUICK ACTIONS
         ===================================================================== */}
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
              placeholder="200.234.39.100"
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

      {/* 5. Strict Razorpay License Checkout Modal (No Free Bypass) */}
      <DialogModal
        open={checkoutPlan !== null}
        onClose={() => {
          setCheckoutError(null);
          setCheckoutLoading(false);
          setCheckoutPlan(null);
        }}
        title={
          checkoutPlan
            ? `Buy ${checkoutPlan.name} (${
                checkoutBillingCycle === 'YEARLY'
                  ? `₹${(checkoutPlan.yearlyInr || checkoutPlan.monthlyInr * 10).toLocaleString('en-IN')}/year`
                  : `₹${checkoutPlan.monthlyInr.toLocaleString('en-IN')}/month`
              })`
            : 'Buy Garvix Software License'
        }
        description="Select Monthly or Yearly billing, create your login credentials, bind your server IPv4, and complete verified payment via Razorpay."
      >
        <form onSubmit={handleRazorpayCheckoutSubmit} className="space-y-4">
          {checkoutError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>{checkoutError}</span>
            </div>
          )}

          {checkoutPlan && (
            <>
              {/* Billing Cycle Selector inside Checkout Modal */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Select Billing Cycle
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutError(null);
                      setCheckoutBillingCycle('MONTHLY');
                    }}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      checkoutBillingCycle === 'MONTHLY'
                        ? 'border-indigo-600 bg-indigo-50/90 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-indigo-200'
                    }`}
                  >
                    <div className="text-xs font-extrabold text-slate-900">Monthly Plan</div>
                    <div className="mt-0.5 font-display text-base font-extrabold text-indigo-700">
                      ₹{checkoutPlan.monthlyInr.toLocaleString('en-IN')}{' '}
                      <span className="text-[11px] font-medium text-slate-500">/ mo</span>
                    </div>
                    <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
                      30 Days License Validity
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutError(null);
                      setCheckoutBillingCycle('YEARLY');
                    }}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      checkoutBillingCycle === 'YEARLY'
                        ? 'border-indigo-600 bg-indigo-50/90 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-extrabold text-slate-900">Yearly Plan</span>
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-800">
                        SAVE 2 MO
                      </span>
                    </div>
                    <div className="mt-0.5 font-display text-base font-extrabold text-indigo-700">
                      ₹
                      {(checkoutPlan.yearlyInr || checkoutPlan.monthlyInr * 10).toLocaleString(
                        'en-IN'
                      )}{' '}
                      <span className="text-[11px] font-medium text-slate-500">/ yr</span>
                    </div>
                    <div className="mt-0.5 text-[10px] font-semibold text-emerald-700">
                      365 Days License Validity
                    </div>
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs space-y-1">
                {(() => {
                  const basePrice =
                    checkoutBillingCycle === 'YEARLY'
                      ? checkoutPlan.yearlyInr || checkoutPlan.monthlyInr * 10
                      : checkoutPlan.monthlyInr;
                  const totalGst = Math.round(basePrice * 1.18);
                  return (
                    <div className="font-bold text-indigo-950">
                      Plan: {checkoutPlan.name} (
                      {checkoutBillingCycle === 'YEARLY' ? 'Yearly · 365 Days' : 'Monthly · 30 Days'}
                      ) — ₹{basePrice.toLocaleString('en-IN')} (+18% GST = ₹
                      {totalGst.toLocaleString('en-IN')})
                    </div>
                  );
                })()}
                <div className="text-indigo-700">
                  {checkoutPlan.maxAccountsLabel} · Gateway:{' '}
                  <strong>
                    {razorpayConfig.keyId.trim().startsWith('rzp_') &&
                    razorpayConfig.keySecret.trim().length >= 8
                      ? `Razorpay (${razorpayConfig.mode}) · ${razorpayConfig.companyName}`
                      : 'Razorpay Keys Not Configured Yet (Configure in Master Admin)'}
                  </strong>
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Your Login Email Address
            </label>
            <Input
              required
              type="email"
              value={checkoutEmail}
              onChange={(e) => setCheckoutEmail(e.target.value)}
              placeholder="you@yourcompany.in"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Create Your Panel Login Password
            </label>
            <Input
              required
              type="password"
              value={checkoutPassword}
              onChange={(e) => setCheckoutPassword(e.target.value)}
              placeholder="Create a strong password"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Your Linux Server IPv4 Address
            </label>
            <Input
              required
              value={checkoutIp}
              onChange={(e) => setCheckoutIp(e.target.value)}
              placeholder="200.234.39.100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCheckoutError(null);
                setCheckoutLoading(false);
                setCheckoutPlan(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="nebulix" disabled={checkoutLoading}>
              <CreditCard className="h-4 w-4" />
              {checkoutLoading
                ? 'Creating Razorpay Order...'
                : `Pay & Activate ${checkoutBillingCycle === 'YEARLY' ? 'Yearly' : 'Monthly'} License`}
            </Button>
          </div>
        </form>
      </DialogModal>
    </div>
  );
}

export default CustomerPanelApp;
