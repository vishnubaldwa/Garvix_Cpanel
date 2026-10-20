/**
 * Garvix Hosting Manager — Customer Local Hosting Panel Deterministic Seed Script
 * Garvix Software Solutions Pvt Ltd
 *
 * Exports deterministic seed fixtures for unit/integration tests and provides
 * an idempotent `seedLocalDatabase` runner for local development (`DATABASE_LOCAL_URL`).
 */

export const LOCAL_SEED_IDS = {
  roles: {
    serverSuperAdmin: 'b0000000-0000-4000-8000-000000000001',
    resellerAdmin: 'b0000000-0000-4000-8000-000000000002',
    hostingAccountOwner: 'b0000000-0000-4000-8000-000000000003',
    hostingSubUserDeveloper: 'b0000000-0000-4000-8000-000000000004',
  },
  users: {
    serverAdmin: 'b1000000-0000-4000-8000-000000000001',
    resellerPartner: 'b1000000-0000-4000-8000-000000000002',
    veloxOwner: 'b1000000-0000-4000-8000-000000000003',
    kaveriOwner: 'b1000000-0000-4000-8000-000000000004',
    veloxDevSubUser: 'b1000000-0000-4000-8000-000000000005',
  },
  packages: {
    sharedStarter: 'b2000000-0000-4000-8000-000000000001',
    businessPro: 'b2000000-0000-4000-8000-000000000002',
    resellerGold: 'b2000000-0000-4000-8000-000000000003',
  },
  accounts: {
    veloxShop: 'b3000000-0000-4000-8000-000000000001',
    kaveriTech: 'b3000000-0000-4000-8000-000000000002',
  },
  domains: {
    veloxPrimary: 'b4000000-0000-4000-8000-000000000001',
    veloxApiSubdomain: 'b4000000-0000-4000-8000-000000000002',
    kaveriPrimary: 'b4000000-0000-4000-8000-000000000003',
  },
  dnsZones: {
    veloxZone: 'b5000000-0000-4000-8000-000000000001',
    kaveriZone: 'b5000000-0000-4000-8000-000000000002',
  },
  emailDomains: {
    veloxEmailDomain: 'b6000000-0000-4000-8000-000000000001',
    kaveriEmailDomain: 'b6000000-0000-4000-8000-000000000002',
  },
  mailboxes: {
    veloxOrders: 'b6100000-0000-4000-8000-000000000001',
    veloxSupport: 'b6100000-0000-4000-8000-000000000002',
    kaveriInfo: 'b6100000-0000-4000-8000-000000000003',
  },
  dbInstances: {
    customerMariaDb: 'b7000000-0000-4000-8000-000000000001',
    customerPostgres: 'b7000000-0000-4000-8000-000000000002',
  },
  hostedDbs: {
    veloxShopMariaDb: 'b7100000-0000-4000-8000-000000000001',
    veloxAnalyticsPg: 'b7100000-0000-4000-8000-000000000002',
  },
  dbAccounts: {
    veloxMariaUser: 'b7200000-0000-4000-8000-000000000001',
    veloxPgUser: 'b7200000-0000-4000-8000-000000000002',
  },
  applications: {
    veloxStorefrontPhp: 'b8000000-0000-4000-8000-000000000001',
    veloxOrderServiceNode: 'b8000000-0000-4000-8000-000000000002',
  },
  backupPolicies: {
    veloxNightlyRestic: 'b9000000-0000-4000-8000-000000000001',
  },
  backupJobs: {
    veloxCompletedBackupJob: 'b9100000-0000-4000-8000-000000000001',
  },
  backupArtifacts: {
    veloxResticSnapshot01: 'b9200000-0000-4000-8000-000000000001',
  },
} as const;

