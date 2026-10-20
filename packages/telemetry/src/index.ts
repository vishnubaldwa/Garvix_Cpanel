import type {
  HardwareProfile,
  RealisticCapacityEstimate,
  ServerTelemetry,
} from '@garvix/shared-types';

export const BASELINE_ALMALINUX10_PROFILE: HardwareProfile = {
  vCpuCores: 4,
  ramTotalMb: 16384, // 16 GB RAM
  nvmeStorageGb: 200, // 200 GB NVMe
  dedicatedIpv4Count: 1,
  advertisedBandwidthTb: 16,
  osFamily: 'ALMALINUX_10',
};

/**
 * Calculates realistic, non-oversold hosting capacities from detected physical server resources.
 * Never promises unlimited storage, outbound email delivery, CPU, or bandwidth.
 */
export function calculateRealisticServerCapacity(
  profile: HardwareProfile
): RealisticCapacityEstimate {
  const warnings: string[] = [];

  if (profile.ramTotalMb < 2048) {
    warnings.push(
      'RAM is below 2048 MB: Rspamd,ClamAV, and concurrent database instances may experience OOM pressure.'
    );
  }
  if (profile.nvmeStorageGb < 40) {
    warnings.push(
      'Disk storage is below 40 GB: Insufficient headroom for local staging backups and system logs.'
    );
  }

  // Reserve OS + Garvix Local Panel + PostgreSQL/MariaDB/Postfix/Dovecot/Rspamd/PowerDNS baseline memory
  const reservedSystemRamMb = Math.min(
    Math.max(1536, Math.round(profile.ramTotalMb * 0.2)),
    4096
  );
  const usableWorkloadRamMb = Math.max(256, profile.ramTotalMb - reservedSystemRamMb);

  // Reserve OS root, binaries, WAL logs, and 15% filesystem safety buffer
  const reservedSystemDiskGb = Math.max(20, Math.round(profile.nvmeStorageGb * 0.18));
  const usableCustomerDiskGb = Math.max(5, profile.nvmeStorageGb - reservedSystemDiskGb);

  // Estimate realistic concurrent active accounts assuming ~250 MB average active memory footprint per account
  const recommendedMaxActiveAccounts = Math.max(
    1,
    Math.min(
      Math.floor(usableWorkloadRamMb / 180),
      Math.floor(usableCustomerDiskGb / 2)
    )
  );

  const recommendedMaxConcurrentPhpWorkers = Math.max(
    4,
    Math.floor(usableWorkloadRamMb / 96)
  );
  const recommendedMaxNodeProcesses = Math.max(
    1,
    Math.floor(usableWorkloadRamMb / 384)
  );
  const recommendedMaxPostgresConnections = Math.max(
    25,
    Math.min(300, Math.floor(profile.ramTotalMb / 64))
  );
  const recommendedMaxMariaDbConnections = Math.max(
    25,
    Math.min(300, Math.floor(profile.ramTotalMb / 64))
  );

  // Outbound email rate must be bounded by IP reputation warm-up and anti-abuse rules
  const safeHourlyOutboundEmails = profile.dedicatedIpv4Count > 0 ? 500 : 100;

  return {
    profile,
    reservedSystemRamMb,
    usableWorkloadRamMb,
    reservedSystemDiskGb,
    usableCustomerDiskGb,
    recommendedMaxActiveAccounts,
    recommendedMaxConcurrentPhpWorkers,
    recommendedMaxNodeProcesses,
    recommendedMaxPostgresConnections,
    recommendedMaxMariaDbConnections,
    safeHourlyOutboundEmails,
    warnings,
  };
}

const SENSITIVE_KEY_PATTERN =
  /password|secret|privatekey|private_key|token|authorization|cookie|acmeaccount|creditcard|cvv/i;

/**
 * Redacts secrets, private keys, and credentials before emitting structured JSON logs.
 */
export function redactSensitiveFields<T>(input: T): T {
  if (input === null || input === undefined || typeof input !== 'object') {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveFields(item)) as unknown as T;
  }
  const cloned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      cloned[key] = '[REDACTED_SECRET]';
    } else if (typeof value === 'string' && value.includes('PRIVATE KEY-----')) {
      cloned[key] = '[REDACTED_PEM_PRIVATE_KEY]';
    } else if (typeof value === 'object' && value !== null) {
      cloned[key] = redactSensitiveFields(value);
    } else {
      cloned[key] = value;
    }
  }
  return cloned as T;
}

