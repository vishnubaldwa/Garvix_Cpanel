import * as React from 'react';
import {
  Globe,
  MailPlus,
  FolderOpen,
  Database,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react';
import { SpotlightCard } from '@garvix/ui-components';

export interface NebulixQuickActionsProps {
  onAddDomain: () => void;
  onCreateEmail: () => void;
  onOpenFileManager: () => void;
  onManageDatabase: () => void;
  onInstallSsl: () => void;
}

export const NebulixQuickActions: React.FC<NebulixQuickActionsProps> = ({
  onAddDomain,
  onCreateEmail,
  onOpenFileManager,
  onManageDatabase,
  onInstallSsl,
}) => {
  const actions = [
    {
      id: 'add-domain',
      title: 'Add Domain',
      description: 'Connect a primary domain, subdomain, or Bind9 DNS zone.',
      icon: Globe,
      gradient: 'from-violet-600 to-indigo-600',
      onClick: onAddDomain,
    },
    {
      id: 'create-email',
      title: 'Create Email',
      description: 'Provision an Argon2id mailbox with 2048-bit DKIM & SPF.',
      icon: MailPlus,
      gradient: 'from-indigo-600 to-blue-600',
      onClick: onCreateEmail,
    },
    {
      id: 'open-file-manager',
      title: 'Open File Manager',
      description: 'Browse `/home/garvixprod` with O_NOFOLLOW sandbox safety.',
      icon: FolderOpen,
      gradient: 'from-blue-600 to-cyan-600',
      onClick: onOpenFileManager,
    },
    {
      id: 'manage-database',
      title: 'Manage Database',
      description: 'Create isolated PostgreSQL 16 or MariaDB 10.11 instances.',
      icon: Database,
      gradient: 'from-purple-600 to-indigo-600',
      onClick: onManageDatabase,
    },
    {
      id: 'install-ssl',
      title: 'Install SSL',
      description: 'Issue or renew free Let’s Encrypt AutoSSL TLS 1.3 certificates.',
      icon: ShieldCheck,
      gradient: 'from-emerald-500 to-teal-600',
      onClick: onInstallSsl,
    },
  ];

  return (
    <section aria-label="Quick Actions" className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-extrabold tracking-tight text-slate-900">
            Quick Actions
          </h2>
          <p className="text-xs text-slate-500">
            One-click shortcuts for frequent hosting management operations
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <SpotlightCard
              key={action.id}
              spotlightColor="rgba(99, 102, 241, 0.14)"
              onClick={action.onClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  action.onClick();
                }
              }}
              className="group cursor-pointer rounded-2xl border border-indigo-100/90 bg-white p-4 shadow-[0_10px_28px_-12px_rgba(99,102,241,0.12)] transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-[0_18px_36px_-12px_rgba(99,102,241,0.24)] dark:border-indigo-100/90 dark:bg-white"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow-md transition-transform duration-300 group-hover:scale-105`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-indigo-600 group-hover:text-white">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>

              <h3 className="mt-3.5 font-display text-sm font-bold text-slate-900 group-hover:text-indigo-700">
                {action.title}
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {action.description}
              </p>
            </SpotlightCard>
          );
        })}
      </div>
    </section>
  );
};
