import type { GarvixRole } from '@garvix/shared-types';

export type PermissionKey =
  // Cloud Control Plane permissions
  | 'cloud:releases:publish'
  | 'cloud:licenses:issue'
  | 'cloud:licenses:revoke'
  | 'cloud:support:diagnostics'
  | 'cloud:fleet:read'
  // Organization & Billing permissions
  | 'org:manage'
  | 'billing:subscriptions:manage'
  | 'billing:invoices:read'
  | 'billing:payment_methods:manage'
  // Server-scoped permissions
  | 'server:read'
  | 'server:enroll'
  | 'server:service:restart'
  | 'server:firewall:write'
  | 'server:packages:manage'
  // Reseller-scoped permissions
  | 'reseller:accounts:create'
  | 'reseller:accounts:suspend'
  | 'reseller:branding:write'
  // Hosting Account-scoped permissions
  | 'account:read'
  | 'account:terminate'
  | 'domain:manage'
  | 'dns:manage'
  | 'ssl:manage'
  | 'database:create'
  | 'database:delete'
  | 'app:deploy'
  | 'files:manage'
  | 'backup:create'
  | 'backup:restore'
  | 'email:mailbox:manage'
  // Mailbox-scoped permissions
  | 'email:self:webmail'
  | 'email:self:password'
  | 'email:self:autoresponder'
  // Audit permissions
  | 'audit:read';

export const STEP_UP_MFA_REQUIRED_PERMISSIONS = new Set<PermissionKey>([
  'cloud:releases:publish',
  'cloud:licenses:revoke',
  'server:service:restart',
  'server:firewall:write',
  'account:terminate',
  'database:delete',
  'backup:restore',
]);

export const ROLE_PERMISSION_MATRIX: Record<GarvixRole, ReadonlySet<PermissionKey>> = {
  GARVIX_SUPER_ADMIN: new Set<PermissionKey>([
    'cloud:releases:publish',
    'cloud:licenses:issue',
    'cloud:licenses:revoke',
    'cloud:support:diagnostics',
    'cloud:fleet:read',
    'org:manage',
    'billing:subscriptions:manage',
    'billing:invoices:read',
    'billing:payment_methods:manage',
    'audit:read',
  ]),
  GARVIX_SUPPORT_OPERATOR: new Set<PermissionKey>([
    'cloud:support:diagnostics',
    'cloud:fleet:read',
    'server:read',
    'account:read',
    'audit:read',
  ]),
  CUSTOMER_ORG_OWNER: new Set<PermissionKey>([
    'org:manage',
    'billing:subscriptions:manage',
    'billing:invoices:read',
    'billing:payment_methods:manage',
    'server:read',
    'server:enroll',
    'server:service:restart',
    'server:firewall:write',
    'server:packages:manage',
    'reseller:accounts:create',
    'reseller:accounts:suspend',
    'reseller:branding:write',
    'account:read',
    'account:terminate',
    'domain:manage',
    'dns:manage',
    'ssl:manage',
    'database:create',
    'database:delete',
    'app:deploy',
    'files:manage',
    'backup:create',
    'backup:restore',
    'email:mailbox:manage',
    'audit:read',
  ]),
  SERVER_ADMIN: new Set<PermissionKey>([
    'server:read',
    'server:enroll',
    'server:service:restart',
    'server:firewall:write',
    'server:packages:manage',
    'reseller:accounts:create',
    'reseller:accounts:suspend',
    'account:read',
    'account:terminate',
    'domain:manage',
    'dns:manage',
    'ssl:manage',
    'database:create',
    'database:delete',
    'app:deploy',
    'files:manage',
    'backup:create',
    'backup:restore',
    'email:mailbox:manage',
    'audit:read',
  ]),
  HOSTING_RESELLER: new Set<PermissionKey>([
    'reseller:accounts:create',
    'reseller:accounts:suspend',
    'reseller:branding:write',
    'account:read',
    'domain:manage',
    'dns:manage',
    'ssl:manage',
    'database:create',
    'app:deploy',
    'files:manage',
    'backup:create',
    'email:mailbox:manage',
    'audit:read',
  ]),
  HOSTING_ACCOUNT_OWNER: new Set<PermissionKey>([
    'account:read',
    'domain:manage',
    'dns:manage',
    'ssl:manage',
    'database:create',
    'database:delete',
    'app:deploy',
    'files:manage',
    'backup:create',
    'backup:restore',
    'email:mailbox:manage',
    'email:self:webmail',
    'email:self:password',
    'email:self:autoresponder',
    'audit:read',
  ]),
  HOSTING_ACCOUNT_TECH: new Set<PermissionKey>([
    'account:read',
    'domain:manage',
    'dns:manage',
    'ssl:manage',
    'database:create',
    'app:deploy',
    'files:manage',
    'backup:create',
  ]),
  EMAIL_ONLY_USER: new Set<PermissionKey>([
    'email:self:webmail',
    'email:self:password',
    'email:self:autoresponder',
  ]),
  BILLING_ADMIN: new Set<PermissionKey>([
    'billing:subscriptions:manage',
    'billing:invoices:read',
    'billing:payment_methods:manage',
    'audit:read',
  ]),
  READ_ONLY_AUDITOR: new Set<PermissionKey>([
    'server:read',
    'account:read',
    'billing:invoices:read',
    'audit:read',
  ]),
};

