export type MediaProviderName = 'doverunner';

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

export type MediaProvider = {
  name: MediaProviderName;
  createUploadUrl(input: CreateUploadUrlInput): Promise<CreateUploadUrlResult>;
  submitProcessing(input: SubmitProcessingInput): Promise<SubmitProcessingResult>;
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
