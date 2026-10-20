import * as React from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  FileArchive,
  Upload,
  Download,
  Trash2,
  Edit3,
  KeyRound,
  Plus,
  FolderPlus,
  RefreshCw,
  Home,
  ArrowUp,
  Search,
  ShieldCheck,
  ShieldAlert,
  CheckSquare,
  Square,
  Copy,
  CornerUpRight,
  PackageOpen,
  Archive,
  Eye,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Lock,
} from 'lucide-react';
import {
  Button,
  Badge,
  Input,
  AnimatedContent,
  AuroraBackground,
  BlurText,
} from '@garvix/ui-components';

export interface CpanelFileNode {
  id: string;
  name: string;
  parentPath: string;
  isDirectory: boolean;
  sizeBytes: number;
  sizeLabel: string;
  lastModified: string;
  mimeType: string;
  perms: string; // e.g. '0755', '0644', '0600'
  scanStatus: 'CLEAN_VERIFIED' | 'QUARANTINED_BLOCKED';
  clamAvResult: string;
  yaraResult: string;
  wafResult: string;
  sha256: string;
  content?: string;
  previousPath?: string;
}

export interface NebulixFileManagerProps {
  activeDomain: string;
  activeLinuxUser: string;
  onShowToast: (msg: string) => void;
}

interface ChmodMatrixState {
  userR: boolean;
  userW: boolean;
  userX: boolean;
  groupR: boolean;
  groupW: boolean;
  groupX: boolean;
  worldR: boolean;
  worldW: boolean;
  worldX: boolean;
}

function parseOctalToMatrix(octal: string): ChmodMatrixState {
  const clean = octal.replace(/[^0-7]/g, '').padStart(4, '0').slice(-3);
  const u = parseInt(clean[0] ?? '6', 10);
  const g = parseInt(clean[1] ?? '4', 10);
  const w = parseInt(clean[2] ?? '4', 10);
  return {
    userR: (u & 4) !== 0,
    userW: (u & 2) !== 0,
    userX: (u & 1) !== 0,
    groupR: (g & 4) !== 0,
    groupW: (g & 2) !== 0,
    groupX: (g & 1) !== 0,
    worldR: (w & 4) !== 0,
    worldW: (w & 2) !== 0,
    worldX: (w & 1) !== 0,
  };
}

function matrixToOctal(m: ChmodMatrixState): string {
  const u = (m.userR ? 4 : 0) + (m.userW ? 2 : 0) + (m.userX ? 1 : 0);
  const g = (m.groupR ? 4 : 0) + (m.groupW ? 2 : 0) + (m.groupX ? 1 : 0);
  const w = (m.worldR ? 4 : 0) + (m.worldW ? 2 : 0) + (m.worldX ? 1 : 0);
  return `0${u}${g}${w}`;
}

