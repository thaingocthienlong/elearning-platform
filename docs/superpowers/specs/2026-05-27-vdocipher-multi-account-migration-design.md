# VdoCipher Multi-Account Migration Design

Date: 2026-05-27
Status: Draft for user review

## Context

The Axinom account used by this project has expired and cannot be extended. The current application still depends on Axinom for encoding, DRM license messages, manifest URLs, webhook sync, and Shaka Player playback. The immediate business need is to make 12 existing course videos, roughly 10 GB total source size, available to clients through VdoCipher.

VdoCipher becomes the new protected video provider for new uploads and playback. Axinom fields and code paths remain during the migration so existing records can be inspected, recovered, or rolled back without a destructive cutover.

The user requires multi-account support first because current VdoCipher account limits are tight. The implementation must support several configured VdoCipher accounts, but it must not bake free-trial quota evasion into product logic. The same account registry must work for approved trial accounts today and a paid account tomorrow.

## Official VdoCipher Behaviors Used

- Upload starts by requesting upload credentials from VdoCipher on the backend, then the browser uploads directly to the returned upload URL.
- Video processing status is checked through the VdoCipher video status API, and completed videos become playable after status is ready.
- Playback requires the backend to call the OTP API for a VdoCipher video ID. VdoCipher returns `otp` and `playbackInfo`, and the frontend embeds the player URL with those values.
- OTP generation must stay server-side because it uses the VdoCipher API secret.
- Dynamic watermarking is passed through the OTP request body using the `annotate` field, which must be JSON-stringified separately.
- Webhooks can notify the app when video processing is complete.

Primary docs:

- Upload overview: https://www.vdocipher.com/docs/server/upload/overview/
- Browser upload: https://www.vdocipher.com/docs/server/upload/browser/
- Video status: https://www.vdocipher.com/docs/server/upload/status/
- OTP API: https://www.vdocipher.com/docs/server/playbackauth/otp/
- Watermark annotation: https://www.vdocipher.com/docs/server/playbackauth/anno/
- Player v2 embed: https://www.vdocipher.com/docs/player/v2/
- Webhooks: https://www.vdocipher.com/docs/server/account/hooks/
- Pricing: https://www.vdocipher.com/site/pricing/
- Terms: https://www.vdocipher.com/page/terms/
- Storage accounting: https://www.vdocipher.com/blog/bandwidth-storage-calculation/

## Goals

1. Let admins upload and process videos through VdoCipher instead of Axinom.
2. Let entitled learners play VdoCipher videos through the existing watch page.
3. Preserve existing course access, direct video access windows, view limits, watermark identity, heartbeat, session revocation, and support/debug flows.
4. Support multiple VdoCipher accounts from the first implementation.
5. Make later consolidation onto one paid account a configuration and data operation, not a player rewrite.
6. Keep all VdoCipher API secrets server-side and out of client bundles, logs, docs, screenshots, and commits.

## Non-Goals

- Do not remove all Axinom code in the first migration.
- Do not migrate database provider away from Prisma/MongoDB.
- Do not promise automatic VdoCipher account-to-account transfer. If VdoCipher does not support transfer, consolidation may require re-uploading or vendor support.
- Do not treat VdoCipher iframe/player DRM as a reason to remove app-level entitlement checks.
- Do not weaken session, view limit, watermark, or audit behavior to speed up upload.

## Data Model

Add provider-neutral and VdoCipher-specific fields to `Video`.

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

