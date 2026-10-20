/**
 * Garvix Cloud Console — Phase 0 Workspace Entrypoint
 * Provides distinct experiences for Garvix Super Admin, Garvix Support Operator,
 * Customer Organization Owner, and Billing Administrator.
 */
export const CLOUD_CONSOLE_APP_METADATA = {
  appName: 'Garvix Cloud Control Console',
  version: '0.1.0-phase0',
  supportedRoles: [
    'GARVIX_SUPER_ADMIN',
    'GARVIX_SUPPORT_OPERATOR',
    'CUSTOMER_ORG_OWNER',
    'BILLING_ADMIN',
    'READ_ONLY_AUDITOR',
  ] as const,
};

export { CloudConsoleApp } from './App.js';

