import * as React from 'react';
import {
  LayoutDashboard,
  Globe,
  Mail,
  Database,
  FolderOpen,
  ShieldCheck,
  CloudDownload,
  Lock,
  CreditCard,
  Sliders,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';
import type { GarvixRole } from '@garvix/shared-types';
import type { NavigationItem } from '@garvix/ui-components';

export type NebulixSidebarSectionId =
  | 'dashboard'
  | 'websites-domains'
  | 'email-accounts'
  | 'databases'
  | 'file-manager'
  | 'ssl-certificates'
  | 'backups'
  | 'security'
  | 'billing'
  | 'settings';

export interface NebulixNavEntry {
  id: NebulixSidebarSectionId;
  label: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NEBULIX_SIDEBAR_ITEMS: readonly NebulixNavEntry[] = [
  { id: 'dashboard', label: 'Dashboard', badge: 'Home', icon: LayoutDashboard },
  { id: 'websites-domains', label: 'Websites & Domains', badge: '5', icon: Globe },
  { id: 'email-accounts', label: 'Email Accounts', badge: '18', icon: Mail },
  { id: 'databases', label: 'Databases', badge: 'PG/MySQL', icon: Database },
  { id: 'file-manager', label: 'File Manager', icon: FolderOpen },
  { id: 'ssl-certificates', label: 'SSL Certificates', badge: 'TLS 1.3', icon: ShieldCheck },
  { id: 'backups', label: 'Backups', badge: 'Daily', icon: CloudDownload },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Sliders },
];

export interface NebulixSidebarProps {
  activeItem: NebulixSidebarSectionId;
  onSelectItem: (item: NebulixSidebarSectionId) => void;
  activeRole: GarvixRole;
  authorizedNavItems: NavigationItem[];
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const NebulixSidebar: React.FC<NebulixSidebarProps> = ({
  activeItem,
  onSelectItem,
  activeRole,
  authorizedNavItems,
  mobileOpen,
  onCloseMobile,
}) => {
  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white/95 px-4 py-6 backdrop-blur-xl">
      <div>
        {/* GARVIX Brand Logo Header */}
        <div className="flex items-center justify-between px-2 pb-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-white shadow-[0_8px_22px_-4px_rgba(99,102,241,0.55)]">
              <span className="font-display text-lg font-extrabold tracking-tight">G</span>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-lg font-extrabold tracking-tight text-slate-900">
                  GARVIX
                </span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 border border-indigo-200/60">
                  Cloud
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">Nebulix Hosting Suite</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Primary Domain Pill */}
        <div className="mb-5 rounded-2xl border border-indigo-100 bg-gradient-to-r from-[#F5F3FF] via-[#EEF2FF] to-[#EFF6FF] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
              Primary Workspace
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
            </span>
          </div>
          <div className="mt-1 truncate font-mono text-xs font-bold text-slate-900">
            garvixcloud.in
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            AlmaLinux 10 · UID 1004 (`garvixprod`)
          </div>
        </div>

        {/* Navigation Links */}
        <div className="space-y-1">
          <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Hosting Control
          </div>
          <nav aria-label="Customer Panel Navigation" className="space-y-1">
            {NEBULIX_SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectItem(item.id);
                    onCloseMobile();
                  }}
                  className={`group relative flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-[0_8px_20px_-6px_rgba(99,102,241,0.55)]'
                      : 'text-slate-600 hover:bg-indigo-50/80 hover:text-indigo-950'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100/90 text-slate-600 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="tracking-tight">{item.label}</span>
                  </span>

                  <span className="flex items-center gap-1.5">
                    {item.badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100/80'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        isActive
                          ? 'translate-x-0.5 text-white'
                          : 'text-slate-300 opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100'
                      }`}
                    />
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom RBAC Scope & Pro Plan Card */}
      <div className="mt-6 space-y-3">
        <div className="rounded-2xl border border-indigo-100/90 bg-gradient-to-br from-violet-50/90 via-indigo-50/60 to-blue-50/90 p-3.5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span>Garvix Pro NVMe Plan</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
            RBAC Role: <span className="font-mono font-semibold text-indigo-700">{activeRole}</span>{' '}
            ({authorizedNavItems.length} authorized policies active)
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden w-[272px] shrink-0 border-r border-indigo-100/80 bg-white/90 shadow-[4px_0_30px_-15px_rgba(99,102,241,0.10)] lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">{sidebarContent}</div>
      </aside>

      {/* Mobile Slide-Over Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 h-full w-[280px] max-w-[85vw] overflow-y-auto border-r border-indigo-100 bg-white shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
