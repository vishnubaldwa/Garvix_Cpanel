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
  Trash2,
  Users,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  Globe,
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
export type LicenseBillingCycle = 'MONTHLY' | 'YEARLY';

export interface GarvixLicensePlanConfig {
  code: string;
  name: string;
  badge: string;
  monthlyInr: number;
  yearlyInr: number;
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
  billingCycle?: LicenseBillingCycle;
  panelMode: LicensePanelMode;
  maxAccounts: number;
  serverIp: string;
  hostname: string;
  licenseKey: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  expiresAt?: string;
}

export interface RazorpayGatewayConfig {
  enabled: boolean;
  mode: 'TEST' | 'LIVE';
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  hasSecretConfigured?: boolean;
  merchantUpiVpa: string;
  companyName: string;
  companyGstin: string;
  supportEmail?: string;
  supportPhone?: string;
  companyAddress?: string;
  footerTagline?: string;
}

export interface MasterAdminCredentials {
  email: string;
  password: string;
}

export interface NebulixMasterAdminProps {
  plans: GarvixLicensePlanConfig[];
  onSavePlans: (nextPlans: GarvixLicensePlanConfig[]) => void;
  onResetDefaultPlans: () => void;
  customerLicenses: IssuedCustomerLicenseRecord[];
  onSaveCustomerLicenses: (nextLicenses: IssuedCustomerLicenseRecord[]) => void;
  razorpayConfig: RazorpayGatewayConfig;
  onSaveRazorpayConfig: (nextConfig: RazorpayGatewayConfig) => void;
  adminCredentials: MasterAdminCredentials;
  onSaveAdminCredentials: (nextCreds: MasterAdminCredentials) => void;
  onOpenPublicStore: () => void;
  onShowToast: (msg: string) => void;
  authToken?: string;
}