export const LOCAL_ROLES_SEED = [
  {
    id: LOCAL_SEED_IDS.roles.serverSuperAdmin,
    code: 'SERVER_SUPER_ADMIN',
    name: 'Server Super Administrator',
    description:
      'Unrestricted root-equivalent control over the local hosting panel, packages, resellers, system services, and security settings.',
    permissionsJson: ['*'],
    isSystemRole: true,
  },
  {
    id: LOCAL_SEED_IDS.roles.resellerAdmin,
    code: 'RESELLER_ADMIN',
    name: 'Reseller Administrator',
    description:
      'Multi-tenant reseller authority to create/suspend owned hosting accounts and packages within reseller resource boundaries.',
    permissionsJson: [
      'reseller:packages:manage',
      'reseller:accounts:create',
      'reseller:accounts:suspend',
      'reseller:accounts:impersonate',
      'reseller:usage:read',
    ],
    isSystemRole: true,
  },
  {
    id: LOCAL_SEED_IDS.roles.hostingAccountOwner,
    code: 'HOSTING_ACCOUNT_OWNER',
    name: 'Hosting Account Owner',
    description:
      'Full tenant-scoped management of domains, DNS zones, SSL, email mailboxes, databases, apps, cron tasks, and backups.',
    permissionsJson: [
      'account:domains:manage',
      'account:dns:manage',
      'account:ssl:manage',
      'account:email:manage',
      'account:databases:manage',
      'account:apps:manage',
      'account:files:manage',
      'account:cron:manage',
      'account:backups:manage',
    ],
    isSystemRole: true,
  },
  {
    id: LOCAL_SEED_IDS.roles.hostingSubUserDeveloper,
    code: 'HOSTING_SUBUSER_DEVELOPER',
    name: 'Hosting Sub-User / Developer',
    description:
      'Scoped developer access to deploy applications, manage environment variables, view logs, and manage workload databases.',
    permissionsJson: [
      'account:apps:deploy',
      'account:apps:logs',
      'account:databases:read_write',
      'account:files:manage',
      'account:cron:manage',
    ],
    isSystemRole: true,
  },
];

export const LOCAL_USERS_SEED = [
  {
    id: LOCAL_SEED_IDS.users.serverAdmin,
    roleId: LOCAL_SEED_IDS.roles.serverSuperAdmin,
    resellerId: null,
    username: 'garvixadmin',
    email: 'noc@acmecloud.in',
    fullName: 'Vikram Deshmukh (Server Super Admin)',
    passwordArgon2Hash:
      '$argon2id$v=19$m=65536,t=3,p=4$TG9jYWxTYWx0MDAwMQ$1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    mfaEnabled: true,
    totpEncryptedCiphertext: 'v1:aes256gcm:4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f',
    totpKeyId: 'kek-local-node-2026-01',
    totpIv: '1a2b3c4d5e6f7a8b9c0d1e2f',
    totpAuthTag: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c',
    status: 'ACTIVE' as const,
  },
  {
    id: LOCAL_SEED_IDS.users.resellerPartner,
    roleId: LOCAL_SEED_IDS.roles.resellerAdmin,
    resellerId: null,
    username: 'deccanhost',
    email: 'ops@deccanhost.in',
    fullName: 'Siddharth Patil (DeccanHost Reseller)',
    passwordArgon2Hash:
      '$argon2id$v=19$m=65536,t=3,p=4$TG9jYWxTYWx0MDAwMg$2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
    mfaEnabled: true,
    totpEncryptedCiphertext: 'v1:aes256gcm:5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a',
    totpKeyId: 'kek-local-node-2026-01',
    totpIv: '2b3c4d5e6f7a8b9c0d1e2f3a',
    totpAuthTag: '8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b',
    status: 'ACTIVE' as const,
  },
  {
    id: LOCAL_SEED_IDS.users.veloxOwner,
    roleId: LOCAL_SEED_IDS.roles.hostingAccountOwner,
    resellerId: LOCAL_SEED_IDS.users.resellerPartner,
    username: 'veloxshop',
    email: 'founder@veloxshop.in',
    fullName: 'Ananya Sharma (VeloxShop Owner)',
    passwordArgon2Hash:
      '$argon2id$v=19$m=65536,t=3,p=4$TG9jYWxTYWx0MDAwMw$3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    mfaEnabled: true,
    totpEncryptedCiphertext: 'v1:aes256gcm:6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
    totpKeyId: 'kek-local-node-2026-01',
    totpIv: '3c4d5e6f7a8b9c0d1e2f3a4b',
    totpAuthTag: '7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a',
    status: 'ACTIVE' as const,
  },
  {
    id: LOCAL_SEED_IDS.users.kaveriOwner,
    roleId: LOCAL_SEED_IDS.roles.hostingAccountOwner,
    resellerId: LOCAL_SEED_IDS.users.resellerPartner,
    username: 'kaveritech',
    email: 'admin@kaveritech.co.in',
    fullName: 'Deepak Sundaram (KaveriTech Owner)',
    passwordArgon2Hash:
      '$argon2id$v=19$m=65536,t=3,p=4$TG9jYWxTYWx0MDAwNA$4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
    mfaEnabled: true,
    totpEncryptedCiphertext: null,
    totpKeyId: null,
    totpIv: null,
    totpAuthTag: null,
    status: 'ACTIVE' as const,
  },
  {
    id: LOCAL_SEED_IDS.users.veloxDevSubUser,
    roleId: LOCAL_SEED_IDS.roles.hostingSubUserDeveloper,
    resellerId: LOCAL_SEED_IDS.users.resellerPartner,
    username: 'velox_dev',
    email: 'devops@veloxshop.in',
    fullName: 'Harshita Verma (Velox Lead Developer)',
    passwordArgon2Hash:
      '$argon2id$v=19$m=65536,t=3,p=4$TG9jYWxTYWx0MDAwNQ$5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    mfaEnabled: true,
    totpEncryptedCiphertext: null,
    totpKeyId: null,
    totpIv: null,
    totpAuthTag: null,
    status: 'ACTIVE' as const,
  },
];

