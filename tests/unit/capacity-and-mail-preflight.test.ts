import { describe, expect, it } from 'vitest';
import {
  BASELINE_ALMALINUX10_PROFILE,
  calculateRealisticServerCapacity,
  createLabeledMockTelemetry,
  redactSensitiveFields,
} from '@garvix/telemetry';
import {
  evaluateMailServerPreflight,
  transitionAccountState,
} from '@garvix/local-panel-api';

describe('Hardware Capacity Calculator, Telemetry Safety & Mail Server Preflight', () => {
  it('calculates realistic, bounded capacities for the target 4 vCPU / 16 GB RAM / 200 GB NVMe AlmaLinux 10 profile', () => {
    const estimate = calculateRealisticServerCapacity(BASELINE_ALMALINUX10_PROFILE);

    expect(estimate.reservedSystemRamMb).toBeGreaterThanOrEqual(1536);
    expect(estimate.usableWorkloadRamMb).toBe(16384 - estimate.reservedSystemRamMb);
    expect(estimate.usableCustomerDiskGb).toBeLessThan(200);
    expect(estimate.recommendedMaxActiveAccounts).toBeGreaterThan(10);
    expect(estimate.recommendedMaxActiveAccounts).toBeLessThanOrEqual(100);
    expect(estimate.safeHourlyOutboundEmails).toBe(500);
    expect(estimate.warnings).toHaveLength(0);
  });

  it('emits resource warnings on undersized VPS profiles (< 2 GB RAM or < 40 GB disk)', () => {
    const tinyProfile = {
      ...BASELINE_ALMALINUX10_PROFILE,
      vCpuCores: 1,
      ramTotalMb: 1024,
      nvmeStorageGb: 25,
    };
    const estimate = calculateRealisticServerCapacity(tinyProfile);
    expect(estimate.warnings.length).toBeGreaterThanOrEqual(2);
  });

  it('visibly labels development telemetry as mock data and redacts secrets from logs', () => {
    const telemetry = createLabeledMockTelemetry();
    expect(telemetry.isMockData).toBe(true);
    expect(telemetry.dataOriginLabel).toBe('DEVELOPMENT_MOCK_TELEMETRY');

    const redacted = redactSensitiveFields({
      username: 'gv_tenant',
      password: 'SuperSecretPassword123!',
      nested: {
        acmeAccountKey: '-----BEGIN PRIVATE KEY-----MIIEvgIBADANBgkqhkiG9w0BAQE',
        domain: 'example.com',
      },
    });

    expect(redacted.password).toBe('[REDACTED_SECRET]');
    expect(redacted.nested.acmeAccountKey).toBe('[REDACTED_SECRET]');
    expect(redacted.nested.domain).toBe('example.com');
  });

  it('enforces strict state machine transitions for hosting account provisioning', () => {
    expect(transitionAccountState('PREFLIGHT', 'PROVISIONING_LINUX_USER').valid).toBe(true);
    expect(transitionAccountState('PREFLIGHT', 'ACTIVE').valid).toBe(false);
    expect(transitionAccountState('PROVISIONING_WEB_VHOST', 'FAILED_ROLLED_BACK').valid).toBe(
      true
    );
  });

  it('detects blocked outbound TCP port 25 in Mail Server Preflight and requires an approved SMTP relay', () => {
    const reportPort25Blocked = evaluateMailServerPreflight({
      outboundPort25Open: false,
      smtpRelayConfigured: true,
      ptrMatchesHostname: true,
      hostnameIsFqdn: true,
      spfValid: true,
      dkimConfigured: true,
      dmarcValid: true,
      dnsResolverHealthy: true,
      mxRecordsValid: true,
      tlsCertificateValid: true,
      ipListedOnRbl: false,
      mailPortsAvailable: true,
      conflictingMtaDetected: false,
    });

    expect(reportPort25Blocked.overallStatus).toBe('RELAY_REQUIRED');
    expect(reportPort25Blocked.approvedSmtpRelayRequired).toBe(true);
    expect(reportPort25Blocked.checks).toHaveLength(13);
    expect(reportPort25Blocked.disclaimer).toContain('never guaranteed');
  });
});
