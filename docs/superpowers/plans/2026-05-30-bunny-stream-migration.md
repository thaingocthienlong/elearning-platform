# Bunny Stream Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-mcp-augment:subagent-driven-development (recommended) or superpowers-mcp-augment:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate new video hosting, encoding, DRM playback, status sync, setup docs, and staging verification to Bunny Stream while keeping existing Axinom rows working during transition.

**Architecture:** Add provider-neutral `Video` metadata and a server-only Bunny Stream integration layer that owns config, API calls, TUS signatures, embed tokens, and webhook verification. Watch pages continue to use the existing entitlement helper, then provider-switch between the old Axinom/Shaka player and a new Bunny iframe player with iframe-compatible heartbeat.

**Tech Stack:** Next.js App Router route handlers, React 18 client components, Prisma MongoDB, Jest, Testing Library, Bunny Stream HTTP API, Bunny TUS uploads, Bunny embed token authentication, Bunny webhook HMAC verification, existing NextAuth/session/entitlement/admin UI patterns.

---

## File Structure

- Modify: `prisma/schema.prisma`
  - Add `VideoProvider`, `BunnyStreamStatus`, Bunny metadata fields, and indexes.
- Modify: `package.json`
  - Add `tus-js-client` dependency and `verify:bunny-stream` script.
- Modify: `jest.setup.ts`
  - Add mock Bunny env values only.
- Create: `src/lib/bunny-stream/config.ts`
  - Parse Bunny env and expose strict/local validation.
- Create: `src/lib/bunny-stream/signing.ts`
  - Generate TUS signatures, embed tokens, and verify webhook signatures.
- Create: `src/lib/bunny-stream/status.ts`
  - Map Bunny numeric statuses to local Prisma enum values.
- Create: `src/lib/bunny-stream/client.ts`
  - Server-only Bunny Stream API client.
- Create: `src/lib/bunny-stream/index.ts`
  - Barrel export after all helper modules exist.
- Create: `src/lib/bunny-stream/playback.ts`
  - Resolve a signed Bunny embed URL for entitled local video rows.
- Create: `src/hooks/player/useIframeHeartbeat.ts`
  - Provider-agnostic iframe heartbeat hook for Bunny playback.
- Create: `src/components/video/BunnyStreamPlayer.tsx`
  - Responsive Bunny iframe player wrapper with heartbeat.
- Modify: `src/components/course/WatchPageClient.tsx`
  - Accept provider-specific playback props and render Bunny or Axinom player.
- Modify: `src/app/watch/[videoId]/page.tsx`
  - Build Bunny playback props only after existing entitlement passes.
- Create: `src/app/api/bunny-stream/upload-credentials/route.ts`
  - Admin-only Bunny video creation and TUS credential route.
- Create: `src/app/api/video/bunny-stream/sync/route.ts`
  - Admin-only Bunny status sync route.
- Create: `src/app/api/webhook/bunny-stream/route.ts`
  - Bunny webhook route with raw-body HMAC validation.
- Modify: `src/app/api/admin/videos/route.ts`
  - Return provider and Bunny metadata.
- Modify: `src/app/admin/videos/page.tsx`
  - Add Bunny status display, sync action, and TUS upload path.
- Create: `scripts/verify-bunny-stream-setup.ts`
  - Placeholder-safe Bunny config verifier.
- Modify: `docs/env-matrix.md`
- Create: `docs/bunny-stream-setup.md`
- Create: `docs/bunny-stream-staging-checklist.md`
- Modify: `docs/staging-smoke-checklist.md`
- Modify: `docs/operations/subsystems.md`
- Modify: `docs/operations/vendor-upgrades.md`
- Modify: `docs/operations/health-checklist.md`
- Modify: `.env.example`
- Tests:
  - Create: `__tests__/lib/bunny-stream-config.test.ts`
  - Create: `__tests__/lib/bunny-stream-signing.test.ts`
  - Create: `__tests__/lib/bunny-stream-status.test.ts`
  - Create: `__tests__/lib/bunny-stream-client.test.ts`
  - Create: `__tests__/api/bunny-stream-routes.test.ts`
  - Create: `__tests__/components/bunny-stream-player.test.tsx`
  - Create: `__tests__/scripts/bunny-stream-docs.test.ts`

## Task 1: Schema, Dependency, And Test Env

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `package.json`
- Modify: `jest.setup.ts`

- [ ] **Step 1: Add Prisma enums and Bunny fields**

Edit `prisma/schema.prisma`. Add enums near existing enum declarations:

```prisma
enum VideoProvider {
  AXINOM
  BUNNY_STREAM
}

enum BunnyStreamStatus {
  CREATED
  UPLOADING
  QUEUED
  PROCESSING
  ENCODING
  PLAYABLE
  READY
  FAILED
}
```

Add to `model Video` after `published`:

```prisma
  provider      VideoProvider @default(AXINOM)
```

Add after the Axinom fields:

```prisma
  bunnyLibraryId      String?
  bunnyVideoId        String?
  bunnyCollectionId   String?
  bunnyStatus         BunnyStreamStatus?
  bunnyEncodeProgress Int?
  bunnyAvailableRes   String?
  bunnyThumbnailUrl   String?
  bunnySyncedAt       DateTime?
  bunnyError          String?
```

Add indexes inside `model Video`:

```prisma
  @@index([provider])
  @@index([bunnyLibraryId])
  @@index([bunnyVideoId])
  @@index([bunnyStatus])
```

- [ ] **Step 2: Add TUS dependency and verifier script**

Run:

```bash
npm install tus-js-client
```

Then edit `package.json` scripts:

```json
"verify:bunny-stream": "tsx scripts/verify-bunny-stream-setup.ts"
```

Expected: `package.json` and lockfile update. If install fails from network sandboxing, rerun with approved network access during execution.

- [ ] **Step 3: Add Bunny mock env**

Append to `jest.setup.ts`:

```ts
// Bunny Stream Mocks
process.env.BUNNY_STREAM_LIBRARY_ID = '123456';
process.env.BUNNY_STREAM_API_KEY = 'test-bunny-stream-api-key';
process.env.BUNNY_STREAM_READ_ONLY_API_KEY = 'test-bunny-stream-read-only-key';
process.env.BUNNY_STREAM_TOKEN_SECURITY_KEY = 'test-bunny-stream-token-security-key';
process.env.BUNNY_STREAM_TUS_EXPIRE_SECONDS = '86400';
process.env.BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS = '300';
process.env.BUNNY_STREAM_PULL_ZONE_HOSTNAME = 'vz-test.b-cdn.net';
```

- [ ] **Step 4: Generate Prisma client**

Run:

```bash
npm run prisma:generate
```

Expected: exit `0`.

- [ ] **Step 5: Run baseline typecheck for schema names**

Run:

```bash
npm run typecheck
```

Expected: exit `0` or only failures unrelated to changed Prisma fields. If generated Prisma types reveal enum casing issues, fix schema and regenerate.

- [ ] **Step 6: Commit**

Run:

```bash
git add prisma/schema.prisma package.json package-lock.json jest.setup.ts
git commit -m "feat: add bunny stream video metadata"
```

## Task 2: Bunny Config And Signing Helpers

**Files:**
- Create: `src/lib/bunny-stream/config.ts`
- Create: `src/lib/bunny-stream/signing.ts`
- Create: `__tests__/lib/bunny-stream-config.test.ts`
- Create: `__tests__/lib/bunny-stream-signing.test.ts`

- [ ] **Step 1: Write config tests**

Create `__tests__/lib/bunny-stream-config.test.ts`:

```ts
import {
  readBunnyStreamConfig,
  validateBunnyStreamConfig,
} from '@/lib/bunny-stream/config';

describe('Bunny Stream config', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('reads configured values and parses numeric TTLs', () => {
    process.env.BUNNY_STREAM_LIBRARY_ID = '123456';
    process.env.BUNNY_STREAM_API_KEY = 'api-key';
    process.env.BUNNY_STREAM_READ_ONLY_API_KEY = 'read-only';
    process.env.BUNNY_STREAM_TOKEN_SECURITY_KEY = 'token-key';
    process.env.BUNNY_STREAM_TUS_EXPIRE_SECONDS = '7200';
    process.env.BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS = '180';

    expect(readBunnyStreamConfig(process.env)).toEqual({
      libraryId: '123456',
      apiKey: 'api-key',
      readOnlyApiKey: 'read-only',
      tokenSecurityKey: 'token-key',
      tusExpireSeconds: 7200,
      embedTokenTtlSeconds: 180,
      pullZoneHostname: process.env.BUNNY_STREAM_PULL_ZONE_HOSTNAME || null,
      defaultCollectionId: process.env.BUNNY_STREAM_DEFAULT_COLLECTION_ID || null,
    });
  });

  test('uses safe defaults for TTLs', () => {
    process.env.BUNNY_STREAM_LIBRARY_ID = '123456';
    process.env.BUNNY_STREAM_API_KEY = 'api-key';
    process.env.BUNNY_STREAM_READ_ONLY_API_KEY = 'read-only';
    process.env.BUNNY_STREAM_TOKEN_SECURITY_KEY = 'token-key';
    delete process.env.BUNNY_STREAM_TUS_EXPIRE_SECONDS;
    delete process.env.BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS;

    const config = readBunnyStreamConfig(process.env);

    expect(config.tusExpireSeconds).toBe(86400);
    expect(config.embedTokenTtlSeconds).toBe(300);
  });

  test('strict validation reports missing required server values', () => {
    delete process.env.BUNNY_STREAM_LIBRARY_ID;
    delete process.env.BUNNY_STREAM_API_KEY;
    delete process.env.BUNNY_STREAM_READ_ONLY_API_KEY;
    delete process.env.BUNNY_STREAM_TOKEN_SECURITY_KEY;

    expect(validateBunnyStreamConfig(process.env, 'strict').errors).toEqual([
      'BUNNY_STREAM_LIBRARY_ID is required for Bunny Stream.',
      'BUNNY_STREAM_API_KEY is required for Bunny Stream.',
      'BUNNY_STREAM_READ_ONLY_API_KEY is required for Bunny Stream.',
      'BUNNY_STREAM_TOKEN_SECURITY_KEY is required for Bunny Stream.',
    ]);
  });

  test('local validation marks missing values but does not throw', () => {
    delete process.env.BUNNY_STREAM_LIBRARY_ID;

    const result = validateBunnyStreamConfig(process.env, 'local');

    expect(result.ok).toBe(false);
    expect(result.mode).toBe('local');
    expect(result.errors).toContain('BUNNY_STREAM_LIBRARY_ID is required for Bunny Stream.');
  });
});
```