export const HOSTING_PACKAGES_SEED = [
  {
    id: LOCAL_SEED_IDS.packages.sharedStarter,
    resellerId: LOCAL_SEED_IDS.users.resellerPartner,
    code: 'PKG_SHARED_STARTER_10G',
    name: 'NVMe Starter Hosting (10 GB / 1 vCPU)',
    description: 'Entry-level Linux hosting package with cgroups v2 isolation and automated SSL.',
    isResellerPlan: false,
    limits: {
      id: 'b2100000-0000-4000-8000-000000000001',
      diskQuotaMb: 10240,
      inodeSoftLimit: 150000,
      inodeHardLimit: 200000,
      bandwidthMonthlyMb: 102400,
      cpuQuotaPercent: 100,
      memoryMaxMb: 1024,
      ioReadBps: BigInt(52428800),
      ioWriteBps: BigInt(52428800),
      pidsMax: 100,
      maxAddonDomains: 3,
      maxSubdomains: 25,
      maxDomainAliases: 10,
      maxEmailDomains: 3,
      maxMailboxes: 15,
      mailboxMaxQuotaMb: 2048,
      hourlyOutboundMailLimit: 100,
      maxDatabases: 5,
      maxApplications: 2,
      sshAccessAllowed: false,
      dedicatedIpAllowed: false,
    },
  },
  {
    id: LOCAL_SEED_IDS.packages.businessPro,
    resellerId: LOCAL_SEED_IDS.users.resellerPartner,
    code: 'PKG_BUSINESS_PRO_50G',
    name: 'NVMe Business Commerce Pro (50 GB / 2 vCPU / 4 GB RAM)',
    description: 'High-throughput e-commerce package with Node.js/PHP-FPM workers and S3 Restic backups.',
    isResellerPlan: false,
    limits: {
      id: 'b2100000-0000-4000-8000-000000000002',
      diskQuotaMb: 51200,
      inodeSoftLimit: 500000,
      inodeHardLimit: 600000,
      bandwidthMonthlyMb: 512000,
      cpuQuotaPercent: 200,
      memoryMaxMb: 4096,
      ioReadBps: BigInt(104857600),
      ioWriteBps: BigInt(104857600),
      pidsMax: 250,
      maxAddonDomains: 20,
      maxSubdomains: 100,
      maxDomainAliases: 50,
      maxEmailDomains: 20,
      maxMailboxes: 100,
      mailboxMaxQuotaMb: 10240,
      hourlyOutboundMailLimit: 500,
      maxDatabases: 25,
      maxApplications: 10,
      sshAccessAllowed: true,
      dedicatedIpAllowed: true,
    },
  },
];

/**
 * Idempotent seed runner for the Garvix Customer Local Hosting Panel PostgreSQL database.
 */
