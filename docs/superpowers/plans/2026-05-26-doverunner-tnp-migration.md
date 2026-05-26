# DoveRunner T&P Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Axinom upload, transcode, package, DRM token, and playback dependencies with DoveRunner T&P, DoveRunner Multi-DRM, and AWS S3.

**Architecture:** Keep existing app route boundaries and add a provider-neutral media provider layer underneath them. AWS S3 handles browser upload and DoveRunner T&P input/output storage; DoveRunner APIs handle job submission, job sync, and license token generation; Shaka remains the browser player.

**Tech Stack:** Next.js App Router, TypeScript, Prisma MongoDB, Jest, Shaka Player, AWS SDK v3 S3 presigner, DoveRunner T&P HTTP API, DoveRunner Multi-DRM license token spec.

---

## File Structure

- Create `src/lib/media-provider/types.ts`: provider-neutral media provider status, route result, and DRM type definitions.
- Create `src/lib/media-provider/aws-s3.ts`: AWS S3 client and presigned upload URL helper.
- Create `src/lib/media-provider/doverunner-env.ts`: DoveRunner/AWS env parsing and validation without logging secrets.
- Create `src/lib/media-provider/doverunner-token.ts`: DoveRunner license token policy encryption and SHA256 hash generation.
- Create `src/lib/media-provider/doverunner.ts`: DoveRunner T&P token, job submission, job detail sync, manifest URL, and license token orchestration.
- Create `src/lib/media-provider/index.ts`: single active provider export.
- Create `src/lib/shaka-drm.ts`: provider-neutral Shaka license URLs and request-header helpers.
- Modify `prisma/schema.prisma`: add provider-neutral video fields and indexes.
- Modify `src/app/api/upload/presigned/route.ts`: use active media provider instead of Azure helper.
- Modify `src/app/api/video/process/route.ts`: submit DoveRunner T&P job once.
- Modify `src/app/api/video/sync/route.ts`: poll DoveRunner job detail and publish when ready.
- Modify `src/app/api/drm/token/route.ts`: issue DoveRunner token from entitlement and `providerContentId`.
- Modify `src/hooks/player/useShakaPlayer.ts`: send `pallycon-customdata-v2` instead of `X-AxDRM-Message`.
- Modify `src/components/video/DRMPlayerWrapper.tsx`: use provider-neutral license URL helper and block FairPlay when no DoveRunner cert configured.
- Modify `src/app/watch/[videoId]/page.tsx`: pass DoveRunner FairPlay readiness and stop Axinom import.
- Modify `src/app/admin/videos/page.tsx`: show provider-neutral IDs/status text and S3 upload text.
- Modify docs and verification scripts after code works.

## Task 1: Data Model And Provider Types

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/media-provider/types.ts`
- Test: `__tests__/lib/media-provider-types.test.ts`

- [ ] **Step 1: Write the provider type test**

Create `__tests__/lib/media-provider-types.test.ts`:

```ts
import {
  isReadyProviderStatus,
  normalizeProviderStatus,
  type MediaProviderName,
} from '@/lib/media-provider/types';

