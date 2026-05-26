/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { activeMediaProvider } from '@/lib/media-provider';
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

jest.mock('@/lib/media-provider', () => ({
  activeMediaProvider: {
    createLicenseToken: jest.fn(() => 'doverunner-token'),
  },
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
const mockedActiveMediaProvider = activeMediaProvider as unknown as {
  createLicenseToken: jest.Mock;
};
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
    expect(mockedActiveMediaProvider.createLicenseToken).not.toHaveBeenCalled();
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
    expect(body.provider).toBe('DoveRunner Multi-DRM');
  });

  test('DRM token route issues authorized DoveRunner content token', async () => {
    mockedEvaluate.mockResolvedValue({
      allowed: true,
      user: { id: 'user-1' },
      video: { id: 'video-1', providerContentId: 'content-video-1' },
    });

    const response = await drmTokenPost(jsonRequest({ videoId: 'video-1', drmType: 'widevine' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.token).toBe('doverunner-token');
    expect(mockedActiveMediaProvider.createLicenseToken).toHaveBeenCalledWith({
      contentId: 'content-video-1',
      userId: 'user-1',
      drmType: 'widevine',
      ttlSeconds: 300,
    });
  });
});
