import { readFileSync } from 'node:fs';
import path from 'node:path';

type PackageJson = {
  scripts?: Record<string, string>;
};

const packageJson = JSON.parse(
  readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
) as PackageJson;

const requiredScripts: Record<string, string> = {
  dev: 'next dev',
  build: 'next build',
  start: 'next start',
  lint: 'eslint',
  typecheck: 'tsc --noEmit',
  test: 'jest',
  'test:watch': 'jest --watch',
  'prisma:generate': 'prisma generate',
  'db:push': 'prisma db push',
  'verify:setup': 'tsx scripts/verify-setup.ts',
  'verify:services': 'tsx scripts/verify-services.ts',
  'verify:services:strict': 'tsx scripts/verify-services.ts --strict',
  'verify:axinom': 'tsx scripts/verify-axinom-setup.ts',
  'verify:staging': 'tsx scripts/verify-staging-smoke.ts',
  'secrets:inventory': 'tsx scripts/inventory-sensitive-files.ts',
  'secrets:scan': 'tsx scripts/scan-secrets.ts',
};

describe('package script contract', () => {
  test('exposes required Phase 1 root scripts with exact commands', () => {
    expect(packageJson.scripts).toEqual(expect.objectContaining(requiredScripts));
  });
});
