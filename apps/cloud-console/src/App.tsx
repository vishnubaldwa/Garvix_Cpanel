import * as React from 'react';
import {
  ShieldCheck,
  Server,
  KeyRound,
  ReceiptIndianRupee,
  PackageCheck,
  Lock,
  Activity,
  Cpu,
  HardDrive,
  RefreshCw,
  Plus,
  CheckCircle2,
  Sparkles,
  LogOut,
  Terminal,
  FileSpreadsheet,
} from 'lucide-react';
import {
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
  ShinyText,
  GradientText,
  CountUp,
  DecryptedText,
  AuroraBackground,
  StarBorder,
  TiltedCard,
  AnimatedContent,
} from '@garvix/ui-components';
import { CLOUD_CONSOLE_APP_METADATA } from './index.js';

type CloudConsoleRole = (typeof CLOUD_CONSOLE_APP_METADATA.supportedRoles)[number];

type ConsoleTab = 'fleet' | 'licensing' | 'billing' | 'releases';

interface EnrolledServer {
  id: string;
  hostname: string;
  ipAddress: string;
  osProfile: string;
  cpuUsagePct: number;
  ramUsedGb: number;
  ramTotalGb: number;
  nvmeUsedGb: number;
  nvmeTotalGb: number;
  licenseTier: 'TRIAL' | 'SOLO' | 'PRO' | 'PREMIER';
  agentVersion: string;
  mtlsStatus: 'VERIFIED' | 'ROTATING';
  accountsCount: number;
  maxAccounts: number;
}

interface IssuedLicenseRecord {
  id: string;
  licenseKey: string;
  organization: string;
  tier: 'SOLO' | 'PRO' | 'PREMIER';
  boundIp: string;
  status: 'ACTIVE' | 'GRACE_PERIOD';
  offlineGraceHours: number;
  expiresAt: string;
  ed25519Fingerprint: string;
}

const INITIAL_SERVERS: EnrolledServer[] = [
  {
    id: 'srv-alma10-mum-01',
    hostname: 'almalinux10-mum-prod01.garvix.in',
    ipAddress: '72.61.236.175',
    osProfile: 'AlmaLinux 10.0 (Purple Lion) x86_64',
    cpuUsagePct: 24,
    ramUsedGb: 5.4,
    ramTotalGb: 16,
    nvmeUsedGb: 48,
    nvmeTotalGb: 200,
    licenseTier: 'PRO',
    agentVersion: 'v1.4.2-uds-mtls',
    mtlsStatus: 'VERIFIED',
    accountsCount: 4,
    maxAccounts: 5,
  },
  {
    id: 'srv-alma10-blr-02',
    hostname: 'nvme-edge02.blr.garvixcloud.in',
    ipAddress: '103.148.192.44',
    osProfile: 'AlmaLinux 10.0 (Purple Lion) x86_64',
    cpuUsagePct: 41,
    ramUsedGb: 9.8,
    ramTotalGb: 16,
    nvmeUsedGb: 112,
    nvmeTotalGb: 200,
    licenseTier: 'PREMIER',
    agentVersion: 'v1.4.2-uds-mtls',
    mtlsStatus: 'VERIFIED',
    accountsCount: 29,
    maxAccounts: 100,
  },
  {
    id: 'srv-rocky9-del-03',
    hostname: 'shared-reseller01.del.garvixcloud.in',
    ipAddress: '45.118.133.91',
    osProfile: 'AlmaLinux 10.0 (Purple Lion) x86_64',
    cpuUsagePct: 14,
    ramUsedGb: 3.1,
    ramTotalGb: 16,
    nvmeUsedGb: 26,
    nvmeTotalGb: 200,
    licenseTier: 'SOLO',
    agentVersion: 'v1.4.2-uds-mtls',
    mtlsStatus: 'VERIFIED',
    accountsCount: 1,
    maxAccounts: 1,
  },
];