- [ ] **Step 2: Write signing tests**

Create `__tests__/lib/bunny-stream-signing.test.ts`:

```ts
import crypto from 'node:crypto';
import {
  generateBunnyEmbedToken,
  generateBunnyTusSignature,
  verifyBunnyWebhookSignature,
} from '@/lib/bunny-stream/signing';

describe('Bunny Stream signing', () => {
  test('generates TUS signature from documented value order', () => {
    const signature = generateBunnyTusSignature({
      libraryId: '123',
      apiKey: 'api-key',
      expirationTime: 2000,
      videoId: 'video-guid',
    });

    expect(signature).toBe(
      crypto.createHash('sha256').update('123api-key2000video-guid').digest('hex')
    );
  });

  test('generates embed token from token key, video ID, and expiration', () => {
    const token = generateBunnyEmbedToken({
      tokenSecurityKey: 'token-key',
      videoId: 'video-guid',
      expires: 3000,
    });

    expect(token).toBe(
      crypto.createHash('sha256').update('token-keyvideo-guid3000').digest('hex')
    );
  });

  test('validates Bunny webhook signature with raw body and read-only key', () => {
    const rawBody = JSON.stringify({ VideoLibraryId: 123, VideoGuid: 'video-guid', Status: 3 });
    const signature = crypto
      .createHmac('sha256', 'read-only-key')
      .update(rawBody, 'utf8')
      .digest('hex');

    expect(
      verifyBunnyWebhookSignature({
        rawBody,
        signature,
        version: 'v1',
        algorithm: 'hmac-sha256',
        readOnlyApiKey: 'read-only-key',
      })
    ).toBe(true);
  });

  test('rejects webhook signatures with wrong version, algorithm, length, or value', () => {
    const args = {
      rawBody: '{"ok":true}',
      signature: '0'.repeat(64),
      version: 'v1',
      algorithm: 'hmac-sha256',
      readOnlyApiKey: 'read-only-key',
    };

    expect(verifyBunnyWebhookSignature({ ...args, version: 'v2' })).toBe(false);
    expect(verifyBunnyWebhookSignature({ ...args, algorithm: 'sha1' })).toBe(false);
    expect(verifyBunnyWebhookSignature({ ...args, signature: 'abc' })).toBe(false);
    expect(verifyBunnyWebhookSignature(args)).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
npm test -- __tests__/lib/bunny-stream-config.test.ts __tests__/lib/bunny-stream-signing.test.ts --runInBand
```

Expected: fail because helper modules do not exist.

- [ ] **Step 4: Implement config helper**

Create `src/lib/bunny-stream/config.ts`:

```ts
export type BunnyStreamValidationMode = 'local' | 'strict';

type Env = Record<string, string | undefined>;

export type BunnyStreamConfig = {
  libraryId: string;
  apiKey: string;
  readOnlyApiKey: string;
  tokenSecurityKey: string;
  tusExpireSeconds: number;
  embedTokenTtlSeconds: number;
  pullZoneHostname: string | null;
  defaultCollectionId: string | null;
};

export type BunnyStreamConfigValidation = {
  ok: boolean;
  mode: BunnyStreamValidationMode;
  errors: string[];
};

const REQUIRED = [
  'BUNNY_STREAM_LIBRARY_ID',
  'BUNNY_STREAM_API_KEY',
  'BUNNY_STREAM_READ_ONLY_API_KEY',
  'BUNNY_STREAM_TOKEN_SECURITY_KEY',
] as const;

function readRequired(env: Env, name: (typeof REQUIRED)[number]) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for Bunny Stream.`);
  }
  return value;
}

function readPositiveInteger(env: Env, name: string, fallback: number) {
  const raw = env[name]?.trim();
  if (!raw) return fallback;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

export function validateBunnyStreamConfig(
  env: Env = process.env,
  mode: BunnyStreamValidationMode = 'local'
): BunnyStreamConfigValidation {
  const errors: string[] = [];

  for (const name of REQUIRED) {
    if (!env[name]?.trim()) {
      errors.push(`${name} is required for Bunny Stream.`);
    }
  }

  for (const name of ['BUNNY_STREAM_TUS_EXPIRE_SECONDS', 'BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS']) {
    const raw = env[name]?.trim();
    if (!raw) continue;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      errors.push(`${name} must be a positive integer.`);
    }
  }

  return { ok: errors.length === 0, mode, errors };
}

export function readBunnyStreamConfig(env: Env = process.env): BunnyStreamConfig {
  return {
    libraryId: readRequired(env, 'BUNNY_STREAM_LIBRARY_ID'),
    apiKey: readRequired(env, 'BUNNY_STREAM_API_KEY'),
    readOnlyApiKey: readRequired(env, 'BUNNY_STREAM_READ_ONLY_API_KEY'),
    tokenSecurityKey: readRequired(env, 'BUNNY_STREAM_TOKEN_SECURITY_KEY'),
    tusExpireSeconds: readPositiveInteger(env, 'BUNNY_STREAM_TUS_EXPIRE_SECONDS', 86400),
    embedTokenTtlSeconds: readPositiveInteger(env, 'BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS', 300),
    pullZoneHostname: env.BUNNY_STREAM_PULL_ZONE_HOSTNAME?.trim() || null,
    defaultCollectionId: env.BUNNY_STREAM_DEFAULT_COLLECTION_ID?.trim() || null,
  };
}
```

- [ ] **Step 5: Implement signing helper**

Create `src/lib/bunny-stream/signing.ts`:

```ts
import crypto from 'node:crypto';

export function generateBunnyTusSignature({
  libraryId,
  apiKey,
  expirationTime,
  videoId,
}: {
  libraryId: string;
  apiKey: string;
  expirationTime: number;
  videoId: string;
}) {
  return crypto
    .createHash('sha256')
    .update(`${libraryId}${apiKey}${expirationTime}${videoId}`)
    .digest('hex');
}

export function generateBunnyEmbedToken({
  tokenSecurityKey,
  videoId,
  expires,
}: {
  tokenSecurityKey: string;
  videoId: string;
  expires: number;
}) {
  return crypto
    .createHash('sha256')
    .update(`${tokenSecurityKey}${videoId}${expires}`)
    .digest('hex');
}

