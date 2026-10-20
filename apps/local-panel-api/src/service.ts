import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {
  AccountProvisioningState,
  ApplicationDeployment,
  DnsRecord,
  DnsZone,
  Domain,
  EmailAccount,
  GarvixRole,
  HostingAccount,
  HostingPackage,
  InfrastructureJob,
  ManagedDatabase,
  ServerTelemetry,
  ServiceAction,
  ServiceName,
  SslCertificate,
} from '@garvix/shared-types';
import {
  authorizeAction,
  type AuthenticatedPrincipal,
  type PermissionKey,
  type TargetResourceDescriptor,
} from '@garvix/authorization';
import {
  CreateAccountSchema,
  CreateDatabaseSchema,
  CreateDatabaseUserSchema,
  CreateDomainSchema,
  CreateEmailAccountSchema,
  DeployApplicationSchema,
  validateStrictDnsRecord,
} from '@garvix/validation';
import {
  BASELINE_ALMALINUX10_PROFILE,
  calculateRealisticServerCapacity,
  createLabeledMockTelemetry,
} from '@garvix/telemetry';
import {
  calculateGstInvoice,
  generateCloudLicenseSigningKeyPair,
  issueSignedLicenseEnvelope,
  verifyLicenseLocally,
} from '@garvix/cloud-api';
import { getAuthorizedNavigationForRole } from '@garvix/ui-components';
import {
  evaluateMailServerPreflight,
  MockLinuxAgentAdapter,
  transitionAccountState,
} from './index.js';
import {
  computeTotpCode,
  hashPasswordScrypt,
  verifyPasswordScrypt,
  verifyTotpCode,
} from './totp.js';

export interface PanelSessionRecord {
  sessionId: string;
  principal: AuthenticatedPrincipal;
  username: string;
  email: string;
  fullName: string;
  totpSecretHex: string;
  ipAddress: string;
  createdAtIso: string;
  expiresAtIso: string;
}

export interface EnrolledServerRecord {
  id: string;
  organizationId: string;
  hostname: string;
  primaryIpv4: string;
  osRelease: string;
  agentVersion: string;
  panelVersion: string;
  status: 'ONLINE' | 'DEGRADED' | 'MAINTENANCE';
  hardwareProfile: typeof BASELINE_ALMALINUX10_PROFILE;
  enrolledAtIso: string;
}

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  gstin: string;
  stateCode: string;
  billingEmail: string;
  defaultDnsMode: 'LOCAL_POWERDNS' | 'EXTERNAL_PROVIDER';
  createdAtIso: string;
}

export interface ExtendedHostingAccount extends HostingAccount {
  organizationId: string;
  resellerId: string | null;
  provisioningState: AccountProvisioningState;
  stateHistory: AccountProvisioningState[];
}

export interface ExtendedDomain extends Domain {
  organizationId: string;
  resellerId: string | null;
  dnsManagementMode: 'LOCAL_POWERDNS' | 'EXTERNAL_PROVIDER';
}

export interface ExtendedAuditEntry {
  id: string;
  organizationId: string;
  actorUserId: string;
  actorUsername: string;
  actorRole: GarvixRole;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  isDryRun: boolean;
  jobId: string | null;
  summary: string;
  createdAt: string;
}

export class LocalPanelMvpService {
  private readonly agent = new MockLinuxAgentAdapter();
  private readonly licenseKeyPair = generateCloudLicenseSigningKeyPair('gv_ed25519_phase1_k1');
  private readonly defaultTotpSecretHex = '3132333435363738393031323334353637383930';

  private readonly users = new Map<
    string,
    {
      userId: string;
      username: string;
      email: string;
      fullName: string;
      passwordHash: string;
      role: GarvixRole;
      organizationId: string;
      allocatedServerIds: string[];
      allocatedResellerId: string | null;
      allocatedAccountIds: string[];
      mailboxId: string | null;
    }
  >();

  private readonly sessions = new Map<string, PanelSessionRecord>();
  private readonly organizations = new Map<string, OrganizationRecord>();
  private readonly servers = new Map<string, EnrolledServerRecord>();
  private readonly packages = new Map<string, HostingPackage>();
  private readonly accounts = new Map<string, ExtendedHostingAccount>();
  private readonly domains = new Map<string, ExtendedDomain>();
  private readonly dnsZones = new Map<string, DnsZone>();
  private readonly sslCertificates = new Map<string, SslCertificate>();
  private readonly databases = new Map<string, ManagedDatabase>();
  private readonly applications = new Map<string, ApplicationDeployment>();
  private readonly mailboxes = new Map<string, EmailAccount>();
  private readonly jobs = new Map<string, InfrastructureJob>();
  private readonly auditLogs: ExtendedAuditEntry[] = [];
  private nextInternalAppPort = 3100;
  private nextLinuxUid = 2001;
  private readonly cleanSlate: boolean;
  private readonly stateFilePath: string | null;

  constructor(options?: { cleanSlate?: boolean; stateFilePath?: string }) {
    this.cleanSlate = Boolean(options?.cleanSlate);
    this.stateFilePath = options?.stateFilePath ?? null;
    this.seedPhase1Data();
    if (this.cleanSlate) {
      this.loadPersistedState();
    }
  }

  public getTotpDemoCode(nowMs: number = Date.now()): string {
    return computeTotpCode(this.defaultTotpSecretHex, nowMs);
  }

