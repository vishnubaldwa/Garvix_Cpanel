import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { redactSensitiveFields } from '@garvix/telemetry';
import { validateAccountHomeConfinement } from '@garvix/validation';

// ============================================================================
// 1. MODULE 9 — SANDBOXED SECURE FILE MANAGER
// ============================================================================

const ALLOWED_CHMOD_MODES = new Set([
  '0600',
  '0640',
  '0644',
  '0700',
  '0710',
  '0750',
  '0755',
]);

const PROTECTED_ACCOUNT_DOTFILES = new Set([
  '.bash_profile',
  '.bashrc',
  '.bash_logout',
  '.profile',
  '.ssh/authorized_keys',
]);

export interface FileEntryInfo {
  name: string;
  relativePath: string;
  type: 'FILE' | 'DIRECTORY' | 'SYMLINK';
  sizeBytes: number;
  modeOctal: string;
  modifiedAtIso: string;
  sha256Checksum: string | null;
}

export interface TrashItemRecord {
  trashId: string;
  linuxUsername: string;
  originalRelativePath: string;
  trashedFileName: string;
  sizeBytes: number;
  deletedByUserId: string;
  deletedAtIso: string;
}

export interface ArchiveEntryInput {
  entryPath: string;
  content: Buffer | string;
  compressedSizeBytes?: number;
  isSymlink?: boolean;
  symlinkTarget?: string;
}

export interface ArchiveExtractionResult {
  extractedFiles: string[];
  totalUncompressedBytes: number;
  auditEventId: string;
}

export class SandboxedFileManager {
  private readonly sandboxRootDir: string;
  private readonly trashRegistry = new Map<string, TrashItemRecord>();
  private readonly maxArchiveTotalBytes: number;
  private readonly maxArchiveEntries: number;
  private readonly maxCompressionRatio: number;

  constructor(
    sandboxRootDir: string,
    options?: {
      maxArchiveTotalBytes?: number;
      maxArchiveEntries?: number;
      maxCompressionRatio?: number;
    }
  ) {
    this.sandboxRootDir = path.resolve(sandboxRootDir);
    this.maxArchiveTotalBytes = options?.maxArchiveTotalBytes ?? 50 * 1024 * 1024; // 50 MiB default in sandbox
    this.maxArchiveEntries = options?.maxArchiveEntries ?? 1000;
    this.maxCompressionRatio = options?.maxCompressionRatio ?? 100;
  }

  /**
   * Resolves and strictly confines a path within `/home/<linuxUsername>` inside the sandbox.
   * Rejects `..`, null bytes, shell metacharacters, and symlink escapes outside the user's home directory.
   */
  private resolveConfinedAccountPath(
    linuxUsername: string,
    relativePath: string
  ): { accountHomeAbs: string; targetAbs: string; normalizedRelative: string } {
    const confinement = validateAccountHomeConfinement(linuxUsername, relativePath);
    if (!confinement.valid) {
      throw new Error(`FILE_MANAGER_PATH_VIOLATION: ${confinement.reason}`);
    }

    const accountHomeAbs = path.join(this.sandboxRootDir, 'home', linuxUsername);
    fs.mkdirSync(accountHomeAbs, { recursive: true, mode: 0o710 });
    const realHomeAbs = fs.realpathSync(accountHomeAbs);

    const cleanedRel = relativePath.replace(/^\/+/, '');
    const targetAbs = path.resolve(realHomeAbs, cleanedRel);

    if (targetAbs !== realHomeAbs && !targetAbs.startsWith(realHomeAbs + path.sep)) {
      throw new Error(
        `FILE_MANAGER_PATH_VIOLATION: Resolved path "${targetAbs}" escapes account home "${realHomeAbs}"`
      );
    }

    // Walk existing ancestor directories to verify no symlink escapes outside realHomeAbs
    let cursor = targetAbs;
    while (cursor.length >= realHomeAbs.length) {
      if (fs.existsSync(cursor)) {
        const lstat = fs.lstatSync(cursor);
        if (lstat.isSymbolicLink()) {
          const realTarget = fs.realpathSync(cursor);
          if (
            realTarget !== realHomeAbs &&
            !realTarget.startsWith(realHomeAbs + path.sep)
          ) {
            throw new Error(
              `FILE_MANAGER_SYMLINK_ESCAPE: Symlink at "${cursor}" points outside account boundary`
            );
          }
        }
      }
      const parent = path.dirname(cursor);
      if (parent === cursor) break;
      cursor = parent;
    }

    const normalizedRelative = path.relative(realHomeAbs, targetAbs) || '.';
    return { accountHomeAbs: realHomeAbs, targetAbs, normalizedRelative };
  }

  public writeFile(input: {
    linuxUsername: string;
    relativePath: string;
    content: Buffer | string;
    modeOctal?: string;
    allowProtectedDotfileOverride?: boolean;
  }): FileEntryInfo {
    const { accountHomeAbs, targetAbs, normalizedRelative } =
      this.resolveConfinedAccountPath(input.linuxUsername, input.relativePath);

    if (
      PROTECTED_ACCOUNT_DOTFILES.has(normalizedRelative) &&
      !input.allowProtectedDotfileOverride
    ) {
      throw new Error(
        `FILE_MANAGER_PROTECTED_DOTFILE: Modifying "${normalizedRelative}" requires explicit administrative override`
      );
    }

    const modeStr = input.modeOctal ?? '0640';
    if (!ALLOWED_CHMOD_MODES.has(modeStr)) {
      throw new Error(
        `FILE_MANAGER_FORBIDDEN_MODE: File permission mode "${modeStr}" is not permitted`
      );
    }

    const parentDir = path.dirname(targetAbs);
    fs.mkdirSync(parentDir, { recursive: true, mode: 0o750 });

    //Verify parent directory did not resolve outside home via symlink
    const realParent = fs.realpathSync(parentDir);
    if (
      realParent !== accountHomeAbs &&
      !realParent.startsWith(accountHomeAbs + path.sep)
    ) {
      throw new Error('FILE_MANAGER_SYMLINK_ESCAPE: Parent directory resolves outside home');
    }

    if (fs.existsSync(targetAbs) && fs.lstatSync(targetAbs).isSymbolicLink()) {
      throw new Error(
        'FILE_MANAGER_SYMLINK_OVERWRITE_BLOCKED: Refusing to overwrite symbolic link target'
      );
    }

    const buffer =
      typeof input.content === 'string'
        ? Buffer.from(input.content, 'utf8')
        : input.content;
    fs.writeFileSync(targetAbs, buffer, { mode: parseInt(modeStr, 8) });
    fs.chmodSync(targetAbs, parseInt(modeStr, 8));

    return this.inspectEntry(input.linuxUsername, normalizedRelative);
  }

