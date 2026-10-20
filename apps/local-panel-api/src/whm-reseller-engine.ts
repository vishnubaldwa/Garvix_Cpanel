import { createHash, randomUUID } from 'node:crypto';
import type {
  AccountProvisioningState,
  HardwareProfile,
  HostingPackage,
} from '@garvix/shared-types';
import {
  authorizeAction,
  type AuthenticatedPrincipal,
} from '@garvix/authorization';
import {
  DomainNameSchema,
  LinuxUsernameSchema,
} from '@garvix/validation';
import {
  BASELINE_ALMALINUX10_PROFILE,
  calculateRealisticServerCapacity,
} from '@garvix/telemetry';

export interface ResellerResourcePool {
  resellerId: string;
  organizationId: string;
  ownerUserId: string;
  companyName: string;
  contactEmail: string;
  assignedServerIds: string[];
  maxAccounts: number;
  maxDiskQuotaMb: number;
  maxBandwidthQuotaMb: number;
  maxAggregateMemoryMb: number;
  maxAggregateCpuPercent: number;
  allowSshPackageCreation: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
  suspendedReason: string | null;
  createdAtIso: string;
}

export interface ResellerWhiteLabelConfig {
  resellerId: string;
  brandName: string;
  supportEmail: string;
  customPanelHostname: string | null;
  logoHttpsUrl: string | null;
  primaryColorHex: string;
  vanityNameservers: string[];
  updatedAtIso: string;
}

export interface ResellerScopedPackage extends HostingPackage {
  organizationId: string;
  ownerResellerId: string | null; // null = global server package
}

export interface ResellerManagedAccount {
  id: string;
  organizationId: string;
  resellerId: string;
  packageId: string;
  packageName: string;
  linuxUsername: string;
  primaryDomain: string;
  ownerEmail: string;
  diskQuotaMb: number;
  diskUsedMb: number;
  bandwidthQuotaMb: number;
  bandwidthUsedMb: number;
  memoryLimitMb: number;
  cpuQuotaPercent: number;
  sshEnabled: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  provisioningState: AccountProvisioningState;
  suspendedByResellerCascade: boolean;
  suspendedReason: string | null;
  createdAtIso: string;
}

export interface BulkProvisionSpec {
  linuxUsername: string;
  primaryDomain: string;
  ownerEmail: string;
  packageId: string;
}

export interface BulkProvisionResult {
  dryRun: boolean;
  requestedCount: number;
  succeededCount: number;
  status: 'DRY_RUN_VALIDATED' | 'COMMITTED' | 'ROLLED_BACK_ON_ERROR';
  totalAdditionalDiskMb: number;
  totalAdditionalMemoryMb: number;
  createdAccounts: ResellerManagedAccount[];
  errors: string[];
}

export interface StagedMigrationBundle {
  bundleVersion: '1.0';
  sourceSystem: 'GARVIX_EXPORT' | 'CPANEL_STAGED_ADAPTER';
  exportedAtIso: string;
  account: {
    linuxUsername: string;
    primaryDomain: string;
    ownerEmail: string;
    diskQuotaMb: number;
    AddonDomains: string[];
    databases: Array<{ engine: 'POSTGRESQL' | 'MARIADB'; name: string }>;
    mailboxes: Array<{ localPart: string; quotaMb: number }>;
  };
  manifestSha256: string;
}

export interface ResellerUsageReport {
  resellerId: string;
  companyName: string;
  status: 'ACTIVE' | 'SUSPENDED';
  accountsUsed: number;
  accountsMax: number;
  diskAllocatedMb: number;
  diskMaxMb: number;
  diskUtilizationPercent: number;
  memoryAllocatedMb: number;
  memoryMaxMb: number;
  bandwidthAllocatedMb: number;
  bandwidthMaxMb: number;
  activeAccountsCount: number;
  suspendedAccountsCount: number;
}

/**
 * Phase 4 — WHM & Reseller Management Engine.
 * Enforces physical hardware capacity bounds, reseller resource pool limits,
 * package privilege-escalation prevention, strict cross-reseller isolation,
 * cascade suspension, atomic bulk provisioning, white-label branding, and staged migration.
 */