model Video {
  provider           VideoProvider   @default(AXINOM)
  vdocipherVideoId   String?
  vdocipherAccountId String?
  vdocipherStatus    VdoCipherStatus?
  vdocipherPosterUrl String?
  vdocipherSyncedAt  DateTime?
  vdocipherError     String?

  @@index([provider])
  @@index([vdocipherAccountId])
  @@index([vdocipherVideoId])
  @@index([vdocipherStatus])
}
```

Existing fields remain:

- `dashUrl`
- `hlsUrl`
- `hlsUrlClear`
- `drmKeyId`
- `axinomVideoId`
- `axinomIdClear`
- `axinomEncodingStatus`
- `axinomOutputLocation`
- `axinomSyncedAt`

Existing records default to `AXINOM`. New VdoCipher uploads set `provider = VDOCIPHER`.

## Account Registry

Create a server-only VdoCipher account registry. The registry hides secret lookup and gives the rest of the app a stable account ID.

Recommended env shape:

```text
VDOCIPHER_ACCOUNT_IDS=primary,backup1,backup2,backup3,backup4
VDOCIPHER_API_SECRET_PRIMARY=...
VDOCIPHER_API_SECRET_BACKUP1=...
VDOCIPHER_API_SECRET_BACKUP2=...
VDOCIPHER_API_SECRET_BACKUP3=...
VDOCIPHER_API_SECRET_BACKUP4=...
VDOCIPHER_WEBHOOK_SECRET=...
VDOCIPHER_DEFAULT_ACCOUNT_ID=primary
```

Rules:

- Account IDs are app-owned labels, not raw VdoCipher tenant IDs.
- Env suffixes are normalized to uppercase alphanumeric plus underscore.
- Missing secrets fail startup verification for accounts listed in `VDOCIPHER_ACCOUNT_IDS`.
- Secrets never return to the browser.
- Logs include only logical account ID, video row ID, VdoCipher video ID, status, and sanitized error category.

## Account Selection

First version uses a deterministic, operator-controlled selector:

1. Admin may pass a target account ID when creating/uploading a video.
2. If no account is selected, use `VDOCIPHER_DEFAULT_ACCOUNT_ID`.
3. If default is missing or disabled, use the first configured enabled account.
4. Store chosen account ID on the `Video` row and always use that account for upload status, OTP, and webhook reconciliation.

Automatic quota balancing is deferred because the official docs reviewed for this design do not establish a reliable quota API. Operators can distribute the initial 12 videos manually across configured accounts.

For the immediate 12-video case:

- Use 5 configured account IDs if needed.
- Assign 2-3 videos per account.
- Prefer smaller or lower-priority videos on constrained accounts.
- When paid account becomes available, set it as default for all future uploads.
- Consolidate old videos only after confirming whether VdoCipher can transfer videos between accounts; otherwise plan re-upload.

## Upload Flow

Endpoint:

```text
POST /api/vdocipher/upload-credentials
```

Request body:

```json
{
  "filename": "lesson-01.mp4",
  "contentType": "video/mp4",
  "courseId": "<courseId>",
  "title": "Lesson 01",
  "accountId": "backup1"
}
```

Behavior:

1. Require authenticated admin session.
2. Validate course exists and is not deleted.
3. Resolve VdoCipher account from requested `accountId` or default selector.
4. Call VdoCipher upload API using that account secret.
5. Create `Video` row:
   - `provider = VDOCIPHER`
   - `vdocipherAccountId = selected account`
   - `vdocipherVideoId = returned VdoCipher video ID`
   - `vdocipherStatus = PRE_UPLOAD` or `QUEUED`, depending on response
   - `published = false`
6. Return upload URL/fields and local `videoId` to admin UI.

Existing `/api/upload/presigned` can remain for Axinom/Azure during transition, but admin UI should prefer VdoCipher upload for new videos.

## Status Sync Flow

Use both webhook and manual polling.

Endpoints:

```text
POST /api/webhook/vdocipher
POST /api/video/vdocipher/sync
```

Webhook behavior:

1. Verify webhook authenticity if VdoCipher provides signature material for the configured hook.
2. Parse VdoCipher video ID and status.
3. Find matching `Video` by `provider = VDOCIPHER`, `vdocipherVideoId`, and account ID if available.
4. Fetch authoritative status from VdoCipher using the stored account secret when needed.
5. Update `vdocipherStatus`, `vdocipherPosterUrl`, `vdocipherSyncedAt`, and sanitized error.
6. Do not auto-publish unless admin explicitly enables that later.

Manual sync behavior:

1. Require admin session.
2. Load video row.
3. Resolve stored account ID.
4. Fetch current VdoCipher video status.
5. Update VdoCipher fields.

Cron can later scan non-ready VdoCipher videos and call the same sync helper.

## Playback Flow

Keep the current app authorization layer:

```text
/watch/[videoId]
  -> getServerSession()
  -> evaluateMediaEntitlement()
  -> load watermark identity
  -> provider switch
