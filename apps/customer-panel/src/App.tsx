import * as React from 'react';
import type { GarvixRole } from '@garvix/shared-types';
import {
  Globe,
  Mail,
  Database,
  ShieldCheck,
  FolderGit2,
  HardDriveDownload,
  ServerCog,
  CreditCard,
  Plus,
  Lock,
  CheckCircle2,
  Terminal,
  Sparkles,
  Layers,
  KeyRound,
  UserCheck,
  RefreshCw,
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
  Progress,
  Separator,
  DialogModal,
  GarvixShellHeader,
  SpotlightCard,
  BlurText,
  GradientText,
  CountUp,
  DecryptedText,
  AuroraBackground,
  StarBorder,
  TiltedCard,
  AnimatedContent,
} from '@garvix/ui-components';
import { CUSTOMER_PANEL_APP_METADATA } from './index.js';

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
  const [activeRole, setActiveRole] = React.useState<GarvixRole>('HOSTING_ACCOUNT_OWNER');
  const [dnsRecords, setDnsRecords] = React.useState<DnsRecordItem[]>(INITIAL_DNS_RECORDS);
  const [databases, setDatabases] = React.useState<HostedDbItem[]>(INITIAL_DATABASES);
  const [dnsModalOpen, setDnsModalOpen] = React.useState<boolean>(false);
  const [newDnsType, setNewDnsType] = React.useState<DnsRecordItem['type']>('A');
  const [newDnsName, setNewDnsName] = React.useState<string>('');
  const [newDnsValue, setNewDnsValue] = React.useState<string>('');
  const [checkoutPlan, setCheckoutPlan] = React.useState<(typeof STORE_PLANS)[number] | null>(
    null
  );
  const [checkoutEmail, setCheckoutEmail] = React.useState<string>('customer@company.in');
  const [checkoutIp, setCheckoutIp] = React.useState<string>('72.61.236.175');
  const [issuedStoreKey, setIssuedStoreKey] = React.useState<string>(
    'GVX-PRO-882A-94CF-E25519'
  );
  const [loginMode, setLoginMode] = React.useState<'CUSTOMER' | 'ADMIN'>('CUSTOMER');

  const authorizedNavItems = React.useMemo(
    () => getAuthorizedNavigationForRole(activeRole),
    [activeRole]
  );

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
  };

  const handleCreateDatabase = () => {
    const suffix = Math.floor(100 + Math.random() * 900);
    setDatabases((prev) => [
      ...prev,
      {
        id: `db-${Date.now()}`,
        name: `garvixprod_db${suffix}`,
        engine: prev.length % 2 === 0 ? 'POSTGRESQL_16' : 'MARIADB_10_11',
        dbUser: `garvixprod_u${suffix}`,
        sizeMb: 12,
      },
    ]);
  };

  const handleRazorpayCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPlan) return;
    const rand = Math.random().toString(16).substring(2, 6).toUpperCase();
    setIssuedStoreKey(`GVX-${checkoutPlan.code}-${rand}-77E1-E25519`);
    setCheckoutPlan(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <GarvixShellHeader
        brandTitle={CUSTOMER_PANEL_APP_METADATA.appName}
        brandSubtitle="AlmaLinux 10 · Nginx + PHP-FPM 8.3 · PostgreSQL 16 & MariaDB 10.11"
        environmentBadge={`v${CUSTOMER_PANEL_APP_METADATA.version}`}
        statusText="Go Agent UDS (SO_PEERCRED) Connected"
        rightActions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Active RBAC Role"
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as GarvixRole)}
              className="h-9 rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs font-semibold text-slate-200"
            >
              <option value="HOSTING_ACCOUNT_OWNER">Role: HOSTING_ACCOUNT_OWNER</option>
              <option value="SERVER_ADMIN">Role: SERVER_ADMIN (WHM Root)</option>
              <option value="HOSTING_RESELLER">Role: HOSTING_RESELLER</option>
              <option value="HOSTING_ACCOUNT_TECH">Role: HOSTING_ACCOUNT_TECH</option>
              <option value="EMAIL_ONLY_USER">Role: EMAIL_ONLY_USER</option>
              <option value="READ_ONLY_AUDITOR">Role: READ_ONLY_AUDITOR</option>
            </select>
            <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
              {(
                [
                  { id: 'cpanel', label: 'cPanel' },
                  { id: 'whm', label: 'WHM Admin' },
                  { id: 'store', label: 'License Store' },
                  { id: 'login', label: 'Portal Login' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSurface(s.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
                    activeSurface === s.id
                      ? 'bg-[#ff6c2c] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="mx-auto max-w-7xl px-6 py-8 grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Left Role-Scoped Sidebar powered by getAuthorizedNavigationForRole */}
        <aside className="space-y-4">
          <Card className="border-slate-800 bg-slate-900/90 text-slate-100">
            <CardHeader className="pb-3">
              <Badge variant="orange" className="w-fit">
                RBAC Navigation ({authorizedNavItems.length} modules)
              </Badge>
              <CardTitle className="mt-2 text-sm text-white">Authorized Modules</CardTitle>
              <CardDescription className="text-slate-400">
                Filtered dynamically by `getAuthorizedNavigationForRole({activeRole})`
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {authorizedNavItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-xs font-medium text-slate-200 hover:border-orange-500/40"
                >
                  <span>{item.label}</span>
                  <Badge variant={item.isRootServerOperation ? 'warning' : 'secondary'}>
                    M{item.moduleNumber}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/90 text-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-slate-400">
                Account Isolation Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Primary Domain</span>
                <span className="font-mono font-bold text-white">garvixcloud.in</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Linux User / UID</span>
                <span className="font-mono text-emerald-400">garvixprod (1004)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Home Confinement</span>
                <span className="font-mono text-sky-400">O_NOFOLLOW 0710</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">AutoSSL (ACME)</span>
                <span className="font-semibold text-emerald-400">TLS 1.3 Active</span>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Main Workspace Surface */}
        <main className="space-y-6">
          {/* SURFACE 1: CUSTOMER CPANEL */}
          {activeSurface === 'cpanel' && (
            <AnimatedContent className="space-y-6">
              <AuroraBackground className="border border-slate-800/80 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold text-emerald-300">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>cPanel Jupiter Experience · Plane B Local Hosting Panel</span>
                    </div>
                    <h1 className="mt-2 text-2xl font-black text-white">
                      <BlurText text="garvixcloud.in — Hosting Control Center" />
                    </h1>
                    <p className="mt-1 text-xs text-slate-300">
                      Sandboxed under `/home/garvixprod` with dedicated PHP-FPM 8.3 pool,
                      PostgreSQL 16 &amp; MariaDB 10.11 workloads, and Restic encrypted backups.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="orange" size="sm" onClick={() => setDnsModalOpen(true)}>
                      <Plus className="h-4 w-4" />
                      Add DNS Record
                    </Button>
                    <Button variant="blue" size="sm" onClick={handleCreateDatabase}>
                      <Database className="h-4 w-4" />
                      Quick Create DB
                    </Button>
                  </div>
                </div>
              </AuroraBackground>

              {/* Resource Quotas with React Bits SpotlightCard + CountUp */}
              <div className="grid gap-4 sm:grid-cols-3">
                <SpotlightCard className="border-slate-800 bg-slate-900/90 text-white">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>NVMe Quota Usage</span>
                    <HardDriveDownload className="h-4 w-4 text-orange-400" />
                  </div>
                  <div className="mt-2 text-2xl font-black">
                    <CountUp to={14.2} decimals={1} suffix=" GB" /> / 50 GB
                  </div>
                  <Progress value={28.4} className="mt-3" />
                </SpotlightCard>

                <SpotlightCard className="border-slate-800 bg-slate-900/90 text-white">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Monthly Bandwidth</span>
                    <Globe className="h-4 w-4 text-sky-400" />
                  </div>
                  <div className="mt-2 text-2xl font-black">
                    <CountUp to={412} suffix=" GB" /> / 2,000 GB
                  </div>
                  <Progress value={20.6} className="mt-3" />
                </SpotlightCard>

                <SpotlightCard className="border-slate-800 bg-slate-900/90 text-white">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Mail Preflight Score</span>
                    <Mail className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-emerald-400">
                    <CountUp to={13} /> / 13 Passed
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    SPF + 2048-bit DKIM + DMARC + PTR Valid
                  </p>
                </SpotlightCard>
              </div>

              {/* cPanel Quick Launch Feature Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    title: 'Domains & Bind9 DNS',
                    desc: 'Manage A, AAAA, MX, TXT, SPF, and DKIM records with named-checkzone validation.',
                    icon: Globe,
                    badge: `${dnsRecords.length} Records`,
                  },
                  {
                    title: 'PostgreSQL 16 & MariaDB',
                    desc: 'Customer databases run on dedicated instances isolated from panel metadata.',
                    icon: Database,
                    badge: `${databases.length} Databases`,
                  },
                  {
                    title: 'Postfix + Dovecot + Rspamd',
                    desc: 'Argon2id mailboxes, Roundcube webmail, and outbound rate limiting.',
                    icon: Mail,
                    badge: 'DKIM Signed',
                  },
                  {
                    title: 'Let’s Encrypt AutoSSL',
                    desc: 'Automated HTTP-01 & DNS-01 TLS certificate issuance and renewal.',
                    icon: ShieldCheck,
                    badge: 'TLS 1.3 Active',
                  },
                  {
                    title: 'Sandboxed File Manager',
                    desc: 'O_NOFOLLOW symlink-safe file operations strictly inside /home/garvixprod.',
                    icon: FolderGit2,
                    badge: 'chroot / 0710',
                  },
                  {
                    title: 'Restic Encrypted Backups',
                    desc: 'AES-256-GCM snapshots with automated ephemeral sandbox restore verification.',
                    icon: HardDriveDownload,
                    badge: 'Verified Daily',
                  },
                ].map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <SpotlightCard
                      key={feature.title}
                      className="border-slate-800 bg-slate-900/90 text-slate-100"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                          <Icon className="h-5 w-5" />
                        </div>
                        <Badge variant="success">{feature.badge}</Badge>
                      </div>
                      <h3 className="mt-3 text-sm font-bold text-white">{feature.title}</h3>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed">{feature.desc}</p>
                    </SpotlightCard>
                  );
                })}
              </div>

              {/* DNS Records & Databases Tables */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-slate-800 bg-slate-900/95 text-slate-100">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm text-white">
                        Authoritative DNS Zone (`garvixcloud.in`)
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Validated via `named-checkzone` prior to atomic reload
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setDnsModalOpen(true)}>
                      <Plus className="h-3.5 w-3.5" /> Record
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dnsRecords.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <Badge variant="orange">{rec.type}</Badge>
                          <span className="font-mono font-bold text-white">{rec.name}</span>
                        </div>
                        <span className="max-w-[220px] truncate font-mono text-slate-400">
                          {rec.value}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900/95 text-slate-100">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm text-white">
                        Isolated Customer Databases
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Separate from `garvix_local_panel` control database
                      </CardDescription>
                    </div>
                    <Button variant="blue" size="sm" onClick={handleCreateDatabase}>
                      <Plus className="h-3.5 w-3.5" /> Provision DB
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {databases.map((db) => (
                      <div
                        key={db.id}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs"
                      >
                        <div>
                          <div className="font-mono font-bold text-white">{db.name}</div>
                          <div className="text-slate-400">User: {db.dbUser}</div>
                        </div>
                        <div className="text-right">
                          <Badge variant={db.engine === 'POSTGRESQL_16' ? 'blue' : 'success'}>
                            {db.engine}
                          </Badge>
                          <div className="mt-1 font-mono text-slate-400">{db.sizeMb} MB</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </AnimatedContent>
          )}

          {/* SURFACE 2: WHM SERVER & RESELLER ADMIN */}
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
                          <span className="font-mono text-xs font-bold text-white">{svc.unit}</span>
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

          {/* SURFACE 3: RAZORPAY COMMERCIAL LICENSE STORE */}
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
                      Pay via UPI QR, Credit Card, Debit Card, or NetBanking. Automatically creates
                      your Customer Portal account and binds an Ed25519 license key to your server
                      IP.
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

          {/* SURFACE 4: CUSTOMER vs ADMIN LOGIN PORTAL */}
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

      {/* Add DNS Record Modal */}
      <DialogModal
        open={dnsModalOpen}
        onClose={() => setDnsModalOpen(false)}
        title="Add Authoritative DNS Record"
        description="New records are staged and verified with named-checkzone before reloading Bind9."
      >
        <form onSubmit={handleAddDnsRecord} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Record Type</label>
            <select
              value={newDnsType}
              onChange={(e) => setNewDnsType(e.target.value as DnsRecordItem['type'])}
              className="flex h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="A">A (IPv4 Address)</option>
              <option value="AAAA">AAAA (IPv6 Address)</option>
              <option value="CNAME">CNAME (Canonical Name)</option>
              <option value="MX">MX (Mail Exchange)</option>
              <option value="TXT">TXT (SPF / DKIM / DMARC)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Host / Subdomain</label>
            <Input
              required
              value={newDnsName}
              onChange={(e) => setNewDnsName(e.target.value)}
              placeholder="@ or api or mail"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Record Value</label>
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
            <Button type="submit" variant="orange">
              <RefreshCw className="h-4 w-4" />
              Validate &amp; Apply Record
            </Button>
          </div>
        </form>
      </DialogModal>

      {/* Razorpay Checkout Modal */}
      <DialogModal
        open={checkoutPlan !== null}
        onClose={() => setCheckoutPlan(null)}
        title={checkoutPlan ? `Razorpay Checkout — ${checkoutPlan.name}` : 'Razorpay Checkout'}
        description="Supports UPI QR, Credit/Debit Cards (Visa/Mastercard/RuPay), and NetBanking with automatic account creation."
      >
        <form onSubmit={handleRazorpayCheckoutSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Customer Email</label>
            <Input
              required
              type="email"
              value={checkoutEmail}
              onChange={(e) => setCheckoutEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
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