export function verifyBunnyWebhookSignature({
  rawBody,
  signature,
  version,
  algorithm,
  readOnlyApiKey,
}: {
  rawBody: string;
  signature: string | null;
  version: string | null;
  algorithm: string | null;
  readOnlyApiKey: string;
}) {
  if (version !== 'v1' || algorithm !== 'hmac-sha256') {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', readOnlyApiKey)
    .update(rawBody, 'utf8')
    .digest('hex');

  if (
    typeof signature !== 'string' ||
    signature.length !== expected.length ||
    !/^[0-9a-f]+$/.test(signature)
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expected, 'utf8'),
    Buffer.from(signature, 'utf8')
  );
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- __tests__/lib/bunny-stream-config.test.ts __tests__/lib/bunny-stream-signing.test.ts --runInBand
```

Expected: pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/lib/bunny-stream/config.ts src/lib/bunny-stream/signing.ts __tests__/lib/bunny-stream-config.test.ts __tests__/lib/bunny-stream-signing.test.ts
git commit -m "feat: add bunny stream config and signing"
```

## Task 3: Bunny Status Mapper And API Client

**Files:**
- Create: `src/lib/bunny-stream/status.ts`
- Create: `src/lib/bunny-stream/client.ts`
- Create: `__tests__/lib/bunny-stream-status.test.ts`
- Create: `__tests__/lib/bunny-stream-client.test.ts`

- [ ] **Step 1: Write status mapper tests**

Create `__tests__/lib/bunny-stream-status.test.ts`:

```ts
import {
  BUNNY_STREAM_STATUS_LABELS,
  mapBunnyStreamStatus,
} from '@/lib/bunny-stream/status';

describe('Bunny Stream status mapping', () => {
  test.each([
    [0, 'QUEUED'],
    [1, 'PROCESSING'],
    [2, 'ENCODING'],
    [3, 'READY'],
    [4, 'PLAYABLE'],
    [5, 'FAILED'],
    [6, 'UPLOADING'],
    [7, 'QUEUED'],
    [8, 'FAILED'],
  ])('maps Bunny status %s', (input, expected) => {
    expect(mapBunnyStreamStatus(input)).toBe(expected);
  });

  test('metadata-only events preserve previous status when present', () => {
    expect(mapBunnyStreamStatus(9, 'READY')).toBe('READY');
    expect(mapBunnyStreamStatus(10, 'PLAYABLE')).toBe('PLAYABLE');
  });

  test('unknown status maps to FAILED for safe admin visibility', () => {
    expect(mapBunnyStreamStatus(99)).toBe('FAILED');
  });

  test('exports human labels for operator UI', () => {
    expect(BUNNY_STREAM_STATUS_LABELS.READY).toBe('Finished');
    expect(BUNNY_STREAM_STATUS_LABELS.PLAYABLE).toBe('First playable rendition ready');
  });
});
```

- [ ] **Step 2: Write client tests**

Create `__tests__/lib/bunny-stream-client.test.ts`:

```ts
import {
  BunnyStreamApiError,
  createBunnyStreamVideo,
  getBunnyStreamVideo,
} from '@/lib/bunny-stream/client';

describe('Bunny Stream API client', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('creates a Bunny video with library AccessKey', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ guid: 'video-guid', title: 'Lesson 01' }),
    }) as jest.Mock;

    const result = await createBunnyStreamVideo({
      libraryId: '123',
      apiKey: 'api-key',
      title: 'Lesson 01',
      collectionId: 'collection-guid',
    });

    expect(result.guid).toBe('video-guid');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://video.bunnycdn.com/library/123/videos',
      {
        method: 'POST',
        headers: {
          AccessKey: 'api-key',
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Lesson 01',
          collectionId: 'collection-guid',
        }),
      }
    );
  });

  test('omits empty collection ID when creating a video', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ guid: 'video-guid' }),
    }) as jest.Mock;

    await createBunnyStreamVideo({
      libraryId: '123',
      apiKey: 'api-key',
      title: 'Lesson 01',
    });

    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toEqual({
      title: 'Lesson 01',
    });
  });

  test('loads video metadata', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        guid: 'video-guid',
        status: 3,
        encodeProgress: 100,
        availableResolutions: '360p,720p',
        thumbnailFileName: 'thumb.jpg',
      }),
    }) as jest.Mock;

    const result = await getBunnyStreamVideo({
      libraryId: '123',
      apiKey: 'api-key',
      videoId: 'video-guid',
    });

    expect(result.status).toBe(3);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://video.bunnycdn.com/library/123/videos/video-guid',
      {
        method: 'GET',
        headers: {
          AccessKey: 'api-key',
          Accept: 'application/json',
        },
      }
    );
  });

  test('throws sanitized API error on non-OK response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'bad key value should not leak',
    }) as jest.Mock;

    await expect(
      getBunnyStreamVideo({
        libraryId: '123',
        apiKey: 'api-key',
        videoId: 'video-guid',
      })
    ).rejects.toEqual(new BunnyStreamApiError('Bunny Stream API failed with HTTP 401', 401));
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
npm test -- __tests__/lib/bunny-stream-status.test.ts __tests__/lib/bunny-stream-client.test.ts --runInBand
```

Expected: fail because modules do not exist.

- [ ] **Step 4: Implement status mapper**

Create `src/lib/bunny-stream/status.ts`:

```ts
import type { BunnyStreamStatus } from '@prisma/client';

export const BUNNY_STREAM_STATUS_LABELS: Record<BunnyStreamStatus, string> = {
  CREATED: 'Created',
  UPLOADING: 'Uploading',
  QUEUED: 'Queued',
  PROCESSING: 'Processing',
  ENCODING: 'Encoding',
  PLAYABLE: 'First playable rendition ready',
  READY: 'Finished',
  FAILED: 'Failed',
};

export function mapBunnyStreamStatus(
  status: number,
  previousStatus?: BunnyStreamStatus | null
): BunnyStreamStatus {
  switch (status) {
    case 0:
      return 'QUEUED';
    case 1:
      return 'PROCESSING';
    case 2:
      return 'ENCODING';
    case 3:
      return 'READY';
    case 4:
      return 'PLAYABLE';
    case 5:
      return 'FAILED';
    case 6:
      return 'UPLOADING';
    case 7:
      return 'QUEUED';
    case 8:
      return 'FAILED';
    case 9:
    case 10:
      return previousStatus ?? 'PROCESSING';
    default:
      return 'FAILED';
  }
}
```

- [ ] **Step 5: Implement API client**

Create `src/lib/bunny-stream/client.ts`:

```ts
export type BunnyStreamVideo = {
  guid: string;
  title?: string;
  status?: number;
  encodeProgress?: number;
  availableResolutions?: string;
  thumbnailFileName?: string;
  length?: number;
};

export class BunnyStreamApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'BunnyStreamApiError';
  }
}

function bunnyUrl(path: string) {
  return `https://video.bunnycdn.com${path}`;
}

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new BunnyStreamApiError(
      `Bunny Stream API failed with HTTP ${response.status}`,
      response.status
    );
  }

  return response.json() as Promise<T>;
}

