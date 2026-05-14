import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('staging deployment documentation contract', () => {
  test('runbook covers Vercel staging gates, callbacks, origins, and limits', () => {
    const runbook = readText('docs/vercel-staging-runbook.md');

    for (const requiredText of [
      'Vercel environments',
      'Vercel environment variables',
      'npm run verify:services:strict',
      'npm run verify:staging',
      'Google OAuth',
      'Axinom webhook',
      'Zoom Meeting SDK',
      'Azure Blob',
      'Cloudflare R2',
      'maxDuration = 300',
      'Production hardening should move long-running encoding control to a queue',
    ]) {
      expect(runbook).toContain(requiredText);
    }
  });

  test('smoke checklist covers required flows with credential-blocked status', () => {
    const checklist = readText('docs/staging-smoke-checklist.md');

    for (const smokeId of [
      'AUTH-01',
      'COURSE-01',
      'PLAYBACK-01',
      'DRM-01',
      'HLS-01',
      'AXINOM-01',
      'ZOOM-01',
      'SUPPORT-01',
      'REDIS-01',
      'STORAGE-01',
      'LOGS-01',
      'SENTRY-01',
      'GAP-01',
    ]) {
      expect(checklist).toContain(smokeId);
    }

    expect(checklist).toContain('blocked: missing credentials/service access');
    expect(checklist).toContain('Production Gaps Not Closed By This Checklist');
  });
});

describe('Safari FairPlay staging docs', () => {
  test('Axinom staging checklist documents real macOS Safari FairPlay verification', () => {
    const checklist = readText('docs/axinom-staging-checklist.md');

    expect(checklist).toContain('## 6B. macOS Safari FairPlay Smoke');
    expect(checklist).toContain('npm run verify:safari-fairplay');
    expect(checklist).toContain('Use real macOS Safari for acceptance');
    expect(checklist).toContain('Playwright WebKit is not a FairPlay acceptance substitute');
    expect(checklist).toContain('Do not paste license tokens, certificate contents, Communication Key values, or DRM content keys');
  });

  test('staging smoke checklist has Safari-specific FairPlay and fallback rows', () => {
    const checklist = readText('docs/staging-smoke-checklist.md');

    expect(checklist).toContain('SAFARI-DRM-01');
    expect(checklist).toContain('SAFARI-FALLBACK-01');
    expect(checklist).toContain('real macOS Safari');
    expect(checklist).toContain('clear HLS fallback');
  });
});
