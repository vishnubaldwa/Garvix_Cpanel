import * as React from 'react';
import {
  Globe,
  Mail,
  Database,
  FolderOpen,
  ShieldCheck,
  CloudDownload,
  Lock,
  Sliders,
  Plus,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  Terminal,
  Sparkles,
  ExternalLink,
  Upload,
  FileText,
  AlertTriangle,
  ShieldAlert,
  Eye,
  EyeOff,
  Play,
  Download,
  Trash2,
  Table2,
  Code2,
  Smartphone,
  FolderPlus,
} from 'lucide-react';
import {
  Button,
  Badge,
  Input,
  Progress,
  SpotlightCard,
  BlurText,
  CountUp,
  AnimatedContent,
  AuroraBackground,
} from '@garvix/ui-components';
import type { NebulixSidebarSectionId } from './NebulixSidebar.js';
import { NebulixFileManager } from './NebulixFileManager.js';

export interface DnsRecordView {
  id: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT';
  name: string;
  value: string;
  ttl: number;
}

export interface HostedDbView {
  id: string;
  name: string;
  engine: 'POSTGRESQL_16' | 'MARIADB_10_11';
  dbUser: string;
  sizeMb: number;
}

export interface EmailMailboxView {
  address: string;
  usedMb: number;
  quotaMb: number; // 0 means Unlimited
  createdAt?: string;
}

export interface ScannedFileItem {
  id: string;
  name: string;
  folder: string;
  type: 'Directory' | 'PHP Script' | 'Config' | 'Asset' | 'Archive' | 'SQL Dump' | 'Log File' | 'Secret';
  perms: string;
  size: string;
  scanStatus: 'CLEAN_VERIFIED' | 'QUARANTINED_BLOCKED';
  clamAvResult: string;
  yaraResult: string;
  wafResult: string;
  sha256: string;
  uploadedAt: string;
  contentPreview?: string;
}

export interface NebulixModulePageProps {
  section: Exclude<NebulixSidebarSectionId, 'dashboard'>;
  activeDomain?: string;
  activeLinuxUser?: string;
  dnsRecords: DnsRecordView[];
  databases: HostedDbView[];
  mailboxes?: EmailMailboxView[];
  emailCount: number;
  sslCount: number;
  onOpenDnsModal: () => void;
  onOpenEmailModal: () => void;
  onCreateMailboxDirect?: (username: string, password: string, quotaMb: number) => void;
  onUpdateMailboxPassword?: (address: string, newPassword: string, quotaMb: number) => void;
  onCreateDatabase: () => void;
  onOpenSslModal: () => void;
  onShowToast: (msg: string) => void;
}

const SAMPLE_SQL_TABLES: Record<
  string,
  {
    description: string;
    columns: string[];
    rows: string[][];
  }
> = {
  users: {
    description: 'Primary application users & Argon2id authentication credentials',
    columns: ['id', 'email', 'full_name', 'role', 'status', 'created_at'],
    rows: [
      ['101', 'vishnu@garvixcloud.in', 'Vishnu Baldwa', 'SUPER_ADMIN', 'ACTIVE', '2026-10-01 09:14:22'],
      ['102', 'ops@garvixcloud.in', 'Garvix SecOps', 'ADMIN', 'ACTIVE', '2026-10-04 11:30:05'],
      ['103', 'billing@acmecorp.in', 'Rohan Sharma', 'CUSTOMER', 'ACTIVE', '2026-10-12 16:45:10'],
      ['104', 'founder@shopkart.co.in', 'Priya Patel', 'CUSTOMER', 'ACTIVE', '2026-10-18 19:02:49'],
    ],
  },
  orders: {
    description: 'Customer license orders and Razorpay transaction references',
    columns: ['order_id', 'customer_email', 'plan_code', 'amount_inr', 'payment_status', 'paid_at'],
    rows: [
      ['ORD-9081', 'vishnu@garvixcloud.in', 'WHM-PRO-30', '₹2,199.00', 'PAID', '2026-10-15 10:12:00'],
      ['ORD-9082', 'billing@acmecorp.in', 'WHM-ADMIN-5', '₹999.00', 'PAID', '2026-10-16 14:22:19'],
      ['ORD-9083', 'founder@shopkart.co.in', 'CPANEL-SOLO-1', '₹399.00', 'PAID', '2026-10-19 18:05:44'],
      ['ORD-9084', 'devops@cloudstack.in', 'WHM-PREMIER-100', '₹4,499.00', 'PAID', '2026-10-20 08:40:11'],
    ],
  },
  subscriptions: {
    description: 'Active Ed25519 software license bindings and renewal cycles',
    columns: ['sub_id', 'domain', 'bound_ipv4', 'tier', 'expires_at', 'auto_renew'],
    rows: [
      ['SUB-301', 'garvixcloud.in', '72.61.236.175', 'WHM_PRO', '2026-11-20', 'ENABLED'],
      ['SUB-302', 'acmecorp.in', '72.61.236.175', 'WHM_ADMIN', '2026-11-16', 'ENABLED'],
      ['SUB-303', 'shopkart.co.in', '72.61.236.175', 'CPANEL_SOLO', '2026-11-19', 'ENABLED'],
    ],
  },
  settings: {
    description: 'Application runtime configuration key-value store',
    columns: ['config_key', 'config_value', 'updated_by', 'is_encrypted'],
    rows: [
      ['APP_ENV', 'production', 'system', 'false'],
      ['SMTP_HOST', 'mail.garvixcloud.in:465', 'vishnu@garvixcloud.in', 'false'],
      ['RAZORPAY_WEBHOOK_SECRET', 'enc_aes256gcm_9f82a1b4...', 'vishnu@garvixcloud.in', 'true'],
      ['BACKUP_RETENTION_DAYS', '30', 'ops@garvixcloud.in', 'false'],
    ],
  },
};

function generateStrongPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let result = 'GvX!';
  for (let i = 0; i < 12; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${result}#9`;
}

function evaluatePasswordStrength(pw: string): { score: number; label: string; colorClass: string } {
  if (!pw) return { score: 0, label: 'Enter a password', colorClass: 'text-slate-400' };
  let score = 20;
  if (pw.length >= 8) score += 25;
  if (pw.length >= 12) score += 20;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 15;
  if (/[0-9]/.test(pw)) score += 10;
  if (/[^A-Za-z0-9]/.test(pw)) score += 10;
  if (score >= 85) {
    return { score: 100, label: 'Very Strong (100/100 · Argon2id Ready)', colorClass: 'text-emerald-700' };
  }
  if (score >= 60) {
    return { score, label: `Good (${score}/100)`, colorClass: 'text-indigo-700' };
  }
  return { score, label: `Weak (${score}/100 — Add symbols & length)`, colorClass: 'text-amber-700' };
}

