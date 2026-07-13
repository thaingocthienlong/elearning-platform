/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/admin/user-permissions/route';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/redis', () => ({
  invalidateCacheKey: jest.fn(),
  invalidateCache: jest.fn(),
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findFirst: jest.fn() },
    course: { count: jest.fn() },
    video: { findMany: jest.fn() },
    enrollment: { findMany: jest.fn() },
    videoAccess: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const mockedPrisma = prisma as unknown as {
  user: { findFirst: jest.Mock };
  course: { count: jest.Mock };
  video: { findMany: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
  (getServerSession as jest.Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
});

test('rejects malformed permission arrays before database writes', async () => {
  const response = await POST(new Request('http://localhost.test/api/admin/user-permissions', {
    method: 'POST',
    body: JSON.stringify({ userId: 'user-1', enrollments: 'course-1', videoAccess: [] }),
  }));

  expect(response.status).toBe(400);
  expect(mockedPrisma.user.findFirst).not.toHaveBeenCalled();
});

test('rejects missing or inactive referenced records', async () => {
  mockedPrisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
  mockedPrisma.course.count.mockResolvedValue(0);
  mockedPrisma.video.findMany.mockResolvedValue([]);

  const response = await POST(new Request('http://localhost.test/api/admin/user-permissions', {
    method: 'POST',
    body: JSON.stringify({
      userId: 'user-1',
      enrollments: ['missing-course'],
      videoAccess: ['missing-video'],
    }),
  }));

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: 'Permissions reference an inactive or missing record' });
});
