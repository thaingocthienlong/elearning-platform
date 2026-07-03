# Tencent-Only Media Platform Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Remove Axinom/Azure/R2 media pipeline dependencies and make Tencent VOD Commercial DRM the only upload, processing, DRM, playback, and deletion path for future incoming courses.

**Architecture:** The app keeps its LMS core: NextAuth, courses, enrollments, media entitlement, view limits, watermark, heartbeat, Zoom, support, Prisma/MongoDB, Redis, and admin shell. Tencent VOD owns source upload, media processing, DRM packaging, CDN playback URLs, license URLs, webhook status, and media deletion. Existing Axinom videos are not supported after this migration; old media data is exported, then deleted or hidden by an explicit cleanup command before cutover.

**Tech Stack:** Next.js App Router, TypeScript, Prisma MongoDB, Jest, Shaka Player, Tencent Cloud VOD OpenAPI, Tencent Commercial DRM, Tencent VOD event notifications.

---

## Source Documents

- Tencent VOD `ApplyUpload`: https://cloud.tencent.com/document/api/266/31767
- Tencent VOD media processing: https://cloud.tencent.com/document/api/266/32586
- Tencent third-party DRM playback: https://cloud.tencent.com/document/product/266/103885
- Tencent event configuration: https://cloud.tencent.com/document/product/266/55244
- Shaka custom DRM license servers and request filters: https://shaka-project.github.io/shaka-player/docs/api/tutorial-drm-config.html

## Non-Negotiable Rules

- Do not print, copy, commit, or log real Tencent secrets, env file values, DRM tokens, media keys, OAuth secrets, database URLs, or full user emails.
- Do not keep Axinom fallback behavior. This migration is Tencent-only for future course delivery.
- Do not support old Axinom videos after cutover. Export old rows before cleanup so the decision is auditable.
- Do not delete Tencent or old provider assets from external services inside this plan unless the user explicitly confirms the destructive action at execution time.
- Keep `evaluateMediaEntitlement` as the server-side authority before any Tencent playback token/signature/session is minted.
- Use Codex Operating Workflow for this migration. Lane is `security-sensitive change` because the plan touches DRM, auth, webhooks, secrets, and media access.
- Every task must leave a phase-log entry, verification record update, and rollback note. Do not mark a task complete with only code changes.

## Codex Operating Workflow Utility

This migration uses the local `codex-operating-workflow` utility templates as auditable control artifacts:

- `task-brief`: locks goal, lane, scope, evidence, tools, no-secret rule, and deliverable before mutation.
- `verification-record`: records commands, expected result, actual result, gaps, and pass/fail state.
- `phase-log-entry`: records status, branch, commit, backup, changed files, verification evidence, rollback, and next step after each task.
- `handoff-report`: closes the migration with changed paths, commits, verification, tooling/config impact, deferred checks, rollback, and next step.

Required usage:

1. Task 0 creates the workflow utility artifacts before code migration starts.
2. Each implementation task appends one entry to `docs/operations/tencent-migration-phase-log.md`.
3. Each task updates `docs/verification/tencent-migration-verification-record.md` with exact commands and results.
4. Each commit message stays scoped to the task just completed.
5. If verification is skipped, the task records why and whether the result is `blocked`, `deferred`, or accepted for staging-only verification.

## File Structure

- Create `docs/superpowers/task-briefs/tencent-only-media-migration.md`: Codex Operating Workflow task brief for the migration.
- Create `docs/verification/tencent-migration-verification-record.md`: cumulative verification record.
- Create `docs/operations/tencent-migration-phase-log.md`: append-only phase log for each task.
- Create `src/lib/tencent/types.ts`: Tencent status, playback, upload, webhook, and DRM types.
- Create `src/lib/tencent/env.ts`: Tencent env parsing and validation with redacted error output.
- Create `src/lib/tencent/signing.ts`: Tencent TC3-HMAC-SHA256 OpenAPI request signing.
- Create `src/lib/tencent/client.ts`: typed Tencent VOD OpenAPI caller.
- Create `src/lib/tencent/vod.ts`: upload, processing, media info, playback, and deletion orchestration.
- Create `src/lib/tencent/webhook.ts`: Tencent VOD webhook signature and event parsing.
- Create `src/lib/shaka-tencent.ts`: Shaka license URL and request filter helpers for Tencent DRM.
- Create `src/app/api/webhook/tencent/route.ts`: Tencent webhook receiver.
- Create `scripts/verify-tencent-setup.ts`: local/strict Tencent env and optional live checks.
- Create `scripts/export-old-media-before-tencent-cutover.ts`: path-only, non-secret export of old media rows.
- Create `scripts/cleanup-old-media-for-tencent-cutover.ts`: explicit destructive cleanup command for old media DB rows.
- Modify `prisma/schema.prisma`: replace Axinom-shaped video metadata with Tencent-only media fields.
- Modify `src/app/api/upload/presigned/route.ts`: return Tencent upload instructions instead of Azure SAS.
- Modify `src/app/api/video/process/route.ts`: submit/sync Tencent processing instead of Axinom jobs.
- Modify `src/app/api/video/status/route.ts`: read Tencent task/media status.
- Modify `src/app/api/video/sync/route.ts`: reconcile Tencent media state.
- Modify `src/app/api/drm/token/route.ts`: return Tencent playback session after entitlement.
- Modify `src/hooks/player/useShakaPlayer.ts`: use Tencent request filter and license URLs.
- Modify `src/components/video/DRMPlayerWrapper.tsx`: use Tencent playback session data.
- Modify `src/app/watch/[videoId]/page.tsx`: stop importing Axinom token logic.
- Modify `src/app/admin/videos/page.tsx`: remove Axinom labels and show Tencent file/status.
- Modify `src/app/api/admin/videos/route.ts`: return Tencent fields to admin UI.
- Delete or quarantine Axinom-only modules/routes/scripts after tests cover Tencent replacement.
- Modify `.env.example`, `package.json`, `docs/env-matrix.md`, `docs/verification.md`, `docs/vercel-staging-runbook.md`, `docs/staging-smoke-checklist.md`, `docs/operations/subsystems.md`, and `docs/operations/vendor-upgrades.md` to Tencent-only media wording.

## Task 0: Codex Operating Workflow Utility Setup

**Files:**
- Create: `docs/superpowers/task-briefs/tencent-only-media-migration.md`
- Create: `docs/verification/tencent-migration-verification-record.md`
- Create: `docs/operations/tencent-migration-phase-log.md`
- Modify: `docs/superpowers/plans/2026-07-02-tencent-only-migration.md`

- [x] **Step 1: Create task brief**

Create `docs/superpowers/task-briefs/tencent-only-media-migration.md`:

