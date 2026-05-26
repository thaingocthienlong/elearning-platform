import crypto from 'crypto';
import {
  buildDoveRunnerTokenPayload,
  encryptDoveRunnerPolicy,
  generateDoveRunnerLicenseToken,
} from '@/lib/media-provider/doverunner-token';

const accessKey = '12345678901234567890123456789012';

describe('DoveRunner license token generation', () => {
  test('encrypts policy as base64 AES-256-CBC payload', () => {
    const encrypted = encryptDoveRunnerPolicy(
      { policy_version: 2, playback_policy: { persistent: false, license_duration: 300 } },
      accessKey,
      Buffer.alloc(16, 1)
    );

    expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(encrypted).not.toContain('license_duration');
  });

  test('builds token payload with DoveRunner required fields and hash', () => {
    const payload = buildDoveRunnerTokenPayload({
      siteId: 'DEMO',
      siteAccessKey: accessKey,
      contentId: 'video-1',
      userId: 'user-1',
      drmType: 'widevine',
      ttlSeconds: 300,
      now: new Date('2026-05-26T00:00:00.000Z'),
      iv: Buffer.alloc(16, 1),
    });

    const expectedHash = crypto
      .createHash('sha256')
      .update(accessKey + 'widevine' + 'DEMO' + 'user-1' + 'video-1' + payload.policy + '2026-05-26T00:00:00Z')
      .digest('base64');

    expect(payload).toMatchObject({
      drm_type: 'widevine',
      site_id: 'DEMO',
      user_id: 'user-1',
      cid: 'video-1',
      timestamp: '2026-05-26T00:00:00Z',
      hash: expectedHash,
    });
  });

  test('returns base64 encoded token JSON', () => {
    const token = generateDoveRunnerLicenseToken({
      siteId: 'DEMO',
      siteAccessKey: accessKey,
      contentId: 'video-1',
      userId: 'user-1',
      drmType: 'playready',
      ttlSeconds: 300,
      now: new Date('2026-05-26T00:00:00.000Z'),
      iv: Buffer.alloc(16, 1),
    });

    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    expect(decoded.drm_type).toBe('playready');
    expect(decoded.cid).toBe('video-1');
    expect(decoded.policy).toEqual(expect.any(String));
  });
});
