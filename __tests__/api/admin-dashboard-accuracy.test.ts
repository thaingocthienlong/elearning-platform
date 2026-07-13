/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { GET as getStats } from '@/app/api/admin/stats/route';
import { GET as getCourses } from '@/app/api/admin/courses/route';
import { GET as getErrorAnalytics } from '@/app/api/admin/error-analytics/route';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    video: { count: jest.fn() },
    course: { count: jest.fn(), findMany: jest.fn() },
    user: { count: jest.fn() },
    ticket: { findMany: jest.fn() },
  },
}));

const mockedPrisma = prisma as unknown as {
  video: { count: jest.Mock };
  course: { count: jest.Mock; findMany: jest.Mock };
  user: { count: jest.Mock };
  ticket: { findMany: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
  (getServerSession as jest.Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
});

test('dashboard stats count only active records', async () => {
  mockedPrisma.video.count.mockResolvedValue(1);
  mockedPrisma.course.count.mockResolvedValue(2);
  mockedPrisma.user.count.mockResolvedValue(3);

  const response = await getStats();

  expect(response.status).toBe(200);
  expect(mockedPrisma.video.count).toHaveBeenCalledWith({ where: { isDeleted: false } });
  expect(mockedPrisma.course.count).toHaveBeenCalledWith({ where: { isDeleted: false } });
  expect(mockedPrisma.user.count).toHaveBeenCalledWith({ where: { isDeleted: false } });
});

test('course summaries count only active enrollments', async () => {
  mockedPrisma.course.findMany.mockResolvedValue([]);

  const response = await getCourses();

  expect(response.status).toBe(200);
  expect(mockedPrisma.course.findMany).toHaveBeenCalledWith(expect.objectContaining({
    select: expect.objectContaining({
      _count: { select: { Enrollment: { where: { isDeleted: false } } } },
    }),
  }));
});

test('error analytics reports tickets with logs and uncapped unique errors', async () => {
  const logs = Array.from({ length: 11 }, (_, index) => ({
    level: 'error',
    message: `error-${index}`,
  }));
  mockedPrisma.ticket.findMany.mockResolvedValue([
    {
      id: 'with-logs',
      createdAt: new Date('2026-07-13T00:00:00.000Z'),
      consoleLogs: logs,
      browserInfo: { userAgent: 'Chrome Windows' },
    },
    {
      id: 'without-logs',
      createdAt: new Date('2026-07-13T00:00:00.000Z'),
      consoleLogs: null,
      browserInfo: { userAgent: 'Firefox Linux' },
    },
  ]);

  const response = await getErrorAnalytics();
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.totalTickets).toBe(1);
  expect(body.totalErrors).toBe(11);
  expect(body.uniqueErrorCount).toBe(11);
  expect(body.topErrors).toHaveLength(10);
  expect(body.browserBreakdown).toEqual([{ browser: 'Chrome', count: 1 }]);
});
