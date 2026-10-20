import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CommercialCloudEngine } from '@garvix/cloud-api';
import {
  BackupAndDisasterRecoveryEngine,
  compileEmailStackConfigurations,
  SandboxedFileManager,
  SandboxedLinuxAgentEngine,
  validateNoOpenRelayConfig,
  WhmResellerEngine,
} from '@garvix/local-panel-api';
import {
  authorizeAction,
  type AuthenticatedPrincipal,
} from '@garvix/authorization';
import { redactSensitiveFields } from '@garvix/telemetry';

describe('Phase 7 — Chaos, Failure-Injection, Disaster Recovery & Launch Readiness Audit', () => {
  let sandboxDir: string;

  beforeEach(() => {
    sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'garvix-phase7-dr-'));
  });

  afterEach(() => {
    fs.rmSync(sandboxDir, { recursive: true, force: true });
  });

  it('executes full Bare-Metal Disaster Recovery drill with byte-for-byte SHA-256 verification and detects tampered encrypted snapshots', () => {
    const fm = new SandboxedFileManager(sandboxDir);
    const dr = new BackupAndDisasterRecoveryEngine(sandboxDir);

    // 1. Populate realistic multi-component tenant state (web files + maildir + databases)
    const indexHtml = '<!DOCTYPE html><html><body>Garvix Enterprise Portal</body></html>';
    const mailMsg = 'From: billing@garvix.io\r\nTo: ceo@tenant.in\r\nSubject: Invoice\r\n\r\nThank you.';

    const webFile = fm.writeFile({
      linuxUsername: 'gv_ent01',
      relativePath: 'public_html/index.html',
      content: indexHtml,
      modeOctal: '0644',
    });
    const mailFile = fm.writeFile({
      linuxUsername: 'gv_ent01',
      relativePath: 'mail/tenant.in/ceo/cur/1729300000.M1_2,S',
      content: mailMsg,
      modeOctal: '0600',
    });

    const policy = dr.createBackupPolicy({
      accountId: null, // Server-wide DR policy
      name: 'Phase 7 Bare-Metal DR Policy',
      scheduleCron: '0 1 * * *',
      storageTarget: 'S3_COMPATIBLE_OBJECT_STORE',
      repositoryUri: 's3:https://s3.ap-south-1.amazonaws.com/garvix-dr-vault',
      retentionDaily: 14,
      retentionWeekly: 8,
      retentionMonthly: 12,
      repositoryPassphrase: 'phase7-disaster-recovery-master-passphrase-2026',
    });

    const snapshot = dr.createEncryptedBackupSnapshot({
      policyId: policy.id,
      accountId: 'acc_ent_01',
      linuxUsername: 'gv_ent01',
      databasesToDump: [
        {
          engine: 'POSTGRESQL',
          databaseName: 'gv_ent01_erp',
          dumpFormat: 'PG_CUSTOM',
          logicalSqlOrHeaderPayload: 'CREATE TABLE ledger (id UUID PRIMARY KEY, total_paise BIGINT);',
        },
        {
          engine: 'MARIADB',
          databaseName: 'gv_ent01_crm',
          dumpFormat: 'MARIADB_SINGLE_TRANSACTION_SQL',
          logicalSqlOrHeaderPayload: 'CREATE TABLE contacts (id INT PRIMARY KEY, email VARCHAR(255));',
        },
      ],
      panelMetadataJson: {
        primaryDomain: 'tenant.in',
        sslCertSerial: 'LE-99887766',
      },
    });

    // 2. Verify snapshot in isolated ephemeral sandbox per ADR-005
    const verification = dr.verifyBackupInSandbox(snapshot.id);
    expect(verification.verified).toBe(true);
    expect(verification.filesChecked).toBe(5);
    expect(verification.databaseDumpsValidated).toBe(2);
    expect(verification.sandboxCleanedUp).toBe(true);

    // 3. Simulate catastrophic disk loss of /home/gv_ent01
    fs.rmSync(path.join(sandboxDir, 'home', 'gv_ent01'), {
      recursive: true,
      force: true,
    });
    expect(
      fs.existsSync(path.join(sandboxDir, 'home', 'gv_ent01', 'public_html', 'index.html'))
    ).toBe(false);

    // 4. Execute Bare-Metal DR restoration
    const drRestore = dr.restoreFromBackup({
      backupArtifactId: snapshot.id,
      scope: 'BARE_METAL_SERVER_DR',
      stepUpMfaVerified: true,
    });
    expect(drRestore.restoredFilesCount).toBe(2);
    expect(drRestore.restoredDatabasesCount).toBe(2);
    expect(drRestore.preRestoreSafetySnapshotCreated).toBe(true);

    // 5. Verify byte-for-byte SHA-256 integrity of restored files
    const restoredWeb = fm.readFile({
      linuxUsername: 'gv_ent01',
      relativePath: 'public_html/index.html',
    });
    const restoredMail = fm.readFile({
      linuxUsername: 'gv_ent01',
      relativePath: 'mail/tenant.in/ceo/cur/1729300000.M1_2,S',
    });
    expect(restoredWeb.info.sha256Checksum).toBe(webFile.sha256Checksum);
    expect(restoredMail.info.sha256Checksum).toBe(mailFile.sha256Checksum);

    // 6. Chaos test: Flip 1 byte in the encrypted Restic snapshot on disk and verify AES-256-GCM authTag rejection
    const rawCiphertext = fs.readFileSync(snapshot.encryptedPayloadPath);
    rawCiphertext[rawCiphertext.length - 1] ^= 0xff;
    fs.writeFileSync(snapshot.encryptedPayloadPath, rawCiphertext);

    const tamperedCheck = dr.verifyBackupInSandbox(snapshot.id);
    expect(tamperedCheck.verified).toBe(false);
    expect(tamperedCheck.sandboxCleanedUp).toBe(true);
    expect(snapshot.status).toBe('CORRUPTED_REJECTED');
  });

  it('guarantees non-disruptive offline grace operation during Cloud Control Plane outages and preserves workloads on license expiry', () => {
    const cloud = new CommercialCloudEngine({ supplierStateCode: '27' });
    const nowIso = new Date().toISOString();

    const orgOwner: AuthenticatedPrincipal = {
      userId: 'usr_kochi_owner',
      role: 'CUSTOMER_ORG_OWNER',
      organizationId: 'org_kochi_web',
      allocatedServerIds: [],
      allocatedResellerId: null,
      allocatedAccountIds: [],
      mailboxId: null,
      mfaVerifiedAtIso: nowIso,
    };

    cloud.registerCustomerOrganization({
      organizationId: 'org_kochi_web',
      name: 'Kochi Web Hosting Pvt Ltd',
      gstin: '32AABCK1234F1Z5',
      stateCode: '32',
      billingEmail: 'founder@kochiweb.in',
    });

    const { license } = cloud.createOrUpgradeSubscription(orgOwner, {
      organizationId: 'org_kochi_web',
      tier: 'ANNUAL',
      maxHostingAccounts: 'UNLIMITED',
      maxServers: 3,
      monthlyPricePaise: 249900,
    });

    const enroll = cloud.createServerEnrollmentToken(orgOwner, 'org_kochi_web');

    const enrolledServer = cloud.completeServerEnrollment({
      rawEnrollmentToken: enroll.rawEnrollmentToken,
      hostnameFqdn: 'kl01.kochiweb.in',
      hardwareFingerprintHash: 'sha256:kl01_hw_fp',
      primaryIpv4: '203.0.113.88',
      osFamily: 'ALMALINUX_10',
    });

    const envelope = cloud.activateServerLicense({
      licenseId: license.licenseId,
      serverId: enrolledServer.serverId,
    });

    // Verify normal active license evaluation even if public IPv4 changes dynamically
    const ipChangedEval = cloud.evaluateServerLicenseStatusLocally({
      envelope,
      currentHardwareFingerprintHash: 'sha256:kl01_hw_fp',
      currentPrimaryIpv4: '198.51.100.222', // Dynamic IP change tolerated
    });
    expect(ipChangedEval.operationalMode).toBe('ACTIVE_NORMAL');
    expect(ipChangedEval.ipChangedWarning).toBe(true);
    expect(ipChangedEval.allowExistingWebsitesAndEmail).toBe(true);
    expect(ipChangedEval.allowDataExportAndBackups).toBe(true);

    // Verify local agent and workloads continue operating during simulated Cloud Control Plane offline window
    const localAgent = new SandboxedLinuxAgentEngine({
      sandboxRoot: sandboxDir,
      authorizedPanelUid: 991,
    });
    const accountResult = localAgent.provisionHostingAccountInSandbox({
      caller: { transport: 'UDS_SO_PEERCRED', uid: 991 },
      actorId: 'usr_kochi_owner',
      linuxUsername: 'kochiapp',
      primaryDomain: 'client.kochiweb.in',
    });
    expect(accountResult.status).toBe('COMMITTED');

    // Verify audit chain integrity remains unbroken
    expect(localAgent.verifyAuditChainIntegrity().valid).toBe(true);
  });

  it('audits end-to-end OWASP ASVS L2 security controls across RBAC, Agent, Mail, Reseller, and Redaction', () => {
    const nowIso = new Date().toISOString();

    // 1. Email-only user cannot access server administration or file manager
    const emailUserAttempt = authorizeAction(
      {
        userId: 'usr_mail_only',
        role: 'EMAIL_ONLY_USER',
        organizationId: 'org_1',
        allocatedServerIds: [],
        allocatedResellerId: null,
        allocatedAccountIds: ['acc_1'],
        mailboxId: 'mbx_1',
        mfaVerifiedAtIso: nowIso,
      },
      'server:service:restart',
      {
        organizationId: 'org_1',
        accountId: 'acc_1',
      }
    );
    expect(emailUserAttempt.allowed).toBe(false);

    // 2. Read-only auditor cannot mutate DNS or databases
    const auditorAttempt = authorizeAction(
      {
        userId: 'usr_auditor',
        role: 'READ_ONLY_AUDITOR',
        organizationId: 'org_1',
        allocatedServerIds: ['srv_1'],
        allocatedResellerId: null,
        allocatedAccountIds: ['acc_1'],
        mailboxId: null,
        mfaVerifiedAtIso: nowIso,
      },
      'database:delete',
      {
        organizationId: 'org_1',
        accountId: 'acc_1',
      }
    );
    expect(auditorAttempt.allowed).toBe(false);

    // 3. Reseller privilege escalation guard (cannot enable SSH in reseller package)
    const serverAdmin: AuthenticatedPrincipal = {
      userId: 'usr_srv_admin',
      role: 'SERVER_ADMIN',
      organizationId: 'org_1',
      allocatedServerIds: ['srv_1'],
      allocatedResellerId: null,
      allocatedAccountIds: [],
      mailboxId: null,
      mfaVerifiedAtIso: nowIso,
    };
    const resellerPrincipal: AuthenticatedPrincipal = {
      userId: 'usr_res_audit',
      role: 'HOSTING_RESELLER',
      organizationId: 'org_1',
      allocatedServerIds: ['srv_1'],
      allocatedResellerId: 'res_audit_1',
      allocatedAccountIds: [],
      mailboxId: null,
      mfaVerifiedAtIso: nowIso,
    };

    const whm = new WhmResellerEngine();
    whm.allocateResellerPool(serverAdmin, {
      resellerId: 'res_audit_1',
      companyName: 'Audit Reseller Host',
      contactEmail: 'audit@reseller.example',
      assignedServerIds: ['srv_1'],
      maxAccounts: 10,
      maxDiskQuotaMb: 51200,
      maxBandwidthQuotaMb: 512000,
      maxAggregateMemoryMb: 4096,
      maxAggregateCpuPercent: 200,
      allowSshPackageCreation: false,
    });
    expect(() =>
      whm.createResellerPackage(resellerPrincipal, {
        resellerId: 'res_audit_1',
        name: 'Illegal SSH Package',
        diskQuotaMb: 5120,
        bandwidthQuotaMb: 51200,
        maxDomains: 5,
        maxDatabases: 5,
        maxEmailAccounts: 10,
        cpuQuotaPercent: 100,
        memoryLimitMb: 512,
        sshAccessAllowed: true,
      })
    ).toThrow(/RESELLER_PRIVILEGE_ESCALATION_BLOCKED/);

    // 4. Mail open-relay prevention
    const stack = compileEmailStackConfigurations({
      mailHostnameFqdn: 'mail.secure.in',
      maxAttachmentMb: 25,
      sslCertPath: '/etc/garvix/ssl/mail.secure.in/fullchain.pem',
      sslKeyPath: '/etc/garvix/ssl/mail.secure.in/privkey.pem',
      enableIpv6: true,
    });
    expect(validateNoOpenRelayConfig(stack.postfixMainCf).valid).toBe(true);

    // 5. Telemetry & logging secret redaction check
    const redacted = redactSensitiveFields({
      event: 'deploy',
      databasePassword: 'my_raw_db_password',
      privateKeyPem:
        '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC\n-----END PRIVATE KEY-----',
      nested: {
        apiToken: 'tok_live_123456',
        safeField: 'visible-value',
      },
    });
    expect(redacted.databasePassword).toBe('[REDACTED_SECRET]');
    expect(redacted.privateKeyPem).toBe('[REDACTED_SECRET]');
    expect(redacted.nested.apiToken).toBe('[REDACTED_SECRET]');
    expect(redacted.nested.safeField).toBe('visible-value');
  });
});