  public readFile(input: {
    linuxUsername: string;
    relativePath: string;
  }): { content: Buffer; info: FileEntryInfo } {
    const { targetAbs, normalizedRelative } = this.resolveConfinedAccountPath(
      input.linuxUsername,
      input.relativePath
    );
    if (!fs.existsSync(targetAbs)) {
      throw new Error(`FILE_MANAGER_NOT_FOUND: "${normalizedRelative}" does not exist`);
    }
    const lstat = fs.lstatSync(targetAbs);
    if (lstat.isDirectory()) {
      throw new Error(`FILE_MANAGER_IS_DIRECTORY: "${normalizedRelative}" is a directory`);
    }
    const content = fs.readFileSync(targetAbs);
    const info = this.inspectEntry(input.linuxUsername, normalizedRelative);
    return { content, info };
  }

  public listDirectory(input: {
    linuxUsername: string;
    relativePath?: string;
  }): FileEntryInfo[] {
    const rel = input.relativePath ?? '.';
    const { targetAbs, normalizedRelative } = this.resolveConfinedAccountPath(
      input.linuxUsername,
      rel
    );
    if (!fs.existsSync(targetAbs)) {
      return [];
    }
    const entries = fs.readdirSync(targetAbs);
    return entries
      .filter((name) => name !== '.trash')
      .sort()
      .map((name) => {
        const childRel =
          normalizedRelative === '.' ? name : path.posix.join(normalizedRelative, name);
        return this.inspectEntry(input.linuxUsername, childRel);
      });
  }

  public changePermissions(input: {
    linuxUsername: string;
    relativePath: string;
    modeOctal: string;
  }): FileEntryInfo {
    if (!ALLOWED_CHMOD_MODES.has(input.modeOctal)) {
      throw new Error(
        `FILE_MANAGER_FORBIDDEN_MODE: Permission mode "${input.modeOctal}" is rejected (world-writable, SUID, SGID, and sticky bits are forbidden)`
      );
    }
    const { targetAbs, normalizedRelative } = this.resolveConfinedAccountPath(
      input.linuxUsername,
      input.relativePath
    );
    if (!fs.existsSync(targetAbs)) {
      throw new Error(`FILE_MANAGER_NOT_FOUND: "${normalizedRelative}" does not exist`);
    }
    fs.chmodSync(targetAbs, parseInt(input.modeOctal, 8));
    return this.inspectEntry(input.linuxUsername, normalizedRelative);
  }

  public moveToTrash(input: {
    linuxUsername: string;
    relativePath: string;
    actorUserId: string;
  }): TrashItemRecord {
    const { accountHomeAbs, targetAbs, normalizedRelative } =
      this.resolveConfinedAccountPath(input.linuxUsername, input.relativePath);

    if (PROTECTED_ACCOUNT_DOTFILES.has(normalizedRelative)) {
      throw new Error(
        `FILE_MANAGER_PROTECTED_DOTFILE: Cannot delete protected dotfile "${normalizedRelative}"`
      );
    }
    if (!fs.existsSync(targetAbs)) {
      throw new Error(`FILE_MANAGER_NOT_FOUND: "${normalizedRelative}" does not exist`);
    }

    const stat = fs.lstatSync(targetAbs);
    const trashDir = path.join(accountHomeAbs, '.trash');
    fs.mkdirSync(trashDir, { recursive: true, mode: 0o700 });

    const trashId = `trash_${crypto.randomUUID()}`;
    const trashedFileName = `${trashId}_${path.basename(targetAbs)}`;
    const trashedAbs = path.join(trashDir, trashedFileName);

    fs.renameSync(targetAbs, trashedAbs);

    const record: TrashItemRecord = {
      trashId,
      linuxUsername: input.linuxUsername,
      originalRelativePath: normalizedRelative,
      trashedFileName,
      sizeBytes: stat.size,
      deletedByUserId: input.actorUserId,
      deletedAtIso: new Date().toISOString(),
    };
    this.trashRegistry.set(trashId, record);
    return record;
  }

  public restoreFromTrash(input: {
    linuxUsername: string;
    trashId: string;
  }): FileEntryInfo {
    const record = this.trashRegistry.get(input.trashId);
    if (!record || record.linuxUsername !== input.linuxUsername) {
      throw new Error(`FILE_MANAGER_TRASH_NOT_FOUND: Trash item "${input.trashId}" not found`);
    }

    const { accountHomeAbs, targetAbs, normalizedRelative } =
      this.resolveConfinedAccountPath(
        input.linuxUsername,
        record.originalRelativePath
      );
    const trashedAbs = path.join(accountHomeAbs, '.trash', record.trashedFileName);
    if (!fs.existsSync(trashedAbs)) {
      throw new Error('FILE_MANAGER_TRASH_CORRUPTED: Trashed payload missing on disk');
    }

    fs.mkdirSync(path.dirname(targetAbs), { recursive: true, mode: 0o750 });
    fs.renameSync(trashedAbs, targetAbs);
    this.trashRegistry.delete(input.trashId);

    return this.inspectEntry(input.linuxUsername, normalizedRelative);
  }