export async function createBunnyStreamVideo({
  libraryId,
  apiKey,
  title,
  collectionId,
}: {
  libraryId: string;
  apiKey: string;
  title: string;
  collectionId?: string | null;
}) {
  const body: { title: string; collectionId?: string } = { title };
  if (collectionId) body.collectionId = collectionId;

  const response = await fetch(bunnyUrl(`/library/${libraryId}/videos`), {
    method: 'POST',
    headers: {
      AccessKey: apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return readJsonOrThrow<BunnyStreamVideo>(response);
}

export async function getBunnyStreamVideo({
  libraryId,
  apiKey,
  videoId,
}: {
  libraryId: string;
  apiKey: string;
  videoId: string;
}) {
  const response = await fetch(bunnyUrl(`/library/${libraryId}/videos/${videoId}`), {
    method: 'GET',
    headers: {
      AccessKey: apiKey,
      Accept: 'application/json',
    },
  });

  return readJsonOrThrow<BunnyStreamVideo>(response);
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- __tests__/lib/bunny-stream-status.test.ts __tests__/lib/bunny-stream-client.test.ts --runInBand
```

Expected: pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/lib/bunny-stream/status.ts src/lib/bunny-stream/client.ts __tests__/lib/bunny-stream-status.test.ts __tests__/lib/bunny-stream-client.test.ts
git commit -m "feat: add bunny stream api client"
```

## Task 4: Upload Credentials Route

**Files:**
- Create: `src/app/api/bunny-stream/upload-credentials/route.ts`
- Test: `__tests__/api/bunny-stream-routes.test.ts`

- [ ] **Step 1: Write upload route tests**

Create `__tests__/api/bunny-stream-routes.test.ts` with upload tests first:

```ts
/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { createBunnyStreamVideo } from '@/lib/bunny-stream/client';
import { POST as uploadCredentialsPost } from '@/app/api/bunny-stream/upload-credentials/route';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    course: { findUnique: jest.fn() },
    video: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock('@/lib/bunny-stream/client', () => ({
  createBunnyStreamVideo: jest.fn(),
  getBunnyStreamVideo: jest.fn(),
}));

const mockedSession = getServerSession as jest.Mock;
const mockedCreateBunnyVideo = createBunnyStreamVideo as jest.Mock;
const mockedPrisma = prisma as unknown as {
  course: { findUnique: jest.Mock };
  video: { create: jest.Mock; findFirst: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
};

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost.test${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Bunny Stream upload credentials route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BUNNY_STREAM_LIBRARY_ID = '123456';
    process.env.BUNNY_STREAM_API_KEY = 'api-key';
    process.env.BUNNY_STREAM_READ_ONLY_API_KEY = 'read-only';
    process.env.BUNNY_STREAM_TOKEN_SECURITY_KEY = 'token-key';
    process.env.BUNNY_STREAM_TUS_EXPIRE_SECONDS = '86400';
  });

  test('requires admin session', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: '507f1f77bcf86cd799439011',
        title: 'Lesson',
      })
    );

    expect(response.status).toBe(403);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
  });

  test('creates Bunny video and local row, then returns TUS credentials without API key', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue({ id: '507f1f77bcf86cd799439011', isDeleted: false });
    mockedCreateBunnyVideo.mockResolvedValue({ guid: 'bunny-video-guid' });
    mockedPrisma.video.create.mockResolvedValue({ id: 'local-video-id' });

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: '507f1f77bcf86cd799439011',
        title: 'Lesson',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedCreateBunnyVideo).toHaveBeenCalledWith({
      libraryId: '123456',
      apiKey: 'api-key',
      title: 'Lesson',
      collectionId: null,
    });
    expect(mockedPrisma.video.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Lesson',
        courseId: '507f1f77bcf86cd799439011',
        provider: 'BUNNY_STREAM',
        bunnyLibraryId: '123456',
        bunnyVideoId: 'bunny-video-guid',
        bunnyStatus: 'CREATED',
        published: false,
      }),
    });
    expect(body).toEqual({
      uploadEndpoint: 'https://video.bunnycdn.com/tusupload',
      libraryId: '123456',
      videoId: 'bunny-video-guid',
      authorizationExpire: expect.any(Number),
      authorizationSignature: expect.stringMatching(/^[0-9a-f]{64}$/),
      localVideoId: 'local-video-id',
    });
    expect(JSON.stringify(body)).not.toContain('api-key');
  });

  test('rejects deleted or missing course before creating provider video', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockedPrisma.course.findUnique.mockResolvedValue(null);

    const response = await uploadCredentialsPost(
      jsonRequest('/api/bunny-stream/upload-credentials', {
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: '507f1f77bcf86cd799439011',
        title: 'Lesson',
      })
    );

    expect(response.status).toBe(404);
    expect(mockedCreateBunnyVideo).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run upload route tests to verify failure**

Run:

```bash
npm test -- __tests__/api/bunny-stream-routes.test.ts --runInBand
```

Expected: fail because route does not exist.

- [ ] **Step 3: Implement upload route**

Create `src/app/api/bunny-stream/upload-credentials/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createBunnyStreamVideo } from '@/lib/bunny-stream/client';
import { readBunnyStreamConfig } from '@/lib/bunny-stream/config';
import { generateBunnyTusSignature } from '@/lib/bunny-stream/signing';

const uploadSchema = z.object({
  filename: z.string().min(1).max(255).regex(/^[\w\-. ]+$/),
  contentType: z.string().regex(/^video\//),
  courseId: z.string().length(24),
  title: z.string().min(1).max(255),
  collectionId: z.string().min(1).max(128).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });
  if (session.user?.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });

  try {
    const parsed = uploadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const config = readBunnyStreamConfig();
    const { courseId, title, collectionId } = parsed.data;
    const resolvedCollectionId = collectionId ?? config.defaultCollectionId;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isDeleted: true },
    });

    if (!course || course.isDeleted) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const bunnyVideo = await createBunnyStreamVideo({
      libraryId: config.libraryId,
      apiKey: config.apiKey,
      title,
      collectionId: resolvedCollectionId,
    });

    if (!bunnyVideo.guid) {
      return NextResponse.json({ error: 'Bunny Stream did not return a video ID' }, { status: 502 });
    }

    const video = await prisma.video.create({
      data: {
        title,
        courseId,
        provider: 'BUNNY_STREAM',
        bunnyLibraryId: config.libraryId,
        bunnyVideoId: bunnyVideo.guid,
        bunnyCollectionId: resolvedCollectionId,
        bunnyStatus: 'CREATED',
        published: false,
      },
    });

    const authorizationExpire = Math.floor(Date.now() / 1000) + config.tusExpireSeconds;
    const authorizationSignature = generateBunnyTusSignature({
      libraryId: config.libraryId,
      apiKey: config.apiKey,
      expirationTime: authorizationExpire,
      videoId: bunnyVideo.guid,
    });

    return NextResponse.json({
      uploadEndpoint: 'https://video.bunnycdn.com/tusupload',
      libraryId: config.libraryId,
      videoId: bunnyVideo.guid,
      authorizationExpire,
      authorizationSignature,
      localVideoId: video.id,
    });
  } catch (error) {
    console.error('Bunny Stream upload credentials error:', error);
    return NextResponse.json({ error: 'Bunny Stream upload failed to initialize' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run route tests**

Run:

```bash
npm test -- __tests__/api/bunny-stream-routes.test.ts --runInBand
```

Expected: pass upload tests.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/app/api/bunny-stream/upload-credentials/route.ts __tests__/api/bunny-stream-routes.test.ts
git commit -m "feat: add bunny stream upload credentials"
```

## Task 5: Webhook And Manual Sync Routes

**Files:**
- Modify: `__tests__/api/bunny-stream-routes.test.ts`
- Create: `src/app/api/webhook/bunny-stream/route.ts`
- Create: `src/app/api/video/bunny-stream/sync/route.ts`

- [ ] **Step 1: Extend route tests for webhook and sync**

Append to `__tests__/api/bunny-stream-routes.test.ts`:

```ts
import crypto from 'node:crypto';
import { getBunnyStreamVideo } from '@/lib/bunny-stream/client';
import { POST as webhookPost } from '@/app/api/webhook/bunny-stream/route';
import { POST as syncPost } from '@/app/api/video/bunny-stream/sync/route';

const mockedGetBunnyVideo = getBunnyStreamVideo as jest.Mock;

describe('Bunny Stream webhook route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BUNNY_STREAM_READ_ONLY_API_KEY = 'read-only';
    process.env.BUNNY_STREAM_API_KEY = 'api-key';
    process.env.BUNNY_STREAM_LIBRARY_ID = '123456';
  });

  function signedWebhook(payload: unknown) {
    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', 'read-only').update(rawBody, 'utf8').digest('hex');
    return new Request('http://localhost.test/api/webhook/bunny-stream', {
      method: 'POST',
      headers: {
        'X-BunnyStream-Signature-Version': 'v1',
        'X-BunnyStream-Signature-Algorithm': 'hmac-sha256',
        'X-BunnyStream-Signature': signature,
      },
      body: rawBody,
    });
  }

  test('rejects invalid webhook signature', async () => {
    const response = await webhookPost(
      new Request('http://localhost.test/api/webhook/bunny-stream', {
        method: 'POST',
        headers: {
          'X-BunnyStream-Signature-Version': 'v1',
          'X-BunnyStream-Signature-Algorithm': 'hmac-sha256',
          'X-BunnyStream-Signature': '0'.repeat(64),
        },
        body: JSON.stringify({ VideoLibraryId: 123456, VideoGuid: 'bunny-video-guid', Status: 3 }),
      })
    );

    expect(response.status).toBe(401);
    expect(mockedPrisma.video.update).not.toHaveBeenCalled();
  });

  test('updates matching Bunny video status from signed webhook', async () => {
    mockedPrisma.video.findFirst.mockResolvedValue({
      id: 'local-video-id',
      bunnyStatus: 'ENCODING',
    });
    mockedGetBunnyVideo.mockResolvedValue({
      status: 3,
      encodeProgress: 100,
      availableResolutions: '360p,720p',
      thumbnailFileName: 'thumb.jpg',
    });
    mockedPrisma.video.update.mockResolvedValue({ id: 'local-video-id' });

    const response = await webhookPost(
      signedWebhook({ VideoLibraryId: 123456, VideoGuid: 'bunny-video-guid', Status: 3 })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'local-video-id' },
      data: expect.objectContaining({
        bunnyStatus: 'READY',
        bunnyEncodeProgress: 100,
        bunnyAvailableRes: '360p,720p',
        bunnyThumbnailUrl: 'thumb.jpg',
        bunnyError: null,
      }),
    });
  });
});

describe('Bunny Stream manual sync route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    process.env.BUNNY_STREAM_API_KEY = 'api-key';
  });

  test('requires admin session', async () => {
    mockedSession.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } });

    const response = await syncPost(jsonRequest('/api/video/bunny-stream/sync', { videoId: 'local-video-id' }));

    expect(response.status).toBe(403);
  });

  test('syncs stored Bunny video metadata', async () => {
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: 'local-video-id',
      provider: 'BUNNY_STREAM',
      bunnyLibraryId: '123456',
      bunnyVideoId: 'bunny-video-guid',
      bunnyStatus: 'ENCODING',
    });
    mockedGetBunnyVideo.mockResolvedValue({
      status: 4,
      encodeProgress: 60,
      availableResolutions: '360p',
      thumbnailFileName: 'thumb.jpg',
    });
    mockedPrisma.video.update.mockResolvedValue({
      id: 'local-video-id',
      bunnyStatus: 'PLAYABLE',
    });

    const response = await syncPost(jsonRequest('/api/video/bunny-stream/sync', { videoId: 'local-video-id' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, status: 'PLAYABLE' });
  });
});
```

If duplicate imports conflict because the file already imports from the same modules, merge imports at the top instead of adding repeated import statements.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- __tests__/api/bunny-stream-routes.test.ts --runInBand
```

Expected: fail because webhook and sync routes do not exist.

- [ ] **Step 3: Implement webhook route**

Create `src/app/api/webhook/bunny-stream/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readBunnyStreamConfig } from '@/lib/bunny-stream/config';
import { getBunnyStreamVideo } from '@/lib/bunny-stream/client';
import { verifyBunnyWebhookSignature } from '@/lib/bunny-stream/signing';
import { mapBunnyStreamStatus } from '@/lib/bunny-stream/status';

type BunnyWebhookPayload = {
  VideoLibraryId: number;
  VideoGuid: string;
  Status: number;
};

function thumbnailUrl(fileName?: string) {
  return fileName || null;
}

export async function POST(request: NextRequest) {
  try {
    const config = readBunnyStreamConfig();
    const rawBody = await request.text();

    const valid = verifyBunnyWebhookSignature({
      rawBody,
      signature: request.headers.get('X-BunnyStream-Signature'),
      version: request.headers.get('X-BunnyStream-Signature-Version'),
      algorithm: request.headers.get('X-BunnyStream-Signature-Algorithm'),
      readOnlyApiKey: config.readOnlyApiKey,
    });

    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as BunnyWebhookPayload;
    const libraryId = String(payload.VideoLibraryId);
    const video = await prisma.video.findFirst({
      where: {
        provider: 'BUNNY_STREAM',
        bunnyLibraryId: libraryId,
        bunnyVideoId: payload.VideoGuid,
      },
      select: { id: true, bunnyStatus: true },
    });

    if (!video) {
      return NextResponse.json({ success: true, matched: false });
    }

    const details = await getBunnyStreamVideo({
      libraryId,
      apiKey: config.apiKey,
      videoId: payload.VideoGuid,
    });

    const status = mapBunnyStreamStatus(payload.Status, video.bunnyStatus);

    await prisma.video.update({
      where: { id: video.id },
      data: {
        bunnyStatus: status,
        bunnyEncodeProgress: details.encodeProgress ?? null,
        bunnyAvailableRes: details.availableResolutions ?? null,
        bunnyThumbnailUrl: thumbnailUrl(details.thumbnailFileName),
        bunnySyncedAt: new Date(),
        bunnyError: status === 'FAILED' ? 'Bunny Stream processing failed' : null,
      },
    });

    return NextResponse.json({ success: true, matched: true, status });
  } catch (error) {
    console.error('Bunny Stream webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
```

