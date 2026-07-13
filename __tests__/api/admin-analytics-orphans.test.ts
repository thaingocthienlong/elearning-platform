/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { GET } from '@/app/api/admin/analytics/route';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/redis', () => ({
  getCached: jest.fn((_key: string, loader: () => unknown) => loader()),
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { count: jest.fn(), findMany: jest.fn() },
    course: { count: jest.fn(), findMany: jest.fn() },
    video: { count: jest.fn(), findMany: jest.fn() },
    enrollment: { count: jest.fn() },
    watchRecord: { aggregate: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
  },
}));

const mockedPrisma = prisma as unknown as {
  user: { count: jest.Mock; findMany: jest.Mock };
  course: { count: jest.Mock; findMany: jest.Mock };
  video: { count: jest.Mock; findMany: jest.Mock };
  enrollment: { count: jest.Mock };
  watchRecord: { aggregate: jest.Mock; findMany: jest.Mock; groupBy: jest.Mock };
};

test('admin analytics tolerates orphan video, user, and course references', async () => {
  (getServerSession as jest.Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
  mockedPrisma.user.count.mockResolvedValue(0);
  mockedPrisma.course.count.mockResolvedValue(0);
  mockedPrisma.video.count.mockResolvedValue(0);
  mockedPrisma.enrollment.count.mockResolvedValue(0);
  mockedPrisma.watchRecord.aggregate.mockResolvedValue({ _sum: { viewCount: 1 } });
  mockedPrisma.watchRecord.groupBy.mockResolvedValue([]);
  mockedPrisma.course.findMany.mockImplementation(async (args) => {
    if (args?.where?.id?.in) return [];
    return [];
  });
  mockedPrisma.video.findMany.mockImplementation(async (args) => {
    if (args?.select?.Course) {
      throw new Error('Inconsistent query result: Field Course is required to return data');
    }
    if (args?.where?.id?.in) return [];
    return [{ id: 'video-1', title: 'Orphan video', courseId: 'missing-course', WatchRecord: [] }];
  });
  mockedPrisma.user.findMany.mockImplementation(async (args) => {
    if (args?.where?.id?.in) return [];
    return [];
  });
  mockedPrisma.watchRecord.findMany.mockImplementation(async (args) => {
    if (args?.select?.User || args?.select?.Video) {
      throw new Error('Inconsistent query result: Field User is required to return data');
    }
    return [{
      id: 'watch-1',
      userId: 'missing-user',
      videoId: 'missing-video',
      viewCount: 1,
      lastViewedAt: new Date('2026-07-13T00:00:00.000Z'),
    }];
  });

  const response = await GET(new Request('http://localhost.test/api/admin/analytics') as never);
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.popularVideos[0]).toEqual(expect.objectContaining({
    title: 'Orphan video',
    courseTitle: 'Unknown Course',
  }));
  expect(body.recentActivity[0]).toEqual(expect.objectContaining({
    userName: 'Deleted user',
    userEmail: 'deleted-user:missing-user',
    videoTitle: 'Deleted video',
  }));
});
