import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const SCRIPT = path.join(REPO_ROOT, 'scripts/verify-safari-fairplay.ts');
const TSX_CLI = path.join(REPO_ROOT, 'node_modules/tsx/dist/cli.mjs');
const TEMP_CWDS = new Set<string>();

function createTempCwd() {
  const cwd = mkdtempSync(path.join(REPO_ROOT, '.tmp-fairplay-verifier-'));
  TEMP_CWDS.add(cwd);
  return cwd;
}

function runVerifier(
  env: Partial<NodeJS.ProcessEnv>,
  options: { cwd?: string } = {}
) {
  const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      ...env,
    };

  delete childEnv.AXINOM_FAIRPLAY_CERT_URL;
  delete childEnv.NEXT_PUBLIC_AX_FP_LS_URL;

  Object.assign(childEnv, env);

  return spawnSync(process.execPath, [TSX_CLI, SCRIPT], {
    cwd: options.cwd ?? createTempCwd(),
    env: childEnv,
    encoding: 'utf8',
  });
}

describe('verify-safari-fairplay CLI', () => {
  afterEach(() => {
    for (const cwd of TEMP_CWDS) {
      rmSync(cwd, { force: true, recursive: true });
    }

    TEMP_CWDS.clear();
  });

  test('exits 1 and prints missing variable names when FairPlay env is absent', () => {
    const result = runVerifier({});

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Safari FairPlay readiness: blocked');
    expect(result.stdout).toContain(
      'Missing: AXINOM_FAIRPLAY_CERT_URL, NEXT_PUBLIC_AX_FP_LS_URL'
    );
    expect(result.stdout).not.toContain('secret');
  });

  test('exits 1 and prints invalid variable names without printing invalid values', () => {
    const result = runVerifier({
      AXINOM_FAIRPLAY_CERT_URL: 'not-a-url',
      NEXT_PUBLIC_AX_FP_LS_URL: 'ftp://licenses.example/fairplay',
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'Invalid URL format: AXINOM_FAIRPLAY_CERT_URL, NEXT_PUBLIC_AX_FP_LS_URL'
    );
    expect(result.stdout).not.toContain('not-a-url');
    expect(result.stdout).not.toContain('ftp://licenses.example/fairplay');
  });

  test('exits 0 when FairPlay certificate and license URLs are configured', () => {
    const result = runVerifier({
      AXINOM_FAIRPLAY_CERT_URL:
        'https://tools.axinom.com/FPScert/fairplay.cer',
      NEXT_PUBLIC_AX_FP_LS_URL:
        'https://drm-fairplay-licensing.axprod.net/AcquireLicense',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Safari FairPlay readiness: ready');
    expect(result.stdout).toContain('Mode: fairplay-drm');
    expect(result.stdout).not.toContain('https://tools.axinom.com');
    expect(result.stdout).not.toContain(
      'https://drm-fairplay-licensing.axprod.net'
    );
  });

  test('loads local env files without printing configured values', () => {
    const cwd = createTempCwd();
    writeFileSync(
      path.join(cwd, '.env'),
      [
        'AXINOM_FAIRPLAY_CERT_URL=https://env.example.test/fairplay.cer',
        'NEXT_PUBLIC_AX_FP_LS_URL=ftp://env.example.test/license',
        '',
      ].join('\n')
    );
    writeFileSync(
      path.join(cwd, '.env.local'),
      [
        'NEXT_PUBLIC_AX_FP_LS_URL=https://env-local.example.test/license',
        '',
      ].join('\n')
    );

    const result = runVerifier({}, { cwd });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Safari FairPlay readiness: ready');
    expect(result.stdout).not.toContain('https://env.example.test');
    expect(result.stdout).not.toContain('ftp://env.example.test/license');
    expect(result.stdout).not.toContain('https://env-local.example.test');
  });
});
