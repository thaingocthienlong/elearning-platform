import type { TencentEnv, TencentValidationMode } from './types';

export type TencentEnvValidation = {
  ok: boolean;
  mode: TencentValidationMode;
  warnings: string[];
  errors: string[];
};

const REQUIRED_STRICT = [
  'TENCENT_SECRET_ID',
  'TENCENT_SECRET_KEY',
  'TENCENT_VOD_PLAYBACK_KEY',
  'TENCENT_VOD_REGION',
  'TENCENT_VOD_PROCEDURE_NAME',
  'TENCENT_VOD_WEBHOOK_SIGN_KEY',
  'NEXT_PUBLIC_TENCENT_WIDEVINE_LICENSE_URL',
  'NEXT_PUBLIC_TENCENT_FAIRPLAY_LICENSE_URL',
] as const;

function read(env: NodeJS.ProcessEnv | Record<string, string | undefined>, name: string) {
  const value = env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readPlaybackKey(env: NodeJS.ProcessEnv | Record<string, string | undefined>) {
  return read(env, 'TENCENT_VOD_PLAYBACK_KEY') || read(env, 'TENCENT_PLAYBACK_KEY') || read(env, 'TENCENT_VOD_PKEY');
}

export function validateTencentEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  mode: TencentValidationMode = 'local'
): TencentEnvValidation {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (mode === 'strict') {
    for (const name of REQUIRED_STRICT) {
      const present = name === 'TENCENT_VOD_PLAYBACK_KEY'
        ? readPlaybackKey(env)
        : read(env, name);
      if (!present) {
        errors.push(`${name} is required for Tencent strict validation.`);
      }
    }
  } else if (!read(env, 'TENCENT_SECRET_ID') || !read(env, 'TENCENT_SECRET_KEY')) {
    warnings.push('Tencent live credentials are not configured; live checks will be skipped.');
  }

  const subAppId = read(env, 'TENCENT_VOD_SUB_APP_ID');
  if (subAppId && !/^\d+$/.test(subAppId)) {
    errors.push('TENCENT_VOD_SUB_APP_ID must be a number when provided.');
  }

  return {
    ok: errors.length === 0,
    mode,
    warnings,
    errors,
  };
}

export function loadTencentEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): TencentEnv {
  const validation = validateTencentEnv(env, 'strict');
  if (!validation.ok) {
    throw new Error(validation.errors.join(' '));
  }

  const subAppId = read(env, 'TENCENT_VOD_SUB_APP_ID');
  const playbackKey = readPlaybackKey(env);

  return {
    secretId: read(env, 'TENCENT_SECRET_ID')!,
    secretKey: read(env, 'TENCENT_SECRET_KEY')!,
    playbackKey: playbackKey!,
    region: read(env, 'TENCENT_VOD_REGION')!,
    subAppId: subAppId ? Number(subAppId) : undefined,
    procedureName: read(env, 'TENCENT_VOD_PROCEDURE_NAME')!,
    webhookSignKey: read(env, 'TENCENT_VOD_WEBHOOK_SIGN_KEY')!,
    widevineLicenseUrl: read(env, 'NEXT_PUBLIC_TENCENT_WIDEVINE_LICENSE_URL')!,
    fairplayLicenseUrl: read(env, 'NEXT_PUBLIC_TENCENT_FAIRPLAY_LICENSE_URL')!,
    fairplayCertUrl: read(env, 'NEXT_PUBLIC_TENCENT_FAIRPLAY_CERT_URL'),
  };
}
