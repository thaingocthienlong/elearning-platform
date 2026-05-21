import {
  SHAKA_AXINOM_LICENSE_URL_DEFAULTS,
  applyAxinomMessageHeader,
  createAxinomDrmConfiguration,
  resolveAxinomLicenseServerUrl,
  shouldAttachAxinomMessage,
} from '@/lib/shaka-axinom';

describe('shaka Axinom helpers', () => {
  test('resolves documented Axinom license defaults', () => {
    expect(resolveAxinomLicenseServerUrl('widevine', undefined, {})).toBe(
      SHAKA_AXINOM_LICENSE_URL_DEFAULTS.widevine
    );
    expect(resolveAxinomLicenseServerUrl('playready', undefined, {})).toBe(
      SHAKA_AXINOM_LICENSE_URL_DEFAULTS.playready
    );
    expect(resolveAxinomLicenseServerUrl('fairplay', undefined, {})).toBe(
      SHAKA_AXINOM_LICENSE_URL_DEFAULTS.fairplay
    );
  });

  test('uses public env overrides before fallback or defaults', () => {
    expect(
      resolveAxinomLicenseServerUrl('widevine', 'https://fallback.example/wv', {
        NEXT_PUBLIC_AX_WV_LS_URL: 'https://tenant.example/wv',
      })
    ).toBe('https://tenant.example/wv');
  });

  test('uses fallback URL when no DRM type matches', () => {
    expect(resolveAxinomLicenseServerUrl(undefined, 'https://fallback.example', {})).toBe(
      'https://fallback.example'
    );
  });

  test('attaches Axinom message only to license requests', () => {
    expect(shouldAttachAxinomMessage(1, 1, 'token')).toBe(true);
    expect(shouldAttachAxinomMessage(2, 1, 'token')).toBe(false);
    expect(shouldAttachAxinomMessage(1, 1, undefined)).toBe(false);
  });

  test('does not add X-AxDRM-Message to manifest or media requests', () => {
    const licenseRequest = { headers: {} };
    const manifestRequest = { headers: {} };

    applyAxinomMessageHeader({
      requestType: 1,
      licenseRequestType: 1,
      request: licenseRequest,
      message: 'token',
    });
    applyAxinomMessageHeader({
      requestType: 2,
      licenseRequestType: 1,
      request: manifestRequest,
      message: 'token',
    });

    expect(licenseRequest.headers).toEqual({ 'X-AxDRM-Message': 'token' });
    expect(manifestRequest.headers).toEqual({});
  });

  test('keeps PlayReady on the standard key system instead of Shaka recommendation 3000', () => {
    const config = createAxinomDrmConfiguration({
      drmType: 'playready',
      licenseServerUrl: 'https://tenant.example/playready',
    });

    expect(config.drm?.servers?.['com.microsoft.playready']).toBe(
      'https://tenant.example/playready'
    );
    expect(config.drm?.keySystemsMapping).toEqual({
      'com.microsoft.playready': 'com.microsoft.playready',
      'com.microsoft.playready.recommendation': 'com.microsoft.playready',
      'com.microsoft.playready.recommendation.3000': 'com.microsoft.playready',
    });
    expect(config.drm?.preferredKeySystems).toEqual(['com.microsoft.playready']);
  });
});
