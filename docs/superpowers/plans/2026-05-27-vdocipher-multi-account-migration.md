# VdoCipher Multi-Account Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Axinom as the active new-video provider with multi-account VdoCipher upload, status sync, OTP playback, and admin controls while preserving existing Axinom rows.

**Architecture:** Add provider fields to `Video`, introduce server-only VdoCipher account/client helpers, then route new upload/playback through VdoCipher when `provider = VDOCIPHER`. Existing app entitlement remains the security boundary; VdoCipher OTP generation happens only after entitlement passes and uses the `vdocipherAccountId` stored on the video row.

**Tech Stack:** Next.js App Router route handlers, React 18 client components, Prisma MongoDB, Jest, VdoCipher Server API v3, existing NextAuth session helpers, existing admin UI patterns.

---

## File Structure

- Modify: `prisma/schema.prisma`
  - Add `VideoProvider`, `VdoCipherStatus`, and VdoCipher fields/indexes on `Video`.
- Create: `src/lib/vdocipher-accounts.ts`
  - Parse `VDOCIPHER_ACCOUNT_IDS`, resolve default and requested account IDs, normalize env suffixes, expose safe account metadata.
- Create: `src/lib/vdocipher.ts`
  - Server-only VdoCipher API client for upload credentials, video status, and OTP.
- Create: `src/lib/vdocipher-watermark.ts`
  - Convert existing watermark text into VdoCipher `annotate` JSON string.
- Create: `src/components/video/VdoCipherPlayer.tsx`
  - Iframe player wrapper that uses `otp` and `playbackInfo`.
- Modify: `src/components/course/WatchPageClient.tsx`
  - Accept provider-specific playback payload and render either `DRMPlayerWrapper` or `VdoCipherPlayer`.
- Modify: `src/app/watch/[videoId]/page.tsx`
  - Keep entitlement logic, pass provider/VdoCipher state to client.
- Create: `src/app/api/vdocipher/accounts/route.ts`
  - Admin-only safe account list for upload selector.
- Create: `src/app/api/vdocipher/upload-credentials/route.ts`
  - Admin-only VdoCipher direct upload bootstrap.
- Create: `src/app/api/vdocipher/otp/route.ts`
  - Entitled-user OTP generation.
- Create: `src/app/api/video/vdocipher/sync/route.ts`
  - Admin-only manual status sync.
- Create: `src/app/api/webhook/vdocipher/route.ts`
  - VdoCipher webhook receiver, with shared-secret fallback check.
- Modify: `src/app/api/admin/videos/route.ts`
  - Return provider and VdoCipher fields.
- Modify: `src/app/admin/videos/page.tsx`
  - Add provider/status/account display, account selector, VdoCipher upload flow, VdoCipher sync action.
- Modify: `scripts/verify-services.ts`
  - Validate VdoCipher config without printing secrets.
- Modify: `docs/env-matrix.md`, `docs/provider-zero-setup.md`, `docs/staging-smoke-checklist.md`, `docs/manual-testing-guide.md`, `docs/operations/subsystems.md`, `docs/operations/health-checklist.md`
  - Add VdoCipher setup, smoke, and operations notes.
- Create tests:
  - `__tests__/lib/vdocipher-accounts.test.ts`
  - `__tests__/lib/vdocipher-watermark.test.ts`
  - `__tests__/lib/vdocipher.test.ts`
  - `__tests__/api/vdocipher-routes.test.ts`
  - `__tests__/components/vdocipher-player.test.tsx`
  - Update doc verifier tests if they assert Axinom-only text.

## Task 1: Schema And Generated Types

**Files:**
- Modify: `prisma/schema.prisma`
- Test: Prisma validation via `npm run prisma:generate`

- [ ] **Step 1: Add provider enums and fields**

Edit `prisma/schema.prisma`:

```prisma
enum VideoProvider {
  AXINOM
  VDOCIPHER
}

enum VdoCipherStatus {
  PRE_UPLOAD
  QUEUED
  READY
  ERROR
}
```

Add to `model Video` after `published`:

```prisma
  provider      VideoProvider @default(AXINOM)
```

Add after Axinom fields:

```prisma
  vdocipherVideoId   String?
  vdocipherAccountId String?
  vdocipherStatus    VdoCipherStatus?
  vdocipherPosterUrl String?
  vdocipherSyncedAt  DateTime?
  vdocipherError     String?
```

Add indexes inside `model Video`:

```prisma
  @@index([provider])
  @@index([vdocipherAccountId])
  @@index([vdocipherVideoId])
  @@index([vdocipherStatus])
```

- [ ] **Step 2: Generate Prisma client**

Run:

```bash
npm run prisma:generate
```

Expected: command exits `0` and Prisma Client is generated.

- [ ] **Step 3: Commit schema change**

Run:

```bash
git add prisma/schema.prisma
git commit -m "feat: add vdocipher video metadata"
```

## Task 2: VdoCipher Account Registry

**Files:**
- Create: `src/lib/vdocipher-accounts.ts`
- Test: `__tests__/lib/vdocipher-accounts.test.ts`

- [ ] **Step 1: Write account registry tests**

Create `__tests__/lib/vdocipher-accounts.test.ts`:

```ts
import {
  listVdoCipherAccounts,
  resolveVdoCipherAccount,
  getVdoCipherAccountEnvSuffix,
} from '@/lib/vdocipher-accounts';

describe('vdocipher account registry', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.VDOCIPHER_ACCOUNT_IDS;
    delete process.env.VDOCIPHER_DEFAULT_ACCOUNT_ID;
    delete process.env.VDOCIPHER_API_SECRET_PRIMARY;
    delete process.env.VDOCIPHER_API_SECRET_BACKUP_1;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('normalizes account IDs for env suffixes', () => {
    expect(getVdoCipherAccountEnvSuffix('backup-1')).toBe('BACKUP_1');
    expect(getVdoCipherAccountEnvSuffix('primary')).toBe('PRIMARY');
  });

  it('lists configured accounts without exposing secrets', () => {
    process.env.VDOCIPHER_ACCOUNT_IDS = 'primary,backup-1';
    process.env.VDOCIPHER_DEFAULT_ACCOUNT_ID = 'primary';
    process.env.VDOCIPHER_API_SECRET_PRIMARY = 'secret-a';
    process.env.VDOCIPHER_API_SECRET_BACKUP_1 = 'secret-b';

    expect(listVdoCipherAccounts()).toEqual([
      { id: 'primary', isDefault: true, configured: true },
      { id: 'backup-1', isDefault: false, configured: true },
    ]);
  });

  it('resolves requested account secret', () => {
    process.env.VDOCIPHER_ACCOUNT_IDS = 'primary,backup-1';
    process.env.VDOCIPHER_DEFAULT_ACCOUNT_ID = 'primary';
    process.env.VDOCIPHER_API_SECRET_PRIMARY = 'secret-a';
    process.env.VDOCIPHER_API_SECRET_BACKUP_1 = 'secret-b';

    expect(resolveVdoCipherAccount('backup-1')).toEqual({
      id: 'backup-1',
      apiSecret: 'secret-b',
      isDefault: false,
    });
  });

  it('uses default account when request omits account', () => {
    process.env.VDOCIPHER_ACCOUNT_IDS = 'primary';
    process.env.VDOCIPHER_DEFAULT_ACCOUNT_ID = 'primary';
    process.env.VDOCIPHER_API_SECRET_PRIMARY = 'secret-a';

    expect(resolveVdoCipherAccount()).toEqual({
      id: 'primary',
      apiSecret: 'secret-a',
      isDefault: true,
    });
  });

  it('throws for unknown requested account', () => {
    process.env.VDOCIPHER_ACCOUNT_IDS = 'primary';
    process.env.VDOCIPHER_API_SECRET_PRIMARY = 'secret-a';

    expect(() => resolveVdoCipherAccount('missing')).toThrow('Unknown VdoCipher account: missing');
  });

  it('throws for configured account missing secret', () => {
    process.env.VDOCIPHER_ACCOUNT_IDS = 'primary';

    expect(() => resolveVdoCipherAccount('primary')).toThrow('Missing VdoCipher API secret for account: primary');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/lib/vdocipher-accounts.test.ts
```

Expected: FAIL because `src/lib/vdocipher-accounts.ts` does not exist.

- [ ] **Step 3: Implement account registry**

Create `src/lib/vdocipher-accounts.ts`:

```ts
export type SafeVdoCipherAccount = {
  id: string;
  isDefault: boolean;
  configured: boolean;
};

export type ResolvedVdoCipherAccount = {
  id: string;
  apiSecret: string;
  isDefault: boolean;
};

function splitAccountIds(value: string | undefined) {
  return (value ?? 'primary')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export function getVdoCipherAccountEnvSuffix(accountId: string) {
  const suffix = accountId.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  if (!suffix) {
    throw new Error('VdoCipher account ID must contain at least one alphanumeric character');
  }

  return suffix;
}

function readSecret(accountId: string, env: NodeJS.ProcessEnv = process.env) {
  return env[`VDOCIPHER_API_SECRET_${getVdoCipherAccountEnvSuffix(accountId)}`]?.trim();
}

export function getDefaultVdoCipherAccountId(env: NodeJS.ProcessEnv = process.env) {
  const ids = splitAccountIds(env.VDOCIPHER_ACCOUNT_IDS);
  const configuredDefault = env.VDOCIPHER_DEFAULT_ACCOUNT_ID?.trim();

  if (configuredDefault && ids.includes(configuredDefault)) {
    return configuredDefault;
  }

  return ids[0] ?? 'primary';
}

export function listVdoCipherAccounts(env: NodeJS.ProcessEnv = process.env): SafeVdoCipherAccount[] {
  const ids = splitAccountIds(env.VDOCIPHER_ACCOUNT_IDS);
  const defaultId = getDefaultVdoCipherAccountId(env);

  return ids.map((id) => ({
    id,
    isDefault: id === defaultId,
    configured: Boolean(readSecret(id, env)),
  }));
}

export function resolveVdoCipherAccount(
  requestedAccountId?: string | null,
  env: NodeJS.ProcessEnv = process.env
): ResolvedVdoCipherAccount {
  const ids = splitAccountIds(env.VDOCIPHER_ACCOUNT_IDS);
  const accountId = requestedAccountId?.trim() || getDefaultVdoCipherAccountId(env);

  if (!ids.includes(accountId)) {
    throw new Error(`Unknown VdoCipher account: ${accountId}`);
  }

  const apiSecret = readSecret(accountId, env);

  if (!apiSecret) {
    throw new Error(`Missing VdoCipher API secret for account: ${accountId}`);
  }

  return {
    id: accountId,
    apiSecret,
    isDefault: accountId === getDefaultVdoCipherAccountId(env),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- __tests__/lib/vdocipher-accounts.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit account registry**

Run:

```bash
git add src/lib/vdocipher-accounts.ts __tests__/lib/vdocipher-accounts.test.ts
git commit -m "feat: add vdocipher account registry"
```

## Task 3: VdoCipher API Client And Watermark Builder

**Files:**
- Create: `src/lib/vdocipher.ts`
- Create: `src/lib/vdocipher-watermark.ts`
- Test: `__tests__/lib/vdocipher.test.ts`
- Test: `__tests__/lib/vdocipher-watermark.test.ts`

- [ ] **Step 1: Write watermark tests**

Create `__tests__/lib/vdocipher-watermark.test.ts`:

```ts
import { buildVdoCipherAnnotate } from '@/lib/vdocipher-watermark';

describe('buildVdoCipherAnnotate', () => {
  it('returns a JSON string accepted by VdoCipher annotate field', () => {
    const annotate = buildVdoCipherAnnotate('Nguyen Van A • 0900000000');
    const parsed = JSON.parse(annotate);

    expect(parsed).toEqual([
      {
        type: 'rtext',
        text: 'Nguyen Van A • 0900000000',
        alpha: '0.60',
        color: '0xFFFFFF',
        size: '15',
        interval: '5000',
        skip: '5000',
      },
    ]);
  });

  it('caps long watermark text', () => {
    const annotate = buildVdoCipherAnnotate('x'.repeat(500));
    const parsed = JSON.parse(annotate);

    expect(parsed[0].text).toHaveLength(160);
  });
});
```

- [ ] **Step 2: Write API client tests**

Create `__tests__/lib/vdocipher.test.ts`:

```ts
import {
  createVdoCipherUpload,
  getVdoCipherVideoStatus,
  getVdoCipherOtp,
} from '@/lib/vdocipher';

