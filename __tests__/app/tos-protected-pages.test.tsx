/** @jest-environment node */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { evaluateMediaEntitlement } from '@/lib/media-entitlement';
import type { MediaEntitlementAllowed } from '@/lib/media-entitlement';
import { createTencentDrmToken } from '@/lib/tencent/vod';
import { requireTosAccess } from '@/lib/tos-access-server';
import CoursesPage from '@/app/courses/page';
import CoursePage from '@/app/courses/[courseId]/page';
import WatchPage from '@/app/watch/[videoId]/page';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/tos-access-server', () => ({ requireTosAccess: jest.fn() }));
jest.mock('@/lib/redis', () => ({ getCached: jest.fn((_key, load) => load()) }));
jest.mock('@/lib/media-entitlement', () => ({ evaluateMediaEntitlement: jest.fn() }));
jest.mock('@/lib/tencent/vod', () => ({
  createTencentDrmToken: jest.fn(),
  createTencentSimpleAesPlaybackUrl: jest.fn(),
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    course: { findUnique: jest.fn(), findMany: jest.fn() },
    enrollment: { findMany: jest.fn(), findUnique: jest.fn() },
    allowedEmail: { findUnique: jest.fn() },
    video: { findMany: jest.fn() },
    watchRecord: { findMany: jest.fn() },
  },
}));
jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => { throw new Error(`redirect:${url}`); }),
  notFound: jest.fn(() => { throw new Error('notFound'); }),
}));

const mockedSession = getServerSession as jest.Mock;
const mockedRequireTos = requireTosAccess as jest.Mock;
const mockedEvaluate = evaluateMediaEntitlement as jest.Mock;
const mockedCreateToken = createTencentDrmToken as jest.Mock;
const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
  course: { findUnique: jest.Mock; findMany: jest.Mock };
  enrollment: { findMany: jest.Mock; findUnique: jest.Mock };
  allowedEmail: { findUnique: jest.Mock };
  video: { findMany: jest.Mock };
  watchRecord: { findMany: jest.Mock };
};

function allowedEntitlementWith(
  video: Partial<MediaEntitlementAllowed['video']> & { title?: string | null },
): MediaEntitlementAllowed {
  return {
    allowed: true,
    user: { id: 'user-1', email: 'learner@example.test' },
    video: {
      id: 'video-1',
      courseId: 'course-1',
      ...video,
    },
    watchRecord: null,
    effectiveViewLimit: null,
  };
}

describe('protected Server Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSession.mockResolvedValue({
      user: { id: 'user-1', email: 'learner@example.test' },
    });
    mockedRequireTos.mockRejectedValue(new Error('TOS required'));
  });

  test('courses list performs no learner/course query before TOS', async () => {
    await expect(CoursesPage()).rejects.toThrow('TOS required');
    expect(mockedPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockedPrisma.course.findMany).not.toHaveBeenCalled();
  });

  test('course detail performs no course query before TOS', async () => {
    await expect(CoursePage({ params: Promise.resolve({ courseId: 'course-1' }) })).rejects.toThrow('TOS required');
    expect(mockedPrisma.course.findUnique).not.toHaveBeenCalled();
  });

  test('watch performs no entitlement or Tencent token work before TOS', async () => {
    await expect(WatchPage({ params: Promise.resolve({ videoId: 'video-1' }) })).rejects.toThrow('TOS required');
    expect(mockedEvaluate).not.toHaveBeenCalled();
    expect(mockedCreateToken).not.toHaveBeenCalled();
  });

  test('does not construct a Tencent token after entitlement selects Video buổi 1 for Mux', async () => {
    mockedRequireTos.mockResolvedValue(undefined);
    mockedEvaluate.mockResolvedValue(allowedEntitlementWith({
      title: 'Video buổi 1',
      tencentFileId: 'tencent-file-1',
    }));
    mockedPrisma.allowedEmail.findUnique.mockResolvedValue(null);
    mockedPrisma.video.findMany.mockResolvedValue([]);
    mockedPrisma.watchRecord.findMany.mockResolvedValue([]);

    await WatchPage({ params: Promise.resolve({ videoId: 'video-1' }) });

    expect(mockedCreateToken).not.toHaveBeenCalled();
  });
});
