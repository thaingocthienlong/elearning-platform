export type TencentValidationMode = 'local' | 'strict';

export type TencentVodStatus =
  | 'UPLOAD_APPLIED'
  | 'UPLOAD_CONFIRMED'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED'
  | 'DELETING'
  | 'DELETED'
  | 'UNKNOWN';

export type TencentDrmType = 'widevine' | 'fairplay';

export type TencentEnv = {
  secretId: string;
  secretKey: string;
  region: string;
  subAppId?: number;
  procedureName: string;
  webhookSignKey: string;
  widevineLicenseUrl: string;
  fairplayLicenseUrl: string;
  fairplayCertUrl?: string;
};

export type TencentUploadApplyResult = {
  storageBucket: string;
  storageRegion: string;
  mediaStoragePath: string;
  vodSessionKey: string;
  tempCertificate: {
    secretId: string;
    secretKey: string;
    token: string;
    expiredTime: number;
  };
  requestId: string;
};

export type TencentUploadSignatureResult = {
  signature: string;
  currentTimeStamp: number;
  expireTime: number;
};

export type TencentPlaybackSession = {
  provider: 'tencent';
  videoId: string;
  fileId: string;
  drmType: TencentDrmType;
  manifestUrl: string;
  licenseUrl: string;
  drmToken: string;
  fairplayCertUrl?: string;
  expiresAt: string;
};

export type TencentWebhookEvent = {
  eventType: string;
  fileId?: string;
  taskId?: string;
  status?: TencentVodStatus;
  raw: unknown;
};