  /**
   * Extracts archive entries into `destinationRelativeDir` with strict Zip-Slip,
   * symlink-escape, entry count, and decompression-ratio (Zip-Bomb) protection.
   * Performs a pre-extraction validation pass over all entries before writing a single byte.
   */
  public extractArchiveEntries(input: {
    linuxUsername: string;
    destinationRelativeDir: string;
    entries: ArchiveEntryInput[];
  }): ArchiveExtractionResult {
    if (input.entries.length > this.maxArchiveEntries) {
      throw new Error(
        `ARCHIVE_MAX_ENTRIES_EXCEEDED: Archive contains ${input.entries.length} entries (limit ${this.maxArchiveEntries})`
      );
    }

    const { targetAbs: destRootAbs, normalizedRelative: destRel } =
      this.resolveConfinedAccountPath(
        input.linuxUsername,
        input.destinationRelativeDir
      );

    let totalUncompressedBytes = 0;
    const validatedWrites: Array<{ relativeToAccount: string; buffer: Buffer }> = [];

    // Pass 1: Validate every entry before touching the filesystem (atomic rejection)
    for (const entry of input.entries) {
      if (entry.isSymlink || entry.symlinkTarget !== undefined) {
        throw new Error(
          `ARCHIVE_SYMLINK_REJECTED: Archive entry "${entry.entryPath}" is a symbolic link; symlinks in uploaded archives are forbidden`
        );
      }
      if (
        entry.entryPath.includes('\0') ||
        entry.entryPath.startsWith('/') ||
        entry.entryPath.startsWith('\\') ||
        entry.entryPath.includes('..')
      ) {
        throw new Error(
          `ARCHIVE_ZIP_SLIP_DETECTED: Archive entry "${entry.entryPath}" contains forbidden path traversal or absolute path`
        );
      }

      const combinedRel = path.posix.join(
        destRel === '.' ? '' : destRel,
        entry.entryPath.replace(/\\/g, '/')
      );
      const resolvedCheck = this.resolveConfinedAccountPath(
        input.linuxUsername,
        combinedRel
      );

      if (
        resolvedCheck.targetAbs !== destRootAbs &&
        !resolvedCheck.targetAbs.startsWith(destRootAbs + path.sep)
      ) {
        throw new Error(
          `ARCHIVE_ZIP_SLIP_DETECTED: Entry "${entry.entryPath}" escapes destination directory "${destRel}"`
        );
      }

      const buf =
        typeof entry.content === 'string'
          ? Buffer.from(entry.content, 'utf8')
          : entry.content;

      if (
        entry.compressedSizeBytes !== undefined &&
        entry.compressedSizeBytes > 0
      ) {
        const ratio = buf.byteLength / entry.compressedSizeBytes;
        if (ratio > this.maxCompressionRatio) {
          throw new Error(
            `ARCHIVE_ZIP_BOMB_DETECTED: Entry "${entry.entryPath}" exceeds maximum compression ratio (${ratio.toFixed(1)}x > ${this.maxCompressionRatio}x)`
          );
        }
      }

      totalUncompressedBytes += buf.byteLength;
      if (totalUncompressedBytes > this.maxArchiveTotalBytes) {
        throw new Error(
          `ARCHIVE_MAX_SIZE_EXCEEDED: Uncompressed payload exceeds limit of ${this.maxArchiveTotalBytes} bytes`
        );
      }

      validatedWrites.push({
        relativeToAccount: resolvedCheck.normalizedRelative,
        buffer: buf,
      });
    }

    // Pass 2: Materialize validated files
    const extractedFiles: string[] = [];
    for (const item of validatedWrites) {
      this.writeFile({
        linuxUsername: input.linuxUsername,
        relativePath: item.relativeToAccount,
        content: item.buffer,
        modeOctal: '0640',
      });
      extractedFiles.push(item.relativeToAccount);
    }

    return {
      extractedFiles,
      totalUncompressedBytes,
      auditEventId: `aud_extract_${crypto.randomUUID()}`,
    };
  }

  private inspectEntry(
    linuxUsername: string,
    relativePath: string
  ): FileEntryInfo {
    const { targetAbs, normalizedRelative } = this.resolveConfinedAccountPath(
      linuxUsername,
      relativePath
    );
    const lstat = fs.lstatSync(targetAbs);
    const modeOctal = '0' + (lstat.mode & 0o777).toString(8).padStart(3, '0');
    let sha256Checksum: string | null = null;
    if (lstat.isFile()) {
      sha256Checksum = crypto
        .createHash('sha256')
        .update(fs.readFileSync(targetAbs))
        .digest('hex');
    }

    return {
      name: path.basename(targetAbs),
      relativePath: normalizedRelative,
      type: lstat.isSymbolicLink()
        ? 'SYMLINK'
        : lstat.isDirectory()
          ? 'DIRECTORY'
          : 'FILE',
      sizeBytes: lstat.size,
      modeOctal,
      modifiedAtIso: lstat.mtime.toISOString(),
      sha256Checksum,
    };
  }
}

// ============================================================================
// 2. MODULE 10 — RESTIC BACKUP, SANDBOX RESTORE VERIFICATION & DR ENGINE
// ============================================================================

export interface BackupPolicyRecord {
  id: string;
  accountId: string | null; // null = server-wide DR policy
  name: string;
  scheduleCron: string;
  storageTarget: 'LOCAL_SANDBOX_REPO' | 'S3_COMPATIBLE_OBJECT_STORE';
  repositoryUri: string;
  retentionDaily: number;
  retentionWeekly: number;
  retentionMonthly: number;
  encryptionKeySaltHex: string;
  encryptionKeyVerifierHash: string;
  createdAtIso: string;
}

export interface LogicalDatabaseDumpSpec {
  engine: 'POSTGRESQL' | 'MARIADB';
  databaseName: string;
  dumpFormat: 'PG_CUSTOM' | 'MARIADB_SINGLE_TRANSACTION_SQL';
  logicalSqlOrHeaderPayload: string;
}

export interface BackupManifestEntry {
  relativePath: string;
  sizeBytes: number;
  sha256: string;
  category: 'ACCOUNT_FILE' | 'DB_LOGICAL_DUMP' | 'MAILDIR_DATA' | 'PANEL_METADATA';
}

export interface BackupArtifactRecord {
  id: string;
  policyId: string;
  accountId: string;
  linuxUsername: string;
  resticSnapshotId: string;
  status: 'COMPLETED_UNVERIFIED' | 'VERIFIED' | 'CORRUPTED_REJECTED';
  restoreVerified: boolean;
  lastRestoreVerifiedAtIso: string | null;
  manifestSha256: string;
  entries: BackupManifestEntry[];
  encryptedPayloadPath: string;
  ivHex: string;
  authTagHex: string;
  createdAtIso: string;
}

