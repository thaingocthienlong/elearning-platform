type Env = Record<string, string | undefined>;

export type DoveRunnerConfig = {
  siteId: string;
  siteAccessKey: string;
  licenseUrl: string;
  tnpAccountId: string;
  tnpAccessKey: string;
  tnpInputStorageId: string;
  tnpOutputStorageId: string;
  tnpApiBaseUrl: string;
  outputBaseUrl: string;
  dashManifestName: string;
  hlsManifestName: string;
  awsRegion: string;
  awsInputBucket: string;
  awsOutputBucket: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  fairPlayCertUrl?: string;
  licenseTokenTtlSeconds: number;
  tnpDrmEnabled: boolean;
};

function required(env: Env, key: string) {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required DoveRunner media environment variable: ${key}`);
  }
  return value;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function optionalBoolean(env: Env, key: string, defaultValue: boolean) {
  const value = env[key]?.trim().toLowerCase();
  if (!value) return defaultValue;
  if (['1', 'true', 'yes', 'on'].includes(value)) return true;
  if (['0', 'false', 'no', 'off'].includes(value)) return false;
  throw new Error(`${key} must be a boolean value`);
}

export function readDoveRunnerConfig(env: Env = process.env): DoveRunnerConfig {
  const licenseTokenTtlSeconds = Number(env.DOVERUNNER_LICENSE_TOKEN_TTL_SECONDS ?? '300');

  if (!Number.isFinite(licenseTokenTtlSeconds) || licenseTokenTtlSeconds <= 0) {
    throw new Error('DOVERUNNER_LICENSE_TOKEN_TTL_SECONDS must be a positive number');
  }

  return {
    siteId: required(env, 'DOVERUNNER_SITE_ID'),
    siteAccessKey: required(env, 'DOVERUNNER_ACCESS_KEY'),
    licenseUrl: env.DOVERUNNER_LICENSE_URL?.trim() || 'https://drm-license.doverunner.com/ri/licenseManager.do',
    tnpAccountId: required(env, 'DOVERUNNER_TNP_ACCOUNT_ID'),
    tnpAccessKey: required(env, 'DOVERUNNER_TNP_ACCESS_KEY'),
    tnpInputStorageId: required(env, 'DOVERUNNER_TNP_INPUT_STORAGE_ID'),
    tnpOutputStorageId: required(env, 'DOVERUNNER_TNP_OUTPUT_STORAGE_ID'),
    tnpApiBaseUrl: trimTrailingSlash(env.DOVERUNNER_TNP_API_BASE_URL?.trim() || 'https://tnp.doverunner.com'),
    outputBaseUrl: trimTrailingSlash(required(env, 'DOVERUNNER_OUTPUT_BASE_URL')),
    dashManifestName: env.DOVERUNNER_DASH_MANIFEST_NAME?.trim() || 'manifest.mpd',
    hlsManifestName: env.DOVERUNNER_HLS_MANIFEST_NAME?.trim() || 'master.m3u8',
    awsRegion: required(env, 'AWS_REGION'),
    awsInputBucket: required(env, 'AWS_S3_INPUT_BUCKET'),
    awsOutputBucket: required(env, 'AWS_S3_OUTPUT_BUCKET'),
    awsAccessKeyId: required(env, 'AWS_ACCESS_KEY_ID'),
    awsSecretAccessKey: required(env, 'AWS_SECRET_ACCESS_KEY'),
    fairPlayCertUrl: env.DOVERUNNER_FAIRPLAY_CERT_URL?.trim() || undefined,
    licenseTokenTtlSeconds,
    tnpDrmEnabled: optionalBoolean(env, 'DOVERUNNER_TNP_DRM_ENABLED', true),
  };
}
