import fs from 'fs';
import path from 'path';

import {
  createVdoCipherUpload,
  getVdoCipherOtp,
  getVdoCipherVideoStatus,
  VdoCipherApiError,
} from '@/lib/vdocipher';

describe('vdocipher api client', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("starts with server-only import", () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/vdocipher.ts'), 'utf8');

    expect(source.startsWith("import 'server-only';")).toBe(true);
  });

  it('requests upload credentials with Apisecret auth', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        videoId: 'vdo-1',
        clientPayload: { uploadLink: 'https://upload.example.test' },
      }),
    });

    const result = await createVdoCipherUpload({
      apiSecret: 'secret-a',
      title: 'Lesson 01',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://dev.vdocipher.com/api/videos?title=Lesson+01',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: 'Apisecret secret-a',
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(result).toEqual({
      videoId: 'vdo-1',
      clientPayload: { uploadLink: 'https://upload.example.test' },
    });
  });

  it('gets video status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'vdo-1',
        status: 'ready',
        poster: 'https://poster.example.test/image.jpg',
        title: 'Lesson 01',
      }),
    });

    const result = await getVdoCipherVideoStatus({
      apiSecret: 'secret-a',
      vdoCipherVideoId: 'vdo-1',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://dev.vdocipher.com/api/videos/vdo-1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Apisecret secret-a',
        }),
      })
    );
    expect(result).toEqual({
      id: 'vdo-1',
      status: 'ready',
      poster: 'https://poster.example.test/image.jpg',
      title: 'Lesson 01',
    });
  });

  it('gets OTP with ttl and annotation', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ otp: 'otp-value', playbackInfo: 'playback-info' }),
    });

    const result = await getVdoCipherOtp({
      apiSecret: 'secret-a',
      vdoCipherVideoId: 'vdo-1',
      ttl: 300,
      annotate: '[{"type":"rtext","text":"User"}]',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://dev.vdocipher.com/api/videos/vdo-1/otp',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Apisecret secret-a',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          ttl: 300,
          annotate: '[{"type":"rtext","text":"User"}]',
        }),
      })
    );
    expect(result).toEqual({ otp: 'otp-value', playbackInfo: 'playback-info' });
  });

  it('gets OTP without annotation when app overlay watermark is used', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ otp: 'otp-value', playbackInfo: 'playback-info' }),
    });

    const result = await getVdoCipherOtp({
      apiSecret: 'secret-a',
      vdoCipherVideoId: 'vdo-1',
      ttl: 300,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://dev.vdocipher.com/api/videos/vdo-1/otp',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          ttl: 300,
        }),
      })
    );
    expect(result).toEqual({ otp: 'otp-value', playbackInfo: 'playback-info' });
  });

  it('throws typed VdoCipher error from non-OK JSON response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid API secret' }),
    });

    const promise = getVdoCipherVideoStatus({
      apiSecret: 'bad-secret',
      vdoCipherVideoId: 'vdo-1',
    });

    await expect(promise).rejects.toThrow('Invalid API secret');
    await expect(promise).rejects.toMatchObject({
      name: 'VdoCipherApiError',
      status: 401,
    });
    await expect(promise).rejects.toBeInstanceOf(VdoCipherApiError);
  });

  it('includes provider status when OTP video is missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'video not found' }),
    });

    await expect(
      getVdoCipherOtp({
        apiSecret: 'secret-a',
        vdoCipherVideoId: 'missing-vdo-id',
        ttl: 300,
      })
    ).rejects.toMatchObject({
      message: 'video not found',
      status: 404,
    });
  });

  it('throws fallback message when non-OK response has no string message', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(
      getVdoCipherVideoStatus({
        apiSecret: 'secret-a',
        vdoCipherVideoId: 'vdo-1',
      })
    ).rejects.toMatchObject({
      message: 'VdoCipher API failed with 500',
      status: 500,
    });
  });
});
