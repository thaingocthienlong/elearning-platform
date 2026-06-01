/**
 * @jest-environment node
 */
import crypto from 'node:crypto';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import {
  BunnyStreamApiError,
  createBunnyStreamVideo,
  deleteBunnyStreamVideo,
  getBunnyStreamVideo,
} from '@/lib/bunny-stream/client';
import { serverLog } from '@/lib/server-log';
import { POST as uploadCredentialsPost } from '@/app/api/bunny-stream/upload-credentials/route';
import { POST as bunnyWebhookPost } from '@/app/api/webhook/bunny-stream/route';
import { POST as bunnyManualSyncPost } from '@/app/api/video/bunny-stream/sync/route';

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
      updateMany: jest.fn(),
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
const mockedGetBunnyVideo = getBunnyStreamVideo as jest.Mock;
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
    updateMany: jest.Mock;
  };
};

type UploadRequestBody = {
  uploadRequestId: string;
  filename: string;
  contentType: string;
  courseId: string;
  title: string;
  fileSize: number;
  fileLastModified: number;
  collectionId?: string;
};

function createUploadBody(overrides: Partial<UploadRequestBody> = {}) {
  return {
    uploadRequestId: 'upload-request-1',
    filename: 'lesson.mp4',
    contentType: 'video/mp4',
    courseId: '507f1f77bcf86cd799439011',
    title: 'Lesson',
    fileSize: 123456,
    fileLastModified: 1717000000000,
    ...overrides,
  };
}

const validUploadBody = createUploadBody();

function getUploadPayloadFingerprint(
  body: UploadRequestBody,
  bunnyCollectionId: string | null = null
) {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        filename: body.filename,
        contentType: body.contentType,
        courseId: body.courseId,
        title: body.title,
        fileSize: body.fileSize,
        fileLastModified: body.fileLastModified,
        bunnyLibraryId: '123456',
        bunnyCollectionId,
      })
    )
    .digest('hex');
}

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
        updatedAt: new Date().toISOString(),
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

