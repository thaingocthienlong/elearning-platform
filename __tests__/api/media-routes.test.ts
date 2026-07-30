/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import {
  evaluateMediaEntitlement,
  mapMediaEntitlementToHttp,
} from '@/lib/media-entitlement';
import { createTencentDrmToken } from '@/lib/tencent/vod';
import { prisma } from '@/lib/prisma';
import { POST as drmTokenPost } from '@/app/api/drm/token/route';
import { POST as drmLicensePost } from '@/app/api/drm/license/route';
import { POST as heartbeatPost } from '@/app/api/watch/heartbeat/route';
import { hasTosAccess } from '@/lib/tos-access-server';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/tos-access-server', () => ({
  hasTosAccess: jest.fn(),
  tosAcceptanceRequiredResponse: jest.fn(() =>
    Response.json({ code: 'TOS_ACCEPTANCE_REQUIRED' }, { status: 403 }),
  ),
}));

jest.mock('@/lib/tencent/vod', () => ({
  createTencentDrmToken: jest.fn(() => 'signed-token'),
  resolveTencentLicenseUrl: jest.fn(() => 'https://license.example/widevine'),
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

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedEvaluate = evaluateMediaEntitlement as jest.Mock;
const mockedCreateTencentDrmToken = createTencentDrmToken as jest.Mock;
const mockedHasTosAccess = hasTosAccess as jest.Mock;
const mockedPrisma = prisma as unknown as {
  watchRecord: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

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
    mockedHasTosAccess.mockResolvedValue(true);
  });

  test('DRM token route denies authenticated requests before entitlement when TOS is missing', async () => {
    mockedHasTosAccess.mockResolvedValue(false);

    const response = await drmTokenPost(jsonRequest({ videoId: 'video-1' }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      code: 'TOS_ACCEPTANCE_REQUIRED',
    });
    expect(mockedEvaluate).not.toHaveBeenCalled();
    expect(mockedCreateTencentDrmToken).not.toHaveBeenCalled();
  });

  test('DRM token route keeps unauthenticated entitlement mapping without TOS lookup', async () => {
    mockedGetServerSession.mockResolvedValue(null);
    mockedEvaluate.mockResolvedValue({
      allowed: false,
      code: 'UNAUTHENTICATED',
    });

    const response = await drmTokenPost(jsonRequest({ videoId: 'video-1' }));

    expect(response.status).toBe(401);
    expect(mockedEvaluate).toHaveBeenCalledWith(
      expect.objectContaining({ session: null, videoId: 'video-1', checkViewLimit: true }),
    );
    expect(mockedHasTosAccess).not.toHaveBeenCalled();
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
    expect(mockedCreateTencentDrmToken).not.toHaveBeenCalled();
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
    expect(body.provider).toBe('Tencent Commercial DRM');
  });

  test('DRM token route signs authorized Tencent file IDs through Tencent helper', async () => {
    mockedEvaluate.mockResolvedValue({
      allowed: true,
      user: { id: 'user-1' },
      video: { id: 'video-1', tencentFileId: 'tencent-file-1' },
    });

    const response = await drmTokenPost(jsonRequest({ videoId: 'video-1' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.token).toBe('signed-token');
    expect(body.provider).toBe('tencent');
    expect(body.fileId).toBe('tencent-file-1');
    expect(mockedCreateTencentDrmToken).toHaveBeenCalledWith({
      fileId: 'tencent-file-1',
      expiresAt: expect.any(Date),
    });
  });
});
