# 09 — Commercial Licensing Platform & GST-Aware Billing Architecture

**Document ID:** `GHM-ARCH-09`  
**Owner:** Garvix Software Solutions Pvt Ltd  
**Status:** Approved  

---

## 1. Commercial Licensing Architecture

Garvix Hosting Manager is commercial software owned by **Garvix Software Solutions Pvt Ltd**. The licensing subsystem balances strong anti-tamper protection with **100% operational safety for customer workloads**.

### 1.1 Ed25519 Asymmetric License Token Format
Licenses are issued by the Garvix Cloud Control Plane (`Plane A`) as offline-verifiable, canonically serialized JSON payloads signed with **Ed25519** (RFC 8032). The corresponding Ed25519 public key (plus a pinned backup key ID `kid` for key rotation) is compiled into `local-panel-api` and `garvix-agentd`.

#### License Token Payload Schema
```json
{
  "schemaVersion": 1,
  "kid": "garvix-lic-ed25519-2026-v1",
  "licenseId": "lic_01J9Z8K4M2N6P8R0T2V4X6Z8A0",
  "LicenseKey": "GHM-ENT-8F92-4C1A-99B0-7E3D",
  "organizationId": "org_01J9Z8A0B2C4D6E8F0G2H4J6K8",
  "serverId": "srv_01J9Z8M0N2P4Q6R8S0T2U4V6W8",
  "tier": "PRO_30",
  "entitlements": {
    "maxHostingAccounts": 30,
    "maxResellers": 5,
    "enableResticCloudBackups": true,
    "enableMultiNodeDns": true,
    "enableHighConcurrencyPacks": true
  },
  "hardwareBinding": {
    "bindingVersion": 1,
    "dmiProductUuidHash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "machineIdHash": "sha256:8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
    "rootFilesystemUuidHash": "sha256:2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae"
  },
  "issuedAt": "2026-10-19T06:00:00Z",
  "expiresAt": "2026-10-26T06:00:00Z",
  "subscriptionPeriodEnd": "2026-11-19T06:00:00Z",
  "offlineGraceHours": 72,
  "revocationEpoch": 14
}
```

### 1.2 Composite Hardware Identity (Tolerant of IP & Kernel Upgrades)
Traditional panels bind licenses strictly to a public IPv4 address, causing immediate lockouts when a customer changes VPS floating IPs, migrates behind NAT, or upgrades NICs. GHM uses a **2-of-3 Quorum Hardware Fingerprint**:
1. **Anchor 1:** `/sys/class/dmi/id/product_uuid` (or device-tree serial on ARM64) SHA-256 hash.
2. **Anchor 2:** `/etc/machine-id` + `/var/lib/garvix/node-identity.key` SHA-256 hash.
3. **Anchor 3:** Root filesystem UUID (`blkid` of `/`) SHA-256 hash.

