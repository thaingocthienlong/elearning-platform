export interface WatchPlaybackSourceInput {
  userAgent: string;
  dashUrl: string | null;
  hlsUrl: string | null;
  hlsUrlClear: string | null;
  drmToken: string;
}

export interface WatchPlaybackSources {
  dashUrl: string | null;
  hlsUrl: string | null;
  drmToken: string;
  isAppleHlsBrowser: boolean;
  isClearHlsFallback: boolean;
}

export function isAppleHlsBrowser(userAgent: string): boolean {
  const isIOS = /iPhone|iPad|iPod/.test(userAgent);
  const isMac = /Mac OS/.test(userAgent) && !isIOS;
  const isSafari = /Safari/.test(userAgent) && !/Chrome|Chromium|CriOS|FxiOS|Edg/.test(userAgent);

  return isIOS || (isMac && isSafari);
}

export function selectWatchPlaybackSources({
  userAgent,
  dashUrl,
  hlsUrl,
  drmToken,
}: WatchPlaybackSourceInput): WatchPlaybackSources {
  const appleHlsBrowser = isAppleHlsBrowser(userAgent);

  if (appleHlsBrowser) {
    return {
      dashUrl: null,
      hlsUrl,
      drmToken,
      isAppleHlsBrowser: true,
      isClearHlsFallback: false,
    };
  }

  return {
    dashUrl,
    hlsUrl,
    drmToken,
    isAppleHlsBrowser: false,
    isClearHlsFallback: false,
  };
}