function signedWebhookRequest(
  body: Record<string, unknown>,
  signature?: string
) {
  const rawBody = JSON.stringify(body);
  const digest = crypto
    .createHmac('sha256', process.env.BUNNY_STREAM_READ_ONLY_API_KEY || 'read-only')
    .update(rawBody, 'utf8')
    .digest('hex');

  return new Request('http://localhost.test/api/webhook/bunny-stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-BunnyStream-Signature-Version': 'v1',
      'X-BunnyStream-Signature-Algorithm': 'hmac-sha256',
      'X-BunnyStream-Signature': signature ?? digest,
    },
    body: rawBody,
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
    mockedPrisma.bunnyUploadInitialization.updateMany.mockResolvedValue({
      count: 1,
    });
    mockedPrisma.bunnyUploadInitialization.delete.mockResolvedValue({
      id: 'initialization-id',
    });
    mockedPrisma.video.delete.mockResolvedValue({ id: 'local-video-id' });
    mockedPrisma.video.findFirst.mockResolvedValue(null);
    mockedGetBunnyVideo.mockReset();
  });

  test('requires an authenticated session', async () => {
    mockedSession.mockResolvedValue(null);

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', createUploadBody())
    );

    expect(response.status).toBe(401);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
  });

  test('requires admin session', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', createUploadBody())
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
        ...createUploadBody(),
        courseId: '507f1f77bcf86cd79943901z',
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
      jsonRequest('/api/bunny-stream/upload-credentials', createUploadBody())
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

  test('rejects uploadRequestId reuse when file payload changes', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockExistingInitialization('READY', {
      payloadFingerprint: getUploadPayloadFingerprint(validUploadBody),
      bunnyVideoId: 'existing-bunny-video-guid',
      localVideoId: 'existing-local-video-id',
    });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        ...validUploadBody,
        fileSize: validUploadBody.fileSize + 1,
      })
    );

    await expect(response.json()).resolves.toEqual({
      error: 'uploadRequestId was already used for a different upload',
    });
    expect(response.status).toBe(409);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
  });

  test('blocks provider recreate while initialization is ORPHANED', async () => {
    mockedSession.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockExistingInitialization('ORPHANED');

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    await expect(response.json()).resolves.toEqual({
      error: 'Upload initialization requires reconciliation before retry',
    });
    expect(response.status).toBe(409);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
  });

  test('recovers INITIALIZING reservation when matching local video exists', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockExistingInitialization('INITIALIZING', {
      bunnyVideoId: 'initializing-bunny-video-guid',
    });
    mockedPrisma.video.findFirst.mockResolvedValue({
      id: 'recovered-local-video-id',
    });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    await expect(response.json()).resolves.toEqual({
      uploadEndpoint: 'https://video.bunnycdn.com/tusupload',
      libraryId: '123456',
      videoId: 'initializing-bunny-video-guid',
      authorizationExpire: expect.any(Number),
      authorizationSignature: expect.stringMatching(/^[0-9a-f]{64}$/),
      localVideoId: 'recovered-local-video-id',
    });
    expect(response.status).toBe(200);
    expect(mockedPrisma.video.findFirst).toHaveBeenCalledWith({
      where: {
        provider: 'BUNNY_STREAM',
        bunnyLibraryId: '123456',
        bunnyVideoId: 'initializing-bunny-video-guid',
        isDeleted: false,
      },
      select: { id: true },
    });
    expect(mockedPrisma.bunnyUploadInitialization.update).toHaveBeenCalledWith({
      where: { id: 'existing-initialization-id' },
      data: {
        localVideoId: 'recovered-local-video-id',
        state: 'READY',
        failureMarker: null,
      },
    });
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
    expect(mockedPrisma.video.create).not.toHaveBeenCalled();
  });

  test('cleans up INITIALIZING reservation with known provider when local row is missing', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockExistingInitialization('INITIALIZING', {
      bunnyVideoId: 'initializing-bunny-video-guid',
    });
    mockedPrisma.video.findFirst.mockResolvedValue(null);
    mockedDeleteBunnyVideo.mockResolvedValue(undefined);

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    await expect(response.json()).resolves.toEqual({
      error:
        'Previous upload initialization was cleaned up; retry upload initialization',
    });
    expect(response.status).toBe(409);
    expect(mockedDeleteBunnyVideo).toHaveBeenCalledWith({
      libraryId: '123456',
      apiKey: expect.any(String),
      videoId: 'initializing-bunny-video-guid',
      timeoutMs: expect.any(Number),
    });
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
    expect(mockedPrisma.video.create).not.toHaveBeenCalled();
  });

  test('reclaims cleaned INITIALIZING reservation and resumes initialization on retry', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockedPrisma.video.findFirst.mockResolvedValue(null);

    mockExistingInitialization('INITIALIZING', {
      bunnyVideoId: 'initializing-bunny-video-guid',
    });
    mockedDeleteBunnyVideo.mockResolvedValue(undefined);
    mockedPrisma.bunnyUploadInitialization.delete.mockRejectedValueOnce(
      Object.assign(new Error('reservation delete failed'), { code: 'P5000' })
    );

    const firstResponse = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    await expect(firstResponse.json()).resolves.toEqual({
      error: 'Upload initialization requires provider cleanup before retry',
    });
    expect(firstResponse.status).toBe(502);
    expect(mockedPrisma.bunnyUploadInitialization.update).toHaveBeenCalledWith({
      where: { id: 'existing-initialization-id' },
      data: {
        state: 'UNCERTAIN',
        failureMarker: 'PROVIDER_CLEANED_RESERVATION_DELETE_FAILED',
        bunnyLibraryId: '123456',
        bunnyVideoId: null,
        localVideoId: null,
      },
    });

    mockExistingInitialization('UNCERTAIN', {
      bunnyVideoId: null,
      localVideoId: null,
      failureMarker: 'PROVIDER_CLEANED_RESERVATION_DELETE_FAILED',
    });
    mockedPrisma.bunnyUploadInitialization.updateMany.mockResolvedValueOnce({
      count: 1,
    });
    mockedCreateBunnyVideo.mockResolvedValueOnce({
      guid: 'fresh-bunny-video-guid',
    });
    mockedPrisma.video.create.mockResolvedValueOnce({
      id: 'fresh-local-video-id',
    });

    const secondResponse = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    await expect(secondResponse.json()).resolves.toEqual({
      uploadEndpoint: 'https://video.bunnycdn.com/tusupload',
      libraryId: '123456',
      videoId: 'fresh-bunny-video-guid',
      authorizationExpire: expect.any(Number),
      authorizationSignature: expect.any(String),
      localVideoId: 'fresh-local-video-id',
    });
    expect(secondResponse.status).toBe(200);
    expect(mockedDeleteBunnyVideo).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.bunnyUploadInitialization.updateMany).toHaveBeenCalledWith(
      {
        where: {
          id: 'existing-initialization-id',
          state: 'UNCERTAIN',
          failureMarker: 'PROVIDER_CLEANED_RESERVATION_DELETE_FAILED',
          bunnyVideoId: null,
          localVideoId: null,
        },
        data: {
          state: 'INITIALIZING',
          failureMarker: null,
        },
      }
    );
    expect(mockedCreateBunnyVideo).toHaveBeenCalledTimes(1);
  });

  test('blocks recent INITIALIZING retry without provider handle', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockExistingInitialization('INITIALIZING', {
      updatedAt: new Date().toISOString(),
    });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    await expect(response.json()).resolves.toEqual({
      error: 'Upload initialization is already in progress',
    });
    expect(response.status).toBe(409);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
    expect(mockedPrisma.video.create).not.toHaveBeenCalled();
  });

  test('blocks UNCERTAIN retry when provider video is already known', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockExistingInitialization('UNCERTAIN', {
      bunnyVideoId: 'existing-bunny-video-guid',
    });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    await expect(response.json()).resolves.toEqual({
      error: 'Upload initialization requires reconciliation before retry',
    });
    expect(response.status).toBe(409);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
  });

  test('blocks same-fingerprint UNCERTAIN retry without known provider video', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockExistingInitialization('UNCERTAIN');

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    await expect(response.json()).resolves.toEqual({
      error:
        'Upload initialization requires manual reconciliation before retry',
    });
    expect(response.status).toBe(409);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
    expect(mockedPrisma.bunnyUploadInitialization.updateMany).not.toHaveBeenCalled();
  });

  test('rejects UNCERTAIN retry after a unique uploadRequestId claim without provider handle', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockedPrisma.bunnyUploadInitialization.create.mockImplementation(
      async ({ data }: { data: { payloadFingerprint: string } }) => {
        mockedPrisma.bunnyUploadInitialization.findUnique.mockResolvedValue({
          id: 'existing-initialization-id',
          uploadRequestId: 'upload-request-1',
          payloadFingerprint: data.payloadFingerprint,
          bunnyLibraryId: '123456',
          bunnyVideoId: null,
          localVideoId: null,
          state: 'UNCERTAIN',
        });

        throw Object.assign(new Error('unique constraint'), { code: 'P2002' });
      }
    );

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    await expect(response.json()).resolves.toEqual({
      error:
        'Upload initialization requires manual reconciliation before retry',
    });
    expect(response.status).toBe(409);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
    expect(mockedPrisma.bunnyUploadInitialization.updateMany).not.toHaveBeenCalled();
  });

  test('keeps fingerprint mismatch blocked before UNCERTAIN retry', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockExistingInitialization('UNCERTAIN', {
      payloadFingerprint: 'different-fingerprint',
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

  test('recovers ORPHANED reservation when matching local video exists', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockExistingInitialization('ORPHANED', {
      bunnyVideoId: 'orphaned-bunny-video-guid',
    });
    mockedPrisma.video.findFirst.mockResolvedValue({
      id: 'recovered-local-video-id',
    });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    await expect(response.json()).resolves.toEqual({
      uploadEndpoint: 'https://video.bunnycdn.com/tusupload',
      libraryId: '123456',
      videoId: 'orphaned-bunny-video-guid',
      authorizationExpire: expect.any(Number),
      authorizationSignature: expect.stringMatching(/^[0-9a-f]{64}$/),
      localVideoId: 'recovered-local-video-id',
    });
    expect(response.status).toBe(200);
    expect(mockedPrisma.video.findFirst).toHaveBeenCalledWith({
      where: {
        provider: 'BUNNY_STREAM',
        bunnyLibraryId: '123456',
        bunnyVideoId: 'orphaned-bunny-video-guid',
        isDeleted: false,
      },
      select: { id: true },
    });
    expect(mockedPrisma.bunnyUploadInitialization.update).toHaveBeenCalledWith({
      where: { id: 'existing-initialization-id' },
      data: {
        localVideoId: 'recovered-local-video-id',
        state: 'READY',
        failureMarker: null,
      },
    });
    expect(mockedDeleteBunnyVideo).not.toHaveBeenCalled();
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
  });

  test('deletes ORPHANED provider video when the stored local row is gone before allowing safe same-request-id retry', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockExistingInitialization('ORPHANED', {
      bunnyVideoId: 'orphaned-bunny-video-guid',
      localVideoId: 'stale-local-video-id',
    });
    mockedPrisma.video.findFirst.mockResolvedValue(null);
    mockedDeleteBunnyVideo.mockResolvedValue(undefined);
    mockedCreateBunnyVideo.mockResolvedValue({
      guid: 'retry-bunny-video-guid',
    });
    mockedPrisma.video.create.mockResolvedValue({ id: 'retry-local-video-id' });

    const cleanupResponse = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    await expect(cleanupResponse.json()).resolves.toEqual({
      error:
        'Previous upload initialization was cleaned up; retry upload initialization',
    });
    expect(cleanupResponse.status).toBe(409);
    expect(mockedPrisma.video.findFirst).toHaveBeenCalledWith({
      where: {
        provider: 'BUNNY_STREAM',
        bunnyLibraryId: '123456',
        bunnyVideoId: 'orphaned-bunny-video-guid',
        isDeleted: false,
      },
      select: { id: true },
    });
    expect(mockedDeleteBunnyVideo).toHaveBeenCalledWith({
      libraryId: '123456',
      apiKey: 'api-key',
      videoId: 'orphaned-bunny-video-guid',
      timeoutMs: 2500,
    });
    expect(mockedPrisma.video.delete).not.toHaveBeenCalled();
    expect(mockedPrisma.bunnyUploadInitialization.delete).toHaveBeenCalledWith({
      where: { id: 'existing-initialization-id' },
    });
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();

    const retryResponse = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    expect(retryResponse.status).toBe(200);
    expect(mockedCreateBunnyVideo).toHaveBeenCalledTimes(1);
  });

  test('keeps ORPHANED reservation when provider cleanup fails during retry', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockExistingInitialization('ORPHANED', {
      bunnyVideoId: 'orphaned-bunny-video-guid',
    });
    mockedDeleteBunnyVideo.mockRejectedValue(
      new BunnyStreamApiError('raw orphaned cleanup detail', 503)
    );

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    await expect(response.json()).resolves.toEqual({
      error: 'Upload initialization requires provider cleanup before retry',
    });
    expect(response.status).toBe(502);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
    expect(mockedPrisma.bunnyUploadInitialization.update).toHaveBeenCalledWith({
      where: { id: 'existing-initialization-id' },
      data: {
        state: 'ORPHANED',
        failureMarker: 'PROVIDER_CLEANUP_FAILED',
        bunnyLibraryId: '123456',
        bunnyVideoId: 'orphaned-bunny-video-guid',
      },
    });
    expect(
      mockedPrisma.bunnyUploadInitialization.delete
    ).not.toHaveBeenCalled();
    expect(JSON.stringify(mockedServerLog.warn.mock.calls)).not.toContain(
      'raw orphaned cleanup detail'
    );
  });

  test('returns safe JSON 502 when Bunny Stream omits video GUID', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockedCreateBunnyVideo.mockResolvedValue({});

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', createUploadBody())
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
      jsonRequest('/api/bunny-stream/upload-credentials', createUploadBody())
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
      jsonRequest('/api/bunny-stream/upload-credentials', createUploadBody())
    );

    expect(response.status).toBe(500);
    expect(mockedDeleteBunnyVideo).toHaveBeenCalledWith({
      libraryId: '123456',
      apiKey: 'api-key',
      videoId: 'bunny-video-guid',
      timeoutMs: 2500,
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
      jsonRequest('/api/bunny-stream/upload-credentials', createUploadBody())
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
        bunnyLibraryId: '123456',
        bunnyVideoId: 'bunny-video-guid',
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
      jsonRequest('/api/bunny-stream/upload-credentials', createUploadBody())
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
      jsonRequest('/api/bunny-stream/upload-credentials', createUploadBody())
    );

    expect(response.status).toBe(404);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
  });

  test('returns safe JSON 500 when session lookup fails', async () => {
    mockedSession.mockRejectedValue(new Error('session lookup failed'));

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', createUploadBody())
    );

    await expect(response.json()).resolves.toEqual({
      error: 'Bunny Stream upload failed to initialize',
    });
    expect(response.status).toBe(500);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
  });

  test('best-effort recovers stale reservation when matching local video exists', async () => {
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
    mockedPrisma.video.findFirst.mockResolvedValue({
      id: 'recovered-local-video-id',
    });
    mockedCreateBunnyVideo.mockResolvedValue({
      guid: 'fresh-bunny-video-guid',
    });
    mockedPrisma.video.create.mockResolvedValue({ id: 'fresh-local-video-id' });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    await flushMicrotasks();

    expect(response.status).toBe(200);
    expect(mockedPrisma.video.findFirst).toHaveBeenCalledWith({
      where: {
        provider: 'BUNNY_STREAM',
        bunnyLibraryId: '123456',
        bunnyVideoId: 'stale-bunny-video-guid',
        isDeleted: false,
      },
      select: { id: true },
    });
    expect(mockedPrisma.bunnyUploadInitialization.update).toHaveBeenCalledWith({
      where: { id: 'stale-initialization-id' },
      data: {
        localVideoId: 'recovered-local-video-id',
        state: 'READY',
        failureMarker: null,
      },
    });
    expect(mockedDeleteBunnyVideo).not.toHaveBeenCalled();
    expect(mockedCreateBunnyVideo).toHaveBeenCalledTimes(1);
  });

  test('background cleanup processes at most one stale row with cleanup timeout', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockedPrisma.bunnyUploadInitialization.findMany.mockResolvedValue([
      {
        id: 'first-stale-initialization-id',
        bunnyLibraryId: '123456',
        bunnyVideoId: 'first-stale-bunny-video-guid',
        localVideoId: null,
      },
      {
        id: 'second-stale-initialization-id',
        bunnyLibraryId: '123456',
        bunnyVideoId: 'second-stale-bunny-video-guid',
        localVideoId: null,
      },
    ]);
    mockedDeleteBunnyVideo.mockResolvedValue(undefined);
    mockedCreateBunnyVideo.mockResolvedValue({
      guid: 'fresh-bunny-video-guid',
    });
    mockedPrisma.video.create.mockResolvedValue({ id: 'fresh-local-video-id' });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', validUploadBody)
    );

    await flushMicrotasks();

    expect(response.status).toBe(200);
    expect(
      mockedPrisma.bunnyUploadInitialization.findMany
    ).toHaveBeenCalledWith(expect.objectContaining({ take: 1 }));
    expect(mockedDeleteBunnyVideo).toHaveBeenCalledTimes(1);
    expect(mockedDeleteBunnyVideo).toHaveBeenCalledWith({
      libraryId: '123456',
      apiKey: 'api-key',
      videoId: 'first-stale-bunny-video-guid',
      timeoutMs: 2500,
    });
    expect(mockedPrisma.bunnyUploadInitialization.delete).toHaveBeenCalledWith({
      where: { id: 'first-stale-initialization-id' },
    });
    expect(
      mockedPrisma.bunnyUploadInitialization.delete
    ).not.toHaveBeenCalledWith({
      where: { id: 'second-stale-initialization-id' },
    });
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
    mockedCreateBunnyVideo.mockResolvedValue({
      guid: 'fresh-bunny-video-guid',
    });
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
        timeoutMs: 2500,
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
    mockedCreateBunnyVideo.mockResolvedValue({
      guid: 'fresh-bunny-video-guid',
    });
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
        bunnyLibraryId: '123456',
        bunnyVideoId: 'stale-bunny-video-guid',
      },
    });
    expect(mockedCreateBunnyVideo).toHaveBeenCalledTimes(1);
  });
});

