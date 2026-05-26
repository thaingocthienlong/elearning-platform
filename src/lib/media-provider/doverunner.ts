import { createS3UploadUrl } from './aws-s3';
import { readDoveRunnerConfig } from './doverunner-env';
import { generateDoveRunnerLicenseToken } from './doverunner-token';
import {
  normalizeProviderStatus,
  type CreateLicenseTokenInput,
  type CreateUploadUrlInput,
  type MediaProvider,
  type SyncProcessingInput,
  type SubmitProcessingInput,
} from './types';

type DoveRunnerApiResponse<T> = {
  error_code: string;
  error_message?: string;
  data: T;
};

async function getTnpAuthToken() {
  const config = readDoveRunnerConfig();
  const basic = Buffer.from(`${config.tnpAccountId}:${config.tnpAccessKey}`, 'utf8').toString('base64');
  const response = await fetch(`${config.tnpApiBaseUrl}/api/token/${config.siteId}`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${basic}`,
    },
  });

  const body = await response.json() as DoveRunnerApiResponse<{ token: string }>;

  if (!response.ok || body.error_code !== '0000') {
    throw new Error(`DoveRunner T&P authentication failed: ${body.error_code || response.status}`);
  }

  return body.data.token;
}

async function requestTnp<T>(path: string, init: RequestInit = {}) {
  const config = readDoveRunnerConfig();
  const token = await getTnpAuthToken();
  const response = await fetch(`${config.tnpApiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: token,
      'Content-Type': 'application/json;charset=UTF-8',
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json() as DoveRunnerApiResponse<T>;

  if (!response.ok || body.error_code !== '0000') {
    throw new Error(`DoveRunner T&P request failed: ${body.error_code || response.status}`);
  }

  return body.data;
}

function outputPathForVideo(videoId: string) {
  return `videos/${videoId}/`;
}

function manifestUrl(outputBaseUrl: string, outputPath: string, manifestName: string) {
  return `${outputBaseUrl}/${outputPath}${manifestName}`;
}

export const doverunnerProvider: MediaProvider = {
  name: 'doverunner',

  createUploadUrl(input: CreateUploadUrlInput) {
    return createS3UploadUrl(input);
  },

  async submitProcessing(input: SubmitProcessingInput) {
    const config = readDoveRunnerConfig();
    const outputPath = outputPathForVideo(input.videoId);
    const data = await requestTnp<{ job_id: number | string; status?: string }>(
      `/api/job/${config.siteId}`,
      {
        method: 'POST',
        body: JSON.stringify({
          job_name: input.title,
          content_id: input.videoId,
          input: {
            storage_id: config.tnpInputStorageId,
            files: [
              {
                file_type: 'multi',
                file_path: input.sourceKey,
                audios: [
                  {
                    in: { track: 0 },
                    remap: { track: 0 },
                  },
                ],
              },
            ],
          },
          output: {
            storage_id: config.tnpOutputStorageId,
            path: outputPath,
            default_language: 'en',
            transcodings: [
              {
                track_id: 'video_hd',
                track_type: 'video',
                codec: 'h264',
                height: 720,
                width: 1280,
                bitrate_mode: 'cbr',
                bitrate: 2500000,
                bandwidth: 2500000,
              },
              {
                track_id: 'audio_main',
                track_type: 'audio',
                track_name: 'audio',
                codec: 'aac',
                bitrate_mode: 'cbr',
                bitrate: 128000,
                sample_rate: 48000,
                language: 'en',
                sources: [{ track: 0 }],
              },
            ],
            packaging: {
              dash: true,
              hls: true,
              cmaf: false,
              option: {
                min_buffer_time: 2,
                enable_average_bandwidth_mpd: false,
              },
            },
            drm: {
              enabled: true,
              option: {
                multi_key: false,
              },
            },
          },
        }),
      }
    );

    return {
      providerJobId: String(data.job_id),
      providerContentId: input.videoId,
      outputPath,
      status: normalizeProviderStatus(data.status ?? 'queued'),
    };
  },

  async syncProcessing(input: SyncProcessingInput) {
    const config = readDoveRunnerConfig();
    const data = await requestTnp<{ job_id: string; status?: string }>(
      `/api/job/${config.siteId}/${input.providerJobId}`,
      { method: 'GET' }
    );
    const status = normalizeProviderStatus(data.status);
    const ready = status === 'READY';
    const outputPath = outputPathForVideo(input.videoId);

    return {
      status,
      ready,
      dashUrl: ready ? manifestUrl(config.outputBaseUrl, outputPath, config.dashManifestName) : undefined,
      hlsUrl: ready ? manifestUrl(config.outputBaseUrl, outputPath, config.hlsManifestName) : undefined,
    };
  },

  createLicenseToken(input: CreateLicenseTokenInput) {
    const config = readDoveRunnerConfig();
    return generateDoveRunnerLicenseToken({
      siteId: config.siteId,
      siteAccessKey: config.siteAccessKey,
      contentId: input.contentId,
      userId: input.userId,
      drmType: input.drmType,
      ttlSeconds: input.ttlSeconds,
      now: input.now,
    });
  },

  getLicenseServerUrl() {
    return readDoveRunnerConfig().licenseUrl;
  },

  getFairPlayCertUrl() {
    return readDoveRunnerConfig().fairPlayCertUrl;
  },
};