function buildInitialFileSystem(user: string, domain: string): CpanelFileNode[] {
  const home = `/home/${user}`;
  return [
    // Root home directories
    {
      id: 'dir-public-html',
      name: 'public_html',
      parentPath: home,
      isDirectory: true,
      sizeBytes: 4096,
      sizeLabel: '4.0 KB',
      lastModified: 'Oct 20, 2026 12:30 PM',
      mimeType: 'httpd/unix-directory',
      perms: '0750',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: Clean Directory',
      yaraResult: 'YARA: Verified',
      wafResult: 'O_NOFOLLOW Confined',
      sha256: 'dir-inode-1001',
    },
    {
      id: 'dir-etc',
      name: 'etc',
      parentPath: home,
      isDirectory: true,
      sizeBytes: 4096,
      sizeLabel: '4.0 KB',
      lastModified: 'Oct 18, 2026 09:15 AM',
      mimeType: 'httpd/unix-directory',
      perms: '0750',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: Clean Directory',
      yaraResult: 'YARA: Verified',
      wafResult: 'O_NOFOLLOW Confined',
      sha256: 'dir-inode-1002',
    },
    {
      id: 'dir-logs',
      name: 'logs',
      parentPath: home,
      isDirectory: true,
      sizeBytes: 4096,
      sizeLabel: '4.0 KB',
      lastModified: 'Oct 20, 2026 01:10 PM',
      mimeType: 'httpd/unix-directory',
      perms: '0750',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: Clean Directory',
      yaraResult: 'YARA: Verified',
      wafResult: 'O_NOFOLLOW Confined',
      sha256: 'dir-inode-1003',
    },
    {
      id: 'dir-mail',
      name: 'mail',
      parentPath: home,
      isDirectory: true,
      sizeBytes: 4096,
      sizeLabel: '4.0 KB',
      lastModified: 'Oct 20, 2026 11:45 AM',
      mimeType: 'httpd/unix-directory',
      perms: '0700',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: Clean Maildir',
      yaraResult: 'YARA: Verified',
      wafResult: 'O_NOFOLLOW Confined',
      sha256: 'dir-inode-1004',
    },
    {
      id: 'dir-ssl',
      name: 'ssl',
      parentPath: home,
      isDirectory: true,
      sizeBytes: 4096,
      sizeLabel: '4.0 KB',
      lastModified: 'Oct 15, 2026 04:00 PM',
      mimeType: 'httpd/unix-directory',
      perms: '0700',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: Clean SSL Store',
      yaraResult: 'YARA: Verified',
      wafResult: 'O_NOFOLLOW Confined',
      sha256: 'dir-inode-1005',
    },
    {
      id: 'dir-tmp',
      name: 'tmp',
      parentPath: home,
      isDirectory: true,
      sizeBytes: 4096,
      sizeLabel: '4.0 KB',
      lastModified: 'Oct 20, 2026 08:00 AM',
      mimeType: 'httpd/unix-directory',
      perms: '0700',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: Clean Temp',
      yaraResult: 'YARA: Verified',
      wafResult: 'noexec Enforced',
      sha256: 'dir-inode-1006',
    },
    {
      id: 'file-env-root',
      name: '.env.production.enc',
      parentPath: home,
      isDirectory: false,
      sizeBytes: 4096,
      sizeLabel: '4.0 KB',
      lastModified: 'Oct 19, 2026 06:20 PM',
      mimeType: 'text/plain',
      perms: '0600',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: 0 Threats',
      yaraResult: 'YARA: AES-256-GCM Secret',
      wafResult: 'ModSecurity WAF: Protected',
      sha256: '94f1a08c2e11...8821',
      content: `# Garvix Encrypted Environment Envelope\nAPP_DOMAIN=${domain}\nAPP_ENV=production\nREDIS_SOCKET=/run/redis/${user}.sock\n`,
    },

    // Subfolders & files inside /home/<user>/public_html
    {
      id: 'dir-assets',
      name: 'assets',
      parentPath: `${home}/public_html`,
      isDirectory: true,
      sizeBytes: 4096,
      sizeLabel: '4.0 KB',
      lastModified: 'Oct 20, 2026 10:15 AM',
      mimeType: 'httpd/unix-directory',
      perms: '0755',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: Clean',
      yaraResult: 'YARA: Clean',
      wafResult: 'WAF: Verified',
      sha256: 'dir-inode-2001',
    },
    {
      id: 'dir-includes',
      name: 'includes',
      parentPath: `${home}/public_html`,
      isDirectory: true,
      sizeBytes: 4096,
      sizeLabel: '4.0 KB',
      lastModified: 'Oct 19, 2026 05:12 PM',
      mimeType: 'httpd/unix-directory',
      perms: '0755',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: Clean',
      yaraResult: 'YARA: Clean',
      wafResult: 'WAF: Verified',
      sha256: 'dir-inode-2002',
    },
    {
      id: 'dir-vendor',
      name: 'vendor',
      parentPath: `${home}/public_html`,
      isDirectory: true,
      sizeBytes: 4096,
      sizeLabel: '4.0 KB',
      lastModified: 'Oct 17, 2026 02:30 PM',
      mimeType: 'httpd/unix-directory',
      perms: '0755',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: Clean',
      yaraResult: 'YARA: Clean',
      wafResult: 'WAF: Verified',
      sha256: 'dir-inode-2003',
    },
    {
      id: 'file-htaccess',
      name: '.htaccess',
      parentPath: `${home}/public_html`,
      isDirectory: false,
      sizeBytes: 1840,
      sizeLabel: '1.8 KB',
      lastModified: 'Oct 20, 2026 09:40 AM',
      mimeType: 'text/x-generic',
      perms: '0644',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: 0 Threats',
      yaraResult: 'YARA: Clean Rewrite Rules',
      wafResult: 'ModSecurity WAF: HSTS Enabled',
      sha256: '7c21b904f81a...8821',
      content: `# Garvix Security & HTTPS Rewrite Rules\nRewriteEngine On\nRewriteCond %{HTTPS} !=on\nRewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\n\n# Block access to sensitive dotfiles\n<FilesMatch "^\\.(env|git)">\n  Require all denied\n</FilesMatch>\n`,
    },
    {
      id: 'file-index-php',
      name: 'index.php',
      parentPath: `${home}/public_html`,
      isDirectory: false,
      sizeBytes: 14540,
      sizeLabel: '14.2 KB',
      lastModified: 'Oct 20, 2026 12:18 PM',
      mimeType: 'application/x-httpd-php',
      perms: '0644',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: 0 Threats (Clean)',
      yaraResult: 'YARA: 0 Webshells / 0 Obfuscation',
      wafResult: 'ModSecurity WAF: Passed (PHP 8.3)',
      sha256: 'a94f82e1c09b...4410',
      content: `<?php\n/**\n * Primary Application Entrypoint (${domain})\n * Scanned & Verified by Garvix ClamAV + YARA + ModSecurity WAF\n */\ndeclare(strict_types=1);\n\nrequire __DIR__ . '/vendor/autoload.php';\n\n$response = [\n    'domain' => '${domain}',\n    'status' => 'HTTP/3 Online',\n    'php_version' => PHP_VERSION,\n];\n\nheader('Content-Type: application/json');\necho json_encode($response, JSON_PRETTY_PRINT);\n`,
    },
    {
      id: 'file-wp-config',
      name: 'wp-config.php',
      parentPath: `${home}/public_html`,
      isDirectory: false,
      sizeBytes: 3480,
      sizeLabel: '3.4 KB',
      lastModified: 'Oct 18, 2026 03:20 PM',
      mimeType: 'application/x-httpd-php',
      perms: '0600',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: 0 Threats (Clean)',
      yaraResult: 'YARA: Clean Database Config',
      wafResult: 'ModSecurity WAF: Protected (0600)',
      sha256: 'e310a771b94c...1920',
      content: `<?php\ndefine('DB_NAME', '${user}_app_prod');\ndefine('DB_USER', '${user}_app');\ndefine('DB_PASSWORD', '********');\ndefine('DB_HOST', '127.0.0.1:3306');\ndefine('DISALLOW_FILE_EDIT', true);\n`,
    },
    {
      id: 'file-robots',
      name: 'robots.txt',
      parentPath: `${home}/public_html`,
      isDirectory: false,
      sizeBytes: 420,
      sizeLabel: '420 B',
      lastModified: 'Oct 14, 2026 11:00 AM',
      mimeType: 'text/plain',
      perms: '0644',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: 0 Threats',
      yaraResult: 'YARA: Clean Text',
      wafResult: 'ModSecurity WAF: Passed',
      sha256: '1102a89c441e...0019',
      content: `User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\nSitemap: https://${domain}/sitemap.xml\n`,
    },
    {
      id: 'file-release-zip',
      name: 'frontend-release-v2.4.zip',
      parentPath: `${home}/public_html`,
      isDirectory: false,
      sizeBytes: 4928307,
      sizeLabel: '4.7 MB',
      lastModified: 'Oct 20, 2026 11:05 AM',
      mimeType: 'application/zip',
      perms: '0644',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: Archive Unpacked & 100% Clean',
      yaraResult: 'YARA: 0 Malicious Scripts Inside Archive',
      wafResult: 'ModSecurity WAF: ZIP Magic Bytes Valid',
      sha256: 'b829d103f44c...9012',
    },

    // Files inside /home/<user>/public_html/assets
    {
      id: 'file-style-css',
      name: 'nebulix-theme.min.css',
      parentPath: `${home}/public_html/assets`,
      isDirectory: false,
      sizeBytes: 48200,
      sizeLabel: '47.1 KB',
      lastModified: 'Oct 20, 2026 10:15 AM',
      mimeType: 'text/css',
      perms: '0644',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: Clean',
      yaraResult: 'YARA: Clean Stylesheet',
      wafResult: 'WAF: Verified',
      sha256: 'cc91820a331b...1120',
      content: `/* Garvix Nebulix Production Stylesheet */\n:root {\n  --bg-lavender: #F7F6FD;\n  --accent-indigo: #4F46E5;\n}\nbody {\n  background: var(--bg-lavender);\n}\n`,
    },

    // Files inside /home/<user>/logs
    {
      id: 'file-nginx-log',
      name: 'nginx-http3.access.log',
      parentPath: `${home}/logs`,
      isDirectory: false,
      sizeBytes: 148897792,
      sizeLabel: '142.0 MB',
      lastModified: 'Oct 20, 2026 01:45 PM',
      mimeType: 'text/x-log',
      perms: '0640',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: Clean Log',
      yaraResult: 'YARA: Clean',
      wafResult: 'WAF: Verified',
      sha256: '4491b820e12a...7741',
      content: `72.61.236.175 - - [20/Oct/2026:13:45:01 +0530] "GET / HTTP/3.0" 200 4821 "-" "Mozilla/5.0"\n72.61.236.175 - - [20/Oct/2026:13:45:04 +0530] "POST /api/v1/health HTTP/3.0" 200 128 "-" "GarvixAgent/1.0"\n`,
    },

    // Blocked Malware inside /home/<user>/quarantine
    {
      id: 'file-quarantined-shell',
      name: 'c99_webshell_exploit.php',
      parentPath: `${home}/quarantine`,
      isDirectory: false,
      sizeBytes: 70041,
      sizeLabel: '68.4 KB',
      lastModified: 'Oct 20, 2026 12:10 PM',
      mimeType: 'application/x-httpd-php',
      perms: '0000',
      scanStatus: 'QUARANTINED_BLOCKED',
      clamAvResult: 'ALERT: PHP.Trojan.WebShell-c99 Signature Matched!',
      yaraResult: 'CRITICAL: eval(base64_decode) + shell_exec() Backdoor',
      wafResult: 'BLOCKED: ModSecurity OWASP Rule #933150',
      sha256: 'ff09deadbeef...6619',
    },
  ];
}