  public login(params: {
    username: string;
    password: string;
    ipAddress?: string;
    totpCode?: string;
  }): {
    sessionId: string;
    principal: AuthenticatedPrincipal;
    user: { username: string; email: string; fullName: string; role: GarvixRole };
    authorizedNavigation: ReturnType<typeof getAuthorizedNavigationForRole>;
  } {
    const user = this.users.get(params.username);
    if (!user || !verifyPasswordScrypt(params.password, user.passwordHash)) {
      throw new Error('AUTH_INVALID_CREDENTIALS: Invalid username or password');
    }

    const nowIso = new Date().toISOString();
    let mfaVerifiedAtIso: string | null = null;
    if (params.totpCode) {
      if (!verifyTotpCode(this.defaultTotpSecretHex, params.totpCode)) {
        throw new Error('AUTH_MFA_INVALID: Invalid 6-digit TOTP verification code');
      }
      mfaVerifiedAtIso = nowIso;
    }

    const sessionId = `ses_${randomUUID()}`;
    const principal: AuthenticatedPrincipal = {
      userId: user.userId,
      role: user.role,
      organizationId: user.organizationId,
      allocatedServerIds: [...user.allocatedServerIds],
      allocatedResellerId: user.allocatedResellerId,
      allocatedAccountIds: [...user.allocatedAccountIds],
      mailboxId: user.mailboxId,
      mfaVerifiedAtIso,
    };

    const session: PanelSessionRecord = {
      sessionId,
      principal,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      totpSecretHex: this.defaultTotpSecretHex,
      ipAddress: params.ipAddress ?? '127.0.0.1',
      createdAtIso: nowIso,
      expiresAtIso: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    };

    this.sessions.set(sessionId, session);
    this.appendAudit(session, 'auth.login', 'session', sessionId, false, null, `User ${user.username} (${user.role}) logged in`);

    return {
      sessionId,
      principal,
      user: {
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      authorizedNavigation: getAuthorizedNavigationForRole(user.role),
    };
  }

  public verifyStepUpMfa(sessionId: string, totpCode: string): PanelSessionRecord {
    const session = this.requireSession(sessionId);
    if (!verifyTotpCode(session.totpSecretHex, totpCode)) {
      throw new Error('AUTH_MFA_INVALID: Invalid 6-digit TOTP code');
    }
    session.principal.mfaVerifiedAtIso = new Date().toISOString();
    this.appendAudit(
      session,
      'auth.mfa.step_up',
      'session',
      session.sessionId,
      false,
      null,
      'Completed TOTP step-up MFA verification'
    );
    return session;
  }

  public switchRoleForDemo(sessionId: string, targetRole: GarvixRole) {
    const session = this.requireSession(sessionId);
    session.principal.role = targetRole;
    if (targetRole === 'HOSTING_RESELLER') {
      session.principal.allocatedResellerId = 'res_partner_1';
      session.principal.allocatedAccountIds = Array.from(this.accounts.values())
        .filter((a) => a.resellerId === 'res_partner_1')
        .map((a) => a.id);
    } else if (
      targetRole === 'HOSTING_ACCOUNT_OWNER' ||
      targetRole === 'HOSTING_ACCOUNT_TECH'
    ) {
      session.principal.allocatedResellerId = 'res_partner_1';
      session.principal.allocatedAccountIds = ['acc_acme_prod'];
    } else if (targetRole === 'EMAIL_ONLY_USER') {
      session.principal.mailboxId = 'mbx_founder_acme';
      session.principal.allocatedAccountIds = ['acc_acme_prod'];
    } else {
      session.principal.allocatedResellerId = null;
      session.principal.allocatedAccountIds = Array.from(this.accounts.keys());
    }

    return {
      principal: session.principal,
      authorizedNavigation: getAuthorizedNavigationForRole(targetRole),
    };
  }

  public getDashboardSummary(sessionId: string) {
    this.requireSession(sessionId);
    const baseTelemetry = createLabeledMockTelemetry(BASELINE_ALMALINUX10_PROFILE);
    const capacity = calculateRealisticServerCapacity(BASELINE_ALMALINUX10_PROFILE);
    const scopedAccounts = this.listHostingAccounts(sessionId);
    const scopedDomains = this.listDomains(sessionId);
    const scopedDatabases = this.listDatabases(sessionId);
    const scopedCertificates = this.listSslCertificates(sessionId);
    const scopedApps = this.listApplications(sessionId);

    if (this.cleanSlate) {
      try {
        const cpus = os.cpus();
        const [load1 = 0.12, load5 = 0.1, load15 = 0.08] = os.loadavg();
        const totalMb = Math.round(os.totalmem() / (1024 * 1024));
        const freeMb = Math.round(os.freemem() / (1024 * 1024));
        const usedMb = Math.max(128, totalMb - freeMb);
        const cpuPercent = Math.min(100, Math.max(1, Number(((load1 / Math.max(1, cpus.length)) * 100).toFixed(1))));
        baseTelemetry.cpu.cores = cpus.length;
        baseTelemetry.cpu.loadAvg1m = Number(load1.toFixed(2));
        baseTelemetry.cpu.loadAvg5m = Number(load5.toFixed(2));
        baseTelemetry.cpu.loadAvg15m = Number(load15.toFixed(2));
        baseTelemetry.cpu.usagePercent = cpuPercent;
        baseTelemetry.memory.totalMb = totalMb;
        baseTelemetry.memory.usedMb = usedMb;
        baseTelemetry.memory.availableMb = freeMb;

        try {
          const dfOut = execFileSync('df', ['-k', '/'], { encoding: 'utf8', timeout: 1500 });
          const lines = dfOut.trim().split('\n');
          if (lines.length >= 2) {
            const cols = lines[lines.length - 1]!.trim().split(/\s+/);
            const totalKb = Number(cols[1] ?? 0);
            const usedKb = Number(cols[2] ?? 0);
            const availKb = Number(cols[3] ?? 0);
            if (totalKb > 0) {
              baseTelemetry.disk.totalGb = Number((totalKb / (1024 * 1024)).toFixed(1));
              baseTelemetry.disk.usedGb = Number((usedKb / (1024 * 1024)).toFixed(2));
              baseTelemetry.disk.availableGb = Number((availKb / (1024 * 1024)).toFixed(1));
            }
          }
        } catch (_) {}

        if (os.platform() === 'linux') {
          for (const svc of baseTelemetry.services) {
            try {
              const unitMap: Record<string, string> = {
                nginx: 'nginx',
                postgresql: 'postgresql',
                mariadb: 'mariadb',
                postfix: 'postfix',
                dovecot: 'dovecot',
              };
              const unit = unitMap[svc.name];
              if (unit) {
                const statusOut = execFileSync('systemctl', ['is-active', unit], {
                  encoding: 'utf8',
                  timeout: 1000,
                }).trim();
                svc.state = statusOut === 'active' ? 'running' : 'stopped';
              }
            } catch (_) {
              // Keep default state if service unit is not active yet
            }
          }
        }
      } catch (_) {}
    }

    return {
      isMockData: !this.cleanSlate,
      dataOriginBanner: this.cleanSlate
        ? `Garvix Control Panel Node (${os.hostname()})`
        : 'DEVELOPMENT MODE — Mock Infrastructure Adapter Active. Zero production VPS resources are contacted.',
      telemetry: baseTelemetry,
      realisticCapacity: capacity,
      capacityEstimate: capacity,
      counts: {
        activeHostingAccounts: scopedAccounts.filter((a) => a.status === 'ACTIVE').length,
        totalHostingAccounts: scopedAccounts.length,
        totalDomains: scopedDomains.length,
        validSslCertificates: scopedCertificates.filter((c) => c.status === 'VALID').length,
        totalDatabases: scopedDatabases.length,
        runningApplications: scopedApps.filter((a) => a.status === 'RUNNING').length,
        totalMailboxes: this.listMailboxes(sessionId).length,
      },
    };
  }

  public getOrganizationOverview(sessionId: string) {
    const session = this.requireSession(sessionId);
    const org = this.organizations.get(session.principal.organizationId);
    if (!org) {
      throw new Error('RESOURCE_NOT_FOUND: Organization not found');
    }

    const envelope = issueSignedLicenseEnvelope(
      {
        licenseId: 'lic_gv_enterprise_01',
        organizationId: org.id,
        serverId: 'srv_almalinux10_primary',
        hardwareFingerprintHash: 'sha256:almalinux10_nvme_4vcpu_16gb_fp01',
        primaryIpv4Hint: '200.234.39.100',
        tier: 'ANNUAL',
        maxHostingAccounts: 'UNLIMITED',
        features: [
          'POSTGRESQL_16',
          'MARIADB_10_11',
          'LETS_ENCRYPT_ACME',
          'EMAIL_POSTFIX_DOVECot_RSPAMD',
          'RESTIC_ENCRYPTED_BACKUPS',
          'RESELLER_WHM',
        ],
        issuedAtIso: '2026-10-01T00:00:00.000Z',
        expiresAtIso: '2027-10-01T00:00:00.000Z',
        offlineGraceHours: 72,
        minCompatibleVersion: '0.1.0',
        maxCompatibleVersion: '2.0.0',
      },
      this.licenseKeyPair.privateKeyPem,
      this.licenseKeyPair.publicKeyId
    );

    const licenseStatus = verifyLicenseLocally({
      envelope,
      embeddedPublicKeyPem: this.licenseKeyPair.publicKeyPem,
      currentHardwareFingerprintHash: 'sha256:almalinux10_nvme_4vcpu_16gb_fp01',
      currentPrimaryIpv4: '200.234.39.100',
      lastCloudSyncAtIso: new Date().toISOString(),
    });

    const sampleInvoice = calculateGstInvoice({
      invoiceNumber: 'GV-INV-2026-27-0042',
      organizationId: org.id,
      supplierStateCode: '27', // Maharashtra
      customerStateCode: org.stateCode,
      subtotalPaise: 149900, // INR 1,499.00 / month equivalent
    });

    const enrichedInvoice = {
      ...sampleInvoice,
      totalPayablePaise: sampleInvoice.totalPaise,
    };

    return {
      organization: org,
      licenseStatus,
      latestGstInvoice: enrichedInvoice,
      sampleLatestGstInvoice: enrichedInvoice,
    };
  }

  public listServers(sessionId: string): EnrolledServerRecord[] {
    const session = this.requireSession(sessionId);
    const check = authorizeAction(session.principal, 'server:read', {
      organizationId: session.principal.organizationId,
    });
    if (!check.allowed) {
      throw new Error(`${check.code}: ${check.reason}`);
    }
    return Array.from(this.servers.values()).filter(
      (s) => s.organizationId === session.principal.organizationId
    );
  }

  public controlServerService(params: {
    sessionId: string;
    serverId: string;
    serviceName: ServiceName;
    action: ServiceAction;
    dryRun?: boolean;
  }): InfrastructureJob {
    const session = this.requireSession(params.sessionId);
    const server = this.servers.get(params.serverId);
    if (!server) {
      throw new Error('RESOURCE_NOT_FOUND: Server not found');
    }

    this.requirePermission(session, 'server:service:restart', {
      organizationId: server.organizationId,
      serverId: server.id,
    });

    const isDryRun = params.dryRun ?? false;
    const reqId = `req_${randomUUID()}`;
    const agentRes = this.agent.execute({
      requestId: reqId,
      idempotencyKey: reqId,
      operation: 'ControlSystemService',
      actorUserId: session.principal.userId,
      actorRole: session.principal.role,
      tenantOrganizationId: server.organizationId,
      targetAccountId: null,
      dryRun: isDryRun,
      params: {
        serviceName: params.serviceName,
        action: params.action,
      },
    });

    return this.recordJobAndAudit(
      session,
      null,
      `system.service.${params.action}`,
      `${params.action.toUpperCase()} service ${params.serviceName} on ${server.hostname}`,
      isDryRun,
      agentRes
    );
  }

  public listHostingAccounts(sessionId: string): ExtendedHostingAccount[] {
    const session = this.requireSession(sessionId);
    const all = Array.from(this.accounts.values()).filter(
      (a) => a.organizationId === session.principal.organizationId
    );

    if (session.principal.role === 'HOSTING_RESELLER') {
      return all.filter((a) => a.resellerId === session.principal.allocatedResellerId);
    }
    if (
      session.principal.role === 'HOSTING_ACCOUNT_OWNER' ||
      session.principal.role === 'HOSTING_ACCOUNT_TECH' ||
      session.principal.role === 'EMAIL_ONLY_USER'
    ) {
      return all.filter((a) => session.principal.allocatedAccountIds.includes(a.id));
    }
    return all;
  }

  public createHostingAccount(
    sessionId: string,
    rawInput: unknown,
    options?: { simulateAgentFailure?: boolean }
  ): { account: ExtendedHostingAccount; job: InfrastructureJob } {
    const session = this.requireSession(sessionId);
    const parsed = CreateAccountSchema.parse(rawInput);

    this.requirePermission(session, 'reseller:accounts:create', {
      organizationId: session.principal.organizationId,
      resellerId: session.principal.allocatedResellerId,
    });

    const pkg = this.packages.get(parsed.packageId);
    if (!pkg) {
      throw new Error(`RESOURCE_NOT_FOUND: Hosting package ${parsed.packageId} does not exist`);
    }

    for (const existing of this.accounts.values()) {
      if (existing.linuxUsername === parsed.linuxUsername) {
        throw new Error(`RESOURCE_CONFLICT: Linux username ${parsed.linuxUsername} already exists`);
      }
      if (existing.primaryDomain === parsed.primaryDomain) {
        throw new Error(`RESOURCE_CONFLICT: Primary domain ${parsed.primaryDomain} is already assigned`);
      }
    }

    const accountId = `acc_${randomUUID().slice(0, 8)}`;
    const stateHistory: AccountProvisioningState[] = ['PREFLIGHT'];
    let currentState = 'PREFLIGHT' as AccountProvisioningState;

    const advance = (next: AccountProvisioningState) => {
      const res = transitionAccountState(currentState, next);
      if (!res.valid) {
        throw new Error(res.error);
      }
      currentState = res.state;
      stateHistory.push(currentState);
    };

    const reqId = `req_${randomUUID()}`;
    const agentRes = this.agent.execute(
      {
        requestId: reqId,
        idempotencyKey: reqId,
        operation: 'CreateHostingAccount',
        actorUserId: session.principal.userId,
        actorRole: session.principal.role,
        tenantOrganizationId: session.principal.organizationId,
        targetAccountId: accountId,
        dryRun: parsed.dryRun,
        params: {
          linuxUsername: parsed.linuxUsername,
          primaryDomain: parsed.primaryDomain,
          relativePath: 'public_html',
        },
      },
      { simulateValidationFailure: options?.simulateAgentFailure }
    );

    if (!parsed.dryRun) {
      advance('PROVISIONING_LINUX_USER');
      advance('PROVISIONING_HOME_FS');
      advance('PROVISIONING_WEB_VHOST');
      if (agentRes.status === 'FAILED_ROLLED_BACK') {
        advance('FAILED_ROLLED_BACK');
      } else {
        advance('PROVISIONING_DNS');
        advance('ACTIVE');
      }
    }

    const account: ExtendedHostingAccount = {
      id: accountId,
      organizationId: session.principal.organizationId,
      resellerId: session.principal.allocatedResellerId,
      ownerUserId: session.principal.userId,
      ownerEmail: parsed.ownerEmail,
      packageId: pkg.id,
      packageName: pkg.name,
      linuxUsername: parsed.linuxUsername,
      linuxUid: this.nextLinuxUid++,
      homeDirectory: `/home/${parsed.linuxUsername}`,
      primaryDomain: parsed.primaryDomain,
      status: currentState === 'ACTIVE' ? 'ACTIVE' : 'PROVISIONING',
      provisioningState: currentState,
      stateHistory,
      diskUsedMb: 42,
      diskQuotaMb: pkg.diskQuotaMb,
      bandwidthUsedMb: 0,
      bandwidthQuotaMb: pkg.bandwidthQuotaMb,
      cpuQuotaPercent: pkg.cpuQuotaPercent,
      memoryLimitMb: pkg.memoryLimitMb,
      sshEnabled: parsed.sshEnabled,
      suspendedReason: null,
      createdAt: new Date().toISOString(),
    };

    if (!parsed.dryRun && currentState === 'ACTIVE') {
      this.accounts.set(account.id, account);
      if (!session.principal.allocatedAccountIds.includes(account.id)) {
        session.principal.allocatedAccountIds.push(account.id);
      }
      // Automatically create primary domain & DNS zone
      this.provisionDomainInternal(session, account, {
        accountId: account.id,
        domainName: parsed.primaryDomain,
        parentDomainId: null,
        documentRootRelative: 'public_html',
        templateType: 'PHP',
        phpVersion: '8.3',
        forceHttps: true,
        hstsEnabled: true,
        http3Enabled: true,
        autoIssueSsl: true,
        dryRun: false,
      });
    }

    const job = this.recordJobAndAudit(
      session,
      account.id,
      'account.provision',
      `Provision hosting account ${parsed.linuxUsername} (${parsed.primaryDomain})`,
      parsed.dryRun,
      agentRes
    );

    return { account, job };
  }

  public suspendHostingAccount(
    sessionId: string,
    accountId: string,
    reason: string,
    dryRun: boolean = false
  ): { account: ExtendedHostingAccount; job: InfrastructureJob } {
    const session = this.requireSession(sessionId);
    const account = this.requireAccountAccess(session, accountId, 'reseller:accounts:suspend');

    const reqId = `req_${randomUUID()}`;
    const agentRes = this.agent.execute({
      requestId: reqId,
      idempotencyKey: reqId,
      operation: 'SuspendHostingAccount',
      actorUserId: session.principal.userId,
      actorRole: session.principal.role,
      tenantOrganizationId: account.organizationId,
      targetAccountId: account.id,
      dryRun,
      params: {
        linuxUsername: account.linuxUsername,
        reason,
      },
    });

    if (!dryRun) {
      const s1 = transitionAccountState(account.provisioningState, 'SUSPENDING');
      if (s1.valid) account.provisioningState = s1.state;
      const s2 = transitionAccountState(account.provisioningState, 'SUSPENDED');
      if (s2.valid) account.provisioningState = s2.state;
      account.status = 'SUSPENDED';
      account.suspendedReason = reason;
      account.stateHistory.push('SUSPENDING', 'SUSPENDED');
    }

    const job = this.recordJobAndAudit(
      session,
      account.id,
      'account.suspend',
      `Suspend hosting account ${account.linuxUsername}: ${reason}`,
      dryRun,
      agentRes
    );

    return { account, job };
  }

  public reactivateHostingAccount(
    sessionId: string,
    accountId: string,
    dryRun: boolean = false
  ): { account: ExtendedHostingAccount; job: InfrastructureJob } {
    const session = this.requireSession(sessionId);
    const account = this.requireAccountAccess(session, accountId, 'reseller:accounts:suspend');

    const reqId = `req_${randomUUID()}`;
    const agentRes = this.agent.execute({
      requestId: reqId,
      idempotencyKey: reqId,
      operation: 'ReactivateHostingAccount',
      actorUserId: session.principal.userId,
      actorRole: session.principal.role,
      tenantOrganizationId: account.organizationId,
      targetAccountId: account.id,
      dryRun,
      params: {
        linuxUsername: account.linuxUsername,
      },
    });

    if (!dryRun) {
      const s1 = transitionAccountState(account.provisioningState, 'REACTIVATING');
      if (s1.valid) account.provisioningState = s1.state;
      const s2 = transitionAccountState(account.provisioningState, 'ACTIVE');
      if (s2.valid) account.provisioningState = s2.state;
      account.status = 'ACTIVE';
      account.suspendedReason = null;
      account.stateHistory.push('REACTIVATING', 'ACTIVE');
    }

    const job = this.recordJobAndAudit(
      session,
      account.id,
      'account.reactivate',
      `Reactivate (unsuspend) hosting account ${account.linuxUsername}`,
      dryRun,
      agentRes
    );

    return { account, job };
  }

  public createHostingPackage(
    sessionId: string,
    input: {
      name: string;
      diskQuotaMb: number;
      bandwidthQuotaMb: number;
      memoryLimitMb: number;
      cpuQuotaPercent: number;
      sshAccessAllowed: boolean;
    }
  ): HostingPackage {
    const session = this.requireSession(sessionId);
    this.requirePermission(session, 'reseller:accounts:create', {
      organizationId: session.principal.organizationId,
      resellerId: session.principal.allocatedResellerId,
    });

    if (session.principal.role === 'HOSTING_RESELLER' && input.sshAccessAllowed) {
      throw new Error(
        'RESELLER_PRIVILEGE_ESCALATION_BLOCKED: Resellers cannot create SSH-enabled packages without Server Admin grant'
      );
    }

    const pkg: HostingPackage = {
      id: `pkg_${randomUUID().slice(0, 8)}`,
      name: input.name,
      diskQuotaMb: input.diskQuotaMb,
      bandwidthQuotaMb: input.bandwidthQuotaMb,
      maxDomains: null,
      maxDatabases: null,
      maxEmailAccounts: null,
      cpuQuotaPercent: input.cpuQuotaPercent,
      memoryLimitMb: input.memoryLimitMb,
      sshAccessAllowed: input.sshAccessAllowed,
      createdAt: new Date().toISOString(),
    };

    this.packages.set(pkg.id, pkg);
    this.appendAudit(
      session,
      'whm.package.create',
      'hosting_package',
      pkg.id,
      false,
      null,
      `Created WHM hosting package "${pkg.name}" (${(pkg.diskQuotaMb / 1024).toFixed(0)} GB NVMe)`
    );
    return pkg;
  }

  public listDomains(sessionId: string): ExtendedDomain[] {
    const allowedAccountIds = new Set(this.listHostingAccounts(sessionId).map((a) => a.id));
    return Array.from(this.domains.values()).filter((d) => allowedAccountIds.has(d.accountId));
  }

  public createDomain(sessionId: string, rawInput: unknown) {
    const session = this.requireSession(sessionId);
    const parsed = CreateDomainSchema.parse(rawInput);
    const account = this.requireAccountAccess(session, parsed.accountId, 'domain:manage');

    const { domain, zone } = this.provisionDomainInternal(session, account, parsed);
    const reqId = `req_${randomUUID()}`;
    const agentRes = this.agent.execute({
      requestId: reqId,
      idempotencyKey: reqId,
      operation: 'CreateVirtualHost',
      actorUserId: session.principal.userId,
      actorRole: session.principal.role,
      tenantOrganizationId: account.organizationId,
      targetAccountId: account.id,
      dryRun: parsed.dryRun,
      params: {
        linuxUsername: account.linuxUsername,
        domainName: parsed.domainName,
        relativePath: parsed.documentRootRelative,
      },
    });

    const job = this.recordJobAndAudit(
      session,
      account.id,
      'domain.provision',
      `Add domain ${parsed.domainName} to account ${account.linuxUsername}`,
      parsed.dryRun,
      agentRes
    );

    return { domain, zone, job };
  }

  public getDomainDnsZone(sessionId: string, domainId: string): DnsZone {
    const session = this.requireSession(sessionId);
    let domain = this.domains.get(domainId);
    if (!domain && this.cleanSlate) {
      this.requireAccountAccess(session, 'acc_primary', 'dns:manage');
      domain = Array.from(this.domains.values())[0];
    }
    if (!domain) {
      throw new Error('RESOURCE_NOT_FOUND: Domain not found');
    }
    this.requireAccountAccess(session, domain.accountId, 'dns:manage');
    const zone = this.dnsZones.get(domain.id);
    if (!zone) {
      throw new Error('RESOURCE_NOT_FOUND: DNS zone not found');
    }
    return zone;
  }

  public upsertDnsRecord(
    sessionId: string,
    input: {
      domainId: string;
      name: string;
      type: DnsRecord['type'];
      content: string;
      ttl: number;
      priority: number | null;
      dryRun?: boolean;
    }
  ): { record: DnsRecord; zone: DnsZone; job: InfrastructureJob } {
    const session = this.requireSession(sessionId);
    let domain = this.domains.get(input.domainId);
    if (!domain && this.cleanSlate) {
      this.requireAccountAccess(session, 'acc_primary', 'dns:manage');
      domain = Array.from(this.domains.values())[0];
    }
    if (!domain) {
      throw new Error('RESOURCE_NOT_FOUND: Domain not found');
    }
    const account = this.requireAccountAccess(session, domain.accountId, 'dns:manage');

    const validation = validateStrictDnsRecord(input);
    if (!validation.valid) {
      throw new Error(`VALIDATION_FAILED: ${validation.error}`);
    }

    const zone = this.getDomainDnsZone(sessionId, domain.id);
    const isDryRun = input.dryRun ?? false;
    const record: DnsRecord = {
      id: `dnsrec_${randomUUID().slice(0, 8)}`,
      zoneId: zone.id,
      domainId: domain.id,
      domainName: domain.domainName,
      name: input.name,
      type: input.type,
      content: input.content,
      ttl: input.ttl,
      priority: input.priority,
      isSystemManaged: false,
      createdAt: new Date().toISOString(),
    };

    const reqId = `req_${randomUUID()}`;
    const agentRes = this.agent.execute({
      requestId: reqId,
      idempotencyKey: reqId,
      operation: 'ApplyDnsZone',
      actorUserId: session.principal.userId,
      actorRole: session.principal.role,
      tenantOrganizationId: account.organizationId,
      targetAccountId: account.id,
      dryRun: isDryRun,
      params: {
        domainName: domain.domainName,
        recordType: input.type,
        recordName: input.name,
      },
    });

    if (!isDryRun) {
      zone.records.push(record);
      zone.soaSerial += 1;
    }

    const job = this.recordJobAndAudit(
      session,
      account.id,
      'dns.record.upsert',
      `Add DNS ${input.type} record (${input.name}) for ${domain.domainName}`,
      isDryRun,
      agentRes
    );

    return { record, zone, job };
  }

  public listDatabases(sessionId: string): ManagedDatabase[] {
    const allowedAccountIds = new Set(this.listHostingAccounts(sessionId).map((a) => a.id));
    return Array.from(this.databases.values()).filter((db) =>
      allowedAccountIds.has(db.accountId)
    );
  }

  public createDatabase(sessionId: string, rawInput: unknown): {
    database: ManagedDatabase;
    job: InfrastructureJob;
  } {
    const session = this.requireSession(sessionId);
    const parsed = CreateDatabaseSchema.parse(rawInput);
    const account = this.requireAccountAccess(session, parsed.accountId, 'database:create');

    const fullDbName = `gv_${account.linuxUsername}_${parsed.dbSuffix}`;
    for (const existing of this.databases.values()) {
      if (existing.engine === parsed.engine && existing.name === fullDbName) {
        throw new Error(`RESOURCE_CONFLICT: Database ${fullDbName} already exists on ${parsed.engine}`);
      }
    }

    const reqId = `req_${randomUUID()}`;
    const agentRes = this.agent.execute({
      requestId: reqId,
      idempotencyKey: reqId,
      operation: 'CreateDatabase',
      actorUserId: session.principal.userId,
      actorRole: session.principal.role,
      tenantOrganizationId: account.organizationId,
      targetAccountId: account.id,
      dryRun: parsed.dryRun,
      params: {
        linuxUsername: account.linuxUsername,
        engine: parsed.engine,
        databaseName: fullDbName,
      },
    });

    const db: ManagedDatabase = {
      id: `db_${randomUUID().slice(0, 8)}`,
      accountId: account.id,
      linuxUsername: account.linuxUsername,
      engine: parsed.engine,
      name: fullDbName,
      charset: parsed.engine === 'POSTGRESQL' ? 'UTF8' : 'utf8mb4',
      collation: parsed.engine === 'POSTGRESQL' ? 'en_US.UTF-8' : 'utf8mb4_unicode_ci',
      sizeMb: 12,
      tablesCount: 0,
      assignedUsers: [
        {
          userId: `dbu_${account.linuxUsername}_owner`,
          username: `gv_${account.linuxUsername}_app`,
          privileges: 'ALL',
        },
      ],
      connectionHost: '127.0.0.1',
      connectionPort: parsed.engine === 'POSTGRESQL' ? 5432 : 3306,
      status: 'ONLINE',
      createdAt: new Date().toISOString(),
    };

    if (!parsed.dryRun) {
      this.databases.set(db.id, db);
    }

    const job = this.recordJobAndAudit(
      session,
      account.id,
      'db.create',
      `Provision ${parsed.engine} database ${fullDbName} (least-privilege NOSUPERUSER)`,
      parsed.dryRun,
      agentRes
    );

    return { database: db, job };
  }

  public deleteDatabase(params: {
    sessionId: string;
    databaseId: string;
    confirmationDatabaseName: string;
    dryRun?: boolean;
  }): InfrastructureJob {
    const session = this.requireSession(params.sessionId);
    const db = this.databases.get(params.databaseId);
    if (!db) {
      throw new Error('RESOURCE_NOT_FOUND: Database not found');
    }

    // Requires both account ownership AND Step-Up MFA verification
    const account = this.requireAccountAccess(session, db.accountId, 'database:delete');
    if (params.confirmationDatabaseName !== db.name) {
      throw new Error(
        `VALIDATION_FAILED: Explicit confirmation name "${params.confirmationDatabaseName}" does not match "${db.name}"`
      );
    }

    const isDryRun = params.dryRun ?? false;
    const reqId = `req_${randomUUID()}`;
    const agentRes = this.agent.execute({
      requestId: reqId,
      idempotencyKey: reqId,
      operation: 'CreateDatabase',
      actorUserId: session.principal.userId,
      actorRole: session.principal.role,
      tenantOrganizationId: account.organizationId,
      targetAccountId: account.id,
      dryRun: isDryRun,
      params: {
        linuxUsername: account.linuxUsername,
        databaseName: db.name,
      },
    });

    if (!isDryRun) {
      this.databases.delete(db.id);
    }

    return this.recordJobAndAudit(
      session,
      account.id,
      'db.delete',
      `Delete ${db.engine} database ${db.name} after step-up MFA and name confirmation`,
      isDryRun,
      agentRes
    );
  }

  public listSslCertificates(sessionId: string): SslCertificate[] {
    const allowedAccountIds = new Set(this.listHostingAccounts(sessionId).map((a) => a.id));
    return Array.from(this.sslCertificates.values()).filter((c) =>
      allowedAccountIds.has(c.accountId)
    );
  }

  public issueSslCertificate(
    sessionId: string,
    input: {
      domainId: string;
      challengeType: 'HTTP_01' | 'DNS_01';
      wildcard?: boolean;
      dryRun?: boolean;
    }
  ): { certificate: SslCertificate; job: InfrastructureJob } {
    const session = this.requireSession(sessionId);
    let domain = this.domains.get(input.domainId);
    if (!domain && this.cleanSlate) {
      this.requireAccountAccess(session, 'acc_primary', 'ssl:manage');
      domain = Array.from(this.domains.values())[0];
    }
    if (!domain) {
      throw new Error('RESOURCE_NOT_FOUND: Domain not found');
    }
    const account = this.requireAccountAccess(session, domain.accountId, 'ssl:manage');

    if (input.wildcard && input.challengeType !== 'DNS_01') {
      throw new Error('VALIDATION_FAILED: Wildcard SSL certificates require DNS_01 validation');
    }

    const isDryRun = input.dryRun ?? false;
    const reqId = `req_${randomUUID()}`;
    const agentRes = this.agent.execute({
      requestId: reqId,
      idempotencyKey: reqId,
      operation: 'IssueCertificate',
      actorUserId: session.principal.userId,
      actorRole: session.principal.role,
      tenantOrganizationId: account.organizationId,
      targetAccountId: account.id,
      dryRun: isDryRun,
      params: {
        linuxUsername: account.linuxUsername,
        domainName: domain.domainName,
        challengeType: input.challengeType,
      },
    });

    const now = new Date();
    const expires = new Date(now.getTime() + 90 * 24 * 3600 * 1000);
    const cert: SslCertificate = {
      id: `ssl_${randomUUID().slice(0, 8)}`,
      accountId: account.id,
      domainId: domain.id,
      domainName: domain.domainName,
      provider: 'LETS_ENCRYPT',
      challengeType: input.challengeType,
      sanDomains: input.wildcard
        ? [domain.domainName, `*.${domain.domainName}`]
        : [domain.domainName, `www.${domain.domainName}`],
      issuer: "Let's Encrypt E6 (ACME v2)",
      serialNumber: `04:${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      fingerprintSha256: `SHA256:${randomUUID().replace(/-/g, '')}`,
      certPath: `/etc/garvix/ssl/${domain.domainName}/fullchain.pem`,
      issuedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      autoRenew: true,
      status: 'VALID',
      lastRenewalAttemptAt: now.toISOString(),
      lastRenewalError: null,
    };

    if (!isDryRun) {
      this.sslCertificates.set(cert.id, cert);
      domain.sslStatus = 'ACTIVE';
      domain.sslExpiresAt = cert.expiresAt;
      domain.sslIssuer = cert.issuer;
    }

    const job = this.recordJobAndAudit(
      session,
      account.id,
      'ssl.issue',
      `Issue Let's Encrypt certificate (${input.challengeType}) for ${domain.domainName}`,
      isDryRun,
      agentRes
    );

    return { certificate: cert, job };
  }

  public listApplications(sessionId: string): ApplicationDeployment[] {
    const allowedAccountIds = new Set(this.listHostingAccounts(sessionId).map((a) => a.id));
    return Array.from(this.applications.values()).filter((app) =>
      allowedAccountIds.has(app.accountId)
    );
  }

  public deployApplication(sessionId: string, rawInput: unknown): {
    application: ApplicationDeployment;
    job: InfrastructureJob;
  } {
    const session = this.requireSession(sessionId);
    const parsed = DeployApplicationSchema.parse(rawInput);
    const account = this.requireAccountAccess(session, parsed.accountId, 'app:deploy');
    let domain = this.domains.get(parsed.domainId);
    if (!domain && this.cleanSlate) {
      domain = Array.from(this.domains.values()).find((d) => d.accountId === account.id) ?? Array.from(this.domains.values())[0];
    }
    if (!domain || domain.accountId !== account.id) {
      throw new Error('VALIDATION_FAILED: Domain does not belong to target hosting account');
    }

    const reqId = `req_${randomUUID()}`;
    const agentRes = this.agent.execute({
      requestId: reqId,
      idempotencyKey: reqId,
      operation: 'DeployApplication',
      actorUserId: session.principal.userId,
      actorRole: session.principal.role,
      tenantOrganizationId: account.organizationId,
      targetAccountId: account.id,
      dryRun: parsed.dryRun,
      params: {
        linuxUsername: account.linuxUsername,
        relativePath: parsed.appRootRelative,
        runtimeVersion: parsed.runtimeVersion,
      },
    });

    const allocatedPort =
      parsed.appType === 'NODEJS' ? this.nextInternalAppPort++ : null;

    const app: ApplicationDeployment = {
      id: `app_${randomUUID().slice(0, 8)}`,
      accountId: account.id,
      linuxUsername: account.linuxUsername,
      domainId: domain.id,
      domainName: domain.domainName,
      name: parsed.name,
      appType: parsed.appType,
      runtimeVersion: parsed.runtimeVersion,
      appRoot: `/home/${account.linuxUsername}/${parsed.appRootRelative}`,
      publicDir: `/home/${account.linuxUsername}/${parsed.publicDirRelative}`,
      entryPoint: parsed.entryPoint ?? null,
      internalPort: allocatedPort,
      processManager: parsed.appType === 'NODEJS' ? (parsed.processManager ?? 'SYSTEMD') : null,
      instances: parsed.instances,
      memoryLimitMb: parsed.memoryLimitMb,
      cpuQuotaPercent: parsed.cpuQuotaPercent,
      envKeys: Object.keys(parsed.envVars ?? {}), // Never return raw secret values
      phpFpmConfig:
        parsed.appType === 'PHP'
          ? {
              pmMode: 'ondemand',
              maxChildren: 10,
              memoryLimitMb: parsed.memoryLimitMb,
              uploadMaxFilesizeMb: 64,
              maxExecutionTimeSec: 60,
            }
          : null,
      status: 'RUNNING',
      lastDeployedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    if (!parsed.dryRun) {
      this.applications.set(app.id, app);
    }

    const job = this.recordJobAndAudit(
      session,
      account.id,
      'app.deploy',
      `Deploy ${parsed.appType} (${parsed.runtimeVersion}) application "${parsed.name}" on ${domain.domainName}`,
      parsed.dryRun,
      agentRes
    );

    return { application: app, job };
  }

  public listMailboxes(sessionId: string): EmailAccount[] {
    const session = this.requireSession(sessionId);
    if (session.principal.role === 'EMAIL_ONLY_USER') {
      return Array.from(this.mailboxes.values()).filter(
        (m) => m.id === session.principal.mailboxId
      );
    }
    const allowedAccountIds = new Set(this.listHostingAccounts(sessionId).map((a) => a.id));
    return Array.from(this.mailboxes.values()).filter((m) =>
      allowedAccountIds.has(m.accountId)
    );
  }

  public createMailbox(sessionId: string, rawInput: unknown): {
    mailbox: EmailAccount;
    job: InfrastructureJob;
  } {
    const session = this.requireSession(sessionId);
    const parsed = CreateEmailAccountSchema.parse(rawInput);
    const account = this.requireAccountAccess(session, parsed.accountId, 'email:mailbox:manage');
    let domain = this.domains.get(parsed.domainId);
    if (!domain && this.cleanSlate) {
      domain = Array.from(this.domains.values()).find((d) => d.accountId === account.id) ?? Array.from(this.domains.values())[0];
    }
    if (!domain || domain.accountId !== account.id) {
      throw new Error('VALIDATION_FAILED: Domain does not belong to hosting account');
    }

    const emailAddress = `${parsed.localPart.toLowerCase()}@${domain.domainName}`;
    for (const existing of this.mailboxes.values()) {
      if (existing.emailAddress === emailAddress) {
        throw new Error(`RESOURCE_CONFLICT: Mailbox ${emailAddress} already exists`);
      }
    }

    const reqId = `req_${randomUUID()}`;
    const agentRes = this.agent.execute({
      requestId: reqId,
      idempotencyKey: reqId,
      operation: 'ConfigureMailbox',
      actorUserId: session.principal.userId,
      actorRole: session.principal.role,
      tenantOrganizationId: account.organizationId,
      targetAccountId: account.id,
      dryRun: parsed.dryRun,
      params: {
        linuxUsername: account.linuxUsername,
        emailAddress,
      },
    });

    const mailbox: EmailAccount = {
      id: `mbx_${randomUUID().slice(0, 8)}`,
      accountId: account.id,
      domainId: domain.id,
      domainName: domain.domainName,
      localPart: parsed.localPart.toLowerCase(),
      emailAddress,
      quotaMb: parsed.quotaMb,
      usedMb: 1,
      imapEnabled: true,
      smtpEnabled: true,
      webmailEnabled: true,
      spamFilterLevel: parsed.spamFilterLevel,
      rspamdRejectScore: parsed.spamFilterLevel === 'STRICT' ? 8 : 12,
      autoresponder: {
        enabled: false,
        subject: 'Out of Office',
        bodyText: '',
        startAt: null,
        endAt: null,
      },
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    if (!parsed.dryRun) {
      this.mailboxes.set(mailbox.id, mailbox);
    }

    const job = this.recordJobAndAudit(
      session,
      account.id,
      'email.mailbox.create',
      `Create mailbox ${emailAddress} (quota ${parsed.quotaMb} MB)`,
      parsed.dryRun,
      agentRes
    );

    return { mailbox, job };
  }

  public getMailPreflightReport(sessionId: string) {
    this.requireSession(sessionId);
    return evaluateMailServerPreflight({
      outboundPort25Open: true,
      smtpRelayConfigured: true,
      ptrMatchesHostname: true,
      hostnameIsFqdn: true,
      spfValid: true,
      dkimConfigured: true,
      dmarcValid: true,
      dnsResolverHealthy: true,
      mxRecordsValid: true,
      tlsCertificateValid: true,
      ipListedOnRbl: false,
      mailPortsAvailable: true,
      conflictingMtaDetected: false,
      isMockData: true,
    });
  }

  public listPackages(): HostingPackage[] {
    return Array.from(this.packages.values());
  }

  public listJobs(sessionId: string): InfrastructureJob[] {
    const allowedAccountIds = new Set(this.listHostingAccounts(sessionId).map((a) => a.id));
    return Array.from(this.jobs.values()).filter(
      (j) => j.accountId === null || allowedAccountIds.has(j.accountId)
    );
  }

  public listAuditLogs(sessionId: string): ExtendedAuditEntry[] {
    const session = this.requireSession(sessionId);
    this.requirePermission(session, 'audit:read', {
      organizationId: session.principal.organizationId,
    });
    return this.auditLogs.filter(
      (a) => a.organizationId === session.principal.organizationId
    );
  }

  private provisionDomainInternal(
    session: PanelSessionRecord,
    account: ExtendedHostingAccount,
    parsed: ReturnType<typeof CreateDomainSchema.parse>
  ) {
    const domainId = `dom_${randomUUID().slice(0, 8)}`;
    const org = this.organizations.get(account.organizationId);
    const domain: ExtendedDomain = {
      id: domainId,
      organizationId: account.organizationId,
      resellerId: account.resellerId,
      accountId: account.id,
      linuxUsername: account.linuxUsername,
      parentDomainId: parsed.parentDomainId ?? null,
      domainName: parsed.domainName,
      isSubdomain: Boolean(parsed.parentDomainId),
      documentRoot: `/home/${account.linuxUsername}/${parsed.documentRootRelative}`,
      templateType: parsed.templateType,
      phpVersion: parsed.phpVersion ?? '8.3',
      forceHttps: parsed.forceHttps,
      hstsEnabled: parsed.hstsEnabled,
      http3Enabled: parsed.http3Enabled,
      sslStatus: parsed.autoIssueSsl ? 'ACTIVE' : 'NONE',
      sslExpiresAt: parsed.autoIssueSsl
        ? new Date(Date.now() + 90 * 86400 * 1000).toISOString()
        : null,
      sslIssuer: parsed.autoIssueSsl ? "Let's Encrypt E6 (ACME v2)" : null,
      sslAutoRenew: parsed.autoIssueSsl,
      status: 'ACTIVE',
      dnsManagementMode: org?.defaultDnsMode ?? 'LOCAL_POWERDNS',
      createdAt: new Date().toISOString(),
    };

    const serverRecord = this.servers.get('srv_almalinux10_primary');
    const serverIp = this.cleanSlate ? (serverRecord?.primaryIpv4 ?? '200.234.39.100') : '198.51.100.42';
    const zoneId = `zone_${randomUUID().slice(0, 8)}`;
    const zone: DnsZone = {
      id: zoneId,
      accountId: account.id,
      domainId: domain.id,
      zoneName: domain.domainName,
      soaSerial: 2026101901,
      dnssecEnabled: true,
      dnssecDsRecord: `49012 13 2 9B8F7C1E3A2D4F6E8A0C2B4D6F8A1C3E5B7D9F1A2C4E6B8D0A1C3E5F7B9D2E4A`,
      nameservers: this.cleanSlate
        ? [`ns1.${domain.domainName}`, `ns2.${domain.domainName}`]
        : ['ns1.garvixdns.example', 'ns2.garvixdns.example'],
      records: [
        {
          id: `dnsrec_${randomUUID().slice(0, 8)}`,
          zoneId,
          domainId: domain.id,
          domainName: domain.domainName,
          name: '@',
          type: 'A',
          content: serverIp,
          ttl: 3600,
          priority: null,
          isSystemManaged: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: `dnsrec_${randomUUID().slice(0, 8)}`,
          zoneId,
          domainId: domain.id,
          domainName: domain.domainName,
          name: 'mail',
          type: 'A',
          content: serverIp,
          ttl: 3600,
          priority: null,
          isSystemManaged: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: `dnsrec_${randomUUID().slice(0, 8)}`,
          zoneId,
          domainId: domain.id,
          domainName: domain.domainName,
          name: '@',
          type: 'MX',
          content: `mail.${domain.domainName}`,
          ttl: 3600,
          priority: 10,
          isSystemManaged: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: `dnsrec_${randomUUID().slice(0, 8)}`,
          zoneId,
          domainId: domain.id,
          domainName: domain.domainName,
          name: '@',
          type: 'TXT',
          content: `v=spf1 ip4:${serverIp} -all`,
          ttl: 3600,
          priority: null,
          isSystemManaged: true,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    if (!parsed.dryRun) {
      this.domains.set(domain.id, domain);
      this.dnsZones.set(domain.id, zone);
      if (parsed.autoIssueSsl) {
        const certId = `ssl_${randomUUID().slice(0, 8)}`;
        this.sslCertificates.set(certId, {
          id: certId,
          accountId: account.id,
          domainId: domain.id,
          domainName: domain.domainName,
          provider: 'LETS_ENCRYPT',
          challengeType: 'HTTP_01',
          sanDomains: [domain.domainName, `www.${domain.domainName}`],
          issuer: "Let's Encrypt E6 (ACME v2)",
          serialNumber: `04:${randomUUID().replace(/-/g, '').slice(0, 16)}`,
          fingerprintSha256: `SHA256:${randomUUID().replace(/-/g, '')}`,
          certPath: `/etc/garvix/ssl/${domain.domainName}/fullchain.pem`,
          issuedAt: new Date().toISOString(),
          expiresAt: domain.sslExpiresAt!,
          autoRenew: true,
          status: 'VALID',
          lastRenewalAttemptAt: new Date().toISOString(),
          lastRenewalError: null,
        });
      }
    }

    return { domain, zone };
  }

  private requireSession(sessionId: string): PanelSessionRecord {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('AUTH_SESSION_EXPIRED: Valid session token required');
    }
    return session;
  }

  private requirePermission(
    session: PanelSessionRecord,
    permission: PermissionKey,
    resource: TargetResourceDescriptor
  ): void {
    const decision = authorizeAction(session.principal, permission, resource);
    if (!decision.allowed) {
      throw new Error(`${decision.code}: ${decision.reason}`);
    }
  }

  private requireAccountAccess(
    session: PanelSessionRecord,
    accountId: string,
    permission: PermissionKey
  ): ExtendedHostingAccount {
    let account = this.accounts.get(accountId);
    if (!account && this.cleanSlate) {
      account = Array.from(this.accounts.values())[0];
      if (!account) {
        const defaultDomain = os.hostname().includes('.')
          ? os.hostname()
          : 'srv2075790.hstgr.cloud';
        const autoAcc: ExtendedHostingAccount = {
          id: 'acc_primary',
          organizationId: session.principal.organizationId,
          resellerId: null,
          ownerUserId: session.principal.userId,
          ownerEmail: session.email,
          packageId: 'pkg_business_nvme',
          packageName: 'Garvix Business NVMe (25 GB)',
          linuxUsername: 'serveradmin',
          linuxUid: this.nextLinuxUid++,
          homeDirectory: '/home/serveradmin',
          primaryDomain: defaultDomain,
          status: 'ACTIVE',
          provisioningState: 'ACTIVE',
          stateHistory: ['PREFLIGHT', 'ACTIVE'],
          diskUsedMb: 0,
          diskQuotaMb: 25600,
          bandwidthUsedMb: 0,
          bandwidthQuotaMb: 1024000,
          cpuQuotaPercent: 200,
          memoryLimitMb: 2048,
          sshEnabled: true,
          suspendedReason: null,
          createdAt: new Date().toISOString(),
        };
        this.accounts.set(autoAcc.id, autoAcc);
        if (!session.principal.allocatedAccountIds.includes(autoAcc.id)) {
          session.principal.allocatedAccountIds.push(autoAcc.id);
        }
        const adminUser = this.users.get('admin');
        if (adminUser && !adminUser.allocatedAccountIds.includes(autoAcc.id)) {
          adminUser.allocatedAccountIds.push(autoAcc.id);
        }
        this.provisionDomainInternal(session, autoAcc, {
          accountId: autoAcc.id,
          domainName: defaultDomain,
          parentDomainId: null,
          documentRootRelative: 'public_html',
          templateType: 'PHP',
          phpVersion: '8.3',
          forceHttps: true,
          hstsEnabled: true,
          http3Enabled: true,
          autoIssueSsl: true,
          dryRun: false,
        });
        account = autoAcc;
      }
    }
    if (!account) {
      throw new Error(`RESOURCE_NOT_FOUND: Hosting account ${accountId} not found`);
    }
    this.requirePermission(session, permission, {
      organizationId: account.organizationId,
      resellerId: account.resellerId,
      accountId: account.id,
    });
    return account;
  }

  private recordJobAndAudit(
    session: PanelSessionRecord,
    accountId: string | null,
    operation: string,
    summary: string,
    isDryRun: boolean,
    agentRes: ReturnType<MockLinuxAgentAdapter['execute']>
  ): InfrastructureJob {
    const jobId = `job_${randomUUID().slice(0, 8)}`;
    const nowIso = new Date().toISOString();
    const job: InfrastructureJob = {
      id: jobId,
      accountId,
      triggeredByUserId: session.principal.userId,
      triggeredByUsername: session.username,
      operation,
      summary,
      isDryRun,
      status:
        agentRes.status === 'FAILED_ROLLED_BACK'
          ? 'ROLLED_BACK'
          : agentRes.status === 'REJECTED'
            ? 'FAILED'
            : 'SUCCEEDED',
      plannedChanges: agentRes.plannedSteps.map((step) => ({
        type: 'FILE_WRITE',
        target: step.targetPathOrResource,
        summary: step.description,
        rollbackStrategy: step.rollbackAction,
        diffPreview: `[Step ${step.stepOrder}] ${step.actionType} -> ${step.targetPathOrResource}`,
      })),
      snapshotId: agentRes.snapshotId,
      canRollback: true,
      errorMessage: agentRes.error?.message ?? null,
      startedAt: nowIso,
      completedAt: nowIso,
    };

    this.jobs.set(job.id, job);
    this.appendAudit(
      session,
      operation,
      accountId ? 'hosting_account' : 'server',
      accountId ?? 'srv_almalinux10_primary',
      isDryRun,
      job.id,
      summary
    );

    return job;
  }

  private appendAudit(
    session: PanelSessionRecord,
    action: string,
    resourceType: string,
    resourceId: string,
    isDryRun: boolean,
    jobId: string | null,
    summary: string
  ): void {
    this.auditLogs.unshift({
      id: `aud_${randomUUID().slice(0, 8)}`,
      organizationId: session.principal.organizationId,
      actorUserId: session.principal.userId,
      actorUsername: session.username,
      actorRole: session.principal.role,
      action,
      resourceType,
      resourceId,
      ipAddress: session.ipAddress,
      isDryRun,
      jobId,
      summary,
      createdAt: new Date().toISOString(),
    });
    if (this.cleanSlate) {
      this.savePersistedState();
    }
  }

  private loadPersistedState(): void {
    if (!this.stateFilePath) return;
    try {
      if (!fs.existsSync(this.stateFilePath)) return;
      const raw = fs.readFileSync(this.stateFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.packages)) {
        for (const [k, v] of parsed.packages) this.packages.set(k, v);
      }
      if (Array.isArray(parsed.accounts)) {
        for (const [k, v] of parsed.accounts) this.accounts.set(k, v);
      }
      if (Array.isArray(parsed.domains)) {
        for (const [k, v] of parsed.domains) this.domains.set(k, v);
      }
      if (Array.isArray(parsed.dnsZones)) {
        for (const [k, v] of parsed.dnsZones) this.dnsZones.set(k, v);
      }
      if (Array.isArray(parsed.sslCertificates)) {
        for (const [k, v] of parsed.sslCertificates) this.sslCertificates.set(k, v);
      }
      if (Array.isArray(parsed.databases)) {
        for (const [k, v] of parsed.databases) this.databases.set(k, v);
      }
      if (Array.isArray(parsed.applications)) {
        for (const [k, v] of parsed.applications) this.applications.set(k, v);
      }
      if (Array.isArray(parsed.mailboxes)) {
        for (const [k, v] of parsed.mailboxes) this.mailboxes.set(k, v);
      }
      if (Array.isArray(parsed.jobs)) {
        for (const [k, v] of parsed.jobs) this.jobs.set(k, v);
      }
      if (Array.isArray(parsed.auditLogs)) {
        this.auditLogs.splice(0, this.auditLogs.length, ...parsed.auditLogs);
      }
      if (typeof parsed.nextInternalAppPort === 'number') {
        this.nextInternalAppPort = parsed.nextInternalAppPort;
      }
      if (typeof parsed.nextLinuxUid === 'number') {
        this.nextLinuxUid = parsed.nextLinuxUid;
      }
      const adminUser = this.users.get('admin');
      if (adminUser) {
        adminUser.allocatedAccountIds = Array.from(this.accounts.keys());
      }
    } catch (_) {}
  }

  private savePersistedState(): void {
    if (!this.stateFilePath) return;
    try {
      fs.mkdirSync(path.dirname(this.stateFilePath), { recursive: true });
      const payload = {
        packages: Array.from(this.packages.entries()),
        accounts: Array.from(this.accounts.entries()),
        domains: Array.from(this.domains.entries()),
        dnsZones: Array.from(this.dnsZones.entries()),
        sslCertificates: Array.from(this.sslCertificates.entries()),
        databases: Array.from(this.databases.entries()),
        applications: Array.from(this.applications.entries()),
        mailboxes: Array.from(this.mailboxes.entries()),
        jobs: Array.from(this.jobs.entries()),
        auditLogs: this.auditLogs.slice(0, 200),
        nextInternalAppPort: this.nextInternalAppPort,
        nextLinuxUid: this.nextLinuxUid,
      };
      fs.writeFileSync(this.stateFilePath, JSON.stringify(payload, null, 2), 'utf8');
    } catch (_) {}
  }

  private seedPhase1Data(): void {
    const orgId = 'org_garvix_demo';
    this.organizations.set(orgId, {
      id: orgId,
      name: this.cleanSlate ? 'Garvix Software Solutions Pvt Ltd' : 'Garvix Cloud Hosting Demo Org',
      slug: this.cleanSlate ? 'garvix-software' : 'garvix-demo-org',
      gstin: '27AABCG4829K1Z5',
      stateCode: '27', // Maharashtra
      billingEmail: this.cleanSlate ? 'billing@garvix.in' : 'billing@garvix.example',
      defaultDnsMode: 'LOCAL_POWERDNS',
      createdAtIso: '2026-10-01T00:00:00.000Z',
    });

    const detectedHostname = os.hostname().includes('.')
      ? os.hostname()
      : 'srv2075790.hstgr.cloud';

    this.servers.set('srv_almalinux10_primary', {
      id: 'srv_almalinux10_primary',
      organizationId: orgId,
      hostname: this.cleanSlate ? detectedHostname : 'node01.almalinux10.garvix.internal',
      primaryIpv4: this.cleanSlate ? '200.234.39.100' : '198.51.100.42',
      osRelease: this.cleanSlate
        ? 'AlmaLinux 10.2 (Purple Lion)'
        : 'AlmaLinux 10.0 (Purple Lion) — Mock Adapter Mode',
      agentVersion: '1.0.0',
      panelVersion: '1.0.0',
      status: 'ONLINE',
      hardwareProfile: BASELINE_ALMALINUX10_PROFILE,
      enrolledAtIso: '2026-10-01T00:00:00.000Z',
    });

    this.packages.set('pkg_business_nvme', {
      id: 'pkg_business_nvme',
      name: 'Garvix Business NVMe (25 GB)',
      diskQuotaMb: 25600,
      bandwidthQuotaMb: 1024000,
      maxDomains: null,
      maxDatabases: null,
      maxEmailAccounts: null,
      cpuQuotaPercent: 200,
      memoryLimitMb: 2048,
      sshAccessAllowed: true,
      createdAt: '2026-10-01T00:00:00.000Z',
    });

    this.packages.set('pkg_starter_nvme', {
      id: 'pkg_starter_nvme',
      name: 'Garvix Starter NVMe (10 GB)',
      diskQuotaMb: 10240,
      bandwidthQuotaMb: 256000,
      maxDomains: 5,
      maxDatabases: 5,
      maxEmailAccounts: 25,
      cpuQuotaPercent: 100,
      memoryLimitMb: 1024,
      sshAccessAllowed: false,
      createdAt: '2026-10-01T00:00:00.000Z',
    });

    if (this.cleanSlate) {
      this.users.set('admin', {
        userId: 'usr_admin',
        username: 'admin',
        email: 'admin@garvix.in',
        fullName: 'Garvix Server Administrator',
        passwordHash: hashPasswordScrypt('GarvixAdmin#2026'),
        role: 'SERVER_ADMIN',
        organizationId: orgId,
        allocatedServerIds: ['srv_almalinux10_primary'],
        allocatedResellerId: null,
        allocatedAccountIds: [],
        mailboxId: null,
      });
      return;
    }

    const acmeAccount: ExtendedHostingAccount = {
      id: 'acc_acme_prod',
      organizationId: orgId,
      resellerId: 'res_partner_1',
      ownerUserId: 'usr_admin',
      ownerEmail: 'ops@acmecorp.example',
      packageId: 'pkg_business_nvme',
      packageName: 'Garvix Business NVMe (25 GB)',
      linuxUsername: 'acmeprod',
      linuxUid: this.nextLinuxUid++,
      homeDirectory: '/home/acmeprod',
      primaryDomain: 'acmecorp.example',
      status: 'ACTIVE',
      provisioningState: 'ACTIVE',
      stateHistory: [
        'PREFLIGHT',
        'PROVISIONING_LINUX_USER',
        'PROVISIONING_HOME_FS',
        'PROVISIONING_WEB_VHOST',
        'PROVISIONING_DNS',
        'ACTIVE',
      ],
      diskUsedMb: 1420,
      diskQuotaMb: 25600,
      bandwidthUsedMb: 8450,
      bandwidthQuotaMb: 1024000,
      cpuQuotaPercent: 200,
      memoryLimitMb: 2048,
      sshEnabled: true,
      suspendedReason: null,
      createdAt: '2026-10-05T09:00:00.000Z',
    };
    this.accounts.set(acmeAccount.id, acmeAccount);

    this.users.set('admin', {
      userId: 'usr_admin',
      username: 'admin',
      email: 'admin@garvix.example',
      fullName: 'Garvix Server Administrator',
      passwordHash: hashPasswordScrypt('GarvixAdmin#2026'),
      role: 'SERVER_ADMIN',
      organizationId: orgId,
      allocatedServerIds: ['srv_almalinux10_primary'],
      allocatedResellerId: null,
      allocatedAccountIds: ['acc_acme_prod'],
      mailboxId: null,
    });

    // Seed primary domain, DNS zone, SSL certificate, databases, app, and mailbox for acmeprod
    const dummySession: PanelSessionRecord = {
      sessionId: 'ses_seed',
      principal: {
        userId: 'usr_admin',
        role: 'SERVER_ADMIN',
        organizationId: orgId,
        allocatedServerIds: ['srv_almalinux10_primary'],
        allocatedResellerId: null,
        allocatedAccountIds: ['acc_acme_prod'],
        mailboxId: null,
        mfaVerifiedAtIso: new Date().toISOString(),
      },
      username: 'admin',
      email: 'admin@garvix.example',
      fullName: 'Garvix Server Administrator',
      totpSecretHex: this.defaultTotpSecretHex,
      ipAddress: '127.0.0.1',
      createdAtIso: new Date().toISOString(),
      expiresAtIso: new Date(Date.now() + 86400_000).toISOString(),
    };

    const { domain } = this.provisionDomainInternal(dummySession, acmeAccount, {
      accountId: acmeAccount.id,
      domainName: 'acmecorp.example',
      parentDomainId: null,
      documentRootRelative: 'public_html',
      templateType: 'NODEJS',
      phpVersion: null,
      forceHttps: true,
      hstsEnabled: true,
      http3Enabled: true,
      autoIssueSsl: true,
      dryRun: false,
    });

    this.databases.set('db_acme_pg', {
      id: 'db_acme_pg',
      accountId: acmeAccount.id,
      linuxUsername: acmeAccount.linuxUsername,
      engine: 'POSTGRESQL',
      name: 'gv_acmeprod_commerce',
      charset: 'UTF8',
      collation: 'en_US.UTF-8',
      sizeMb: 248,
      tablesCount: 34,
      assignedUsers: [
        {
          userId: 'dbu_acme_pg',
          username: 'gv_acmeprod_pguser',
          privileges: 'ALL',
        },
      ],
      connectionHost: '127.0.0.1',
      connectionPort: 5432,
      status: 'ONLINE',
      createdAt: '2026-10-05T09:15:00.000Z',
    });

    this.databases.set('db_acme_maria', {
      id: 'db_acme_maria',
      accountId: acmeAccount.id,
      linuxUsername: acmeAccount.linuxUsername,
      engine: 'MARIADB',
      name: 'gv_acmeprod_analytics',
      charset: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
      sizeMb: 112,
      tablesCount: 18,
      assignedUsers: [
        {
          userId: 'dbu_acme_maria',
          username: 'gv_acmeprod_mariauser',
          privileges: 'READ_WRITE',
        },
      ],
      connectionHost: '127.0.0.1',
      connectionPort: 3306,
      status: 'ONLINE',
      createdAt: '2026-10-05T09:20:00.000Z',
    });

    this.applications.set('app_acme_portal', {
      id: 'app_acme_portal',
      accountId: acmeAccount.id,
      linuxUsername: acmeAccount.linuxUsername,
      domainId: domain.id,
      domainName: domain.domainName,
      name: 'Acme Customer Portal (Node 22 + Vite)',
      appType: 'NODEJS',
      runtimeVersion: 'node-22',
      appRoot: '/home/acmeprod/apps/portal',
      publicDir: '/home/acmeprod/apps/portal/dist',
      entryPoint: 'server/index.mjs',
      internalPort: this.nextInternalAppPort++,
      processManager: 'SYSTEMD',
      instances: 2,
      memoryLimitMb: 1024,
      cpuQuotaPercent: 150,
      envKeys: ['DATABASE_URL', 'NODE_ENV', 'SESSION_SECRET'],
      phpFpmConfig: null,
      status: 'RUNNING',
      lastDeployedAt: '2026-10-18T14:30:00.000Z',
      createdAt: '2026-10-05T10:00:00.000Z',
    });

    this.mailboxes.set('mbx_founder_acme', {
      id: 'mbx_founder_acme',
      accountId: acmeAccount.id,
      domainId: domain.id,
      domainName: domain.domainName,
      localPart: 'founder',
      emailAddress: 'founder@acmecorp.example',
      quotaMb: 5120,
      usedMb: 340,
      imapEnabled: true,
      smtpEnabled: true,
      webmailEnabled: true,
      spamFilterLevel: 'STANDARD',
      rspamdRejectScore: 12,
      autoresponder: {
        enabled: false,
        subject: 'Out of Office',
        bodyText: '',
        startAt: null,
        endAt: null,
      },
      status: 'ACTIVE',
      createdAt: '2026-10-05T10:30:00.000Z',
    });
  }
}
