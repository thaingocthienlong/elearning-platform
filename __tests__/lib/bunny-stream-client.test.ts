import {
  BunnyStreamApiError,
  createBunnyStreamVideo,
  getBunnyStreamVideo,
} from '@/lib/bunny-stream/client';

describe('Bunny Stream API client', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('creates a Bunny video with library AccessKey', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ guid: 'video-guid', title: 'Lesson 01' }),
    }) as jest.Mock;

    const result = await createBunnyStreamVideo({
      libraryId: '123',
      apiKey: 'api-key',
      title: 'Lesson 01',
      collectionId: 'collection-guid',
    });

    expect(result.guid).toBe('video-guid');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://video.bunnycdn.com/library/123/videos',
      {
        method: 'POST',
        headers: {
          AccessKey: 'api-key',
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Lesson 01',
          collectionId: 'collection-guid',
        }),
      }
    );
  });

  test('omits empty collection ID when creating a video', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ guid: 'video-guid' }),
    }) as jest.Mock;

    await createBunnyStreamVideo({
      libraryId: '123',
      apiKey: 'api-key',
      title: 'Lesson 01',
    });

    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toEqual(
      {
        title: 'Lesson 01',
      }
    );
  });

  test('loads video metadata', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        guid: 'video-guid',
        status: 3,
        encodeProgress: 100,
        availableResolutions: '360p,720p',
        thumbnailFileName: 'thumb.jpg',
      }),
    }) as jest.Mock;

    const result = await getBunnyStreamVideo({
      libraryId: '123',
      apiKey: 'api-key',
      videoId: 'video-guid',
    });

    expect(result.status).toBe(3);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://video.bunnycdn.com/library/123/videos/video-guid',
      {
        method: 'GET',
        headers: {
          AccessKey: 'api-key',
          Accept: 'application/json',
        },
      }
    );
  });

  test('throws sanitized API error on non-OK response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'bad key value should not leak',
    }) as jest.Mock;

    await expect(
      getBunnyStreamVideo({
        libraryId: '123',
        apiKey: 'api-key',
        videoId: 'video-guid',
      })
    ).rejects.toEqual(
      new BunnyStreamApiError('Bunny Stream API failed with HTTP 401', 401)
    );
  });
});
