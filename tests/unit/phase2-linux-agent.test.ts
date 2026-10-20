import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  buildDatabaseProvisioningPlan,
  renderNginxVirtualHost,
  renderPhpFpmPoolConfig,
  renderSystemdAppUnit,
  runSystemPreflight,
  SandboxedLinuxAgentEngine,
  validateNginxVirtualHostConfig,
} from '@garvix/local-panel-api';

describe('Phase 2 — Restricted Linux Agent, Validated Templates, Sandbox Rollback & Audit Chain', () => {
  let sandboxRoot: string;

  beforeEach(() => {
    sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'garvix-agent-phase2-'));
  });

  afterEach(() => {
    fs.rmSync(sandboxRoot, { recursive: true, force: true });
  });

  it('renders hardened Nginx vhosts, PHP-FPM pools, and systemd cgroup v2 units and rejects unsafe directives', () => {
    const phpVhost = renderNginxVirtualHost({
      linuxUsername: 'acmeprod',
      domainName: 'acmecorp.example',
      documentRootRelative: 'public_html',
      templateType: 'PHP',
      phpVersion: '8.3',
      forceHttps: true,
      hstsEnabled: true,
      http3Enabled: true,
    });

    const validation = validateNginxVirtualHostConfig(phpVhost, 'acmeprod');
    expect(validation.valid).toBe(true);
    expect(phpVhost).toContain('ssl_protocols TLSv1.2 TLSv1.3;');
    expect(phpVhost).toContain('fastcgi_pass unix:/run/php-fpm/acmeprod.sock;');

    // Reject Nginx config whose root escapes /home/acmeprod/
    const escapedCheck = validateNginxVirtualHostConfig(
      phpVhost.replace('/home/acmeprod/public_html', '/home/otheruser/public_html'),
      'acmeprod'
    );
    expect(escapedCheck.valid).toBe(false);
    expect(escapedCheck.errors[0]).toContain('escapes tenant home boundary');

    // Verify PHP-FPM per-account pool isolation
    const phpPool = renderPhpFpmPoolConfig({
      linuxUsername: 'acmeprod',
      phpVersion: '8.3',
      pmMode: 'ondemand',
      maxChildren: 10,
      memoryLimitMb: 512,
      uploadMaxFilesizeMb: 64,
      maxExecutionTimeSec: 60,
    });
    expect(phpPool).toContain('php_admin_value[open_basedir] = /home/acmeprod/:/tmp/');
    expect(phpPool).toContain('disable_functions] = exec,passthru,shell_exec,system,proc_open,popen');

    // Verify systemd cgroup v2 application service unit
    const unit = renderSystemdAppUnit({
      linuxUsername: 'acmeprod',
      appSlug: 'portal',
      runtimeVersion: 'node-22',
      workingDirectoryRelative: 'apps/portal',
      entryPointRelative: 'dist/server.js',
      internalPort: 3105,
      memoryLimitMb: 1024,
      cpuQuotaPercent: 150,
    });
    expect(unit).toContain('User=acmeprod');
    expect(unit).toContain('ProtectHome=tmpfs');
    expect(unit).toContain('BindPaths=/home/acmeprod');
    expect(unit).toContain('MemoryMax=1024M');
    expect(unit).toContain('CPUQuota=150%');
  });

  it('passes preflight on clean AlmaLinux 10 sandbox and hard-refuses if cPanel or Plesk is detected', () => {
    const engine = new SandboxedLinuxAgentEngine({ sandboxRoot });
    expect(engine.sandboxRoot).toBe(path.resolve(sandboxRoot));

    const cleanReport = runSystemPreflight({ sandboxRoot });
    expect(cleanReport.safeToProceed).toBe(true);
    expect(cleanReport.osVerified).toBe(true);
    expect(cleanReport.cgroupV2Detected).toBe(true);

    // Simulate existing cPanel installation at /usr/local/cpanel
    fs.mkdirSync(path.join(sandboxRoot, 'usr/local/cpanel'), { recursive: true });
    const conflictReport = runSystemPreflight({ sandboxRoot });
    expect(conflictReport.safeToProceed).toBe(false);
    expect(conflictReport.competingPanelsDetected[0]).toContain('cPanel/WHM');
    expect(conflictReport.errors[0]).toContain('REFUSED_COMPETING_PANEL');
  });

  it('provisions account files with strict permissions in sandbox and rolls back completely if Nginx validation fails', () => {
    const engine = new SandboxedLinuxAgentEngine({
      sandboxRoot,
      authorizedPanelUid: 991,
    });

    // Reject unauthenticated UDS caller UID
    expect(() =>
      engine.provisionHostingAccountInSandbox({
        caller: { transport: 'UDS_SO_PEERCRED', uid: 1005 },
        actorId: 'usr_attacker',
        linuxUsername: 'unauthacct',
        primaryDomain: 'unauth.example',
      })
    ).toThrow(/AGENT_AUTH_DENIED/);

    // Valid provisioning
    const committed = engine.provisionHostingAccountInSandbox({
      caller: { transport: 'UDS_SO_PEERCRED', uid: 991 },
      actorId: 'usr_admin',
      linuxUsername: 'nimbusapp',
      primaryDomain: 'nimbus.example',
    });

    expect(committed.status).toBe('COMMITTED');
    const homeDir = path.join(sandboxRoot, 'home', 'nimbusapp');
    expect(fs.existsSync(homeDir)).toBe(true);
    const homeMode = (fs.statSync(homeDir).mode & 0o777).toString(8);
    expect(homeMode).toBe('710');

    // Provisioning with simulated broken Nginx directive -> automatic snapshot rollback
    const rolledBack = engine.provisionHostingAccountInSandbox({
      caller: { transport: 'UDS_SO_PEERCRED', uid: 991 },
      actorId: 'usr_admin',
      linuxUsername: 'faultyapp',
      primaryDomain: 'faulty.example',
      injectInvalidNginxDirectiveForTest: 'lua_package_path "/etc/shadow"; }',
    });

    expect(rolledBack.status).toBe('FAILED_ROLLED_BACK');
    expect(fs.existsSync(path.join(sandboxRoot, 'home', 'faultyapp'))).toBe(false);
    expect(
      fs.existsSync(path.join(sandboxRoot, 'etc/nginx/conf.d/garvix/faulty.example.conf'))
    ).toBe(false);
  });

  it('enforces 0600 SSL private key permissions, ACME rate limits, DB isolation, and SHA-256 audit chain integrity', () => {
    const engine = new SandboxedLinuxAgentEngine({
      sandboxRoot,
      authorizedPanelUid: 991,
    });
    const caller = { transport: 'UDS_SO_PEERCRED' as const, uid: 991 };

    // Issue 5 certificates for the same domain -> allowed; 6th within 7 days -> blocked by ACME rate-limit guard
    for (let i = 0; i < 5; i++) {
      const certRes = engine.issueSslCertificateInSandbox({
        caller,
        actorId: 'usr_admin',
        linuxUsername: 'acmeprod',
        domainName: 'ratelimit.example',
        challengeType: 'HTTP_01',
      });
      expect(certRes.keyModeOctal).toBe('0600');
    }

    expect(() =>
      engine.issueSslCertificateInSandbox({
        caller,
        actorId: 'usr_admin',
        linuxUsername: 'acmeprod',
        domainName: 'ratelimit.example',
        challengeType: 'HTTP_01',
      })
    ).toThrow(/ACME_RATE_LIMIT_EXCEEDED/);

    // Verify PostgreSQL DDL plan enforces NOSUPERUSER and blocks panel DB access
    const pgPlan = buildDatabaseProvisioningPlan({
      linuxUsername: 'acmeprod',
      engine: 'POSTGRESQL',
      dbSuffix: 'orders',
      userSuffix: 'app',
      privileges: 'ALL',
    });
    expect(pgPlan.parameterizedStatements[0]).toContain('NOSUPERUSER NOCREATEDB NOCREATEROLE');

    expect(() =>
      buildDatabaseProvisioningPlan({
        linuxUsername: 'panel',
        engine: 'POSTGRESQL',
        dbSuffix: 'internal',
        userSuffix: 'admin',
        privileges: 'ALL',
      })
    ).toThrow(/PANEL_DB_ISOLATION_VIOLATION/);

    // Verify SHA-256 hash-chained audit trail integrity
    expect(engine.verifyAuditChainIntegrity().valid).toBe(true);
    expect(engine.getAuditChain().length).toBe(5);
  });
});
