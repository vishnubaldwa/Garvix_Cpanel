import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  containsShellMetacharacters,
  DatabaseIdentifierSchema,
  DomainNameSchema,
  LinuxUsernameSchema,
} from '@garvix/validation';
import type { DatabaseEngine } from '@garvix/shared-types';

export interface AgentCallerCredentials {
  transport: 'UDS_SO_PEERCRED' | 'MTLS_CLIENT_CERT';
  uid?: number;
  gid?: number;
  pid?: number;
  clientCertSha256?: string;
}

export interface HashChainedAuditRecord {
  sequenceNumber: number;
  auditId: string;
  requestId: string;
  operation: string;
  actorId: string;
  targetResource: string;
  status: 'PRE_EXECUTION' | 'COMMITTED' | 'FAILED_ROLLED_BACK' | 'REJECTED';
  snapshotId: string | null;
  timestampIso: string;
  prevHash: string;
  entryHash: string;
}

export interface FileSnapshotItem {
  targetPath: string;
  existedBefore: boolean;
  previousContent: Buffer | null;
  previousMode: number | null;
}

export interface NginxVhostRenderInput {
  linuxUsername: string;
  domainName: string;
  documentRootRelative: string;
  templateType: 'PHP' | 'NODEJS' | 'STATIC' | 'SUSPENDED';
  phpVersion?: '8.3' | '8.2' | '8.1' | null;
  nodeUpstreamPort?: number | null;
  sslCertPath?: string;
  sslKeyPath?: string;
  forceHttps: boolean;
  hstsEnabled: boolean;
  http3Enabled: boolean;
}

export interface PhpFpmPoolRenderInput {
  linuxUsername: string;
  phpVersion: '8.3' | '8.2' | '8.1';
  pmMode: 'ondemand' | 'dynamic' | 'static';
  maxChildren: number;
  memoryLimitMb: number;
  uploadMaxFilesizeMb: number;
  maxExecutionTimeSec: number;
}

export interface SystemdAppUnitRenderInput {
  linuxUsername: string;
  appSlug: string;
  runtimeVersion: string;
  workingDirectoryRelative: string;
  entryPointRelative: string;
  internalPort: number;
  memoryLimitMb: number;
  cpuQuotaPercent: number;
}

export interface SystemPreflightInput {
  sandboxRoot: string;
  ramTotalMb?: number;
  diskFreeGb?: number;
  boundPorts?: number[];
}

export interface SystemPreflightResult {
  safeToProceed: boolean;
  osVerified: boolean;
  osName: string;
  cgroupV2Detected: boolean;
  competingPanelsDetected: string[];
  portConflicts: number[];
  warnings: string[];
  errors: string[];
}

const COMPETING_PANEL_SIGNATURES = [
  { name: 'cPanel/WHM', relativePath: 'usr/local/cpanel' },
  { name: 'Plesk', relativePath: 'usr/local/psa' },
  { name: 'DirectAdmin', relativePath: 'usr/local/directadmin' },
  { name: 'CyberPanel', relativePath: 'usr/local/CyberCP' },
  { name: 'Webmin/Virtualmin', relativePath: 'etc/webmin' },
] as const;

const FORBIDDEN_NGINX_PATTERNS = [
  /lua_/i,
  /perl_/i,
  /\bexec\b/i,
  /\/etc\/shadow/,
  /\/etc\/passwd/,
  /\.\.\//,
];

/**
 * Renders a strictly validated Nginx virtual host configuration.
 */
