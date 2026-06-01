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
    process.env.BUNNY_STREAM_API_TIMEOUT_MS = '2500';

    expect(readBunnyStreamConfig(process.env)).toEqual({
      libraryId: '123456',
      apiKey: 'api-key',
      readOnlyApiKey: 'read-only',
      tokenSecurityKey: 'token-key',
      tusExpireSeconds: 7200,
      embedTokenTtlSeconds: 180,
      apiTimeoutMs: 2500,
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
    delete process.env.BUNNY_STREAM_API_TIMEOUT_MS;

    const config = readBunnyStreamConfig(process.env);

    expect(config.tusExpireSeconds).toBe(86400);
    expect(config.embedTokenTtlSeconds).toBe(300);
    expect(config.apiTimeoutMs).toBe(10000);
  });

  test.each(['3599', '604801'])(
    'rejects TUS expiry outside supported bounds: %s',
    (value) => {
      process.env.BUNNY_STREAM_LIBRARY_ID = '123456';
      process.env.BUNNY_STREAM_API_KEY = 'api-key';
      process.env.BUNNY_STREAM_READ_ONLY_API_KEY = 'read-only';
      process.env.BUNNY_STREAM_TOKEN_SECURITY_KEY = 'token-key';
      process.env.BUNNY_STREAM_TUS_EXPIRE_SECONDS = value;

      const error =
        'BUNNY_STREAM_TUS_EXPIRE_SECONDS must be between 3600 and 604800.';

      expect(validateBunnyStreamConfig(process.env).errors).toContain(error);
      expect(() => readBunnyStreamConfig(process.env)).toThrow(error);
    }
  );

  test.each(['999', '60001'])(
    'rejects Bunny API timeout outside supported bounds: %s',
    (value) => {
      process.env.BUNNY_STREAM_LIBRARY_ID = '123456';
      process.env.BUNNY_STREAM_API_KEY = 'api-key';
      process.env.BUNNY_STREAM_READ_ONLY_API_KEY = 'read-only';
      process.env.BUNNY_STREAM_TOKEN_SECURITY_KEY = 'token-key';
      process.env.BUNNY_STREAM_API_TIMEOUT_MS = value;

      const error =
        'BUNNY_STREAM_API_TIMEOUT_MS must be between 1000 and 60000.';

      expect(validateBunnyStreamConfig(process.env).errors).toContain(error);
      expect(() => readBunnyStreamConfig(process.env)).toThrow(error);
    }
  );

  test('accepts inclusive TUS expiry and Bunny API timeout bounds', () => {
    process.env.BUNNY_STREAM_LIBRARY_ID = '123456';
    process.env.BUNNY_STREAM_API_KEY = 'api-key';
    process.env.BUNNY_STREAM_READ_ONLY_API_KEY = 'read-only';
    process.env.BUNNY_STREAM_TOKEN_SECURITY_KEY = 'token-key';
    process.env.BUNNY_STREAM_TUS_EXPIRE_SECONDS = '3600';
    process.env.BUNNY_STREAM_API_TIMEOUT_MS = '60000';

    expect(readBunnyStreamConfig(process.env)).toEqual(
      expect.objectContaining({
        tusExpireSeconds: 3600,
        apiTimeoutMs: 60000,
      })
    );

    process.env.BUNNY_STREAM_TUS_EXPIRE_SECONDS = '604800';
    process.env.BUNNY_STREAM_API_TIMEOUT_MS = '1000';

    expect(readBunnyStreamConfig(process.env)).toEqual(
      expect.objectContaining({
        tusExpireSeconds: 604800,
        apiTimeoutMs: 1000,
      })
    );
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
