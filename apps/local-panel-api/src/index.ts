import type {
  AccountProvisioningState,
  AgentExecutionResult,
  AgentOperationEnvelope,
  AgentOperationName,
  AgentPlannedStep,
  MailPreflightCheckItem,
  MailServerPreflightReport,
} from '@garvix/shared-types';
import {
  containsShellMetacharacters,
  validateAccountHomeConfinement,
} from '@garvix/validation';

export const ALLOWED_AGENT_OPERATIONS = new Set<AgentOperationName>([
  'CreateHostingAccount',
  'SuspendHostingAccount',
  'ReactivateHostingAccount',
  'TerminateHostingAccount',
  'CreateVirtualHost',
  'ValidateNginxConfiguration',
  'ReloadNginx',
  'CreateDatabase',
  'CreateDatabaseUser',
  'GrantDatabasePrivileges',
  'RotateDatabasePassword',
  'ConfigureMailbox',
  'UpdateMailboxQuota',
  'ConfigureDkimKey',
  'RunMailPreflight',
  'IssueCertificate',
  'RenewCertificate',
  'ApplyDnsZone',
  'CreateBackup',
  'VerifyBackupRestore',
  'RestoreBackup',
  'DeployApplication',
  'ControlApplicationProcess',
  'CollectSystemTelemetry',
  'ControlSystemService',
  'RollbackTransaction',
]);

const VALID_ACCOUNT_STATE_TRANSITIONS: Record<
  AccountProvisioningState,
  ReadonlySet<AccountProvisioningState>
> = {
  PREFLIGHT: new Set(['PROVISIONING_LINUX_USER', 'FAILED_ROLLED_BACK']),
  PROVISIONING_LINUX_USER: new Set(['PROVISIONING_HOME_FS', 'FAILED_ROLLED_BACK']),
  PROVISIONING_HOME_FS: new Set(['PROVISIONING_WEB_VHOST', 'FAILED_ROLLED_BACK']),
  PROVISIONING_WEB_VHOST: new Set(['PROVISIONING_DNS', 'FAILED_ROLLED_BACK']),
  PROVISIONING_DNS: new Set(['ACTIVE', 'FAILED_ROLLED_BACK']),
  ACTIVE: new Set(['SUSPENDING', 'TERMINATING']),
  SUSPENDING: new Set(['SUSPENDED', 'ACTIVE']),
  SUSPENDED: new Set(['REACTIVATING', 'TERMINATING']),
  REACTIVATING: new Set(['ACTIVE', 'SUSPENDED']),
  TERMINATING: new Set(['TERMINATED', 'SUSPENDED']),
  TERMINATED: new Set([]),
  FAILED_ROLLED_BACK: new Set(['PREFLIGHT']),
};

/**
 * Enforces deterministic state transitions for Hosting Account provisioning,
 * preventing partially provisioned or orphaned Linux accounts.
 */
export function transitionAccountState(
  current: AccountProvisioningState,
  next: AccountProvisioningState
): { valid: boolean; state: AccountProvisioningState; error?: string } {
  const allowedNext = VALID_ACCOUNT_STATE_TRANSITIONS[current];
  if (!allowedNext || !allowedNext.has(next)) {
    return {
      valid: false,
      state: current,
      error: `Illegal hosting account state transition from ${current} to ${next}`,
    };
  }
  return { valid: true, state: next };
}

/**
 * Phase 0/1 Mock Linux Agent Adapter.
 * Implements the 12-step security pipeline (allowlist check, argument sanitization,
 * path boundary check, dry-run preview, snapshot creation, post-check, and rollback)
 * without touching any real OS files or services.
 */
export class MockLinuxAgentAdapter {
  private readonly executedIdempotencyKeys = new Map<string, AgentExecutionResult>();
  private readonly auditTrail: Array<{
    auditEventId: string;
    requestId: string;
    operation: AgentOperationName;
    actorUserId: string;
    status: string;
    timestamp: string;
  }> = [];

