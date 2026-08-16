# Tencent 720p Cost-Safe Processing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve Widevine playback and Safari SimpleAES playback while ensuring each uploaded Tencent FileId can start one paid task flow at most once, only after an admin approves a current numeric quote for exactly two 720p-capped outputs.

**Architecture:** Upload becomes source-storage only. Pure Tencent profile, quote, attempt, and readiness modules define one fail-closed contract shared by thin App Router endpoints, reconciliation, webhook, sync, status, cron, admin UI, live verification, and guarded configuration tooling. MongoDB owns the permanent no-repeat key; Tencent `SessionId` is a temporary second layer.

**Tech Stack:** Next.js 16.2 App Router, React 18, TypeScript 5, NextAuth 4, Prisma 5.22 with MongoDB, Tencent VOD API 2018-07-17, native Node crypto, Zod 4, Jest 30, Testing Library, tsx scripts.

## Global Constraints

- Implement requirement IDs `TENCENT-COST-01` through `TENCENT-COST-06`.
- Preserve two playback paths: one `Widevine+FairPlay` MultiDRM HLS/fMP4 package and one `SimpleAES` HLS/TS package. Do not add a FairPlay certificate.
- Each package has exactly one H.264 video rendition targeting a 720-pixel short edge, 1024 Kbps, 25 fps, with AAC audio at 48 Kbps, 44.1 kHz, two channels.
- Set `DisableHigherVideoResolution=1` and `DisableHigherVideoBitrate=1`. Reject a source before paid work unless Tencent metadata proves short edge at least 720 pixels and primary video-stream bitrate at least 1,024,000 bps.
- The named procedure is `WV-SAES-V1`; profile version is `wv-saes-720-v1`.
- The procedure contains only the two custom adaptive definitions. It contains no transcode, animated graphic, screenshot, sample snapshot, image sprite, cover, watermark, review, recognition, analysis, knowledge import, or other processing task.
- Upload signatures and upload helpers contain no `procedure`, processing `taskNotifyMode`, or processing `sessionContext`. Upload completion never calls `/api/video/process`.
- Paid processing has one entry point: authenticated `ADMIN` `POST /api/video/process` with `approved: true` and a current signed quote.
- Quote and submit authorization failures return `401` for no session and `403` for authenticated non-admin users, before any Tencent call.
- Price inputs are `TENCENT_VOD_H264_720_USD_PER_MINUTE=0.0061` and `TENCENT_VOD_MAX_PROCESSING_USD=5.00`. Parse them into integer micro-USD; never use floating-point equality for authorization.
- Quote `ceil(durationSeconds / 60) * 2 * unitPrice`. Storage, traffic, and DRM-license requests remain explicit exclusions.
- A permanent attempt key derived from `{subAppId,fileId,profileVersion}` blocks repeat submission forever. Never reopen it automatically, including after Tencent's seven-day `SessionId` window.
- A provider response that may have been accepted but was not received becomes `SUBMISSION_UNKNOWN`. Reconcile with Describe APIs only; never retry the paid action.
- `READY` and `published=true` require both expected definition IDs, both HLS URLs, exactly one video substream per output, no video short edge above 720, and the current approved profile fingerprint.
- Configuration is dry-run by default. Apply and restore each require their own exact confirmation string. Configuration accepts no FileId and contains no media-processing API action.
- Strict live verification calls Describe APIs only and never prints credentials, tokens, media URLs, manifest URLs, license material, or full quote tokens.
- Do not process or reprocess any existing FileId during implementation, testing, deployment, configuration, or verification.
- One short paid canary requires a separate current numeric approval after code, schema, remote topology, and read-only live verification pass.
- Preserve the existing dirty `src/lib/translations.ts` and untracked `.agents/`, `.superpowers/`, and `codex-plugins/`. Do not stage, edit, delete, or reformat them.
- Keep planning, source, remote configuration, and canary evidence as separate commits/operations.

---

## Official Tencent Contracts

- `ProcessMediaByProcedure`: `SessionId` is at most 50 characters and rejects the same ID for seven days; `SessionContext` is returned in callbacks: https://cloud.tencent.com/document/product/266/34782
- `DescribeTasks`: filter by `FileId`, paginate with `ScrollToken`, maximum `Limit=100`, and only the most recent 72 hours are queryable: https://cloud.tencent.com/document/api/266/33430
- `DescribeTaskDetail`: request one TaskId, require `TaskType='Procedure'`, and read `ProcedureTask.SessionId`, `FileId`, and status; details are also limited to the most recent 72 hours: https://cloud.tencent.com/document/api/266/33431
- `DescribeProcedureTemplates`: filter exact names with `Names`, request `Type=Custom`, and read `ProcedureTemplateSet`: https://cloud.tencent.com/document/product/266/33895
- `DescribeAdaptiveDynamicStreamingTemplates`: filter definition IDs, request `Type=Custom`, and read `AdaptiveDynamicStreamingTemplateSet`: https://cloud.tencent.com/document/product/266/38084
- `CreateAdaptiveDynamicStreamingTemplate`: create the two custom adaptive templates: https://cloud.tencent.com/document/api/266/43068
- `ResetProcedureTemplate`: replace the custom procedure's complete task content: https://cloud.tencent.com/document/api/266/33894
- VOD pay-as-you-go H.264 HD pricing is operator-maintained and charged by output duration/specification: https://www.tencentcloud.com/document/product/266/14666

---

## File Map

