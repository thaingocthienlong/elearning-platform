import { normalizeTencentStatus, resolveTencentLicenseUrl } from '@/lib/tencent/vod';

describe('Tencent VOD service helpers', () => {
  test('normalizes Tencent processing states', () => {
    expect(normalizeTencentStatus('FINISH')).toBe('READY');
    expect(normalizeTencentStatus('PROCESSING')).toBe('PROCESSING');
    expect(normalizeTencentStatus('FAIL')).toBe('FAILED');
    expect(normalizeTencentStatus('')).toBe('UNKNOWN');
  });

  test('resolves license URLs by DRM type', () => {
    const env = {
      widevineLicenseUrl: 'https://widevine.example/license',
      fairplayLicenseUrl: 'https://fairplay.example/license',
    };

    expect(resolveTencentLicenseUrl('widevine', env)).toBe('https://widevine.example/license');
    expect(resolveTencentLicenseUrl('fairplay', env)).toBe('https://fairplay.example/license');
  });
});
