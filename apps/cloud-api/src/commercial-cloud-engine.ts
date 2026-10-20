import {
  createHash,
  randomUUID,
  sign,
  verify,
} from 'node:crypto';
import type {
  LicenseTier,
  SignedLicenseClaims,
  SignedLicenseEnvelope,
  SupportedOsFamily,
} from '@garvix/shared-types';
import {
  authorizeAction,
  type AuthenticatedPrincipal,
} from '@garvix/authorization';
import {
  DomainNameSchema,
  GstinSchema,
} from '@garvix/validation';
import {
  calculateGstInvoice,
  generateCloudLicenseSigningKeyPair,
  issueSignedLicenseEnvelope,
  verifyLicenseLocally,
  type Ed25519KeyPairPem,
  type GstInvoiceRecord,
} from './index.js';

export type UpdateChannelName = 'STABLE' | 'BETA' | 'SECURITY';

export interface CloudSubscriptionRecord {
  subscriptionId: string;
  organizationId: string;
  tier: LicenseTier;
  maxHostingAccounts: number | 'UNLIMITED';
  maxServers: number;
  monthlyPricePaise: number;
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  currentPeriodStartIso: string;
  currentPeriodEndIso: string;
  createdAtIso: string;
}

export interface ServerEnrollmentTokenRecord {
  enrollmentId: string;
  organizationId: string;
  tokenHashSha256: string;
  expiresAtIso: string;
  consumedAtIso: string | null;
  enrolledServerId: string | null;
}

export interface CloudEnrolledServer {
  serverId: string;
  organizationId: string;
  hostnameFqdn: string;
  hardwareFingerprintHash: string;
  primaryIpv4: string;
  osFamily: SupportedOsFamily;
  agentCertSerialNumber: string;
  agentCertExpiresAtIso: string;
  lastHeartbeatAtIso: string | null;
  status: 'ENROLLED' | 'HEALTHY' | 'STALE_HEARTBEAT' | 'DECOMMISSIONED';
}

export interface CloudLicenseRecord {
  licenseId: string;
  organizationId: string;
  subscriptionId: string;
  tier: LicenseTier;
  maxHostingAccounts: number | 'UNLIMITED';
  boundServerId: string | null;
  boundHardwareFingerprintHash: string | null;
  status: 'ISSUED_UNBOUND' | 'ACTIVE_BOUND' | 'SUSPENDED' | 'REVOKED';
  transferCountThisMonth: number;
  expiresAtIso: string;
  latestSignedEnvelope: SignedLicenseEnvelope | null;
}

export interface ImmutableCreditNoteRecord {
  creditNoteNumber: string;
  invoiceNumber: string;
  organizationId: string;
  reason: string;
  subtotalCreditPaise: number;
  taxAdjustmentPaise: number;
  totalCreditPaise: number;
  immutableLedgerHash: string;
  issuedAtIso: string;
}

export interface ReleaseArtifactDescriptor {
  component: 'PANEL' | 'AGENT' | 'INSTALLER';
  osTarget: SupportedOsFamily;
  arch: 'x86_64' | 'aarch64';
  downloadUrl: string;
  sha256Checksum: string;
  sizeBytes: number;
}

export interface SignedReleaseManifest {
  releaseId: string;
  version: string;
  channel: UpdateChannelName;
  minCompatibleOsVersion: string;
  publishedAtIso: string;
  releaseNotes: string;
  artifacts: ReleaseArtifactDescriptor[];
}

export interface SignedReleaseEnvelope {
  manifestBase64Url: string;
  ed25519SignatureBase64Url: string;
  publicKeyId: string;
}

export interface SupportTicketRecord {
  ticketId: string;
  organizationId: string;
  serverId: string;
  subject: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sanitizedDiagnosticsJson: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAtIso: string;
}

const FORBIDDEN_CLOUD_PRIVACY_KEYS =
  /email_body|message_body|maildir_content|sql_dump|customer_db_rows|website_source_code|private_key_pem/i;

/**
 * Phase 5 — Garvix Commercial Cloud Control Plane Engine.
 * Manages customer organizations, subscriptions, single-use server enrollment tokens,
 * Ed25519 license activation/transfer/revocation, immutable GST invoicing & credit notes,
 * Ed25519-signed software release distribution, fleet health monitoring, and privacy-preserving support diagnostics.
 */
