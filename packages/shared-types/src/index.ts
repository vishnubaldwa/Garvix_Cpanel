/**
 * Garvix Hosting Manager — Core Shared Domain Types
 * Covers Cloud Control Plane, Local Hosting Panel, 10 RBAC Roles,
 * Privileged Linux Agent RPC, Commercial Licensing, Billing, and Telemetry.
 */

export type GarvixRole =
  | 'GARVIX_SUPER_ADMIN'
  | 'GARVIX_SUPPORT_OPERATOR'
  | 'CUSTOMER_ORG_OWNER'
  | 'SERVER_ADMIN'
  | 'HOSTING_RESELLER'
  | 'HOSTING_ACCOUNT_OWNER'
  | 'HOSTING_ACCOUNT_TECH'
  | 'EMAIL_ONLY_USER'
  | 'BILLING_ADMIN'
  | 'READ_ONLY_AUDITOR';

export type ScopeType = 'GLOBAL_CLOUD' | 'ORGANIZATION' | 'SERVER' | 'RESELLER' | 'ACCOUNT' | 'MAILBOX';

export type CapabilityMaturityStatus =
  | 'IMPLEMENTED'
  | 'MOCKED'
  | 'TESTED'
  | 'PRODUCTION_VALIDATED';

export type SupportedOsFamily =
  | 'ALMALINUX_10'
  | 'ROCKY_LINUX_10_PLANNED'
  | 'UBUNTU_24_04_LTS_PLANNED'
  | 'DEBIAN_13_PLANNED';

export type AccountProvisioningState =
  | 'PREFLIGHT'
  | 'PROVISIONING_LINUX_USER'
  | 'PROVISIONING_HOME_FS'
  | 'PROVISIONING_WEB_VHOST'
  | 'PROVISIONING_DNS'
  | 'ACTIVE'
  | 'SUSPENDING'
  | 'SUSPENDED'
  | 'REACTIVATING'
  | 'TERMINATING'
  | 'TERMINATED'
  | 'FAILED_ROLLED_BACK';

export interface HardwareProfile {
  vCpuCores: number;
  ramTotalMb: number;
  nvmeStorageGb: number;
  dedicatedIpv4Count: number;
  advertisedBandwidthTb: number;
  osFamily: SupportedOsFamily;
}

export interface RealisticCapacityEstimate {
  profile: HardwareProfile;
  reservedSystemRamMb: number;
  usableWorkloadRamMb: number;
  reservedSystemDiskGb: number;
  usableCustomerDiskGb: number;
  recommendedMaxActiveAccounts: number;
  recommendedMaxConcurrentPhpWorkers: number;
  recommendedMaxNodeProcesses: number;
  recommendedMaxPostgresConnections: number;
  recommendedMaxMariaDbConnections: number;
  safeHourlyOutboundEmails: number;
  warnings: string[];
}

export type LicenseTier =
  | 'TRIAL'
  | 'MONTHLY'
  | 'ANNUAL'
  | 'PER_SERVER'
  | 'RESELLER'
  | 'ENTERPRISE';

export type LicenseOperationalMode =
  | 'ACTIVE_NORMAL'
  | 'OFFLINE_GRACE_PERIOD'
  | 'EXPIRED_READ_ONLY_ADMIN'
  | 'SUSPENDED_BY_VENDOR'
  | 'REVOKED';

export interface SignedLicenseClaims {
  licenseId: string;
  organizationId: string;
  serverId: string;
  hardwareFingerprintHash: string;
  primaryIpv4Hint: string;
  tier: LicenseTier;
  maxHostingAccounts: number | 'UNLIMITED';
  features: string[];
  issuedAtIso: string;
  expiresAtIso: string;
  offlineGraceHours: number;
  minCompatibleVersion: string;
  maxCompatibleVersion: string;
}

export interface SignedLicenseEnvelope {
  payloadBase64Url: string;
  ed25519SignatureBase64Url: string;
  publicKeyId: string;
}

