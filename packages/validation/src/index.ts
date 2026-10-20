import { z } from 'zod';
import {
  RESERVED_LINUX_USERNAMES,
  SHELL_METACHAR_REGEX,
  containsShellMetacharacters,
  isSafeRelativePath,
  LinuxUsernameSchema,
  DomainNameSchema,
  SubdomainPrefixSchema,
  SafeRelativePathSchema,
  DatabaseIdentifierSchema,
  CronScheduleSchema,
  SafeCronArgSchema,
  ServiceNameSchema,
  ServiceActionSchema,
  CreateAccountSchema,
  CreateDomainSchema,
  DeployApplicationSchema,
  CreateEmailAccountSchema,
  CreateEmailForwarderSchema,
  UpdateAutoresponderSchema,
  CreateDatabaseSchema,
  CreateDatabaseUserSchema,
  CreateDnsRecordSchema,
  CreateCronJobSchema,
  TriggerBackupSchema,
} from '../../shared/src/validators.js';

export {
  RESERVED_LINUX_USERNAMES,
  SHELL_METACHAR_REGEX,
  containsShellMetacharacters,
  isSafeRelativePath,
  LinuxUsernameSchema,
  DomainNameSchema,
  SubdomainPrefixSchema,
  SafeRelativePathSchema,
  DatabaseIdentifierSchema,
  CronScheduleSchema,
  SafeCronArgSchema,
  ServiceNameSchema,
  ServiceActionSchema,
  CreateAccountSchema,
  CreateDomainSchema,
  DeployApplicationSchema,
  CreateEmailAccountSchema,
  CreateEmailForwarderSchema,
  UpdateAutoresponderSchema,
  CreateDatabaseSchema,
  CreateDatabaseUserSchema,
  CreateDnsRecordSchema,
  CreateCronJobSchema,
  TriggerBackupSchema,
};

/**
 * Validates that an absolute resolved path stays strictly within an account's home directory
 * (/home/<linuxUsername>/...) and does not contain symlink escapes, null bytes, or traversal.
 */
export function validateAccountHomeConfinement(
  linuxUsername: string,
  requestedRelativePath: string,
  resolvedRealPath?: string
): { valid: boolean; canonicalRoot: string; reason?: string } {
  const userParse = LinuxUsernameSchema.safeParse(linuxUsername);
  if (!userParse.success) {
    return {
      valid: false,
      canonicalRoot: '',
      reason: `Invalid or reserved Linux username: ${userParse.error.issues[0]?.message ?? 'invalid'}`,
    };
  }

  const canonicalRoot = `/home/${linuxUsername}`;
  if (!isSafeRelativePath(requestedRelativePath)) {
    return {
      valid: false,
      canonicalRoot,
      reason: 'Relative path contains path traversal (..), leading slash, null byte, or shell metacharacters',
    };
  }

  if (resolvedRealPath !== undefined) {
    if (resolvedRealPath.includes('\0') || containsShellMetacharacters(resolvedRealPath)) {
      return {
        valid: false,
        canonicalRoot,
        reason: 'Resolved realpath contains forbidden characters',
      };
    }
    if (
      resolvedRealPath !== canonicalRoot &&
      !resolvedRealPath.startsWith(`${canonicalRoot}/`)
    ) {
      return {
        valid: false,
        canonicalRoot,
        reason: `Symlink or path escape detected: resolved path "${resolvedRealPath}" escapes "${canonicalRoot}"`,
      };
    }
  }

  return { valid: true, canonicalRoot };
}

/**
 * Strict DNS Record Content Validator by record type (A, AAAA, MX, CNAME, TXT, CAA, SRV, NS)
 */
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const IPV6_REGEX = /^[0-9a-fA-F:]+$/;

export function validateStrictDnsRecord(input: {
  name: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'SRV' | 'CAA' | 'NS';
  content: string;
  ttl: number;
  priority: number | null;
}): { valid: boolean; error?: string } {
  const baseCheck = CreateDnsRecordSchema.safeParse({
    domainId: 'dom_validation',
    ...input,
  });
  if (!baseCheck.success) {
    return { valid: false, error: baseCheck.error.issues[0]?.message ?? 'Invalid DNS record' };
  }

  switch (input.type) {
    case 'A':
      if (!IPV4_REGEX.test(input.content)) {
        return { valid: false, error: 'A record content must be a valid IPv4 address' };
      }
      break;
    case 'AAAA':
      if (!IPV6_REGEX.test(input.content) || !input.content.includes(':')) {
        return { valid: false, error: 'AAAA record content must be a valid IPv6 address' };
      }
      break;
    case 'MX':
      if (input.priority === null || input.priority < 0 || input.priority > 65535) {
        return { valid: false, error: 'MX record requires a valid integer priority (0-65535)' };
      }
      if (!DomainNameSchema.safeParse(input.content.replace(/\.$/, '')).success) {
        return { valid: false, error: 'MX record target must be a valid hostname' };
      }
      break;
    case 'CNAME':
    case 'NS':
      if (!DomainNameSchema.safeParse(input.content.replace(/\.$/, '')).success) {
        return { valid: false, error: `${input.type} target must be a valid hostname` };
      }
      if (input.type === 'CNAME' && input.name === '@') {
        return { valid: false, error: 'CNAME record cannot be placed at the zone apex (@)' };
      }
      break;
    case 'CAA':
      if (!/^\d+\s+(issue|issuewild|iodef)\s+"[^"]+"$/.test(input.content)) {
        return {
          valid: false,
          error: 'CAA record content must match format: <flags> <issue|issuewild|iodef> "<value>"',
        };
      }
      break;
    default:
      break;
  }

  return { valid: true };
}

/**
 * Indian GSTIN Validator (15-character format) for Billing Module
 */
export const GstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    'Invalid 15-character Indian GSTIN format'
  );
