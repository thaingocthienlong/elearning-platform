import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

type InventoryCategory =
  | 'env-file'
  | 'drm-key'
  | 'certificate'
  | 'media-artifact'
  | 'service-account'
  | 'database-drift'
  | 'source-dump'
  | 'unknown-sensitive';

type InventoryAction =
  | 'keep-ignored'
  | 'remove-from-git-review'
  | 'rotate-review-later'
  | 'document-placeholder-only';

type InventoryItem = {
  path: string;
  category: InventoryCategory;
  trackedByGit: boolean;
  ignoredByGit: boolean;
  sizeBytes: number;
  action: InventoryAction;
};

const root = process.cwd();

const explicitCandidates: Array<{ path: string; category: InventoryCategory }> = [
  { path: 'azure.txt', category: 'unknown-sensitive' },
  { path: 'source_dump.txt', category: 'source-dump' },
  { path: 'mosaic-service-account-config.env', category: 'service-account' },
  { path: 'mosaic-service-account-config (1).env', category: 'service-account' },
  { path: 'mosaic-service-account-config (2).env', category: 'service-account' },
  { path: 'packager.env', category: 'env-file' },
  { path: 'keys.json', category: 'drm-key' },
  { path: 'KIDs.json', category: 'drm-key' },
  { path: 'job.json', category: 'drm-key' },
  { path: 'keys.cpix.xml', category: 'drm-key' },
  { path: 'cert.der.b64', category: 'certificate' },
  { path: 'wv_pssh.hex', category: 'drm-key' },
  { path: 'drift.sql', category: 'database-drift' },
  { path: 'scripts/keystore.json', category: 'drm-key' },
  { path: 'scripts/packager/keystore.json', category: 'drm-key' },
  { path: 'zoom-webapp/CDN/localhost.key', category: 'certificate' },
  { path: 'zoom-webapp/Local/localhost.key', category: 'certificate' },
];

const sensitiveNames = new Map<string, InventoryCategory>([
  ['keys.json', 'drm-key'],
  ['KIDs.json', 'drm-key'],
  ['job.json', 'drm-key'],
  ['keystore.json', 'drm-key'],
  ['wv_pssh.hex', 'drm-key'],
  ['azure.txt', 'unknown-sensitive'],
  ['source_dump.txt', 'source-dump'],
  ['drift.sql', 'database-drift'],
]);

const sensitiveExtensions = new Map<string, InventoryCategory>([
  ['.env', 'env-file'],
  ['.mp4', 'media-artifact'],
  ['.mkv', 'media-artifact'],
  ['.mov', 'media-artifact'],
  ['.avi', 'media-artifact'],
  ['.hex', 'drm-key'],
  ['.b64', 'certificate'],
  ['.xml', 'drm-key'],
  ['.pem', 'certificate'],
  ['.key', 'certificate'],
  ['.lnk', 'unknown-sensitive'],
]);

const ignoredDirectories = new Set([
  '.git',
  '.next',
  'node_modules',
  '.planning',
  'coverage',
  'lib/generated',
  'public/zoom',
  'public/lib/zoom',
  'scripts/packager/node_modules',
  'zoom-webapp/node_modules',
]);

function toPosix(relativePath: string): string {
  return relativePath.split(path.sep).join('/');
}

function isInsideIgnoredDirectory(relativePath: string): boolean {
  const normalized = toPosix(relativePath);
  return [...ignoredDirectories].some(
    (dir) => normalized === dir || normalized.startsWith(`${dir}/`),
  );
}

function runGit(args: string[], targetPath: string): boolean {
  try {
    execFileSync('git', [...args, '--', targetPath], {
      cwd: root,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function isTrackedByGit(relativePath: string): boolean {
  return runGit(['ls-files', '--error-unmatch'], relativePath);
}

function isIgnoredByGit(relativePath: string): boolean {
  return runGit(['check-ignore', '-q'], relativePath);
}

function categoryFor(relativePath: string): InventoryCategory | null {
  const baseName = path.basename(relativePath);
  if (sensitiveNames.has(baseName)) {
    return sensitiveNames.get(baseName) ?? null;
  }

  if (/^mosaic-service-account-config.*\.env$/i.test(baseName)) {
    return 'service-account';
  }

  if (/\.cpix\.xml$/i.test(baseName)) {
    return 'drm-key';
  }

  const ext = path.extname(baseName);
  return sensitiveExtensions.get(ext) ?? null;
}

function actionFor(trackedByGit: boolean, ignoredByGit: boolean): InventoryAction {
  if (trackedByGit) {
    return 'remove-from-git-review';
  }

  if (ignoredByGit) {
    return 'keep-ignored';
  }

  return 'rotate-review-later';
}

function walk(relativeDir = ''): string[] {
  if (isInsideIgnoredDirectory(relativeDir)) {
    return [];
  }

  const absoluteDir = path.join(root, relativeDir);
  let entries: fs.Dirent[];

  try {
    entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const paths: string[] = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name);

    if (isInsideIgnoredDirectory(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      paths.push(...walk(relativePath));
      continue;
    }

    if (entry.isFile() && categoryFor(relativePath)) {
      paths.push(toPosix(relativePath));
    }
  }

  return paths;
}

function buildInventory(): InventoryItem[] {
  const discovered = new Map<string, InventoryCategory>();

  for (const candidate of explicitCandidates) {
    discovered.set(candidate.path, candidate.category);
  }

  for (const relativePath of walk()) {
    const category = categoryFor(relativePath);
    if (category) {
      discovered.set(relativePath, category);
    }
  }

  const inventory: InventoryItem[] = [];

  for (const [relativePath, category] of [...discovered.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const absolutePath = path.join(root, relativePath);

    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const stats = fs.statSync(absolutePath);
    if (!stats.isFile()) {
      continue;
    }

    const trackedByGit = isTrackedByGit(relativePath);
    const ignoredByGit = isIgnoredByGit(relativePath);

    inventory.push({
      path: relativePath,
      category,
      trackedByGit,
      ignoredByGit,
      sizeBytes: stats.size,
      action: actionFor(trackedByGit, ignoredByGit),
    });
  }

  return inventory;
}

function printInventory(inventory: InventoryItem[]): void {
  console.log('Sensitive artifact inventory (paths and metadata only)');

  if (inventory.length === 0) {
    console.log('No sensitive-looking artifact paths found.');
    return;
  }

  for (const item of inventory) {
    console.log(
      [
        item.path,
        `category=${item.category}`,
        `trackedByGit=${item.trackedByGit}`,
        `ignoredByGit=${item.ignoredByGit}`,
        `sizeBytes=${item.sizeBytes}`,
        `action=${item.action}`,
      ].join(' | '),
    );
  }
}

printInventory(buildInventory());