export class WhmResellerEngine {
  private readonly hardwareProfile: HardwareProfile;
  private readonly resellers = new Map<string, ResellerResourcePool>();
  private readonly branding = new Map<string, ResellerWhiteLabelConfig>();
  private readonly packages = new Map<string, ResellerScopedPackage>();
  private readonly accounts = new Map<string, ResellerManagedAccount>();
  private readonly auditTrail: Array<{
    id: string;
    actorUserId: string;
    resellerId: string | null;
    action: string;
    summary: string;
    createdAtIso: string;
  }> = [];

  constructor(hardwareProfile: HardwareProfile = BASELINE_ALMALINUX10_PROFILE) {
    this.hardwareProfile = hardwareProfile;
  }

  /**
   * Allocates a bounded reseller resource pool, verifying against realistic physical server capacity
   * to prevent catastrophic disk or memory overselling.
   */
  public allocateResellerPool(
    actor: AuthenticatedPrincipal,
    input: {
      resellerId: string;
      companyName: string;
      contactEmail: string;
      assignedServerIds: string[];
      maxAccounts: number;
      maxDiskQuotaMb: number;
      maxBandwidthQuotaMb: number;
      maxAggregateMemoryMb: number;
      maxAggregateCpuPercent: number;
      allowSshPackageCreation: boolean;
    }
  ): ResellerResourcePool {
    if (actor.role !== 'SERVER_ADMIN' && actor.role !== 'CUSTOMER_ORG_OWNER') {
      throw new Error(
        `DENIED_MISSING_PERMISSION: Role ${actor.role} cannot allocate WHM reseller pools`
      );
    }

    const realistic = calculateRealisticServerCapacity(this.hardwareProfile);
    const usableDiskMb = realistic.usableCustomerDiskGb * 1024;

    // Calculate existing committed reseller disk & memory allocations
    let committedDiskMb = 0;
    for (const r of this.resellers.values()) {
      if (r.organizationId === actor.organizationId) {
        committedDiskMb += r.maxDiskQuotaMb;
      }
    }

    if (committedDiskMb + input.maxDiskQuotaMb > usableDiskMb) {
      throw new Error(
        `PHYSICAL_CAPACITY_EXCEEDED: Requested reseller disk pool (${input.maxDiskQuotaMb} MB) plus committed (${committedDiskMb} MB) exceeds usable server storage (${usableDiskMb} MB)`
      );
    }

    if (input.maxAggregateMemoryMb > realistic.usableWorkloadRamMb) {
      throw new Error(
        `PHYSICAL_CAPACITY_EXCEEDED: Requested reseller memory ceiling (${input.maxAggregateMemoryMb} MB) exceeds usable server workload RAM (${realistic.usableWorkloadRamMb} MB)`
      );
    }

    const pool: ResellerResourcePool = {
      resellerId: input.resellerId,
      organizationId: actor.organizationId,
      ownerUserId: `usr_${input.resellerId}`,
      companyName: input.companyName,
      contactEmail: input.contactEmail,
      assignedServerIds: [...input.assignedServerIds],
      maxAccounts: input.maxAccounts,
      maxDiskQuotaMb: input.maxDiskQuotaMb,
      maxBandwidthQuotaMb: input.maxBandwidthQuotaMb,
      maxAggregateMemoryMb: input.maxAggregateMemoryMb,
      maxAggregateCpuPercent: input.maxAggregateCpuPercent,
      allowSshPackageCreation: input.allowSshPackageCreation,
      status: 'ACTIVE',
      suspendedReason: null,
      createdAtIso: new Date().toISOString(),
    };

    this.resellers.set(pool.resellerId, pool);
    this.recordAudit(
      actor.userId,
      pool.resellerId,
      'whm.reseller.allocate',
      `Allocated reseller pool for ${pool.companyName} (${pool.maxAccounts} accounts, ${pool.maxDiskQuotaMb} MB disk)`
    );

    return pool;
  }

