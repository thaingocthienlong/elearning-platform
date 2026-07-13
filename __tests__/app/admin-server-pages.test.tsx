/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import AdminTablePage from '@/app/admin/[table]/page';
import DRMMonitoringPage from '@/app/admin/drm-monitoring/page';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('notFound');
  }),
  redirect: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    enrollment: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    course: { findMany: jest.fn() },
    dRMSession: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    video: { findMany: jest.fn() },
  },
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
  enrollment: { findMany: jest.Mock };
  user: { findMany: jest.Mock };
  course: { findMany: jest.Mock };
  dRMSession: { count: jest.Mock; groupBy: jest.Mock; findMany: jest.Mock };
  video: { findMany: jest.Mock };
};

describe('admin server page relation resilience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    });
  });

  test('generic enrollment page renders fallback labels for orphan rows', async () => {
    mockedPrisma.enrollment.findMany.mockImplementation(async (args) => {
      if (args?.include?.User || args?.include?.Course) {
        throw new Error('Inconsistent query result: required relation returned null');
      }
      return [
        {
          id: 'enrollment-1',
          userId: 'missing-user',
          courseId: 'missing-course',
          enrolledAt: new Date('2026-07-13T00:00:00.000Z'),
          isDeleted: false,
        },
      ];
    });
    mockedPrisma.user.findMany.mockResolvedValue([]);
    mockedPrisma.course.findMany.mockResolvedValue([]);

    const page = await AdminTablePage({
      params: Promise.resolve({ table: 'enrollments' }),
    });
    const table = page.props.children;

    expect(table.props.data).toEqual([
      expect.objectContaining({
        id: 'enrollment-1',
        userEmail: 'Nguoi dung khong ton tai',
        courseTitle: 'Khoa hoc khong ton tai',
      }),
    ]);
  });

  test('DRM monitoring page tolerates sessions with missing user and video rows', async () => {
    mockedPrisma.dRMSession.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    mockedPrisma.dRMSession.groupBy.mockResolvedValue([
      { drmType: 'widevine', _count: { drmType: 1 } },
    ]);
    mockedPrisma.dRMSession.findMany.mockImplementation(async (args) => {
      if (args?.include?.User || args?.include?.Video) {
        throw new Error('Inconsistent query result: required relation returned null');
      }
      return [
        {
          id: 'drm-1',
          userId: 'missing-user',
          videoId: 'missing-video',
          drmType: 'widevine',
          isHardwareDRM: true,
          browser: 'Chrome',
          os: 'Windows',
          isMobile: false,
          createdAt: new Date('2026-07-13T00:00:00.000Z'),
        },
      ];
    });
    mockedPrisma.user.findMany.mockResolvedValue([]);
    mockedPrisma.video.findMany.mockResolvedValue([]);

    await expect(DRMMonitoringPage()).resolves.toBeTruthy();
  });
});
