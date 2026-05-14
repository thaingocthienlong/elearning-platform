import {
  getSafariFairPlayReadiness,
  getSafariPlaybackExpectation,
} from '@/lib/safari-fairplay-readiness';

const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

describe('Safari FairPlay readiness', () => {
  test('reports FairPlay ready when certificate and FairPlay license URL are configured', () => {
    expect(
      getSafariFairPlayReadiness({
        AXINOM_FAIRPLAY_CERT_URL: 'https://tools.axinom.com/FPScert/fairplay.cer',
        NEXT_PUBLIC_AX_FP_LS_URL: 'https://drm-fairplay-licensing.axprod.net/AcquireLicense',
      })
    ).toEqual({
      fairPlayReady: true,
      mode: 'fairplay-drm',
      missing: [],
      invalid: [],
    });
  });

  test('reports missing FairPlay variables without leaking values', () => {
    expect(getSafariFairPlayReadiness({})).toEqual({
      fairPlayReady: false,
      mode: 'clear-hls-or-blocked',
      missing: ['AXINOM_FAIRPLAY_CERT_URL', 'NEXT_PUBLIC_AX_FP_LS_URL'],
      invalid: [],
    });
  });

  test('reports invalid URL names without including configured values', () => {
    expect(
      getSafariFairPlayReadiness({
        AXINOM_FAIRPLAY_CERT_URL: 'not-a-url',
        NEXT_PUBLIC_AX_FP_LS_URL: 'ftp://licenses.example/fairplay',
      })
    ).toEqual({
      fairPlayReady: false,
      mode: 'clear-hls-or-blocked',
      missing: [],
      invalid: ['AXINOM_FAIRPLAY_CERT_URL', 'NEXT_PUBLIC_AX_FP_LS_URL'],
    });
  });

  test('expects FairPlay DRM for macOS Safari when FairPlay is ready and protected HLS exists', () => {
    expect(
      getSafariPlaybackExpectation({
        userAgent: SAFARI_MAC,
        hlsUrl: 'https://media.example/protected/master.m3u8',
        hlsUrlClear: null,
        fairPlayReady: true,
      })
    ).toEqual({
      appleBrowser: true,
      expectedMode: 'fairplay-drm',
      reason: 'Safari has protected HLS and FairPlay env is configured.',
    });
  });

  test('expects clear HLS fallback for macOS Safari when FairPlay is not ready and clear HLS exists', () => {
    expect(
      getSafariPlaybackExpectation({
        userAgent: SAFARI_MAC,
        hlsUrl: 'https://media.example/protected/master.m3u8',
        hlsUrlClear: 'https://media.example/clear/master.m3u8',
        fairPlayReady: false,
      })
    ).toEqual({
      appleBrowser: true,
      expectedMode: 'clear-hls-fallback',
      reason: 'Safari should use clear HLS fallback because clear HLS is available for Apple playback.',
    });
  });

  test('expects clear HLS fallback for macOS Safari when protected and clear HLS both exist', () => {
    expect(
      getSafariPlaybackExpectation({
        userAgent: SAFARI_MAC,
        hlsUrl: 'https://media.example/protected/master.m3u8',
        hlsUrlClear: 'https://media.example/clear/master.m3u8',
        fairPlayReady: true,
      })
    ).toEqual({
      appleBrowser: true,
      expectedMode: 'clear-hls-fallback',
      reason: 'Safari should use clear HLS fallback because clear HLS is available for Apple playback.',
    });
  });

  test('expects clear HLS fallback for macOS Safari when FairPlay is ready but protected HLS is missing', () => {
    expect(
      getSafariPlaybackExpectation({
        userAgent: SAFARI_MAC,
        hlsUrl: null,
        hlsUrlClear: 'https://media.example/clear/master.m3u8',
        fairPlayReady: true,
      })
    ).toEqual({
      appleBrowser: true,
      expectedMode: 'clear-hls-fallback',
      reason: 'Safari should use clear HLS fallback because clear HLS is available for Apple playback.',
    });
  });

  test('expects blocked playback for macOS Safari when neither FairPlay nor clear HLS is available', () => {
    expect(
      getSafariPlaybackExpectation({
        userAgent: SAFARI_MAC,
        hlsUrl: 'https://media.example/protected/master.m3u8',
        hlsUrlClear: null,
        fairPlayReady: false,
      })
    ).toEqual({
      appleBrowser: true,
      expectedMode: 'blocked',
      reason: 'Safari has no clear HLS fallback and FairPlay env is not configured.',
    });
  });

  test('does not classify macOS Chrome as an Apple HLS browser', () => {
    expect(
      getSafariPlaybackExpectation({
        userAgent: CHROME_MAC,
        hlsUrl: 'https://media.example/protected/master.m3u8',
        hlsUrlClear: 'https://media.example/clear/master.m3u8',
        fairPlayReady: false,
      })
    ).toEqual({
      appleBrowser: false,
      expectedMode: 'not-apple-browser',
      reason: 'This check is only for Safari/iOS Apple HLS playback.',
    });
  });
});