export interface LabeledTelemetrySnapshot extends ServerTelemetry {
  isMockData: boolean;
  dataOriginLabel: 'DEVELOPMENT_MOCK_TELEMETRY' | 'LIVE_LINUX_AGENT';
}

/**
 * Returns a development telemetry snapshot with explicit mock data labeling
 * to satisfy Module 1 ("Never display fabricated real-time metrics. During development, visibly label mock data.").
 */
export function createLabeledMockTelemetry(
  profile: HardwareProfile = BASELINE_ALMALINUX10_PROFILE
): LabeledTelemetrySnapshot {
  return {
    isMockData: true,
    dataOriginLabel: 'DEVELOPMENT_MOCK_TELEMETRY',
    timestamp: new Date().toISOString(),
    hostname: 'dev-almalinux10.garvix.internal (MOCK)',
    osRelease: 'AlmaLinux release 10.0 (Purple Lion) [MOCK ADAPTER]',
    kernel: '6.12.0-55.el10.x86_64',
    publicIp: '198.51.100.42', // RFC 5737 TEST-NET-2 documentation IP
    uptimeSeconds: 86400,
    cpu: {
      cores: profile.vCpuCores,
      model: 'AMD EPYC 9654 4-Core vCPU (Simulated)',
      usagePercent: 18.4,
      loadAvg1m: 0.42,
      loadAvg5m: 0.38,
      loadAvg15m: 0.31,
      perCorePercent: Array.from({ length: profile.vCpuCores }, (_, idx) => 15 + idx * 2),
    },
    memory: {
      totalMb: profile.ramTotalMb,
      usedMb: 3840,
      cachedMb: 2048,
      availableMb: profile.ramTotalMb - 3840,
      swapTotalMb: 4096,
      swapUsedMb: 0,
    },
    disk: {
      device: '/dev/nvme0n1p1',
      mountPoint: '/',
      filesystem: 'xfs (usrquota,grpquota,prjquota)',
      totalGb: profile.nvmeStorageGb,
      usedGb: 28.5,
      availableGb: profile.nvmeStorageGb - 28.5,
      inodesUsedPercent: 4.2,
      readIops: 110,
      writeIops: 65,
    },
    bandwidth: {
      interface: 'eth0',
      inboundMbps: 12.4,
      outboundMbps: 19.8,
      monthlyTotalGb: 412.6,
      monthlyLimitGb: profile.advertisedBandwidthTb * 1024,
    },
    services: [
      {
        name: 'nginx',
        displayName: 'Nginx Web Server (Mock)',
        category: 'WEB',
        version: '1.26.2',
        state: 'running',
        pid: 1102,
        uptimeSeconds: 86400,
        memoryMb: 92,
        cpuPercent: 1.2,
        port: 443,
        configValid: true,
      },
      {
        name: 'postgresql-16',
        displayName: 'PostgreSQL 16 (Mock)',
        category: 'DATABASE',
        version: '16.6',
        state: 'running',
        pid: 1240,
        uptimeSeconds: 86400,
        memoryMb: 640,
        cpuPercent: 2.4,
        port: 5432,
        configValid: true,
      },
      {
        name: 'mariadb',
        displayName: 'MariaDB 10.11 LTS (Mock)',
        category: 'DATABASE',
        version: '10.11.10',
        state: 'running',
        pid: 1310,
        uptimeSeconds: 86400,
        memoryMb: 512,
        cpuPercent: 1.8,
        port: 3306,
        configValid: true,
      },
      {
        name: 'postfix',
        displayName: 'Postfix MTA (Mock)',
        category: 'EMAIL',
        version: '3.8.5',
        state: 'running',
        pid: 1420,
        uptimeSeconds: 86400,
        memoryMb: 64,
        cpuPercent: 0.4,
        port: 587,
        configValid: true,
      },
      {
        name: 'dovecot',
        displayName: 'Dovecot IMAP/LMTP (Mock)',
        category: 'EMAIL',
        version: '2.3.21',
        state: 'running',
        pid: 1455,
        uptimeSeconds: 86400,
        memoryMb: 78,
        cpuPercent: 0.5,
        port: 993,
        configValid: true,
      },
    ],
    alerts: [
      {
        id: 'alert_mock_notice',
        severity: 'INFO',
        category: 'SERVICE',
        title: 'Development Mock Adapter Active',
        message: 'All telemetry and system operations are running against isolated Phase 0 mock adapters.',
        createdAt: new Date().toISOString(),
        acknowledged: false,
      },
    ],
  };
}