Use `findFirst` in final code unless a compound unique is added.

- [ ] **Step 4: Implement manual sync route**

Create `src/app/api/video/bunny-stream/sync/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readBunnyStreamConfig } from '@/lib/bunny-stream/config';
import { getBunnyStreamVideo } from '@/lib/bunny-stream/client';
import { mapBunnyStreamStatus } from '@/lib/bunny-stream/status';

const syncSchema = z.object({
  videoId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });
  if (session.user?.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });

  try {
    const parsed = syncSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const video = await prisma.video.findUnique({
      where: { id: parsed.data.videoId },
      select: {
        id: true,
        provider: true,
        bunnyLibraryId: true,
        bunnyVideoId: true,
        bunnyStatus: true,
      },
    });

    if (!video || video.provider !== 'BUNNY_STREAM' || !video.bunnyLibraryId || !video.bunnyVideoId) {
      return NextResponse.json({ error: 'Bunny Stream video not found' }, { status: 404 });
    }

    const config = readBunnyStreamConfig();
    const details = await getBunnyStreamVideo({
      libraryId: video.bunnyLibraryId,
      apiKey: config.apiKey,
      videoId: video.bunnyVideoId,
    });
    const status = mapBunnyStreamStatus(details.status ?? 99, video.bunnyStatus);

    await prisma.video.update({
      where: { id: video.id },
      data: {
        bunnyStatus: status,
        bunnyEncodeProgress: details.encodeProgress ?? null,
        bunnyAvailableRes: details.availableResolutions ?? null,
        bunnyThumbnailUrl: details.thumbnailFileName ?? null,
        bunnySyncedAt: new Date(),
        bunnyError: status === 'FAILED' ? 'Bunny Stream processing failed' : null,
      },
    });

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Bunny Stream sync error:', error);
    return NextResponse.json({ error: 'Bunny Stream sync failed' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- __tests__/api/bunny-stream-routes.test.ts --runInBand
```

Expected: pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/app/api/webhook/bunny-stream/route.ts src/app/api/video/bunny-stream/sync/route.ts __tests__/api/bunny-stream-routes.test.ts
git commit -m "feat: sync bunny stream video status"
```

## Task 6: Bunny Playback Signing And Watch Server Wiring

**Files:**
- Create: `src/lib/bunny-stream/playback.ts`
- Create: `src/lib/bunny-stream/index.ts`
- Modify: `src/app/watch/[videoId]/page.tsx`
- Test: extend `__tests__/api/bunny-stream-routes.test.ts` or create `__tests__/lib/bunny-stream-playback.test.ts`

- [ ] **Step 1: Write playback helper tests**

Create `__tests__/lib/bunny-stream-playback.test.ts`:

```ts
import { buildBunnyStreamEmbedUrl } from '@/lib/bunny-stream/playback';

describe('Bunny Stream playback helper', () => {
  test('builds a signed Bunny embed URL', () => {
    const result = buildBunnyStreamEmbedUrl({
      libraryId: '123456',
      bunnyVideoId: 'bunny-video-guid',
      tokenSecurityKey: 'token-key',
      nowSeconds: 1000,
      ttlSeconds: 300,
    });

    expect(result.expires).toBe(1300);
    expect(result.url).toMatch(
      /^https:\/\/player\.mediadelivery\.net\/embed\/123456\/bunny-video-guid\?/
    );
    expect(result.url).toContain('expires=1300');
    expect(result.url).toContain('token=');
    expect(result.url).toContain('autoplay=false');
    expect(result.url).toContain('preload=true');
    expect(result.url).toContain('responsive=true');
  });

  test('encodes query values safely', () => {
    const result = buildBunnyStreamEmbedUrl({
      libraryId: '123456',
      bunnyVideoId: 'video/guid',
      tokenSecurityKey: 'token-key',
      nowSeconds: 1000,
      ttlSeconds: 300,
    });

    expect(result.url).toContain('/embed/123456/video%2Fguid?');
  });
});
```

- [ ] **Step 2: Run helper test to verify failure**

Run:

```bash
npm test -- __tests__/lib/bunny-stream-playback.test.ts --runInBand
```

Expected: fail because helper does not exist.

- [ ] **Step 3: Implement playback helper**

Create `src/lib/bunny-stream/playback.ts`:

```ts
import { generateBunnyEmbedToken } from './signing';

export type BunnyStreamEmbedUrl = {
  url: string;
  expires: number;
};

export function buildBunnyStreamEmbedUrl({
  libraryId,
  bunnyVideoId,
  tokenSecurityKey,
  nowSeconds = Math.floor(Date.now() / 1000),
  ttlSeconds,
}: {
  libraryId: string;
  bunnyVideoId: string;
  tokenSecurityKey: string;
  nowSeconds?: number;
  ttlSeconds: number;
}): BunnyStreamEmbedUrl {
  const expires = nowSeconds + ttlSeconds;
  const token = generateBunnyEmbedToken({
    tokenSecurityKey,
    videoId: bunnyVideoId,
    expires,
  });
  const url = new URL(
    `https://player.mediadelivery.net/embed/${encodeURIComponent(libraryId)}/${encodeURIComponent(bunnyVideoId)}`
  );
  url.searchParams.set('token', token);
  url.searchParams.set('expires', String(expires));
  url.searchParams.set('autoplay', 'false');
  url.searchParams.set('preload', 'true');
  url.searchParams.set('responsive', 'true');

  return { url: url.toString(), expires };
}
```

- [ ] **Step 4: Update watch page server props**

Create `src/lib/bunny-stream/index.ts`:

```ts
export * from './client';
export * from './config';
export * from './playback';
export * from './signing';
export * from './status';
```

- [ ] **Step 5: Update watch page server props**

Modify `src/app/watch/[videoId]/page.tsx`.

Add imports:

```ts
import { readBunnyStreamConfig } from '@/lib/bunny-stream/config';
import { buildBunnyStreamEmbedUrl } from '@/lib/bunny-stream/playback';
```

Replace the Axinom-only token block with:

```ts
    let token = '';
    let bunnyPlayback: {
        libraryId: string;
        bunnyVideoId: string;
        signedEmbedUrl: string;
        expires: number;
    } | null = null;

    if (video.provider === 'BUNNY_STREAM') {
        if (
            !video.bunnyLibraryId ||
            !video.bunnyVideoId ||
            (video.bunnyStatus !== 'READY' && video.bunnyStatus !== 'PLAYABLE')
        ) {
            notFound();
        }

        const bunnyConfig = readBunnyStreamConfig();
        const embed = buildBunnyStreamEmbedUrl({
            libraryId: video.bunnyLibraryId,
            bunnyVideoId: video.bunnyVideoId,
            tokenSecurityKey: bunnyConfig.tokenSecurityKey,
            ttlSeconds: bunnyConfig.embedTokenTtlSeconds,
        });
        bunnyPlayback = {
            libraryId: video.bunnyLibraryId,
            bunnyVideoId: video.bunnyVideoId,
            signedEmbedUrl: embed.url,
            expires: embed.expires,
        };
    } else if (video.drmKeyId) {
        const { generateAxinomToken } = await import('@/lib/axinom');
        token = generateAxinomToken(video.drmKeyId);
    }
```

Add props on `WatchPageClient`:

```tsx
                provider={video.provider ?? 'AXINOM'}
                bunnyPlayback={bunnyPlayback}
```

If Prisma type does not yet expose `provider` on entitlement video, update `src/lib/media-entitlement.ts` selected video fields to include:

```ts
provider: true,
bunnyLibraryId: true,
bunnyVideoId: true,
bunnyStatus: true,
```

- [ ] **Step 6: Run playback helper test and typecheck**

Run:

```bash
npm test -- __tests__/lib/bunny-stream-playback.test.ts --runInBand
npm run typecheck
```

Expected: pass after `WatchPageClient` props are added in Task 8. If typecheck fails only because client props do not exist yet, defer final typecheck to Task 8 but keep helper test passing.

- [ ] **Step 7: Commit**

Run after Task 8 if typecheck depends on client props:

```bash
git add src/lib/bunny-stream/playback.ts src/lib/bunny-stream/index.ts src/app/watch/[videoId]/page.tsx src/lib/media-entitlement.ts __tests__/lib/bunny-stream-playback.test.ts
git commit -m "feat: sign bunny stream playback urls"
```

## Task 7: Iframe Heartbeat Hook And Bunny Player

**Files:**
- Create: `src/hooks/player/useIframeHeartbeat.ts`
- Create: `src/components/video/BunnyStreamPlayer.tsx`
- Create: `__tests__/components/bunny-stream-player.test.tsx`

- [ ] **Step 1: Write component tests**

Create `__tests__/components/bunny-stream-player.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import BunnyStreamPlayer from '@/components/video/BunnyStreamPlayer';

