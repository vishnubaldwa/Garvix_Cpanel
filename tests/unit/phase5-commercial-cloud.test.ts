import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { AuthenticatedPrincipal } from '@garvix/authorization';
import { CommercialCloudEngine } from '@garvix/cloud-api';

describe('Phase 5 — Commercial Cloud Control Plane, License Transfers, Credit Notes & Signed Releases', () => {
  const recentMfaIso = new Date().toISOString();

  const garvixSuperAdmin: AuthenticatedPrincipal = {
    userId: 'usr_gv_superadmin',
    role: 'GARVIX_SUPER_ADMIN',
    organizationId: 'org_garvix_hq',
    allocatedServerIds: [],
    allocatedResellerId: null,
    allocatedAccountIds: [],
    mailboxId: null,
    mfaVerifiedAtIso: recentMfaIso,
  };

  const customerOrgOwner: AuthenticatedPrincipal = {
    userId: 'usr_org_owner',
    role: 'CUSTOMER_ORG_OWNER',
    organizationId: 'org_nimbus_cloud',
    allocatedServerIds: [],
    allocatedResellerId: null,
    allocatedAccountIds: [],
    mailboxId: null,
    mfaVerifiedAtIso: recentMfaIso,
  };

  it('enrolls servers with single-use tokens, blocks multi-server license cloning, and supports safe VPS hardware transfer', () => {
    const cloud = new CommercialCloudEngine({ supplierStateCode: '27' });

    cloud.registerCustomerOrganization({
      organizationId: 'org_nimbus_cloud',
      name: 'Nimbus Cloud Solutions Pvt Ltd',
      gstin: '29AABCN1234F1Z5',
      stateCode: '29', // Karnataka
      billingEmail: 'finance@nimbus.example',
    });

    const { license } = cloud.createOrUpgradeSubscription(customerOrgOwner, {
      organizationId: 'org_nimbus_cloud',
      tier: 'ANNUAL',
      maxHostingAccounts: 'UNLIMITED',
      maxServers: 2,
      monthlyPricePaise: 199900,
    });

    // Issue single-use enrollment token for Server 1
    const token1 = cloud.createServerEnrollmentToken(customerOrgOwner, 'org_nimbus_cloud');
    const server1 = cloud.completeServerEnrollment({
      rawEnrollmentToken: token1.rawEnrollmentToken,
      hostnameFqdn: 'vps1.nimbus.example',
      hardwareFingerprintHash: 'sha256:hw_fingerprint_vps1',
      primaryIpv4: '198.51.100.10',
      osFamily: 'ALMALINUX_10',
    });

    // Replay of the same enrollment token must fail
    expect(() =>
      cloud.completeServerEnrollment({
        rawEnrollmentToken: token1.rawEnrollmentToken,
        hostnameFqdn: 'clone.nimbus.example',
        hardwareFingerprintHash: 'sha256:hw_fingerprint_clone',
        primaryIpv4: '198.51.100.11',
        osFamily: 'ALMALINUX_10',
      })
    ).toThrow(/ENROLLMENT_TOKEN_CONSUMED_OR_EXPIRED/);

    // Activate license on Server 1
    const env1 = cloud.activateServerLicense({
      licenseId: license.licenseId,
      serverId: server1.serverId,
    });
    expect(
      cloud.evaluateServerLicenseStatusLocally({
        envelope: env1,
        currentHardwareFingerprintHash: 'sha256:hw_fingerprint_vps1',
        currentPrimaryIpv4: '198.51.100.10',
      }).operationalMode
    ).toBe('ACTIVE_NORMAL');

    // Enroll Server 2 (migration target VPS)
    const token2 = cloud.createServerEnrollmentToken(customerOrgOwner, 'org_nimbus_cloud');
    const server2 = cloud.completeServerEnrollment({
      rawEnrollmentToken: token2.rawEnrollmentToken,
      hostnameFqdn: 'vps2.nimbus.example',
      hardwareFingerprintHash: 'sha256:hw_fingerprint_vps2',
      primaryIpv4: '203.0.113.55',
      osFamily: 'ALMALINUX_10',
    });

    // Attempting to activate the bound license on Server 2 without transfer -> blocked
    expect(() =>
      cloud.activateServerLicense({
        licenseId: license.licenseId,
        serverId: server2.serverId,
      })
    ).toThrow(/LICENSE_ALREADY_BOUND_TO_ACTIVE_SERVER/);

    // Execute authorized license transfer from Server 1 to Server 2
    const env2 = cloud.transferServerLicense(customerOrgOwner, {
      licenseId: license.licenseId,
      fromServerId: server1.serverId,
      toServerId: server2.serverId,
    });

    const evalOnServer2 = cloud.evaluateServerLicenseStatusLocally({
      envelope: env2,
      currentHardwareFingerprintHash: 'sha256:hw_fingerprint_vps2',
      currentPrimaryIpv4: '203.0.113.55',
    });
    expect(evalOnServer2.operationalMode).toBe('ACTIVE_NORMAL');
    expect(evalOnServer2.allowNewProvisioning).toBe(true);
  });

  it('enforces immutable GST invoices and hash-chained Credit Notes while preventing over-crediting', () => {
    const cloud = new CommercialCloudEngine({ supplierStateCode: '27' });
    cloud.registerCustomerOrganization({
      organizationId: 'org_nimbus_cloud',
      name: 'Nimbus Cloud Solutions Pvt Ltd',
      gstin: '29AABCN1234F1Z5',
      stateCode: '29',
      billingEmail: 'finance@nimbus.example',
    });

    const invoice = cloud.issueSubscriptionInvoice({
      invoiceNumber: 'GV-INV-2026-0100',
      organizationId: 'org_nimbus_cloud',
      subtotalPaise: 100000, // INR 1,000.00 + 18% IGST = INR 1,180.00
    });
    expect(Object.isFrozen(invoice)).toBe(true);
    expect(invoice.totalPaise).toBe(118000);

    // Issue partial credit note for INR 400.00 subtotal
    const creditNote = cloud.issueCreditNote({
      creditNoteNumber: 'GV-CN-2026-0001',
      invoiceNumber: 'GV-INV-2026-0100',
      reason: 'Prorated plan adjustment',
      subtotalCreditPaise: 40000,
    });
    expect(Object.isFrozen(creditNote)).toBe(true);
    expect(creditNote.taxAdjustmentPaise).toBe(7200);
    expect(creditNote.totalCreditPaise).toBe(47200);

    // Attempting to credit another INR 700.00 (400 + 700 > 1000 original subtotal) -> blocked
    expect(() =>
      cloud.issueCreditNote({
        creditNoteNumber: 'GV-CN-2026-0002',
        invoiceNumber: 'GV-INV-2026-0100',
        reason: 'Excess credit attempt',
        subtotalCreditPaise: 70000,
      })
    ).toThrow(/CREDIT_NOTE_EXCEEDS_INVOICE/);
  });

  it('signs software release manifests with Ed25519 and rejects tampered manifests or corrupted binaries', () => {
    const cloud = new CommercialCloudEngine();
    const { releasePublicKeyPem } = cloud.getPublicKeys();

    const agentBinaryBytes = Buffer.from('ELF_GARVIX_AGENT_BINARY_V1.1.0_ALMALINUX10_X86_64', 'utf8');
    const agentSha256 = createHash('sha256').update(agentBinaryBytes).digest('hex');

    const releaseEnvelope = cloud.publishSignedReleaseManifest(garvixSuperAdmin, {
      version: '1.1.0',
      channel: 'STABLE',
      minCompatibleOsVersion: 'AlmaLinux 10.0',
      releaseNotes: 'Security hardening and DKIM Ed25519 support.',
      artifacts: [
        {
          component: 'AGENT',
          osTarget: 'ALMALINUX_10',
          arch: 'x86_64',
          downloadUrl: 'https://releases.garvix.io/stable/1.1.0/garvix-agent-el10-x86_64.tar.gz',
          sha256Checksum: agentSha256,
          sizeBytes: agentBinaryBytes.length,
        },
      ],
    });

    // 1. Authentic release manifest & binary pass verification
    const validCheck = CommercialCloudEngine.verifyReleaseAndArtifactLocally({
      envelope: releaseEnvelope,
      embeddedReleasePublicKeyPem: releasePublicKeyPem,
      downloadedArtifactBytes: agentBinaryBytes,
      expectedComponent: 'AGENT',
    });
    expect(validCheck.verified).toBe(true);

    // 2. Corrupted or trojanized binary fails SHA-256 checksum check
    const tamperedBinaryCheck = CommercialCloudEngine.verifyReleaseAndArtifactLocally({
      envelope: releaseEnvelope,
      embeddedReleasePublicKeyPem: releasePublicKeyPem,
      downloadedArtifactBytes: Buffer.from('MALICIOUS_TROJAN_BINARY', 'utf8'),
      expectedComponent: 'AGENT',
    });
    expect(tamperedBinaryCheck.verified).toBe(false);
    expect(tamperedBinaryCheck.reason).toContain('ARTIFACT_CHECKSUM_MISMATCH');

    // 3. Tampered manifest payload fails Ed25519 signature check
    const tamperedManifestEnvelope = {
      ...releaseEnvelope,
      manifestBase64Url: Buffer.from(JSON.stringify({ version: '9.9.9' }), 'utf8').toString(
        'base64url'
      ),
    };
    const sigFailCheck = CommercialCloudEngine.verifyReleaseAndArtifactLocally({
      envelope: tamperedManifestEnvelope,
      embeddedReleasePublicKeyPem: releasePublicKeyPem,
      downloadedArtifactBytes: agentBinaryBytes,
      expectedComponent: 'AGENT',
    });
    expect(sigFailCheck.verified).toBe(false);
    expect(sigFailCheck.reason).toContain('MALICIOUS_RELEASE_SIGNATURE_REJECTED');
  });

  it('enforces the Garvix Cloud Privacy Boundary by rejecting customer email or database contents in support diagnostics', () => {
    const cloud = new CommercialCloudEngine();

    // Valid sanitized diagnostic metadata succeeds
    const ticket = cloud.submitSupportTicketWithSanitizedDiagnostics({
      organizationId: 'org_nimbus_cloud',
      serverId: 'srv_1',
      subject: 'Nginx reload latency spike',
      priority: 'MEDIUM',
      diagnosticsPayload: {
        agentVersion: '1.1.0',
        osRelease: 'AlmaLinux 10.0',
        memoryAvailableMb: 8192,
      },
    });
    expect(ticket.status).toBe('OPEN');

    // Attempting to include customer email bodies or database dumps is strictly rejected
    expect(() =>
      cloud.submitSupportTicketWithSanitizedDiagnostics({
        organizationId: 'org_nimbus_cloud',
        serverId: 'srv_1',
        subject: 'Leak attempt',
        priority: 'HIGH',
        diagnosticsPayload: {
          agentVersion: '1.1.0',
          email_body: 'Private customer email message content',
        },
      })
    ).toThrow(/CLOUD_PRIVACY_BOUNDARY_VIOLATION/);
  });
});
