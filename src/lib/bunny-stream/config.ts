export type BunnyStreamValidationMode = 'local' | 'strict';

type Env = Record<string, string | undefined>;

export type BunnyStreamConfig = {
  libraryId: string;
  apiKey: string;
  readOnlyApiKey: string;
  tokenSecurityKey: string;
  tusExpireSeconds: number;
  embedTokenTtlSeconds: number;
  apiTimeoutMs: number;
  pullZoneHostname: string | null;
  defaultCollectionId: string | null;
};

export type BunnyStreamConfigValidation = {
  ok: boolean;
  mode: BunnyStreamValidationMode;
  errors: string[];
};

const REQUIRED = [
  'BUNNY_STREAM_LIBRARY_ID',
  'BUNNY_STREAM_API_KEY',
  'BUNNY_STREAM_READ_ONLY_API_KEY',
  'BUNNY_STREAM_TOKEN_SECURITY_KEY',
] as const;

const TUS_EXPIRE_SECONDS_POLICY = {
  name: 'BUNNY_STREAM_TUS_EXPIRE_SECONDS',
  fallback: 86400,
  min: 3600,
  max: 604800,
} as const;

const API_TIMEOUT_MS_POLICY = {
  name: 'BUNNY_STREAM_API_TIMEOUT_MS',
  fallback: 10000,
  min: 1000,
  max: 60000,
} as const;

function readRequired(env: Env, name: (typeof REQUIRED)[number]) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for Bunny Stream.`);
  }
  return value;
}

function readPositiveInteger(env: Env, name: string, fallback: number) {
  const raw = env[name]?.trim();
  if (!raw) return fallback;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function getBoundedIntegerError(
  env: Env,
  policy: { name: string; min: number; max: number }
) {
  const raw = env[policy.name]?.trim();
  if (!raw) return null;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < policy.min || parsed > policy.max) {
    return `${policy.name} must be between ${policy.min} and ${policy.max}.`;
  }

  return null;
}

function readBoundedInteger(
  env: Env,
  policy: { name: string; fallback: number; min: number; max: number }
) {
  const raw = env[policy.name]?.trim();
  if (!raw) return policy.fallback;

  const error = getBoundedIntegerError(env, policy);
  if (error) throw new Error(error);

  return Number(raw);
}

export function validateBunnyStreamConfig(
  env: Env = process.env,
  mode: BunnyStreamValidationMode = 'local'
): BunnyStreamConfigValidation {
  const errors: string[] = [];

  for (const name of REQUIRED) {
    if (!env[name]?.trim()) {
      errors.push(`${name} is required for Bunny Stream.`);
    }
  }

  for (const name of ['BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS']) {
    const raw = env[name]?.trim();
    if (!raw) continue;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      errors.push(`${name} must be a positive integer.`);
    }
  }

  for (const policy of [TUS_EXPIRE_SECONDS_POLICY, API_TIMEOUT_MS_POLICY]) {
    const error = getBoundedIntegerError(env, policy);
    if (error) errors.push(error);
  }

  return { ok: errors.length === 0, mode, errors };
}

export function readBunnyStreamConfig(
  env: Env = process.env
): BunnyStreamConfig {
  return {
    libraryId: readRequired(env, 'BUNNY_STREAM_LIBRARY_ID'),
    apiKey: readRequired(env, 'BUNNY_STREAM_API_KEY'),
    readOnlyApiKey: readRequired(env, 'BUNNY_STREAM_READ_ONLY_API_KEY'),
    tokenSecurityKey: readRequired(env, 'BUNNY_STREAM_TOKEN_SECURITY_KEY'),
    tusExpireSeconds: readBoundedInteger(env, TUS_EXPIRE_SECONDS_POLICY),
    embedTokenTtlSeconds: readPositiveInteger(
      env,
      'BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS',
      300
    ),
    apiTimeoutMs: readBoundedInteger(env, API_TIMEOUT_MS_POLICY),
    pullZoneHostname: env.BUNNY_STREAM_PULL_ZONE_HOSTNAME?.trim() || null,
    defaultCollectionId:
      env.BUNNY_STREAM_DEFAULT_COLLECTION_ID?.trim() || null,
  };
}