| Path | Action | Responsibility |
| --- | --- | --- |
| `.planning/PROJECT.md` | Modify at closure | Mark the approved decision validated only after all acceptance gates pass. |
| `.planning/STATE.md` | Modify at closure | Record verification evidence, canary state, and resume point. |
| `.planning/ROADMAP.md` | Modify at closure | Close Phase 10.1 only after the separately approved canary passes. |
| `.planning/REQUIREMENTS.md` | Modify at closure | Mark `TENCENT-COST-01`–`06` complete only with evidence. |
| `prisma/schema.prisma` | Modify | Add audit fields and the permanent `TencentProcessingAttempt` ledger. |
| `src/lib/tencent/types.ts` | Modify | Add explicit statuses, price env fields, metadata/output/profile types. |
| `src/lib/tencent/env.ts` | Modify | Validate procedure, price, cap, and the no-FairPlay strict env contract. |
| `src/lib/tencent/client.ts` | Modify | Distinguish Tencent API rejection from ambiguous transport/response failure. |
| `src/lib/tencent/vod.ts` | Modify | Remove upload-owned procedure fields; add stable one-shot submit and Describe helpers. |
| `src/app/api/drm/token/route.ts` | Modify | Reject an unavailable FairPlay path instead of returning an undefined license URL. |
| `src/lib/tencent/profile.ts` | Create | Read, canonicalize, validate, fingerprint, and safely summarize the exact remote profile. |
| `src/lib/tencent/profile-config.ts` | Create | Build dry-run/apply/restore configuration operations without media actions. |
| `src/lib/tencent/processing-quote.ts` | Create | Parse money, validate source facts, calculate cost, sign, verify, and compare quotes. |
| `src/lib/tencent/processing-attempt.ts` | Create | Derive permanent attempt key/SessionId and classify attempt transitions. |
| `src/lib/tencent/readiness.ts` | Create | Enforce the two-definition, one-video-stream-per-output publication invariant. |
| `src/lib/tencent/reconciliation.ts` | Create | Page recent tasks, match SessionId, inspect one task, and reconcile without submit. |
| `src/app/api/upload/complete/route.ts` | Modify | Bind FileId once and move to approval-waiting state. |
| `src/app/api/video/process/quote/route.ts` | Create | ADMIN-only read-only authoritative quote endpoint. |
| `src/app/api/video/process/route.ts` | Replace | ADMIN-only quote revalidation, atomic claim, one paid submit, and closed failure states. |
| `src/app/api/video/process/reconcile/route.ts` | Create | ADMIN-only read-only reconciliation endpoint. |
| `src/app/api/video/sync/route.ts` | Modify | Use shared strict readiness; never submit. |
| `src/app/api/video/status/route.ts` | Modify | Use shared strict readiness; never submit. |
| `src/app/api/cron/check-videos/route.ts` | Modify | Fetch one safe profile per run and use shared strict readiness; never submit. |
| `src/app/api/webhook/tencent/route.ts` | Modify | Verify output evidence, update attempt audit state, and publish only when strictly ready. |
| `src/app/api/admin/videos/route.ts` | Modify | Return safe approval/attempt/profile fields needed by the admin UI. |
| `src/app/admin/videos/page.tsx` | Modify | Remove automatic submit and expose quote, approval, unknown, reconcile, and ready states. |
| `src/components/admin/TencentProcessingApprovalDialog.tsx` | Create | Show duration, two outputs, maximum USD, exclusions, confirmation, and one submit action. |
| `scripts/configure-tencent-720p.ts` | Create | Dry-run, guarded apply, guarded restore, snapshot, and read-back verification CLI. |
| `scripts/verify-tencent-setup.ts` | Modify | Make `--live` perform real read-only topology verification. |
| `package.json` | Modify | Add guarded Tencent profile configuration command. |
| `.env.example` | Modify | Document exact procedure, unit price, cap, and unset FairPlay values. |
| `.gitignore` | Modify | Ignore local non-secret Tencent topology backup JSON files. |
| `docs/env-matrix.md` | Modify | Explain price/cap ownership and no-FairPlay configuration. |
| `docs/provider-zero-setup.md` | Modify | Replace auto-processing guidance with explicit quote/approval/configuration workflow. |
| `docs/operations/subsystems.md` | Modify | Document attempt states, reconciliation, cost freeze, and rollback. |
| `docs/verification/tencent-720p-cost-safety-verification-record.md` | Create | Record commands, redacted topology, no-media proof, and canary evidence. |
| `__tests__/lib/tencent-profile.test.ts` | Create | Exact profile validation and safe fingerprinting. |
| `__tests__/lib/tencent-processing-quote.test.ts` | Create | Exact micro-USD math, metadata eligibility, signing, expiry, and drift. |
| `__tests__/lib/tencent-processing-attempt.test.ts` | Create | Stable key, 50-character SessionId, and closed transitions. |
| `__tests__/lib/tencent-readiness.test.ts` | Create | Dual-output readiness and rejection matrix. |
| `__tests__/lib/tencent-reconciliation.test.ts` | Create | FileId paging, local SessionId match, task detail, and no-submit proof. |
| `__tests__/lib/tencent-client.test.ts` | Create | Typed API versus ambiguous transport failure. |
| `__tests__/lib/tencent-env.test.ts` | Modify | Exact procedure/price/cap validation and optional no-FairPlay values. |
| `__tests__/api/tencent-upload-process.test.ts` | Modify | Bind-once upload, quote, submit, auth, CAS, retry, drift, and failure tests. |
| `__tests__/api/tencent-readiness-routes.test.ts` | Create | Sync/status/cron shared fail-closed behavior and no-submit proof. |
| `__tests__/api/tencent-webhook-route.test.ts` | Modify | Both definitions, substreams, fingerprint, attempt update, and incomplete rejection. |
| `__tests__/api/media-routes.test.ts` | Modify | No-FairPlay configuration rejects direct FairPlay token requests safely. |
| `__tests__/components/admin-videos.test.tsx` | Modify | No automatic submit and correct row actions/states. |
| `__tests__/components/tencent-processing-approval-dialog.test.tsx` | Create | Quote display, checkbox, one click, stale response, and retry behavior. |
| `__tests__/scripts/tencent-profile-tools.test.ts` | Create | Describe-only verifier, guarded config, safe output, snapshot, and restore. |
| `__tests__/scripts/package-scripts.test.ts` | Modify | Require the guarded Tencent configuration command. |
| `__tests__/env/env-matrix.test.ts` | Modify | Require procedure, unit-price, cap, and no-FairPlay documentation. |
| `__tests__/docs/provider-zero-setup.test.ts` | Modify | Lock source-only upload and explicit approval guidance. |
| `__tests__/docs/operations-docs.test.ts` | Modify | Lock attempt/reconciliation/freeze/rollback runbook coverage. |

### Shared interfaces locked by this plan

```ts
export const TENCENT_PROFILE_VERSION = 'wv-saes-720-v1';
export const TENCENT_PROCEDURE_NAME = 'WV-SAES-V1';
export const TENCENT_MULTIDRM_TEMPLATE_NAME = 'WVFP-HLS-720-V1';
export const TENCENT_SIMPLE_AES_TEMPLATE_NAME = 'SAES-HLS-720-V1';
export const TENCENT_OUTPUT_COUNT = 2;
export const TENCENT_QUOTE_TTL_SECONDS = 15 * 60;
export const TENCENT_CONFIG_APPLY_CONFIRMATION = 'RESET-WV-SAES-V1-TO-720P';
export const TENCENT_CONFIG_RESTORE_CONFIRMATION = 'RESTORE-WV-SAES-V1';

export type TencentProfileSnapshot = {
  procedureName: 'WV-SAES-V1';
  profileVersion: 'wv-saes-720-v1';
  multiDrmDefinition: number;
  simpleAesDefinition: number;
  fingerprint: string;
  safe: boolean;
  errors: string[];
};

export type TencentSourceFacts = {
  durationSeconds: number;
  primaryWidth: number;
  primaryHeight: number;
  shortEdge: number;
  primaryBitrateBps: number;
};

export type TencentProcessingQuote = {
  videoId: string;
  fileId: string;
  profileVersion: 'wv-saes-720-v1';
  profileFingerprint: string;
  durationSeconds: number;
  durationLabel: string;
  sourceShortEdge: number;
  sourceBitrateBps: number;
  billableMinutes: number;
  outputCount: 2;
  unitPriceUsdMicros: string;
  estimatedMaxUsdMicros: string;
  hardCapUsdMicros: string;
  estimatedMaxUsd: string;
  hardCapUsd: string;
  expiresAt: number;
};

export type TencentAttemptStatus =
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'SUBMISSION_UNKNOWN'
  | 'PROVIDER_REJECTED'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED';

export type TencentReadinessResult =
  | {
      ready: true;
      hlsUrl: string;
      hlsUrlClear: string;
      multiDrmDefinition: number;
      simpleAesDefinition: number;
      profileFingerprint: string;
    }
  | { ready: false; reasons: string[] };
```

### HTTP contracts locked by this plan

| Endpoint | Request | Success | Closed failures |
| --- | --- | --- | --- |
| `POST /api/video/process/quote` | `{ videoId }` | `200` with safe quote fields plus `quoteToken` | `401`, `403`, `404`, `409` unsafe/drifted state, `422` ineligible/over cap; zero paid calls |
| `POST /api/video/process` | `{ videoId, approved: true, quoteToken }` | `202` with `{ success:true, status:'SUBMITTED', taskId }` | `400` malformed/unconfirmed, `401`, `403`, `409` stale/repeat/drift, `422` ineligible/over cap; zero paid calls |
| `POST /api/video/process/reconcile` | `{ videoId }` | `200` with safe local state and whether a task was matched | `401`, `403`, `404`, `409` inconsistent audit state; zero paid calls |

---
## Task 1: Lock the exact remote profile contract

**Requirements:** `TENCENT-COST-01`, `TENCENT-COST-05`

**Files:**
- Create: `src/lib/tencent/profile.ts`
- Modify: `src/lib/tencent/types.ts`
- Create: `__tests__/lib/tencent-profile.test.ts`

**Interfaces:**
- `describeTencentProcessingProfile(): Promise<TencentProfileSnapshot>`
- `validateTencentProcessingProfile(input): TencentProfileSnapshot`
- `canonicalizeTencentProcessingProfile(input): object`
- `fingerprintTencentProcessingProfile(input): string`
- `summarizeTencentProcessingProfile(input): SafeTencentProfileSummary`

- [ ] **Step 1: Write the exact profile fixtures and failing validation tests**

Create one valid fixture with:

```ts
const validProcedure = {
  Name: 'WV-SAES-V1',
  Type: 'Custom',
  MediaProcessTask: {
    TranscodeTaskSet: [],
    AnimatedGraphicTaskSet: [],
    SnapshotByTimeOffsetTaskSet: [],
    SampleSnapshotTaskSet: [],
    ImageSpriteTaskSet: [],
    CoverBySnapshotTaskSet: [],
    AdaptiveDynamicStreamingTaskSet: [
      { Definition: 101 },
      { Definition: 102 },
    ],
  },
  AiContentReviewTask: null,
  AiAnalysisTask: null,
  AiRecognitionTask: null,
  AiRecognitionTaskSet: [],
  ReviewAudioVideoTask: null,
  ImportMediaKnowledgeTaskSet: [],
};

const validTemplates = [
  {
    Definition: 101,
    Type: 'Custom',
    Name: 'WVFP-HLS-720-V1',
    Format: 'HLS',
    DrmType: 'Widevine+FairPlay',
    DrmKeyProvider: 'VOD',
    DrmEncryptType: 'cbcs',
    SegmentType: 'fmp4',
    DisableHigherVideoBitrate: 1,
    DisableHigherVideoResolution: 1,
    StreamInfos: [approvedStreamInfo],
  },
  {
    Definition: 102,
    Type: 'Custom',
    Name: 'SAES-HLS-720-V1',
    Format: 'HLS',
    DrmType: 'SimpleAES',
    SegmentType: 'ts',
    DisableHigherVideoBitrate: 1,
    DisableHigherVideoResolution: 1,
    StreamInfos: [approvedStreamInfo],
  },
];
```