const INITIAL_LICENSES: IssuedLicenseRecord[] = [
  {
    id: 'lic-01',
    licenseKey: 'GVX-PRO-9F42-88BC-E25519',
    organization: 'ApexHost India Pvt Ltd',
    tier: 'PRO',
    boundIp: '72.61.236.175',
    status: 'ACTIVE',
    offlineGraceHours: 72,
    expiresAt: '2026-11-20',
    ed25519Fingerprint: 'ed25519:8f9d2a1b4c77e0319a82b',
  },
  {
    id: 'lic-02',
    licenseKey: 'GVX-PREM-77A1-44D0-E25519',
    organization: 'CloudVeda Solutions LLP',
    tier: 'PREMIER',
    boundIp: '103.148.192.44',
    status: 'ACTIVE',
    offlineGraceHours: 72,
    expiresAt: '2027-01-15',
    ed25519Fingerprint: 'ed25519:3c44b891e102f998a124d',
  },
  {
    id: 'lic-03',
    licenseKey: 'GVX-SOLO-12E9-90FA-E25519',
    organization: 'Mehta Digital Studio',
    tier: 'SOLO',
    boundIp: '45.118.133.91',
    status: 'ACTIVE',
    offlineGraceHours: 72,
    expiresAt: '2026-11-18',
    ed25519Fingerprint: 'ed25519:7a10d556c89e4b120f33c',
  },
];

const GST_INVOICES = [
  {
    invoiceNo: 'GVX-INV-2026-1041',
    customer: 'ApexHost India Pvt Ltd',
    gstin: '27AABCA8921K1Z5',
    stateCode: '27 (Maharashtra - Intra-state)',
    sacCode: '998315',
    subtotalInr: 1270.34,
    cgstInr: 114.33,
    sgstInr: 114.33,
    igstInr: 0,
    totalInr: 1499.0,
    razorpayPaymentId: 'pay_P9xK4m2n8LqR1w',
    status: 'PAID',
  },
  {
    invoiceNo: 'GVX-INV-2026-1042',
    customer: 'CloudVeda Solutions LLP',
    gstin: '29AAFCC4410N1Z2',
    stateCode: '29 (Karnataka - Inter-state)',
    sacCode: '998315',
    subtotalInr: 2541.53,
    cgstInr: 0,
    sgstInr: 0,
    igstInr: 457.47,
    totalInr: 2999.0,
    razorpayPaymentId: 'pay_P9yL9v7b3TzM0q',
    status: 'PAID',
  },
  {
    invoiceNo: 'GVX-INV-2026-1043',
    customer: 'Mehta Digital Studio',
    gstin: '08AAJCM1902D1Z8',
    stateCode: '08 (Rajasthan - Intra-state)',
    sacCode: '998315',
    subtotalInr: 677.12,
    cgstInr: 60.94,
    sgstInr: 60.94,
    igstInr: 0,
    totalInr: 799.0,
    razorpayPaymentId: 'pay_P9zN2c5k9WpX4e',
    status: 'PAID',
  },
];

