import { describe, expect, it } from 'vitest';
import {
  authorizeAction,
  type AuthenticatedPrincipal,
  type TargetResourceDescriptor,
} from '@garvix/authorization';
import { getAuthorizedNavigationForRole } from '@garvix/ui-components';

describe('10-Role RBAC & Multi-Tenancy Isolation Engine', () => {
  const recentMfaIso = new Date().toISOString();

  const orgOwnerPrincipal: AuthenticatedPrincipal = {
    userId: 'usr_org_owner_1',
    role: 'CUSTOMER_ORG_OWNER',
    organizationId: 'org_alpha',
    allocatedServerIds: ['srv_1'],
    allocatedResellerId: null,
    allocatedAccountIds: ['acc_1', 'acc_2'],
    mailboxId: null,
    mfaVerifiedAtIso: recentMfaIso,
  };

  const resellerPrincipal: AuthenticatedPrincipal = {
    userId: 'usr_reseller_1',
    role: 'HOSTING_RESELLER',
    organizationId: 'org_alpha',
    allocatedServerIds: ['srv_1'],
    allocatedResellerId: 'res_partner_1',
    allocatedAccountIds: ['acc_resold_1'],
    mailboxId: null,
    mfaVerifiedAtIso: recentMfaIso,
  };

  const accountOwnerPrincipal: AuthenticatedPrincipal = {
    userId: 'usr_acc_owner_1',
    role: 'HOSTING_ACCOUNT_OWNER',
    organizationId: 'org_alpha',
    allocatedServerIds: ['srv_1'],
    allocatedResellerId: 'res_partner_1',
    allocatedAccountIds: ['acc_resold_1'],
    mailboxId: null,
    mfaVerifiedAtIso: recentMfaIso,
  };

  const emailOnlyPrincipal: AuthenticatedPrincipal = {
    userId: 'usr_mail_1',
    role: 'EMAIL_ONLY_USER',
    organizationId: 'org_alpha',
    allocatedServerIds: [],
    allocatedResellerId: null,
    allocatedAccountIds: ['acc_resold_1'],
    mailboxId: 'mbx_101',
    mfaVerifiedAtIso: null,
  };

  const auditorPrincipal: AuthenticatedPrincipal = {
    userId: 'usr_auditor_1',
    role: 'READ_ONLY_AUDITOR',
    organizationId: 'org_alpha',
    allocatedServerIds: ['srv_1'],
    allocatedResellerId: null,
    allocatedAccountIds: ['acc_1'],
    mailboxId: null,
    mfaVerifiedAtIso: recentMfaIso,
  };

  it('blocks cross-tenant access even if the user holds Customer Org Owner permissions', () => {
    const foreignOrgResource: TargetResourceDescriptor = {
      organizationId: 'org_beta_competitor',
      serverId: 'srv_99',
      accountId: 'acc_99',
    };

    const decision = authorizeAction(orgOwnerPrincipal, 'domain:manage', foreignOrgResource);
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('DENIED_CROSS_TENANT_ORG');
  });

  it('restricts Resellers strictly to accounts and resources allocated to their resellerId', () => {
    const allocatedResource: TargetResourceDescriptor = {
      organizationId: 'org_alpha',
      resellerId: 'res_partner_1',
      accountId: 'acc_resold_1',
    };
    const unallocatedResourceSameOrg: TargetResourceDescriptor = {
      organizationId: 'org_alpha',
      resellerId: 'res_partner_2',
      accountId: 'acc_other',
    };

    expect(authorizeAction(resellerPrincipal, 'domain:manage', allocatedResource).allowed).toBe(
      true
    );

    const denied = authorizeAction(
      resellerPrincipal,
      'domain:manage',
      unallocatedResourceSameOrg
    );
    expect(denied.allowed).toBe(false);
    expect(denied.code).toBe('DENIED_RESELLER_SCOPE');
  });

  it('prevents Hosting Account Owners from accessing sibling accounts on the same server', () => {
    const siblingAccountResource: TargetResourceDescriptor = {
      organizationId: 'org_alpha',
      accountId: 'acc_2',
    };
    const decision = authorizeAction(
      accountOwnerPrincipal,
      'files:manage',
      siblingAccountResource
    );
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('DENIED_ACCOUNT_SCOPE');
  });

  it('enforces Step-Up MFA verification for destructive or root-level operations', () => {
    const principalWithoutRecentMfa: AuthenticatedPrincipal = {
      ...orgOwnerPrincipal,
      mfaVerifiedAtIso: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago (expired)
    };
    const resource: TargetResourceDescriptor = {
      organizationId: 'org_alpha',
      accountId: 'acc_1',
    };

    const decision = authorizeAction(
      principalWithoutRecentMfa,
      'database:delete',
      resource
    );
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('DENIED_STEP_UP_MFA_REQUIRED');

    const withFreshMfa = authorizeAction(orgOwnerPrincipal, 'database:delete', resource);
    expect(withFreshMfa.allowed).toBe(true);
  });

  it('confines Email-Only Users strictly to their own mailbox and blocks hosting management', () => {
    const ownMailbox: TargetResourceDescriptor = {
      organizationId: 'org_alpha',
      mailboxId: 'mbx_101',
    };
    const otherMailbox: TargetResourceDescriptor = {
      organizationId: 'org_alpha',
      mailboxId: 'mbx_202',
    };

    expect(authorizeAction(emailOnlyPrincipal, 'email:self:password', ownMailbox).allowed).toBe(
      true
    );
    expect(authorizeAction(emailOnlyPrincipal, 'email:self:password', otherMailbox).code).toBe(
      'DENIED_MAILBOX_SCOPE'
    );
    expect(authorizeAction(emailOnlyPrincipal, 'domain:manage', ownMailbox).code).toBe(
      'DENIED_MISSING_PERMISSION'
    );
  });

  it('prevents Read-Only Auditors from executing any state-mutating operations', () => {
    const resource: TargetResourceDescriptor = {
      organizationId: 'org_alpha',
      accountId: 'acc_1',
    };
    expect(authorizeAction(auditorPrincipal, 'audit:read', resource).allowed).toBe(true);
    expect(authorizeAction(auditorPrincipal, 'app:deploy', resource).allowed).toBe(false);
  });

  it('never exposes server-root navigation items to customer account owners, resellers, or email users', () => {
    const customerNav = getAuthorizedNavigationForRole('HOSTING_ACCOUNT_OWNER');
    const resellerNav = getAuthorizedNavigationForRole('HOSTING_RESELLER');
    const emailNav = getAuthorizedNavigationForRole('EMAIL_ONLY_USER');
    const serverAdminNav = getAuthorizedNavigationForRole('SERVER_ADMIN');

    expect(customerNav.some((item) => item.isRootServerOperation)).toBe(false);
    expect(resellerNav.some((item) => item.isRootServerOperation)).toBe(false);
    expect(emailNav.some((item) => item.isRootServerOperation)).toBe(false);
    expect(serverAdminNav.some((item) => item.isRootServerOperation)).toBe(true);
  });
});
