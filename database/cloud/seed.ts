/**
 * Garvix Hosting Manager — Cloud Control Plane Deterministic Seed Script
 * Garvix Software Solutions Pvt Ltd
 *
 * Exports deterministic seed fixtures for unit/integration tests and provides
 * an idempotent `seedCloudDatabase` runner for local development (`DATABASE_CLOUD_URL`).
 */

export const CLOUD_SEED_IDS = {
  organizations: {
    garvixInternal: '10000000-0000-4000-8000-000000000001',
    acmeCloudHosting: '10000000-0000-4000-8000-000000000002',
    indusWebSolutions: '10000000-0000-4000-8000-000000000003',
  },
  roles: {
    cloudSuperAdmin: '20000000-0000-4000-8000-000000000001',
    cloudBillingOps: '20000000-0000-4000-8000-000000000002',
    cloudReleaseEngineer: '20000000-0000-4000-8000-000000000003',
    cloudSupportEngineer: '20000000-0000-4000-8000-000000000004',
    customerOrgOwner: '20000000-0000-4000-8000-000000000005',
    customerOrgBillingAdmin: '20000000-0000-4000-8000-000000000006',
    serverSuperAdminRef: '20000000-0000-4000-8000-000000000007',
    resellerAdminRef: '20000000-0000-4000-8000-000000000008',
    hostingAccountOwnerRef: '20000000-0000-4000-8000-000000000009',
    hostingSubUserDeveloperRef: '20000000-0000-4000-8000-000000000010',
  },
  users: {
    superAdmin: '30000000-0000-4000-8000-000000000001',
    billingOps: '30000000-0000-4000-8000-000000000002',
    releaseEngineer: '30000000-0000-4000-8000-000000000003',
    supportEngineer: '30000000-0000-4000-8000-000000000004',
    acmeOwner: '30000000-0000-4000-8000-000000000005',
    acmeBilling: '30000000-0000-4000-8000-000000000006',
    indusTrialOwner: '30000000-0000-4000-8000-000000000007',
  },
  plans: {
    trial14d: '40000000-0000-4000-8000-000000000001',
    starterMonthly: '40000000-0000-4000-8000-000000000002',
    proAnnual: '40000000-0000-4000-8000-000000000003',
    resellerMonthly: '40000000-0000-4000-8000-000000000004',
    enterpriseAnnual: '40000000-0000-4000-8000-000000000005',
  },
  channels: {
    stable: '50000000-0000-4000-8000-000000000001',
    beta: '50000000-0000-4000-8000-000000000002',
    security: '50000000-0000-4000-8000-000000000003',
  },
  servers: {
    acmeProdMum01: '60000000-0000-4000-8000-000000000001',
    indusTrialBlr01: '60000000-0000-4000-8000-000000000002',
  },
  licenses: {
    acmeEnterpriseLicense: '70000000-0000-4000-8000-000000000001',
    indusTrialLicense: '70000000-0000-4000-8000-000000000002',
  },
  subscriptions: {
    acmeEnterpriseSub: '80000000-0000-4000-8000-000000000001',
    indusTrialSub: '80000000-0000-4000-8000-000000000002',
  },
  invoices: {
    acmeTaxInvoice001: '90000000-0000-4000-8000-000000000001',
  },
  releases: {
    panelStable240: 'a0000000-0000-4000-8000-000000000001',
    agentStable240: 'a0000000-0000-4000-8000-000000000002',
  },
} as const;

/**
 * Canonical 10-Role Taxonomy across Garvix Hosting Manager
 * (6 Cloud Control Plane roles + 4 Local Server Panel roles registered for unified RBAC governance)
 */
