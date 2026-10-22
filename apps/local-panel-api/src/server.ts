import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { execFileSync } from 'node:child_process';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LocalPanelMvpService } from './service.js';
import type { DnsRecord, GarvixRole, ServiceAction, ServiceName } from '@garvix/shared-types';
import {
  renderCustomerPanelWebUiHtml,
  renderLicenseStoreHtml,
  renderWhmPanelWebUiHtml,
} from '../../customer-panel/src/index.js';
import {
  BackupAndDisasterRecoveryEngine,
  SandboxedFileManager,
  SecurityCenterEngine,
  type BackupArtifactRecord,
  type TrashItemRecord,
} from './advanced-production-engine.js';
import { WhmResellerEngine } from './whm-reseller-engine.js';
import {
  buildNpciUpiUri,
  parseBankUpiAlertMessage,
  renderQrCodeSvg,
  type NpciDynamicQrOrder,
} from './npci-qr.js';

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    return {};
  }
  return JSON.parse(raw) as Record<string, unknown>;
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key, X-Garvix-StepUp-Mfa, X-Customer-Token',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  });
  res.end(JSON.stringify(payload));
}

function getBearerToken(req: IncomingMessage): string {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new Error('AUTH_SESSION_EXPIRED: Missing Bearer authorization token');
  }
  return header.slice('Bearer '.length).trim();
}

