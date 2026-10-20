import type { GarvixRole } from '@garvix/shared-types';
import { ROLE_PERMISSION_MATRIX, type PermissionKey } from '@garvix/authorization';

export interface NavigationItem {
  id: string;
  label: string;
  route: string;
  moduleNumber: number;
  requiredPermission: PermissionKey;
  isRootServerOperation: boolean;
}

export const PANEL_NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    id: 'server-overview',
    label: 'Server Management & Preflight',
    route: '/server/management',
    moduleNumber: 2,
    requiredPermission: 'server:service:restart',
    isRootServerOperation: true,
  },
  {
    id: 'whm-reseller',
    label: 'WHM & Reseller Accounts',
    route: '/whm/accounts',
    moduleNumber: 11,
    requiredPermission: 'reseller:accounts:create',
    isRootServerOperation: false,
  },
  {
    id: 'account-dashboard',
    label: 'Hosting Dashboard',
    route: '/account/overview',
    moduleNumber: 1,
    requiredPermission: 'account:read',
    isRootServerOperation: false,
  },
  {
    id: 'domains-dns',
    label: 'Domains & DNS Zones',
    route: '/account/domains',
    moduleNumber: 4,
    requiredPermission: 'domain:manage',
    isRootServerOperation: false,
  },
  {
    id: 'ssl-certificates',
    label: 'SSL/TLS Certificates',
    route: '/account/ssl',
    moduleNumber: 5,
    requiredPermission: 'ssl:manage',
    isRootServerOperation: false,
  },
  {
    id: 'email-hosting',
    label: 'Email Hosting & Security',
    route: '/account/email',
    moduleNumber: 6,
    requiredPermission: 'email:mailbox:manage',
    isRootServerOperation: false,
  },
  {
    id: 'databases',
    label: 'PostgreSQL & MariaDB',
    route: '/account/databases',
    moduleNumber: 7,
    requiredPermission: 'database:create',
    isRootServerOperation: false,
  },
  {
    id: 'applications',
    label: 'Website & App Deployment',
    route: '/account/applications',
    moduleNumber: 8,
    requiredPermission: 'app:deploy',
    isRootServerOperation: false,
  },
  {
    id: 'file-manager',
    label: 'File Manager',
    route: '/account/files',
    moduleNumber: 9,
    requiredPermission: 'files:manage',
    isRootServerOperation: false,
  },
  {
    id: 'backups',
    label: 'Backups & Disaster Recovery',
    route: '/account/backups',
    moduleNumber: 10,
    requiredPermission: 'backup:create',
    isRootServerOperation: false,
  },
  {
    id: 'webmail-self-service',
    label: 'My Mailbox & Autoresponder',
    route: '/mailbox/self',
    moduleNumber: 6,
    requiredPermission: 'email:self:webmail',
    isRootServerOperation: false,
  },
  {
    id: 'billing-portal',
    label: 'Subscriptions & GST Invoices',
    route: '/billing/invoices',
    moduleNumber: 11,
    requiredPermission: 'billing:invoices:read',
    isRootServerOperation: false,
  },
];

/**
 * Returns the filtered navigation menu for a given role, guaranteeing that
 * customer/reseller/email views are never overloaded with server-root functionality.
 */
export function getAuthorizedNavigationForRole(role: GarvixRole): NavigationItem[] {
  const permissions = ROLE_PERMISSION_MATRIX[role];
  const isServerOrOrgAdmin = role === 'SERVER_ADMIN' || role === 'CUSTOMER_ORG_OWNER';

  return PANEL_NAVIGATION_ITEMS.filter((item) => {
    if (item.isRootServerOperation && !isServerOrOrgAdmin) {
      return false;
    }
    return permissions.has(item.requiredPermission);
  });
}

export { cn } from './lib/utils.js';
export * from './shadcn/primitives.js';
export * from './shadcn/navigation-shell.js';
export * from './react-bits/index.js';

