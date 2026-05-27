type Env = Record<string, string | undefined>;

export type DoveRunnerUploadConfig = {
  siteId: string;
  tnpAccountId: string;
  tnpAccessKey: string;
  tnpInputStorageId: string;
  tnpOutputStorageId: string;
  tnpApiBaseUrl: string;
  awsRegion: string;
  awsInputBucket: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  tnpDrmEnabled: boolean;
};

function required(env: Env, key: string) {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required DoveRunner upload environment variable: ${key}`);
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

export function readDoveRunnerUploadConfig(env: Env = process.env): DoveRunnerUploadConfig {
  return {
    siteId: required(env, 'DOVERUNNER_SITE_ID'),
    tnpAccountId: required(env, 'DOVERUNNER_TNP_ACCOUNT_ID'),
    tnpAccessKey: required(env, 'DOVERUNNER_TNP_ACCESS_KEY'),
    tnpInputStorageId: required(env, 'DOVERUNNER_TNP_INPUT_STORAGE_ID'),
    tnpOutputStorageId: required(env, 'DOVERUNNER_TNP_OUTPUT_STORAGE_ID'),
    tnpApiBaseUrl: trimTrailingSlash(env.DOVERUNNER_TNP_API_BASE_URL?.trim() || 'https://tnp.doverunner.com'),
    awsRegion: required(env, 'AWS_REGION'),
    awsInputBucket: required(env, 'AWS_S3_INPUT_BUCKET'),
    awsAccessKeyId: required(env, 'AWS_ACCESS_KEY_ID'),
    awsSecretAccessKey: required(env, 'AWS_SECRET_ACCESS_KEY'),
    tnpDrmEnabled: optionalBoolean(env, 'DOVERUNNER_TNP_DRM_ENABLED', true),
  };
}
