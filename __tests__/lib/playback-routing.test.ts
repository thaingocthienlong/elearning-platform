import { isAppleHlsBrowser, selectWatchPlaybackSources } from '@/lib/playback-routing';

describe('watch playback source routing', () => {
  const dashUrl = 'https://media.example/video/manifest.mpd';
  const hlsUrl = 'https://media.example/video/protected.m3u8';
  const hlsUrlClear = 'https://media.example/video/clear.m3u8';
  const drmToken = 'signed-axinom-token';

  test('detects all iOS browsers as Apple HLS browsers', () => {
    expect(
      isAppleHlsBrowser(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.0.0 Mobile/15E148 Safari/604.1'
      )
    ).toBe(true);
  });

  test('detects macOS Safari as an Apple HLS browser', () => {
    expect(
      isAppleHlsBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
      )
    ).toBe(true);
  });

  test('does not treat macOS Chrome as an Apple HLS browser', () => {
    expect(
      isAppleHlsBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
      )
    ).toBe(false);
  });

  test('routes iOS to clear HLS and suppresses the DRM token when clear fallback exists', () => {
    expect(
      selectWatchPlaybackSources({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        dashUrl,
        hlsUrl,
        hlsUrlClear,
        drmToken,
      })
    ).toEqual({
      dashUrl: null,
      hlsUrl: hlsUrlClear,
      drmToken: '',
      isAppleHlsBrowser: true,
      isClearHlsFallback: true,
    });
  });

  test('routes macOS Safari to clear HLS and suppresses the DRM token when clear fallback exists', () => {
    expect(
      selectWatchPlaybackSources({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        dashUrl,
        hlsUrl,
        hlsUrlClear,
        drmToken,
      })
    ).toEqual({
      dashUrl: null,
      hlsUrl: hlsUrlClear,
      drmToken: '',
      isAppleHlsBrowser: true,
      isClearHlsFallback: true,
    });
  });

  test('keeps protected HLS and DRM token for Apple browsers when no clear fallback exists', () => {
    expect(
      selectWatchPlaybackSources({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        dashUrl,
        hlsUrl,
        hlsUrlClear: null,
        drmToken,
      })
    ).toEqual({
      dashUrl: null,
      hlsUrl,
      drmToken,
      isAppleHlsBrowser: true,
      isClearHlsFallback: false,
    });
  });

  test('keeps DASH and DRM token for non-Apple browsers', () => {
    expect(
      selectWatchPlaybackSources({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        dashUrl,
        hlsUrl,
        hlsUrlClear,
        drmToken,
      })
    ).toEqual({
      dashUrl,
      hlsUrl,
      drmToken,
      isAppleHlsBrowser: false,
      isClearHlsFallback: false,
    });
  });
});