export class CommercialCloudEngine {
  private readonly licenseKeyPair: Ed25519KeyPairPem;
  private readonly releaseKeyPair: Ed25519KeyPairPem;
  private readonly supplierStateCode: string;

  private readonly organizations = new Map<
    string,
    {
      organizationId: string;
      name: string;
      gstin: string | null;
      stateCode: string;
      billingEmail: string;
    }
  >();
  private readonly subscriptions = new Map<string, CloudSubscriptionRecord>();
  private readonly enrollmentTokens = new Map<string, ServerEnrollmentTokenRecord>();
  private readonly servers = new Map<string, CloudEnrolledServer>();
  private readonly licenses = new Map<string, CloudLicenseRecord>();
  private readonly invoices = new Map<string, GstInvoiceRecord>();
  private readonly creditNotes = new Map<string, ImmutableCreditNoteRecord[]>();
  private readonly releases = new Map<string, SignedReleaseEnvelope>();
  private readonly supportTickets = new Map<string, SupportTicketRecord>();

  constructor(options?: { supplierStateCode?: string }) {
    this.supplierStateCode = options?.supplierStateCode ?? '27'; // Maharashtra default
    this.licenseKeyPair = generateCloudLicenseSigningKeyPair('gv_cloud_lic_ed25519_k1');
    this.releaseKeyPair = generateCloudLicenseSigningKeyPair('gv_cloud_rel_ed25519_k1');
  }

  public getPublicKeys() {
    return {
      licensePublicKeyPem: this.licenseKeyPair.publicKeyPem,
      releasePublicKeyPem: this.releaseKeyPair.publicKeyPem,
    };
  }

  public registerCustomerOrganization(input: {
    organizationId: string;
    name: string;
    gstin: string | null;
    stateCode: string;
    billingEmail: string;
  }) {
    if (input.gstin !== null) {
      GstinSchema.parse(input.gstin);
    }
    const org = {
      organizationId: input.organizationId,
      name: input.name,
      gstin: input.gstin,
      stateCode: input.stateCode,
      billingEmail: input.billingEmail,
    };
    this.organizations.set(org.organizationId, org);
    return org;
  }

  public createOrUpgradeSubscription(
    actor: AuthenticatedPrincipal,
    input: {
      organizationId: string;
      tier: LicenseTier;
      maxHostingAccounts: number | 'UNLIMITED';
      maxServers: number;
      monthlyPricePaise: number;
      durationDays?: number;
    }
  ): { subscription: CloudSubscriptionRecord; license: CloudLicenseRecord } {
    const decision = authorizeAction(actor, 'billing:subscriptions:manage', {
      organizationId: input.organizationId,
    });
    if (!decision.allowed) {
      throw new Error(`${decision.code}: ${decision.reason}`);
    }

    const now = new Date();
    const durationDays = input.durationDays ?? (input.tier === 'TRIAL' ? 14 : input.tier === 'ANNUAL' ? 365 : 30);
    const periodEnd = new Date(now.getTime() + durationDays * 86400 * 1000);

    const subscription: CloudSubscriptionRecord = {
      subscriptionId: `sub_${randomUUID().slice(0, 8)}`,
      organizationId: input.organizationId,
      tier: input.tier,
      maxHostingAccounts: input.maxHostingAccounts,
      maxServers: input.maxServers,
      monthlyPricePaise: input.monthlyPricePaise,
      status: input.tier === 'TRIAL' ? 'TRIALING' : 'ACTIVE',
      currentPeriodStartIso: now.toISOString(),
      currentPeriodEndIso: periodEnd.toISOString(),
      createdAtIso: now.toISOString(),
    };
    this.subscriptions.set(subscription.subscriptionId, subscription);

    const license: CloudLicenseRecord = {
      licenseId: `lic_${randomUUID().slice(0, 8)}`,
      organizationId: input.organizationId,
      subscriptionId: subscription.subscriptionId,
      tier: input.tier,
      maxHostingAccounts: input.maxHostingAccounts,
      boundServerId: null,
      boundHardwareFingerprintHash: null,
      status: 'ISSUED_UNBOUND',
      transferCountThisMonth: 0,
      expiresAtIso: periodEnd.toISOString(),
      latestSignedEnvelope: null,
    };
    this.licenses.set(license.licenseId, license);

    return { subscription, license };
  }

