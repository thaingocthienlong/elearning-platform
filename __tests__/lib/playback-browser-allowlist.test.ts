import {
  getPlaybackBrowserGate,
  isAllowedPlaybackBrowser,
} from '@/lib/playback-browser-allowlist';

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const EDGE_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0';
const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const FIREFOX_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0';
const OPERA_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 OPR/110.0.0.0';
const CHROME_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.0.0 Mobile/15E148 Safari/604.1';

describe('playback browser allowlist', () => {
  it('allows Google Chrome and Safari', () => {
    expect(isAllowedPlaybackBrowser(CHROME_WINDOWS)).toBe(true);
    expect(isAllowedPlaybackBrowser(SAFARI_MAC)).toBe(true);
    expect(isAllowedPlaybackBrowser(CHROME_IOS)).toBe(true);
  });

  it('blocks Edge, Firefox, Opera, and unknown browsers', () => {
    expect(isAllowedPlaybackBrowser(EDGE_WINDOWS)).toBe(false);
    expect(isAllowedPlaybackBrowser(FIREFOX_WINDOWS)).toBe(false);
    expect(isAllowedPlaybackBrowser(OPERA_WINDOWS)).toBe(false);
    expect(isAllowedPlaybackBrowser('')).toBe(false);
  });

  it('returns a user-facing blocked reason', () => {
    expect(getPlaybackBrowserGate(EDGE_WINDOWS)).toEqual({
      allowed: false,
      browserName: 'Microsoft Edge',
      message: 'Video playback is temporarily available only on Google Chrome and Safari.',
    });
  });
});