```

For `AXINOM`, current Shaka/Axinom flow remains.

For `VDOCIPHER`:

1. Ensure `vdocipherVideoId`, `vdocipherAccountId`, and `vdocipherStatus = READY`.
2. Server generates initial OTP from VdoCipher or passes enough safe state for client to call an app route.
3. Render a VdoCipher player wrapper instead of `DRMPlayerWrapper`.
4. Player wrapper embeds:

```text
https://player.vdocipher.com/v2/?otp=<otp>&playbackInfo=<playbackInfo>
```

5. App heartbeat remains outside the iframe. It records page-level watch heartbeat on interval while the watch page is open. If precise playback position cannot be read from VdoCipher iframe, keep position as best-effort and record provider telemetry separately.

Endpoint:

```text
POST /api/vdocipher/otp
```

Request:

```json
{
  "videoId": "<local Video id>"
}
```

Behavior:

1. Require authenticated session.
2. Re-run `evaluateMediaEntitlement` with view limit checks.
3. Load stored VdoCipher account ID and video ID.
4. Generate watermark annotation from existing watermark identity.
5. Call VdoCipher OTP API with:
   - `ttl = 300`
   - `annotate = JSON.stringify([...])`
6. Return only `otp`, `playbackInfo`, and a short expiry hint.

The API route must not accept raw `vdocipherVideoId` from the browser. Browser sends local video ID only.

## Watermarking

The existing app watermark text is built from whitelist `fullname` and `phone`, falling back to user name/email. For VdoCipher, convert that text into VdoCipher annotation:

```json
[
  {
    "type": "rtext",
    "text": "<watermarkText>",
    "alpha": "0.60",
    "color": "0xFFFFFF",
    "size": "15",
    "interval": "5000",
    "skip": "5000"
  }
]
```

The value sent to VdoCipher is `JSON.stringify(annotationArray)`.

Keep the existing overlay watermark for Axinom playback. Do not place the app overlay above the VdoCipher iframe unless browser testing proves fullscreen behavior is acceptable.

## Admin UI

Update admin video table:

- Show `Provider`.
- For VdoCipher rows, show account ID, VdoCipher ID, VdoCipher status, last sync time, and sync button.
- Hide Axinom ID/status labels for VdoCipher rows.
- Add account selector on upload form when more than one account is configured.
- Add clear warning in admin UI when a selected account is marked disabled/missing secret.

The upload form should support fast manual distribution for the first 12 videos.

## Environment And Verification

Add non-secret example placeholders to env docs:

```text
VDOCIPHER_ACCOUNT_IDS=primary
VDOCIPHER_API_SECRET_PRIMARY=<server-secret>
VDOCIPHER_DEFAULT_ACCOUNT_ID=primary
VDOCIPHER_WEBHOOK_SECRET=<server-secret-if-used>
```

Add verifier checks:

- Every listed account has an API secret.
- Default account exists in the account list.
- No account ID contains unsafe env suffix characters.
- VdoCipher routes are disabled with clear admin errors when config is missing.
- Existing Axinom verification stays available for old rows, but staging acceptance can target VdoCipher.

## Tests

Add focused tests:

- Account registry resolves configured accounts and rejects missing secrets.
- Upload credentials route requires admin session and stores selected account ID.
- Upload route rejects unknown account ID.
- OTP route re-runs entitlement and never trusts browser-supplied VdoCipher ID.
- OTP route uses stored account secret and includes watermark annotation.
- OTP route rejects non-ready VdoCipher video.
- Provider switch renders VdoCipher player for VdoCipher rows and Axinom player for old rows.
- Webhook/sync updates only matching VdoCipher rows.

Mocks must avoid real VdoCipher API calls by default.

## Migration Plan

1. Add schema fields and generated client.
2. Add server-only VdoCipher account registry and API client.
3. Add VdoCipher upload credentials route.
4. Add VdoCipher status sync and webhook route.
5. Add VdoCipher OTP route.
6. Add VdoCipher player wrapper and provider switch in watch page.
7. Update admin upload/video management UI.
8. Update env matrix, setup docs, staging smoke checklist, provider-zero setup, and operations docs.
9. Upload the 12 videos across configured accounts.
10. Smoke each video with entitled and denied users.
11. When paid account is available, make it default and decide whether to leave already uploaded videos in place or re-upload/consolidate.

## Acceptance Criteria

- Admin can upload a VdoCipher video to a selected configured account.
- Admin can see processing status and manually sync status.
- Entitled learner can open `/watch/<videoId>` and play a ready VdoCipher video.
- Denied learner cannot generate OTP for the same video.
- Watermark text appears through VdoCipher annotation.
- App secrets never reach browser response, docs, logs, or screenshots.
- Existing Axinom videos are not broken by the VdoCipher migration.
- Multi-account config can support five accounts for urgent upload distribution.
- Switching future uploads to one paid account requires only env default/account selection changes.

## Open Risks

- VdoCipher free-trial and multi-account use is governed by VdoCipher terms and any written permission they provide. The app supports multiple accounts technically, but operations must keep provider use compliant.
- Storage accounting may be much higher than source file size because VdoCipher stores encoded renditions. Ten GB of source video may require far more provider storage.
- VdoCipher iframe may limit precise watch-position telemetry. Preserve existing heartbeat as page-level evidence first; add deeper player API integration only if officially supported and needed.
- Account consolidation may require re-upload if VdoCipher cannot transfer videos across accounts.