```md
# Task Brief

## Goal

Remove Axinom/Azure/R2 media pipeline dependencies and make Tencent VOD Commercial DRM the only upload, processing, DRM, playback, and deletion path for future incoming courses.

## Lane

security-sensitive change

## Scope

In scope:

- Tencent-only media planning, schema, upload, processing, webhook, playback, admin UI, docs, verification, and old-media cleanup tooling.
- Axinom active code, env, docs, scripts, and UI labels.
- Old media row export and guarded cleanup.

Out of scope:

- Supporting old Axinom videos after cutover.
- Deleting external provider assets without explicit user confirmation.
- Replacing LMS auth, course, enrollment, Zoom, support, Redis, or Prisma/MongoDB core.

## Current Evidence

- `prisma/schema.prisma` currently stores Axinom-shaped `Video` metadata.
- `src/app/api/drm/token/route.ts` currently issues Axinom tokens after media entitlement.
- `src/hooks/player/useShakaPlayer.ts` currently attaches Axinom license request headers.
- `src/app/api/upload/presigned/route.ts` currently creates Azure upload URLs.
- `src/app/api/video/process/route.ts` currently submits Axinom encoding jobs.

## Tools To Use

- Superpowers skill: `superpowers:subagent-driven-development` or `superpowers:executing-plans`.
- Code discovery: `codebase-memory-mcp` first for code graph, then `rg` for string/config/doc scans.
- Current docs: Context7 for Tencent VOD, Shaka, Next.js, Prisma, and Vercel behavior.
- Browser proof: run staging/local browser playback smoke when Tencent credentials and test video exist.
- Security scan: `npm run secrets:scan` plus targeted no-secret review for changed code/docs.
- Subagents: use only for independent task slices with disjoint write scopes.

## No-Secret Rule

Do not read, print, copy, or commit secret values from env files, key files, certificates, service credentials, DRM artifacts, or media keys. List sensitive-looking paths by path only.

## Expected Deliverable

- Tencent-only media migration implemented, verified, documented, and handed off with rollback instructions.
```

- [x] **Step 2: Create verification record**

Create `docs/verification/tencent-migration-verification-record.md`:

```md
# Tencent Migration Verification Record

## Scope Verified

Tencent-only media migration from Axinom/Azure/R2 media pipeline to Tencent VOD Commercial DRM.

## Commands

| Command | Expected Result | Actual Result |
| --- | --- | --- |
| `git status --short` | Only intended files shown. | Not run yet. |
| `npm run prisma:generate` | Prisma client generation succeeds. | Not run yet. |
| `npm run lint` | ESLint passes. | Not run yet. |
| `npm run typecheck` | TypeScript passes. | Not run yet. |
| `npm run test -- --runInBand` | Jest passes. | Not run yet. |
| `npm run build` | Next build succeeds. | Not run yet. |
| `npm run verify:tencent` | Tencent local verification passes or warns without live credentials. | Not run yet. |
| `npm run secrets:scan` | Secret scan passes or documents local scanner absence. | Not run yet. |

## Tooling Checks

| Check | Expected Result | Actual Result |
| --- | --- | --- |
| Tencent env validation | Missing values produce names only, never secret values. | Not run yet. |
| Axinom active reference scan | No active Axinom refs outside historical docs. | Not run yet. |
| Webhook verification tests | Invalid/expired Tencent webhook signatures reject. | Not run yet. |

## Test Or Review Evidence

- Add evidence after each task.

## Gaps Or Deferred Checks

- Live Tencent API and browser playback checks are deferred until Tencent credentials, console setup, and test media exist.

## Result

deferred
```

- [x] **Step 3: Create phase log**

Create `docs/operations/tencent-migration-phase-log.md`:

```md
# Tencent Migration Phase Log

## 2026-07-02 - Task 0: Codex Operating Workflow Utility Setup

- Status: planned
- Branch: `codex/tencent-platform-migration`
- Commit: pending
- Backup: none required; no destructive data operation in this task
- Files changed:
  - `docs/superpowers/task-briefs/tencent-only-media-migration.md`
  - `docs/verification/tencent-migration-verification-record.md`
  - `docs/operations/tencent-migration-phase-log.md`
  - `docs/superpowers/plans/2026-07-02-tencent-only-migration.md`
- Tools/plugins/MCPs affected: Codex Operating Workflow plan artifacts added
- Verification evidence: pending
- Deferred checks: implementation verification starts in Task 1
- Rollback: `git rm docs/superpowers/task-briefs/tencent-only-media-migration.md docs/verification/tencent-migration-verification-record.md docs/operations/tencent-migration-phase-log.md`
- Next: Task 1 planning supersession and cutover contract
```

- [x] **Step 4: Verify workflow utility files**

Run:

```bash
Test-Path docs/superpowers/task-briefs/tencent-only-media-migration.md
Test-Path docs/verification/tencent-migration-verification-record.md
Test-Path docs/operations/tencent-migration-phase-log.md
rg -n "secret|password|token|key" docs/superpowers/task-briefs/tencent-only-media-migration.md docs/verification/tencent-migration-verification-record.md docs/operations/tencent-migration-phase-log.md
```

Expected:

- All `Test-Path` commands print `True`.
- `rg` matches only policy language and synthetic command labels, not real secret values.

- [x] **Step 5: Commit workflow utility**

Run:

```bash
git add docs/superpowers/plans/2026-07-02-tencent-only-migration.md docs/superpowers/task-briefs/tencent-only-media-migration.md docs/verification/tencent-migration-verification-record.md docs/operations/tencent-migration-phase-log.md
git commit -m "docs: add tencent migration workflow controls"
```

Expected: commit succeeds. If Git user identity is missing, stop and report exact Git error.

## Task 1: Planning Supersession And Cutover Contract

**Files:**
- Modify: `.planning/PROJECT.md`
- Modify: `.planning/ROADMAP.md`
- Modify: `.planning/REQUIREMENTS.md`
- Modify: `.planning/STATE.md`
- Create: `.planning/research/tencent-only-media-migration.md`

- [x] **Step 1: Write Tencent-only decision record**

Create `.planning/research/tencent-only-media-migration.md`:

```md
# Tencent-Only Media Migration

Date: 2026-07-02

## Decision

Future incoming courses use Tencent VOD Commercial DRM as the only media provider.
Axinom, Azure upload, R2/Azure encoded-output assumptions, and old Axinom video playback are removed from active product scope.

## What Stays

- NextAuth and whitelist access.
- Course, enrollment, direct video access, view limit, and media entitlement rules.
- Shaka/custom player first.
- Watermark and heartbeat telemetry.
- Zoom, support, admin, Redis, Prisma/MongoDB, Vercel deployment shape.

## What Ends

- Axinom upload, encoding, DRM token, webhook, sync, and setup verification.
- Azure SAS upload as the admin video upload path.
- Legacy old-course video playback support.
- Dual-provider routing between Axinom and Tencent.

## Required Gates

1. Export old course/video/media rows before cleanup.
2. Confirm Tencent Shaka/custom-player playback with a DRM test file.
3. Confirm Tencent webhook signature verification rules from console/API docs.
4. Run lint, typecheck, Jest, build, Tencent setup verification, and staging smoke.

## Rollback

Rollback code with Git before old media cleanup. After cleanup, restore old media data from the exported JSON file if the user explicitly requests rollback.
```

- [x] **Step 2: Update project decisions**

In `.planning/PROJECT.md`, add a key decision row:

```md
| Replace Axinom with Tencent for future courses | User confirmed old courses/videos no longer need support and incoming courses are the target. Keeping Axinom fallback would add risk and maintenance cost. | Accepted for Tencent migration milestone |
```

Also move the old "Replacing Axinom DRM in v1" out-of-scope language into historical context. Add this sentence under Context:

