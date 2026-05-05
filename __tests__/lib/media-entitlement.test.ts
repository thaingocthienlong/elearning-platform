import {
  evaluateMediaEntitlement,
  mapMediaEntitlementToHttp,
} from '@/lib/media-entitlement';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    video: { findUnique: jest.fn() },
    enrollment: { findUnique: jest.fn() },
    videoAccess: { findUnique: jest.fn() },
    watchRecord: { findUnique: jest.fn() },
  },
}));

const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
  video: { findUnique: jest.Mock };
  enrollment: { findUnique: jest.Mock };
  videoAccess: { findUnique: jest.Mock };
  watchRecord: { findUnique: jest.Mock };
};

const session = {
  user: {
    id: 'user-1',
    email: 'learner@example.test',
  },
};

const user = {
  id: 'user-1',
  email: 'learner@example.test',
  name: 'Learner',
  isDeleted: false,
};

const verifyCourseVideo = {
  id: 'video-1',
  courseId: 'course-1',
  published: true,
  isDeleted: false,
  viewLimit: null,
  drmKeyId: 'key-1',
  hlsUrl: 'https://cdn.example.test/master.m3u8',
  Course: {
    id: 'course-1',
    title: 'Course',
    accessType: 'VERIFY',
  },
};

function allowBase() {
  mockedPrisma.user.findUnique.mockResolvedValue(user);
  mockedPrisma.video.findUnique.mockResolvedValue(verifyCourseVideo);
  mockedPrisma.enrollment.findUnique.mockResolvedValue({ id: 'enrollment-1' });
  mockedPrisma.videoAccess.findUnique.mockResolvedValue({ id: 'access-1' });
  mockedPrisma.watchRecord.findUnique.mockResolvedValue(null);
}

describe('media entitlement helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    allowBase();
  });

  test('denies unauthenticated sessions before database reads', async () => {
    const result = await evaluateMediaEntitlement({
      session: null,
      videoId: 'video-1',
    });

    expect(result).toEqual({ allowed: false, code: 'UNAUTHENTICATED' });
    expect(mockedPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mapMediaEntitlementToHttp(result).status).toBe(401);
  });

  test('denies missing users with sanitized not-found mapping', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const result = await evaluateMediaEntitlement({ session, videoId: 'video-1' });

    expect(result).toEqual({ allowed: false, code: 'USER_NOT_FOUND' });
    expect(mapMediaEntitlementToHttp(result)).toEqual({
      status: 404,
      body: 'Not found',
    });
  });

  test('denies missing, deleted, and unpublished videos', async () => {
    mockedPrisma.video.findUnique.mockResolvedValueOnce(null);
    await expect(
      evaluateMediaEntitlement({ session, videoId: 'video-1' })
    ).resolves.toEqual({ allowed: false, code: 'VIDEO_NOT_FOUND' });

    mockedPrisma.video.findUnique.mockResolvedValueOnce({
      ...verifyCourseVideo,
      isDeleted: true,
    });
    await expect(
      evaluateMediaEntitlement({ session, videoId: 'video-1' })
    ).resolves.toEqual({ allowed: false, code: 'VIDEO_DELETED' });

    mockedPrisma.video.findUnique.mockResolvedValueOnce({
      ...verifyCourseVideo,
      published: false,
    });
    await expect(
      evaluateMediaEntitlement({ session, videoId: 'video-1' })
    ).resolves.toEqual({ allowed: false, code: 'VIDEO_UNPUBLISHED' });
  });

  test('allows open course videos without enrollment or direct access', async () => {
    mockedPrisma.video.findUnique.mockResolvedValue({
      ...verifyCourseVideo,
      Course: { ...verifyCourseVideo.Course, accessType: 'OPEN' },
    });

    const result = await evaluateMediaEntitlement({ session, videoId: 'video-1' });

    expect(result.allowed).toBe(true);
    expect(mockedPrisma.enrollment.findUnique).not.toHaveBeenCalled();
    expect(mockedPrisma.videoAccess.findUnique).not.toHaveBeenCalled();
  });

  test('allows verify course videos with active enrollment and direct access', async () => {
    const result = await evaluateMediaEntitlement({ session, videoId: 'video-1' });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.user.id).toBe('user-1');
      expect(result.video.id).toBe('video-1');
      expect(result.effectiveViewLimit).toBeNull();
    }
  });

  test('denies missing enrollment and missing direct access', async () => {
    mockedPrisma.enrollment.findUnique.mockResolvedValueOnce(null);
    await expect(
      evaluateMediaEntitlement({ session, videoId: 'video-1' })
    ).resolves.toEqual({ allowed: false, code: 'NOT_ENROLLED' });

    mockedPrisma.videoAccess.findUnique.mockResolvedValueOnce(null);
    await expect(
      evaluateMediaEntitlement({ session, videoId: 'video-1' })
    ).resolves.toEqual({ allowed: false, code: 'NO_VIDEO_ACCESS' });
  });

  test('denies direct access outside validity windows', async () => {
    const now = new Date('2026-05-05T00:00:00Z');

    mockedPrisma.videoAccess.findUnique.mockResolvedValueOnce({
      id: 'access-1',
      expiresAt: new Date('2026-05-04T00:00:00Z'),
    });
    await expect(
      evaluateMediaEntitlement({ session, videoId: 'video-1', now })
    ).resolves.toEqual({ allowed: false, code: 'ACCESS_EXPIRED' });

    mockedPrisma.videoAccess.findUnique.mockResolvedValueOnce({
      id: 'access-1',
      validFrom: new Date('2026-05-06T00:00:00Z'),
    });
    await expect(
      evaluateMediaEntitlement({ session, videoId: 'video-1', now })
    ).resolves.toEqual({ allowed: false, code: 'ACCESS_NOT_YET_VALID' });

    mockedPrisma.videoAccess.findUnique.mockResolvedValueOnce({
      id: 'access-1',
      validUntil: new Date('2026-05-04T00:00:00Z'),
    });
    await expect(
      evaluateMediaEntitlement({ session, videoId: 'video-1', now })
    ).resolves.toEqual({ allowed: false, code: 'ACCESS_PERIOD_ENDED' });
  });

  test('denies when watch record reaches user-level view limit', async () => {
    mockedPrisma.watchRecord.findUnique.mockResolvedValue({
      viewCount: 3,
      viewLimit: 3,
    });

    const result = await evaluateMediaEntitlement({ session, videoId: 'video-1' });

    expect(result).toEqual({ allowed: false, code: 'VIEW_LIMIT_EXCEEDED' });
    expect(mapMediaEntitlementToHttp(result).status).toBe(403);
  });

  test('denies when watch record reaches video fallback view limit', async () => {
    mockedPrisma.video.findUnique.mockResolvedValue({
      ...verifyCourseVideo,
      viewLimit: 2,
    });
    mockedPrisma.watchRecord.findUnique.mockResolvedValue({
      viewCount: 2,
      viewLimit: null,
    });

    await expect(
      evaluateMediaEntitlement({ session, videoId: 'video-1' })
    ).resolves.toEqual({ allowed: false, code: 'VIEW_LIMIT_EXCEEDED' });
  });
});