describe('media provider types', () => {
  test('normalizes DoveRunner status values used by T&P', () => {
    expect(normalizeProviderStatus('queued')).toBe('QUEUED');
    expect(normalizeProviderStatus('progress')).toBe('PROCESSING');
    expect(normalizeProviderStatus('success')).toBe('READY');
    expect(normalizeProviderStatus('fail')).toBe('FAILED');
    expect(normalizeProviderStatus('unknown-state')).toBe('UNKNOWN');
  });

  test('detects ready provider status', () => {
    expect(isReadyProviderStatus('READY')).toBe(true);
    expect(isReadyProviderStatus('PROCESSING')).toBe(false);
  });

  test('keeps provider name narrow', () => {
    const provider: MediaProviderName = 'doverunner';
    expect(provider).toBe('doverunner');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/lib/media-provider-types.test.ts --runInBand
```

Expected: fail because `@/lib/media-provider/types` does not exist.

- [ ] **Step 3: Add provider types**

Create `src/lib/media-provider/types.ts`:

```ts
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
  if (value === 'progress' || value === 'progressing' || value === 'processing') return 'PROCESSING';
  if (value === 'success' || value === 'complete' || value === 'completed' || value === 'ready') return 'READY';
  if (value === 'fail' || value === 'failed' || value === 'error') return 'FAILED';
  if (value === 'stop' || value === 'stopped') return 'STOPPED';

  return 'UNKNOWN';
}

export function isReadyProviderStatus(status: ProviderStatus | string | null | undefined) {
  return normalizeProviderStatus(status) === 'READY';
}
```

- [ ] **Step 4: Add Prisma fields**

Modify `prisma/schema.prisma` inside `model Video` after `axinomSyncedAt DateTime?`:

```prisma
  mediaProvider       String?
  providerContentId   String?
  providerJobId       String?
  providerStatus      String?
  sourceStorageBucket String?
  sourceStorageKey    String?
  outputStorageBucket String?
  outputStoragePath   String?
  providerSyncedAt    DateTime?
```

Add indexes below existing Axinom indexes:

```prisma
  @@index([mediaProvider])
  @@index([providerContentId])
  @@index([providerJobId])
  @@index([providerStatus])
```

- [ ] **Step 5: Generate Prisma client**

Run:

```bash
npm run prisma:generate
```

Expected: Prisma client generation succeeds.

- [ ] **Step 6: Run test and typecheck**

Run:

```bash
npm test -- __tests__/lib/media-provider-types.test.ts --runInBand
npm run typecheck
```

Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma src/lib/media-provider/types.ts __tests__/lib/media-provider-types.test.ts
git commit -m "feat: add provider-neutral media fields"
```

## Task 2: DoveRunner Env, S3 Upload, And Provider Export

**Files:**
- Create: `src/lib/media-provider/doverunner-env.ts`
- Create: `src/lib/media-provider/aws-s3.ts`
- Create: `src/lib/media-provider/index.ts`
- Test: `__tests__/lib/doverunner-env.test.ts`
- Test: `__tests__/lib/aws-s3-upload.test.ts`

- [ ] **Step 1: Write env tests**

Create `__tests__/lib/doverunner-env.test.ts`:

```ts
import { readDoveRunnerConfig } from '@/lib/media-provider/doverunner-env';

describe('DoveRunner env config', () => {
  test('reads required config and defaults safe optional values', () => {
    const config = readDoveRunnerConfig({
      DOVERUNNER_SITE_ID: 'DEMO',
      DOVERUNNER_ACCESS_KEY: 'site-access-key',
      DOVERUNNER_TNP_ACCOUNT_ID: 'account@example.test',
      DOVERUNNER_TNP_ACCESS_KEY: 'tnp-access-key',
      DOVERUNNER_TNP_INPUT_STORAGE_ID: 'input-storage',
      DOVERUNNER_TNP_OUTPUT_STORAGE_ID: 'output-storage',
      DOVERUNNER_OUTPUT_BASE_URL: 'https://cdn.example.test/output/',
      AWS_REGION: 'ap-southeast-1',
      AWS_S3_INPUT_BUCKET: 'input-bucket',
      AWS_S3_OUTPUT_BUCKET: 'output-bucket',
      AWS_ACCESS_KEY_ID: 'aws-access-key',
      AWS_SECRET_ACCESS_KEY: 'aws-secret-key',
    });

    expect(config.siteId).toBe('DEMO');
    expect(config.licenseUrl).toBe('https://drm-license.doverunner.com/ri/licenseManager.do');
    expect(config.tnpApiBaseUrl).toBe('https://tnp.doverunner.com');
    expect(config.outputBaseUrl).toBe('https://cdn.example.test/output');
    expect(config.dashManifestName).toBe('manifest.mpd');
    expect(config.hlsManifestName).toBe('master.m3u8');
  });

  test('throws with variable names but not secret values', () => {
    expect(() =>
      readDoveRunnerConfig({
        DOVERUNNER_SITE_ID: 'DEMO',
        DOVERUNNER_ACCESS_KEY: 'secret-value',
      })
    ).toThrow(/DOVERUNNER_TNP_ACCOUNT_ID/);

    try {
      readDoveRunnerConfig({
        DOVERUNNER_SITE_ID: 'DEMO',
        DOVERUNNER_ACCESS_KEY: 'secret-value',
      });
    } catch (error) {
      expect(String(error)).not.toContain('secret-value');
    }
  });
});
```

- [ ] **Step 2: Write S3 upload helper test**

Create `__tests__/lib/aws-s3-upload.test.ts`:

```ts
import { buildS3SourceKey } from '@/lib/media-provider/aws-s3';

describe('AWS S3 media upload helpers', () => {
  test('builds stable source key from video ID and extension', () => {
    expect(buildS3SourceKey({ videoId: 'video-1', filename: 'Lecture 01.MP4' }))
      .toBe('videos/video-1/source.mp4');
  });

  test('uses mp4 extension when filename has no extension', () => {
    expect(buildS3SourceKey({ videoId: 'video-1', filename: 'lecture' }))
      .toBe('videos/video-1/source.mp4');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/doverunner-env.test.ts __tests__/lib/aws-s3-upload.test.ts --runInBand
```

Expected: fail because files do not exist.

- [ ] **Step 4: Add DoveRunner config reader**

Create `src/lib/media-provider/doverunner-env.ts`:

```ts
type Env = Record<string, string | undefined>;

export type DoveRunnerConfig = {
  siteId: string;
  siteAccessKey: string;
  licenseUrl: string;
  tnpAccountId: string;
  tnpAccessKey: string;
  tnpInputStorageId: string;
  tnpOutputStorageId: string;
  tnpApiBaseUrl: string;
  outputBaseUrl: string;
  dashManifestName: string;
  hlsManifestName: string;
  awsRegion: string;
  awsInputBucket: string;
  awsOutputBucket: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  fairPlayCertUrl?: string;
  licenseTokenTtlSeconds: number;
};

function required(env: Env, key: string) {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required DoveRunner media environment variable: ${key}`);
  }
  return value;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function readDoveRunnerConfig(env: Env = process.env): DoveRunnerConfig {
  const licenseTokenTtlSeconds = Number(env.DOVERUNNER_LICENSE_TOKEN_TTL_SECONDS ?? '300');

  if (!Number.isFinite(licenseTokenTtlSeconds) || licenseTokenTtlSeconds <= 0) {
    throw new Error('DOVERUNNER_LICENSE_TOKEN_TTL_SECONDS must be a positive number');
  }

  return {
    siteId: required(env, 'DOVERUNNER_SITE_ID'),
    siteAccessKey: required(env, 'DOVERUNNER_ACCESS_KEY'),
    licenseUrl: env.DOVERUNNER_LICENSE_URL?.trim() || 'https://drm-license.doverunner.com/ri/licenseManager.do',
    tnpAccountId: required(env, 'DOVERUNNER_TNP_ACCOUNT_ID'),
    tnpAccessKey: required(env, 'DOVERUNNER_TNP_ACCESS_KEY'),
    tnpInputStorageId: required(env, 'DOVERUNNER_TNP_INPUT_STORAGE_ID'),
    tnpOutputStorageId: required(env, 'DOVERUNNER_TNP_OUTPUT_STORAGE_ID'),
    tnpApiBaseUrl: trimTrailingSlash(env.DOVERUNNER_TNP_API_BASE_URL?.trim() || 'https://tnp.doverunner.com'),
    outputBaseUrl: trimTrailingSlash(required(env, 'DOVERUNNER_OUTPUT_BASE_URL')),
    dashManifestName: env.DOVERUNNER_DASH_MANIFEST_NAME?.trim() || 'manifest.mpd',
    hlsManifestName: env.DOVERUNNER_HLS_MANIFEST_NAME?.trim() || 'master.m3u8',
    awsRegion: required(env, 'AWS_REGION'),
    awsInputBucket: required(env, 'AWS_S3_INPUT_BUCKET'),
    awsOutputBucket: required(env, 'AWS_S3_OUTPUT_BUCKET'),
    awsAccessKeyId: required(env, 'AWS_ACCESS_KEY_ID'),
    awsSecretAccessKey: required(env, 'AWS_SECRET_ACCESS_KEY'),
    fairPlayCertUrl: env.DOVERUNNER_FAIRPLAY_CERT_URL?.trim() || undefined,
    licenseTokenTtlSeconds,
  };
}
```

- [ ] **Step 5: Add S3 upload helper**

Create `src/lib/media-provider/aws-s3.ts`:

```ts
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { readDoveRunnerConfig } from './doverunner-env';

export function buildS3SourceKey({
  videoId,
  filename,
}: {
  videoId: string;
  filename: string;
}) {
  const extensionMatch = filename.match(/\.([A-Za-z0-9]+)$/);
  const extension = extensionMatch?.[1]?.toLowerCase() || 'mp4';
  return `videos/${videoId}/source.${extension}`;
}

function createS3Client() {
  const config = readDoveRunnerConfig();

  return new S3Client({
    region: config.awsRegion,
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    },
  });
}

