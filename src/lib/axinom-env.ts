export const AXINOM_LICENSE_URL_DEFAULTS = {
  widevine: 'https://drm-widevine-licensing.axprod.net/AcquireLicense',
  playready: 'https://drm-playready-licensing.axprod.net/AcquireLicense',
  fairplay: 'https://drm-fairplay-licensing.axprod.net/AcquireLicense',
} as const;

type Env = Record<string, string | undefined>;

export type AxinomValidationMode = 'local' | 'strict';

export type AxinomEnvValidation = {
  ok: boolean;
  mode: AxinomValidationMode;
  values: {
    communicationKeyId?: string;
    communicationKeySecret?: string;
    encodingClientId?: string;
    encodingClientSecret?: string;
    encodingProfileDrm?: string;
    encodingProfileClear?: string;
    encodingApiUrl?: string;
    videoServiceUrl?: string;
    webhookSecret?: string;
    fairplayCertUrl?: string;
    widevineLicenseUrl: string;
    playreadyLicenseUrl: string;
    fairplayLicenseUrl: string;
  };
  warnings: string[];
  errors: string[];
};

const CANONICAL_REQUIRED_FOR_STRICT = [
  'AXINOM_COM_KEY_ID',
  'AXINOM_COM_KEY_SECRET',
  'AXINOM_ENCODING_CLIENT_ID',
  'AXINOM_ENCODING_CLIENT_SECRET',
  'AXINOM_ENCODING_PROFILE_DRM',
  'AXINOM_ENCODING_PROFILE_CLEAR',
  'AXINOM_VIDEO_SERVICE_URL',
  'AXINOM_WEBHOOK_SECRET',
] as const;

const LEGACY_ALIASES: Record<string, string[]> = {
  AXINOM_ENCODING_CLIENT_ID: ['AX_CLIENT_ID'],
  AXINOM_ENCODING_CLIENT_SECRET: ['AX_CLIENT_SECRET'],
  AXINOM_ENCODING_PROFILE_DRM: ['AX_PROFILE_ID'],
  AXINOM_ENCODING_API_URL: ['AX_ENCODING_BASE'],
};

function read(env: Env, name: string) {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

function resolveValue(
  env: Env,
  canonical: string,
  warnings: string[],
  errors: string[],
  mode: AxinomValidationMode
) {
  const canonicalValue = read(env, canonical);
  const aliases = LEGACY_ALIASES[canonical] ?? [];
  const presentAliases = aliases.filter((alias) => read(env, alias));

  if (canonicalValue && presentAliases.length > 0) {
    warnings.push(
      `${canonical} is set; legacy alias ${presentAliases.join(', ')} is ignored.`
    );
  }

  if (canonicalValue) {
    return canonicalValue;
  }

  if (presentAliases.length > 0) {
    const message = `${canonical} is missing; legacy alias ${presentAliases.join(', ')} is present.`;
    if (mode === 'strict') {
      errors.push(`${message} Set the canonical variable for staging.`);
    } else {
      warnings.push(`${message} Local compatibility will use the legacy value temporarily.`);
      return read(env, presentAliases[0]);
    }
  }

  return undefined;
}

function requiredMissing(env: Env, name: string) {
  return !read(env, name) && !(LEGACY_ALIASES[name] ?? []).some((alias) => read(env, alias));
}

export function validateAxinomEnv(
  env: Env = process.env,
  mode: AxinomValidationMode = 'local'
): AxinomEnvValidation {
  const warnings: string[] = [];
  const errors: string[] = [];

  const values = {
    communicationKeyId: resolveValue(env, 'AXINOM_COM_KEY_ID', warnings, errors, mode),
    communicationKeySecret: resolveValue(env, 'AXINOM_COM_KEY_SECRET', warnings, errors, mode),
    encodingClientId: resolveValue(env, 'AXINOM_ENCODING_CLIENT_ID', warnings, errors, mode),
    encodingClientSecret: resolveValue(env, 'AXINOM_ENCODING_CLIENT_SECRET', warnings, errors, mode),
    encodingProfileDrm: resolveValue(env, 'AXINOM_ENCODING_PROFILE_DRM', warnings, errors, mode),
    encodingProfileClear: resolveValue(env, 'AXINOM_ENCODING_PROFILE_CLEAR', warnings, errors, mode),
    encodingApiUrl: resolveValue(env, 'AXINOM_ENCODING_API_URL', warnings, errors, mode),
    videoServiceUrl: resolveValue(env, 'AXINOM_VIDEO_SERVICE_URL', warnings, errors, mode),
    webhookSecret: resolveValue(env, 'AXINOM_WEBHOOK_SECRET', warnings, errors, mode),
    fairplayCertUrl: resolveValue(env, 'AXINOM_FAIRPLAY_CERT_URL', warnings, errors, mode),
    widevineLicenseUrl:
      read(env, 'NEXT_PUBLIC_AX_WV_LS_URL') ?? AXINOM_LICENSE_URL_DEFAULTS.widevine,
    playreadyLicenseUrl:
      read(env, 'NEXT_PUBLIC_AX_PR_LS_URL') ?? AXINOM_LICENSE_URL_DEFAULTS.playready,
    fairplayLicenseUrl:
      read(env, 'NEXT_PUBLIC_AX_FP_LS_URL') ?? AXINOM_LICENSE_URL_DEFAULTS.fairplay,
  };

  if (mode === 'strict') {
    for (const variableName of CANONICAL_REQUIRED_FOR_STRICT) {
      if (requiredMissing(env, variableName)) {
        errors.push(`${variableName} is required for Axinom staging/strict validation.`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    mode,
    values,
    warnings,
    errors,
  };
}