`approvedStreamInfo` must contain exactly `Video.Codec='libx264'`, `Bitrate=1024`, `Fps=25`, `ResolutionAdaptive='open'`, `Width=0`, `Height=720`, `FillType='black'`, exact AAC settings, `RemoveAudio=0`, and `RemoveVideo=0`.

Add table-driven failing cases for: wrong procedure name/type; one or three adaptive tasks; duplicate definitions; preset template; wrong template name; wrong DRM; MultiDRM segment outside `mp4-mp4-segment|fmp4`; SimpleAES segment not `ts`; missing VOD key provider; missing `cbcs`; extra stream; audio-only stream; wrong codec/bitrate/fps/dimension/fill/audio; either disable flag zero; and every non-adaptive procedure task populated.

Assert that changing only response timestamps/order does not change the fingerprint, changing a paid field does change it, and safe summaries contain neither `Url` nor any credential/token-shaped property.

- [ ] **Step 2: Run the new test and confirm RED**

Run:

```text
npm test -- --runInBand __tests__/lib/tencent-profile.test.ts
```

Expected: FAIL because `src/lib/tencent/profile.ts` does not exist.

- [ ] **Step 3: Implement canonical validation and fingerprinting**

Use a sorted canonical object containing only the approved procedure task arrays and the paid template fields. Exclude Tencent request IDs, create/update times, comments, and URLs. Hash `JSON.stringify(canonical)` with SHA-256 hex.

Validation returns all deterministic reason codes, sorted lexicographically. It succeeds only when there is one exact custom procedure and two exact custom templates. Accept `SegmentType='fmp4'` as the Tencent read-back equivalent of the create value `mp4-mp4-segment`; accept no other alias.

- [ ] **Step 4: Implement read-only profile discovery**

Call exactly:

```ts
await callTencentVod('DescribeProcedureTemplates', {
  Names: ['WV-SAES-V1'],
  Type: 'Custom',
  Offset: 0,
  Limit: 100,
});

await callTencentVod('DescribeAdaptiveDynamicStreamingTemplates', {
  Definitions: [multiDrmDefinition, simpleAesDefinition],
  Type: 'Custom',
  Offset: 0,
  Limit: 100,
});
```

Reject zero/multiple exact-name procedures, missing/extra definitions, and `TotalCount`/returned-set inconsistencies. These functions must not import or reference `processTencentMedia`, `ProcessMedia`, or `ProcessMediaByProcedure`.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run:

```text
npm test -- --runInBand __tests__/lib/tencent-profile.test.ts __tests__/lib/tencent-vod.test.ts
npm run typecheck
```

Expected: both suites pass; typecheck reports zero errors.

- [ ] **Step 6: Commit the profile contract**

```text
git add src/lib/tencent/profile.ts src/lib/tencent/types.ts __tests__/lib/tencent-profile.test.ts
git commit -m "feat(tencent): lock cost-safe 720p profile" -m "Implements TENCENT-COST-01 profile validation and fingerprinting."
```

---

## Task 2: Remove both upload-owned processing triggers and bind FileId once

**Requirements:** `TENCENT-COST-02`, `TENCENT-COST-06`

**Files:**
- Modify: `src/lib/tencent/vod.ts`
- Modify: `src/app/api/upload/complete/route.ts`
- Modify: `src/app/admin/videos/page.tsx`
- Modify: `__tests__/lib/tencent-vod.test.ts`
- Modify: `__tests__/api/tencent-upload-process.test.ts`
- Modify: `__tests__/components/admin-videos.test.tsx`

- [ ] **Step 1: Change upload tests to the source-only contract**

Decode the upload signature and assert all four:

```ts
expect(decoded).toContain('sourceContext=64b7f0000000000000000002');
expect(decoded).not.toContain('procedure=');
expect(decoded).not.toContain('taskNotifyMode=');
expect(decoded).not.toContain('sessionContext=');
```

Test `applyTencentUpload` separately and assert its `ApplyUpload` payload has `SourceContext` but no `Procedure` and no `SessionContext`.

For `/api/upload/complete`, add cases:

1. empty binding uses an atomic `updateMany` and returns `AWAITING_PROCESSING_APPROVAL`;
2. the same FileId returns `200` without another write;
3. a different FileId on an already-bound video returns `409` without a write;
4. two competing completions produce one winner and one `409` loser;
5. unauthenticated/non-admin requests make no database write.

In the component test, mock the Tencent uploader completion sequence and assert `/api/upload/complete` is called but `/api/video/process` is not called.

- [ ] **Step 2: Run focused tests and confirm RED**

```text
npm test -- --runInBand __tests__/lib/tencent-vod.test.ts __tests__/api/tencent-upload-process.test.ts __tests__/components/admin-videos.test.tsx
```

Expected: FAIL because the signature still owns the procedure, completion overwrites FileId, and the UI still auto-submits.

- [ ] **Step 3: Remove processing fields from both upload helpers**

In `applyTencentUpload`, send only `MediaType`, `MediaName`, and `SourceContext` plus fields required by Tencent upload. In `createTencentUploadSignature`, retain `secretId`, timestamps, random, `sourceContext`, `oneTimeValid`, and `vodSubAppId`; remove `procedure`, `taskNotifyMode`, and `sessionContext`.

- [ ] **Step 4: Implement bind-once completion**

Authorize `401`/`403` separately. Select `id`, `isDeleted`, `tencentFileId`, and `tencentStatus`.

- If existing FileId equals requested FileId, return the current safe record with `200`.
- If existing FileId differs, return `{ code:'TENCENT_FILE_ALREADY_BOUND' }` with `409`.
- Otherwise run `video.updateMany` where `id`, `isDeleted:false`, and `tencentFileId:null`; set FileId, optional original media URL, `tencentStatus:'AWAITING_PROCESSING_APPROVAL'`, `published:false`, and sync time.
- If count is zero, re-read and apply the same same/different result. Never overwrite.

- [ ] **Step 5: Remove the automatic UI submit**

After `uploader.done()` and successful upload completion, refresh the video list and show:

```text
Upload complete. Processing has not started. Use Review cost and process.
```

Delete the automatic fetch to `/api/video/process`. Do not add a timer, effect, retry, webhook action, status action, or cron action that starts processing.

- [ ] **Step 6: Run tests and confirm GREEN**

```text
npm test -- --runInBand __tests__/lib/tencent-vod.test.ts __tests__/api/tencent-upload-process.test.ts __tests__/components/admin-videos.test.tsx
npm run typecheck
```

Expected: all focused tests pass; typecheck reports zero errors.

- [ ] **Step 7: Commit the single-trigger upload boundary**

```text
git add src/lib/tencent/vod.ts src/app/api/upload/complete/route.ts src/app/admin/videos/page.tsx __tests__/lib/tencent-vod.test.ts __tests__/api/tencent-upload-process.test.ts __tests__/components/admin-videos.test.tsx
git commit -m "fix(tencent): stop processing during upload" -m "Implements TENCENT-COST-02 source-only upload and FileId binding."
```

---

## Task 3: Add the permanent processing-attempt ledger

**Requirements:** `TENCENT-COST-04`

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/tencent/types.ts`
- Create: `src/lib/tencent/processing-attempt.ts`
- Create: `__tests__/lib/tencent-processing-attempt.test.ts`

- [ ] **Step 1: Write failing key and transition tests**

Test that the same `{subAppId,fileId,profileVersion}` always yields the same full attempt key and exact 50-character SessionId, while any component change changes both. Assert:

```ts
expect(sessionId).toMatch(/^tc-[a-f0-9]{47}$/);
expect(sessionId).toHaveLength(50);
```

Define allowed status transitions:

```text
SUBMITTING -> SUBMITTED | SUBMISSION_UNKNOWN | PROVIDER_REJECTED
SUBMITTED -> PROCESSING | READY | FAILED
PROCESSING -> READY | FAILED | SUBMISSION_UNKNOWN
SUBMISSION_UNKNOWN -> SUBMITTED | PROCESSING | READY | FAILED
```

Every other transition is rejected. No status transitions back to an approvable state.

- [ ] **Step 2: Run the test and confirm RED**

```text
npm test -- --runInBand __tests__/lib/tencent-processing-attempt.test.ts
```

Expected: FAIL because the module and schema do not exist.

- [ ] **Step 3: Add audit fields and ledger model**

Add to `Video`:

```prisma
tencentAppleFallbackTemplateId String?
tencentProfileFingerprint String?
tencentProcessingAttemptKey String?
tencentProcessingSessionId String?
tencentProcessingProfileVersion String?
TencentProcessingAttempt TencentProcessingAttempt[]

