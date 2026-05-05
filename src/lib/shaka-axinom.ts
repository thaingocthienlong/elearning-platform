export const SHAKA_AXINOM_LICENSE_URL_DEFAULTS = {
  widevine: 'https://drm-widevine-licensing.axprod.net/AcquireLicense',
  playready: 'https://drm-playready-licensing.axprod.net/AcquireLicense',
  fairplay: 'https://drm-fairplay-licensing.axprod.net/AcquireLicense',
} as const;

export type AxinomDrmType = 'widevine' | 'playready' | 'fairplay';

type Env = Record<string, string | undefined>;

type ShakaRequest = {
  headers: Record<string, string>;
};

function read(env: Env, name: string) {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

export function resolveAxinomLicenseServerUrl(
  drmType: AxinomDrmType | undefined,
  fallbackUrl?: string,
  env: Env = process.env
) {
  if (drmType === 'widevine') {
    return read(env, 'NEXT_PUBLIC_AX_WV_LS_URL') ?? fallbackUrl ?? SHAKA_AXINOM_LICENSE_URL_DEFAULTS.widevine;
  }

  if (drmType === 'playready') {
    return read(env, 'NEXT_PUBLIC_AX_PR_LS_URL') ?? fallbackUrl ?? SHAKA_AXINOM_LICENSE_URL_DEFAULTS.playready;
  }

  if (drmType === 'fairplay') {
    return read(env, 'NEXT_PUBLIC_AX_FP_LS_URL') ?? fallbackUrl ?? SHAKA_AXINOM_LICENSE_URL_DEFAULTS.fairplay;
  }

  return fallbackUrl;
}

export function shouldAttachAxinomMessage(
  requestType: number,
  licenseRequestType: number,
  message?: string
) {
  return Boolean(message) && requestType === licenseRequestType;
}

export function attachAxinomMessageHeader(
  request: ShakaRequest,
  message: string
) {
  request.headers['X-AxDRM-Message'] = message;
}

export function applyAxinomMessageHeader(options: {
  requestType: number;
  licenseRequestType: number;
  request: ShakaRequest;
  message?: string;
}) {
  if (
    shouldAttachAxinomMessage(
      options.requestType,
      options.licenseRequestType,
      options.message
    )
  ) {
    attachAxinomMessageHeader(options.request, options.message!);
  }
}