export const CANONICAL_ROLES_SEED = [
  {
    id: CLOUD_SEED_IDS.roles.cloudSuperAdmin,
    code: 'CLOUD_SUPER_ADMIN',
    name: 'Cloud Super Administrator',
    description:
      'Full administrative control over Garvix Cloud Control Plane, signing keys, tenants, and global policies.',
    scope: 'CLOUD_PLATFORM' as const,
    isSystemRole: true,
  },
  {
    id: CLOUD_SEED_IDS.roles.cloudBillingOps,
    code: 'CLOUD_BILLING_OPS',
    name: 'Cloud Billing & Finance Operations',
    description:
      'Manages GST invoices, credit notes, subscriptions, payment reconciliation, and tax compliance.',
    scope: 'CLOUD_PLATFORM' as const,
    isSystemRole: true,
  },
  {
    id: CLOUD_SEED_IDS.roles.cloudReleaseEngineer,
    code: 'CLOUD_RELEASE_ENGINEER',
    name: 'Cloud Release & Update Engineer',
    description:
      'Publishes Ed25519-signed software releases, manages update channels, and monitors fleet rollouts.',
    scope: 'CLOUD_PLATFORM' as const,
    isSystemRole: true,
  },
  {
    id: CLOUD_SEED_IDS.roles.cloudSupportEngineer,
    code: 'CLOUD_SUPPORT_ENGINEER',
    name: 'Cloud Support & Diagnostics Engineer',
    description:
      'Handles support tickets, reviews server heartbeats and diagnostic bundles, and assists customers.',
    scope: 'CLOUD_PLATFORM' as const,
    isSystemRole: true,
  },
  {
    id: CLOUD_SEED_IDS.roles.customerOrgOwner,
    code: 'CUSTOMER_ORG_OWNER',
    name: 'Customer Organization Owner',
    description:
      'Full control over customer organization members, enrolled servers, licenses, billing, and support.',
    scope: 'ORGANIZATION' as const,
    isSystemRole: true,
  },
  {
    id: CLOUD_SEED_IDS.roles.customerOrgBillingAdmin,
    code: 'CUSTOMER_ORG_BILLING_ADMIN',
    name: 'Customer Organization Billing Administrator',
    description:
      'Manages customer GST profile, subscriptions, payment methods, invoices, and license purchases.',
    scope: 'ORGANIZATION' as const,
    isSystemRole: true,
  },
  {
    id: CLOUD_SEED_IDS.roles.serverSuperAdminRef,
    code: 'SERVER_SUPER_ADMIN',
    name: 'Server Super Administrator (Local Panel Root Equivalent)',
    description:
      'Full control over a dedicated customer server panel, hosting packages, resellers, and system services.',
    scope: 'ORGANIZATION' as const,
    isSystemRole: true,
  },
  {
    id: CLOUD_SEED_IDS.roles.resellerAdminRef,
    code: 'RESELLER_ADMIN',
    name: 'Reseller Administrator',
    description:
      'Creates and manages multi-tenant hosting accounts and packages within allocated reseller quotas.',
    scope: 'ORGANIZATION' as const,
    isSystemRole: true,
  },
  {
    id: CLOUD_SEED_IDS.roles.hostingAccountOwnerRef,
    code: 'HOSTING_ACCOUNT_OWNER',
    name: 'Hosting Account Owner',
    description:
      'Manages domains, DNS zones, SSL certificates, email mailboxes, databases, applications, and backups for a single hosting account.',
    scope: 'ORGANIZATION' as const,
    isSystemRole: true,
  },
  {
    id: CLOUD_SEED_IDS.roles.hostingSubUserDeveloperRef,
    code: 'HOSTING_SUBUSER_DEVELOPER',
    name: 'Hosting Sub-User / Developer',
    description:
      'Scoped access to application deployments, logs, databases, and file operations without billing or account deletion rights.',
    scope: 'ORGANIZATION' as const,
    isSystemRole: true,
  },
];

export const CLOUD_PERMISSIONS_SEED = [
  {
    id: '21000000-0000-4000-8000-000000000001',
    key: 'cloud:organizations:manage',
    module: 'IAM',
    description: 'Create, suspend, and configure customer organizations',
    isHighRisk: true,
  },
  {
    id: '21000000-0000-4000-8000-000000000002',
    key: 'cloud:licenses:issue_revoke',
    module: 'LICENSING',
    description: 'Issue, rebind, suspend, or revoke Ed25519-signed server licenses',
    isHighRisk: true,
  },
  {
    id: '21000000-0000-4000-8000-000000000003',
    key: 'cloud:billing:manage_invoices',
    module: 'BILLING',
    description: 'Issue GST invoices, credit notes, and reconcile payment webhooks',
    isHighRisk: true,
  },
  {
    id: '21000000-0000-4000-8000-000000000004',
    key: 'cloud:releases:publish',
    module: 'RELEASES',
    description: 'Publish signed panel/agent release manifests and artifacts',
    isHighRisk: true,
  },
  {
    id: '21000000-0000-4000-8000-000000000005',
    key: 'cloud:support:diagnostics_read',
    module: 'SUPPORT',
    description: 'Inspect customer support tickets, server heartbeats, and diagnostic bundles',
    isHighRisk: false,
  },
  {
    id: '21000000-0000-4000-8000-000000000006',
    key: 'org:servers:enroll',
    module: 'SERVERS',
    description: 'Generate server enrollment tokens and manage mTLS agent certificates',
    isHighRisk: true,
  },
  {
    id: '21000000-0000-4000-8000-000000000007',
    key: 'org:billing:read_pay',
    module: 'BILLING',
    description: 'View organization subscriptions, download GST invoices, and pay dues',
    isHighRisk: false,
  },
];

