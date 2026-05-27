import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('operations documentation contract', () => {
  test('subsystem runbook covers required operational areas and deterrence boundary', () => {
    const runbook = readText('docs/operations/subsystems.md');

    for (const term of [
      'Auth And Whitelist',
      'Media Entitlement',
      'DRM And Axinom',
      'VdoCipher Upload And Playback',
      'Video Processing And Storage',
      'Zoom Meetings',
      'Redis, Rate Limits, Cache, And Session Revocation',
      'Database',
      'Support And Admin',
      'Observability',
      'Frontend And Client-Side Deterrence',
      'deterrence and telemetry, not a hard security boundary',
    ]) {
      expect(runbook).toContain(term);
    }
  });

  test('vendor playbook covers required vendors with official source links', () => {
    const playbook = readText('docs/operations/vendor-upgrades.md');

    for (const term of [
      'Axinom DRM And Encoding',
      'Zoom Meeting SDK',
      'Next.js And React',
      'Prisma And MongoDB',
      'Shaka Player',
      'Vercel And Deployment Dependencies',
      'https://docs.axinom.com/services/drm/',
      'https://marketplacefront.zoom.us/sdk/meeting/web/index.html',
      'https://nextjs.org/docs/app/guides/upgrading',
      'https://www.prisma.io/docs/guides/upgrade-prisma-orm/v5',
      'https://shaka-player-demo.appspot.com/docs/api/tutorial-upgrade.html',
      'https://vercel.com/docs/deployments/deployment-methods',
    ]) {
      expect(playbook).toContain(term);
    }
  });

  test('health checklist and hardening backlog cover readiness and priorities', () => {
    const health = readText('docs/operations/health-checklist.md');
    const backlog = readText('docs/operations/hardening-backlog.md');

    for (const term of [
      'HEALTH-AUTH-01',
      'HEALTH-DB-01',
      'HEALTH-REDIS-01',
      'HEALTH-AXINOM-01',
      'HEALTH-VDOCIPHER-01',
      'HEALTH-VDOCIPHER-02',
      'HEALTH-ZOOM-01',
      'HEALTH-STORAGE-01',
      'HEALTH-SENTRY-01',
      'HEALTH-UI-01',
    ]) {
      expect(health).toContain(term);
    }

    for (const term of ['P0 - Production Blockers', 'P1 - High-Value Hardening', 'P2 - Follow-Up Improvements']) {
      expect(backlog).toContain(term);
    }
  });
});