export interface LicenseEvaluationResult {
  validSignature: boolean;
  operationalMode: LicenseOperationalMode;
  claims: SignedLicenseClaims | null;
  ipChangedWarning: boolean;
  allowExistingWebsitesAndEmail: true; // Always true per non-disruptive guarantee
  allowDataExportAndBackups: true;     // Always true per non-disruptive guarantee
  allowNewProvisioning: boolean;
  reason: string;
}

export type MailPreflightCheckKey =
  | 'OUTBOUND_TCP_25'
  | 'SMTP_RELAY_CONFIG'
  | 'REVERSE_DNS_PTR'
  | 'HOSTNAME_FQDN_CONSISTENCY'
  | 'SPF_RECORD'
  | 'DKIM_KEY_AND_TXT'
  | 'DMARC_POLICY'
  | 'DNS_RESOLVER'
  | 'MX_RECORDS'
  | 'TLS_CERTIFICATES'
  | 'IP_REPUTATION_RBL'
  | 'PORT_AVAILABILITY'
  | 'CONFLICTING_MTAS';

export interface MailPreflightCheckItem {
  key: MailPreflightCheckKey;
  title: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  details: string;
  remediation: string | null;
}

export interface MailServerPreflightReport {
  checkedAtIso: string;
  isMockData: boolean;
  directPort25Available: boolean;
  approvedSmtpRelayRequired: boolean;
  overallStatus: 'READY' | 'RELAY_REQUIRED' | 'BLOCKED';
  disclaimer: string;
  checks: MailPreflightCheckItem[];
}

export type AgentOperationName =
  | 'CreateHostingAccount'
  | 'SuspendHostingAccount'
  | 'ReactivateHostingAccount'
  | 'TerminateHostingAccount'
  | 'CreateVirtualHost'
  | 'ValidateNginxConfiguration'
  | 'ReloadNginx'
  | 'CreateDatabase'
  | 'CreateDatabaseUser'
  | 'GrantDatabasePrivileges'
  | 'RotateDatabasePassword'
  | 'ConfigureMailbox'
  | 'UpdateMailboxQuota'
  | 'ConfigureDkimKey'
  | 'RunMailPreflight'
  | 'IssueCertificate'
  | 'RenewCertificate'
  | 'ApplyDnsZone'
  | 'CreateBackup'
  | 'VerifyBackupRestore'
  | 'RestoreBackup'
  | 'DeployApplication'
  | 'ControlApplicationProcess'
  | 'CollectSystemTelemetry'
  | 'ControlSystemService'
  | 'RollbackTransaction';

export interface AgentOperationEnvelope<TParams = Record<string, unknown>> {
  requestId: string;
  idempotencyKey: string;
  operation: AgentOperationName;
  actorUserId: string;
  actorRole: GarvixRole;
  tenantOrganizationId: string;
  targetAccountId: string | null;
  dryRun: boolean;
  params: TParams;
}

export interface AgentPlannedStep {
  stepOrder: number;
  actionType: 'FS_CREATE' | 'FS_WRITE' | 'FS_CHMOD' | 'USER_ADD' | 'DB_DDL' | 'SERVICE_VALIDATE' | 'SERVICE_RELOAD' | 'BACKUP_SNAPSHOT';
  targetPathOrResource: string;
  description: string;
  rollbackAction: string;
}

export interface AgentExecutionResult<TOutput = Record<string, unknown>> {
  requestId: string;
  operation: AgentOperationName;
  dryRun: boolean;
  isMockAdapter: boolean;
  status: 'DRY_RUN_READY' | 'COMMITTED' | 'FAILED_ROLLED_BACK' | 'REJECTED';
  snapshotId: string | null;
  plannedSteps: AgentPlannedStep[];
  auditEventId: string;
  output?: TOutput;
  error?: {
    code: string;
    message: string;
    rollbackVerified: boolean;
  };
}

// Re-export legacy panel types for full compatibility across workspace packages
export * from '../../shared/src/types.js';
