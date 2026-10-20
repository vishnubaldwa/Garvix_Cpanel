import * as React from 'react';
import {
  Globe,
  Mail,
  Database,
  FolderOpen,
  ShieldCheck,
  CloudDownload,
  Lock,
  CreditCard,
  Sliders,
  Plus,
  CheckCircle2,
  FileText,
  KeyRound,
  RefreshCw,
  Terminal,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  Button,
  Badge,
  Progress,
  SpotlightCard,
  BlurText,
  CountUp,
  AnimatedContent,
  AuroraBackground,
} from '@garvix/ui-components';
import type { NebulixSidebarSectionId } from './NebulixSidebar.js';

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

export interface NebulixModulePageProps {
  section: Exclude<NebulixSidebarSectionId, 'dashboard'>;
  dnsRecords: DnsRecordView[];
  databases: HostedDbView[];
  emailCount: number;
  sslCount: number;
  onOpenDnsModal: () => void;
  onOpenEmailModal: () => void;
  onCreateDatabase: () => void;
  onOpenSslModal: () => void;
  onShowToast: (msg: string) => void;
}

export const NebulixModulePages: React.FC<NebulixModulePageProps> = ({
  section,
  dnsRecords,
  databases,
  emailCount,
  sslCount,
  onOpenDnsModal,
  onOpenEmailModal,
  onCreateDatabase,
  onOpenSslModal,
  onShowToast,
}) => {
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
              domain: 'garvixcloud.in',
              runtime: 'Node.js 22 LTS (systemd slice)',
              docRoot: '/home/garvixprod/apps/cloud-web/public',
              ssl: 'TLS 1.3 Active (ECDSA)',
            },
            {
              domain: 'api.garvixcloud.in',
              runtime: 'Node.js 22 Fastify Gateway',
              docRoot: '/home/garvixprod/apps/api/dist',
              ssl: 'Wildcard TLS 1.3 Active',
            },
            {
              domain: 'portal.garvixcloud.in',
              runtime: 'PHP-FPM 8.3 (UID 1004 Pool)',
              docRoot: '/home/garvixprod/public_html/portal',
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
                Bind9 Authoritative DNS Records (`garvixcloud.in`)
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
     2. EMAIL ACCOUNTS
     ------------------------------------------------------------------------ */
  if (section === 'email-accounts') {
    return (
      <AnimatedContent className="space-y-6">
        <AuroraBackground className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge variant="orange">MODULE 6 · POSTFIX + DOVECOT + RSPAMD</Badge>
              <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                <BlurText text="Business Email Accounts & 13-Point Mail Preflight" />
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                Argon2id encrypted mailboxes, 2048-bit RSA/Ed25519 DKIM signing, SPF/DMARC policies,
                and Roundcube Webmail.
              </p>
            </div>
            <Button onClick={onOpenEmailModal}>
              <Plus className="h-4 w-4" /> Create Business Mailbox
            </Button>
          </div>
        </AuroraBackground>

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

        <div className="rounded-2xl border border-indigo-100/90 bg-white p-6 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)] space-y-3">
          <h2 className="font-display text-base font-extrabold text-slate-900">
            Active Mailboxes (`@garvixcloud.in`)
          </h2>
          {[
            { address: 'vishnu@garvixcloud.in', usedMb: 640, quotaMb: 2048 },
            { address: 'support@garvixcloud.in', usedMb: 420, quotaMb: 2048 },
            { address: 'billing@garvixcloud.in', usedMb: 310, quotaMb: 2048 },
            { address: 'security@garvixcloud.in', usedMb: 185, quotaMb: 1024 },
          ].map((mb) => (
            <div
              key={mb.address}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-50 bg-[#FAF9FE] p-3.5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-slate-900">{mb.address}</div>
                  <div className="text-[11px] text-slate-500">
                    {mb.usedMb} MB / {mb.quotaMb} MB Maildir Quota
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="success">DKIM + SPF Active</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onShowToast(`Launched Roundcube Webmail session for ${mb.address}`)}
                >
                  Open Webmail
                </Button>
              </div>
            </div>
          ))}
        </div>
      </AnimatedContent>
    );
  }

  /* ------------------------------------------------------------------------
     3. DATABASES
     ------------------------------------------------------------------------ */
  if (section === 'databases') {
    return (
      <AnimatedContent className="space-y-6">
        <AuroraBackground className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge variant="orange">MODULE 7 · ISOLATED WORKLOAD DATABASES</Badge>
              <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                <BlurText text="PostgreSQL 16 & MariaDB 10.11 Databases" />
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                Customer databases are strictly isolated from the `garvix_local_panel` control
                plane database (`isPanelInstance: false`).
              </p>
            </div>
            <Button onClick={onCreateDatabase}>
              <Plus className="h-4 w-4" /> Provision New Database
            </Button>
          </div>
        </AuroraBackground>

        <div className="grid gap-4 sm:grid-cols-2">
          {databases.map((db) => (
            <SpotlightCard key={db.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-white">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm font-bold text-slate-900">{db.name}</h3>
                    <p className="text-xs text-slate-500">Owner Role: {db.dbUser}</p>
                  </div>
                </div>
                <Badge variant="default">{db.engine}</Badge>
              </div>
              <div className="flex items-center justify-between border-t border-indigo-50 pt-3 text-xs">
                <span className="font-mono text-slate-600">
                  Port: {db.engine === 'POSTGRESQL_16' ? '5432' : '3306'} · {db.sizeMb} MB
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onShowToast(`Rotated database password for ${db.dbUser} via Go Agent.`)
                  }
                >
                  Rotate Password
                </Button>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </AnimatedContent>
    );
  }

  /* ------------------------------------------------------------------------
     4. FILE MANAGER
     ------------------------------------------------------------------------ */
  if (section === 'file-manager') {
    return (
      <AnimatedContent className="space-y-6">
        <AuroraBackground className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge variant="orange">MODULE 9 · SANDBOXED FILE MANAGER</Badge>
              <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                <BlurText text="Home Directory Browser (/home/garvixprod)" />
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                Protected by Go Agent `O_NOFOLLOW` and `filepath.EvalSymlinks` boundary confinement.
              </p>
            </div>
            <Button
              onClick={() =>
                onShowToast('Created new directory inside /home/garvixprod/public_html (chmod 0750)')
              }
            >
              <Plus className="h-4 w-4" /> New Folder
            </Button>
          </div>
        </AuroraBackground>

        <div className="rounded-2xl border border-indigo-100/90 bg-white p-6 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)] space-y-2.5">
          {[
            { name: 'public_html/', type: 'Directory', perms: '0750', size: '4.2 GB' },
            { name: 'apps/cloud-web/', type: 'Directory', perms: '0750', size: '3.9 GB' },
            { name: 'mail/garvixcloud.in/', type: 'Maildir', perms: '0700', size: '1.9 GB' },
            { name: 'logs/nginx-http3.access.log', type: 'Log File', perms: '0640', size: '142 MB' },
            { name: '.env.production.enc', type: 'AES-256-GCM Secret', perms: '0600', size: '4 KB' },
          ].map((file) => (
            <div
              key={file.name}
              className="flex items-center justify-between rounded-xl border border-indigo-50 bg-[#FAF9FE] px-4 py-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <FolderOpen className="h-4 w-4 text-indigo-600" />
                <span className="font-mono font-bold text-slate-900">{file.name}</span>
                <Badge variant="secondary">{file.type}</Badge>
              </div>
              <div className="font-mono text-slate-500">
                chmod {file.perms} · {file.size}
              </div>
            </div>
          ))}
        </div>
      </AnimatedContent>
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
            { host: 'garvixcloud.in', type: 'HTTP-01 ACME', daysLeft: 84 },
            { host: '*.garvixcloud.in', type: 'DNS-01 Wildcard', daysLeft: 79 },
            { host: 'mail.garvixcloud.in', type: 'DANE / TLSA + SMTP TLS', daysLeft: 88 },
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
            Linux UID 1004 (`garvixprod`), systemd cgroup v2 resource slice, and TOTP / Passkey MFA.
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
     8. BILLING
     ------------------------------------------------------------------------ */
  if (section === 'billing') {
    return (
      <AnimatedContent className="space-y-6">
        <AuroraBackground className="p-6 sm:p-8">
          <Badge variant="orange">MODULE 11 · SUBSCRIPTIONS &amp; SAC 998315 GST INVOICES</Badge>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
            <BlurText text="Commercial Subscription & Indian GST Tax Ledger" />
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Razorpay Verified Payments · SAC 998315 Cloud Hosting &amp; IT Infrastructure (18% GST).
          </p>
        </AuroraBackground>

        <div className="rounded-2xl border border-indigo-100/90 bg-white p-6 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)] space-y-3">
          {[
            {
              inv: 'GVX-INV-2026-1041',
              plan: 'Garvix Pro (Up to 5 Accounts)',
              tax: 'CGST ₹114.33 + SGST ₹114.33',
              total: '₹1,499.00',
              payId: 'pay_P9xK4m2n8LqR1w',
            },
            {
              inv: 'GVX-INV-2026-0988',
              plan: 'Garvix Pro (Up to 5 Accounts)',
              tax: 'CGST ₹114.33 + SGST ₹114.33',
              total: '₹1,499.00',
              payId: 'pay_P8mW2c1x4QpZ9k',
            },
          ].map((row) => (
            <div
              key={row.inv}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-50 bg-[#FAF9FE] p-4 text-xs"
            >
              <div>
                <div className="font-mono font-bold text-indigo-700">{row.inv}</div>
                <div className="font-semibold text-slate-900">{row.plan}</div>
                <div className="text-slate-500">
                  SAC 998315 · {row.tax} · Razorpay: {row.payId}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-base font-extrabold text-slate-900">
                  {row.total}
                </span>
                <Badge variant="success">PAID</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onShowToast(`Downloaded GST Invoice ${row.inv}.pdf`)}
                >
                  <FileText className="h-3.5 w-3.5" /> PDF
                </Button>
              </div>
            </div>
          ))}
        </div>
      </AnimatedContent>
    );
  }

  /* ------------------------------------------------------------------------
     9. SETTINGS
     ------------------------------------------------------------------------ */
  return (
    <AnimatedContent className="space-y-6">
      <AuroraBackground className="p-6 sm:p-8">
        <Badge variant="orange">WORKSPACE &amp; RUNTIME PREFERENCES</Badge>
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