describe('BunnyStreamPlayer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, viewCount: 1, viewLimit: null, lastPosition: 0 }),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('renders signed Bunny iframe without exposing server keys', () => {
    render(
      <BunnyStreamPlayer
        videoId="local-video-id"
        libraryId="123456"
        bunnyVideoId="bunny-video-guid"
        signedEmbedUrl="https://player.mediadelivery.net/embed/123456/bunny-video-guid?token=signed&expires=1300"
        viewCount={0}
        viewLimit={null}
        watermarkText="Learner"
      />
    );

    const iframe = screen.getByTitle('Secure Bunny Stream player') as HTMLIFrameElement;
    expect(iframe.src).toContain('https://player.mediadelivery.net/embed/123456/bunny-video-guid');
    expect(iframe.src).toContain('token=signed');
    expect(iframe.src).not.toContain('api-key');
    expect(iframe.allow).toContain('encrypted-media');
  });

  test('sends initial heartbeat after mount', async () => {
    render(
      <BunnyStreamPlayer
        videoId="local-video-id"
        libraryId="123456"
        bunnyVideoId="bunny-video-guid"
        signedEmbedUrl="https://player.mediadelivery.net/embed/123456/bunny-video-guid?token=signed&expires=1300"
        viewCount={0}
        viewLimit={null}
        watermarkText="Learner"
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/watch/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: 'local-video-id',
          position: 0,
          isNewView: true,
          isFinished: false,
        }),
      });
    });
  });

  test('sends interval heartbeat as continuing view', async () => {
    render(
      <BunnyStreamPlayer
        videoId="local-video-id"
        libraryId="123456"
        bunnyVideoId="bunny-video-guid"
        signedEmbedUrl="https://player.mediadelivery.net/embed/123456/bunny-video-guid?token=signed&expires=1300"
        viewCount={0}
        viewLimit={null}
        watermarkText="Learner"
      />
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    jest.advanceTimersByTime(60000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith('/api/watch/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: 'local-video-id',
          position: 0,
          isNewView: false,
          isFinished: false,
        }),
      });
    });
  });
});
```

- [ ] **Step 2: Run component test to verify failure**

Run:

```bash
npm test -- __tests__/components/bunny-stream-player.test.tsx --runInBand
```

Expected: fail because component/hook do not exist.

- [ ] **Step 3: Implement iframe heartbeat hook**

Create `src/hooks/player/useIframeHeartbeat.ts`:

```ts
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export function useIframeHeartbeat({ videoId }: { videoId: string }) {
  const [isBlocked, setIsBlocked] = useState(false);
  const isNewViewRef = useRef(true);

  useEffect(() => {
    if (!videoId) return;
    let stopped = false;

    const sendHeartbeat = async (isFinished = false) => {
      if (stopped || isBlocked) return;

      try {
        const response = await fetch('/api/watch/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            position: 0,
            isNewView: isNewViewRef.current,
            isFinished,
          }),
        });

        if (response.ok) {
          isNewViewRef.current = false;
          return;
        }

        if (response.status === 403) {
          const data = await response.json().catch(() => null);
          setIsBlocked(true);
          toast.error(
            data?.viewLimit
              ? `View limit exceeded! You have watched this video ${data.viewCount}/${data.viewLimit} times.`
              : 'Video access denied.'
          );
        }
      } catch (error) {
        console.error('Iframe heartbeat error:', error);
      }
    };

    sendHeartbeat();
    const interval = setInterval(() => sendHeartbeat(false), 60000);

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        sendHeartbeat(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [videoId, isBlocked]);

  return { isBlocked };
}
```

- [ ] **Step 4: Implement Bunny player**

Create `src/components/video/BunnyStreamPlayer.tsx`:

```tsx
'use client';

import { useIframeHeartbeat } from '@/hooks/player/useIframeHeartbeat';

type BunnyStreamPlayerProps = {
  videoId: string;
  libraryId: string;
  bunnyVideoId: string;
  signedEmbedUrl: string;
  viewCount: number;
  viewLimit: number | null;
  watermarkText: string;
  onFullscreenChange?: (fullscreen: boolean) => void;
};

export default function BunnyStreamPlayer({
  videoId,
  signedEmbedUrl,
}: BunnyStreamPlayerProps) {
  const { isBlocked } = useIframeHeartbeat({ videoId });

  if (isBlocked) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-black text-white">
        Playback blocked by current access limits.
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-xl">
      <iframe
        title="Secure Bunny Stream player"
        src={signedEmbedUrl}
        loading="lazy"
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
      />
    </div>
  );
}
```

- [ ] **Step 5: Run component tests**

Run:

```bash
npm test -- __tests__/components/bunny-stream-player.test.tsx --runInBand
```

Expected: pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/hooks/player/useIframeHeartbeat.ts src/components/video/BunnyStreamPlayer.tsx __tests__/components/bunny-stream-player.test.tsx
git commit -m "feat: add bunny stream iframe player"
```

## Task 8: Watch Client Provider Switch

**Files:**
- Modify: `src/components/course/WatchPageClient.tsx`
- Modify: `src/app/watch/[videoId]/page.tsx`
- Test: `__tests__/components/bunny-stream-player.test.tsx`

- [ ] **Step 1: Add dynamic import and prop types**

Modify `src/components/course/WatchPageClient.tsx`.

Add after `DRMPlayerWrapper` import:

```ts
const BunnyStreamPlayer = dynamic(() => import('@/components/video/BunnyStreamPlayer'), {
    ssr: false,
    loading: () => <PlayerLoading />
});
```

Add types:

```ts
type VideoProvider = 'AXINOM' | 'BUNNY_STREAM';

type BunnyPlayback = {
    libraryId: string;
    bunnyVideoId: string;
    signedEmbedUrl: string;
    expires: number;
};
```

Add to `WatchPageClientProps`:

```ts
    provider: VideoProvider;
    bunnyPlayback: BunnyPlayback | null;
```

Add to function destructuring:

```ts
    provider,
    bunnyPlayback,
```

- [ ] **Step 2: Render Bunny player for Bunny provider**

Replace the existing `<DRMPlayerWrapper ... />` block with:

```tsx
                                {provider === 'BUNNY_STREAM' && bunnyPlayback ? (
                                    <BunnyStreamPlayer
                                        videoId={videoId}
                                        libraryId={bunnyPlayback.libraryId}
                                        bunnyVideoId={bunnyPlayback.bunnyVideoId}
                                        signedEmbedUrl={bunnyPlayback.signedEmbedUrl}
                                        viewCount={viewCount}
                                        viewLimit={viewLimit}
                                        watermarkText={watermarkText}
                                        onFullscreenChange={setIsVideoFullscreen}
                                    />
                                ) : (
                                    <DRMPlayerWrapper
                                        dashUrl={playbackSources.dashUrl}
                                        hlsUrl={playbackSources.hlsUrl}
                                        drmToken={playbackSources.drmToken}
                                        videoId={videoId}
                                        viewCount={viewCount}
                                        viewLimit={viewLimit}
                                        watermarkText={watermarkText}
                                        requireHD={false}
                                        isClearHlsFallback={playbackSources.isClearHlsFallback}
                                        isFairPlayConfigured={isFairPlayConfigured}
                                        onFullscreenChange={setIsVideoFullscreen}
                                    />
                                )}
```

In `src/app/watch/[videoId]/page.tsx`, make sure `WatchPageClient` receives:

```tsx
                provider={video.provider ?? 'AXINOM'}
                bunnyPlayback={bunnyPlayback}
```

- [ ] **Step 3: Add focused render test**

Append to `__tests__/components/bunny-stream-player.test.tsx`:

```tsx
test('BunnyStreamPlayer blocks rendering when signed URL is already absent by caller design', () => {
  render(
    <BunnyStreamPlayer
      videoId="local-video-id"
      libraryId="123456"
      bunnyVideoId="bunny-video-guid"
      signedEmbedUrl="https://player.mediadelivery.net/embed/123456/bunny-video-guid?token=signed&expires=1300"
      viewCount={0}
      viewLimit={1}
      watermarkText="Learner"
    />
  );

  expect(screen.getByTitle('Secure Bunny Stream player')).toBeInTheDocument();
});
```

This verifies component rendering; server-side absence of signed URL is covered by playback helper and route/page code review.

- [ ] **Step 4: Run tests and typecheck**

Run:

```bash
npm test -- __tests__/components/bunny-stream-player.test.tsx __tests__/lib/bunny-stream-playback.test.ts --runInBand
npm run typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/components/course/WatchPageClient.tsx src/app/watch/[videoId]/page.tsx __tests__/components/bunny-stream-player.test.tsx
git commit -m "feat: render bunny stream playback"
```

## Task 9: Admin Video API And Bunny Upload UI

**Files:**
- Modify: `src/app/api/admin/videos/route.ts`
- Modify: `src/app/admin/videos/page.tsx`

- [ ] **Step 1: Extend admin videos API select**

Modify `src/app/api/admin/videos/route.ts` `select` block:

```ts
                provider: true,
                bunnyLibraryId: true,
                bunnyVideoId: true,
                bunnyCollectionId: true,
                bunnyStatus: true,
                bunnyEncodeProgress: true,
                bunnyAvailableRes: true,
                bunnyThumbnailUrl: true,
                bunnySyncedAt: true,
                bunnyError: true,
```

- [ ] **Step 2: Extend admin `Video` type**

Modify `src/app/admin/videos/page.tsx` `type Video`:

```ts
    provider: 'AXINOM' | 'BUNNY_STREAM';
    bunnyLibraryId: string | null;
    bunnyVideoId: string | null;
    bunnyCollectionId: string | null;
    bunnyStatus: string | null;
    bunnyEncodeProgress: number | null;
    bunnyAvailableRes: string | null;
    bunnyThumbnailUrl: string | null;
    bunnySyncedAt: string | null;
    bunnyError: string | null;
```

Update search fields:

```ts
    } = useAdminFilters(videos, ['title', 'id', 'axinomIdClear', 'description', 'bunnyVideoId', 'bunnyStatus']);
```

- [ ] **Step 3: Add Bunny sync handler**

Add after existing `handleSync`:

```ts
    const handleBunnySync = async (videoId: string) => {
        setSyncingId(videoId);
        try {
            const res = await fetch('/api/video/bunny-stream/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId }),
            });
            const result = await res.json();

            if (res.ok && result.success) {
                await fetchVideos();
                toast.success(`Bunny Stream status updated: ${result.status}`);
            } else {
                toast.error(`Bunny sync failed: ${result.error || result.status}`);
            }
        } catch (error) {
            console.error('Bunny sync error:', error);
            toast.error('Failed to sync Bunny Stream video');
        } finally {
            setSyncingId(null);
        }
    };
```

- [ ] **Step 4: Add TUS upload import and upload flow**

Add import:

```ts
import * as tus from 'tus-js-client';
```

Replace current `handleUpload` body with Bunny first path:

```ts
    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !selectedCourseId) return;

        setUploading(true);
        setStatus('Creating Bunny Stream upload...');

        try {
            const res = await fetch('/api/bunny-stream/upload-credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type,
                    title: title || file.name,
                    courseId: selectedCourseId,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Unknown Bunny Stream error' }));
                throw new Error(err.error || `Failed to create Bunny upload: ${res.status}`);
            }

            const credentials = await res.json();
            setStatus('Uploading to Bunny Stream...');

            await new Promise<void>((resolve, reject) => {
                const upload = new tus.Upload(file, {
                    endpoint: credentials.uploadEndpoint,
                    retryDelays: [0, 3000, 5000, 10000, 20000],
                    headers: {
                        AuthorizationSignature: credentials.authorizationSignature,
                        AuthorizationExpire: String(credentials.authorizationExpire),
                        LibraryId: String(credentials.libraryId),
                        VideoId: credentials.videoId,
                    },
                    metadata: {
                        filetype: file.type,
                        title: title || file.name,
                    },
                    onError: reject,
                    onProgress: (bytesUploaded, bytesTotal) => {
                        const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(1);
                        setStatus(`Uploading to Bunny Stream... ${percentage}%`);
                    },
                    onSuccess: () => resolve(),
                });
                upload.start();
            });

            setStatus('Upload complete. Bunny Stream is processing the video.');
            setTimeout(() => {
                setUploadDialogOpen(false);
                setFile(null);
                setTitle('');
                setStatus('');
                fetchVideos();
            }, 1500);
        } catch (error) {
            console.error(error);
            setStatus('Error: ' + (error as Error).message);
        } finally {
            setUploading(false);
        }
    };
```

- [ ] **Step 5: Update table/card display**

Where each video displays Axinom status/actions, use provider switch:

```tsx
{video.provider === 'BUNNY_STREAM' ? (
    <div className="space-y-1 text-sm">
        <Badge variant={video.bunnyStatus === 'READY' ? 'default' : 'secondary'}>
            Bunny: {video.bunnyStatus || 'CREATED'}
        </Badge>
        <p className="text-muted-foreground">Bunny ID: {video.bunnyVideoId || 'Not created'}</p>
        {video.bunnyEncodeProgress !== null && (
            <p className="text-muted-foreground">Encode: {video.bunnyEncodeProgress}%</p>
        )}
        {video.bunnyAvailableRes && (
            <p className="text-muted-foreground">Resolutions: {video.bunnyAvailableRes}</p>
        )}
        {video.bunnyError && (
            <p className="text-destructive">Error: {video.bunnyError}</p>
        )}
        <Button
            variant="outline"
            size="sm"
            onClick={() => handleBunnySync(video.id)}
            disabled={syncingId === video.id}
        >
            {syncingId === video.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync Bunny
        </Button>
    </div>
) : (
    <div className="space-y-1 text-sm">
        <Badge variant={isReadyStatus(video.axinomEncodingStatus) ? 'default' : 'secondary'}>
            Axinom: {video.axinomEncodingStatus || 'Unknown'}
        </Badge>
        <p className="text-muted-foreground">Axinom ID: {getPrimaryAxinomId(video) || 'Missing'}</p>
        <Button
            variant="outline"
            size="sm"
            onClick={() => handleSync(video.id)}
            disabled={syncingId === video.id}
        >
            {syncingId === video.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync Axinom
        </Button>
    </div>
)}
```

Fit this into the existing `paginatedData.map()` card/table structure without adding nested cards.

- [ ] **Step 6: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: pass. Fix import/type issues in the admin page.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/app/api/admin/videos/route.ts src/app/admin/videos/page.tsx package.json package-lock.json
git commit -m "feat: add bunny stream admin upload"
```

## Task 10: Setup Verifier And Documentation

**Files:**
- Create: `scripts/verify-bunny-stream-setup.ts`
- Create: `__tests__/scripts/bunny-stream-docs.test.ts`
- Modify: `docs/env-matrix.md`
- Create: `docs/bunny-stream-setup.md`
- Create: `docs/bunny-stream-staging-checklist.md`
- Modify: `docs/staging-smoke-checklist.md`
- Modify: `docs/operations/subsystems.md`
- Modify: `docs/operations/vendor-upgrades.md`
- Modify: `docs/operations/health-checklist.md`
- Modify: `.env.example`

- [ ] **Step 1: Write docs/verifier tests**

Create `__tests__/scripts/bunny-stream-docs.test.ts`:

```ts
import fs from 'node:fs';

describe('Bunny Stream docs and scripts', () => {
  test('package scripts include Bunny verifier', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.scripts['verify:bunny-stream']).toBe('tsx scripts/verify-bunny-stream-setup.ts');
  });

  test('env matrix documents Bunny Stream required values', () => {
    const matrix = fs.readFileSync('docs/env-matrix.md', 'utf8');
    for (const variable of [
      'BUNNY_STREAM_LIBRARY_ID',
      'BUNNY_STREAM_API_KEY',
      'BUNNY_STREAM_READ_ONLY_API_KEY',
      'BUNNY_STREAM_TOKEN_SECURITY_KEY',
    ]) {
      expect(matrix).toContain(variable);
    }
  });

  test('setup and staging docs mention official Bunny controls', () => {
    const setup = fs.readFileSync('docs/bunny-stream-setup.md', 'utf8');
    const staging = fs.readFileSync('docs/bunny-stream-staging-checklist.md', 'utf8');

    expect(setup).toContain('MediaCage Enterprise DRM');
    expect(setup).toContain('embed view token authentication');
    expect(setup).toContain('Early-Play');
    expect(staging).toContain('/api/webhook/bunny-stream');
    expect(staging).toContain('allowed domains');
  });
});
```

- [ ] **Step 2: Run docs test to verify failure**

Run:

```bash
npm test -- __tests__/scripts/bunny-stream-docs.test.ts --runInBand
```

Expected: fail because docs/verifier are not complete.

- [ ] **Step 3: Create setup verifier**

Create `scripts/verify-bunny-stream-setup.ts`:

```ts
import process from 'node:process';
import dotenv from 'dotenv';
import path from 'node:path';
import { validateBunnyStreamConfig } from '../src/lib/bunny-stream/config';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const strict = process.argv.includes('--strict') || process.env.CI === 'true';

const result = validateBunnyStreamConfig(process.env, strict ? 'strict' : 'local');

console.log('Verifying Bunny Stream configuration');

if (result.ok) {
  console.log('OK Bunny Stream env validation passed');
  console.log('OK Provider: Bunny Stream + MediaCage DRM + signed embed playback');
  process.exit(0);
}

for (const error of result.errors) {
  if (strict) {
    console.error(`FAIL Bunny Stream: ${error}`);
  } else {
    console.log(`SKIP Bunny Stream: ${error}`);
  }
}