export async function seedLocalDatabase(prisma: any): Promise<void> {
  // 1. Seed Local Roles
  for (const role of LOCAL_ROLES_SEED) {
    await prisma.localRole.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description,
        permissionsJson: role.permissionsJson,
      },
      create: role,
    });
  }

  // 2. Seed Local Users
  for (const user of LOCAL_USERS_SEED) {
    await prisma.localUser.upsert({
      where: { username: user.username },
      update: {
        email: user.email,
        fullName: user.fullName,
        roleId: user.roleId,
        resellerId: user.resellerId,
      },
      create: user,
    });
  }

  // 3. Seed Hosting Packages & Package Limits
  for (const pkg of HOSTING_PACKAGES_SEED) {
    await prisma.hostingPackage.upsert({
      where: { code: pkg.code },
      update: {
        name: pkg.name,
        description: pkg.description,
        resellerId: pkg.resellerId,
      },
      create: {
        id: pkg.id,
        resellerId: pkg.resellerId,
        code: pkg.code,
        name: pkg.name,
        description: pkg.description,
        isResellerPlan: pkg.isResellerPlan,
      },
    });

    await prisma.packageLimit.upsert({
      where: { packageId: pkg.id },
      update: {},
      create: {
        ...pkg.limits,
        packageId: pkg.id,
        resellerId: pkg.resellerId,
      },
    });
  }

  // 4. Seed Hosting Accounts & Account Allocations
  await prisma.hostingAccount.upsert({
    where: { linuxUsername: 'veloxshop' },
    update: {},
    create: {
      id: LOCAL_SEED_IDS.accounts.veloxShop,
      ownerUserId: LOCAL_SEED_IDS.users.veloxOwner,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      packageId: LOCAL_SEED_IDS.packages.businessPro,
      linuxUsername: 'veloxshop',
      linuxUid: 2001,
      linuxGid: 2001,
      homeDirectory: '/home/veloxshop',
      primaryDomainName: 'veloxshop.in',
      status: 'ACTIVE',
      sshShell: '/bin/bash',
      cgroupSliceName: 'garvix-tenant-veloxshop.slice',
    },
  });

  await prisma.accountAllocation.upsert({
    where: { accountId: LOCAL_SEED_IDS.accounts.veloxShop },
    update: {},
    create: {
      id: 'b3100000-0000-4000-8000-000000000001',
      accountId: LOCAL_SEED_IDS.accounts.veloxShop,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      diskQuotaMb: 51200,
      diskUsedMb: 4820,
      inodeSoftLimit: 500000,
      inodeHardLimit: 600000,
      inodesUsed: 42150,
      bandwidthMonthlyMb: 512000,
      bandwidthUsedMb: 38400,
      cpuQuotaPercent: 200,
      memoryMaxMb: 4096,
      ioReadBps: BigInt(104857600),
      ioWriteBps: BigInt(104857600),
      pidsMax: 250,
      lastQuotaSyncedAt: new Date('2026-10-19T06:00:00Z'),
    },
  });

  await prisma.hostingAccount.upsert({
    where: { linuxUsername: 'kaveritech' },
    update: {},
    create: {
      id: LOCAL_SEED_IDS.accounts.kaveriTech,
      ownerUserId: LOCAL_SEED_IDS.users.kaveriOwner,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      packageId: LOCAL_SEED_IDS.packages.sharedStarter,
      linuxUsername: 'kaveritech',
      linuxUid: 2002,
      linuxGid: 2002,
      homeDirectory: '/home/kaveritech',
      primaryDomainName: 'kaveritech.co.in',
      status: 'ACTIVE',
      sshShell: '/usr/sbin/nologin',
      cgroupSliceName: 'garvix-tenant-kaveritech.slice',
    },
  });

  await prisma.accountAllocation.upsert({
    where: { accountId: LOCAL_SEED_IDS.accounts.kaveriTech },
    update: {},
    create: {
      id: 'b3100000-0000-4000-8000-000000000002',
      accountId: LOCAL_SEED_IDS.accounts.kaveriTech,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      diskQuotaMb: 10240,
      diskUsedMb: 920,
      inodeSoftLimit: 150000,
      inodeHardLimit: 200000,
      inodesUsed: 8400,
      bandwidthMonthlyMb: 102400,
      bandwidthUsedMb: 5120,
      cpuQuotaPercent: 100,
      memoryMaxMb: 1024,
      ioReadBps: BigInt(52428800),
      ioWriteBps: BigInt(52428800),
      pidsMax: 100,
      lastQuotaSyncedAt: new Date('2026-10-19T06:00:00Z'),
    },
  });

  // 5. Seed Domains, Aliases, DNS Zones, DNS Records & SSL Certificates
  await prisma.domain.upsert({
    where: { domainName: 'veloxshop.in' },
    update: {},
    create: {
      id: LOCAL_SEED_IDS.domains.veloxPrimary,
      accountId: LOCAL_SEED_IDS.accounts.veloxShop,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      domainName: 'veloxshop.in',
      type: 'PRIMARY',
      status: 'ACTIVE',
      documentRoot: '/home/veloxshop/domains/veloxshop.in/public_html',
      webServerEngine: 'NGINX',
      phpVersion: 'PHP_8_3',
      forceHttps: true,
      hstsEnabled: true,
      http3Enabled: true,
      openBasedirEnabled: true,
      vhostConfigHash: 'sha256:9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
    },
  });

  await prisma.domainAlias.upsert({
    where: { aliasDomainName: 'veloxshop.com' },
    update: {},
    create: {
      id: 'b4100000-0000-4000-8000-000000000001',
      accountId: LOCAL_SEED_IDS.accounts.veloxShop,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      domainId: LOCAL_SEED_IDS.domains.veloxPrimary,
      aliasDomainName: 'veloxshop.com',
      redirectHttp301: true,
      isActive: true,
    },
  });

  await prisma.dnsZone.upsert({
    where: { zoneName: 'veloxshop.in' },
    update: {},
    create: {
      id: LOCAL_SEED_IDS.dnsZones.veloxZone,
      accountId: LOCAL_SEED_IDS.accounts.veloxShop,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      domainId: LOCAL_SEED_IDS.domains.veloxPrimary,
      zoneName: 'veloxshop.in',
      soaPrimaryNs: 'ns1.acmecloud.in',
      soaHostmasterEmail: 'dns-admin.veloxshop.in',
      soaSerial: BigInt(2026101901),
      dnssecEnabled: true,
      dnssecKeyTag: 2371,
    },
  });

  const veloxDnsRecords = [
    {
      id: 'b5100000-0000-4000-8000-000000000001',
      name: '@',
      type: 'A' as const,
      content: '103.21.58.10',
      ttl: 3600,
      priority: null,
      isSystemManaged: true,
    },
    {
      id: 'b5100000-0000-4000-8000-000000000002',
      name: 'mail',
      type: 'A' as const,
      content: '103.21.58.10',
      ttl: 3600,
      priority: null,
      isSystemManaged: true,
    },
    {
      id: 'b5100000-0000-4000-8000-000000000003',
      name: '@',
      type: 'MX' as const,
      content: 'mail.veloxshop.in',
      ttl: 3600,
      priority: 10,
      isSystemManaged: true,
    },
    {
      id: 'b5100000-0000-4000-8000-000000000004',
      name: '@',
      type: 'TXT' as const,
      content: 'v=spf1 ip4:103.21.58.10 a mx ~all',
      ttl: 3600,
      priority: null,
      isSystemManaged: true,
    },
    {
      id: 'b5100000-0000-4000-8000-000000000005',
      name: '_dmarc',
      type: 'TXT' as const,
      content: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@veloxshop.in; pct=100',
      ttl: 3600,
      priority: null,
      isSystemManaged: true,
    },
  ];

  for (const rec of veloxDnsRecords) {
    await prisma.dnsRecord.upsert({
      where: { id: rec.id },
      update: {},
      create: {
        ...rec,
        accountId: LOCAL_SEED_IDS.accounts.veloxShop,
        resellerId: LOCAL_SEED_IDS.users.resellerPartner,
        zoneId: LOCAL_SEED_IDS.dnsZones.veloxZone,
      },
    });
  }

  await prisma.sslCertificate.upsert({
    where: {
      sha256Fingerprint: 'sha256:cert_velox_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b',
    },
    update: {},
    create: {
      id: 'b5200000-0000-4000-8000-000000000001',
      accountId: LOCAL_SEED_IDS.accounts.veloxShop,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      domainId: LOCAL_SEED_IDS.domains.veloxPrimary,
      provider: 'LETS_ENCRYPT',
      challengeType: 'HTTP_01',
      commonName: 'veloxshop.in',
      sanDomainsJson: ['veloxshop.in', 'www.veloxshop.in', 'mail.veloxshop.in'],
      serialNumberHex: '04A8F9C1E2B3D4F5A6B7C8D9E0F1A2B3C4D5',
      sha256Fingerprint: 'sha256:cert_velox_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b',
      certificateChainPem: '-----BEGIN CERTIFICATE-----\nMIIFazCCA1OgAwIBAgIRA...\n-----END CERTIFICATE-----',
      encryptedPrivateKeyCiphertext:
        'v1:aes256gcm:7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e',
      privateKeyId: 'kek-local-node-2026-01',
      privateKeyIv: '4d5e6f7a8b9c0d1e2f3a4b5c',
      privateKeyAuthTag: '6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f',
      status: 'ACTIVE',
      autoRenew: true,
      issuedAt: new Date('2026-09-15T00:00:00Z'),
      expiresAt: new Date('2026-12-14T00:00:00Z'),
    },
  });

  // 6. Seed Email Domains, Mailboxes, Policies & Usage
  await prisma.emailDomain.upsert({
    where: { domainName: 'veloxshop.in' },
    update: {},
    create: {
      id: LOCAL_SEED_IDS.emailDomains.veloxEmailDomain,
      accountId: LOCAL_SEED_IDS.accounts.veloxShop,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      domainId: LOCAL_SEED_IDS.domains.veloxPrimary,
      domainName: 'veloxshop.in',
      dkimSelector: 'garvix',
      dkimPublicKeyTxt: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...',
      dkimEncryptedKeyCiphertext:
        'v1:aes256gcm:8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
      dkimKeyId: 'kek-local-node-2026-01',
      dkimIv: '5e6f7a8b9c0d1e2f3a4b5c6d',
      dkimAuthTag: '5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e',
      webmailEnabled: true,
      isActive: true,
    },
  });

  await prisma.emailMailbox.upsert({
    where: { emailAddress: 'orders@veloxshop.in' },
    update: {},
    create: {
      id: LOCAL_SEED_IDS.mailboxes.veloxOrders,
      accountId: LOCAL_SEED_IDS.accounts.veloxShop,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      emailDomainId: LOCAL_SEED_IDS.emailDomains.veloxEmailDomain,
      localPart: 'orders',
      emailAddress: 'orders@veloxshop.in',
      passwordDovecotHash:
        '{ARGON2ID}$argon2id$v=19$m=65536,t=3,p=4$RG92ZWNvdFNhbHQwMQ$9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c',
      quotaMb: 5120,
      usedBytes: BigInt(157286400),
      maildirPath: '/home/veloxshop/mail/veloxshop.in/orders/Maildir',
      imapEnabled: true,
      pop3Enabled: false,
      smtpSubmissionEnabled: true,
      outboundHourlyLimit: 250,
    },
  });

  await prisma.mailDomainPolicy.upsert({
    where: { emailDomainId: LOCAL_SEED_IDS.emailDomains.veloxEmailDomain },
    update: {},
    create: {
      id: 'b6200000-0000-4000-8000-000000000001',
      accountId: LOCAL_SEED_IDS.accounts.veloxShop,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      emailDomainId: LOCAL_SEED_IDS.emailDomains.veloxEmailDomain,
      spfRecordValue: 'v=spf1 ip4:103.21.58.10 a mx ~all',
      dkimSigningEnabled: true,
      dmarcPolicy: 'QUARANTINE',
      dmarcRuaEmail: 'dmarc@veloxshop.in',
      rspamdGreylistThreshold: 4.0,
      rspamdAddHeaderScore: 6.0,
      rspamdRejectScore: 15.0,
      virusScanEnabled: true,
      hourlyOutboundLimit: 500,
      dailyOutboundLimit: 4000,
    },
  });

  // 7. Seed Customer Workload Database Instances (`isPanelInstance: false` strictly enforced)
  await prisma.databaseInstance.upsert({
    where: { name: 'local-workload-mariadb-1011' },
    update: {},
    create: {
      id: LOCAL_SEED_IDS.dbInstances.customerMariaDb,
      name: 'local-workload-mariadb-1011',
      engine: 'MARIADB',
      version: '10.11.8-MariaDB',
      host: '127.0.0.1',
      port: 3306,
      socketPath: '/run/mysqld/mysqld.sock',
      isPanelInstance: false,
      maxConnections: 300,
      adminUsername: 'garvix_dbadmin',
      adminEncryptedSecretCiphertext:
        'v1:aes256gcm:1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e',
      adminSecretKeyId: 'kek-local-node-2026-01',
      adminSecretIv: '6f7a8b9c0d1e2f3a4b5c6d7e',
      adminSecretAuthTag: '4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d',
      isHealthy: true,
    },
  });

  await prisma.databaseInstance.upsert({
    where: { name: 'local-workload-postgresql-16' },
    update: {},
    create: {
      id: LOCAL_SEED_IDS.dbInstances.customerPostgres,
      name: 'local-workload-postgresql-16',
      engine: 'POSTGRESQL',
      version: '16.4',
      host: '127.0.0.1',
      port: 5433, // Isolated from Panel PostgreSQL on port 5432
      socketPath: '/var/run/postgresql/.s.PGSQL.5433',
      isPanelInstance: false,
      maxConnections: 200,
      adminUsername: 'garvix_pgadmin',
      adminEncryptedSecretCiphertext:
        'v1:aes256gcm:2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d',
      adminSecretKeyId: 'kek-local-node-2026-01',
      adminSecretIv: '7a8b9c0d1e2f3a4b5c6d7e8f',
      adminSecretAuthTag: '3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c',
      isHealthy: true,
    },
  });

  await prisma.hostedDatabase.upsert({
    where: {
      databaseInstanceId_databaseName: {
        databaseInstanceId: LOCAL_SEED_IDS.dbInstances.customerMariaDb,
        databaseName: 'veloxshop_prod',
      },
    },
    update: {},
    create: {
      id: LOCAL_SEED_IDS.hostedDbs.veloxShopMariaDb,
      accountId: LOCAL_SEED_IDS.accounts.veloxShop,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      databaseInstanceId: LOCAL_SEED_IDS.dbInstances.customerMariaDb,
      engine: 'MARIADB',
      databaseName: 'veloxshop_prod',
      characterSet: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
      sizeBytes: BigInt(419430400),
      quotaMb: 4096,
    },
  });

  await prisma.databaseAccount.upsert({
    where: {
      databaseInstanceId_dbUsername_allowedHostPattern: {
        databaseInstanceId: LOCAL_SEED_IDS.dbInstances.customerMariaDb,
        dbUsername: 'veloxshop_app',
        allowedHostPattern: '127.0.0.1',
      },
    },
    update: {},
    create: {
      id: LOCAL_SEED_IDS.dbAccounts.veloxMariaUser,
      accountId: LOCAL_SEED_IDS.accounts.veloxShop,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      databaseInstanceId: LOCAL_SEED_IDS.dbInstances.customerMariaDb,
      engine: 'MARIADB',
      dbUsername: 'veloxshop_app',
      allowedHostPattern: '127.0.0.1',
      passwordAuthHash: '*6BB4837EB74329105EE4568DDA7DC67ED2CA2AD9',
      maxUserConnections: 50,
    },
  });

  await prisma.databaseGrant.upsert({
    where: {
      hostedDatabaseId_databaseAccountId: {
        hostedDatabaseId: LOCAL_SEED_IDS.hostedDbs.veloxShopMariaDb,
        databaseAccountId: LOCAL_SEED_IDS.dbAccounts.veloxMariaUser,
      },
    },
    update: {},
    create: {
      id: 'b7300000-0000-4000-8000-000000000001',
      accountId: LOCAL_SEED_IDS.accounts.veloxShop,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      hostedDatabaseId: LOCAL_SEED_IDS.hostedDbs.veloxShopMariaDb,
      databaseAccountId: LOCAL_SEED_IDS.dbAccounts.veloxMariaUser,
      privilegeLevel: 'ALL_PRIVILEGES',
    },
  });

  // 8. Seed Applications & Envelope-Encrypted Environment Secrets
  await prisma.application.upsert({
    where: {
      accountId_slug: {
        accountId: LOCAL_SEED_IDS.accounts.veloxShop,
        slug: 'velox-order-service',
      },
    },
    update: {},
    create: {
      id: LOCAL_SEED_IDS.applications.veloxOrderServiceNode,
      accountId: LOCAL_SEED_IDS.accounts.veloxShop,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      domainId: LOCAL_SEED_IDS.domains.veloxPrimary,
      name: 'Velox Order Checkout Service',
      slug: 'velox-order-service',
      runtime: 'NODEJS',
      runtimeVersion: '22.x',
      appRootPath: '/home/veloxshop/apps/velox-order-service',
      publicSubpath: '/checkout-api',
      startupCommand: 'node dist/server.js',
      internalPort: 4100,
      gitRepositoryUrl: 'https://github.com/veloxshop/order-service.git',
      gitBranch: 'main',
      healthCheckPath: '/checkout-api/healthz',
      autoRestart: true,
      isEnabled: true,
    },
  });

  await prisma.applicationEnvironmentSecret.upsert({
    where: {
      applicationId_envKey: {
        applicationId: LOCAL_SEED_IDS.applications.veloxOrderServiceNode,
        envKey: 'DATABASE_URL',
      },
    },
    update: {},
    create: {
      id: 'b8100000-0000-4000-8000-000000000001',
      accountId: LOCAL_SEED_IDS.accounts.veloxShop,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      applicationId: LOCAL_SEED_IDS.applications.veloxOrderServiceNode,
      envKey: 'DATABASE_URL',
      encryptedValueCiphertext:
        'v1:aes256gcm:3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c',
      keyId: 'kek-local-node-2026-01',
      iv: '8b9c0d1e2f3a4b5c6d7e8f9a',
      authTag: '2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b',
    },
  });

  // 9. Seed Backup Policy, Backup Job & Restic Backup Artifact
  await prisma.backupPolicy.upsert({
    where: { id: LOCAL_SEED_IDS.backupPolicies.veloxNightlyRestic },
    update: {},
    create: {
      id: LOCAL_SEED_IDS.backupPolicies.veloxNightlyRestic,
      accountId: LOCAL_SEED_IDS.accounts.veloxShop,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      name: 'VeloxShop Nightly Encrypted S3 Backup',
      cronSchedule: '30 2 * * *',
      storageBackend: 'S3_COMPATIBLE',
      repositoryUri: 's3:https://s3.ap-south-1.amazonaws.com/acme-garvix-backups/veloxshop',
      encryptedRepoSecretCiphertext:
        'v1:aes256gcm:4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b',
      repoSecretKeyId: 'kek-local-node-2026-01',
      repoSecretIv: '9c0d1e2f3a4b5c6d7e8f9a0b',
      repoSecretAuthTag: '1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a',
      keepDaily: 7,
      keepWeekly: 4,
      keepMonthly: 6,
      includeFiles: true,
      includeDatabases: true,
      includeMailboxes: true,
      isEnabled: true,
    },
  });

  await prisma.backupJob.upsert({
    where: { id: LOCAL_SEED_IDS.backupJobs.veloxCompletedBackupJob },
    update: {},
    create: {
      id: LOCAL_SEED_IDS.backupJobs.veloxCompletedBackupJob,
      accountId: LOCAL_SEED_IDS.accounts.veloxShop,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      policyId: LOCAL_SEED_IDS.backupPolicies.veloxNightlyRestic,
      status: 'COMPLETED',
      isManualTrigger: false,
      bytesProcessed: BigInt(5054136320),
      bytesAddedToRepo: BigInt(142606336),
      startedAt: new Date('2026-10-19T02:30:00Z'),
      completedAt: new Date('2026-10-19T02:34:18Z'),
    },
  });

  await prisma.backupArtifact.upsert({
    where: { resticSnapshotId: 'restic-snap-8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c' },
    update: {},
    create: {
      id: LOCAL_SEED_IDS.backupArtifacts.veloxResticSnapshot01,
      accountId: LOCAL_SEED_IDS.accounts.veloxShop,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      backupJobId: LOCAL_SEED_IDS.backupJobs.veloxCompletedBackupJob,
      resticSnapshotId: 'restic-snap-8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c',
      repositoryUri: 's3:https://s3.ap-south-1.amazonaws.com/acme-garvix-backups/veloxshop',
      sha256Manifest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      manifestMetadataJson: {
        includedDatabases: ['veloxshop_prod'],
        includedMailDomains: ['veloxshop.in'],
        panelSchemaVersion: '2.4.0',
      },
      totalSizeBytes: BigInt(5054136320),
      compressedSizeBytes: BigInt(1845493760),
      isImmutableLocked: true,
      expiresAt: new Date('2027-04-19T02:34:18Z'),
      lastRestoreVerifiedAt: new Date('2026-10-19T03:00:00Z'),
    },
  });

  // 10. Seed Synthetic Monitoring Sample (`isMockData: true` explicitly flagged)
  await prisma.monitoringSample.upsert({
    where: { id: 'b9300000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: 'b9300000-0000-4000-8000-000000000001',
      accountId: LOCAL_SEED_IDS.accounts.veloxShop,
      resellerId: LOCAL_SEED_IDS.users.resellerPartner,
      metricScope: 'TENANT_CGROUP',
      cpuUsagePercent: 24.5,
      loadAvg1m: 0.48,
      memoryUsedMb: 1180,
      memoryAvailableMb: 2916,
      swapUsedMb: 0,
      diskUsedMb: BigInt(4820),
      diskReadIops: 85,
      diskWriteIops: 42,
      netRxBytesPerSec: BigInt(655360),
      netTxBytesPerSec: BigInt(1420800),
      isMockData: true,
      sampledAt: new Date('2026-10-19T06:00:00Z'),
    },
  });
}

if (typeof require !== 'undefined' && require.main === module) {
  console.log('Garvix Customer Local Panel seed module loaded. Ready to execute seedLocalDatabase().');
}
