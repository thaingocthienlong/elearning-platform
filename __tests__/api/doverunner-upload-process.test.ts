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

jest.mock('@/lib/media-provider', () => ({
  activeMediaProvider: {
    name: 'doverunner',
    createUploadUrl: jest.fn(),
    submitProcessing: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { activeMediaProvider } from '@/lib/media-provider';

const mockedGetServerSession = getServerSession as jest.Mock;
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
const mockedProvider = activeMediaProvider as unknown as {
  createUploadUrl: jest.Mock;
  submitProcessing: jest.Mock;
};

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('DoveRunner upload and processing routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN', email: 'admin@example.test' },
    });
  });

  it('creates an unpublished video row and S3 presigned upload URL', async () => {
    const { POST } = await import('@/app/api/upload/presigned/route');
    mockedPrisma.course.findUnique.mockResolvedValue({ id: 'course-id', isDeleted: false });
    mockedPrisma.video.create.mockResolvedValue({ id: 'video-id' });
    mockedPrisma.video.update.mockResolvedValue({});
    mockedProvider.createUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.test/upload',
      sourceKey: 'videos/video-id/source.mp4',
      sourceBucket: 'input-bucket',
    });

    const response = await POST(
      jsonRequest('http://localhost.test/api/upload/presigned', {
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: '123456789012345678901234',
        title: 'Lesson',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedProvider.createUploadUrl).toHaveBeenCalledWith({
      videoId: 'video-id',
      filename: 'lesson.mp4',
      contentType: 'video/mp4',
    });
    expect(mockedPrisma.video.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Lesson',
        courseId: '123456789012345678901234',
        published: false,
      }),
    });
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'video-id' },
      data: {
        mediaProvider: 'doverunner',
        sourceStorageBucket: 'input-bucket',
        sourceStorageKey: 'videos/video-id/source.mp4',
        providerStatus: 'UPLOAD_URL_CREATED',
      },
    });
    expect(body).toEqual({
      signedUrl: 'https://s3.example.test/upload',
      videoId: 'video-id',
      key: 'videos/video-id/source.mp4',
    });
  });

  it('submits a DoveRunner processing job for uploaded source media', async () => {
    const { POST } = await import('@/app/api/video/process/route');
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: 'video-id',
      title: 'Lesson',
      sourceStorageKey: 'videos/video-id/source.mp4',
      sourceStorageBucket: 'input-bucket',
    });
    mockedProvider.submitProcessing.mockResolvedValue({
      providerJobId: 'job-123',
      providerContentId: 'video-id',
      status: 'SUBMITTED',
      outputPath: 'video-id/',
    });
    mockedPrisma.video.update.mockResolvedValue({});

    const response = await POST(
      jsonRequest('http://localhost.test/api/video/process', {
        videoId: 'video-id',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedProvider.submitProcessing).toHaveBeenCalledWith({
      videoId: 'video-id',
      title: 'Lesson',
      sourceKey: 'videos/video-id/source.mp4',
    });
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'video-id' },
      data: {
        providerJobId: 'job-123',
        providerContentId: 'video-id',
        providerStatus: 'SUBMITTED',
        outputStoragePath: 'video-id/',
        providerSyncedAt: expect.any(Date),
      },
    });
    expect(body).toEqual({
      success: true,
      provider: 'doverunner',
      providerJobId: 'job-123',
      providerContentId: 'video-id',
      status: 'SUBMITTED',
    });
  });
});