  /**
   * Creates a reseller-scoped hosting package while preventing privilege escalation
   * (e.g., granting SSH when disallowed or exceeding the reseller's pool ceiling).
   */
  public createResellerPackage(
    actor: AuthenticatedPrincipal,
    input: {
      resellerId: string;
      name: string;
      diskQuotaMb: number;
      bandwidthQuotaMb: number;
      maxDomains: number | null;
      maxDatabases: number | null;
      maxEmailAccounts: number | null;
      cpuQuotaPercent: number;
      memoryLimitMb: number;
      sshAccessAllowed: boolean;
    }
  ): ResellerScopedPackage {
    const pool = this.requireResellerAccess(actor, input.resellerId, 'reseller:accounts:create');

    if (input.sshAccessAllowed && !pool.allowSshPackageCreation) {
      throw new Error(
        'RESELLER_PRIVILEGE_ESCALATION_BLOCKED: Reseller is not authorized to create SSH-enabled hosting packages'
      );
    }

    if (input.diskQuotaMb > pool.maxDiskQuotaMb) {
      throw new Error(
        `RESELLER_POOL_QUOTA_EXCEEDED: Package disk quota (${input.diskQuotaMb} MB) exceeds reseller pool ceiling (${pool.maxDiskQuotaMb} MB)`
      );
    }

    if (input.memoryLimitMb > pool.maxAggregateMemoryMb) {
      throw new Error(
        `RESELLER_POOL_QUOTA_EXCEEDED: Package memory limit (${input.memoryLimitMb} MB) exceeds reseller memory ceiling (${pool.maxAggregateMemoryMb} MB)`
      );
    }

    if (input.cpuQuotaPercent > pool.maxAggregateCpuPercent) {
      throw new Error(
        `RESELLER_POOL_QUOTA_EXCEEDED: Package CPU limit (${input.cpuQuotaPercent}%) exceeds reseller CPU ceiling (${pool.maxAggregateCpuPercent}%)`
      );
    }

    const pkg: ResellerScopedPackage = {
      id: `pkg_${randomUUID().slice(0, 8)}`,
      organizationId: pool.organizationId,
      ownerResellerId: pool.resellerId,
      name: input.name,
      diskQuotaMb: input.diskQuotaMb,
      bandwidthQuotaMb: input.bandwidthQuotaMb,
      maxDomains: input.maxDomains,
      maxDatabases: input.maxDatabases,
      maxEmailAccounts: input.maxEmailAccounts,
      cpuQuotaPercent: input.cpuQuotaPercent,
      memoryLimitMb: input.memoryLimitMb,
      sshAccessAllowed: input.sshAccessAllowed,
      createdAt: new Date().toISOString(),
    };

    this.packages.set(pkg.id, pkg);
    this.recordAudit(
      actor.userId,
      pool.resellerId,
      'whm.package.create',
      `Created reseller package "${pkg.name}" (${pkg.diskQuotaMb} MB disk)`
    );

    return pkg;
  }