export function renderNginxVirtualHost(input: NginxVhostRenderInput): string {
  const userCheck = LinuxUsernameSchema.safeParse(input.linuxUsername);
  if (!userCheck.success) {
    throw new Error(`INVALID_LINUX_USERNAME: ${userCheck.error.issues[0]?.message}`);
  }
  const domCheck = DomainNameSchema.safeParse(input.domainName);
  if (!domCheck.success) {
    throw new Error(`INVALID_DOMAIN_NAME: ${domCheck.error.issues[0]?.message}`);
  }
  if (
    input.documentRootRelative.includes('..') ||
    input.documentRootRelative.startsWith('/') ||
    containsShellMetacharacters(input.documentRootRelative)
  ) {
    throw new Error('INVALID_DOCUMENT_ROOT: Relative path contains traversal or shell metacharacters');
  }

  const docRoot = `/home/${input.linuxUsername}/${input.documentRootRelative}`;
  const sslCert = input.sslCertPath ?? `/home/${input.linuxUsername}/ssl/${input.domainName}.fullchain.pem`;
  const sslKey = input.sslKeyPath ?? `/home/${input.linuxUsername}/ssl/${input.domainName}.privkey.pem`;
  const phpSock = `/run/php-fpm/${input.linuxUsername}.sock`;

  const lines: string[] = [
    `# Managed by Garvix Linux Agent — DO NOT EDIT MANUALLY`,
    `# Account: ${input.linuxUsername} | Domain: ${input.domainName} | Mode: ${input.templateType}`,
    `server {`,
    `    listen 80;`,
    `    listen [::]:80;`,
    `    server_name ${input.domainName} www.${input.domainName};`,
    ``,
    `    location ^~ /.well-known/acme-challenge/ {`,
    `        root ${docRoot};`,
    `        allow all;`,
    `        default_type "text/plain";`,
    `    }`,
  ];

  if (input.forceHttps) {
    lines.push(
      `    location / {`,
      `        return 301 https://$host$request_uri;`,
      `    }`,
      `}`,
      ``,
      `server {`,
      `    listen 443 ssl;`,
      `    listen [::]:443 ssl;`
    );
    if (input.http3Enabled) {
      lines.push(
        `    listen 443 quic;`,
        `    add_header Alt-Svc 'h3=":443"; ma=86400' always;`
      );
    }
    lines.push(
      `    http2 on;`,
      `    server_name ${input.domainName} www.${input.domainName};`,
      `    ssl_certificate ${sslCert};`,
      `    ssl_certificate_key ${sslKey};`,
      `    ssl_protocols TLSv1.2 TLSv1.3;`,
      `    ssl_prefer_server_ciphers on;`
    );
    if (input.hstsEnabled) {
      lines.push(
        `    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;`
      );
    }
  }

  lines.push(
    `    root ${docRoot};`,
    `    index index.php index.html index.htm;`,
    `    access_log /home/${input.linuxUsername}/logs/${input.domainName}.access.log combined;`,
    `    error_log /home/${input.linuxUsername}/logs/${input.domainName}.error.log warn;`,
    `    add_header X-Frame-Options "SAMEORIGIN" always;`,
    `    add_header X-Content-Type-Options "nosniff" always;`,
    `    add_header Referrer-Policy "strict-origin-when-cross-origin" always;`,
    ``,
    `    location ~ /\\.(?!well-known).* {`,
    `        deny all;`,
    `        access_log off;`,
    `        log_not_found off;`,
    `    }`
  );

  if (input.templateType === 'SUSPENDED') {
    lines.push(
      `    location / {`,
      `        return 503;`,
      `    }`
    );
  } else if (input.templateType === 'NODEJS') {
    const port = input.nodeUpstreamPort ?? 3100;
    if (port < 1024 || port > 65535) {
      throw new Error(`INVALID_UPSTREAM_PORT: Port ${port} outside unprivileged application range`);
    }
    lines.push(
      `    location / {`,
      `        proxy_pass http://127.0.0.1:${port};`,
      `        proxy_http_version 1.1;`,
      `        proxy_set_header Host $host;`,
      `        proxy_set_header X-Real-IP $remote_addr;`,
      `        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`,
      `        proxy_set_header X-Forwarded-Proto $scheme;`,
      `    }`
    );
  } else if (input.templateType === 'PHP') {
    lines.push(
      `    location / {`,
      `        try_files $uri $uri/ /index.php?$query_string;`,
      `    }`,
      `    location ~ \\.php$ {`,
      `        try_files $uri =404;`,
      `        fastcgi_pass unix:${phpSock};`,
      `        fastcgi_index index.php;`,
      `        include fastcgi_params;`,
      `        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;`,
      `    }`
    );
  } else {
    lines.push(
      `    location / {`,
      `        try_files $uri $uri/ =404;`,
      `    }`
    );
  }

  lines.push(`}`, ``);
  return lines.join('\n');
}

/**
 * Validates Nginx configuration syntax, balanced blocks, TLS hardening, and tenant home confinement.
 */