export async function createS3UploadUrl({
  videoId,
  filename,
  contentType,
  expiresInSeconds = 3600,
}: {
  videoId: string;
  filename: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  const config = readDoveRunnerConfig();
  const sourceKey = buildS3SourceKey({ videoId, filename });
  const client = createS3Client();

  const command = new PutObjectCommand({
    Bucket: config.awsInputBucket,
    Key: sourceKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: expiresInSeconds,
  });

  return {
    uploadUrl,
    sourceKey,
    sourceBucket: config.awsInputBucket,
  };
}
```

- [ ] **Step 6: Add provider export shell**

Create `src/lib/media-provider/index.ts`:

```ts
export type {
  CreateLicenseTokenInput,
  CreateUploadUrlInput,
  CreateUploadUrlResult,
  DrmType,
  MediaProvider,
  MediaProviderName,
  ProviderStatus,
  SubmitProcessingInput,
  SubmitProcessingResult,
  SyncProcessingInput,
  SyncProcessingResult,
} from './types';

export { createS3UploadUrl } from './aws-s3';
export { readDoveRunnerConfig } from './doverunner-env';
```

- [ ] **Step 7: Run tests**

```bash
npm test -- __tests__/lib/doverunner-env.test.ts __tests__/lib/aws-s3-upload.test.ts --runInBand
npm run typecheck
```

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/media-provider __tests__/lib/doverunner-env.test.ts __tests__/lib/aws-s3-upload.test.ts
git commit -m "feat: add DoveRunner S3 provider config"
```

## Task 3: DoveRunner License Token Generation

**Files:**
- Create: `src/lib/media-provider/doverunner-token.ts`
- Test: `__tests__/lib/doverunner-token.test.ts`

- [ ] **Step 1: Write token tests**

Create `__tests__/lib/doverunner-token.test.ts`:

```ts
import crypto from 'crypto';
import {
  buildDoveRunnerTokenPayload,
  encryptDoveRunnerPolicy,
  generateDoveRunnerLicenseToken,
} from '@/lib/media-provider/doverunner-token';

const accessKey = '12345678901234567890123456789012';

describe('DoveRunner license token generation', () => {
  test('encrypts policy as base64 AES-256-CBC payload', () => {
    const encrypted = encryptDoveRunnerPolicy(
      { policy_version: 2, playback_policy: { persistent: false, license_duration: 300 } },
      accessKey,
      Buffer.alloc(16, 1)
    );

    expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(encrypted).not.toContain('license_duration');
  });

  test('builds token payload with DoveRunner required fields and hash', () => {
    const payload = buildDoveRunnerTokenPayload({
      siteId: 'DEMO',
      siteAccessKey: accessKey,
      contentId: 'video-1',
      userId: 'user-1',
      drmType: 'widevine',
      ttlSeconds: 300,
      now: new Date('2026-05-26T00:00:00.000Z'),
      iv: Buffer.alloc(16, 1),
    });

    const expectedHash = crypto
      .createHash('sha256')
      .update(accessKey + 'widevine' + 'DEMO' + 'user-1' + 'video-1' + payload.policy + '2026-05-26T00:00:00Z')
      .digest('base64');

    expect(payload).toMatchObject({
      drm_type: 'widevine',
      site_id: 'DEMO',
      user_id: 'user-1',
      cid: 'video-1',
      timestamp: '2026-05-26T00:00:00Z',
      hash: expectedHash,
    });
  });

  test('returns base64 encoded token JSON', () => {
    const token = generateDoveRunnerLicenseToken({
      siteId: 'DEMO',
      siteAccessKey: accessKey,
      contentId: 'video-1',
      userId: 'user-1',
      drmType: 'playready',
      ttlSeconds: 300,
      now: new Date('2026-05-26T00:00:00.000Z'),
      iv: Buffer.alloc(16, 1),
    });

    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    expect(decoded.drm_type).toBe('playready');
    expect(decoded.cid).toBe('video-1');
    expect(decoded.policy).toEqual(expect.any(String));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/lib/doverunner-token.test.ts --runInBand
```

Expected: fail because module does not exist.

- [ ] **Step 3: Add token generator**

Create `src/lib/media-provider/doverunner-token.ts`:

```ts
import crypto from 'crypto';
import type { DrmType } from './types';

type DoveRunnerPolicy = {
  policy_version: 2;
  playback_policy?: {
    persistent?: boolean;
    license_duration?: number;
    expire_date?: string;
    rental_duration?: number;
    playback_duration?: number;
    renewal_duration?: number;
    allowed_track_types?: 'ALL' | 'SD_ONLY' | 'SD_HD' | 'SD_UHD1' | 'SD_UHD2';
  };
};

type BuildTokenInput = {
  siteId: string;
  siteAccessKey: string;
  contentId: string;
  userId: string;
  drmType: DrmType;
  ttlSeconds: number;
  now?: Date;
  iv?: Buffer;
};

function toDoveRunnerTimestamp(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function keyFromAccessKey(siteAccessKey: string) {
  return crypto.createHash('sha256').update(siteAccessKey).digest();
}

export function encryptDoveRunnerPolicy(
  policy: DoveRunnerPolicy,
  siteAccessKey: string,
  iv = crypto.randomBytes(16)
) {
  const cipher = crypto.createCipheriv('aes-256-cbc', keyFromAccessKey(siteAccessKey), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(policy), 'utf8'),
    cipher.final(),
  ]);

  return Buffer.concat([iv, encrypted]).toString('base64');
}

export function buildDoveRunnerTokenPayload({
  siteId,
  siteAccessKey,
  contentId,
  userId,
  drmType,
  ttlSeconds,
  now = new Date(),
  iv,
}: BuildTokenInput) {
  const timestamp = toDoveRunnerTimestamp(now);
  const policy = encryptDoveRunnerPolicy(
    {
      policy_version: 2,
      playback_policy: {
        persistent: false,
        license_duration: ttlSeconds,
      },
    },
    siteAccessKey,
    iv
  );
  const hash = crypto
    .createHash('sha256')
    .update(siteAccessKey + drmType + siteId + userId + contentId + policy + timestamp)
    .digest('base64');

  return {
    drm_type: drmType,
    site_id: siteId,
    user_id: userId,
    cid: contentId,
    policy,
    timestamp,
    hash,
  };
}

export function generateDoveRunnerLicenseToken(input: BuildTokenInput) {
  return Buffer.from(JSON.stringify(buildDoveRunnerTokenPayload(input)), 'utf8').toString('base64');
}
```

- [ ] **Step 4: Run test and typecheck**

```bash
npm test -- __tests__/lib/doverunner-token.test.ts --runInBand
npm run typecheck
```

Expected: pass. If DoveRunner account support provides a different AES mode or key derivation, update this module and test in the same task before live use.

- [ ] **Step 5: Commit**

```bash
git add src/lib/media-provider/doverunner-token.ts __tests__/lib/doverunner-token.test.ts
git commit -m "feat: add DoveRunner DRM token helper"
```

## Task 4: DoveRunner T&P API Provider

**Files:**
- Create: `src/lib/media-provider/doverunner.ts`
- Modify: `src/lib/media-provider/index.ts`
- Test: `__tests__/lib/doverunner-provider.test.ts`

- [ ] **Step 1: Write provider tests**

Create `__tests__/lib/doverunner-provider.test.ts`:

```ts
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
        json: async () => ({ error_code: '0000', data: { job_id: 'job-1', status: 'queued' } }),
      }) as jest.Mock;

    const result = await doverunnerProvider.submitProcessing({
      videoId: 'video-1',
      title: 'Lecture 1',
      sourceKey: 'videos/video-1/source.mp4',
    });

    expect(result).toEqual({
      providerJobId: 'job-1',
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/lib/doverunner-provider.test.ts --runInBand
```

Expected: fail because provider file does not exist.

- [ ] **Step 3: Add DoveRunner provider**

Create `src/lib/media-provider/doverunner.ts`:

```ts
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
    const data = await requestTnp<{ job_id: string; status?: string }>(
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
                codec: 'AAC',
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
      providerJobId: data.job_id,
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
```

- [ ] **Step 4: Export provider**

Modify `src/lib/media-provider/index.ts`:

```ts
export type {
  CreateLicenseTokenInput,
  CreateUploadUrlInput,
  CreateUploadUrlResult,
  DrmType,
  MediaProvider,
  MediaProviderName,
  ProviderStatus,
  SubmitProcessingInput,
  SubmitProcessingResult,
  SyncProcessingInput,
  SyncProcessingResult,
} from './types';

export { createS3UploadUrl } from './aws-s3';
export { readDoveRunnerConfig } from './doverunner-env';
export { doverunnerProvider as activeMediaProvider } from './doverunner';
```

- [ ] **Step 5: Run tests**

```bash
npm test -- __tests__/lib/doverunner-provider.test.ts --runInBand
npm run typecheck
```

Expected: pass. If live DoveRunner API shape differs, keep mocked tests aligned with official docs and add a live verifier in Task 8.

- [ ] **Step 6: Commit**

```bash
git add src/lib/media-provider __tests__/lib/doverunner-provider.test.ts
git commit -m "feat: add DoveRunner T&P provider"
```

## Task 5: Upload, Process, And Sync Routes

**Files:**
- Modify: `src/app/api/upload/presigned/route.ts`
- Modify: `src/app/api/video/process/route.ts`
- Modify: `src/app/api/video/sync/route.ts`
- Test: `__tests__/api/doverunner-media-routes.test.ts`
- Replace or retire: `__tests__/api/video-process-clear-encode.test.ts`

- [ ] **Step 1: Write route tests**

Create `__tests__/api/doverunner-media-routes.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { activeMediaProvider } from '@/lib/media-provider';
import { POST as uploadPost } from '@/app/api/upload/presigned/route';
import { POST as processPost } from '@/app/api/video/process/route';
import { POST as syncPost } from '@/app/api/video/sync/route';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    course: { findUnique: jest.fn() },
    video: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  },
}));
jest.mock('@/lib/media-provider', () => ({
  activeMediaProvider: {
    name: 'doverunner',
    createUploadUrl: jest.fn(),
    submitProcessing: jest.fn(),
    syncProcessing: jest.fn(),
  },
}));

const mockedSession = getServerSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
  course: { findUnique: jest.Mock };
  video: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
};
const mockedProvider = activeMediaProvider as unknown as {
  createUploadUrl: jest.Mock;
  submitProcessing: jest.Mock;
  syncProcessing: jest.Mock;
};

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('DoveRunner media routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
  });

  test('upload route creates video row and S3 presigned URL', async () => {
    mockedPrisma.course.findUnique.mockResolvedValue({ id: 'course-1' });
    mockedPrisma.video.create.mockResolvedValue({ id: 'video-1' });
    mockedProvider.createUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.test/upload',
      sourceKey: 'videos/video-1/source.mp4',
      sourceBucket: 'input-bucket',
    });

    const response = await uploadPost(jsonRequest('http://localhost/api/upload/presigned', {
      filename: 'lecture.mp4',
      contentType: 'video/mp4',
      courseId: 'course-1',
      title: 'Lecture 1',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      signedUrl: 'https://s3.example.test/upload',
      videoId: 'video-1',
      key: 'videos/video-1/source.mp4',
    });
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'video-1' },
      data: {
        mediaProvider: 'doverunner',
        sourceStorageBucket: 'input-bucket',
        sourceStorageKey: 'videos/video-1/source.mp4',
        providerStatus: 'UPLOAD_URL_CREATED',
      },
    });
  });

  test('process route submits DoveRunner job and stores provider IDs', async () => {
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: 'video-1',
      title: 'Lecture 1',
      sourceStorageKey: 'videos/video-1/source.mp4',
    });
    mockedProvider.submitProcessing.mockResolvedValue({
      providerJobId: 'job-1',
      providerContentId: 'video-1',
      outputPath: 'videos/video-1/',
      status: 'QUEUED',
    });

    const response = await processPost(jsonRequest('http://localhost/api/video/process', { videoId: 'video-1' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'video-1' },
      data: {
        providerJobId: 'job-1',
        providerContentId: 'video-1',
        providerStatus: 'QUEUED',
        outputStoragePath: 'videos/video-1/',
        providerSyncedAt: expect.any(Date),
      },
    });
    expect(body).toMatchObject({ success: true, providerJobId: 'job-1' });
  });

  test('sync route publishes video when DoveRunner job is ready', async () => {
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: 'video-1',
      providerJobId: 'job-1',
      providerContentId: 'video-1',
    });
    mockedProvider.syncProcessing.mockResolvedValue({
      status: 'READY',
      ready: true,
      dashUrl: 'https://cdn.example.test/output/videos/video-1/manifest.mpd',
      hlsUrl: 'https://cdn.example.test/output/videos/video-1/master.m3u8',
    });

    const response = await syncPost(jsonRequest('http://localhost/api/video/sync', { videoId: 'video-1' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'video-1' },
      data: {
        providerStatus: 'READY',
        providerSyncedAt: expect.any(Date),
        dashUrl: 'https://cdn.example.test/output/videos/video-1/manifest.mpd',
        hlsUrl: 'https://cdn.example.test/output/videos/video-1/master.m3u8',
        published: true,
      },
    });
    expect(body).toMatchObject({ success: true, status: 'READY', updated: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/api/doverunner-media-routes.test.ts --runInBand
```

Expected: fail because routes still use Azure/Axinom fields.

- [ ] **Step 3: Update upload route**

Replace provider-specific upload logic in `src/app/api/upload/presigned/route.ts` with this route body structure:

```ts
import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { activeMediaProvider } from '@/lib/media-provider';

const uploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  courseId: z.string().min(1),
  title: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) return new NextResponse('Unauthorized', { status: 401 });
  if (session.user.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });

  try {
    const validationResult = uploadSchema.safeParse(await request.json());

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { filename, contentType, courseId, title } = validationResult.data;
    const course = await prisma.course.findUnique({ where: { id: courseId } });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const video = await prisma.video.create({
      data: {
        title: title || filename,
        courseId,
        published: false,
      },
    });
    const upload = await activeMediaProvider.createUploadUrl({
      videoId: video.id,
      filename,
      contentType,
    });

    await prisma.video.update({
      where: { id: video.id },
      data: {
        mediaProvider: activeMediaProvider.name,
        sourceStorageBucket: upload.sourceBucket,
        sourceStorageKey: upload.sourceKey,
        providerStatus: 'UPLOAD_URL_CREATED',
      },
    });

    return NextResponse.json({
      signedUrl: upload.uploadUrl,
      videoId: video.id,
      key: upload.sourceKey,
    });
  } catch (error) {
    console.error('Error generating signed URL:', error instanceof Error ? error.message : 'UnknownError');
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
```

- [ ] **Step 4: Update process route**

Replace Axinom-specific logic in `src/app/api/video/process/route.ts` with:

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { activeMediaProvider } from '@/lib/media-provider';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { videoId } = await request.json();

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const video = await prisma.video.findUnique({ where: { id: videoId } });

    if (!video || !video.sourceStorageKey) {
      return NextResponse.json({ error: 'Video not found or missing source storage key' }, { status: 404 });
    }

    const result = await activeMediaProvider.submitProcessing({
      videoId: video.id,
      title: video.title,
      sourceKey: video.sourceStorageKey,
    });

    await prisma.video.update({
      where: { id: videoId },
      data: {
        providerJobId: result.providerJobId,
        providerContentId: result.providerContentId,
        providerStatus: result.status,
        outputStoragePath: result.outputPath,
        providerSyncedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      provider: activeMediaProvider.name,
      providerJobId: result.providerJobId,
      providerContentId: result.providerContentId,
      status: result.status,
    });
  } catch (error) {
    console.error('Processing error:', error instanceof Error ? error.message : 'UnknownError');
    return NextResponse.json({ error: 'Video processing submission failed' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Update sync route**

Replace Axinom sync in `src/app/api/video/sync/route.ts` with:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activeMediaProvider } from '@/lib/media-provider';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { videoId } = await request.json();

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
    }

    const video = await prisma.video.findUnique({ where: { id: videoId } });

    if (!video) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    if (!video.providerJobId || !video.providerContentId) {
      return NextResponse.json({ success: false, error: 'No provider job found' }, { status: 404 });
    }

    const result = await activeMediaProvider.syncProcessing({
      videoId: video.id,
      providerJobId: video.providerJobId,
      providerContentId: video.providerContentId,
    });

    await prisma.video.update({
      where: { id: videoId },
      data: {
        providerStatus: result.status,
        providerSyncedAt: new Date(),
        ...(result.ready
          ? {
              dashUrl: result.dashUrl,
              hlsUrl: result.hlsUrl,
              published: true,
            }
          : {}),
      },
    });

    return NextResponse.json({
      success: true,
      status: result.status,
      updated: result.ready,
      dashUrl: result.dashUrl,
      hlsUrl: result.hlsUrl,
    });
  } catch (error) {
    console.error('Status sync error:', error instanceof Error ? error.message : 'UnknownError');
    return NextResponse.json({ success: false, error: 'Video status sync failed' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Remove obsolete clear encode test**

Delete or rewrite `__tests__/api/video-process-clear-encode.test.ts`. If deleting, run:

```bash
git rm __tests__/api/video-process-clear-encode.test.ts
```

Expected: Axinom clear encode test removed because clear fallback is not part of new DoveRunner design.

- [ ] **Step 7: Run route tests**

```bash
npm test -- __tests__/api/doverunner-media-routes.test.ts --runInBand
npm run typecheck
```

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/upload/presigned/route.ts src/app/api/video/process/route.ts src/app/api/video/sync/route.ts __tests__/api/doverunner-media-routes.test.ts __tests__/api/video-process-clear-encode.test.ts
git commit -m "feat: route media processing through DoveRunner"
```

## Task 6: DRM Token Route And Shaka Header Migration

**Files:**
- Create: `src/lib/shaka-drm.ts`
- Modify: `src/app/api/drm/token/route.ts`
- Modify: `src/hooks/player/useShakaPlayer.ts`
- Modify: `src/components/video/DRMPlayerWrapper.tsx`
- Modify: `src/app/watch/[videoId]/page.tsx`
- Test: `__tests__/lib/shaka-drm.test.ts`
- Modify: `__tests__/api/media-routes.test.ts`
- Modify: `__tests__/hooks/use-shaka-player.test.tsx`

- [ ] **Step 1: Write Shaka helper test**

Create `__tests__/lib/shaka-drm.test.ts`:

```ts
import {
  attachDoveRunnerLicenseTokenHeader,
  resolveDoveRunnerLicenseServerUrl,
  shouldAttachLicenseToken,
} from '@/lib/shaka-drm';

describe('provider-neutral Shaka DRM helpers', () => {
  test('resolves DoveRunner license URL from env or default', () => {
    expect(resolveDoveRunnerLicenseServerUrl('widevine', {}, undefined))
      .toBe('https://drm-license.doverunner.com/ri/licenseManager.do');
    expect(resolveDoveRunnerLicenseServerUrl('playready', { NEXT_PUBLIC_DOVERUNNER_LICENSE_URL: 'https://license.example' }, undefined))
      .toBe('https://license.example');
  });

  test('attaches DoveRunner custom data header only when token exists', () => {
    const request = { headers: {} as Record<string, string> };
    attachDoveRunnerLicenseTokenHeader(request, 'token-1');
    expect(request.headers['pallycon-customdata-v2']).toBe('token-1');
  });

  test('detects license request type', () => {
    expect(shouldAttachLicenseToken(1, 1, 'token')).toBe(true);
    expect(shouldAttachLicenseToken(2, 1, 'token')).toBe(false);
    expect(shouldAttachLicenseToken(1, 1, '')).toBe(false);
  });
});
```

- [ ] **Step 2: Update existing route/player tests expectation**

In `__tests__/api/media-routes.test.ts`, change mock import from Axinom to media provider and final test to:

```ts
jest.mock('@/lib/media-provider', () => ({
  activeMediaProvider: {
    createLicenseToken: jest.fn(() => 'doverunner-token'),
  },
}));
```

Update assertion:

```ts
expect(body.token).toBe('doverunner-token');
expect(mockedActiveMediaProvider.createLicenseToken).toHaveBeenCalledWith({
  contentId: 'content-video-1',
  userId: 'user-1',
  drmType: 'widevine',
  ttlSeconds: 300,
});
```

Set authorized entitlement video object to:

```ts
video: { id: 'video-1', providerContentId: 'content-video-1' }
```

In `__tests__/hooks/use-shaka-player.test.tsx`, update request header assertion:

```ts
expect(request.headers['pallycon-customdata-v2']).toBe('fresh-token');
expect(request.headers['X-AxDRM-Message']).toBeUndefined();
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/shaka-drm.test.ts __tests__/api/media-routes.test.ts __tests__/hooks/use-shaka-player.test.tsx --runInBand
```

Expected: fail because implementation still sends Axinom header/token.

- [ ] **Step 4: Add provider-neutral Shaka helper**

Create `src/lib/shaka-drm.ts`:

```ts
import type { DrmType } from './media-provider/types';

const DOVERUNNER_LICENSE_URL_DEFAULT = 'https://drm-license.doverunner.com/ri/licenseManager.do';

type Env = Record<string, string | undefined>;

export function resolveDoveRunnerLicenseServerUrl(
  _drmType: DrmType | undefined,
  env: Env = process.env,
  fallbackUrl?: string
) {
  return env.NEXT_PUBLIC_DOVERUNNER_LICENSE_URL?.trim() || fallbackUrl || DOVERUNNER_LICENSE_URL_DEFAULT;
}

type ShakaRequest = {
  headers: Record<string, string>;
};

export function shouldAttachLicenseToken(
  requestType: number,
  licenseRequestType: number,
  token?: string
) {
  return Boolean(token) && requestType === licenseRequestType;
}

export function attachDoveRunnerLicenseTokenHeader(request: ShakaRequest, token: string) {
  request.headers['pallycon-customdata-v2'] = token;
}
```

- [ ] **Step 5: Update DRM token route**

Modify `src/app/api/drm/token/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  evaluateMediaEntitlement,
  mapMediaEntitlementToHttp,
} from '@/lib/media-entitlement';
import { serverLog } from '@/lib/server-log';
import { activeMediaProvider } from '@/lib/media-provider';
import type { DrmType } from '@/lib/media-provider/types';

function isDrmType(value: unknown): value is DrmType {
  return value === 'widevine' || value === 'playready' || value === 'fairplay';
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { videoId, drmType = 'widevine' } = await req.json();

    if (!isDrmType(drmType)) {
      return new NextResponse('Unsupported DRM type', { status: 400 });
    }

    const entitlement = await evaluateMediaEntitlement({
      session,
      videoId,
      checkViewLimit: true,
    });

    if (!entitlement.allowed) {
      const denial = mapMediaEntitlementToHttp(entitlement);
      return new NextResponse(denial.body, { status: denial.status });
    }

    const contentId = entitlement.video.providerContentId || entitlement.video.id;

    if (!contentId) {
      return new NextResponse('Video not found or not encrypted', { status: 404 });
    }

    const token = activeMediaProvider.createLicenseToken({
      contentId,
      userId: entitlement.user.id,
      drmType,
      ttlSeconds: Number(process.env.DOVERUNNER_LICENSE_TOKEN_TTL_SECONDS ?? 300),
    });

    return NextResponse.json({ token });
  } catch (error) {
    serverLog.error('DRM token generation error', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
```

- [ ] **Step 6: Update Shaka hook**

In `src/hooks/player/useShakaPlayer.ts`, replace Axinom helper imports and header call with:

```ts
import {
  attachDoveRunnerLicenseTokenHeader,
  resolveDoveRunnerLicenseServerUrl,
  shouldAttachLicenseToken,
} from '@/lib/shaka-drm';
```

Replace license URL calls:

```ts
resolveDoveRunnerLicenseServerUrl('widevine', process.env, licenseServerUrl)
resolveDoveRunnerLicenseServerUrl('playready', process.env, licenseServerUrl)
resolveDoveRunnerLicenseServerUrl('fairplay', process.env, licenseServerUrl)
```

Replace fetch body:

```ts
body: JSON.stringify({ videoId: 'video-1', drmType })
```

Use actual `videoId` variable:

```ts
body: JSON.stringify({ videoId, drmType })
```

Replace header apply block:

```ts
if (
  shouldAttachLicenseToken(
    type,
    shaka.net.NetworkingEngine.RequestType.LICENSE,
    message
  )
) {
  attachDoveRunnerLicenseTokenHeader(request, message);
}
```

- [ ] **Step 7: Update player wrapper**

In `src/components/video/DRMPlayerWrapper.tsx`, replace `resolveAxinomLicenseServerUrl` import with:

```ts
import { resolveDoveRunnerLicenseServerUrl } from '@/lib/shaka-drm';
```

Replace player prop:

```tsx
licenseServerUrl={resolveDoveRunnerLicenseServerUrl(drmConfig.drmType)}
```

- [ ] **Step 8: Update watch page FairPlay flag**

In `src/app/watch/[videoId]/page.tsx`, replace Axinom env check:

```tsx
isFairPlayConfigured={Boolean(process.env.DOVERUNNER_FAIRPLAY_CERT_URL)}
```

Remove any `generateAxinomToken` import from the watch page if present. The initial token can be empty or generated via the same `/api/drm/token` path after player init.

- [ ] **Step 9: Run tests**

```bash
npm test -- __tests__/lib/shaka-drm.test.ts __tests__/api/media-routes.test.ts __tests__/hooks/use-shaka-player.test.tsx --runInBand
npm run typecheck
```

Expected: pass.

- [ ] **Step 10: Commit**

```bash
git add src/lib/shaka-drm.ts src/app/api/drm/token/route.ts src/hooks/player/useShakaPlayer.ts src/components/video/DRMPlayerWrapper.tsx src/app/watch/[videoId]/page.tsx __tests__/lib/shaka-drm.test.ts __tests__/api/media-routes.test.ts __tests__/hooks/use-shaka-player.test.tsx
git commit -m "feat: use DoveRunner DRM tokens in playback"
```

## Task 7: Admin UI Provider Labels

**Files:**
- Modify: `src/app/admin/videos/page.tsx`
- Modify: `src/lib/translations.ts`
- Test: `__tests__/docs/provider-zero-setup.test.ts` only if it asserts old text

- [ ] **Step 1: Update admin video type**

In `src/app/admin/videos/page.tsx`, add fields to `type Video`:

```ts
mediaProvider: string | null;
providerContentId: string | null;
providerJobId: string | null;
providerStatus: string | null;
sourceStorageKey: string | null;
outputStoragePath: string | null;
providerSyncedAt: string | null;
```

- [ ] **Step 2: Replace Axinom ID display helpers**

Replace `getLegacyAxinomId`, `getPrimaryAxinomId`, and Axinom table labels with:

```ts
const getProviderId = (video: Video) => video.providerContentId || video.providerJobId || 'N/A';

const isReadyStatus = (statusValue: string | null) =>
  statusValue === 'READY' || statusValue === 'COMPLETED' || statusValue === 'Finished';
```

Change table header:

```tsx
<th className="p-4 font-medium">Provider ID</th>
```

Change provider ID cell:

```tsx
<div>{getProviderId(video)}</div>
{video.providerJobId && (
  <div>job: {video.providerJobId}</div>
)}
```

Change status checks:

```ts
const drmReady = Boolean(video.dashUrl && video.hlsUrl) || isReadyStatus(video.providerStatus);
const canUpdateStatus = Boolean(video.providerJobId);
```

Change status badge value:

```tsx
{video.providerStatus}
```

Change sync button title:

```tsx
title="Update provider status and sync manifest URLs"
```

- [ ] **Step 3: Replace upload text**

Change upload status strings:

```ts
setStatus('Uploading to S3...');
setStatus('Upload and DoveRunner processing started successfully!');
```

Change dialog description:

```tsx
<DialogDescription>
  Upload a new video to AWS S3 and submit it to DoveRunner T&P
</DialogDescription>
```

- [ ] **Step 4: Run focused checks**

```bash
npm run typecheck
npm run lint
```

Expected: pass with only inherited warnings if any.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/videos/page.tsx src/lib/translations.ts
git commit -m "feat: show provider-neutral media status"
```

## Task 8: Verification Scripts And Documentation

**Files:**
- Create: `scripts/verify-doverunner-setup.ts`
- Modify: `package.json`
- Modify: `docs/env-matrix.md`
- Create: `docs/doverunner-setup.md`
- Create: `docs/doverunner-staging-checklist.md`
- Modify: `docs/operations/subsystems.md`
- Modify: `docs/operations/vendor-upgrades.md`
- Modify: `docs/staging-smoke-checklist.md`
- Test: `__tests__/env/env-matrix.test.ts`
- Test: `__tests__/docs/staging-docs.test.ts`
- Test: `__tests__/docs/operations-docs.test.ts`

- [ ] **Step 1: Write verifier skeleton test**

Add to `__tests__/scripts/package-scripts.test.ts`:

```ts
test('package scripts include DoveRunner verification', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  expect(packageJson.scripts['verify:doverunner']).toBe('tsx scripts/verify-doverunner-setup.ts');
});
```

- [ ] **Step 2: Add verifier script**

Create `scripts/verify-doverunner-setup.ts`:

```ts
import d from 'dotenv';
import path from 'path';
import { readDoveRunnerConfig } from '../src/lib/media-provider/doverunner-env';

d.config({ path: path.resolve(process.cwd(), '.env') });
d.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

async function main() {
  const strict = process.argv.includes('--strict') || process.env.CI === 'true';
  const live = process.argv.includes('--live');

  console.log('========================================');
  console.log('Verifying DoveRunner Configuration');
  console.log('========================================');

  try {
    const config = readDoveRunnerConfig(process.env);
    console.log('OK DoveRunner env validation passed');
    console.log(`OK Provider: DoveRunner T&P / Multi-DRM`);
    console.log(`OK AWS region configured: ${config.awsRegion}`);
    console.log(`OK Input bucket configured: ${config.awsInputBucket}`);
    console.log(`OK Output bucket configured: ${config.awsOutputBucket}`);
  } catch (error) {
    if (strict) {
      throw error;
    }

    console.warn(`WARN DoveRunner env validation incomplete: ${error instanceof Error ? error.message : 'unknown error'}`);
    return;
  }

  if (!live) {
    console.log('SKIP live DoveRunner API checks. Re-run with --live after configuring a DoveRunner account.');
    return;
  }

  const response = await fetch(`${process.env.DOVERUNNER_TNP_API_BASE_URL || 'https://tnp.doverunner.com'}/api/token/${process.env.DOVERUNNER_SITE_ID}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.DOVERUNNER_TNP_ACCOUNT_ID}:${process.env.DOVERUNNER_TNP_ACCESS_KEY}`).toString('base64')}`,
    },
  });

  console.log(`OK DoveRunner token endpoint returned HTTP ${response.status}`);

  if (!response.ok) {
    throw new Error(`DoveRunner live token endpoint failed with HTTP ${response.status}`);
  }
}

