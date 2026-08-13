/** @jest-environment node */
import {
  TOS_MAX_SESSION_TOKEN_LENGTH,
  TOS_MAX_PAYLOAD_LENGTH,
  TOS_MAX_TOKEN_LENGTH,
  TOS_TTL_SECONDS,
  TOS_VERSION,
  createTosAccessToken,
  readSessionToken,
  verifyTosAccessToken,
} from '@/lib/tos-access';

const NOW = Date.parse('2026-07-29T00:00:00.000Z');
const SECRET = 'test-only-tos-signing-secret';
const SESSION = 'session-token-learner@example.test';
const encoder = new TextEncoder();

function base64url(value: Uint8Array): string {
  return Buffer.from(value).toString('base64url');
}

async function signPayload(payload: object): Promise<string> {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`tos-access-v1:${encodedPayload}`),
  );
  return `${encodedPayload}.${base64url(new Uint8Array(signature))}`;
}

describe('TOS access token', () => {
  test('accepts a valid token before the 24-hour boundary', async () => {
    const token = await createTosAccessToken(SESSION, SECRET, NOW);

    await expect(
      verifyTosAccessToken(token, SESSION, SECRET, NOW + TOS_TTL_SECONDS * 1000 - 1),
    ).resolves.toBe(true);
  });

  test('rejects a token at the exact 24-hour boundary', async () => {
    const token = await createTosAccessToken(SESSION, SECRET, NOW);

    await expect(
      verifyTosAccessToken(token, SESSION, SECRET, NOW + TOS_TTL_SECONDS * 1000),
    ).resolves.toBe(false);
  });

  test('rejects acceptance from the previous TOS version', async () => {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(SESSION));
    const previousVersionToken = await signPayload({
      version: '2026-07-29',
      expiresAt: NOW + 1_000,
      sessionHash: base64url(new Uint8Array(digest)),
    });

    await expect(
      verifyTosAccessToken(previousVersionToken, SESSION, SECRET, NOW),
    ).resolves.toBe(false);
  });

  test('rejects expired, wrong-version, wrong-session, and overlong tokens', async () => {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(SESSION));
    const sessionHash = base64url(new Uint8Array(digest));
    const expired = await signPayload({
      version: TOS_VERSION,
      expiresAt: NOW - 1,
      sessionHash,
    });
    const wrongVersion = await signPayload({
      version: '2026-07-28',
      expiresAt: NOW + 1_000,
      sessionHash,
    });
    const overlong = await signPayload({
      version: TOS_VERSION,
      expiresAt: NOW + (TOS_TTL_SECONDS + 1) * 1000,
      sessionHash,
    });

    await expect(verifyTosAccessToken(expired, SESSION, SECRET, NOW)).resolves.toBe(false);
    await expect(verifyTosAccessToken(wrongVersion, SESSION, SECRET, NOW)).resolves.toBe(false);
    await expect(verifyTosAccessToken(overlong, SESSION, SECRET, NOW)).resolves.toBe(false);

    const valid = await createTosAccessToken(SESSION, SECRET, NOW);
    await expect(verifyTosAccessToken(valid, 'different-session', SECRET, NOW)).resolves.toBe(false);
  });

  test('rejects tampered payloads and signatures', async () => {
    const token = await createTosAccessToken(SESSION, SECRET, NOW);
    const [payload, signature] = token.split('.');
    const tamperedPayload = `${payload[0] === 'A' ? 'B' : 'A'}${payload.slice(1)}`;
    const tamperedSignature = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;

    await expect(
      verifyTosAccessToken(`${tamperedPayload}.${signature}`, SESSION, SECRET, NOW),
    ).resolves.toBe(false);
    await expect(
      verifyTosAccessToken(`${payload}.${tamperedSignature}`, SESSION, SECRET, NOW),
    ).resolves.toBe(false);
  });

  test.each([
    [undefined, SESSION, SECRET],
    ['', SESSION, SECRET],
    ['invalid', SESSION, SECRET],
    ['a.b.c', SESSION, SECRET],
    ['a.b', undefined, SECRET],
    ['a.b', SESSION, undefined],
  ])('fails closed for missing or malformed inputs', async (token, session, secret) => {
    await expect(verifyTosAccessToken(token, session, secret, NOW)).resolves.toBe(false);
  });

  test('fails closed for oversized cookie and session inputs', async () => {
    const valid = await createTosAccessToken(SESSION, SECRET, NOW);
    const oversizedToken = `${valid}${'a'.repeat(TOS_MAX_TOKEN_LENGTH)}`;
    const oversizedSession = 's'.repeat(TOS_MAX_SESSION_TOKEN_LENGTH + 1);

    await expect(verifyTosAccessToken(oversizedToken, SESSION, SECRET, NOW)).resolves.toBe(false);
    await expect(verifyTosAccessToken(valid, oversizedSession, SECRET, NOW)).resolves.toBe(false);
    await expect(createTosAccessToken(oversizedSession, SECRET, NOW)).rejects.toThrow();
  });

  test('fails closed for an oversized encoded payload', async () => {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(SESSION));
    const token = await signPayload({
      version: TOS_VERSION,
      expiresAt: NOW + 1_000,
      sessionHash: base64url(new Uint8Array(digest)),
      padding: 'x'.repeat(TOS_MAX_PAYLOAD_LENGTH),
    });

    await expect(verifyTosAccessToken(token, SESSION, SECRET, NOW)).resolves.toBe(false);
  });

  test('stores only a session hash, never the raw session or email', async () => {
    const token = await createTosAccessToken(SESSION, SECRET, NOW);
    const decodedPayload = Buffer.from(token.split('.')[0], 'base64url').toString('utf8');

    expect(decodedPayload).not.toContain(SESSION);
    expect(decodedPayload).not.toContain('learner@example.test');
    expect(JSON.parse(decodedPayload)).toMatchObject({
      version: TOS_VERSION,
      expiresAt: NOW + TOS_TTL_SECONDS * 1000,
      sessionHash: expect.any(String),
    });
  });

  test('reads the secure cookie first, then the development cookie', () => {
    const values = new Map([
      ['next-auth.session-token', { value: 'development' }],
      ['__Secure-next-auth.session-token', { value: 'secure' }],
    ]);

    expect(readSessionToken({ get: (name) => values.get(name) })).toBe('secure');
    values.delete('__Secure-next-auth.session-token');
    expect(readSessionToken({ get: (name) => values.get(name) })).toBe('development');
  });
});
