/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { GET, POST } from '@/app/api/admin/user-permissions/route';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/redis', () => ({
  invalidateCacheKey: jest.fn(),
  invalidateCache: jest.fn(),
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findFirst: jest.fn() },
    course: { count: jest.fn(), findMany: jest.fn() },
    video: { findMany: jest.fn() },
    enrollment: { findMany: jest.fn() },
    videoAccess: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const mockedPrisma = prisma as unknown as {
  user: { findFirst: jest.Mock };
  course: { count: jest.Mock; findMany: jest.Mock };
  video: { findMany: jest.Mock };
  enrollment: { findMany: jest.Mock };
  videoAccess: { findMany: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
  (getServerSession as jest.Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
});

test('omits permissions that reference inactive or missing courses and videos', async () => {
  mockedPrisma.enrollment.findMany.mockResolvedValue([
    { courseId: 'course-active' },
    { courseId: 'course-orphan' },
  ]);
  mockedPrisma.videoAccess.findMany.mockResolvedValue([
    { videoId: 'video-active' },
    { videoId: 'video-orphan' },
  ]);
  mockedPrisma.course.findMany.mockResolvedValue([{ id: 'course-active' }]);
  mockedPrisma.video.findMany.mockResolvedValue([
    { id: 'video-active', courseId: 'course-active' },
  ]);

  const response = await GET(new Request(
    'http://localhost.test/api/admin/user-permissions?userId=user-1'
  ));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    enrollments: ['course-active'],
    videoAccess: ['video-active'],
  });
});

test('omits active video access outside the user active enrollments', async () => {
  mockedPrisma.enrollment.findMany.mockResolvedValue([
    { courseId: 'course-active' },
  ]);
  mockedPrisma.videoAccess.findMany.mockResolvedValue([
    { videoId: 'video-active' },
    { videoId: 'video-outside-enrollment' },
  ]);
  mockedPrisma.course.findMany.mockResolvedValue([{ id: 'course-active' }]);
  mockedPrisma.video.findMany.mockResolvedValue([
    { id: 'video-active', courseId: 'course-active' },
    { id: 'video-outside-enrollment', courseId: 'course-other' },
  ]);

  const response = await GET(new Request(
    'http://localhost.test/api/admin/user-permissions?userId=user-1'
  ));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    enrollments: ['course-active'],
    videoAccess: ['video-active'],
  });
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