describe('vdocipher api client', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('requests upload credentials with Apisecret auth', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        videoId: 'vdo-1',
        clientPayload: { uploadLink: 'https://upload.example.test' },
      }),
    });

    const result = await createVdoCipherUpload({
      apiSecret: 'secret-a',
      title: 'Lesson 01',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://dev.vdocipher.com/api/videos',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: 'Apisecret secret-a',
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(result.videoId).toBe('vdo-1');
    expect(result.clientPayload.uploadLink).toBe('https://upload.example.test');
  });

  it('gets video status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'vdo-1',
        status: 'ready',
        poster: 'https://poster.example.test/image.jpg',
      }),
    });

    const result = await getVdoCipherVideoStatus({
      apiSecret: 'secret-a',
      vdoCipherVideoId: 'vdo-1',
    });

    expect(result.status).toBe('ready');
    expect(result.poster).toBe('https://poster.example.test/image.jpg');
  });

  it('gets OTP with ttl and annotation', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ otp: 'otp-value', playbackInfo: 'playback-info' }),
    });

    const result = await getVdoCipherOtp({
      apiSecret: 'secret-a',
      vdoCipherVideoId: 'vdo-1',
      ttl: 300,
      annotate: '[{"type":"rtext","text":"User"}]',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://dev.vdocipher.com/api/videos/vdo-1/otp',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          ttl: 300,
          annotate: '[{"type":"rtext","text":"User"}]',
        }),
      })
    );
    expect(result).toEqual({ otp: 'otp-value', playbackInfo: 'playback-info' });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm test -- __tests__/lib/vdocipher-watermark.test.ts __tests__/lib/vdocipher.test.ts
```

Expected: FAIL because modules do not exist.

- [ ] **Step 4: Implement watermark builder**

Create `src/lib/vdocipher-watermark.ts`:

```ts
const MAX_WATERMARK_LENGTH = 160;

export function buildVdoCipherAnnotate(watermarkText: string) {
  const safeText = watermarkText.trim().slice(0, MAX_WATERMARK_LENGTH);

  return JSON.stringify([
    {
      type: 'rtext',
      text: safeText,
      alpha: '0.60',
      color: '0xFFFFFF',
      size: '15',
      interval: '5000',
      skip: '5000',
    },
  ]);
}
```

- [ ] **Step 5: Implement API client**

Create `src/lib/vdocipher.ts`:

```ts
const VDOCIPHER_API_BASE = 'https://dev.vdocipher.com/api';

export type VdoCipherUploadResponse = {
  videoId: string;
  clientPayload: Record<string, unknown>;
};

export type VdoCipherStatusResponse = {
  id?: string;
  status?: string;
  poster?: string;
  title?: string;
};

export type VdoCipherOtpResponse = {
  otp: string;
  playbackInfo: string;
};

async function parseVdoCipherResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof body?.message === 'string' ? body.message : `VdoCipher API failed with ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

function authHeaders(apiSecret: string) {
  return {
    Accept: 'application/json',
    Authorization: `Apisecret ${apiSecret}`,
    'Content-Type': 'application/json',
  };
}

export async function createVdoCipherUpload(options: {
  apiSecret: string;
  title: string;
}): Promise<VdoCipherUploadResponse> {
  const response = await fetch(`${VDOCIPHER_API_BASE}/videos`, {
    method: 'PUT',
    headers: authHeaders(options.apiSecret),
    body: JSON.stringify({
      title: options.title,
    }),
  });

  return parseVdoCipherResponse<VdoCipherUploadResponse>(response);
}

export async function getVdoCipherVideoStatus(options: {
  apiSecret: string;
  vdoCipherVideoId: string;
}): Promise<VdoCipherStatusResponse> {
  const response = await fetch(`${VDOCIPHER_API_BASE}/videos/${options.vdoCipherVideoId}`, {
    method: 'GET',
    headers: authHeaders(options.apiSecret),
  });

  return parseVdoCipherResponse<VdoCipherStatusResponse>(response);
}

export async function getVdoCipherOtp(options: {
  apiSecret: string;
  vdoCipherVideoId: string;
  ttl: number;
  annotate: string;
}): Promise<VdoCipherOtpResponse> {
  const response = await fetch(`${VDOCIPHER_API_BASE}/videos/${options.vdoCipherVideoId}/otp`, {
    method: 'POST',
    headers: authHeaders(options.apiSecret),
    body: JSON.stringify({
      ttl: options.ttl,
      annotate: options.annotate,
    }),
  });

  return parseVdoCipherResponse<VdoCipherOtpResponse>(response);
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run:

```bash
npm test -- __tests__/lib/vdocipher-watermark.test.ts __tests__/lib/vdocipher.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit client helpers**

Run:

```bash
git add src/lib/vdocipher.ts src/lib/vdocipher-watermark.ts __tests__/lib/vdocipher.test.ts __tests__/lib/vdocipher-watermark.test.ts
git commit -m "feat: add vdocipher api helpers"
```

## Task 4: VdoCipher Upload, Account List, And Status Sync Routes

**Files:**
- Create: `src/app/api/vdocipher/accounts/route.ts`
- Create: `src/app/api/vdocipher/upload-credentials/route.ts`
- Create: `src/app/api/video/vdocipher/sync/route.ts`
- Test: `__tests__/api/vdocipher-routes.test.ts`

- [ ] **Step 1: Write route tests**

Create `__tests__/api/vdocipher-routes.test.ts` with tests that mock `next-auth`, Prisma, and VdoCipher helpers:

