import {
  createHash,
  createHmac,
  generateKeyPairSync,
  sign,
  verify,
  timingSafeEqual,
} from 'node:crypto';
import type {
  LicenseEvaluationResult,
  SignedLicenseClaims,
  SignedLicenseEnvelope,
} from '@garvix/shared-types';

export interface Ed25519KeyPairPem {
  publicKeyId: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

/**
 * Generates an Ed25519 signing keypair for the Garvix Cloud Control Plane.
 * Private keys never leave Garvix Cloud; only the public key is embedded in customer panels/agents.
 */
export function generateCloudLicenseSigningKeyPair(keyId: string = 'gv_ed25519_2026_k1'): Ed25519KeyPairPem {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return {
    publicKeyId: keyId,
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
  };
}

/**
 * Signs license claims in the Garvix Cloud Control Plane using Ed25519.
 */
export function issueSignedLicenseEnvelope(
  claims: SignedLicenseClaims,
  privateKeyPem: string,
  publicKeyId: string = 'gv_ed25519_2026_k1'
): SignedLicenseEnvelope {
  const payloadJson = JSON.stringify(claims);
  const payloadBuffer = Buffer.from(payloadJson, 'utf8');
  const payloadBase64Url = payloadBuffer.toString('base64url');
  const signatureBuffer = sign(null, Buffer.from(payloadBase64Url, 'utf8'), privateKeyPem);

  return {
    payloadBase64Url,
    ed25519SignatureBase64Url: signatureBuffer.toString('base64url'),
    publicKeyId,
  };
}

/**
 * Verifies an Ed25519-signed license envelope locally on a customer VPS.
 * Enforces Section 10 guarantees:
 * - Tolerates IP address changes when hardware fingerprint matches (emits ipChangedWarning).
 * - Supports offline grace period during Garvix Cloud connectivity outages.
 * - Never stops running websites, email, DNS, or databases on expiration; enters read-only/restricted provisioning mode.
 */
export function verifyLicenseLocally(params: {
  envelope: SignedLicenseEnvelope;
  embeddedPublicKeyPem: string;
  currentHardwareFingerprintHash: string;
  currentPrimaryIpv4: string;
  lastCloudSyncAtIso: string;
  nowIso?: string;
}): LicenseEvaluationResult {
  const nowMs = params.nowIso ? Date.parse(params.nowIso) : Date.now();

  try {
    const payloadBuf = Buffer.from(params.envelope.payloadBase64Url, 'utf8');
    const sigBuf = Buffer.from(params.envelope.ed25519SignatureBase64Url, 'base64url');
    const isValidSig = verify(null, payloadBuf, params.embeddedPublicKeyPem, sigBuf);

    if (!isValidSig) {
      return {
        validSignature: false,
        operationalMode: 'REVOKED',
        claims: null,
        ipChangedWarning: false,
        allowExistingWebsitesAndEmail: true,
        allowDataExportAndBackups: true,
        allowNewProvisioning: false,
        reason: 'Ed25519 cryptographic signature verification failed',
      };
    }

    const decodedJson = Buffer.from(params.envelope.payloadBase64Url, 'base64url').toString('utf8');
    const claims = JSON.parse(decodedJson) as SignedLicenseClaims;

    if (claims.hardwareFingerprintHash !== params.currentHardwareFingerprintHash) {
      return {
        validSignature: true,
        operationalMode: 'REVOKED',
        claims,
        ipChangedWarning: claims.primaryIpv4Hint !== params.currentPrimaryIpv4,
        allowExistingWebsitesAndEmail: true,
        allowDataExportAndBackups: true,
        allowNewProvisioning: false,
        reason: 'Server hardware identity mismatch; use the license transfer workflow in Garvix Cloud Console',
      };
    }

    const ipChangedWarning = claims.primaryIpv4Hint !== params.currentPrimaryIpv4;
    const expiresAtMs = Date.parse(claims.expiresAtIso);
    const graceDurationMs = claims.offlineGraceHours * 3600 * 1000;
    const graceDeadlineMs = expiresAtMs + graceDurationMs;

    if (nowMs <= expiresAtMs) {
      return {
        validSignature: true,
        operationalMode: 'ACTIVE_NORMAL',
        claims,
        ipChangedWarning,
        allowExistingWebsitesAndEmail: true,
        allowDataExportAndBackups: true,
        allowNewProvisioning: true,
        reason: ipChangedWarning
          ? 'License active (IP address change detected; hardware identity verified)'
          : 'License active and verified',
      };
    }

    if (nowMs <= graceDeadlineMs) {
      return {
        validSignature: true,
        operationalMode: 'OFFLINE_GRACE_PERIOD',
        claims,
        ipChangedWarning,
        allowExistingWebsitesAndEmail: true,
        allowDataExportAndBackups: true,
        allowNewProvisioning: true,
        reason: `License within ${claims.offlineGraceHours}h grace period; renew or restore Cloud Control Plane connectivity`,
      };
    }

    return {
      validSignature: true,
      operationalMode: 'EXPIRED_READ_ONLY_ADMIN',
      claims,
      ipChangedWarning,
      allowExistingWebsitesAndEmail: true,
      allowDataExportAndBackups: true,
      allowNewProvisioning: false,
      reason:
        'License and grace period expired. Customer websites, email, DNS, databases, and backups remain operational; new resource provisioning is restricted.',
    };
  } catch (err) {
    return {
      validSignature: false,
      operationalMode: 'REVOKED',
      claims: null,
      ipChangedWarning: false,
      allowExistingWebsitesAndEmail: true,
      allowDataExportAndBackups: true,
      allowNewProvisioning: false,
      reason: `Malformed license envelope: ${err instanceof Error ? err.message : 'parse error'}`,
    };
  }
}

export interface GstInvoiceCalculationInput {
  invoiceNumber: string;
  organizationId: string;
  supplierStateCode: string; // e.g., '27' (Maharashtra) or '29' (Karnataka)
  customerStateCode: string;
  subtotalPaise: number;
  resellerDiscountBasisPoints?: number; // e.g., 1500 = 15.00%
  gstRateBasisPoints?: number; // default 1800 = 18.00%
}

export interface GstInvoiceRecord {
  invoiceNumber: string;
  organizationId: string;
  sacCode: '998315'; // Hosting and IT infrastructure provisioning services
  grossSubtotalPaise: number;
  discountPaise: number;
  taxableSubtotalPaise: number;
  taxSupplyType: 'INTRA_STATE_CGST_SGST' | 'INTER_STATE_IGST';
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
  immutableLedgerHash: string;
}

/**
 * Calculates GST-compliant Indian commercial invoices in integer paise (no floating-point rounding drift)
 * and computes an immutable cryptographic ledger digest.
 */
export function calculateGstInvoice(input: GstInvoiceCalculationInput): GstInvoiceRecord {
  const discountBps = input.resellerDiscountBasisPoints ?? 0;
  const gstRateBps = input.gstRateBasisPoints ?? 1800; // 18% GST standard for SaaS/Hosting in India

  const discountPaise = Math.round((input.subtotalPaise * discountBps) / 10000);
  const taxableSubtotalPaise = Math.max(0, input.subtotalPaise - discountPaise);

  const isIntraState = input.supplierStateCode === input.customerStateCode;
  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  if (isIntraState) {
    const halfRateBps = gstRateBps / 2;
    cgstPaise = Math.round((taxableSubtotalPaise * halfRateBps) / 10000);
    sgstPaise = Math.round((taxableSubtotalPaise * halfRateBps) / 10000);
  } else {
    igstPaise = Math.round((taxableSubtotalPaise * gstRateBps) / 10000);
  }

  const totalPaise = taxableSubtotalPaise + cgstPaise + sgstPaise + igstPaise;
  const canonicalPayload = `${input.invoiceNumber}|${input.organizationId}|${taxableSubtotalPaise}|${cgstPaise}|${sgstPaise}|${igstPaise}|${totalPaise}`;
  const immutableLedgerHash = createHash('sha256').update(canonicalPayload).digest('hex');

  return {
    invoiceNumber: input.invoiceNumber,
    organizationId: input.organizationId,
    sacCode: '998315',
    grossSubtotalPaise: input.subtotalPaise,
    discountPaise,
    taxableSubtotalPaise,
    taxSupplyType: isIntraState ? 'INTRA_STATE_CGST_SGST' : 'INTER_STATE_IGST',
    cgstPaise,
    sgstPaise,
    igstPaise,
    totalPaise,
    immutableLedgerHash,
  };
}

/**
 * Verifies payment gateway webhook HMAC-SHA256 signatures in constant time and enforces idempotency.
 */
export function verifyPaymentWebhookSignature(params: {
  rawBody: string;
  signatureHex: string;
  webhookSecret: string;
  eventId: string;
  processedEventIds: Set<string>;
}): { verified: boolean; isDuplicateReplay: boolean } {
  const expectedHex = createHmac('sha256', params.webhookSecret)
    .update(params.rawBody, 'utf8')
    .digest('hex');

  const expectedBuf = Buffer.from(expectedHex, 'utf8');
  const providedBuf = Buffer.from(params.signatureHex, 'utf8');

  if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
    return { verified: false, isDuplicateReplay: false };
  }

  if (params.processedEventIds.has(params.eventId)) {
    return { verified: true, isDuplicateReplay: true };
  }

  params.processedEventIds.add(params.eventId);
  return { verified: true, isDuplicateReplay: false };
}

export * from './commercial-cloud-engine.js';