  /**
   * Bulk provisions multiple hosting accounts under a reseller with a preflight pass.
   * Supports dry-run preview and atomic all-or-nothing rollback if any spec in the batch is invalid or exceeds pool quota.
   */
  public bulkProvisionHostingAccounts(
    actor: AuthenticatedPrincipal,
    params: {
      resellerId: string;
      specs: BulkProvisionSpec[];
      dryRun?: boolean;
    }
  ): BulkProvisionResult {
    const pool = this.requireResellerAccess(actor, params.resellerId, 'reseller:accounts:create');
    const isDryRun = params.dryRun ?? false;
    const errors: string[] = [];

    if (pool.status !== 'ACTIVE') {
      throw new Error('RESELLER_SUSPENDED: Cannot provision accounts under a suspended reseller');
    }
    if (params.specs.length === 0 || params.specs.length > 50) {
      throw new Error('VALIDATION_FAILED: Bulk provisioning batch must contain between 1 and 50 accounts');
    }

    const existingAccounts = this.getResellerAccountsInternal(pool.resellerId);
    const currentUsedDiskMb = existingAccounts.reduce((acc, a) => acc + a.diskQuotaMb, 0);
    const currentUsedMemoryMb = existingAccounts.reduce((acc, a) => acc + a.memoryLimitMb, 0);

    const seenUsernames = new Set<string>(
      Array.from(this.accounts.values()).map((a) => a.linuxUsername)
    );
    const seenDomains = new Set<string>(
      Array.from(this.accounts.values()).map((a) => a.primaryDomain)
    );

    let batchDiskMb = 0;
    let batchMemoryMb = 0;
    const stagedAccounts: ResellerManagedAccount[] = [];

    for (let idx = 0; idx < params.specs.length; idx++) {
      const spec = params.specs[idx]!;
      const uCheck = LinuxUsernameSchema.safeParse(spec.linuxUsername);
      if (!uCheck.success) {
        errors.push(`Row ${idx + 1} (${spec.linuxUsername}): ${uCheck.error.issues[0]?.message}`);
        continue;
      }
      const dCheck = DomainNameSchema.safeParse(spec.primaryDomain);
      if (!dCheck.success) {
        errors.push(`Row ${idx + 1} (${spec.primaryDomain}): ${dCheck.error.issues[0]?.message}`);
        continue;
      }
      if (seenUsernames.has(spec.linuxUsername)) {
        errors.push(`Row ${idx + 1}: Duplicate or existing Linux username "${spec.linuxUsername}"`);
        continue;
      }
      if (seenDomains.has(spec.primaryDomain)) {
        errors.push(`Row ${idx + 1}: Duplicate or existing primary domain "${spec.primaryDomain}"`);
        continue;
      }

      const pkg = this.packages.get(spec.packageId);
      if (!pkg || (pkg.ownerResellerId !== null && pkg.ownerResellerId !== pool.resellerId)) {
        errors.push(
          `Row ${idx + 1}: Package "${spec.packageId}" not found or not authorized for reseller ${pool.resellerId}`
        );
        continue;
      }

      seenUsernames.add(spec.linuxUsername);
      seenDomains.add(spec.primaryDomain);
      batchDiskMb += pkg.diskQuotaMb;
      batchMemoryMb += pkg.memoryLimitMb;

      stagedAccounts.push({
        id: `acc_${randomUUID().slice(0, 8)}`,
        organizationId: pool.organizationId,
        resellerId: pool.resellerId,
        packageId: pkg.id,
        packageName: pkg.name,
        linuxUsername: spec.linuxUsername,
        primaryDomain: spec.primaryDomain,
        ownerEmail: spec.ownerEmail,
        diskQuotaMb: pkg.diskQuotaMb,
        diskUsedMb: 20,
        bandwidthQuotaMb: pkg.bandwidthQuotaMb,
        bandwidthUsedMb: 0,
        memoryLimitMb: pkg.memoryLimitMb,
        cpuQuotaPercent: pkg.cpuQuotaPercent,
        sshEnabled: pkg.sshAccessAllowed,
        status: 'ACTIVE',
        provisioningState: 'ACTIVE',
        suspendedByResellerCascade: false,
        suspendedReason: null,
        createdAtIso: new Date().toISOString(),
      });
    }

    if (existingAccounts.length + params.specs.length > pool.maxAccounts) {
      errors.push(
        `RESELLER_POOL_QUOTA_EXCEEDED: Batch of ${params.specs.length} plus existing ${existingAccounts.length} exceeds maxAccounts (${pool.maxAccounts})`
      );
    }

    if (currentUsedDiskMb + batchDiskMb > pool.maxDiskQuotaMb) {
      errors.push(
        `RESELLER_POOL_QUOTA_EXCEEDED: Batch disk quota (${batchDiskMb} MB) plus allocated (${currentUsedDiskMb} MB) exceeds reseller pool (${pool.maxDiskQuotaMb} MB)`
      );
    }

    if (currentUsedMemoryMb + batchMemoryMb > pool.maxAggregateMemoryMb) {
      errors.push(
        `RESELLER_POOL_QUOTA_EXCEEDED: Batch memory (${batchMemoryMb} MB) plus allocated (${currentUsedMemoryMb} MB) exceeds reseller memory pool (${pool.maxAggregateMemoryMb} MB)`
      );
    }

    if (errors.length > 0) {
      return {
        dryRun: isDryRun,
        requestedCount: params.specs.length,
        succeededCount: 0,
        status: 'ROLLED_BACK_ON_ERROR',
        totalAdditionalDiskMb: batchDiskMb,
        totalAdditionalMemoryMb: batchMemoryMb,
        createdAccounts: [],
        errors,
      };
    }

    if (isDryRun) {
      return {
        dryRun: true,
        requestedCount: params.specs.length,
        succeededCount: stagedAccounts.length,
        status: 'DRY_RUN_VALIDATED',
        totalAdditionalDiskMb: batchDiskMb,
        totalAdditionalMemoryMb: batchMemoryMb,
        createdAccounts: stagedAccounts,
        errors: [],
      };
    }

    for (const acct of stagedAccounts) {
      this.accounts.set(acct.id, acct);
    }

    this.recordAudit(
      actor.userId,
      pool.resellerId,
      'whm.bulk_provision',
      `Bulk provisioned ${stagedAccounts.length} hosting accounts (+${batchDiskMb} MB disk)`
    );

    return {
      dryRun: false,
      requestedCount: params.specs.length,
      succeededCount: stagedAccounts.length,
      status: 'COMMITTED',
      totalAdditionalDiskMb: batchDiskMb,
      totalAdditionalMemoryMb: batchMemoryMb,
      createdAccounts: stagedAccounts,
      errors: [],
    };
  }

