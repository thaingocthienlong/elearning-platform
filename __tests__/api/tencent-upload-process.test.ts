/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { createTencentUploadSignature, processTencentMedia } from '@/lib/tencent/vod';
import { POST as uploadPost } from '@/app/api/upload/presigned/route';
import { POST as completePost } from '@/app/api/upload/complete/route';
import { POST as processPost } from '@/app/api/video/process/route';

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

jest.mock('@/lib/tencent/vod', () => ({
  createTencentUploadSignature: jest.fn(),
  processTencentMedia: jest.fn(),
}));

jest.mock('@/lib/tencent/env', () => ({
  loadTencentEnv: jest.fn(() => ({
    subAppId: 123456,
  })),
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
  course: { findUnique: jest.Mock };
  video: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
};
const mockedCreateTencentUploadSignature = createTencentUploadSignature as jest.Mock;
const mockedProcessTencentMedia = processTencentMedia as jest.Mock;

const adminSession = {
  user: {
    id: 'admin-1',
    role: 'ADMIN',
  },
};

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Tencent upload and process routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue(adminSession);
  });

  test('admin upload creates Tencent web SDK upload signature and pending video', async () => {
    mockedPrisma.course.findUnique.mockResolvedValue({ id: '64b7f0000000000000000001', isDeleted: false });
    mockedPrisma.video.create.mockResolvedValue({ id: '64b7f0000000000000000002' });
    mockedCreateTencentUploadSignature.mockReturnValue({
      signature: 'upload-signature',
      currentTimeStamp: 1700000000,
      expireTime: 1700003600,
    });

    const response = await uploadPost(jsonRequest('http://localhost/api/upload/presigned', {
      filename: 'lesson.mp4',
      contentType: 'video/mp4',
      courseId: '64b7f0000000000000000001',
      title: 'Lesson 1',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.provider).toBe('tencent');
    expect(body.uploadMode).toBe('web-sdk');
    expect(body.uploadSignature).toBe('upload-signature');
    expect(body.videoId).toBe('64b7f0000000000000000002');
    expect(body.tencentSubAppId).toBe(123456);
    expect(mockedCreateTencentUploadSignature).toHaveBeenCalledWith({
      videoId: '64b7f0000000000000000002',
    });
    expect(mockedPrisma.video.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tencentStatus: 'UPLOAD_APPLIED',
        published: false,
      }),
    });
  });

  test('admin upload completion stores Tencent file id', async () => {
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: '64b7f0000000000000000002',
      isDeleted: false,
      tencentStatus: 'UPLOAD_APPLIED',
    });
    mockedPrisma.video.update.mockResolvedValue({
      id: '64b7f0000000000000000002',
      tencentFileId: 'tencent-file-id',
      tencentStatus: 'UPLOAD_CONFIRMED',
      dashUrl: null,
      hlsUrl: null,
    });

    const response = await completePost(jsonRequest('http://localhost/api/upload/complete', {
      videoId: '64b7f0000000000000000002',
      fileId: 'tencent-file-id',
      mediaUrl: 'https://media.example/video.mp4',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.provider).toBe('tencent');
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: '64b7f0000000000000000002' },
      data: expect.objectContaining({
        tencentFileId: 'tencent-file-id',
        tencentStatus: 'UPLOAD_CONFIRMED',
        tencentSyncedAt: expect.any(Date),
      }),
      select: {
        id: true,
        tencentFileId: true,
        tencentStatus: true,
        dashUrl: true,
        hlsUrl: true,
      },
    });
  });

  test('upload completion does not roll back a READY webhook state', async () => {
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: '64b7f0000000000000000002',
      isDeleted: false,
      tencentStatus: 'READY',
    });
    mockedPrisma.video.update.mockResolvedValue({
      id: '64b7f0000000000000000002',
      tencentFileId: 'tencent-file-id',
      tencentStatus: 'READY',
      dashUrl: null,
      hlsUrl: 'https://media.example/protected.m3u8',
    });

    const response = await completePost(jsonRequest('http://localhost/api/upload/complete', {
      videoId: '64b7f0000000000000000002',
      fileId: 'tencent-file-id',
      mediaUrl: 'https://media.example/source.mp4',
    }));

    expect(response.status).toBe(200);
    const update = mockedPrisma.video.update.mock.calls[0][0];
    expect(update.data).not.toHaveProperty('tencentStatus');
    expect(update.data).toEqual(expect.objectContaining({
      tencentFileId: 'tencent-file-id',
      tencentSyncedAt: expect.any(Date),
    }));
  });

  test('legacy process endpoint cannot start a second Tencent task', async () => {
    const response = await processPost();
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body).toEqual({
      error: 'Tencent processing starts during upload via WV-SAES-V1.',
    });
    expect(mockedProcessTencentMedia).not.toHaveBeenCalled();
    expect(mockedPrisma.video.findUnique).not.toHaveBeenCalled();
    expect(mockedPrisma.video.update).not.toHaveBeenCalled();
  });
});