export function validateNginxVirtualHostConfig(
  configText: string,
  expectedLinuxUsername: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  let braceDepth = 0;
  for (const ch of configText) {
    if (ch === '{') braceDepth++;
    if (ch === '}') braceDepth--;
    if (braceDepth < 0) {
      errors.push('Unbalanced closing brace "}" in Nginx configuration');
      break;
    }
  }
  if (braceDepth !== 0) {
    errors.push(`Unbalanced braces in Nginx configuration (net depth: ${braceDepth})`);
  }

  for (const pattern of FORBIDDEN_NGINX_PATTERNS) {
    if (pattern.test(configText)) {
      errors.push(`Forbidden directive or path pattern matched: ${pattern.source}`);
    }
  }

  const rootMatches = [...configText.matchAll(/^\s*root\s+([^;]+);/gm)];
  if (rootMatches.length === 0) {
    errors.push('Missing required "root" directive in Nginx configuration');
  }
  const allowedPrefix = `/home/${expectedLinuxUsername}/`;
  for (const match of rootMatches) {
    const rootPath = (match[1] ?? '').trim();
    if (!rootPath.startsWith(allowedPrefix)) {
      errors.push(
        `Nginx root directive "${rootPath}" escapes tenant home boundary "${allowedPrefix}"`
      );
    }
  }

  if (configText.includes('ssl_protocols') && !configText.includes('ssl_protocols TLSv1.2 TLSv1.3;')) {
    errors.push('Weak TLS protocols detected; only TLSv1.2 and TLSv1.3 are permitted');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Renders an isolated per-account PHP-FPM pool configuration with open_basedir and disable_functions.
 */
export function renderPhpFpmPoolConfig(input: PhpFpmPoolRenderInput): string {
  LinuxUsernameSchema.parse(input.linuxUsername);
  return [
    `; Managed by Garvix Linux Agent — PHP ${input.phpVersion} FPM Pool`,
    `[${input.linuxUsername}]`,
    `user = ${input.linuxUsername}`,
    `group = ${input.linuxUsername}`,
    `listen = /run/php-fpm/${input.linuxUsername}.sock`,
    `listen.owner = ${input.linuxUsername}`,
    `listen.group = nginx`,
    `listen.mode = 0660`,
    `pm = ${input.pmMode}`,
    `pm.max_children = ${input.maxChildren}`,
    `pm.process_idle_timeout = 10s`,
    `pm.max_requests = 500`,
    `security.limit_extensions = .php`,
    `php_admin_value[open_basedir] = /home/${input.linuxUsername}/:/tmp/`,
    `php_admin_value[sys_temp_dir] = /home/${input.linuxUsername}/tmp`,
    `php_admin_value[upload_tmp_dir] = /home/${input.linuxUsername}/tmp`,
    `php_admin_value[memory_limit] = ${input.memoryLimitMb}M`,
    `php_admin_value[upload_max_filesize] = ${input.uploadMaxFilesizeMb}M`,
    `php_admin_value[post_max_size] = ${input.uploadMaxFilesizeMb}M`,
    `php_admin_value[max_execution_time] = ${input.maxExecutionTimeSec}`,
    `php_admin_value[disable_functions] = exec,passthru,shell_exec,system,proc_open,popen,pcntl_exec`,
    ``,
  ].join('\n');
}

/**
 * Renders a hardened systemd service unit with cgroup v2 CPU/Memory limits and filesystem sandboxing.
 */
export function renderSystemdAppUnit(input: SystemdAppUnitRenderInput): string {
  LinuxUsernameSchema.parse(input.linuxUsername);
  if (
    containsShellMetacharacters(input.workingDirectoryRelative) ||
    containsShellMetacharacters(input.entryPointRelative) ||
    input.workingDirectoryRelative.includes('..') ||
    input.entryPointRelative.includes('..')
  ) {
    throw new Error('INVALID_SYSTEMD_PATH: Path contains traversal or shell metacharacters');
  }

  const workDir = `/home/${input.linuxUsername}/${input.workingDirectoryRelative}`;
  return [
    `# Managed by Garvix Linux Agent — Isolated Tenant Application Unit`,
    `[Unit]`,
    `Description=Garvix App (${input.linuxUsername}/${input.appSlug})`,
    `After=network.target`,
    ``,
    `[Service]`,
    `Type=simple`,
    `User=${input.linuxUsername}`,
    `Group=${input.linuxUsername}`,
    `WorkingDirectory=${workDir}`,
    `Environment="PORT=${input.internalPort}"`,
    `Environment="NODE_ENV=production"`,
    `ExecStart=/usr/bin/env node ${workDir}/${input.entryPointRelative}`,
    `Restart=on-failure`,
    `RestartSec=5s`,
    `NoNewPrivileges=true`,
    `PrivateTmp=true`,
    `ProtectSystem=strict`,
    `ProtectHome=tmpfs`,
    `BindPaths=/home/${input.linuxUsername}`,
    `MemoryMax=${input.memoryLimitMb}M`,
    `CPUQuota=${input.cpuQuotaPercent}%`,
    `TasksMax=128`,
    ``,
    `[Install]`,
    `WantedBy=multi-user.target`,
    ``,
  ].join('\n');
}

/**
 * Generates parameterized, least-privilege SQL DDL plans for customer PostgreSQL 16 and MariaDB 10.11 workloads.
 * Strictly blocks any access to the Garvix panel database or superuser attributes.
 */
export function buildDatabaseProvisioningPlan(input: {
  linuxUsername: string;
  engine: DatabaseEngine;
  dbSuffix: string;
  userSuffix: string;
   privileges: 'ALL' | 'READ_WRITE' | 'READ_ONLY';
}): {
  databaseName: string;
  roleName: string;
  parameterizedStatements: string[];
  rollbackStatements: string[];
} {
  LinuxUsernameSchema.parse(input.linuxUsername);
  DatabaseIdentifierSchema.parse(input.dbSuffix);
  DatabaseIdentifierSchema.parse(input.userSuffix);

  const databaseName = `gv_${input.linuxUsername}_${input.dbSuffix}`;
  const roleName = `gv_${input.linuxUsername}_${input.userSuffix}`;

  if (
    databaseName.startsWith('gv_panel') ||
    databaseName === 'garvix_local_panel' ||
    databaseName === 'garvix_cloud' ||
    roleName === 'postgres' ||
    roleName === 'root'
  ) {
    throw new Error(
      'PANEL_DB_ISOLATION_VIOLATION: Customer database operations cannot reference panel or system databases'
    );
  }

  if (input.engine === 'POSTGRESQL') {
    const grantClause =
      input.privileges === 'READ_ONLY'
        ? `GRANT CONNECT ON DATABASE "${databaseName}" TO "${roleName}"; GRANT SELECT ON ALL TABLES IN SCHEMA public TO "${roleName}";`
        : `GRANT ALL PRIVILEGES ON DATABASE "${databaseName}" TO "${roleName}";`;

    return {
      databaseName,
      roleName,
      parameterizedStatements: [
        `CREATE ROLE "${roleName}" WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT CONNECTION LIMIT 50 PASSWORD $1;`,
        `CREATE DATABASE "${databaseName}" WITH OWNER "${roleName}" ENCODING 'UTF8' TEMPLATE template0;`,
        `REVOKE ALL ON DATABASE "${databaseName}" FROM PUBLIC;`,
        grantClause,
      ],
      rollbackStatements: [
        `DROP DATABASE IF EXISTS "${databaseName}";`,
        `DROP ROLE IF EXISTS "${roleName}";`,
      ],
    };
  }

  const mariaGrant =
    input.privileges === 'READ_ONLY'
      ? `GRANT SELECT ON \`${databaseName}\`.* TO '${roleName}'@'127.0.0.1';`
      : input.privileges === 'READ_WRITE'
        ? `GRANT SELECT, INSERT, UPDATE, DELETE, CREATE TEMPORARY TABLES ON \`${databaseName}\`.* TO '${roleName}'@'127.0.0.1';`
        : `GRANT ALL PRIVILEGES ON \`${databaseName}\`.* TO '${roleName}'@'127.0.0.1';`;

  return {
    databaseName,
    roleName,
    parameterizedStatements: [
      `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
      `CREATE USER '${roleName}'@'127.0.0.1' IDENTIFIED BY ? WITH MAX_USER_CONNECTIONS 50;`,
      mariaGrant,
      `FLUSH PRIVILEGES;`,
    ],
    rollbackStatements: [
      `DROP DATABASE IF EXISTS \`${databaseName}\`;`,
      `DROP USER IF EXISTS '${roleName}'@'127.0.0.1';`,
    ],
  };
}

/**
 * Executes System Preflight Checks against a target root directory (e.g. disposable container or sandbox).
 * Refuses installation if cPanel/WHM, Plesk, DirectAdmin, CyberPanel, or Webmin is present.
 */
export function runSystemPreflight(input: SystemPreflightInput): SystemPreflightResult {
  const competingPanelsDetected: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const sig of COMPETING_PANEL_SIGNATURES) {
    const checkPath = path.join(input.sandboxRoot, sig.relativePath);
    if (fs.existsSync(checkPath)) {
      competingPanelsDetected.push(`${sig.name} (/${sig.relativePath})`);
    }
  }
  if (competingPanelsDetected.length > 0) {
    errors.push(
      `REFUSED_COMPETING_PANEL: Existing control panel detected (${competingPanelsDetected.join(', ')}). Garvix refuses to install over existing panels.`
    );
  }

  let osVerified = false;
  let osName = 'Unknown Linux';
  const osReleasePath = path.join(input.sandboxRoot, 'etc/os-release');
  if (fs.existsSync(osReleasePath)) {
    const content = fs.readFileSync(osReleasePath, 'utf8');
    if (content.includes('AlmaLinux') && content.includes('10')) {
      osVerified = true;
      osName = 'AlmaLinux 10';
    } else {
      warnings.push('Target OS is not AlmaLinux 10; OS adapter compatibility verification required.');
    }
  } else {
    warnings.push('/etc/os-release not found in target root');
  }

  const cgroupV2Detected = fs.existsSync(
    path.join(input.sandboxRoot, 'sys/fs/cgroup/cgroup.controllers')
  );
  if (!cgroupV2Detected) {
    warnings.push('cgroup v2 controller file not detected; per-account CPU/Memory slices require cgroup v2.');
  }

  const requiredPorts = [80, 443, 25, 465, 587, 993, 53, 5432, 3306];
  const boundSet = new Set(input.boundPorts ?? []);
  const portConflicts = requiredPorts.filter((p) => boundSet.has(p));
  if (portConflicts.length > 0) {
    errors.push(`Port conflict detected on required ports: ${portConflicts.join(', ')}`);
  }

  if ((input.ramTotalMb ?? 16384) < 2048) {
    errors.push('Insufficient RAM: Minimum 2048 MB required for full hosting stack');
  }
  if ((input.diskFreeGb ?? 200) < 20) {
    errors.push('Insufficient Disk Space: Minimum 20 GB free required');
  }

  return {
    safeToProceed: errors.length === 0,
    osVerified,
    osName,
    cgroupV2Detected,
    competingPanelsDetected,
    portConflicts,
    warnings,
    errors,
  };
}

/**
 * Sandboxed Phase 2 Linux Agent Execution Engine.
 * Operates strictly within an isolated temporary directory (`sandboxRoot`),
 * enforcing caller authentication, per-resource locking, file snapshots, post-execution validation,
 * automatic rollback, ACME rate-limit checks, and SHA-256 hash-chained audit logging.
 */
export class SandboxedLinuxAgentEngine {
  public readonly sandboxRoot: string;
  private readonly authorizedPanelUid: number;
  private readonly activeLocks = new Set<string>();
  private readonly snapshots = new Map<string, FileSnapshotItem[]>();
  private readonly auditChain: HashChainedAuditRecord[] = [];
  private readonly acmeIssuanceHistory = new Map<string, number[]>();

  constructor(options: { sandboxRoot: string; authorizedPanelUid?: number }) {
    this.sandboxRoot = path.resolve(options.sandboxRoot);
    this.authorizedPanelUid = options.authorizedPanelUid ?? 991; // garvix-panel UID
    this.initializeSandboxHierarchy();
  }

  private initializeSandboxHierarchy(): void {
    const dirs = [
      'home',
      'etc/nginx/conf.d/garvix',
      'etc/opt/remi/php83/php-fpm.d',
      'etc/systemd/system',
      'etc/garvix/ssl',
      'var/lib/garvix-agent/snapshots',
      'sys/fs/cgroup',
    ];
    for (const rel of dirs) {
      fs.mkdirSync(path.join(this.sandboxRoot, rel), { recursive: true });
    }
    fs.writeFileSync(
      path.join(this.sandboxRoot, 'etc/os-release'),
      'NAME="AlmaLinux"\nVERSION="10.0 (Purple Lion)"\nID="almalinux"\nVERSION_ID="10.0"\nPLATFORM_ID="platform:el10"\n',
      'utf8'
    );
    fs.writeFileSync(
      path.join(this.sandboxRoot, 'sys/fs/cgroup/cgroup.controllers'),
      'cpuset cpu io memory hugetlb pids rdma misc\n',
      'utf8'
    );
  }

  public authenticateCaller(creds: AgentCallerCredentials): void {
    if (creds.transport === 'UDS_SO_PEERCRED') {
      if (creds.uid !== this.authorizedPanelUid && creds.uid !== 0) {
        throw new Error(
          `AGENT_AUTH_DENIED: Unrecognized UDS peer UID ${String(creds.uid)}; expected ${this.authorizedPanelUid}`
        );
      }
      return;
    }
    if (creds.transport === 'MTLS_CLIENT_CERT') {
      if (!creds.clientCertSha256 || !/^sha256:[a-f0-9]{64}$/.test(creds.clientCertSha256)) {
        throw new Error('AGENT_AUTH_DENIED: Invalid or missing mTLS client certificate fingerprint');
      }
      return;
    }
    throw new Error('AGENT_AUTH_DENIED: Unsupported caller authentication transport');
  }

  public provisionHostingAccountInSandbox(params: {
    caller: AgentCallerCredentials;
    actorId: string;
    linuxUsername: string;
    primaryDomain: string;
    dryRun?: boolean;
    injectInvalidNginxDirectiveForTest?: string;
  }): {
    status: 'DRY_RUN_READY' | 'COMMITTED' | 'FAILED_ROLLED_BACK';
    snapshotId: string | null;
    createdPaths: string[];
    error?: string;
  } {
    const requestId = `req_${randomUUID().slice(0, 8)}`;
    this.authenticateCaller(params.caller);
    LinuxUsernameSchema.parse(params.linuxUsername);
    DomainNameSchema.parse(params.primaryDomain);

    const lockKey = `account:${params.linuxUsername}`;
    this.acquireLock(lockKey);

    try {
      const homeDir = path.join(this.sandboxRoot, 'home', params.linuxUsername);
      const publicHtmlDir = path.join(homeDir, 'public_html');
      const logsDir = path.join(homeDir, 'logs');
      const sslDir = path.join(homeDir, 'ssl');
      const tmpDir = path.join(homeDir, 'tmp');
      const indexFile = path.join(publicHtmlDir, 'index.html');
      const phpPoolFile = path.join(
        this.sandboxRoot,
        'etc/opt/remi/php83/php-fpm.d',
        `${params.linuxUsername}.conf`
      );
      const nginxVhostFile = path.join(
        this.sandboxRoot,
        'etc/nginx/conf.d/garvix',
        `${params.primaryDomain}.conf`
      );

      const targetPaths = [indexFile, phpPoolFile, nginxVhostFile];
      if (params.dryRun) {
        this.appendAuditRecord({
          requestId,
          operation: 'CreateHostingAccount',
          actorId: params.actorId,
          targetResource: params.linuxUsername,
          status: 'PRE_EXECUTION',
          snapshotId: null,
        });
        return {
          status: 'DRY_RUN_READY',
          snapshotId: null,
          createdPaths: targetPaths,
        };
      }

      const snapshotId = this.createSnapshot(targetPaths);
      this.appendAuditRecord({
        requestId,
        operation: 'CreateHostingAccount',
        actorId: params.actorId,
        targetResource: params.linuxUsername,
        status: 'PRE_EXECUTION',
        snapshotId,
      });

      // Create directories with least-privilege permissions (0710 for home, 0700 for ssl/tmp)
      fs.mkdirSync(homeDir, { recursive: true, mode: 0o710 });
      fs.chmodSync(homeDir, 0o710);
      fs.mkdirSync(publicHtmlDir, { recursive: true, mode: 0o750 });
      fs.mkdirSync(logsDir, { recursive: true, mode: 0o750 });
      fs.mkdirSync(sslDir, { recursive: true, mode: 0o700 });
      fs.chmodSync(sslDir, 0o700);
      fs.mkdirSync(tmpDir, { recursive: true, mode: 0o700 });

      // Verify realpath confinement inside sandboxRoot/home/<linuxUsername>
      const realHome = fs.realpathSync(homeDir);
      const expectedRealPrefix = fs.realpathSync(path.join(this.sandboxRoot, 'home'));
      if (!realHome.startsWith(expectedRealPrefix + path.sep)) {
        throw new Error('SYMLINK_ESCAPE_DETECTED: Account home directory escaped sandbox /home');
      }

      fs.writeFileSync(
        indexFile,
        `<!doctype html><html><head><title>${params.primaryDomain}</title></head><body><h1>Hosted by Garvix</h1></body></html>\n`,
        { mode: 0o640 }
      );

      const phpPoolContent = renderPhpFpmPoolConfig({
        linuxUsername: params.linuxUsername,
        phpVersion: '8.3',
        pmMode: 'ondemand',
        maxChildren: 10,
        memoryLimitMb: 512,
        uploadMaxFilesizeMb: 64,
        maxExecutionTimeSec: 60,
      });
      fs.writeFileSync(phpPoolFile, phpPoolContent, { mode: 0o640 });

      let vhostContent = renderNginxVirtualHost({
        linuxUsername: params.linuxUsername,
        domainName: params.primaryDomain,
        documentRootRelative: 'public_html',
        templateType: 'PHP',
        phpVersion: '8.3',
        forceHttps: true,
        hstsEnabled: true,
        http3Enabled: true,
      });

      if (params.injectInvalidNginxDirectiveForTest) {
        vhostContent += `\n${params.injectInvalidNginxDirectiveForTest}\n`;
      }

      fs.writeFileSync(nginxVhostFile, vhostContent, { mode: 0o644 });

      // Post-Execution Validation (Nginx configuration validator)
      const nginxValidation = validateNginxVirtualHostConfig(
        vhostContent,
        params.linuxUsername
      );
      if (!nginxValidation.valid) {
        this.rollbackSnapshot(snapshotId);
        fs.rmSync(homeDir, { recursive: true, force: true });
        this.appendAuditRecord({
          requestId,
          operation: 'CreateHostingAccount',
          actorId: params.actorId,
          targetResource: params.linuxUsername,
          status: 'FAILED_ROLLED_BACK',
          snapshotId,
        });
        return {
          status: 'FAILED_ROLLED_BACK',
          snapshotId,
          createdPaths: [],
          error: `NGINX_VALIDATION_FAILED: ${nginxValidation.errors.join('; ')}`,
        };
      }

      this.appendAuditRecord({
        requestId,
        operation: 'CreateHostingAccount',
        actorId: params.actorId,
        targetResource: params.linuxUsername,
        status: 'COMMITTED',
        snapshotId,
      });

      return {
        status: 'COMMITTED',
        snapshotId,
        createdPaths: [homeDir, indexFile, phpPoolFile, nginxVhostFile],
      };
    } finally {
      this.releaseLock(lockKey);
    }
  }

  public issueSslCertificateInSandbox(params: {
    caller: AgentCallerCredentials;
    actorId: string;
    linuxUsername: string;
    domainName: string;
    challengeType: 'HTTP_01' | 'DNS_01';
    nowMs?: number;
  }): {
    status: 'COMMITTED';
    certPath: string;
    keyPath: string;
    keyModeOctal: string;
    snapshotId: string;
  } {
    const requestId = `req_${randomUUID().slice(0, 8)}`;
    this.authenticateCaller(params.caller);
    LinuxUsernameSchema.parse(params.linuxUsername);
    DomainNameSchema.parse(params.domainName);

    const nowMs = params.nowMs ?? Date.now();
    const sevenDaysAgo = nowMs - 7 * 86400 * 1000;
    const history = (this.acmeIssuanceHistory.get(params.domainName) ?? []).filter(
      (ts) => ts >= sevenDaysAgo
    );

    if (history.length >= 5) {
      throw new Error(
        `ACME_RATE_LIMIT_EXCEEDED: Domain ${params.domainName} has already issued 5 certificates in the past 7 days`
      );
    }

    const sslDir = path.join(this.sandboxRoot, 'home', params.linuxUsername, 'ssl');
    fs.mkdirSync(sslDir, { recursive: true, mode: 0o700 });

    const certPath = path.join(sslDir, `${params.domainName}.fullchain.pem`);
    const keyPath = path.join(sslDir, `${params.domainName}.privkey.pem`);
    const snapshotId = this.createSnapshot([certPath, keyPath]);

    // Write simulated ECDSA P-256 private key with strict 0600 permissions
    fs.writeFileSync(
      keyPath,
      `-----BEGIN PRIVATE KEY-----\nMOCK_ECDSA_P256_KEY_FOR_${params.domainName}\n-----END PRIVATE KEY-----\n`,
      { mode: 0o600 }
    );
    fs.chmodSync(keyPath, 0o600);

    fs.writeFileSync(
      certPath,
      `-----BEGIN CERTIFICATE-----\nMOCK_LETSENCRYPT_CERT_FOR_${params.domainName}\n-----END CERTIFICATE-----\n`,
      { mode: 0o644 }
    );

    history.push(nowMs);
    this.acmeIssuanceHistory.set(params.domainName, history);

    const statKey = fs.statSync(keyPath);
    const keyModeOctal = (statKey.mode & 0o777).toString(8).padStart(4, '0');

    this.appendAuditRecord({
      requestId,
      operation: 'IssueCertificate',
      actorId: params.actorId,
      targetResource: params.domainName,
      status: 'COMMITTED',
      snapshotId,
    });

    return {
      status: 'COMMITTED',
      certPath,
      keyPath,
      keyModeOctal,
      snapshotId,
    };
  }

  public getAuditChain(): HashChainedAuditRecord[] {
    return [...this.auditChain];
  }

  /**
   * Verifies that no record in the hash-chained audit trail has been modified, reordered, or deleted.
   */
  public verifyAuditChainIntegrity(): { valid: boolean; tamperedIndex?: number } {
    let expectedPrevHash = 'GENESIS_00000000000000000000000000000000000000000000000000000000';
    for (let i = 0; i < this.auditChain.length; i++) {
      const rec = this.auditChain[i]!;
      if (rec.prevHash !== expectedPrevHash) {
        return { valid: false, tamperedIndex: i };
      }
      const recomputed = this.computeAuditEntryHash({
        sequenceNumber: rec.sequenceNumber,
        auditId: rec.auditId,
        requestId: rec.requestId,
        operation: rec.operation,
        actorId: rec.actorId,
        targetResource: rec.targetResource,
        status: rec.status,
        snapshotId: rec.snapshotId,
        timestampIso: rec.timestampIso,
        prevHash: rec.prevHash,
      });
      if (recomputed !== rec.entryHash) {
        return { valid: false, tamperedIndex: i };
      }
      expectedPrevHash = rec.entryHash;
    }
    return { valid: true };
  }

  private acquireLock(lockKey: string): void {
    if (this.activeLocks.has(lockKey)) {
      throw new Error(
        `RESOURCE_LOCKED_CONCURRENT_OPERATION: Resource "${lockKey}" is currently locked by another active operation`
      );
    }
    this.activeLocks.add(lockKey);
  }

  private releaseLock(lockKey: string): void {
    this.activeLocks.delete(lockKey);
  }

  private createSnapshot(targetPaths: string[]): string {
    const snapshotId = `snap_${randomUUID().slice(0, 8)}`;
    const items: FileSnapshotItem[] = [];
    for (const p of targetPaths) {
      if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        items.push({
          targetPath: p,
          existedBefore: true,
          previousContent: fs.readFileSync(p),
          previousMode: stat.mode & 0o777,
        });
      } else {
        items.push({
          targetPath: p,
          existedBefore: false,
          previousContent: null,
          previousMode: null,
        });
      }
    }
    this.snapshots.set(snapshotId, items);
    return snapshotId;
  }

  private rollbackSnapshot(snapshotId: string): void {
    const items = this.snapshots.get(snapshotId);
    if (!items) {
      throw new Error(`SNAPSHOT_NOT_FOUND: Cannot roll back unknown snapshot ${snapshotId}`);
    }
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i]!;
      if (!item.existedBefore) {
        if (fs.existsSync(item.targetPath)) {
          fs.rmSync(item.targetPath, { force: true });
        }
      } else if (item.previousContent !== null) {
        fs.mkdirSync(path.dirname(item.targetPath), { recursive: true });
        fs.writeFileSync(item.targetPath, item.previousContent, {
          mode: item.previousMode ?? 0o600,
        });
      }
    }
  }

  private appendAuditRecord(input: {
    requestId: string;
    operation: string;
    actorId: string;
    targetResource: string;
    status: HashChainedAuditRecord['status'];
    snapshotId: string | null;
  }): HashChainedAuditRecord {
    const prevHash =
      this.auditChain.length === 0
        ? 'GENESIS_00000000000000000000000000000000000000000000000000000000'
        : this.auditChain[this.auditChain.length - 1]!.entryHash;

    const sequenceNumber = this.auditChain.length + 1;
    const auditId = `aud_${randomUUID().slice(0, 8)}`;
    const timestampIso = new Date().toISOString();

    const entryHash = this.computeAuditEntryHash({
      sequenceNumber,
      auditId,
      requestId: input.requestId,
      operation: input.operation,
      actorId: input.actorId,
      targetResource: input.targetResource,
      status: input.status,
      snapshotId: input.snapshotId,
      timestampIso,
      prevHash,
    });

    const record: HashChainedAuditRecord = {
      sequenceNumber,
      auditId,
      requestId: input.requestId,
      operation: input.operation,
      actorId: input.actorId,
      targetResource: input.targetResource,
      status: input.status,
      snapshotId: input.snapshotId,
      timestampIso,
      prevHash,
      entryHash,
    };

    this.auditChain.push(record);
    return record;
  }

  private computeAuditEntryHash(
    data: Omit<HashChainedAuditRecord, 'entryHash'>
  ): string {
    const canonical = [
      data.sequenceNumber,
      data.auditId,
      data.requestId,
      data.operation,
      data.actorId,
      data.targetResource,
      data.status,
      data.snapshotId ?? 'null',
      data.timestampIso,
      data.prevHash,
    ].join('|');
    return createHash('sha256').update(canonical, 'utf8').digest('hex');
  }
}
