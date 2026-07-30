/** @jest-environment node */
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/tos/accept/route';
import {
  TOS_COOKIE_NAME,
  TOS_TTL_SECONDS,
  TOS_VERSION,
  verifyTosAccessToken,
} from '@/lib/tos-access';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockedGetServerSession = getServerSession as jest.Mock;
const SESSION_TOKEN = 'test-session-token';
const SECRET = 'test-only-nextauth-secret';
const NOW = Date.parse('2026-07-29T12:00:00.000Z');
const originalEnv = process.env;

function acceptRequest(
  body: unknown,
  {
    origin = 'https://app.example.test',
    cookie = `next-auth.session-token=${SESSION_TOKEN}`,
    contentType = 'application/json',
  }: { origin?: string; cookie?: string; contentType?: string } = {},
) {
  return new NextRequest('https://app.example.test/api/tos/accept', {
    method: 'POST',
    headers: {
      origin,
      cookie,
      'content-type': contentType,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/tos/accept', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    process.env = { ...originalEnv, NEXTAUTH_SECRET: SECRET };
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'learner@example.test' },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns 401 without an authenticated session', async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const response = await POST(acceptRequest({ accepted: true, version: TOS_VERSION }));
    expect(response.status).toBe(401);
  });

  test('returns 401 when raw database-session cookie missing', async () => {
    const response = await POST(
      acceptRequest({ accepted: true, version: TOS_VERSION }, { cookie: '' }),
    );
    expect(response.status).toBe(401);
  });

  test.each([
    [{ accepted: false, version: TOS_VERSION }, 'application/json'],
    [{ accepted: true, version: 'stale' }, 'application/json'],
    [{ accepted: true, version: TOS_VERSION, extra: true }, 'application/json'],
    ['{bad-json', 'application/json'],
    [{ accepted: true, version: TOS_VERSION }, 'text/plain'],
  ])('returns 400 for invalid JSON contracts', async (body, contentType) => {
    const response = await POST(acceptRequest(body, { contentType }));
    expect(response.status).toBe(400);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  test('returns 403 for cross-origin POST', async () => {
    const response = await POST(
      acceptRequest(
        { accepted: true, version: TOS_VERSION },
        { origin: 'https://attacker.example.test' },
      ),
    );
    expect(response.status).toBe(403);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  test('fails closed when NEXTAUTH_SECRET missing', async () => {
    delete process.env.NEXTAUTH_SECRET;
    const response = await POST(acceptRequest({ accepted: true, version: TOS_VERSION }));
    expect(response.status).toBe(500);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  test('sets verifiable HttpOnly cookie for exactly 86400 seconds', async () => {
    const response = await POST(acceptRequest({ accepted: true, version: TOS_VERSION }));
    const body = await response.json();
    const setCookie = response.headers.get('set-cookie') ?? '';
    const cookieValue = setCookie.match(new RegExp(`${TOS_COOKIE_NAME}=([^;]+)`))?.[1];

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toEqual({
      accepted: true,
      expiresAt: NOW + TOS_TTL_SECONDS * 1000,
    });
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=lax');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toContain('Max-Age=86400');
    expect(setCookie).toContain('Expires=');
    await expect(
      verifyTosAccessToken(cookieValue, SESSION_TOKEN, SECRET, NOW),
    ).resolves.toBe(true);

    const exposed = `${JSON.stringify(body)} ${setCookie}`;
    expect(exposed).not.toContain(SESSION_TOKEN);
    expect(exposed).not.toContain(SECRET);
    expect(exposed).not.toContain('learner@example.test');
  });

  test('adds Secure in production', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    Object.assign(process.env, { NODE_ENV: 'production' });
    try {
      const response = await POST(acceptRequest({ accepted: true, version: TOS_VERSION }));
      expect(response.headers.get('set-cookie')).toContain('Secure');
    } finally {
      Object.assign(process.env, { NODE_ENV: previousNodeEnv });
    }
  });
});
