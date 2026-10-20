import * as React from 'react';
import {
  LayoutGrid,
  Globe,
  Mail,
  HardDrive,
  Activity,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { SpotlightCard, CountUp } from '@garvix/ui-components';

export interface NebulixStatsGridProps {
  activeWebsitesCount: number;
  domainsCount: number;
  emailAccountsCount: number;
  storageUsedGb: number;
  storageTotalGb: number;
  monthlyBandwidthGb: number;
  bandwidthLimitGb: number;
  sslCertificatesCount: number;
}

export const NebulixStatsGrid: React.FC<NebulixStatsGridProps> = ({
  activeWebsitesCount,
  domainsCount,
  emailAccountsCount,
  storageUsedGb,
  storageTotalGb,
  monthlyBandwidthGb,
  bandwidthLimitGb,
  sslCertificatesCount,
}) => {
  const stats = [
    {
      id: 'active-websites',
      label: 'Active Websites',
      value: activeWebsitesCount,
      decimals: 0,
      suffix: '',
      subtext: 'Node.js 20 & PHP-FPM 8.3 Pools',
      badge: '100% Online',
      icon: LayoutGrid,
      iconBg: 'from-violet-600 to-indigo-600',
    },
    {
      id: 'domains',
      label: 'Domains',
      value: domainsCount,
      decimals: 0,
      suffix: '',
      subtext: 'Bind9 Authoritative DNS Zones',
      badge: 'DNSSEC Ready',
      icon: Globe,
      iconBg: 'from-indigo-600 to-blue-600',
    },
    {
      id: 'email-accounts',
      label: 'Email Accounts',
      value: emailAccountsCount,
      decimals: 0,
      suffix: '',
      subtext: 'Postfix + Dovecot Argon2id',
      badge: 'DKIM 2048-bit',
      icon: Mail,
      iconBg: 'from-blue-600 to-cyan-600',
    },
    {
      id: 'storage-usage',
      label: 'Storage Usage',
      value: storageUsedGb,
      decimals: 1,
      suffix: ' GB',
      subtext: `of ${storageTotalGb} GB NVMe Gen4 Quota`,
      badge: `${Math.round((storageUsedGb / storageTotalGb) * 100)}% Used`,
      icon: HardDrive,
      iconBg: 'from-purple-600 to-violet-600',
    },
    {
      id: 'monthly-bandwidth',
      label: 'Monthly Bandwidth',
      value: monthlyBandwidthGb,
      decimals: 0,
      suffix: ' GB',
      subtext: `of ${bandwidthLimitGb.toLocaleString()} GB Allocation`,
      badge: `${((monthlyBandwidthGb / bandwidthLimitGb) * 100).toFixed(1)}% Used`,
      icon: Activity,
      iconBg: 'from-indigo-500 to-violet-600',
    },
    {
      id: 'ssl-certificates',
      label: 'SSL Certificates',
      value: sslCertificatesCount,
      decimals: 0,
      suffix: '',
      subtext: 'Let’s Encrypt AutoSSL (ACME)',
      badge: 'TLS 1.3 Active',
      icon: ShieldCheck,
      iconBg: 'from-emerald-500 to-teal-600',
    },
  ];

  return (
    <section aria-label="Animated Account Statistics" className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-extrabold tracking-tight text-slate-900">
            Hosting Resource Overview
          </h2>
          <p className="text-xs text-slate-500">
            Real-time quota allocation and active services for tenant{' '}
            <span className="font-mono font-semibold text-indigo-700">garvixprod</span>
          </p>
        </div>

        <span
          title="These figures represent deterministic local preview/mock data and do not claim live production hardware readings."
          className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-indigo-50/90 px-3 py-1 text-[11px] font-bold text-indigo-700"
        >
          <Info className="h-3.5 w-3.5 text-indigo-600" />
          <span>Preview / Mock Account Metrics</span>
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <SpotlightCard
              key={stat.id}
              spotlightColor="rgba(99, 102, 241, 0.12)"
              className="group rounded-2xl border border-indigo-100/90 bg-white p-5 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-300/80 hover:shadow-[0_18px_38px_-12px_rgba(99,102,241,0.22)] dark:border-indigo-100/90 dark:bg-white"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.iconBg} text-white shadow-[0_8px_18px_-4px_rgba(99,102,241,0.45)] transition-transform duration-300 group-hover:scale-105`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-indigo-100 bg-indigo-50/80 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                  {stat.badge}
                </span>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
                <div className="mt-1 font-display text-3xl font-extrabold tracking-tight text-slate-900">
                  <CountUp
                    to={stat.value}
                    decimals={stat.decimals}
                    suffix={stat.suffix}
                    durationMs={950}
                  />
                </div>
                <p className="mt-1.5 text-xs font-medium text-slate-500">{stat.subtext}</p>
              </div>
            </SpotlightCard>
          );
        })}
      </div>
    </section>
  );
};
