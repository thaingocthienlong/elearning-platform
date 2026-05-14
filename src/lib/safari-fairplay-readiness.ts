import { isAppleHlsBrowser } from '@/lib/playback-routing';

const REQUIRED_FAIRPLAY_ENV = [
  'AXINOM_FAIRPLAY_CERT_URL',
  'NEXT_PUBLIC_AX_FP_LS_URL',
] as const;

export type SafariFairPlayEnvName = (typeof REQUIRED_FAIRPLAY_ENV)[number];

export interface SafariFairPlayEnv {
  AXINOM_FAIRPLAY_CERT_URL?: string;
  NEXT_PUBLIC_AX_FP_LS_URL?: string;
}

export interface SafariFairPlayReadiness {
  fairPlayReady: boolean;
  mode: 'fairplay-drm' | 'clear-hls-or-blocked';
  missing: SafariFairPlayEnvName[];
  invalid: SafariFairPlayEnvName[];
}

export interface SafariPlaybackExpectationInput {
  userAgent: string;
  hlsUrl: string | null;
  hlsUrlClear: string | null;
  fairPlayReady: boolean;
}

export interface SafariPlaybackExpectation {
  appleBrowser: boolean;
  expectedMode:
    | 'fairplay-drm'
    | 'clear-hls-fallback'
    | 'blocked'
    | 'not-apple-browser';
  reason: string;
}

function hasHttpUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function getSafariFairPlayReadiness(
  env: SafariFairPlayEnv
): SafariFairPlayReadiness {
  const missing = REQUIRED_FAIRPLAY_ENV.filter((name) => !env[name]);
  const invalid = REQUIRED_FAIRPLAY_ENV.filter((name) => {
    const value = env[name];
    return Boolean(value) && !hasHttpUrl(value);
  });
  const fairPlayReady = missing.length === 0 && invalid.length === 0;

  return {
    fairPlayReady,
    mode: fairPlayReady ? 'fairplay-drm' : 'clear-hls-or-blocked',
    missing: [...missing],
    invalid: [...invalid],
  };
}

export function getSafariPlaybackExpectation({
  userAgent,
  hlsUrl,
  hlsUrlClear,
  fairPlayReady,
}: SafariPlaybackExpectationInput): SafariPlaybackExpectation {
  if (!isAppleHlsBrowser(userAgent)) {
    return {
      appleBrowser: false,
      expectedMode: 'not-apple-browser',
      reason: 'This check is only for Safari/iOS Apple HLS playback.',
    };
  }

  if (hlsUrlClear) {
    return {
      appleBrowser: true,
      expectedMode: 'clear-hls-fallback',
      reason: 'Safari should use clear HLS fallback because clear HLS is available for Apple playback.',
    };
  }

  if (fairPlayReady && hlsUrl) {
    return {
      appleBrowser: true,
      expectedMode: 'fairplay-drm',
      reason: 'Safari has protected HLS and FairPlay env is configured.',
    };
  }

  return {
    appleBrowser: true,
    expectedMode: 'blocked',
    reason: 'Safari has no clear HLS fallback and FairPlay env is not configured.',
  };
}
