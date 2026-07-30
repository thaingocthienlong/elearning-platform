/** @jest-environment node */
import { NextRequest } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { verifyTosAccessToken } from '@/lib/tos-access';
import { proxy } from '@/proxy';

jest.mock('@/lib/redis', () => ({ getRedisClient: jest.fn() }));
jest.mock('@/lib/tos-access', () => {
  const actual = jest.requireActual('@/lib/tos-access');
  return { ...actual, verifyTosAccessToken: jest.fn() };
});

const mockedGetRedisClient = getRedisClient as jest.Mock;
const mockedVerify = verifyTosAccessToken as jest.Mock;
const originalEnv = process.env;

function request(path: string, cookie = 'next-auth.session-token=session-A') {
  return new NextRequest(`https://app.example.test${path}`, {
    headers: { cookie },
  });
}

describe('Proxy TOS gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NEXTAUTH_SECRET: 'test-only-secret' };
    mockedGetRedisClient.mockReturnValue(null);
    mockedVerify.mockResolvedValue(false);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test.each(['/courses', '/courses/course-1', '/watch/video-1', '/meeting'])(
    'rewrites protected page %s to the consent surface',
    async (path) => {
      if (path === '/meeting') {
        mockedGetRedisClient.mockReturnValue({
          get: jest.fn(async (key: string) =>
            key === 'config:system_mode' ? 'meeting' : null,
          ),
        });
      }
      const response = await proxy(request(path));
      expect(response.headers.get('x-middleware-rewrite')).toBe(
        'https://app.example.test/tos-approval',
      );
    },
  );

  test.each(['/api/drm/token', '/api/zoom/signature'])(
    'returns JSON 403 for protected API %s',
    async (path) => {
      const response = await proxy(request(path));
      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        code: 'TOS_ACCEPTANCE_REQUIRED',
      });
      expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    },
  );

  test('passes a valid session-bound acceptance cookie', async () => {
    mockedVerify.mockResolvedValue(true);
    const response = await proxy(
      request('/watch/video-1', 'next-auth.session-token=session-A; tos_access=accept-A'),
    );

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(mockedVerify).toHaveBeenCalledWith(
      'accept-A',
      'session-A',
      'test-only-secret',
    );
  });

  test.each([
    '/tos-approval',
    '/api/tos/accept',
    '/api/auth/session',
    '/_next/static/chunk.js',
  ])('bypasses TOS verification for %s', async (path) => {
    const response = await proxy(request(path));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(mockedVerify).not.toHaveBeenCalled();
  });

  test('clears an invalid existing acceptance cookie', async () => {
    const response = await proxy(
      request('/courses', 'next-auth.session-token=session-A; tos_access=bad'),
    );
    expect(response.headers.get('set-cookie')).toContain('tos_access=');
    expect(response.headers.get('set-cookie')).toMatch(/Max-Age=0|Expires=/u);
  });

  test('applies system-mode denial before TOS verification', async () => {
    mockedGetRedisClient.mockReturnValue({
      get: jest.fn(async (key: string) => key === 'config:system_mode' ? 'meeting' : null),
    });

    const response = await proxy(request('/courses'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('notice=courses_closed');
    expect(mockedVerify).not.toHaveBeenCalled();
  });
});
