import { z } from 'zod';

export const RESERVED_LINUX_USERNAMES = new Set([
  'root',
  'bin',
  'daemon',
  'adm',
  'lp',
  'sync',
  'shutdown',
  'halt',
  'mail',
  'operator',
  'games',
  'ftp',
  'nobody',
  'systemd-network',
  'systemd-resolve',
  'dbus',
  'polkitd',
  'sshd',
  'chrony',
  'nginx',
  'apache',
  'httpd',
  'postgres',
  'mysql',
  'mariadb',
  'postfix',
  'dovecot',
  'rspamd',
  'pdns',
  'roundcube',
  'garvix',
  'garvix-panel',
  'garvix-agent',
]);

export const SHELL_METACHAR_REGEX = /[;&|`$<>\\!#*?~(){}[\]\n\r\0]/;

export function containsShellMetacharacters(input: string): boolean {
  return SHELL_METACHAR_REGEX.test(input);
}

export function isSafeRelativePath(relPath: string): boolean {
  if (!relPath || relPath.includes('\0') || SHELL_METACHAR_REGEX.test(relPath)) {
    return false;
  }
  const normalized = relPath.replace(/\\/g, '/');
  if (normalized.startsWith('/')) {
    return false;
  }
  const segments = normalized.split('/');
  for (const seg of segments) {
    if (seg === '..') {
      return false;
    }
  }
  return true;
}

export const LinuxUsernameSchema = z
  .string()
  .min(3)
  .max(24)
  .regex(/^[a-z][a-z0-9_]{2,23}$/, 'Linux username must be lowercase alphanumeric/underscore starting with a letter')
  .refine((val) => !RESERVED_LINUX_USERNAMES.has(val), {
    message: 'Reserved system username is not allowed',
  });

export const DomainNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(4)
  .max(253)
  .regex(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
    'Invalid RFC-1123 domain name format'
  );

export const SubdomainPrefixSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/, 'Invalid subdomain label');

export const SafeRelativePathSchema = z
  .string()
  .min(1)
  .max(255)
  .refine(isSafeRelativePath, {
    message: 'Path must be a safe relative path inside the account home directory without ".." or shell metacharacters',
  });

export const DatabaseIdentifierSchema = z
  .string()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9_]+$/, 'Database identifier may only contain lowercase letters, numbers, and underscores');

export const CronScheduleSchema = z
  .string()
  .trim()
  .max(64)
  .regex(
    /^(\*|[0-5]?\d)(\/\d+)?\s+(\*|1?\d|2[0-3])(\/\d+)?\s+(\*|[12]?\d|3[01])(\/\d+)?\s+(\*|[1-9]|1[0-2])(\/\d+)?\s+(\*|[0-6])(\/\d+)?$/,
    'Invalid 5-field cron schedule expression'
  );

export const SafeCronArgSchema = z
  .string()
  .max(128)
  .regex(/^[a-zA-Z0-9._:/=-]+$/, 'Cron argument contains disallowed characters');

export const ServiceNameSchema = z.enum([
  'nginx',
  'php-fpm-8.3',
  'postfix',
  'dovecot',
  'rspamd',
  'mariadb',
  'postgresql-16',
  'pdns',
]);

export const ServiceActionSchema = z.enum(['reload', 'restart', 'start', 'stop']);

export const CreateAccountSchema = z.object({
  linuxUsername: LinuxUsernameSchema,
  ownerEmail: z.string().email(),
  primaryDomain: DomainNameSchema,
  packageId: z.string().min(1),
  sshEnabled: z.boolean().default(false),
  dryRun: z.boolean().optional().default(false),
});

export const CreateDomainSchema = z.object({
  accountId: z.string().min(1),
  domainName: DomainNameSchema,
  parentDomainId: z.string().nullable().optional().default(null),
  documentRootRelative: SafeRelativePathSchema.default('public_html'),
  templateType: z.enum(['PHP', 'NODEJS', 'STATIC', 'PROXY']).default('PHP'),
  phpVersion: z.enum(['8.3', '8.2', '8.1']).nullable().optional().default('8.3'),
  forceHttps: z.boolean().default(true),
  hstsEnabled: z.boolean().default(true),
  http3Enabled: z.boolean().default(true),
  autoIssueSsl: z.boolean().default(true),
  dryRun: z.boolean().optional().default(false),
});

export const DeployApplicationSchema = z.object({
  accountId: z.string().min(1),
  domainId: z.string().min(1),
  name: z.string().min(2).max(64).regex(/^[a-zA-Z0-9 _-]+$/),
  appType: z.enum(['PHP', 'NODEJS', 'STATIC']),
  runtimeVersion: z.enum(['node-22', 'node-20', 'php-8.3', 'php-8.2', 'php-8.1', 'static-nginx']),
  appRootRelative: SafeRelativePathSchema,
  publicDirRelative: SafeRelativePathSchema,
  entryPoint: z
    .string()
    .regex(/^[a-zA-Z0-9._/-]+$/, 'Entry point must be a safe relative script path')
    .nullable()
    .optional()
    .default(null),
  processManager: z.enum(['SYSTEMD', 'PM2']).nullable().optional().default('SYSTEMD'),
  instances: z.number().int().min(1).max(8).default(1),
  memoryLimitMb: z.number().int().min(128).max(8192).default(512),
  cpuQuotaPercent: z.number().int().min(25).max(400).default(100),
  envVars: z
    .record(
      z.string().regex(/^[A-Z_][A-Z0-9_]{0,63}$/, 'Invalid environment variable key'),
      z.string().max(1024).refine((v) => !v.includes('\0') && !v.includes('\n'), 'Invalid env value')
    )
    .optional()
    .default({}),
  dryRun: z.boolean().optional().default(false),
});

export const CreateEmailAccountSchema = z.object({
  accountId: z.string().min(1),
  domainId: z.string().min(1),
  localPart: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9._+-]+$/i, 'Invalid mailbox local part'),
  password: z.string().min(10).max(128),
  quotaMb: z.number().int().min(50).max(102400).default(2048),
  spamFilterLevel: z.enum(['STRICT', 'STANDARD', 'PERMISSIVE']).default('STANDARD'),
  dryRun: z.boolean().optional().default(false),
});

export const CreateEmailForwarderSchema = z.object({
  accountId: z.string().min(1),
  domainId: z.string().min(1),
  sourceLocalPart: z.string().min(1).max(64).regex(/^[a-z0-9._+-]+$/i),
  destinationAddresses: z.array(z.string().email()).min(1).max(20),
  isAlias: z.boolean().default(false),
  keepCopyInMailbox: z.boolean().default(true),
  dryRun: z.boolean().optional().default(false),
});

export const UpdateAutoresponderSchema = z.object({
  enabled: z.boolean(),
  subject: z.string().min(1).max(180).refine((s) => !containsShellMetacharacters(s), 'Disallowed characters in subject'),
  bodyText: z.string().min(1).max(4000),
  startAt: z.string().nullable().optional().default(null),
  endAt: z.string().nullable().optional().default(null),
  dryRun: z.boolean().optional().default(false),
});

export const CreateDatabaseSchema = z.object({
  accountId: z.string().min(1),
  engine: z.enum(['MARIADB', 'POSTGRESQL']),
  dbSuffix: DatabaseIdentifierSchema,
  charset: z.enum(['utf8mb4', 'UTF8']).optional(),
  dryRun: z.boolean().optional().default(false),
});

export const CreateDatabaseUserSchema = z.object({
  accountId: z.string().min(1),
  engine: z.enum(['MARIADB', 'POSTGRESQL']),
  userSuffix: DatabaseIdentifierSchema,
  password: z.string().min(12).max(128),
  databaseId: z.string().optional(),
  privileges: z.enum(['ALL', 'READ_WRITE', 'READ_ONLY']).default('ALL'),
  dryRun: z.boolean().optional().default(false),
});

export const CreateDnsRecordSchema = z.object({
  domainId: z.string().min(1),
  name: z.string().min(1).max(253).regex(/^(@|\*|[a-zA-Z0-9._-]+)$/, 'Invalid DNS record host label'),
  type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'CAA', 'NS']),
  content: z
    .string()
    .min(1)
    .max(512)
    .refine((val) => !val.includes('\0') && !val.includes('\n') && !val.includes(';'), 'Invalid DNS record content'),
  ttl: z.number().int().min(60).max(86400).default(3600),
  priority: z.number().int().min(0).max(65535).nullable().optional().default(null),
  dryRun: z.boolean().optional().default(false),
});

export const CreateCronJobSchema = z.object({
  accountId: z.string().min(1),
  description: z.string().min(2).max(120).refine((s) => !containsShellMetacharacters(s)),
  scheduleCron: CronScheduleSchema,
  commandType: z.enum(['PHP_SCRIPT', 'NODE_SCRIPT', 'HTTP_GET', 'ARTISAN_CLI']),
  targetPathOrUrl: z
    .string()
    .min(1)
    .max(255)
    .refine((val) => !containsShellMetacharacters(val) && !val.includes('..'), {
      message: 'Target path or URL must not contain shell metacharacters or path traversal',
    }),
  args: z.array(SafeCronArgSchema).max(10).default([]),
  timeoutSeconds: z.number().int().min(10).max(3600).default(300),
  notifyEmail: z.string().email().nullable().optional().default(null),
  dryRun: z.boolean().optional().default(false),
});

export const TriggerBackupSchema = z.object({
  accountId: z.string().min(1),
  includesFiles: z.boolean().default(true),
  includesDatabases: z.boolean().default(true),
  includesEmails: z.boolean().default(true),
  repositoryName: z.string().min(2).max(64).default('Backblaze-B2-Mumbai-Primary'),
  dryRun: z.boolean().optional().default(false),
});
