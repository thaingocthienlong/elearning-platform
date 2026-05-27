/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { activeMediaProvider } from '@/lib/media-provider';
import { POST as uploadPost } from '@/app/api/upload/presigned/route';
import { POST as processPost } from '@/app/api/video/process/route';
import { POST as syncPost } from '@/app/api/video/sync/route';
import { DoveRunnerTnpError } from '@/lib/media-provider/doverunner';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    course: { findUnique: jest.fn() },
    video: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  },
}));
jest.mock('@/lib/media-provider', () => ({
  activeMediaProvider: {
    name: 'doverunner',
    createUploadUrl: jest.fn(),
    submitProcessing: jest.fn(),
    syncProcessing: jest.fn(),
  },
}));

const mockedSession = getServerSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
  course: { findUnique: jest.Mock };
  video: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
};
const mockedProvider = activeMediaProvider as unknown as {
  createUploadUrl: jest.Mock;
  submitProcessing: jest.Mock;
  syncProcessing: jest.Mock;
};

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('DoveRunner media routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
  });

  test('upload route creates video row and S3 presigned URL', async () => {
    mockedPrisma.course.findUnique.mockResolvedValue({ id: '665f1a111111111111111111' });
    mockedPrisma.video.create.mockResolvedValue({ id: 'video-1' });
    mockedProvider.createUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.test/upload',
      sourceKey: 'videos/video-1/source.mp4',
      sourceBucket: 'input-bucket',
    });

    const response = await uploadPost(jsonRequest('http://localhost/api/upload/presigned', {
      filename: 'lecture.mp4',
      contentType: 'video/mp4',
      courseId: '665f1a111111111111111111',
      title: 'Lecture 1',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      signedUrl: 'https://s3.example.test/upload',
      videoId: 'video-1',
      key: 'videos/video-1/source.mp4',
    });
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'video-1' },
      data: {
        mediaProvider: 'doverunner',
        sourceStorageBucket: 'input-bucket',
        sourceStorageKey: 'videos/video-1/source.mp4',
        providerStatus: 'UPLOAD_URL_CREATED',
      },
    });
  });

  test('process route submits DoveRunner job and stores provider IDs', async () => {
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: 'video-1',
      title: 'Lecture 1',
      sourceStorageKey: 'videos/video-1/source.mp4',
    });
    mockedProvider.submitProcessing.mockResolvedValue({
      providerJobId: 'job-1',
      providerContentId: 'video-1',
      outputPath: 'videos/video-1/',
      status: 'QUEUED',
    });

    const response = await processPost(jsonRequest('http://localhost/api/video/process', { videoId: 'video-1' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'video-1' },
      data: {
        providerJobId: 'job-1',
        providerContentId: 'video-1',
        providerStatus: 'QUEUED',
        outputStoragePath: 'videos/video-1/',
        providerSyncedAt: expect.any(Date),
      },
    });
    expect(body).toMatchObject({ success: true, providerJobId: 'job-1' });
  });

  test('process route returns actionable DoveRunner limit errors', async () => {
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: 'video-1',
      title: 'Lecture 1',
      sourceStorageKey: 'videos/video-1/source.mp4',
    });
    mockedProvider.submitProcessing.mockRejectedValue(new DoveRunnerTnpError('E9011', 200));

    const response = await processPost(jsonRequest('http://localhost/api/video/process', { videoId: 'video-1' }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toMatchObject({
      providerErrorCode: 'E9011',
    });
    expect(body.error).toContain('trial packaging job limit exceeded');
  });

  test('sync route publishes video when DoveRunner job is ready', async () => {
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: 'video-1',
      providerJobId: 'job-1',
      providerContentId: 'video-1',
    });
    mockedProvider.syncProcessing.mockResolvedValue({
      status: 'READY',
      ready: true,
      dashUrl: 'https://cdn.example.test/output/videos/video-1/manifest.mpd',
      hlsUrl: 'https://cdn.example.test/output/videos/video-1/master.m3u8',
    });

    const response = await syncPost(jsonRequest('http://localhost/api/video/sync', { videoId: 'video-1' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'video-1' },
      data: {
        providerStatus: 'READY',
        providerSyncedAt: expect.any(Date),
        dashUrl: 'https://cdn.example.test/output/videos/video-1/manifest.mpd',
        hlsUrl: 'https://cdn.example.test/output/videos/video-1/master.m3u8',
        published: true,
      },
    });
    expect(body).toMatchObject({ success: true, status: 'READY', updated: true });
  });
});
