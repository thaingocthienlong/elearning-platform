export type MediaProviderName = 'doverunner';

export type DrmType = 'widevine' | 'playready' | 'fairplay';

export type ProviderStatus =
  | 'UPLOAD_URL_CREATED'
  | 'UPLOADED'
  | 'SUBMITTED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED'
  | 'STOPPED'
  | 'UNKNOWN';

export type CreateUploadUrlInput = {
  videoId: string;
  filename: string;
  contentType: string;
};

export type CreateUploadUrlResult = {
  uploadUrl: string;
  sourceKey: string;
  sourceBucket: string;
};

export type SubmitProcessingInput = {
  videoId: string;
  title: string;
  sourceKey: string;
};

export type SubmitProcessingResult = {
  providerJobId: string;
  providerContentId: string;
  outputPath: string;
  status: ProviderStatus;
};

export type SyncProcessingInput = {
  providerJobId: string;
  providerContentId: string;
  videoId: string;
};

export type SyncProcessingResult = {
  status: ProviderStatus;
  dashUrl?: string;
  hlsUrl?: string;
  ready: boolean;
};

export type CreateLicenseTokenInput = {
  contentId: string;
  userId: string;
  drmType: DrmType;
  ttlSeconds: number;
  now?: Date;
};

export type MediaProvider = {
  name: MediaProviderName;
  createUploadUrl(input: CreateUploadUrlInput): Promise<CreateUploadUrlResult>;
  submitProcessing(input: SubmitProcessingInput): Promise<SubmitProcessingResult>;
  syncProcessing(input: SyncProcessingInput): Promise<SyncProcessingResult>;
  createLicenseToken(input: CreateLicenseTokenInput): string;
  getLicenseServerUrl(drmType: DrmType): string;
  getFairPlayCertUrl(): string | undefined;
};

export function normalizeProviderStatus(status: string | null | undefined): ProviderStatus {
  const value = status?.trim().toLowerCase();

  if (!value) return 'UNKNOWN';
  if (value === 'queued') return 'QUEUED';
  if (value === 'progress' || value === 'progressing' || value === 'processing') {
    return 'PROCESSING';
  }
  if (value === 'success' || value === 'complete' || value === 'completed' || value === 'ready') {
    return 'READY';
  }
  if (value === 'fail' || value === 'failed' || value === 'error') return 'FAILED';
  if (value === 'stop' || value === 'stopped') return 'STOPPED';

  return 'UNKNOWN';
}

export function isReadyProviderStatus(status: ProviderStatus | string | null | undefined) {
  return normalizeProviderStatus(status) === 'READY';
}
