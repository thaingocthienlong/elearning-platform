/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { encodeVideoViaService } from '@/lib/axinom-video-service';
import { POST as processVideoPost } from '@/app/api/video/process/route';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    video: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/axinom-video-service', () => ({
  encodeVideoViaService: jest.fn(),
}));

jest.mock('@/lib/media-provider', () => ({
  activeMediaProvider: {
    name: 'doverunner',
    submitProcessing: jest.fn(),
  },
}));

jest.mock('@/lib/media-provider/doverunner', () => ({
  isDoveRunnerTnpError: jest.fn(() => false),
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedEncodeVideoViaService = encodeVideoViaService as jest.Mock;
const mockedPrisma = prisma as unknown as {
  video: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

let consoleErrorSpy: jest.SpyInstance;

function processRequest(body: unknown) {
  return new Request('http://localhost.test/api/video/process', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('video processing clear encode requirements', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env = { ...originalEnv };
    process.env.AXINOM_ENCODING_PROFILE_DRM = 'drm-profile';
    delete process.env.AXINOM_ENCODING_PROFILE_CLEAR;
    mockedGetServerSession.mockResolvedValue({
      user: {
        id: 'admin-1',
        role: 'ADMIN',
      },
    });
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: 'video-1',
      title: 'Safari clear test',
      r2Key: 'uploads/video-1/source.mp4',
      sourceStorageKey: null,
    });
    mockedEncodeVideoViaService.mockResolvedValue({
      axinomVideoId: 'drm-axinom-id',
      videoId: 'drm-axinom-id',
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    process.env = originalEnv;
  });

  test('fails before submitting encodes when the clear profile is missing', async () => {
    const response = await processVideoPost(processRequest({ videoId: 'video-1' }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Video processing submission failed');
    expect(mockedEncodeVideoViaService).not.toHaveBeenCalled();
    expect(mockedPrisma.video.update).not.toHaveBeenCalled();
  });

  test('submits DRM and clear encodes and stores both Axinom IDs for legacy rows', async () => {
    process.env.AXINOM_ENCODING_PROFILE_CLEAR = 'clear-profile';
    mockedEncodeVideoViaService
      .mockResolvedValueOnce({
        axinomVideoId: 'drm-axinom-id',
        videoId: 'drm-axinom-id',
      })
      .mockResolvedValueOnce({
        axinomVideoId: 'clear-axinom-id',
        videoId: 'clear-axinom-id',
      });

    const response = await processVideoPost(processRequest({ videoId: 'video-1' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedEncodeVideoViaService).toHaveBeenNthCalledWith(1, {
      videoTitle: 'Safari clear test',
      sourceLocation: 'uploads/video-1/source.mp4',
      profileId: 'drm-profile',
    });
    expect(mockedEncodeVideoViaService).toHaveBeenNthCalledWith(2, {
      videoTitle: 'Safari clear test',
      sourceLocation: 'uploads/video-1/source.mp4',
      profileId: 'clear-profile',
    });
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'video-1' },
      data: {
        axinomVideoId: 'drm-axinom-id',
        axinomIdClear: 'clear-axinom-id',
        axinomEncodingStatus: 'SUBMITTED',
      },
    });
    expect(body).toMatchObject({
      success: true,
      axinomVideoId: 'drm-axinom-id',
      axinomIdClear: 'clear-axinom-id',
    });
  });
});
