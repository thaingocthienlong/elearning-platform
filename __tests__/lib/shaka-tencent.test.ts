import { applyTencentLicenseRequest, resolveTencentShakaLicenseServerUrl } from '@/lib/shaka-tencent';

describe('Shaka Tencent helpers', () => {
  test('resolves Widevine license URL', () => {
    expect(resolveTencentShakaLicenseServerUrl('widevine', {
      widevineLicenseUrl: 'https://widevine.example/license',
      fairplayLicenseUrl: 'https://fairplay.example/license',
    })).toBe('https://widevine.example/license');
  });

  test('attaches drm token as a license URL parameter only for license requests', () => {
    const request = {
      headers: {} as Record<string, string>,
      uris: ['https://widevine.example/license'],
    };
    applyTencentLicenseRequest({
      requestType: 1,
      licenseRequestType: 1,
      request,
      drmToken: 'test-drm-token',
    });
    expect(request.uris).toEqual([
      'https://widevine.example/license?drmToken=test-drm-token',
    ]);
    expect(request.headers['DrmToken']).toBeUndefined();
  });

  test('preserves existing license URL parameters', () => {
    const request = {
      headers: {} as Record<string, string>,
      uris: ['https://widevine.example/license?version=v2'],
    };
    applyTencentLicenseRequest({
      requestType: 1,
      licenseRequestType: 1,
      request,
      drmToken: 'token with spaces',
    });
    expect(request.uris).toEqual([
      'https://widevine.example/license?version=v2&drmToken=token%20with%20spaces',
    ]);
  });
});
