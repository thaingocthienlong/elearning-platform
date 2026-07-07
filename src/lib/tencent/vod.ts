import crypto from 'node:crypto';
import { callTencentVod } from './client';
import { loadTencentEnv } from './env';
import type {
  TencentDrmType,
  TencentUploadApplyResult,
  TencentUploadSignatureResult,
  TencentVodStatus,
} from './types';

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

function encodeQueryValue(value: string | number) {
  return encodeURIComponent(String(value));
}

export function createTencentUploadSignature(input: {
  videoId: string;
  expiresInSeconds?: number;
  nowSeconds?: number;
  random?: number;
}): TencentUploadSignatureResult {
  const env = loadTencentEnv();
  const currentTimeStamp = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const expireTime = currentTimeStamp + (input.expiresInSeconds ?? 60 * 60);
  const random = input.random ?? crypto.randomInt(0, 0xffffffff);

  const queryParts: Array<[string, string | number | undefined]> = [
    ['secretId', env.secretId],
    ['currentTimeStamp', currentTimeStamp],
    ['expireTime', expireTime],
    ['random', random],
    ['procedure', env.procedureName],
    ['taskNotifyMode', 'Change'],
    ['sourceContext', input.videoId],
    ['sessionContext', input.videoId],
    ['oneTimeValid', 1],
    ['vodSubAppId', env.subAppId],
  ];

  const original = queryParts
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${name}=${encodeQueryValue(value!)}`)
    .join('&');

  const signature = crypto.createHmac('sha1', env.secretKey).update(original, 'utf8').digest();
  return {
    signature: Buffer.concat([signature, Buffer.from(original, 'utf8')]).toString('base64'),
    currentTimeStamp,
    expireTime,
  };
}

export async function processTencentMedia(fileId: string) {
  const env = loadTencentEnv();
  return callTencentVod<{ TaskId: string }>('ProcessMediaByProcedure', {
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
          Definition?: number;
          Package?: string;
          DrmType?: string;
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

type TencentAdaptiveOutput = {
  Definition?: number;
  Package?: string;
  DrmType?: string;
  Url?: string;
};

function isHlsUrl(url: string | undefined) {
  return Boolean(url?.includes('.m3u8'));
}

function isDashUrl(url: string | undefined) {
  return Boolean(url?.endsWith('.mpd') || url?.includes('.mpd?'));
}

function isSimpleAesOutput(item: TencentAdaptiveOutput) {
  return item.DrmType?.toLowerCase() === 'simpleaes';
}

function isPlainHlsOutput(item: TencentAdaptiveOutput) {
  return !item.DrmType && (item.Package?.toUpperCase() === 'HLS' || isHlsUrl(item.Url));
}

export function extractTencentPlaybackUrlsFromAdaptiveOutputs(
  outputs: TencentAdaptiveOutput[] | undefined,
  mediaUrl?: string
) {
  const adaptiveOutputs = outputs?.filter((item) => item.Url) ?? [];
  const dashOutput = adaptiveOutputs.find((item) => isDashUrl(item.Url));
  const protectedHlsOutput = adaptiveOutputs.find((item) =>
    isHlsUrl(item.Url) && !isSimpleAesOutput(item) && !isPlainHlsOutput(item)
  );
  const simpleAesOutput = adaptiveOutputs.find((item) => isHlsUrl(item.Url) && isSimpleAesOutput(item));
  const plainHlsOutput = adaptiveOutputs.find((item) => isHlsUrl(item.Url) && isPlainHlsOutput(item));
  const mediaHlsUrl = isHlsUrl(mediaUrl) ? mediaUrl : undefined;
  const hlsFallbackOutput = simpleAesOutput ?? plainHlsOutput;
  const hlsUrlClear = hlsFallbackOutput?.Url ?? mediaHlsUrl;
  const fallbackDrmType = hlsFallbackOutput
    ? (isSimpleAesOutput(hlsFallbackOutput) ? 'SimpleAES' : 'Plain')
    : (mediaHlsUrl ? 'Plain' : undefined);
  const dashUrl = dashOutput?.Url;
  const hlsUrl = protectedHlsOutput?.Url;

  return {
    dashUrl,
    hlsUrl,
    hlsUrlClear,
    tencentAdaptiveTemplateId: dashOutput?.Definition ?? protectedHlsOutput?.Definition,
    tencentAppleFallbackTemplateId: hlsFallbackOutput?.Definition,
    tencentAppleFallbackDrmType: fallbackDrmType,
    playbackUrl: dashUrl ?? hlsUrl ?? hlsUrlClear ?? mediaUrl,
  };
}

export function extractTencentPlaybackUrls(mediaInfo: Awaited<ReturnType<typeof describeTencentMedia>>) {
  return extractTencentPlaybackUrlsFromAdaptiveOutputs(
    mediaInfo?.AdaptiveDynamicStreamingInfo?.AdaptiveDynamicStreamingSet,
    mediaInfo?.BasicInfo?.MediaUrl
  );
}

export async function deleteTencentMedia(fileId: string) {
  return callTencentVod<Record<string, never>>('DeleteMedia', {
    FileId: fileId,
  });
}

export function createTencentDrmToken(input: {
  fileId: string;
  expiresAt: Date;
  nowSeconds?: number;
  random?: number;
  multiDrm?: boolean;
}) {
  const env = loadTencentEnv();
  if (!env.subAppId) {
    throw new Error('TENCENT_VOD_SUB_APP_ID is required to create Tencent DrmToken.');
  }

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  const currentTimeStamp = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const payload: Record<string, string | number> = {
    type: 'DrmToken',
    appId: env.subAppId,
    fileId: input.fileId,
    currentTimeStamp,
    expireTimeStamp: Math.floor(input.expiresAt.getTime() / 1000),
    random: input.random ?? crypto.randomInt(0, 0xffffffff),
    issuer: 'client',
  };

  if (input.multiDrm ?? true) {
    payload.multiDrm = 1;
  }

  const encodedHeader = Buffer.from(JSON.stringify(header), 'utf8').toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', env.playbackKey).update(signatureInput, 'utf8').digest('base64url');

  return `${encodedHeader}~${encodedPayload}~${signature}`;
}

export function createTencentAppleFallbackTokenExpiry(input: {
  durationSeconds?: number | null;
  nowMs?: number;
}) {
  const nowMs = input.nowMs ?? Date.now();
  const durationMs = Math.max(0, input.durationSeconds ?? 0) * 1000;
  const minimumMs = 30 * 60 * 1000;
  const maximumMs = 4 * 60 * 60 * 1000;
  const bufferMs = 30 * 60 * 1000;
  const ttlMs = Math.min(Math.max(durationMs + bufferMs, minimumMs), maximumMs);
  return new Date(nowMs + ttlMs);
}

export function createTencentSimpleAesPlaybackUrl(url: string, drmToken: string) {
  if (!drmToken) return url;

  const parsed = new URL(url);
  const pathParts = parsed.pathname.split('/');
  const fileName = pathParts.pop();
  if (!fileName || fileName.startsWith('voddrm.token.')) return url;

  pathParts.push(`voddrm.token.${drmToken}.${fileName}`);
  parsed.pathname = pathParts.join('/');
  return parsed.toString();
}
