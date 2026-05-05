import jwt from 'jsonwebtoken';
import {
  buildAxinomLicenseServiceMessage,
  generateAxinomToken,
  signAxinomLicenseServiceMessage,
} from '@/lib/axinom';

const originalEnv = process.env;
const secret = Buffer.from('test-communication-key').toString('base64');

describe('Axinom License Service Message helpers', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AXINOM_COM_KEY_ID: 'com-key-id',
      AXINOM_COM_KEY_SECRET: secret,
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('builds official-doc-shaped License Service Message payload', () => {
    const payload = buildAxinomLicenseServiceMessage({
      keyIds: 'kid-1, kid-2, kid-1',
      userId: 'user-1',
      sessionId: 'session-1',
      now: new Date('2026-05-05T00:00:00.000Z'),
      ttlSeconds: 300,
    });

    expect(payload).toEqual({
      version: 1,
      com_key_id: 'com-key-id',
      message: {
        type: 'entitlement_message',
        version: 2,
        license: {
          start_datetime: '2026-05-05T00:00:00.000Z',
          expiration_datetime: '2026-05-05T00:05:00.000Z',
          allow_persistence: false,
        },
        content_keys_source: {
          inline: [{ id: 'kid-1' }, { id: 'kid-2' }],
        },
        user: {
          id: 'user-1',
          session_id: 'session-1',
        },
      },
    });
  });

  test('rejects empty key ID input before signing', () => {
    expect(() =>
      buildAxinomLicenseServiceMessage({ keyIds: ' , ' })
    ).toThrow('At least one Axinom key ID is required');
  });

  test('signs payload with HS256 and base64 communication key', () => {
    const payload = buildAxinomLicenseServiceMessage({
      keyIds: ['kid-1'],
      now: new Date('2026-05-05T00:00:00.000Z'),
    });

    const token = signAxinomLicenseServiceMessage(payload, secret);
    const decoded = jwt.verify(
      token,
      Buffer.from(secret, 'base64'),
      { algorithms: ['HS256'] }
    );

    expect(decoded).toMatchObject(payload);
    expect(decoded).not.toHaveProperty('iat');
  });

  test('generateAxinomToken preserves legacy string-array input while using new payload', () => {
    const token = generateAxinomToken(['kid-1']);
    const decoded = jwt.verify(
      token,
      Buffer.from(secret, 'base64'),
      { algorithms: ['HS256'] }
    ) as jwt.JwtPayload;

    expect(decoded.com_key_id).toBe('com-key-id');
    expect(decoded.message.content_keys_source.inline).toEqual([{ id: 'kid-1' }]);
  });
});
