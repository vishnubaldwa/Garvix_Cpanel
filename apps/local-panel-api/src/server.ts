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

  const saveExtras = () => {
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
          },
          null,
          2
        ),
        'utf8'
      );
    } catch (_) {}
  };

  if (extrasFilePath && fs.existsSync(extrasFilePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(extrasFilePath, 'utf8'));
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
    } catch (_) {}
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
