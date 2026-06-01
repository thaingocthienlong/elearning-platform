/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    course: {
      findUnique: jest.fn(),
    },
    video: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/vdocipher-accounts', () => ({
  listVdoCipherAccounts: jest.fn(),
  resolveVdoCipherAccount: jest.fn(),
}));

jest.mock('@/lib/vdocipher', () => ({
  VdoCipherApiError: class VdoCipherApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.name = 'VdoCipherApiError';
      this.status = status;
    }
  },
  createVdoCipherUpload: jest.fn(),
  getVdoCipherVideoStatus: jest.fn(),
  getVdoCipherOtp: jest.fn(),
}));

jest.mock('@/lib/vdocipher-playback', () => ({
  getVdoCipherOtpWithAccountFallback: jest.fn(),
  getVdoCipherVideoStatusWithAccountFallback: jest.fn(),
}));

jest.mock('@/lib/media-entitlement', () => ({
  evaluateMediaEntitlement: jest.fn(),
  mapMediaEntitlementToHttp: jest.fn(),
}));

jest.mock('@/lib/redis', () => ({
  invalidateCacheKey: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import {
  listVdoCipherAccounts,
  resolveVdoCipherAccount,
} from '@/lib/vdocipher-accounts';
import {
  createVdoCipherUpload,
  VdoCipherApiError,
} from '@/lib/vdocipher';
import {
  getVdoCipherOtpWithAccountFallback,
  getVdoCipherVideoStatusWithAccountFallback,
} from '@/lib/vdocipher-playback';
import {
  evaluateMediaEntitlement,
  mapMediaEntitlementToHttp,
} from '@/lib/media-entitlement';
import { invalidateCacheKey } from '@/lib/redis';
const mockedGetServerSession = getServerSession as jest.Mock;
const mockedListVdoCipherAccounts = listVdoCipherAccounts as jest.Mock;
const mockedResolveVdoCipherAccount = resolveVdoCipherAccount as jest.Mock;
const mockedCreateVdoCipherUpload = createVdoCipherUpload as jest.Mock;
const mockedGetVdoCipherOtpWithAccountFallback = getVdoCipherOtpWithAccountFallback as jest.Mock;
const mockedGetVdoCipherVideoStatusWithAccountFallback =
  getVdoCipherVideoStatusWithAccountFallback as jest.Mock;
const mockedEvaluateMediaEntitlement = evaluateMediaEntitlement as jest.Mock;
const mockedMapMediaEntitlementToHttp = mapMediaEntitlementToHttp as jest.Mock;
const mockedInvalidateCacheKey = invalidateCacheKey as jest.Mock;
const mockedPrisma = prisma as unknown as {
  course: {
    findUnique: jest.Mock;
  };
  video: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('vdocipher routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns safe account list to admins only', async () => {
    const { GET: getAccounts } = await import('@/app/api/vdocipher/accounts/route');
    mockedGetServerSession.mockResolvedValue({ user: { role: 'ADMIN' } });
    mockedListVdoCipherAccounts.mockReturnValue([
      { id: 'primary', isDefault: true, configured: true },
    ]);

    const response = await getAccounts();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      accounts: [{ id: 'primary', isDefault: true, configured: true }],
    });
  });

  it('denies account list to non-admin users', async () => {
    const { GET: getAccounts } = await import('@/app/api/vdocipher/accounts/route');
    mockedGetServerSession.mockResolvedValue({ user: { role: 'USER' } });

    const response = await getAccounts();

    expect(response.status).toBe(401);
    expect(mockedListVdoCipherAccounts).not.toHaveBeenCalled();
  });

  it('creates VdoCipher upload and stores selected account', async () => {
    const { POST: createUpload } = await import(
      '@/app/api/vdocipher/upload-credentials/route'
    );
    mockedGetServerSession.mockResolvedValue({ user: { role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({ id: 'course-id', isDeleted: false });
    mockedResolveVdoCipherAccount.mockReturnValue({
      id: 'backup1',
      apiSecret: 'secret',
      isDefault: false,
    });
    mockedCreateVdoCipherUpload.mockResolvedValue({
      videoId: 'vdo-id',
      clientPayload: { uploadLink: 'https://upload.example.test' },
    });
    mockedPrisma.video.create.mockResolvedValue({ id: 'local-video-id' });

    const response = await createUpload(
      jsonRequest('http://localhost.test/api/vdocipher/upload-credentials', {
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: '123456789012345678901234',
        title: 'Lesson',
        accountId: 'backup1',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedCreateVdoCipherUpload).toHaveBeenCalledWith({
      apiSecret: 'secret',
      title: 'Lesson',
    });
    expect(mockedPrisma.video.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: 'VDOCIPHER',
        vdocipherAccountId: 'backup1',
        vdocipherVideoId: 'vdo-id',
        vdocipherStatus: 'PRE_UPLOAD',
        published: false,
      }),
    });
    expect(body).toEqual({
      videoId: 'local-video-id',
      vdocipherVideoId: 'vdo-id',
      accountId: 'backup1',
      clientPayload: { uploadLink: 'https://upload.example.test' },
    });
  });

  it('rejects VdoCipher upload when course is missing', async () => {
    const { POST: createUpload } = await import(
      '@/app/api/vdocipher/upload-credentials/route'
    );
    mockedGetServerSession.mockResolvedValue({ user: { role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue(null);

    const response = await createUpload(
      jsonRequest('http://localhost.test/api/vdocipher/upload-credentials', {
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: '123456789012345678901234',
        title: 'Lesson',
      })
    );

    expect(response.status).toBe(404);
    expect(mockedCreateVdoCipherUpload).not.toHaveBeenCalled();
    expect(mockedPrisma.video.create).not.toHaveBeenCalled();
  });

  it('syncs VdoCipher status for stored account', async () => {
    const { POST: syncVideo } = await import('@/app/api/video/vdocipher/sync/route');
    mockedGetServerSession.mockResolvedValue({ user: { role: 'ADMIN' } });
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: 'local-video-id',
      provider: 'VDOCIPHER',
      vdocipherAccountId: 'primary',
      vdocipherVideoId: 'vdo-id',
    });
    mockedGetVdoCipherVideoStatusWithAccountFallback.mockResolvedValue({
      accountId: 'primary',
      attemptedAccountIds: ['primary'],
      recovered: false,
      result: {
        status: 'ready',
        poster: 'https://poster.example.test',
      },
    });
    mockedPrisma.video.update.mockResolvedValue({});

    const response = await syncVideo(
      jsonRequest('http://localhost.test/api/video/vdocipher/sync', {
        videoId: 'local-video-id',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedGetVdoCipherVideoStatusWithAccountFallback).toHaveBeenCalledWith({
      preferredAccountId: 'primary',
      vdoCipherVideoId: 'vdo-id',
    });
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'local-video-id' },
      data: expect.objectContaining({
        vdocipherAccountId: 'primary',
        vdocipherStatus: 'READY',
        vdocipherPosterUrl: 'https://poster.example.test',
      }),
    });
    expect(body).toMatchObject({
      success: true,
      status: 'READY',
      accountId: 'primary',
      recoveredAccount: false,
    });
  });

  it('repairs VdoCipher account mapping during status sync', async () => {
    const { POST: syncVideo } = await import('@/app/api/video/vdocipher/sync/route');
    mockedGetServerSession.mockResolvedValue({ user: { role: 'ADMIN' } });
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: 'local-video-id',
      provider: 'VDOCIPHER',
      vdocipherAccountId: 'backup-5',
      vdocipherVideoId: 'vdo-id',
    });
    mockedGetVdoCipherVideoStatusWithAccountFallback.mockResolvedValue({
      accountId: 'primary',
      attemptedAccountIds: ['backup-5', 'primary'],
      recovered: true,
      result: {
        status: 'ready',
        poster: 'https://poster.example.test',
      },
    });
    mockedPrisma.video.update.mockResolvedValue({});

    const response = await syncVideo(
      jsonRequest('http://localhost.test/api/video/vdocipher/sync', {
        videoId: 'local-video-id',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'local-video-id' },
      data: expect.objectContaining({
        vdocipherAccountId: 'primary',
        vdocipherStatus: 'READY',
      }),
    });
    expect(body).toMatchObject({
      success: true,
      status: 'READY',
      accountId: 'primary',
      recoveredAccount: true,
    });
  });

  it('publishes a ready VdoCipher video and invalidates the course cache', async () => {
    const { POST: publishVideo } = await import('@/app/api/admin/videos/publish/route');
    mockedGetServerSession.mockResolvedValue({ user: { role: 'ADMIN' } });
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: 'local-video-id',
      courseId: 'course-id',
      provider: 'VDOCIPHER',
      vdocipherStatus: 'READY',
      vdocipherVideoId: 'vdo-id',
      vdocipherAccountId: 'primary',
      published: false,
      isDeleted: false,
    });
    mockedPrisma.video.update.mockResolvedValue({
      id: 'local-video-id',
      published: true,
    });

    const response = await publishVideo(
      jsonRequest('http://localhost.test/api/admin/videos/publish', {
        videoId: 'local-video-id',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'local-video-id' },
      data: { published: true },
    });
    expect(mockedInvalidateCacheKey).toHaveBeenCalledWith('course:course-id');
    expect(body).toEqual({ success: true, published: true });
  });

  it('rejects sync for non-VdoCipher video rows', async () => {
    const { POST: syncVideo } = await import('@/app/api/video/vdocipher/sync/route');
    mockedGetServerSession.mockResolvedValue({ user: { role: 'ADMIN' } });
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: 'local-video-id',
      provider: 'AXINOM',
    });

    const response = await syncVideo(
      jsonRequest('http://localhost.test/api/video/vdocipher/sync', {
        videoId: 'local-video-id',
      })
    );

    expect(response.status).toBe(404);
    expect(mockedGetVdoCipherVideoStatusWithAccountFallback).not.toHaveBeenCalled();
  });

  it('generates OTP only after entitlement passes', async () => {
    const { POST: getOtp } = await import('@/app/api/vdocipher/otp/route');
    const session = { user: { id: 'user-id', email: 'user@example.test' } };
    mockedGetServerSession.mockResolvedValue(session);
    mockedEvaluateMediaEntitlement.mockResolvedValue({
      allowed: true,
      user: { id: 'user-id', name: 'Learner', email: 'user@example.test' },
      video: {
        id: 'local-video-id',
        provider: 'VDOCIPHER',
        vdocipherAccountId: 'primary',
        vdocipherVideoId: 'vdo-id',
        vdocipherStatus: 'READY',
      },
    });
    mockedGetVdoCipherOtpWithAccountFallback.mockResolvedValue({
      accountId: 'primary',
      attemptedAccountIds: ['primary'],
      recovered: false,
      result: { otp: 'otp', playbackInfo: 'playback' },
    });

    const response = await getOtp(
      jsonRequest('http://localhost.test/api/vdocipher/otp', {
        videoId: 'local-video-id',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedEvaluateMediaEntitlement).toHaveBeenCalledWith({
      session,
      videoId: 'local-video-id',
      checkViewLimit: true,
    });
    expect(mockedGetVdoCipherOtpWithAccountFallback).toHaveBeenCalledWith({
      preferredAccountId: 'primary',
      vdoCipherVideoId: 'vdo-id',
      ttl: 300,
    });
    expect(body).toEqual({ otp: 'otp', playbackInfo: 'playback', expiresIn: 300 });
  });

  it('repairs VdoCipher account mapping during OTP generation', async () => {
    const { POST: getOtp } = await import('@/app/api/vdocipher/otp/route');
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockedGetServerSession.mockResolvedValue({ user: { id: 'user-id' } });
    mockedEvaluateMediaEntitlement.mockResolvedValue({
      allowed: true,
      user: { id: 'user-id', name: 'Learner', email: 'user@example.test' },
      video: {
        id: 'local-video-id',
        provider: 'VDOCIPHER',
        vdocipherAccountId: 'backup-5',
        vdocipherVideoId: 'vdo-id',
        vdocipherStatus: 'READY',
      },
    });
    mockedGetVdoCipherOtpWithAccountFallback.mockResolvedValue({
      accountId: 'primary',
      attemptedAccountIds: ['backup-5', 'primary'],
      recovered: true,
      result: { otp: 'otp', playbackInfo: 'playback' },
    });
    mockedPrisma.video.update.mockResolvedValue({});

    const response = await getOtp(
      jsonRequest('http://localhost.test/api/vdocipher/otp', {
        videoId: 'local-video-id',
      })
    );

    expect(response.status).toBe(200);
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'local-video-id' },
      data: {
        vdocipherAccountId: 'primary',
        vdocipherError: null,
      },
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      'Repaired VdoCipher account mapping during OTP generation',
      expect.objectContaining({
        videoId: 'local-video-id',
        previousAccountId: 'backup-5',
        recoveredAccountId: 'primary',
      })
    );

    consoleSpy.mockRestore();
  });

  it('returns a controlled provider error when OTP generation fails upstream', async () => {
    const { POST: getOtp } = await import('@/app/api/vdocipher/otp/route');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockedGetServerSession.mockResolvedValue({ user: { id: 'user-id' } });
    mockedEvaluateMediaEntitlement.mockResolvedValue({
      allowed: true,
      user: { id: 'user-id', name: 'Learner', email: 'user@example.test' },
      video: {
        id: 'local-video-id',
        provider: 'VDOCIPHER',
        vdocipherAccountId: 'primary',
        vdocipherVideoId: 'missing-vdo-id',
        vdocipherStatus: 'READY',
      },
    });
    mockedGetVdoCipherOtpWithAccountFallback.mockRejectedValue(new VdoCipherApiError('video not found', 404));

    const response = await getOtp(
      jsonRequest('http://localhost.test/api/vdocipher/otp', {
        videoId: 'local-video-id',
      })
    );

    expect(response.status).toBe(502);
    await expect(response.text()).resolves.toBe('Playback provider unavailable');
    expect(consoleSpy).toHaveBeenCalledWith(
      'VdoCipher OTP generation failed',
      expect.objectContaining({
        videoId: 'local-video-id',
        vdoCipherVideoId: 'missing-vdo-id',
        vdocipherAccountId: 'primary',
        providerStatus: 404,
        message: 'video not found',
      })
    );

    consoleSpy.mockRestore();
  });

  it('rejects denied entitlement before VdoCipher call', async () => {
    const { POST: getOtp } = await import('@/app/api/vdocipher/otp/route');
    mockedGetServerSession.mockResolvedValue({ user: { id: 'user-id' } });
    mockedEvaluateMediaEntitlement.mockResolvedValue({
      allowed: false,
      code: 'NO_VIDEO_ACCESS',
    });
    mockedMapMediaEntitlementToHttp.mockReturnValue({
      status: 403,
      body: 'Forbidden',
    });

    const response = await getOtp(
      jsonRequest('http://localhost.test/api/vdocipher/otp', {
        videoId: 'local-video-id',
      })
    );

    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe('Forbidden');
    expect(mockedGetVdoCipherOtpWithAccountFallback).not.toHaveBeenCalled();
  });

  it('rejects non-ready VdoCipher videos', async () => {
    const { POST: getOtp } = await import('@/app/api/vdocipher/otp/route');
    mockedGetServerSession.mockResolvedValue({ user: { id: 'user-id' } });
    mockedEvaluateMediaEntitlement.mockResolvedValue({
      allowed: true,
      user: { id: 'user-id', name: 'Learner', email: 'user@example.test' },
      video: {
        id: 'local-video-id',
        provider: 'VDOCIPHER',
        vdocipherAccountId: 'primary',
        vdocipherVideoId: 'vdo-id',
        vdocipherStatus: 'QUEUED',
      },
    });

    const response = await getOtp(
      jsonRequest('http://localhost.test/api/vdocipher/otp', {
        videoId: 'local-video-id',
      })
    );

    expect(response.status).toBe(404);
    expect(mockedGetVdoCipherOtpWithAccountFallback).not.toHaveBeenCalled();
  });

  it('updates matching VdoCipher video from webhook payload', async () => {
    const { POST: vdocipherWebhook } = await import('@/app/api/webhook/vdocipher/route');
    const originalSecret = process.env.VDOCIPHER_WEBHOOK_SECRET;
    process.env.VDOCIPHER_WEBHOOK_SECRET = 'hook-secret';
    mockedPrisma.video.findFirst.mockResolvedValue({
      id: 'local-video-id',
      provider: 'VDOCIPHER',
      vdocipherAccountId: 'primary',
      vdocipherVideoId: 'vdo-id',
    });
    mockedPrisma.video.update.mockResolvedValue({});

    const response = await vdocipherWebhook(
      jsonRequest('http://localhost.test/api/webhook/vdocipher?secret=hook-secret', {
        videoId: 'vdo-id',
        status: 'ready',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedPrisma.video.findFirst).toHaveBeenCalledWith({
      where: {
        provider: 'VDOCIPHER',
        vdocipherVideoId: 'vdo-id',
      },
    });
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'local-video-id' },
      data: expect.objectContaining({
        vdocipherStatus: 'READY',
      }),
    });
    expect(body).toEqual({ ok: true });

    if (originalSecret === undefined) {
      delete process.env.VDOCIPHER_WEBHOOK_SECRET;
    } else {
      process.env.VDOCIPHER_WEBHOOK_SECRET = originalSecret;
    }
  });

  it('rejects webhook requests with wrong secret', async () => {
    const { POST: vdocipherWebhook } = await import('@/app/api/webhook/vdocipher/route');
    const originalSecret = process.env.VDOCIPHER_WEBHOOK_SECRET;
    process.env.VDOCIPHER_WEBHOOK_SECRET = 'hook-secret';

    const response = await vdocipherWebhook(
      jsonRequest('http://localhost.test/api/webhook/vdocipher?secret=wrong', {
        videoId: 'vdo-id',
        status: 'ready',
      })
    );

    expect(response.status).toBe(401);
    expect(mockedPrisma.video.findFirst).not.toHaveBeenCalled();

    if (originalSecret === undefined) {
      delete process.env.VDOCIPHER_WEBHOOK_SECRET;
    } else {
      process.env.VDOCIPHER_WEBHOOK_SECRET = originalSecret;
    }
  });
});
