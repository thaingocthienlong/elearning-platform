export type BunnyStreamValidationMode = 'local' | 'strict';

type Env = Record<string, string | undefined>;

export type BunnyStreamConfig = {
  libraryId: string;
  apiKey: string;
  readOnlyApiKey: string;
  tokenSecurityKey: string;
  tusExpireSeconds: number;
  embedTokenTtlSeconds: number;
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

  for (const name of [
    'BUNNY_STREAM_TUS_EXPIRE_SECONDS',
    'BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS',
  ]) {
    const raw = env[name]?.trim();
    if (!raw) continue;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      errors.push(`${name} must be a positive integer.`);
    }
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
    tusExpireSeconds: readPositiveInteger(
      env,
      'BUNNY_STREAM_TUS_EXPIRE_SECONDS',
      86400
    ),
    embedTokenTtlSeconds: readPositiveInteger(
      env,
      'BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS',
      300
    ),
    pullZoneHostname: env.BUNNY_STREAM_PULL_ZONE_HOSTNAME?.trim() || null,
    defaultCollectionId:
      env.BUNNY_STREAM_DEFAULT_COLLECTION_ID?.trim() || null,
  };
}