export const LICENSE_PLANS_SEED = [
  {
    id: CLOUD_SEED_IDS.plans.trial14d,
    code: 'GARVIX_TRIAL_14D',
    name: 'Garvix 14-Day Free Trial',
    tier: 'TRIAL' as const,
    maxAccounts: 5,
    maxServers: 1,
    offlineGraceHours: 24,
    pricePaise: BigInt(0),
    currency: 'INR' as const,
    billingCycle: 'MONTHLY' as const,
    isPublic: true,
    featuresJson: {
      mailStackEnabled: true,
      outboundSmtpRateCapped: true,
      maxOutboundPerHour: 50,
      supportLevel: 'COMMUNITY',
    },
  },
  {
    id: CLOUD_SEED_IDS.plans.starterMonthly,
    code: 'GARVIX_SOLO_MONTHLY',
    name: 'Garvix Solo VPS (Up to 10 Accounts)',
    tier: 'MONTHLY' as const,
    maxAccounts: 10,
    maxServers: 1,
    offlineGraceHours: 72,
    pricePaise: BigInt(99900), // INR 999.00
    currency: 'INR' as const,
    billingCycle: 'MONTHLY' as const,
    isPublic: true,
    featuresJson: {
      mailStackEnabled: true,
      nodejsAppsEnabled: true,
      pythonAppsEnabled: true,
      supportLevel: 'STANDARD',
    },
  },
  {
    id: CLOUD_SEED_IDS.plans.proAnnual,
    code: 'GARVIX_PRO_ANNUAL',
    name: 'Garvix Pro Server Annual (Up to 50 Accounts)',
    tier: 'ANNUAL' as const,
    maxAccounts: 50,
    maxServers: 1,
    offlineGraceHours: 72,
    pricePaise: BigInt(1999000), // INR 19,990.00 / yr
    currency: 'INR' as const,
    billingCycle: 'ANNUAL' as const,
    isPublic: true,
    featuresJson: {
      mailStackEnabled: true,
      resellerModuleEnabled: false,
      s3BackupsEnabled: true,
      supportLevel: 'PRIORITY',
    },
  },
  {
    id: CLOUD_SEED_IDS.plans.resellerMonthly,
    code: 'GARVIX_RESELLER_MONTHLY',
    name: 'Garvix Reseller Hub Monthly (Up to 150 Accounts)',
    tier: 'RESELLER' as const,
    maxAccounts: 150,
    maxServers: 1,
    offlineGraceHours: 72,
    pricePaise: BigInt(349900), // INR 3,499.00 / mo
    currency: 'INR' as const,
    billingCycle: 'MONTHLY' as const,
    isPublic: true,
    featuresJson: {
      mailStackEnabled: true,
      resellerModuleEnabled: true,
      whitelabelBrandingEnabled: true,
      supportLevel: 'PRIORITY',
    },
  },
  {
    id: CLOUD_SEED_IDS.plans.enterpriseAnnual,
    code: 'GARVIX_ENTERPRISE_UNLIMITED',
    name: 'Garvix Data Center Enterprise (Unlimited Accounts)',
    tier: 'ENTERPRISE' as const,
    maxAccounts: 10000,
    maxServers: 10,
    offlineGraceHours: 168,
    pricePaise: BigInt(5999000), // INR 59,990.00 / yr
    currency: 'INR' as const,
    billingCycle: 'ANNUAL' as const,
    isPublic: true,
    featuresJson: {
      mailStackEnabled: true,
      resellerModuleEnabled: true,
      whitelabelBrandingEnabled: true,
      dedicatedFleetPolicies: true,
      supportLevel: 'ENTERPRISE_24X7',
    },
  },
];

export const ORGANIZATIONS_SEED = [
  {
    id: CLOUD_SEED_IDS.organizations.garvixInternal,
    slug: 'garvix-internal-ops',
    name: 'Garvix Software Solutions Pvt Ltd (Internal Ops)',
    legalName: 'Garvix Software Solutions Private Limited',
    status: 'ACTIVE' as const,
    primaryContactEmail: 'platform-ops@garvix.io',
    supportTier: 'INTERNAL',
    metadataJson: { isInternalPlatformOrg: true, region: 'IN-MH' },
  },
  {
    id: CLOUD_SEED_IDS.organizations.acmeCloudHosting,
    slug: 'acme-cloud-india',
    name: 'Acme Cloud Hosting India',
    legalName: 'Acme Cloud Infrastructure India Private Limited',
    status: 'ACTIVE' as const,
    primaryContactEmail: 'noc@acmecloud.in',
    supportTier: 'ENTERPRISE_24X7',
    metadataJson: { fleetSizeTier: 'DATACENTER', onboardingCompleted: true },
  },
  {
    id: CLOUD_SEED_IDS.organizations.indusWebSolutions,
    slug: 'indus-web-solutions',
    name: 'Indus Web Solutions',
    legalName: 'Indus Web Solutions LLP',
    status: 'ACTIVE' as const,
    primaryContactEmail: 'admin@indusweb.co.in',
    supportTier: 'TRIAL',
    metadataJson: { onboardingCompleted: true, trialSource: 'SELF_SERVE' },
  },
];

