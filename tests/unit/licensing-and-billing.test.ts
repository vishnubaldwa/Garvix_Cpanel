import { describe, expect, it } from 'vitest';
import {
  calculateGstInvoice,
  generateCloudLicenseSigningKeyPair,
  issueSignedLicenseEnvelope,
  verifyLicenseLocally,
  verifyPaymentWebhookSignature,
} from '@garvix/cloud-api';
import type { SignedLicenseClaims } from '@garvix/shared-types';

describe('Commercial Licensing (Ed25519) & GST-Aware Billing Engine', () => {
  const keyPair = generateCloudLicenseSigningKeyPair('gv_ed25519_test_k1');

  const baseClaims: SignedLicenseClaims = {
    licenseId: 'lic_01J9GARVIX001',
    organizationId: 'org_alpha',
    serverId: 'srv_almalinux_01',
    hardwareFingerprintHash: 'sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    primaryIpv4Hint: '203.0.113.10',
    tier: 'ANNUAL',
    maxHostingAccounts: 'UNLIMITED',
    features: ['POSTGRESQL', 'MARIADB', 'EMAIL_SUITE', 'RESTIC_BACKUPS', 'RESELLER_WHM'],
    issuedAtIso: '2026-10-01T00:00:00.000Z',
    expiresAtIso: '2027-10-01T00:00:00.000Z',
    offlineGraceHours: 72,
    minCompatibleVersion: '1.0.0',
    maxCompatibleVersion: '2.99.99',
  };

  it('signs and verifies license claims with Ed25519 and tolerates VPS IP migration when hardware identity matches', () => {
    const envelope = issueSignedLicenseEnvelope(
      baseClaims,
      keyPair.privateKeyPem,
      keyPair.publicKeyId
    );

    const evaluation = verifyLicenseLocally({
      envelope,
      embeddedPublicKeyPem: keyPair.publicKeyPem,
      currentHardwareFingerprintHash: baseClaims.hardwareFingerprintHash,
      currentPrimaryIpv4: '198.51.100.77', // Simulated VPS provider IP migration
      lastCloudSyncAtIso: '2026-10-19T00:00:00.000Z',
      nowIso: '2026-10-19T12:00:00.000Z',
    });

    expect(evaluation.validSignature).toBe(true);
    expect(evaluation.operationalMode).toBe('ACTIVE_NORMAL');
    expect(evaluation.ipChangedWarning).toBe(true);
    expect(evaluation.allowNewProvisioning).toBe(true);
    expect(evaluation.allowExistingWebsitesAndEmail).toBe(true);
  });

  it('maintains full panel provisioning during the 72-hour offline grace period', () => {
    const envelope = issueSignedLicenseEnvelope(
      baseClaims,
      keyPair.privateKeyPem,
      keyPair.publicKeyId
    );

    const duringGrace = verifyLicenseLocally({
      envelope,
      embeddedPublicKeyPem: keyPair.publicKeyPem,
      currentHardwareFingerprintHash: baseClaims.hardwareFingerprintHash,
      currentPrimaryIpv4: baseClaims.primaryIpv4Hint,
      lastCloudSyncAtIso: '2027-09-30T00:00:00.000Z',
      nowIso: '2027-10-02T12:00:00.000Z', // 36h after expiry (< 72h grace)
    });

    expect(duringGrace.operationalMode).toBe('OFFLINE_GRACE_PERIOD');
    expect(duringGrace.allowNewProvisioning).toBe(true);
    expect(duringGrace.allowExistingWebsitesAndEmail).toBe(true);
    expect(duringGrace.allowDataExportAndBackups).toBe(true);
  });

  it('preserves running websites, email, DNS, databases, and backup exports after license expiration', () => {
    const envelope = issueSignedLicenseEnvelope(
      baseClaims,
      keyPair.privateKeyPem,
      keyPair.publicKeyId
    );

    const afterGraceExpired = verifyLicenseLocally({
      envelope,
      embeddedPublicKeyPem: keyPair.publicKeyPem,
      currentHardwareFingerprintHash: baseClaims.hardwareFingerprintHash,
      currentPrimaryIpv4: baseClaims.primaryIpv4Hint,
      lastCloudSyncAtIso: '2027-09-30T00:00:00.000Z',
      nowIso: '2027-10-15T00:00:00.000Z', // Well past 72h grace period
    });

    expect(afterGraceExpired.operationalMode).toBe('EXPIRED_READ_ONLY_ADMIN');
    expect(afterGraceExpired.allowExistingWebsitesAndEmail).toBe(true);
    expect(afterGraceExpired.allowDataExportAndBackups).toBe(true);
    expect(afterGraceExpired.allowNewProvisioning).toBe(false);
  });

  it('calculates intra-state (CGST + SGST) and inter-state (IGST) Indian GST invoices accurately with immutable hashes', () => {
    const intraStateInvoice = calculateGstInvoice({
      invoiceNumber: 'INV-2026-27-0001',
      organizationId: 'org_mumbai',
      supplierStateCode: '27', // Maharashtra
      customerStateCode: '27', // Maharashtra
      subtotalPaise: 200000, // INR 2,000.00
      resellerDiscountBasisPoints: 1000, // 10% reseller discount -> INR 1,800.00 taxable
    });

    expect(intraStateInvoice.taxSupplyType).toBe('INTRA_STATE_CGST_SGST');
    expect(intraStateInvoice.taxableSubtotalPaise).toBe(180000);
    expect(intraStateInvoice.cgstPaise).toBe(16200); // 9%
    expect(intraStateInvoice.sgstPaise).toBe(16200); // 9%
    expect(intraStateInvoice.igstPaise).toBe(0);
    expect(intraStateInvoice.totalPaise).toBe(212400); // INR 2,124.00
    expect(intraStateInvoice.immutableLedgerHash).toMatch(/^[a-f0-9]{64}$/);

    const interStateInvoice = calculateGstInvoice({
      invoiceNumber: 'INV-2026-27-0002',
      organizationId: 'org_bengaluru',
      supplierStateCode: '27', // Maharashtra
      customerStateCode: '29', // Karnataka
      subtotalPaise: 180000,
    });

    expect(interStateInvoice.taxSupplyType).toBe('INTER_STATE_IGST');
    expect(interStateInvoice.cgstPaise).toBe(0);
    expect(interStateInvoice.sgstPaise).toBe(0);
    expect(interStateInvoice.igstPaise).toBe(32400); // 18%
    expect(interStateInvoice.totalPaise).toBe(212400);
  });

  it('verifies payment webhook HMAC-SHA256 signatures and detects duplicate webhook replays', async () => {
    const { createHmac } = await import('node:crypto');
    const secret = 'whsec_test_razorpay_secret_key';
    const rawBody = JSON.stringify({ event: 'payment.captured', id: 'evt_rzp_001' });
    const sig = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    const processed = new Set<string>();

    const firstAttempt = verifyPaymentWebhookSignature({
      rawBody,
      signatureHex: sig,
      webhookSecret: secret,
      eventId: 'evt_rzp_001',
      processedEventIds: processed,
    });
    expect(firstAttempt.verified).toBe(true);
    expect(firstAttempt.isDuplicateReplay).toBe(false);

    const replayAttempt = verifyPaymentWebhookSignature({
      rawBody,
      signatureHex: sig,
      webhookSecret: secret,
      eventId: 'evt_rzp_001',
      processedEventIds: processed,
    });
    expect(replayAttempt.verified).toBe(true);
    expect(replayAttempt.isDuplicateReplay).toBe(true);
  });
});