@@index([tencentProcessingAttemptKey])
```

Add:

```prisma
model TencentProcessingAttempt {
  id                       String   @id @default(auto()) @map("_id") @db.ObjectId
  videoId                  String   @db.ObjectId
  Video                    Video    @relation(fields: [videoId], references: [id], onDelete: Cascade)
  attemptKey               String   @unique
  fileId                   String
  subAppId                 Int?
  profileVersion           String
  profileFingerprint       String
  sessionId                String
  quoteDigest              String
  quotedDurationSeconds    Float
  billableMinutes          Int
  unitPriceUsdMicros       String
  estimatedMaxUsdMicros    String
  status                   String
  providerTaskId           String?
  providerRequestId        String?
  providerErrorCode        String?
  submittedAt              DateTime?
  reconciledAt             DateTime?
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  @@index([videoId, createdAt])
  @@index([fileId])
  @@index([sessionId])
  @@index([providerTaskId])
  @@index([status])
}
```

Do not place `@unique` on nullable `Video` fields. The unique ledger key and atomic update of one Video document provide the no-repeat boundary without a nullable MongoDB unique-index trap.

- [ ] **Step 4: Implement deterministic key derivation and closed transitions**

Hash the UTF-8 string `${subAppId ?? 0}\u0000${fileId}\u0000${profileVersion}` with SHA-256. Use `tc-vod:${digest}` as the attempt key and `tc-${digest.slice(0, 47)}` as the provider SessionId.

Extend `TencentVodStatus` with `AWAITING_PROCESSING_APPROVAL`, `SUBMITTING`, `SUBMITTED`, `SUBMISSION_UNKNOWN`, `PROVIDER_REJECTED`, and `OUTPUT_INCOMPLETE`. Keep provider normalization separate from these local workflow states.

- [ ] **Step 5: Generate Prisma client and run tests**

```text
npm run prisma:generate
npm test -- --runInBand __tests__/lib/tencent-processing-attempt.test.ts
npm run typecheck
```

Expected: Prisma generation succeeds, the suite passes, and typecheck reports zero errors. Do not run `prisma db push` against a shared database during this task.

- [ ] **Step 6: Commit the durable audit model**

```text
git add prisma/schema.prisma src/lib/tencent/types.ts src/lib/tencent/processing-attempt.ts __tests__/lib/tencent-processing-attempt.test.ts
git commit -m "feat(tencent): persist processing attempt ledger" -m "Implements TENCENT-COST-04 permanent duplicate prevention."
```

---

## Task 4: Build authoritative quote math, signing, and the read-only quote endpoint

**Requirements:** `TENCENT-COST-03`

**Files:**
- Create: `src/lib/tencent/processing-quote.ts`
- Modify: `src/lib/tencent/types.ts`
- Modify: `src/lib/tencent/env.ts`
- Modify: `src/lib/tencent/vod.ts`
- Modify: `src/app/api/drm/token/route.ts`
- Create: `src/app/api/video/process/quote/route.ts`
- Create: `__tests__/lib/tencent-processing-quote.test.ts`
- Modify: `__tests__/lib/tencent-env.test.ts`
- Modify: `__tests__/api/media-routes.test.ts`
- Modify: `__tests__/api/tencent-upload-process.test.ts`

- [ ] **Step 1: Write failing money, metadata, and token tests**

Lock exact examples:

```ts
expect(parseUsdMicros('0.0061')).toBe(6_100n);
expect(parseUsdMicros('5.00')).toBe(5_000_000n);
expect(calculateMaxProcessingUsdMicros(16_863.765, 6_100n)).toBe(3_440_400n);
expect(formatUsdMicros(3_440_400n)).toBe('3.4404');
expect(formatDuration(16_863.765)).toBe('04:41:03');
```

Reject signs, exponent notation, zero, negatives, more than six decimals, whitespace-only, NaN, and overflow. Select the primary video stream deterministically by greatest pixel area, then bitrate; require finite positive duration/width/height/bitrate, short edge at least 720, and bitrate at least 1,024,000 bps.

Test signed quote acceptance, tamper rejection, wrong admin/video/FileId/profile rejection, expiry at the exact boundary, future-issued token rejection, token length limit, and a quote whose signed micro-USD values differ from recomputation.

- [ ] **Step 2: Write failing quote-route trust-boundary tests**

Add route cases proving:

- no session returns `401`, non-admin returns `403`, and both make zero Tencent calls;
- missing/deleted/unbound video returns `404`;
- existing task/attempt or non-approvable status returns `409`;
- unsafe remote profile returns `409`;
- missing metadata, short edge below 720, or bitrate below 1,024,000 returns `422`;
- over-cap quote returns `422`;
- valid quote calls only `DescribeMediaInfos`, `DescribeProcedureTemplates`, and `DescribeAdaptiveDynamicStreamingTemplates`, then returns no URL/secret;
- response shows two outputs and exclusions for storage, delivery traffic, and DRM playback-license requests.

- [ ] **Step 3: Run focused tests and confirm RED**

```text
npm test -- --runInBand __tests__/lib/tencent-processing-quote.test.ts __tests__/api/tencent-upload-process.test.ts
```

Expected: FAIL because quote helpers and endpoint do not exist.

- [ ] **Step 4: Implement exact micro-USD policy and quote token**

Use integer micro-USD throughout authorization. Derive a quote-only key as `HMAC-SHA256(authSecret, 'tencent-processing-quote:key:v1')`, where `authSecret` is `NEXTAUTH_SECRET` falling back to `AUTH_SECRET`. Sign `tencent-processing-quote:payload:v1:<base64url JSON payload>` with that derived key and emit `base64url(payload).base64url(signature)`. Payload includes admin ID, video ID, FileId, profile version/fingerprint, source facts, billable minutes, price/cap/estimate micro-USD strings, issued time, and expiry. Require integer millisecond timestamps, `expiresAt - issuedAt === 900_000`, `issuedAt <= now`, and `expiresAt > now`. Limit token length to 4096 and compare signatures with `timingSafeEqual` after equal-length checks.

- [ ] **Step 5: Extend Tencent media metadata safely**

Type and read:

```ts
MetaData?: {
  Duration?: number;
  VideoStreamSet?: Array<{
    Width?: number;
    Height?: number;
    Bitrate?: number;
    Codec?: string;
  }>;
};
```

Return the media object only to server code. The quote response exposes numeric source facts, never `BasicInfo.MediaUrl` or adaptive URLs.

- [ ] **Step 6: Enforce strict env and no-FairPlay policy**

Add required strict values `TENCENT_VOD_H264_720_USD_PER_MINUTE` and `TENCENT_VOD_MAX_PROCESSING_USD`; validate each through `parseUsdMicros` and require the procedure name to equal `WV-SAES-V1`. Update `__tests__/lib/tencent-env.test.ts` with valid/invalid decimal cases and the exact procedure name.

Remove `NEXT_PUBLIC_TENCENT_FAIRPLAY_LICENSE_URL` from strict requirements because this approved profile uses SimpleAES for Apple. Make FairPlay URL/certificate optional and unset. In `/api/drm/token`, resolve the requested license URL after normal entitlement checks but before `createTencentDrmToken`, and return `400 { code:'DRM_TYPE_UNAVAILABLE' }` when a direct FairPlay request has no configured FairPlay license URL; never mint that token or return `licenseUrl: undefined`.

- [ ] **Step 7: Implement the ADMIN-only quote endpoint**

Validate `{ videoId: z.string().length(24) }`. Fetch the local video first, then authoritative media and profile. Build a 15-minute quote. Return:

```ts
{
  quoteToken,
  durationSeconds,
  durationLabel,
  sourceShortEdge,
  sourceBitrateBps,
  billableMinutes,
  outputCount: 2,
  outputs: [
    { path: 'Widevine MultiDRM', maxShortEdge: 720 },
    { path: 'Safari SimpleAES', maxShortEdge: 720 },
  ],
  unitPriceUsd,
  estimatedMaxUsd,
  hardCapUsd,
  expiresAt,
  profileFingerprint,
  exclusions: ['storage', 'delivery traffic', 'DRM playback-license requests'],
}
```

- [ ] **Step 8: Run focused tests and confirm GREEN**

```text
npm test -- --runInBand __tests__/lib/tencent-processing-quote.test.ts __tests__/lib/tencent-env.test.ts __tests__/api/media-routes.test.ts __tests__/api/tencent-upload-process.test.ts __tests__/lib/tencent-profile.test.ts
npm run typecheck
```

Expected: all focused tests pass; typecheck reports zero errors.

- [ ] **Step 9: Commit quote safety**

```text
git add src/lib/tencent/processing-quote.ts src/lib/tencent/types.ts src/lib/tencent/env.ts src/lib/tencent/vod.ts src/app/api/drm/token/route.ts src/app/api/video/process/quote/route.ts __tests__/lib/tencent-processing-quote.test.ts __tests__/lib/tencent-env.test.ts __tests__/api/media-routes.test.ts __tests__/api/tencent-upload-process.test.ts
git commit -m "feat(tencent): require authoritative processing quote" -m "Implements TENCENT-COST-03 price, eligibility, cap, and signed approval."
```

---

## Task 5: Centralize the strict dual-output readiness invariant

**Requirements:** `TENCENT-COST-01`, `TENCENT-COST-06`

**Files:**
- Create: `src/lib/tencent/readiness.ts`
- Modify: `src/lib/tencent/vod.ts`
- Modify: `src/lib/tencent/types.ts`
- Create: `__tests__/lib/tencent-readiness.test.ts`
- Modify: `__tests__/lib/tencent-vod.test.ts`

- [ ] **Step 1: Write the complete failing readiness matrix**

Use profile definitions `101` and `102`. The valid media fixture has exactly two URL-bearing adaptive outputs:

```ts
[
  {
    Definition: 101,
    Package: 'HLS',
    DrmType: 'Widevine+FairPlay',
    Url: 'https://media.example/multidrm.m3u8',
    SubStreamSet: [
      { Type: 'video', Width: 1280, Height: 720 },
      { Type: 'audio' },
    ],
  },
  {
    Definition: 102,
    Package: 'HLS',
    DrmType: 'SimpleAES',
    Url: 'https://media.example/simpleaes.m3u8',
    SubStreamSet: [{ Type: 'video', Width: 1280, Height: 720 }],
  },
]
```

Assert ready returns protected HLS, SimpleAES HLS, both definition IDs, and profile fingerprint.

Table-test every rejection: missing one output; original media only; plain HLS; wrong DRM; wrong package; wrong definition; duplicate expected definition; an extra URL-bearing adaptive definition; missing/blank/non-HLS URL; missing `SubStreamSet`; zero or two video substreams; video short edge above 720; invalid width/height; stale/unsafe profile; fingerprint mismatch; and a required template ID not persisted.

Required audio substreams are allowed and do not count as video. An audio-only output is rejected because it has zero video substreams.

- [ ] **Step 2: Run the test and confirm RED**

```text
npm test -- --runInBand __tests__/lib/tencent-readiness.test.ts
```

Expected: FAIL because readiness is currently inferred from any playback URL.

- [ ] **Step 3: Implement strict output evaluation**

Export `evaluateTencentReadiness({ mediaInfo, profile, expectedFingerprint? })`. It must not fall back to `BasicInfo.MediaUrl`, plain HLS, DASH, a different definition, or a normalized Tencent status. It returns all stable reason codes and never logs URLs.

Export `readinessVideoPatch(result, pendingStatus)`:

- ready: set both HLS fields, both definition-ID fields, `tencentAppleFallbackDrmType:'SimpleAES'`, fingerprint, `tencentStatus:'READY'`, `published:true`, and sync time;
- not ready: set `published:false`, preserve the supplied non-ready status, update sync time, and do not replace good URLs with an unverified URL.

Keep `extractTencentPlaybackUrls*` only for token/playback compatibility where needed; remove every use of its permissive `playbackUrl` as a publication decision.

- [ ] **Step 4: Run focused tests and confirm GREEN**

```text
npm test -- --runInBand __tests__/lib/tencent-readiness.test.ts __tests__/lib/tencent-vod.test.ts __tests__/lib/tencent-profile.test.ts
npm run typecheck
```

Expected: all focused tests pass; typecheck reports zero errors.

- [ ] **Step 5: Commit strict readiness**

```text
git add src/lib/tencent/readiness.ts src/lib/tencent/vod.ts src/lib/tencent/types.ts __tests__/lib/tencent-readiness.test.ts __tests__/lib/tencent-vod.test.ts
git commit -m "feat(tencent): require both approved playback outputs" -m "Implements TENCENT-COST-01 and TENCENT-COST-06 readiness invariants."
```

---

## Task 6: Make submit one-shot and reconcile ambiguous outcomes without retry

**Requirements:** `TENCENT-COST-02`, `TENCENT-COST-03`, `TENCENT-COST-04`

**Files:**
- Modify: `src/lib/tencent/client.ts`
- Modify: `src/lib/tencent/vod.ts`
- Create: `src/lib/tencent/reconciliation.ts`
- Replace: `src/app/api/video/process/route.ts`
- Create: `src/app/api/video/process/reconcile/route.ts`
- Create: `__tests__/lib/tencent-client.test.ts`
- Create: `__tests__/lib/tencent-reconciliation.test.ts`
- Modify: `__tests__/lib/tencent-vod.test.ts`
- Modify: `__tests__/api/tencent-upload-process.test.ts`

- [ ] **Step 1: Write failing typed-client and provider-call tests**

Test `TencentVodApiError` exposes only `action`, `code`, and optional `requestId`; test `TencentVodTransportError` represents fetch, body-read, and JSON-parse ambiguity without provider credentials or response bodies.

Change `processTencentMedia` test to require:

```ts
await processTencentMedia({
  fileId: 'tencent-file-id',
  sessionId: 'tc-01234567890123456789012345678901234567890123456',
  sessionContext: 'video=64b7f0000000000000000002&profile=wv-saes-720-v1',
});