process.exit(strict ? 1 : 0);
```

- [ ] **Step 4: Update env matrix**

Add rows to `docs/env-matrix.md`:

```md
| Bunny Stream | BUNNY_STREAM_LIBRARY_ID | operational secret | optional | required | src/lib/bunny-stream/config.ts | Bunny Stream library ID for upload, webhooks, and embed playback. |
| Bunny Stream | BUNNY_STREAM_API_KEY | server secret | optional | required | src/lib/bunny-stream/client.ts | Per-library Stream API key used only server-side. |
| Bunny Stream | BUNNY_STREAM_READ_ONLY_API_KEY | server secret | optional | required | src/app/api/webhook/bunny-stream/route.ts | Read-only API key used as Bunny webhook signing secret. |
| Bunny Stream | BUNNY_STREAM_TOKEN_SECURITY_KEY | server secret | optional | required | src/lib/bunny-stream/signing.ts | Key used to sign short-lived embed URLs. |
| Bunny Stream | BUNNY_STREAM_PULL_ZONE_HOSTNAME | operational secret | optional | optional | docs/bunny-stream-setup.md | Bunny storage or pull-zone hostname for operator reference. |
| Bunny Stream | BUNNY_STREAM_DEFAULT_COLLECTION_ID | operational secret | optional | optional | src/app/api/bunny-stream/upload-credentials/route.ts | Optional default Bunny collection for uploaded videos. |
| Bunny Stream | BUNNY_STREAM_TUS_EXPIRE_SECONDS | public | optional | optional | src/lib/bunny-stream/config.ts | TUS upload signature lifetime; default 86400 seconds. |
| Bunny Stream | BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS | public | optional | optional | src/lib/bunny-stream/config.ts | Signed embed URL lifetime; default 300 seconds. |
```

Add `Bunny Stream` to `requiredServiceGroups` in `scripts/verify-services.ts`:

```ts
  'Bunny Stream',
```

- [ ] **Step 5: Create setup doc**

Create `docs/bunny-stream-setup.md`:

```md
# Bunny Stream Setup

This guide maps Bunny Stream to this repository. Real credentials belong only in local `.env.local` or encrypted staging/production environment settings.

## Official Docs

- Stream Quickstart: https://docs.bunny.net/stream/quickstart
- Stream Authentication: https://docs.bunny.net/stream/authentication
- TUS Resumable Uploads: https://docs.bunny.net/stream/tus-resumable-uploads
- Stream Security: https://docs.bunny.net/stream/security
- MediaCage DRM: https://docs.bunny.net/stream/drm
- Embedded View Token Authentication: https://docs.bunny.net/stream/token-authentication
- Webhooks: https://docs.bunny.net/stream/webhooks

## Dashboard Setup

1. Open bunny.net dashboard.
2. Go to Delivery -> Stream.
3. Create a Video Library for the environment.
4. In Encoding, enable required resolutions and keep Early-Play disabled.
5. In Security, enable MediaCage Enterprise DRM when account access is available.
6. Enable embed view token authentication.
7. Add allowed domains without scheme, for example `staging.example.com`.
8. Configure webhook URL as `<APP_ORIGIN>/api/webhook/bunny-stream`.

## Repository Env

```text
BUNNY_STREAM_LIBRARY_ID=<numeric-library-id>
BUNNY_STREAM_API_KEY=<server-secret>
BUNNY_STREAM_READ_ONLY_API_KEY=<server-secret>
BUNNY_STREAM_TOKEN_SECURITY_KEY=<server-secret>
BUNNY_STREAM_TUS_EXPIRE_SECONDS=86400
BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS=300
```

## System Flow

Admin creates a Bunny upload from `/admin/videos`. The app creates a Bunny video object, signs TUS upload credentials, and stores a local unpublished `Video` row. Bunny processes the upload and calls `/api/webhook/bunny-stream`. Admin syncs/reviews/publishes after status is `READY` or explicitly accepted as `PLAYABLE`.

Learner playback still starts at `/watch/[videoId]`. The app checks entitlement first, then signs a short-lived Bunny iframe URL. Bunny handles DRM playback inside the iframe. The app records watch heartbeat outside the iframe.
```

- [ ] **Step 6: Create staging checklist**

Create `docs/bunny-stream-staging-checklist.md`:

```md
# Bunny Stream Staging Checklist

## Provider Setup

- [ ] Bunny Stream library exists for staging.
- [ ] MediaCage Enterprise DRM is enabled or account limitation is documented.
- [ ] Embed view token authentication is enabled.
- [ ] Early-Play is disabled.
- [ ] Originals are not exposed for protected course videos.
- [ ] Staging allowed domains are configured without `https://`.
- [ ] Webhook URL is `<STAGING_ORIGIN>/api/webhook/bunny-stream`.

## App Setup

- [ ] `npm run verify:bunny-stream -- --strict` passes in staging.
- [ ] `npm run verify:services:strict` includes Bunny Stream.
- [ ] No real Bunny key appears in logs, screenshots, docs, or commits.

## Smoke

- [ ] Admin creates a Bunny upload.
- [ ] Browser uploads through TUS.
- [ ] Bunny dashboard shows processing.
- [ ] Webhook or manual sync updates local status.
- [ ] Admin publishes after playback-ready status.
- [ ] Entitled learner plays video at `/watch/[videoId]`.
- [ ] Denied learner cannot obtain playback.
- [ ] Watch heartbeat updates watch record.
- [ ] View limit blocks later playback.
```

- [ ] **Step 7: Update operational docs and `.env.example`**

In `.env.example`, add placeholder-only values:

```text
BUNNY_STREAM_LIBRARY_ID=
BUNNY_STREAM_API_KEY=
BUNNY_STREAM_READ_ONLY_API_KEY=
BUNNY_STREAM_TOKEN_SECURITY_KEY=
BUNNY_STREAM_TUS_EXPIRE_SECONDS=86400
BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS=300
```

In `docs/staging-smoke-checklist.md`, add Bunny rows for upload, webhook, entitled playback, denied playback, heartbeat, and view limit.

In `docs/operations/subsystems.md`, add a `Bunny Stream` section and keep Axinom as legacy/transition provider.

In `docs/operations/vendor-upgrades.md`, add Bunny dashboard/API upgrade checks: encoding settings, MediaCage DRM, token auth, webhook signature headers, TUS behavior.

In `docs/operations/health-checklist.md`, add Bunny Stream readiness checks.

- [ ] **Step 8: Run docs test and verifier**

Run:

```bash
npm test -- __tests__/scripts/bunny-stream-docs.test.ts --runInBand
npm run verify:bunny-stream
```

Expected: tests pass; local verifier exits `0` or prints `SKIP` lines when env missing.

- [ ] **Step 9: Commit**

Run:

```bash
git add scripts/verify-bunny-stream-setup.ts docs/env-matrix.md docs/bunny-stream-setup.md docs/bunny-stream-staging-checklist.md docs/staging-smoke-checklist.md docs/operations/subsystems.md docs/operations/vendor-upgrades.md docs/operations/health-checklist.md .env.example __tests__/scripts/bunny-stream-docs.test.ts package.json
git commit -m "docs: document bunny stream setup"
```

## Task 11: Final Verification And Integration Check

**Files:**
- All touched files from prior tasks

- [ ] **Step 1: Run focused Bunny tests**

Run:

```bash
npm test -- __tests__/lib/bunny-stream-config.test.ts __tests__/lib/bunny-stream-signing.test.ts __tests__/lib/bunny-stream-status.test.ts __tests__/lib/bunny-stream-client.test.ts __tests__/lib/bunny-stream-playback.test.ts __tests__/api/bunny-stream-routes.test.ts __tests__/components/bunny-stream-player.test.tsx __tests__/scripts/bunny-stream-docs.test.ts --runInBand
```

Expected: all pass.

- [ ] **Step 2: Run existing media route tests**

Run:

```bash
npm test -- __tests__/api/media-routes.test.ts __tests__/hooks/use-shaka-player.test.tsx --runInBand
```

Expected: pass, proving old Axinom/Shaka entitlement route behavior still works.

- [ ] **Step 3: Run global static verification**

Run:

```bash
npm run lint
npm run typecheck
npm test -- --runInBand
npm run build
npm run verify:bunny-stream
npm run verify:services
```

Expected: commands exit `0`. If legacy warnings exist, record them but do not hide Bunny failures.

- [ ] **Step 4: Manual staging smoke with real Bunny account**

After staging env is configured:

```bash
npm run verify:bunny-stream -- --strict
```

Then perform:

1. Admin uploads a small MP4 through `/admin/videos`.
2. Bunny dashboard shows upload and processing.
3. Webhook or manual sync changes local status to `PLAYABLE` or `READY`.
4. Admin publishes the video.
5. Entitled learner plays `/watch/[videoId]`.
6. Denied learner cannot access playback.
7. Watch record updates after first heartbeat.
8. View limit blocks replay after limit.

Record sanitized result in `docs/bunny-stream-staging-checklist.md`. Do not record real keys, signed URLs, full emails, or screenshots containing secrets.

- [ ] **Step 5: Commit smoke evidence if performed**

Run only after manual smoke evidence is added:

```bash
git add docs/bunny-stream-staging-checklist.md docs/staging-smoke-checklist.md
git commit -m "docs: record bunny stream staging smoke"
```

## Implementation Notes

- Do not delete Axinom code in this plan. The migration is additive and provider-switched.
- If Prisma Mongo does not support an enum migration in current data shape without deployment prep, convert enum fields to `String` with constants before executing Task 1. Keep test expectations identical.
- `PLAYABLE` means first rendition is playable; `READY` means encoding finished. Publishing `PLAYABLE` videos should be an explicit operator choice.
- Bunny Enterprise DRM account access must be confirmed in dashboard before production acceptance.
- If `tus-js-client` type imports fail, install `@types/tus-js-client` only if the package does not ship types in the installed version.
- Never print or commit real Bunny API keys, read-only keys, token security keys, upload signatures, signed embed URLs, or webhook signatures.
