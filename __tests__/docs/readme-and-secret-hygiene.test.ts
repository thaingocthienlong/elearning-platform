import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('README and secret hygiene documentation contract', () => {
  test('README documents Prisma MongoDB setup and links detailed runbooks', () => {
    const readme = readText('README.md');

    expect(readme).toContain('Prisma MongoDB');
    expect(readme).toContain('docs/setup.md');
    expect(readme).toContain('docs/env-matrix.md');
    expect(readme).toContain('docs/verification.md');
    expect(readme).toContain('docs/secret-hygiene.md');
    expect(readme).not.toMatch(
      /PostgreSQL\s*\(Primary DB\)|Postgres \+ Mongo|DATABASE_URL\s*\(PostgreSQL\)/i,
    );
  });

  test('secret hygiene guide states non-disclosure handling rule', () => {
    const guide = readText('docs/secret-hygiene.md');

    expect(guide).toContain(
      'Do not read, print, copy, move, delete, or commit secret values',
    );
  });

  test('secret hygiene scripts preserve path-only inventory and redacted scans', () => {
    const inventoryScript = readText('scripts/inventory-sensitive-files.ts');
    const scanScript = readText('scripts/scan-secrets.ts');

    expect(inventoryScript).toContain('InventoryItem');
    expect(inventoryScript).not.toContain('readFileSync');
    expect(scanScript).toContain('--redact');
  });
});
