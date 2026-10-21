import * as React from 'react';
import {
  CreditCard,
  Edit3,
  KeyRound,
  Layers,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  ExternalLink,
} from 'lucide-react';
import {
  AnimatedContent,
  AuroraBackground,
  BlurText,
  CountUp,
  GradientText,
  SpotlightCard,
  Badge,
  Button,
  Input,
} from '@garvix/ui-components';

export type LicensePanelMode = 'ONLY_CPANEL' | 'WHM_AND_CPANEL';

export interface GarvixLicensePlanConfig {
  code: string;
  name: string;
  badge: string;
  monthlyInr: number;
  panelMode: LicensePanelMode;
  maxAccounts: number; // 0 = Unlimited, 1 = Solo, 5, 30, 100, etc.
  maxAccountsLabel: string;
  bestFor: string;
  popular?: boolean;
  features: string[];
}

export interface IssuedCustomerLicenseRecord {
  id: string;
  customerEmail: string;
  password: string;
  planCode: string;
  planName: string;
  panelMode: LicensePanelMode;
  maxAccounts: number;
  serverIp: string;
  hostname: string;
  licenseKey: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface NebulixMasterAdminProps {
  plans: GarvixLicensePlanConfig[];
  onSavePlans: (nextPlans: GarvixLicensePlanConfig[]) => void;
  onResetDefaultPlans: () => void;
  customerLicenses: IssuedCustomerLicenseRecord[];
  onSaveCustomerLicenses: (nextLicenses: IssuedCustomerLicenseRecord[]) => void;
  onOpenPublicStore: () => void;
  onImpersonateLicense: (license: IssuedCustomerLicenseRecord) => void;
  onShowToast: (msg: string) => void;
}

export const NebulixMasterAdmin: React.FC<NebulixMasterAdminProps> = ({
  plans,
  onSavePlans,
  onResetDefaultPlans,
  customerLicenses,
  onSaveCustomerLicenses,
  onOpenPublicStore,
  onImpersonateLicense,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = React.useState<'plans' | 'customers' | 'gateway'>('plans');

  // Plan Editor / Creator State
  const [editingCode, setEditingCode] = React.useState<string | null>(null);
  const [formCode, setFormCode] = React.useState('');
  const [formName, setFormName] = React.useState('');
  const [formBadge, setFormBadge] = React.useState('');
  const [formMonthlyInr, setFormMonthlyInr] = React.useState<number>(999);
  const [formPanelMode, setFormPanelMode] = React.useState<LicensePanelMode>('WHM_AND_CPANEL');
  const [formMaxAccounts, setFormMaxAccounts] = React.useState<number>(10);
  const [formBestFor, setFormBestFor] = React.useState('');
  const [formPopular, setFormPopular] = React.useState<boolean>(false);

  // Manual License Issue Form
  const [newLicEmail, setNewLicEmail] = React.useState('');
  const [newLicPassword, setNewLicPassword] = React.useState('Garvix#2026');
  const [newLicServerIp, setNewLicServerIp] = React.useState('200.234.39.100');
  const [newLicPlanCode, setNewLicPlanCode] = React.useState(plans[0]?.code || 'WHM_PRO');

  // Payment Gateway Config
  const [razorpayKeyId, setRazorpayKeyId] = React.useState('rzp_live_GarvixCloud2026');
  const [merchantUpiVpa, setMerchantUpiVpa] = React.useState('garvix@icici');
  const [merchantGstin, setMerchantGstin] = React.useState('27AABCG4829K1Z5');

  const computeAccountsLabel = (mode: LicensePanelMode, maxAccounts: number): string => {
    if (mode === 'ONLY_CPANEL' || maxAccounts === 1) {
      return '1 cPanel Account (No WHM)';
    }
    if (maxAccounts === 0) {
      return 'Unlimited cPanel Accounts + WHM';
    }
    return `Up to ${maxAccounts} cPanel Accounts + WHM`;
  };

  const buildFeaturesForPlan = (mode: LicensePanelMode, maxAccounts: number): string[] => {
    if (mode === 'ONLY_CPANEL' || maxAccounts === 1) {
      return [
        '1 Server IPv4 License Activation',
        'Direct cPanel Jupiter Dashboard (Port 2083)',
        'Unlimited Domains, Subdomains & AutoSSL',
        'Web Terminal, Git Deploy, Cron & API Tokens',
      ];
    }
    const countLabel = maxAccounts === 0 ? 'Unlimited' : `Up to ${maxAccounts}`;
    return [
      '1 Server IPv4 License Activation',
      'Full WHM Server Admin Panel (Port 2087)',
      `Create ${countLabel} Isolated cPanel Accounts`,
      '1-Click [cP] Open cPanel Single Sign-On',
      'Root Web Terminal, WHM API & Malware Scanner',
    ];
  };

  const startEditPlan = (plan: GarvixLicensePlanConfig) => {
    setEditingCode(plan.code);
    setFormCode(plan.code);
    setFormName(plan.name);
    setFormBadge(plan.badge);
    setFormMonthlyInr(plan.monthlyInr);
    setFormPanelMode(plan.panelMode);
    setFormMaxAccounts(plan.maxAccounts);
    setFormBestFor(plan.bestFor);
    setFormPopular(Boolean(plan.popular));
  };

  const startNewPlan = () => {
    setEditingCode('__NEW__');
    setFormCode(`WHM_CUSTOM_${plans.length + 1}`);
    setFormName('WHM Business');
    setFormBadge('UP TO 15 ACCOUNTS');
    setFormMonthlyInr(1299);
    setFormPanelMode('WHM_AND_CPANEL');
    setFormMaxAccounts(15);
    setFormBestFor('Growing agencies & multi-site servers');
    setFormPopular(false);
  };

  const handleSavePlanForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    const normalizedMax = formPanelMode === 'ONLY_CPANEL' ? 1 : Math.max(0, Number(formMaxAccounts));
    const updatedPlan: GarvixLicensePlanConfig = {
      code:
        editingCode === '__NEW__'
          ? formCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_') || `PLAN_${Date.now()}`
          : editingCode || formCode,
      name: formName.trim(),
      badge:
        formBadge.trim() ||
        (formPanelMode === 'ONLY_CPANEL'
          ? '1 ACCOUNT · SOLO VPS'
          : normalizedMax === 0
            ? 'UNLIMITED ACCOUNTS'
            : `UP TO ${normalizedMax} ACCOUNTS`),
      monthlyInr: Math.max(1, Number(formMonthlyInr) || 499),
      panelMode: formPanelMode,
      maxAccounts: normalizedMax,
      maxAccountsLabel: computeAccountsLabel(formPanelMode, normalizedMax),
      bestFor: formBestFor.trim() || 'Self-hosted Linux VPS & Dedicated Servers',
      popular: formPopular,
      features: buildFeaturesForPlan(formPanelMode, normalizedMax),
    };

    let nextPlans: GarvixLicensePlanConfig[];
    if (editingCode === '__NEW__') {
      nextPlans = [...plans, updatedPlan];
    } else {
      nextPlans = plans.map((p) => (p.code === editingCode ? updatedPlan : p));
    }

    onSavePlans(nextPlans);
    setEditingCode(null);
    onShowToast(
      `Saved plan "${updatedPlan.name}" (₹${updatedPlan.monthlyInr}/mo · ${updatedPlan.maxAccountsLabel}). Public Home Page updated!`
    );
  };

  const handleQuickUpdatePlan = (
    code: string,
    patch: Partial<Pick<GarvixLicensePlanConfig, 'monthlyInr' | 'maxAccounts' | 'panelMode' | 'popular'>>
  ) => {
    const nextPlans = plans.map((plan) => {
      if (plan.code !== code) return plan;
      const nextMode = patch.panelMode ?? plan.panelMode;
      const rawMax = patch.maxAccounts !== undefined ? patch.maxAccounts : plan.maxAccounts;
      const nextMax = nextMode === 'ONLY_CPANEL' ? 1 : Math.max(0, rawMax);
      return {
        ...plan,
        ...patch,
        panelMode: nextMode,
        maxAccounts: nextMax,
        badge:
          nextMode === 'ONLY_CPANEL'
            ? '1 ACCOUNT · SOLO VPS'
            : nextMax === 0
              ? 'UNLIMITED ACCOUNTS'
              : `UP TO ${nextMax} ACCOUNTS`,
        maxAccountsLabel: computeAccountsLabel(nextMode, nextMax),
        features: buildFeaturesForPlan(nextMode, nextMax),
      };
    });
    onSavePlans(nextPlans);

    // Also sync any customer licenses using this plan code so WHM reflects the new maxAccounts immediately
    const targetPlan = nextPlans.find((p) => p.code === code);
    if (targetPlan) {
      const syncedLicenses = customerLicenses.map((lic) =>
        lic.planCode === code
          ? {
              ...lic,
              planName: targetPlan.name,
              panelMode: targetPlan.panelMode,
              maxAccounts: targetPlan.maxAccounts,
            }
          : lic
      );
      onSaveCustomerLicenses(syncedLicenses);
      onShowToast(
        `Updated ${targetPlan.name}: ₹${targetPlan.monthlyInr}/mo · ${targetPlan.maxAccountsLabel}`
      );
    }
  };

  const handleDeletePlan = (code: string) => {
    if (plans.length <= 1) {
      onShowToast('At least 1 active license plan must remain on the store.');
      return;
    }
    const target = plans.find((p) => p.code === code);
    onSavePlans(plans.filter((p) => p.code !== code));
    onShowToast(`Removed plan "${target?.name || code}" from Public Store.`);
  };

  const handleIssueManualLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLicEmail.trim() || !newLicServerIp.trim()) return;
    const selectedPlan = plans.find((p) => p.code === newLicPlanCode) || plans[0];
    if (!selectedPlan) return;
    const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
    const newRecord: IssuedCustomerLicenseRecord = {
      id: `lic-${Date.now()}`,
      customerEmail: newLicEmail.trim().toLowerCase(),
      password: newLicPassword.trim() || 'Garvix#2026',
      planCode: selectedPlan.code,
      planName: selectedPlan.name,
      panelMode: selectedPlan.panelMode,
      maxAccounts: selectedPlan.maxAccounts,
      serverIp: newLicServerIp.trim(),
      hostname: `srv-${randomHex.toLowerCase()}.garvixcloud.in`,
      licenseKey: `GVX-${selectedPlan.code}-${randomHex}-2026-ED25519`,
      status: 'ACTIVE',
      createdAt: 'Just now',
    };
    onSaveCustomerLicenses([newRecord, ...customerLicenses]);
    setNewLicEmail('');
    onShowToast(
      `Issued ${selectedPlan.name} license (${newRecord.licenseKey}) to ${newRecord.customerEmail}!`
    );
  };

  const monthlyRecurringRevenue = customerLicenses
    .filter((l) => l.status === 'ACTIVE')
    .reduce((sum, lic) => {
      const plan = plans.find((p) => p.code === lic.planCode);
      return sum + (plan?.monthlyInr || 1799);
    }, 0);

  return (
    <AnimatedContent className="space-y-8">
      {/* Master Admin Hero Banner */}
      <AuroraBackground className="p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-3">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-indigo-200/80 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-violet-600" />
              <span>GARVIX MASTER ADMIN PANEL (OWNER / SUPER ADMIN)</span>
              <span className="text-slate-300">•</span>
              <GradientText
                colors={['#7C3AED', '#4F46E5', '#2563EB', '#7C3AED']}
                className="text-xs font-bold"
              >
                License Store, Pricing &amp; Account Limits Controller
              </GradientText>
            </div>

            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              <BlurText
                text="Control All License Plans, Monthly Pricing (₹) & Max cPanel Account Quotas."
                delayMs={25}
              />
            </h1>

            <p className="max-w-2xl text-xs leading-relaxed text-slate-600 sm:text-sm">
              Any change you make here to <strong>Plan Pricing (₹ INR)</strong>,{' '}
              <strong>Panel Mode (cPanel Solo vs WHM + cPanel)</strong>, or{' '}
              <strong>Max cPanel Accounts Limit</strong> immediately updates your{' '}
              <strong>Public Home Page Store</strong> and enforces the exact account limit inside{' '}
              <strong>WHM</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="outline" onClick={onOpenPublicStore}>
              <ExternalLink className="h-4 w-4 text-indigo-600" /> Preview Public Home Page
            </Button>
            <Button variant="nebulix" onClick={startNewPlan}>
              <Plus className="h-4 w-4" /> + Add New License Plan
            </Button>
          </div>
        </div>
      </AuroraBackground>

      {/* Master Admin KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SpotlightCard className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Published Store Plans
            </span>
            <Layers className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="mt-2 font-display text-3xl font-extrabold text-slate-900">
            <CountUp to={plans.length} suffix=" Plans" />
          </div>
          <p className="mt-1 text-xs font-semibold text-indigo-700">
            Live on Public Home Page (`/`)
          </p>
        </SpotlightCard>

        <SpotlightCard className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Customer Licenses
            </span>
            <KeyRound className="h-5 w-5 text-violet-600" />
          </div>
          <div className="mt-2 font-display text-3xl font-extrabold text-slate-900">
            <CountUp
              to={customerLicenses.filter((l) => l.status === 'ACTIVE').length}
              suffix={` / ${customerLicenses.length}`}
            />
          </div>
          <p className="mt-1 text-xs font-semibold text-emerald-700">
            Ed25519 Signed Server IP Bindings
          </p>
        </SpotlightCard>

        <SpotlightCard className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Monthly License MRR
            </span>
            <CreditCard className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-2 font-display text-3xl font-extrabold text-slate-900">
            ₹{monthlyRecurringRevenue.toLocaleString('en-IN')}
          </div>
          <p className="mt-1 text-xs font-semibold text-emerald-700">
            Razorpay + NPCI UPI AutoPay
          </p>
        </SpotlightCard>

        <SpotlightCard className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Primary Production VPS
            </span>
            <Server className="h-5 w-5 text-blue-600" />
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-slate-900">
            200.234.39.100
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            AlmaLinux 10 · srv2075790.hstgr.cloud
          </p>
        </SpotlightCard>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('plans')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'plans'
                ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-indigo-50'
            }`}
          >
            <Layers className="h-4 w-4" /> 1. License Plans, Pricing &amp; Account Limits ({plans.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'customers'
                ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-indigo-50'
            }`}
          >
            <Users className="h-4 w-4" /> 2. Issued Customer Licenses &amp; Server IPs ({customerLicenses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gateway')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'gateway'
                ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-indigo-50'
            }`}
          >
            <CreditCard className="h-4 w-4" /> 3. Razorpay, UPI &amp; GST Settings
          </button>
        </div>

        {activeTab === 'plans' && (
          <Button variant="outline" size="sm" onClick={onResetDefaultPlans}>
            <RefreshCw className="h-3.5 w-3.5" /> Reset Default Plans
          </Button>
        )}
      </div>

      {/* ========================================================================
          TAB 1: LICENSE PLANS, PRICING & ACCOUNT LIMITS CONTROLLER
          ======================================================================== */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {/* Modal / Drawer Form when adding or editing a plan in detail */}
          {editingCode && (
            <SpotlightCard className="border-2 border-indigo-500 p-6">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <div>
                  <Badge variant="orange">
                    {editingCode === '__NEW__' ? 'CREATE NEW LICENSE PLAN' : `EDIT PLAN: ${editingCode}`}
                  </Badge>
                  <h2 className="mt-1 font-display text-lg font-extrabold text-slate-900">
                    Configure Plan Name, Monthly Price (₹), Panel Mode &amp; cPanel Account Limit
                  </h2>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditingCode(null)}>
                  Cancel
                </Button>
              </div>

              <form onSubmit={handleSavePlanForm} className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Plan Name (Displayed on Home Page)
                    </label>
                    <Input
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. WHM Pro"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Monthly Price (₹ INR / Month)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      required
                      value={formMonthlyInr}
                      onChange={(e) => setFormMonthlyInr(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Panel Access Mode After Login
                    </label>
                    <select
                      aria-label="Panel Access Mode After Login"
                      value={formPanelMode}
                      onChange={(e) => {
                        const mode = e.target.value as LicensePanelMode;
                        setFormPanelMode(mode);
                        if (mode === 'ONLY_CPANEL') {
                          setFormMaxAccounts(1);
                        } else if (formMaxAccounts === 1) {
                          setFormMaxAccounts(10);
                        }
                      }}
                      className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-xs font-bold text-slate-800"
                    >
                      <option value="ONLY_CPANEL">
                        ONLY cPanel (Direct Port 2083 · 1 Account Solo)
                      </option>
                      <option value="WHM_AND_CPANEL">
                        WHM + cPanel (Port 2087 WHM + Multiple cPanel Accounts)
                      </option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Max cPanel Accounts Allowed (0 = Unlimited)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      disabled={formPanelMode === 'ONLY_CPANEL'}
                      value={formPanelMode === 'ONLY_CPANEL' ? 1 : formMaxAccounts}
                      onChange={(e) => setFormMaxAccounts(Number(e.target.value))}
                    />
                    <span className="mt-1 block text-[11px] text-slate-500">
                      Enter <strong>0</strong> for Unlimited cPanel accounts, or any exact limit (e.g. 5, 10, 30, 50).
                    </span>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Top Badge Text
                    </label>
                    <Input
                      value={formBadge}
                      onChange={(e) => setFormBadge(e.target.value)}
                      placeholder="UP TO 30 ACCOUNTS"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Target Audience Subtitle
                    </label>
                    <Input
                      value={formBestFor}
                      onChange={(e) => setFormBestFor(e.target.value)}
                      placeholder="Agencies, Resellers & Hosting Providers"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formPopular}
                      onChange={(e) => setFormPopular(e.target.checked)}
                      className="h-4 w-4 rounded border-indigo-300 text-indigo-600"
                    />
                    Highlight as &ldquo;MOST POPULAR&rdquo; on Home Page
                  </label>

                  <Button type="submit" variant="nebulix">
                    <CheckCircle2 className="h-4 w-4" /> Save License Plan to Store
                  </Button>
                </div>
              </form>
            </SpotlightCard>
          )}

          {/* Quick Inline Plan Cards Grid */}
          <div className="grid gap-5 md:grid-cols-2">
            {plans.map((plan) => (
              <SpotlightCard
                key={plan.code}
                className={`p-6 space-y-4 ${
                  plan.popular ? 'border-2 border-indigo-600' : 'border border-indigo-100'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={plan.panelMode === 'WHM_AND_CPANEL' ? 'default' : 'secondary'}>
                        {plan.badge}
                      </Badge>
                      {plan.popular && <Badge variant="orange">MOST POPULAR</Badge>}
                    </div>
                    <h3 className="mt-2 font-display text-xl font-extrabold text-slate-900">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-slate-500">{plan.bestFor}</p>
                  </div>

                  <div className="text-right">
                    <div className="font-display text-2xl font-extrabold text-indigo-700">
                      ₹{plan.monthlyInr.toLocaleString('en-IN')}
                      <span className="text-xs font-semibold text-slate-500">/mo</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-500">
                      Code: <span className="font-mono">{plan.code}</span>
                    </div>
                  </div>
                </div>

                {/* Instant Inline Controls for Price, Panel Mode & Max Accounts */}
                <div className="grid gap-3 rounded-2xl border border-indigo-100 bg-[#FAF9FE] p-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600">
                      Monthly Price (₹)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={plan.monthlyInr}
                      onChange={(e) =>
                        handleQuickUpdatePlan(plan.code, {
                          monthlyInr: Math.max(1, Number(e.target.value) || 0),
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600">
                      Login Panel Mode
                    </label>
                    <select
                      aria-label={`Login Panel Mode for ${plan.name}`}
                      value={plan.panelMode}
                      onChange={(e) =>
                        handleQuickUpdatePlan(plan.code, {
                          panelMode: e.target.value as LicensePanelMode,
                        })
                      }
                      className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-2.5 text-xs font-bold text-slate-800"
                    >
                      <option value="ONLY_CPANEL">cPanel Only (2083)</option>
                      <option value="WHM_AND_CPANEL">WHM + cPanel (2087)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600">
                      Max cPanel Accounts
                    </label>
                    <Input
                      type="number"
                      min={0}
                      disabled={plan.panelMode === 'ONLY_CPANEL'}
                      value={plan.panelMode === 'ONLY_CPANEL' ? 1 : plan.maxAccounts}
                      onChange={(e) =>
                        handleQuickUpdatePlan(plan.code, {
                          maxAccounts: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                    />
                    <span className="mt-0.5 block text-[10px] font-semibold text-indigo-700">
                      {plan.maxAccounts === 0
                        ? '0 = Unlimited Accounts'
                        : `Limit: ${plan.maxAccounts} Account(s)`}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="text-xs font-semibold text-slate-600">
                    Customer Login Opens:{' '}
                    <span className="font-bold text-indigo-700">
                      {plan.panelMode === 'ONLY_CPANEL'
                        ? 'cPanel Dashboard Directly (Port 2083)'
                        : `WHM Admin Panel (Port 2087 · ${plan.maxAccounts === 0 ? 'Unlimited' : plan.maxAccounts} cPanel Accounts)`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEditPlan(plan)}
                    >
                      <Edit3 className="h-3.5 w-3.5 text-indigo-600" /> Full Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeletePlan(plan.code)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" /> Delete
                    </Button>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================
          TAB 2: ISSUED CUSTOMER LICENSES & SERVER IP MANAGER
          ======================================================================== */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          {/* Issue New Customer License Manually */}
          <SpotlightCard className="p-6">
            <h2 className="font-display text-base font-extrabold text-slate-900">
              Issue a New Customer Server License Key
            </h2>
            <p className="text-xs text-slate-500">
              Create a customer account &amp; bind an Ed25519 license key to their server IPv4.
            </p>
            <form
              onSubmit={handleIssueManualLicense}
              className="mt-4 grid gap-3 sm:grid-cols-5"
            >
              <Input
                required
                type="email"
                placeholder="customer@agency.in"
                value={newLicEmail}
                onChange={(e) => setNewLicEmail(e.target.value)}
              />
              <Input
                required
                placeholder="Login Password"
                value={newLicPassword}
                onChange={(e) => setNewLicPassword(e.target.value)}
              />
              <Input
                required
                placeholder="Server IP (200.234.39.100)"
                value={newLicServerIp}
                onChange={(e) => setNewLicServerIp(e.target.value)}
              />
              <select
                aria-label="Select License Plan"
                value={newLicPlanCode}
                onChange={(e) => setNewLicPlanCode(e.target.value)}
                className="h-10 rounded-xl border border-indigo-100 bg-white px-3 text-xs font-bold text-slate-800"
              >
                {plans.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} (₹{p.monthlyInr}/mo · {p.maxAccounts === 0 ? 'Unlimited' : p.maxAccounts} cP)
                  </option>
                ))}
              </select>
              <Button type="submit" variant="nebulix">
                <Plus className="h-4 w-4" /> Issue License
              </Button>
            </form>
          </SpotlightCard>

          {/* Customer Licenses List */}
          <div className="space-y-3">
            {customerLicenses.map((lic) => (
              <SpotlightCard key={lic.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-sm font-extrabold text-slate-900">
                        {lic.customerEmail}
                      </span>
                      <Badge variant={lic.status === 'ACTIVE' ? 'success' : 'destructive'}>
                        {lic.status}
                      </Badge>
                      <Badge variant="default">{lic.planName}</Badge>
                      <Badge variant="secondary">
                        {lic.panelMode === 'ONLY_CPANEL'
                          ? 'Opens: cPanel Only (Port 2083)'
                          : `Opens: WHM + cPanel (${lic.maxAccounts === 0 ? 'Unlimited' : lic.maxAccounts} Accounts)`}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-600">
                      License Key:{' '}
                      <code className="font-mono font-bold text-indigo-700">{lic.licenseKey}</code> ·
                      Bound Server IP:{' '}
                      <code className="font-mono font-bold text-slate-900">{lic.serverIp}</code> ·
                      Issued: {lic.createdAt}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500">Max Accounts:</span>
                      <Input
                        type="number"
                        min={0}
                        disabled={lic.panelMode === 'ONLY_CPANEL'}
                        value={lic.panelMode === 'ONLY_CPANEL' ? 1 : lic.maxAccounts}
                        onChange={(e) => {
                          const nextMax = Math.max(0, Number(e.target.value) || 0);
                          const updated = customerLicenses.map((item) =>
                            item.id === lic.id ? { ...item, maxAccounts: nextMax } : item
                          );
                          onSaveCustomerLicenses(updated);
                          onShowToast(
                            `Updated max cPanel accounts for ${lic.customerEmail} to ${nextMax === 0 ? 'Unlimited' : nextMax}.`
                          );
                        }}
                        className="h-8 w-20 text-xs"
                      />
                    </div>

                    <Button
                      size="sm"
                      variant="nebulix"
                      onClick={() => onImpersonateLicense(lic)}
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Login as Customer (
                      {lic.panelMode === 'ONLY_CPANEL' ? 'cPanel' : 'WHM'})
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const nextStatus = lic.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
                        onSaveCustomerLicenses(
                          customerLicenses.map((item) =>
                            item.id === lic.id ? { ...item, status: nextStatus } : item
                          )
                        );
                        onShowToast(`License ${lic.licenseKey} is now ${nextStatus}.`);
                      }}
                    >
                      {lic.status === 'ACTIVE' ? (
                        <>
                          <PauseCircle className="h-3.5 w-3.5 text-amber-600" /> Suspend
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-3.5 w-3.5 text-emerald-600" /> Activate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================
          TAB 3: RAZORPAY, NPCI UPI & GST SETTINGS
          ======================================================================== */}
      {activeTab === 'gateway' && (
        <SpotlightCard className="mx-auto max-w-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-extrabold text-slate-900">
            Payment Gateway, UPI QR &amp; GST Invoicing Configuration
          </h2>
          <p className="text-xs text-slate-500">
            Used on the Public Home Page Checkout when customers purchase a Garvix cPanel / WHM
            Software License.
          </p>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Razorpay Key ID (Orders &amp; Subscriptions Webhook)
              </label>
              <Input
                value={razorpayKeyId}
                onChange={(e) => setRazorpayKeyId(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Merchant NPCI UPI ID (VPA for Dynamic QR Code)
              </label>
              <Input
                value={merchantUpiVpa}
                onChange={(e) => setMerchantUpiVpa(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Garvix Software Solutions GSTIN (SAC 998315 · 18% GST)
              </label>
              <Input
                value={merchantGstin}
                onChange={(e) => setMerchantGstin(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="nebulix"
              onClick={() =>
                onShowToast('Saved Razorpay, NPCI UPI VPA, and GSTIN settings for Public Store Checkout!')
              }
            >
              <CheckCircle2 className="h-4 w-4" /> Save Gateway Configuration
            </Button>
          </div>
        </SpotlightCard>
      )}
    </AnimatedContent>
  );
};