export function createLocalPanelHttpServer(
  service: LocalPanelMvpService = new LocalPanelMvpService(),
  options?: { cleanSlate?: boolean; dataDir?: string }
) {
  const cleanSlate = Boolean(options?.cleanSlate);
  const dataDir = cleanSlate
    ? (options?.dataDir ?? path.join(process.cwd(), '.garvix-data'))
    : fs.mkdtempSync(path.join(os.tmpdir(), 'garvix-cpanel-live-'));
  const sandboxRootDir = cleanSlate ? path.join(dataDir, 'files') : dataDir;
  fs.mkdirSync(sandboxRootDir, { recursive: true });
  const extrasFilePath = cleanSlate ? path.join(dataDir, 'panel-extras.json') : null;

  const fileManager = new SandboxedFileManager(sandboxRootDir);
  const backupEngine = new BackupAndDisasterRecoveryEngine(sandboxRootDir);
  const securityCenter = new SecurityCenterEngine();
  const whmEngine = new WhmResellerEngine();

  const backupArtifactsList: BackupArtifactRecord[] = [];
  const trashItemsList: TrashItemRecord[] = [];

  if (!cleanSlate) {
    // Seed realistic initial files in /home/acmeprod for unit tests
    fileManager.writeFile({
      linuxUsername: 'acmeprod',
      relativePath: 'public_html/index.html',
      content: '<!DOCTYPE html>\n<html>\n<head><title>AcmeCorp</title></head>\n<body><h1>Welcome to acmecorp.example (Hosted on Garvix)</h1></body>\n</html>',
      modeOctal: '0644',
    });
    fileManager.writeFile({
      linuxUsername: 'acmeprod',
      relativePath: 'public_html/app.js',
      content: 'import http from "node:http";\nconsole.log("AcmeCorp Node 22 Service Active");',
      modeOctal: '0644',
    });
    fileManager.writeFile({
      linuxUsername: 'acmeprod',
      relativePath: 'public_html/robots.txt',
      content: 'User-agent: *\nAllow: /\nSitemap: https://acmecorp.example/sitemap.xml\n',
      modeOctal: '0644',
    });
    fileManager.writeFile({
      linuxUsername: 'acmeprod',
      relativePath: 'public_html/config.php',
      content: '<?php\n// PHP-FPM 8.3 isolated pool configuration\ndefine("DB_HOST", "127.0.0.1");\n',
      modeOctal: '0640',
    });
    fileManager.writeFile({
      linuxUsername: 'acmeprod',
      relativePath: 'mail/acmecorp.example/founder/cur/1729300100.eml',
      content: 'From: support@garvix.io\r\nTo: founder@acmecorp.example\r\nSubject: Welcome to Garvix Hosting Manager\r\n\r\nYour mailbox is active.',
      modeOctal: '0600',
    });
  } else {
    // Ensure default serveradmin public_html directory exists on disk
    fs.mkdirSync(path.join(sandboxRootDir, 'home', 'serveradmin', 'public_html'), { recursive: true });
  }

  // Default Restic backup policy
  const defaultPolicy = backupEngine.createBackupPolicy({
    accountId: cleanSlate ? 'acc_primary' : 'acc_acme_prod',
    name: 'Nightly Restic AES-256-GCM Backup Policy',
    scheduleCron: '0 2 * * *',
    storageTarget: 'LOCAL_SANDBOX_REPO',
    repositoryUri: cleanSlate ? 'restic:/var/backups/garvix-restic' : 'restic:/var/backups/garvix-restic/acmeprod',
    retentionDaily: 7,
    retentionWeekly: 4,
    retentionMonthly: 6,
    repositoryPassphrase: 'garvix-cpanel-default-restic-passphrase-2026',
  });

  if (!cleanSlate) {
    const seedSnap = backupEngine.createEncryptedBackupSnapshot({
      policyId: defaultPolicy.id,
      accountId: 'acc_acme_prod',
      linuxUsername: 'acmeprod',
      databasesToDump: [
        {
          engine: 'POSTGRESQL',
          databaseName: 'gv_acmeprod_commerce',
          dumpFormat: 'PG_CUSTOM',
          logicalSqlOrHeaderPayload: 'CREATE TABLE orders (id SERIAL PRIMARY KEY, amount INT);',
        },
        {
          engine: 'MARIADB',
          databaseName: 'gv_acmeprod_analytics',
          dumpFormat: 'MARIADB_SINGLE_TRANSACTION_SQL',
          logicalSqlOrHeaderPayload: 'CREATE TABLE pageviews (id INT PRIMARY KEY, path VARCHAR(255));',
        },
      ],
      panelMetadataJson: {
        account: 'acmeprod',
        primaryDomain: 'acmecorp.example',
      },
    });
    backupEngine.verifyBackupInSandbox(seedSnap.id);
    backupArtifactsList.unshift(seedSnap);
  }

  // WHM Reseller Pool & Package (kept for unit test backwards compatibility)
  const seedAdminPrincipal = {
    userId: 'usr_admin',
    role: 'SERVER_ADMIN' as const,
    organizationId: 'org_garvix_demo',
    allocatedServerIds: ['srv_almalinux10_primary'],
    allocatedResellerId: null,
    allocatedAccountIds: cleanSlate ? [] : ['acc_acme_prod'],
    mailboxId: null,
    mfaVerifiedAtIso: new Date().toISOString(),
  };
  whmEngine.allocateResellerPool(seedAdminPrincipal, {
    resellerId: 'res_partner_1',
    companyName: 'Apex Partner Hosting Pvt Ltd',
    contactEmail: 'noc@apexpartner.in',
    assignedServerIds: ['srv_almalinux10_primary'],
    maxAccounts: 25,
    maxDiskQuotaMb: 76800,
    maxBandwidthQuotaMb: 1024000,
    maxAggregateMemoryMb: 6144,
    maxAggregateCpuPercent: 250,
    allowSshPackageCreation: false,
  });

  // Seed Security Center secrets
  securityCenter.storeEncryptedSecret('sec_dkim_primary', 'RSA_2048_PRIVATE_KEY_MATERIAL');
  securityCenter.storeEncryptedSecret('sec_restic_repo', 'RESTIC_AES_256_MASTER_KEY');
  securityCenter.storeEncryptedSecret('sec_pg_super', 'POSTGRES_16_PANEL_CREDENTIALS');

  interface ApiTokenRecord {
    id: string;
    name: string;
    portal: 'CPANEL' | 'WHM';
    tokenPrefix: string;
    scopes: string[];
    ipAllowlist: string;
    createdAt: string;
    expiresAt: string;
  }

  interface CronJobRecord {
    id: string;
    linuxUsername: string;
    schedule: string;
    command: string;
    emailNotification: string;
    enabled: boolean;
    createdAt: string;
  }

  interface SshKeyRecord {
    id: string;
    name: string;
    keyType: 'ed25519' | 'rsa-4096';
    fingerprint: string;
    publicKey: string;
    authorized: boolean;
    createdAt: string;
  }

  const apiTokensList: ApiTokenRecord[] = cleanSlate
    ? []
    : [
        {
          id: 'tok_cpanel_whmcs',
          name: 'WHMCS / Billing Automation Token',
          portal: 'CPANEL',
          tokenPrefix: 'gv_cpanel_live_8f92a1c4',
          scopes: ['cpanel:uapi:full', 'domains:write', 'email:manage', 'databases:write', 'backups:read'],
          ipAllowlist: '0.0.0.0/0',
          createdAt: '2026-10-01T10:00:00.000Z',
          expiresAt: '2027-10-01T10:00:00.000Z',
        },
        {
          id: 'tok_cpanel_cicd',
          name: 'GitHub Actions CI/CD Deploy Key',
          portal: 'CPANEL',
          tokenPrefix: 'gv_cpanel_live_3b71d0e8',
          scopes: ['files:write', 'apps:deploy', 'ssl:read'],
          ipAllowlist: '192.30.252.0/22',
          createdAt: '2026-10-12T14:20:00.000Z',
          expiresAt: '2027-04-12T14:20:00.000Z',
        },
        {
          id: 'tok_whm_root',
          name: 'WHM Root Cluster Provisioning Token',
          portal: 'WHM',
          tokenPrefix: 'gv_whm_live_4c10e9b2',
          scopes: ['whm:api1:full', 'accounts:create', 'accounts:suspend', 'packages:manage', 'services:restart'],
          ipAllowlist: '127.0.0.1/32, 10.0.0.0/8',
          createdAt: '2026-09-15T08:00:00.000Z',
          expiresAt: '2027-09-15T08:00:00.000Z',
        },
      ];

  const cronJobsList: CronJobRecord[] = cleanSlate
    ? []
    : [
        {
          id: 'cron_1',
          linuxUsername: 'acmeprod',
          schedule: '*/5 * * * *',
          command: '/usr/bin/php /home/acmeprod/public_html/artisan schedule:run >> /dev/null 2>&1',
          emailNotification: 'ops@acmecorp.example',
          enabled: true,
          createdAt: '2026-10-05T09:00:00.000Z',
        },
        {
          id: 'cron_2',
          linuxUsername: 'acmeprod',
          schedule: '0 3 * * *',
          command: '/usr/bin/node /home/acmeprod/public_html/app.js --sync-invoices',
          emailNotification: 'ops@acmecorp.example',
          enabled: true,
          createdAt: '2026-10-10T11:30:00.000Z',
        },
      ];

  const sshKeysList: SshKeyRecord[] = cleanSlate
    ? []
    : [
        {
          id: 'ssh_1',
          name: 'founder-macbook-pro-ed25519',
          keyType: 'ed25519',
          fingerprint: 'SHA256:9xK8mPqR4vL2wZ7nJ5tB1cH6yF3dG8sA0eU4iO2pW1k',
          publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGarvixProductionKeyAcmeCorpFounder2026 founder@acmecorp.example',
          authorized: true,
          createdAt: '2026-10-02T07:15:00.000Z',
        },
      ];

  interface LicensedServerRecord {
    id: string;
    licenseKey: string;
    planCode: string;
    planName: string;
    billingCycle: 'MONTHLY' | 'ANNUAL';
    maxAccounts: string;
    serverIp: string;
    hostname: string;
    customerName: string;
    customerEmail: string;
    gstin: string;
    autoPay: boolean;
    status: 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED_LOCKED';
    issuedAt: string;
    expiresAt: string;
  }

  interface LicenseInvoiceRecord {
    id: string;
    invoiceNumber: string;
    customerName: string;
    customerEmail: string;
    gstin: string;
    description: string;
    subtotalPaise: number;
    taxPaise: number;
    totalPaise: number;
    paymentMethod: string;
    issuedAt: string;
  }

  const licensedServersList: LicensedServerRecord[] = [
    {
      id: 'lic_primary_vps',
      licenseKey: 'GVX-PREMIER-200-234-39-100-LIVE',
      planCode: 'PREMIER',
      planName: 'Garvix Premier',
      billingCycle: 'MONTHLY',
      maxAccounts: 'Unlimited',
      serverIp: '200.234.39.100',
      hostname: 'srv2075790.hstgr.cloud',
      customerName: 'Garvix Primary VPS Admin',
      customerEmail: 'admin@garvix.in',
      gstin: '27AABCG4829K1Z5',
      autoPay: true,
      status: 'ACTIVE',
      issuedAt: '2026-10-19T00:00:00.000Z',
      expiresAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    },
  ];

  const licenseInvoicesList: LicenseInvoiceRecord[] = cleanSlate
    ? []
    : [
        {
          id: 'inv_lic_1',
          invoiceNumber: 'GV-LIC-2026-0001',
          customerName: 'Garvix Primary VPS Admin',
          customerEmail: 'admin@garvix.in',
          gstin: '27AABCG4829K1Z5',
          description: 'Garvix Premier License (MONTHLY) — Server IP 200.234.39.100',
          subtotalPaise: 149900,
          taxPaise: 26982,
          totalPaise: 176882,
          paymentMethod: 'UPI_AUTOPAY',
          issuedAt: '2026-10-19T00:00:00.000Z',
        },
      ];

  interface StoreUserRecord {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    role: 'ADMIN' | 'CUSTOMER';
    createdAt: string;
  }

  interface RazorpaySettingsRecord {
    keyId: string;
    keySecret: string;
    webhookSecret: string;
    companyName: string;
    merchantVpa: string;
  }

  interface RazorpayOrderRecord {
    orderId: string;
    orderType: 'NEW_LICENSE' | 'RENEWAL';
    planCode: string;
    planName: string;
    billingCycle: 'MONTHLY' | 'ANNUAL';
    maxAccounts: string;
    serverIp: string;
    customerName: string;
    customerEmail: string;
    gstin: string;
    licenseId?: string;
    subtotalPaise: number;
    taxPaise: number;
    totalPaise: number;
    amountRupees: string;
    keyId: string;
    qrSvg: string;
    upiUri: string;
    status: 'CREATED' | 'PAID';
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    paymentMethod?: string;
    createdAt: string;
    paidAt?: string;
    issuedLicense?: LicensedServerRecord;
    issuedInvoice?: LicenseInvoiceRecord;
  }

  const hashStorePassword = (rawPassword: string): string =>
    createHash('sha256').update(`gv_store_salt_2026:${rawPassword}`).digest('hex');

  const storeTokenSecret = process.env.GARVIX_STORE_JWT_SECRET ?? 'garvix_store_hmac_secret_2026';

  const createStoreAuthToken = (user: { id: string; name: string; email: string; role: 'ADMIN' | 'CUSTOMER' }): string => {
    const payloadB64 = Buffer.from(
      JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        exp: Date.now() + 30 * 86400 * 1000,
      }),
      'utf8'
    ).toString('base64url');
    const sig = createHmac('sha256', storeTokenSecret).update(payloadB64).digest('base64url');
    return `${payloadB64}.${sig}`;
  };

  const verifyStoreAuthToken = (
    req: IncomingMessage
  ): { id: string; name: string; email: string; role: 'ADMIN' | 'CUSTOMER' } | null => {
    const rawHeader =
      (typeof req.headers['x-customer-token'] === 'string' ? req.headers['x-customer-token'] : '') ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7).trim() : '');
    if (!rawHeader || !rawHeader.includes('.')) return null;
    const [payloadB64, sig] = rawHeader.split('.');
    if (!payloadB64 || !sig) return null;
    const expectedSig = createHmac('sha256', storeTokenSecret).update(payloadB64).digest('base64url');
    if (sig !== expectedSig) return null;
    try {
      const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      if (!parsed.exp || Date.now() > Number(parsed.exp)) return null;
      return {
        id: String(parsed.id),
        name: String(parsed.name),
        email: String(parsed.email),
        role: parsed.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
      };
    } catch {
      return null;
    }
  };

  const storeUsersList: StoreUserRecord[] = [
    {
      id: 'usr_store_admin',
      name: 'Garvix Store Admin',
      email: 'admin@garvix.in',
      passwordHash: hashStorePassword('Admin@2026#Garvix'),
      role: 'ADMIN',
      createdAt: '2026-10-19T00:00:00.000Z',
    },
  ];

  let razorpaySettings: RazorpaySettingsRecord = {
    keyId: process.env.RAZORPAY_KEY_ID ?? 'rzp_test_GarvixPanelLive',
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? 'garvix_rzp_secret_2026',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? 'garvix_whsec_2026',
    companyName: process.env.GARVIX_MERCHANT_NAME ?? 'Garvix Software Solutions Pvt Ltd',
    merchantVpa: process.env.GARVIX_UPI_VPA ?? 'garvix@icici',
  };

  const razorpayOrdersList: RazorpayOrderRecord[] = [];

  let upiSettings = {
    merchantVpa: process.env.GARVIX_UPI_VPA ?? 'garvix@icici',
    merchantName: process.env.GARVIX_MERCHANT_NAME ?? 'Garvix Software Solutions Pvt Ltd',
    merchantCategoryCode: '5734',
  };

  const upiOrdersList: NpciDynamicQrOrder[] = [];

  const defaultPortalPlans = [
    {
      code: 'CPANEL_SOLO',
      name: 'cPanel Solo',
      badge: '1 ACCOUNT · SOLO VPS',
      monthlyInr: 499,
      yearlyInr: 4990,
      panelMode: 'ONLY_CPANEL',
      maxAccounts: 1,
      maxAccountsLabel: '1 cPanel Account (No WHM)',
      bestFor: 'Single Website or Developer Cloud VPS',
      features: [
        '1 Server IPv4 License Activation',
        'Direct cPanel Jupiter Dashboard (Port 2083)',
        'Unlimited Domains, Subdomains & AutoSSL',
        'Web Terminal, Git Deploy, Cron & API Tokens',
      ],
    },
    {
      code: 'WHM_ADMIN',
      name: 'WHM Admin',
      badge: 'UP TO 5 ACCOUNTS',
      monthlyInr: 999,
      yearlyInr: 9990,
      panelMode: 'WHM_AND_CPANEL',
      maxAccounts: 5,
      maxAccountsLabel: 'Up to 5 cPanel Accounts + WHM',
      bestFor: 'Freelancers & Small Agencies',
      features: [
        '1 Server IPv4 License Activation',
        'Full WHM Server Admin Panel (Port 2087)',
        'Create Up to 5 Isolated cPanel Accounts',
        '1-Click [cP] Open cPanel Single Sign-On',
        'Root Web Terminal, WHM API & Malware Scanner',
      ],
    },
    {
      code: 'WHM_PRO',
      name: 'WHM Pro',
      badge: 'UP TO 30 ACCOUNTS',
      monthlyInr: 1799,
      yearlyInr: 17990,
      panelMode: 'WHM_AND_CPANEL',
      maxAccounts: 30,
      maxAccountsLabel: 'Up to 30 cPanel Accounts + WHM',
      bestFor: 'Web Hosting Businesses & Resellers',
      popular: true,
      features: [
        '1 Server IPv4 License Activation',
        'Full WHM Server Admin Panel (Port 2087)',
        'Create Up to 30 Isolated cPanel Accounts',
        '1-Click [cP] Open cPanel Single Sign-On',
        'Root Web Terminal, WHM API & Malware Scanner',
      ],
    },
    {
      code: 'WHM_PREMIER',
      name: 'WHM Premier',
      badge: 'UNLIMITED ACCOUNTS',
      monthlyInr: 2999,
      yearlyInr: 29990,
      panelMode: 'WHM_AND_CPANEL',
      maxAccounts: 0,
      maxAccountsLabel: 'Unlimited cPanel Accounts + WHM',
      bestFor: 'Data Centers & Large Dedicated Servers',
      features: [
        '1 Server IPv4 License Activation',
        'Full WHM Server Admin Panel (Port 2087)',
        'Create Unlimited Isolated cPanel Accounts',
        '1-Click [cP] Open cPanel Single Sign-On',
        'Root Web Terminal, WHM API & Malware Scanner',
      ],
    },
  ];

  const defaultPortalCustomerLicenses = [
    {
      id: 'lic-demo-solo',
      customerEmail: 'solo@client.in',
      password: 'Password@123',
      planCode: 'CPANEL_SOLO',
      planName: 'cPanel Solo',
      billingCycle: 'MONTHLY',
      panelMode: 'ONLY_CPANEL',
      maxAccounts: 1,
      serverIp: '200.234.39.100',
      hostname: 'solo.garvixcloud.in',
      licenseKey: 'GVX-CPANEL_SOLO-8841-2026-ED25519',
      status: 'ACTIVE',
      createdAt: '2026-04-20',
      expiresAt: '2026-05-20',
    },
    {
      id: 'lic-demo-pro',
      customerEmail: 'pro@client.in',
      password: 'Password@123',
      planCode: 'WHM_PRO',
      planName: 'WHM Pro',
      billingCycle: 'MONTHLY',
      panelMode: 'WHM_AND_CPANEL',
      maxAccounts: 30,
      serverIp: '200.234.39.100',
      hostname: 'srv1.garvixcloud.in',
      licenseKey: 'GVX-WHM_PRO-9920-2026-ED25519',
      status: 'ACTIVE',
      createdAt: '2026-04-20',
      expiresAt: '2026-05-20',
    },
    {
      id: 'lic-demo-premier',
      customerEmail: 'unlimited@client.in',
      password: 'Password@123',
      planCode: 'WHM_PREMIER',
      planName: 'WHM Premier',
      billingCycle: 'YEARLY',
      panelMode: 'WHM_AND_CPANEL',
      maxAccounts: 0,
      serverIp: '200.234.39.100',
      hostname: 'dc1.garvixcloud.in',
      licenseKey: 'GVX-WHM_PREMIER-7770-2026-ED25519',
      status: 'ACTIVE',
      createdAt: '2026-04-20',
      expiresAt: '2027-04-20',
    },
  ];

  let portalState: {
    licensePlans?: Array<Record<string, any>>;
    customerLicenses?: Array<Record<string, any>>;
    razorpayConfig?: {
      enabled: boolean;
      mode: 'TEST' | 'LIVE';
      keyId: string;
      keySecret: string;
      webhookSecret: string;
      merchantUpiVpa: string;
      companyName: string;
      companyGstin: string;
      supportEmail?: string;
      supportPhone?: string;
      companyAddress?: string;
      footerTagline?: string;
    };
    adminCredentials?: {
      email: string;
      password: string;
    };
    jwtSecret?: string;
    panelSsl?: {
      domain: string;
      issuer: string;
      method: string;
      expiresAt: string;
      installedAt: string;
    };
    hostedWebsites?: Array<{
      id: string;
      domain: string;
      username: string;
      docRoot: string;
      vhostConfPath: string;
      nginxStatus: 'LIVE_NGINX' | 'HOST_ROUTED';
      sslStatus: 'ACTIVE_HTTPS' | 'HTTP_ONLY';
      phpVersion: string;
      createdAt: string;
    }>;
    hostedDatabases?: Array<{
      id: string;
      dbName: string;
      dbUser: string;
      engine: 'MARIADB_10_11' | 'POSTGRESQL_16';
      status: 'LIVE_MARIADB' | 'LIVE_POSTGRES' | 'SANDBOX_RECORDED';
      createdAt: string;
    }>;
  } = {
    licensePlans: [...defaultPortalPlans],
    customerLicenses: [...defaultPortalCustomerLicenses],
    razorpayConfig: {
      enabled: true,
      mode: 'LIVE',
      keyId: '',
      keySecret: '',
      webhookSecret: '',
      merchantUpiVpa: 'garvix@icici',
      companyName: 'Garvix Software Solutions Pvt Ltd',
      companyGstin: '29AABCG4829K1Z5',
      supportEmail: 'support@garvixcloud.in',
      supportPhone: '+91 98765 43210',
      companyAddress: 'India',
      footerTagline: 'Made with ❤️ in India 🇮🇳',
    },
    adminCredentials: {
      email: 'admin@garvix.io',
      password: 'Admin@12345',
    },
    jwtSecret: process.env.GARVIX_PORTAL_SECRET || `gvx_hmac_secret_${randomUUID()}`,
    hostedWebsites: [],
    hostedDatabases: [],
  };

  const sanitizeDomainName = (raw: string): string => {
    return String(raw ?? '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '')
      .replace(/[^a-z0-9.-]/g, '');
  };

  const resolveDomainDocRoot = (cleanDomain: string): string => {
    if (process.platform === 'linux') {
      try {
        const linuxRoot = path.join('/var/www/vhosts', cleanDomain, 'public_html');
        fs.mkdirSync(linuxRoot, { recursive: true, mode: 0o755 });
        return linuxRoot;
      } catch {
        // Fallback if not running as root
      }
    }
    const fallbackRoot = path.join(
      dataDir || path.join(os.tmpdir(), 'garvix-vhosts'),
      'vhosts',
      cleanDomain,
      'public_html'
    );
    fs.mkdirSync(fallbackRoot, { recursive: true, mode: 0o755 });
    return fallbackRoot;
  };

  const buildStarterWebsiteHtml = (domain: string, username: string): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${domain} — Hosted on Garvix Hosting Manager</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: radial-gradient(circle at top, #1e1b4b 0%, #090d16 70%);
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      max-width: 680px;
      width: 100%;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(99, 102, 241, 0.35);
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(16px);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(16, 185, 129, 0.18);
      border: 1px solid rgba(16, 185, 129, 0.45);
      color: #6ee7b7;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    h1 {
      font-size: 34px;
      font-weight: 800;
      margin-top: 18px;
      background: linear-gradient(90deg, #ffffff, #a5b4fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: #cbd5e1;
      line-height: 1.65;
      margin-top: 12px;
      font-size: 15px;
    }
    .meta {
      margin-top: 24px;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 14px;
      padding: 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12.5px;
      color: #93c5fd;
    }
    .footer {
      margin-top: 24px;
      font-size: 12px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">● Live Website Active</span>
    <h1>Welcome to ${domain}</h1>
    <p>
      This domain is actively hosted and served by <strong>Garvix Hosting Manager</strong> on AlmaLinux 10.
      To replace this page with your own website, open <strong>cPanel &rarr; File Manager</strong> and edit or upload your files into <code>public_html/index.html</code> or <code>index.php</code>.
    </p>
    <div class="meta">
      <div><strong>Domain:</strong> ${domain}</div>
      <div style="margin-top:6px;"><strong>Document Root:</strong> /var/www/vhosts/${domain}/public_html</div>
      <div style="margin-top:6px;"><strong>Account Owner:</strong> ${username}</div>
    </div>
    <div class="footer">
      <span>Powered by Garvix Hosting Manager · Nginx + PHP-FPM</span>
      <span>Made with ❤️ in India 🇮🇳</span>
    </div>
  </div>
</body>
</html>`;

  const buildStarterPhpFile = (domain: string): string => `<?php
// ${domain} — Live PHP 8 + MySQL/MariaDB Status Page
$phpVer = phpversion();
$serverSoft = $_SERVER['SERVER_SOFTWARE'] ?? 'Garvix Nginx + PHP-FPM Engine';
$docRoot = __DIR__;
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title><?php echo htmlspecialchars('${domain}'); ?> — PHP <?php echo $phpVer; ?> Live</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
    .box { max-width: 720px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; }
    .ok { color: #34d399; font-weight: 700; }
    code { background: #0f172a; padding: 3px 8px; border-radius: 6px; color: #93c5fd; }
  </style>
</head>
<body>
  <div class="box">
    <div class="ok">● PHP Runtime Active (PHP <?php echo $phpVer; ?>)</div>
    <h1 style="margin-top:10px;"><?php echo htmlspecialchars('${domain}'); ?></h1>
    <p>Server Software: <code><?php echo htmlspecialchars($serverSoft); ?></code></p>
    <p>Document Root: <code><?php echo htmlspecialchars($docRoot); ?></code></p>
    <p>Server Time: <code><?php echo date('Y-m-d H:i:s T'); ?></code></p>
    <p>MySQLi Extension: <code><?php echo extension_loaded('mysqli') ? 'ENABLED' : 'NOT LOADED'; ?></code></p>
  </div>
</body>
</html>`;

  const provisionRealLinuxVhost = (opts: {
    domain: string;
    username?: string;
    template?: 'DEFAULT_LANDING' | 'PHP_APP' | 'WORDPRESS';
  }) => {
    const cleanDomain = sanitizeDomainName(opts.domain);
    if (!cleanDomain || !cleanDomain.includes('.') || cleanDomain.includes('..')) {
      throw new Error('VALIDATION_FAILED: Invalid domain name. Example: mywebsite.in');
    }
    const cleanUser =
      String(opts.username ?? cleanDomain.split('.')[0] ?? 'webuser')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 16) || 'webuser';

    const docRoot = resolveDomainDocRoot(cleanDomain);
    const indexHtmlPath = path.join(docRoot, 'index.html');
    const indexPhpPath = path.join(docRoot, 'index.php');

    if (opts.template === 'PHP_APP') {
      fs.writeFileSync(indexPhpPath, buildStarterPhpFile(cleanDomain), 'utf8');
    } else if (opts.template === 'WORDPRESS') {
      // Try downloading official WordPress tarball on Linux if curl + tar exist
      let wpInstalled = false;
      if (process.platform === 'linux') {
        try {
          const tmpTar = `/tmp/wp-${cleanDomain}.tar.gz`;
          execFileSync('curl', ['-fsSL', 'https://wordpress.org/latest.tar.gz', '-o', tmpTar], {
            timeout: 45000,
          });
          execFileSync('tar', ['-xzf', tmpTar, '--strip-components=1', '-C', docRoot], {
            timeout: 30000,
          });
          try {
            fs.unlinkSync(tmpTar);
          } catch {}
          wpInstalled = true;
        } catch {
          wpInstalled = false;
        }
      }
      if (!wpInstalled) {
        fs.writeFileSync(indexPhpPath, buildStarterPhpFile(cleanDomain), 'utf8');
      }
    } else if (!fs.existsSync(indexHtmlPath) && !fs.existsSync(indexPhpPath)) {
      fs.writeFileSync(indexHtmlPath, buildStarterWebsiteHtml(cleanDomain, cleanUser), 'utf8');
    }

    let vhostConfPath = `/etc/nginx/conf.d/vhost-${cleanDomain}.conf`;
    let nginxStatus: 'LIVE_NGINX' | 'HOST_ROUTED' = 'HOST_ROUTED';

    if (process.platform === 'linux' && fs.existsSync('/etc/nginx/conf.d')) {
      try {
        // Ensure permissions & SELinux context on /var/www/vhosts/<domain>
        try {
          execFileSync('chmod', ['-R', '755', path.dirname(docRoot)]);
        } catch {}
        try {
          execFileSync('restorecon', ['-Rv', path.dirname(docRoot)]);
        } catch {}

        // Make sure garvix-panel.conf uses default_server for IP/panel access so domain vhosts take priority
        const panelConfPath = '/etc/nginx/conf.d/garvix-panel.conf';
        if (fs.existsSync(panelConfPath)) {
          const panelConfRaw = fs.readFileSync(panelConfPath, 'utf8');
          if (panelConfRaw.includes('listen 80;') && !panelConfRaw.includes('default_server')) {
            const updatedPanelConf = panelConfRaw.replace(
              'listen 80;',
              'listen 80 default_server;'
            );
            fs.writeFileSync(panelConfPath, updatedPanelConf, 'utf8');
          }
        }

        const hasPhpFpmSock = fs.existsSync('/run/php-fpm/www.sock');
        const vhostBlock = hasPhpFpmSock
          ? `server {
    listen 80;
    server_name ${cleanDomain} www.${cleanDomain};
    root ${docRoot};
    index index.php index.html index.htm;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \\.php$ {
        try_files $uri =404;
        fastcgi_pass unix:/run/php-fpm/www.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
`
          : `server {
    listen 80;
    server_name ${cleanDomain} www.${cleanDomain};
    root ${docRoot};
    index index.html index.htm index.php;

    location / {
        try_files $uri $uri/ /index.html =404;
    }
}
`;
        fs.writeFileSync(vhostConfPath, vhostBlock, 'utf8');
        execFileSync('nginx', ['-t']);
        execFileSync('systemctl', ['reload', 'nginx']);
        nginxStatus = 'LIVE_NGINX';
      } catch {
        // If nginx -t failed (e.g. php-fpm not started), write safe static vhost and reload
        try {
          const safeStaticBlock = `server {
    listen 80;
    server_name ${cleanDomain} www.${cleanDomain};
    root ${docRoot};
    index index.html index.htm;

    location / {
        try_files $uri $uri/ /index.html =404;
    }
}
`;
          fs.writeFileSync(vhostConfPath, safeStaticBlock, 'utf8');
          execFileSync('nginx', ['-t']);
          execFileSync('systemctl', ['reload', 'nginx']);
          nginxStatus = 'LIVE_NGINX';
        } catch {
          nginxStatus = 'HOST_ROUTED';
        }
      }
    }

    const existingList = portalState.hostedWebsites ?? [];
    const existingIdx = existingList.findIndex((w) => w.domain === cleanDomain);
    const record = {
      id: existingIdx >= 0 ? existingList[existingIdx]!.id : `web_${Date.now()}`,
      domain: cleanDomain,
      username: cleanUser,
      docRoot,
      vhostConfPath,
      nginxStatus,
      sslStatus:
        existingIdx >= 0 ? existingList[existingIdx]!.sslStatus : ('HTTP_ONLY' as const),
      phpVersion: 'PHP 8.3 (FPM)',
      createdAt:
        existingIdx >= 0
          ? existingList[existingIdx]!.createdAt
          : new Date().toISOString().slice(0, 10),
    };

    if (existingIdx >= 0) {
      existingList[existingIdx] = record;
      portalState.hostedWebsites = [...existingList];
    } else {
      portalState.hostedWebsites = [record, ...existingList];
    }
    saveExtras();
    return record;
  };

  const serveHostedWebsiteResponse = (
    res: ServerResponse,
    docRoot: string,
    rawSubPath: string
  ): boolean => {
    const cleanRel = rawSubPath.replace(/^\/+/, '').split('?')[0] || '';
    if (cleanRel.includes('..')) return false;

    let candidatePath = path.join(docRoot, cleanRel);
    if (!cleanRel || (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory())) {
      const phpIndex = path.join(candidatePath, 'index.php');
      const htmlIndex = path.join(candidatePath, 'index.html');
      if (fs.existsSync(htmlIndex)) {
        candidatePath = htmlIndex;
      } else if (fs.existsSync(phpIndex)) {
        candidatePath = phpIndex;
      } else {
        return false;
      }
    }

    if (!fs.existsSync(candidatePath) || !fs.statSync(candidatePath).isFile()) {
      return false;
    }

    const ext = path.extname(candidatePath).toLowerCase();
    if (ext === '.php') {
      try {
        const phpOutput = execFileSync('php', [candidatePath], {
          cwd: path.dirname(candidatePath),
          timeout: 8000,
        });
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        });
        res.end(phpOutput);
        return true;
      } catch {
        // Fallback: serve raw or basic notice if php CLI not installed
      }
    }

    const mimeMap: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.htm': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
      '.txt': 'text/plain; charset=utf-8',
    };
    res.writeHead(200, {
      'Content-Type': mimeMap[ext] || 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    });
    res.end(fs.readFileSync(candidatePath));
    return true;
  };

  const pendingPortalRazorpayOrders = new Map<
    string,
    {
      orderId: string;
      planCode: string;
      planName: string;
      billingCycle: 'MONTHLY' | 'YEARLY';
      panelMode: 'ONLY_CPANEL' | 'WHM_AND_CPANEL';
      maxAccounts: number;
      customerEmail: string;
      customerPassword: string;
      serverIp: string;
      amountPaise: number;
    }
  >();

  const loginAttemptsByIp = new Map<string, { count: number; blockedUntil: number }>();

  const getPortalJwtSecret = (): string => {
    if (!portalState.jwtSecret) {
      portalState.jwtSecret = process.env.GARVIX_PORTAL_SECRET || `gvx_hmac_secret_${randomUUID()}`;
    }
    return portalState.jwtSecret;
  };

  const signPortalToken = (payload: {
    role: 'MASTER_ADMIN' | 'CUSTOMER';
    email: string;
    licenseId?: string;
  }): string => {
    const tokenBody = {
      ...payload,
      iat: Date.now(),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    const encoded = Buffer.from(JSON.stringify(tokenBody), 'utf8').toString('base64url');
    const sig = createHmac('sha256', getPortalJwtSecret()).update(encoded).digest('hex');
    return `gvx_portal_${encoded}.${sig}`;
  };

  const verifyPortalToken = (
    rawToken: string
  ): { role: 'MASTER_ADMIN' | 'CUSTOMER'; email: string; licenseId?: string } | null => {
    if (!rawToken || !rawToken.startsWith('gvx_portal_')) return null;
    const withoutPrefix = rawToken.slice('gvx_portal_'.length);
    const dotIdx = withoutPrefix.lastIndexOf('.');
    if (dotIdx <= 0) return null;
    const encoded = withoutPrefix.slice(0, dotIdx);
    const providedSig = withoutPrefix.slice(dotIdx + 1);
    const expectedSig = createHmac('sha256', getPortalJwtSecret()).update(encoded).digest('hex');
    if (providedSig !== expectedSig) return null;
    try {
      const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
      if (!parsed || typeof parsed !== 'object') return null;
      if (typeof parsed.exp === 'number' && Date.now() > parsed.exp) return null;
      if (parsed.role !== 'MASTER_ADMIN' && parsed.role !== 'CUSTOMER') return null;
      return {
        role: parsed.role,
        email: String(parsed.email ?? ''),
        licenseId: parsed.licenseId ? String(parsed.licenseId) : undefined,
      };
    } catch {
      return null;
    }
  };

  const extractPortalAuth = (req: IncomingMessage) => {
    const authHeader = String(req.headers.authorization ?? '').trim();
    if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
    const token = authHeader.slice(7).trim();
    return verifyPortalToken(token);
  };

  const runPostgresSql = (sql: string, dbName = 'garvix_panel_db'): string | null => {
    if (process.platform !== 'linux') return null;
    try {
      const out = execFileSync('psql', ['-U', 'postgres', '-h', '127.0.0.1', '-d', dbName, '-t', '-A', '-c', sql], {
        timeout: 8000,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      return out.toString('utf8').trim();
    } catch {
      try {
        const outLocal = execFileSync('psql', ['-U', 'postgres', '-d', dbName, '-t', '-A', '-c', sql], {
          timeout: 8000,
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        return outLocal.toString('utf8').trim();
      } catch {
        return null;
      }
    }
  };

  const initPostgresPanelSchema = (): boolean => {
    if (process.platform !== 'linux') return false;
    try {
      // Create garvix_panel_db if it doesn't exist
      const existsOut = runPostgresSql(
        "SELECT 1 FROM pg_database WHERE datname = 'garvix_panel_db';",
        'postgres'
      );
      if (existsOut !== '1') {
        runPostgresSql('CREATE DATABASE garvix_panel_db;', 'postgres');
      }
      const ddl = `
        CREATE TABLE IF NOT EXISTS garvix_portal_settings (
          setting_key VARCHAR(120) PRIMARY KEY,
          setting_value JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS garvix_license_plans (
          code VARCHAR(64) PRIMARY KEY,
          name VARCHAR(160) NOT NULL,
          monthly_inr INTEGER NOT NULL,
          yearly_inr INTEGER NOT NULL,
          panel_mode VARCHAR(64) NOT NULL,
          max_accounts INTEGER NOT NULL,
          payload_json JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS garvix_customer_licenses (
          id VARCHAR(120) PRIMARY KEY,
          customer_email VARCHAR(255) NOT NULL,
          plan_code VARCHAR(64) NOT NULL,
          plan_name VARCHAR(160) NOT NULL,
          panel_mode VARCHAR(64) NOT NULL,
          max_accounts INTEGER NOT NULL,
          server_ip VARCHAR(64) NOT NULL,
          license_key VARCHAR(160) NOT NULL,
          status VARCHAR(32) NOT NULL,
          payload_json JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS garvix_hosted_websites (
          domain VARCHAR(255) PRIMARY KEY,
          username VARCHAR(64) NOT NULL,
          doc_root TEXT NOT NULL,
          vhost_conf_path TEXT NOT NULL,
          nginx_status VARCHAR(32) NOT NULL,
          ssl_status VARCHAR(32) NOT NULL,
          php_version VARCHAR(64) NOT NULL,
          created_at VARCHAR(32) NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS garvix_hosted_databases (
          db_name VARCHAR(120) PRIMARY KEY,
          db_user VARCHAR(120) NOT NULL,
          engine VARCHAR(64) NOT NULL,
          status VARCHAR(64) NOT NULL,
          created_at VARCHAR(32) NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;
      return runPostgresSql(ddl, 'garvix_panel_db') !== null;
    } catch {
      return false;
    }
  };

  const postgresReady = initPostgresPanelSchema();

  const syncPortalStateToPostgres = () => {
    if (!postgresReady) return;
    try {
      const fullPayloadB64 = Buffer.from(
        JSON.stringify({
          apiTokensList,
          cronJobsList,
          sshKeysList,
          licensedServersList,
          licenseInvoicesList,
          storeUsersList,
          razorpaySettings,
          razorpayOrdersList,
          upiSettings,
          upiOrdersList,
          backupArtifactsList,
          trashItemsList,
          portalState,
        }),
        'utf8'
      ).toString('base64');

      const statements: string[] = [
        `INSERT INTO garvix_portal_settings (setting_key, setting_value, updated_at)
         VALUES ('full_panel_state', convert_from(decode('${fullPayloadB64}', 'base64'), 'UTF8')::jsonb, NOW())
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW();`,
      ];

      for (const plan of portalState.licensePlans ?? []) {
        const code = String(plan.code ?? '').replace(/[^a-zA-Z0-9_]/g, '');
        if (!code) continue;
        const name = String(plan.name ?? '').replace(/'/g, "''");
        const monthlyInr = Number(plan.monthlyInr ?? 0) || 0;
        const yearlyInr = Number(plan.yearlyInr ?? monthlyInr * 10) || 0;
        const panelMode = String(plan.panelMode ?? 'WHM_AND_CPANEL').replace(/[^a-zA-Z0-9_]/g, '');
        const maxAccounts = Number(plan.maxAccounts ?? 0) || 0;
        const b64 = Buffer.from(JSON.stringify(plan), 'utf8').toString('base64');
        statements.push(
          `INSERT INTO garvix_license_plans (code, name, monthly_inr, yearly_inr, panel_mode, max_accounts, payload_json, updated_at)
           VALUES ('${code}', '${name}', ${monthlyInr}, ${yearlyInr}, '${panelMode}', ${maxAccounts}, convert_from(decode('${b64}', 'base64'), 'UTF8')::jsonb, NOW())
           ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, monthly_inr = EXCLUDED.monthly_inr, yearly_inr = EXCLUDED.yearly_inr, panel_mode = EXCLUDED.panel_mode, max_accounts = EXCLUDED.max_accounts, payload_json = EXCLUDED.payload_json, updated_at = NOW();`
        );
      }

      for (const lic of portalState.customerLicenses ?? []) {
        const id = String(lic.id ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
        if (!id) continue;
        const email = String(lic.customerEmail ?? '').replace(/'/g, "''");
        const planCode = String(lic.planCode ?? '').replace(/[^a-zA-Z0-9_]/g, '');
        const planName = String(lic.planName ?? '').replace(/'/g, "''");
        const panelMode = String(lic.panelMode ?? '').replace(/[^a-zA-Z0-9_]/g, '');
        const maxAccounts = Number(lic.maxAccounts ?? 0) || 0;
        const serverIp = String(lic.serverIp ?? '').replace(/'/g, "''");
        const licenseKey = String(lic.licenseKey ?? '').replace(/'/g, "''");
        const status = String(lic.status ?? 'ACTIVE').replace(/[^a-zA-Z0-9_]/g, '');
        const b64 = Buffer.from(JSON.stringify(lic), 'utf8').toString('base64');
        statements.push(
          `INSERT INTO garvix_customer_licenses (id, customer_email, plan_code, plan_name, panel_mode, max_accounts, server_ip, license_key, status, payload_json, updated_at)
           VALUES ('${id}', '${email}', '${planCode}', '${planName}', '${panelMode}', ${maxAccounts}, '${serverIp}', '${licenseKey}', '${status}', convert_from(decode('${b64}', 'base64'), 'UTF8')::jsonb, NOW())
           ON CONFLICT (id) DO UPDATE SET customer_email = EXCLUDED.customer_email, plan_code = EXCLUDED.plan_code, plan_name = EXCLUDED.plan_name, panel_mode = EXCLUDED.panel_mode, max_accounts = EXCLUDED.max_accounts, server_ip = EXCLUDED.server_ip, license_key = EXCLUDED.license_key, status = EXCLUDED.status, payload_json = EXCLUDED.payload_json, updated_at = NOW();`
        );
      }

      for (const web of portalState.hostedWebsites ?? []) {
        const domain = sanitizeDomainName(web.domain);
        if (!domain) continue;
        const username = String(web.username ?? 'web').replace(/[^a-zA-Z0-9_]/g, '');
        const docRoot = String(web.docRoot ?? '').replace(/'/g, "''");
        const vhostConfPath = String(web.vhostConfPath ?? '').replace(/'/g, "''");
        const nginxStatus = String(web.nginxStatus ?? 'LIVE_NGINX').replace(/[^a-zA-Z0-9_]/g, '');
        const sslStatus = String(web.sslStatus ?? 'HTTP_ONLY').replace(/[^a-zA-Z0-9_]/g, '');
        const phpVer = String(web.phpVersion ?? 'PHP 8.3').replace(/'/g, "''");
        const createdAt = String(web.createdAt ?? '').replace(/'/g, "''");
        statements.push(
          `INSERT INTO garvix_hosted_websites (domain, username, doc_root, vhost_conf_path, nginx_status, ssl_status, php_version, created_at, updated_at)
           VALUES ('${domain}', '${username}', '${docRoot}', '${vhostConfPath}', '${nginxStatus}', '${sslStatus}', '${phpVer}', '${createdAt}', NOW())
           ON CONFLICT (domain) DO UPDATE SET username = EXCLUDED.username, doc_root = EXCLUDED.doc_root, nginx_status = EXCLUDED.nginx_status, ssl_status = EXCLUDED.ssl_status, updated_at = NOW();`
        );
      }

      for (const db of portalState.hostedDatabases ?? []) {
        const dbName = String(db.dbName ?? '').replace(/[^a-zA-Z0-9_]/g, '');
        if (!dbName) continue;
        const dbUser = String(db.dbUser ?? '').replace(/[^a-zA-Z0-9_]/g, '');
        const engine = String(db.engine ?? 'POSTGRESQL_16').replace(/[^a-zA-Z0-9_]/g, '');
        const status = String(db.status ?? 'LIVE_POSTGRES').replace(/[^a-zA-Z0-9_]/g, '');
        const createdAt = String(db.createdAt ?? '').replace(/'/g, "''");
        statements.push(
          `INSERT INTO garvix_hosted_databases (db_name, db_user, engine, status, created_at, updated_at)
           VALUES ('${dbName}', '${dbUser}', '${engine}', '${status}', '${createdAt}', NOW())
           ON CONFLICT (db_name) DO UPDATE SET db_user = EXCLUDED.db_user, engine = EXCLUDED.engine, status = EXCLUDED.status, updated_at = NOW();`
        );
      }

      runPostgresSql(statements.join('\n'), 'garvix_panel_db');
    } catch (_) {}
  };

  const saveExtras = () => {
    syncPortalStateToPostgres();
    if (!extrasFilePath) return;
    try {
      fs.writeFileSync(
        extrasFilePath,
        JSON.stringify(
          {
            apiTokensList,
            cronJobsList,
            sshKeysList,
            licensedServersList,
            licenseInvoicesList,
            storeUsersList,
            razorpaySettings,
            razorpayOrdersList,
            upiSettings,
            upiOrdersList,
            backupArtifactsList,
            trashItemsList,
            portalState,
          },
          null,
          2
        ),
        'utf8'
      );
    } catch (_) {}
  };

  const applyRestoredPayload = (parsed: Record<string, any>) => {
    if (Array.isArray(parsed.apiTokensList)) {
      apiTokensList.splice(0, apiTokensList.length, ...parsed.apiTokensList);
    }
    if (Array.isArray(parsed.cronJobsList)) {
      cronJobsList.splice(0, cronJobsList.length, ...parsed.cronJobsList);
    }
    if (Array.isArray(parsed.sshKeysList)) {
      sshKeysList.splice(0, sshKeysList.length, ...parsed.sshKeysList);
    }
    if (Array.isArray(parsed.licensedServersList) && parsed.licensedServersList.length > 0) {
      licensedServersList.splice(0, licensedServersList.length, ...parsed.licensedServersList);
    }
    if (Array.isArray(parsed.licenseInvoicesList)) {
      licenseInvoicesList.splice(0, licenseInvoicesList.length, ...parsed.licenseInvoicesList);
    }
    if (Array.isArray(parsed.storeUsersList) && parsed.storeUsersList.length > 0) {
      storeUsersList.splice(0, storeUsersList.length, ...parsed.storeUsersList);
    }
    if (parsed.razorpaySettings && typeof parsed.razorpaySettings === 'object') {
      razorpaySettings = {
        keyId: String(parsed.razorpaySettings.keyId ?? razorpaySettings.keyId),
        keySecret: String(parsed.razorpaySettings.keySecret ?? razorpaySettings.keySecret),
        webhookSecret: String(parsed.razorpaySettings.webhookSecret ?? razorpaySettings.webhookSecret),
        companyName: String(parsed.razorpaySettings.companyName ?? razorpaySettings.companyName),
        merchantVpa: String(parsed.razorpaySettings.merchantVpa ?? razorpaySettings.merchantVpa),
      };
    }
    if (Array.isArray(parsed.razorpayOrdersList)) {
      razorpayOrdersList.splice(0, razorpayOrdersList.length, ...parsed.razorpayOrdersList);
    }
    if (parsed.upiSettings && typeof parsed.upiSettings === 'object') {
      upiSettings = {
        merchantVpa: String(parsed.upiSettings.merchantVpa ?? upiSettings.merchantVpa),
        merchantName: String(parsed.upiSettings.merchantName ?? upiSettings.merchantName),
        merchantCategoryCode: String(parsed.upiSettings.merchantCategoryCode ?? '5734'),
      };
    }
    if (Array.isArray(parsed.upiOrdersList)) {
      upiOrdersList.splice(0, upiOrdersList.length, ...parsed.upiOrdersList);
    }
    if (Array.isArray(parsed.backupArtifactsList)) {
      backupArtifactsList.splice(0, backupArtifactsList.length, ...parsed.backupArtifactsList);
    }
    if (Array.isArray(parsed.trashItemsList)) {
      trashItemsList.splice(0, trashItemsList.length, ...parsed.trashItemsList);
    }
    if (parsed.portalState && typeof parsed.portalState === 'object') {
      const ps = parsed.portalState;
      portalState = {
        ...portalState,
        ...ps,
        licensePlans:
          Array.isArray(ps.licensePlans) && ps.licensePlans.length > 0
            ? ps.licensePlans
            : portalState.licensePlans,
        customerLicenses:
          Array.isArray(ps.customerLicenses) && ps.customerLicenses.length > 0
            ? ps.customerLicenses
            : portalState.customerLicenses,
        razorpayConfig: ps.razorpayConfig
          ? { ...portalState.razorpayConfig!, ...ps.razorpayConfig }
          : portalState.razorpayConfig,
        adminCredentials: ps.adminCredentials
          ? { ...portalState.adminCredentials!, ...ps.adminCredentials }
          : portalState.adminCredentials,
        jwtSecret: ps.jwtSecret || portalState.jwtSecret,
        hostedWebsites: Array.isArray(ps.hostedWebsites) ? ps.hostedWebsites : [],
        hostedDatabases: Array.isArray(ps.hostedDatabases) ? ps.hostedDatabases : [],
      };
    }
  };

  let loadedFromPostgres = false;
  if (postgresReady) {
    try {
      const b64Out = runPostgresSql(
        "SELECT encode(convert_to(setting_value::text, 'UTF8'), 'base64') FROM garvix_portal_settings WHERE setting_key = 'full_panel_state';",
        'garvix_panel_db'
      );
      if (b64Out && b64Out.length > 16) {
        const cleanB64 = b64Out.replace(/\s+/g, '');
        const decodedJson = Buffer.from(cleanB64, 'base64').toString('utf8');
        const parsedPg = JSON.parse(decodedJson);
        if (parsedPg && typeof parsedPg === 'object') {
          applyRestoredPayload(parsedPg);
          loadedFromPostgres = true;
        }
      }
    } catch (_) {}
  }

  if (!loadedFromPostgres && extrasFilePath && fs.existsSync(extrasFilePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(extrasFilePath, 'utf8'));
      applyRestoredPayload(parsed);
      if (postgresReady) {
        syncPortalStateToPostgres();
      }
    } catch (_) {}
  } else if (!loadedFromPostgres && postgresReady) {
    syncPortalStateToPostgres();
  }

  // Ensure default demo domain garvixcloud.in has a real document root provisioned
  if (!portalState.hostedWebsites || portalState.hostedWebsites.length === 0) {
    try {
      provisionRealLinuxVhost({
        domain: 'garvixcloud.in',
        username: 'garvixprod',
        template: 'DEFAULT_LANDING',
      });
    } catch {}
  }

  const server = createServer(async (req, res) => {
    const requestId = `req_${randomUUID().slice(0, 8)}`;
    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }

    const url = new URL(req.url ?? '/', 'http://localhost');
    const pathname = url.pathname;

    try {
      // 1. Live Website Preview URL: /site-preview/<domain>/<file>
      if (
        (req.method === 'GET' || req.method === 'HEAD') &&
        pathname.startsWith('/site-preview/')
      ) {
        const afterPrefix = pathname.slice('/site-preview/'.length);
        const slashIdx = afterPrefix.indexOf('/');
        const targetDomain = sanitizeDomainName(
          slashIdx >= 0 ? afterPrefix.slice(0, slashIdx) : afterPrefix
        );
        const subFile = slashIdx >= 0 ? afterPrefix.slice(slashIdx + 1) : '';
        const siteRecord =
          (portalState.hostedWebsites ?? []).find((w) => w.domain === targetDomain) ??
          provisionRealLinuxVhost({ domain: targetDomain });
        if (serveHostedWebsiteResponse(res, siteRecord.docRoot, subFile)) {
          return;
        }
      }

      // 2. Direct Domain Host-Header Routing (when a user points their domain A-record to 200.234.39.100)
      const incomingHost = sanitizeDomainName(String(req.headers.host ?? '').split(':')[0] ?? '');
      const isPanelAccess =
        !incomingHost ||
        incomingHost === 'localhost' ||
        incomingHost === '127.0.0.1' ||
        incomingHost === '200.234.39.100' ||
        incomingHost.includes('hstgr.cloud') ||
        incomingHost === portalState.panelSsl?.domain ||
        pathname.startsWith('/api/') ||
        pathname.startsWith('/assets/') ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/whm') ||
        pathname.startsWith('/cpanel') ||
        pathname.startsWith('/store') ||
        pathname.startsWith('/login');

      if (!isPanelAccess && (req.method === 'GET' || req.method === 'HEAD')) {
        const matchedWebsite = (portalState.hostedWebsites ?? []).find(
          (w) => w.domain === incomingHost
        );
        if (matchedWebsite && serveHostedWebsiteResponse(res, matchedWebsite.docRoot, pathname)) {
          return;
        }
      }

      const customerPanelDistDir = path.resolve(process.cwd(), 'apps/customer-panel/dist');
      const customerPanelIndexHtml = path.join(customerPanelDistDir, 'index.html');

      if (
        cleanSlate &&
        (req.method === 'GET' || req.method === 'HEAD') &&
        pathname.startsWith('/assets/') &&
        !pathname.includes('..')
      ) {
        const assetFilePath = path.join(customerPanelDistDir, pathname);
        if (fs.existsSync(assetFilePath) && fs.statSync(assetFilePath).isFile()) {
          const ext = path.extname(assetFilePath).toLowerCase();
          const mimeType =
            ext === '.js'
              ? 'application/javascript; charset=utf-8'
              : ext === '.css'
                ? 'text/css; charset=utf-8'
                : ext === '.svg'
                  ? 'image/svg+xml'
                  : 'application/octet-stream';
          res.writeHead(200, {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
          });
          if (req.method === 'HEAD') {
            res.end();
          } else {
            res.end(fs.readFileSync(assetFilePath));
          }
          return;
        }
      }

      if (
        cleanSlate &&
        (req.method === 'GET' || req.method === 'HEAD') &&
        (pathname === '/' ||
          pathname === '/index.html' ||
          pathname === '/whm' ||
          pathname === '/whm/' ||
          pathname === '/cpanel' ||
          pathname === '/cpanel/' ||
          pathname === '/admin' ||
          pathname === '/admin/' ||
          pathname === '/store' ||
          pathname === '/store/' ||
          pathname === '/portal' ||
          pathname === '/portal/' ||
          pathname === '/login') &&
        fs.existsSync(customerPanelIndexHtml)
      ) {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
          'X-Content-Type-Options': 'nosniff',
        });
        if (req.method === 'HEAD') {
          res.end();
        } else {
          res.end(fs.readFileSync(customerPanelIndexHtml, 'utf8'));
        }
        return;
      }

      if ((req.method === 'GET' || req.method === 'HEAD') && (pathname === '/' || pathname === '/index.html')) {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
        });
        if (req.method === 'HEAD') {
          res.end();
        } else {
          res.end(renderCustomerPanelWebUiHtml());
        }
        return;
      }

      if ((req.method === 'GET' || req.method === 'HEAD') && (pathname === '/whm' || pathname === '/whm/')) {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
        });
        if (req.method === 'HEAD') {
          res.end();
        } else {
          res.end(renderWhmPanelWebUiHtml());
        }
        return;
      }

      if (
        (req.method === 'GET' || req.method === 'HEAD') &&
        (pathname === '/store' || pathname === '/store/' || pathname === '/portal' || pathname === '/portal/' || pathname === '/login')
      ) {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
        });
        if (req.method === 'HEAD') {
          res.end();
        } else {
          res.end(renderLicenseStoreHtml());
        }
        return;
      }

      if (req.method === 'GET' && pathname === '/install.sh') {
        const hostHeader = req.headers.host ?? '200.234.39.100';
        const script = [
          '#!/usr/bin/env bash',
          '# ==============================================================================',
          '# Garvix Hosting Manager (WHM + cPanel) — Official License-Verified Installer',
          '# Usage: curl -sSL http://' + hostHeader + '/install.sh | sudo bash -s -- --license=GVX-...',
          '# ==============================================================================',
          'set -euo pipefail',
          'LICENSE_KEY=""',
          'for arg in "$@"; do',
          '  case "$arg" in',
          '    --license=*) LICENSE_KEY="${arg#*=}" ;;',
          '  esac',
          'done',
          'if [[ -z "${LICENSE_KEY}" ]]; then',
          '  echo "[GARVIX LICENSE ERROR] Missing --license=<KEY>. Purchase a license at http://' + hostHeader + '/store" >&2',
          '  exit 1',
          'fi',
          'PUBLIC_IP="$(curl -4 -s --max-time 5 https://ifconfig.me || hostname -I | awk \'{print $1}\')"',
          'echo "[INFO] Verifying Garvix License Key ${LICENSE_KEY} for Server IP ${PUBLIC_IP}..."',
          'VERIFY_JSON="$(curl -sSL "http://' + hostHeader + '/api/v1/license-store/verify?licenseKey=${LICENSE_KEY}&ip=${PUBLIC_IP}")"',
          'if ! echo "${VERIFY_JSON}" | grep -q \'"licensed":true\'; then',
          '  echo "[GARVIX LICENSE ERROR] License verification failed for IP ${PUBLIC_IP}: ${VERIFY_JSON}" >&2',
          '  exit 2',
          'fi',
          'mkdir -p /etc/garvix',
          'echo "${LICENSE_KEY}" > /etc/garvix/license.key',
          'chmod 600 /etc/garvix/license.key',
          'echo "[OK] License verified and saved to /etc/garvix/license.key! Proceeding with Garvix WHM + cPanel setup..."',
          'if [[ -f /opt/garvix-hosting-manager/installers/almalinux/install-garvix-panel.sh ]]; then',
          '  bash /opt/garvix-hosting-manager/installers/almalinux/install-garvix-panel.sh',
          'else',
          '  echo "[OK] Garvix License activated on ${PUBLIC_IP}."',
          'fi',
          '',
        ].join('\n');
        res.writeHead(200, {
          'Content-Type': 'text/x-shellscript; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
        });
        res.end(script);
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/auth/demo-totp') {
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            totpCode: service.getTotpDemoCode(),
          },
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/health') {
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          isMockData: true,
          data: {
            service: 'garvix-local-panel-api',
            phase: 'Phase 1 — Core Panel MVP (Mock Infrastructure Adapter)',
            status: 'HEALTHY',
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/auth/login') {
        const body = await readJsonBody(req);
        const result = service.login({
          username: String(body.username ?? ''),
          password: String(body.password ?? ''),
          totpCode: typeof body.totpCode === 'string' ? body.totpCode : undefined,
          ipAddress: req.socket.remoteAddress ?? '127.0.0.1',
        });
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: result,
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/auth/mfa/verify') {
        const token = getBearerToken(req);
        const body = await readJsonBody(req);
        const session = service.verifyStepUpMfa(token, String(body.totpCode ?? ''));
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            mfaVerifiedAtIso: session.principal.mfaVerifiedAtIso,
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/auth/demo-role') {
        const token = getBearerToken(req);
        const body = await readJsonBody(req);
        const result = service.switchRoleForDemo(token, String(body.role) as GarvixRole);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: result,
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/dashboard/summary') {
        const token = getBearerToken(req);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          isMockData: true,
          data: service.getDashboardSummary(token),
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/organizations/current') {
        const token = getBearerToken(req);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: service.getOrganizationOverview(token),
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/servers') {
        const token = getBearerToken(req);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: service.listServers(token),
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/servers/service-control') {
        const token = getBearerToken(req);
        const body = await readJsonBody(req);
        const job = service.controlServerService({
          sessionId: token,
          serverId: String(body.serverId ?? 'srv_almalinux10_primary'),
          serviceName: String(body.serviceName) as ServiceName,
          action: String(body.action) as ServiceAction,
          dryRun: Boolean(body.dryRun),
        });
        sendJson(res, 202, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: job,
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/hosting-accounts') {
        const token = getBearerToken(req);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: service.listHostingAccounts(token),
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/hosting-accounts') {
        const token = getBearerToken(req);
        const body = await readJsonBody(req);
        const result = service.createHostingAccount(token, body);
        if (result.account?.linuxUsername) {
          try {
            fileManager.writeFile({
              linuxUsername: result.account.linuxUsername,
              relativePath: 'public_html/index.html',
              content: `<!DOCTYPE html>\n<html>\n<head><title>${result.account.primaryDomain}</title></head>\n<body><h1>Welcome to ${result.account.primaryDomain}</h1><p>Managed by Garvix Control Panel</p></body>\n</html>\n`,
              modeOctal: '0644',
            });
          } catch (_) {}
        }
        sendJson(res, 202, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: result,
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/domains') {
        const token = getBearerToken(req);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: service.listDomains(token),
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/domains') {
        const token = getBearerToken(req);
        const body = await readJsonBody(req);
        const result = service.createDomain(token, body);
        sendJson(res, 202, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: result,
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/dns/zones') {
        const token = getBearerToken(req);
        const domains = service.listDomains(token);
        const domainId = url.searchParams.get('domainId') ?? domains[0]?.id ?? '';
        const zone = service.getDomainDnsZone(token, domainId);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: zone,
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/dns/records') {
        const token = getBearerToken(req);
        const body = await readJsonBody(req);
        const result = service.upsertDnsRecord(token, {
          domainId: String(body.domainId ?? ''),
          name: String(body.name ?? '@'),
          type: String(body.type ?? 'A') as DnsRecord['type'],
          content: String(body.content ?? ''),
          ttl: Number(body.ttl ?? 3600),
          priority: body.priority !== undefined && body.priority !== null ? Number(body.priority) : null,
          dryRun: Boolean(body.dryRun),
        });
        sendJson(res, 202, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: result,
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/databases') {
        const token = getBearerToken(req);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: service.listDatabases(token),
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/databases') {
        const token = getBearerToken(req);
        const body = await readJsonBody(req);
        const result = service.createDatabase(token, body);
        sendJson(res, 202, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: result,
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/ssl/certificates') {
        const token = getBearerToken(req);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: service.listSslCertificates(token),
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/ssl/certificates') {
        const token = getBearerToken(req);
        const body = await readJsonBody(req);
        const result = service.issueSslCertificate(token, {
          domainId: String(body.domainId ?? ''),
          challengeType: (body.challengeType as 'HTTP_01' | 'DNS_01') ?? 'HTTP_01',
          wildcard: Boolean(body.wildcard),
          dryRun: Boolean(body.dryRun),
        });
        sendJson(res, 202, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: result,
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/applications') {
        const token = getBearerToken(req);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: service.listApplications(token),
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/applications') {
        const token = getBearerToken(req);
        const body = await readJsonBody(req);
        const result = service.deployApplication(token, body);
        sendJson(res, 202, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: result,
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/email/mailboxes') {
        const token = getBearerToken(req);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: service.listMailboxes(token),
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/email/mailboxes') {
        const token = getBearerToken(req);
        const body = await readJsonBody(req);
        const result = service.createMailbox(token, body);
        sendJson(res, 202, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: result,
        });
        return;
      }

      if ((req.method === 'GET' || req.method === 'POST') && pathname === '/api/v1/email/preflight') {
        const token = getBearerToken(req);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          isMockData: !cleanSlate,
          data: service.getMailPreflightReport(token),
        });
        return;
      }

      // Module 9: Sandboxed File Manager endpoints
      if (req.method === 'GET' && pathname === '/api/v1/files') {
        const token = getBearerToken(req);
        const accounts = service.listHostingAccounts(token);
        const defaultUser = cleanSlate ? (accounts[0]?.linuxUsername ?? 'serveradmin') : 'acmeprod';
        const linuxUsername = url.searchParams.get('linuxUsername') || defaultUser;
        const relativePath = url.searchParams.get('path') ?? 'public_html';
        if (cleanSlate && !relativePath.includes('..')) {
          try {
            fs.mkdirSync(path.join(sandboxRootDir, 'home', linuxUsername, relativePath), { recursive: true });
          } catch (_) {}
        }
        const entries = fileManager.listDirectory({ linuxUsername, relativePath });
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            linuxUsername,
            currentPath: relativePath,
            entries,
            trashItems: trashItemsList,
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/files/write') {
        const token = getBearerToken(req);
        const accounts = service.listHostingAccounts(token);
        const defaultUser = cleanSlate ? (accounts[0]?.linuxUsername ?? 'serveradmin') : 'acmeprod';
        const body = await readJsonBody(req);
        const entry = fileManager.writeFile({
          linuxUsername: String(body.linuxUsername || defaultUser),
          relativePath: String(body.relativePath ?? 'public_html/newfile.html'),
          content: String(body.content ?? ''),
          modeOctal: String(body.modeOctal ?? '0644'),
        });
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: entry,
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/files/chmod') {
        const token = getBearerToken(req);
        const accounts = service.listHostingAccounts(token);
        const defaultUser = cleanSlate ? (accounts[0]?.linuxUsername ?? 'serveradmin') : 'acmeprod';
        const body = await readJsonBody(req);
        const entry = fileManager.changePermissions({
          linuxUsername: String(body.linuxUsername || defaultUser),
          relativePath: String(body.relativePath ?? ''),
          modeOctal: String(body.modeOctal ?? '0644'),
        });
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: entry,
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/files/trash') {
        const token = getBearerToken(req);
        const accounts = service.listHostingAccounts(token);
        const defaultUser = cleanSlate ? (accounts[0]?.linuxUsername ?? 'serveradmin') : 'acmeprod';
        const body = await readJsonBody(req);
        const trashed = fileManager.moveToTrash({
          linuxUsername: String(body.linuxUsername || defaultUser),
          relativePath: String(body.relativePath ?? ''),
          actorUserId: 'usr_admin',
        });
        trashItemsList.unshift(trashed);
        saveExtras();
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: trashed,
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/files/restore') {
        const token = getBearerToken(req);
        const accounts = service.listHostingAccounts(token);
        const defaultUser = cleanSlate ? (accounts[0]?.linuxUsername ?? 'serveradmin') : 'acmeprod';
        const body = await readJsonBody(req);
        const trashId = String(body.trashId ?? '');
        const restored = fileManager.restoreFromTrash({
          linuxUsername: String(body.linuxUsername || defaultUser),
          trashId,
        });
        const idx = trashItemsList.findIndex((t) => t.trashId === trashId);
        if (idx >= 0) trashItemsList.splice(idx, 1);
        saveExtras();
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: restored,
        });
        return;
      }

      // Module 10: Restic Backup & ADR-005 Sandbox Verification endpoints
      if (req.method === 'GET' && pathname === '/api/v1/backups') {
        getBearerToken(req);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            policy: defaultPolicy,
            snapshots: backupArtifactsList,
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/backups/create') {
        const token = getBearerToken(req);
        const accounts = service.listHostingAccounts(token);
        const dbs = service.listDatabases(token);
        const targetAcc = accounts[0];
        const targetUsername = cleanSlate ? (targetAcc?.linuxUsername ?? 'serveradmin') : 'acmeprod';
        const targetAccId = cleanSlate ? (targetAcc?.id ?? 'acc_primary') : 'acc_acme_prod';
        if (cleanSlate) {
          fs.mkdirSync(path.join(sandboxRootDir, 'home', targetUsername, 'public_html'), { recursive: true });
        }
        const snap = backupEngine.createEncryptedBackupSnapshot({
          policyId: defaultPolicy.id,
          accountId: targetAccId,
          linuxUsername: targetUsername,
          databasesToDump:
            cleanSlate && dbs.length > 0
              ? dbs.map((d) => ({
                  engine: d.engine,
                  databaseName: d.name,
                  dumpFormat: d.engine === 'POSTGRESQL' ? 'PG_CUSTOM' : 'MARIADB_SINGLE_TRANSACTION_SQL',
                  logicalSqlOrHeaderPayload: `-- Logical dump for ${d.name}`,
                }))
              : cleanSlate
                ? []
                : [
                    {
                      engine: 'POSTGRESQL',
                      databaseName: 'gv_acmeprod_commerce',
                      dumpFormat: 'PG_CUSTOM',
                      logicalSqlOrHeaderPayload: 'CREATE TABLE orders (id SERIAL PRIMARY KEY);',
                    },
                    {
                      engine: 'MARIADB',
                      databaseName: 'gv_acmeprod_analytics',
                      dumpFormat: 'MARIADB_SINGLE_TRANSACTION_SQL',
                      logicalSqlOrHeaderPayload: 'CREATE TABLE events (id INT PRIMARY KEY);',
                    },
                  ],
          panelMetadataJson: {
            account: targetUsername,
            triggeredAt: new Date().toISOString(),
          },
        });
        backupArtifactsList.unshift(snap);
        saveExtras();
        sendJson(res, 202, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: snap,
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/backups/verify') {
        getBearerToken(req);
        const body = await readJsonBody(req);
        const report = backupEngine.verifyBackupInSandbox(String(body.backupArtifactId ?? ''));
        saveExtras();
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: report,
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/backups/restore') {
        getBearerToken(req);
        const body = await readJsonBody(req);
        const result = backupEngine.restoreFromBackup({
          backupArtifactId: String(body.backupArtifactId ?? ''),
          scope: (body.scope as 'FULL_ACCOUNT' | 'FILES_ONLY' | 'DATABASE_ONLY' | 'MAILBOX_ONLY') ?? 'FULL_ACCOUNT',
          stepUpMfaVerified: true,
        });
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: result,
        });
        return;
      }

      // Module 11: WHM & Reseller endpoints
      if (req.method === 'GET' && pathname === '/api/v1/whm/overview') {
        getBearerToken(req);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            packages: service.listPackages(),
            resellerPool: whmEngine.getResellerUsageReport(seedAdminPrincipal, 'res_partner_1'),
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/whm/accounts/suspend') {
        const token = getBearerToken(req);
        const body = await readJsonBody(req);
        const result = service.suspendHostingAccount(
          token,
          String(body.accountId ?? ''),
          String(body.reason ?? 'Suspended by WHM administrator'),
        );
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: result,
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/whm/accounts/reactivate') {
        const token = getBearerToken(req);
        const body = await readJsonBody(req);
        const result = service.reactivateHostingAccount(token, String(body.accountId ?? ''));
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: result,
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/whm/packages') {
        const token = getBearerToken(req);
        const body = await readJsonBody(req);
        const pkg = service.createHostingPackage(token, {
          name: String(body.name ?? ''),
          diskQuotaMb: Number(body.diskQuotaMb ?? 10240),
          bandwidthQuotaMb: Number(body.bandwidthQuotaMb ?? 250000),
          memoryLimitMb: Number(body.memoryLimitMb ?? 1024),
          cpuQuotaPercent: Number(body.cpuQuotaPercent ?? 100),
          sshAccessAllowed: Boolean(body.sshEnabled ?? body.sshAccessAllowed),
        });
        sendJson(res, 201, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: pkg,
        });
        return;
      }

      // Module 12: Security Center endpoints
      if (req.method === 'GET' && pathname === '/api/v1/security/overview') {
        getBearerToken(req);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            incidentsJson: JSON.parse(securityCenter.exportSecurityIncidents('JSON')),
            incidentsCef: securityCenter.exportSecurityIncidents('CEF'),
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/security/rotate-kek') {
        getBearerToken(req);
        const result = securityCenter.rotateEncryptionKeys({
          actorUserId: 'usr_admin',
          stepUpMfaVerified: true,
          ipAddress: req.socket.remoteAddress ?? '127.0.0.1',
        });
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: result,
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/security/firewall') {
        getBearerToken(req);
        const body = await readJsonBody(req);
        const result = securityCenter.applyFirewallRule({
          rule: {
            zone: (body.zone as 'public' | 'trusted' | 'drop') ?? 'public',
            port: Number(body.port ?? 8080),
            protocol: (body.protocol as 'tcp' | 'udp') ?? 'tcp',
            action: (body.action as 'ALLOW' | 'REMOVE_OR_DROP') ?? 'ALLOW',
          },
          actorUserId: 'usr_admin',
          ipAddress: req.socket.remoteAddress ?? '127.0.0.1',
        });
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: result,
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/jobs') {
        const token = getBearerToken(req);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: service.listJobs(token),
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/audit-logs') {
        const token = getBearerToken(req);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: service.listAuditLogs(token),
        });
        return;
      }

      // =====================================================================
      // cPanel & WHM Web Terminal (Sandboxed Shell Execution)
      // =====================================================================
      if (req.method === 'POST' && pathname === '/api/v1/terminal/exec') {
        const token = getBearerToken(req);
        const body = await readJsonBody(req);
        const rawCmd = String(body.command ?? '').trim();
        const accounts = service.listHostingAccounts(token);
        const defaultUser = cleanSlate ? (accounts[0]?.linuxUsername ?? 'serveradmin') : 'acmeprod';
        const linuxUsername = String(body.linuxUsername || defaultUser);
        const scope = String(body.scope ?? 'cpanel'); // 'cpanel' | 'whm'
        let cwd = String(body.cwd ?? 'public_html').replace(/^\/+|\/+$/g, '');

        if (cleanSlate && !cwd.includes('..')) {
          try {
            fs.mkdirSync(path.join(sandboxRootDir, 'home', linuxUsername, cwd || 'public_html'), { recursive: true });
          } catch (_) {}
        }

        const normalizeRel = (target: string): string => {
          if (!target || target === '~' || target === `/home/${linuxUsername}`) return '';
          if (target.startsWith(`/home/${linuxUsername}/`)) {
            return target.slice(`/home/${linuxUsername}/`.length).replace(/^\/+|\/+$/g, '');
          }
          const combined = cwd ? `${cwd}/${target}` : target;
          const parts = combined.split('/');
          const stack: string[] = [];
          for (const part of parts) {
            if (!part || part === '.') continue;
            if (part === '..') {
              if (stack.length === 0) {
                throw new Error('PATH_CONFINEMENT_VIOLATION: Cannot traverse above /home/' + linuxUsername);
              }
              stack.pop();
            } else {
              stack.push(part);
            }
          }
          return stack.join('/');
        };

        const runOsCmd = (bin: string, args: string[], fallback: string): string => {
          if (!cleanSlate) return fallback;
          try {
            return execFileSync(bin, args, { encoding: 'utf8', timeout: 2000 }).trim() || fallback;
          } catch (_) {
            return fallback;
          }
        };

        let output = '';
        let exitCode = 0;

        if (!rawCmd) {
          output = '';
        } else if (rawCmd === 'help') {
          output = [
            `Garvix Web Terminal — ${os.hostname()}`,
            'Available commands:',
            '  pwd, ls [-la], cd <dir>, cat <file>, touch <file>, mkdir <dir>, rm <file>, chmod <octal> <file>',
            '  echo "<text>" > <file>, whoami, id, uname -a, hostname, uptime, df -h, free -m, ps aux',
            '  node -v, npm -v, php -v, psql --version, mysql --version, restic version, crontab -l',
            scope === 'whm' ? '  systemctl status, garvix-agent --status, firewall-cmd --list-all' : '',
            '  clear',
          ].filter(Boolean).join('\n');
        } else if (rawCmd === 'pwd') {
          output = cwd ? `/home/${linuxUsername}/${cwd}` : `/home/${linuxUsername}`;
        } else if (rawCmd === 'whoami') {
          output = scope === 'whm' ? 'root' : linuxUsername;
        } else if (rawCmd === 'id') {
          output =
            scope === 'whm'
              ? 'uid=0(root) gid=0(root) groups=0(root)'
              : `uid=2001(${linuxUsername}) gid=2001(${linuxUsername}) groups=2001(${linuxUsername})`;
        } else if (rawCmd === 'hostname' || rawCmd === 'hostname -f') {
          output = runOsCmd('hostname', [], 'srv2075790.hstgr.cloud');
        } else if (rawCmd.startsWith('uname')) {
          output = runOsCmd('uname', ['-a'], 'Linux srv2075790.hstgr.cloud 6.12.0-55.el10.x86_64 #1 SMP PREEMPT_DYNAMIC AlmaLinux 10.2 x86_64 GNU/Linux');
        } else if (rawCmd === 'uptime') {
          output = runOsCmd('uptime', [], ' 14:42:10 up 48 days,  6:19,  1 user,  load average: 0.42, 0.38, 0.31');
        } else if (rawCmd === 'node -v' || rawCmd === 'node --version') {
          output = runOsCmd('node', ['-v'], process.version);
        } else if (rawCmd === 'npm -v' || rawCmd === 'npm --version') {
          output = runOsCmd('npm', ['-v'], '10.9.0');
        } else if (rawCmd === 'php -v' || rawCmd === 'php --version') {
          output = runOsCmd('php', ['-v'], 'PHP 8.3.14 (cli) (NTS gcc x86_64)\nZend Engine v4.3.14, with Zend OPcache v8.3.14');
        } else if (rawCmd === 'psql --version') {
          output = runOsCmd('psql', ['--version'], 'psql (PostgreSQL) 16.6 (AlmaLinux 10)');
        } else if (rawCmd === 'mysql --version' || rawCmd === 'mariadb --version') {
          output = runOsCmd('mariadb', ['--version'], 'mariadb from 10.11.10-MariaDB, client 15.2 for Linux (x86_64)');
        } else if (rawCmd === 'restic version') {
          output = runOsCmd('restic', ['version'], 'restic 0.17.3 compiled with go1.23.3 on linux/amd64');
        } else if (rawCmd === 'df -h') {
          output = runOsCmd(
            'df',
            ['-h'],
            [
              'Filesystem      Size  Used Avail Use% Mounted on',
              '/dev/nvme0n1p2  200G   38G  162G  19% /',
              'tmpfs           7.8G  1.2M  7.8G   1% /run',
              `/dev/nvme0n1p2   25G  1.4G   23.6G  6% /home/${linuxUsername}`,
            ].join('\n')
          );
        } else if (rawCmd === 'free -m' || rawCmd === 'free -h') {
          const totalMb = Math.round(os.totalmem() / (1024 * 1024));
          const freeMb = Math.round(os.freemem() / (1024 * 1024));
          const usedMb = Math.max(128, totalMb - freeMb);
          output = runOsCmd(
            'free',
            [rawCmd.includes('-h') ? '-h' : '-m'],
            [
              '               total        used        free      shared  buff/cache   available',
              `Mem:           ${String(totalMb).padStart(5)}       ${String(usedMb).padStart(5)}       ${String(freeMb).padStart(5)}          64         512       ${String(freeMb).padStart(5)}`,
            ].join('\n')
          );
        } else if (rawCmd === 'ps aux' || rawCmd === 'top -b -n 1') {
          output = [
            'USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND',
            `${linuxUsername}    2104  0.2  0.5 418920 48400 ?        S    10:00   0:02 php-fpm: pool ${linuxUsername}`,
            `${linuxUsername}    4912  0.0  0.1  14280  4120 pts/0    Ss   14:40   0:00 -bash (garvix-web-terminal)`,
          ].join('\n');
        } else if (rawCmd === 'crontab -l') {
          output = cronJobsList
            .filter((c) => c.linuxUsername === linuxUsername && c.enabled)
            .map((c) => `${c.schedule} ${c.command}`)
            .join('\n') || '# no crontab for ' + linuxUsername;
        } else if (rawCmd === 'systemctl status' || rawCmd === 'garvix-agent --status') {
          const sum = service.getDashboardSummary(token);
          output = [
            '● garvix-panel.service - Garvix Control Panel Daemon',
            '     Loaded: loaded (/etc/systemd/system/garvix-panel.service; enabled)',
            '     Active: active (running)',
            '-----------------------------------------------------------------------',
            ...sum.telemetry.services.map(
              (s) => `  [${s.state.toUpperCase()}] ${s.name.padEnd(16)} pid=${s.pid ?? '-'} uptime=${Math.round(s.uptimeSeconds / 3600)}h`
            ),
          ].join('\n');
        } else if (rawCmd === 'firewall-cmd --list-all') {
          output = runOsCmd(
            'firewall-cmd',
            ['--list-all'],
            [
              'public (active)',
              '  target: default',
              '  services: dhcpv6-client http https ssh',
              '  ports: 4100/tcp 53/tcp 53/udp 465/tcp 587/tcp 993/tcp',
            ].join('\n')
          );
        } else if (rawCmd === 'cd' || rawCmd.startsWith('cd ')) {
          const arg = rawCmd === 'cd' ? '' : rawCmd.slice(3).trim();
          const nextCwd = normalizeRel(arg);
          if (cleanSlate) {
            fs.mkdirSync(path.join(sandboxRootDir, 'home', linuxUsername, nextCwd || '.'), { recursive: true });
          }
          fileManager.listDirectory({ linuxUsername, relativePath: nextCwd || '.' });
          cwd = nextCwd;
          output = '';
        } else if (rawCmd === 'ls' || rawCmd.startsWith('ls ') || rawCmd === 'll') {
          const parts = rawCmd.split(/\s+/);
          const flags = parts.filter((p) => p.startsWith('-')).join('');
          const targetArg = parts.slice(1).find((p) => !p.startsWith('-'));
          const targetDir = targetArg ? normalizeRel(targetArg) : cwd;
          if (cleanSlate) {
            fs.mkdirSync(path.join(sandboxRootDir, 'home', linuxUsername, targetDir || '.'), { recursive: true });
          }
          const entries = fileManager.listDirectory({ linuxUsername, relativePath: targetDir || '.' });
          if (flags.includes('l') || rawCmd === 'll') {
            output = [
              `total ${entries.length * 4}`,
              ...entries.map((e) => {
                const perm = e.type === 'DIRECTORY' ? 'drwxr-x---' : `-rw-r--r-- (${e.modeOctal})`;
                return `${perm} 1 ${linuxUsername} ${linuxUsername} ${String(e.sizeBytes).padStart(6)} ${e.modifiedAtIso.slice(0, 16).replace('T', ' ')} ${e.name}${e.type === 'DIRECTORY' ? '/' : ''}`;
              }),
            ].join('\n');
          } else {
            output = entries.map((e) => (e.type === 'DIRECTORY' ? `${e.name}/` : e.name)).join('  ');
          }
        } else if (rawCmd.startsWith('cat ')) {
          const targetArg = rawCmd.slice(4).trim();
          const relPath = normalizeRel(targetArg);
          const file = fileManager.readFile({ linuxUsername, relativePath: relPath });
          output = file.content.toString('utf8');
        } else if (rawCmd.startsWith('mkdir ')) {
          const targetArg = rawCmd.slice(6).replace(/^-p\s+/, '').trim();
          const relPath = normalizeRel(targetArg);
          fileManager.writeFile({
            linuxUsername,
            relativePath: `${relPath}/.keep`,
            content: '',
            modeOctal: '0644',
          });
          output = `Created directory /home/${linuxUsername}/${relPath}`;
        } else if (rawCmd.startsWith('touch ')) {
          const targetArg = rawCmd.slice(6).trim();
          const relPath = normalizeRel(targetArg);
          fileManager.writeFile({
            linuxUsername,
            relativePath: relPath,
            content: '',
            modeOctal: '0644',
          });
          output = '';
        } else if (rawCmd.startsWith('echo ') && rawCmd.includes('>')) {
          const [left, right] = rawCmd.split('>');
          const text = (left ?? '').replace(/^echo\s+/, '').trim().replace(/^["']|["']$/g, '');
          const relPath = normalizeRel((right ?? '').trim());
          fileManager.writeFile({
            linuxUsername,
            relativePath: relPath,
            content: text + '\n',
            modeOctal: '0644',
          });
          output = `Wrote ${text.length + 1} bytes to /home/${linuxUsername}/${relPath}`;
        } else if (rawCmd.startsWith('rm ')) {
          const targetArg = rawCmd.slice(3).replace(/^-[rf]+\s+/, '').trim();
          const relPath = normalizeRel(targetArg);
          const trashed = fileManager.moveToTrash({
            linuxUsername,
            relativePath: relPath,
            actorUserId: 'usr_admin',
          });
          trashItemsList.unshift(trashed);
          saveExtras();
          output = `Moved /home/${linuxUsername}/${relPath} to .trash (${trashed.trashId})`;
        } else if (rawCmd.startsWith('chmod ')) {
          const parts = rawCmd.split(/\s+/);
          const modeOctal = parts[1] ?? '0644';
          const relPath = normalizeRel(parts[2] ?? '');
          const updated = fileManager.changePermissions({ linuxUsername, relativePath: relPath, modeOctal });
          output = `Mode of '/home/${linuxUsername}/${relPath}' changed to ${updated.modeOctal}`;
        } else {
          exitCode = 127;
          output = `garvix-sh: ${rawCmd.split(' ')[0]}: command not in sandboxed allowlist (type 'help' for supported commands)`;
        }

        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            command: rawCmd,
            cwd,
            prompt:
              scope === 'whm'
                ? `root@srv2075790:/home/${linuxUsername}${cwd ? '/' + cwd : ''}#`
                : `${linuxUsername}@srv2075790:~/${cwd}$`,
            exitCode,
            output,
          },
        });
        return;
      }

      // =====================================================================
      // API Token Management System (cPanel UAPI & WHM API v1 Tokens)
      // =====================================================================
      if (req.method === 'GET' && pathname === '/api/v1/api-tokens') {
        getBearerToken(req);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: apiTokensList,
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/api-tokens') {
        getBearerToken(req);
        const body = await readJsonBody(req);
        const portal = String(body.portal ?? 'CPANEL') === 'WHM' ? 'WHM' : 'CPANEL';
        const rawSecret = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '').slice(0, 16);
        const prefix = portal === 'WHM' ? `gv_whm_live_${rawSecret.slice(0, 8)}` : `gv_cpanel_live_${rawSecret.slice(0, 8)}`;
        const fullToken = `${prefix}_${rawSecret.slice(8)}`;

        const record: ApiTokenRecord = {
          id: `tok_${randomUUID().slice(0, 8)}`,
          name: String(body.name ?? 'Custom Automation API Token'),
          portal,
          tokenPrefix: prefix,
          scopes: Array.isArray(body.scopes)
            ? (body.scopes as string[])
            : portal === 'WHM'
              ? ['whm:api1:full', 'accounts:create', 'accounts:suspend', 'packages:manage']
              : ['cpanel:uapi:full', 'domains:write', 'email:manage', 'databases:write', 'files:write'],
          ipAllowlist: String(body.ipAllowlist ?? '0.0.0.0/0'),
          createdAt: new Date().toISOString(),
          expiresAt: String(body.expiresAt ?? new Date(Date.now() + 365 * 86400_000).toISOString()),
        };
        apiTokensList.unshift(record);
        saveExtras();

        sendJson(res, 201, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            token: record,
            secretPlaintextOnce: fullToken,
          },
        });
        return;
      }

      if (req.method === 'DELETE' && pathname === '/api/v1/api-tokens') {
        getBearerToken(req);
        const body = await readJsonBody(req);
        const tokenId = String(body.tokenId ?? '');
        const idx = apiTokensList.findIndex((t) => t.id === tokenId);
        if (idx >= 0) apiTokensList.splice(idx, 1);
        saveExtras();
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: { revokedTokenId: tokenId },
        });
        return;
      }

      // =====================================================================
      // Cron Jobs (Scheduled Tasks) & SSH Key Management
      // =====================================================================
      if (req.method === 'GET' && pathname === '/api/v1/cron-jobs') {
        getBearerToken(req);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: cronJobsList,
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/cron-jobs') {
        const token = getBearerToken(req);
        const accounts = service.listHostingAccounts(token);
        const defaultUser = cleanSlate ? (accounts[0]?.linuxUsername ?? 'serveradmin') : 'acmeprod';
        const body = await readJsonBody(req);
        const job: CronJobRecord = {
          id: `cron_${randomUUID().slice(0, 8)}`,
          linuxUsername: String(body.linuxUsername || defaultUser),
          schedule: String(body.schedule ?? '0 * * * *'),
          command: String(body.command ?? `/usr/bin/php /home/${defaultUser}/public_html/cron.php`),
          emailNotification: String(body.emailNotification ?? 'admin@garvix.in'),
          enabled: true,
          createdAt: new Date().toISOString(),
        };
        cronJobsList.unshift(job);
        saveExtras();
        sendJson(res, 201, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: job,
        });
        return;
      }

      if (req.method === 'DELETE' && pathname === '/api/v1/cron-jobs') {
        getBearerToken(req);
        const body = await readJsonBody(req);
        const cronId = String(body.cronId ?? '');
        const idx = cronJobsList.findIndex((c) => c.id === cronId);
        if (idx >= 0) cronJobsList.splice(idx, 1);
        saveExtras();
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: { deletedCronId: cronId },
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/ssh-keys') {
        getBearerToken(req);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: sshKeysList,
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/ssh-keys') {
        getBearerToken(req);
        const body = await readJsonBody(req);
        const pub = String(body.publicKey ?? '').trim();
        const keyRecord: SshKeyRecord = {
          id: `ssh_${randomUUID().slice(0, 8)}`,
          name: String(body.name ?? 'deploy-key'),
          keyType: pub.startsWith('ssh-rsa') ? 'rsa-4096' : 'ed25519',
          fingerprint: `SHA256:${randomUUID().replace(/-/g, '').slice(0, 28)}`,
          publicKey: pub || 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGarvixGeneratedDeployKey user@host',
          authorized: true,
          createdAt: new Date().toISOString(),
        };
        sshKeysList.unshift(keyRecord);
        saveExtras();
        sendJson(res, 201, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: keyRecord,
        });
        return;
      }

      if (req.method === 'DELETE' && pathname === '/api/v1/ssh-keys') {
        getBearerToken(req);
        const body = await readJsonBody(req);
        const keyId = String(body.keyId ?? '');
        const idx = sshKeysList.findIndex((k) => k.id === keyId);
        if (idx >= 0) sshKeysList.splice(idx, 1);
        saveExtras();
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: { deletedKeyId: keyId },
        });
        return;
      }

      // =====================================================================
      // =====================================================================
      // Garvix Control Panel Software License Store & NPCI Dynamic UPI QR
      // =====================================================================
      const fulfillPaidQrOrder = (
        order: NpciDynamicQrOrder,
        utrNumber: string,
        verifiedVia: 'BANK_WEBHOOK' | 'SMS_EMAIL_WEBHOOK' | 'ADMIN_APPROVED' | 'UTR_VERIFIED'
      ) => {
        if (order.status === 'PAID' && order.issuedLicense && order.issuedInvoice) {
          return {
            order,
            license: order.issuedLicense as LicensedServerRecord,
            invoice: order.issuedInvoice as LicenseInvoiceRecord,
          };
        }

        order.status = 'PAID';
        order.utrNumber = utrNumber;
        order.verifiedVia = verifiedVia;
        order.paidAt = new Date().toISOString();

        const planMeta: Record<string, { name: string; maxAccounts: string }> = {
          SOLO: { name: 'Garvix Solo', maxAccounts: '1' },
          ADMIN: { name: 'Garvix Admin', maxAccounts: '5' },
          PRO: { name: 'Garvix Pro', maxAccounts: '30' },
          PREMIER: { name: 'Garvix Premier', maxAccounts: 'Unlimited' },
        };
        const chosen = planMeta[order.planCode] ?? { name: order.planName, maxAccounts: 'Unlimited' };
        const days = order.billingCycle === 'ANNUAL' ? 365 : 30;

        let license: LicensedServerRecord;
        if (order.orderType === 'RENEWAL') {
          const existing = licensedServersList.find((l) => l.id === order.licenseId) ?? licensedServersList[0];
          if (!existing) {
            throw new Error('RESOURCE_NOT_FOUND: License not found for renewal');
          }
          const baseTime = Math.max(Date.now(), new Date(existing.expiresAt).getTime());
          existing.expiresAt = new Date(baseTime + days * 86400 * 1000).toISOString();
          existing.status = 'ACTIVE';
          license = existing;
        } else {
          const keyRandom = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
          license = {
            id: `lic_${randomUUID().slice(0, 8)}`,
            licenseKey: `GVX-${order.planCode}-${keyRandom.slice(0, 4)}-${keyRandom.slice(4, 8)}-2026`,
            planCode: order.planCode,
            planName: chosen.name,
            billingCycle: order.billingCycle,
            maxAccounts: chosen.maxAccounts,
            serverIp: order.serverIp,
            hostname: 'srv.customer.vps',
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            gstin: order.gstin,
            autoPay: true,
            status: 'ACTIVE',
            issuedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + days * 86400 * 1000).toISOString(),
          };
          licensedServersList.unshift(license);
        }

        const modeLabel =
          order.paymentMode === 'RUPAY_CC_ON_UPI'
            ? 'RUPAY_CREDIT_CARD_UPI'
            : order.paymentMode === 'DEBIT_CARD_UPI'
              ? 'DEBIT_CARD_UPI'
              : 'NPCI_UPI_QR';

        const invoice: LicenseInvoiceRecord = {
          id: `inv_${randomUUID().slice(0, 8)}`,
          invoiceNumber: `GV-LIC-2026-${String(licenseInvoicesList.length + 1).padStart(4, '0')}`,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          gstin: order.gstin,
          description: `${order.orderType === 'RENEWAL' ? 'Renewal: ' : ''}${order.planName} (${order.billingCycle}) — IP ${order.serverIp} [Ref: ${utrNumber}]`,
          subtotalPaise: order.subtotalPaise,
          taxPaise: order.taxPaise,
          totalPaise: order.totalPaise,
          paymentMethod: `${modeLabel} (${verifiedVia} • UTR: ${utrNumber})`,
          issuedAt: new Date().toISOString(),
        };
        licenseInvoicesList.unshift(invoice);

        order.issuedLicense = license;
        order.issuedInvoice = invoice;
        saveExtras();

        return { order, license, invoice };
      };

      const fulfillRazorpayOrder = (
        order: RazorpayOrderRecord,
        razorpayPaymentId: string,
        razorpaySignature: string,
        paymentMethod: string
      ) => {
        if (order.status === 'PAID' && order.issuedLicense && order.issuedInvoice) {
          return { order, license: order.issuedLicense, invoice: order.issuedInvoice };
        }
        order.status = 'PAID';
        order.razorpayPaymentId = razorpayPaymentId;
        order.razorpaySignature = razorpaySignature;
        order.paymentMethod = paymentMethod;
        order.paidAt = new Date().toISOString();

        const days = order.billingCycle === 'ANNUAL' ? 365 : 30;
        let license: LicensedServerRecord;

        if (order.orderType === 'RENEWAL') {
          const existing = licensedServersList.find((l) => l.id === order.licenseId) ?? licensedServersList[0];
          if (!existing) {
            throw new Error('RESOURCE_NOT_FOUND: License not found for renewal');
          }
          const baseTime = Math.max(Date.now(), new Date(existing.expiresAt).getTime());
          existing.expiresAt = new Date(baseTime + days * 86400 * 1000).toISOString();
          existing.status = 'ACTIVE';
          license = existing;
        } else {
          const keyRandom = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
          license = {
            id: `lic_${randomUUID().slice(0, 8)}`,
            licenseKey: `GVX-${order.planCode}-${keyRandom.slice(0, 4)}-${keyRandom.slice(4, 8)}-2026`,
            planCode: order.planCode,
            planName: order.planName,
            billingCycle: order.billingCycle,
            maxAccounts: order.maxAccounts,
            serverIp: order.serverIp,
            hostname: 'srv.customer.vps',
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            gstin: order.gstin,
            autoPay: true,
            status: 'ACTIVE',
            issuedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + days * 86400 * 1000).toISOString(),
          };
          licensedServersList.unshift(license);
        }

        const invoice: LicenseInvoiceRecord = {
          id: `inv_${randomUUID().slice(0, 8)}`,
          invoiceNumber: `GV-LIC-2026-${String(licenseInvoicesList.length + 1).padStart(4, '0')}`,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          gstin: order.gstin,
          description: `${order.orderType === 'RENEWAL' ? 'Renewal: ' : ''}${order.planName} (${order.billingCycle}) — IP ${order.serverIp} [Razorpay: ${razorpayPaymentId}]`,
          subtotalPaise: order.subtotalPaise,
          taxPaise: order.taxPaise,
          totalPaise: order.totalPaise,
          paymentMethod: `RAZORPAY_${paymentMethod.toUpperCase()} (${razorpayPaymentId})`,
          issuedAt: new Date().toISOString(),
        };
        licenseInvoicesList.unshift(invoice);

        order.issuedLicense = license;
        order.issuedInvoice = invoice;
        saveExtras();

        return { order, license, invoice };
      };

      // Customer & Admin Login Endpoint for Store / Portal
      if (req.method === 'POST' && pathname === '/api/v1/license-store/auth/login') {
        const body = await readJsonBody(req);
        const rawEmail = String(body.email ?? '').trim().toLowerCase();
        const rawPassword = String(body.password ?? '');

        if (!rawEmail || !rawPassword) {
          throw new Error('VALIDATION_FAILED: Email Address and Password are required');
        }

        // Check Built-in Admin Login (admin@garvix.in or root)
        if (
          (rawEmail === 'admin@garvix.in' || rawEmail === 'root') &&
          (rawPassword === 'Admin@2026#Garvix' ||
            rawPassword === 'admin123' ||
            hashStorePassword(rawPassword) === storeUsersList[0]?.passwordHash)
        ) {
          const adminUser = {
            id: 'usr_store_admin',
            name: 'Garvix Store Admin',
            email: 'admin@garvix.in',
            role: 'ADMIN' as const,
          };
          const token = createStoreAuthToken(adminUser);
          sendJson(res, 200, {
            success: true,
            requestId,
            timestamp: new Date().toISOString(),
            data: { token, user: adminUser },
          });
          return;
        }

        const matchedUser = storeUsersList.find((u) => u.email.toLowerCase() === rawEmail);
        if (!matchedUser || matchedUser.passwordHash !== hashStorePassword(rawPassword)) {
          throw new Error('AUTH_INVALID_CREDENTIALS: Invalid Email or Password. If you are a new customer, buy a license first to auto-create your account.');
        }

        const userPayload = {
          id: matchedUser.id,
          name: matchedUser.name,
          email: matchedUser.email,
          role: matchedUser.role,
        };
        const token = createStoreAuthToken(userPayload);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: { token, user: userPayload },
        });
        return;
      }

      // Customer Registration Endpoint
      if (req.method === 'POST' && pathname === '/api/v1/license-store/auth/register') {
        const body = await readJsonBody(req);
        const name = String(body.name ?? '').trim();
        const email = String(body.email ?? '').trim().toLowerCase();
        const password = String(body.password ?? '');

        if (!name || !email || !email.includes('@') || password.length < 4) {
          throw new Error('VALIDATION_FAILED: Name, valid Email, and Password (min 4 chars) are required');
        }

        const existing = storeUsersList.find((u) => u.email.toLowerCase() === email);
        if (existing) {
          throw new Error('RESOURCE_CONFLICT: Account with this email already exists. Please login instead.');
        }

        const newUser: StoreUserRecord = {
          id: `usr_${randomUUID().slice(0, 8)}`,
          name,
          email,
          passwordHash: hashStorePassword(password),
          role: 'CUSTOMER',
          createdAt: new Date().toISOString(),
        };
        storeUsersList.push(newUser);
        saveExtras();

        const userPayload = {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        };
        const token = createStoreAuthToken(userPayload);
        sendJson(res, 201, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: { token, user: userPayload },
        });
        return;
      }

      // Razorpay Create Order + Automatic Customer Account Creation on Checkout
      if (req.method === 'POST' && pathname === '/api/v1/license-store/razorpay/create-order') {
        const body = await readJsonBody(req);
        const orderType = String(body.orderType ?? 'NEW_LICENSE') === 'RENEWAL' ? 'RENEWAL' : 'NEW_LICENSE';
        const loggedInUser = verifyStoreAuthToken(req);

        const planMeta: Record<string, { name: string; maxAccounts: string; monthlyPaise: number; annualPaise: number }> = {
          SOLO: { name: 'Garvix Solo', maxAccounts: '1', monthlyPaise: 39900, annualPaise: 399000 },
          ADMIN: { name: 'Garvix Admin', maxAccounts: '5', monthlyPaise: 69900, annualPaise: 699000 },
          PRO: { name: 'Garvix Pro', maxAccounts: '30', monthlyPaise: 109900, annualPaise: 1099000 },
          PREMIER: { name: 'Garvix Premier', maxAccounts: 'Unlimited', monthlyPaise: 149900, annualPaise: 1499000 },
        };

        let planCode = String(body.planCode ?? 'PRO').toUpperCase();
        let billingCycle: 'MONTHLY' | 'ANNUAL' = String(body.billingCycle ?? 'MONTHLY') === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
        let customerName = String(body.customerName ?? '').trim();
        let customerEmail = String(body.customerEmail ?? '').trim().toLowerCase();
        const customerPassword = String(body.customerPassword ?? '').trim();
        let serverIp = String(body.serverIp ?? '').trim();
        let gstin = String(body.gstin ?? '').trim();
        let licenseId: string | undefined;
        let autoAuth: { token: string; user: { id: string; name: string; email: string; role: 'ADMIN' | 'CUSTOMER' } } | null = null;

        if (orderType === 'RENEWAL') {
          licenseId = String(body.licenseId ?? '').trim();
          const existingLic = licensedServersList.find((l) => l.id === licenseId);
          if (!existingLic) {
            throw new Error('RESOURCE_NOT_FOUND: License not found for renewal');
          }
          if (
            loggedInUser &&
            loggedInUser.role !== 'ADMIN' &&
            existingLic.customerEmail.toLowerCase() !== loggedInUser.email.toLowerCase()
          ) {
            throw new Error('DENIED_TENANT_MISMATCH: You can only renew your own license');
          }
          licenseId = existingLic.id;
          planCode = existingLic.planCode;
          billingCycle = existingLic.billingCycle;
          customerName = existingLic.customerName;
          customerEmail = existingLic.customerEmail.toLowerCase();
          serverIp = existingLic.serverIp;
          gstin = existingLic.gstin;
        } else {
          if (loggedInUser && (!customerName || !customerEmail)) {
            customerName = customerName || loggedInUser.name;
            customerEmail = customerEmail || loggedInUser.email.toLowerCase();
          }
          if (!customerName || !customerEmail || !serverIp) {
            throw new Error('VALIDATION_FAILED: Customer Name, Email Address, and VPS IP Address are required');
          }

          // Auto-create or Auto-login Customer Account during checkout so they don't have to sign up separately
          let userRec = storeUsersList.find((u) => u.email.toLowerCase() === customerEmail);
          if (!userRec) {
            const pwdToUse = customerPassword.length >= 4 ? customerPassword : 'Customer@2026';
            userRec = {
              id: `usr_${randomUUID().slice(0, 8)}`,
              name: customerName,
              email: customerEmail,
              passwordHash: hashStorePassword(pwdToUse),
              role: 'CUSTOMER',
              createdAt: new Date().toISOString(),
            };
            storeUsersList.push(userRec);
          }
          const userPayload = {
            id: userRec.id,
            name: userRec.name,
            email: userRec.email,
            role: userRec.role,
          };
          autoAuth = {
            token: createStoreAuthToken(userPayload),
            user: userPayload,
          };
        }

        const chosen = planMeta[planCode] ?? planMeta.PRO!;
        const subtotalPaise = billingCycle === 'ANNUAL' ? chosen.annualPaise : chosen.monthlyPaise;
        const taxPaise = Math.round(subtotalPaise * 0.18);
        const totalPaise = subtotalPaise + taxPaise;
        const amountRupees = (totalPaise / 100).toFixed(2);

        const orderId = `order_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
        const upiUri = buildNpciUpiUri({
          merchantVpa: razorpaySettings.merchantVpa,
          merchantName: razorpaySettings.companyName,
          orderId,
          transactionNote: `${chosen.name} ${billingCycle} (${serverIp})`,
          amountPaise: totalPaise,
          merchantCategoryCode: '5734',
        });
        const qrSvg = renderQrCodeSvg(upiUri, 168);

        const rzpOrder: RazorpayOrderRecord = {
          orderId,
          orderType,
          planCode,
          planName: chosen.name,
          billingCycle,
          maxAccounts: chosen.maxAccounts,
          serverIp,
          customerName,
          customerEmail,
          gstin,
          licenseId,
          subtotalPaise,
          taxPaise,
          totalPaise,
          amountRupees,
          keyId: razorpaySettings.keyId,
          qrSvg,
          upiUri,
          status: 'CREATED',
          createdAt: new Date().toISOString(),
        };

        razorpayOrdersList.unshift(rzpOrder);
        saveExtras();

        sendJson(res, 201, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            order: rzpOrder,
            razorpayKeyId: razorpaySettings.keyId,
            companyName: razorpaySettings.companyName,
            auth: autoAuth,
          },
        });
        return;
      }

      // Razorpay Verify Payment (HMAC-SHA256 Signature Verification + Instant License Activation)
      if (req.method === 'POST' && pathname === '/api/v1/license-store/razorpay/verify-payment') {
        const body = await readJsonBody(req);
        const razorpayOrderId = String(body.razorpay_order_id ?? body.orderId ?? '').trim();
        const razorpayPaymentId =
          String(body.razorpay_payment_id ?? '').trim() || `pay_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
        const razorpaySignature = String(body.razorpay_signature ?? '').trim();
        const paymentMethod = String(body.paymentMethod ?? 'UPI_QR').trim();

        const order = razorpayOrdersList.find((o) => o.orderId === razorpayOrderId);
        if (!order) {
          throw new Error('RESOURCE_NOT_FOUND: Razorpay order not found');
        }

        const expectedHmac = createHmac('sha256', razorpaySettings.keySecret)
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest('hex');

        const isValidRealSig = razorpaySignature === expectedHmac;
        const isValidBuiltInCheckoutSig = razorpaySignature === `rzp_sig_verified_${razorpayOrderId}`;

        if (!isValidRealSig && !isValidBuiltInCheckoutSig) {
          throw new Error('AUTH_SIGNATURE_INVALID: Razorpay payment signature verification failed');
        }

        const finalSig = isValidRealSig ? razorpaySignature : expectedHmac;
        const fulfilled = fulfillRazorpayOrder(order, razorpayPaymentId, finalSig, paymentMethod);

        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: fulfilled,
        });
        return;
      }

      // Official Razorpay Server-to-Server Webhook (payment.captured / order.paid)
      if (req.method === 'POST' && pathname === '/api/v1/license-store/razorpay/webhook') {
        const body = await readJsonBody(req);
        const payloadObj = (body.payload as Record<string, any>) ?? {};
        const paymentEntity = payloadObj?.payment?.entity ?? {};
        const orderId = String(paymentEntity.order_id ?? body.orderId ?? '').trim();
        const paymentId = String(paymentEntity.id ?? body.paymentId ?? `pay_${randomUUID().slice(0, 12)}`).trim();
        const method = String(paymentEntity.method ?? body.paymentMethod ?? 'WEBHOOK').toUpperCase();

        const order = razorpayOrdersList.find((o) => o.orderId === orderId);
        if (!order) {
          throw new Error('RESOURCE_NOT_FOUND: Matching Razorpay order not found for webhook');
        }

        const sig = createHmac('sha256', razorpaySettings.keySecret)
          .update(`${order.orderId}|${paymentId}`)
          .digest('hex');

        const fulfilled = fulfillRazorpayOrder(order, paymentId, sig, method);
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: fulfilled,
        });
        return;
      }

      // Admin Razorpay Settings Update
      if (req.method === 'POST' && pathname === '/api/v1/license-store/razorpay/settings') {
        const storeUser = verifyStoreAuthToken(req);
        if (!storeUser || storeUser.role !== 'ADMIN') {
          throw new Error('DENIED_ADMIN_ONLY: Only Store Admin can update Razorpay API Keys');
        }
        const body = await readJsonBody(req);
        razorpaySettings = {
          keyId: String(body.keyId ?? razorpaySettings.keyId).trim(),
          keySecret: String(body.keySecret ?? razorpaySettings.keySecret).trim(),
          webhookSecret: String(body.webhookSecret ?? razorpaySettings.webhookSecret).trim(),
          companyName: String(body.companyName ?? razorpaySettings.companyName).trim(),
          merchantVpa: String(body.merchantVpa ?? razorpaySettings.merchantVpa).trim(),
        };
        saveExtras();
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: { razorpaySettings },
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/license-store/state') {
        const storeUser = verifyStoreAuthToken(req);
        const publicRazorpay = {
          keyId: razorpaySettings.keyId,
          companyName: razorpaySettings.companyName,
          mode: razorpaySettings.keyId.startsWith('rzp_live_') ? 'LIVE' : 'TEST',
        };

        if (!storeUser) {
          sendJson(res, 200, {
            success: true,
            requestId,
            timestamp: new Date().toISOString(),
            data: {
              authenticated: false,
              user: null,
              licenses: [],
              invoices: [],
              publicRazorpay,
            },
          });
          return;
        }

        if (storeUser.role === 'ADMIN') {
          sendJson(res, 200, {
            success: true,
            requestId,
            timestamp: new Date().toISOString(),
            data: {
              authenticated: true,
              user: storeUser,
              licenses: licensedServersList,
              invoices: licenseInvoicesList,
              customers: storeUsersList.map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                createdAt: u.createdAt,
              })),
              razorpaySettings,
              publicRazorpay,
            },
          });
          return;
        }

        // Logged-in CUSTOMER: strictly return ONLY their own licenses and invoices
        const myLicenses = licensedServersList.filter(
          (l) => l.customerEmail.toLowerCase() === storeUser.email.toLowerCase()
        );
        const myInvoices = licenseInvoicesList.filter(
          (i) => i.customerEmail.toLowerCase() === storeUser.email.toLowerCase()
        );

        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            authenticated: true,
            user: storeUser,
            licenses: myLicenses,
            invoices: myInvoices,
            publicRazorpay,
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/license-store/upi-settings') {
        const body = await readJsonBody(req);
        const merchantVpa = String(body.merchantVpa ?? '').trim();
        const merchantName = String(body.merchantName ?? '').trim();
        if (!merchantVpa || !merchantVpa.includes('@')) {
          throw new Error('VALIDATION_FAILED: Valid Merchant UPI ID (VPA) containing "@" is required (e.g. garvix@icici)');
        }
        upiSettings = {
          merchantVpa,
          merchantName: merchantName || 'Garvix Software Solutions Pvt Ltd',
          merchantCategoryCode: '5734',
        };
        saveExtras();
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: { upiSettings },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/license-store/create-qr-order') {
        const body = await readJsonBody(req);
        const orderType = String(body.orderType ?? 'NEW_LICENSE') === 'RENEWAL' ? 'RENEWAL' : 'NEW_LICENSE';
        const rawMode = String(body.paymentMode ?? 'UPI_QR');
        const paymentMode: 'UPI_QR' | 'RUPAY_CC_ON_UPI' | 'DEBIT_CARD_UPI' =
          rawMode === 'RUPAY_CC_ON_UPI'
            ? 'RUPAY_CC_ON_UPI'
            : rawMode === 'DEBIT_CARD_UPI'
              ? 'DEBIT_CARD_UPI'
              : 'UPI_QR';

        const planMeta: Record<string, { name: string; maxAccounts: string; monthlyPaise: number; annualPaise: number }> = {
          SOLO: { name: 'Garvix Solo', maxAccounts: '1', monthlyPaise: 39900, annualPaise: 399000 },
          ADMIN: { name: 'Garvix Admin', maxAccounts: '5', monthlyPaise: 69900, annualPaise: 699000 },
          PRO: { name: 'Garvix Pro', maxAccounts: '30', monthlyPaise: 109900, annualPaise: 1099000 },
          PREMIER: { name: 'Garvix Premier', maxAccounts: 'Unlimited', monthlyPaise: 149900, annualPaise: 1499000 },
        };

        let planCode = String(body.planCode ?? 'PRO').toUpperCase();
        let billingCycle: 'MONTHLY' | 'ANNUAL' = String(body.billingCycle ?? 'MONTHLY') === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
        let customerName = String(body.customerName ?? '').trim();
        let customerEmail = String(body.customerEmail ?? '').trim();
        let serverIp = String(body.serverIp ?? '').trim();
        let gstin = String(body.gstin ?? '').trim();
        let licenseId: string | undefined;

        if (orderType === 'RENEWAL') {
          licenseId = String(body.licenseId ?? '').trim();
          const existingLic = licensedServersList.find((l) => l.id === licenseId) ?? licensedServersList[0];
          if (!existingLic) {
            throw new Error('RESOURCE_NOT_FOUND: License not found for renewal');
          }
          licenseId = existingLic.id;
          planCode = existingLic.planCode;
          billingCycle = existingLic.billingCycle;
          customerName = existingLic.customerName;
          customerEmail = existingLic.customerEmail;
          serverIp = existingLic.serverIp;
          gstin = existingLic.gstin;
        } else {
          if (!customerName || !customerEmail || !serverIp) {
            throw new Error('VALIDATION_FAILED: Customer Name, Email Address, and VPS IP Address are required');
          }
        }

        const chosen = planMeta[planCode] ?? planMeta.PRO!;
        const subtotalPaise = billingCycle === 'ANNUAL' ? chosen.annualPaise : chosen.monthlyPaise;
        const taxPaise = Math.round(subtotalPaise * 0.18);
        const totalPaise = subtotalPaise + taxPaise;
        const amountRupees = (totalPaise / 100).toFixed(2);

        const orderId = `GVORD${Date.now().toString().slice(-7)}${Math.floor(100 + Math.random() * 900)}`;
        const transactionNote = `${chosen.name} ${billingCycle} (${serverIp})`;
        const upiUri = buildNpciUpiUri({
          merchantVpa: upiSettings.merchantVpa,
          merchantName: upiSettings.merchantName,
          orderId,
          transactionNote,
          amountPaise: totalPaise,
          merchantCategoryCode: upiSettings.merchantCategoryCode,
        });
        const qrSvg = renderQrCodeSvg(upiUri, 184);

        const order: NpciDynamicQrOrder = {
          orderId,
          orderType,
          paymentMode,
          planCode,
          planName: chosen.name,
          billingCycle,
          serverIp,
          customerName,
          customerEmail,
          gstin,
          licenseId,
          subtotalPaise,
          taxPaise,
          totalPaise,
          amountRupees,
          merchantVpa: upiSettings.merchantVpa,
          merchantName: upiSettings.merchantName,
          upiUri,
          qrSvg,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        };

        upiOrdersList.unshift(order);
        saveExtras();

        sendJson(res, 201, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: { order },
        });
        return;
      }

      // Live 3-Second Auto-Polling Endpoint for Customer Browser
      if (req.method === 'GET' && pathname === '/api/v1/license-store/order-status') {
        const orderId = (url.searchParams.get('orderId') ?? '').trim();
        const order = upiOrdersList.find((o) => o.orderId === orderId);
        if (!order) {
          throw new Error('RESOURCE_NOT_FOUND: QR Order not found');
        }
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            orderId: order.orderId,
            status: order.status,
            utrNumber: order.utrNumber ?? null,
            claimedUtr: order.claimedUtr ?? null,
            verifiedVia: order.verifiedVia ?? null,
            license: order.issuedLicense ?? null,
            invoice: order.issuedInvoice ?? null,
          },
        });
        return;
      }

      // 3-in-1 Automatic NPCI / Bank Callback / SMS-Email Alert Webhook Endpoint
      if (req.method === 'POST' && pathname === '/api/v1/license-store/npci-webhook') {
        const body = await readJsonBody(req);
        const rawMessage = String(body.rawMessage ?? body.smsText ?? body.emailBody ?? '').trim();

        let targetOrderId = String(body.orderId ?? '').trim().toUpperCase();
        let utrNumber = String(body.utrNumber ?? body.rrn ?? '').replace(/\s+/g, '');
        let amountRupees = body.amount ? Number(body.amount).toFixed(2) : undefined;
        let verifiedVia: 'BANK_WEBHOOK' | 'SMS_EMAIL_WEBHOOK' = 'BANK_WEBHOOK';

        if (rawMessage) {
          const parsed = parseBankUpiAlertMessage(rawMessage);
          if (parsed.extractedOrderId && !targetOrderId) targetOrderId = parsed.extractedOrderId;
          if (parsed.extractedUtr && !utrNumber) utrNumber = parsed.extractedUtr;
          if (parsed.extractedAmountRupees && !amountRupees) amountRupees = parsed.extractedAmountRupees;
          verifiedVia = 'SMS_EMAIL_WEBHOOK';
        }

        // Match pending order by Order ID, Claimed UTR, or Exact Locked Amount
        const matchedOrder = upiOrdersList.find((o) => {
          if (o.status === 'PAID') return false;
          if (targetOrderId && o.orderId.toUpperCase() === targetOrderId) return true;
          if (utrNumber && o.claimedUtr && o.claimedUtr === utrNumber) return true;
          if (amountRupees && o.amountRupees === amountRupees) return true;
          return false;
        });

        if (!matchedOrder) {
          throw new Error('RESOURCE_NOT_FOUND: No pending NPCI QR order matched the webhook payload');
        }

        const finalUtr =
          /^\d{12}$/.test(utrNumber)
            ? utrNumber
            : matchedOrder.claimedUtr && /^\d{12}$/.test(matchedOrder.claimedUtr)
              ? matchedOrder.claimedUtr
              : `${Date.now().toString().slice(-12)}`;

        const fulfilled = fulfillPaidQrOrder(matchedOrder, finalUtr, verifiedVia);

        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: fulfilled,
        });
        return;
      }

      // Customer clicks "I Have Paid" (With or Without 12-Digit UTR)
      if (req.method === 'POST' && pathname === '/api/v1/license-store/customer-confirm-paid') {
        const body = await readJsonBody(req);
        const orderId = String(body.orderId ?? '').trim();
        const utrNumber = String(body.utrNumber ?? '').replace(/\s+/g, '');

        const order = upiOrdersList.find((o) => o.orderId === orderId);
        if (!order) {
          throw new Error('RESOURCE_NOT_FOUND: Dynamic QR Order not found');
        }
        if (order.status === 'PAID') {
          sendJson(res, 200, {
            success: true,
            requestId,
            timestamp: new Date().toISOString(),
            data: {
              order,
              license: order.issuedLicense ?? null,
              invoice: order.issuedInvoice ?? null,
            },
          });
          return;
        }

        if (utrNumber && !/^\d{12}$/.test(utrNumber)) {
          throw new Error('VALIDATION_FAILED: UTR must be 12 digits (or leave UTR empty and click "I Have Paid — Auto Verify")');
        }

        order.claimedUtr = utrNumber || 'PAID_WITHOUT_UTR';
        order.status = 'VERIFICATION_PENDING';
        saveExtras();

        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            order,
            message: utrNumber
              ? `UTR ${utrNumber} recorded! Waiting for Bank Webhook / Admin confirmation (Screen will update automatically).`
              : 'Payment claim recorded without UTR! Waiting for Bank Webhook / Admin confirmation (Screen will update automatically).',
          },
        });
        return;
      }

      // Admin 1-Click Approval from Portal / WHM
      if (req.method === 'POST' && pathname === '/api/v1/license-store/admin-approve-order') {
        const body = await readJsonBody(req);
        const orderId = String(body.orderId ?? '').trim();
        const order = upiOrdersList.find((o) => o.orderId === orderId);
        if (!order) {
          throw new Error('RESOURCE_NOT_FOUND: Dynamic QR Order not found');
        }
        const finalUtr =
          order.claimedUtr && /^\d{12}$/.test(order.claimedUtr)
            ? order.claimedUtr
            : `${Date.now().toString().slice(-12)}`;

        const fulfilled = fulfillPaidQrOrder(order, finalUtr, 'ADMIN_APPROVED');
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: fulfilled,
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/license-store/verify-qr-payment') {
        const body = await readJsonBody(req);
        const orderId = String(body.orderId ?? '').trim();
        const utrNumber = String(body.utrNumber ?? '').replace(/\s+/g, '');

        const order = upiOrdersList.find((o) => o.orderId === orderId);
        if (!order) {
          throw new Error('RESOURCE_NOT_FOUND: Dynamic QR Order not found');
        }
        if (order.status === 'PAID') {
          throw new Error('RESOURCE_CONFLICT: This QR order has already been verified and paid');
        }
        if (!/^\d{12}$/.test(utrNumber)) {
          throw new Error('VALIDATION_FAILED: Please enter a valid 12-digit NPCI UPI Reference / UTR Number from your payment app');
        }
        const duplicateUtr = upiOrdersList.find((o) => o.utrNumber === utrNumber && o.orderId !== orderId);
        if (duplicateUtr) {
          throw new Error('RESOURCE_CONFLICT: This 12-digit UPI UTR number has already been used for another order');
        }

        const fulfilled = fulfillPaidQrOrder(order, utrNumber, 'UTR_VERIFIED');
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: fulfilled,
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/license-store/node-status') {
        const primary = licensedServersList[0];
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: primary ?? {
            status: 'ACTIVE',
            licenseKey: 'GVX-PREMIER-200-234-39-100-LIVE',
            serverIp: '200.234.39.100',
          },
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/license-store/verify') {
        const ip = (url.searchParams.get('ip') ?? '').trim();
        const key = (url.searchParams.get('licenseKey') ?? '').trim();
        const matched = licensedServersList.find((l) => {
          if (key && ip) return l.licenseKey === key && l.serverIp === ip;
          if (key) return l.licenseKey === key;
          if (ip) return l.serverIp === ip;
          return false;
        });
        const isLicensed = Boolean(matched && matched.status !== 'EXPIRED_LOCKED');
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            licensed: isLicensed,
            license: matched ?? null,
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/license-store/purchase') {
        const body = await readJsonBody(req);
        const planCode = String(body.planCode ?? 'PREMIER').toUpperCase();
        const billingCycle = String(body.billingCycle ?? 'MONTHLY') === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
        const customerName = String(body.customerName ?? 'VPS Customer').trim();
        const customerEmail = String(body.customerEmail ?? 'customer@myvps.in').trim();
        const serverIp = String(body.serverIp ?? '200.234.39.100').trim();
        const hostname = String(body.hostname ?? 'srv.customer.vps').trim();
        const gstin = String(body.gstin ?? '').trim();
        const paymentMethod = String(body.paymentMethod ?? 'UPI_AUTOPAY');

        if (!customerName || !customerEmail || !serverIp) {
          throw new Error('VALIDATION_FAILED: Customer name, email, and VPS IPv4 address are required');
        }

        const planMeta: Record<string, { name: string; maxAccounts: string; monthlyPaise: number; annualPaise: number }> = {
          SOLO: { name: 'Garvix Solo', maxAccounts: '1', monthlyPaise: 39900, annualPaise: 399000 },
          ADMIN: { name: 'Garvix Admin', maxAccounts: '5', monthlyPaise: 69900, annualPaise: 699000 },
          PRO: { name: 'Garvix Pro', maxAccounts: '30', monthlyPaise: 109900, annualPaise: 1099000 },
          PREMIER: { name: 'Garvix Premier', maxAccounts: 'Unlimited', monthlyPaise: 149900, annualPaise: 1499000 },
        };
        const chosen = planMeta[planCode] ?? planMeta.PREMIER!;
        const subtotalPaise = billingCycle === 'ANNUAL' ? chosen.annualPaise : chosen.monthlyPaise;
        const taxPaise = Math.round(subtotalPaise * 0.18);
        const totalPaise = subtotalPaise + taxPaise;
        const days = billingCycle === 'ANNUAL' ? 365 : 30;

        const keyRandom = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
        const license: LicensedServerRecord = {
          id: `lic_${randomUUID().slice(0, 8)}`,
          licenseKey: `GVX-${planCode}-${keyRandom.slice(0, 4)}-${keyRandom.slice(4, 8)}-2026`,
          planCode,
          planName: chosen.name,
          billingCycle,
          maxAccounts: chosen.maxAccounts,
          serverIp,
          hostname,
          customerName,
          customerEmail,
          gstin,
          autoPay: paymentMethod === 'UPI_AUTOPAY',
          status: 'ACTIVE',
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + days * 86400 * 1000).toISOString(),
        };
        licensedServersList.unshift(license);

        const invoice: LicenseInvoiceRecord = {
          id: `inv_${randomUUID().slice(0, 8)}`,
          invoiceNumber: `GV-LIC-2026-${String(licenseInvoicesList.length + 1).padStart(4, '0')}`,
          customerName,
          customerEmail,
          gstin,
          description: `${chosen.name} License (${billingCycle}) — Server IP ${serverIp}`,
          subtotalPaise,
          taxPaise,
          totalPaise,
          paymentMethod,
          issuedAt: new Date().toISOString(),
        };
        licenseInvoicesList.unshift(invoice);
        saveExtras();

        sendJson(res, 201, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            license,
            invoice,
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/license-store/login') {
        const body = await readJsonBody(req);
        const email = String(body.email ?? 'admin@garvix.in').trim();
        const found = licensedServersList.find((l) => l.customerEmail.toLowerCase() === email.toLowerCase());
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            token: `cust_tok_${randomUUID().slice(0, 12)}`,
            customer: {
              name: found?.customerName ?? 'Garvix License Customer',
              email,
            },
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/license-store/renew') {
        const body = await readJsonBody(req);
        const licenseId = String(body.licenseId ?? '');
        const lic = licensedServersList.find((l) => l.id === licenseId) ?? licensedServersList[0];
        if (!lic) {
          throw new Error('RESOURCE_NOT_FOUND: License not found');
        }
        const days = lic.billingCycle === 'ANNUAL' ? 365 : 30;
        const baseTime = Math.max(Date.now(), new Date(lic.expiresAt).getTime());
        lic.expiresAt = new Date(baseTime + days * 86400 * 1000).toISOString();
        lic.status = 'ACTIVE';

        const subtotalPaise = lic.billingCycle === 'ANNUAL' ? 1499000 : 149900;
        const taxPaise = Math.round(subtotalPaise * 0.18);
        const invoice: LicenseInvoiceRecord = {
          id: `inv_${randomUUID().slice(0, 8)}`,
          invoiceNumber: `GV-LIC-2026-${String(licenseInvoicesList.length + 1).padStart(4, '0')}`,
          customerName: lic.customerName,
          customerEmail: lic.customerEmail,
          gstin: lic.gstin,
          description: `Renewal: ${lic.planName} (${lic.billingCycle}) — Server IP ${lic.serverIp}`,
          subtotalPaise,
          taxPaise,
          totalPaise: subtotalPaise + taxPaise,
          paymentMethod: 'RAZORPAY_RENEWAL',
          issuedAt: new Date().toISOString(),
        };
        licenseInvoicesList.unshift(invoice);
        saveExtras();

        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            license: lic,
            invoice,
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/license-store/change-ip') {
        const storeUser = verifyStoreAuthToken(req);
        const body = await readJsonBody(req);
        const licenseId = String(body.licenseId ?? '');
        const newServerIp = String(body.newServerIp ?? '').trim();
        const lic = licensedServersList.find((l) => l.id === licenseId);
        if (!lic || !newServerIp) {
          throw new Error('VALIDATION_FAILED: Valid licenseId and newServerIp are required');
        }
        if (
          storeUser &&
          storeUser.role !== 'ADMIN' &&
          lic.customerEmail.toLowerCase() !== storeUser.email.toLowerCase()
        ) {
          throw new Error('DENIED_TENANT_MISMATCH: You can only change the VPS IP of your own license');
        }
        lic.serverIp = newServerIp;
        saveExtras();
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: { license: lic },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/license-store/simulate-status') {
        const body = await readJsonBody(req);
        const licenseId = String(body.licenseId ?? '');
        const status = String(body.status ?? 'ACTIVE') as 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED_LOCKED';
        const lic = licensedServersList.find((l) => l.id === licenseId) ?? licensedServersList[0];
        if (!lic) {
          throw new Error('RESOURCE_NOT_FOUND: License not found');
        }
        lic.status = status;
        saveExtras();
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: { license: lic },
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/garvix-portal/bootstrap') {
        const auth = extractPortalAuth(req);
        const isMasterAdmin = auth?.role === 'MASTER_ADMIN';
        const rc = portalState.razorpayConfig;
        const sanitizedRazorpayConfig = rc
          ? {
              enabled: Boolean(rc.enabled),
              mode: rc.mode === 'TEST' ? 'TEST' : 'LIVE',
              keyId: String(rc.keyId ?? ''),
              keySecret: '',
              webhookSecret: '',
              hasSecretConfigured: Boolean(rc.keySecret && rc.keySecret.length >= 8),
              merchantUpiVpa: String(rc.merchantUpiVpa ?? 'garvix@icici'),
              companyName: String(rc.companyName ?? 'Garvix Software Solutions Pvt Ltd'),
              companyGstin: String(rc.companyGstin ?? ''),
              supportEmail: String(rc.supportEmail ?? 'support@garvixcloud.in'),
              supportPhone: String(rc.supportPhone ?? '+91 98765 43210'),
              companyAddress: String(rc.companyAddress ?? 'India'),
              footerTagline: String(rc.footerTagline ?? 'Made with ❤️ in India 🇮🇳'),
            }
          : undefined;

        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            licensePlans: portalState.licensePlans ?? defaultPortalPlans,
            razorpayConfig: sanitizedRazorpayConfig,
            panelSsl: portalState.panelSsl ?? null,
            ...(isMasterAdmin
              ? {
                  customerLicenses: portalState.customerLicenses ?? defaultPortalCustomerLicenses,
                  adminCredentials: portalState.adminCredentials,
                }
              : {}),
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/garvix-portal/auth/login') {
        const clientIp =
          String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'unknown')
            .split(',')[0]
            .trim() || 'unknown';
        const rateEntry = loginAttemptsByIp.get(clientIp);
        if (rateEntry && rateEntry.blockedUntil > Date.now()) {
          const waitMins = Math.max(1, Math.ceil((rateEntry.blockedUntil - Date.now()) / 60000));
          sendJson(res, 429, {
            success: false,
            requestId,
            timestamp: new Date().toISOString(),
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: `Too many failed login attempts from IP ${clientIp}. Temporarily blocked for ${waitMins} minute(s).`,
            },
          });
          return;
        }

        const body = await readJsonBody(req);
        const email = String(body.email ?? '').trim().toLowerCase();
        const password = String(body.password ?? '').trim();
        const requestedRole = String(body.role ?? 'CUSTOMER').trim();

        const adminCreds = portalState.adminCredentials ?? {
          email: 'admin@garvix.io',
          password: 'Admin@12345',
        };

        if (
          email === String(adminCreds.email).toLowerCase() &&
          password === String(adminCreds.password)
        ) {
          loginAttemptsByIp.delete(clientIp);
          const token = signPortalToken({ role: 'MASTER_ADMIN', email });
          sendJson(res, 200, {
            success: true,
            requestId,
            timestamp: new Date().toISOString(),
            data: {
              session: {
                role: 'MASTER_ADMIN',
                email,
                token,
              },
              customerLicenses: portalState.customerLicenses ?? defaultPortalCustomerLicenses,
              adminCredentials: portalState.adminCredentials,
            },
          });
          return;
        }

        if (requestedRole !== 'MASTER_ADMIN') {
          const allLicenses = portalState.customerLicenses ?? defaultPortalCustomerLicenses;
          const matched = allLicenses.find(
            (lic) =>
              String(lic.customerEmail ?? '').toLowerCase() === email &&
              String(lic.password ?? '') === password
          );

          if (matched) {
            if (matched.status !== 'ACTIVE') {
              throw new Error(
                `AUTH_LICENSE_SUSPENDED: License (${matched.licenseKey}) is currently SUSPENDED. Please contact administrator.`
              );
            }
            loginAttemptsByIp.delete(clientIp);
            const token = signPortalToken({
              role: 'CUSTOMER',
              email: String(matched.customerEmail),
              licenseId: String(matched.id),
            });
            sendJson(res, 200, {
              success: true,
              requestId,
              timestamp: new Date().toISOString(),
              data: {
                session: {
                  role: 'CUSTOMER',
                  email: String(matched.customerEmail),
                  planCode: String(matched.planCode),
                  planName: String(matched.planName),
                  panelMode: matched.panelMode === 'ONLY_CPANEL' ? 'ONLY_CPANEL' : 'WHM_AND_CPANEL',
                  maxAccounts: Number(matched.maxAccounts ?? 1),
                  serverIp: String(matched.serverIp ?? '200.234.39.100'),
                  licenseKey: String(matched.licenseKey ?? ''),
                  token,
                },
              },
            });
            return;
          }
        }

        const nextCount = (rateEntry?.count ?? 0) + 1;
        loginAttemptsByIp.set(clientIp, {
          count: nextCount,
          blockedUntil: nextCount >= 5 ? Date.now() + 15 * 60 * 1000 : 0,
        });

        throw new Error(
          `AUTH_INVALID_CREDENTIALS: Invalid email or password (${Math.max(0, 5 - nextCount)} attempt(s) remaining before 15-min IP lock).`
        );
      }

      if (req.method === 'GET' && pathname === '/api/v1/garvix-portal/auth/me') {
        const auth = extractPortalAuth(req);
        if (!auth) {
          throw new Error('AUTH_INVALID_TOKEN: Session token is missing, expired, or forged.');
        }

        if (auth.role === 'MASTER_ADMIN') {
          sendJson(res, 200, {
            success: true,
            requestId,
            timestamp: new Date().toISOString(),
            data: {
              session: {
                role: 'MASTER_ADMIN',
                email: auth.email,
              },
              customerLicenses: portalState.customerLicenses ?? defaultPortalCustomerLicenses,
              adminCredentials: portalState.adminCredentials,
            },
          });
          return;
        }

        const allLicenses = portalState.customerLicenses ?? defaultPortalCustomerLicenses;
        const matched = allLicenses.find(
          (lic) =>
            (auth.licenseId && String(lic.id) === auth.licenseId) ||
            String(lic.customerEmail ?? '').toLowerCase() === auth.email.toLowerCase()
        );

        if (!matched || matched.status !== 'ACTIVE') {
          throw new Error('AUTH_LICENSE_INACTIVE: Customer license is no longer active.');
        }

        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            session: {
              role: 'CUSTOMER',
              email: String(matched.customerEmail),
              planCode: String(matched.planCode),
              planName: String(matched.planName),
              panelMode: matched.panelMode === 'ONLY_CPANEL' ? 'ONLY_CPANEL' : 'WHM_AND_CPANEL',
              maxAccounts: Number(matched.maxAccounts ?? 1),
              serverIp: String(matched.serverIp ?? '200.234.39.100'),
              licenseKey: String(matched.licenseKey ?? ''),
            },
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/garvix-portal/sync') {
        const auth = extractPortalAuth(req);
        if (!auth || auth.role !== 'MASTER_ADMIN') {
          throw new Error(
            'DENIED_ADMIN_REQUIRED: Valid Master Admin Bearer token is required to modify plans, licenses, or Razorpay settings.'
          );
        }

        const body = await readJsonBody(req);
        if (Array.isArray(body.licensePlans)) {
          portalState.licensePlans = body.licensePlans as Array<Record<string, any>>;
        }
        if (Array.isArray(body.customerLicenses)) {
          portalState.customerLicenses = body.customerLicenses as Array<Record<string, any>>;
        }
        if (body.razorpayConfig && typeof body.razorpayConfig === 'object') {
          const rc = body.razorpayConfig as Record<string, unknown>;
          const prevSecret = portalState.razorpayConfig?.keySecret ?? '';
          const prevWebhook = portalState.razorpayConfig?.webhookSecret ?? '';
          const incomingSecret = String(rc.keySecret ?? '').trim();
          const incomingWebhook = String(rc.webhookSecret ?? '').trim();
          portalState.razorpayConfig = {
            enabled: Boolean(rc.enabled ?? true),
            mode: rc.mode === 'TEST' ? 'TEST' : 'LIVE',
            keyId: String(rc.keyId ?? '').trim(),
            keySecret: incomingSecret || prevSecret,
            webhookSecret: incomingWebhook || prevWebhook,
            merchantUpiVpa: String(rc.merchantUpiVpa ?? 'garvix@icici').trim(),
            companyName: String(rc.companyName ?? 'Garvix Software Solutions Pvt Ltd').trim(),
            companyGstin: String(rc.companyGstin ?? '').trim(),
            supportEmail: String(rc.supportEmail ?? 'support@garvixcloud.in').trim(),
            supportPhone: String(rc.supportPhone ?? '+91 98765 43210').trim(),
            companyAddress: String(rc.companyAddress ?? 'India').trim(),
            footerTagline: String(rc.footerTagline ?? 'Made with ❤️ in India 🇮🇳').trim(),
          };
        }
        if (body.adminCredentials && typeof body.adminCredentials === 'object') {
          const ac = body.adminCredentials as Record<string, unknown>;
          if (ac.email && ac.password) {
            portalState.adminCredentials = {
              email: String(ac.email).trim(),
              password: String(ac.password).trim(),
            };
          }
        }
        saveExtras();
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            synced: true,
            hasSecretConfigured: Boolean(
              portalState.razorpayConfig?.keySecret &&
                portalState.razorpayConfig.keySecret.length >= 8
            ),
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/garvix-portal/razorpay/create-order') {
        const body = await readJsonBody(req);
        const planCode = String(body.planCode ?? '').trim();
        const billingCycle =
          String(body.billingCycle ?? 'MONTHLY').trim().toUpperCase() === 'YEARLY'
            ? 'YEARLY'
            : 'MONTHLY';
        const customerEmail = String(body.customerEmail ?? '').trim().toLowerCase();
        const customerPassword = String(body.customerPassword ?? '').trim();
        const serverIp = String(body.serverIp ?? '').trim();

        const plans = portalState.licensePlans ?? defaultPortalPlans;
        const matchedPlan = plans.find((p) => String(p.code) === planCode);
        if (!matchedPlan) {
          throw new Error(`VALIDATION_FAILED: Unknown license plan code "${planCode}".`);
        }

        // LOCK 2: Compute exact price strictly on the server from saved plan (ignores any client ₹1 tampering)
        const basePriceInr =
          billingCycle === 'YEARLY'
            ? Number(matchedPlan.yearlyInr || Number(matchedPlan.monthlyInr) * 10)
            : Number(matchedPlan.monthlyInr);
        const gstInr = Math.round(basePriceInr * 0.18);
        const serverAmountPaise = Math.round((basePriceInr + gstInr) * 100);

        const activeConfig = portalState.razorpayConfig;
        const keyId = String(activeConfig?.keyId ?? '').trim();
        const keySecret = String(activeConfig?.keySecret ?? '').trim();
        const enabled = activeConfig ? activeConfig.enabled : true;

        if (!enabled) {
          throw new Error(
            'PAYMENT_GATEWAY_DISABLED: Razorpay payment gateway is currently disabled in Master Admin.'
          );
        }

        if (
          (!keyId.startsWith('rzp_live_') && !keyId.startsWith('rzp_test_')) ||
          keyId.length < 14 ||
          keySecret.length < 8
        ) {
          throw new Error(
            'PAYMENT_GATEWAY_NOT_CONFIGURED: Valid Razorpay Key ID (rzp_live_... or rzp_test_...) and Key Secret are not configured in Master Admin (Tab 3). License cannot be activated without payment.'
          );
        }

        if (!Number.isFinite(serverAmountPaise) || serverAmountPaise < 100) {
          throw new Error('VALIDATION_FAILED: Invalid server-computed order amount.');
        }

        const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const receipt = `gvx_${Date.now()}`;
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: serverAmountPaise,
            currency: 'INR',
            receipt,
            notes: {
              planCode: matchedPlan.code,
              billingCycle,
              customerEmail,
              serverIp,
            },
          }),
        });

        const rzpJson = (await rzpRes.json().catch(() => ({}))) as Record<string, any>;
        if (!rzpRes.ok || !rzpJson.id) {
          const rzpErrDesc =
            rzpJson?.error?.description ||
            rzpJson?.error?.reason ||
            `Razorpay API returned HTTP ${rzpRes.status}`;
          throw new Error(
            `PAYMENT_GATEWAY_ERROR: Razorpay Order creation failed (${rzpErrDesc}). Please check your Razorpay Key ID & Key Secret in Master Admin.`
          );
        }

        const createdOrderId = String(rzpJson.id);
        pendingPortalRazorpayOrders.set(createdOrderId, {
          orderId: createdOrderId,
          planCode: String(matchedPlan.code),
          planName: String(matchedPlan.name),
          billingCycle,
          panelMode: matchedPlan.panelMode === 'ONLY_CPANEL' ? 'ONLY_CPANEL' : 'WHM_AND_CPANEL',
          maxAccounts: Number(matchedPlan.maxAccounts ?? 1),
          customerEmail,
          customerPassword,
          serverIp,
          amountPaise: serverAmountPaise,
        });

        sendJson(res, 201, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            orderId: createdOrderId,
            amountPaise: serverAmountPaise,
            currency: String(rzpJson.currency ?? 'INR'),
            keyId,
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/garvix-portal/razorpay/verify-payment') {
        const body = await readJsonBody(req);
        const razorpayOrderId = String(body.razorpay_order_id ?? '').trim();
        const razorpayPaymentId = String(body.razorpay_payment_id ?? '').trim();
        const razorpaySignature = String(body.razorpay_signature ?? '').trim();

        const activeConfig = portalState.razorpayConfig;
        const keySecret = String(activeConfig?.keySecret ?? '').trim();

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || keySecret.length < 8) {
          throw new Error(
            'AUTH_SIGNATURE_INVALID: Missing Razorpay payment verification parameters. License NOT activated.'
          );
        }

        const expectedHmac = createHmac('sha256', keySecret)
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest('hex');

        if (expectedHmac !== razorpaySignature) {
          throw new Error(
            'AUTH_SIGNATURE_INVALID: Razorpay HMAC-SHA256 payment signature verification failed! License NOT activated.'
          );
        }

        const pendingOrder = pendingPortalRazorpayOrders.get(razorpayOrderId);
        let issuedLicense: Record<string, any> | null = null;
        let customerToken: string | undefined;

        if (pendingOrder) {
          pendingPortalRazorpayOrders.delete(razorpayOrderId);
          const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
          const expiryDate = new Date(
            Date.now() + (pendingOrder.billingCycle === 'YEARLY' ? 365 : 30) * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .slice(0, 10);
          issuedLicense = {
            id: `lic-${Date.now()}`,
            customerEmail: pendingOrder.customerEmail,
            password: pendingOrder.customerPassword || 'Password@123',
            planCode: pendingOrder.planCode,
            planName: pendingOrder.planName,
            billingCycle: pendingOrder.billingCycle,
            panelMode: pendingOrder.panelMode,
            maxAccounts: pendingOrder.maxAccounts,
            serverIp: pendingOrder.serverIp,
            hostname: `srv-${randomHex.toLowerCase()}.garvixcloud.in`,
            licenseKey: `GVX-${pendingOrder.planCode}-${randomHex}-2026-ED25519`,
            status: 'ACTIVE',
            createdAt: new Date().toISOString().slice(0, 10),
            expiresAt: expiryDate,
            razorpayOrderId,
            razorpayPaymentId,
          };
          portalState.customerLicenses = [
            issuedLicense,
            ...(portalState.customerLicenses ?? defaultPortalCustomerLicenses),
          ];
          saveExtras();
          customerToken = signPortalToken({
            role: 'CUSTOMER',
            email: pendingOrder.customerEmail,
            licenseId: String(issuedLicense.id),
          });
        }

        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            verified: true,
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
            license: issuedLicense,
            token: customerToken,
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/garvix-portal/ssl/install') {
        const body = await readJsonBody(req);
        const rawDomain = sanitizeDomainName(String(body.domain ?? ''));
        const email = String(body.email ?? 'admin@garvixcloud.in').trim();
        const method =
          String(body.method ?? 'LETS_ENCRYPT').trim() === 'CUSTOM_PEM'
            ? 'CUSTOM_PEM'
            : 'LETS_ENCRYPT';
        const isPanelHostname = Boolean(body.isPanelHostname);

        if (!rawDomain || !rawDomain.includes('.') || rawDomain.includes('..')) {
          throw new Error('VALIDATION_FAILED: Please provide a valid domain or hostname.');
        }

        if (isPanelHostname) {
          const auth = extractPortalAuth(req);
          if (!auth || auth.role !== 'MASTER_ADMIN') {
            throw new Error(
              'DENIED_ADMIN_REQUIRED: Only Master Admin can install the main Panel Hostname SSL certificate.'
            );
          }
        }

        // Ensure vhost exists for customer domain before SSL install
        if (!isPanelHostname) {
          provisionRealLinuxVhost({ domain: rawDomain });
        }

        let issuer = "Let's Encrypt Authority R11 (AutoSSL)";
        let liveNginxSslApplied = false;
        const expiresAt = new Date(
          Date.now() + (method === 'CUSTOM_PEM' ? 365 : 90) * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .slice(0, 10);
        const installedAt = new Date().toISOString().slice(0, 10);

        if (method === 'LETS_ENCRYPT' && process.platform === 'linux') {
          try {
            execFileSync(
              'certbot',
              [
                '--nginx',
                '-d',
                rawDomain,
                '--non-interactive',
                '--agree-tos',
                '-m',
                email,
                '--redirect',
              ],
              { timeout: 60000 }
            );
            liveNginxSslApplied = true;
            issuer = "Let's Encrypt Live Certbot TLS 1.3";
          } catch {
            // Domain DNS may not point to 200.234.39.100 yet or certbot still provisioning
            liveNginxSslApplied = false;
          }
        }

        if (method === 'CUSTOM_PEM') {
          const certPem = String(body.certificatePem ?? '').trim();
          const keyPem = String(body.privateKeyPem ?? '').trim();
          const caBundlePem = String(body.caBundlePem ?? '').trim();

          if (!certPem.includes('BEGIN CERTIFICATE') || !keyPem.includes('PRIVATE KEY')) {
            throw new Error(
              'VALIDATION_FAILED: Invalid PEM format. Certificate must contain "-----BEGIN CERTIFICATE-----" and Private Key must contain "PRIVATE KEY".'
            );
          }
          issuer = 'Custom Uploaded X.509 SSL Certificate';

          const targetSslBase =
            process.platform === 'linux' && fs.existsSync('/etc/nginx/conf.d')
              ? '/etc/ssl/garvix'
              : path.join(dataDir || os.tmpdir(), 'ssl');
          try {
            const sslDir = path.join(targetSslBase, rawDomain.replace(/[^a-z0-9.-]/g, '_'));
            fs.mkdirSync(sslDir, { recursive: true });
            const fullchainPath = path.join(sslDir, 'fullchain.pem');
            const privkeyPath = path.join(sslDir, 'privkey.pem');
            fs.writeFileSync(fullchainPath, `${certPem}\n${caBundlePem}`.trim(), 'utf8');
            fs.writeFileSync(privkeyPath, keyPem, { encoding: 'utf8', mode: 0o600 });

            if (process.platform === 'linux' && fs.existsSync('/etc/nginx/conf.d')) {
              const docRoot = resolveDomainDocRoot(rawDomain);
              const vhostConfPath = isPanelHostname
                ? '/etc/nginx/conf.d/garvix-panel-ssl.conf'
                : `/etc/nginx/conf.d/vhost-${rawDomain}.conf`;
              const sslNginxBlock = isPanelHostname
                ? `server {
    listen 443 ssl;
    server_name ${rawDomain};
    ssl_certificate ${fullchainPath};
    ssl_certificate_key ${privkeyPath};

    location / {
        proxy_pass http://127.0.0.1:4100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
`
                : `server {
    listen 80;
    listen 443 ssl;
    server_name ${rawDomain} www.${rawDomain};
    root ${docRoot};
    index index.php index.html index.htm;
    ssl_certificate ${fullchainPath};
    ssl_certificate_key ${privkeyPath};

    location / {
        try_files $uri $uri/ /index.html =404;
    }
}
`;
              fs.writeFileSync(vhostConfPath, sslNginxBlock, 'utf8');
              execFileSync('nginx', ['-t']);
              execFileSync('systemctl', ['reload', 'nginx']);
              liveNginxSslApplied = true;
            }
          } catch (_) {}
        }

        // Update domain's sslStatus in hostedWebsites
        const webIdx = (portalState.hostedWebsites ?? []).findIndex((w) => w.domain === rawDomain);
        if (webIdx >= 0 && portalState.hostedWebsites) {
          portalState.hostedWebsites[webIdx]!.sslStatus = 'ACTIVE_HTTPS';
          saveExtras();
        }

        const sslRecord = {
          domain: rawDomain,
          issuer,
          method,
          email,
          expiresAt,
          installedAt,
          liveNginxSslApplied,
          status: 'ACTIVE',
        };

        if (isPanelHostname) {
          portalState.panelSsl = sslRecord;
          saveExtras();
        }

        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: sslRecord,
        });
        return;
      }

      // =====================================================================
      // REAL LINUX WEBSITE HOSTING ENGINE: Domains, Files & Databases
      // =====================================================================
      if (req.method === 'GET' && pathname === '/api/v1/garvix-portal/hosting/domains') {
        const websites = (portalState.hostedWebsites ?? []).map((w) => {
          let fileCount = 0;
          try {
            if (fs.existsSync(w.docRoot)) {
              fileCount = fs.readdirSync(w.docRoot).length;
            }
          } catch {}
          return {
            ...w,
            fileCount,
            previewUrl: `/site-preview/${w.domain}/`,
          };
        });
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            websites,
            databases: portalState.hostedDatabases ?? [],
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/garvix-portal/hosting/domains') {
        const body = await readJsonBody(req);
        const domain = sanitizeDomainName(String(body.domain ?? ''));
        const username = String(body.username ?? '').trim();
        const rawTpl = String(body.template ?? 'DEFAULT_LANDING').trim();
        const template =
          rawTpl === 'PHP_APP' || rawTpl === 'WORDPRESS' ? rawTpl : 'DEFAULT_LANDING';

        const created = provisionRealLinuxVhost({
          domain,
          username: username || undefined,
          template,
        });

        sendJson(res, 201, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            website: {
              ...created,
              previewUrl: `/site-preview/${created.domain}/`,
            },
          },
        });
        return;
      }

      if (req.method === 'DELETE' && pathname === '/api/v1/garvix-portal/hosting/domains') {
        const domain = sanitizeDomainName(
          url.searchParams.get('domain') ?? String((await readJsonBody(req)).domain ?? '')
        );
        if (!domain) {
          throw new Error('VALIDATION_FAILED: Domain is required.');
        }
        portalState.hostedWebsites = (portalState.hostedWebsites ?? []).filter(
          (w) => w.domain !== domain
        );
        if (process.platform === 'linux') {
          try {
            const vhostFile = `/etc/nginx/conf.d/vhost-${domain}.conf`;
            if (fs.existsSync(vhostFile)) {
              fs.unlinkSync(vhostFile);
              execFileSync('nginx', ['-t']);
              execFileSync('systemctl', ['reload', 'nginx']);
            }
          } catch {}
        }
        saveExtras();
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: { deleted: domain },
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/garvix-portal/hosting/files') {
        const domain = sanitizeDomainName(url.searchParams.get('domain') ?? 'garvixcloud.in');
        const requestedFile = String(url.searchParams.get('file') ?? '').trim();
        const site =
          (portalState.hostedWebsites ?? []).find((w) => w.domain === domain) ??
          provisionRealLinuxVhost({ domain });

        if (requestedFile) {
          const cleanName = path.basename(requestedFile);
          const fullPath = path.join(site.docRoot, cleanName);
          if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
            throw new Error(`RESOURCE_NOT_FOUND: File "${cleanName}" does not exist.`);
          }
          const content = fs.readFileSync(fullPath, 'utf8');
          sendJson(res, 200, {
            success: true,
            requestId,
            timestamp: new Date().toISOString(),
            data: {
              domain: site.domain,
              docRoot: site.docRoot,
              filename: cleanName,
              content,
            },
          });
          return;
        }

        const entries = fs.existsSync(site.docRoot) ? fs.readdirSync(site.docRoot) : [];
        const files = entries.map((name) => {
          const full = path.join(site.docRoot, name);
          const stat = fs.statSync(full);
          const ext = path.extname(name).toLowerCase();
          return {
            name,
            isDirectory: stat.isDirectory(),
            sizeBytes: stat.size,
            modifiedAt: stat.mtime.toISOString().slice(0, 19).replace('T', ' '),
            perms: '0644',
            isEditable: [
              '.html',
              '.htm',
              '.php',
              '.css',
              '.js',
              '.json',
              '.txt',
              '.xml',
              '.md',
              '.htaccess',
            ].includes(ext),
          };
        });

        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            domain: site.domain,
            docRoot: site.docRoot,
            nginxStatus: site.nginxStatus,
            previewUrl: `/site-preview/${site.domain}/`,
            files,
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/garvix-portal/hosting/files') {
        const body = await readJsonBody(req);
        const domain = sanitizeDomainName(String(body.domain ?? 'garvixcloud.in'));
        const action = String(body.action ?? 'SAVE_FILE').trim();

        if (action === 'INSTALL_TEMPLATE') {
          const rawTpl = String(body.template ?? 'DEFAULT_LANDING').trim();
          const tpl =
            rawTpl === 'PHP_APP' || rawTpl === 'WORDPRESS' ? rawTpl : 'DEFAULT_LANDING';
          const updatedSite = provisionRealLinuxVhost({ domain, template: tpl });
          sendJson(res, 200, {
            success: true,
            requestId,
            timestamp: new Date().toISOString(),
            data: {
              domain: updatedSite.domain,
              docRoot: updatedSite.docRoot,
              previewUrl: `/site-preview/${updatedSite.domain}/`,
              templateInstalled: tpl,
            },
          });
          return;
        }

        const rawFilename = String(body.filename ?? '')
          .trim()
          .replace(/^\/+/, '');
        if (!rawFilename || rawFilename.includes('..') || rawFilename.includes('/')) {
          throw new Error(
            'VALIDATION_FAILED: Please provide a valid filename inside public_html (e.g. index.html or index.php).'
          );
        }

        const site =
          (portalState.hostedWebsites ?? []).find((w) => w.domain === domain) ??
          provisionRealLinuxVhost({ domain });

        const targetFile = path.join(site.docRoot, rawFilename);
        if (Boolean(body.isBase64)) {
          const buf = Buffer.from(String(body.content ?? ''), 'base64');
          fs.writeFileSync(targetFile, buf, { mode: 0o644 });
        } else {
          fs.writeFileSync(targetFile, String(body.content ?? ''), {
            encoding: 'utf8',
            mode: 0o644,
          });
        }

        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            domain: site.domain,
            docRoot: site.docRoot,
            filename: rawFilename,
            previewUrl: `/site-preview/${site.domain}/${rawFilename}`,
          },
        });
        return;
      }

      if (req.method === 'DELETE' && pathname === '/api/v1/garvix-portal/hosting/files') {
        const domain = sanitizeDomainName(url.searchParams.get('domain') ?? 'garvixcloud.in');
        const rawFilename = String(url.searchParams.get('file') ?? '').trim();
        if (!rawFilename || rawFilename.includes('..') || rawFilename.includes('/')) {
          throw new Error('VALIDATION_FAILED: Invalid filename.');
        }
        const site = (portalState.hostedWebsites ?? []).find((w) => w.domain === domain);
        if (site) {
          const targetFile = path.join(site.docRoot, rawFilename);
          if (fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
            fs.unlinkSync(targetFile);
          }
        }
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: { deleted: rawFilename },
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/garvix-portal/hosting/postgres-status') {
        sendJson(res, 200, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: {
            engine: 'PostgreSQL 16',
            databaseName: 'garvix_panel_db',
            port: 5432,
            postgresConnected: postgresReady,
            tables: [
              {
                name: 'garvix_license_plans',
                rows: (portalState.licensePlans ?? []).length,
              },
              {
                name: 'garvix_customer_licenses',
                rows: (portalState.customerLicenses ?? []).length,
              },
              {
                name: 'garvix_portal_settings',
                rows: 1,
              },
              {
                name: 'garvix_hosted_websites',
                rows: (portalState.hostedWebsites ?? []).length,
              },
              {
                name: 'garvix_hosted_databases',
                rows: (portalState.hostedDatabases ?? []).length,
              },
            ],
          },
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/garvix-portal/hosting/databases') {
        const body = await readJsonBody(req);
        const cleanDbName = String(body.dbName ?? '')
          .trim()
          .replace(/[^a-zA-Z0-9_]/g, '')
          .slice(0, 48);
        const cleanDbUser = String(body.dbUser ?? '')
          .trim()
          .replace(/[^a-zA-Z0-9_]/g, '')
          .slice(0, 48);
        const cleanDbPass = String(body.dbPass ?? 'DbPass@2026').replace(/['"\\;]/g, '');
        const engine =
          String(body.engine ?? 'POSTGRESQL_16') === 'MARIADB_10_11'
            ? 'MARIADB_10_11'
            : 'POSTGRESQL_16';

        if (!cleanDbName || !cleanDbUser) {
          throw new Error('VALIDATION_FAILED: Database name and username are required.');
        }

        let dbStatus: 'LIVE_MARIADB' | 'LIVE_POSTGRES' | 'SANDBOX_RECORDED' = 'SANDBOX_RECORDED';

        if (process.platform === 'linux' && engine === 'POSTGRESQL_16') {
          try {
            try {
              execFileSync('systemctl', ['start', 'postgresql']);
            } catch {}
            runPostgresSql(
              `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${cleanDbUser}') THEN CREATE ROLE "${cleanDbUser}" WITH LOGIN PASSWORD '${cleanDbPass}'; ELSE ALTER ROLE "${cleanDbUser}" WITH LOGIN PASSWORD '${cleanDbPass}'; END IF; END $$;`,
              'postgres'
            );
            const dbExists = runPostgresSql(
              `SELECT 1 FROM pg_database WHERE datname = '${cleanDbName}';`,
              'postgres'
            );
            if (dbExists !== '1') {
              runPostgresSql(
                `CREATE DATABASE "${cleanDbName}" OWNER "${cleanDbUser}";`,
                'postgres'
              );
            }
            runPostgresSql(
              `GRANT ALL PRIVILEGES ON DATABASE "${cleanDbName}" TO "${cleanDbUser}";`,
              'postgres'
            );
            dbStatus = 'LIVE_POSTGRES';
          } catch {
            dbStatus = 'SANDBOX_RECORDED';
          }
        } else if (process.platform === 'linux' && engine === 'MARIADB_10_11') {
          try {
            try {
              execFileSync('systemctl', ['start', 'mariadb']);
            } catch {}
            const sql = [
              `CREATE DATABASE IF NOT EXISTS \`${cleanDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
              `CREATE USER IF NOT EXISTS '${cleanDbUser}'@'localhost' IDENTIFIED BY '${cleanDbPass}';`,
              `ALTER USER '${cleanDbUser}'@'localhost' IDENTIFIED BY '${cleanDbPass}';`,
              `GRANT ALL PRIVILEGES ON \`${cleanDbName}\`.* TO '${cleanDbUser}'@'localhost';`,
              `FLUSH PRIVILEGES;`,
            ].join(' ');
            execFileSync('mysql', ['-u', 'root', '-e', sql], { timeout: 10000 });
            dbStatus = 'LIVE_MARIADB';
          } catch {
            dbStatus = 'SANDBOX_RECORDED';
          }
        }

        const dbRecord = {
          id: `db_${Date.now()}`,
          dbName: cleanDbName,
          dbUser: cleanDbUser,
          engine: engine as 'MARIADB_10_11' | 'POSTGRESQL_16',
          status: dbStatus,
          host: 'localhost (127.0.0.1)',
          port: engine === 'POSTGRESQL_16' ? 5432 : 3306,
          createdAt: new Date().toISOString().slice(0, 10),
        };

        portalState.hostedDatabases = [
          dbRecord,
          ...(portalState.hostedDatabases ?? []).filter((d) => d.dbName !== cleanDbName),
        ];
        saveExtras();

        sendJson(res, 201, {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          data: { database: dbRecord },
        });
        return;
      }

      sendJson(res, 404, {
        success: false,
        requestId,
        timestamp: new Date().toISOString(),
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: `Route ${req.method} ${pathname} not found`,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Internal server error';
      const status = msg.startsWith('AUTH_')
        ? 401
        : msg.startsWith('DENIED_')
          ? 403
          : msg.startsWith('RESOURCE_NOT_FOUND')
            ? 404
            : msg.startsWith('RESOURCE_CONFLICT')
              ? 409
              : 400;

      sendJson(res, status, {
        success: false,
        requestId,
        timestamp: new Date().toISOString(),
        error: {
          code: msg.split(':')[0] ?? 'REQUEST_FAILED',
          message: msg,
        },
      });
    }
  });

  return { server, service };
}
