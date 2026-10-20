import { describe, expect, it } from 'vitest';
import type { AuthenticatedPrincipal } from '@garvix/authorization';
import { WhmResellerEngine } from '@garvix/local-panel-api';

describe('Phase 4 — WHM & Reseller Management, Bulk Provisioning, Isolation & Staged Migration', () => {
  const nowIso = new Date().toISOString();

  const serverAdmin: AuthenticatedPrincipal = {
    userId: 'usr_server_admin',
    role: 'SERVER_ADMIN',
    organizationId: 'org_alpha',
    allocatedServerIds: ['srv_1'],
    allocatedResellerId: null,
    allocatedAccountIds: [],
    mailboxId: null,
    mfaVerifiedAtIso: nowIso,
  };

  const resellerAlpha: AuthenticatedPrincipal = {
    userId: 'usr_res_alpha',
    role: 'HOSTING_RESELLER',
    organizationId: 'org_alpha',
    allocatedServerIds: ['srv_1'],
    allocatedResellerId: 'res_alpha',
    allocatedAccountIds: [],
    mailboxId: null,
    mfaVerifiedAtIso: nowIso,
  };

  const resellerBeta: AuthenticatedPrincipal = {
    userId: 'usr_res_beta',
    role: 'HOSTING_RESELLER',
    organizationId: 'org_alpha',
    allocatedServerIds: ['srv_1'],
    allocatedResellerId: 'res_beta',
    allocatedAccountIds: [],
    mailboxId: null,
    mfaVerifiedAtIso: nowIso,
  };

  it('enforces physical hardware capacity bounds and prevents reseller package privilege escalation', () => {
    const engine = new WhmResellerEngine();

    // Allocate valid 50 GB disk / 4 GB RAM pool to Reseller Alpha
    const pool = engine.allocateResellerPool(serverAdmin, {
      resellerId: 'res_alpha',
      companyName: 'Alpha Web Hosting Pvt Ltd',
      contactEmail: 'ops@alphahost.example',
      assignedServerIds: ['srv_1'],
      maxAccounts: 10,
      maxDiskQuotaMb: 51200, // 50 GB
      maxBandwidthQuotaMb: 512000,
      maxAggregateMemoryMb: 4096, // 4 GB
      maxAggregateCpuPercent: 200,
      allowSshPackageCreation: false,
    });
    expect(pool.status).toBe('ACTIVE');

    // Attempt to oversell 250 GB disk on a 200 GB NVMe server -> blocked
    expect(() =>
      engine.allocateResellerPool(serverAdmin, {
        resellerId: 'res_oversold',
        companyName: 'Oversold Host',
        contactEmail: 'ops@oversold.example',
        assignedServerIds: ['srv_1'],
        maxAccounts: 100,
        maxDiskQuotaMb: 256000,
        maxBandwidthQuotaMb: 1024000,
        maxAggregateMemoryMb: 4096,
        maxAggregateCpuPercent: 200,
        allowSshPackageCreation: false,
      })
    ).toThrow(/PHYSICAL_CAPACITY_EXCEEDED/);

    // Attempt by Reseller Alpha to create an SSH-enabled package when allowSshPackageCreation is false -> blocked
    expect(() =>
      engine.createResellerPackage(resellerAlpha, {
        resellerId: 'res_alpha',
        name: 'Rogue SSH Package',
        diskQuotaMb: 5120,
        bandwidthQuotaMb: 51200,
        maxDomains: 5,
        maxDatabases: 5,
        maxEmailAccounts: 20,
        cpuQuotaPercent: 100,
        memoryLimitMb: 512,
        sshAccessAllowed: true,
      })
    ).toThrow(/RESELLER_PRIVILEGE_ESCALATION_BLOCKED/);
  });

  it('supports atomic bulk provisioning, enforces pool quotas, and blocks cross-reseller access', () => {
    const engine = new WhmResellerEngine();

    engine.allocateResellerPool(serverAdmin, {
      resellerId: 'res_alpha',
      companyName: 'Alpha Web Hosting',
      contactEmail: 'ops@alphahost.example',
      assignedServerIds: ['srv_1'],
      maxAccounts: 5,
      maxDiskQuotaMb: 30720, // 30 GB pool
      maxBandwidthQuotaMb: 300000,
      maxAggregateMemoryMb: 3072,
      maxAggregateCpuPercent: 200,
      allowSshPackageCreation: false,
    });

    engine.allocateResellerPool(serverAdmin, {
      resellerId: 'res_beta',
      companyName: 'Beta Cloud Agency',
      contactEmail: 'ops@betahost.example',
      assignedServerIds: ['srv_1'],
      maxAccounts: 5,
      maxDiskQuotaMb: 20480,
      maxBandwidthQuotaMb: 200000,
      maxAggregateMemoryMb: 2048,
      maxAggregateCpuPercent: 200,
      allowSshPackageCreation: false,
    });

    const pkg10Gb = engine.createResellerPackage(resellerAlpha, {
      resellerId: 'res_alpha',
      name: 'Alpha 10GB Plan',
      diskQuotaMb: 10240,
      bandwidthQuotaMb: 50000,
      maxDomains: 5,
      maxDatabases: 5,
      maxEmailAccounts: 25,
      cpuQuotaPercent: 100,
      memoryLimitMb: 1024,
      sshAccessAllowed: false,
    });

    // Bulk provision 2 accounts (20 GB total <= 30 GB pool)
    const batchCommit = engine.bulkProvisionHostingAccounts(resellerAlpha, {
      resellerId: 'res_alpha',
      specs: [
        {
          linuxUsername: 'clientone',
          primaryDomain: 'clientone.example',
          ownerEmail: 'admin@clientone.example',
          packageId: pkg10Gb.id,
        },
        {
          linuxUsername: 'clienttwo',
          primaryDomain: 'clienttwo.example',
          ownerEmail: 'admin@clienttwo.example',
          packageId: pkg10Gb.id,
        },
      ],
      dryRun: false,
    });
    expect(batchCommit.status).toBe('COMMITTED');
    expect(batchCommit.succeededCount).toBe(2);

    const firstAccountId = batchCommit.createdAccounts[0]!.id;
    resellerAlpha.allocatedAccountIds.push(
      batchCommit.createdAccounts[0]!.id,
      batchCommit.createdAccounts[1]!.id
    );

    // Attempt to bulk provision 2 more 10GB accounts (20GB + 20GB = 40GB > 30GB pool) -> atomic rollback
    const overQuotaBatch = engine.bulkProvisionHostingAccounts(resellerAlpha, {
      resellerId: 'res_alpha',
      specs: [
        {
          linuxUsername: 'clientthree',
          primaryDomain: 'clientthree.example',
          ownerEmail: 'admin@clientthree.example',
          packageId: pkg10Gb.id,
        },
        {
          linuxUsername: 'clientfour',
          primaryDomain: 'clientfour.example',
          ownerEmail: 'admin@clientfour.example',
          packageId: pkg10Gb.id,
        },
      ],
      dryRun: false,
    });
    expect(overQuotaBatch.status).toBe('ROLLED_BACK_ON_ERROR');
    expect(overQuotaBatch.errors.some((e) => e.includes('RESELLER_POOL_QUOTA_EXCEEDED'))).toBe(
      true
    );

    // Verify usage report reflects only the 2 committed accounts
    const usage = engine.getResellerUsageReport(resellerAlpha, 'res_alpha');
    expect(usage.accountsUsed).toBe(2);
    expect(usage.diskAllocatedMb).toBe(20480);

    // Cross-reseller isolation: Reseller Beta cannot suspend Reseller Alpha's account
    expect(() =>
      engine.suspendResellerAccount(resellerBeta, {
        accountId: firstAccountId,
        reason: 'Unauthorized cross-reseller attempt',
      })
    ).toThrow(/DENIED_RESELLER_SCOPE/);
  });

  it('cascades reseller suspension, sanitizes white-label branding, and verifies staged migration manifests', () => {
    const engine = new WhmResellerEngine();

    engine.allocateResellerPool(serverAdmin, {
      resellerId: 'res_alpha',
      companyName: 'Alpha Web Hosting',
      contactEmail: 'ops@alphahost.example',
      assignedServerIds: ['srv_1'],
      maxAccounts: 5,
      maxDiskQuotaMb: 30720,
      maxBandwidthQuotaMb: 300000,
      maxAggregateMemoryMb: 3072,
      maxAggregateCpuPercent: 200,
      allowSshPackageCreation: false,
    });

    const pkg = engine.createResellerPackage(resellerAlpha, {
      resellerId: 'res_alpha',
      name: 'Standard 5GB',
      diskQuotaMb: 5120,
      bandwidthQuotaMb: 50000,
      maxDomains: 3,
      maxDatabases: 3,
      maxEmailAccounts: 10,
      cpuQuotaPercent: 100,
      memoryLimitMb: 512,
      sshAccessAllowed: false,
    });

    const batch = engine.bulkProvisionHostingAccounts(resellerAlpha, {
      resellerId: 'res_alpha',
      specs: [
        {
          linuxUsername: 'migratesrc',
          primaryDomain: 'migratesrc.example',
          ownerEmail: 'owner@migratesrc.example',
          packageId: pkg.id,
        },
      ],
    });
    const sourceAcct = batch.createdAccounts[0]!;

    // White-label branding rejects HTTP/XSS URLs and accepts valid HTTPS branding
    expect(() =>
      engine.configureResellerBranding(resellerAlpha, {
        resellerId: 'res_alpha',
        brandName: 'Alpha Brand',
        supportEmail: 'help@alphahost.example',
        customPanelHostname: 'panel.alphahost.example',
        logoHttpsUrl: 'javascript:alert(1)',
        primaryColorHex: '#2563EB',
        vanityNameservers: ['ns1.alphahost.example', 'ns2.alphahost.example'],
      })
    ).toThrow(/UNSAFE_LOGO_URL/);

    const branding = engine.configureResellerBranding(resellerAlpha, {
      resellerId: 'res_alpha',
      brandName: 'Alpha Cloud Hosting',
      supportEmail: 'help@alphahost.example',
      customPanelHostname: 'panel.alphahost.example',
      logoHttpsUrl: 'https://cdn.alphahost.example/logo.svg',
      primaryColorHex: '#2563EB',
      vanityNameservers: ['ns1.alphahost.example', 'ns2.alphahost.example'],
    });
    expect(branding.brandName).toBe('Alpha Cloud Hosting');

    // Export migration bundle and verify tamper detection
    const bundle = engine.exportAccountMigrationBundle(sourceAcct.id);
    const tamperedBundle = {
      ...bundle,
      account: { ...bundle.account, diskQuotaMb: 999999 },
    };

    expect(() =>
      engine.verifyAndImportMigrationBundle(resellerAlpha, {
        targetResellerId: 'res_alpha',
        targetPackageId: pkg.id,
        bundle: tamperedBundle,
        mappedLinuxUsername: 'migratedest',
      })
    ).toThrow(/MIGRATION_MANIFEST_CORRUPTED/);

    // Cascade suspend reseller and verify child account is suspended
    const cascadeRes = engine.suspendResellerCascade(serverAdmin, {
      resellerId: 'res_alpha',
      reason: 'Invoice overdue > 30 days',
      cascadeChildAccounts: true,
    });
    expect(cascadeRes.cascadedAccountIds).toContain(sourceAcct.id);
    expect(engine.getResellerUsageReport(serverAdmin, 'res_alpha').suspendedAccountsCount).toBe(1);
  });
});
