import * as React from 'react';
import { Badge } from './primitives.js';

export interface SidebarNavGroup {
  title: string;
  items: {
    id: string;
    label: string;
    badge?: string;
    badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning';
    icon?: React.ReactNode;
  }[];
}

export interface GarvixShellHeaderProps {
  brandTitle: string;
  brandSubtitle: string;
  environmentBadge: string;
  statusText: string;
  rightActions?: React.ReactNode;
}

export const GarvixShellHeader: React.FC<GarvixShellHeaderProps> = ({
  brandTitle,
  brandSubtitle,
  environmentBadge,
  statusText,
  rightActions,
}) => {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-indigo-100/90 bg-white/90 px-6 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-3.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 font-display text-lg font-extrabold text-white shadow-[0_8px_20px_-4px_rgba(99,102,241,0.55)]">
          G
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-extrabold tracking-tight text-slate-900">
              {brandTitle}
            </span>
            <Badge variant="default" className="text-[10px] uppercase tracking-wider">
              {environmentBadge}
            </Badge>
          </div>
          <p className="text-xs font-medium text-slate-500">{brandSubtitle}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-emerald-200/90 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 md:flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span>{statusText}</span>
        </div>
        {rightActions}
      </div>
    </header>
  );
};
