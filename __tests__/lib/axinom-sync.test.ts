import { syncVideoWithAxinom } from '@/lib/axinom-sync';
import { prisma } from '@/lib/prisma';
import { getAuthToken } from '@/lib/axinom-video-service';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    video: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/axinom-video-service', () => ({
  getAuthToken: jest.fn(),
}));

const mockedPrisma = prisma as unknown as {
  video: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const mockedGetAuthToken = getAuthToken as jest.Mock;

describe('syncVideoWithAxinom', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuthToken.mockResolvedValue('token');
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        data: {
          video: {
            encodingState: 'READY',
            dashManifestPath: 'https://cdn.example/dash.mpd',
            hlsManifestPath: 'https://cdn.example/hls.m3u8',
            outputLocation: 'https://cdn.example/output',
            videoStreams: {
              nodes: [{ keyId: 'kid-1' }, { keyId: 'kid-1' }, { keyId: 'kid-2' }],
            },
          },
        },
      }),
    }) as jest.Mock;
  });

  test('prefers explicit Axinom video ID over legacy description parsing', async () => {
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: 'video-1',
      axinomVideoId: 'explicit-axinom-id',
      description: 'axinom-id:legacy-id',
      axinomIdClear: null,
    });

    const result = await syncVideoWithAxinom('video-1');

    expect(result).toEqual({ success: true, status: 'READY', updated: true });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://video.service.eu.axinom.net/graphql',
      expect.objectContaining({
        body: expect.stringContaining('explicit-axinom-id'),
      })
    );
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'video-1' },
      data: expect.objectContaining({
        axinomVideoId: 'explicit-axinom-id',
        axinomEncodingStatus: 'READY',
        axinomOutputLocation: 'https://cdn.example/output',
        drmKeyId: 'kid-1,kid-2',
        published: true,
      }),
    });
  });

  test('falls back to legacy description Axinom ID for inherited records', async () => {
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: 'video-1',
      axinomVideoId: null,
      description: 'legacy axinom-id:a1b2c3',
      axinomIdClear: null,
    });

    await syncVideoWithAxinom('video-1');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://video.service.eu.axinom.net/graphql',
      expect.objectContaining({
        body: expect.stringContaining('a1b2c3'),
      })
    );
  });

  test('persists Axinom status even when video is not ready yet', async () => {
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: 'video-1',
      axinomVideoId: 'explicit-axinom-id',
      description: null,
      axinomIdClear: null,
    });
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        data: {
          video: {
            encodingState: 'PROCESSING',
            dashManifestPath: null,
            hlsManifestPath: null,
            outputLocation: 'https://cdn.example/output',
            videoStreams: {
              nodes: [],
            },
          },
        },
      }),
    }) as jest.Mock;

    const result = await syncVideoWithAxinom('video-1');

    expect(result).toEqual({ success: true, status: 'PROCESSING', updated: false });
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'video-1' },
      data: expect.objectContaining({
        axinomVideoId: 'explicit-axinom-id',
        axinomEncodingStatus: 'PROCESSING',
        axinomOutputLocation: 'https://cdn.example/output',
        axinomSyncedAt: expect.any(Date),
      }),
    });
  });
});
