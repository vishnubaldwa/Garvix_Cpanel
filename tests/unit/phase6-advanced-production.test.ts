import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BackupAndDisasterRecoveryEngine,
  FleetAndInstallerOrchestrator,
  SandboxedFileManager,
  SecurityCenterEngine,
} from '@garvix/local-panel-api';

describe('Phase 6 — Advanced Production Features', () => {
  let sandboxDir: string;

  beforeEach(() => {
    sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'garvix-phase6-test-'));
  });

  afterEach(() => {
    fs.rmSync(sandboxDir, { recursive: true, force: true });
  });

  it('enforces File Manager confinement, trash recovery, chmod restrictions, and Zip-Slip / Zip-Bomb protection', () => {
    const fm = new SandboxedFileManager(sandboxDir);

    // 1. Write and read normal confined file
    const written = fm.writeFile({
      linuxUsername: 'gv_acme',
      relativePath: 'public_html/index.html',
      content: '<h1>Welcome to Garvix</h1>',
      modeOctal: '0644',
    });
    expect(written.relativePath).toBe('public_html/index.html');
    expect(written.modeOctal).toBe('0644');

    const readBack = fm.readFile({
      linuxUsername: 'gv_acme',
      relativePath: 'public_html/index.html',
    });
    expect(readBack.content.toString('utf8')).toBe('<h1>Welcome to Garvix</h1>');

    // 2. Reject world-writable (0777) and SUID (4755) chmod modes
    expect(() =>
      fm.changePermissions({
        linuxUsername: 'gv_acme',
        relativePath: 'public_html/index.html',
        modeOctal: '0777',
      })
    ).toThrow(/FILE_MANAGER_FORBIDDEN_MODE/);

    expect(() =>
      fm.changePermissions({
        linuxUsername: 'gv_acme',
        relativePath: 'public_html/index.html',
        modeOctal: '4755',
      })
    ).toThrow(/FILE_MANAGER_FORBIDDEN_MODE/);

    // 3. Reject modifying protected dotfiles (.bashrc) without explicit override
    expect(() =>
      fm.writeFile({
        linuxUsername: 'gv_acme',
        relativePath: '.bashrc',
        content: 'malicious alias',
      })
    ).toThrow(/FILE_MANAGER_PROTECTED_DOTFILE/);

    // 4. Trash and restore workflow
    const trashed = fm.moveToTrash({
      linuxUsername: 'gv_acme',
      relativePath: 'public_html/index.html',
      actorUserId: 'usr_owner_1',
    });
    expect(
      fm.listDirectory({
        linuxUsername: 'gv_acme',
        relativePath: 'public_html',
      })
    ).toHaveLength(0);

    const restored = fm.restoreFromTrash({
      linuxUsername: 'gv_acme',
      trashId: trashed.trashId,
    });
    expect(restored.relativePath).toBe('public_html/index.html');

    // 5. Reject Zip-Slip archive extraction atomically (no partial files written)
    expect(() =>
      fm.extractArchiveEntries({
        linuxUsername: 'gv_acme',
        destinationRelativeDir: 'public_html/uploads',
        entries: [
          { entryPath: 'safe.txt', content: 'safe content' },
          { entryPath: '../../../etc/cron.d/backdoor', content: '* * * * * root id' },
        ],
      })
    ).toThrow(/ARCHIVE_ZIP_SLIP_DETECTED/);

    expect(
      fm.listDirectory({
        linuxUsername: 'gv_acme',
        relativePath: 'public_html/uploads',
      })
    ).toHaveLength(0);

    // 6. Reject symlink entries and Zip-Bomb compression ratio anomalies
    expect(() =>
      fm.extractArchiveEntries({
        linuxUsername: 'gv_acme',
        destinationRelativeDir: 'public_html/uploads',
        entries: [
          {
            entryPath: 'passwd_link',
            content: '',
            isSymlink: true,
            symlinkTarget: '/etc/passwd',
          },
        ],
      })
    ).toThrow(/ARCHIVE_SYMLINK_REJECTED/);

    expect(() =>
      fm.extractArchiveEntries({
        linuxUsername: 'gv_acme',
        destinationRelativeDir: 'public_html/uploads',
        entries: [
          {
            entryPath: 'bomb.bin',
            content: Buffer.alloc(50000, 'A'),
            compressedSizeBytes: 100, // 500x ratio > 100x limit
          },
        ],
      })
    ).toThrow(/ARCHIVE_ZIP_BOMB_DETECTED/);
  });

  it('enforces ADR-005 encrypted backup snapshots, mandatory sandbox restore verification, and granular DR recovery', () => {
    const fm = new SandboxedFileManager(sandboxDir);
    const dr = new BackupAndDisasterRecoveryEngine(sandboxDir);

    fm.writeFile({
      linuxUsername: 'gv_shop',
      relativePath: 'public_html/app.js',
      content: 'console.log("production store v1");',
    });
    fm.writeFile({
      linuxUsername: 'gv_shop',
      relativePath: 'mail/shop.example.com/sales/new/msg1.eml',
      content: 'Subject: Order Confirmation #101',
    });

    const policy = dr.createBackupPolicy({
      accountId: 'acc_shop_01',
      name: 'Nightly Encrypted Restic Policy',
      scheduleCron: '0 2 * * *',
      storageTarget: 'LOCAL_SANDBOX_REPO',
      repositoryUri: 'restic:/var/backups/garvix-restic',
      retentionDaily: 7,
      retentionWeekly: 4,
      retentionMonthly: 6,
      repositoryPassphrase: 'correct-horse-battery-staple-garvix-key',
    });

    const snapshot = dr.createEncryptedBackupSnapshot({
      policyId: policy.id,
      accountId: 'acc_shop_01',
      linuxUsername: 'gv_shop',
      databasesToDump: [
        {
          engine: 'POSTGRESQL',
          databaseName: 'gv_shop_prod',
          dumpFormat: 'PG_CUSTOM',
          logicalSqlOrHeaderPayload: 'CREATE TABLE orders (id INT PRIMARY KEY);',
        },
        {
          engine: 'MARIADB',
          databaseName: 'gv_shop_legacy',
          dumpFormat: 'MARIADB_SINGLE_TRANSACTION_SQL',
          logicalSqlOrHeaderPayload: 'CREATE TABLE legacy_logs (id INT);',
        },
      ],
      panelMetadataJson: {
        domain: 'shop.example.com',
        databasePassword: 'super_secret_should_be_redacted',
      },
    });

    // Must start as COMPLETED_UNVERIFIED (restoreVerified = false)
    expect(snapshot.status).toBe('COMPLETED_UNVERIFIED');
    expect(snapshot.restoreVerified).toBe(false);

    // Attempting to restore before sandbox verification must be blocked
    expect(() =>
      dr.restoreFromBackup({
        backupArtifactId: snapshot.id,
        scope: 'FULL_ACCOUNT',
        stepUpMfaVerified: true,
      })
    ).toThrow(/BACKUP_NOT_RESTORE_VERIFIED/);

    // Execute automated sandbox test-restore verification
    const verifyReport = dr.verifyBackupInSandbox(snapshot.id);
    expect(verifyReport.verified).toBe(true);
    expect(verifyReport.filesChecked).toBe(5);
    expect(verifyReport.databaseDumpsValidated).toBe(2);
    expect(verifyReport.sandboxCleanedUp).toBe(true);
    expect(snapshot.status).toBe('VERIFIED');
    expect(snapshot.restoreVerified).toBe(true);

    // Simulate accidental corruption of production app.js and restore from verified backup
    fm.writeFile({
      linuxUsername: 'gv_shop',
      relativePath: 'public_html/app.js',
      content: 'CORRUPTED_FILE',
    });

    const restoreResult = dr.restoreFromBackup({
      backupArtifactId: snapshot.id,
      scope: 'FULL_ACCOUNT',
      stepUpMfaVerified: true,
    });
    expect(restoreResult.restoredFilesCount).toBe(2);
    expect(restoreResult.restoredDatabasesCount).toBe(2);

    const restoredApp = fm.readFile({
      linuxUsername: 'gv_shop',
      relativePath: 'public_html/app.js',
    });
    expect(restoredApp.content.toString('utf8')).toBe(
      'console.log("production store v1");'
    );
  });

  it('verifies WebAuthn passkeys, detects cloned authenticators, rotates envelope KEKs, and blocks firewalld self-lockout', () => {
    const sec = new SecurityCenterEngine();
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const publicKeyPem = publicKey
      .export({ format: 'pem', type: 'spki' })
      .toString();

    sec.registerWebAuthnPasskey({
      credentialId: 'cred_yubikey_01',
      userId: 'usr_admin_01',
      publicKeyPem,
      initialSignCount: 10,
      deviceLabel: 'YubiKey 5C NFC',
    });

    const challenge = 'chl_987654321';
    const validPayload = Buffer.from(`cred_yubikey_01:${challenge}:11`, 'utf8');
    const validSig = crypto.sign(null, validPayload, privateKey).toString('base64');

    const assertion = sec.verifyWebAuthnAssertion({
      credentialId: 'cred_yubikey_01',
      challenge,
      newSignCount: 11,
      signatureBase64: validSig,
      ipAddress: '203.0.113.10',
    });
    expect(assertion.verified).toBe(true);
    expect(assertion.updatedSignCount).toBe(11);

    // Cloned authenticator replay with non-incrementing signCount (11 <= 11) must be blocked
    expect(() =>
      sec.verifyWebAuthnAssertion({
        credentialId: 'cred_yubikey_01',
        challenge,
        newSignCount: 11,
        signatureBase64: validSig,
        ipAddress: '198.51.100.77',
      })
    ).toThrow(/WEBAUTHN_CLONED_AUTHENTICATOR_DETECTED/);

    // Envelope encryption KEK rotation
    const storedV1 = sec.storeEncryptedSecret('sec_db_root', 'pg_ultra_secret_2026');
    expect(storedV1.keyVersion).toBe(1);

    const rotation = sec.rotateEncryptionKeys({
      actorUserId: 'usr_admin_01',
      stepUpMfaVerified: true,
      ipAddress: '203.0.113.10',
    });
    expect(rotation.previousKeyVersion).toBe(1);
    expect(rotation.newKeyVersion).toBe(2);
    expect(rotation.reEncryptedCount).toBe(1);
    expect(sec.decryptSecret('sec_db_root')).toBe('pg_ultra_secret_2026');

    // Firewalld anti-lockout guard on management ports (443, 8443, 22)
    expect(() =>
      sec.applyFirewallRule({
        rule: {
          zone: 'public',
          port: 443,
          protocol: 'tcp',
          action: 'REMOVE_OR_DROP',
        },
        actorUserId: 'usr_admin_01',
        ipAddress: '203.0.113.10',
      })
    ).toThrow(/FIREWALL_ANTI_LOCKOUT_TRIGGERED/);

    const cefExport = sec.exportSecurityIncidents('CEF');
    expect(cefExport).toContain('WEBAUTHN_CLONED_AUTHENTICATOR_DETECTED');
    expect(cefExport).toContain('FIREWALL_LOCKOUT_RULE_BLOCKED');
  });

  it('selects optimal fleet server by capacity/affinity and rolls back commercial installer stages on failure', () => {
    const orchestrator = new FleetAndInstallerOrchestrator();

    const placement = orchestrator.selectOptimalServerForPlacement(
      [
        {
          serverId: 'srv_mum_01',
          hostname: 'mum01.garvix.host',
          region: 'ap-south-1',
          osName: 'AlmaLinux 10',
          licenseStatus: 'ACTIVE',
          heartbeatAgeSeconds: 20,
          cpuPercent: 65,
          ramPercent: 70,
          diskPercent: 60,
          activeAccounts: 80,
          maxAccounts: 150,
        },
        {
          serverId: 'srv_mum_02',
          hostname: 'mum02.garvix.host',
          region: 'ap-south-1',
          osName: 'AlmaLinux 10',
          licenseStatus: 'ACTIVE',
          heartbeatAgeSeconds: 15,
          cpuPercent: 25,
          ramPercent: 30,
          diskPercent: 20,
          activeAccounts: 20,
          maxAccounts: 150,
        },
        {
          serverId: 'srv_overloaded_03',
          hostname: 'mum03.garvix.host',
          region: 'ap-south-1',
          osName: 'AlmaLinux 10',
          licenseStatus: 'ACTIVE',
          heartbeatAgeSeconds: 10,
          cpuPercent: 92,
          ramPercent: 90,
          diskPercent: 88,
          activeAccounts: 145,
          maxAccounts: 150,
        },
      ],
      'ap-south-1'
    );

    expect(placement.selectedServerId).toBe('srv_mum_02');

    // Commercial installer hard-aborts when cPanel is detected on host
    const cpanelConflict = orchestrator.runCommercialInstallerWorkflow({
      osName: 'AlmaLinux 10',
      competingPanelDetected: 'cPanel/WHM (/usr/local/cpanel)',
      ed25519ManifestSignatureValid: true,
    });
    expect(cpanelConflict.status).toBe('ABORTED_PREFLIGHT');
    expect(cpanelConflict.completedStages).toHaveLength(0);

    // Commercial installer rolls back completed stages in reverse order if DB init fails
    const rolledBackInstall = orchestrator.runCommercialInstallerWorkflow({
      osName: 'AlmaLinux 10',
      competingPanelDetected: null,
      ed25519ManifestSignatureValid: true,
      simulateStageFailureAt: 'INITIALIZE_LOCAL_PANEL_DB',
    });
    expect(rolledBackInstall.status).toBe('FAILED_ROLLED_BACK');
    expect(rolledBackInstall.failedStage).toBe('INITIALIZE_LOCAL_PANEL_DB');
    expect(rolledBackInstall.rolledBackStages).toEqual([
      'INSTALL_GO_AGENT_AND_UDS',
      'CONFIGURE_REPOS_AND_PACKAGES',
      'PREFLIGHT_AND_SIGNATURE_VERIFIED',
    ]);
  });
});
