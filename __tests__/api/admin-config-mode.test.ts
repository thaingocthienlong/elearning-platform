/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { GET } from '@/app/api/admin/config/mode/route';
import { getRedisClient } from '@/lib/redis';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(),
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedGetRedisClient = getRedisClient as jest.Mock;

describe('admin config mode route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN' },
    });
  });

  test('falls back to courses mode when Redis read fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockedGetRedisClient.mockReturnValue({
      get: jest.fn().mockRejectedValue(new Error('Daily request limit exceeded')),
    });

    const response = await GET(new Request('http://localhost.test/api/admin/config/mode'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      mode: 'courses',
      configured: false,
    });
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to fetch system mode:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });
});
