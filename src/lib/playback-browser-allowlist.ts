const BLOCKED_CHROMIUM_TOKENS = [
  'Edg',
  'Edge',
  'OPR',
  'Opera',
  'SamsungBrowser',
  'DuckDuckGo',
  'YaBrowser',
  'Brave',
  'Firefox',
  'FxiOS',
];

export function getPlaybackBrowserName(userAgent: string) {
  if (/Edg|Edge/.test(userAgent)) return 'Microsoft Edge';
  if (/OPR|Opera/.test(userAgent)) return 'Opera';
  if (/FxiOS|Firefox/.test(userAgent)) return 'Firefox';
  if (/SamsungBrowser/.test(userAgent)) return 'Samsung Internet';
  if (/CriOS|Chrome/.test(userAgent) && !hasBlockedChromiumToken(userAgent)) return 'Google Chrome';
  if (/Safari/.test(userAgent) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR/.test(userAgent)) return 'Safari';
  return 'this browser';
}

export function isAllowedPlaybackBrowser(userAgent: string) {
  if (!userAgent.trim()) return false;

  const isChrome = /Chrome|CriOS/.test(userAgent) && !hasBlockedChromiumToken(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR/.test(userAgent);

  return isChrome || isSafari;
}

export function getPlaybackBrowserGate(userAgent: string) {
  const allowed = isAllowedPlaybackBrowser(userAgent);

  return {
    allowed,
    browserName: getPlaybackBrowserName(userAgent),
    message: allowed
      ? ''
      : 'Video playback is temporarily available only on Google Chrome and Safari.',
  };
}

function hasBlockedChromiumToken(userAgent: string) {
  return BLOCKED_CHROMIUM_TOKENS.some((token) => userAgent.includes(token));
}
