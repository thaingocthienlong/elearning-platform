import { isAppleHlsBrowser } from '@/lib/playback-routing';

const REQUIRED_FAIRPLAY_ENV = [
  'DOVERUNNER_FAIRPLAY_CERT_URL',
] as const;

export type SafariFairPlayEnvName = (typeof REQUIRED_FAIRPLAY_ENV)[number];

export interface SafariFairPlayEnv {
  DOVERUNNER_FAIRPLAY_CERT_URL?: string;
}

export interface SafariFairPlayReadiness {
  fairPlayReady: boolean;
  mode: 'fairplay-drm' | 'blocked';
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
    mode: fairPlayReady ? 'fairplay-drm' : 'blocked',
    missing: [...missing],
    invalid: [...invalid],
  };
}

export function getSafariPlaybackExpectation({
  userAgent,
  hlsUrl,
  fairPlayReady,
}: SafariPlaybackExpectationInput): SafariPlaybackExpectation {
  if (!isAppleHlsBrowser(userAgent)) {
    return {
      appleBrowser: false,
      expectedMode: 'not-apple-browser',
      reason: 'This check is only for Safari/iOS Apple HLS playback.',
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
    reason: 'Safari protected playback requires DoveRunner FairPlay config and protected HLS.',
  };
}
