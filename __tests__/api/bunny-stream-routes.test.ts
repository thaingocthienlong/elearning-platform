/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import {
  BunnyStreamApiError,
  createBunnyStreamVideo,
  deleteBunnyStreamVideo,
} from '@/lib/bunny-stream/client';
import { serverLog } from '@/lib/server-log';
import { POST as uploadCredentialsPost } from '@/app/api/bunny-stream/upload-credentials/route';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');

  return {
    ...actual,
    after: jest.fn((callback: () => unknown) => callback()),
  };
});
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    course: { findUnique: jest.fn() },
    video: {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    bunnyUploadInitialization: {
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock('@/lib/bunny-stream/client', () => {
  const actual = jest.requireActual('@/lib/bunny-stream/client');

  return {
    ...actual,
    createBunnyStreamVideo: jest.fn(),
    deleteBunnyStreamVideo: jest.fn(),
    getBunnyStreamVideo: jest.fn(),
  };
});
jest.mock('@/lib/server-log', () => ({
  serverLog: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockedSession = getServerSession as jest.Mock;
const mockedCreateBunnyVideo = createBunnyStreamVideo as jest.Mock;
const mockedDeleteBunnyVideo = deleteBunnyStreamVideo as jest.Mock;
const mockedServerLog = serverLog as unknown as {
  error: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
};
const mockedPrisma = prisma as unknown as {
  course: { findUnique: jest.Mock };
  video: {
    create: jest.Mock;
    delete: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  bunnyUploadInitialization: {
    create: jest.Mock;
    delete: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const validUploadBody = {
  uploadRequestId: 'upload-request-1',
  filename: 'lesson.mp4',
  contentType: 'video/mp4',
  courseId: '507f1f77bcf86cd799439011',
  title: 'Lesson',
};

function mockExistingInitialization(
  state: 'INITIALIZING' | 'READY' | 'UNCERTAIN' | 'ORPHANED',
  overrides: Record<string, unknown> = {}
) {
  mockedPrisma.bunnyUploadInitialization.create.mockImplementationOnce(
    async ({ data }: { data: { payloadFingerprint: string } }) => {
      mockedPrisma.bunnyUploadInitialization.findUnique.mockResolvedValue({
        id: 'existing-initialization-id',
        uploadRequestId: 'upload-request-1',
        payloadFingerprint: data.payloadFingerprint,
        bunnyLibraryId: '123456',
        bunnyVideoId: null,
        localVideoId: null,
        state,
        ...overrides,
      });

      throw Object.assign(new Error('unique constraint'), { code: 'P2002' });
    }
  );
}

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost.test${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function invalidJsonRequest(path: string) {
  return new Request(`http://localhost.test${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"incomplete"',
  });
}

async function flushMicrotasks() {
  for (let index = 0; index < 20; index += 1) {
    await Promise.resolve();
  }
}

describe('Bunny Stream upload credentials route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BUNNY_STREAM_LIBRARY_ID = '123456';
    process.env.BUNNY_STREAM_API_KEY = 'api-key';
    process.env.BUNNY_STREAM_READ_ONLY_API_KEY = 'read-only';
    process.env.BUNNY_STREAM_TOKEN_SECURITY_KEY = 'token-key';
    process.env.BUNNY_STREAM_TUS_EXPIRE_SECONDS = '86400';
    process.env.BUNNY_STREAM_API_TIMEOUT_MS = '15000';
    mockedPrisma.bunnyUploadInitialization.findMany.mockResolvedValue([]);
    mockedPrisma.bunnyUploadInitialization.create.mockResolvedValue({
      id: 'initialization-id',
    });
    mockedPrisma.bunnyUploadInitialization.update.mockResolvedValue({
      id: 'initialization-id',
    });
    mockedPrisma.bunnyUploadInitialization.delete.mockResolvedValue({
      id: 'initialization-id',
    });
    mockedPrisma.video.delete.mockResolvedValue({ id: 'local-video-id' });
  });

  test('requires an authenticated session', async () => {
    mockedSession.mockResolvedValue(null);

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        uploadRequestId: 'upload-request-1',
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: '507f1f77bcf86cd799439011',
        title: 'Lesson',
      })
    );

    expect(response.status).toBe(401);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
  });

  test('requires admin session', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        uploadRequestId: 'upload-request-1',
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: '507f1f77bcf86cd799439011',
        title: 'Lesson',
      })
    );

    expect(response.status).toBe(403);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
  });

  test('returns safe JSON 400 for malformed JSON before creating provider video', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });

    const response = await uploadCredentialsPost(
      invalidJsonRequest('/api/bunny-stream/upload-credentials')
    );

    await expect(response.json()).resolves.toEqual({
      error: 'Validation failed',
    });
    expect(response.status).toBe(400);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
  });

  test('requires bounded uploadRequestId token before creating provider video', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });

    const missingResponse = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        ...validUploadBody,
        uploadRequestId: undefined,
      })
    );
    const invalidResponse = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        ...validUploadBody,
        uploadRequestId: 'not valid whitespace',
      })
    );

    expect(missingResponse.status).toBe(400);
    expect(invalidResponse.status).toBe(400);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
  });

  test('rejects non-hex course ID before creating provider video', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        uploadRequestId: 'upload-request-1',
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: '507f1f77bcf86cd79943901z',
        title: 'Lesson',
      })
    );

    expect(response.status).toBe(400);
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
        uploadRequestId: 'upload-request-1',
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
      timeoutMs: 15000,
    });
    expect(mockedPrisma.bunnyUploadInitialization.create).toHaveBeenCalledWith({
      data: {
        uploadRequestId: 'upload-request-1',
        payloadFingerprint: expect.stringMatching(/^[0-9a-f]{64}$/),
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: '507f1f77bcf86cd799439011',
        title: 'Lesson',
        bunnyLibraryId: '123456',
        bunnyCollectionId: null,
        state: 'INITIALIZING',
      },
      select: { id: true },
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
    expect(
      mockedPrisma.bunnyUploadInitialization.update
    ).toHaveBeenNthCalledWith(1, {
      where: { id: 'initialization-id' },
      data: { bunnyVideoId: 'bunny-video-guid' },
    });
    expect(
      mockedPrisma.bunnyUploadInitialization.update
    ).toHaveBeenNthCalledWith(2, {
      where: { id: 'initialization-id' },
      data: {
        localVideoId: 'local-video-id',
        state: 'READY',
        failureMarker: null,
      },
    });
    expect(JSON.stringify(body)).not.toContain('api-key');
  });

  test('reuses ready initialization and does not create second provider video', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockExistingInitialization('READY', {
      bunnyVideoId: 'existing-bunny-video-guid',
      localVideoId: 'existing-local-video-id',
    });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    await expect(response.json()).resolves.toEqual({
      uploadEndpoint: 'https://video.bunnycdn.com/tusupload',
      libraryId: '123456',
      videoId: 'existing-bunny-video-guid',
      authorizationExpire: expect.any(Number),
      authorizationSignature: expect.stringMatching(/^[0-9a-f]{64}$/),
      localVideoId: 'existing-local-video-id',
    });
    expect(response.status).toBe(200);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
    expect(mockedPrisma.video.create).not.toHaveBeenCalled();
  });

  test('rejects uploadRequestId reuse with different effective payload', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockExistingInitialization('READY', {
      payloadFingerprint: 'different-fingerprint',
      bunnyVideoId: 'existing-bunny-video-guid',
      localVideoId: 'existing-local-video-id',
    });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    await expect(response.json()).resolves.toEqual({
      error: 'uploadRequestId was already used for a different upload',
    });
    expect(response.status).toBe(409);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
  });

  test.each(['INITIALIZING', 'UNCERTAIN', 'ORPHANED'] as const)(
    'blocks provider recreate while initialization is %s',
    async (state) => {
      mockedSession.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });
      mockedPrisma.course.findUnique.mockResolvedValue({
        id: '507f1f77bcf86cd799439011',
        isDeleted: false,
      });
      mockExistingInitialization(state);

      const response = await uploadCredentialsPost(
        jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
      );

      await expect(response.json()).resolves.toEqual({
        error: 'Upload initialization requires reconciliation before retry',
      });
      expect(response.status).toBe(409);
      expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
    }
  );

  test('returns safe JSON 502 when Bunny Stream omits video GUID', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockedCreateBunnyVideo.mockResolvedValue({});

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        uploadRequestId: 'upload-request-1',
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: '507f1f77bcf86cd799439011',
        title: 'Lesson',
      })
    );

    await expect(response.json()).resolves.toEqual({
      error: 'Bunny Stream did not return a video ID',
    });
    expect(response.status).toBe(502);
    expect(mockedPrisma.video.create).not.toHaveBeenCalled();
    expect(mockedDeleteBunnyVideo).not.toHaveBeenCalled();
    expect(mockedPrisma.bunnyUploadInitialization.update).toHaveBeenCalledWith({
      where: { id: 'initialization-id' },
      data: {
        state: 'UNCERTAIN',
        failureMarker: 'PROVIDER_CREATE_MISSING_VIDEO_ID',
      },
    });
  });

  test('maps Bunny Stream API failures to safe JSON 502', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockedCreateBunnyVideo.mockRejectedValue(
      new BunnyStreamApiError('raw sentinel provider detail', 429)
    );

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        uploadRequestId: 'upload-request-1',
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: '507f1f77bcf86cd799439011',
        title: 'Lesson',
      })
    );

    await expect(response.json()).resolves.toEqual({
      error: 'Bunny Stream upload failed to initialize',
    });
    expect(response.status).toBe(502);
    expect(mockedDeleteBunnyVideo).not.toHaveBeenCalled();
    expect(mockedPrisma.bunnyUploadInitialization.update).toHaveBeenCalledWith({
      where: { id: 'initialization-id' },
      data: {
        state: 'UNCERTAIN',
        failureMarker: 'PROVIDER_CREATE_OUTCOME_UNKNOWN',
      },
    });
    expect(mockedServerLog.error).toHaveBeenCalledWith(
      'bunny_stream_upload_credentials_failed',
      {
        errorName: 'BunnyStreamApiError',
        apiStatus: 429,
      }
    );
    expect(JSON.stringify(mockedServerLog.error.mock.calls)).not.toContain(
      'raw sentinel provider detail'
    );
  });

  test('deletes provider video when local row persistence fails', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockedCreateBunnyVideo.mockResolvedValue({ guid: 'bunny-video-guid' });
    mockedPrisma.video.create
      .mockRejectedValueOnce(new Error('database rejected row'))
      .mockResolvedValueOnce({ id: 'retry-local-video-id' });
    mockedDeleteBunnyVideo.mockResolvedValue(undefined);

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        uploadRequestId: 'upload-request-1',
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: '507f1f77bcf86cd799439011',
        title: 'Lesson',
      })
    );

    expect(response.status).toBe(500);
    expect(mockedDeleteBunnyVideo).toHaveBeenCalledWith({
      libraryId: '123456',
      apiKey: 'api-key',
      videoId: 'bunny-video-guid',
      timeoutMs: 15000,
    });
    expect(mockedServerLog.info).toHaveBeenCalledWith(
      'bunny_stream_orphan_cleanup_succeeded',
      {
        libraryId: '123456',
        videoId: 'bunny-video-guid',
      }
    );
    expect(mockedPrisma.bunnyUploadInitialization.delete).toHaveBeenCalledWith({
      where: { id: 'initialization-id' },
    });

    const retryResponse = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    expect(retryResponse.status).toBe(200);
    expect(mockedCreateBunnyVideo).toHaveBeenCalledTimes(2);
  });

  test('does not mask persistence failure or log raw errors when provider cleanup fails', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockedCreateBunnyVideo.mockResolvedValue({ guid: 'bunny-video-guid' });
    const persistenceError = new Error('raw sentinel persistence detail');
    persistenceError.name = 'raw sentinel persistence name';
    mockedPrisma.video.create.mockRejectedValue(persistenceError);
    mockedDeleteBunnyVideo.mockRejectedValue(
      new BunnyStreamApiError('raw sentinel cleanup detail', 503)
    );

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        uploadRequestId: 'upload-request-1',
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
    expect(mockedServerLog.warn).toHaveBeenCalledWith(
      'bunny_stream_orphan_cleanup_failed',
      {
        libraryId: '123456',
        videoId: 'bunny-video-guid',
        errorName: 'BunnyStreamApiError',
        apiStatus: 503,
      }
    );
    expect(mockedServerLog.error).toHaveBeenCalledWith(
      'bunny_stream_upload_credentials_failed',
      {
        errorName: 'UnexpectedError',
      }
    );
    expect(mockedPrisma.bunnyUploadInitialization.update).toHaveBeenCalledWith({
      where: { id: 'initialization-id' },
      data: {
        state: 'ORPHANED',
        failureMarker: 'PROVIDER_CLEANUP_FAILED',
      },
    });
    expect(
      JSON.stringify([
        ...mockedServerLog.warn.mock.calls,
        ...mockedServerLog.error.mock.calls,
      ])
    ).not.toContain('raw sentinel');
  });

  test('rejects deleted or missing course before creating provider video', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue(null);

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        uploadRequestId: 'upload-request-1',
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
        uploadRequestId: 'upload-request-1',
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
        uploadRequestId: 'upload-request-1',
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

  test('best-effort cleans stale known provider reservation without blocking current request', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockedPrisma.bunnyUploadInitialization.findMany.mockResolvedValue([
      {
        id: 'stale-initialization-id',
        bunnyLibraryId: '123456',
        bunnyVideoId: 'stale-bunny-video-guid',
        localVideoId: null,
      },
    ]);
    mockedDeleteBunnyVideo.mockResolvedValue(undefined);
    mockedCreateBunnyVideo.mockResolvedValue({ guid: 'fresh-bunny-video-guid' });
    mockedPrisma.video.create.mockResolvedValue({ id: 'fresh-local-video-id' });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    await flushMicrotasks();

    expect(response.status).toBe(200);
    expect(mockedDeleteBunnyVideo).toHaveBeenCalledWith({
      libraryId: '123456',
      apiKey: 'api-key',
      videoId: 'stale-bunny-video-guid',
      timeoutMs: 15000,
    });
    expect(mockedPrisma.bunnyUploadInitialization.delete).toHaveBeenCalledWith({
      where: { id: 'stale-initialization-id' },
    });
    expect(mockedCreateBunnyVideo).toHaveBeenCalledTimes(1);
  });

  test('returns current upload response before stale provider cleanup resolves', async () => {
    let resolveDelete: (() => void) | undefined;
    const staleCleanup = new Promise<void>((resolve) => {
      resolveDelete = resolve;
    });

    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockedPrisma.bunnyUploadInitialization.findMany.mockResolvedValue([
      {
        id: 'stale-initialization-id',
        bunnyLibraryId: '123456',
        bunnyVideoId: 'stale-bunny-video-guid',
        localVideoId: null,
      },
    ]);
    mockedDeleteBunnyVideo.mockReturnValueOnce(staleCleanup);
    mockedCreateBunnyVideo.mockResolvedValue({ guid: 'fresh-bunny-video-guid' });
    mockedPrisma.video.create.mockResolvedValue({ id: 'fresh-local-video-id' });

    const responsePromise = uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );
    let response: Response | undefined;
    void responsePromise.then((resolvedResponse) => {
      response = resolvedResponse;
    });

    await flushMicrotasks();

    try {
      expect(mockedDeleteBunnyVideo).toHaveBeenCalledWith({
        libraryId: '123456',
        apiKey: 'api-key',
        videoId: 'stale-bunny-video-guid',
        timeoutMs: 15000,
      });
      expect(response?.status).toBe(200);
      expect(
        mockedPrisma.bunnyUploadInitialization.delete
      ).not.toHaveBeenCalledWith({
        where: { id: 'stale-initialization-id' },
      });
    } finally {
      resolveDelete?.();
      await staleCleanup;
      await responsePromise;
      await flushMicrotasks();
    }

    expect(mockedPrisma.bunnyUploadInitialization.delete).toHaveBeenCalledWith({
      where: { id: 'stale-initialization-id' },
    });
  });

  test('does not block current request when stale provider cleanup fails', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockedPrisma.bunnyUploadInitialization.findMany.mockResolvedValue([
      {
        id: 'stale-initialization-id',
        bunnyLibraryId: '123456',
        bunnyVideoId: 'stale-bunny-video-guid',
        localVideoId: null,
      },
    ]);
    mockedDeleteBunnyVideo.mockRejectedValueOnce(
      new BunnyStreamApiError('raw stale cleanup failure', 503)
    );
    mockedCreateBunnyVideo.mockResolvedValue({ guid: 'fresh-bunny-video-guid' });
    mockedPrisma.video.create.mockResolvedValue({ id: 'fresh-local-video-id' });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    await flushMicrotasks();

    expect(response.status).toBe(200);
    expect(mockedPrisma.bunnyUploadInitialization.update).toHaveBeenCalledWith({
      where: { id: 'stale-initialization-id' },
      data: {
        state: 'ORPHANED',
        failureMarker: 'PROVIDER_CLEANUP_FAILED',
      },
    });
    expect(mockedCreateBunnyVideo).toHaveBeenCalledTimes(1);
  });
});