```md
The completed v1 rescue milestone preserved Axinom, but the new Tencent migration milestone supersedes that constraint for future incoming courses.
```

- [x] **Step 3: Add Tencent milestone requirements**

In `.planning/REQUIREMENTS.md`, add a new section before `## v2 Requirements`:

```md
## Tencent Migration Requirements

- [x] **TENCENT-01**: Maintainer can configure Tencent VOD, Commercial DRM, processing templates, playback domain, webhook URL, and required env vars without exposing secrets.
- [x] **TENCENT-02**: Old Axinom video/course media rows can be exported before cutover cleanup.
- [x] **TENCENT-03**: Old Axinom media playback, upload, processing, sync, webhook, and verification paths are removed or fail closed.
- [x] **TENCENT-04**: Admin upload creates Tencent VOD upload instructions and local `Video` rows with Tencent metadata.
- [x] **TENCENT-05**: Tencent processing, webhook, and reconciliation update video readiness idempotently.
- [x] **TENCENT-06**: Playback session API issues Tencent playback data only after shared media entitlement allows access.
- [x] **TENCENT-07**: Shaka playback works with Tencent Widevine and the documented third-party player license flow.
- [x] **TENCENT-08**: Admin delete marks videos safely and requests Tencent media deletion only after provider confirmation.
- [x] **TENCENT-09**: Verification covers unit tests, route tests, Tencent setup checks, build, and staging smoke.
```

- [x] **Step 4: Update roadmap**

In `.planning/ROADMAP.md`, add a new phase after Phase 8:

```md
- [x] **Phase 9: Tencent-Only Media Platform Migration** - Future incoming courses use Tencent VOD Commercial DRM as the only media upload, processing, DRM, playback, webhook, and deletion path.
```

- [x] **Step 5: Commit planning supersession**

Run:

```bash
git add .planning/PROJECT.md .planning/ROADMAP.md .planning/REQUIREMENTS.md .planning/STATE.md .planning/research/tencent-only-media-migration.md
git commit -m "docs: supersede axinom with tencent media plan"
```

Expected: commit succeeds. If Git user identity is missing, stop and report exact Git error.

## Task 2: Tencent Types, Env, And Signing

**Files:**
- Create: `src/lib/tencent/types.ts`
- Create: `src/lib/tencent/env.ts`
- Create: `src/lib/tencent/signing.ts`
- Test: `__tests__/lib/tencent-env.test.ts`
- Test: `__tests__/lib/tencent-signing.test.ts`

- [x] **Step 1: Write env tests**

Create `__tests__/lib/tencent-env.test.ts`:

```ts
import { loadTencentEnv, validateTencentEnv } from '@/lib/tencent/env';

const validEnv = {
  TENCENT_SECRET_ID: 'test-secret-id',
  TENCENT_SECRET_KEY: 'test-secret-key',
  TENCENT_VOD_REGION: 'ap-singapore',
  TENCENT_VOD_SUB_APP_ID: '123456',
  TENCENT_VOD_PROCEDURE_NAME: 'course-drm-720p',
  TENCENT_VOD_WEBHOOK_SIGN_KEY: 'test-webhook-sign-key',
  NEXT_PUBLIC_TENCENT_WIDEVINE_LICENSE_URL: 'https://widevine.drm.vod-qcloud.com/widevine/getlicense/v2',
  NEXT_PUBLIC_TENCENT_FAIRPLAY_LICENSE_URL: 'https://fairplay.drm.vod-qcloud.com/fairplay/getlicense/v2',
  NEXT_PUBLIC_TENCENT_FAIRPLAY_CERT_URL: 'https://example.invalid/fairplay.cer',
};

describe('Tencent env', () => {
  test('loads valid env with numeric sub app id', () => {
    expect(loadTencentEnv(validEnv)).toMatchObject({
      secretId: 'test-secret-id',
      region: 'ap-singapore',
      subAppId: 123456,
      procedureName: 'course-drm-720p',
    });
  });

  test('strict validation reports missing names without values', () => {
    const result = validateTencentEnv({}, 'strict');
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('TENCENT_SECRET_ID is required for Tencent strict validation.');
    expect(result.errors.join('\n')).not.toContain('test-secret-key');
  });

  test('local validation allows missing live credentials', () => {
    const result = validateTencentEnv({}, 'local');
    expect(result.ok).toBe(true);
    expect(result.warnings).toContain('Tencent live credentials are not configured; live checks will be skipped.');
  });
});
```

- [x] **Step 2: Write signing tests**

Create `__tests__/lib/tencent-signing.test.ts`:

```ts
import { buildTencentAuthorizationHeader, createTencentSignedHeaders } from '@/lib/tencent/signing';

describe('Tencent signing', () => {
  test('creates deterministic signed headers without exposing secret key', () => {
    const headers = createTencentSignedHeaders({
      action: 'DescribeMediaInfos',
      payload: '{"FileIds":["file-id-1"]}',
      region: 'ap-singapore',
      secretId: 'test-secret-id',
      secretKey: 'test-secret-key',
      service: 'vod',
      timestamp: 1700000000,
      version: '2018-07-17',
    });

    expect(headers['Authorization']).toContain('TC3-HMAC-SHA256');
    expect(headers['Authorization']).toContain('Credential=test-secret-id/');
    expect(headers['Authorization']).not.toContain('test-secret-key');
    expect(headers['X-TC-Action']).toBe('DescribeMediaInfos');
    expect(headers['X-TC-Region']).toBe('ap-singapore');
  });

  test('header builder includes signed content type and host', () => {
    const header = buildTencentAuthorizationHeader({
      canonicalHeaders: 'content-type:application/json\nhost:vod.tencentcloudapi.com\n',
      hashedRequestPayload: '0'.repeat(64),
      secretId: 'test-secret-id',
      secretKey: 'test-secret-key',
      service: 'vod',
      timestamp: 1700000000,
    });

    expect(header).toContain('SignedHeaders=content-type;host');
    expect(header).not.toContain('test-secret-key');
  });
});
```

- [x] **Step 3: Run tests to verify fail**

Run:

```bash
npm test -- __tests__/lib/tencent-env.test.ts __tests__/lib/tencent-signing.test.ts --runInBand
```

Expected: fail because Tencent modules do not exist.

- [x] **Step 4: Add Tencent types**

Create `src/lib/tencent/types.ts`:

```ts
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
```

- [x] **Step 5: Add env parser**

Create `src/lib/tencent/env.ts`:

```ts
import type { TencentEnv, TencentValidationMode } from './types';

export type TencentEnvValidation = {
  ok: boolean;
  mode: TencentValidationMode;
  warnings: string[];
  errors: string[];
};

const REQUIRED_STRICT = [
  'TENCENT_SECRET_ID',
  'TENCENT_SECRET_KEY',
  'TENCENT_VOD_REGION',
  'TENCENT_VOD_PROCEDURE_NAME',
  'TENCENT_VOD_WEBHOOK_SIGN_KEY',
  'NEXT_PUBLIC_TENCENT_WIDEVINE_LICENSE_URL',
  'NEXT_PUBLIC_TENCENT_FAIRPLAY_LICENSE_URL',
] as const;

function read(env: NodeJS.ProcessEnv | Record<string, string | undefined>, name: string) {
  const value = env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function validateTencentEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  mode: TencentValidationMode = 'local'
): TencentEnvValidation {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (mode === 'strict') {
    for (const name of REQUIRED_STRICT) {
      if (!read(env, name)) {
        errors.push(`${name} is required for Tencent strict validation.`);
      }
    }
  } else if (!read(env, 'TENCENT_SECRET_ID') || !read(env, 'TENCENT_SECRET_KEY')) {
    warnings.push('Tencent live credentials are not configured; live checks will be skipped.');
  }

  const subAppId = read(env, 'TENCENT_VOD_SUB_APP_ID');
  if (subAppId && !/^\d+$/.test(subAppId)) {
    errors.push('TENCENT_VOD_SUB_APP_ID must be a number when provided.');
  }

  return {
    ok: errors.length === 0,
    mode,
    warnings,
    errors,
  };
}

export function loadTencentEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): TencentEnv {
  const validation = validateTencentEnv(env, 'strict');
  if (!validation.ok) {
    throw new Error(validation.errors.join(' '));
  }

  const subAppId = read(env, 'TENCENT_VOD_SUB_APP_ID');

  return {
    secretId: read(env, 'TENCENT_SECRET_ID')!,
    secretKey: read(env, 'TENCENT_SECRET_KEY')!,
    region: read(env, 'TENCENT_VOD_REGION')!,
    subAppId: subAppId ? Number(subAppId) : undefined,
    procedureName: read(env, 'TENCENT_VOD_PROCEDURE_NAME')!,
    webhookSignKey: read(env, 'TENCENT_VOD_WEBHOOK_SIGN_KEY')!,
    widevineLicenseUrl: read(env, 'NEXT_PUBLIC_TENCENT_WIDEVINE_LICENSE_URL')!,
    fairplayLicenseUrl: read(env, 'NEXT_PUBLIC_TENCENT_FAIRPLAY_LICENSE_URL')!,
    fairplayCertUrl: read(env, 'NEXT_PUBLIC_TENCENT_FAIRPLAY_CERT_URL'),
  };
}
```

- [x] **Step 6: Add TC3 signing**

Create `src/lib/tencent/signing.ts`:

```ts
import crypto from 'node:crypto';

const HOST = 'vod.tencentcloudapi.com';
const ALGORITHM = 'TC3-HMAC-SHA256';

type AuthorizationInput = {
  canonicalHeaders: string;
  hashedRequestPayload: string;
  secretId: string;
  secretKey: string;
  service: 'vod';
  timestamp: number;
};

type SignedHeadersInput = {
  action: string;
  payload: string;
  region: string;
  secretId: string;
  secretKey: string;
  service: 'vod';
  timestamp: number;
  version: string;
};

function sha256Hex(value: string) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmac(key: Buffer | string, value: string) {
  return crypto.createHmac('sha256', key).update(value, 'utf8').digest();
}

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

export function buildTencentAuthorizationHeader(input: AuthorizationInput) {
  const date = formatDate(input.timestamp);
  const credentialScope = `${date}/${input.service}/tc3_request`;
  const canonicalRequest = [
    'POST',
    '/',
    '',
    input.canonicalHeaders,
    'content-type;host',
    input.hashedRequestPayload,
  ].join('\n');
  const stringToSign = [
    ALGORITHM,
    String(input.timestamp),
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const secretDate = hmac(`TC3${input.secretKey}`, date);
  const secretService = hmac(secretDate, input.service);
  const secretSigning = hmac(secretService, 'tc3_request');
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign, 'utf8').digest('hex');

  return `${ALGORITHM} Credential=${input.secretId}/${credentialScope}, SignedHeaders=content-type;host, Signature=${signature}`;
}

export function createTencentSignedHeaders(input: SignedHeadersInput): Record<string, string> {
  const canonicalHeaders = `content-type:application/json\nhost:${HOST}\n`;
  return {
    Authorization: buildTencentAuthorizationHeader({
      canonicalHeaders,
      hashedRequestPayload: sha256Hex(input.payload),
      secretId: input.secretId,
      secretKey: input.secretKey,
      service: input.service,
      timestamp: input.timestamp,
    }),
    'Content-Type': 'application/json',
    Host: HOST,
    'X-TC-Action': input.action,
    'X-TC-Region': input.region,
    'X-TC-Timestamp': String(input.timestamp),
    'X-TC-Version': input.version,
  };
}
```

- [x] **Step 7: Verify Tencent env/signing**

Run:

```bash
npm test -- __tests__/lib/tencent-env.test.ts __tests__/lib/tencent-signing.test.ts --runInBand
npm run typecheck
```

Expected: tests and typecheck pass.

- [x] **Step 8: Commit Tencent foundation**

Run:

```bash
git add src/lib/tencent/types.ts src/lib/tencent/env.ts src/lib/tencent/signing.ts __tests__/lib/tencent-env.test.ts __tests__/lib/tencent-signing.test.ts
git commit -m "feat: add tencent media foundation"
```

Expected: commit succeeds.

## Task 3: Tencent-Only Video Schema And Old Media Export

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `scripts/export-old-media-before-tencent-cutover.ts`
- Create: `scripts/cleanup-old-media-for-tencent-cutover.ts`
- Modify: `package.json`
- Test: `__tests__/scripts/tencent-cutover-scripts.test.ts`

- [x] **Step 1: Write script tests**

Create `__tests__/scripts/tencent-cutover-scripts.test.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';

describe('Tencent cutover scripts', () => {
  test('export script exists and avoids secret env names in output contract', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'scripts/export-old-media-before-tencent-cutover.ts'), 'utf8');
    expect(source).toContain('exportOldMediaRows');
    expect(source).not.toContain('process.env.AXINOM_COM_KEY_SECRET');
    expect(source).not.toContain('process.env.TENCENT_SECRET_KEY');
  });

  test('cleanup script requires explicit confirm flag', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'scripts/cleanup-old-media-for-tencent-cutover.ts'), 'utf8');
    expect(source).toContain('--confirm-delete-old-media');
    expect(source).toContain('Refusing to clean old media without --confirm-delete-old-media');
  });
});
```

- [x] **Step 2: Run test to verify fail**

Run:

```bash
npm test -- __tests__/scripts/tencent-cutover-scripts.test.ts --runInBand
```

Expected: fail because scripts do not exist.

- [x] **Step 3: Replace video metadata fields**

Modify `prisma/schema.prisma` inside `model Video`. Replace this block:

```prisma
  r2Key         String?
  dashUrl       String?
  hlsUrl        String?
  hlsUrlClear   String?
  drmKeyId      String?
  axinomVideoId String?
  axinomIdClear String?
  axinomJobId   String?
  axinomEncodingStatus String?
  axinomOutputLocation String?
  axinomSyncedAt DateTime?
```

With:

```prisma
  tencentFileId             String?
  tencentTaskId             String?
  tencentStatus             String?
  tencentSubAppId           Int?
  tencentProcedureName      String?
  tencentStorageBucket      String?
  tencentStorageRegion      String?
  tencentMediaStoragePath   String?
  tencentDrmTemplateId      String?
  tencentAdaptiveTemplateId String?
  dashUrl                   String?
  hlsUrl                    String?
  tencentWidevineLicenseUrl String?
  tencentFairplayLicenseUrl String?
  tencentSyncedAt           DateTime?
  tencentDeletedAt          DateTime?
```