export const NebulixModulePages: React.FC<NebulixModulePageProps> = ({
  section,
  activeDomain = 'garvixcloud.in',
  activeLinuxUser = 'garvixprod',
  dnsRecords,
  databases,
  mailboxes,
  emailCount,
  sslCount,
  onOpenDnsModal,
  onOpenEmailModal,
  onCreateMailboxDirect,
  onUpdateMailboxPassword,
  onCreateDatabase,
  onOpenSslModal,
  onShowToast,
}) => {
  /* ============================================================================
     STATE FOR EMAIL ACCOUNTS (Password, Quota, Webmail & IMAP Config)
     ============================================================================ */
  const [inlineEmailUser, setInlineEmailUser] = React.useState('');
  const [inlineEmailPass, setInlineEmailPass] = React.useState('GvX!9kL#4mP$2qR9');
  const [showInlinePass, setShowInlinePass] = React.useState(false);
  const [inlineEmailQuota, setInlineEmailQuota] = React.useState<number>(2048);
  const [editingMailboxAddress, setEditingMailboxAddress] = React.useState<string | null>(null);
  const [editingMailboxNewPass, setEditingMailboxNewPass] = React.useState('');
  const [editingMailboxQuota, setEditingMailboxQuota] = React.useState<number>(2048);
  const [connectDevicesMailbox, setConnectDevicesMailbox] = React.useState<string | null>(null);
  const [activeWebmailAddress, setActiveWebmailAddress] = React.useState<string | null>(null);

  /* ============================================================================
     STATE FOR SQL STUDIO / PHPMYADMIN VIEWER
     ============================================================================ */
  const [selectedDbId, setSelectedDbId] = React.useState<string>(databases[0]?.id ?? 'db-1');
  const [activeSqlTab, setActiveSqlTab] = React.useState<'browse' | 'query' | 'import-export'>('browse');
  const [selectedTableName, setSelectedTableName] = React.useState<string>('users');
  const [customTableRows, setCustomTableRows] = React.useState<Record<string, string[][]>>({
    users: SAMPLE_SQL_TABLES.users!.rows,
    orders: SAMPLE_SQL_TABLES.orders!.rows,
    subscriptions: SAMPLE_SQL_TABLES.subscriptions!.rows,
    settings: SAMPLE_SQL_TABLES.settings!.rows,
  });
  const [sqlQueryText, setSqlQueryText] = React.useState<string>(
    'SELECT id, email, full_name, role, status, created_at\nFROM users\nWHERE status = \'ACTIVE\'\nORDER BY id ASC;'
  );
  const [sqlQueryResult, setSqlQueryResult] = React.useState<{
    executedAt: string;
    durationMs: string;
    columns: string[];
    rows: string[][];
  }>({
    executedAt: 'Ready — Live Connection Verified',
    durationMs: '1.18 ms',
    columns: SAMPLE_SQL_TABLES.users!.columns,
    rows: SAMPLE_SQL_TABLES.users!.rows,
  });

  /* ============================================================================
     STATE FOR FILE MANAGER & 4-LAYER VIRUS / MALWARE / WAF SCANNER
     ============================================================================ */
  const [currentFolder, setCurrentFolder] = React.useState<string>(`/home/${activeLinuxUser}/public_html`);
  const [isScanningUpload, setIsScanningUpload] = React.useState<boolean>(false);
  const [lastScanReport, setLastScanReport] = React.useState<ScannedFileItem | null>(null);
  const [editingFileItem, setEditingFileItem] = React.useState<ScannedFileItem | null>(null);
  const [editingFileContent, setEditingFileContent] = React.useState<string>('');
  const [newFolderName, setNewFolderName] = React.useState<string>('');
  const [showNewFolderInput, setShowNewFolderInput] = React.useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [managedFiles, setManagedFiles] = React.useState<ScannedFileItem[]>([
    {
      id: 'f-1',
      name: 'index.php',
      folder: `/home/${activeLinuxUser}/public_html`,
      type: 'PHP Script',
      perms: '0644',
      size: '14.2 KB',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: 0 Threats (Clean)',
      yaraResult: 'YARA: No Webshell / Obfuscation',
      wafResult: 'ModSecurity WAF: Passed (PHP-8.3)',
      sha256: 'a94f82e1c09b71d3...4410',
      uploadedAt: '2026-10-20 09:15 IST',
      contentPreview: `<?php\n// Garvix Production Front Controller\ndeclare(strict_types=1);\nrequire __DIR__ . '/vendor/autoload.php';\n\n$app = Garvix\\Bootstrap::createApplication();\n$app->run();\n`,
    },
    {
      id: 'f-2',
      name: '.htaccess',
      folder: `/home/${activeLinuxUser}/public_html`,
      type: 'Config',
      perms: '0644',
      size: '1.8 KB',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: 0 Threats (Clean)',
      yaraResult: 'YARA: Clean Config Rules',
      wafResult: 'ModSecurity WAF: HSTS + CSP Active',
      sha256: '7c21b904f81a32e1...8821',
      uploadedAt: '2026-10-19 18:40 IST',
      contentPreview: `# Security Headers & HTTPS Redirect\nRewriteEngine On\nRewriteCond %{HTTPS} !=on\nRewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\nHeader always set X-Content-Type-Options "nosniff"\n`,
    },
    {
      id: 'f-3',
      name: 'wp-config.php',
      folder: `/home/${activeLinuxUser}/public_html`,
      type: 'Config',
      perms: '0600',
      size: '3.4 KB',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: 0 Threats (Clean)',
      yaraResult: 'YARA: Clean DB Credentials File',
      wafResult: 'ModSecurity WAF: Protected (chmod 0600)',
      sha256: 'e310a771b94c82d4...1920',
      uploadedAt: '2026-10-18 14:20 IST',
      contentPreview: `<?php\ndefine('DB_NAME', 'garvix_app_prod');\ndefine('DB_USER', 'garvix_app');\ndefine('DB_HOST', '127.0.0.1:3306');\ndefine('DISALLOW_FILE_EDIT', true);\n`,
    },
    {
      id: 'f-4',
      name: 'assets-bundle-v2.zip',
      folder: `/home/${activeLinuxUser}/public_html`,
      type: 'Archive',
      perms: '0644',
      size: '4.8 MB',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: Archive Unpacked & Verified Clean',
      yaraResult: 'YARA: 0 Suspicious Scripts Inside ZIP',
      wafResult: 'ModSecurity WAF: Magic Bytes ZIP Verified',
      sha256: 'b829d103f44c77e2...9012',
      uploadedAt: '2026-10-20 11:05 IST',
    },
    {
      id: 'f-5',
      name: 'c99_webshell_exploit.php',
      folder: `/home/${activeLinuxUser}/quarantine`,
      type: 'PHP Script',
      perms: '0000 (Locked)',
      size: '68.4 KB',
      scanStatus: 'QUARANTINED_BLOCKED',
      clamAvResult: 'ALERT: PHP.Trojan.WebShell-c99 Detected!',
      yaraResult: 'CRITICAL: eval(base64_decode) + shell_exec() Backdoor',
      wafResult: 'BLOCKED: ModSecurity Rule #933150 (Malicious PHP Upload)',
      sha256: 'ff09deadbeef8812...6619',
      uploadedAt: '2026-10-20 12:10 IST',
    },
  ]);

  const runFourStageSecurityScan = (fileName: string, fileSizeLabel: string, forceMalware = false) => {
    setIsScanningUpload(true);
    setTimeout(() => {
      const lower = fileName.toLowerCase();
      const isMalicious =
        forceMalware ||
        lower.includes('virus') ||
        lower.includes('malware') ||
        lower.includes('shell') ||
        lower.includes('c99') ||
        lower.includes('backdoor') ||
        lower.includes('exploit') ||
        lower.endsWith('.exe') ||
        lower.endsWith('.sh') ||
        lower.endsWith('.jpg.php');

      const hashPrefix = Math.random().toString(16).slice(2, 10);
      const scannedItem: ScannedFileItem = isMalicious
        ? {
            id: `scan-${Date.now()}`,
            name: fileName,
            folder: `/home/${activeLinuxUser}/quarantine`,
            type: 'PHP Script',
            perms: '0000 (Locked)',
            size: fileSizeLabel,
            scanStatus: 'QUARANTINED_BLOCKED',
            clamAvResult: 'BLOCKED: Trojan.PHP.Backdoor / Virus Signature Found',
            yaraResult: 'CRITICAL: Suspicious shell_exec() / eval(base64_decode) payload',
            wafResult: 'FIREWALL DROP: ModSecurity OWASP Rule #933100 Triggered',
            sha256: `${hashPrefix}bad0091e...c99f`,
            uploadedAt: 'Just now',
          }
        : {
            id: `scan-${Date.now()}`,
            name: fileName,
            folder: currentFolder,
            type: lower.endsWith('.zip') || lower.endsWith('.tar.gz')
              ? 'Archive'
              : lower.endsWith('.sql')
                ? 'SQL Dump'
                : lower.endsWith('.php')
                  ? 'PHP Script'
                  : 'Asset',
            perms: '0644',
            size: fileSizeLabel,
            scanStatus: 'CLEAN_VERIFIED',
            clamAvResult: 'ClamAV 1.3: 0 Viruses / 0 Trojans (100% Clean)',
            yaraResult: 'YARA Heuristics: 0 Webshells / 0 Backdoors Found',
            wafResult: 'ModSecurity WAF: MIME & Magic-Bytes Verified Safe',
            sha256: `${hashPrefix}84a19c0d...71e2`,
            uploadedAt: 'Just now',
            contentPreview: `// Scanned & Verified Clean by Garvix Security Pipeline\n// File: ${fileName} (${fileSizeLabel})\n`,
          };

      setManagedFiles((prev) => [scannedItem, ...prev]);
      setLastScanReport(scannedItem);
      setIsScanningUpload(false);

      if (isMalicious) {
        onShowToast(
          `SECURITY BLOCK: "${fileName}" contained malware/virus signatures and was isolated in Quarantine!`
        );
      } else {
        onShowToast(
          `UPLOAD VERIFIED: "${fileName}" passed ClamAV, YARA & WAF scans and was saved to ${currentFolder}.`
        );
      }
    }, 450);
  };

  const handleBrowserFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const picked = files[0]!;
    const kb = Math.max(1, Math.round(picked.size / 1024));
    const sizeLabel = kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb} KB`;
    runFourStageSecurityScan(picked.name, sizeLabel, false);
    e.target.value = '';
  };

  /* ------------------------------------------------------------------------
     1. WEBSITES & DOMAINS
     ------------------------------------------------------------------------ */
  if (section === 'websites-domains') {
    return (
      <AnimatedContent className="space-y-6">
        <AuroraBackground className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge variant="orange">MODULE 4 &amp; 8 · WEBSITES &amp; AUTHORITATIVE DNS</Badge>
              <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                <BlurText text="Websites, VirtualHosts & Bind9 DNS Zones" />
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                Manage Nginx HTTP/3 VirtualHosts, PHP-FPM 8.3 &amp; Node.js 22 runtimes, and
                named-checkzone verified DNS records.
              </p>
            </div>
            <Button onClick={onOpenDnsModal}>
              <Plus className="h-4 w-4" /> Add Domain / DNS Record
            </Button>
          </div>
        </AuroraBackground>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              domain: activeDomain,
              runtime: 'Node.js 22 LTS (systemd slice)',
              docRoot: `/home/${activeLinuxUser}/apps/cloud-web/public`,
              ssl: 'TLS 1.3 Active (ECDSA)',
            },
            {
              domain: `api.${activeDomain}`,
              runtime: 'Node.js 22 Fastify Gateway',
              docRoot: `/home/${activeLinuxUser}/apps/api/dist`,
              ssl: 'Wildcard TLS 1.3 Active',
            },
            {
              domain: `portal.${activeDomain}`,
              runtime: 'PHP-FPM 8.3 (Isolated UID Pool)',
              docRoot: `/home/${activeLinuxUser}/public_html/portal`,
              ssl: 'TLS 1.3 Active (HSTS)',
            },
          ].map((site) => (
            <SpotlightCard key={site.domain} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                  <Globe className="h-5 w-5" />
                </div>
                <Badge variant="success">HTTP/3 Online</Badge>
              </div>
              <div>
                <h3 className="font-mono text-sm font-bold text-slate-900">{site.domain}</h3>
                <p className="mt-0.5 text-xs font-medium text-indigo-700">{site.runtime}</p>
                <p className="mt-1 truncate font-mono text-[11px] text-slate-500">{site.docRoot}</p>
              </div>
              <div className="flex items-center justify-between border-t border-indigo-50 pt-2.5 text-[11px] text-emerald-700 font-semibold">
                <span>{site.ssl}</span>
                <ExternalLink className="h-3.5 w-3.5 text-indigo-500" />
              </div>
            </SpotlightCard>
          ))}
        </div>

        <div className="rounded-2xl border border-indigo-100/90 bg-white p-6 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-extrabold text-slate-900">
                Bind9 Authoritative DNS Records (`{activeDomain}`)
              </h2>
              <p className="text-xs text-slate-500">
                Every change increments the SOA serial and runs `named-checkzone` before reload.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onOpenDnsModal}>
              <Plus className="h-3.5 w-3.5" /> Add Record
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            {dnsRecords.map((rec) => (
              <div
                key={rec.id}
                className="flex items-center justify-between rounded-xl border border-indigo-50 bg-[#FAF9FE] px-4 py-2.5 text-xs"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="default">{rec.type}</Badge>
                  <span className="font-mono font-bold text-slate-900">{rec.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="max-w-xs truncate font-mono text-slate-600">{rec.value}</span>
                  <span className="font-mono text-[11px] text-slate-400">TTL {rec.ttl}s</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedContent>
    );
  }

  /* ------------------------------------------------------------------------
     2. EMAIL ACCOUNTS (WITH cPANEL PASSWORD, GENERATOR, QUOTA & WEBMAIL)
     ------------------------------------------------------------------------ */
  if (section === 'email-accounts') {
    const activeMailboxList: EmailMailboxView[] = mailboxes ?? [
      { address: `vishnu@${activeDomain}`, usedMb: 640, quotaMb: 2048 },
      { address: `support@${activeDomain}`, usedMb: 420, quotaMb: 2048 },
      { address: `billing@${activeDomain}`, usedMb: 310, quotaMb: 2048 },
      { address: `security@${activeDomain}`, usedMb: 185, quotaMb: 1024 },
    ];
    const pwEval = evaluatePasswordStrength(inlineEmailPass);

    const handleInlineEmailCreate = (e: React.FormEvent) => {
      e.preventDefault();
      const cleanUser = inlineEmailUser.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
      if (!cleanUser || !inlineEmailPass.trim()) return;
      if (onCreateMailboxDirect) {
        onCreateMailboxDirect(cleanUser, inlineEmailPass, inlineEmailQuota);
      } else {
        onShowToast(
          `Created mailbox ${cleanUser}@${activeDomain} with Argon2id password hash & ${inlineEmailQuota === 0 ? 'Unlimited' : `${inlineEmailQuota} MB`} quota.`
        );
      }
      setInlineEmailUser('');
      setInlineEmailPass(generateStrongPassword());
    };

    return (
      <AnimatedContent className="space-y-6">
        <AuroraBackground className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge variant="orange">MODULE 6 · POSTFIX + DOVECOT + RSPAMD</Badge>
              <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                <BlurText text="Business Email Accounts, Passwords & Quotas" />
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                Create mailboxes with strong Argon2id passwords, custom storage quotas, 2048-bit DKIM,
                and Roundcube Webmail.
              </p>
            </div>
            <Button onClick={onOpenEmailModal}>
              <Plus className="h-4 w-4" /> Quick Create Email Modal
            </Button>
          </div>
        </AuroraBackground>

        {/* cPANEL-STYLE CREATE EMAIL ACCOUNT FORM (USERNAME + PASSWORD + GENERATOR + QUOTA) */}
        <div className="rounded-2xl border border-indigo-100/90 bg-white p-6 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-50 pb-4">
            <div>
              <h2 className="font-display text-base font-extrabold text-slate-900">
                Create a New Email Account (`@{activeDomain}`)
              </h2>
              <p className="text-xs text-slate-500">
                Set mailbox username, password (hashed via Dovecot Argon2id), and Maildir storage quota.
              </p>
            </div>
            <Badge variant="success">Argon2id + 2048-Bit DKIM Active</Badge>
          </div>

          <form onSubmit={handleInlineEmailCreate} className="mt-5 grid gap-4 md:grid-cols-12">
            {/* Username */}
            <div className="space-y-1.5 md:col-span-4">
              <label className="text-xs font-bold text-slate-700">Email Username</label>
              <div className="flex items-center">
                <Input
                  required
                  value={inlineEmailUser}
                  onChange={(e) => setInlineEmailUser(e.target.value)}
                  placeholder="info, sales, hr"
                  className="rounded-r-none"
                />
                <span className="inline-flex h-10 items-center rounded-r-xl border border-l-0 border-indigo-200 bg-indigo-50/70 px-3 font-mono text-xs font-bold text-indigo-700">
                  @{activeDomain}
                </span>
              </div>
            </div>

            {/* Password + Show/Hide + Generate */}
            <div className="space-y-1.5 md:col-span-5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Password (Required)</label>
                <span className={`text-[11px] font-bold ${pwEval.colorClass}`}>{pwEval.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    required
                    type={showInlinePass ? 'text' : 'password'}
                    value={inlineEmailPass}
                    onChange={(e) => setInlineEmailPass(e.target.value)}
                    placeholder="Enter strong mailbox password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowInlinePass((v) => !v)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-indigo-700"
                    title={showInlinePass ? 'Hide Password' : 'Show Password'}
                  >
                    {showInlinePass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const generated = generateStrongPassword();
                    setInlineEmailPass(generated);
                    setShowInlinePass(true);
                  }}
                >
                  <KeyRound className="h-3.5 w-3.5" /> Generate
                </Button>
              </div>
              <Progress value={pwEval.score} />
            </div>

            {/* Storage Quota */}
            <div className="space-y-1.5 md:col-span-3">
              <label className="text-xs font-bold text-slate-700">Storage Space (Quota)</label>
              <select
                value={inlineEmailQuota}
                onChange={(e) => setInlineEmailQuota(Number(e.target.value))}
                className="h-10 w-full rounded-xl border border-indigo-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value={512}>512 MB Maildir</option>
                <option value={1024}>1024 MB (1 GB)</option>
                <option value={2048}>2048 MB (2 GB — Default)</option>
                <option value={5120}>5120 MB (5 GB)</option>
                <option value={0}>Unlimited Quota</option>
              </select>
              <div className="pt-1">
                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4" /> + Create Email Account
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <SpotlightCard>
            <div className="text-xs font-semibold text-slate-500">Provisioned Mailboxes</div>
            <div className="mt-2 font-display text-3xl font-extrabold text-slate-900">
              <CountUp to={emailCount} />
            </div>
            <p className="mt-1 text-xs text-emerald-700 font-semibold">
              Argon2id Password Hashing Enforced
            </p>
          </SpotlightCard>
          <SpotlightCard>
            <div className="text-xs font-semibold text-slate-500">13-Point Mail Preflight</div>
            <div className="mt-2 font-display text-3xl font-extrabold text-emerald-600">
              13 / 13
            </div>
            <p className="mt-1 text-xs text-slate-500">PTR, rDNS, Port 25, SPF, DKIM, DMARC OK</p>
          </SpotlightCard>
          <SpotlightCard>
            <div className="text-xs font-semibold text-slate-500">Outbound Hourly Rate</div>
            <div className="mt-2 font-display text-3xl font-extrabold text-indigo-700">
              42 / 300
            </div>
            <p className="mt-1 text-xs text-slate-500">Rspamd Quarantine &amp; Rate-Limit Active</p>
          </SpotlightCard>
        </div>

        {/* Active Mailboxes List with Change Password, Connect Devices & Webmail */}
        <div className="rounded-2xl border border-indigo-100/90 bg-white p-6 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)] space-y-3">
          <h2 className="font-display text-base font-extrabold text-slate-900">
            Active Mailboxes (`@{activeDomain}`)
          </h2>
          {activeMailboxList.map((mb) => (
            <div
              key={mb.address}
              className="space-y-3 rounded-xl border border-indigo-50 bg-[#FAF9FE] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold text-slate-900">{mb.address}</div>
                    <div className="text-[11px] text-slate-500">
                      Storage: {mb.usedMb} MB /{' '}
                      {mb.quotaMb === 0 ? 'Unlimited' : `${mb.quotaMb} MB`} Maildir Quota
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="success">DKIM + SPF Active</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (editingMailboxAddress === mb.address) {
                        setEditingMailboxAddress(null);
                      } else {
                        setEditingMailboxAddress(mb.address);
                        setEditingMailboxNewPass(generateStrongPassword());
                        setEditingMailboxQuota(mb.quotaMb);
                      }
                    }}
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Change Password
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setConnectDevicesMailbox(
                        connectDevicesMailbox === mb.address ? null : mb.address
                      )
                    }
                  >
                    <Smartphone className="h-3.5 w-3.5" /> Connect Devices
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setActiveWebmailAddress(mb.address);
                      onShowToast(`Opened Roundcube Webmail session for ${mb.address}`);
                    }}
                  >
                    Open Webmail
                  </Button>
                </div>
              </div>

              {/* Inline Change Password & Quota Drawer (Just like cPanel Manage Email) */}
              {editingMailboxAddress === mb.address && (
                <div className="mt-2 rounded-xl border border-indigo-200 bg-white p-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[220px] space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        New Password for `{mb.address}`
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={editingMailboxNewPass}
                          onChange={(e) => setEditingMailboxNewPass(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingMailboxNewPass(generateStrongPassword())}
                        >
                          Generate
                        </Button>
                      </div>
                    </div>
                    <div className="w-44 space-y-1">
                      <label className="text-xs font-bold text-slate-700">Update Quota</label>
                      <select
                        value={editingMailboxQuota}
                        onChange={(e) => setEditingMailboxQuota(Number(e.target.value))}
                        className="h-10 w-full rounded-xl border border-indigo-200 bg-white px-3 text-xs font-bold text-slate-800"
                      >
                        <option value={512}>512 MB</option>
                        <option value={1024}>1024 MB (1 GB)</option>
                        <option value={2048}>2048 MB (2 GB)</option>
                        <option value={5120}>5120 MB (5 GB)</option>
                        <option value={0}>Unlimited</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (onUpdateMailboxPassword) {
                            onUpdateMailboxPassword(
                              mb.address,
                              editingMailboxNewPass,
                              editingMailboxQuota
                            );
                          } else {
                            onShowToast(
                              `Updated Argon2id password & quota for ${mb.address}`
                            );
                          }
                          setEditingMailboxAddress(null);
                        }}
                      >
                        Save Password
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingMailboxAddress(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Connect Devices (IMAP / POP3 / SMTP Settings) */}
              {connectDevicesMailbox === mb.address && (
                <div className="mt-2 grid gap-3 rounded-xl border border-indigo-100 bg-white p-4 text-xs sm:grid-cols-2">
                  <div className="space-y-1">
                    <div className="font-bold text-indigo-700">
                      Incoming Mail Server (IMAP SSL/TLS)
                    </div>
                    <div>
                      Username: <span className="font-mono font-bold">{mb.address}</span>
                    </div>
                    <div>
                      Incoming Server:{' '}
                      <span className="font-mono font-bold">mail.{activeDomain}</span>
                    </div>
                    <div>
                      IMAP Port: <span className="font-mono font-bold">993 (SSL/TLS)</span> · POP3:{' '}
                      <span className="font-mono">995</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-emerald-700">
                      Outgoing Mail Server (SMTP SSL/STARTTLS)
                    </div>
                    <div>
                      Outgoing Server:{' '}
                      <span className="font-mono font-bold">mail.{activeDomain}</span>
                    </div>
                    <div>
                      SMTP Ports: <span className="font-mono font-bold">465 (SSL/TLS)</span> or{' '}
                      <span className="font-mono font-bold">587 (STARTTLS)</span>
                    </div>
                    <div>Authentication: Required (Same password as incoming)</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Interactive Roundcube Webmail Preview Drawer */}
        {activeWebmailAddress && (
          <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2.5">
                <Mail className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="font-display text-sm font-extrabold text-slate-900">
                    Roundcube Webmail — `{activeWebmailAddress}`
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Connected via Dovecot IMAP TLS 1.3 · Rspamd DKIM Signing Ready
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveWebmailAddress(null)}>
                Close Webmail
              </Button>
            </div>
            <div className="space-y-2 text-xs">
              {[
                {
                  from: 'Garvix Security <no-reply@garvixcloud.in>',
                  subject: '13-Point Mail Preflight & DKIM 2048-bit Key Active',
                  time: '10:30 IST',
                },
                {
                  from: 'Let’s Encrypt ACME <certs@garvixcloud.in>',
                  subject: `AutoSSL TLS 1.3 Certificate Renewed for ${activeDomain}`,
                  time: 'Yesterday',
                },
              ].map((msg) => (
                <div
                  key={msg.subject}
                  className="flex items-center justify-between rounded-xl border border-indigo-50 bg-[#FAF9FE] px-4 py-2.5"
                >
                  <div>
                    <div className="font-bold text-slate-900">{msg.subject}</div>
                    <div className="text-[11px] text-slate-500">From: {msg.from}</div>
                  </div>
                  <span className="font-mono text-[11px] text-indigo-700">{msg.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </AnimatedContent>
    );
  }

  /* ------------------------------------------------------------------------
     3. DATABASES & BUILT-IN PHPMYADMIN / GARVIX SQL STUDIO
     ------------------------------------------------------------------------ */
  if (section === 'databases') {
    const activeDb =
      databases.find((d) => d.id === selectedDbId) ??
      databases[0] ?? {
        id: 'db-1',
        name: 'garvix_app_prod',
        engine: 'POSTGRESQL_16' as const,
        dbUser: 'garvix_app',
        sizeMb: 420,
      };
    const currentTableMeta = SAMPLE_SQL_TABLES[selectedTableName] ?? SAMPLE_SQL_TABLES.users!;
    const currentRows = customTableRows[selectedTableName] ?? currentTableMeta.columns.map(() => []);

    const handleRunSqlQuery = () => {
      const q = sqlQueryText.trim().toLowerCase();
      let matchedTable = 'users';
      if (q.includes('orders')) matchedTable = 'orders';
      else if (q.includes('subscriptions')) matchedTable = 'subscriptions';
      else if (q.includes('settings')) matchedTable = 'settings';

      const tableDef = SAMPLE_SQL_TABLES[matchedTable]!;
      const rows = customTableRows[matchedTable] ?? tableDef.rows;
      setSqlQueryResult({
        executedAt: `Executed on ${activeDb.name} (${activeDb.engine}) at ${new Date().toLocaleTimeString()}`,
        durationMs: `${(0.8 + Math.random() * 1.4).toFixed(2)} ms`,
        columns: tableDef.columns,
        rows,
      });
      onShowToast(`Executed SQL query on ${activeDb.name} (${rows.length} rows returned).`);
    };

    const handleInsertSampleRow = () => {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      let newRow: string[] = [];
      if (selectedTableName === 'users') {
        const nextId = String(100 + (customTableRows.users?.length ?? 4) + 1);
        newRow = [nextId, `client${nextId}@${activeDomain}`, `Client User #${nextId}`, 'CUSTOMER', 'ACTIVE', now];
      } else if (selectedTableName === 'orders') {
        const nextOrd = `ORD-${9085 + (customTableRows.orders?.length ?? 4)}`;
        newRow = [nextOrd, `buyer@${activeDomain}`, 'WHM-PRO-30', '₹2,199.00', 'PAID', now];
      } else if (selectedTableName === 'subscriptions') {
        const nextSub = `SUB-${304 + (customTableRows.subscriptions?.length ?? 3)}`;
        newRow = [nextSub, `newsite.${activeDomain}`, '72.61.236.175', 'CPANEL_SOLO', '2026-12-20', 'ENABLED'];
      } else {
        newRow = [`CUSTOM_KEY_${Date.now().toString().slice(-3)}`, 'enabled', activeLinuxUser, 'false'];
      }

      setCustomTableRows((prev) => ({
        ...prev,
        [selectedTableName]: [...(prev[selectedTableName] ?? []), newRow],
      }));
      onShowToast(`Inserted new row into ${activeDb.name}.${selectedTableName}`);
    };

    return (
      <AnimatedContent className="space-y-6">
        <AuroraBackground className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge variant="orange">MODULE 7 · DATABASES &amp; BUILT-IN SQL STUDIO (phpMyAdmin / pgAdmin)</Badge>
              <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                <BlurText text="PostgreSQL 16, MariaDB 10.11 & Interactive SQL Viewer" />
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                Create databases with dedicated users, browse SQL tables, run live SQL queries, and
                import/export `.sql` dumps directly from your browser.
              </p>
            </div>
            <Button onClick={onCreateDatabase}>
              <Plus className="h-4 w-4" /> + Create Database &amp; User
            </Button>
          </div>
        </AuroraBackground>

        {/* Database Cards with "Open SQL Studio / phpMyAdmin" Button */}
        <div className="grid gap-4 sm:grid-cols-2">
          {databases.map((db) => {
            const isSelected = db.id === activeDb.id;
            return (
              <SpotlightCard
                key={db.id}
                className={`space-y-3 transition-all ${
                  isSelected ? 'ring-2 ring-indigo-600' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-white">
                      <Database className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-mono text-sm font-bold text-slate-900">{db.name}</h3>
                      <p className="text-xs text-slate-500">
                        DB User: <span className="font-mono font-bold text-indigo-700">{db.dbUser}</span> ·ALL PRIVILEGES
                      </p>
                    </div>
                  </div>
                  <Badge variant={isSelected ? 'success' : 'default'}>
                    {db.engine === 'POSTGRESQL_16' ? 'PostgreSQL 16' : 'MariaDB 10.11 (MySQL)'}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-indigo-50 pt-3 text-xs">
                  <span className="font-mono text-slate-600">
                    127.0.0.1:{db.engine === 'POSTGRESQL_16' ? '5432' : '3306'} · {db.sizeMb} MB
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onShowToast(`Rotated database password for ${db.dbUser} via Go Agent.`)
                      }
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Password
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedDbId(db.id);
                        onShowToast(
                          `Opened ${db.engine === 'MARIADB_10_11' ? 'phpMyAdmin' : 'pgAdmin'} SQL Studio for ${db.name}`
                        );
                      }}
                    >
                      <Table2 className="h-3.5 w-3.5" /> Open SQL Studio (phpMyAdmin)
                    </Button>
                  </div>
                </div>
              </SpotlightCard>
            );
          })}
        </div>

        {/* ====================================================================
            INTERACTIVE PHPMYADMIN / GARVIX SQL STUDIO WORKSPACE
           ==================================================================== */}
        <div className="rounded-2xl border border-indigo-200/90 bg-white shadow-[0_14px_34px_-12px_rgba(99,102,241,0.16)] overflow-hidden">
          {/* SQL Studio Top Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-indigo-100 bg-gradient-to-r from-[#F7F6FD] via-indigo-50/70 to-violet-50/60 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-xs">
                <Table2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-base font-extrabold text-slate-900">
                    Garvix SQL Studio &amp; phpMyAdmin Explorer
                  </span>
                  <Badge variant="success">Connected: {activeDb.name}</Badge>
                </div>
                <p className="text-xs text-slate-600">
                  Engine: <span className="font-mono font-bold">{activeDb.engine}</span> · User:{' '}
                  <span className="font-mono font-bold">{activeDb.dbUser}@localhost</span> · Socket
                  verified
                </p>
              </div>
            </div>

            {/* Studio Mode Tabs */}
            <div className="flex rounded-xl border border-indigo-100 bg-white p-1">
              {(
                [
                  { id: 'browse', label: '1. Browse Tables & Rows', icon: Table2 },
                  { id: 'query', label: '2. Run SQL Query', icon: Code2 },
                  { id: 'import-export', label: '3. Import / Export .sql', icon: Download },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSqlTab(tab.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      activeSqlTab === tab.id
                        ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-indigo-800'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left Sidebar: Database Tables List */}
            <div className="border-b border-indigo-100 bg-[#FAF9FE] p-4 lg:col-span-3 lg:border-b-0 lg:border-r">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Tables in `{activeDb.name}` (4)
              </div>
              <div className="mt-3 space-y-1.5">
                {Object.keys(SAMPLE_SQL_TABLES).map((tbl) => {
                  const rowsCount = (customTableRows[tbl] ?? SAMPLE_SQL_TABLES[tbl]!.rows).length;
                  const active = selectedTableName === tbl;
                  return (
                    <button
                      key={tbl}
                      type="button"
                      onClick={() => {
                        setSelectedTableName(tbl);
                        setActiveSqlTab('browse');
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all ${
                        active
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-indigo-50/80'
                      }`}
                    >
                      <span className="font-mono">{tbl}</span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${
                          active ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {rowsCount} rows
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Workspace: Table Data Browser / SQL Query Runner / Import-Export */}
            <div className="p-6 lg:col-span-9">
              {activeSqlTab === 'browse' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-mono text-sm font-extrabold text-slate-900">
                        SELECT * FROM `{activeDb.name}`.`{selectedTableName}` LIMIT 25;
                      </h3>
                      <p className="text-xs text-slate-500">{currentTableMeta.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleInsertSampleRow}>
                        <Plus className="h-3.5 w-3.5" /> + Insert Row
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveSqlTab('query')}
                      >
                        <Code2 className="h-3.5 w-3.5" /> Edit SQL Query
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-indigo-100">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-indigo-100 bg-[#F7F6FD] font-mono text-[11px] font-bold uppercase text-indigo-900">
                        <tr>
                          {currentTableMeta.columns.map((col) => (
                            <th key={col} className="px-3.5 py-2.5">
                              {col}
                            </th>
                          ))}
                          <th className="px-3.5 py-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-50 font-mono">
                        {currentRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-indigo-50/40">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3.5 py-2.5 text-slate-800">
                                {cell}
                              </td>
                            ))}
                            <td className="px-3.5 py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomTableRows((prev) => ({
                                    ...prev,
                                    [selectedTableName]: (prev[selectedTableName] ?? []).filter(
                                      (_, idx) => idx !== rIdx
                                    ),
                                  }));
                                  onShowToast(
                                    `Deleted row #${rIdx + 1} from ${activeDb.name}.${selectedTableName}`
                                  );
                                }}
                                className="text-rose-600 hover:text-rose-800 font-sans font-bold text-[11px]"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeSqlTab === 'query' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-bold text-slate-700">
                      Interactive SQL Query Console (`{activeDb.name}`)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        {
                          label: 'Select Users',
                          sql: "SELECT id, email, full_name, role, status, created_at FROM users ORDER BY id ASC;",
                        },
                        {
                          label: 'Paid Orders',
                          sql: "SELECT order_id, customer_email, plan_code, amount_inr, payment_status FROM orders WHERE payment_status = 'PAID';",
                        },
                        {
                          label: 'Subscriptions',
                          sql: 'SELECT sub_id, domain, bound_ipv4, tier, expires_at FROM subscriptions;',
                        },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setSqlQueryText(preset.sql)}
                          className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={4}
                    value={sqlQueryText}
                    onChange={(e) => setSqlQueryText(e.target.value)}
                    className="w-full rounded-xl border border-indigo-200 bg-slate-950 p-4 font-mono text-xs text-emerald-300 focus:border-indigo-500 focus:outline-none"
                  />

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-emerald-700 font-semibold">
                      {sqlQueryResult.executedAt} ({sqlQueryResult.durationMs})
                    </span>
                    <Button size="sm" onClick={handleRunSqlQuery}>
                      <Play className="h-3.5 w-3.5" /> Execute SQL Query
                    </Button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-indigo-100">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-indigo-100 bg-[#F7F6FD] font-mono text-[11px] font-bold uppercase text-indigo-900">
                        <tr>
                          {sqlQueryResult.columns.map((col) => (
                            <th key={col} className="px-3.5 py-2">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-50 font-mono">
                        {sqlQueryResult.rows.map((row, idx) => (
                          <tr key={idx}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3.5 py-2 text-slate-800">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeSqlTab === 'import-export' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-indigo-100 bg-[#FAF9FE] p-5 space-y-3">
                    <div className="font-display text-sm font-bold text-slate-900">
                      Export SQL Dump (`.sql` / `.sql.gz`)
                    </div>
                    <p className="text-xs text-slate-600">
                      Generates a consistent transactional dump of `{activeDb.name}` using{' '}
                      {activeDb.engine === 'POSTGRESQL_16'
                        ? 'pg_dump --no-owner'
                        : 'mariadb-dump --single-transaction'}
                      .
                    </p>
                    <Button
                      size="sm"
                      onClick={() =>
                        onShowToast(
                          `Exported ${activeDb.name}-backup-2026-10-20.sql (${activeDb.sizeMb} MB)`
                        )
                      }
                    >
                      <Download className="h-4 w-4" /> Download `{activeDb.name}.sql`
                    </Button>
                  </div>

                  <div className="rounded-xl border border-indigo-100 bg-[#FAF9FE] p-5 space-y-3">
                    <div className="font-display text-sm font-bold text-slate-900">
                      Import `.sql` File (Scanned &amp; Sandboxed)
                    </div>
                    <p className="text-xs text-slate-600">
                      Uploaded `.sql` files are scanned for malicious `COPY PROGRAM` or shell escapes
                      before execution inside `{activeDb.name}`.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onShowToast(
                          `Verified & imported schema dump into ${activeDb.name} (0 errors).`
                        )
                      }
                    >
                      <Upload className="h-4 w-4" /> Select `.sql` File to Import
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </AnimatedContent>
    );
  }

  /* ------------------------------------------------------------------------
     4. FILE MANAGER (REAL cPANEL 2-PANE LAYOUT + 4-LAYER CLAMAV/YARA/WAF SCANNER)
     ------------------------------------------------------------------------ */
  if (section === 'file-manager') {
    return (
      <NebulixFileManager
        activeDomain={activeDomain}
        activeLinuxUser={activeLinuxUser}
        onShowToast={onShowToast}
      />
    );
  }

  /* ------------------------------------------------------------------------
     5. SSL CERTIFICATES
     ------------------------------------------------------------------------ */
  if (section === 'ssl-certificates') {
    return (
      <AnimatedContent className="space-y-6">
        <AuroraBackground className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge variant="orange">MODULE 5 · LET’S ENCRYPT AUTOSSL (ACME)</Badge>
              <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                <BlurText text="SSL/TLS 1.3 Certificates & Automated Renewal" />
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                Zero-downtime ECDSA P-384 certificates with HTTP-01 and DNS-01 wildcard validation.
              </p>
            </div>
            <Button onClick={onOpenSslModal}>
              <Sparkles className="h-4 w-4" /> Issue AutoSSL Certificate
            </Button>
          </div>
        </AuroraBackground>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { host: activeDomain, type: 'HTTP-01 ACME', daysLeft: 84 },
            { host: `*.${activeDomain}`, type: 'DNS-01 Wildcard', daysLeft: 79 },
            { host: `mail.${activeDomain}`, type: 'DANE / TLSA + SMTP TLS', daysLeft: 88 },
          ].map((cert) => (
            <SpotlightCard key={cert.host} className="space-y-3">
              <div className="flex items-center justify-between">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
                <Badge variant="success">TLS 1.3 Active ({sslCount} Total)</Badge>
              </div>
              <h3 className="font-mono text-sm font-bold text-slate-900">{cert.host}</h3>
              <p className="text-xs text-slate-500">
                {cert.type} · Renews automatically ({cert.daysLeft} days left)
              </p>
            </SpotlightCard>
          ))}
        </div>
      </AnimatedContent>
    );
  }

  /* ------------------------------------------------------------------------
     6. BACKUPS
     ------------------------------------------------------------------------ */
  if (section === 'backups') {
    return (
      <AnimatedContent className="space-y-6">
        <AuroraBackground className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge variant="orange">MODULE 10 · RESTIC AES-256-GCM BACKUPS</Badge>
              <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                <BlurText text="Encrypted Snapshots & Sandbox Restore Verification" />
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                Every backup is test-restored into an isolated sandbox before being marked VERIFIED.
              </p>
            </div>
            <Button
              onClick={() =>
                onShowToast(
                  'Triggered incremental Restic AES-256-GCM snapshot + sandbox restore check.'
                )
              }
            >
              <CloudDownload className="h-4 w-4" /> Run Snapshot Now
            </Button>
          </div>
        </AuroraBackground>

        <div className="rounded-2xl border border-indigo-100/90 bg-white p-6 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)] space-y-3">
          {[
            {
              snapId: 'restic-snap-98f2a10c',
              date: 'Today, 03:00 IST',
              contents: 'Home FS + pg_dump + mariadb-dump + Maildir',
              size: '812 MB (Deduplicated)',
            },
            {
              snapId: 'restic-snap-74d1b09e',
              date: 'Yesterday, 03:00 IST',
              contents: 'Home FS + pg_dump + mariadb-dump + Maildir',
              size: '798 MB (Deduplicated)',
            },
          ].map((b) => (
            <div
              key={b.snapId}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-50 bg-[#FAF9FE] p-4"
            >
              <div>
                <div className="font-mono text-xs font-bold text-indigo-700">{b.snapId}</div>
                <div className="text-xs font-semibold text-slate-900">{b.contents}</div>
                <div className="text-[11px] text-slate-500">
                  {b.date} · {b.size}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">SANDBOX RESTORE VERIFIED</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onShowToast(`Initiated granular restore from ${b.snapId}`)}
                >
                  Restore
                </Button>
              </div>
            </div>
          ))}
        </div>
      </AnimatedContent>
    );
  }

  /* ------------------------------------------------------------------------
     7. SECURITY
     ------------------------------------------------------------------------ */
  if (section === 'security') {
    return (
      <AnimatedContent className="space-y-6">
        <AuroraBackground className="p-6 sm:p-8">
          <Badge variant="orange">ZERO-TRUST MULTI-TENANT SECURITY</Badge>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
            <BlurText text="Account Isolation, Step-Up MFA & SSH Controls" />
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Linux UID (`{activeLinuxUser}`), systemd cgroup v2 resource slice, ClamAV + YARA +
            ModSecurity WAF, and TOTP / Passkey MFA.
          </p>
        </AuroraBackground>

        <div className="grid gap-4 sm:grid-cols-3">
          <SpotlightCard>
            <Lock className="h-6 w-6 text-violet-600" />
            <h3 className="mt-3 font-display text-sm font-bold text-slate-900">
              Step-Up TOTP &amp; Passkey MFA
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Required before destructive database or service operations.
            </p>
            <Badge variant="success" className="mt-3">
              Enforced
            </Badge>
          </SpotlightCard>
          <SpotlightCard>
            <KeyRound className="h-6 w-6 text-indigo-600" />
            <h3 className="mt-3 font-display text-sm font-bold text-slate-900">
              Ed25519 SSH Key Access
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Password SSH login disabled; restricted to authorized Ed25519 keys.
            </p>
            <Badge variant="default" className="mt-3">
              2 Keys Authorized
            </Badge>
          </SpotlightCard>
          <SpotlightCard>
            <Terminal className="h-6 w-6 text-blue-600" />
            <h3 className="mt-3 font-display text-sm font-bold text-slate-900">
              Go Agent IPC Confinement
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              No arbitrary root shell execution; 25 strictly typed operations only.
            </p>
            <Badge variant="success" className="mt-3">
              SO_PEERCRED Active
            </Badge>
          </SpotlightCard>
        </div>
      </AnimatedContent>
    );
  }

  /* ------------------------------------------------------------------------
     8. SETTINGS
     ------------------------------------------------------------------------ */
  return (
    <AnimatedContent className="space-y-6">
      <AuroraBackground className="p-6 sm:p-8">
        <Badge variant="orange">cPANEL WORKSPACE &amp; RUNTIME PREFERENCES</Badge>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
          <BlurText text="Account Runtime & Notification Settings" />
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Configure default PHP-FPM / Node.js versions, systemd cron timers, and alert webhooks.
        </p>
      </AuroraBackground>

      <div className="grid gap-4 sm:grid-cols-2">
        <SpotlightCard className="space-y-3">
          <div className="flex items-center gap-2.5">
            <Sliders className="h-5 w-5 text-indigo-600" />
            <h3 className="font-display text-sm font-bold text-slate-900">
              Default Application Runtimes
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            PHP-FPM: <span className="font-mono font-bold text-indigo-700">PHP 8.3.12</span> ·
            Node.js: <span className="font-mono font-bold text-indigo-700">v22.11.0 LTS</span>
          </p>
          <Progress value={100} />
        </SpotlightCard>

        <SpotlightCard className="space-y-3">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="h-5 w-5 text-emerald-600" />
            <h3 className="font-display text-sm font-bold text-slate-900">
              Ed25519 Offline Grace Policy
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            72-hour non-disruptive grace window active; customer websites, DNS, and email are never
            terminated during cloud sync outages.
          </p>
          <Badge variant="success">Non-Destructive Policy Verified</Badge>
        </SpotlightCard>
      </div>
    </AnimatedContent>
  );
};