```ts
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    course: { findUnique: jest.fn() },
    video: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  },
}));
jest.mock('@/lib/vdocipher-accounts', () => ({
  listVdoCipherAccounts: jest.fn(),
  resolveVdoCipherAccount: jest.fn(),
}));
jest.mock('@/lib/vdocipher', () => ({
  createVdoCipherUpload: jest.fn(),
  getVdoCipherVideoStatus: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { listVdoCipherAccounts, resolveVdoCipherAccount } from '@/lib/vdocipher-accounts';
import { createVdoCipherUpload, getVdoCipherVideoStatus } from '@/lib/vdocipher';
import { GET as getAccounts } from '@/app/api/vdocipher/accounts/route';
import { POST as createUpload } from '@/app/api/vdocipher/upload-credentials/route';
import { POST as syncVideo } from '@/app/api/video/vdocipher/sync/route';

describe('vdocipher routes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns safe account list to admins only', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
    (listVdoCipherAccounts as jest.Mock).mockReturnValue([{ id: 'primary', isDefault: true, configured: true }]);

    const response = await getAccounts();
    await expect(response.json()).resolves.toEqual({ accounts: [{ id: 'primary', isDefault: true, configured: true }] });
  });

  it('creates VdoCipher upload and stores selected account', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
    (prisma.course.findUnique as jest.Mock).mockResolvedValue({ id: 'course-id', isDeleted: false });
    (resolveVdoCipherAccount as jest.Mock).mockReturnValue({ id: 'backup1', apiSecret: 'secret', isDefault: false });
    (createVdoCipherUpload as jest.Mock).mockResolvedValue({
      videoId: 'vdo-id',
      clientPayload: { uploadLink: 'https://upload.example.test' },
    });
    (prisma.video.create as jest.Mock).mockResolvedValue({ id: 'local-video-id' });

    const request = new Request('http://localhost/api/vdocipher/upload-credentials', {
      method: 'POST',
      body: JSON.stringify({
        filename: 'lesson.mp4',
        contentType: 'video/mp4',
        courseId: 'course-id',
        title: 'Lesson',
        accountId: 'backup1',
      }),
    });

    const response = await createUpload(request);
    await expect(response.json()).resolves.toEqual({
      videoId: 'local-video-id',
      vdocipherVideoId: 'vdo-id',
      accountId: 'backup1',
      clientPayload: { uploadLink: 'https://upload.example.test' },
    });
    expect(prisma.video.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: 'VDOCIPHER',
        vdocipherAccountId: 'backup1',
        vdocipherVideoId: 'vdo-id',
        vdocipherStatus: 'PRE_UPLOAD',
      }),
    });
  });

  it('syncs VdoCipher status for stored account', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
    (prisma.video.findUnique as jest.Mock).mockResolvedValue({
      id: 'local-video-id',
      provider: 'VDOCIPHER',
      vdocipherAccountId: 'primary',
      vdocipherVideoId: 'vdo-id',
    });
    (resolveVdoCipherAccount as jest.Mock).mockReturnValue({ id: 'primary', apiSecret: 'secret', isDefault: true });
    (getVdoCipherVideoStatus as jest.Mock).mockResolvedValue({ status: 'ready', poster: 'https://poster.example.test' });
    (prisma.video.update as jest.Mock).mockResolvedValue({});

    const request = new Request('http://localhost/api/video/vdocipher/sync', {
      method: 'POST',
      body: JSON.stringify({ videoId: 'local-video-id' }),
    });

    const response = await syncVideo(request);
    await expect(response.json()).resolves.toMatchObject({ success: true, status: 'READY' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/api/vdocipher-routes.test.ts
```

Expected: FAIL because routes do not exist.

- [ ] **Step 3: Implement account list route**

Create `src/app/api/vdocipher/accounts/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listVdoCipherAccounts } from '@/lib/vdocipher-accounts';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  return NextResponse.json({ accounts: listVdoCipherAccounts() });
}
```

- [ ] **Step 4: Implement upload credentials route**

Create `src/app/api/vdocipher/upload-credentials/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveVdoCipherAccount } from '@/lib/vdocipher-accounts';
import { createVdoCipherUpload } from '@/lib/vdocipher';

const uploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^video\//).optional(),
  courseId: z.string().length(24),
  title: z.string().max(255).optional(),
  accountId: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = uploadSchema.parse(await req.json());
    const course = await prisma.course.findUnique({
      where: { id: body.courseId },
      select: { id: true, isDeleted: true },
    });

    if (!course || course.isDeleted) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const account = resolveVdoCipherAccount(body.accountId);
    const title = body.title?.trim() || body.filename;
    const upload = await createVdoCipherUpload({
      apiSecret: account.apiSecret,
      title,
    });

    const video = await prisma.video.create({
      data: {
        title,
        courseId: body.courseId,
        provider: 'VDOCIPHER',
        vdocipherAccountId: account.id,
        vdocipherVideoId: upload.videoId,
        vdocipherStatus: 'PRE_UPLOAD',
        published: false,
      },
    });

    return NextResponse.json({
      videoId: video.id,
      vdocipherVideoId: upload.videoId,
      accountId: account.id,
      clientPayload: upload.clientPayload,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create VdoCipher upload' },
      { status: 400 }
    );
  }
}
```

- [ ] **Step 5: Implement status sync route**

Create `src/app/api/video/vdocipher/sync/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveVdoCipherAccount } from '@/lib/vdocipher-accounts';
import { getVdoCipherVideoStatus } from '@/lib/vdocipher';

function mapStatus(status: string | undefined) {
  const normalized = status?.toLowerCase();

  if (normalized === 'ready') return 'READY';
  if (normalized === 'queued' || normalized === 'processing') return 'QUEUED';
  if (normalized === 'pre-upload') return 'PRE_UPLOAD';
  if (normalized === 'error') return 'ERROR';

  return 'QUEUED';
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { videoId } = await req.json();

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  const video = await prisma.video.findUnique({ where: { id: videoId } });

  if (!video || video.provider !== 'VDOCIPHER' || !video.vdocipherVideoId || !video.vdocipherAccountId) {
    return NextResponse.json({ error: 'VdoCipher video not found' }, { status: 404 });
  }

  const account = resolveVdoCipherAccount(video.vdocipherAccountId);
  const status = await getVdoCipherVideoStatus({
    apiSecret: account.apiSecret,
    vdoCipherVideoId: video.vdocipherVideoId,
  });
  const mappedStatus = mapStatus(status.status);

  await prisma.video.update({
    where: { id: video.id },
    data: {
      vdocipherStatus: mappedStatus,
      vdocipherPosterUrl: status.poster,
      vdocipherSyncedAt: new Date(),
      vdocipherError: mappedStatus === 'ERROR' ? 'VdoCipher reported processing error' : null,
    },
  });

  return NextResponse.json({ success: true, status: mappedStatus });
}
```

