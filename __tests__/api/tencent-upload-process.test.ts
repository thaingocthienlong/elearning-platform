/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { applyTencentUpload, processTencentMedia } from '@/lib/tencent/vod';
import { POST as uploadPost } from '@/app/api/upload/presigned/route';
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
  applyTencentUpload: jest.fn(),
  processTencentMedia: jest.fn(),
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
  course: { findUnique: jest.Mock };
  video: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
};
const mockedApplyTencentUpload = applyTencentUpload as jest.Mock;
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

  test('admin upload creates Tencent upload instructions and pending video', async () => {
    mockedPrisma.course.findUnique.mockResolvedValue({ id: '64b7f0000000000000000001', isDeleted: false });
    mockedPrisma.video.create.mockResolvedValue({ id: '64b7f0000000000000000002' });
    mockedApplyTencentUpload.mockResolvedValue({
      storageBucket: 'bucket-test',
      storageRegion: 'ap-singapore',
      mediaStoragePath: '/course/video.mp4',
      vodSessionKey: 'vod-session-key',
      tempCertificate: {
        secretId: 'temp-secret-id',
        secretKey: 'temp-secret-key',
        token: 'temp-token',
        expiredTime: 1700000000,
      },
      requestId: 'request-id',
    });
    mockedPrisma.video.update.mockResolvedValue({});

    const response = await uploadPost(jsonRequest('http://localhost/api/upload/presigned', {
      filename: 'lesson.mp4',
      contentType: 'video/mp4',
      courseId: '64b7f0000000000000000001',
      title: 'Lesson 1',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.provider).toBe('tencent');
    expect(body.videoId).toBe('64b7f0000000000000000002');
    expect(mockedApplyTencentUpload).toHaveBeenCalledWith({
      filename: 'lesson.mp4',
      mediaType: 'mp4',
      videoId: '64b7f0000000000000000002',
    });
    expect(mockedPrisma.video.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tencentStatus: 'UPLOAD_APPLIED',
        published: false,
      }),
    });
  });

  test('admin process submits Tencent processing by file id', async () => {
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: '64b7f0000000000000000002',
      title: 'Lesson 1',
      tencentFileId: 'tencent-file-id',
    });
    mockedProcessTencentMedia.mockResolvedValue({ TaskId: 'task-id' });
    mockedPrisma.video.update.mockResolvedValue({});

    const response = await processPost(jsonRequest('http://localhost/api/video/process', {
      videoId: '64b7f0000000000000000002',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      provider: 'tencent',
      taskId: 'task-id',
    });
    expect(mockedProcessTencentMedia).toHaveBeenCalledWith('tencent-file-id');
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: '64b7f0000000000000000002' },
      data: {
        tencentTaskId: 'task-id',
        tencentStatus: 'PROCESSING',
      },
    });
  });
});
