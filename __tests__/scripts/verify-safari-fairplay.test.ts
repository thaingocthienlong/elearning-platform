import { spawnSync } from 'node:child_process';
import path from 'node:path';

const SCRIPT = path.join(process.cwd(), 'scripts/verify-safari-fairplay.ts');

function runVerifier(env: NodeJS.ProcessEnv) {
  return spawnSync('npx', ['tsx', SCRIPT], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AXINOM_FAIRPLAY_CERT_URL: '',
      NEXT_PUBLIC_AX_FP_LS_URL: '',
      ...env,
    },
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
}

describe('verify-safari-fairplay CLI', () => {
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
});
