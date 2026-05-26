import { doverunnerProvider } from '@/lib/media-provider/doverunner';

const originalEnv = process.env;

describe('DoveRunner media provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      DOVERUNNER_SITE_ID: 'DEMO',
      DOVERUNNER_ACCESS_KEY: '12345678901234567890123456789012',
      DOVERUNNER_TNP_ACCOUNT_ID: 'account@example.test',
      DOVERUNNER_TNP_ACCESS_KEY: 'tnp-access-key',
      DOVERUNNER_TNP_INPUT_STORAGE_ID: 'input-storage',
      DOVERUNNER_TNP_OUTPUT_STORAGE_ID: 'output-storage',
      DOVERUNNER_OUTPUT_BASE_URL: 'https://cdn.example.test/output',
      AWS_REGION: 'ap-southeast-1',
      AWS_S3_INPUT_BUCKET: 'input-bucket',
      AWS_S3_OUTPUT_BUCKET: 'output-bucket',
      AWS_ACCESS_KEY_ID: 'aws-access-key',
      AWS_SECRET_ACCESS_KEY: 'aws-secret-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('submits T&P DRM job with storage IDs and content ID', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error_code: '0000', data: { token: 'Bearer tnp-token' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error_code: '0000', data: { job_id: 26197, status: 'queued' } }),
      }) as jest.Mock;

    const result = await doverunnerProvider.submitProcessing({
      videoId: 'video-1',
      title: 'Lecture 1',
      sourceKey: 'videos/video-1/source.mp4',
    });

    expect(result).toEqual({
      providerJobId: '26197',
      providerContentId: 'video-1',
      outputPath: 'videos/video-1/',
      status: 'QUEUED',
    });
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://tnp.doverunner.com/api/job/DEMO',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer tnp-token' }),
      })
    );
    const [, requestInit] = (global.fetch as jest.Mock).mock.calls[1];
    const payload = JSON.parse(requestInit.body);

    expect(payload.output.packaging).toEqual(expect.objectContaining({
      dash: true,
      hls: false,
      cmaf: false,
    }));
    expect(payload.output.drm.option).toEqual({
      multi_key: false,
      max_sd_height: 480,
      max_hd_height: 1080,
      max_uhd1_height: 2160,
      skip_audio_encryption: false,
      clear_lead: 0,
      generate_tracktype_manifests: false,
    });
  });

  test('can submit a clear packaging job for provider isolation', async () => {
    process.env.DOVERUNNER_TNP_DRM_ENABLED = 'false';
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error_code: '0000', data: { token: 'Bearer tnp-token' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error_code: '0000', data: { job_id: 26198, status: 'queued' } }),
      }) as jest.Mock;

    await doverunnerProvider.submitProcessing({
      videoId: 'video-1',
      title: 'Lecture 1',
      sourceKey: 'videos/video-1/source.mp4',
    });

    const [, requestInit] = (global.fetch as jest.Mock).mock.calls[1];
    const payload = JSON.parse(requestInit.body);

    expect(payload.output.drm.enabled).toBe(false);
  });

  test('syncs complete job to DASH and HLS URLs', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error_code: '0000', data: { token: 'Bearer tnp-token' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error_code: '0000', data: { job_id: 'job-1', status: 'success' } }),
      }) as jest.Mock;

    const result = await doverunnerProvider.syncProcessing({
      providerJobId: 'job-1',
      providerContentId: 'video-1',
      videoId: 'video-1',
    });

    expect(result).toEqual({
      status: 'READY',
      dashUrl: 'https://cdn.example.test/output/videos/video-1/manifest.mpd',
      hlsUrl: 'https://cdn.example.test/output/videos/video-1/master.m3u8',
      ready: true,
    });
  });

  test('returns configured license URL', () => {
    expect(doverunnerProvider.getLicenseServerUrl('widevine'))
      .toBe('https://drm-license.doverunner.com/ri/licenseManager.do');
  });
});