export interface AuthenticatedPrincipal {
  userId: string;
  role: GarvixRole;
  organizationId: string;
  allocatedServerIds: string[];
  allocatedResellerId: string | null;
  allocatedAccountIds: string[];
  mailboxId: string | null;
  mfaVerifiedAtIso: string | null;
}

export interface TargetResourceDescriptor {
  organizationId: string;
  serverId?: string;
  resellerId?: string | null;
  accountId?: string;
  mailboxId?: string;
}

export interface AuthorizationDecision {
  allowed: boolean;
  code:
    | 'ALLOWED'
    | 'DENIED_MISSING_PERMISSION'
    | 'DENIED_CROSS_TENANT_ORG'
    | 'DENIED_SERVER_SCOPE'
    | 'DENIED_RESELLER_SCOPE'
    | 'DENIED_ACCOUNT_SCOPE'
    | 'DENIED_MAILBOX_SCOPE'
    | 'DENIED_STEP_UP_MFA_REQUIRED';
  reason: string;
}

/**
 * Evaluates both role permissions (RBAC) and strict resource-level multi-tenant ownership (ABAC).
 * Never trusts client-supplied tenant IDs without matching against the authenticated principal's scope.
 */
export function authorizeAction(
  principal: AuthenticatedPrincipal,
  permission: PermissionKey,
  resource: TargetResourceDescriptor,
  nowMs: number = Date.now(),
  stepUpWindowMs: number = 15 * 60 * 1000 // 15 minutes
): AuthorizationDecision {
  const rolePermissions = ROLE_PERMISSION_MATRIX[principal.role];
  if (!rolePermissions || !rolePermissions.has(permission)) {
    return {
      allowed: false,
      code: 'DENIED_MISSING_PERMISSION',
      reason: `Role ${principal.role} does not hold permission ${permission}`,
    };
  }

  // Step-up MFA check for sensitive operations
  if (STEP_UP_MFA_REQUIRED_PERMISSIONS.has(permission)) {
    if (!principal.mfaVerifiedAtIso) {
      return {
        allowed: false,
        code: 'DENIED_STEP_UP_MFA_REQUIRED',
        reason: `Operation ${permission} requires MFA step-up verification`,
      };
    }
    const verifiedAtMs = Date.parse(principal.mfaVerifiedAtIso);
    if (Number.isNaN(verifiedAtMs) || nowMs - verifiedAtMs > stepUpWindowMs) {
      return {
        allowed: false,
        code: 'DENIED_STEP_UP_MFA_REQUIRED',
        reason: `MFA verification expired (> ${Math.round(stepUpWindowMs / 60000)}m old); re-authentication required`,
      };
    }
  }

  // Platform-level Garvix roles have cross-org visibility only for cloud/support operations
  const isGarvixVendorRole =
    principal.role === 'GARVIX_SUPER_ADMIN' || principal.role === 'GARVIX_SUPPORT_OPERATOR';

  if (!isGarvixVendorRole && principal.organizationId !== resource.organizationId) {
    return {
      allowed: false,
      code: 'DENIED_CROSS_TENANT_ORG',
      reason: `Cross-tenant access denied: principal org (${principal.organizationId}) != resource org (${resource.organizationId})`,
    };
  }

  // Server scope check for SERVER_ADMIN
  if (
    principal.role === 'SERVER_ADMIN' &&
    resource.serverId &&
    !principal.allocatedServerIds.includes(resource.serverId)
  ) {
    return {
      allowed: false,
      code: 'DENIED_SERVER_SCOPE',
      reason: `Server Admin is not assigned to server ${resource.serverId}`,
    };
  }

  // Reseller scope check: resellers can ONLY manage accounts/resources allocated to their resellerId
  if (principal.role === 'HOSTING_RESELLER') {
    if (!principal.allocatedResellerId || principal.allocatedResellerId !== resource.resellerId) {
      return {
        allowed: false,
        code: 'DENIED_RESELLER_SCOPE',
        reason: `Reseller (${principal.allocatedResellerId ?? 'none'}) cannot access resource owned by reseller (${resource.resellerId ?? 'direct'})`,
      };
    }
    if (resource.accountId && !principal.allocatedAccountIds.includes(resource.accountId)) {
      return {
        allowed: false,
        code: 'DENIED_ACCOUNT_SCOPE',
        reason: `Account ${resource.accountId} is not allocated to reseller ${principal.allocatedResellerId}`,
      };
    }
  }

  // Account-level roles (HOSTING_ACCOUNT_OWNER, HOSTING_ACCOUNT_TECH)
  if (
    principal.role === 'HOSTING_ACCOUNT_OWNER' ||
    principal.role === 'HOSTING_ACCOUNT_TECH'
  ) {
    if (!resource.accountId || !principal.allocatedAccountIds.includes(resource.accountId)) {
      return {
        allowed: false,
        code: 'DENIED_ACCOUNT_SCOPE',
        reason: `Principal is not authorized for hosting account ${resource.accountId ?? 'unspecified'}`,
      };
    }
  }

  // Email-only user scope check
  if (principal.role === 'EMAIL_ONLY_USER') {
    if (!resource.mailboxId || principal.mailboxId !== resource.mailboxId) {
      return {
        allowed: false,
        code: 'DENIED_MAILBOX_SCOPE',
        reason: `Email-only user can only access their own mailbox (${principal.mailboxId ?? 'none'})`,
      };
    }
  }

  return {
    allowed: true,
    code: 'ALLOWED',
    reason: 'Authorized by role and resource ownership policy',
  };
}
