import {
  attachDoveRunnerLicenseTokenHeader,
  resolveDoveRunnerLicenseServerUrl,
  shouldAttachLicenseToken,
} from '@/lib/shaka-drm';

describe('provider-neutral Shaka DRM helpers', () => {
  test('resolves DoveRunner license URL from env or default', () => {
    expect(resolveDoveRunnerLicenseServerUrl('widevine', {}, undefined))
      .toBe('https://drm-license.doverunner.com/ri/licenseManager.do');
    expect(resolveDoveRunnerLicenseServerUrl('playready', { NEXT_PUBLIC_DOVERUNNER_LICENSE_URL: 'https://license.example' }, undefined))
      .toBe('https://license.example');
  });

  test('attaches DoveRunner custom data header only when token exists', () => {
    const request = { headers: {} as Record<string, string> };
    attachDoveRunnerLicenseTokenHeader(request, 'token-1');
    expect(request.headers['pallycon-customdata-v2']).toBe('token-1');
  });

  test('detects license request type', () => {
    expect(shouldAttachLicenseToken(1, 1, 'token')).toBe(true);
    expect(shouldAttachLicenseToken(2, 1, 'token')).toBe(false);
    expect(shouldAttachLicenseToken(1, 1, '')).toBe(false);
  });
});
