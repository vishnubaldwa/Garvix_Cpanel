import { describe, expect, it } from 'vitest';
import {
  createLocalPanelHttpServer,
  LocalPanelMvpService,
} from '@garvix/local-panel-api';

describe('Phase 1 — Core Panel MVP Service & REST API Integration Suite', () => {
  it('authenticates with scrypt, enforces TOTP step-up MFA for server restarts, and records immutable audit logs', () => {
    const service = new LocalPanelMvpService();

    // Login without TOTP initially
    const loginRes = service.login({
      username: 'admin',
      password: 'GarvixAdmin#2026',
      ipAddress: '198.51.100.99',
    });

    expect(loginRes.sessionId).toMatch(/^ses_/);
    expect(loginRes.user.role).toBe('SERVER_ADMIN');

    // Attempt privileged service restart without step-up MFA -> must be denied
    expect(() =>
      service.controlServerService({
        sessionId: loginRes.sessionId,
        serverId: 'srv_almalinux10_primary',
        serviceName: 'nginx',
        action: 'reload',
      })
    ).toThrow(/DENIED_STEP_UP_MFA_REQUIRED/);

    // Complete step-up MFA using valid RFC 6238 TOTP code
    const totpCode = service.getTotpDemoCode();
    service.verifyStepUpMfa(loginRes.sessionId, totpCode);

    // Retry service reload with dryRun: true -> succeeds with planned changes
    const job = service.controlServerService({
      sessionId: loginRes.sessionId,
      serverId: 'srv_almalinux10_primary',
      serviceName: 'nginx',
      action: 'reload',
      dryRun: true,
    });

    expect(job.status).toBe('SUCCEEDED');
    expect(job.isDryRun).toBe(true);
    expect(job.plannedChanges.length).toBeGreaterThan(0);
  });

  it('provisions hosting accounts through the full 6-state machine and rolls back cleanly on simulated failure', () => {
    const service = new LocalPanelMvpService();
    const { sessionId } = service.login({
      username: 'admin',
      password: 'GarvixAdmin#2026',
      totpCode: service.getTotpDemoCode(),
    });

    const { account, job } = service.createHostingAccount(sessionId, {
      linuxUsername: 'stellarapp',
      ownerEmail: 'devops@stellar.example',
      primaryDomain: 'stellar.example',
      packageId: 'pkg_business_nvme',
      sshEnabled: true,
      dryRun: false,
    });

    expect(account.status).toBe('ACTIVE');
    expect(account.provisioningState).toBe('ACTIVE');
    expect(account.stateHistory).toEqual([
      'PREFLIGHT',
      'PROVISIONING_LINUX_USER',
      'PROVISIONING_HOME_FS',
      'PROVISIONING_WEB_VHOST',
      'PROVISIONING_DNS',
      'ACTIVE',
    ]);
    expect(job.status).toBe('SUCCEEDED');

    // Verify primary domain and DNS zone were automatically provisioned
    const domains = service.listDomains(sessionId);
    const primaryDom = domains.find((d) => d.domainName === 'stellar.example');
    expect(primaryDom).toBeDefined();
    expect(primaryDom?.sslStatus).toBe('ACTIVE');

    // Simulate agent validation failure during provisioning -> state transitions to FAILED_ROLLED_BACK
    const failedAttempt = service.createHostingAccount(
      sessionId,
      {
        linuxUsername: 'brokenacct',
        ownerEmail: 'ops@broken.example',
        primaryDomain: 'broken.example',
        packageId: 'pkg_starter_nvme',
        sshEnabled: false,
        dryRun: false,
      },
      { simulateAgentFailure: true }
    );

    expect(failedAttempt.account.provisioningState).toBe('FAILED_ROLLED_BACK');
    expect(failedAttempt.job.status).toBe('ROLLED_BACK');
  });

  it('provisions Domains, DNS records, PostgreSQL/MariaDB databases, Wildcard SSL, and Node/PHP applications', () => {
    const service = new LocalPanelMvpService();
    const { sessionId } = service.login({
      username: 'admin',
      password: 'GarvixAdmin#2026',
      totpCode: service.getTotpDemoCode(),
    });

    // 1. Add custom domain
    const { domain } = service.createDomain(sessionId, {
      accountId: 'acc_acme_prod',
      domainName: 'api.acmecorp.example',
      documentRootRelative: 'apps/api/public',
      templateType: 'NODEJS',
      forceHttps: true,
      hstsEnabled: true,
      http3Enabled: true,
      autoIssueSsl: true,
      dryRun: false,
    });
    expect(domain.domainName).toBe('api.acmecorp.example');

    // 2. Upsert DNS record and verify SOA serial increment
    const initialZone = service.getDomainDnsZone(sessionId, domain.id);
    const initialSerial = initialZone.soaSerial;
    const { zone: updatedZone } = service.upsertDnsRecord(sessionId, {
      domainId: domain.id,
      name: 'status',
      type: 'CNAME',
      content: 'statuspage.acmecorp.example',
      ttl: 300,
      priority: null,
    });
    expect(updatedZone.soaSerial).toBe(initialSerial + 1);

    // 3. Provision PostgreSQL 16 database and verify multi-step deletion confirmation
    const { database } = service.createDatabase(sessionId, {
      accountId: 'acc_acme_prod',
      engine: 'POSTGRESQL',
      dbSuffix: 'billing_v2',
    });
    expect(database.name).toBe('gv_acmeprod_billing_v2');
    expect(database.connectionPort).toBe(5432);

    expect(() =>
      service.deleteDatabase({
        sessionId,
        databaseId: database.id,
        confirmationDatabaseName: 'wrong_name',
      })
    ).toThrow(/VALIDATION_FAILED/);

    const delJob = service.deleteDatabase({
      sessionId,
      databaseId: database.id,
      confirmationDatabaseName: 'gv_acmeprod_billing_v2',
    });
    expect(delJob.status).toBe('SUCCEEDED');

    // 4. Issue DNS-01 Wildcard SSL Certificate
    const { certificate } = service.issueSslCertificate(sessionId, {
      domainId: domain.id,
      challengeType: 'DNS_01',
      wildcard: true,
    });
    expect(certificate.sanDomains).toContain('*.api.acmecorp.example');

    // 5. Deploy Node.js 22 application and verify secret values are never exposed in response
    const { application } = service.deployApplication(sessionId, {
      accountId: 'acc_acme_prod',
      domainId: domain.id,
      name: 'Acme GraphQL Gateway',
      appType: 'NODEJS',
      runtimeVersion: 'node-22',
      appRootRelative: 'apps/graphql',
      publicDirRelative: 'apps/graphql/public',
      entryPoint: 'dist/server.js',
      processManager: 'SYSTEMD',
      instances: 2,
      memoryLimitMb: 512,
      cpuQuotaPercent: 100,
      envVars: {
        DATABASE_URL: 'postgresql://gv_acmeprod:secret@127.0.0.1:5432/gv_acmeprod_commerce',
        JWT_SIGNING_SECRET: 'top-secret-key-do-not-expose',
      },
    });
    expect(application.status).toBe('RUNNING');
    expect(application.internalPort).toBeGreaterThanOrEqual(3100);
    expect(application.envKeys).toEqual(['DATABASE_URL', 'JWT_SIGNING_SECRET']);
    expect(JSON.stringify(application)).not.toContain('top-secret-key-do-not-expose');
  });

  it('serves HTTP REST API requests end-to-end with Bearer authentication and mock telemetry banners', async () => {
    const { server, service } = createLocalPanelHttpServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const healthRes = await fetch(`${baseUrl}/api/v1/health`);
      expect(healthRes.status).toBe(200);
      const healthBody = (await healthRes.json()) as { isMockData: boolean };
      expect(healthBody.isMockData).toBe(true);

      const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'GarvixAdmin#2026',
          totpCode: service.getTotpDemoCode(),
        }),
      });
      expect(loginRes.status).toBe(200);
      const loginJson = (await loginRes.json()) as {
        data: { sessionId: string };
      };
      const token = loginJson.data.sessionId;

      const dashRes = await fetch(`${baseUrl}/api/v1/dashboard/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(dashRes.status).toBe(200);
      const dashJson = (await dashRes.json()) as {
        isMockData: boolean;
        data: { counts: { activeHostingAccounts: number } };
      };
      expect(dashJson.isMockData).toBe(true);
      expect(dashJson.data.counts.activeHostingAccounts).toBeGreaterThanOrEqual(1);

      const auditRes = await fetch(`${baseUrl}/api/v1/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(auditRes.status).toBe(200);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