  public execute<TParams extends Record<string, unknown>>(
    envelope: AgentOperationEnvelope<TParams>,
    options?: { simulateValidationFailure?: boolean }
  ): AgentExecutionResult {
    const existing = this.executedIdempotencyKeys.get(envelope.idempotencyKey);
    if (existing) {
      return existing;
    }

    const auditEventId = `aud_${envelope.requestId}`;

    // Step 1 & 2: Verify allowlisted operation
    if (!ALLOWED_AGENT_OPERATIONS.has(envelope.operation)) {
      const rejected: AgentExecutionResult = {
        requestId: envelope.requestId,
        operation: envelope.operation,
        dryRun: envelope.dryRun,
        isMockAdapter: true,
        status: 'REJECTED',
        snapshotId: null,
        plannedSteps: [],
        auditEventId,
        error: {
          code: 'OPERATION_NOT_ALLOWLISTED',
          message: `Operation "${String(envelope.operation)}" is not in the privileged agent allowlist`,
          rollbackVerified: true,
        },
      };
      this.recordAudit(auditEventId, envelope, 'REJECTED');
      return rejected;
    }

    // Step 3 & 4: Validate string arguments for shell metacharacters & path confinement
    for (const [key, val] of Object.entries(envelope.params)) {
      if (typeof val === 'string' && containsShellMetacharacters(val)) {
        const rejected: AgentExecutionResult = {
          requestId: envelope.requestId,
          operation: envelope.operation,
          dryRun: envelope.dryRun,
          isMockAdapter: true,
          status: 'REJECTED',
          snapshotId: null,
          plannedSteps: [],
          auditEventId,
          error: {
            code: 'SHELL_METACHARACTER_REJECTED',
            message: `Parameter "${key}" contains forbidden shell metacharacters`,
            rollbackVerified: true,
          },
        };
        this.recordAudit(auditEventId, envelope, 'REJECTED');
        return rejected;
      }
    }

    const linuxUsername =
      typeof envelope.params.linuxUsername === 'string'
        ? envelope.params.linuxUsername
        : undefined;
    const relativePath =
      typeof envelope.params.relativePath === 'string'
        ? envelope.params.relativePath
        : 'public_html';

    if (linuxUsername !== undefined) {
      const pathCheck = validateAccountHomeConfinement(linuxUsername, relativePath);
      if (!pathCheck.valid) {
        const rejected: AgentExecutionResult = {
          requestId: envelope.requestId,
          operation: envelope.operation,
          dryRun: envelope.dryRun,
          isMockAdapter: true,
          status: 'REJECTED',
          snapshotId: null,
          plannedSteps: [],
          auditEventId,
          error: {
            code: 'PATH_CONFINEMENT_VIOLATION',
            message: pathCheck.reason ?? 'Path confinement check failed',
            rollbackVerified: true,
          },
        };
        this.recordAudit(auditEventId, envelope, 'REJECTED');
        return rejected;
      }
    }

    // Step 6: Build preview / dry-run PlannedSteps
    const plannedSteps: AgentPlannedStep[] = this.buildPlannedSteps(
      envelope.operation,
      linuxUsername ?? 'gv_tenant'
    );

    if (envelope.dryRun) {
      const dryRunResult: AgentExecutionResult = {
        requestId: envelope.requestId,
        operation: envelope.operation,
        dryRun: true,
        isMockAdapter: true,
        status: 'DRY_RUN_READY',
        snapshotId: null,
        plannedSteps,
        auditEventId,
      };
      this.recordAudit(auditEventId, envelope, 'DRY_RUN_READY');
      return dryRunResult;
    }

    const snapshotId = `snap_${envelope.requestId}`;

    // Step 9 & 12: Post-execution validation & automatic rollback on failure
    if (options?.simulateValidationFailure) {
      const rolledBack: AgentExecutionResult = {
        requestId: envelope.requestId,
        operation: envelope.operation,
        dryRun: false,
        isMockAdapter: true,
        status: 'FAILED_ROLLED_BACK',
        snapshotId,
        plannedSteps,
        auditEventId,
        error: {
          code: 'POST_VALIDATION_FAILED_ROLLED_BACK',
          message: 'Post-execution configuration check failed; restored pre-change snapshot cleanly',
          rollbackVerified: true,
        },
      };
      this.recordAudit(auditEventId, envelope, 'FAILED_ROLLED_BACK');
      this.executedIdempotencyKeys.set(envelope.idempotencyKey, rolledBack);
      return rolledBack;
    }

    const committed: AgentExecutionResult = {
      requestId: envelope.requestId,
      operation: envelope.operation,
      dryRun: false,
      isMockAdapter: true,
      status: 'COMMITTED',
      snapshotId,
      plannedSteps,
      auditEventId,
      output: {
        mockExecutedAt: new Date().toISOString(),
        verifiedState: 'OK',
      },
    };
    this.recordAudit(auditEventId, envelope, 'COMMITTED');
    this.executedIdempotencyKeys.set(envelope.idempotencyKey, committed);
    return committed;
  }

  public getAuditTrail() {
    return [...this.auditTrail];
  }

