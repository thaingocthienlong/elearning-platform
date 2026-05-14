import { detectDRMCapabilities, getOptimalDRMConfig } from '@/lib/drm-detection';

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: userAgent,
    configurable: true,
  });
}

describe('DRM playback routing', () => {
  const dashUrl = 'https://media.example/video/manifest.mpd';
  const hlsUrl = 'https://media.example/video/master.m3u8';

  test('routes iOS browsers to clear HLS when a clear fallback is selected', () => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );

    expect(getOptimalDRMConfig(null, hlsUrl, false, true)).toEqual({
      drmType: 'fairplay',
      manifestUrl: hlsUrl,
      protocol: 'HLS',
      requiresL1: false,
      isClearPlayback: true,
    });
  });

  test('routes macOS Safari to clear HLS when a clear fallback is selected', () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
    );

    expect(getOptimalDRMConfig(null, hlsUrl, false, true)).toEqual({
      drmType: 'fairplay',
      manifestUrl: hlsUrl,
      protocol: 'HLS',
      requiresL1: false,
      isClearPlayback: true,
    });
  });

  test('does not route iOS to FairPlay when no certificate or clear fallback is configured', () => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );

    expect(getOptimalDRMConfig(null, hlsUrl, false, false, false)).toBeNull();
  });

  test('does not route Safari to FairPlay when no certificate is configured', () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
    );

    expect(getOptimalDRMConfig(null, hlsUrl)).toBeNull();
  });

  test('routes Safari without a clear fallback to FairPlay HLS when configured', () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
    );

    expect(getOptimalDRMConfig(null, hlsUrl, false, false, true)).toEqual({
      drmType: 'fairplay',
      manifestUrl: hlsUrl,
      protocol: 'HLS',
      requiresL1: true,
    });
  });

  test('routes Windows Edge to PlayReady DASH', () => {
    setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0'
    );

    expect(getOptimalDRMConfig(dashUrl, hlsUrl)).toEqual({
      drmType: 'playready',
      manifestUrl: dashUrl,
      protocol: 'DASH',
      requiresL1: true,
    });
  });

  test('routes non-Windows Edge to Widevine DASH instead of PlayReady', () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0'
    );

    expect(getOptimalDRMConfig(dashUrl, hlsUrl)).toEqual({
      drmType: 'widevine',
      manifestUrl: dashUrl,
      protocol: 'DASH',
      robustness: 'SW_SECURE_CRYPTO',
      requiresL1: false,
    });
  });

  test('routes Android Chromium browsers to Widevine hardware attempt with fallback', () => {
    setUserAgent(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36'
    );

    expect(getOptimalDRMConfig(dashUrl, hlsUrl)).toEqual({
      drmType: 'widevine',
      manifestUrl: dashUrl,
      protocol: 'DASH',
      robustness: 'HW_SECURE_ALL',
      requiresL1: true,
    });
  });

  test('detects Safari FairPlay through the Modern EME key system', async () => {
    const requestMediaKeySystemAccess = jest.fn((keySystem: string) => {
      if (keySystem === 'com.apple.fps') {
        return Promise.resolve({});
      }

      return Promise.reject(new Error(`unsupported key system: ${keySystem}`));
    });

    Object.defineProperty(window.navigator, 'requestMediaKeySystemAccess', {
      value: requestMediaKeySystemAccess,
      configurable: true,
    });

    await expect(detectDRMCapabilities()).resolves.toMatchObject({
      fairplay: true,
      recommendedDRM: 'fairplay',
      supportedSystems: ['fairplay'],
    });

    expect(requestMediaKeySystemAccess).toHaveBeenCalledWith(
      'com.apple.fps',
      expect.arrayContaining([
        expect.objectContaining({
          initDataTypes: ['skd'],
        }),
      ])
    );
  });
});
