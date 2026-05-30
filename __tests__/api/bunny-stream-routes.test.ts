/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { createBunnyStreamVideo } from '@/lib/bunny-stream/client';
import { POST as uploadCredentialsPost } from '@/app/api/bunny-stream/upload-credentials/route';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    course: { findUnique: jest.fn() },
    video: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock('@/lib/bunny-stream/client', () => ({
  createBunnyStreamVideo: jest.fn(),
  getBunnyStreamVideo: jest.fn(),
}));

const mockedSession = getServerSession as jest.Mock;
const mockedCreateBunnyVideo = createBunnyStreamVideo as jest.Mock;
const mockedPrisma = prisma as unknown as {
  course: { findUnique: jest.Mock };
  video: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost.test${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Bunny Stream upload credentials route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BUNNY_STREAM_LIBRARY_ID = '123456';
    process.env.BUNNY_STREAM_API_KEY = 'api-key';
    process.env.BUNNY_STREAM_READ_ONLY_API_KEY = 'read-only';
    process.env.BUNNY_STREAM_TOKEN_SECURITY_KEY = 'token-key';
    process.env.BUNNY_STREAM_TUS_EXPIRE_SECONDS = '86400';
  });

  test('requires admin session', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: '507f1f77bcf86cd799439011',
        title: 'Lesson',
      })
    );

    expect(response.status).toBe(403);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
  });

  test('creates Bunny video and local row, then returns TUS credentials without API key', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockedCreateBunnyVideo.mockResolvedValue({ guid: 'bunny-video-guid' });
    mockedPrisma.video.create.mockResolvedValue({ id: 'local-video-id' });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: '507f1f77bcf86cd799439011',
        title: 'Lesson',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedCreateBunnyVideo).toHaveBeenCalledWith({
      libraryId: '123456',
      apiKey: 'api-key',
      title: 'Lesson',
      collectionId: null,
    });
    expect(mockedPrisma.video.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Lesson',
        courseId: '507f1f77bcf86cd799439011',
        provider: 'BUNNY_STREAM',
        bunnyLibraryId: '123456',
        bunnyVideoId: 'bunny-video-guid',
        bunnyStatus: 'CREATED',
        published: false,
      }),
    });
    expect(body).toEqual({
      uploadEndpoint: 'https://video.bunnycdn.com/tusupload',
      libraryId: '123456',
      videoId: 'bunny-video-guid',
      authorizationExpire: expect.any(Number),
      authorizationSignature: expect.stringMatching(/^[0-9a-f]{64}$/),
      localVideoId: 'local-video-id',
    });
    expect(JSON.stringify(body)).not.toContain('api-key');
  });

  test('rejects deleted or missing course before creating provider video', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue(null);

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: '507f1f77bcf86cd799439011',
        title: 'Lesson',
      })
    );

    expect(response.status).toBe(404);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
  });

  test('rejects deleted course before creating provider video', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: true,
    });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: '507f1f77bcf86cd799439011',
        title: 'Lesson',
      })
    );

    expect(response.status).toBe(404);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
  });

  test('returns safe JSON 500 when session lookup fails', async () => {
    mockedSession.mockRejectedValue(new Error('session lookup failed'));

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: '507f1f77bcf86cd799439011',
        title: 'Lesson',
      })
    );

    await expect(response.json()).resolves.toEqual({
      error: 'Bunny Stream upload failed to initialize',
    });
    expect(response.status).toBe(500);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
  });
});