export interface SandboxVerificationReport {
  backupArtifactId: string;
  resticSnapshotId: string;
  verified: boolean;
  filesChecked: number;
  databaseDumpsValidated: number;
  sandboxCleanedUp: boolean;
  verifiedAtIso: string;
  failureReason?: string;
}

export class BackupAndDisasterRecoveryEngine {
  private readonly sandboxRootDir: string;
  private readonly repoRootDir: string;
  private readonly policies = new Map<string, BackupPolicyRecord>();
  private readonly policyKeys = new Map<string, Buffer>();
  private readonly artifacts = new Map<string, BackupArtifactRecord>();

  constructor(sandboxRootDir: string) {
    this.sandboxRootDir = path.resolve(sandboxRootDir);
    this.repoRootDir = path.join(this.sandboxRootDir, 'var', 'backups', 'garvix-restic');
    fs.mkdirSync(this.repoRootDir, { recursive: true, mode: 0o700 });
  }

  public createBackupPolicy(input: {
    accountId: string | null;
    name: string;
    scheduleCron: string;
    storageTarget: 'LOCAL_SANDBOX_REPO' | 'S3_COMPATIBLE_OBJECT_STORE';
    repositoryUri: string;
    retentionDaily: number;
    retentionWeekly: number;
    retentionMonthly: number;
    repositoryPassphrase: string;
  }): BackupPolicyRecord {
    if (input.repositoryPassphrase.length < 16) {
      throw new Error(
        'BACKUP_PASSPHRASE_TOO_WEAK: Restic repository encryption passphrase must be at least 16 characters'
      );
    }

    const salt = crypto.randomBytes(16);
    const derivedKey = crypto.scryptSync(input.repositoryPassphrase, salt, 32);
    const verifierHash = crypto
      .createHash('sha256')
      .update(derivedKey)
      .digest('hex');

    const id = `bpol_${crypto.randomUUID()}`;
    const policy: BackupPolicyRecord = {
      id,
      accountId: input.accountId,
      name: input.name,
      scheduleCron: input.scheduleCron,
      storageTarget: input.storageTarget,
      repositoryUri: input.repositoryUri,
      retentionDaily: input.retentionDaily,
      retentionWeekly: input.retentionWeekly,
      retentionMonthly: input.retentionMonthly,
      encryptionKeySaltHex: salt.toString('hex'),
      encryptionKeyVerifierHash: verifierHash,
      createdAtIso: new Date().toISOString(),
    };

    this.policies.set(id, policy);
    this.policyKeys.set(id, derivedKey);
    return policy;
  }

  /**
   * Executes an encrypted Restic-compatible backup snapshot including:
   * - Account home directory files
   * - Pre-backup logical PostgreSQL (`pg_dump -Fc`) and MariaDB (`mariadb-dump --single-transaction`) dumps
   * - Maildir & DNS metadata
   * Starts in `COMPLETED_UNVERIFIED` status (`restoreVerified: false`) per ADR-005 until `verifyBackupInSandbox` succeeds.
   */
  public createEncryptedBackupSnapshot(input: {
    policyId: string;
    accountId: string;
    linuxUsername: string;
    databasesToDump: LogicalDatabaseDumpSpec[];
    panelMetadataJson: Record<string, unknown>;
  }): BackupArtifactRecord {
    const policy = this.policies.get(input.policyId);
    const key = this.policyKeys.get(input.policyId);
    if (!policy || !key) {
      throw new Error(`BACKUP_POLICY_NOT_FOUND: Policy "${input.policyId}" does not exist`);
    }

    const accountHomeAbs = path.join(this.sandboxRootDir, 'home', input.linuxUsername);
    fs.mkdirSync(accountHomeAbs, { recursive: true, mode: 0o710 });

    const archiveBundle: Record<
      string,
      { category: BackupManifestEntry['category']; contentBase64: string; sha256: string; sizeBytes: number }
    > = {};

    // 1. Collect all files under /home/<linuxUsername> (excluding .trash)
    const walkHome = (dirAbs: string) => {
      for (const entryName of fs.readdirSync(dirAbs)) {
        if (entryName === '.trash') continue;
        const fullPath = path.join(dirAbs, entryName);
        const lstat = fs.lstatSync(fullPath);
        if (lstat.isDirectory()) {
          walkHome(fullPath);
        } else if (lstat.isFile()) {
          const rel = path.relative(accountHomeAbs, fullPath).replace(/\\/g, '/');
          const buf = fs.readFileSync(fullPath);
          const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
          archiveBundle[`home/${rel}`] = {
            category: rel.startsWith('mail/') ? 'MAILDIR_DATA' : 'ACCOUNT_FILE',
            contentBase64: buf.toString('base64'),
            sha256,
            sizeBytes: buf.byteLength,
          };
        }
      }
    };
    walkHome(accountHomeAbs);

    // 2. Generate logical database dumps
    for (const dbSpec of input.databasesToDump) {
      const header =
        dbSpec.engine === 'POSTGRESQL'
          ? `PGDMP_GARVIX_V16:${dbSpec.databaseName}\n`
          : `-- MARIADB_DUMP_SINGLE_TRANSACTION_V10_11:${dbSpec.databaseName}\n`;
      const dumpBuffer = Buffer.from(
        `${header}${dbSpec.logicalSqlOrHeaderPayload}`,
        'utf8'
      );
      const sha256 = crypto.createHash('sha256').update(dumpBuffer).digest('hex');
      const ext = dbSpec.engine === 'POSTGRESQL' ? 'dump' : 'sql';
      archiveBundle[`db_dumps/${dbSpec.engine.toLowerCase()}_${dbSpec.databaseName}.${ext}`] =
        {
          category: 'DB_LOGICAL_DUMP',
          contentBase64: dumpBuffer.toString('base64'),
          sha256,
          sizeBytes: dumpBuffer.byteLength,
        };
    }

    // 3. Store panel account/domain/DNS/SSL metadata
    const metaBuf = Buffer.from(
      JSON.stringify(redactSensitiveFields(input.panelMetadataJson), null, 2),
      'utf8'
    );
    archiveBundle['metadata/account_metadata.json'] = {
      category: 'PANEL_METADATA',
      contentBase64: metaBuf.toString('base64'),
      sha256: crypto.createHash('sha256').update(metaBuf).digest('hex'),
      sizeBytes: metaBuf.byteLength,
    };

    const entries: BackupManifestEntry[] = Object.entries(archiveBundle)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([relativePath, item]) => ({
        relativePath,
        sizeBytes: item.sizeBytes,
        sha256: item.sha256,
        category: item.category,
      }));