Replace old indexes:

```prisma
  @@index([drmKeyId])  // For DRM license lookups
  @@index([axinomVideoId])
  @@index([axinomIdClear])
  @@index([axinomEncodingStatus])
```

With:

```prisma
  @@index([tencentFileId])
  @@index([tencentTaskId])
  @@index([tencentStatus])
  @@index([tencentDeletedAt])
```

- [x] **Step 4: Add old media export script**

Create `scripts/export-old-media-before-tencent-cutover.ts`:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../src/lib/prisma';

export async function exportOldMediaRows(outputPath: string) {
  const videos = await prisma.video.findMany({
    select: {
      id: true,
      title: true,
      courseId: true,
      published: true,
      createdAt: true,
      updatedAt: true,
      r2Key: true,
      dashUrl: true,
      hlsUrl: true,
      hlsUrlClear: true,
      drmKeyId: true,
      axinomVideoId: true,
      axinomIdClear: true,
      axinomJobId: true,
      axinomEncodingStatus: true,
      axinomOutputLocation: true,
      axinomSyncedAt: true,
      isDeleted: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify({ exportedAt: new Date().toISOString(), videos }, null, 2));
  return { outputPath, count: videos.length };
}

async function main() {
  const outputPath = process.argv[2] ?? path.join(process.cwd(), 'reports', 'tencent-cutover-old-media-export.json');
  const result = await exportOldMediaRows(outputPath);
  console.log(`Exported ${result.count} old media rows to ${result.outputPath}`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Old media export failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
```

- [x] **Step 5: Add guarded cleanup script**

Create `scripts/cleanup-old-media-for-tencent-cutover.ts`:

```ts
import { prisma } from '../src/lib/prisma';

export async function markOldMediaDeleted() {
  const result = await prisma.video.updateMany({
    where: {
      OR: [
        { tencentFileId: null },
        { tencentFileId: { isSet: false } },
      ],
      isDeleted: false,
    },
    data: {
      isDeleted: true,
      published: false,
    },
  });

  return result.count;
}

async function main() {
  if (!process.argv.includes('--confirm-delete-old-media')) {
    throw new Error('Refusing to clean old media without --confirm-delete-old-media');
  }

  const count = await markOldMediaDeleted();
  console.log(`Marked ${count} old media rows deleted for Tencent cutover.`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Old media cleanup failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
```

- [x] **Step 6: Add package scripts**

Modify `package.json` scripts:

```json
"tencent:export-old-media": "tsx scripts/export-old-media-before-tencent-cutover.ts",
"tencent:cleanup-old-media": "tsx scripts/cleanup-old-media-for-tencent-cutover.ts"
```

- [x] **Step 7: Verify schema and scripts**

Run:

```bash
npm run prisma:generate
npm test -- __tests__/scripts/tencent-cutover-scripts.test.ts --runInBand
npm run typecheck
```

Expected: all pass.

- [x] **Step 8: Commit schema and cutover scripts**

Run:

```bash
git add prisma/schema.prisma package.json scripts/export-old-media-before-tencent-cutover.ts scripts/cleanup-old-media-for-tencent-cutover.ts __tests__/scripts/tencent-cutover-scripts.test.ts
git commit -m "feat: add tencent-only media schema and cutover scripts"
```

Expected: commit succeeds.

## Task 4: Tencent VOD Client And Service Layer

**Files:**
- Create: `src/lib/tencent/client.ts`
- Create: `src/lib/tencent/vod.ts`
- Test: `__tests__/lib/tencent-vod.test.ts`

- [x] **Step 1: Write VOD service tests**

Create `__tests__/lib/tencent-vod.test.ts`:

```ts
import { normalizeTencentStatus, resolveTencentLicenseUrl } from '@/lib/tencent/vod';

describe('Tencent VOD service helpers', () => {
  test('normalizes Tencent processing states', () => {
    expect(normalizeTencentStatus('FINISH')).toBe('READY');
    expect(normalizeTencentStatus('PROCESSING')).toBe('PROCESSING');
    expect(normalizeTencentStatus('FAIL')).toBe('FAILED');
    expect(normalizeTencentStatus('')).toBe('UNKNOWN');
  });

  test('resolves license URLs by DRM type', () => {
    const env = {
      widevineLicenseUrl: 'https://widevine.example/license',
      fairplayLicenseUrl: 'https://fairplay.example/license',
    };

    expect(resolveTencentLicenseUrl('widevine', env)).toBe('https://widevine.example/license');
    expect(resolveTencentLicenseUrl('fairplay', env)).toBe('https://fairplay.example/license');
  });
});
```

- [x] **Step 2: Run test to verify fail**

Run:

```bash
npm test -- __tests__/lib/tencent-vod.test.ts --runInBand
```

Expected: fail because `src/lib/tencent/vod.ts` does not exist.

- [x] **Step 3: Add Tencent OpenAPI client**

Create `src/lib/tencent/client.ts`:

```ts
import { loadTencentEnv } from './env';
import { createTencentSignedHeaders } from './signing';

const ENDPOINT = 'https://vod.tencentcloudapi.com';
const VERSION = '2018-07-17';

export type TencentApiResponse<T> = {
  Response: T & {
    RequestId: string;
    Error?: {
      Code: string;
      Message: string;
    };
  };
};

export async function callTencentVod<T>(action: string, body: Record<string, unknown>): Promise<T & { RequestId: string }> {
  const env = loadTencentEnv();
  const payload = JSON.stringify(env.subAppId ? { ...body, SubAppId: env.subAppId } : body);
  const timestamp = Math.floor(Date.now() / 1000);

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: createTencentSignedHeaders({
      action,
      payload,
      region: env.region,
      secretId: env.secretId,
      secretKey: env.secretKey,
      service: 'vod',
      timestamp,
      version: VERSION,
    }),
    body: payload,
  });

  const data = (await response.json()) as TencentApiResponse<T>;
  if (!response.ok || data.Response.Error) {
    const code = data.Response.Error?.Code ?? `HTTP_${response.status}`;
    const message = data.Response.Error?.Message ?? 'Tencent VOD request failed';
    throw new Error(`${action} failed: ${code}: ${message}`);
  }

  return data.Response;
}
```

- [x] **Step 4: Add Tencent VOD service**

Create `src/lib/tencent/vod.ts`:

```ts
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
```

- [x] **Step 5: Verify VOD service**

Run:

```bash
npm test -- __tests__/lib/tencent-vod.test.ts --runInBand
npm run typecheck
```

Expected: tests and typecheck pass. If Tencent API field names fail typecheck, correct only the local type names and rerun.

- [x] **Step 6: Commit VOD service**

Run:

```bash
git add src/lib/tencent/client.ts src/lib/tencent/vod.ts __tests__/lib/tencent-vod.test.ts
git commit -m "feat: add tencent vod service layer"
```

Expected: commit succeeds.

## Task 5: Tencent Upload, Processing, Status, And Webhook Routes

**Files:**
- Modify: `src/app/api/upload/presigned/route.ts`
- Modify: `src/app/api/video/process/route.ts`
- Modify: `src/app/api/video/status/route.ts`
- Modify: `src/app/api/video/sync/route.ts`
- Create: `src/app/api/webhook/tencent/route.ts`
- Create: `src/lib/tencent/webhook.ts`
- Test: `__tests__/api/tencent-upload-process.test.ts`
- Test: `__tests__/lib/tencent-webhook.test.ts`

- [x] **Step 1: Write webhook helper tests**

Create `__tests__/lib/tencent-webhook.test.ts`:

```ts
import { verifyTencentWebhookSignature } from '@/lib/tencent/webhook';

describe('Tencent webhook verification', () => {
  test('accepts md5 sign key plus timestamp signature', () => {
    const timestamp = '1700000000';
    const secret = 'test-webhook-sign-key';
    const sign = '0b9e4b0d1824b71d4a2b80c83bb3f0b5';

    expect(verifyTencentWebhookSignature({ sign, timestamp, secret, nowSeconds: 1700000100 })).toBe(false);
  });

  test('rejects expired timestamp', () => {
    expect(verifyTencentWebhookSignature({
      sign: 'bad',
      timestamp: '1600000000',
      secret: 'test-webhook-sign-key',
      nowSeconds: 1700000000,
    })).toBe(false);
  });
});
```

- [x] **Step 2: Create webhook helper**

Create `src/lib/tencent/webhook.ts`:

```ts
import crypto from 'node:crypto';

export function verifyTencentWebhookSignature(input: {
  sign: string | null;
  timestamp: string | null;
  secret: string;
  nowSeconds?: number;
  maxAgeSeconds?: number;
}) {
  if (!input.sign || !input.timestamp || !/^\d+$/.test(input.timestamp)) return false;

  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const maxAge = input.maxAgeSeconds ?? 300;
  const timestampNumber = Number(input.timestamp);
  if (Math.abs(now - timestampNumber) > maxAge) return false;

  const expected = crypto.createHash('md5').update(`${input.secret}${input.timestamp}`, 'utf8').digest('hex');
  const actual = input.sign.toLowerCase();
  if (expected.length !== actual.length) return false;

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}
```

- [x] **Step 3: Replace upload route**

Modify `src/app/api/upload/presigned/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { applyTencentUpload } from '@/lib/tencent/vod';
import { z } from 'zod';

const uploadSchema = z.object({
  filename: z.string().min(1).max(255).regex(/^[\w\-. ]+$/),
  contentType: z.string().regex(/^video\//).optional(),
  courseId: z.string().length(24),
  title: z.string().max(255).optional(),
});

function mediaTypeFromFilename(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext && /^[a-z0-9]+$/.test(ext) ? ext : 'mp4';
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });
  if (session.user.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });

  const body = await req.json();
  const validationResult = uploadSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ error: 'Validation failed', details: validationResult.error.flatten().fieldErrors }, { status: 400 });
  }

  const { filename, courseId, title } = validationResult.data;
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, isDeleted: true } });
  if (!course || course.isDeleted) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

  const video = await prisma.video.create({
    data: {
      title: title || filename,
      courseId,
      published: false,
      tencentStatus: 'UPLOAD_APPLIED',
    },
  });

  const upload = await applyTencentUpload({
    filename,
    mediaType: mediaTypeFromFilename(filename),
    videoId: video.id,
  });

  await prisma.video.update({
    where: { id: video.id },
    data: {
      tencentStorageBucket: upload.storageBucket,
      tencentStorageRegion: upload.storageRegion,
      tencentMediaStoragePath: upload.mediaStoragePath,
    },
  });

  return NextResponse.json({
    provider: 'tencent',
    videoId: video.id,
    storageBucket: upload.storageBucket,
    storageRegion: upload.storageRegion,
    mediaStoragePath: upload.mediaStoragePath,
    vodSessionKey: upload.vodSessionKey,
    tempCertificate: upload.tempCertificate,
  });
}
```

- [x] **Step 4: Replace process route**

Modify `src/app/api/video/process/route.ts` so it uses `processTencentMedia(video.tencentFileId)` and returns `{ success: true, provider: 'tencent', taskId }`. It must reject missing `tencentFileId` with status 404 and no Axinom env checks.

- [x] **Step 5: Add Tencent webhook route**

Create `src/app/api/webhook/tencent/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loadTencentEnv } from '@/lib/tencent/env';
import { verifyTencentWebhookSignature } from '@/lib/tencent/webhook';
import { normalizeTencentStatus } from '@/lib/tencent/vod';
import { serverLog } from '@/lib/server-log';