main().catch((error) => {
  console.error(`FAIL verify:doverunner: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exit(1);
});
```

- [ ] **Step 3: Add package script**

In `package.json`, add:

```json
"verify:doverunner": "tsx scripts/verify-doverunner-setup.ts"
```

Keep `verify:axinom` for one transition commit only if tests/docs still reference it; otherwise remove it in Task 9 cleanup.

- [ ] **Step 4: Update env matrix**

In `docs/env-matrix.md`, replace Axinom rows with DoveRunner rows:

```md
| DoveRunner | DOVERUNNER_SITE_ID | operational secret | optional | required | src/lib/media-provider/doverunner-env.ts | DoveRunner site ID for T&P and Multi-DRM. |
| DoveRunner | DOVERUNNER_ACCESS_KEY | server secret | optional | required | src/lib/media-provider/doverunner-token.ts | Site access key used for license token policy encryption and hash generation. |
| DoveRunner | DOVERUNNER_LICENSE_URL | public | optional | required | src/lib/shaka-drm.ts | DoveRunner license endpoint. Default is https://drm-license.doverunner.com/ri/licenseManager.do. |
| DoveRunner | DOVERUNNER_TNP_ACCOUNT_ID | operational secret | optional | required | src/lib/media-provider/doverunner.ts | T&P API account identifier. |
| DoveRunner | DOVERUNNER_TNP_ACCESS_KEY | server secret | optional | required | src/lib/media-provider/doverunner.ts | T&P API access key. |
| DoveRunner | DOVERUNNER_TNP_INPUT_STORAGE_ID | operational secret | optional | required | src/lib/media-provider/doverunner.ts | DoveRunner-registered AWS S3 input storage ID. |
| DoveRunner | DOVERUNNER_TNP_OUTPUT_STORAGE_ID | operational secret | optional | required | src/lib/media-provider/doverunner.ts | DoveRunner-registered AWS S3 output storage ID. |
| DoveRunner | DOVERUNNER_TNP_API_BASE_URL | public | optional | required | src/lib/media-provider/doverunner-env.ts | DoveRunner T&P API base URL. |
| DoveRunner | DOVERUNNER_OUTPUT_BASE_URL | public | optional | required | src/lib/media-provider/doverunner.ts | CDN or S3 output base URL for manifests. |
| DoveRunner | DOVERUNNER_FAIRPLAY_CERT_URL | operational secret | optional | optional | src/app/api/drm/fairplay-cert/route.ts | FairPlay certificate URL used only after DoveRunner FPS setup is complete. |
| Storage | AWS_REGION | public | optional | required | src/lib/media-provider/aws-s3.ts | AWS region for source and output buckets. |
| Storage | AWS_S3_INPUT_BUCKET | operational secret | optional | required | src/lib/media-provider/aws-s3.ts | Private bucket for source uploads. |
| Storage | AWS_S3_OUTPUT_BUCKET | operational secret | optional | required | src/lib/media-provider/doverunner.ts | Bucket where DoveRunner writes packaged output. |
| Storage | AWS_ACCESS_KEY_ID | operational secret | optional | required | src/lib/media-provider/aws-s3.ts | AWS access key ID for upload signing. |
| Storage | AWS_SECRET_ACCESS_KEY | server secret | optional | required | src/lib/media-provider/aws-s3.ts | AWS secret access key for upload signing. |
```

- [ ] **Step 5: Create DoveRunner setup doc**

Create `docs/doverunner-setup.md` with sections:

```md
# DoveRunner T&P And Multi-DRM Setup

This guide maps DoveRunner T&P, Multi-DRM, and AWS S3 to this repository. Real credentials belong only in local `.env.local` or encrypted staging environment settings.

## Official Sources

- DoveRunner Multi-DRM Guide: https://docs.doverunner.com/content-security/multi-drm/
- DRM License Issuance: https://docs.doverunner.com/content-security/multi-drm/license/
- License Token Guide: https://docs.doverunner.com/content-security/multi-drm/license/license-token/
- HTML5 Player Integration Guide: https://docs.doverunner.com/content-security/multi-drm/clients/html5-player/
- T&P Service Guide: https://docs.doverunner.com/content-security/tnp/tnp-service-guide/
- T&P API Guide: https://docs.doverunner.com/content-security/tnp/tnp-api-guide/

## Repo Flow

1. Admin uploads source video to AWS S3 through `/api/upload/presigned`.
2. Admin submits a DoveRunner T&P job through `/api/video/process`.
3. Admin syncs job status through `/api/video/sync`.
4. Watch page authorizes learner access through `src/lib/media-entitlement.ts`.
5. `/api/drm/token` creates a short-lived DoveRunner license token.
6. Shaka sends `pallycon-customdata-v2` only on license requests.
7. DoveRunner issues a DRM license when token and packaged content ID match.

## Required DoveRunner Values

Use `docs/env-matrix.md` as source of truth for variable names.

## AWS S3 Setup

Use one private input bucket and one output bucket or output prefix. Register both buckets in DoveRunner T&P storage settings and store the returned storage IDs in staging env.

## FairPlay

FairPlay is not accepted until DoveRunner FPS setup is complete and `DOVERUNNER_FAIRPLAY_CERT_URL` is configured. Safari DRM playback is blocked before that.

## Verification

Run:

```bash
npm run verify:doverunner -- --strict
npm run verify:doverunner -- --strict --live
```

Live verification must not print access keys, license tokens, policies, content keys, or certificate bytes.
```

- [ ] **Step 6: Create staging checklist**

Create `docs/doverunner-staging-checklist.md`:

```md
# DoveRunner Staging Checklist

## 1. Account And Storage

- DoveRunner site ID and access key available to staging owner.
- T&P API account ID and access key configured in encrypted env.
- AWS S3 input bucket exists and denies public reads.
- AWS S3 output bucket or CDN host is reachable for playback manifests.
- DoveRunner T&P input and output storage IDs are configured.

## 2. Upload And Processing

- Admin uploads one small MP4.
- Source object appears under a path like `videos/665f1a111111111111111111/source.mp4`.
- `/api/video/process` returns a DoveRunner provider job ID.
- DoveRunner console shows queued or progressing job.
- `/api/video/sync` updates provider status.

## 3. Playback

- Completed job writes DASH and HLS output.
- Video row has `dashUrl`, `hlsUrl`, `providerContentId`, `providerJobId`, and `providerStatus=READY`.
- Entitled learner can open a route like `/watch/665f1a111111111111111111`.
- `/api/drm/token` returns a token only after entitlement passes.
- Browser sends `pallycon-customdata-v2` only on license requests.
- Playback advances in Chrome or Edge.

## 4. Denial Checks

- Unauthenticated user cannot access watch page.
- Unentitled user cannot mint a DoveRunner license token.
- License token, site access key, AWS keys, and policy plaintext are absent from logs.
```

- [ ] **Step 7: Update operations docs**

Update `docs/operations/subsystems.md`, `docs/operations/vendor-upgrades.md`, and `docs/staging-smoke-checklist.md` so active DRM/video processing provider is DoveRunner, not Axinom. Keep historical Axinom notes only under migration history.

- [ ] **Step 8: Run docs and env tests**

```bash
npm test -- __tests__/scripts/package-scripts.test.ts __tests__/env/env-matrix.test.ts __tests__/docs/staging-docs.test.ts __tests__/docs/operations-docs.test.ts --runInBand
npm run verify:doverunner
```

Expected: tests pass; verifier prints warnings only when not strict and env is absent.

- [ ] **Step 9: Commit**

```bash
git add scripts/verify-doverunner-setup.ts package.json docs/env-matrix.md docs/doverunner-setup.md docs/doverunner-staging-checklist.md docs/operations/subsystems.md docs/operations/vendor-upgrades.md docs/staging-smoke-checklist.md __tests__/scripts/package-scripts.test.ts __tests__/env/env-matrix.test.ts __tests__/docs/staging-docs.test.ts __tests__/docs/operations-docs.test.ts
git commit -m "docs: document DoveRunner media pipeline"
```

## Task 9: Axinom Deactivation And Final Verification

**Files:**
- Modify: `package.json`
- Modify: `scripts/verify-services.ts`
- Modify: `docs/axinom-setup.md`
- Modify: `docs/axinom-staging-checklist.md`
- Modify: tests that still import Axinom helpers
- Delete only if no imports remain: `src/lib/shaka-axinom.ts`, `src/lib/axinom.ts`, `src/lib/axinom-video-service.ts`, `src/lib/axinom-sync.ts`, `src/lib/axinom-env.ts`, `src/lib/axinom-encoding.ts`

- [ ] **Step 1: Find remaining active Axinom imports**

Run:

```bash
rg -n "axinom|Axinom|X-AxDRM|AXINOM|AX_" src __tests__ scripts docs package.json -g '!docs/superpowers/**'
```

Expected: remaining references are migration history or files to remove in this task.

- [ ] **Step 2: Remove obsolete package script if unused**

If no active test or docs references `verify:axinom`, remove this line from `package.json`:

```json
"verify:axinom": "tsx scripts/verify-axinom-setup.ts"
```

Do not remove scripts that are still used by existing docs until docs are updated in the same commit.

- [ ] **Step 3: Update `scripts/verify-services.ts` service group**

Change required group:

```ts
'DoveRunner',
```

Remove:

```ts
'Axinom',
```

- [ ] **Step 4: Quarantine or delete Axinom code**

If `rg` shows no active imports from Axinom files, delete with git:

```bash
git rm src/lib/shaka-axinom.ts src/lib/axinom.ts src/lib/axinom-video-service.ts src/lib/axinom-sync.ts src/lib/axinom-env.ts src/lib/axinom-encoding.ts scripts/verify-axinom-setup.ts
```

If any import remains, update the import to DoveRunner or provider-neutral helper before deleting.

- [ ] **Step 5: Update Axinom docs to historical note**

Replace `docs/axinom-setup.md` and `docs/axinom-staging-checklist.md` with short migration notes:

```md
# Axinom Deprecated

Axinom was the previous DRM and encoding provider. The account expired and cannot be extended. The active media pipeline is DoveRunner T&P, DoveRunner Multi-DRM, and AWS S3.

Use:

- `docs/doverunner-setup.md`
- `docs/doverunner-staging-checklist.md`
- `docs/env-matrix.md`
```

- [ ] **Step 6: Run full local verification**

Run:

```bash
npm test -- --runInBand
npm run typecheck
npm run lint
npm run verify:services
npm run verify:doverunner
```

Expected:

- Jest passes.
- Typecheck passes.
- Lint passes or only inherited warnings remain.
- `verify:services` passes in non-strict local mode or reports only documented missing local env.
- `verify:doverunner` passes in non-strict local mode without live calls.

- [ ] **Step 7: Commit**

```bash
git add package.json scripts/verify-services.ts docs/axinom-setup.md docs/axinom-staging-checklist.md src/lib scripts __tests__ docs
git commit -m "chore: deactivate Axinom media pipeline"
```

## Task 10: Manual Staging Evidence

**Files:**
- Modify: `docs/doverunner-staging-checklist.md`
- Modify: `docs/staging-smoke-checklist.md`

- [ ] **Step 1: Run live verifier only with real staging credentials**

Run:

```bash
npm run verify:doverunner -- --strict --live
```

Expected: token endpoint returns HTTP 200. Do not paste response token into docs or chat.

- [ ] **Step 2: Upload and process a small MP4**

Use the admin UI:

1. Open `/admin/videos`.
2. Upload a small MP4.
3. Confirm the source object exists in `AWS_S3_INPUT_BUCKET`.
4. Click processing action if upload flow does not auto-submit.
5. Record only video row ID and provider job ID.

- [ ] **Step 3: Sync and verify output**

Use admin UI `Update Status` until the video row shows `READY`.

Record sanitized evidence:

```md
- Video row ID: 665f1a111111111111111111
- DoveRunner job status: READY
- DASH manifest HTTP status: 200
- HLS manifest HTTP status: 200
- Browser DRM: Widevine or PlayReady
- License request header observed: pallycon-customdata-v2 present
- Segment requests: pallycon-customdata-v2 absent
```

Replace the sample video row ID with the real non-secret video row ID and keep all evidence limited to IDs and HTTP statuses.

- [ ] **Step 4: Verify denied user**

Sign out or use an unentitled account:

1. Open a route like `/watch/665f1a111111111111111111`.
2. Call `/api/drm/token` through the app path.
3. Confirm token request returns 401 or 403.

Record:

```md
- Denied token status: 401 or 403
- Denied playback result: blocked before license issuance
```

- [ ] **Step 5: Update checklist**

Append sanitized result rows to `docs/doverunner-staging-checklist.md` and `docs/staging-smoke-checklist.md`.

- [ ] **Step 6: Commit**

```bash
git add docs/doverunner-staging-checklist.md docs/staging-smoke-checklist.md
git commit -m "docs: record DoveRunner staging smoke evidence"
```

## Final Gate

Run:

```bash
npm test -- --runInBand
npm run typecheck
npm run lint
npm run build
npm run verify:services
npm run verify:doverunner
```

If real credentials are configured, also run:

```bash
npm run verify:doverunner -- --strict --live
```

Acceptance:

- Axinom env vars are not required by local/staging verification.
- Upload uses AWS S3 presigned PUT.
- Processing and sync use DoveRunner T&P.
- DRM token route uses DoveRunner token generation after entitlement.
- Shaka sends `pallycon-customdata-v2` only on license requests.
- Docs identify DoveRunner/AWS S3 as active media pipeline.
- No secret values, license tokens, token policy plaintext, content keys, AWS secrets, or FairPlay certificate bytes appear in code, docs, logs, or tests.
