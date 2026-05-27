import { createS3UploadUrl } from './aws-s3';
import { readDoveRunnerUploadConfig } from './doverunner-env';
import {
  normalizeProviderStatus,
  type CreateUploadUrlInput,
  type MediaProvider,
  type SubmitProcessingInput,
} from './types';

type DoveRunnerApiResponse<T> = {
  error_code: string;
  error_message?: string;
  data: T;
};

const TNP_ERROR_EXPLANATIONS: Record<string, string> = {
  E9011: 'DoveRunner trial packaging job limit exceeded. The trial limit is 2 jobs; ask DoveRunner to reset or upgrade the T&P account.',
};

export class DoveRunnerTnpError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    providerMessage?: string
  ) {
    const explanation = TNP_ERROR_EXPLANATIONS[code];
    const detail = explanation || providerMessage || 'Check DoveRunner T&P console and API credentials.';
    super(`DoveRunner T&P request failed: ${code}. ${detail}`);
    this.name = 'DoveRunnerTnpError';
  }
}

export function isDoveRunnerTnpError(error: unknown): error is DoveRunnerTnpError {
  return error instanceof DoveRunnerTnpError;
}

async function getTnpAuthToken() {
  const config = readDoveRunnerUploadConfig();
  const basic = Buffer.from(`${config.tnpAccountId}:${config.tnpAccessKey}`, 'utf8').toString('base64');
  const response = await fetch(`${config.tnpApiBaseUrl}/api/token/${config.siteId}`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${basic}`,
    },
  });

  const body = await response.json() as DoveRunnerApiResponse<{ token: string }>;

  if (!response.ok || body.error_code !== '0000') {
    throw new DoveRunnerTnpError(body.error_code || String(response.status), response.status, body.error_message);
  }

  return body.data.token;
}

async function requestTnp<T>(path: string, init: RequestInit = {}) {
  const config = readDoveRunnerUploadConfig();
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
    throw new DoveRunnerTnpError(body.error_code || String(response.status), response.status, body.error_message);
  }

  return body.data;
}

function outputPathForVideo(videoId: string) {
  return `${videoId}/`;
}

export const doverunnerProvider: MediaProvider = {
  name: 'doverunner',

  createUploadUrl(input: CreateUploadUrlInput) {
    return createS3UploadUrl(input);
  },

  async submitProcessing(input: SubmitProcessingInput) {
    const config = readDoveRunnerUploadConfig();
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
            transcodings: [
              {
                track_id: 'video_0',
                track_type: 'video',
                codec: 'h264',
                height: 720,
                width: 1280,
                bitrate: 2500000,
              },
              {
                track_id: 'audio_0',
                track_type: 'audio',
                codec: 'aac',
                sources: [{ track: 0 }],
              },
            ],
            packaging: {
              dash: true,
              hls: false,
              cmaf: false,
              option: {
                min_buffer_time: 2,
                enable_average_bandwidth_mpd: false,
              },
            },
            drm: {
              enabled: config.tnpDrmEnabled,
              option: {
                multi_key: false,
                skip_audio_encryption: false,
                clear_lead: 0,
                generate_tracktype_manifests: false,
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
};
