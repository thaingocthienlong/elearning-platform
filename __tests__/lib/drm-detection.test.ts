import {
  DRMCapabilities,
  getOptimalDRMConfig,
} from '@/lib/drm-detection';

const edgeWindowsUa =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0';

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  });
}

function capabilities(
  overrides: Partial<DRMCapabilities>
): DRMCapabilities {
  return {
    widevine: false,
    widevineL1: false,
    playready: false,
    fairplay: false,
    supportedSystems: [],
    recommendedDRM: null,
    supportsHardwareDRM: false,
    ...overrides,
  };
}

describe('DRM detection config selection', () => {
  test('uses Widevine on Edge when Widevine is available to avoid untested PlayReady 3000 playback', () => {
    setUserAgent(edgeWindowsUa);

    const config = getOptimalDRMConfig(
      'https://cdn.example/video.mpd',
      null,
      false,
      capabilities({ widevine: true, playready: true })
    );

    expect(config).toMatchObject({
      drmType: 'widevine',
      manifestUrl: 'https://cdn.example/video.mpd',
      protocol: 'DASH',
      robustness: 'SW_SECURE_CRYPTO',
      requiresL1: false,
    });
  });

  test('uses PlayReady on Edge only when Widevine is unavailable', () => {
    setUserAgent(edgeWindowsUa);

    const config = getOptimalDRMConfig(
      'https://cdn.example/video.mpd',
      null,
      false,
      capabilities({ widevine: false, playready: true })
    );

    expect(config).toMatchObject({
      drmType: 'playready',
      manifestUrl: 'https://cdn.example/video.mpd',
      protocol: 'DASH',
      requiresL1: true,
    });
  });
});