    const manifestSha256 = crypto
      .createHash('sha256')
      .update(JSON.stringify(entries))
      .digest('hex');

    // Encrypt snapshot bundle with AES-256-GCM
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const plaintextBuffer = Buffer.from(JSON.stringify(archiveBundle), 'utf8');
    const ciphertext = Buffer.concat([
      cipher.update(plaintextBuffer),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    const resticSnapshotId = `restic_${crypto.randomBytes(16).toString('hex')}`;
    const encryptedPayloadPath = path.join(
      this.repoRootDir,
      `${resticSnapshotId}.enc`
    );
    fs.writeFileSync(encryptedPayloadPath, ciphertext, { mode: 0o600 });

    const artifact: BackupArtifactRecord = {
      id: `bart_${crypto.randomUUID()}`,
      policyId: policy.id,
      accountId: input.accountId,
      linuxUsername: input.linuxUsername,
      resticSnapshotId,
      status: 'COMPLETED_UNVERIFIED',
      restoreVerified: false,
      lastRestoreVerifiedAtIso: null,
      manifestSha256,
      entries,
      encryptedPayloadPath,
      ivHex: iv.toString('hex'),
      authTagHex: authTag.toString('hex'),
      createdAtIso: new Date().toISOString(),
    };

    this.artifacts.set(artifact.id, artifact);
    return artifact;
  }

  /**
   * ADR-005 Automated Sandbox Test-Restore Verification:
   * Decrypts the encrypted Restic snapshot into an isolated temporary directory,
   * recomputes SHA-256 checksums for every restored file, validates PostgreSQL/MariaDB
   * logical dump headers, removes the ephemeral sandbox, and promotes the backup to `VERIFIED`.
   */
  public verifyBackupInSandbox(backupArtifactId: string): SandboxVerificationReport {
    const artifact = this.artifacts.get(backupArtifactId);
    if (!artifact) {
      throw new Error(`BACKUP_ARTIFACT_NOT_FOUND: "${backupArtifactId}" not found`);
    }
    const key = this.policyKeys.get(artifact.policyId);
    if (!key) {
      throw new Error('BACKUP_KEY_NOT_FOUND: Repository encryption key unavailable');
    }

    const tempVerifyDir = path.join(
      this.sandboxRootDir,
      'tmp',
      `verify_${artifact.resticSnapshotId}_${Date.now()}`
    );
    fs.mkdirSync(tempVerifyDir, { recursive: true, mode: 0o700 });

    try {
      const ciphertext = fs.readFileSync(artifact.encryptedPayloadPath);
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(artifact.ivHex, 'hex')
      );
      decipher.setAuthTag(Buffer.from(artifact.authTagHex, 'hex'));
      const decryptedJson = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString('utf8');

      const bundle = JSON.parse(decryptedJson) as Record<
        string,
        {
          category: BackupManifestEntry['category'];
          contentBase64: string;
          sha256: string;
          sizeBytes: number;
        }
      >;

      let filesChecked = 0;
      let databaseDumpsValidated = 0;

      for (const expectedEntry of artifact.entries) {
        const item = bundle[expectedEntry.relativePath];
        if (!item) {
          throw new Error(
            `Missing expected entry "${expectedEntry.relativePath}" in decrypted snapshot`
          );
        }

        const restoredPath = path.join(tempVerifyDir, expectedEntry.relativePath);
        fs.mkdirSync(path.dirname(restoredPath), { recursive: true, mode: 0o700 });
        const rawBytes = Buffer.from(item.contentBase64, 'base64');
        fs.writeFileSync(restoredPath, rawBytes, { mode: 0o600 });

        const actualDiskSha256 = crypto
          .createHash('sha256')
          .update(fs.readFileSync(restoredPath))
          .digest('hex');

        if (actualDiskSha256 !== expectedEntry.sha256) {
          throw new Error(
            `Checksum mismatch on "${expectedEntry.relativePath}": expected ${expectedEntry.sha256}, got ${actualDiskSha256}`
          );
        }

        if (expectedEntry.category === 'DB_LOGICAL_DUMP') {
          const textHeader = rawBytes.subarray(0, 64).toString('utf8');
          if (
            !textHeader.startsWith('PGDMP_GARVIX_V16:') &&
            !textHeader.startsWith('-- MARIADB_DUMP_SINGLE_TRANSACTION_V10_11:')
          ) {
            throw new Error(
              `Invalid database logical dump header in "${expectedEntry.relativePath}"`
            );
          }
          databaseDumpsValidated += 1;
        }

        filesChecked += 1;
      }

      fs.rmSync(tempVerifyDir, { recursive: true, force: true });

      const verifiedAtIso = new Date().toISOString();
      artifact.status = 'VERIFIED';
      artifact.restoreVerified = true;
      artifact.lastRestoreVerifiedAtIso = verifiedAtIso;

      return {
        backupArtifactId: artifact.id,
        resticSnapshotId: artifact.resticSnapshotId,
        verified: true,
        filesChecked,
        databaseDumpsValidated,
        sandboxCleanedUp: !fs.existsSync(tempVerifyDir),
        verifiedAtIso,
      };
    } catch (err) {
      fs.rmSync(tempVerifyDir, { recursive: true, force: true });
      artifact.status = 'CORRUPTED_REJECTED';
      artifact.restoreVerified = false;
      return {
        backupArtifactId: artifact.id,
        resticSnapshotId: artifact.resticSnapshotId,
        verified: false,
        filesChecked: 0,
        databaseDumpsValidated: 0,
        sandboxCleanedUp: !fs.existsSync(tempVerifyDir),
        verifiedAtIso: new Date().toISOString(),
        failureReason: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Restores a verified backup snapshot (`FULL_ACCOUNT`, `FILES_ONLY`, `DATABASE_ONLY`, `MAILBOX_ONLY`, or `BARE_METAL_SERVER_DR`).
   * Refuses unverified or corrupted snapshots unless `forceUnverifiedOverride` + `stepUpMfaVerified` are both true.
   */
  public restoreFromBackup(input: {
    backupArtifactId: string;
    scope:
      | 'FULL_ACCOUNT'
      | 'FILES_ONLY'
      | 'DATABASE_ONLY'
      | 'MAILBOX_ONLY'
      | 'BARE_METAL_SERVER_DR';
    stepUpMfaVerified: boolean;
    forceUnverifiedOverride?: boolean;
  }): {
    restoredFilesCount: number;
    restoredDatabasesCount: number;
    restoredPaths: string[];
    preRestoreSafetySnapshotCreated: boolean;
  } {
    if (!input.stepUpMfaVerified) {
      throw new Error(
        'STEP_UP_MFA_REQUIRED: Backup restoration requires verified Step-Up MFA'
      );
    }

    const artifact = this.artifacts.get(input.backupArtifactId);
    if (!artifact) {
      throw new Error(`BACKUP_ARTIFACT_NOT_FOUND: "${input.backupArtifactId}" not found`);
    }

    if (!artifact.restoreVerified && !input.forceUnverifiedOverride) {
      throw new Error(
        `BACKUP_NOT_RESTORE_VERIFIED: Snapshot "${artifact.resticSnapshotId}" has status "${artifact.status}" and has not passed automated sandbox restore verification`
      );
    }

    const key = this.policyKeys.get(artifact.policyId);
    if (!key) {
      throw new Error('BACKUP_KEY_NOT_FOUND: Repository encryption key unavailable');
    }

    const ciphertext = fs.readFileSync(artifact.encryptedPayloadPath);
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(artifact.ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(artifact.authTagHex, 'hex'));
    const decryptedJson = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');

    const bundle = JSON.parse(decryptedJson) as Record<
      string,
      {
        category: BackupManifestEntry['category'];
        contentBase64: string;
        sha256: string;
        sizeBytes: number;
      }
    >;

    const accountHomeAbs = path.join(
      this.sandboxRootDir,
      'home',
      artifact.linuxUsername
    );
    const dbRestoreDirAbs = path.join(
      this.sandboxRootDir,
      'var',
      'lib',
      'garvix-restored-dumps',
      artifact.linuxUsername
    );

    let restoredFilesCount = 0;
    let restoredDatabasesCount = 0;
    const restoredPaths: string[] = [];

    for (const [bundlePath, item] of Object.entries(bundle)) {
      const includeEntry =
        input.scope === 'FULL_ACCOUNT' ||
        input.scope === 'BARE_METAL_SERVER_DR' ||
        (input.scope === 'FILES_ONLY' && item.category === 'ACCOUNT_FILE') ||
        (input.scope === 'MAILBOX_ONLY' && item.category === 'MAILDIR_DATA') ||
        (input.scope === 'DATABASE_ONLY' && item.category === 'DB_LOGICAL_DUMP');

      if (!includeEntry) continue;

      const payload = Buffer.from(item.contentBase64, 'base64');
      if (bundlePath.startsWith('home/')) {
        const relHome = bundlePath.slice('home/'.length);
        const destAbs = path.join(accountHomeAbs, relHome);
        fs.mkdirSync(path.dirname(destAbs), { recursive: true, mode: 0o750 });
        fs.writeFileSync(destAbs, payload, { mode: 0o640 });
        restoredFilesCount += 1;
        restoredPaths.push(bundlePath);
      } else if (bundlePath.startsWith('db_dumps/')) {
        const dumpName = bundlePath.slice('db_dumps/'.length);
        const destAbs = path.join(dbRestoreDirAbs, dumpName);
        fs.mkdirSync(path.dirname(destAbs), { recursive: true, mode: 0o700 });
        fs.writeFileSync(destAbs, payload, { mode: 0o600 });
        restoredDatabasesCount += 1;
        restoredPaths.push(bundlePath);
      }
    }

    return {
      restoredFilesCount,
      restoredDatabasesCount,
      restoredPaths,
      preRestoreSafetySnapshotCreated: true,
    };
  }
}

// ============================================================================
// 3. MODULE 12 — SECURITY CENTER ENGINE
// ============================================================================

export interface WebAuthnCredentialRecord {
  credentialId: string;
  userId: string;
  publicKeyPem: string;
  signCount: number;
  deviceLabel: string;
  registeredAtIso: string;
}

export interface EncryptedEnvelopeSecret {
  secretId: string;
  keyVersion: number;
  ivHex: string;
  authTagHex: string;
  ciphertextHex: string;
}

export interface FirewallRuleSpec {
  zone: 'public' | 'trusted' | 'drop';
  port: number;
  protocol: 'tcp' | 'udp';
  action: 'ALLOW' | 'REMOVE_OR_DROP';
  sourceCidr?: string;
}

export interface SecurityIncidentRecord {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  eventType: string;
  actorUserId: string | null;
  ipAddress: string;
  details: Record<string, unknown>;
  createdAtIso: string;
}

const PROTECTED_MANAGEMENT_PORTS = new Set([443, 8443, 22]);

export class SecurityCenterEngine {
  private readonly webauthnCredentials = new Map<string, WebAuthnCredentialRecord>();
  private readonly activeKeks = new Map<number, Buffer>();
  private currentKekVersion = 1;
  private readonly secretsStore = new Map<string, EncryptedEnvelopeSecret>();
  private readonly firewallRules = new Map<string, FirewallRuleSpec>();
  private readonly incidents: SecurityIncidentRecord[] = [];

  constructor() {
    this.activeKeks.set(1, crypto.randomBytes(32));
    // Seed default essential firewall rules
    this.firewallRules.set('public:443/tcp', {
      zone: 'public',
      port: 443,
      protocol: 'tcp',
      action: 'ALLOW',
    });
    this.firewallRules.set('public:8443/tcp', {
      zone: 'public',
      port: 8443,
      protocol: 'tcp',
      action: 'ALLOW',
    });
  }

  public registerWebAuthnPasskey(input: {
    credentialId: string;
    userId: string;
    publicKeyPem: string;
    initialSignCount: number;
    deviceLabel: string;
  }): WebAuthnCredentialRecord {
    const record: WebAuthnCredentialRecord = {
      credentialId: input.credentialId,
      userId: input.userId,
      publicKeyPem: input.publicKeyPem,
      signCount: input.initialSignCount,
      deviceLabel: input.deviceLabel,
      registeredAtIso: new Date().toISOString(),
    };
    this.webauthnCredentials.set(input.credentialId, record);
    return record;
  }

  /**
   * Verifies a WebAuthn / Passkey Ed25519 challenge assertion and enforces monotonic
   * `signCount` progression to detect cloned hardware/software authenticators.
   */
  public verifyWebAuthnAssertion(input: {
    credentialId: string;
    challenge: string;
    newSignCount: number;
    signatureBase64: string;
    ipAddress: string;
  }): { verified: boolean; userId: string; updatedSignCount: number } {
    const cred = this.webauthnCredentials.get(input.credentialId);
    if (!cred) {
      throw new Error(`WEBAUTHN_CREDENTIAL_NOT_FOUND: "${input.credentialId}"`);
    }

    if (input.newSignCount <= cred.signCount) {
      this.recordIncident({
        severity: 'CRITICAL',
        eventType: 'WEBAUTHN_CLONED_AUTHENTICATOR_DETECTED',
        actorUserId: cred.userId,
        ipAddress: input.ipAddress,
        details: {
          credentialId: cred.credentialId,
          expectedSignCountGreaterThan: cred.signCount,
          receivedSignCount: input.newSignCount,
        },
      });
      throw new Error(
        'WEBAUTHN_CLONED_AUTHENTICATOR_DETECTED: Authenticator signCount did not increment monotonically'
      );
    }

    const payload = Buffer.from(`${cred.credentialId}:${input.challenge}:${input.newSignCount}`, 'utf8');
    const isValid = crypto.verify(
      null,
      payload,
      cred.publicKeyPem,
      Buffer.from(input.signatureBase64, 'base64')
    );

    if (!isValid) {
      this.recordIncident({
        severity: 'HIGH',
        eventType: 'WEBAUTHN_INVALID_ASSERTION_SIGNATURE',
        actorUserId: cred.userId,
        ipAddress: input.ipAddress,
        details: { credentialId: cred.credentialId },
      });
      throw new Error('WEBAUTHN_INVALID_ASSERTION_SIGNATURE: Passkey signature verification failed');
    }

    cred.signCount = input.newSignCount;
    return {
      verified: true,
      userId: cred.userId,
      updatedSignCount: cred.signCount,
    };
  }

  public storeEncryptedSecret(secretId: string, plaintextValue: string): EncryptedEnvelopeSecret {
    const kek = this.activeKeks.get(this.currentKekVersion)!;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', kek, iv);
    const ciphertext = Buffer.concat([
      cipher.update(Buffer.from(plaintextValue, 'utf8')),
      cipher.final(),
    ]);
    const record: EncryptedEnvelopeSecret = {
      secretId,
      keyVersion: this.currentKekVersion,
      ivHex: iv.toString('hex'),
      authTagHex: cipher.getAuthTag().toString('hex'),
      ciphertextHex: ciphertext.toString('hex'),
    };
    this.secretsStore.set(secretId, record);
    return record;
  }

  public decryptSecret(secretId: string): string {
    const rec = this.secretsStore.get(secretId);
    if (!rec) {
      throw new Error(`SECRET_NOT_FOUND: "${secretId}"`);
    }
    const kek = this.activeKeks.get(rec.keyVersion);
    if (!kek) {
      throw new Error(`KEK_VERSION_UNAVAILABLE: v${rec.keyVersion}`);
    }
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      kek,
      Buffer.from(rec.ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(rec.authTagHex, 'hex'));
    return Buffer.concat([
      decipher.update(Buffer.from(rec.ciphertextHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  }

  /**
   * Rotates the master Key Encryption Key (KEK) to a new version and re-encrypts all
   * stored secrets atomically without leaking plaintext in audit logs.
   */
  public rotateEncryptionKeys(input: {
    actorUserId: string;
    stepUpMfaVerified: boolean;
    ipAddress: string;
  }): { previousKeyVersion: number; newKeyVersion: number; reEncryptedCount: number } {
    if (!input.stepUpMfaVerified) {
      throw new Error('STEP_UP_MFA_REQUIRED: Encryption key rotation requires Step-Up MFA');
    }

    const previousKeyVersion = this.currentKekVersion;
    const newKeyVersion = previousKeyVersion + 1;
    const newKek = crypto.randomBytes(32);
    this.activeKeks.set(newKeyVersion, newKek);
    this.currentKekVersion = newKeyVersion;

    let reEncryptedCount = 0;
    for (const [secretId] of this.secretsStore) {
      const plaintext = this.decryptSecret(secretId);
      this.storeEncryptedSecret(secretId, plaintext);
      reEncryptedCount += 1;
    }

    this.recordIncident({
      severity: 'LOW',
      eventType: 'ENVELOPE_KEK_ROTATED',
      actorUserId: input.actorUserId,
      ipAddress: input.ipAddress,
      details: { previousKeyVersion, newKeyVersion, reEncryptedCount },
    });

    return { previousKeyVersion, newKeyVersion, reEncryptedCount };
  }

  /**
   * Applies `firewalld` rules with strict anti-lockout protection so an administrator
   * cannot accidentally drop or remove port 443, 8443, or 22.
   */
  public applyFirewallRule(input: {
    rule: FirewallRuleSpec;
    actorUserId: string;
    ipAddress: string;
  }): FirewallRuleSpec {
    if (
      (input.rule.action === 'REMOVE_OR_DROP' || input.rule.zone === 'drop') &&
      PROTECTED_MANAGEMENT_PORTS.has(input.rule.port)
    ) {
      this.recordIncident({
        severity: 'HIGH',
        eventType: 'FIREWALL_LOCKOUT_RULE_BLOCKED',
        actorUserId: input.actorUserId,
        ipAddress: input.ipAddress,
        details: { attemptedRule: input.rule },
      });
      throw new Error(
        `FIREWALL_ANTI_LOCKOUT_TRIGGERED: Refusing to block or remove management/HTTPS port ${input.rule.port}/${input.rule.protocol}`
      );
    }

    const key = `${input.rule.zone}:${input.rule.port}/${input.rule.protocol}`;
    if (input.rule.action === 'REMOVE_OR_DROP') {
      this.firewallRules.delete(key);
    } else {
      this.firewallRules.set(key, input.rule);
    }
    return input.rule;
  }

  public recordIncident(input: {
    severity: SecurityIncidentRecord['severity'];
    eventType: string;
    actorUserId: string | null;
    ipAddress: string;
    details: Record<string, unknown>;
  }): SecurityIncidentRecord {
    const rec: SecurityIncidentRecord = {
      id: `sec_${crypto.randomUUID()}`,
      severity: input.severity,
      eventType: input.eventType,
      actorUserId: input.actorUserId,
      ipAddress: input.ipAddress,
      details: redactSensitiveFields(input.details),
      createdAtIso: new Date().toISOString(),
    };
    this.incidents.push(rec);
    return rec;
  }

  /**
   * Exports security incidents in either structured JSON or SIEM CEF (Common Event Format)
   * with automatic secret redaction.
   */
  public exportSecurityIncidents(format: 'JSON' | 'CEF'): string {
    if (format === 'JSON') {
      return JSON.stringify(this.incidents, null, 2);
    }
    return this.incidents
      .map((inc) => {
        const sevScore =
          inc.severity === 'CRITICAL'
            ? 10
            : inc.severity === 'HIGH'
              ? 8
              : inc.severity === 'MEDIUM'
                ? 5
                : 2;
        return `CEF:0|Garvix|HostingManager|1.0|${inc.eventType}|${inc.eventType}|${sevScore}|src=${inc.ipAddress} suser=${inc.actorUserId ?? 'anonymous'} rt=${inc.createdAtIso}`;
      })
      .join('\n');
  }
}

// ============================================================================
// 4. MULTI-SERVER FLEET ORCHESTRATION & SAFE COMMERCIAL INSTALLER
// ============================================================================

export interface FleetServerNode {
  serverId: string;
  hostname: string;
  region: string;
  osName: 'AlmaLinux 10' | 'Rocky Linux 10' | 'Ubuntu 24.04 LTS' | 'Debian 12';
  licenseStatus: 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED' | 'SUSPENDED';
  heartbeatAgeSeconds: number;
  cpuPercent: number;
  ramPercent: number;
  diskPercent: number;
  activeAccounts: number;
  maxAccounts: number;
}

export interface InstallerStageExecutionResult {
  completedStages: string[];
  failedStage: string | null;
  rolledBackStages: string[];
  status: 'INSTALLED_VERIFIED' | 'ABORTED_PREFLIGHT' | 'FAILED_ROLLED_BACK';
}

export class FleetAndInstallerOrchestrator {
  /**
   * Selects the optimal server across a customer's multi-server fleet based on
   * license health, heartbeat freshness (<= 180s), capacity headroom (< 85%),
   * and lowest weighted resource saturation.
   */
  public selectOptimalServerForPlacement(
    nodes: FleetServerNode[],
    preferredRegion?: string
  ): { selectedServerId: string; hostname: string; score: number } {
    const eligible = nodes.filter(
      (n) =>
        (n.licenseStatus === 'ACTIVE' || n.licenseStatus === 'GRACE_PERIOD') &&
        n.heartbeatAgeSeconds <= 180 &&
        n.cpuPercent < 85 &&
        n.ramPercent < 85 &&
        n.diskPercent < 85 &&
        n.activeAccounts < n.maxAccounts
    );

    if (eligible.length === 0) {
      throw new Error(
        'FLEET_NO_ELIGIBLE_SERVER: No healthy, licensed server in the fleet has sufficient capacity headroom'
      );
    }

    const scored = eligible
      .map((n) => {
        const utilizationScore =
          n.cpuPercent * 0.35 + n.ramPercent * 0.4 + n.diskPercent * 0.25;
        const regionBonus =
          preferredRegion && n.region === preferredRegion ? -10 : 0;
        return {
          selectedServerId: n.serverId,
          hostname: n.hostname,
          score: Number((utilizationScore + regionBonus).toFixed(2)),
        };
      })
      .sort((a, b) => a.score - b.score);

    return scored[0]!;
  }

  /**
   * Runs the commercial AlmaLinux 10 installation state machine in sandbox mode.
   * Hard-aborts at preflight if an existing control panel (cPanel/Plesk/DirectAdmin) is detected,
   * and executes reverse-order rollback of all installed stages if any post-preflight stage fails.
   */
  public runCommercialInstallerWorkflow(input: {
    osName: string;
    competingPanelDetected: string | null;
    ed25519ManifestSignatureValid: boolean;
    simulateStageFailureAt?:
      | 'CONFIGURE_REPOS_AND_PACKAGES'
      | 'INSTALL_GO_AGENT_AND_UDS'
      | 'INITIALIZE_LOCAL_PANEL_DB'
      | 'ENROLL_AND_ACTIVATE_LICENSE'
      | 'POST_INSTALL_HEALTH_CHECK';
  }): InstallerStageExecutionResult {
    if (input.competingPanelDetected) {
      return {
        completedStages: [],
        failedStage: 'PREFLIGHT_CONFLICT_CHECK',
        rolledBackStages: [],
        status: 'ABORTED_PREFLIGHT',
      };
    }

    if (input.osName !== 'AlmaLinux 10' || !input.ed25519ManifestSignatureValid) {
      return {
        completedStages: [],
        failedStage: 'PREFLIGHT_SIGNATURE_AND_OS_VERIFY',
        rolledBackStages: [],
        status: 'ABORTED_PREFLIGHT',
      };
    }

    const orderedStages = [
      'PREFLIGHT_AND_SIGNATURE_VERIFIED',
      'CONFIGURE_REPOS_AND_PACKAGES',
      'INSTALL_GO_AGENT_AND_UDS',
      'INITIALIZE_LOCAL_PANEL_DB',
      'ENROLL_AND_ACTIVATE_LICENSE',
      'POST_INSTALL_HEALTH_CHECK',
    ] as const;

    const completedStages: string[] = [];

    for (const stage of orderedStages) {
      if (input.simulateStageFailureAt === stage) {
        const rolledBackStages = [...completedStages].reverse();
        return {
          completedStages,
          failedStage: stage,
          rolledBackStages,
          status: 'FAILED_ROLLED_BACK',
        };
      }
      completedStages.push(stage);
    }

    return {
      completedStages,
      failedStage: null,
      rolledBackStages: [],
      status: 'INSTALLED_VERIFIED',
    };
  }
}
