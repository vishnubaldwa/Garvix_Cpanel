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
  AlertCircle,
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
      <div className="min-h-screen bg-gradient-to-br from-[#F7F6FD] via-[#F4F2FC] to-[#EEF2FF] p-6 flex items-center justify-center">
        <AuroraBackground className="w-full max-w-4xl p-8 md:p-12">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div className="space-y-5">
              <Badge variant="orange" className="uppercase tracking-wider">
                Plane A · Cloud Control Plane
              </Badge>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">
                <BlurText text="Garvix Cloud Control Console" />
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Zero-trust multi-tenant fleet orchestration, Ed25519 commercial licensing,
                SAC 998315 GST billing ledger, and signed OTA release management.
              </p>
              <div className="space-y-2.5 rounded-2xl border border-indigo-100 bg-white/90 p-4 text-xs text-slate-700 shadow-xs">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Step-Up TOTP / WebAuthn Passkey Enforced</span>
                </div>
                <div className="flex items-center gap-2 font-semibold">
                  <KeyRound className="h-4 w-4 text-violet-600" />
                  <span>Offline-Capable Ed25519 License Signing Keyring</span>
                </div>
                <div className="flex items-center gap-2 font-semibold">
                  <ReceiptIndianRupee className="h-4 w-4 text-blue-600" />
                  <span>Razorpay Webhook + Indian GST (CGST/SGST/IGST)</span>
                </div>
              </div>
            </div>

            <StarBorder color="#6366F1">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsAuthenticated(true);
                }}
                className="space-y-4 rounded-[15px] bg-white p-6"
              >
                <div>
                  <h2 className="font-display text-lg font-extrabold text-slate-900">
                    Operator Sign In
                  </h2>
                  <p className="text-xs text-slate-500">
                    Authenticate with Argon2id + Hardware Passkey / TOTP
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Operator Email</label>
                  <Input
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="superadmin@garvix.in"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Role Context</label>
                  <select
                    value={activeRole}
                    onChange={(e) => setActiveRole(e.target.value as CloudConsoleRole)}
                    className="flex h-10 w-full rounded-xl border border-indigo-100 bg-[#FAF9FE] px-3 py-2 text-sm text-slate-900"
                  >
                    {CLOUD_CONSOLE_APP_METADATA.supportedRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Step-Up MFA (6-Digit TOTP)
                  </label>
                  <Input
                    value={loginTotp}
                    onChange={(e) => setLoginTotp(e.target.value)}
                    placeholder="482910"
                  />
                </div>
                <Button type="submit" variant="nebulix" className="w-full">
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
    <div className="min-h-screen bg-gradient-to-br from-[#F7F6FD] via-[#F4F2FC] to-[#EEF2FF] text-slate-900">
      <GarvixShellHeader
        brandTitle={CLOUD_CONSOLE_APP_METADATA.appName}
        brandSubtitle="Nebulix Cloud Suite · Ed25519 Licensing · mTLS Fleet · Razorpay GST Ledger"
        environmentBadge={CLOUD_CONSOLE_APP_METADATA.version}
        statusText="Cloud Control Plane Healthy · 99.98% SLA"
        rightActions={
          <div className="flex items-center gap-2.5">
            <select
              aria-label="Active Cloud Role"
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as CloudConsoleRole)}
              className="h-9 rounded-xl border border-indigo-100 bg-[#F7F6FD] px-3 text-xs font-semibold text-slate-700"
            >
              {CLOUD_CONSOLE_APP_METADATA.supportedRoles.map((role) => (
                <option key={role} value={role}>
                  Role: {role}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={() => setIsAuthenticated(false)}>
              <LogOut className="h-3.5 w-3.5" />
              Lock Session
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Hero Banner with React Bits AuroraBackground + BlurText + GradientText */}
        <AuroraBackground className="p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/90 px-3.5 py-1 text-xs font-bold text-indigo-700 shadow-2xs">
                <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                <span>Garvix Software Solutions Pvt Ltd · Plane A Control Center</span>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
                <BlurText text="Global Hosting Fleet & Commercial Licensing" />
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl">
                Cryptographically signed{' '}
                <GradientText colors={['#7C3AED', '#4F46E5', '#2563EB', '#7C3AED']}>
                  Ed25519 offline-capable licenses
                </GradientText>
                , mTLS hardware enrollment for AlmaLinux 10 servers, and automated Razorpay SAC
                998315 GST invoicing.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-800">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                <span>Preview / Mock Fleet Data</span>
              </span>
              <Button variant="nebulix" onClick={() => setIssueModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Issue Signed License Key
              </Button>
            </div>
          </div>
        </AuroraBackground>

        {/* Top KPI Metrics using React Bits SpotlightCard & CountUp */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SpotlightCard>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Enrolled AlmaLinux Nodes
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                <Server className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 font-display text-3xl font-extrabold text-slate-900">
              <CountUp to={servers.length} />
            </div>
            <p className="mt-1 text-xs font-semibold text-emerald-700">
              100% mTLS heartbeats verified (&lt; 30s)
            </p>
          </SpotlightCard>

          <SpotlightCard>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Ed25519 Licenses
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white">
                <KeyRound className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 font-display text-3xl font-extrabold text-slate-900">
              <CountUp to={licenses.length} />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              72-hour non-disruptive offline grace window
            </p>
          </SpotlightCard>

          <SpotlightCard>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Monthly GST Revenue (INR)
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <ReceiptIndianRupee className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 font-display text-3xl font-extrabold text-slate-900">
              <CountUp to={5297} prefix="₹" />
            </div>
            <p className="mt-1 text-xs font-semibold text-emerald-700">
              SAC 998315 · Razorpay Webhooks Verified
            </p>
          </SpotlightCard>

          <SpotlightCard>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Hosted Tenant Accounts
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 font-display text-3xl font-extrabold text-slate-900">
              <CountUp to={34} />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Isolated Linux UIDs + systemd cgroup v2
            </p>
          </SpotlightCard>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-indigo-100 pb-3">
          {(
            [
              { id: 'fleet', label: 'mTLS Server Fleet & Telemetry', icon: Server },
              { id: 'licensing', label: 'Ed25519 Commercial Licenses', icon: KeyRound },
              {
                id: 'billing',
                label: 'Razorpay & GST Invoices (SAC 998315)',
                icon: ReceiptIndianRupee,
              },
              { id: 'releases', label: 'Signed OTA Releases & Audit Log', icon: PackageCheck },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant={active ? 'nebulix' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
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
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="orange">{srv.licenseTier} TIER</Badge>
                      <Badge variant="success">{srv.mtlsStatus}</Badge>
                    </div>
                    <CardTitle className="mt-2 text-base font-extrabold text-slate-900">
                      {srv.hostname}
                    </CardTitle>
                    <CardDescription className="font-mono text-slate-500">
                      IPv4: {srv.ipAddress} · {srv.osProfile}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Cpu className="h-3.5 w-3.5 text-violet-600" /> 4 vCPU Load (Sample)
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {srv.cpuUsagePct}%
                        </span>
                      </div>
                      <Progress value={srv.cpuUsagePct} />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          RAM ({srv.ramTotalGb} GB ECC)
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {srv.ramUsedGb} / {srv.ramTotalGb} GB
                        </span>
                      </div>
                      <Progress value={(srv.ramUsedGb / srv.ramTotalGb) * 100} />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <HardDrive className="h-3.5 w-3.5 text-blue-600" /> NVMe Storage
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {srv.nvmeUsedGb} / {srv.nvmeTotalGb} GB
                        </span>
                      </div>
                      <Progress value={(srv.nvmeUsedGb / srv.nvmeTotalGb) * 100} />
                    </div>

                    <Separator />
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Agent: {srv.agentVersion}</span>
                      <span className="font-bold text-indigo-700">
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Issued Ed25519 Commercial Licenses</CardTitle>
                  <CardDescription>
                    Hover over any license key to trigger cryptographic DecryptedText verification.
                    Offline grace is strictly 72 hours without disrupting customer workloads.
                  </CardDescription>
                </div>
                <Button variant="nebulix" size="sm" onClick={() => setIssueModalOpen(true)}>
                  <Plus className="h-4 w-4" />
                  New License
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-indigo-100 text-xs uppercase text-slate-500">
                        <th className="py-3 pr-4">License Key (Ed25519)</th>
                        <th className="py-3 pr-4">Customer Organization</th>
                        <th className="py-3 pr-4">Tier</th>
                        <th className="py-3 pr-4">Bound Server IP</th>
                        <th className="py-3 pr-4">Offline Grace</th>
                        <th className="py-3 pr-4">Signature Digest</th>
                        <th className="py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-50">
                      {licenses.map((lic) => (
                        <tr key={lic.id} className="hover:bg-indigo-50/40">
                          <td className="py-3.5 pr-4 font-mono font-bold text-indigo-700">
                            <DecryptedText text={lic.licenseKey} />
                          </td>
                          <td className="py-3.5 pr-4 font-semibold text-slate-900">
                            {lic.organization}
                          </td>
                          <td className="py-3.5 pr-4">
                            <Badge variant="blue">{lic.tier}</Badge>
                          </td>
                          <td className="py-3.5 pr-4 font-mono text-xs text-slate-700">
                            {lic.boundIp}
                          </td>
                          <td className="py-3.5 pr-4 text-xs text-slate-600">
                            {lic.offlineGraceHours}h Non-Destructive
                          </td>
                          <td className="py-3.5 pr-4 font-mono text-xs text-slate-500">
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
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                      Immutable Indian GST Invoice Ledger (SAC 998315)
                    </CardTitle>
                    <CardDescription>
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
                      <tr className="border-b border-indigo-100 text-xs uppercase text-slate-500">
                        <th className="py-3 pr-4">Invoice #</th>
                        <th className="py-3 pr-4">Organization &amp; GSTIN</th>
                        <th className="py-3 pr-4">Place of Supply</th>
                        <th className="py-3 pr-4">Taxable Base</th>
                        <th className="py-3 pr-4">CGST / SGST / IGST</th>
                        <th className="py-3 pr-4">Total (INR)</th>
                        <th className="py-3">Razorpay Payment ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-50">
                      {GST_INVOICES.map((inv) => (
                        <tr key={inv.invoiceNo} className="hover:bg-indigo-50/40">
                          <td className="py-3.5 pr-4 font-mono font-bold text-indigo-700">
                            {inv.invoiceNo}
                          </td>
                          <td className="py-3.5 pr-4">
                            <div className="font-semibold text-slate-900">{inv.customer}</div>
                            <div className="font-mono text-xs text-slate-500">
                              GSTIN: {inv.gstin}
                            </div>
                          </td>
                          <td className="py-3.5 pr-4 text-xs text-slate-600">{inv.stateCode}</td>
                          <td className="py-3.5 pr-4 font-mono text-slate-800">
                            ₹{inv.subtotalInr.toFixed(2)}
                          </td>
                          <td className="py-3.5 pr-4 font-mono text-xs text-slate-600">
                            {inv.igstInr > 0
                              ? `IGST: ₹${inv.igstInr.toFixed(2)}`
                              : `CGST: ₹${inv.cgstInr.toFixed(2)} + SGST: ₹${inv.sgstInr.toFixed(2)}`}
                          </td>
                          <td className="py-3.5 pr-4 font-mono font-bold text-emerald-700">
                            ₹{inv.totalInr.toFixed(2)}
                          </td>
                          <td className="py-3.5 font-mono text-xs text-indigo-600">
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
            <Card>
              <CardHeader>
                <Badge variant="success" className="w-fit">
                  STABLE CHANNEL · ED25519 SIGNED
                </Badge>
                <CardTitle className="mt-2">
                  Garvix Panel &amp; Go Linux Agent v1.4.2
                </CardTitle>
                <CardDescription>
                  Target OS: AlmaLinux 10.0 x86_64 · Enforces SO_PEERCRED UDS &amp; O_NOFOLLOW
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-700">
                <div className="rounded-xl border border-indigo-100 bg-[#FAF9FE] p-3 font-mono">
                  <div>SHA256: 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08</div>
                  <div className="mt-1 text-emerald-700 font-bold">
                    Ed25519 Sig: <ShinyText text="VERIFIED_MANIFEST_SIGNATURE_OK" />
                  </div>
                </div>
                <div className="flex items-center gap-2 font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Automatic transactional rollback enabled if post-upgrade health fails</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Badge variant="orange" className="w-fit">
                  IMMUTABLE AUDIT STREAM
                </Badge>
                <CardTitle className="mt-2 flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-indigo-600" />
                  Recent Control Plane Security Events
                </CardTitle>
                <CardDescription>
                  Every administrative action is logged with actor role, request ID, and IP.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                <div className="rounded-xl border border-indigo-100 bg-[#FAF9FE] p-3">
                  <span className="font-mono font-bold text-emerald-700">[AUDIT-9921]</span>{' '}
                  Razorpay Webhook `payment.captured` verified via HMAC-SHA256 — License
                  `GVX-PRO-9F42-88BC-E25519` provisioned automatically.
                </div>
                <div className="rounded-xl border border-indigo-100 bg-[#FAF9FE] p-3">
                  <span className="font-mono font-bold text-indigo-700">[AUDIT-9920]</span>{' '}
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
            <label className="text-xs font-semibold text-slate-700">
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
            <label className="text-xs font-semibold text-slate-700">
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
            <label className="text-xs font-semibold text-slate-700">
              Commercial License Tier
            </label>
            <select
              value={newTier}
              onChange={(e) => setNewTier(e.target.value as 'SOLO' | 'PRO' | 'PREMIER')}
              className="flex h-10 w-full rounded-xl border border-indigo-100 bg-[#FAF9FE] px-3 py-2 text-sm text-slate-900"
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
            <Button type="submit" variant="nebulix">
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