- [ ] **Step 6: Run route tests**

Run:

```bash
npm test -- __tests__/api/vdocipher-routes.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit routes**

Run:

```bash
git add src/app/api/vdocipher src/app/api/video/vdocipher __tests__/api/vdocipher-routes.test.ts
git commit -m "feat: add vdocipher upload and sync routes"
```

## Task 5: VdoCipher OTP Route

**Files:**
- Create: `src/app/api/vdocipher/otp/route.ts`
- Modify: `__tests__/api/vdocipher-routes.test.ts`

- [ ] **Step 1: Add OTP route tests**

Append to `__tests__/api/vdocipher-routes.test.ts`:

```ts
jest.mock('@/lib/media-entitlement', () => ({
  evaluateMediaEntitlement: jest.fn(),
  mapMediaEntitlementToHttp: jest.fn(),
}));
jest.mock('@/lib/vdocipher-watermark', () => ({
  buildVdoCipherAnnotate: jest.fn(),
}));
jest.mock('@/lib/vdocipher', () => ({
  createVdoCipherUpload: jest.fn(),
  getVdoCipherVideoStatus: jest.fn(),
  getVdoCipherOtp: jest.fn(),
}));

import { evaluateMediaEntitlement, mapMediaEntitlementToHttp } from '@/lib/media-entitlement';
import { buildVdoCipherAnnotate } from '@/lib/vdocipher-watermark';
import { getVdoCipherOtp } from '@/lib/vdocipher';
import { POST as getOtp } from '@/app/api/vdocipher/otp/route';

