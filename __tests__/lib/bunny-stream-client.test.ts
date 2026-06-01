import {
  BunnyStreamApiError,
  createBunnyStreamVideo,
  deleteBunnyStreamVideo,
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
        signal: expect.any(AbortSignal),
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
        signal: expect.any(AbortSignal),
      }
    );
  });

  test('deletes a Bunny video with library AccessKey', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as jest.Mock;

    await deleteBunnyStreamVideo({
      libraryId: '123',
      apiKey: 'api-key',
      videoId: 'video-guid',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://video.bunnycdn.com/library/123/videos/video-guid',
      {
        method: 'DELETE',
        headers: {
          AccessKey: 'api-key',
          Accept: 'application/json',
        },
        signal: expect.any(AbortSignal),
      }
    );
  });

  test('passes caller timeout to Bunny Stream API fetch', async () => {
    const timeoutSpy = jest.spyOn(AbortSignal, 'timeout');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ guid: 'video-guid' }),
    }) as jest.Mock;

    await getBunnyStreamVideo({
      libraryId: '123',
      apiKey: 'api-key',
      videoId: 'video-guid',
      timeoutMs: 2500,
    });

    expect(timeoutSpy).toHaveBeenCalledWith(2500);
  });

  test.each([null, {}, { success: false }])(
    'throws sanitized API error when Bunny Stream returns invalid delete response: %p',
    async (providerBody) => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => providerBody,
      }) as jest.Mock;

      await expect(
        deleteBunnyStreamVideo({
          libraryId: '123',
          apiKey: 'api-key',
          videoId: 'video-guid',
        })
      ).rejects.toEqual(
        new BunnyStreamApiError(
          'Bunny Stream API returned invalid delete response',
          502
        )
      );
    }
  );

  test('throws sanitized API error when Bunny Stream returns malformed delete JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('raw sentinel delete response');
      },
    }) as jest.Mock;

    await expect(
      deleteBunnyStreamVideo({
        libraryId: '123',
        apiKey: 'api-key',
        videoId: 'video-guid',
      })
    ).rejects.toEqual(
      new BunnyStreamApiError('Bunny Stream API returned invalid JSON', 502)
    );
  });

  test('throws sanitized API error when deleting a Bunny video fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'bad key value should not leak',
    }) as jest.Mock;

    await expect(
      deleteBunnyStreamVideo({
        libraryId: '123',
        apiKey: 'api-key',
        videoId: 'video-guid',
      })
    ).rejects.toEqual(
      new BunnyStreamApiError('Bunny Stream API failed with HTTP 401', 401)
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

  test('throws sanitized API error when Bunny Stream transport fails', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('raw sentinel transport detail')) as jest.Mock;

    await expect(
      createBunnyStreamVideo({
        libraryId: '123',
        apiKey: 'api-key',
        title: 'Lesson 01',
      })
    ).rejects.toEqual(
      new BunnyStreamApiError('Bunny Stream API transport failed', 502)
    );
  });

  test('throws sanitized API error when Bunny Stream returns malformed JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('raw sentinel provider body');
      },
    }) as jest.Mock;

    await expect(
      createBunnyStreamVideo({
        libraryId: '123',
        apiKey: 'api-key',
        title: 'Lesson 01',
      })
    ).rejects.toEqual(
      new BunnyStreamApiError('Bunny Stream API returned invalid JSON', 502)
    );
  });

  test('throws sanitized API error when Bunny Stream returns null video data', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => null,
    }) as jest.Mock;

    await expect(
      createBunnyStreamVideo({
        libraryId: '123',
        apiKey: 'api-key',
        title: 'Lesson 01',
      })
    ).rejects.toEqual(
      new BunnyStreamApiError(
        'Bunny Stream API returned invalid video data',
        502
      )
    );
  });

  test.each([
    ['missing', {}],
    ['blank', { guid: '   ' }],
    ['non-string', { guid: 123 }],
  ])(
    'throws sanitized API error when Bunny Stream returns %s video GUID',
    async (_case, providerBody) => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => providerBody,
      }) as jest.Mock;

      await expect(
        createBunnyStreamVideo({
          libraryId: '123',
          apiKey: 'api-key',
          title: 'Lesson 01',
        })
      ).rejects.toEqual(
        new BunnyStreamApiError(
          'Bunny Stream API returned invalid video data',
          502
        )
      );
    }
  );
});