  /**
   * Generates a single-use server enrollment token (stored only as a SHA-256 hash).
   */
  public createServerEnrollmentToken(
    actor: AuthenticatedPrincipal,
    organizationId: string
  ): { enrollmentId: string; rawEnrollmentToken: string; expiresAtIso: string } {
    const decision = authorizeAction(actor, 'server:enroll', { organizationId });
    if (!decision.allowed) {
      throw new Error(`${decision.code}: ${decision.reason}`);
    }

    const rawEnrollmentToken = `enr_gv_${randomUUID().replace(/-/g, '')}`;
    const tokenHashSha256 = createHash('sha256').update(rawEnrollmentToken, 'utf8').digest('hex');
    const enrollmentId = `enr_${randomUUID().slice(0, 8)}`;
    const expiresAtIso = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30m TTL

    this.enrollmentTokens.set(tokenHashSha256, {
      enrollmentId,
      organizationId,
      tokenHashSha256,
      expiresAtIso,
      consumedAtIso: null,
      enrolledServerId: null,
    });

    return { enrollmentId, rawEnrollmentToken, expiresAtIso };
  }

  /**
   * Completes server enrollment using a single-use token and issues short-lived mTLS agent certificate metadata.
   */
  public completeServerEnrollment(input: {
    rawEnrollmentToken: string;
    hostnameFqdn: string;
    hardwareFingerprintHash: string;
    primaryIpv4: string;
    osFamily: SupportedOsFamily;
  }): CloudEnrolledServer {
    DomainNameSchema.parse(input.hostnameFqdn);
    const tokenHash = createHash('sha256').update(input.rawEnrollmentToken, 'utf8').digest('hex');
    const record = this.enrollmentTokens.get(tokenHash);

    if (!record || record.consumedAtIso !== null || Date.parse(record.expiresAtIso) < Date.now()) {
      throw new Error(
        'ENROLLMENT_TOKEN_CONSUMED_OR_EXPIRED: Server enrollment token is invalid, expired, or already used'
      );
    }

    const serverId = `srv_${randomUUID().slice(0, 8)}`;
    record.consumedAtIso = new Date().toISOString();
    record.enrolledServerId = serverId;

    const server: CloudEnrolledServer = {
      serverId,
      organizationId: record.organizationId,
      hostnameFqdn: input.hostnameFqdn,
      hardwareFingerprintHash: input.hardwareFingerprintHash,
      primaryIpv4: input.primaryIpv4,
      osFamily: input.osFamily,
      agentCertSerialNumber: `mtls_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      agentCertExpiresAtIso: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // 24h short-lived mTLS cert
      lastHeartbeatAtIso: new Date().toISOString(),
      status: 'HEALTHY',
    };

    this.servers.set(serverId, server);
    return server;
  }

  /**
   * Binds a license to an enrolled server and returns an Ed25519-signed license envelope.
   * Blocks simultaneous cloning/activation across multiple servers.
   */
  public activateServerLicense(input: {
    licenseId: string;
    serverId: string;
  }): SignedLicenseEnvelope {
    const lic = this.licenses.get(input.licenseId);
    if (!lic) {
      throw new Error('RESOURCE_NOT_FOUND: License not found');
    }
    const srv = this.servers.get(input.serverId);
    if (!srv || srv.organizationId !== lic.organizationId) {
      throw new Error('RESOURCE_NOT_FOUND: Server not found in license organization');
    }

    if (lic.status === 'REVOKED' || lic.status === 'SUSPENDED') {
      throw new Error(`LICENSE_NOT_ACTIVE: Cannot activate license in state ${lic.status}`);
    }

    if (
      lic.boundServerId !== null &&
      lic.boundServerId !== srv.serverId
    ) {
      throw new Error(
        `LICENSE_ALREADY_BOUND_TO_ACTIVE_SERVER: License ${lic.licenseId} is already bound to server ${lic.boundServerId}; execute transferServerLicense first`
      );
    }

    lic.boundServerId = srv.serverId;
    lic.boundHardwareFingerprintHash = srv.hardwareFingerprintHash;
    lic.status = 'ACTIVE_BOUND';

    const claims: SignedLicenseClaims = {
      licenseId: lic.licenseId,
      organizationId: lic.organizationId,
      serverId: srv.serverId,
      hardwareFingerprintHash: srv.hardwareFingerprintHash,
      primaryIpv4Hint: srv.primaryIpv4,
      tier: lic.tier,
      maxHostingAccounts: lic.maxHostingAccounts,
      features: [
        'POSTGRESQL',
        'MARIADB',
        'LETS_ENCRYPT_ACME',
        'EMAIL_SUITE',
        'RESTIC_BACKUPS',
        'WHM_RESELLER',
      ],
      issuedAtIso: new Date().toISOString(),
      expiresAtIso: lic.expiresAtIso,
      offlineGraceHours: 72,
      minCompatibleVersion: '0.1.0',
      maxCompatibleVersion: '2.99.99',
    };

    const envelope = issueSignedLicenseEnvelope(
      claims,
      this.licenseKeyPair.privateKeyPem,
      this.licenseKeyPair.publicKeyId
    );
    lic.latestSignedEnvelope = envelope;
    return envelope;
  }

  /**
   * Transfers a server license from an old VPS to a newly enrolled VPS (safe hardware migration workflow)
   * with monthly transfer rate-limit enforcement.
   */
  public transferServerLicense(
    actor: AuthenticatedPrincipal,
    input: {
      licenseId: string;
      fromServerId: string;
      toServerId: string;
    }
  ): SignedLicenseEnvelope {
    const lic = this.licenses.get(input.licenseId);
    if (!lic) {
      throw new Error('RESOURCE_NOT_FOUND: License not found');
    }
    const decision = authorizeAction(actor, 'billing:subscriptions:manage', {
      organizationId: lic.organizationId,
    });
    if (!decision.allowed) {
      throw new Error(`${decision.code}: ${decision.reason}`);
    }

    if (lic.boundServerId !== input.fromServerId) {
      throw new Error('VALIDATION_FAILED: License is not currently bound to fromServerId');
    }
    if (lic.transferCountThisMonth >= 3) {
      throw new Error(
        'LICENSE_TRANSFER_RATE_LIMIT_EXCEEDED: Maximum of 3 automated hardware transfers per month reached; contact Garvix Support'
      );
    }

    lic.boundServerId = null;
    lic.boundHardwareFingerprintHash = null;
    lic.status = 'ISSUED_UNBOUND';
    lic.transferCountThisMonth += 1;

    return this.activateServerLicense({
      licenseId: lic.licenseId,
      serverId: input.toServerId,
    });
  }

  public revokeLicense(
    actor: AuthenticatedPrincipal,
    licenseId: string,
    reason: string
  ): CloudLicenseRecord {
    const lic = this.licenses.get(licenseId);
    if (!lic) {
      throw new Error('RESOURCE_NOT_FOUND: License not found');
    }
    const decision = authorizeAction(actor, 'cloud:licenses:revoke', {
      organizationId: lic.organizationId,
    });
    if (!decision.allowed) {
      throw new Error(`${decision.code}: ${decision.reason}`);
    }
    if (!reason.trim()) {
      throw new Error('VALIDATION_FAILED: Revocation reason is required');
    }
    lic.status = 'REVOKED';
    return lic;
  }

  /**
   * Issues an immutable GST invoice and supports accounting corrections only via immutable Credit Notes.
   */
  public issueSubscriptionInvoice(input: {
    invoiceNumber: string;
    organizationId: string;
    subtotalPaise: number;
    resellerDiscountBasisPoints?: number;
  }): GstInvoiceRecord {
    if (this.invoices.has(input.invoiceNumber)) {
      throw new Error(`IMMUTABLE_INVOICE_CONFLICT: Invoice ${input.invoiceNumber} already exists`);
    }
    const org = this.organizations.get(input.organizationId);
    if (!org) {
      throw new Error('RESOURCE_NOT_FOUND: Organization not found');
    }

    const invoice = calculateGstInvoice({
      invoiceNumber: input.invoiceNumber,
      organizationId: org.organizationId,
      supplierStateCode: this.supplierStateCode,
      customerStateCode: org.stateCode,
      subtotalPaise: input.subtotalPaise,
      resellerDiscountBasisPoints: input.resellerDiscountBasisPoints,
    });

    this.invoices.set(invoice.invoiceNumber, Object.freeze(invoice));
    return invoice;
  }

  public issueCreditNote(input: {
    creditNoteNumber: string;
    invoiceNumber: string;
    reason: string;
    subtotalCreditPaise: number;
  }): ImmutableCreditNoteRecord {
    const invoice = this.invoices.get(input.invoiceNumber);
    if (!invoice) {
      throw new Error(`RESOURCE_NOT_FOUND: Original invoice ${input.invoiceNumber} not found`);
    }

    const existingNotes = this.creditNotes.get(input.invoiceNumber) ?? [];
    const alreadyCreditedSubtotal = existingNotes.reduce(
      (sum, n) => sum + n.subtotalCreditPaise,
      0
    );

    if (alreadyCreditedSubtotal + input.subtotalCreditPaise > invoice.taxableSubtotalPaise) {
      throw new Error(
        `CREDIT_NOTE_EXCEEDS_INVOICE: Requested subtotal credit (${input.subtotalCreditPaise} paise) plus existing credits (${alreadyCreditedSubtotal} paise) exceeds invoice taxable subtotal (${invoice.taxableSubtotalPaise} paise)`
      );
    }

    const taxAdjustmentPaise = Math.round(input.subtotalCreditPaise * 0.18);
    const totalCreditPaise = input.subtotalCreditPaise + taxAdjustmentPaise;
    const issuedAtIso = new Date().toISOString();
    const canonical = `${input.creditNoteNumber}|${input.invoiceNumber}|${input.subtotalCreditPaise}|${taxAdjustmentPaise}|${totalCreditPaise}|${invoice.immutableLedgerHash}`;
    const immutableLedgerHash = createHash('sha256').update(canonical, 'utf8').digest('hex');

    const creditNote: ImmutableCreditNoteRecord = Object.freeze({
      creditNoteNumber: input.creditNoteNumber,
      invoiceNumber: input.invoiceNumber,
      organizationId: invoice.organizationId,
      reason: input.reason,
      subtotalCreditPaise: input.subtotalCreditPaise,
      taxAdjustmentPaise,
      totalCreditPaise,
      immutableLedgerHash,
      issuedAtIso,
    });

    existingNotes.push(creditNote);
    this.creditNotes.set(input.invoiceNumber, existingNotes);
    return creditNote;
  }

  /**
   * Publishes an Ed25519-signed software release manifest (requires GARVIX_SUPER_ADMIN + Step-Up MFA).
   */
  public publishSignedReleaseManifest(
    actor: AuthenticatedPrincipal,
    manifest: Omit<SignedReleaseManifest, 'releaseId' | 'publishedAtIso'>
  ): SignedReleaseEnvelope {
    const decision = authorizeAction(actor, 'cloud:releases:publish', {
      organizationId: actor.organizationId,
    });
    if (!decision.allowed) {
      throw new Error(`${decision.code}: ${decision.reason}`);
    }

    const fullManifest: SignedReleaseManifest = {
      ...manifest,
      releaseId: `rel_${randomUUID().slice(0, 8)}`,
      publishedAtIso: new Date().toISOString(),
    };

    const manifestBase64Url = Buffer.from(JSON.stringify(fullManifest), 'utf8').toString(
      'base64url'
    );
    const sigBuf = sign(
      null,
      Buffer.from(manifestBase64Url, 'utf8'),
      this.releaseKeyPair.privateKeyPem
    );

    const envelope: SignedReleaseEnvelope = {
      manifestBase64Url,
      ed25519SignatureBase64Url: sigBuf.toString('base64url'),
      publicKeyId: this.releaseKeyPair.publicKeyId,
    };

    this.releases.set(`${manifest.channel}:${manifest.version}`, envelope);
    return envelope;
  }

  /**
   * Verifies a software release manifest and artifact SHA-256 checksum on the customer VPS before installation.
   */
  public static verifyReleaseAndArtifactLocally(params: {
    envelope: SignedReleaseEnvelope;
    embeddedReleasePublicKeyPem: string;
    downloadedArtifactBytes: Buffer;
    expectedComponent: ReleaseArtifactDescriptor['component'];
  }): { verified: boolean; manifest: SignedReleaseManifest | null; reason: string } {
    try {
      const payloadBuf = Buffer.from(params.envelope.manifestBase64Url, 'utf8');
      const sigBuf = Buffer.from(params.envelope.ed25519SignatureBase64Url, 'base64url');
      const sigValid = verify(null, payloadBuf, params.embeddedReleasePublicKeyPem, sigBuf);

      if (!sigValid) {
        return {
          verified: false,
          manifest: null,
          reason: 'MALICIOUS_RELEASE_SIGNATURE_REJECTED: Ed25519 release manifest signature failed verification',
        };
      }

      const manifest = JSON.parse(
        Buffer.from(params.envelope.manifestBase64Url, 'base64url').toString('utf8')
      ) as SignedReleaseManifest;

      const artifact = manifest.artifacts.find((a) => a.component === params.expectedComponent);
      if (!artifact) {
        return {
          verified: false,
          manifest,
          reason: `COMPONENT_ARTIFACT_MISSING: Component ${params.expectedComponent} not found in manifest`,
        };
      }

      const actualSha256 = createHash('sha256')
        .update(params.downloadedArtifactBytes)
        .digest('hex');

      if (actualSha256 !== artifact.sha256Checksum) {
        return {
          verified: false,
          manifest,
          reason: `ARTIFACT_CHECKSUM_MISMATCH: Expected ${artifact.sha256Checksum}, got ${actualSha256}`,
        };
      }

      return {
        verified: true,
        manifest,
        reason: 'Ed25519 release signature and SHA-256 artifact checksum verified',
      };
    } catch (err) {
      return {
        verified: false,
        manifest: null,
        reason: `MALFORMED_RELEASE_MANIFEST: ${err instanceof Error ? err.message : 'parse error'}`,
      };
    }
  }

  /**
   * Submits a customer support ticket with diagnostic metadata while strictly enforcing the
   * Section 3A Cloud Privacy Boundary (never accepting customer email contents, website DB rows, or website source code).
   */
  public submitSupportTicketWithSanitizedDiagnostics(input: {
    organizationId: string;
    serverId: string;
    subject: string;
    priority: SupportTicketRecord['priority'];
    diagnosticsPayload: Record<string, unknown>;
  }): SupportTicketRecord {
    for (const key of Object.keys(input.diagnosticsPayload)) {
      if (FORBIDDEN_CLOUD_PRIVACY_KEYS.test(key)) {
        throw new Error(
          `CLOUD_PRIVACY_BOUNDARY_VIOLATION: Diagnostic field "${key}" is prohibited. Garvix Cloud never stores customer email contents, website databases, or website files.`
        );
      }
    }

    const ticket: SupportTicketRecord = {
      ticketId: `tkt_${randomUUID().slice(0, 8)}`,
      organizationId: input.organizationId,
      serverId: input.serverId,
      subject: input.subject,
      priority: input.priority,
      sanitizedDiagnosticsJson: JSON.stringify(input.diagnosticsPayload),
      status: 'OPEN',
      createdAtIso: new Date().toISOString(),
    };

    this.supportTickets.set(ticket.ticketId, ticket);
    return ticket;
  }

  public evaluateServerLicenseStatusLocally(params: {
    envelope: SignedLicenseEnvelope;
    currentHardwareFingerprintHash: string;
    currentPrimaryIpv4: string;
    nowIso?: string;
  }) {
    return verifyLicenseLocally({
      envelope: params.envelope,
      embeddedPublicKeyPem: this.licenseKeyPair.publicKeyPem,
      currentHardwareFingerprintHash: params.currentHardwareFingerprintHash,
      currentPrimaryIpv4: params.currentPrimaryIpv4,
      lastCloudSyncAtIso: new Date().toISOString(),
      nowIso: params.nowIso,
    });
  }
}
