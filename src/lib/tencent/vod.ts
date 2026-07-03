import crypto from 'node:crypto';
import { callTencentVod } from './client';
import { loadTencentEnv } from './env';
import type { TencentDrmType, TencentUploadApplyResult, TencentVodStatus } from './types';

export function normalizeTencentStatus(status: string | null | undefined): TencentVodStatus {
  const value = status?.trim().toUpperCase();
  if (!value) return 'UNKNOWN';
  if (['FINISH', 'FINISHED', 'SUCCESS', 'READY'].includes(value)) return 'READY';
  if (['PROCESSING', 'WAITING', 'SUBMITTED', 'RUNNING'].includes(value)) return 'PROCESSING';
  if (['FAIL', 'FAILED', 'ERROR'].includes(value)) return 'FAILED';
  if (value === 'DELETED') return 'DELETED';
  if (value === 'DELETING') return 'DELETING';
  return 'UNKNOWN';
}

export function resolveTencentLicenseUrl(
  drmType: TencentDrmType,
  env: Pick<ReturnType<typeof loadTencentEnv>, 'widevineLicenseUrl' | 'fairplayLicenseUrl'> = loadTencentEnv()
) {
  return drmType === 'fairplay' ? env.fairplayLicenseUrl : env.widevineLicenseUrl;
}

export async function applyTencentUpload(input: {
  filename: string;
  mediaType: string;
  videoId: string;
}): Promise<TencentUploadApplyResult> {
  const env = loadTencentEnv();
  const response = await callTencentVod<{
    StorageBucket: string;
    StorageRegion: string;
    MediaStoragePath: string;
    VodSessionKey: string;
    TempCertificate: {
      SecretId: string;
      SecretKey: string;
      Token: string;
      ExpiredTime: number;
    };
  }>('ApplyUpload', {
    MediaType: input.mediaType,
    MediaName: input.filename,
    Procedure: env.procedureName,
    SourceContext: input.videoId,
    SessionContext: input.videoId,
  });

  return {
    storageBucket: response.StorageBucket,
    storageRegion: response.StorageRegion,
    mediaStoragePath: response.MediaStoragePath,
    vodSessionKey: response.VodSessionKey,
    tempCertificate: {
      secretId: response.TempCertificate.SecretId,
      secretKey: response.TempCertificate.SecretKey,
      token: response.TempCertificate.Token,
      expiredTime: response.TempCertificate.ExpiredTime,
    },
    requestId: response.RequestId,
  };
}

export async function processTencentMedia(fileId: string) {
  const env = loadTencentEnv();
  return callTencentVod<{ TaskId: string }>('ProcessMedia', {
    FileId: fileId,
    ProcedureName: env.procedureName,
  });
}

export async function describeTencentMedia(fileId: string) {
  const response = await callTencentVod<{
    MediaInfoSet?: Array<{
      FileId?: string;
      BasicInfo?: {
        Name?: string;
        MediaUrl?: string;
      };
      AdaptiveDynamicStreamingInfo?: {
        AdaptiveDynamicStreamingSet?: Array<{
          Url?: string;
        }>;
      };
      MetaData?: {
        Duration?: number;
      };
    }>;
  }>('DescribeMediaInfos', {
    FileIds: [fileId],
  });

  return response.MediaInfoSet?.[0] ?? null;
}

export function extractTencentPlaybackUrls(mediaInfo: Awaited<ReturnType<typeof describeTencentMedia>>) {
  const adaptiveUrl = mediaInfo?.AdaptiveDynamicStreamingInfo?.AdaptiveDynamicStreamingSet?.find((item) => item.Url)?.Url;
  const mediaUrl = mediaInfo?.BasicInfo?.MediaUrl;
  const playbackUrl = adaptiveUrl ?? mediaUrl;

  return {
    dashUrl: playbackUrl?.endsWith('.mpd') ? playbackUrl : undefined,
    hlsUrl: playbackUrl?.includes('.m3u8') ? playbackUrl : undefined,
    playbackUrl,
  };
}

export async function deleteTencentMedia(fileId: string) {
  return callTencentVod<Record<string, never>>('DeleteMedia', {
    FileId: fileId,
  });
}

export function createTencentDrmToken(input: {
  fileId: string;
  userId: string;
  videoId: string;
  expiresAt: Date;
}) {
  const env = loadTencentEnv();
  const payload = JSON.stringify({
    fileId: input.fileId,
    userId: input.userId,
    videoId: input.videoId,
    exp: Math.floor(input.expiresAt.getTime() / 1000),
  });
  return crypto.createHmac('sha256', env.secretKey).update(payload, 'utf8').digest('base64url');
}