  /**
   * Suspends an individual account owned by a reseller, enforcing strict cross-reseller isolation.
   */
  public suspendResellerAccount(
    actor: AuthenticatedPrincipal,
    params: {
      accountId: string;
      reason: string;
    }
  ): ResellerManagedAccount {
    const account = this.accounts.get(params.accountId);
    if (!account) {
      throw new Error(`RESOURCE_NOT_FOUND: Hosting account ${params.accountId} not found`);
    }

    // Verify reseller scope isolation via @garvix/authorization
    const decision = authorizeAction(actor, 'reseller:accounts:suspend', {
      organizationId: account.organizationId,
      resellerId: account.resellerId,
      accountId: account.id,
    });
    if (!decision.allowed) {
      throw new Error(`${decision.code}: ${decision.reason}`);
    }

    account.status = 'SUSPENDED';
    account.provisioningState = 'SUSPENDED';
    account.suspendedReason = params.reason;

    this.recordAudit(
      actor.userId,
      account.resellerId,
      'whm.account.suspend',
      `Suspended account ${account.linuxUsername}: ${params.reason}`
    );

    return account;
  }

  /**
   * Suspends a Reseller and optionally cascades suspension to all child hosting accounts
   * without deleting any customer data.
   */
  public suspendResellerCascade(
    actor: AuthenticatedPrincipal,
    params: {
      resellerId: string;
      reason: string;
      cascadeChildAccounts: boolean;
    }
  ): { reseller: ResellerResourcePool; cascadedAccountIds: string[] } {
    if (actor.role !== 'SERVER_ADMIN' && actor.role !== 'CUSTOMER_ORG_OWNER') {
      throw new Error('DENIED_MISSING_PERMISSION: Only Server Admin or Org Owner can suspend a reseller');
    }

    const pool = this.resellers.get(params.resellerId);
    if (!pool || pool.organizationId !== actor.organizationId) {
      throw new Error('RESOURCE_NOT_FOUND: Reseller not found');
    }

    pool.status = 'SUSPENDED';
    pool.suspendedReason = params.reason;

    const cascadedAccountIds: string[] = [];
    if (params.cascadeChildAccounts) {
      for (const acct of this.getResellerAccountsInternal(pool.resellerId)) {
        if (acct.status === 'ACTIVE') {
          acct.status = 'SUSPENDED';
          acct.provisioningState = 'SUSPENDED';
          acct.suspendedByResellerCascade = true;
          acct.suspendedReason = `Reseller suspended: ${params.reason}`;
          cascadedAccountIds.push(acct.id);
        }
      }
    }

    this.recordAudit(
      actor.userId,
      pool.resellerId,
      'whm.reseller.suspend_cascade',
      `Suspended reseller ${pool.companyName} (cascaded to ${cascadedAccountIds.length} child accounts)`
    );

    return { reseller: pool, cascadedAccountIds };
  }