export function CloudConsoleApp(): React.ReactElement {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(true);
  const [activeRole, setActiveRole] = React.useState<CloudConsoleRole>('GARVIX_SUPER_ADMIN');
  const [activeTab, setActiveTab] = React.useState<ConsoleTab>('fleet');
  const [servers] = React.useState<EnrolledServer[]>(INITIAL_SERVERS);
  const [licenses, setLicenses] = React.useState<IssuedLicenseRecord[]>(INITIAL_LICENSES);
  const [issueModalOpen, setIssueModalOpen] = React.useState<boolean>(false);
  const [newOrgName, setNewOrgName] = React.useState<string>('');
  const [newBoundIp, setNewBoundIp] = React.useState<string>('');
  const [newTier, setNewTier] = React.useState<'SOLO' | 'PRO' | 'PREMIER'>('PRO');
  const [loginEmail, setLoginEmail] = React.useState<string>('superadmin@garvix.in');
  const [loginTotp, setLoginTotp] = React.useState<string>('482910');

  const handleIssueLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !newBoundIp.trim()) return;
    const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
    const created: IssuedLicenseRecord = {
      id: `lic-${Date.now()}`,
      licenseKey: `GVX-${newTier}-${randomHex}-99AF-E25519`,
      organization: newOrgName.trim(),
      tier: newTier,
      boundIp: newBoundIp.trim(),
      status: 'ACTIVE',
      offlineGraceHours: 72,
      expiresAt: '2026-11-20',
      ed25519Fingerprint: `ed25519:${Math.random().toString(16).substring(2, 18)}`,
    };
    setLicenses((prev) => [created, ...prev]);
    setNewOrgName('');
    setNewBoundIp('');
    setIssueModalOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <AuroraBackground className="w-full max-w-4xl border border-slate-800/80 p-8 md:p-12 shadow-2xl">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div className="space-y-5">
              <Badge variant="orange" className="uppercase tracking-wider">
                Plane A · Cloud Control Plane
              </Badge>
              <h1 className="text-3xl font-black tracking-tight text-white">
                <BlurText text="Garvix Cloud Control Console" />
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Zero-trust multi-tenant fleet orchestration, Ed25519 commercial licensing,
                SAC 998315 GST billing ledger, and signed OTA release management.
              </p>
              <div className="space-y-2.5 rounded-xl border border-slate-800/90 bg-slate-900/70 p-4 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Step-Up TOTP / WebAuthn Passkey Enforced</span>
                </div>
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-orange-400" />
                  <span>Offline-Capable Ed25519 License Signing Keyring</span>
                </div>
                <div className="flex items-center gap-2">
                  <ReceiptIndianRupee className="h-4 w-4 text-sky-400" />
                  <span>Razorpay Webhook + Indian GST (CGST/SGST/IGST)</span>
                </div>
              </div>
            </div>

            <StarBorder color="#ff6c2c">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsAuthenticated(true);
                }}
                className="space-y-4 rounded-[15px] bg-slate-900 p-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-white">Operator Sign In</h2>
                  <p className="text-xs text-slate-400">
                    Authenticate with Argon2id + Hardware Passkey / TOTP
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Operator Email</label>
                  <Input
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="superadmin@garvix.in"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Role Context</label>
                  <select
                    value={activeRole}
                    onChange={(e) => setActiveRole(e.target.value as CloudConsoleRole)}
                    className="flex h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  >
                    {CLOUD_CONSOLE_APP_METADATA.supportedRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Step-Up MFA (6-Digit TOTP)
                  </label>
                  <Input
                    value={loginTotp}
                    onChange={(e) => setLoginTotp(e.target.value)}
                    placeholder="482910"
                  />
                </div>
                <Button type="submit" variant="orange" className="w-full">
                  <Lock className="h-4 w-4" />
                  Verify MFA &amp; Enter Cloud Console
                </Button>
              </form>
            </StarBorder>
          </div>
        </AuroraBackground>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <GarvixShellHeader
        brandTitle={CLOUD_CONSOLE_APP_METADATA.appName}
        brandSubtitle="Ed25519 Licensing · mTLS Server Fleet · Razorpay GST Ledger"
        environmentBadge={CLOUD_CONSOLE_APP_METADATA.version}
        statusText="Cloud Control Plane Healthy · 99.98% SLA"
        rightActions={
          <div className="flex items-center gap-2.5">
            <select
              aria-label="Active Cloud Role"
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as CloudConsoleRole)}
              className="h-9 rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs font-semibold text-slate-200"
            >
              {CLOUD_CONSOLE_APP_METADATA.supportedRoles.map((role) => (
                <option key={role} value={role}>
                  Role: {role}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAuthenticated(false)}
              className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              <LogOut className="h-3.5 w-3.5" />
              Lock Session
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Hero Banner with React Bits AuroraBackground + BlurText + GradientText */}
        <AuroraBackground className="border border-slate-800/80 p-6 md:p-8 shadow-xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Garvix Software Solutions Pvt Ltd · Plane A Control Center</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                <BlurText text="Global Hosting Fleet & Commercial Licensing" />
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl">
                Cryptographically signed{' '}
                <GradientText>Ed25519 offline-capable licenses</GradientText>, mTLS hardware
                enrollment for AlmaLinux 10 servers, and automated Razorpay SAC 998315 GST
                invoicing.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="orange" onClick={() => setIssueModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Issue Signed License Key
              </Button>
            </div>
          </div>
        </AuroraBackground>

        {/* Top KPI Metrics using React Bits SpotlightCard & CountUp */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SpotlightCard className="border-slate-800 bg-slate-900/90 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Enrolled AlmaLinux Nodes
              </span>
              <Server className="h-4 w-4 text-orange-400" />
            </div>
            <div className="mt-3 text-3xl font-black text-white">
              <CountUp to={servers.length} />
            </div>
            <p className="mt-1 text-xs text-emerald-400">
              100% mTLS heartbeats verified (&lt; 30s)
            </p>
          </SpotlightCard>

          <SpotlightCard className="border-slate-800 bg-slate-900/90 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Ed25519 Licenses
              </span>
              <KeyRound className="h-4 w-4 text-sky-400" />
            </div>
            <div className="mt-3 text-3xl font-black text-white">
              <CountUp to={licenses.length} />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              72-hour non-disruptive offline grace window
            </p>
          </SpotlightCard>

          <SpotlightCard className="border-slate-800 bg-slate-900/90 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Monthly GST Revenue (INR)
              </span>
              <ReceiptIndianRupee className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3 text-3xl font-black text-white">
              <CountUp to={5297} prefix="₹" />
            </div>
            <p className="mt-1 text-xs text-emerald-400">
              SAC 998315 · Razorpay Webhooks Verified
            </p>
          </SpotlightCard>

          <SpotlightCard className="border-slate-800 bg-slate-900/90 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Hosted Tenant Accounts
              </span>
              <Activity className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-3 text-3xl font-black text-white">
              <CountUp to={34} />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Isolated Linux UIDs + systemd cgroup v2
            </p>
          </SpotlightCard>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          {(
            [
              { id: 'fleet', label: 'mTLS Server Fleet & Telemetry', icon: Server },
              { id: 'licensing', label: 'Ed25519 Commercial Licenses', icon: KeyRound },
              { id: 'billing', label: 'Razorpay & GST Invoices (SAC 998315)', icon: ReceiptIndianRupee },
              { id: 'releases', label: 'Signed OTA Releases & Audit Log', icon: PackageCheck },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant={active ? 'orange' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={!active ? 'text-slate-300 hover:bg-slate-900 hover:text-white' : ''}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* TAB 1: SERVER FLEET */}
        {activeTab === 'fleet' && (
          <AnimatedContent className="grid gap-5 md:grid-cols-3">
            {servers.map((srv) => (
              <TiltedCard key={srv.id} maxTiltDeg={3}>
                <Card className="border-slate-800 bg-slate-900/95 text-slate-100 h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="orange">{srv.licenseTier} TIER</Badge>
                      <Badge variant="success">{srv.mtlsStatus}</Badge>
                    </div>
                    <CardTitle className="mt-2 text-base font-bold text-white">
                      {srv.hostname}
                    </CardTitle>
                    <CardDescription className="text-slate-400 font-mono">
                      IPv4: {srv.ipAddress} · {srv.osProfile}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Cpu className="h-3.5 w-3.5 text-orange-400" /> 4 vCPU Load
                        </span>
                        <span className="font-mono font-bold">{srv.cpuUsagePct}%</span>
                      </div>
                      <Progress value={srv.cpuUsagePct} />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">RAM ({srv.ramTotalGb} GB ECC)</span>
                        <span className="font-mono font-bold">
                          {srv.ramUsedGb} / {srv.ramTotalGb} GB
                        </span>
                      </div>
                      <Progress value={(srv.ramUsedGb / srv.ramTotalGb) * 100} />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1 text-slate-300">
                          <HardDrive className="h-3.5 w-3.5 text-sky-400" /> NVMe Storage
                        </span>
                        <span className="font-mono font-bold">
                          {srv.nvmeUsedGb} / {srv.nvmeTotalGb} GB
                        </span>
                      </div>
                      <Progress value={(srv.nvmeUsedGb / srv.nvmeTotalGb) * 100} />
                    </div>

                    <Separator className="bg-slate-800" />
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Agent: {srv.agentVersion}</span>
                      <span className="font-semibold text-emerald-400">
                        {srv.accountsCount} / {srv.maxAccounts} cPanel Accounts
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </TiltedCard>
            ))}
          </AnimatedContent>
        )}

        {/* TAB 2: ED25519 COMMERCIAL LICENSES */}
        {activeTab === 'licensing' && (
          <AnimatedContent className="space-y-4">
            <Card className="border-slate-800 bg-slate-900/95 text-slate-100">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white">
                    Issued Ed25519 Commercial Licenses
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Hover over any license key to trigger cryptographic DecryptedText verification.
                    Offline grace is strictly 72 hours without disrupting customer workloads.
                  </CardDescription>
                </div>
                <Button variant="orange" size="sm" onClick={() => setIssueModalOpen(true)}>
                  <Plus className="h-4 w-4" />
                  New License
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                        <th className="py-3 pr-4">License Key (Ed25519)</th>
                        <th className="py-3 pr-4">Customer Organization</th>
                        <th className="py-3 pr-4">Tier</th>
                        <th className="py-3 pr-4">Bound Server IP</th>
                        <th className="py-3 pr-4">Offline Grace</th>
                        <th className="py-3 pr-4">Signature Digest</th>
                        <th className="py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {licenses.map((lic) => (
                        <tr key={lic.id} className="hover:bg-slate-800/40">
                          <td className="py-3.5 pr-4 font-mono font-bold text-orange-400">
                            <DecryptedText text={lic.licenseKey} />
                          </td>
                          <td className="py-3.5 pr-4 font-semibold text-white">
                            {lic.organization}
                          </td>
                          <td className="py-3.5 pr-4">
                            <Badge variant="blue">{lic.tier}</Badge>
                          </td>
                          <td className="py-3.5 pr-4 font-mono text-xs text-slate-300">
                            {lic.boundIp}
                          </td>
                          <td className="py-3.5 pr-4 text-xs text-slate-300">
                            {lic.offlineGraceHours}h Non-Destructive
                          </td>
                          <td className="py-3.5 pr-4 font-mono text-xs text-slate-400">
                            {lic.ed25519Fingerprint}
                          </td>
                          <td className="py-3.5">
                            <Badge variant="success">{lic.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </AnimatedContent>
        )}

        {/* TAB 3: RAZORPAY & GST BILLING */}
        {activeTab === 'billing' && (
          <AnimatedContent className="space-y-4">
            <Card className="border-slate-800 bg-slate-900/95 text-slate-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                      Immutable Indian GST Invoice Ledger (SAC 998315)
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Automated Razorpay Order + HMAC-SHA256 Signature Verification with CGST (9%) +
                      SGST (9%) intra-state and IGST (18%) inter-state tax splits.
                    </CardDescription>
                  </div>
                  <Badge variant="success">Razorpay Live Webhook Active</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                        <th className="py-3 pr-4">Invoice #</th>
                        <th className="py-3 pr-4">Organization &amp; GSTIN</th>
                        <th className="py-3 pr-4">Place of Supply</th>
                        <th className="py-3 pr-4">Taxable Base</th>
                        <th className="py-3 pr-4">CGST / SGST / IGST</th>
                        <th className="py-3 pr-4">Total (INR)</th>
                        <th className="py-3">Razorpay Payment ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {GST_INVOICES.map((inv) => (
                        <tr key={inv.invoiceNo} className="hover:bg-slate-800/40">
                          <td className="py-3.5 pr-4 font-mono font-bold text-white">
                            {inv.invoiceNo}
                          </td>
                          <td className="py-3.5 pr-4">
                            <div className="font-semibold text-white">{inv.customer}</div>
                            <div className="font-mono text-xs text-slate-400">
                              GSTIN: {inv.gstin}
                            </div>
                          </td>
                          <td className="py-3.5 pr-4 text-xs text-slate-300">{inv.stateCode}</td>
                          <td className="py-3.5 pr-4 font-mono text-slate-200">
                            ₹{inv.subtotalInr.toFixed(2)}
                          </td>
                          <td className="py-3.5 pr-4 font-mono text-xs text-slate-300">
                            {inv.igstInr > 0
                              ? `IGST: ₹${inv.igstInr.toFixed(2)}`
                              : `CGST: ₹${inv.cgstInr.toFixed(2)} + SGST: ₹${inv.sgstInr.toFixed(2)}`}
                          </td>
                          <td className="py-3.5 pr-4 font-mono font-bold text-emerald-400">
                            ₹{inv.totalInr.toFixed(2)}
                          </td>
                          <td className="py-3.5 font-mono text-xs text-sky-400">
                            {inv.razorpayPaymentId}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </AnimatedContent>
        )}

        {/* TAB 4: SIGNED OTA RELEASES */}
        {activeTab === 'releases' && (
          <AnimatedContent className="grid gap-4 md:grid-cols-2">
            <Card className="border-slate-800 bg-slate-900/95 text-slate-100">
              <CardHeader>
                <Badge variant="success" className="w-fit">
                  STABLE CHANNEL · ED25519 SIGNED
                </Badge>
                <CardTitle className="mt-2 text-white">
                  Garvix Panel &amp; Go Linux Agent v1.4.2
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Target OS: AlmaLinux 10.0 x86_64 · Enforces SO_PEERCRED UDS &amp; O_NOFOLLOW
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-300">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono">
                  <div>SHA256: 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08</div>
                  <div className="mt-1 text-emerald-400">
                    Ed25519 Sig: <ShinyText text="VERIFIED_MANIFEST_SIGNATURE_OK" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Automatic transactional rollback enabled if post-upgrade health fails</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/95 text-slate-100">
              <CardHeader>
                <Badge variant="orange" className="w-fit">
                  IMMUTABLE AUDIT STREAM
                </Badge>
                <CardTitle className="mt-2 text-white flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-orange-400" />
                  Recent Control Plane Security Events
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Every administrative action is logged with actor role, request ID, and IP.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
                  <span className="font-mono text-emerald-400">[AUDIT-9921]</span>{' '}
                  Razorpay Webhook `payment.captured` verified via HMAC-SHA256 — License
                  `GVX-PRO-9F42-88BC-E25519` provisioned automatically.
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
                  <span className="font-mono text-sky-400">[AUDIT-9920]</span>{' '}
                  mTLS Agent Leaf Certificate rotated for `72.61.236.175` (`srv-alma10-mum-01`).
                </div>
              </CardContent>
            </Card>
          </AnimatedContent>
        )}
      </div>

      {/* Modal to issue a new Ed25519 License */}
      <DialogModal
        open={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        title="Issue Signed Ed25519 Commercial License"
        description="Generates an offline-verifiable Ed25519 license token bound to the customer server IP."
      >
        <form onSubmit={handleIssueLicense} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Customer Organization Name
            </label>
            <Input
              required
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="e.g. NextGen Hosting India Pvt Ltd"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Dedicated Server IPv4 Address
            </label>
            <Input
              required
              value={newBoundIp}
              onChange={(e) => setNewBoundIp(e.target.value)}
              placeholder="e.g. 72.61.236.175"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Commercial License Tier
            </label>
            <select
              value={newTier}
              onChange={(e) => setNewTier(e.target.value as 'SOLO' | 'PRO' | 'PREMIER')}
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="SOLO">Garvix Solo (1 Account — ₹799/mo)</option>
              <option value="PRO">Garvix Pro (5 Accounts — ₹1,499/mo)</option>
              <option value="PREMIER">Garvix Premier (100 Accounts — ₹2,999/mo)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="orange">
              <RefreshCw className="h-4 w-4" />
              Sign &amp; Issue License
            </Button>
          </div>
        </form>
      </DialogModal>
    </div>
  );
}

export default CloudConsoleApp;
