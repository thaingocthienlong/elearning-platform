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
  createVdoCipherUpload: jest.fn(),
  getVdoCipherVideoStatus: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import {
  listVdoCipherAccounts,
  resolveVdoCipherAccount,
} from '@/lib/vdocipher-accounts';
import {
  createVdoCipherUpload,
  getVdoCipherVideoStatus,
} from '@/lib/vdocipher';
const mockedGetServerSession = getServerSession as jest.Mock;
const mockedListVdoCipherAccounts = listVdoCipherAccounts as jest.Mock;
const mockedResolveVdoCipherAccount = resolveVdoCipherAccount as jest.Mock;
const mockedCreateVdoCipherUpload = createVdoCipherUpload as jest.Mock;
const mockedGetVdoCipherVideoStatus = getVdoCipherVideoStatus as jest.Mock;
const mockedPrisma = prisma as unknown as {
  course: {
    findUnique: jest.Mock;
  };
  video: {
    create: jest.Mock;
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
    mockedResolveVdoCipherAccount.mockReturnValue({
      id: 'primary',
      apiSecret: 'secret',
      isDefault: true,
    });
    mockedGetVdoCipherVideoStatus.mockResolvedValue({
      status: 'ready',
      poster: 'https://poster.example.test',
    });
    mockedPrisma.video.update.mockResolvedValue({});

    const response = await syncVideo(
      jsonRequest('http://localhost.test/api/video/vdocipher/sync', {
        videoId: 'local-video-id',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedGetVdoCipherVideoStatus).toHaveBeenCalledWith({
      apiSecret: 'secret',
      vdoCipherVideoId: 'vdo-id',
    });
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'local-video-id' },
      data: expect.objectContaining({
        vdocipherStatus: 'READY',
        vdocipherPosterUrl: 'https://poster.example.test',
      }),
    });
    expect(body).toMatchObject({ success: true, status: 'READY' });
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
    expect(mockedGetVdoCipherVideoStatus).not.toHaveBeenCalled();
  });
});
