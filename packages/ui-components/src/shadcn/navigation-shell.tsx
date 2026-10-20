import * as React from 'react';
import { cn } from '../lib/utils.js';
import { Badge } from './primitives.js';
import { ShinyText } from '../react-bits/index.js';

export interface SidebarNavGroup {
  title: string;
  items: {
    id: string;
    label: string;
    badge?: string;
    badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'info';
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800/80 bg-slate-950/85 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 font-black text-white shadow-lg shadow-emerald-500/20">
          G
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold tracking-tight text-white">{brandTitle}</span>
            <Badge variant="default" className="text-[10px] uppercase tracking-wider">
              {environmentBadge}
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            <ShinyText text={brandSubtitle} speedSeconds={4} />
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 md:flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span>{statusText}</span>
        </div>
        {rightActions}
      </div>
    </header>
  );
};
