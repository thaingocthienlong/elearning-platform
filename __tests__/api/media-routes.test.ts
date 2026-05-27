/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { generateAxinomToken } from '@/lib/axinom';
import {
  evaluateMediaEntitlement,
  mapMediaEntitlementToHttp,
} from '@/lib/media-entitlement';
import { prisma } from '@/lib/prisma';
import { r2 } from '@/lib/r2';
import { POST as drmTokenPost } from '@/app/api/drm/token/route';
import { POST as drmLicensePost } from '@/app/api/drm/license/route';
import { GET as hlsPlaylistGet } from '@/app/api/hls/playlist/[videoId]/route';
import { POST as heartbeatPost } from '@/app/api/watch/heartbeat/route';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/axinom', () => ({
  generateAxinomToken: jest.fn(() => 'signed-token'),
}));

jest.mock('@/lib/media-entitlement', () => ({
  evaluateMediaEntitlement: jest.fn(),
  mapMediaEntitlementToHttp: jest.fn((result) => {
    if (result.allowed) return { status: 200, body: 'OK' };
    return {
      status: result.code === 'UNAUTHENTICATED' ? 401 : 403,
      body: result.code === 'UNAUTHENTICATED' ? 'Unauthorized' : 'Access denied',
    };
  }),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    video: { findFirst: jest.fn() },
    watchRecord: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/r2', () => ({
  R2_BUCKET: 'test-bucket',
  r2: {
    send: jest.fn(),
  },
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedEvaluate = evaluateMediaEntitlement as jest.Mock;
const mockedGenerateAxinomToken = generateAxinomToken as jest.Mock;
const mockedPrisma = prisma as unknown as {
  watchRecord: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};
const mockedR2 = r2 as unknown as { send: jest.Mock };

const session = {
  user: {
    id: 'user-1',
    email: 'learner@example.test',
  },
};

function jsonRequest(body: unknown) {
  return new Request('http://localhost.test/api', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('media route entitlement adoption', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue(session);
  });

  test('DRM token route denies expired access before signing a token', async () => {
    mockedEvaluate.mockResolvedValue({
      allowed: false,
      code: 'ACCESS_EXPIRED',
    });

    const response = await drmTokenPost(jsonRequest({ videoId: 'video-1' }));

    expect(response.status).toBe(403);
    expect(mockedEvaluate).toHaveBeenCalledWith(
      expect.objectContaining({ session, videoId: 'video-1', checkViewLimit: true })
    );
    expect(mockedGenerateAxinomToken).not.toHaveBeenCalled();
  });

  test('HLS playlist route denies unauthorized users before R2 reads', async () => {
    mockedEvaluate.mockResolvedValue({
      allowed: false,
      code: 'NO_VIDEO_ACCESS',
    });

    const response = await hlsPlaylistGet(new Request('http://localhost.test'), {
      params: Promise.resolve({ videoId: 'video-1' }),
    });

    expect(response.status).toBe(403);
    expect(mockedR2.send).not.toHaveBeenCalled();
  });

  test('heartbeat route denies view-limit failures before writing records', async () => {
    mockedEvaluate.mockResolvedValue({
      allowed: false,
      code: 'VIEW_LIMIT_EXCEEDED',
    });

    const response = await heartbeatPost(
      jsonRequest({ videoId: 'video-1', position: 10, isNewView: true }) as never
    );

    expect(response.status).toBe(403);
    expect(mockedPrisma.watchRecord.findUnique).not.toHaveBeenCalled();
    expect(mockedPrisma.watchRecord.create).not.toHaveBeenCalled();
    expect(mockedPrisma.watchRecord.update).not.toHaveBeenCalled();
  });

  test('heartbeat route records playback with entitlement-resolved user id', async () => {
    const sessionWithoutId = {
      user: {
        email: 'learner@example.test',
      },
    };
    mockedGetServerSession.mockResolvedValue(sessionWithoutId);
    mockedEvaluate.mockResolvedValue({
      allowed: true,
      user: { id: 'resolved-user-1', email: 'learner@example.test' },
      video: { id: 'video-1', viewLimit: null },
    });
    mockedPrisma.watchRecord.findUnique.mockResolvedValue(null);
    mockedPrisma.watchRecord.create.mockResolvedValue({
      viewCount: 1,
      viewLimit: null,
      lastPosition: 12,
    });

    const response = await heartbeatPost(
      jsonRequest({ videoId: 'video-1', position: 12, isNewView: true }) as never
    );

    expect(response.status).toBe(200);
    expect(mockedEvaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        session: sessionWithoutId,
        videoId: 'video-1',
        checkViewLimit: true,
      })
    );
    expect(mockedPrisma.watchRecord.create).toHaveBeenCalledWith({
      data: {
        userId: 'resolved-user-1',
        videoId: 'video-1',
        lastPosition: 12,
        viewCount: 1,
        lastViewedAt: expect.any(Date),
      },
    });
  });

  test('local DRM license route denies unauthorized video requests', async () => {
    mockedEvaluate.mockResolvedValue({
      allowed: false,
      code: 'NOT_ENROLLED',
    });

    const response = await drmLicensePost(
      jsonRequest({ videoId: 'video-1', kids: ['kid-1'] })
    );

    expect(response.status).toBe(403);
    expect(mapMediaEntitlementToHttp).toHaveBeenCalledWith({
      allowed: false,
      code: 'NOT_ENROLLED',
    });
  });

  test('local DRM license route is quarantined after authorized checks', async () => {
    mockedEvaluate.mockResolvedValue({
      allowed: true,
      user: { id: 'user-1' },
      video: { id: 'video-1' },
    });

    const response = await drmLicensePost(
      jsonRequest({ videoId: 'video-1', kids: ['kid-1'] })
    );
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body.provider).toBe('Axinom License Service');
  });

  test('DRM token route signs authorized key IDs through Axinom helper', async () => {
    mockedEvaluate.mockResolvedValue({
      allowed: true,
      user: { id: 'user-1' },
      video: { id: 'video-1', drmKeyId: 'kid-1,kid-2' },
    });

    const response = await drmTokenPost(jsonRequest({ videoId: 'video-1' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.token).toBe('signed-token');
    expect(mockedGenerateAxinomToken).toHaveBeenCalledWith({
      keyIds: 'kid-1,kid-2',
      userId: 'user-1',
      messageTtlSeconds: 300,
      licenseDurationSeconds: 12600,
      allowPersistence: false,
    });
  });
});
