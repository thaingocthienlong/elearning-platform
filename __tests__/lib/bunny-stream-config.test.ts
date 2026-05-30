import {
  readBunnyStreamConfig,
  validateBunnyStreamConfig,
} from '@/lib/bunny-stream/config';

describe('Bunny Stream config', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('reads configured values and parses numeric TTLs', () => {
    process.env.BUNNY_STREAM_LIBRARY_ID = '123456';
    process.env.BUNNY_STREAM_API_KEY = 'api-key';
    process.env.BUNNY_STREAM_READ_ONLY_API_KEY = 'read-only';
    process.env.BUNNY_STREAM_TOKEN_SECURITY_KEY = 'token-key';
    process.env.BUNNY_STREAM_TUS_EXPIRE_SECONDS = '7200';
    process.env.BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS = '180';

    expect(readBunnyStreamConfig(process.env)).toEqual({
      libraryId: '123456',
      apiKey: 'api-key',
      readOnlyApiKey: 'read-only',
      tokenSecurityKey: 'token-key',
      tusExpireSeconds: 7200,
      embedTokenTtlSeconds: 180,
      pullZoneHostname: process.env.BUNNY_STREAM_PULL_ZONE_HOSTNAME || null,
      defaultCollectionId: process.env.BUNNY_STREAM_DEFAULT_COLLECTION_ID || null,
    });
  });

  test('uses safe defaults for TTLs', () => {
    process.env.BUNNY_STREAM_LIBRARY_ID = '123456';
    process.env.BUNNY_STREAM_API_KEY = 'api-key';
    process.env.BUNNY_STREAM_READ_ONLY_API_KEY = 'read-only';
    process.env.BUNNY_STREAM_TOKEN_SECURITY_KEY = 'token-key';
    delete process.env.BUNNY_STREAM_TUS_EXPIRE_SECONDS;
    delete process.env.BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS;

    const config = readBunnyStreamConfig(process.env);

    expect(config.tusExpireSeconds).toBe(86400);
    expect(config.embedTokenTtlSeconds).toBe(300);
  });

  test('strict validation reports missing required server values', () => {
    delete process.env.BUNNY_STREAM_LIBRARY_ID;
    delete process.env.BUNNY_STREAM_API_KEY;
    delete process.env.BUNNY_STREAM_READ_ONLY_API_KEY;
    delete process.env.BUNNY_STREAM_TOKEN_SECURITY_KEY;

    expect(validateBunnyStreamConfig(process.env, 'strict').errors).toEqual([
      'BUNNY_STREAM_LIBRARY_ID is required for Bunny Stream.',
      'BUNNY_STREAM_API_KEY is required for Bunny Stream.',
      'BUNNY_STREAM_READ_ONLY_API_KEY is required for Bunny Stream.',
      'BUNNY_STREAM_TOKEN_SECURITY_KEY is required for Bunny Stream.',
    ]);
  });

  test('local validation marks missing values but does not throw', () => {
    delete process.env.BUNNY_STREAM_LIBRARY_ID;

    const result = validateBunnyStreamConfig(process.env, 'local');

    expect(result.ok).toBe(false);
    expect(result.mode).toBe('local');
    expect(result.errors).toContain(
      'BUNNY_STREAM_LIBRARY_ID is required for Bunny Stream.'
    );
  });
});