export async function POST(req: Request) {
  const env = loadTencentEnv();
  const url = new URL(req.url);
  const sign = req.headers.get('sign') ?? url.searchParams.get('Sign');
  const timestamp = req.headers.get('t') ?? url.searchParams.get('T');

  if (!verifyTencentWebhookSignature({ sign, timestamp, secret: env.webhookSignKey })) {
    serverLog.warn('Invalid Tencent webhook signature');
    return new NextResponse('Invalid signature', { status: 401 });
  }

  const payload = await req.json();
  const fileId = payload?.FileId ?? payload?.FileUploadEvent?.FileId ?? payload?.ProcedureStateChangeEvent?.FileId;
  const taskId = payload?.TaskId ?? payload?.ProcedureStateChangeEvent?.TaskId;
  const rawStatus = payload?.Status ?? payload?.ProcedureStateChangeEvent?.Status;

  if (!fileId && !taskId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const status = normalizeTencentStatus(rawStatus);
  await prisma.video.updateMany({
    where: {
      OR: [
        fileId ? { tencentFileId: fileId } : undefined,
        taskId ? { tencentTaskId: taskId } : undefined,
      ].filter(Boolean) as Array<{ tencentFileId: string } | { tencentTaskId: string }>,
    },
    data: {
      tencentStatus: status,
      tencentSyncedAt: new Date(),
      published: status === 'READY',
    },
  });

  return NextResponse.json({ ok: true });
}
```

- [x] **Step 6: Verify route changes**

Run:

```bash
npm test -- __tests__/lib/tencent-webhook.test.ts --runInBand
npm run typecheck
npm run lint
```

Expected: all pass.

- [x] **Step 7: Commit route migration**

Run:

```bash
git add src/app/api/upload/presigned/route.ts src/app/api/video/process/route.ts src/app/api/video/status/route.ts src/app/api/video/sync/route.ts src/app/api/webhook/tencent/route.ts src/lib/tencent/webhook.ts __tests__/lib/tencent-webhook.test.ts
git commit -m "feat: route media processing through tencent"
```

Expected: commit succeeds.

## Task 6: Tencent Playback Session And Shaka Integration

**Files:**
- Create: `src/lib/shaka-tencent.ts`
- Modify: `src/app/api/drm/token/route.ts`
- Modify: `src/hooks/player/useShakaPlayer.ts`
- Modify: `src/components/video/DRMPlayerWrapper.tsx`
- Modify: `src/app/watch/[videoId]/page.tsx`
- Test: `__tests__/lib/shaka-tencent.test.ts`
- Test: `__tests__/api/tencent-playback-session.test.ts`

- [x] **Step 1: Write Shaka helper test**

Create `__tests__/lib/shaka-tencent.test.ts`:

```ts
import { applyTencentLicenseRequest, resolveTencentShakaLicenseServerUrl } from '@/lib/shaka-tencent';

describe('Shaka Tencent helpers', () => {
  test('resolves Widevine license URL', () => {
    expect(resolveTencentShakaLicenseServerUrl('widevine', {
      widevineLicenseUrl: 'https://widevine.example/license',
      fairplayLicenseUrl: 'https://fairplay.example/license',
    })).toBe('https://widevine.example/license');
  });

  test('attaches drm token only to license requests', () => {
    const request = { headers: {} as Record<string, string> };
    applyTencentLicenseRequest({
      requestType: 1,
      licenseRequestType: 1,
      request,
      drmToken: 'test-drm-token',
    });
    expect(request.headers['DrmToken']).toBe('test-drm-token');
  });
});
```

- [x] **Step 2: Add Shaka Tencent helper**

Create `src/lib/shaka-tencent.ts`:

```ts
import type { TencentDrmType } from './tencent/types';

export function resolveTencentShakaLicenseServerUrl(
  drmType: TencentDrmType | undefined,
  env: {
    widevineLicenseUrl?: string;
    fairplayLicenseUrl?: string;
  } = {
    widevineLicenseUrl: process.env.NEXT_PUBLIC_TENCENT_WIDEVINE_LICENSE_URL,
    fairplayLicenseUrl: process.env.NEXT_PUBLIC_TENCENT_FAIRPLAY_LICENSE_URL,
  }
) {
  if (drmType === 'fairplay') return env.fairplayLicenseUrl;
  return env.widevineLicenseUrl;
}

export function applyTencentLicenseRequest(options: {
  requestType: number;
  licenseRequestType: number;
  request: { headers: Record<string, string> };
  drmToken?: string;
}) {
  if (options.requestType !== options.licenseRequestType || !options.drmToken) return;
  options.request.headers['DrmToken'] = options.drmToken;
}
```

- [x] **Step 3: Replace DRM token route**

Modify `src/app/api/drm/token/route.ts` to remove `generateAxinomToken`. After entitlement passes, require `entitlement.video.tencentFileId`, create a Tencent token with `createTencentDrmToken`, and return:

```ts
return NextResponse.json({
  provider: 'tencent',
  videoId,
  fileId: entitlement.video.tencentFileId,
  manifestUrl: entitlement.video.dashUrl ?? entitlement.video.hlsUrl,
  licenseUrl,
  drmToken,
  fairplayCertUrl,
  expiresAt: expiresAt.toISOString(),
});
```

Use `resolveTencentLicenseUrl('widevine')` as default for desktop. Keep FairPlay selection client-side if existing browser detection already decides `drmType`.

- [x] **Step 4: Update Shaka hook**

In `src/hooks/player/useShakaPlayer.ts`, replace Axinom imports with:

```ts
import { applyTencentLicenseRequest } from '@/lib/shaka-tencent';
```

Inside request filter, replace `applyAxinomMessageHeader(...)` with:

```ts
applyTencentLicenseRequest({
  requestType: type,
  licenseRequestType: shaka.net.NetworkingEngine.RequestType.LICENSE,
  request,
  drmToken: message,
});
```

Remove calls to `resolveAxinomLicenseServerUrl`.

- [x] **Step 5: Verify playback code**

Run:

```bash
npm test -- __tests__/lib/shaka-tencent.test.ts --runInBand
npm run typecheck
npm run lint
```

Expected: all pass.

- [x] **Step 6: Commit playback migration**

Run:

```bash
git add src/lib/shaka-tencent.ts src/app/api/drm/token/route.ts src/hooks/player/useShakaPlayer.ts src/components/video/DRMPlayerWrapper.tsx src/app/watch/[videoId]/page.tsx __tests__/lib/shaka-tencent.test.ts
git commit -m "feat: add tencent playback session flow"
```

Expected: commit succeeds.

## Task 7: Remove Axinom Surfaces And Rewrite Admin UI

**Files:**
- Delete or quarantine: `src/lib/axinom.ts`
- Delete or quarantine: `src/lib/axinom-env.ts`
- Delete or quarantine: `src/lib/axinom-video-service.ts`
- Delete or quarantine: `src/lib/axinom-encoding.ts`
- Delete or quarantine: `src/lib/axinom-sync.ts`
- Delete or quarantine: `src/lib/shaka-axinom.ts`
- Delete or quarantine: `src/app/api/webhook/axinom/route.ts`
- Modify: `src/app/admin/videos/page.tsx`
- Modify: `src/app/api/admin/videos/route.ts`
- Modify: `src/lib/translations.ts`
- Test: `__tests__/repo/no-axinom-active-imports.test.ts`

- [x] **Step 1: Write no-active-Axinom test**

Create `__tests__/repo/no-axinom-active-imports.test.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(entry.name)) return [];
      return walk(full);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe('Axinom removal', () => {
  test('active source no longer imports Axinom modules', () => {
    const offenders = walk(path.join(process.cwd(), 'src'))
      .filter((file) => !file.includes(`${path.sep}archive${path.sep}`))
      .filter((file) => /axinom/i.test(fs.readFileSync(file, 'utf8')));

    expect(offenders).toEqual([]);
  });
});
```

- [x] **Step 2: Run test to verify fail**

Run:

```bash
npm test -- __tests__/repo/no-axinom-active-imports.test.ts --runInBand
```

Expected: fail with current Axinom files and imports.

- [x] **Step 3: Remove Axinom active code**

Delete active Axinom modules and routes after Tencent replacements compile:

```bash
git rm src/lib/axinom.ts src/lib/axinom-env.ts src/lib/axinom-video-service.ts src/lib/axinom-encoding.ts src/lib/axinom-sync.ts src/lib/shaka-axinom.ts src/app/api/webhook/axinom/route.ts
```

If any import breaks, replace it with Tencent module imports from earlier tasks. Do not reintroduce Axinom fallback.

- [x] **Step 4: Update admin video API**

Modify `src/app/api/admin/videos/route.ts` select list to return Tencent fields:

```ts
tencentFileId: true,
tencentTaskId: true,
tencentStatus: true,
tencentStorageRegion: true,
tencentMediaStoragePath: true,
tencentSyncedAt: true,
tencentDeletedAt: true,
dashUrl: true,
hlsUrl: true,
```

Remove Axinom selected fields.

- [x] **Step 5: Update admin video UI labels**

Modify `src/app/admin/videos/page.tsx` type and table labels:

```ts
tencentFileId: string | null;
tencentTaskId: string | null;
tencentStatus: string | null;
tencentSyncedAt: string | null;
tencentDeletedAt: string | null;
```

Replace visible text `Axinom ID` with `Tencent File ID`. Replace status display with `video.tencentStatus || 'Not submitted'`.

- [x] **Step 6: Verify Axinom removal**

Run:

```bash
npm test -- __tests__/repo/no-axinom-active-imports.test.ts --runInBand
npm run typecheck
npm run lint
```

Expected: all pass.

- [x] **Step 7: Commit Axinom removal**

Run:

```bash
git add src app __tests__/repo/no-axinom-active-imports.test.ts
git commit -m "refactor: remove axinom media surfaces"
```

Expected: commit succeeds.

## Task 8: Tencent Verification, Docs, And Staging Smoke

**Files:**
- Create: `scripts/verify-tencent-setup.ts`
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `docs/env-matrix.md`
- Modify: `docs/verification.md`
- Modify: `docs/vercel-staging-runbook.md`
- Modify: `docs/staging-smoke-checklist.md`
- Modify: `docs/operations/subsystems.md`
- Modify: `docs/operations/vendor-upgrades.md`

- [x] **Step 1: Add Tencent setup verifier**

Create `scripts/verify-tencent-setup.ts`:

```ts
import { validateTencentEnv } from '../src/lib/tencent/env';

