import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

const minimumNodeVersion = '20.9.0';

const requiredFiles = [
  'package-lock.json',
  'package.json',
  'prisma/schema.prisma',
  '.env.example',
  'docs/env-matrix.md',
];

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
  'verify:redis': 'tsx scripts/verify-redis.ts',
  'verify:email': 'tsx scripts/verify-email.ts',
  'verify:doverunner': 'tsx scripts/verify-doverunner-setup.ts',
  'verify:staging': 'tsx scripts/verify-staging-smoke.ts',
  'secrets:inventory': 'tsx scripts/inventory-sensitive-files.ts',
  'secrets:scan': 'tsx scripts/scan-secrets.ts',
};

type PackageJson = {
  scripts?: Record<string, string>;
};

function compareVersions(actual: string, expected: string) {
  const actualParts = actual.split('.').map(Number);
  const expectedParts = expected.split('.').map(Number);

  for (let index = 0; index < expectedParts.length; index += 1) {
    const actualPart = actualParts[index] ?? 0;
    const expectedPart = expectedParts[index] ?? 0;

    if (actualPart > expectedPart) return 1;
    if (actualPart < expectedPart) return -1;
  }

  return 0;
}

function pass(message: string) {
  console.log(`OK ${message}`);
}

function fail(message: string) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function verifyNodeVersion() {
  const actualVersion = process.versions.node;

  if (compareVersions(actualVersion, minimumNodeVersion) >= 0) {
    pass(`node >=${minimumNodeVersion}`);
    return;
  }

  fail(`node >=${minimumNodeVersion} required`);
}

function verifyNpmAvailable() {
  try {
    execFileSync('npm', ['--version'], { encoding: 'utf8', stdio: 'pipe' });
    pass('npm --version');
  } catch {
    try {
      const npmExecPath = process.env.npm_execpath;

      if (npmExecPath) {
        execFileSync(process.execPath, [npmExecPath, '--version'], {
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } else if (process.platform === 'win32') {
        execFileSync('cmd.exe', ['/d', '/s', '/c', 'npm --version'], {
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } else {
        throw new Error('npm executable unavailable');
      }

      pass('npm --version');
    } catch {
      fail('npm --version unavailable');
    }
  }
}

function verifyRequiredFiles() {
  for (const filePath of requiredFiles) {
    if (existsSync(filePath)) {
      pass(filePath);
      continue;
    }

    fail(`${filePath} missing`);
  }
}

function verifyPackageScripts() {
  let packageJson: PackageJson;

  try {
    packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as PackageJson;
  } catch {
    fail('package.json readable');
    return;
  }

  for (const [scriptName, command] of Object.entries(requiredScripts)) {
    if (packageJson.scripts?.[scriptName] === command) {
      pass(`script ${scriptName}`);
      continue;
    }

    fail(`script ${scriptName} expected`);
  }
}

verifyNodeVersion();
verifyNpmAvailable();
verifyRequiredFiles();
verifyPackageScripts();

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}
