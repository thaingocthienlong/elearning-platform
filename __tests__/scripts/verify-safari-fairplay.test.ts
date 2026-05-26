import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = process.cwd();

function runVerifier(env: Record<string, string | undefined>, cwd = repoRoot) {
  const tsxPath = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...env,
  };

  if (!Object.prototype.hasOwnProperty.call(env, 'DOVERUNNER_FAIRPLAY_CERT_URL')) {
    delete childEnv.DOVERUNNER_FAIRPLAY_CERT_URL;
  }
  delete childEnv.AXINOM_FAIRPLAY_CERT_URL;
  delete childEnv.NEXT_PUBLIC_AX_FP_LS_URL;

  return spawnSync(process.execPath, [tsxPath, path.join(repoRoot, 'scripts/verify-safari-fairplay.ts')], {
    cwd,
    env: childEnv,
    encoding: 'utf8',
  });
}

describe('verify-safari-fairplay script', () => {
  test('exits 1 and prints missing variable names without printing values', () => {
    const result = runVerifier({});

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Safari FairPlay readiness: blocked');
    expect(result.stdout).toContain('Missing: DOVERUNNER_FAIRPLAY_CERT_URL');
    expect(result.stdout).not.toContain('secret');
  });

  test('exits 1 and prints invalid variable names without printing invalid values', () => {
    const result = runVerifier({
      DOVERUNNER_FAIRPLAY_CERT_URL: 'not-a-url',
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Invalid URL format: DOVERUNNER_FAIRPLAY_CERT_URL');
    expect(result.stdout).not.toContain('not-a-url');
  });

  test('exits 0 when FairPlay certificate URL is configured', () => {
    const result = runVerifier({
      DOVERUNNER_FAIRPLAY_CERT_URL: 'https://media.example/fairplay.cer',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Safari FairPlay readiness: ready');
    expect(result.stdout).toContain('Mode: fairplay-drm');
    expect(result.stdout).not.toContain('https://media.example');
  });

});