it('generates OTP only after entitlement passes', async () => {
  (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user-id', email: 'user@example.test' } });
  (evaluateMediaEntitlement as jest.Mock).mockResolvedValue({
    allowed: true,
    user: { id: 'user-id', name: 'Learner', email: 'user@example.test' },
    video: {
      id: 'local-video-id',
      provider: 'VDOCIPHER',
      vdocipherAccountId: 'primary',
      vdocipherVideoId: 'vdo-id',
      vdocipherStatus: 'READY',
    },
  });
  (resolveVdoCipherAccount as jest.Mock).mockReturnValue({ id: 'primary', apiSecret: 'secret', isDefault: true });
  (buildVdoCipherAnnotate as jest.Mock).mockReturnValue('[{"type":"rtext","text":"Learner"}]');
  (getVdoCipherOtp as jest.Mock).mockResolvedValue({ otp: 'otp', playbackInfo: 'playback' });

  const request = new Request('http://localhost/api/vdocipher/otp', {
    method: 'POST',
    body: JSON.stringify({ videoId: 'local-video-id' }),
  });

  const response = await getOtp(request);
  await expect(response.json()).resolves.toEqual({ otp: 'otp', playbackInfo: 'playback', expiresIn: 300 });
  expect(evaluateMediaEntitlement).toHaveBeenCalledWith({
    session: { user: { id: 'user-id', email: 'user@example.test' } },
    videoId: 'local-video-id',
    checkViewLimit: true,
  });
});

it('rejects denied entitlement before VdoCipher call', async () => {
  (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user-id' } });
  (evaluateMediaEntitlement as jest.Mock).mockResolvedValue({ allowed: false, code: 'NO_VIDEO_ACCESS' });
  (mapMediaEntitlementToHttp as jest.Mock).mockReturnValue({ status: 403, body: 'Forbidden' });

  const request = new Request('http://localhost/api/vdocipher/otp', {
    method: 'POST',
    body: JSON.stringify({ videoId: 'local-video-id' }),
  });

  const response = await getOtp(request);
  expect(response.status).toBe(403);
  expect(getVdoCipherOtp).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/api/vdocipher-routes.test.ts
```

Expected: FAIL because OTP route does not exist.

- [ ] **Step 3: Implement OTP route**

Create `src/app/api/vdocipher/otp/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { evaluateMediaEntitlement, mapMediaEntitlementToHttp } from '@/lib/media-entitlement';
import { resolveVdoCipherAccount } from '@/lib/vdocipher-accounts';
import { getVdoCipherOtp } from '@/lib/vdocipher';
import { buildVdoCipherAnnotate } from '@/lib/vdocipher-watermark';

const OTP_TTL_SECONDS = 300;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const { videoId } = await req.json();

  if (!videoId) {
    return new NextResponse('Invalid request', { status: 400 });
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

  const { video, user } = entitlement;

  if (
    video.provider !== 'VDOCIPHER' ||
    video.vdocipherStatus !== 'READY' ||
    !video.vdocipherVideoId ||
    !video.vdocipherAccountId
  ) {
    return new NextResponse('Video is not ready for VdoCipher playback', { status: 404 });
  }

  const account = resolveVdoCipherAccount(video.vdocipherAccountId);
  const watermarkText = user.name || user.email || user.id;
  const otp = await getVdoCipherOtp({
    apiSecret: account.apiSecret,
    vdoCipherVideoId: video.vdocipherVideoId,
    ttl: OTP_TTL_SECONDS,
    annotate: buildVdoCipherAnnotate(watermarkText),
  });

  return NextResponse.json({
    otp: otp.otp,
    playbackInfo: otp.playbackInfo,
    expiresIn: OTP_TTL_SECONDS,
  });
}
```

- [ ] **Step 4: Run test**

Run:

```bash
npm test -- __tests__/api/vdocipher-routes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit OTP route**

Run:

```bash
git add src/app/api/vdocipher/otp/route.ts __tests__/api/vdocipher-routes.test.ts
git commit -m "feat: add vdocipher otp route"
```

## Task 6: Watch Page Provider Switch And VdoCipher Player

**Files:**
- Create: `src/components/video/VdoCipherPlayer.tsx`
- Modify: `src/components/course/WatchPageClient.tsx`
- Modify: `src/app/watch/[videoId]/page.tsx`
- Test: `__tests__/components/vdocipher-player.test.tsx`

- [ ] **Step 1: Write player component test**

Create `__tests__/components/vdocipher-player.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import VdoCipherPlayer from '@/components/video/VdoCipherPlayer';

describe('VdoCipherPlayer', () => {
  it('renders iframe with encoded otp and playbackInfo', () => {
    render(<VdoCipherPlayer otp="otp value" playbackInfo="playback/value" title="Lesson 01" />);

    const iframe = screen.getByTitle('Lesson 01') as HTMLIFrameElement;
    expect(iframe.src).toContain('https://player.vdocipher.com/v2/');
    expect(iframe.src).toContain('otp=otp+value');
    expect(iframe.src).toContain('playbackInfo=playback%2Fvalue');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/components/vdocipher-player.test.tsx
```

Expected: FAIL because component does not exist.

- [ ] **Step 3: Implement VdoCipher player**

Create `src/components/video/VdoCipherPlayer.tsx`:

```tsx
'use client';

type VdoCipherPlayerProps = {
  otp: string;
  playbackInfo: string;
  title: string;
};

export default function VdoCipherPlayer({ otp, playbackInfo, title }: VdoCipherPlayerProps) {
  const params = new URLSearchParams({ otp, playbackInfo });

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-xl">
      <iframe
        title={title}
        src={`https://player.vdocipher.com/v2/?${params.toString()}`}
        className="h-full w-full border-0"
        allow="encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
```

- [ ] **Step 4: Modify watch client provider switch**

Change `src/components/course/WatchPageClient.tsx` props to include:

```ts
type VdoCipherPlayback = {
    provider: 'VDOCIPHER';
    otp: string;
    playbackInfo: string;
};

type AxinomPlayback = {
    provider: 'AXINOM';
};
```

Add dynamic import:

```ts
const VdoCipherPlayer = dynamic(() => import('@/components/video/VdoCipherPlayer'), {
    ssr: false,
    loading: () => <PlayerLoading />
});
```

Add prop:

```ts
    providerPlayback: AxinomPlayback | VdoCipherPlayback;
```

Replace the `DRMPlayerWrapper` render with:

```tsx
                                {providerPlayback.provider === 'VDOCIPHER' ? (
                                    <VdoCipherPlayer
                                        otp={providerPlayback.otp}
                                        playbackInfo={providerPlayback.playbackInfo}
                                        title={courseTitle}
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

- [ ] **Step 5: Modify watch page server payload**

In `src/app/watch/[videoId]/page.tsx`, import:

```ts
import { resolveVdoCipherAccount } from '@/lib/vdocipher-accounts';
import { getVdoCipherOtp } from '@/lib/vdocipher';
import { buildVdoCipherAnnotate } from '@/lib/vdocipher-watermark';
```

Replace Axinom token generation block with:

```ts
    let token = '';
    let providerPlayback:
        | { provider: 'AXINOM' }
        | { provider: 'VDOCIPHER'; otp: string; playbackInfo: string } = { provider: 'AXINOM' };

    if (video.provider === 'VDOCIPHER') {
        if (video.vdocipherStatus !== 'READY' || !video.vdocipherVideoId || !video.vdocipherAccountId) {
            notFound();
        }

        const account = resolveVdoCipherAccount(video.vdocipherAccountId);
        const watermarkText = whitelistEntry?.fullname && whitelistEntry?.phone
            ? `${whitelistEntry.fullname} • ${whitelistEntry.phone}`
            : user.name || user.email!;
        const otp = await getVdoCipherOtp({
            apiSecret: account.apiSecret,
            vdoCipherVideoId: video.vdocipherVideoId,
            ttl: 300,
            annotate: buildVdoCipherAnnotate(watermarkText),
        });

        providerPlayback = {
            provider: 'VDOCIPHER',
            otp: otp.otp,
            playbackInfo: otp.playbackInfo,
        };
    } else if (video.drmKeyId) {
        const { generateAxinomToken } = await import('@/lib/axinom');
        token = generateAxinomToken(video.drmKeyId);
    }
```

Pass to `WatchPageClient`:

```tsx
                providerPlayback={providerPlayback}
```

- [ ] **Step 6: Run player test and typecheck**

Run:

```bash
npm test -- __tests__/components/vdocipher-player.test.tsx
npm run typecheck
```

Expected: both pass.

- [ ] **Step 7: Commit playback switch**

Run:

```bash
git add src/components/video/VdoCipherPlayer.tsx src/components/course/WatchPageClient.tsx src/app/watch/[videoId]/page.tsx __tests__/components/vdocipher-player.test.tsx
git commit -m "feat: render vdocipher playback"
```

## Task 7: Admin Video UI Multi-Account Upload

**Files:**
- Modify: `src/app/api/admin/videos/route.ts`
- Modify: `src/app/admin/videos/page.tsx`

- [ ] **Step 1: Return VdoCipher fields from admin API**

Add to `src/app/api/admin/videos/route.ts` select:

```ts
                provider: true,
                vdocipherVideoId: true,
                vdocipherAccountId: true,
                vdocipherStatus: true,
                vdocipherPosterUrl: true,
                vdocipherSyncedAt: true,
                vdocipherError: true,
```

- [ ] **Step 2: Update admin page video type**

Add to `type Video` in `src/app/admin/videos/page.tsx`:

```ts
    provider: 'AXINOM' | 'VDOCIPHER';
    vdocipherVideoId: string | null;
    vdocipherAccountId: string | null;
    vdocipherStatus: string | null;
    vdocipherPosterUrl: string | null;
    vdocipherSyncedAt: string | null;
    vdocipherError: string | null;
```

Add account state:

```ts
    const [vdocipherAccounts, setVdocipherAccounts] = useState<{ id: string; isDefault: boolean; configured: boolean }[]>([]);
    const [selectedVdocipherAccountId, setSelectedVdocipherAccountId] = useState('');
```

- [ ] **Step 3: Load VdoCipher accounts with courses**

Inside upload dialog `useEffect`, add:

```ts
            fetch('/api/vdocipher/accounts')
                .then((res) => res.json())
                .then((data) => {
                    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
                    setVdocipherAccounts(accounts);
                    const defaultAccount = accounts.find((account: { isDefault: boolean; configured: boolean }) => account.isDefault && account.configured);
                    const firstConfigured = accounts.find((account: { configured: boolean }) => account.configured);
                    setSelectedVdocipherAccountId((defaultAccount || firstConfigured)?.id || '');
                })
                .catch((err) => console.error('Failed to load VdoCipher accounts', err));
```

- [ ] **Step 4: Replace upload flow with VdoCipher upload**

In `handleUpload`, replace `/api/upload/presigned` and `/api/video/process` sequence with:

```ts
            setStatus('Creating VdoCipher upload...');
            const res = await fetch('/api/vdocipher/upload-credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type,
                    title,
                    courseId: selectedCourseId,
                    accountId: selectedVdocipherAccountId || undefined,
                }),
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`Failed to create VdoCipher upload: ${err}`);
            }

            const { clientPayload } = await res.json();
            const uploadLink = clientPayload?.uploadLink;

            if (typeof uploadLink !== 'string') {
                throw new Error('VdoCipher upload response did not include uploadLink');
            }

            setStatus('Uploading to VdoCipher...');
            const uploadRes = await fetch(uploadLink, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                },
            });

            if (!uploadRes.ok) {
                throw new Error(`VdoCipher upload failed: ${uploadRes.status}`);
            }

            setStatus('Upload sent to VdoCipher. Use Sync Status after processing completes.');
```

- [ ] **Step 5: Add account selector to upload form**

Add before file input:

```tsx
                        {vdocipherAccounts.length > 1 && (
                            <div>
                                <Label htmlFor="vdocipherAccount">VdoCipher Account</Label>
                                <select
                                    id="vdocipherAccount"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={selectedVdocipherAccountId}
                                    onChange={(e) => setSelectedVdocipherAccountId(e.target.value)}
                                    required
                                >
                                    {vdocipherAccounts.map((account) => (
                                        <option key={account.id} value={account.id} disabled={!account.configured}>
                                            {account.id}{account.isDefault ? ' (default)' : ''}{account.configured ? '' : ' - missing secret'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
```

- [ ] **Step 6: Update table labels and sync action**

For each row:

```ts
const isVdoCipher = video.provider === 'VDOCIPHER';
const providerReady = isVdoCipher
    ? video.vdocipherStatus === 'READY'
    : Boolean(video.dashUrl && video.hlsUrl) || isReadyStatus(video.axinomEncodingStatus);
```

Render provider cell:

```tsx
<Badge variant={isVdoCipher ? 'default' : 'secondary'}>
    {isVdoCipher ? 'VdoCipher' : 'Axinom'}
</Badge>
```

Change sync route in `handleSync`:

```ts
            const selectedVideo = videos.find((video) => video.id === videoId);
            const endpoint = selectedVideo?.provider === 'VDOCIPHER'
                ? '/api/video/vdocipher/sync'
                : '/api/video/sync';
            const res = await fetch(endpoint, {
```

- [ ] **Step 7: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit admin UI**

Run:

```bash
git add src/app/api/admin/videos/route.ts src/app/admin/videos/page.tsx
git commit -m "feat: add vdocipher admin video controls"
```

## Task 8: Webhook Route

**Files:**
- Create: `src/app/api/webhook/vdocipher/route.ts`
- Modify: `__tests__/api/vdocipher-routes.test.ts`

- [ ] **Step 1: Add webhook tests**

Append to `__tests__/api/vdocipher-routes.test.ts`:

```ts
import { POST as vdocipherWebhook } from '@/app/api/webhook/vdocipher/route';

it('updates matching VdoCipher video from webhook payload', async () => {
  process.env.VDOCIPHER_WEBHOOK_SECRET = 'hook-secret';
  (prisma.video.findUnique as jest.Mock).mockResolvedValue({
    id: 'local-video-id',
    provider: 'VDOCIPHER',
    vdocipherAccountId: 'primary',
    vdocipherVideoId: 'vdo-id',
  });
  (prisma.video.update as jest.Mock).mockResolvedValue({});

  const request = new Request('http://localhost/api/webhook/vdocipher?secret=hook-secret', {
    method: 'POST',
    body: JSON.stringify({ videoId: 'vdo-id', status: 'ready' }),
  });

  const response = await vdocipherWebhook(request);
  await expect(response.json()).resolves.toEqual({ ok: true });
});
```

- [ ] **Step 2: Implement webhook route**

Create `src/app/api/webhook/vdocipher/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function mapStatus(status: string | undefined) {
  const normalized = status?.toLowerCase();

  if (normalized === 'ready') return 'READY';
  if (normalized === 'queued' || normalized === 'processing') return 'QUEUED';
  if (normalized === 'pre-upload') return 'PRE_UPLOAD';
  if (normalized === 'error') return 'ERROR';

  return 'QUEUED';
}

export async function POST(req: Request) {
  const expectedSecret = process.env.VDOCIPHER_WEBHOOK_SECRET?.trim();

  if (expectedSecret) {
    const url = new URL(req.url);
    const providedSecret = url.searchParams.get('secret');

    if (providedSecret !== expectedSecret) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  const payload = await req.json();
  const vdocipherVideoId = payload.videoId || payload.id;

  if (!vdocipherVideoId) {
    return NextResponse.json({ error: 'Missing VdoCipher video ID' }, { status: 400 });
  }

  const video = await prisma.video.findFirst({
    where: {
      provider: 'VDOCIPHER',
      vdocipherVideoId,
    },
  });

  if (!video) {
    return NextResponse.json({ ok: true });
  }

  await prisma.video.update({
    where: { id: video.id },
    data: {
      vdocipherStatus: mapStatus(payload.status),
      vdocipherSyncedAt: new Date(),
      vdocipherError: mapStatus(payload.status) === 'ERROR' ? 'VdoCipher webhook reported processing error' : null,
    },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Run webhook route tests**

Run:

```bash
npm test -- __tests__/api/vdocipher-routes.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit webhook**

Run:

```bash
git add src/app/api/webhook/vdocipher/route.ts __tests__/api/vdocipher-routes.test.ts
git commit -m "feat: add vdocipher webhook"
```

## Task 9: Service Verification And Docs

**Files:**
- Modify: `scripts/verify-services.ts`
- Modify: `docs/env-matrix.md`
- Modify: `docs/provider-zero-setup.md`
- Modify: `docs/staging-smoke-checklist.md`
- Modify: `docs/manual-testing-guide.md`
- Modify: `docs/operations/subsystems.md`
- Modify: `docs/operations/health-checklist.md`
- Test: existing docs tests under `__tests__/docs`

- [ ] **Step 1: Update service verifier**

In `scripts/verify-services.ts`, add a VdoCipher section that checks:

```ts
const vdocipherAccountIds = (process.env.VDOCIPHER_ACCOUNT_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const vdocipherDefaultAccount = process.env.VDOCIPHER_DEFAULT_ACCOUNT_ID?.trim();
const vdocipherAccounts = vdocipherAccountIds.length > 0 ? vdocipherAccountIds : ['primary'];
const missingVdoCipherSecrets = vdocipherAccounts.filter((id) => {
  const suffix = id.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return !process.env[`VDOCIPHER_API_SECRET_${suffix}`]?.trim();
});
```

Report:

- pass when all listed accounts have secrets and default exists.
- warn in non-strict mode when VdoCipher is absent.
- fail in strict mode when VdoCipher is absent or incomplete.

- [ ] **Step 2: Update env docs**

Add to `docs/env-matrix.md`:

```markdown
| VdoCipher | VDOCIPHER_ACCOUNT_IDS | operational config | optional | required for VdoCipher migration | src/lib/vdocipher-accounts.ts | Comma-separated logical VdoCipher account IDs. |
| VdoCipher | VDOCIPHER_DEFAULT_ACCOUNT_ID | operational config | optional | required for VdoCipher migration | src/lib/vdocipher-accounts.ts | Default account for new uploads. |
| VdoCipher | VDOCIPHER_API_SECRET_<ACCOUNT> | server secret | optional | required for each configured account | src/lib/vdocipher-accounts.ts | Account-specific VdoCipher API secret. |
| VdoCipher | VDOCIPHER_WEBHOOK_SECRET | server secret | optional | recommended | src/app/api/webhook/vdocipher/route.ts | Shared webhook secret when using query-secret webhook protection. |
```

- [ ] **Step 3: Update runbooks**

Add a VdoCipher section to `docs/provider-zero-setup.md`, `docs/staging-smoke-checklist.md`, `docs/manual-testing-guide.md`, `docs/operations/subsystems.md`, and `docs/operations/health-checklist.md` covering:

- create VdoCipher account(s)
- store API secrets in Vercel/local env
- configure account IDs
- upload a test video
- sync status
- publish after ready
- verify entitled playback
- verify denied OTP fails
- verify watermark appears
- avoid pasting API secrets, OTPs, or playbackInfo into evidence

- [ ] **Step 4: Run docs and verifier tests**

Run:

```bash
npm run verify:services
npm test -- __tests__/docs/provider-zero-setup.test.ts __tests__/docs/staging-docs.test.ts __tests__/docs/manual-testing-guide.test.ts __tests__/docs/operations-docs.test.ts
```

Expected: `verify:services` may warn when local VdoCipher env is absent; docs tests pass after assertions are updated if needed.

- [ ] **Step 5: Commit docs and verifier**

Run:

```bash
git add scripts/verify-services.ts docs/env-matrix.md docs/provider-zero-setup.md docs/staging-smoke-checklist.md docs/manual-testing-guide.md docs/operations/subsystems.md docs/operations/health-checklist.md __tests__/docs
git commit -m "docs: add vdocipher migration operations"
```

## Task 10: Final Verification

**Files:**
- No new files unless fixes are required.

- [ ] **Step 1: Run focused VdoCipher tests**

Run:

```bash
npm test -- __tests__/lib/vdocipher-accounts.test.ts __tests__/lib/vdocipher-watermark.test.ts __tests__/lib/vdocipher.test.ts __tests__/api/vdocipher-routes.test.ts __tests__/components/vdocipher-player.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run existing affected tests**

Run:

```bash
npm test -- __tests__/api/media-routes.test.ts __tests__/api/video-process-clear-encode.test.ts __tests__/lib/media-entitlement.test.ts __tests__/lib/playback-routing.test.ts __tests__/hooks/use-shaka-player.test.tsx
```

Expected: PASS. Existing Axinom/Shaka tests continue to pass.

- [ ] **Step 3: Run project gates**

Run:

```bash
npm run prisma:generate
npm run typecheck
npm run lint
npm test
npm run build
```

Expected: all commands exit `0`. If inherited lint warnings remain, record exact warning count and verify no new VdoCipher files caused them.

- [ ] **Step 4: Manual smoke with configured VdoCipher account**

With real VdoCipher env configured, run:

```bash
npm run dev
```

Smoke:

1. Sign in as admin.
2. Open `/admin/videos`.
3. Upload one small video to selected VdoCipher account.
4. Wait for VdoCipher processing.
5. Click sync status.
6. Publish video using existing admin controls.
7. Sign in as entitled learner.
8. Open `/watch/<videoId>`.
9. Confirm VdoCipher iframe plays.
10. Confirm watermark appears.
11. Sign in as denied learner and confirm `/api/vdocipher/otp` returns denial.

- [ ] **Step 5: Final commit if verification fixes were needed**

Run only if Task 10 required fixes. Replace the listed files with the files changed by verification fixes:

```bash
git add src/lib/vdocipher.ts src/app/api/vdocipher/otp/route.ts
git commit -m "fix: verify vdocipher migration"
```

## Self-Review

Spec coverage:

- Multi-account account registry: Task 2.
- Upload through VdoCipher: Task 4 and Task 7.
- Status sync and webhook: Task 4 and Task 8.
- OTP playback: Task 5 and Task 6.
- Watermark annotation: Task 3 and Task 5.
- Admin account selector and status controls: Task 7.
- Docs and verification: Task 9.
- Existing Axinom preservation: Task 6 and Task 10 affected tests.
- Paid-account tomorrow path: account registry default and stored `vdocipherAccountId` in Tasks 2, 4, and 7.

Placeholder scan:

- The plan avoids unresolved placeholder markers and undefined follow-up work.
- All code-oriented steps include concrete snippets, commands, and expected results.

Type consistency:

- `VideoProvider` values: `AXINOM`, `VDOCIPHER`.
- `VdoCipherStatus` values: `PRE_UPLOAD`, `QUEUED`, `READY`, `ERROR`.
- Account field: `vdocipherAccountId`.
- Video ID field: `vdocipherVideoId`.