export const USERS_SEED = [
  {
    id: CLOUD_SEED_IDS.users.superAdmin,
    email: 'root-admin@garvix.io',
    fullName: 'Aarav Mehta (Cloud Super Admin)',
    phoneE164: '+919820000001',
    passwordArgon2Hash:
      '$argon2id$v=19$m=65536,t=3,p=4$R2Fydml4U2FsdDAwMDE$7f9c2b8e5a1d4f6a9b3c8d2e1f0a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a',
    isPlatformStaff: true,
    isEmailVerified: true,
    mfaEnforced: true,
  },
  {
    id: CLOUD_SEED_IDS.users.billingOps,
    email: 'finance-ops@garvix.io',
    fullName: 'Priya Nair (Cloud Billing Ops)',
    phoneE164: '+919820000002',
    passwordArgon2Hash:
      '$argon2id$v=19$m=65536,t=3,p=4$R2Fydml4U2FsdDAwMDI$8a0d3c9f6b2e5a7b0c4d9e3f2a1b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    isPlatformStaff: true,
    isEmailVerified: true,
    mfaEnforced: true,
  },
  {
    id: CLOUD_SEED_IDS.users.releaseEngineer,
    email: 'release-eng@garvix.io',
    fullName: 'Rohan Kulkarni (Cloud Release Engineer)',
    phoneE164: '+919820000003',
    passwordArgon2Hash:
      '$argon2id$v=19$m=65536,t=3,p=4$R2Fydml4U2FsdDAwMDM$9b1e4d0a7c3f6b8c1d5e0f4a3b2c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
    isPlatformStaff: true,
    isEmailVerified: true,
    mfaEnforced: true,
  },
  {
    id: CLOUD_SEED_IDS.users.supportEngineer,
    email: 'support-eng@garvix.io',
    fullName: 'Sneha Iyer (Cloud Support Engineer)',
    phoneE164: '+919820000004',
    passwordArgon2Hash:
      '$argon2id$v=19$m=65536,t=3,p=4$R2Fydml4U2FsdDAwMDQ$0c2f5e1b8d4a7c9d2e6f1a5b4c3d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    isPlatformStaff: true,
    isEmailVerified: true,
    mfaEnforced: true,
  },
  {
    id: CLOUD_SEED_IDS.users.acmeOwner,
    email: 'vikram@acmecloud.in',
    fullName: 'Vikram Deshmukh (Acme Org Owner)',
    phoneE164: '+919820111001',
    passwordArgon2Hash:
      '$argon2id$v=19$m=65536,t=3,p=4$R2Fydml4U2FsdDAwMDU$1d3a6f2c9e5b8d0e3f7a2b6c5d4e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
    isPlatformStaff: false,
    isEmailVerified: true,
    mfaEnforced: true,
  },
  {
    id: CLOUD_SEED_IDS.users.acmeBilling,
    email: 'accounts@acmecloud.in',
    fullName: 'Neha Joshi (Acme Billing Admin)',
    phoneE164: '+919820111002',
    passwordArgon2Hash:
      '$argon2id$v=19$m=65536,t=3,p=4$R2Fydml4U2FsdDAwMDY$2e4b7a3d0f6c9e1f4a8b3c7d6e5f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    isPlatformStaff: false,
    isEmailVerified: true,
    mfaEnforced: true,
  },
  {
    id: CLOUD_SEED_IDS.users.indusTrialOwner,
    email: 'admin@indusweb.co.in',
    fullName: 'Karthik Rao (Indus Trial Owner)',
    phoneE164: '+919845000111',
    passwordArgon2Hash:
      '$argon2id$v=19$m=65536,t=3,p=4$R2Fydml4U2FsdDAwMDc$3f5c8b4e1a7d0f2a5b9c4d8e7f6a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a',
    isPlatformStaff: false,
    isEmailVerified: true,
    mfaEnforced: true,
  },
];

/**
 * Idempotent seed runner for the Garvix Cloud Control Plane PostgreSQL database.
 */