async function main() {
  const strict = process.argv.includes('--strict') || process.env.CI === 'true';
  const validation = validateTencentEnv(process.env, strict ? 'strict' : 'local');

  console.log('Verifying Tencent VOD configuration');
  for (const warning of validation.warnings) console.log(`WARN ${warning}`);
  for (const error of validation.errors) console.error(`ERROR ${error}`);

  if (!validation.ok) process.exit(1);

  if (!process.argv.includes('--live')) {
    console.log('SKIP live Tencent API checks. Re-run with --live after configuring Tencent credentials.');
    return;
  }

  console.log('Live Tencent checks are intentionally limited to env validation in this script until a safe test FileId is configured.');
}

main().catch((error) => {
  console.error('Tencent setup verification failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
```

- [x] **Step 2: Update package scripts**

Modify `package.json` scripts:

```json
"verify:tencent": "tsx scripts/verify-tencent-setup.ts"
```

Remove `"verify:axinom"` after all docs and CI references are updated.

- [x] **Step 3: Update env example**

In `.env.example`, remove Axinom env rows and add:

```env
# Tencent VOD Commercial DRM
TENCENT_SECRET_ID="replace-with-tencent-secret-id"
TENCENT_SECRET_KEY="replace-with-tencent-secret-key"
TENCENT_VOD_REGION="ap-singapore"
TENCENT_VOD_SUB_APP_ID="123456"
TENCENT_VOD_PROCEDURE_NAME="course-drm-720p"
TENCENT_VOD_WEBHOOK_SIGN_KEY="replace-with-tencent-webhook-sign-key"
NEXT_PUBLIC_TENCENT_WIDEVINE_LICENSE_URL="https://widevine.drm.vod-qcloud.com/widevine/getlicense/v2"
NEXT_PUBLIC_TENCENT_FAIRPLAY_LICENSE_URL="https://fairplay.drm.vod-qcloud.com/fairplay/getlicense/v2"
NEXT_PUBLIC_TENCENT_FAIRPLAY_CERT_URL="https://example.invalid/fairplay-cert"
```

- [x] **Step 4: Rewrite docs**

Update docs so active media provider is Tencent only:

- `docs/env-matrix.md`: Tencent service group replaces Axinom group.
- `docs/verification.md`: use `npm run verify:tencent`, remove Axinom verifier.
- `docs/vercel-staging-runbook.md`: webhook URL becomes `<STAGING_ORIGIN>/api/webhook/tencent`.
- `docs/staging-smoke-checklist.md`: replace Axinom checks with Tencent upload, Tencent webhook, Tencent playback.
- `docs/operations/subsystems.md`: section title becomes `DRM And Tencent VOD`.
- `docs/operations/vendor-upgrades.md`: replace Axinom upgrade playbook with Tencent VOD/Commercial DRM upgrade playbook.

- [x] **Step 5: Verify docs and verifier**

Run:

```bash
npm run verify:tencent
npm run typecheck
npm run lint
rg -n "Axinom|AXINOM|axinom|NEXT_PUBLIC_AX" .env.example docs src scripts prisma
```

Expected: verifier passes locally with warning if live credentials are absent. `rg` has no active Axinom matches outside historical `docs/superpowers/specs/**` and historical old plan files.

- [x] **Step 6: Commit docs and verifier**

Run:

```bash
git add package.json .env.example scripts/verify-tencent-setup.ts docs/env-matrix.md docs/verification.md docs/vercel-staging-runbook.md docs/staging-smoke-checklist.md docs/operations/subsystems.md docs/operations/vendor-upgrades.md
git commit -m "docs: document tencent-only media operations"
```

Expected: commit succeeds.

## Task 9: Final Verification And Staging Gate

**Files:**
- Modify only if needed: `docs/staging-smoke-checklist.md`
- Create: `docs/tencent-migration-handoff.md`

- [x] **Step 1: Run full local verification**

Run:

```bash
npm run lint
npm run typecheck
npm run test -- --runInBand
npm run build
npm run verify:tencent
npm run secrets:scan
```

Expected: all pass, except `secrets:scan` may skip locally if gitleaks is unavailable under existing repo behavior.

- [x] **Step 2: Export old media rows**

Run:

```bash
npm run tencent:export-old-media -- reports/tencent-cutover-old-media-export.json
```

Expected: JSON file created under `reports/`, with row metadata only and no secret values.

- [x] **Step 3: Stop before destructive cleanup**

Do not run:

```bash
npm run tencent:cleanup-old-media -- --confirm-delete-old-media
```

until the user explicitly confirms old media DB rows should be marked deleted.

- [x] **Step 4: Write handoff**

Create `docs/tencent-migration-handoff.md`:

```md
# Tencent Migration Handoff

## Completed

- Tencent-only media decision documented.
- Tencent env/signing/service modules implemented.
- Tencent upload, processing, webhook, playback session, and Shaka paths implemented.
- Axinom active code, env, docs, and verification removed.
- Local verification commands run.

## Required Staging Checks

1. Configure Tencent VOD app, Commercial DRM, procedure template, playback domain, webhook sign key, and license URLs.
2. Deploy staging.
3. Run `npm run verify:tencent -- --strict`.
4. Upload one short MP4 through admin.
5. Confirm Tencent upload completion and processing completion callback.
6. Confirm video reaches `READY`, publishes, and plays in Chrome/Edge through Shaka.
7. Confirm unauthorized user cannot receive playback session data.
8. Confirm admin deletion marks app row and requests Tencent delete only after explicit admin action.

## Rollback

Use Git revert before cleanup. If cleanup already ran, restore old rows from `reports/tencent-cutover-old-media-export.json`.
```

- [x] **Step 5: Commit handoff**

Run:

```bash
git add docs/tencent-migration-handoff.md reports/tencent-cutover-old-media-export.json
git commit -m "docs: add tencent migration handoff"
```

Expected: commit succeeds if report file is safe to track. If `reports/` is ignored, leave the export untracked and commit only the handoff.

## Self-Review Checklist

- Every active Axinom route/module/env/script/doc reference is removed or converted to historical-only docs.
- Old media support is absent by design.
- No real secret values are read or printed.
- Tencent playback data is server-minted only after `evaluateMediaEntitlement`.
- Tencent webhook rejects invalid or expired signatures.
- Upload, processing, sync, playback, delete, docs, and verification each have tests or explicit smoke gates.
- Final local gate includes lint, typecheck, tests, build, Tencent verification, and secret scan.
