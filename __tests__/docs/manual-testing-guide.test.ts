import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('manual testing guide contract', () => {
  test('covers command gates, browser flows, external services, and reporting', () => {
    const guide = readText('docs/manual-testing-guide.md');

    for (const term of [
      'npm run verify:setup',
      'npm run verify:services',
      'npm run verify:staging',
      'npm run lint',
      'npm run typecheck',
      'npm test',
      'npm run build',
      'AUTH-01',
      'COURSE-01',
      'PLAYBACK-01',
      'DRM-01',
      'HLS-01',
      'ZOOM-01',
      'SUPPORT-01',
      'ADMIN-01',
      'REDIS-01',
      'STORAGE-01',
      'DOVERUNNER-01',
      'SENTRY-01',
      'Manual Test Report',
    ]) {
      expect(guide).toContain(term);
    }
  });

  test('defines safe evidence and blocked statuses', () => {
    const guide = readText('docs/manual-testing-guide.md');

    expect(guide).toContain('blocked: missing credentials/service access');
    expect(guide).toContain('blocked: missing browser automation tooling');
    expect(guide).toContain('Do not paste secrets');
    expect(guide).toContain('Staging readiness is not production launch certification');
  });
});