expect(callTencentVod).toHaveBeenCalledWith('ProcessMediaByProcedure', {
  FileId: 'tencent-file-id',
  ProcedureName: 'WV-SAES-V1',
  TasksNotifyMode: 'Change',
  SessionId: expect.stringMatching(/^tc-/),
  SessionContext: 'video=64b7f0000000000000002&profile=wv-saes-720-v1',
});
```

- [ ] **Step 2: Write failing submit-route tests**

Cover all zero-paid-call cases: malformed body, `approved` absent/false, no session, non-admin, invalid/expired/tampered quote, admin/video/FileId mismatch, changed metadata, changed price/cap, changed remote fingerprint, unsafe profile, ineligible source, over cap, existing local attempt, existing task ID, already-ready media, recent Tencent task with matching SessionId, and atomic CAS loser.

For two concurrent requests, mock `video.updateMany` to return counts `1` then `0`; assert exactly one `ProcessMediaByProcedure` call and one durable attempt creation.

Cover post-claim states:

- success persists `SUBMITTED`, TaskId, RequestId, submitted time, and the same SessionId;
- Tencent duplicate-session error becomes `SUBMISSION_UNKNOWN` and triggers read-only reconciliation, never a second submit;
- known provider rejection becomes `PROVIDER_REJECTED` and remains permanently blocked for this profile;
- fetch/parse/response ambiguity becomes `SUBMISSION_UNKNOWN` and remains permanently blocked;
- database failure after claim but before provider call returns closed and makes zero paid calls;
- database failure after provider response leaves the attempt closed for reconciliation and never retries.

- [ ] **Step 3: Write failing reconciliation tests**

`describeRecentTencentTasksByFileId` sends `{ FileId, Limit:100 }`, follows each non-empty `ScrollToken`, rejects a repeated token, and stops after ten pages. It filters locally for the exact SessionId. It calls `DescribeTaskDetail` only for one matching TaskId, then requires top-level `TaskType='Procedure'` and matching `ProcedureTask.SessionId` plus `ProcedureTask.FileId`. Zero matches, multiple matches, null ProcedureTask, wrong task type, or any identifier mismatch remains closed. Assert the module source and mocks never call `ProcessMediaByProcedure` or `ProcessMedia`.

Record the 72-hour provider-query limit in the returned safe state; after that window, an unresolved local `SUBMISSION_UNKNOWN` remains unknown and blocked.

- [ ] **Step 4: Run the new tests and confirm RED**

```text
npm test -- --runInBand __tests__/lib/tencent-client.test.ts __tests__/lib/tencent-reconciliation.test.ts __tests__/lib/tencent-vod.test.ts __tests__/api/tencent-upload-process.test.ts
```

Expected: FAIL because typed errors, one-shot submit, permanent claim, and reconciliation are not implemented.

- [ ] **Step 5: Implement typed Tencent failures**

Wrap only network/body/JSON failures as `TencentVodTransportError`. Convert Tencent `Response.Error` and non-2xx JSON errors to `TencentVodApiError`, preserving `Response.RequestId` when present. Never include request payloads, signed headers, raw bodies, secrets, or URLs in an error message.

- [ ] **Step 6: Implement Describe task helpers and one paid call shape**

Add:

```ts
describeTencentTasksPage({ fileId, scrollToken? })
describeTencentTaskDetail(taskId)
processTencentMedia({ fileId, sessionId, sessionContext })
```

Only `processTencentMedia` may contain the literal `ProcessMediaByProcedure`. No other function may invoke it.

- [ ] **Step 7: Implement the atomic claim and permanent ledger**

After revalidating the quote and checking media/recent tasks, derive attempt key and SessionId. Run one `video.updateMany` with all predicates:

```ts
{
  id: video.id,
  isDeleted: false,
  tencentFileId: quote.fileId,
  tencentTaskId: null,
  tencentProcessingAttemptKey: null,
  tencentStatus: 'AWAITING_PROCESSING_APPROVAL',
}
```

Set attempt key, SessionId, profile version/fingerprint, and `tencentStatus:'SUBMITTING'`. Count zero returns `409` and makes no provider call. After winning, create the unique ledger row with quote digest `sha256(quoteToken)`. If ledger creation fails, leave the Video claimed and return closed; no provider call occurs.

Call Tencent once only after both claim and ledger row exist. Never clear the attempt key. A new attempt requires a new explicit profile version and quote.

- [ ] **Step 8: Implement ADMIN-only read-only reconciliation route**

The route reads the Video and its ledger row, pages recent tasks by FileId, matches the stored SessionId, describes only that task, reads media/profile, evaluates readiness, and updates local audit fields. It never calls the paid action. Return safe state labels without task response bodies or media URLs.

- [ ] **Step 9: Run focused tests and confirm GREEN**

```text
npm run prisma:generate
npm test -- --runInBand __tests__/lib/tencent-client.test.ts __tests__/lib/tencent-reconciliation.test.ts __tests__/lib/tencent-vod.test.ts __tests__/api/tencent-upload-process.test.ts __tests__/lib/tencent-processing-attempt.test.ts __tests__/lib/tencent-processing-quote.test.ts __tests__/lib/tencent-readiness.test.ts
npm run typecheck
```

Expected: all focused tests pass; typecheck reports zero errors.

- [ ] **Step 10: Commit one-shot submission and recovery**

```text
git add src/lib/tencent/client.ts src/lib/tencent/vod.ts src/lib/tencent/reconciliation.ts src/app/api/video/process/route.ts src/app/api/video/process/reconcile/route.ts __tests__/lib/tencent-client.test.ts __tests__/lib/tencent-reconciliation.test.ts __tests__/lib/tencent-vod.test.ts __tests__/api/tencent-upload-process.test.ts
git commit -m "feat(tencent): submit processing exactly once" -m "Implements TENCENT-COST-02 through TENCENT-COST-04 one-shot submission and reconciliation."
```

---

## Task 7: Apply strict readiness to webhook, sync, status, and cron

**Requirements:** `TENCENT-COST-04`, `TENCENT-COST-06`

**Files:**
- Modify: `src/app/api/video/sync/route.ts`
- Modify: `src/app/api/video/status/route.ts`
- Modify: `src/app/api/cron/check-videos/route.ts`
- Modify: `src/app/api/webhook/tencent/route.ts`
- Create: `__tests__/api/tencent-readiness-routes.test.ts`
- Modify: `__tests__/api/tencent-webhook-route.test.ts`

- [ ] **Step 1: Write failing shared-readiness route tests**

For sync, status, cron, and webhook, prove:

- both expected definitions plus exact substream evidence publish and persist both template IDs/fingerprint;
- one output, wrong definition, extra video stream, short edge above 720, missing substreams, or profile drift keeps `published:false`;
- Tencent `Status='FINISH'` alone never publishes;
- original `MediaUrl` alone never publishes;
- every route makes zero `ProcessMediaByProcedure` calls;
- upload-complete webhook state becomes `AWAITING_PROCESSING_APPROVAL`, never `PROCESSING`;
- a procedure callback updates the matching attempt status/TaskId but does not erase the permanent attempt key;
- cron excludes `AWAITING_PROCESSING_APPROVAL` and `PROVIDER_REJECTED`, and fetches the remote profile once per run rather than once per video;
- webhook payload without full substream evidence calls `DescribeMediaInfos` read-only before deciding; if evidence is still missing, it remains unpublished.

- [ ] **Step 2: Run route tests and confirm RED**

```text
npm test -- --runInBand __tests__/api/tencent-readiness-routes.test.ts __tests__/api/tencent-webhook-route.test.ts
```

Expected: FAIL because all four routes currently publish from any playback URL or normalized READY status.

- [ ] **Step 3: Replace permissive publication decisions**

Each route must obtain one safe current `TencentProfileSnapshot`, describe media when needed, call `evaluateTencentReadiness`, then apply `readinessVideoPatch`. Persist:

```ts
tencentAdaptiveTemplateId: String(result.multiDrmDefinition),
tencentAppleFallbackTemplateId: String(result.simpleAesDefinition),
tencentAppleFallbackDrmType: 'SimpleAES',
tencentProfileFingerprint: result.profileFingerprint,
```

When Tencent says a task finished but readiness fails, use `OUTPUT_INCOMPLETE`; do not report `READY` and do not publish.

- [ ] **Step 4: Keep each route read-only with respect to Tencent paid work**

Allowed Tencent actions in these routes are only `DescribeMediaInfos`, `DescribeProcedureTemplates`, `DescribeAdaptiveDynamicStreamingTemplates`, `DescribeTasks`, and `DescribeTaskDetail`. No route imports `processTencentMedia`.

- [ ] **Step 5: Update attempt audit state from provider evidence**

On a signed procedure callback, update the ledger matching `providerTaskId` or the Video's permanent attempt key. Use the closed transition helper. Store TaskId/status/timestamps only. Never trust callback URLs as publishable without strict evidence.

- [ ] **Step 6: Run focused tests and confirm GREEN**

```text
npm test -- --runInBand __tests__/api/tencent-readiness-routes.test.ts __tests__/api/tencent-webhook-route.test.ts __tests__/lib/tencent-readiness.test.ts __tests__/lib/tencent-reconciliation.test.ts
npm run typecheck
```

Expected: all focused tests pass; typecheck reports zero errors.

- [ ] **Step 7: Commit shared fail-closed publication**

```text
git add src/app/api/video/sync/route.ts src/app/api/video/status/route.ts src/app/api/cron/check-videos/route.ts src/app/api/webhook/tencent/route.ts __tests__/api/tencent-readiness-routes.test.ts __tests__/api/tencent-webhook-route.test.ts
git commit -m "fix(tencent): publish only complete approved outputs" -m "Implements TENCENT-COST-06 across webhook and reconciliation paths."
```

---

## Task 8: Add explicit admin cost approval and recovery states

**Requirements:** `TENCENT-COST-02`, `TENCENT-COST-03`, `TENCENT-COST-06`

**Files:**
- Modify: `src/app/api/admin/videos/route.ts`
- Modify: `src/app/admin/videos/page.tsx`
- Create: `src/components/admin/TencentProcessingApprovalDialog.tsx`
- Modify: `__tests__/components/admin-videos.test.tsx`
- Create: `__tests__/components/tencent-processing-approval-dialog.test.tsx`

- [ ] **Step 1: Write failing admin row-state tests**

Lock these row actions:

| Local state | Primary action |
| --- | --- |
| `UPLOAD_APPLIED` | Upload in progress; no processing action |
| `AWAITING_PROCESSING_APPROVAL` | `Review cost and process` |
| quote route error/profile unsafe | Show blocking reason; no submit |
| `SUBMITTING` | Disabled `Submitting` |
| `SUBMISSION_UNKNOWN` | `Reconcile status`; no process action |
| `SUBMITTED` or `PROCESSING` | `Update status`; no process action |
| MultiDRM present, fallback missing | `Apple fallback missing`; no ready badge |
| strict `READY` | Ready badge and Watch action only when published |
| `PROVIDER_REJECTED` or `FAILED` | Closed failure; no retry for same profile |

Assert page mount, list refresh, upload completion, status refresh, and dialog reopening never call `/api/video/process` by themselves.

- [ ] **Step 2: Write failing dialog interaction tests**

Test:

- opening explicitly calls quote once;
- duration, source facts, exactly two 720p paths, unit price, maximum USD, hard cap, expiry, and exclusions render;
- submit button text is `Approve and process — max $<estimatedMaxUsd>`;
- button remains disabled until the confirmation checkbox is checked;
- one click sends `{ videoId, approved:true, quoteToken }` once;
- double click while pending sends once;
- `409` stale quote clears the token and requires a new visible quote;
- `422` keeps processing unstarted and explains the block;
- closing/reopening fetches a fresh quote and never reuses an expired token;
- the component never renders provider URLs, credentials, full profile payloads, or task response bodies.

- [ ] **Step 3: Run component tests and confirm RED**

```text
npm test -- --runInBand __tests__/components/admin-videos.test.tsx __tests__/components/tencent-processing-approval-dialog.test.tsx
```

Expected: FAIL because the explicit approval UI does not exist.

- [ ] **Step 4: Extend the admin video list safely**

Return status, both template IDs, a short fingerprint display value, profile version, whether an attempt exists, and attempt status. Do not return quote digests, SessionIds, provider request bodies, media URLs beyond the existing playback fields, or any secret.

- [ ] **Step 5: Implement the approval dialog**

Fetch only on explicit open. Require checkbox confirmation text:

```text
I approve one MultiDRM 720p output and one SimpleAES 720p output up to the displayed maximum processing cost.
```

Keep focus, labels, errors, and button state accessible. On successful `202`, close, toast the submitted state, and refetch the list. Never automatically retry a submit.

- [ ] **Step 6: Implement row state and reconciliation action**

Map row status to the table above. `SUBMISSION_UNKNOWN` calls only `/api/video/process/reconcile`. The standard Update Status action remains read-only with respect to paid processing.

- [ ] **Step 7: Run component and route tests and confirm GREEN**

```text
npm test -- --runInBand __tests__/components/admin-videos.test.tsx __tests__/components/tencent-processing-approval-dialog.test.tsx __tests__/api/tencent-upload-process.test.ts
npm run typecheck
```

Expected: all focused tests pass; typecheck reports zero errors.

- [ ] **Step 8: Commit explicit approval UI**

```text
git add src/app/api/admin/videos/route.ts src/app/admin/videos/page.tsx src/components/admin/TencentProcessingApprovalDialog.tsx __tests__/components/admin-videos.test.tsx __tests__/components/tencent-processing-approval-dialog.test.tsx
git commit -m "feat(admin): approve Tencent cost before processing" -m "Implements TENCENT-COST-02, TENCENT-COST-03, and TENCENT-COST-06 UI gates."
```

---

## Task 9: Add real live verification and guarded Tencent configuration/rollback

**Requirements:** `TENCENT-COST-01`, `TENCENT-COST-05`

**Files:**
- Create: `src/lib/tencent/profile-config.ts`
- Create: `scripts/configure-tencent-720p.ts`
- Modify: `scripts/verify-tencent-setup.ts`
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `.gitignore`
- Create: `__tests__/scripts/tencent-profile-tools.test.ts`
- Modify: `__tests__/scripts/package-scripts.test.ts`

- [ ] **Step 1: Write failing tooling tests**

Test dry-run calls only the two Describe actions and prints safe names, IDs, DRM types, stream counts, caps, and non-adaptive task counts. Assert output contains no secret env value, token, URL, license material, or raw response.

Test apply refuses unless the exact argument is:

```text
--apply=RESET-WV-SAES-V1-TO-720P
```

Test restore refuses unless both a validated backup path and:

```text
--apply=RESTORE-WV-SAES-V1
```

Assert configuration code has no FileId input and never calls `ProcessMedia`, `ProcessMediaByProcedure`, `ApplyUpload`, or `CommitUpload`.

Test apply behavior:

- exact matching custom template is reused;
- absent custom template is created once;
- same-name drifted custom template aborts rather than modifying it;
- a safe JSON snapshot is written before reset;
- reset contains exactly two adaptive definitions and explicit empty arrays for every non-adaptive task;
- immediate read-back must pass exact profile validation;
- restore accepts only the script's versioned snapshot schema and resets only `WV-SAES-V1`.

- [ ] **Step 2: Run tooling tests and confirm RED**

```text
npm test -- --runInBand __tests__/scripts/tencent-profile-tools.test.ts
```

Expected: FAIL because live verification is env-only and configuration tooling does not exist.

- [ ] **Step 3: Implement the exact template builders**

MultiDRM create payload:

```ts
{
  Name: 'WVFP-HLS-720-V1',
  Comment: 'One 720p video rendition; MultiDRM; no upscaling',
  Format: 'HLS',
  DrmType: 'Widevine+FairPlay',
  DrmKeyProvider: 'VOD',
  DrmEncryptType: 'cbcs',
  SegmentType: 'mp4-mp4-segment',
  DisableHigherVideoBitrate: 1,
  DisableHigherVideoResolution: 1,
  StreamInfos: [approvedStreamInfo],
}
```

SimpleAES create payload is identical except `Name:'SAES-HLS-720-V1'`, `DrmType:'SimpleAES'`, no MultiDRM-only key/encrypt fields, and `SegmentType:'ts'`.

Procedure reset payload:

```ts
{
  Name: 'WV-SAES-V1',
  Comment: 'Exactly one 720p video rendition per DRM path; no screenshots',
  MediaProcessTask: {
    TranscodeTaskSet: [],
    AnimatedGraphicTaskSet: [],
    SnapshotByTimeOffsetTaskSet: [],
    SampleSnapshotTaskSet: [],
    ImageSpriteTaskSet: [],
    CoverBySnapshotTaskSet: [],
    AdaptiveDynamicStreamingTaskSet: [
      { Definition: multiDrmDefinition },
      { Definition: simpleAesDefinition },
    ],
  },
  AiRecognitionTaskSet: [],
  ImportMediaKnowledgeTaskSet: [],
}
```

- [ ] **Step 4: Implement safe snapshot, dry-run, apply, and restore**

Write snapshots to `reports/tencent-profile-backups/<UTC timestamp>.json` and add `/reports/tencent-profile-backups/` to `.gitignore`. The schema contains version, timestamp, SubAppId or null, procedure name, previous safe procedure object, and referenced template definitions/configuration. It contains no credentials, URLs, tokens, media IDs, or license material.

Dry-run is default. Apply order is: Describe current -> validate/reuse or create templates -> snapshot -> reset procedure -> Describe read-back -> exact validate. Never delete templates automatically. Restore resets the saved procedure only and immediately reads it back.

- [ ] **Step 5: Turn `--live` into actual read-only verification**

`npm run verify:tencent -- --strict --live` loads strict env, calls `describeTencentProcessingProfile`, prints the safe summary, and exits nonzero on any drift. Without `--live`, it remains env-only. Remove the old message claiming live checks are intentionally limited.

- [ ] **Step 6: Add package/env contracts**

Add:

```json
"tencent:configure-720p": "tsx scripts/configure-tencent-720p.ts"
```

Set `.env.example` values:

```text
TENCENT_VOD_PROCEDURE_NAME="WV-SAES-V1"
TENCENT_VOD_H264_720_USD_PER_MINUTE="0.0061"
TENCENT_VOD_MAX_PROCESSING_USD="5.00"
NEXT_PUBLIC_TENCENT_FAIRPLAY_LICENSE_URL=""
NEXT_PUBLIC_TENCENT_FAIRPLAY_CERT_URL=""
```

- [ ] **Step 7: Run local tooling tests and safe dry-run contract checks**

```text
npm test -- --runInBand __tests__/scripts/tencent-profile-tools.test.ts __tests__/scripts/package-scripts.test.ts __tests__/lib/tencent-profile.test.ts
npm run verify:tencent
npm run typecheck
```

Expected: tests pass; non-live verification checks env shape without a provider write; typecheck reports zero errors.

Do not run apply or restore in this task. Stop after generating the dry-run command and obtain explicit user approval for any remote reset.

- [ ] **Step 8: Commit tooling before any remote change**

```text
git add src/lib/tencent/profile-config.ts scripts/configure-tencent-720p.ts scripts/verify-tencent-setup.ts package.json .env.example .gitignore __tests__/scripts/tencent-profile-tools.test.ts __tests__/scripts/package-scripts.test.ts
git commit -m "feat(tencent): verify and configure safe 720p profile" -m "Implements TENCENT-COST-01 and TENCENT-COST-05 guarded tooling."
```

---

## Task 10: Document, verify, deploy fail-closed, run one approved canary, and close Phase 10.1

**Requirements:** `TENCENT-COST-01` through `TENCENT-COST-06`

**Files:**
- Modify: `docs/env-matrix.md`
- Modify: `docs/provider-zero-setup.md`
- Modify: `docs/operations/subsystems.md`
- Create: `docs/verification/tencent-720p-cost-safety-verification-record.md`
- Modify: `__tests__/env/env-matrix.test.ts`
- Modify: `__tests__/docs/provider-zero-setup.test.ts`
- Modify: `__tests__/docs/operations-docs.test.ts`
- Modify after canary: `.planning/PROJECT.md`
- Modify after canary: `.planning/STATE.md`
- Modify after canary: `.planning/ROADMAP.md`
- Modify after canary: `.planning/REQUIREMENTS.md`

- [ ] **Step 1: Update operator documentation before rollout**

Document:

- source-only upload and separate `Review cost and process` action;
- exact two-output profile and why audio remains;
- micro-USD quote formula, operator-owned price, hard cap, and exclusions;
- `AWAITING_PROCESSING_APPROVAL`, `SUBMITTING`, `SUBMISSION_UNKNOWN`, `PROVIDER_REJECTED`, `PROCESSING`, `OUTPUT_INCOMPLETE`, and `READY` operations;
- 7-day Tencent SessionId defense versus permanent local ledger;
- 72-hour task-list limitation and no-resubmit rule;
- dry-run/apply/restore commands and snapshot path;
- no-FairPlay Apple path;
- database backup/schema rollout, fail-closed deployment, remote rollback, and incident freeze;
- prohibition on existing-FileId reprocessing.

- [ ] **Step 2: Update documentation contract tests and run them RED then GREEN**

First add assertions for the two price/cap env rows, `WV-SAES-V1`, source-only upload, explicit numeric approval, permanent attempt ledger, 72-hour reconciliation limitation, no-resubmit rule, dry-run/apply/restore, and no-FairPlay Apple path.

Run before the doc edits to confirm the assertions fail, then update the three documents and run:

```text
npm test -- --runInBand __tests__/env/env-matrix.test.ts __tests__/docs/provider-zero-setup.test.ts __tests__/docs/operations-docs.test.ts
```

Expected: all three suites pass after the documentation is updated.

- [ ] **Step 3: Run the complete local quality gate**

```text
npm run prisma:generate
npm run lint
npm run typecheck
npm test -- --runInBand
npm run build
npm run secrets:scan
git diff --check
```

Expected: every command exits zero. Record inherited warnings separately; do not call them new passes if they are unresolved errors.

- [ ] **Step 4: Prove the paid action has one call site**

```text
rg -n "ProcessMediaByProcedure|ProcessMedia" src scripts
rg -n "procedure=|taskNotifyMode=|sessionContext=" src/lib/tencent/vod.ts src/app/admin/videos/page.tsx
rg -n "/api/video/process" src/app src/components
```

Expected:

- `ProcessMediaByProcedure` appears only inside `processTencentMedia` and tests/documentation;
- upload signing/helpers contain none of the removed processing fields;
- only the explicit approval component calls `POST /api/video/process`;
- no config, verify, webhook, sync, status, cron, upload, timer, or effect path submits paid processing.

- [ ] **Step 5: Obtain independent code review and resolve findings**

Use `superpowers:requesting-code-review`. Reviewer must inspect authorization ordering, money math, HMAC verification, MongoDB CAS/unique behavior, failure ambiguity, Tencent action allowlists, URL/secret leakage, readiness across all four routes, and no existing FileId processing. Re-run affected focused tests after every accepted change.

- [ ] **Step 6: Commit docs and local verification record**

The record contains command, UTC timestamp, commit SHA, pass/fail, safe topology counts, and blockers. It contains no credentials, media URLs, full FileIds, quote tokens, or license data.

```text
git add docs/env-matrix.md docs/provider-zero-setup.md docs/operations/subsystems.md docs/verification/tencent-720p-cost-safety-verification-record.md __tests__/env/env-matrix.test.ts __tests__/docs/provider-zero-setup.test.ts __tests__/docs/operations-docs.test.ts
git commit -m "docs: operate Tencent processing cost controls" -m "Documents TENCENT-COST-01 through TENCENT-COST-06 verification and rollback."
```

- [ ] **Step 7: Freeze processing and prepare the live environment**

Before any write:

1. Disable/admin-freeze new video processing.
2. Back up MongoDB and verify restore access.
3. Set procedure, price, and cap env values without printing secrets.
4. With explicit database-deployment approval, apply the Prisma schema/index changes to the intended environment.
5. Deploy the code that removes automatic processing and fails closed.
6. Verify an upload can reach `AWAITING_PROCESSING_APPROVAL` with zero Tencent processing task.

If step 6 fails, keep processing frozen and roll back the application/schema according to the database backup plan. Do not reset Tencent or process media.

- [ ] **Step 8: Dry-run and separately approve the remote profile reset**

Run read-only:

```text
npm run tencent:configure-720p -- --dry-run
```

Review the safe diff and backup destination. Only after the user explicitly approves this exact remote reset, run:

```text
npm run tencent:configure-720p -- --apply=RESET-WV-SAES-V1-TO-720P
npm run verify:tencent -- --strict --live
```

Expected: exactly two custom adaptive definitions, one stream each, zero non-adaptive tasks, and no media task created. If read-back fails, keep processing frozen and restore from the generated snapshot only after explicit restore approval:

```text
npm run tencent:configure-720p -- --restore=<validated-backup-path> --apply=RESTORE-WV-SAES-V1
```

- [ ] **Step 9: Request and run one short paid canary only**

Create a new short source; do not reuse either existing long/test FileId. Open the quote UI and present the exact duration and maximum USD to the user. Continue only after the user approves that numeric quote.

Acceptance evidence:

1. one local ledger row and one Tencent procedure TaskId;
2. one MultiDRM definition and one SimpleAES definition, each with one video substream no larger than 720 short edge;
3. no 240/480/1080/1440/2160 additional rendition, sprite, cover, screenshot, AI, review, watermark, or second procedure task;
4. Chrome/Android plays through Widevine;
5. iPhone Safari plays through SimpleAES without FairPlay certificate fetch;
6. admin shows strict READY with both IDs/fingerprint;
7. pressing submit again, refreshing, waiting, sync, status, cron, and webhook produce zero extra paid task.

Record redacted screenshots/task counts and the observed billed line item when available. Do not expose playback URLs, DrmToken, credentials, or full user/session data.

- [ ] **Step 10: Close Phase 10.1 only after canary acceptance**

Mark `TENCENT-COST-01`–`06` complete, change roadmap plan to `1/1 Complete`, restore 87/87 complete coverage, set state to 100%, and add the validated decision to PROJECT. If the canary is blocked or fails, leave all six pending and STATE active with the exact blocker.

```text
git add .planning/PROJECT.md .planning/STATE.md .planning/ROADMAP.md .planning/REQUIREMENTS.md docs/verification/tencent-720p-cost-safety-verification-record.md
git commit -m "docs: close Tencent 720p cost safety" -m "Closes TENCENT-COST-01 through TENCENT-COST-06 after approved canary evidence."
```

---

## Final Acceptance Checklist

- [ ] Upload completion creates zero Tencent processing tasks.
- [ ] Exact current quote and checked confirmation are required before submit.
- [ ] One FileId/profile produces one permanent local attempt and at most one Tencent procedure task.
- [ ] Retry, concurrency, ambiguous response, seven-day expiry, webhook, sync, status, and cron cannot resubmit.
- [ ] `WV-SAES-V1` has exactly two custom adaptive tasks and no other task.
- [ ] Each template has exactly one H.264 720p-capped video stream with required audio.
- [ ] Source eligibility and hard cap fail closed before paid work.
- [ ] Both expected outputs, definition IDs, substreams, and profile fingerprint are required for publication.
- [ ] Live verifier is Describe-only; configuration has dry-run, explicit apply, snapshot, read-back, and explicit restore.
- [ ] No existing FileId was processed or reprocessed.
- [ ] One separately approved short canary passes Widevine and iPhone Safari SimpleAES.
- [ ] Full tests, lint, typecheck, build, secret scan, diff check, independent review, docs, and rollback evidence pass.

## Execution Handoff

Plan complete and saved at `docs/superpowers/plans/2026-08-16-tencent-720p-cost-safety.md`.

Execution choices:

1. **Subagent-Driven (recommended):** execute one task at a time in this session, with a fresh implementation worker and review checkpoint per task.
2. **Inline Execution:** execute the same checklist directly in one worker, stopping before database deployment, Tencent apply/restore, and paid canary approvals.

For either choice, use test-driven development, preserve the existing dirty/untracked user files, and stop at every external-write approval boundary.
