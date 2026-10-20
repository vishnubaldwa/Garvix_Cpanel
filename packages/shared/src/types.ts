export type UserRole = 'SUPER_ADMIN' | 'RESELLER' | 'ACCOUNT_OWNER' | 'DEVELOPER';

export type AccountStatus = 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'DELETING';

export type ServiceName =
  | 'nginx'
  | 'php-fpm-8.3'
  | 'postfix'
  | 'dovecot'
  | 'rspamd'
  | 'mariadb'
  | 'postgresql-16'
  | 'pdns';

export type ServiceAction = 'reload' | 'restart' | 'start' | 'stop';

export interface SystemServiceStatus {
  name: ServiceName;
  displayName: string;
  category: 'WEB' | 'EMAIL' | 'DATABASE' | 'DNS';
  version: string;
  state: 'running' | 'degraded' | 'stopped';
  pid: number | null;
  uptimeSeconds: number;
  memoryMb: number;
  cpuPercent: number;
  port: number;
  configValid: boolean;
}

export interface SystemAlert {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  category: 'RESOURCE' | 'SECURITY' | 'SSL' | 'BACKUP' | 'SERVICE';
  title: string;
  message: string;
  createdAt: string;
  acknowledged: boolean;
}

export interface ServerTelemetry {
  timestamp: string;
  hostname: string;
  osRelease: string;
  kernel: string;
  publicIp: string;
  uptimeSeconds: number;
  cpu: {
    cores: number;
    model: string;
    usagePercent: number;
    loadAvg1m: number;
    loadAvg5m: number;
    loadAvg15m: number;
    perCorePercent: number[];
  };
  memory: {
    totalMb: number;
    usedMb: number;
    cachedMb: number;
    availableMb: number;
    swapTotalMb: number;
    swapUsedMb: number;
  };
  disk: {
    device: string;
    mountPoint: string;
    filesystem: string;
    totalGb: number;
    usedGb: number;
    availableGb: number;
    inodesUsedPercent: number;
    readIops: number;
    writeIops: number;
  };
  bandwidth: {
    interface: string;
    inboundMbps: number;
    outboundMbps: number;
    monthlyTotalGb: number;
    monthlyLimitGb: number;
  };
  services: SystemServiceStatus[];
  alerts: SystemAlert[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  totpEnabled: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
}

export interface HostingPackage {
  id: string;
  name: string;
  diskQuotaMb: number;
  bandwidthQuotaMb: number;
  maxDomains: number | null; // null = unlimited (bounded by hardware capacity)
  maxDatabases: number | null;
  maxEmailAccounts: number | null; // null = unlimited
  cpuQuotaPercent: number; // e.g., 100 = 1 vCPU, 200 = 2 vCPU
  memoryLimitMb: number;
  sshAccessAllowed: boolean;
  createdAt: string;
}

export interface HostingAccount {
  id: string;
  ownerUserId: string;
  ownerEmail: string;
  packageId: string;
  packageName: string;
  linuxUsername: string;
  linuxUid: number;
  homeDirectory: string;
  primaryDomain: string;
  status: AccountStatus;
  diskUsedMb: number;
  diskQuotaMb: number;
  bandwidthUsedMb: number;
  bandwidthQuotaMb: number;
  cpuQuotaPercent: number;
  memoryLimitMb: number;
  sshEnabled: boolean;
  suspendedReason: string | null;
  createdAt: string;
}

export type DomainTemplateType = 'PHP' | 'NODEJS' | 'STATIC' | 'PROXY';

export interface Domain {
  id: string;
  accountId: string;
  linuxUsername: string;
  parentDomainId: string | null; // null = primary/addon apex domain; non-null = subdomain
  domainName: string;
  isSubdomain: boolean;
  documentRoot: string;
  templateType: DomainTemplateType;
  phpVersion: '8.3' | '8.2' | '8.1' | null;
  forceHttps: boolean;
  hstsEnabled: boolean;
  http3Enabled: boolean;
  sslStatus: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'NONE';
  sslExpiresAt: string | null;
  sslIssuer: string | null;
  sslAutoRenew: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'PROVISIONING';
  createdAt: string;
}

export interface SslCertificate {
  id: string;
  accountId: string;
  domainId: string;
  domainName: string;
  provider: 'LETS_ENCRYPT' | 'CUSTOM';
  challengeType: 'HTTP_01' | 'DNS_01';
  sanDomains: string[];
  issuer: string;
  serialNumber: string;
  fingerprintSha256: string;
  certPath: string;
  issuedAt: string;
  expiresAt: string;
  autoRenew: boolean;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'RENEWING';
  lastRenewalAttemptAt: string | null;
  lastRenewalError: string | null;
}

export type AppType = 'PHP' | 'NODEJS' | 'STATIC';
export type ProcessManagerType = 'SYSTEMD' | 'PM2';

export interface ApplicationDeployment {
  id: string;
  accountId: string;
  linuxUsername: string;
  domainId: string;
  domainName: string;
  name: string;
  appType: AppType;
  runtimeVersion: string; // e.g., 'node-22', 'node-20', 'php-8.3', 'php-8.2', 'static-nginx'
  appRoot: string;
  publicDir: string;
  entryPoint: string | null;
  internalPort: number | null;
  processManager: ProcessManagerType | null;
  instances: number;
  memoryLimitMb: number;
  cpuQuotaPercent: number;
  envKeys: string[]; // Never expose raw secret values after write unless explicitly masked
  phpFpmConfig: {
    pmMode: 'dynamic' | 'ondemand' | 'static';
    maxChildren: number;
    memoryLimitMb: number;
    uploadMaxFilesizeMb: number;
    maxExecutionTimeSec: number;
  } | null;
  status: 'RUNNING' | 'STOPPED' | 'DEPLOYING' | 'FAILED';
  lastDeployedAt: string;
  createdAt: string;
}

export interface EmailAccount {
  id: string;
  accountId: string;
  domainId: string;
  domainName: string;
  localPart: string;
  emailAddress: string;
  quotaMb: number;
  usedMb: number;
  imapEnabled: boolean;
  smtpEnabled: boolean;
  webmailEnabled: boolean;
  spamFilterLevel: 'STRICT' | 'STANDARD' | 'PERMISSIVE';
  rspamdRejectScore: number;
  autoresponder: {
    enabled: boolean;
    subject: string;
    bodyText: string;
    startAt: string | null;
    endAt: string | null;
  };
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface EmailForwarder {
  id: string;
  accountId: string;
  domainId: string;
  domainName: string;
  sourceAddress: string;
  destinationAddresses: string[];
  isAlias: boolean;
  keepCopyInMailbox: boolean;
  createdAt: string;
}

export interface EmailDomainSecurity {
  domainId: string;
  domainName: string;
  dkimEnabled: boolean;
  dkimSelector: string;
  dkimDnsRecord: string;
  spfRecord: string;
  dmarcRecord: string;
  rspamdEnabled: boolean;
  rspamdAddHeaderScore: number;
  rspamdGreylistScore: number;
  rspamdRejectScore: number;
  webmailUrl: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
}

export type DatabaseEngine = 'MARIADB' | 'POSTGRESQL';

export interface ManagedDatabase {
  id: string;
  accountId: string;
  linuxUsername: string;
  engine: DatabaseEngine;
  name: string; // e.g., gv_acme_production
  charset: string;
  collation: string;
  sizeMb: number;
  tablesCount: number;
  assignedUsers: Array<{
    userId: string;
    username: string;
    privileges: 'ALL' | 'READ_WRITE' | 'READ_ONLY';
  }>;
  connectionHost: string;
  connectionPort: number;
  status: 'ONLINE' | 'PROVISIONING' | 'LOCKED';
  createdAt: string;
}

export interface ManagedDatabaseUser {
  id: string;
  accountId: string;
  linuxUsername: string;
  engine: DatabaseEngine;
  username: string; // e.g., gv_acme_appuser
  allowedHosts: string; // default 127.0.0.1
  createdAt: string;
}

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'SRV' | 'CAA' | 'NS';

export interface DnsRecord {
  id: string;
  zoneId: string;
  domainId: string;
  domainName: string;
  name: string;
  type: DnsRecordType;
  content: string;
  ttl: number;
  priority: number | null;
  isSystemManaged: boolean;
  createdAt: string;
}

export interface DnsZone {
  id: string;
  accountId: string;
  domainId: string;
  zoneName: string;
  soaSerial: number;
  dnssecEnabled: boolean;
  dnssecDsRecord: string | null;
  nameservers: string[];
  records: DnsRecord[];
}

export interface FileEntry {
  name: string;
  relativePath: string;
  type: 'file' | 'directory';
  sizeBytes: number;
  permissionsOctal: string; // e.g., "0644" or "0755"
  owner: string;
  modifiedAt: string;
}

export type CronCommandType = 'PHP_SCRIPT' | 'NODE_SCRIPT' | 'HTTP_GET' | 'ARTISAN_CLI';

export interface ScheduledCronJob {
  id: string;
  accountId: string;
  linuxUsername: string;
  description: string;
  scheduleCron: string;
  commandType: CronCommandType;
  targetPathOrUrl: string;
  args: string[];
  timeoutSeconds: number;
  notifyEmail: string | null;
  enabled: boolean;
  lastRunAt: string | null;
  lastExitCode: number | null;
  lastOutputSnippet: string | null;
  createdAt: string;
}

export interface BackupSnapshot {
  id: string;
  accountId: string;
  linuxUsername: string;
  resticSnapshotId: string;
  repositoryName: string;
  repositoryTarget: string;
  encryptionAlgorithm: 'AES-256-CTR + Poly1305-AES (Restic)';
  includesFiles: boolean;
  includesDatabases: boolean;
  includesEmails: boolean;
  sizeMb: number;
  deduplicatedSizeMb: number;
  status: 'COMPLETED' | 'VERIFYING' | 'VERIFIED' | 'RESTORING' | 'FAILED';
  lastRestoreTestAt: string | null;
  lastRestoreTestResult: 'PASSED' | 'FAILED' | null;
  retentionPolicy: string;
  createdAt: string;
}

export type PlannedChangeType =
  | 'FILE_WRITE'
  | 'FILE_DELETE'
  | 'SERVICE_RELOAD'
  | 'USER_PROVISION'
  | 'QUOTA_UPDATE'
  | 'DB_DDL'
  | 'DNS_SYNC'
  | 'ACME_CHALLENGE'
  | 'RESTIC_ARCHIVE';

export interface PlannedChange {
  type: PlannedChangeType;
  target: string;
  summary: string;
  validationCommand?: string;
  rollbackStrategy: string;
  diffPreview: string;
}

export interface InfrastructureJob {
  id: string;
  accountId: string | null;
  triggeredByUserId: string;
  triggeredByUsername: string;
  operation: string;
  summary: string;
  isDryRun: boolean;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ROLLED_BACK';
  plannedChanges: PlannedChange[];
  snapshotId: string | null;
  canRollback: boolean;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string;
  actorUsername: string;
  actorRole: UserRole;
  impersonatedAccountId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  isDryRun: boolean;
  jobId: string | null;
  summary: string;
  createdAt: string;
}

export interface LicenseInfo {
  productName: 'Garvix Hosting Manager';
  vendor: 'Garvix Software Solutions Pvt Ltd';
  edition: 'ENTERPRISE_DEDICATED';
  licenseKeyMasked: string;
  licensedTo: string;
  boundIp: string;
  maxAccounts: number | 'UNLIMITED';
  validUntil: string;
  signatureVerified: boolean;
}

export type AgentAction =
  | 'system.telemetry.collect'
  | 'system.service.control'
  | 'account.provision'
  | 'account.suspend'
  | 'account.unsuspend'
  | 'domain.provision'
  | 'domain.remove'
  | 'ssl.issue'
  | 'ssl.renew'
  | 'app.deploy'
  | 'app.lifecycle'
  | 'email.mailbox.create'
  | 'email.mailbox.update'
  | 'email.forwarder.create'
  | 'email.spam.update'
  | 'db.create'
  | 'db.user.create'
  | 'db.privilege.grant'
  | 'dns.record.upsert'
  | 'dns.record.delete'
  | 'dns.dnssec.toggle'
  | 'cron.upsert'
  | 'backup.create'
  | 'backup.verify_restore'
  | 'tx.rollback';

export interface AgentRequest<T = Record<string, unknown>> {
  requestId: string;
  jobId: string;
  actorId: string;
  dryRun: boolean;
  action: AgentAction;
  params: T;
}

export interface AgentResponse<R = Record<string, unknown>> {
  requestId: string;
  success: boolean;
  dryRun: boolean;
  snapshotId: string | null;
  plannedChanges: PlannedChange[];
  result?: R;
  error?: {
    code: string;
    message: string;
    rolledBack: boolean;
  };
}