- **IP Changes Allowed Automatically:** Changing the server's primary IPv4/IPv6 address does **not** invalidate the license; the next mTLS heartbeat updates the registered IP in Plane A automatically.
- **2-of-3 Quorum Match:** As long as at least 2 of the 3 hardware anchors match, the license validates locally and remotely without manual reissue.
- **Self-Service Reissue:** If a customer migrates to a new VPS (changing all 3 anchors), they can click **"Reissue Hardware Lock"** in the Garvix Cloud Console (rate-limited to 3 self-service reissues per billing cycle, revoking the old server's mTLS client certificate).

### 1.3 72-Hour Offline Grace Period & Non-Destructive Expiration Matrix

> [!IMPORTANT]
> **Non-Destructive Guarantee:** Under NO circumstances will an expired, unpaid, or unreachable license terminate customer websites, databases, email delivery, DNS resolution, or SSL renewals.

| License State | Condition | Plane D (Customer Websites, DBs, Mail, DNS, ACME SSL, Restic Backups) | Plane B (Local Panel Admin & Tenant UI / API) |
| :--- | :--- | :--- | :--- |
| **`ACTIVE`** | Signature valid, `now <= expiresAt`, hardware quorum >= 2/3 | **100% Active** | **Full Read/Write Access** |
| **`OFFLINE_GRACE`** | Cloud unreachable, `expiresAt < now <= expiresAt + 72h` | **100% Active** | **Full Read/Write Access** + Amber warning banner showing remaining offline grace hours |
| **`PAYMENT_PAST_DUE`** | Invoice overdue (7-day dunning period in Plane A) | **100% Active** | **Full Read/Write Access** + Billing reminder banner for `SERVER_ADMIN` |
| **`EXPIRED_RESTRICTED`** | `now > expiresAt + 72h` or Subscription Cancelled | **100% Active** (Websites, Mail, DNS, DBs, Auto-SSL, Scheduled Backups, and Security Patches continue running!) | **Read-Only + Emergency Access Mode:** Viewing telemetry, downloading backups, renewing SSL, and rotating compromised passwords remain enabled; creating new hosting accounts, domains, or mailboxes is blocked until renewal |
| **`REVOKED_CLONE`** | Duplicate active hardware clone detected simultaneously | **100% Active** | **Read-Only + Reissue Prompt:** Prompts Admin to reissue or assign a new license |

### 1.4 Signed Software Update Manifests
All GHM software updates (`garvix-panel` and `garvix-agentd`) distributed across the `stable`, `beta`, and `security-hotfix` channels require a signed `release-manifest.json.sig` verified against the offline Ed25519 Release Signing Public Key before `garvix-agentd` downloads or applies any binary package.

---

## 2. Commercial License Tiers

| Plan Code | Target Persona | Max Hosting Accounts | Included Capabilities |
| :--- | :--- | :--- | :--- |
| **`STARTER_5`** | Solo Developer / Agency VPS | Up to 5 Accounts | Full Web/PHP/Node/Python, Mail, DNS, Local & S3 Restic Backups |
| **`PRO_30`** | SMB Hosting / Digital Agency | Up to 30 Accounts | Everything in Starter + Reseller Accounts (up to 5), Staged Migration Wizard |
| **`BUSINESS_100`** | Hosting Provider Node | Up to 100 Accounts | Everything in Pro + Unlimited Resellers, Multi-Node DNS Clustering, Priority Updates |
| **`ENTERPRISE_UNBOUNDED`** | Dedicated High-Core Nodes | Hardware-Bounded (No License Cap) | Everything in Business + Custom Branding, Dedicated SLA Support |

---

## 3. Payment-Provider-Agnostic Billing Interface & Razorpay Adapter

The Cloud Control Plane (`apps/cloud-api`) decouples core subscription and ledger state from specific payment gateways using the `PaymentGatewayAdapter` TypeScript interface:

```typescript
export interface PaymentGatewayAdapter {
  readonly providerCode: 'RAZORPAY' | 'STRIPE' | 'MANUAL_BANK_TRANSFER';
  createCustomer(input: CreateBillingCustomerInput): Promise<{ externalCustomerId: string }>;
  createSubscriptionCheckout(input: CreateCheckoutSessionInput): Promise<CheckoutSessionResult>;
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string, secret: string): boolean;
  parseWebhookEvent(rawBody: Buffer): Promise<NormalizedBillingEvent>;
  issueRefund(input: IssueRefundInput): Promise<{ externalRefundId: string; status: string }>;
}
```

### Razorpay Integration Specifics (Primary Gateway for India & Global)
- **Webhook Idempotency:** Every Razorpay webhook (`subscription.charged`, `payment.captured`, `payment.failed`, `refund.processed`) is verified using HMAC-SHA256 over the raw request body (`X-Razorpay-Signature`) and deduplicated in `garvix_cloud` via ` UNIQUE (provider_code, external_event_id)` before processing.
- **Automated Dunning:** On `payment.failed`, the subscription enters `PAST_DUE` for 7 days with scheduled retry notifications at `+24h`, `+72h`, and `+120h` before transitioning the license to `EXPIRED_RESTRICTED`.

---

## 4. Indian GST Compliance & Invoicing Engine (SAC 998315)

Garvix Software Solutions Pvt Ltd is registered in India. The billing engine enforces strict statutory compliance under the Central Goods and Services Tax (CGST) and Integrated Goods and Services Tax (IGST) Acts:

### 4.1 Tax Classification & Place of Supply Rules
- **HSN / SAC Code:** `998315` (*Hosting and information technology (IT) infrastructure provisioning services / Cloud software licensing*).
- **Supplier State Code:** Configured per Garvix legal entity registered office (e.g., `27` Maharashtra / `29` Karnataka / `08` Rajasthan).
- **Tax Determination Matrix:**
  1. **Intra-State Supply (Customer State Code == Garvix State Code in India):**
     - **9% CGST + 9% SGST** (Total 18% GST).
  2. **Inter-State Supply (Customer State Code != Garvix State Code in India):**
     - **18% IGST**.
  3. **Export of Services (Customer Outside India + Foreign Currency Payment + LUT/Bond on File):**
     - **0% Zero-Rated Export under LUT** (marked `"Supply meant for export under Bond or Letter of Undertaking without payment of Integrated Tax"`).

### 4.2 GSTIN Validation & B2B / B2C Invoice Sequential Numbering
- **GSTIN Regex & Checksum Validation:** Validates 15-character Indian GSTIN (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`) with Modulo-36 check digit verification and extracts the 2-digit State Code from positions `1..2`.
- **Financial Year Sequential Invoice Numbers:** Invoices follow an unbroken, gapless sequential series per Indian Financial Year (April 1 – March 31):
  - Tax Invoices: `GHM/26-27/INV/000001`
  - Credit Notes: `GHM/26-27/CN/000001`
- **All Monetary Amounts Stored in Minor Units (Paise / Cents):** Integer `BIGINT` values (`10000` = `₹100.00`) to eliminate IEEE-754 floating-point rounding bugs.

---

## 5. Immutable Financial Ledger & Credit Notes

1. **Immutability Rule:** Once a Tax Invoice transitions to `ISSUED`, its line items, GSTIN, tax breakup (CGST/SGST/IGST), and total paise **cannot be mutated or deleted** (`UPDATE`/`DELETE` blocked by application policy and PostgreSQL trigger).
2. **Adjustments via Credit Notes Only:** Refunds, plan downgrades, or billing corrections generate an immutable **GST Credit Note (`GHM/26-27/CN/xxxxxx`)** linked to the original `invoice_id`, reversing the proportional base amount and CGST/SGST/IGST liability in the double-entry ledger.