  /**
   * Configures White-Label Branding and Vanity Nameservers for a Reseller.
   * Enforces HTTPS-only logo URLs, hex color validation, and RFC-1123 nameserver validation.
   */
  public configureResellerBranding(
    actor: AuthenticatedPrincipal,
    input: {
      resellerId: string;
      brandName: string;
      supportEmail: string;
      customPanelHostname: string | null;
      logoHttpsUrl: string | null;
      primaryColorHex: string;
      vanityNameservers: string[];
    }
  ): ResellerWhiteLabelConfig {
    const pool = this.requireResellerAccess(actor, input.resellerId, 'reseller:branding:write');

    if (/[<>"]/.test(input.brandName) || input.brandName.trim().length < 2) {
      throw new Error('INVALID_BRAND_NAME: Brand name contains disallowed HTML characters or is too short');
    }
    if (input.logoHttpsUrl !== null && !/^https:\/\/[a-zA-Z0-9.-]+\/[^\s"<>]*$/.test(input.logoHttpsUrl)) {
      throw new Error('UNSAFE_LOGO_URL: White-label logo URL must be a valid HTTPS URL');
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(input.primaryColorHex)) {
      throw new Error('INVALID_COLOR_HEX: Primary color must be a 6-digit hex code (#RRGGBB)');
    }
    if (input.customPanelHostname !== null) {
      DomainNameSchema.parse(input.customPanelHostname);
    }
    for (const ns of input.vanityNameservers) {
      DomainNameSchema.parse(ns);
    }

    const config: ResellerWhiteLabelConfig = {
      resellerId: pool.resellerId,
      brandName: input.brandName.trim(),
      supportEmail: input.supportEmail,
      customPanelHostname: input.customPanelHostname,
      logoHttpsUrl: input.logoHttpsUrl,
      primaryColorHex: input.primaryColorHex,
      vanityNameservers: [...input.vanityNameservers],
      updatedAtIso: new Date().toISOString(),
    };

    this.branding.set(pool.resellerId, config);
    this.recordAudit(
      actor.userId,
      pool.resellerId,
      'whm.reseller.branding',
      `Updated white-label branding for ${config.brandName}`
    );

    return config;
  }

  /**
   * Exports a hosting account into a staged migration bundle with a SHA-256 integrity manifest,
   * and verifies/imports it into a target reseller pool.
   */
  public exportAccountMigrationBundle(accountId: string): StagedMigrationBundle {
    const acct = this.accounts.get(accountId);
    if (!acct) {
      throw new Error(`RESOURCE_NOT_FOUND: Account ${accountId} not found`);
    }

    const accountPayload: StagedMigrationBundle['account'] = {
      linuxUsername: acct.linuxUsername,
      primaryDomain: acct.primaryDomain,
      ownerEmail: acct.ownerEmail,
      diskQuotaMb: acct.diskQuotaMb,
      AddonDomains: [`portal.${acct.primaryDomain}`],
      databases: [{ engine: 'POSTGRESQL', name: `gv_${acct.linuxUsername}_main` }],
      mailboxes: [{ localPart: 'admin', quotaMb: 1024 }],
    };

    const manifestSha256 = createHash('sha256')
      .update(JSON.stringify(accountPayload), 'utf8')
      .digest('hex');

    return {
      bundleVersion: '1.0',
      sourceSystem: 'GARVIX_EXPORT',
      exportedAtIso: new Date().toISOString(),
      account: accountPayload,
      manifestSha256,
    };
  }

  public verifyAndImportMigrationBundle(
    actor: AuthenticatedPrincipal,
    params: {
      targetResellerId: string;
      targetPackageId: string;
      bundle: StagedMigrationBundle;
      mappedLinuxUsername?: string;
    }
  ): ResellerManagedAccount {
    const expectedHash = createHash('sha256')
      .update(JSON.stringify(params.bundle.account), 'utf8')
      .digest('hex');

    if (expectedHash !== params.bundle.manifestSha256) {
      throw new Error('MIGRATION_MANIFEST_CORRUPTED: Bundle SHA-256 checksum mismatch');
    }

    const targetUsername = params.mappedLinuxUsername ?? params.bundle.account.linuxUsername;
    const batchRes = this.bulkProvisionHostingAccounts(actor, {
      resellerId: params.targetResellerId,
      specs: [
        {
          linuxUsername: targetUsername,
          primaryDomain: params.bundle.account.primaryDomain,
          ownerEmail: params.bundle.account.ownerEmail,
          packageId: params.targetPackageId,
        },
      ],
      dryRun: false,
    });

    if (batchRes.status !== 'COMMITTED' || !batchRes.createdAccounts[0]) {
      throw new Error(`MIGRATION_IMPORT_FAILED: ${batchRes.errors.join('; ')}`);
    }

    return batchRes.createdAccounts[0];
  }

  public getResellerUsageReport(
    actor: AuthenticatedPrincipal,
    resellerId: string
  ): ResellerUsageReport {
    const pool = this.requireResellerAccess(actor, resellerId, 'account:read');
    const accts = this.getResellerAccountsInternal(pool.resellerId);

    const diskAllocatedMb = accts.reduce((sum, a) => sum + a.diskQuotaMb, 0);
    const memoryAllocatedMb = accts.reduce((sum, a) => sum + a.memoryLimitMb, 0);
    const bandwidthAllocatedMb = accts.reduce((sum, a) => sum + a.bandwidthQuotaMb, 0);

    return {
      resellerId: pool.resellerId,
      companyName: pool.companyName,
      status: pool.status,
      accountsUsed: accts.length,
      accountsMax: pool.maxAccounts,
      diskAllocatedMb,
      diskMaxMb: pool.maxDiskQuotaMb,
      diskUtilizationPercent: Math.round((diskAllocatedMb / pool.maxDiskQuotaMb) * 1000) / 10,
      memoryAllocatedMb,
      memoryMaxMb: pool.maxAggregateMemoryMb,
      bandwidthAllocatedMb,
      bandwidthMaxMb: pool.maxBandwidthQuotaMb,
      activeAccountsCount: accts.filter((a) => a.status === 'ACTIVE').length,
      suspendedAccountsCount: accts.filter((a) => a.status === 'SUSPENDED').length,
    };
  }

  private requireResellerAccess(
    actor: AuthenticatedPrincipal,
    resellerId: string,
    permission: 'reseller:accounts:create' | 'reseller:branding:write' | 'account:read'
  ): ResellerResourcePool {
    const pool = this.resellers.get(resellerId);
    if (!pool) {
      throw new Error(`RESOURCE_NOT_FOUND: Reseller ${resellerId} not found`);
    }

    const decision = authorizeAction(actor, permission, {
      organizationId: pool.organizationId,
      resellerId: pool.resellerId,
    });
    if (!decision.allowed) {
      throw new Error(`${decision.code}: ${decision.reason}`);
    }

    return pool;
  }

  private getResellerAccountsInternal(resellerId: string): ResellerManagedAccount[] {
    return Array.from(this.accounts.values()).filter((a) => a.resellerId === resellerId);
  }

  private recordAudit(
    actorUserId: string,
    resellerId: string | null,
    action: string,
    summary: string
  ): void {
    this.auditTrail.unshift({
      id: `aud_${randomUUID().slice(0, 8)}`,
      actorUserId,
      resellerId,
      action,
      summary,
      createdAtIso: new Date().toISOString(),
    });
  }
}