describe('Bunny Stream webhook and manual sync routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BUNNY_STREAM_LIBRARY_ID = '123456';
    process.env.BUNNY_STREAM_API_KEY = 'api-key';
    process.env.BUNNY_STREAM_READ_ONLY_API_KEY = 'read-only';
    process.env.BUNNY_STREAM_TOKEN_SECURITY_KEY = 'token-key';
    process.env.BUNNY_STREAM_TUS_EXPIRE_SECONDS = '86400';
    process.env.BUNNY_STREAM_API_TIMEOUT_MS = '15000';
    mockedPrisma.video.findFirst.mockResolvedValue(null);
    mockedPrisma.video.update.mockResolvedValue({ id: 'video-id' });
    mockedGetBunnyVideo.mockReset();
  });

  test('rejects invalid webhook signature with 401 and no update', async () => {
    mockedPrisma.video.findFirst.mockResolvedValue({
      id: 'video-id',
      bunnyStatus: 'PROCESSING',
    });

    const response = await bunnyWebhookPost(
      signedWebhookRequest(
        {
          VideoLibraryId: 123456,
          VideoGuid: 'bunny-video-guid',
          Status: 3,
        },
        'bad-signature'
      )
    );

    expect(response.status).toBe(401);
    expect(mockedPrisma.video.update).not.toHaveBeenCalled();
    expect(mockedGetBunnyVideo).not.toHaveBeenCalled();
  });

  test('valid signed webhook updates metadata and status', async () => {
    mockedPrisma.video.findFirst.mockResolvedValue({
      id: 'video-id',
      bunnyStatus: 'PROCESSING',
    });
    mockedGetBunnyVideo.mockResolvedValue({
      guid: 'bunny-video-guid',
      status: 3,
      encodeProgress: 99,
      availableResolutions: '1080p,720p',
      thumbnailFileName: 'thumb.jpg',
    });

    const response = await bunnyWebhookPost(
      signedWebhookRequest({
        VideoLibraryId: 123456,
        VideoGuid: 'bunny-video-guid',
        Status: 3,
      })
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      matched: true,
      status: 'READY',
    });
    expect(response.status).toBe(200);
    expect(mockedGetBunnyVideo).toHaveBeenCalledWith({
      libraryId: '123456',
      apiKey: 'api-key',
      videoId: 'bunny-video-guid',
      timeoutMs: 15000,
    });
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'video-id' },
      data: expect.objectContaining({
        bunnyStatus: 'READY',
        bunnyEncodeProgress: 99,
        bunnyAvailableRes: '1080p,720p',
        bunnyThumbnailUrl: 'thumb.jpg',
        bunnyError: null,
        bunnySyncedAt: expect.any(Date),
      }),
    });
  });

  test('malformed webhook payload is rejected safely', async () => {
    const rawBody = '{"VideoLibraryId":123456,"VideoGuid":';
    const signature = crypto
      .createHmac('sha256', process.env.BUNNY_STREAM_READ_ONLY_API_KEY || 'read-only')
      .update(rawBody, 'utf8')
      .digest('hex');

    const response = await bunnyWebhookPost(
      new Request('http://localhost.test/api/webhook/bunny-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BunnyStream-Signature-Version': 'v1',
          'X-BunnyStream-Signature-Algorithm': 'hmac-sha256',
          'X-BunnyStream-Signature': signature,
        },
        body: rawBody,
      })
    );

    await expect(response.json()).resolves.toEqual({ error: 'Invalid payload' });
    expect(response.status).toBe(400);
    expect(mockedPrisma.video.update).not.toHaveBeenCalled();
  });

  test('unmatched webhook returns matched false without updating', async () => {
    const response = await bunnyWebhookPost(
      signedWebhookRequest({
        VideoLibraryId: 123456,
        VideoGuid: 'missing-video-guid',
        Status: 3,
      })
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      matched: false,
    });
    expect(response.status).toBe(200);
    expect(mockedPrisma.video.update).not.toHaveBeenCalled();
    expect(mockedGetBunnyVideo).not.toHaveBeenCalled();
  });

  test('manual sync requires session and admin role', async () => {
    mockedSession.mockResolvedValue(null);

    const unauthenticated = await bunnyManualSyncPost(
      jsonRequest('/api/video/bunny-stream/sync', { videoId: '507f1f77bcf86cd799439011' })
    );

    mockedSession.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } });

    const forbidden = await bunnyManualSyncPost(
      jsonRequest('/api/video/bunny-stream/sync', { videoId: '507f1f77bcf86cd799439011' })
    );

    expect(unauthenticated.status).toBe(401);
    expect(forbidden.status).toBe(403);
    expect(mockedGetBunnyVideo).not.toHaveBeenCalled();
  });

  test('manual sync rejects malformed body with 400', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });

    const response = await bunnyManualSyncPost(
      jsonRequest('/api/video/bunny-stream/sync', { videoId: 'not-an-object-id' })
    );

    await expect(response.json()).resolves.toEqual({ error: 'Invalid payload' });
    expect(response.status).toBe(400);
    expect(mockedGetBunnyVideo).not.toHaveBeenCalled();
  });

  test('manual sync updates stored Bunny metadata', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.video.findFirst.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      provider: 'BUNNY_STREAM',
      bunnyLibraryId: '123456',
      bunnyVideoId: 'bunny-video-guid',
      bunnyStatus: 'PROCESSING',
    });
    mockedGetBunnyVideo.mockResolvedValue({
      guid: 'bunny-video-guid',
      status: 3,
      encodeProgress: 87,
      availableResolutions: '1080p',
      thumbnailFileName: 'thumb.jpg',
    });

    const response = await bunnyManualSyncPost(
      jsonRequest('/api/video/bunny-stream/sync', { videoId: '507f1f77bcf86cd799439011' })
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      status: 'READY',
    });
    expect(response.status).toBe(200);
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: '507f1f77bcf86cd799439011' },
      data: expect.objectContaining({
        bunnyStatus: 'READY',
        bunnyEncodeProgress: 87,
        bunnyAvailableRes: '1080p',
        bunnyThumbnailUrl: 'thumb.jpg',
        bunnyError: null,
        bunnySyncedAt: expect.any(Date),
      }),
    });
  });

  test('manual sync returns safe 404 when lookup misses the video row', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.video.findFirst.mockResolvedValue(null);

    const response = await bunnyManualSyncPost(
      jsonRequest('/api/video/bunny-stream/sync', { videoId: '507f1f77bcf86cd799439011' })
    );

    await expect(response.json()).resolves.toEqual({
      error: 'Bunny Stream video not found',
    });
    expect(response.status).toBe(404);
    expect(mockedGetBunnyVideo).not.toHaveBeenCalled();
    expect(mockedPrisma.video.update).not.toHaveBeenCalled();
  });

  test.each([
    {
      title: 'manual sync returns safe 404 when lookup row has non-Bunny provider',
      row: {
        id: '507f1f77bcf86cd799439011',
        provider: 'AXINOM',
        bunnyLibraryId: '123456',
        bunnyVideoId: 'bunny-video-guid',
        bunnyStatus: 'PROCESSING',
      },
    },
    {
      title: 'manual sync returns safe 404 when lookup row is missing Bunny IDs',
      row: {
        id: '507f1f77bcf86cd799439011',
        provider: 'BUNNY_STREAM',
        bunnyLibraryId: null,
        bunnyVideoId: null,
        bunnyStatus: 'PROCESSING',
      },
    },
  ])('$title', async ({ row }) => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.video.findFirst.mockResolvedValue(row as never);

    const response = await bunnyManualSyncPost(
      jsonRequest('/api/video/bunny-stream/sync', { videoId: '507f1f77bcf86cd799439011' })
    );

    await expect(response.json()).resolves.toEqual({
      error: 'Bunny Stream video not found',
    });
    expect(response.status).toBe(404);
    expect(mockedGetBunnyVideo).not.toHaveBeenCalled();
    expect(mockedPrisma.video.update).not.toHaveBeenCalled();
  });

  test('provider failure returns safe 502 without logging raw error text', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.video.findFirst.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      provider: 'BUNNY_STREAM',
      bunnyLibraryId: '123456',
      bunnyVideoId: 'bunny-video-guid',
      bunnyStatus: 'PROCESSING',
    });
    mockedGetBunnyVideo.mockRejectedValue(
      new BunnyStreamApiError('raw provider secret: token', 503)
    );

    const response = await bunnyManualSyncPost(
      jsonRequest('/api/video/bunny-stream/sync', { videoId: '507f1f77bcf86cd799439011' })
    );

    await expect(response.json()).resolves.toEqual({
      error: 'Failed to sync Bunny Stream video',
    });
    expect(response.status).toBe(502);
    expect(mockedPrisma.video.update).not.toHaveBeenCalled();
    expect(JSON.stringify(mockedServerLog.error.mock.calls.at(0)?.[1] ?? {})).not.toContain(
      'raw provider secret: token'
    );
  });
});
