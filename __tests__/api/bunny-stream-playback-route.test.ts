function jsonRequest(body: unknown) {
  return new Request('http://localhost.test/api/video/bunny-stream/playback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

class TestRequest {
  readonly url: string;
  readonly method: string;
  readonly headers: Headers;
  private readonly rawBody: string;

  constructor(url: string, init?: RequestInit) {
    this.url = url;
    this.method = init?.method ?? 'GET';
    this.headers = new Headers(init?.headers ?? {});
    this.rawBody = typeof init?.body === 'string' ? init.body : '';
  }

  async json() {
    return JSON.parse(this.rawBody || 'null');
  }
}

class TestResponse {
  readonly status: number;
  readonly headers: Headers;
  private readonly rawBody: string;

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    this.status = init?.status ?? 200;
    this.headers = new Headers(init?.headers ?? {});
    this.rawBody = typeof body === 'string' ? body : body ? String(body) : '';
  }

  get ok() {
    return this.status >= 200 && this.status < 300;
  }

  async json() {
    return JSON.parse(this.rawBody || 'null');
  }

  async text() {
    return this.rawBody;
  }

  static json(data: unknown, init?: ResponseInit) {
    return new TestResponse(JSON.stringify(data), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  }
}

// @ts-expect-error - test env lacks fetch globals; route only needs json() and status.
globalThis.Request = TestRequest;
// @ts-expect-error - test env lacks Response; route only needs status/json/text.
globalThis.Response = TestResponse;

describe('Bunny Stream playback route', () => {
  const mockedGetServerSession = jest.fn();
  const mockedEvaluateMediaEntitlement = jest.fn();
  const mockedServerLog = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.BUNNY_STREAM_LIBRARY_ID = '123456';
    process.env.BUNNY_STREAM_API_KEY = 'api-key';
    process.env.BUNNY_STREAM_READ_ONLY_API_KEY = 'read-only';
    process.env.BUNNY_STREAM_TOKEN_SECURITY_KEY = 'token-key';
    process.env.BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS = '300';

    jest.doMock('next-auth', () => ({
      getServerSession: mockedGetServerSession,
    }));
    jest.doMock('next/server', () => ({
      NextResponse: class MockNextResponse extends TestResponse {},
    }));
    jest.doMock('@/lib/auth', () => ({
      authOptions: {},
    }));
    jest.doMock('@/lib/media-entitlement', () => ({
      evaluateMediaEntitlement: mockedEvaluateMediaEntitlement,
      mapMediaEntitlementToHttp: jest.fn((result) => {
        if (result.allowed) return { status: 200, body: 'OK' };
        return {
          status: result.code === 'UNAUTHENTICATED' ? 401 : 403,
          body: result.code === 'UNAUTHENTICATED' ? 'Unauthorized' : 'Access denied',
        };
      }),
    }));
    jest.doMock('@/lib/server-log', () => ({
      serverLog: mockedServerLog,
    }));
  });

  afterEach(() => {
    jest.dontMock('next-auth');
    jest.dontMock('@/lib/auth');
    jest.dontMock('@/lib/media-entitlement');
    jest.dontMock('@/lib/server-log');
  });

  function loadRoute() {
    let POST: (request: Request) => Promise<Response>;

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      POST = require('@/app/api/video/bunny-stream/playback/route').POST;
    });

    return POST!;
  }

  test('requires an authenticated session', async () => {
    mockedGetServerSession.mockResolvedValue(null);

    const response = await loadRoute()(jsonRequest({ videoId: 'video-1' }));

    expect(response.status).toBe(401);
    expect(mockedEvaluateMediaEntitlement).not.toHaveBeenCalled();
  });

  test('denies access before Bunny signing when entitlement fails', async () => {
    mockedGetServerSession.mockResolvedValue({ user: { id: 'user-1', email: 'learner@example.test' } });
    mockedEvaluateMediaEntitlement.mockResolvedValue({
      allowed: false,
      code: 'NO_VIDEO_ACCESS',
    });

    const response = await loadRoute()(jsonRequest({ videoId: 'video-1' }));

    expect(response.status).toBe(403);
    expect(mockedEvaluateMediaEntitlement).toHaveBeenCalledWith(
      expect.objectContaining({
        videoId: 'video-1',
        checkViewLimit: true,
      })
    );
  });

  test.each([
    {
      name: 'missing Bunny fields',
      video: {
        id: 'video-1',
        provider: 'BUNNY_STREAM',
        bunnyLibraryId: null,
        bunnyVideoId: 'bunny-video-1',
        bunnyStatus: 'READY',
      },
    },
    {
      name: 'non-ready Bunny status',
      video: {
        id: 'video-1',
        provider: 'BUNNY_STREAM',
        bunnyLibraryId: '123456',
        bunnyVideoId: 'bunny-video-1',
        bunnyStatus: 'ENCODING',
      },
    },
  ])('returns 404 for $name', async ({ video }) => {
    mockedGetServerSession.mockResolvedValue({ user: { id: 'user-1', email: 'learner@example.test' } });
    mockedEvaluateMediaEntitlement.mockResolvedValue({
      allowed: true,
      user: { id: 'user-1', email: 'learner@example.test' },
      video,
      watchRecord: { viewCount: 1, viewLimit: 5, lastPosition: 0 },
      effectiveViewLimit: 5,
    });

    const response = await loadRoute()(jsonRequest({ videoId: 'video-1' }));

    expect(response.status).toBe(404);
  });

  test('returns signed url payload without token fields', async () => {
    mockedGetServerSession.mockResolvedValue({ user: { id: 'user-1', email: 'learner@example.test' } });
    mockedEvaluateMediaEntitlement.mockResolvedValue({
      allowed: true,
      user: { id: 'user-1', email: 'learner@example.test' },
      video: {
        id: 'video-1',
        provider: 'BUNNY_STREAM',
        bunnyLibraryId: '123456',
        bunnyVideoId: 'bunny-video-1',
        bunnyStatus: 'READY',
      },
      watchRecord: { viewCount: 1, viewLimit: 5, lastPosition: 0 },
      effectiveViewLimit: 5,
    });

    const response = await loadRoute()(jsonRequest({ videoId: 'video-1' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      libraryId: '123456',
      bunnyVideoId: 'bunny-video-1',
      expires: expect.any(Number),
      signedEmbedUrl: expect.stringContaining('https://player.mediadelivery.net/embed/123456/bunny-video-1?token='),
    });
    expect(body).not.toHaveProperty('token');
  });
});
