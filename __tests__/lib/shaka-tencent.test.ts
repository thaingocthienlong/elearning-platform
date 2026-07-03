import { applyTencentLicenseRequest, resolveTencentShakaLicenseServerUrl } from '@/lib/shaka-tencent';

describe('Shaka Tencent helpers', () => {
  test('resolves Widevine license URL', () => {
    expect(resolveTencentShakaLicenseServerUrl('widevine', {
      widevineLicenseUrl: 'https://widevine.example/license',
      fairplayLicenseUrl: 'https://fairplay.example/license',
    })).toBe('https://widevine.example/license');
  });

  test('attaches drm token only to license requests', () => {
    const request = { headers: {} as Record<string, string> };
    applyTencentLicenseRequest({
      requestType: 1,
      licenseRequestType: 1,
      request,
      drmToken: 'test-drm-token',
    });
    expect(request.headers['DrmToken']).toBe('test-drm-token');
  });
});
