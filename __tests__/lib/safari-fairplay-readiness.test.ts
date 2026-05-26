import {
  getSafariFairPlayReadiness,
  getSafariPlaybackExpectation,
} from '@/lib/safari-fairplay-readiness';

const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

describe('safari fairplay readiness', () => {
  test('is ready when DoveRunner FairPlay certificate URL is configured', () => {
    expect(
      getSafariFairPlayReadiness({
        DOVERUNNER_FAIRPLAY_CERT_URL: 'https://media.example/fairplay.cer',
      })
    ).toEqual({
      fairPlayReady: true,
      mode: 'fairplay-drm',
      missing: [],
      invalid: [],
    });
  });

  test('reports missing DoveRunner FairPlay env', () => {
    expect(getSafariFairPlayReadiness({})).toEqual({
      fairPlayReady: false,
      mode: 'blocked',
      missing: ['DOVERUNNER_FAIRPLAY_CERT_URL'],
      invalid: [],
    });
  });

  test('reports invalid DoveRunner FairPlay URL', () => {
    expect(
      getSafariFairPlayReadiness({
        DOVERUNNER_FAIRPLAY_CERT_URL: 'not-a-url',
      })
    ).toEqual({
      fairPlayReady: false,
      mode: 'blocked',
      missing: [],
      invalid: ['DOVERUNNER_FAIRPLAY_CERT_URL'],
    });
  });

  test('expects FairPlay DRM for macOS Safari when ready and protected HLS exists', () => {
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

  test('blocks Safari protected playback when FairPlay is not ready', () => {
    expect(
      getSafariPlaybackExpectation({
        userAgent: SAFARI_MAC,
        hlsUrl: 'https://media.example/protected/master.m3u8',
        hlsUrlClear: 'https://media.example/clear/master.m3u8',
        fairPlayReady: false,
      })
    ).toEqual({
      appleBrowser: true,
      expectedMode: 'blocked',
      reason: 'Safari protected playback requires DoveRunner FairPlay config and protected HLS.',
    });
  });

  test('ignores non-Apple browser checks', () => {
    expect(
      getSafariPlaybackExpectation({
        userAgent: CHROME_MAC,
        hlsUrl: 'https://media.example/protected/master.m3u8',
        hlsUrlClear: null,
        fairPlayReady: false,
      })
    ).toEqual({
      appleBrowser: false,
      expectedMode: 'not-apple-browser',
      reason: 'This check is only for Safari/iOS Apple HLS playback.',
    });
  });
});