  private recordAudit(
    auditEventId: string,
    envelope: AgentOperationEnvelope,
    status: string
  ): void {
    this.auditTrail.push({
      auditEventId,
      requestId: envelope.requestId,
      operation: envelope.operation,
      actorUserId: envelope.actorUserId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  private buildPlannedSteps(
    operation: AgentOperationName,
    linuxUsername: string
  ): AgentPlannedStep[] {
    switch (operation) {
      case 'CreateHostingAccount':
        return [
          {
            stepOrder: 1,
            actionType: 'USER_ADD',
            targetPathOrResource: `user:${linuxUsername}`,
            description: `Create isolated Linux user ${linuxUsername} (UID >= 2000, shell /sbin/nologin)`,
            rollbackAction: `userdel ${linuxUsername}`,
          },
          {
            stepOrder: 2,
            actionType: 'FS_CREATE',
            targetPathOrResource: `/home/${linuxUsername}/public_html`,
            description: `Provision confined home directory (/home/${linuxUsername}, mode 0710) and XFS project quota`,
            rollbackAction: `Remove /home/${linuxUsername} and clear XFS quota`,
          },
          {
            stepOrder: 3,
            actionType: 'FS_WRITE',
            targetPathOrResource: `/etc/opt/remi/php83/php-fpm.d/${linuxUsername}.conf`,
            description: `Render dedicated PHP-FPM pool running as ${linuxUsername} with open_basedir confinement`,
            rollbackAction: `Remove PHP-FPM pool config and reload php83-php-fpm`,
          },
        ];
      default:
        return [
          {
            stepOrder: 1,
            actionType: 'SERVICE_VALIDATE',
            targetPathOrResource: operation,
            description: `Execute allowlisted operation ${operation} in mock sandbox`,
            rollbackAction: `Restore transaction snapshot`,
          },
        ];
    }
  }
}

/**
 * Evaluates all 13 required Mail Server Preflight Checks from Module 6.
 * If outbound TCP 25 is restricted by the VPS provider, flags approvedSmtpRelayRequired = true.
 */
export function evaluateMailServerPreflight(input: {
  outboundPort25Open: boolean;
  smtpRelayConfigured: boolean;
  ptrMatchesHostname: boolean;
  hostnameIsFqdn: boolean;
  spfValid: boolean;
  dkimConfigured: boolean;
  dmarcValid: boolean;
  dnsResolverHealthy: boolean;
  mxRecordsValid: boolean;
  tlsCertificateValid: boolean;
  ipListedOnRbl: boolean;
  mailPortsAvailable: boolean;
  conflictingMtaDetected: boolean;
  isMockData?: boolean;
}): MailServerPreflightReport {
  const checks: MailPreflightCheckItem[] = [
    {
      key: 'OUTBOUND_TCP_25',
      title: 'Outbound TCP Port 25 Accessibility',
      status: input.outboundPort25Open ? 'PASS' : 'WARN',
      details: input.outboundPort25Open
        ? 'Direct outbound TCP port 25 connectivity verified.'
        : 'Outbound TCP port 25 is blocked by the VPS network provider.',
      remediation: input.outboundPort25Open
        ? null
        : 'Configure an approved authenticated SMTP relay (e.g., port 587/465) or request port 25 unblocking from your VPS provider.',
    },
    {
      key: 'SMTP_RELAY_CONFIG',
      title: 'SMTP Relay Configuration',
      status: input.outboundPort25Open || input.smtpRelayConfigured ? 'PASS' : 'FAIL',
      details: input.smtpRelayConfigured
        ? 'Authenticated outbound SMTP relay is configured.'
        : input.outboundPort25Open
          ? 'Direct MX delivery active; no external relay required.'
          : 'Port 25 is blocked and no fallback SMTP relay is configured.',
      remediation:
        input.outboundPort25Open || input.smtpRelayConfigured
          ? null
          : 'Configure an approved SMTP relay host and credentials in Mail Routing settings.',
    },
    {
      key: 'REVERSE_DNS_PTR',
      title: 'Reverse DNS (PTR) Alignment',
      status: input.ptrMatchesHostname ? 'PASS' : 'WARN',
      details: input.ptrMatchesHostname
        ? 'Server IPv4 PTR record matches mail HELO hostname.'
        : 'PTR record does not match the server FQDN.',
      remediation: input.ptrMatchesHostname
        ? null
        : 'Update the PTR (rDNS) record in your VPS provider network settings to match the mail server FQDN.',
    },
    {
      key: 'HOSTNAME_FQDN_CONSISTENCY',
      title: 'Hostname FQDN Consistency',
      status: input.hostnameIsFqdn ? 'PASS' : 'FAIL',
      details: input.hostnameIsFqdn
        ? 'System hostname and Postfix myhostname match valid FQDN.'
        : 'Server hostname is not a valid FQDN.',
      remediation: input.hostnameIsFqdn ? null : 'Set a valid FQDN hostname before enabling mail services.',
    },
    {
      key: 'SPF_RECORD',
      title: 'Sender Policy Framework (SPF)',
      status: input.spfValid ? 'PASS' : 'WARN',
      details: input.spfValid ? 'SPF TXT record includes authorized server IP/relay.' : 'SPF TXT record missing or incomplete.',
      remediation: input.spfValid ? null : 'Use the Garvix SPF Wizard to publish v=spf1 ip4:<server-ip> -all.',
    },
    {
      key: 'DKIM_KEY_AND_TXT',
      title: 'DKIM Signing Key & DNS TXT',
      status: input.dkimConfigured ? 'PASS' : 'WARN',
      details: input.dkimConfigured ? 'Rspamd DKIM signing key active and published in DNS.' : 'DKIM public key not detected in DNS.',
      remediation: input.dkimConfigured ? null : 'Publish the generated selector._domainkey TXT record.',
    },
    {
      key: 'DMARC_POLICY',
      title: 'DMARC Policy Record',
      status: input.dmarcValid ? 'PASS' : 'WARN',
      details: input.dmarcValid ? '_dmarc TXT record present with valid policy.' : '_dmarc TXT record missing.',
      remediation: input.dmarcValid ? null : 'Use the Garvix DMARC Wizard to publish _dmarc TXT record.',
    },
    {
      key: 'DNS_RESOLVER',
      title: 'Local DNS Resolution & DNSSEC',
      status: input.dnsResolverHealthy ? 'PASS' : 'FAIL',
      details: input.dnsResolverHealthy ? 'DNS resolution for external MX lookups is healthy.' : 'DNS resolver failed lookup check.',
      remediation: input.dnsResolverHealthy ? null : 'Verify /etc/resolv.conf and local unbound/pdns-recursor status.',
    },
    {
      key: 'MX_RECORDS',
      title: 'Inbound MX Record Routing',
      status: input.mxRecordsValid ? 'PASS' : 'WARN',
      details: input.mxRecordsValid ? 'Domain MX records point to this mail server.' : 'MX records point externally.',
      remediation: input.mxRecordsValid ? null : 'Update MX records or set Mail Routing to Remote Exchanger.',
    },
    {
      key: 'TLS_CERTIFICATES',
      title: 'Postfix & Dovecot TLS Certificates',
      status: input.tlsCertificateValid ? 'PASS' : 'FAIL',
      details: input.tlsCertificateValid ? 'Valid TLS certificate installed for SMTP submission (587/465) and IMAPS (993).' : 'TLS certificate missing or expired.',
      remediation: input.tlsCertificateValid ? null : 'Issue a Let\'s Encrypt certificate for the mail server hostname.',
    },
    {
      key: 'IP_REPUTATION_RBL',
      title: 'IP Reputation Check',
      status: input.ipListedOnRbl ? 'WARN' : 'PASS',
      details: input.ipListedOnRbl ? 'Server IP appears on one or more DNSBL lists.' : 'Server IP is clean on checked DNSBLs.',
      remediation: input.ipListedOnRbl ? 'Request delisting or route outbound mail through a verified SMTP relay.' : null,
    },
    {
      key: 'PORT_AVAILABILITY',
      title: 'Mail Port Availability (25, 465, 587, 993)',
      status: input.mailPortsAvailable ? 'PASS' : 'FAIL',
      details: input.mailPortsAvailable ? 'Required SMTP/IMAPS ports are available.' : 'One or more mail ports are bound by unknown processes.',
      remediation: input.mailPortsAvailable ? null : 'Inspect conflicting port bindings before provisioning Postfix/Dovecot.',
    },
    {
      key: 'CONFLICTING_MTAS',
      title: 'Conflicts with Existing Mail Services',
      status: input.conflictingMtaDetected ? 'FAIL' : 'PASS',
      details: input.conflictingMtaDetected ? 'Conflicting unmanaged MTA (e.g., Exim/Sendmail) detected.' : 'No conflicting MTA services detected.',
      remediation: input.conflictingMtaDetected ? 'Resolve MTA conflict before enabling Garvix Email Hosting.' : null,
    },
  ];

  const hasHardFailure = checks.some((c) => c.status === 'FAIL');
  const approvedSmtpRelayRequired = !input.outboundPort25Open;

  let overallStatus: 'READY' | 'RELAY_REQUIRED' | 'BLOCKED' = 'READY';
  if (hasHardFailure) {
    overallStatus = 'BLOCKED';
  } else if (approvedSmtpRelayRequired) {
    overallStatus = 'RELAY_REQUIRED';
  }

  return {
    checkedAtIso: new Date().toISOString(),
    isMockData: input.isMockData ?? true,
    directPort25Available: input.outboundPort25Open,
    approvedSmtpRelayRequired,
    overallStatus,
    disclaimer:
      'Email deliverability depends on recipient ISP policies, sender domain reputation, IP warm-up, and content quality; deliverability is never guaranteed.',
    checks,
  };
}

export * from './totp.js';
export * from './service.js';
export * from './server.js';
export * from './agent-engine.js';
export * from './email-engine.js';
export * from './whm-reseller-engine.js';
export * from './advanced-production-engine.js';