export const NebulixMasterAdmin: React.FC<NebulixMasterAdminProps> = ({
  plans,
  onSavePlans,
  onResetDefaultPlans,
  customerLicenses,
  onSaveCustomerLicenses,
  razorpayConfig,
  onSaveRazorpayConfig,
  adminCredentials,
  onSaveAdminCredentials,
  onOpenPublicStore,
  onShowToast,
  authToken,
}) => {
  const [activeTab, setActiveTab] = React.useState<
    'plans' | 'customers' | 'gateway' | 'security' | 'ssl'
  >('plans');

  // Plan Editor / Creator State
  const [editingCode, setEditingCode] = React.useState<string | null>(null);
  const [formCode, setFormCode] = React.useState('');
  const [formName, setFormName] = React.useState('');
  const [formBadge, setFormBadge] = React.useState('');
  const [formMonthlyInr, setFormMonthlyInr] = React.useState<number>(999);
  const [formYearlyInr, setFormYearlyInr] = React.useState<number>(9990);
  const [formPanelMode, setFormPanelMode] = React.useState<LicensePanelMode>('WHM_AND_CPANEL');
  const [formMaxAccounts, setFormMaxAccounts] = React.useState<number>(10);
  const [formBestFor, setFormBestFor] = React.useState('');
  const [formPopular, setFormPopular] = React.useState<boolean>(false);

  // Manual License Issue Form
  const [newLicEmail, setNewLicEmail] = React.useState('');
  const [newLicPassword, setNewLicPassword] = React.useState('');
  const [newLicServerIp, setNewLicServerIp] = React.useState('200.234.39.100');
  const [newLicPlanCode, setNewLicPlanCode] = React.useState(plans[0]?.code || 'WHM_PRO');
  const [newLicBillingCycle, setNewLicBillingCycle] =
    React.useState<LicenseBillingCycle>('MONTHLY');

  // Razorpay, Payment Gateway & Footer Contact Form State
  const [rzpEnabled, setRzpEnabled] = React.useState<boolean>(razorpayConfig.enabled);
  const [rzpMode, setRzpMode] = React.useState<'TEST' | 'LIVE'>(razorpayConfig.mode);
  const [rzpKeyId, setRzpKeyId] = React.useState<string>(razorpayConfig.keyId);
  const [rzpKeySecret, setRzpKeySecret] = React.useState<string>(razorpayConfig.keySecret);
  const [rzpWebhookSecret, setRzpWebhookSecret] = React.useState<string>(
    razorpayConfig.webhookSecret
  );
  const [merchantUpiVpa, setMerchantUpiVpa] = React.useState<string>(
    razorpayConfig.merchantUpiVpa
  );
  const [companyName, setCompanyName] = React.useState<string>(razorpayConfig.companyName);
  const [companyGstin, setCompanyGstin] = React.useState<string>(razorpayConfig.companyGstin);
  const [supportEmail, setSupportEmail] = React.useState<string>(
    razorpayConfig.supportEmail || 'support@garvixcloud.in'
  );
  const [supportPhone, setSupportPhone] = React.useState<string>(
    razorpayConfig.supportPhone || '+91 98765 43210'
  );
  const [companyAddress, setCompanyAddress] = React.useState<string>(
    razorpayConfig.companyAddress || 'India'
  );
  const [footerTagline, setFooterTagline] = React.useState<string>(
    razorpayConfig.footerTagline || 'Made with ❤️ in India 🇮🇳'
  );
  const [showKeySecret, setShowKeySecret] = React.useState<boolean>(false);
  const [showWebhookSecret, setShowWebhookSecret] = React.useState<boolean>(false);

  // Master Admin Password Form State
  const [adminEmailInput, setAdminEmailInput] = React.useState<string>(adminCredentials.email);
  const [adminPasswordInput, setAdminPasswordInput] = React.useState<string>(
    adminCredentials.password
  );
  const [showAdminPass, setShowAdminPass] = React.useState<boolean>(false);

  // Panel Hostname SSL Certificate Installer State
  const [sslPanelDomain, setSslPanelDomain] = React.useState<string>('panel.garvixcloud.in');
  const [sslAdminEmail, setSslAdminEmail] = React.useState<string>(
    razorpayConfig.supportEmail || 'admin@garvixcloud.in'
  );
  const [sslMethod, setSslMethod] = React.useState<'LETS_ENCRYPT' | 'CUSTOM_PEM'>('LETS_ENCRYPT');
  const [sslCustomCertPem, setSslCustomCertPem] = React.useState<string>('');
  const [sslCustomKeyPem, setSslCustomKeyPem] = React.useState<string>('');
  const [sslCustomCaBundle, setSslCustomCaBundle] = React.useState<string>('');
  const [sslInstalling, setSslInstalling] = React.useState<boolean>(false);
  const [sslInstalledInfo, setSslInstalledInfo] = React.useState<{
    domain: string;
    issuer: string;
    method: string;
    expiresAt: string;
    installedAt: string;
  } | null>(null);

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
    setFormYearlyInr(plan.yearlyInr || plan.monthlyInr * 10);
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
    setFormYearlyInr(12990);
    setFormPanelMode('WHM_AND_CPANEL');
    setFormMaxAccounts(15);
    setFormBestFor('Growing agencies & multi-site servers');
    setFormPopular(false);
  };

  const handleSavePlanForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    const normalizedMax =
      formPanelMode === 'ONLY_CPANEL' ? 1 : Math.max(0, Number(formMaxAccounts));
    const cleanMonthly = Math.max(1, Number(formMonthlyInr) || 499);
    const cleanYearly = Math.max(1, Number(formYearlyInr) || cleanMonthly * 10);
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
      monthlyInr: cleanMonthly,
      yearlyInr: cleanYearly,
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
      `Saved plan "${updatedPlan.name}" (₹${updatedPlan.monthlyInr}/mo · ₹${updatedPlan.yearlyInr}/yr · ${updatedPlan.maxAccountsLabel}).`
    );
  };

  const handleQuickUpdatePlan = (
    code: string,
    patch: Partial<
      Pick<
        GarvixLicensePlanConfig,
        'monthlyInr' | 'yearlyInr' | 'maxAccounts' | 'panelMode' | 'popular'
      >
    >
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
        `Updated ${targetPlan.name}: ₹${targetPlan.monthlyInr}/mo · ₹${targetPlan.yearlyInr}/yr · ${targetPlan.maxAccountsLabel}`
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
    if (!newLicEmail.trim() || !newLicPassword.trim() || !newLicServerIp.trim()) return;
    const selectedPlan = plans.find((p) => p.code === newLicPlanCode) || plans[0];
    if (!selectedPlan) return;
    const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
    const expiryDate = new Date(
      Date.now() + (newLicBillingCycle === 'YEARLY' ? 365 : 30) * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .slice(0, 10);
    const newRecord: IssuedCustomerLicenseRecord = {
      id: `lic-${Date.now()}`,
      customerEmail: newLicEmail.trim().toLowerCase(),
      password: newLicPassword.trim(),
      planCode: selectedPlan.code,
      planName: selectedPlan.name,
      billingCycle: newLicBillingCycle,
      panelMode: selectedPlan.panelMode,
      maxAccounts: selectedPlan.maxAccounts,
      serverIp: newLicServerIp.trim(),
      hostname: `srv-${randomHex.toLowerCase()}.garvixcloud.in`,
      licenseKey: `GVX-${selectedPlan.code}-${randomHex}-2026-ED25519`,
      status: 'ACTIVE',
      createdAt: new Date().toISOString().slice(0, 10),
      expiresAt: expiryDate,
    };
    onSaveCustomerLicenses([newRecord, ...customerLicenses]);
    setNewLicEmail('');
    setNewLicPassword('');
    onShowToast(
      `Created ${newLicBillingCycle} customer license (${newRecord.licenseKey}) for ${newRecord.customerEmail}!`
    );
  };

  const handleSaveRazorpaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rzpEnabled && (!rzpKeyId.trim() || !rzpKeyId.trim().startsWith('rzp_'))) {
      onShowToast(
        'Please enter a valid Razorpay Key ID starting with "rzp_test_" or "rzp_live_".'
      );
      return;
    }
    const nextConfig: RazorpayGatewayConfig = {
      enabled: rzpEnabled,
      mode: rzpMode,
      keyId: rzpKeyId.trim(),
      keySecret: rzpKeySecret.trim(),
      webhookSecret: rzpWebhookSecret.trim(),
      hasSecretConfigured: Boolean(rzpKeySecret.trim() || razorpayConfig.hasSecretConfigured),
      merchantUpiVpa: merchantUpiVpa.trim() || 'garvix@icici',
      companyName: companyName.trim() || 'Garvix Software Solutions Pvt Ltd',
      companyGstin: companyGstin.trim(),
      supportEmail: supportEmail.trim() || 'support@garvixcloud.in',
      supportPhone: supportPhone.trim() || '+91 98765 43210',
      companyAddress: companyAddress.trim() || 'India',
      footerTagline: footerTagline.trim() || 'Made with ❤️ in India 🇮🇳',
    };
    onSaveRazorpayConfig(nextConfig);

    try {
      await fetch('/api/v1/license-store/upi-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantVpa: nextConfig.merchantUpiVpa,
          merchantName: nextConfig.companyName,
        }),
      });
    } catch {
      // ignore if offline
    }

    onShowToast(
      `Saved Razorpay (${nextConfig.mode} Mode) & Website Footer details!`
    );
  };

  const handleInstallPanelSslSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDomain = sslPanelDomain.trim().toLowerCase().replace(/^https?:\/\//, '');
    if (!cleanDomain || !cleanDomain.includes('.')) {
      onShowToast('Please enter a valid domain name (e.g. panel.yourdomain.com).');
      return;
    }
    if (sslMethod === 'CUSTOM_PEM' && (!sslCustomCertPem.trim() || !sslCustomKeyPem.trim())) {
      onShowToast('Please paste both your SSL Certificate (.crt) and Private Key (.key).');
      return;
    }

    setSslInstalling(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      const res = await fetch('/api/v1/garvix-portal/ssl/install', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          domain: cleanDomain,
          email: sslAdminEmail.trim() || 'admin@garvixcloud.in',
          method: sslMethod,
          certificatePem: sslMethod === 'CUSTOM_PEM' ? sslCustomCertPem.trim() : undefined,
          privateKeyPem: sslMethod === 'CUSTOM_PEM' ? sslCustomKeyPem.trim() : undefined,
          caBundlePem: sslMethod === 'CUSTOM_PEM' ? sslCustomCaBundle.trim() : undefined,
          isPanelHostname: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        onShowToast(json?.error?.message || 'Failed to install SSL certificate.');
        setSslInstalling(false);
        return;
      }
      setSslInstalledInfo({
        domain: json.data.domain,
        issuer: json.data.issuer,
        method: json.data.method,
        expiresAt: json.data.expiresAt,
        installedAt: json.data.installedAt,
      });
      onShowToast(
        `SSL Certificate (${json.data.issuer}) installed for https://${json.data.domain}!`
      );
    } catch {
      onShowToast('Could not reach backend API for SSL installation.');
    } finally {
      setSslInstalling(false);
    }
  };

  const handleSaveAdminCredsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmailInput.trim() || adminPasswordInput.trim().length < 6) {
      onShowToast('Master Admin email and a password of at least 6 characters are required.');
      return;
    }
    onSaveAdminCredentials({
      email: adminEmailInput.trim().toLowerCase(),
      password: adminPasswordInput.trim(),
    });
    onShowToast('Updated Master Admin login email & password!');
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
              <span>GARVIX MASTER ADMIN PANEL (AUTHENTICATED OWNER)</span>
              <span className="text-slate-300">•</span>
              <GradientText
                colors={['#7C3AED', '#4F46E5', '#2563EB', '#7C3AED']}
                className="text-xs font-bold"
              >
                Monthly &amp; Yearly Plans, Account Quotas &amp; Razorpay Gateway
              </GradientText>
            </div>

            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              <BlurText
                text="Control Monthly & Yearly Pricing (₹), cPanel Account Limits & Razorpay Keys."
                delayMs={25}
              />
            </h1>

            <p className="max-w-2xl text-xs leading-relaxed text-slate-600 sm:text-sm">
              Set both <strong>Monthly Price (₹/mo)</strong> and{' '}
              <strong>Yearly Price (₹/yr)</strong> for every plan, control how many cPanel accounts
              each plan can create, and configure your <strong>Razorpay Key ID &amp; Key Secret</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => {
                setActiveTab('gateway');
              }}
            >
              <CreditCard className="h-4 w-4 text-indigo-600" /> Configure Razorpay Keys
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
            Monthly + Yearly Billing Enabled
          </p>
        </SpotlightCard>

        <SpotlightCard className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Customer Licenses
            </span>
            <KeyRound className="h-5 w-5 text-violet-600" />
          </div>
          <div className="mt-2 font-display text-3xl font-extrabold text-slate-900">
            <CountUp
              to={customerLicenses.filter((l) => l.status === 'ACTIVE').length}
              suffix={` / ${customerLicenses.length}`}
            />
          </div>
          <p className="mt-1 text-xs font-semibold text-emerald-700">Active Customer Logins</p>
        </SpotlightCard>

        <SpotlightCard className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Razorpay Gateway Status
            </span>
            <CreditCard className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-2 font-display text-xl font-extrabold text-slate-900">
            {razorpayConfig.keyId ? `${razorpayConfig.mode} MODE ACTIVE` : 'Key ID Not Set'}
          </div>
          <p className="mt-1 truncate font-mono text-xs font-semibold text-indigo-700">
            {razorpayConfig.keyId || 'Click Tab 3 to enter Razorpay Key ID'}
          </p>
        </SpotlightCard>

        <SpotlightCard className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Monthly License MRR
            </span>
            <Server className="h-5 w-5 text-blue-600" />
          </div>
          <div className="mt-2 font-display text-3xl font-extrabold text-slate-900">
            ₹{monthlyRecurringRevenue.toLocaleString('en-IN')}
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">Primary VPS: 200.234.39.100</p>
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
            <Layers className="h-4 w-4" /> 1. Plans, Monthly/Yearly Pricing &amp; Limits ({plans.length})
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
            <Users className="h-4 w-4" /> 2. Customer Licenses &amp; Logins ({customerLicenses.length})
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
            <CreditCard className="h-4 w-4" /> 3. Razorpay, UPI &amp; Footer Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'security'
                ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-indigo-50'
            }`}
          >
            <Lock className="h-4 w-4" /> 4. Master Admin Password
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ssl')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'ssl'
                ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-indigo-50'
            }`}
          >
            <Globe className="h-4 w-4" /> 5. Panel Domain &amp; SSL Certificate
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'plans' && (
            <Button variant="outline" size="sm" onClick={onResetDefaultPlans}>
              <RefreshCw className="h-3.5 w-3.5" /> Reset Default Plans
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onOpenPublicStore}>
            <ExternalLink className="h-3.5 w-3.5 text-indigo-600" /> View Public Home Page
          </Button>
        </div>
      </div>

      {/* ========================================================================
          TAB 1: LICENSE PLANS, MONTHLY & YEARLY PRICING & ACCOUNT LIMITS
          ======================================================================== */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {editingCode && (
            <SpotlightCard className="border-2 border-indigo-500 p-6">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <div>
                  <Badge variant="orange">
                    {editingCode === '__NEW__'
                      ? 'CREATE NEW LICENSE PLAN'
                      : `EDIT PLAN: ${editingCode}`}
                  </Badge>
                  <h2 className="mt-1 font-display text-lg font-extrabold text-slate-900">
                    Configure Plan Name, Monthly Price (₹), Yearly Price (₹), Panel Mode &amp; Limit
                  </h2>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditingCode(null)}>
                  Cancel
                </Button>
              </div>

              <form onSubmit={handleSavePlanForm} className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Plan Name (Displayed on Home Page)
                    </label>
                    <Input
                      required
                      value={formName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormName(e.target.value)
                      }
                      placeholder="e.g. WHM Pro"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Monthly Price (₹ / Month)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      required
                      value={formMonthlyInr}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormMonthlyInr(Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Yearly Price (₹ / Year)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      required
                      value={formYearlyInr}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormYearlyInr(Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Panel Access Mode After Login
                    </label>
                    <select
                      aria-label="Panel Access Mode After Customer Login"
                      value={formPanelMode}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
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
                        WHM + cPanel (Port 2087 WHM + Multiple Accounts)
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
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormMaxAccounts(Number(e.target.value))
                      }
                    />
                    <span className="mt-1 block text-[11px] text-slate-500">
                      Enter <strong>0</strong> for Unlimited cPanel accounts, or any exact limit
                      (e.g. 5, 10, 20, 30).
                    </span>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Top Badge Text
                    </label>
                    <Input
                      value={formBadge}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormBadge(e.target.value)
                      }
                      placeholder="UP TO 30 ACCOUNTS"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Target Audience Subtitle
                    </label>
                    <Input
                      value={formBestFor}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormBestFor(e.target.value)
                      }
                      placeholder="Agencies, Resellers & Hosting Providers"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formPopular}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormPopular(e.target.checked)
                      }
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
                      <Badge
                        variant={plan.panelMode === 'WHM_AND_CPANEL' ? 'default' : 'secondary'}
                      >
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
                    <div className="font-display text-xl font-extrabold text-indigo-700">
                      ₹{plan.monthlyInr.toLocaleString('en-IN')}/mo · ₹
                      {(plan.yearlyInr || plan.monthlyInr * 10).toLocaleString('en-IN')}/yr
                    </div>
                    <div className="text-[11px] font-bold text-slate-500">
                      Code: <span className="font-mono">{plan.code}</span>
                    </div>
                  </div>
                </div>

                {/* Instant Inline Controls for Monthly Price, Yearly Price, Panel Mode & Max Accounts */}
                <div className="grid gap-3 rounded-2xl border border-indigo-100 bg-[#FAF9FE] p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600">
                      Monthly Price (₹/mo)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={plan.monthlyInr}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleQuickUpdatePlan(plan.code, {
                          monthlyInr: Math.max(1, Number(e.target.value) || 0),
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600">
                      Yearly Price (₹/yr)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={plan.yearlyInr || plan.monthlyInr * 10}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleQuickUpdatePlan(plan.code, {
                          yearlyInr: Math.max(1, Number(e.target.value) || 0),
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
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        handleQuickUpdatePlan(plan.code, {
                          panelMode: e.target.value as LicensePanelMode,
                        })
                      }
                      className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-2 text-xs font-bold text-slate-800"
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
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleQuickUpdatePlan(plan.code, {
                          maxAccounts: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                    />
                    <span className="mt-0.5 block text-[10px] font-semibold text-indigo-700">
                      {plan.maxAccounts === 0
                        ? '0 = Unlimited'
                        : `Limit: ${plan.maxAccounts} cP`}
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
                    <Button size="sm" variant="outline" onClick={() => startEditPlan(plan)}>
                      <Edit3 className="h-3.5 w-3.5 text-indigo-600" /> Edit Details
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
          TAB 2: ISSUED CUSTOMER LICENSES & LOGINS MANAGER
          ======================================================================== */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          <SpotlightCard className="p-6">
            <h2 className="font-display text-base font-extrabold text-slate-900">
              Create a New Customer Login &amp; Issue Server License Key
            </h2>
            <p className="text-xs text-slate-500">
              Creates a customer account with Email + Password and binds an Ed25519 license key to
              their server IPv4.
            </p>
            <form onSubmit={handleIssueManualLicense} className="mt-4 grid gap-3 sm:grid-cols-6">
              <Input
                required
                type="email"
                placeholder="customer@agency.in"
                value={newLicEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewLicEmail(e.target.value)
                }
              />
              <Input
                required
                placeholder="Set Customer Password"
                value={newLicPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewLicPassword(e.target.value)
                }
              />
              <Input
                required
                placeholder="Server IP (200.234.39.100)"
                value={newLicServerIp}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewLicServerIp(e.target.value)
                }
              />
              <select
                aria-label="Select License Plan"
                value={newLicPlanCode}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setNewLicPlanCode(e.target.value)
                }
                className="h-10 rounded-xl border border-indigo-100 bg-white px-3 text-xs font-bold text-slate-800"
              >
                {plans.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} ({p.maxAccounts === 0 ? 'Unlimited' : p.maxAccounts} cP)
                  </option>
                ))}
              </select>
              <select
                aria-label="Select Billing Cycle"
                value={newLicBillingCycle}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setNewLicBillingCycle(e.target.value as LicenseBillingCycle)
                }
                className="h-10 rounded-xl border border-indigo-100 bg-white px-3 text-xs font-bold text-slate-800"
              >
                <option value="MONTHLY">Monthly (30 Days)</option>
                <option value="YEARLY">Yearly (365 Days)</option>
              </select>
              <Button type="submit" variant="nebulix">
                <Plus className="h-4 w-4" /> Issue License
              </Button>
            </form>
          </SpotlightCard>

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
                      <Badge variant="default">
                        {lic.planName} ({lic.billingCycle || 'MONTHLY'})
                      </Badge>
                      <Badge variant="secondary">
                        {lic.panelMode === 'ONLY_CPANEL'
                          ? 'Opens: cPanel Only (Port 2083)'
                          : `Opens: WHM + cPanel (Max ${lic.maxAccounts === 0 ? 'Unlimited' : lic.maxAccounts} Accounts)`}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-600">
                      Password:{' '}
                      <code className="font-mono font-bold text-slate-800">{lic.password}</code> ·
                      License Key:{' '}
                      <code className="font-mono font-bold text-indigo-700">{lic.licenseKey}</code>{' '}
                      · Bound Server IP:{' '}
                      <code className="font-mono font-bold text-slate-900">{lic.serverIp}</code>
                      {lic.expiresAt ? ` · Valid Until: ${lic.expiresAt}` : ''}
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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
          TAB 3: RAZORPAY CREDENTIALS, UPI & GST SETTINGS
          ======================================================================== */}
      {activeTab === 'gateway' && (
        <SpotlightCard className="mx-auto max-w-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-4">
            <div>
              <Badge variant="orange">PAYMENT GATEWAY CONFIGURATION</Badge>
              <h2 className="mt-1 font-display text-xl font-extrabold text-slate-900">
                Razorpay API Credentials, Webhook Secret &amp; Merchant UPI Setup
              </h2>
              <p className="text-xs text-slate-500">
                Enter your Razorpay Key ID and Key Secret from your Razorpay Dashboard
                (Settings → API Keys). Customers buying a Monthly or Yearly plan on the Home Page
                will pay through this gateway.
              </p>
            </div>
            <Badge variant={rzpKeyId.startsWith('rzp_') ? 'success' : 'secondary'}>
              {rzpKeyId.startsWith('rzp_') ? `CONNECTED (${rzpMode})` : 'AWAITING KEY'}
            </Badge>
          </div>

          <form onSubmit={handleSaveRazorpaySubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Razorpay Environment Mode
                </label>
                <select
                  aria-label="Razorpay Environment Mode"
                  value={rzpMode}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setRzpMode(e.target.value as 'TEST' | 'LIVE')
                  }
                  className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-xs font-bold text-slate-800"
                >
                  <option value="LIVE">LIVE MODE (Real Customer Payments — rzp_live_...)</option>
                  <option value="TEST">TEST MODE (Sandbox Testing — rzp_test_...)</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Razorpay Checkout Status
                </label>
                <select
                  aria-label="Razorpay Checkout Status"
                  value={rzpEnabled ? 'ENABLED' : 'DISABLED'}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setRzpEnabled(e.target.value === 'ENABLED')
                  }
                  className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-xs font-bold text-slate-800"
                >
                  <option value="ENABLED">Enabled on Public Home Page Checkout</option>
                  <option value="DISABLED">Disabled (Use UPI QR / Manual Only)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Razorpay Key ID (`rzp_live_...` or `rzp_test_...`)
                </label>
                <Input
                  required={rzpEnabled}
                  placeholder={
                    rzpMode === 'LIVE' ? 'rzp_live_YourKeyIdHere' : 'rzp_test_YourKeyIdHere'
                  }
                  value={rzpKeyId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRzpKeyId(e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Razorpay Key Secret (Confidential · Stored on Server Only)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    required={rzpEnabled && !razorpayConfig.hasSecretConfigured}
                    type={showKeySecret ? 'text' : 'password'}
                    placeholder={
                      razorpayConfig.hasSecretConfigured
                        ? '•••••••••••••••• (Saved securely on server)'
                        : 'Enter Razorpay Key Secret'
                    }
                    value={rzpKeySecret}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRzpKeySecret(e.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowKeySecret((prev) => !prev)}
                  >
                    {showKeySecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Razorpay Webhook Secret (`payment.captured` Verification)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showWebhookSecret ? 'text' : 'password'}
                    placeholder="whsec_..."
                    value={rzpWebhookSecret}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRzpWebhookSecret(e.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowWebhookSecret((prev) => !prev)}
                  >
                    {showWebhookSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Merchant NPCI UPI ID (VPA for Direct UPI QR)
                </label>
                <Input
                  placeholder="yourbusiness@icici"
                  value={merchantUpiVpa}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setMerchantUpiVpa(e.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Merchant / Company Legal Name (On GST Invoices &amp; Footer)
                </label>
                <Input
                  value={companyName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCompanyName(e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Company GSTIN (SAC 998315 · 18% GST)
                </label>
                <Input
                  value={companyGstin}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCompanyGstin(e.target.value)
                  }
                />
              </div>
            </div>

            <div className="border-t border-indigo-100 pt-4">
              <div className="mb-3 text-xs font-extrabold uppercase tracking-wider text-indigo-700">
                Website Footer Contact Details &amp; Center Tagline
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Support Email (Shown in Footer Contact Us)
                  </label>
                  <Input
                    type="email"
                    value={supportEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSupportEmail(e.target.value)
                    }
                    placeholder="support@garvixcloud.in"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Support Phone / WhatsApp Number (Shown in Footer)
                  </label>
                  <Input
                    value={supportPhone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSupportPhone(e.target.value)
                    }
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Company Registered Office Address (Shown in Footer)
                  </label>
                  <Input
                    value={companyAddress}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCompanyAddress(e.target.value)
                    }
                    placeholder="Jaipur, Rajasthan, India"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Footer Bottom Center Badge Text
                  </label>
                  <Input
                    value={footerTagline}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFooterTagline(e.target.value)
                    }
                    placeholder="Made with ❤️ in India 🇮🇳"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-indigo-100 pt-4">
              <Button type="submit" variant="nebulix">
                <CheckCircle2 className="h-4 w-4" /> Save Razorpay &amp; Footer Settings
              </Button>
            </div>
          </form>
        </SpotlightCard>
      )}

      {/* ========================================================================
          TAB 4: MASTER ADMIN CREDENTIALS (OWNER LOGIN EMAIL & PASSWORD)
          ======================================================================== */}
      {activeTab === 'security' && (
        <SpotlightCard className="mx-auto max-w-xl p-6 sm:p-8 space-y-5">
          <div>
            <Badge variant="orange">OWNER AUTHENTICATION</Badge>
            <h2 className="mt-1 font-display text-xl font-extrabold text-slate-900">
              Master Admin Login Email &amp; Password
            </h2>
            <p className="text-xs text-slate-500">
              Only someone with these credentials can log into `/admin` to change plans, pricing, or
              Razorpay keys.
            </p>
          </div>

          <form onSubmit={handleSaveAdminCredsSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Master Admin Email
              </label>
              <Input
                required
                type="email"
                value={adminEmailInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAdminEmailInput(e.target.value)
                }
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Master Admin Password
              </label>
              <div className="flex items-center gap-2">
                <Input
                  required
                  type={showAdminPass ? 'text' : 'password'}
                  value={adminPasswordInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAdminPasswordInput(e.target.value)
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdminPass((prev) => !prev)}
                >
                  {showAdminPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="nebulix">
                <CheckCircle2 className="h-4 w-4" /> Update Master Admin Credentials
              </Button>
            </div>
          </form>
        </SpotlightCard>
      )}

      {/* ========================================================================
          TAB 5: PANEL DOMAIN & SSL CERTIFICATE INSTALLER (AUTOSSL + CUSTOM PEM)
          ======================================================================== */}
      {activeTab === 'ssl' && (
        <div className="mx-auto max-w-3xl space-y-6">
          <SpotlightCard className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-4">
              <div>
                <Badge variant="default">HTTPS &amp; TLS 1.3 SECURITY</Badge>
                <h2 className="mt-1 font-display text-xl font-extrabold text-slate-900">
                  Install SSL Certificate for Main Panel Domain
                </h2>
                <p className="text-xs text-slate-500">
                  Point your domain&apos;s DNS <strong>A Record</strong> to{' '}
                  <code className="font-mono font-bold text-indigo-700">200.234.39.100</code>, then
                  issue a Free Let&apos;s Encrypt AutoSSL or upload your own Custom SSL Certificate
                  (<code>.crt</code> + <code>.key</code>).
                </p>
              </div>
              <Badge variant={sslInstalledInfo ? 'success' : 'secondary'}>
                {sslInstalledInfo ? `HTTPS ACTIVE (${sslInstalledInfo.issuer})` : 'READY TO INSTALL'}
              </Badge>
            </div>

            {sslInstalledInfo && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs text-emerald-900">
                <div className="flex items-center justify-between font-bold">
                  <span>
                    🔒 Active SSL Certificate on{' '}
                    <span className="font-mono underline">https://{sslInstalledInfo.domain}</span>
                  </span>
                  <span>Valid Until: {sslInstalledInfo.expiresAt}</span>
                </div>
                <div className="mt-1 text-[11px] text-emerald-800">
                  Issuer: <strong>{sslInstalledInfo.issuer}</strong> · Method:{' '}
                  <strong>{sslInstalledInfo.method}</strong> · Installed:{' '}
                  {sslInstalledInfo.installedAt}
                </div>
              </div>
            )}

            <form onSubmit={handleInstallPanelSslSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Panel Domain / Hostname (Pointed to 200.234.39.100)
                  </label>
                  <Input
                    required
                    value={sslPanelDomain}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSslPanelDomain(e.target.value)
                    }
                    placeholder="panel.yourdomain.com"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    SSL Notification &amp; Renewal Email
                  </label>
                  <Input
                    required
                    type="email"
                    value={sslAdminEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSslAdminEmail(e.target.value)
                    }
                    placeholder="admin@yourdomain.com"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Select SSL Installation Method
                </label>
                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-indigo-100 bg-[#FAF9FE] p-1.5">
                  <button
                    type="button"
                    onClick={() => setSslMethod('LETS_ENCRYPT')}
                    className={`rounded-xl py-2.5 text-xs font-extrabold transition ${
                      sslMethod === 'LETS_ENCRYPT'
                        ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-indigo-700'
                    }`}
                  >
                    1-Click Free Let&apos;s Encrypt AutoSSL
                  </button>
                  <button
                    type="button"
                    onClick={() => setSslMethod('CUSTOM_PEM')}
                    className={`rounded-xl py-2.5 text-xs font-extrabold transition ${
                      sslMethod === 'CUSTOM_PEM'
                        ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-indigo-700'
                    }`}
                  >
                    Upload Custom SSL (.crt + .key)
                  </button>
                </div>
              </div>

              {sslMethod === 'CUSTOM_PEM' ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      SSL Certificate (PEM / .crt)
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={sslCustomCertPem}
                      onChange={(e) => setSslCustomCertPem(e.target.value)}
                      placeholder="-----BEGIN CERTIFICATE-----&#10;MIIFazCCA1OgAwIBAgIRAII...&#10;-----END CERTIFICATE-----"
                      className="w-full rounded-xl border border-indigo-100 bg-white p-3 font-mono text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Private Key (PEM / .key)
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={sslCustomKeyPem}
                      onChange={(e) => setSslCustomKeyPem(e.target.value)}
                      placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvgIBADANBgkqhkiG9w0BAQE...&#10;-----END PRIVATE KEY-----"
                      className="w-full rounded-xl border border-indigo-100 bg-white p-3 font-mono text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      CA Bundle / Intermediate Chain (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={sslCustomCaBundle}
                      onChange={(e) => setSslCustomCaBundle(e.target.value)}
                      placeholder="-----BEGIN CERTIFICATE-----&#10;..."
                      className="w-full rounded-xl border border-indigo-100 bg-white p-3 font-mono text-xs text-slate-800"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs text-slate-700 space-y-2">
                  <div className="font-bold text-indigo-950">
                    ⚡ Automatic Let&apos;s Encrypt ACME HTTP-01 Provisioning (90-Day Auto-Renew)
                  </div>
                  <p>
                    Issues a trusted X.509 SSL certificate for{' '}
                    <code className="font-mono font-bold text-indigo-700">
                      {sslPanelDomain || 'panel.yourdomain.com'}
                    </code>{' '}
                    and configures TLS 1.2 / TLS 1.3 HTTPS redirect.
                  </p>
                  <div className="pt-1">
                    <span className="block text-[11px] font-bold text-slate-600">
                      Direct AlmaLinux 10 Root SSH Command (if running Certbot on host Nginx):
                    </span>
                    <code className="mt-1 block overflow-x-auto rounded-xl bg-slate-900 p-2.5 font-mono text-[11px] text-emerald-400">
                      dnf install -y certbot python3-certbot-nginx &amp;&amp; certbot --nginx -d{' '}
                      {sslPanelDomain.trim() || 'panel.yourdomain.com'} --non-interactive
                      --agree-tos -m {sslAdminEmail.trim() || 'admin@garvixcloud.in'} --redirect
                    </code>
                  </div>
                </div>
              )}

              <div className="flex justify-end border-t border-indigo-100 pt-4">
                <Button type="submit" variant="nebulix" disabled={sslInstalling}>
                  <ShieldCheck className="h-4 w-4" />{' '}
                  {sslInstalling
                    ? 'Installing SSL Certificate...'
                    : sslMethod === 'LETS_ENCRYPT'
                      ? `Install Free Let's Encrypt SSL on ${sslPanelDomain || 'Domain'}`
                      : `Install Custom SSL Certificate on ${sslPanelDomain || 'Domain'}`}
                </Button>
              </div>
            </form>
          </SpotlightCard>
        </div>
      )}
    </AnimatedContent>
  );
};