export const NebulixFileManager: React.FC<NebulixFileManagerProps> = ({
  activeDomain,
  activeLinuxUser,
  onShowToast,
}) => {
  const homeRoot = `/home/${activeLinuxUser}`;
  const [files, setFiles] = React.useState<CpanelFileNode[]>(() =>
    buildInitialFileSystem(activeLinuxUser, activeDomain)
  );
  const [currentPath, setCurrentPath] = React.useState<string>(`${homeRoot}/public_html`);
  const [pathInput, setPathInput] = React.useState<string>(`${homeRoot}/public_html`);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [showDotfiles, setShowDotfiles] = React.useState<boolean>(true);
  const [publicHtmlExpanded, setPublicHtmlExpanded] = React.useState<boolean>(true);

  // Active Drawers / Popups inside File Manager
  const [activeToolDrawer, setActiveToolDrawer] = React.useState<
    | 'none'
    | 'upload-scanner'
    | 'new-file'
    | 'new-folder'
    | 'rename'
    | 'chmod'
    | 'code-editor'
    | 'copy-move'
  >('none');

  // Upload & 4-Layer Antivirus/Malware/WAF Scanner states
  const [isScanning, setIsScanning] = React.useState<boolean>(false);
  const [lastScannedNode, setLastScannedNode] = React.useState<CpanelFileNode | null>(null);
  const filePickerRef = React.useRef<HTMLInputElement | null>(null);

  // Form states for Toolbar actions
  const [newItemName, setNewItemName] = React.useState<string>('');
  const [renameTargetText, setRenameTargetText] = React.useState<string>('');
  const [copyMoveDestPath, setCopyMoveDestPath] = React.useState<string>(`${homeRoot}/public_html`);
  const [copyOrMoveMode, setCopyOrMoveMode] = React.useState<'copy' | 'move'>('copy');

  // Chmod Calculator state
  const [chmodMatrix, setChmodMatrix] = React.useState<ChmodMatrixState>(() =>
    parseOctalToMatrix('0644')
  );

  // Code Editor state
  const [editorTargetNode, setEditorTargetNode] = React.useState<CpanelFileNode | null>(null);
  const [editorText, setEditorText] = React.useState<string>('');

  // Keep path synced if user switches cPanel account via WHM
  React.useEffect(() => {
    const nextHome = `/home/${activeLinuxUser}`;
    setFiles(buildInitialFileSystem(activeLinuxUser, activeDomain));
    setCurrentPath(`${nextHome}/public_html`);
    setPathInput(`${nextHome}/public_html`);
    setSelectedIds([]);
    setActiveToolDrawer('none');
  }, [activeLinuxUser, activeDomain]);

  const navigateTo = (targetPath: string) => {
    setCurrentPath(targetPath);
    setPathInput(targetPath);
    setSelectedIds([]);
  };

  const navigateUp = () => {
    if (currentPath === homeRoot) return;
    const lastSlash = currentPath.lastIndexOf('/');
    const parent = lastSlash > 0 ? currentPath.slice(0, lastSlash) : homeRoot;
    navigateTo(parent.startsWith(homeRoot) ? parent : homeRoot);
  };

  // Visible files in current directory (or matching search)
  const visibleItems = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return files
      .filter((item) => {
        if (q) {
          return item.name.toLowerCase().includes(q);
        }
        return item.parentPath === currentPath;
      })
      .filter((item) => {
        if (!showDotfiles && item.name.startsWith('.')) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [files, currentPath, searchQuery, showDotfiles]);

  const selectedNodes = React.useMemo(
    () => files.filter((f) => selectedIds.includes(f.id)),
    [files, selectedIds]
  );
  const primarySelected = selectedNodes[0] ?? null;

  const quarantineCount = files.filter((f) => f.parentPath === `${homeRoot}/quarantine`).length;
  const trashCount = files.filter((f) => f.parentPath === `${homeRoot}/.trash`).length;

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(visibleItems.map((i) => i.id));
  };

  const handleUnselectAll = () => {
    setSelectedIds([]);
  };

  /* ------------------------------------------------------------------------
     4-STAGE CLAMAV + YARA + MODSECURITY WAF UPLOAD SCANNER
     ------------------------------------------------------------------------ */
  const executeFourLayerUploadScan = (
    fileName: string,
    byteSize: number,
    forceMalware = false
  ) => {
    setIsScanning(true);
    setActiveToolDrawer('upload-scanner');

    setTimeout(() => {
      const lower = fileName.toLowerCase();
      const isInfected =
        forceMalware ||
        lower.includes('virus') ||
        lower.includes('malware') ||
        lower.includes('shell') ||
        lower.includes('c99') ||
        lower.includes('r57') ||
        lower.includes('backdoor') ||
        lower.includes('exploit') ||
        lower.endsWith('.exe') ||
        lower.endsWith('.sh') ||
        lower.endsWith('.jpg.php');

      const kb = Math.max(1, Math.round(byteSize / 1024));
      const sizeLabel = kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb} KB`;
      const hashPrefix = Math.random().toString(16).slice(2, 10);
      const nowLabel = 'Oct 20, 2026 Just now';

      const newNode: CpanelFileNode = isInfected
        ? {
            id: `node-${Date.now()}`,
            name: fileName,
            parentPath: `${homeRoot}/quarantine`,
            isDirectory: false,
            sizeBytes: byteSize,
            sizeLabel,
            lastModified: nowLabel,
            mimeType: 'application/x-httpd-php',
            perms: '0000',
            scanStatus: 'QUARANTINED_BLOCKED',
            clamAvResult: 'BLOCKED: Trojan.PHP.WebShell / Virus Signature Matched',
            yaraResult: 'CRITICAL: Obfuscated eval(base64_decode) / shell_exec() Payload',
            wafResult: 'FIREWALL DROP: ModSecurity OWASP CRS Rule #933100',
            sha256: `${hashPrefix}deadbeef...9910`,
          }
        : {
            id: `node-${Date.now()}`,
            name: fileName,
            parentPath:
              currentPath.endsWith('/quarantine') || currentPath.endsWith('/.trash')
                ? `${homeRoot}/public_html`
                : currentPath,
            isDirectory: false,
            sizeBytes: byteSize,
            sizeLabel,
            lastModified: nowLabel,
            mimeType:
              lower.endsWith('.zip') || lower.endsWith('.tar.gz')
                ? 'application/zip'
                : lower.endsWith('.php')
                  ? 'application/x-httpd-php'
                  : lower.endsWith('.sql')
                    ? 'application/sql'
                    : lower.endsWith('.css')
                      ? 'text/css'
                      : 'text/plain',
            perms: '0644',
            scanStatus: 'CLEAN_VERIFIED',
            clamAvResult: 'ClamAV 1.3: 0 Viruses / 0 Trojans (100% Clean)',
            yaraResult: 'YARA Heuristics: 0 Webshells / 0 Backdoor Calls',
            wafResult: 'ModSecurity WAF: MIME & Magic-Bytes Verified Safe',
            sha256: `${hashPrefix}84a19c0d...71e2`,
            content: `// Scanned & Verified Clean by Garvix 4-Layer Security Pipeline\n// File: ${fileName} (${sizeLabel})\n`,
          };

      setFiles((prev) => [newNode, ...prev]);
      setLastScannedNode(newNode);
      setIsScanning(false);

      if (isInfected) {
        onShowToast(
          `SECURITY BLOCK: "${fileName}" failed Antivirus/YARA/WAF checks and was isolated in ${homeRoot}/quarantine!`
        );
      } else {
        onShowToast(
          `UPLOAD CLEAN: "${fileName}" passed ClamAV, YARA & WAF scans and was saved to ${newNode.parentPath}.`
        );
      }
    }, 400);
  };

  const handleBrowserFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const picked = fileList[0]!;
    executeFourLayerUploadScan(picked.name, picked.size || 24576, false);
    e.target.value = '';
  };

  /* ------------------------------------------------------------------------
     cPANEL TOOLBAR HANDLERS (+File, +Folder, Rename, Delete, Restore, Chmod, Edit, Extract, Compress)
     ------------------------------------------------------------------------ */
  const handleCreateNewItem = (isDir: boolean) => {
    const clean = newItemName.trim().replace(/[/\\]/g, '');
    if (!clean) return;
    const newNode: CpanelFileNode = {
      id: `item-${Date.now()}`,
      name: clean,
      parentPath: currentPath,
      isDirectory: isDir,
      sizeBytes: isDir ? 4096 : 512,
      sizeLabel: isDir ? '4.0 KB' : '512 B',
      lastModified: 'Oct 20, 2026 Just now',
      mimeType: isDir
        ? 'httpd/unix-directory'
        : clean.endsWith('.php')
          ? 'application/x-httpd-php'
          : 'text/plain',
      perms: isDir ? '0755' : '0644',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: Clean',
      yaraResult: 'YARA: Verified Clean',
      wafResult: 'O_NOFOLLOW Verified',
      sha256: 'new-inode-verified',
      content: isDir ? undefined : `<?php\n// Created in Garvix cPanel File Manager: ${clean}\n`,
    };
    setFiles((prev) => [newNode, ...prev]);
    setNewItemName('');
    setActiveToolDrawer('none');
    onShowToast(
      `Created ${isDir ? 'directory' : 'file'} "${clean}" in ${currentPath} (chmod ${newNode.perms}).`
    );
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const inTrashOrQuarantine =
      currentPath.endsWith('/.trash') || currentPath.endsWith('/quarantine');

    if (inTrashOrQuarantine) {
      setFiles((prev) => prev.filter((f) => !selectedIds.includes(f.id)));
      onShowToast(`Permanently deleted ${selectedIds.length} item(s) from disk.`);
    } else {
      setFiles((prev) =>
        prev.map((f) =>
          selectedIds.includes(f.id)
            ? { ...f, previousPath: f.parentPath, parentPath: `${homeRoot}/.trash` }
            : f
        )
      );
      onShowToast(`Moved ${selectedIds.length} item(s) to Recycle Bin (${homeRoot}/.trash).`);
    }
    setSelectedIds([]);
  };

  const handleRestoreSelected = () => {
    if (selectedIds.length === 0) return;
    setFiles((prev) =>
      prev.map((f) =>
        selectedIds.includes(f.id)
          ? { ...f, parentPath: f.previousPath ?? `${homeRoot}/public_html` }
          : f
      )
    );
    onShowToast(`Restored ${selectedIds.length} item(s) from Trash.`);
    setSelectedIds([]);
  };

  const handleOpenChmod = (target?: CpanelFileNode) => {
    const node = target ?? primarySelected;
    if (!node) {
      onShowToast('Select a file or folder first to change permissions (chmod).');
      return;
    }
    setSelectedIds([node.id]);
    setChmodMatrix(parseOctalToMatrix(node.perms));
    setActiveToolDrawer('chmod');
  };

  const handleSaveChmod = () => {
    const newOctal = matrixToOctal(chmodMatrix);
    setFiles((prev) =>
      prev.map((f) => (selectedIds.includes(f.id) ? { ...f, perms: newOctal } : f))
    );
    setActiveToolDrawer('none');
    onShowToast(`Updated permissions to chmod ${newOctal} via Go Agent O_NOFOLLOW.`);
  };

  const handleOpenCodeEditor = (target?: CpanelFileNode) => {
    const node = target ?? primarySelected;
    if (!node || node.isDirectory) {
      onShowToast('Select an editable file (.php, .htaccess, .css, .txt, .log) to open Code Editor.');
      return;
    }
    if (node.scanStatus === 'QUARANTINED_BLOCKED') {
      onShowToast('Cannot open quarantined malware in Code Editor. Delete it permanently.');
      return;
    }
    setEditorTargetNode(node);
    setEditorText(
      node.content ?? `// File: ${node.parentPath}/${node.name}\n// MIME: ${node.mimeType}\n`
    );
    setActiveToolDrawer('code-editor');
  };

  const handleSaveCodeEditor = () => {
    if (!editorTargetNode) return;
    const lowerCode = editorText.toLowerCase();
    if (
      lowerCode.includes('eval(base64_decode') ||
      lowerCode.includes('shell_exec(') ||
      lowerCode.includes('passthru(')
    ) {
      onShowToast(
        'YARA & WAF BLOCK: Malicious backdoor function (eval/shell_exec) detected in code! Save rejected.'
      );
      return;
    }
    setFiles((prev) =>
      prev.map((f) => (f.id === editorTargetNode.id ? { ...f, content: editorText } : f))
    );
    setActiveToolDrawer('none');
    onShowToast(
      `Saved "${editorTargetNode.name}" (UTF-8) — Verified clean by YARA & ModSecurity WAF.`
    );
  };

  const handleExtractArchive = (target?: CpanelFileNode) => {
    const node = target ?? primarySelected;
    if (!node || !node.name.toLowerCase().endsWith('.zip')) {
      onShowToast('Select a .zip archive first to extract its files.');
      return;
    }
    const baseName = node.name.replace(/\.zip$/i, '');
    const extractedFolder: CpanelFileNode = {
      id: `ext-dir-${Date.now()}`,
      name: `${baseName}-extracted`,
      parentPath: currentPath,
      isDirectory: true,
      sizeBytes: 4096,
      sizeLabel: '4.0 KB',
      lastModified: 'Oct 20, 2026 Just now',
      mimeType: 'httpd/unix-directory',
      perms: '0755',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: Extracted Files Verified Clean',
      yaraResult: 'YARA: Clean',
      wafResult: 'WAF: Verified',
      sha256: 'extracted-inode-clean',
    };
    const extractedIndex: CpanelFileNode = {
      id: `ext-file-${Date.now() + 1}`,
      name: `${baseName}-manifest.json`,
      parentPath: currentPath,
      isDirectory: false,
      sizeBytes: 2048,
      sizeLabel: '2.0 KB',
      lastModified: 'Oct 20, 2026 Just now',
      mimeType: 'application/json',
      perms: '0644',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: 0 Threats',
      yaraResult: 'YARA: Clean JSON',
      wafResult: 'WAF: Verified',
      sha256: 'manifest-sha256-clean',
      content: `{\n  "archive": "${node.name}",\n  "extractedTo": "${currentPath}",\n  "clamavScan": "PASSED"\n}\n`,
    };
    setFiles((prev) => [extractedFolder, extractedIndex, ...prev]);
    onShowToast(
      `Extracted "${node.name}" into ${currentPath} after ClamAV archive verification.`
    );
  };

  const handleCompressSelected = () => {
    if (selectedIds.length === 0) {
      onShowToast('Select one or more files/folders to compress into a .zip archive.');
      return;
    }
    const zipName = `backup-archive-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.zip`;
    const zipNode: CpanelFileNode = {
      id: `zip-${Date.now()}`,
      name: zipName,
      parentPath: currentPath,
      isDirectory: false,
      sizeBytes: 1245184,
      sizeLabel: '1.2 MB',
      lastModified: 'Oct 20, 2026 Just now',
      mimeType: 'application/zip',
      perms: '0644',
      scanStatus: 'CLEAN_VERIFIED',
      clamAvResult: 'ClamAV: Clean Archive Created',
      yaraResult: 'YARA: Clean',
      wafResult: 'WAF: Verified',
      sha256: 'compressed-zip-verified',
    };
    setFiles((prev) => [zipNode, ...prev]);
    setSelectedIds([zipNode.id]);
    onShowToast(`Compressed ${selectedIds.length} item(s) into "${zipName}".`);
  };

  // Breadcrumb segments
  const breadcrumbs = React.useMemo(() => {
    const relative = currentPath.startsWith(homeRoot)
      ? currentPath.slice(homeRoot.length)
      : '';
    const parts = relative.split('/').filter(Boolean);
    const items: Array<{ label: string; fullPath: string }> = [
      { label: `/home/${activeLinuxUser}`, fullPath: homeRoot },
    ];
    let acc = homeRoot;
    for (const part of parts) {
      acc = `${acc}/${part}`;
      items.push({ label: part, fullPath: acc });
    }
    return items;
  }, [currentPath, homeRoot, activeLinuxUser]);

  return (
    <AnimatedContent className="space-y-5">
      {/* Hidden Browser File Input */}
      <input
        ref={filePickerRef}
        type="file"
        multiple
        onChange={handleBrowserFileUpload}
        className="hidden"
      />

      {/* Top Banner */}
      <AuroraBackground className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="orange">cPANEL FILE MANAGER · PORT 2083</Badge>
              <Badge variant="success">
                ClamAV 1.3 + YARA Webshell + ModSecurity WAF Active
              </Badge>
            </div>
            <h1 className="mt-1.5 font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
              <BlurText text={`File Manager — ${activeDomain} (/home/${activeLinuxUser})`} />
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setActiveToolDrawer('upload-scanner');
                filePickerRef.current?.click();
              }}
            >
              <Upload className="h-4 w-4" /> Upload &amp; Scan Files
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => executeFourLayerUploadScan('c99_backdoor_shell.php', 49152, true)}
              className="border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-rose-600" /> Test Virus/Webshell Upload
            </Button>
          </div>
        </div>
      </AuroraBackground>

      {/* ====================================================================
          ROW 1: REAL cPANEL TOP ACTION TOOLBAR
         ==================================================================== */}
      <div className="rounded-2xl border border-indigo-100/90 bg-white p-3 shadow-[0_8px_24px_-12px_rgba(99,102,241,0.12)]">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setNewItemName('new-page.php');
              setActiveToolDrawer(activeToolDrawer === 'new-file' ? 'none' : 'new-file');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-[#FAF9FE] px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800"
          >
            <Plus className="h-3.5 w-3.5 text-indigo-600" /> + File
          </button>

          <button
            type="button"
            onClick={() => {
              setNewItemName('new-folder');
              setActiveToolDrawer(activeToolDrawer === 'new-folder' ? 'none' : 'new-folder');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-[#FAF9FE] px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800"
          >
            <FolderPlus className="h-3.5 w-3.5 text-indigo-600" /> + Folder
          </button>

          <div className="mx-1 hidden h-6 w-px bg-indigo-100 sm:block" />

          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => {
              setCopyOrMoveMode('copy');
              setCopyMoveDestPath(`${homeRoot}/public_html`);
              setActiveToolDrawer('copy-move');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-[#FAF9FE] px-2.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-indigo-50 disabled:opacity-45"
          >
            <Copy className="h-3.5 w-3.5 text-indigo-600" /> Copy
          </button>

          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => {
              setCopyOrMoveMode('move');
              setCopyMoveDestPath(`${homeRoot}/public_html`);
              setActiveToolDrawer('copy-move');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-[#FAF9FE] px-2.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-indigo-50 disabled:opacity-45"
          >
            <CornerUpRight className="h-3.5 w-3.5 text-indigo-600" /> Move
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveToolDrawer(
                activeToolDrawer === 'upload-scanner' ? 'none' : 'upload-scanner'
              )
            }
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:opacity-95"
          >
            <Upload className="h-3.5 w-3.5" /> Upload
          </button>

          <button
            type="button"
            disabled={!primarySelected || primarySelected.isDirectory}
            onClick={() => {
              if (!primarySelected) return;
              onShowToast(
                `Downloaded "${primarySelected.name}" (${primarySelected.sizeLabel}) over HTTPS.`
              );
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-[#FAF9FE] px-2.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-indigo-50 disabled:opacity-45"
          >
            <Download className="h-3.5 w-3.5 text-indigo-600" /> Download
          </button>

          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={handleDeleteSelected}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/60 px-2.5 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-45"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-600" /> Delete
          </button>

          {currentPath.endsWith('/.trash') && (
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={handleRestoreSelected}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-45"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restore
            </button>
          )}

          <div className="mx-1 hidden h-6 w-px bg-indigo-100 sm:block" />

          <button
            type="button"
            disabled={!primarySelected}
            onClick={() => {
              if (!primarySelected) return;
              setRenameTargetText(primarySelected.name);
              setActiveToolDrawer('rename');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-[#FAF9FE] px-2.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-indigo-50 disabled:opacity-45"
          >
            <Edit3 className="h-3.5 w-3.5 text-indigo-600" /> Rename
          </button>

          <button
            type="button"
            disabled={!primarySelected || primarySelected.isDirectory}
            onClick={() => handleOpenCodeEditor()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-[#FAF9FE] px-2.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-indigo-50 disabled:opacity-45"
          >
            <FileCode className="h-3.5 w-3.5 text-indigo-600" /> Code Editor
          </button>

          <button
            type="button"
            disabled={!primarySelected}
            onClick={() => handleOpenChmod()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-[#FAF9FE] px-2.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-indigo-50 disabled:opacity-45"
          >
            <KeyRound className="h-3.5 w-3.5 text-indigo-600" /> Permissions
          </button>

          <div className="mx-1 hidden h-6 w-px bg-indigo-100 sm:block" />

          <button
            type="button"
            disabled={!primarySelected || !primarySelected.name.toLowerCase().endsWith('.zip')}
            onClick={() => handleExtractArchive()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-[#FAF9FE] px-2.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-indigo-50 disabled:opacity-45"
          >
            <PackageOpen className="h-3.5 w-3.5 text-indigo-600" /> Extract
          </button>

          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={handleCompressSelected}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-[#FAF9FE] px-2.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-indigo-50 disabled:opacity-45"
          >
            <Archive className="h-3.5 w-3.5 text-indigo-600" /> Compress
          </button>
        </div>
      </div>

      {/* ====================================================================
          DYNAMIC ACTION DRAWERS (UPLOAD SCANNER / NEW FILE / NEW FOLDER / RENAME / CHMOD / CODE EDITOR)
         ==================================================================== */}
      {activeToolDrawer === 'upload-scanner' && (
        <div className="rounded-2xl border-2 border-indigo-200 bg-white p-5 shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3">
            <div>
              <h3 className="font-display text-sm font-extrabold text-slate-900">
                Upload Files to `{currentPath}` — 4-Stage Security &amp; Antivirus Pipeline
              </h3>
              <p className="text-xs text-slate-500">
                Every uploaded file is scanned in an isolated buffer by **ClamAV**, **YARA Webshell
                Detector**, and **ModSecurity WAF** before touching your folder.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setActiveToolDrawer('none')}>
              Close Uploader
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            {/* Drag & Drop Box */}
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-300 bg-[#F7F6FD] p-6 text-center lg:col-span-5">
              <Upload className="h-8 w-8 text-indigo-600" />
              <div className="mt-2 font-display text-sm font-bold text-slate-900">
                Select or Drop Files to Scan &amp; Upload
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Maximum upload size: 512 MB · Archives (`.zip`, `.tar.gz`) are unpacked &amp;
                scanned inside sandbox.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button
                  size="sm"
                  disabled={isScanning}
                  onClick={() => filePickerRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" /> Browse Computer Files
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isScanning}
                  onClick={() =>
                    executeFourLayerUploadScan('landing-page-v4.zip', 3565158, false)
                  }
                >
                  Simulate Clean `.zip`
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isScanning}
                  onClick={() =>
                    executeFourLayerUploadScan('r57_backdoor_virus.php', 54200, true)
                  }
                  className="border-rose-200 text-rose-700 hover:bg-rose-50"
                >
                  Test Virus/Malware File
                </Button>
              </div>
            </div>

            {/* 4-Stage Live Security Gates */}
            <div className="grid gap-2.5 sm:grid-cols-2 lg:col-span-7">
              {[
                {
                  stage: '1. CLAMAV ANTIVIRUS ENGINE',
                  detail: 'Scans against 8.9M+ virus, trojan & ransomware signatures.',
                  badge: 'clamd 1.3 Active',
                },
                {
                  stage: '2. YARA WEBSHELL HEURISTICS',
                  detail: 'Blocks eval(base64_decode), shell_exec(), passthru(), c99/r57 shells.',
                  badge: 'Heuristic Guard',
                },
                {
                  stage: '3. MODSECURITY OWASP WAF',
                  detail: 'Inspects file magic bytes to prevent .jpg.php double-extension spoofing.',
                  badge: 'CRS 4.0 Level 2',
                },
                {
                  stage: '4. GO AGENT SANDBOX (O_NOFOLLOW)',
                  detail: 'Prevents symlink escapes and enforces non-executable chmod 0644.',
                  badge: 'UID Confined',
                },
              ].map((g) => (
                <div
                  key={g.stage}
                  className="rounded-xl border border-indigo-100 bg-[#FAF9FE] p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-extrabold text-indigo-700">
                      {g.stage}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> {g.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600">{g.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {lastScannedNode && (
            <div
              className={`rounded-xl border p-3.5 text-xs ${
                lastScannedNode.scanStatus === 'QUARANTINED_BLOCKED'
                  ? 'border-rose-300 bg-rose-50 text-rose-950'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-950'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
                <span className="flex items-center gap-2">
                  {lastScannedNode.scanStatus === 'QUARANTINED_BLOCKED' ? (
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  )}
                  {lastScannedNode.scanStatus === 'QUARANTINED_BLOCKED'
                    ? `MALWARE BLOCKED & QUARANTINED: "${lastScannedNode.name}"`
                    : `FILE VERIFIED CLEAN & SAVED: "${lastScannedNode.name}"`}
                </span>
                <span className="font-mono text-[11px]">SHA-256: {lastScannedNode.sha256}</span>
              </div>
              <div className="mt-1.5 grid gap-2 sm:grid-cols-3 font-mono text-[11px]">
                <div>• {lastScannedNode.clamAvResult}</div>
                <div>• {lastScannedNode.yaraResult}</div>
                <div>• {lastScannedNode.wafResult}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {(activeToolDrawer === 'new-file' || activeToolDrawer === 'new-folder') && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            {activeToolDrawer === 'new-folder' ? (
              <FolderPlus className="h-4 w-4 text-indigo-600" />
            ) : (
              <Plus className="h-4 w-4 text-indigo-600" />
            )}
            <span>
              Create New {activeToolDrawer === 'new-folder' ? 'Folder' : 'File'} in `{currentPath}/`
            </span>
          </div>
          <div className="flex flex-1 max-w-md items-center gap-2">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={
                activeToolDrawer === 'new-folder' ? 'e.g. uploads' : 'e.g. contact.php'
              }
            />
            <Button
              size="sm"
              onClick={() => handleCreateNewItem(activeToolDrawer === 'new-folder')}
            >
              Create Now
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveToolDrawer('none')}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {activeToolDrawer === 'rename' && primarySelected && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-800">
            Rename `{primarySelected.name}`:
          </div>
          <div className="flex flex-1 max-w-md items-center gap-2">
            <Input
              value={renameTargetText}
              onChange={(e) => setRenameTargetText(e.target.value)}
            />
            <Button
              size="sm"
              onClick={() => {
                const clean = renameTargetText.trim().replace(/[/\\]/g, '');
                if (!clean) return;
                setFiles((prev) =>
                  prev.map((f) => (f.id === primarySelected.id ? { ...f, name: clean } : f))
                );
                setActiveToolDrawer('none');
                onShowToast(`Renamed "${primarySelected.name}" to "${clean}".`);
              }}
            >
              Save Name
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveToolDrawer('none')}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {activeToolDrawer === 'copy-move' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-800">
            {copyOrMoveMode === 'copy' ? 'Copy' : 'Move'} {selectedIds.length} selected item(s) to
            destination path:
          </div>
          <div className="flex flex-1 max-w-lg items-center gap-2">
            <Input
              value={copyMoveDestPath}
              onChange={(e) => setCopyMoveDestPath(e.target.value)}
            />
            <Button
              size="sm"
              onClick={() => {
                const target = copyMoveDestPath.trim() || `${homeRoot}/public_html`;
                if (copyOrMoveMode === 'move') {
                  setFiles((prev) =>
                    prev.map((f) =>
                      selectedIds.includes(f.id) ? { ...f, parentPath: target } : f
                    )
                  );
                  onShowToast(`Moved ${selectedIds.length} item(s) to ${target}.`);
                } else {
                  const copies: CpanelFileNode[] = selectedNodes.map((n, i) => ({
                    ...n,
                    id: `copy-${Date.now()}-${i}`,
                    name: n.parentPath === target ? `copy-of-${n.name}` : n.name,
                    parentPath: target,
                  }));
                  setFiles((prev) => [...copies, ...prev]);
                  onShowToast(`Copied ${selectedIds.length} item(s) to ${target}.`);
                }
                setActiveToolDrawer('none');
              }}
            >
              {copyOrMoveMode === 'copy' ? 'Copy Files' : 'Move Files'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveToolDrawer('none')}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* cPANEL-STYLE CHANGE PERMISSIONS (CHMOD) CALCULATOR */}
      {activeToolDrawer === 'chmod' && primarySelected && (
        <div className="rounded-2xl border-2 border-indigo-200 bg-white p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-indigo-600" />
              <h3 className="font-display text-sm font-extrabold text-slate-900">
                Change Permissions (`chmod`) — `{primarySelected.name}`
              </h3>
            </div>
            <Badge variant="default">Octal Mode: {matrixToOctal(chmodMatrix)}</Badge>
          </div>

          <div className="overflow-x-auto rounded-xl border border-indigo-100">
            <table className="w-full text-center text-xs">
              <thead className="bg-[#F7F6FD] font-bold text-indigo-950">
                <tr>
                  <th className="px-4 py-2.5 text-left">Permission Bit</th>
                  <th className="px-4 py-2.5">User (Owner)</th>
                  <th className="px-4 py-2.5">Group</th>
                  <th className="px-4 py-2.5">World (Public)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50">
                <tr>
                  <td className="px-4 py-2.5 text-left font-bold text-slate-700">Read (4)</td>
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={chmodMatrix.userR}
                      onChange={(e) =>
                        setChmodMatrix((m) => ({ ...m, userR: e.target.checked }))
                      }
                      className="h-4 w-4 accent-indigo-600"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={chmodMatrix.groupR}
                      onChange={(e) =>
                        setChmodMatrix((m) => ({ ...m, groupR: e.target.checked }))
                      }
                      className="h-4 w-4 accent-indigo-600"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={chmodMatrix.worldR}
                      onChange={(e) =>
                        setChmodMatrix((m) => ({ ...m, worldR: e.target.checked }))
                      }
                      className="h-4 w-4 accent-indigo-600"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-left font-bold text-slate-700">Write (2)</td>
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={chmodMatrix.userW}
                      onChange={(e) =>
                        setChmodMatrix((m) => ({ ...m, userW: e.target.checked }))
                      }
                      className="h-4 w-4 accent-indigo-600"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={chmodMatrix.groupW}
                      onChange={(e) =>
                        setChmodMatrix((m) => ({ ...m, groupW: e.target.checked }))
                      }
                      className="h-4 w-4 accent-indigo-600"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={chmodMatrix.worldW}
                      onChange={(e) =>
                        setChmodMatrix((m) => ({ ...m, worldW: e.target.checked }))
                      }
                      className="h-4 w-4 accent-indigo-600"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-left font-bold text-slate-700">Execute (1)</td>
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={chmodMatrix.userX}
                      onChange={(e) =>
                        setChmodMatrix((m) => ({ ...m, userX: e.target.checked }))
                      }
                      className="h-4 w-4 accent-indigo-600"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={chmodMatrix.groupX}
                      onChange={(e) =>
                        setChmodMatrix((m) => ({ ...m, groupX: e.target.checked }))
                      }
                      className="h-4 w-4 accent-indigo-600"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={chmodMatrix.worldX}
                      onChange={(e) =>
                        setChmodMatrix((m) => ({ ...m, worldX: e.target.checked }))
                      }
                      className="h-4 w-4 accent-indigo-600"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="font-mono text-xs font-bold text-indigo-700">
              Calculated Permission: {matrixToOctal(chmodMatrix)}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setActiveToolDrawer('none')}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveChmod}>
                Save Permissions ({matrixToOctal(chmodMatrix)})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* cPANEL CODE EDITOR WITH LINE NUMBERS & YARA MALWARE CHECK */}
      {activeToolDrawer === 'code-editor' && editorTargetNode && (
        <div className="rounded-2xl border-2 border-indigo-200 bg-slate-950 p-5 text-white shadow-lg space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <FileCode className="h-5 w-5 text-indigo-400" />
              <div>
                <div className="font-mono text-xs font-bold text-white">
                  {editorTargetNode.parentPath}/{editorTargetNode.name}
                </div>
                <div className="text-[11px] text-slate-400">
                  Encoding: UTF-8 · chmod {editorTargetNode.perms} · YARA Real-Time Malware Check
                  On Save
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setActiveToolDrawer('none')}>
                Close Editor
              </Button>
              <Button size="sm" onClick={handleSaveCodeEditor}>
                Save &amp; Scan Changes
              </Button>
            </div>
          </div>
          <textarea
            rows={9}
            value={editorText}
            onChange={(e) => setEditorText(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-emerald-300 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}

      {/* ====================================================================
          ROW 2: cPANEL PATH NAVIGATION BAR & QUICK CONTROLS
         ==================================================================== */}
      <div className="rounded-2xl border border-indigo-100/90 bg-white p-3.5 shadow-[0_8px_24px_-12px_rgba(99,102,241,0.10)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Path Input + Go */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const clean = pathInput.trim();
              if (clean.startsWith(homeRoot)) {
                navigateTo(clean);
              } else {
                onShowToast(`Sandbox Confinement: Path must stay inside ${homeRoot}`);
                setPathInput(currentPath);
              }
            }}
            className="flex flex-1 min-w-[260px] items-center gap-2"
          >
            <span className="rounded-xl bg-indigo-50 px-2.5 py-2 font-mono text-xs font-bold text-indigo-700">
              Location
            </span>
            <Input
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              className="font-mono text-xs"
            />
            <Button type="submit" size="sm" variant="outline">
              Go
            </Button>
          </form>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files in /home..."
              className="h-9 w-full rounded-xl border border-indigo-100 bg-[#FAF9FE] pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Navigation Control Strip (Home, Up One Level, Select All, Unselect All, Trash, Quarantine, Dotfiles) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-indigo-50 pt-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigateTo(homeRoot)}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-[#FAF9FE] px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-indigo-50"
            >
              <Home className="h-3.5 w-3.5 text-indigo-600" /> Home
            </button>
            <button
              type="button"
              disabled={currentPath === homeRoot}
              onClick={navigateUp}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-[#FAF9FE] px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-indigo-50 disabled:opacity-40"
            >
              <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> Up One Level
            </button>
            <button
              type="button"
              onClick={() => onShowToast(`Refreshed directory listing for ${currentPath}`)}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-[#FAF9FE] px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-indigo-50"
            >
              <RefreshCw className="h-3.5 w-3.5 text-indigo-600" /> Reload
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-[#FAF9FE] px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-indigo-50"
            >
              <CheckSquare className="h-3.5 w-3.5 text-indigo-600" /> Select All
            </button>
            <button
              type="button"
              onClick={handleUnselectAll}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-[#FAF9FE] px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-indigo-50"
            >
              <Square className="h-3.5 w-3.5 text-slate-500" /> Unselect All
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigateTo(`${homeRoot}/quarantine`)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 font-bold ${
                currentPath.endsWith('/quarantine')
                  ? 'border-rose-600 bg-rose-600 text-white'
                  : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" /> Quarantine ({quarantineCount})
            </button>

            <button
              type="button"
              onClick={() => navigateTo(`${homeRoot}/.trash`)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 font-bold ${
                currentPath.endsWith('/.trash')
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-indigo-100 bg-[#FAF9FE] text-slate-700 hover:bg-indigo-50'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" /> View Trash ({trashCount})
            </button>

            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-indigo-100 bg-[#FAF9FE] px-2.5 py-1.5 font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={showDotfiles}
                onChange={(e) => setShowDotfiles(e.target.checked)}
                className="h-3.5 w-3.5 accent-indigo-600"
              />
              <Eye className="h-3.5 w-3.5 text-indigo-600" /> Show Hidden Files (dotfiles)
            </label>
          </div>
        </div>
      </div>

      {/* ====================================================================
          ROW 3: 2-PANE SPLIT VIEW (LEFT DIRECTORY TREE + RIGHT FILE TABLE)
         ==================================================================== */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* LEFT PANE: EXPANDABLE DIRECTORY TREE */}
        <div className="rounded-2xl border border-indigo-100/90 bg-white p-4 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)] lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-50 pb-2.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Directory Tree
            </span>
            <Badge variant="default">O_NOFOLLOW</Badge>
          </div>

          <div className="space-y-1 text-xs">
            {/* Root /home/<user> */}
            <button
              type="button"
              onClick={() => navigateTo(homeRoot)}
              className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left font-mono font-bold transition ${
                currentPath === homeRoot
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs'
                  : 'text-slate-800 hover:bg-indigo-50'
              }`}
            >
              <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="truncate">/home/{activeLinuxUser}</span>
            </button>

            {/* Indented Tree Folders */}
            <div className="ml-3 border-l border-indigo-100 pl-2 space-y-1">
              {/* public_html with expandable subfolders */}
              <div>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setPublicHtmlExpanded((v) => !v)}
                    className="p-1 text-slate-400 hover:text-indigo-700"
                  >
                    {publicHtmlExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo(`${homeRoot}/public_html`)}
                    className={`flex flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-left font-mono font-bold transition ${
                      currentPath === `${homeRoot}/public_html`
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-indigo-50'
                    }`}
                  >
                    <FolderOpen className="h-4 w-4 shrink-0 text-indigo-500" />
                    <span>public_html</span>
                  </button>
                </div>

                {publicHtmlExpanded && (
                  <div className="ml-5 mt-1 border-l border-indigo-100 pl-2 space-y-1">
                    {['assets', 'includes', 'vendor'].map((sub) => {
                      const subPath = `${homeRoot}/public_html/${sub}`;
                      const active = currentPath === subPath;
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => navigateTo(subPath)}
                          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-[11px] font-semibold transition ${
                            active
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-600 hover:bg-indigo-50'
                          }`}
                        >
                          <Folder className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                          <span>{sub}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Standard Home Directories */}
              {[
                { name: 'etc', path: `${homeRoot}/etc` },
                { name: 'logs', path: `${homeRoot}/logs` },
                { name: 'mail', path: `${homeRoot}/mail` },
                { name: 'ssl', path: `${homeRoot}/ssl` },
                { name: 'tmp', path: `${homeRoot}/tmp` },
              ].map((folder) => {
                const active = currentPath === folder.path;
                return (
                  <button
                    key={folder.path}
                    type="button"
                    onClick={() => navigateTo(folder.path)}
                    className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left font-mono font-semibold transition ${
                      active
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-indigo-50'
                    }`}
                  >
                    <Folder className="h-4 w-4 shrink-0 text-indigo-400" />
                    <span>{folder.name}</span>
                  </button>
                );
              })}

              {/* Quarantine Folder */}
              <button
                type="button"
                onClick={() => navigateTo(`${homeRoot}/quarantine`)}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left font-mono font-bold transition ${
                  currentPath === `${homeRoot}/quarantine`
                    ? 'bg-rose-600 text-white'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>quarantine</span>
                </span>
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-800">
                  {quarantineCount}
                </span>
              </button>

              {/* Trash Folder */}
              <button
                type="button"
                onClick={() => navigateTo(`${homeRoot}/.trash`)}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left font-mono font-semibold transition ${
                  currentPath === `${homeRoot}/.trash`
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 shrink-0" />
                  <span>.trash</span>
                </span>
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700">
                  {trashCount}
                </span>
              </button>
            </div>
          </div>

          {/* Left Pane Security Shield Summary */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-[11px] text-emerald-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Real-Time Upload Firewall
            </div>
            <p className="text-[10px] text-emerald-700 leading-relaxed">
              ClamAV + YARA + ModSecurity WAF automatically scans every upload &amp; code edit
              inside `/home/{activeLinuxUser}`.
            </p>
          </div>
        </div>

        {/* RIGHT PANE: DETAILED cPANEL FILE TABLE */}
        <div className="rounded-2xl border border-indigo-100/90 bg-white shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)] lg:col-span-9 overflow-hidden flex flex-col">
          {/* Breadcrumb Header inside Right Pane */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 bg-[#FAF9FE] px-4 py-3 text-xs">
            <div className="flex flex-wrap items-center gap-1 font-mono">
              {breadcrumbs.map((bc, idx) => (
                <React.Fragment key={bc.fullPath}>
                  {idx > 0 && <span className="text-slate-400">/</span>}
                  <button
                    type="button"
                    onClick={() => navigateTo(bc.fullPath)}
                    className={`rounded-md px-1.5 py-0.5 font-bold hover:bg-indigo-100 ${
                      idx === breadcrumbs.length - 1
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'text-slate-600'
                    }`}
                  >
                    {bc.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <div className="text-[11px] font-semibold text-slate-500">
              {visibleItems.length} item(s) · {selectedIds.length} selected
            </div>
          </div>

          {/* Up One Level Row (when inside subfolder) */}
          {currentPath !== homeRoot && (
            <button
              type="button"
              onClick={navigateUp}
              className="flex w-full items-center gap-2.5 border-b border-indigo-50 bg-white px-4 py-2 text-left font-mono text-xs font-bold text-indigo-700 hover:bg-indigo-50/50"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              <span>.. (Up One Level)</span>
            </button>
          )}

          {/* cPanel File Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-indigo-100 bg-[#F7F6FD] text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-9 px-3.5 py-2.5">
                    <input
                      type="checkbox"
                      checked={
                        visibleItems.length > 0 &&
                        selectedIds.length === visibleItems.length
                      }
                      onChange={(e) =>
                        e.target.checked ? handleSelectAll() : handleUnselectAll()
                      }
                      className="h-3.5 w-3.5 accent-indigo-600"
                    />
                  </th>
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Size</th>
                  <th className="hidden px-3 py-2.5 md:table-cell">Last Modified</th>
                  <th className="hidden px-3 py-2.5 xl:table-cell">Type</th>
                  <th className="px-3 py-2.5">Perms</th>
                  <th className="px-3 py-2.5">Antivirus / WAF</th>
                  <th className="px-3.5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50/80">
                {visibleItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-xs text-slate-500">
                      This directory (`{currentPath}`) is empty. Use **+ File**, **+ Folder**, or
                      **Upload** in the toolbar above.
                    </td>
                  </tr>
                ) : (
                  visibleItems.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    const isQuarantined = item.scanStatus === 'QUARANTINED_BLOCKED';
                    const isZip = item.name.toLowerCase().endsWith('.zip');

                    return (
                      <tr
                        key={item.id}
                        onClick={() => toggleSelectOne(item.id)}
                        className={`cursor-pointer transition ${
                          isQuarantined
                            ? 'bg-rose-50/60 hover:bg-rose-100/60'
                            : isSelected
                              ? 'bg-indigo-50/90'
                              : 'hover:bg-[#FAF9FE]'
                        }`}
                      >
                        <td
                          className="px-3.5 py-2.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(item.id)}
                            className="h-3.5 w-3.5 accent-indigo-600"
                          />
                        </td>

                        {/* Icon + File/Folder Name */}
                        <td className="px-3 py-2.5">
                          {item.isDirectory ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateTo(`${item.parentPath}/${item.name}`);
                              }}
                              className="flex items-center gap-2 font-mono font-bold text-indigo-950 hover:text-indigo-600 hover:underline"
                            >
                              <Folder className="h-4 w-4 shrink-0 text-amber-500 fill-amber-400/30" />
                              <span>{item.name}</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              {isQuarantined ? (
                                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                              ) : isZip ? (
                                <FileArchive className="h-4 w-4 shrink-0 text-amber-600" />
                              ) : item.name.endsWith('.php') || item.name.endsWith('.css') ? (
                                <FileCode className="h-4 w-4 shrink-0 text-indigo-600" />
                              ) : (
                                <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                              )}
                              <span className="font-mono font-bold text-slate-900">
                                {item.name}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Size */}
                        <td className="px-3 py-2.5 font-mono text-slate-600">
                          {item.sizeLabel}
                        </td>

                        {/* Last Modified */}
                        <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">
                          {item.lastModified}
                        </td>

                        {/* MIME Type */}
                        <td className="hidden px-3 py-2.5 font-mono text-[11px] text-slate-500 xl:table-cell">
                          {item.mimeType}
                        </td>

                        {/* Permissions (Clickable to open Chmod Calculator) */}
                        <td
                          className="px-3 py-2.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenChmod(item);
                          }}
                        >
                          <span
                            title="Click to edit permissions (chmod)"
                            className="inline-flex rounded-md border border-indigo-100 bg-indigo-50/70 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
                          >
                            {item.perms}
                          </span>
                        </td>

                        {/* Antivirus / WAF Status */}
                        <td className="px-3 py-2.5">
                          {isQuarantined ? (
                            <Badge variant="warning">BLOCKED: MALWARE</Badge>
                          ) : (
                            <Badge variant="success">ClamAV + WAF Clean</Badge>
                          )}
                        </td>

                        {/* Row Quick Actions */}
                        <td
                          className="px-3.5 py-2.5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1">
                            {!item.isDirectory && !isQuarantined && !isZip && (
                              <button
                                type="button"
                                onClick={() => handleOpenCodeEditor(item)}
                                className="rounded-lg border border-indigo-100 bg-white px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50"
                              >
                                Edit
                              </button>
                            )}
                            {isZip && (
                              <button
                                type="button"
                                onClick={() => handleExtractArchive(item)}
                                className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                              >
                                Extract
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenChmod(item)}
                              className="rounded-lg border border-indigo-100 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-indigo-50"
                            >
                              Chmod
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AnimatedContent>
  );
};
