jest.mock('next/server', () => ({
  NextResponse: class MockNextResponse {
    private readonly body: unknown;
    readonly status: number;
    readonly headers: { get: (key: string) => string | null };

    constructor(body?: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.headers = {
        get: (key: string) => init?.headers?.[key] ?? null,
      };
    }

    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init);
    }

    async json() {
      return this.body;
    }

    async arrayBuffer() {
      if (this.body instanceof ArrayBuffer) {
        return this.body;
      }

      return new TextEncoder().encode(JSON.stringify(this.body)).buffer;
    }
  },
}));

describe('/api/drm/fairplay-cert', () => {
  const originalCertUrl = process.env.DOVERUNNER_FAIRPLAY_CERT_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    process.env.DOVERUNNER_FAIRPLAY_CERT_URL =
      'https://tenant.example/private-fairplay.cer';
  });

  afterEach(() => {
    if (originalCertUrl === undefined) {
      delete process.env.DOVERUNNER_FAIRPLAY_CERT_URL;
    } else {
      process.env.DOVERUNNER_FAIRPLAY_CERT_URL = originalCertUrl;
    }
    global.fetch = originalFetch;
  });

  test('returns 500 when FairPlay certificate URL is not configured', async () => {
    delete process.env.DOVERUNNER_FAIRPLAY_CERT_URL;
    const { GET } = await import('@/app/api/drm/fairplay-cert/route');

    const response = await (GET as () => Promise<Response>)();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'FairPlay certificate not configured' });
  });

  test('does not log certificate URL when upstream fetch fails', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const consoleLog = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
    }) as jest.Mock;

    const { GET } = await import('@/app/api/drm/fairplay-cert/route');

    const response = await (GET as () => Promise<Response>)();

    expect(response.status).toBe(502);
    expect(consoleLog).not.toHaveBeenCalledWith(
      expect.stringContaining('tenant.example')
    );
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('tenant.example')
    );
  });

  test('returns the certificate bytes with cache headers', async () => {
    const certificate = new Uint8Array([1, 2, 3]).buffer;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(certificate),
    }) as jest.Mock;

    const { GET } = await import('@/app/api/drm/fairplay-cert/route');

    const response = await (GET as () => Promise<Response>)();
    const body = await response.arrayBuffer();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'application/octet-stream'
    );
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400');
    expect(Array.from(new Uint8Array(body))).toEqual([1, 2, 3]);
  });
});