export async function seedCloudDatabase(prisma: any): Promise<void> {
  // 1. Seed canonical roles
  for (const role of CANONICAL_ROLES_SEED) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description,
        scope: role.scope,
        isSystemRole: role.isSystemRole,
      },
      create: role,
    });
  }

  // 2. Seed permissions & map to Cloud Super Admin
  for (const perm of CLOUD_PERMISSIONS_SEED) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {
        module: perm.module,
        description: perm.description,
        isHighRisk: perm.isHighRisk,
      },
      create: perm,
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: CLOUD_SEED_IDS.roles.cloudSuperAdmin,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: CLOUD_SEED_IDS.roles.cloudSuperAdmin,
        permissionId: perm.id,
      },
    });
  }

  // 3. Seed organizations
  for (const org of ORGANIZATIONS_SEED) {
    await prisma.organization.upsert({
      where: { slug: org.slug },
      update: {
        name: org.name,
        legalName: org.legalName,
        status: org.status,
        primaryContactEmail: org.primaryContactEmail,
        supportTier: org.supportTier,
        metadataJson: org.metadataJson,
      },
      create: org,
    });
  }

  // 4. Seed users and authenticators
  for (const user of USERS_SEED) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        phoneE164: user.phoneE164,
        isPlatformStaff: user.isPlatformStaff,
        isEmailVerified: user.isEmailVerified,
      },
      create: {
        ...user,
        emailVerifiedAt: new Date('2026-01-15T10:00:00Z'),
      },
    });
  }

  await prisma.userAuthenticator.upsert({
    where: { id: '31000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '31000000-0000-4000-8000-000000000001',
      userId: CLOUD_SEED_IDS.users.superAdmin,
      type: 'TOTP',
      label: 'YubiKey Authenticator TOTP',
      encryptedSecretCiphertext: 'v1:aes256gcm:8f2e9a4c1d7b6e3f0a5c8d2e9f1b4a7c6d3e0f2a5b8c1d4e',
      secretKeyId: 'kek-cloud-2026-q1',
      secretIv: '9a8b7c6d5e4f3a2b1c0d9e8f',
      secretAuthTag: '1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c',
      recoveryCodeHashesJson: [
        'sha256:4a8b1c9d2e3f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
        'sha256:9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
      ],
      isPrimary: true,
    },
  });

  // 5. Seed organization members & role assignments
  const memberMappings = [
    {
      memberId: '32000000-0000-4000-8000-000000000001',
      memberRoleId: '33000000-0000-4000-8000-000000000001',
      organizationId: CLOUD_SEED_IDS.organizations.garvixInternal,
      userId: CLOUD_SEED_IDS.users.superAdmin,
      roleId: CLOUD_SEED_IDS.roles.cloudSuperAdmin,
    },
    {
      memberId: '32000000-0000-4000-8000-000000000002',
      memberRoleId: '33000000-0000-4000-8000-000000000002',
      organizationId: CLOUD_SEED_IDS.organizations.acmeCloudHosting,
      userId: CLOUD_SEED_IDS.users.acmeOwner,
      roleId: CLOUD_SEED_IDS.roles.customerOrgOwner,
    },
    {
      memberId: '32000000-0000-4000-8000-000000000003',
      memberRoleId: '33000000-0000-4000-8000-000000000003',
      organizationId: CLOUD_SEED_IDS.organizations.acmeCloudHosting,
      userId: CLOUD_SEED_IDS.users.acmeBilling,
      roleId: CLOUD_SEED_IDS.roles.customerOrgBillingAdmin,
    },
    {
      memberId: '32000000-0000-4000-8000-000000000004',
      memberRoleId: '33000000-0000-4000-8000-000000000004',
      organizationId: CLOUD_SEED_IDS.organizations.indusWebSolutions,
      userId: CLOUD_SEED_IDS.users.indusTrialOwner,
      roleId: CLOUD_SEED_IDS.roles.customerOrgOwner,
    },
  ];

  for (const m of memberMappings) {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: m.organizationId,
          userId: m.userId,
        },
      },
      update: { status: 'ACTIVE' },
      create: {
        id: m.memberId,
        organizationId: m.organizationId,
        userId: m.userId,
        status: 'ACTIVE',
        joinedAt: new Date('2026-01-15T10:05:00Z'),
      },
    });

    await prisma.organizationMemberRole.upsert({
      where: {
        organizationMemberId_roleId: {
          organizationMemberId: m.memberId,
          roleId: m.roleId,
        },
      },
      update: {},
      create: {
        id: m.memberRoleId,
        organizationId: m.organizationId,
        organizationMemberId: m.memberId,
        roleId: m.roleId,
      },
    });
  }

  // 6. Seed GST customer profiles
  await prisma.customerProfile.upsert({
    where: { organizationId: CLOUD_SEED_IDS.organizations.acmeCloudHosting },
    update: {},
    create: {
      id: '34000000-0000-4000-8000-000000000001',
      organizationId: CLOUD_SEED_IDS.organizations.acmeCloudHosting,
      legalEntityName: 'Acme Cloud Infrastructure India Private Limited',
      gstin: '27AABCA1234F1Z5',
      panNumber: 'AABCA1234F',
      billingAddressLine1: 'Level 8, Vibgyor Towers, Bandra Kurla Complex',
      city: 'Mumbai',
      stateName: 'Maharashtra',
      stateCode: '27',
      postalCode: '400051',
      countryCode: 'IN',
      taxExemptionStatus: 'NONE',
      currency: 'INR',
      billingEmail: 'accounts@acmecloud.in',
    },
  });

  await prisma.customerProfile.upsert({
    where: { organizationId: CLOUD_SEED_IDS.organizations.indusWebSolutions },
    update: {},
    create: {
      id: '34000000-0000-4000-8000-000000000002',
      organizationId: CLOUD_SEED_IDS.organizations.indusWebSolutions,
      legalEntityName: 'Indus Web Solutions LLP',
      gstin: '29AAEFI5678G1Z2',
      panNumber: 'AAEFI5678G',
      billingAddressLine1: '100 Feet Road, Indiranagar',
      city: 'Bengaluru',
      stateName: 'Karnataka',
      stateCode: '29',
      postalCode: '560038',
      countryCode: 'IN',
      taxExemptionStatus: 'NONE',
      currency: 'INR',
      billingEmail: 'admin@indusweb.co.in',
    },
  });

  // 7. Seed update channels & software releases
  for (const ch of [
    {
      id: CLOUD_SEED_IDS.channels.stable,
      name: 'STABLE' as const,
      description: 'Production-hardened releases for customer hosting servers',
      isDefault: true,
    },
    {
      id: CLOUD_SEED_IDS.channels.beta,
      name: 'BETA' as const,
      description: 'Early-access feature channel for staging servers',
      isDefault: false,
    },
    {
      id: CLOUD_SEED_IDS.channels.security,
      name: 'SECURITY' as const,
      description: 'Emergency zero-day and critical CVE hotfix channel',
      isDefault: false,
    },
  ]) {
    await prisma.updateChannel.upsert({
      where: { name: ch.name },
      update: { description: ch.description, isDefault: ch.isDefault },
      create: ch,
    });
  }

  await prisma.softwareRelease.upsert({
    where: {
      component_version: {
        component: 'PANEL',
        version: '2.4.0',
      },
    },
    update: {},
    create: {
      id: CLOUD_SEED_IDS.releases.panelStable240,
      version: '2.4.0',
      channelId: CLOUD_SEED_IDS.channels.stable,
      component: 'PANEL',
      minOsVersion: '22.04',
      ed25519ManifestSignature:
        'ed25519:7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
      ed25519SigningKeyId: 'garvix-release-key-2026-01',
      releaseNotes: 'Garvix Hosting Manager 2.4.0 with cgroups v2 per-tenant enforcement and Restic S3 verification.',
      isCriticalSecurity: false,
      publishedAt: new Date('2026-02-01T00:00:00Z'),
    },
  });

  await prisma.releaseArtifact.upsert({
    where: {
      releaseId_osTarget_arch: {
        releaseId: CLOUD_SEED_IDS.releases.panelStable240,
        osTarget: 'UBUNTU',
        arch: 'X86_64',
      },
    },
    update: {},
    create: {
      id: 'a1000000-0000-4000-8000-000000000001',
      releaseId: CLOUD_SEED_IDS.releases.panelStable240,
      osTarget: 'UBUNTU',
      arch: 'X86_64',
      downloadUrl: 'https://releases.garvix.io/panel/2.4.0/garvix-panel_2.4.0_ubuntu_amd64.tar.zst',
      sha256Checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      ed25519Signature:
        'ed25519:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      sizeBytes: BigInt(48234496),
    },
  });

  // 8. Seed license plans
  for (const plan of LICENSE_PLANS_SEED) {
    await prisma.licensePlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        pricePaise: plan.pricePaise,
        maxAccounts: plan.maxAccounts,
        featuresJson: plan.featuresJson,
      },
      create: plan,
    });
  }

  // 9. Seed servers, enrollments, mTLS certificates & heartbeats
  await prisma.server.upsert({
    where: { hardwareFingerprint: 'hwfp-sha256-acme-mum01-9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c' },
    update: {},
    create: {
      id: CLOUD_SEED_IDS.servers.acmeProdMum01,
      organizationId: CLOUD_SEED_IDS.organizations.acmeCloudHosting,
      hostname: 'mum01.acmecloud.in',
      displayName: 'Mumbai Production Hosting Node 01',
      hardwareFingerprint: 'hwfp-sha256-acme-mum01-9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c',
      machineIdHash: 'sha256:6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
      osFamily: 'UBUNTU',
      osVersion: '24.04 LTS',
      kernelVersion: '6.8.0-45-generic',
      cpuArch: 'X86_64',
      cpuCores: 32,
      ramTotalMb: 131072,
      diskCapacityGb: 2000,
      primaryIp: '103.21.58.10',
      ipv6Address: '2401:4900:1000::10',
      enrollmentStatus: 'MTLS_ACTIVE',
      updateChannelId: CLOUD_SEED_IDS.channels.stable,
      installedPanelVer: '2.4.0',
      installedAgentVer: '2.4.0',
      lastHeartbeatAt: new Date('2026-10-19T06:00:00Z'),
    },
  });

  await prisma.server.upsert({
    where: { hardwareFingerprint: 'hwfp-sha256-indus-blr01-1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d' },
    update: {},
    create: {
      id: CLOUD_SEED_IDS.servers.indusTrialBlr01,
      organizationId: CLOUD_SEED_IDS.organizations.indusWebSolutions,
      hostname: 'host01.indusweb.co.in',
      displayName: 'Bengaluru Trial VPS 01',
      hardwareFingerprint: 'hwfp-sha256-indus-blr01-1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
      machineIdHash: 'sha256:d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35',
      osFamily: 'ALMALINUX',
      osVersion: '9.4',
      kernelVersion: '5.14.0-427.el9.x86_64',
      cpuArch: 'X86_64',
      cpuCores: 4,
      ramTotalMb: 8192,
      diskCapacityGb: 160,
      primaryIp: '103.45.12.88',
      enrollmentStatus: 'MTLS_ACTIVE',
      updateChannelId: CLOUD_SEED_IDS.channels.stable,
      installedPanelVer: '2.4.0',
      installedAgentVer: '2.4.0',
      lastHeartbeatAt: new Date('2026-10-19T06:00:00Z'),
    },
  });

  // 10. Seed subscriptions, licenses & entitlements
  await prisma.subscription.upsert({
    where: { id: CLOUD_SEED_IDS.subscriptions.acmeEnterpriseSub },
    update: {},
    create: {
      id: CLOUD_SEED_IDS.subscriptions.acmeEnterpriseSub,
      organizationId: CLOUD_SEED_IDS.organizations.acmeCloudHosting,
      planId: CLOUD_SEED_IDS.plans.enterpriseAnnual,
      billingCycle: 'ANNUAL',
      status: 'ACTIVE',
      quantity: 1,
      currentPeriodStart: new Date('2026-01-01T00:00:00Z'),
      currentPeriodEnd: new Date('2027-01-01T00:00:00Z'),
      cancelAtPeriodEnd: false,
      provider: 'RAZORPAY',
      providerSubscriptionId: 'sub_RzpAcmeEnt202601',
    },
  });

  await prisma.license.upsert({
    where: {
      licenseKeyHash: 'sha256:8f4e2c1b9a0d7e6f5c4b3a2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f',
    },
    update: {},
    create: {
      id: CLOUD_SEED_IDS.licenses.acmeEnterpriseLicense,
      organizationId: CLOUD_SEED_IDS.organizations.acmeCloudHosting,
      planId: CLOUD_SEED_IDS.plans.enterpriseAnnual,
      subscriptionId: CLOUD_SEED_IDS.subscriptions.acmeEnterpriseSub,
      boundServerId: CLOUD_SEED_IDS.servers.acmeProdMum01,
      licenseKeyPrefix: 'GVX-ENT-2026-MUM1',
      licenseKeyHash: 'sha256:8f4e2c1b9a0d7e6f5c4b3a2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f',
      status: 'ACTIVE',
      ed25519KeyId: 'garvix-license-ed25519-2026',
      ed25519Signature:
        'ed25519:sig_acme_ent_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f',
      signedPayloadJson: {
        licenseId: CLOUD_SEED_IDS.licenses.acmeEnterpriseLicense,
        tier: 'ENTERPRISE',
        maxAccounts: 10000,
        boundHardwareFingerprint: 'hwfp-sha256-acme-mum01-9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c',
        offlineGraceHours: 168,
      },
      issuedAt: new Date('2026-01-01T00:00:00Z'),
      expiresAt: new Date('2027-01-01T00:00:00Z'),
      graceEndsAt: new Date('2027-01-08T00:00:00Z'),
      lastValidatedAt: new Date('2026-10-19T06:00:00Z'),
    },
  });

  await prisma.license.upsert({
    where: {
      licenseKeyHash: 'sha256:1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
    },
    update: {},
    create: {
      id: CLOUD_SEED_IDS.licenses.indusTrialLicense,
      organizationId: CLOUD_SEED_IDS.organizations.indusWebSolutions,
      planId: CLOUD_SEED_IDS.plans.trial14d,
      boundServerId: CLOUD_SEED_IDS.servers.indusTrialBlr01,
      licenseKeyPrefix: 'GVX-TRL-2026-BLR1',
      licenseKeyHash: 'sha256:1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
      status: 'ACTIVE',
      ed25519KeyId: 'garvix-license-ed25519-2026',
      ed25519Signature:
        'ed25519:sig_indus_trl_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
      signedPayloadJson: {
        licenseId: CLOUD_SEED_IDS.licenses.indusTrialLicense,
        tier: 'TRIAL',
        maxAccounts: 5,
        boundHardwareFingerprint: 'hwfp-sha256-indus-blr01-1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
        offlineGraceHours: 24,
      },
      issuedAt: new Date('2026-10-10T00:00:00Z'),
      expiresAt: new Date('2026-10-24T00:00:00Z'),
      graceEndsAt: new Date('2026-10-25T00:00:00Z'),
      lastValidatedAt: new Date('2026-10-19T06:00:00Z'),
    },
  });

  // 11. Seed GST Invoice & Payment for Acme Cloud Hosting (Intra-state Maharashtra CGST 9% + SGST 9%)
  await prisma.invoice.upsert({
    where: { invoiceNumber: 'GVX-INV-2026-27-0001' },
    update: {},
    create: {
      id: CLOUD_SEED_IDS.invoices.acmeTaxInvoice001,
      invoiceNumber: 'GVX-INV-2026-27-0001',
      organizationId: CLOUD_SEED_IDS.organizations.acmeCloudHosting,
      subscriptionId: CLOUD_SEED_IDS.subscriptions.acmeEnterpriseSub,
      currency: 'INR',
      subtotalPaise: BigInt(5999000), // INR 59,990.00
      cgstPaise: BigInt(539910), // 9% CGST = INR 5,399.10
      sgstPaise: BigInt(539910), // 9% SGST = INR 5,399.10
      igstPaise: BigInt(0),
      totalPaise: BigInt(7078820), // INR 70,788.20
      customerGstin: '27AABCA1234F1Z5',
      supplierGstin: '27AAFCG9876K1Z1',
      placeOfSupply: '27-Maharashtra',
      status: 'PAID',
      issuedAt: new Date('2026-01-01T00:05:00Z'),
      dueAt: new Date('2026-01-08T00:05:00Z'),
      paidAt: new Date('2026-01-01T00:06:12Z'),
      pdfStorageRef: 's3://garvix-billing-archive-in/2026-27/GVX-INV-2026-27-0001.pdf',
      immutableHash: 'sha256:inv_0001_5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
    },
  });

  await prisma.invoiceItem.upsert({
    where: { id: '91000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '91000000-0000-4000-8000-000000000001',
      organizationId: CLOUD_SEED_IDS.organizations.acmeCloudHosting,
      invoiceId: CLOUD_SEED_IDS.invoices.acmeTaxInvoice001,
      description: 'Garvix Data Center Enterprise Annual License (mum01.acmecloud.in)',
      sacCode: '998315',
      quantity: 1,
      unitPricePaise: BigInt(5999000),
      amountPaise: BigInt(5999000),
      taxRateBps: 1800,
    },
  });

  await prisma.payment.upsert({
    where: { idempotencyKey: 'idem-rzp-pay-acme-2026-0001' },
    update: {},
    create: {
      id: '92000000-0000-4000-8000-000000000001',
      invoiceId: CLOUD_SEED_IDS.invoices.acmeTaxInvoice001,
      organizationId: CLOUD_SEED_IDS.organizations.acmeCloudHosting,
      provider: 'RAZORPAY',
      providerPaymentId: 'pay_Rzp998877665544',
      providerOrderId: 'order_Rzp112233445566',
      amountPaise: BigInt(7078820),
      currency: 'INR',
      status: 'CAPTURED',
      paymentMethod: 'NETBANKING_CORPORATE',
      idempotencyKey: 'idem-rzp-pay-acme-2026-0001',
      paidAt: new Date('2026-01-01T00:06:12Z'),
    },
  });
}

if (typeof require !== 'undefined' && require.main === module) {
  // Optional standalone CLI execution when Prisma client is generated
  console.log('Garvix Cloud Control Plane seed module loaded. Ready to execute seedCloudDatabase().');
}
