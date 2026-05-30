# Bunny Stream Migration Design

Date: 2026-05-30
Status: Draft for user review

## Context

The current application still stores Axinom-oriented playback and processing fields on `Video`: `dashUrl`, `hlsUrl`, `hlsUrlClear`, `drmKeyId`, `axinomVideoId`, `axinomIdClear`, `axinomJobId`, `axinomEncodingStatus`, `axinomOutputLocation`, and `axinomSyncedAt`. Playback currently evaluates app entitlement, creates an Axinom token when `drmKeyId` exists, and renders `DRMPlayerWrapper` with Shaka-based DASH/HLS playback.

The requested migration is to move video hosting, encoding, DRM, and playback to Bunny Stream. The safest first architecture is Bunny Stream's iframe player with MediaCage Enterprise DRM and embed token authentication. That keeps DRM packaging, FairPlay/Widevine license handling, and player compatibility inside Bunny while preserving this app's server-side entitlement, watermark identity, session revocation, view limits, and watch heartbeat controls.

This design replaces new video upload and playback with Bunny Stream while leaving existing Axinom fields and routes available during the migration window. Existing records can remain inspectable until operators decide whether to archive, re-upload, or remove old provider data.

## Official Bunny Sources Used

- Stream Quickstart: https://docs.bunny.net/stream/quickstart
- Stream Authentication: https://docs.bunny.net/stream/authentication
- Stream API Reference: https://docs.bunny.net/api-reference/stream
- HTTP Upload API: https://docs.bunny.net/stream/http-api
- TUS Resumable Uploads: https://docs.bunny.net/stream/tus-resumable-uploads
- URL Fetch: https://docs.bunny.net/stream/url-fetch
- Stream Encoding: https://docs.bunny.net/stream/encoding
- Stream Security: https://docs.bunny.net/stream/security
- Security Options: https://docs.bunny.net/stream/security-options
- Embedded View Token Authentication: https://docs.bunny.net/stream/token-authentication
- MediaCage DRM: https://docs.bunny.net/stream/drm
- Embedding Videos: https://docs.bunny.net/stream/embedding
- Playback Control API: https://docs.bunny.net/stream/playback-api
- Webhooks: https://docs.bunny.net/stream/webhooks
- Third-Party Player Introduction: https://docs.bunny.net/stream/players
- Shaka Player Integration: https://docs.bunny.net/stream/players/shaka
- Widevine HTML5 Integration: https://docs.bunny.net/stream/players/widevine
- FairPlay HTML5 Integration: https://docs.bunny.net/stream/players/fairplay

## Official Bunny Behaviors To Build Around

- A Bunny Stream video library is the container for videos and library-level settings.
- Each Stream library has its own Stream API key. The app must use the library key in the `AccessKey` header for Stream API calls, not a generic account API key.
- HTTP upload requires two steps: create a video object, then upload raw binary with a PUT request.
- TUS upload requires creating a video first, then generating a server-side SHA256 upload signature from `library_id + api_key + expiration_time + video_id`.
- TUS keeps the API key server-side and lets the browser upload directly to `https://video.bunnycdn.com/tusupload`.
- Fetch Video can pull from a remote URL, but queued fetch limits and auth limitations mean it should be an operator tool, not the default admin upload path.
- Encoding settings live at Stream > Library > Encoding. More enabled resolutions mean more storage and longer processing. Early-Play exposes original files and should stay disabled for protected course videos.
- Security settings live at Stream > Library > Security. Allowed domains, embed token auth, CDN token auth, and MediaCage DRM are configured there.
- Bunny embed player URL shape is `https://player.mediadelivery.net/embed/{libraryId}/{videoId}`.
- Embed token auth requires server-side SHA256 hex over `token_security_key + video_id + expiration`, then the player URL includes `token` and `expires`.
- Bunny webhooks send video status changes. Signature validation uses HMAC-SHA256 over the exact raw request body with the library Read-Only API key as the secret.
- MediaCage Enterprise DRM automatically applies FairPlay or Widevine in Bunny's own player after it is enabled. Custom players can use Shaka, but this is a higher-complexity path.

## Goals

1. Let admins create and upload videos into Bunny Stream.
2. Let Bunny Stream handle hosting, transcoding, adaptive delivery, and DRM packaging.
3. Let entitled learners play Bunny videos on the existing watch page.
4. Keep this app's entitlement helper as the source of truth before any Bunny embed token is created.
5. Preserve direct video access windows, course enrollment checks, view limits, watermark identity, heartbeat, session revocation, security telemetry, admin video management, and support/debug flows.
6. Keep Bunny API keys, read-only keys, token security keys, and webhook secrets server-side.
7. Avoid exposing original files, direct unsigned HLS assets, or raw provider secrets to the browser.
8. Keep old Axinom records playable or at least inspectable until a deliberate cleanup phase.

## Non-Goals

- Do not remove all Axinom code in the first Bunny migration.
- Do not migrate away from Prisma/MongoDB.
- Do not promise that Bunny can import existing Axinom/VdoCipher/DoveRunner encrypted assets directly. Re-upload source files unless Bunny support confirms a provider-side transfer path.
- Do not treat Bunny DRM or allowed domains as a replacement for app-level entitlement.
- Do not use Bunny CDN token auth for direct HLS in the first implementation unless the user chooses the custom Shaka path.
- Do not enable Early-Play or expose originals for protected course videos.

## Recommended Approach

Use Bunny Stream iframe playback with MediaCage Enterprise DRM and embed token authentication.

Why:

- Bunny's own player automatically applies Enterprise DRM using FairPlay or Widevine.
- The current app already learned that iframe providers need separate app heartbeat logic. That pattern fits Bunny's player.
- It avoids custom license request handling, FairPlay certificate edge cases, and Shaka request filter changes in the first cutover.
- It keeps migration smaller: upload/status/playback provider routes change, while entitlement and course/watch routing stay stable.

Deferred alternate path:

- Keep Shaka and use Bunny's direct HLS/DRM endpoints with CDN token auth and Bunny Widevine/FairPlay license URLs. This only makes sense if product requirements demand a custom player UI or deep player event control that Bunny iframe cannot provide.

## Bunny Account And Library Setup Guide

1. Create or log in to the bunny.net account.
2. In the dashboard, go to Delivery -> Stream.
3. Create a Video Library for the staging or production environment.
4. Choose storage regions. For production, use at least two regions for durability and one region close to target viewers where possible.
5. In Stream > Library > API, copy:
   - Library ID.
   - Stream API key.
   - Read-Only API key.
   - Pull Zone hostname or storage zone hostname shown by Bunny for direct storage/player configuration.
6. In Stream > Library > Encoding:
   - Enable only required resolutions first, for example `360p,480p,720p,1080p`.
   - Disable Early-Play.
   - Do not expose originals.
   - Decide whether to keep original files only if operators need source backup and accept added storage cost.
7. In Stream > Library > Security:
   - Enable MediaCage Enterprise DRM if the account has it.
   - Enable embed view token authentication.
   - Add allowed domains for local/staging/production hostnames without `https://`.
   - Add `*.gstatic.com` only if Chromecast is enabled.
   - Keep Block Direct URL File Access enabled unless Bunny support says a required flow needs it off.
8. Configure webhook URL:
   - Local tunnel or staging: `<APP_ORIGIN>/api/webhook/bunny-stream`.
   - Production: `<PRODUCTION_ORIGIN>/api/webhook/bunny-stream`.
9. Store real values only in `.env.local`, Vercel encrypted env, or the selected staging secret store. Never commit real Bunny keys.

## Environment Variables

Recommended server-side variables:

```text
BUNNY_STREAM_LIBRARY_ID=<numeric-library-id>
BUNNY_STREAM_API_KEY=<server-secret>
BUNNY_STREAM_READ_ONLY_API_KEY=<server-secret>
BUNNY_STREAM_TOKEN_SECURITY_KEY=<server-secret>
BUNNY_STREAM_WEBHOOK_ENABLED=true
BUNNY_STREAM_ALLOWED_REFERRERS=<configured-in-dashboard>
BUNNY_STREAM_PULL_ZONE_HOSTNAME=<pull-zone-or-storage-hostname>
BUNNY_STREAM_DEFAULT_COLLECTION_ID=<optional-collection-guid>
BUNNY_STREAM_TUS_EXPIRE_SECONDS=86400
BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS=300
```

Optional public variables are not required for the recommended iframe path. If a value is needed in browser code, expose only non-secret library metadata. Do not expose `BUNNY_STREAM_API_KEY`, `BUNNY_STREAM_READ_ONLY_API_KEY`, or `BUNNY_STREAM_TOKEN_SECURITY_KEY`.

If multiple libraries are required later, use an account/library registry instead of adding ad hoc env vars:

```text
BUNNY_STREAM_LIBRARY_IDS=primary,archive
BUNNY_STREAM_LIBRARY_PRIMARY_ID=<numeric-library-id>
BUNNY_STREAM_LIBRARY_PRIMARY_API_KEY=<server-secret>
BUNNY_STREAM_LIBRARY_PRIMARY_READ_ONLY_API_KEY=<server-secret>
BUNNY_STREAM_LIBRARY_PRIMARY_TOKEN_SECURITY_KEY=<server-secret>
BUNNY_STREAM_DEFAULT_LIBRARY=primary
```

The first implementation should use one library unless Bunny account limits force multiple libraries.

## Data Model

Add provider-neutral and Bunny-specific fields to `Video`.

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

model Video {
  provider              VideoProvider      @default(AXINOM)
  bunnyLibraryId        String?
  bunnyVideoId          String?
  bunnyCollectionId     String?
  bunnyStatus           BunnyStreamStatus?
  bunnyEncodeProgress   Int?
  bunnyAvailableRes     String?
  bunnyThumbnailUrl     String?
  bunnySyncedAt         DateTime?
  bunnyError            String?

  @@index([provider])
  @@index([bunnyLibraryId])
  @@index([bunnyVideoId])
  @@index([bunnyStatus])
}
```

Existing Axinom fields remain during transition. New Bunny uploads set `provider = BUNNY_STREAM`. Existing rows default to `AXINOM`.

Avoid storing API keys, token security keys, read-only keys, Bunny internal secrets, raw webhook signatures, source signed URLs, or license material in the database.

## Upload Flow

Recommended first path: TUS direct browser upload.

Endpoint:

```text
POST /api/bunny-stream/upload-credentials
```

Request body:

```json
{
  "filename": "lesson-01.mp4",
  "contentType": "video/mp4",
  "courseId": "<courseId>",
  "title": "Lesson 01",
  "collectionId": "<optional-bunny-collection-id>"
}
```

Behavior:

1. Require authenticated admin session.
2. Validate file metadata, course ID, title, and optional collection ID.
3. Resolve Bunny library config.
4. Create a Bunny video object with `POST https://video.bunnycdn.com/library/{libraryId}/videos`.
5. Store a local `Video` row:
   - `provider = BUNNY_STREAM`
   - `bunnyLibraryId = configured library ID`
   - `bunnyVideoId = Bunny video GUID`
   - `bunnyCollectionId = selected collection`
   - `bunnyStatus = CREATED`
   - `published = false`
6. Generate TUS upload signature server-side:
   - `SHA256(library_id + api_key + expiration_time + video_id)`
7. Return only safe upload data:
   - `uploadEndpoint = https://video.bunnycdn.com/tusupload`
   - `libraryId`
   - `videoId`
   - `authorizationExpire`
   - `authorizationSignature`
   - `localVideoId`
8. Browser uploads through `tus-js-client` with headers:
   - `AuthorizationSignature`
   - `AuthorizationExpire`
   - `LibraryId`
   - `VideoId`
9. Mark local row `UPLOADING` when upload begins and rely on webhooks/manual sync for later status.

Fallback admin-only path:

- HTTP upload can create the video then PUT binary through server or browser. Use only for small files or trusted scripts because interrupted uploads cannot resume.

Migration/import path:

- Fetch Video can import from a remote URL when the source URL is static and accessible by Bunny. Add queue/backoff handling for HTTP 429. Do not depend on Fetch Video for expiring signed URLs unless Bunny confirms the exact source auth shape works.

## Webhook And Status Sync Flow

Endpoint:

```text
POST /api/webhook/bunny-stream
POST /api/video/bunny-stream/sync
```

Webhook behavior:

1. Read exact raw request body before JSON parsing.
2. Validate:
   - `X-BunnyStream-Signature-Version = v1`
   - `X-BunnyStream-Signature-Algorithm = hmac-sha256`
   - `X-BunnyStream-Signature` constant-time equals HMAC-SHA256(raw body, `BUNNY_STREAM_READ_ONLY_API_KEY`)
3. Parse payload with `VideoLibraryId`, `VideoGuid`, and `Status`.
4. Find matching local video by `provider`, `bunnyLibraryId`, and `bunnyVideoId`.
5. Map Bunny status:
   - `0` -> `QUEUED`
   - `1` -> `PROCESSING`
   - `2` -> `ENCODING`
   - `3` -> `READY`
   - `4` -> `PLAYABLE` because Bunny says the first resolution-finished event can signal first playable state before all renditions are complete
   - `5` -> `FAILED`
   - `6` -> `UPLOADING`
   - `7` -> `QUEUED`
   - `8` -> `FAILED`
   - `9` and `10` -> keep prior playable status and update metadata only
6. Fetch video details from Bunny when status changes to update progress, thumbnail, duration, available resolutions, and sanitized error state.
7. Treat `PLAYABLE` as smoke-testable but not fully processed. Admin may choose to publish only after `READY`, unless the user later approves publishing first-playable renditions.
8. Do not auto-publish by default. Admin must review and publish, unless user later approves auto-publish-on-ready.

Manual sync behavior:

1. Require admin session.
2. Load local video row.
3. Call Bunny get-video API using stored library ID and server API key.
4. Update local Bunny fields.
5. Return sanitized provider status to admin UI.

Cron behavior:

- Existing `cron/check-videos` can later scan non-ready Bunny rows and call the same sync helper. Keep Axinom sync until old rows are retired.

## Playback Flow

Keep current app authorization layer:

```text
/watch/[videoId]
  -> getServerSession()
  -> evaluateMediaEntitlement(checkViewLimit: true)
  -> load watermark identity
  -> provider switch
  -> BUNNY_STREAM: create signed embed URL
  -> render BunnyStreamPlayer iframe
```

For `AXINOM`, current Shaka/Axinom path remains during transition.

For `BUNNY_STREAM`:

1. Ensure `bunnyVideoId`, `bunnyLibraryId`, and `bunnyStatus` is `READY`, or `PLAYABLE` only if admin explicitly published the first-playable rendition.
2. Create short-lived embed token server-side:
   - `expires = now + BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS`
   - `token = SHA256_HEX(BUNNY_STREAM_TOKEN_SECURITY_KEY + bunnyVideoId + expires)`
3. Render iframe:

```text
https://player.mediadelivery.net/embed/{libraryId}/{bunnyVideoId}?token={token}&expires={expires}&autoplay=false&preload=true&responsive=true
```

4. Include `allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"` and `allowFullScreen`.
5. Keep app overlay watermark outside provider-specific code. For Bunny iframe fullscreen, prefer Bunny player/DRM plus app page watermark telemetry; test any overlay before relying on it.
6. Use `player.js` only if needed for event and current-time reads. Do not block first playback on deep event integration.

## Heartbeat And View Limits

The current Shaka path sends heartbeat from `<video>` events. Bunny iframe playback cannot use the same video element ref.

Add iframe-compatible heartbeat behavior:

1. On Bunny player mount after IPR acceptance, send first `/api/watch/heartbeat` with:
   - `videoId`
   - `position = 0` unless player.js current time is available
   - `isNewView = true`
   - `isFinished = false`
2. Every 60 seconds while iframe is mounted and page is visible, send heartbeat with best-known position.
3. If player.js `timeupdate` works reliably, update position from the iframe player.
4. On unmount, visibility hidden, or route change, send final heartbeat with `navigator.sendBeacon` or a best-effort fetch.
5. If heartbeat returns view-limit failure, hide or reload the Bunny iframe and show the existing user-safe denial state.

This preserves view counting even when precise iframe playback position is less available than the Shaka path.

## Player Component Design

Add a client-only `BunnyStreamPlayer` component.

Props:

```ts
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
```

Responsibilities:

- Render responsive iframe with stable aspect ratio.
- Send iframe-compatible heartbeat.
- Optionally load Bunny player.js for `ready`, `play`, `pause`, `ended`, `timeupdate`, and `error` events.
- Keep secrets out of client props. `signedEmbedUrl` contains short-lived token only.
- Show user-safe playback errors.
- Preserve watch page layout, chat log, sidebar, browser banner, and IPR acceptance flow.

## Admin UI

Update admin video surfaces:

- Show `Provider`.
- For Bunny rows, show:
  - Library ID.
  - Bunny Video ID.
  - Bunny status.
  - Encode progress.
  - Available resolutions.
  - Last sync time.
  - Sync button.
  - Publish/unpublish controls.
- Add Bunny upload path using TUS credentials route.
- Keep old Axinom metadata hidden or secondary for Bunny rows.
- Show clear operator warning when MediaCage Enterprise DRM, embed token auth, allowed domains, or webhook config is incomplete.

## Security Rules

- App entitlement remains the source of truth. Bunny embed token is issued only after `evaluateMediaEntitlement` passes.
- Short embed tokens are scoped to one Bunny video ID and expire quickly.
- Bunny Stream API key, Read-Only API key, token security key, and webhook signing material stay server-side.
- Use raw request body for webhook signature verification.
- Use constant-time signature comparison.
- Do not log raw provider keys, signed upload signatures, embed tokens, full user emails, source URLs with credentials, or webhook signatures.
- Do not expose originals or enable Early-Play for protected course videos.
- Do not accept raw Bunny video IDs from learner-facing token routes. Browser sends local `Video.id`; server loads provider IDs.
- Keep allowed domains in Bunny dashboard aligned with Vercel preview/staging/production domains.
- Treat client-side anti-recording as deterrence only. DRM, entitlement, watermark, revocation, and audit are enforceable layers.

## System Flow

### Setup Flow

```text
Bunny dashboard
  -> create Stream library
  -> configure encoding
  -> enable MediaCage Enterprise DRM
  -> enable embed token authentication
  -> configure allowed domains
  -> configure webhook URL
  -> copy library ID/API/read-only/token values
  -> store env in staging secret manager
  -> run app verifier
```

### Upload Flow

```text
Admin UI
  -> POST /api/bunny-stream/upload-credentials
  -> app creates Bunny video object
  -> app creates local Video row
  -> app returns TUS signed upload headers
  -> browser uploads file to Bunny TUS endpoint
  -> Bunny encodes and DRM-packages
  -> Bunny webhook updates local status
  -> admin reviews and publishes
```

### Playback Flow

```text
Learner
  -> /watch/[videoId]
  -> session + entitlement + view-limit check
  -> local Video provider switch
  -> app signs Bunny embed URL
  -> Bunny iframe player loads
  -> Bunny handles DRM license playback
  -> app heartbeat records watch progress
```

### Failure Flow

```text
Bunny API/upload/webhook/player error
  -> sanitize provider error
  -> store non-secret status on Video
  -> show user-safe playback/admin error
  -> keep old status if webhook payload cannot be trusted
```

## Verification And Tests

Add tests before implementation code changes:

- Bunny config rejects missing `BUNNY_STREAM_LIBRARY_ID`, API key, read-only key, and token security key in strict mode.
- TUS signature generation hashes exact `libraryId + apiKey + expiration + videoId`.
- Upload credentials route requires admin session.
- Upload credentials route creates a Bunny video object then local `Video` row.
- Upload credentials route never returns API keys.
- Webhook route verifies raw-body HMAC and rejects missing/invalid version, algorithm, and signature.
- Webhook route maps Bunny status codes to local `BunnyStreamStatus`.
- Playback route signs embed URL only after entitlement passes.
- Playback route rejects non-ready Bunny video rows.
- Provider switch renders `BunnyStreamPlayer` for Bunny rows and `DRMPlayerWrapper` for Axinom rows.
- Bunny iframe heartbeat sends an initial app heartbeat on mount.
- Denied users cannot obtain a signed Bunny embed URL.
- Docs/env matrix include Bunny values and mark secrets correctly.

Manual staging smoke:

1. Verify Bunny library security settings: Enterprise DRM enabled, embed token auth enabled, allowed domains configured, Early-Play disabled, originals not exposed.
2. Upload a small staging MP4 through admin TUS upload.
3. Confirm Bunny dashboard shows upload and encoding status.
4. Confirm webhook updates local row status.
5. Publish the video.
6. Entitled user opens `/watch/<videoId>` and playback starts.
7. Denied user cannot open the watch page and cannot get a signed embed URL.
8. Watch heartbeat creates or updates a watch record.
9. View limit blocks playback after threshold.
10. Rotate token security key in staging and confirm old signed URL expires/fails while new app-generated URL works.

## Documentation Deliverables

After this design is approved, write/update:

- `docs/bunny-stream-setup.md`
- `docs/bunny-stream-staging-checklist.md`
- `docs/env-matrix.md`
- `docs/staging-smoke-checklist.md`
- `docs/operations/subsystems.md`
- `docs/operations/vendor-upgrades.md`
- `docs/operations/health-checklist.md`
- `.env.example`
- `scripts/verify-bunny-stream-setup.ts`

The setup doc should contain placeholder values only and direct operators to the Bunny dashboard for real credentials.

## Implementation Plan Summary

Full implementation planning happens after user approval of this spec. Expected phases:

1. Add schema fields and generated Prisma client.
2. Add Bunny config/env validation and token/signature helpers.
3. Add Bunny Stream API client.
4. Add upload credentials route and admin TUS upload UI.
5. Add webhook and manual sync routes.
6. Add provider switch on watch page.
7. Add `BunnyStreamPlayer` and iframe heartbeat hook.
8. Update admin video table/status controls.
9. Update docs, env matrix, setup verifier, and staging checklist.
10. Run unit tests, lint, typecheck, build, and one real staging Bunny smoke test.

## Migration Plan

1. Configure Bunny staging library with Enterprise DRM, embed token auth, allowed domains, webhook URL, and encoding settings.
2. Add Bunny env vars to local/staging secret stores.
3. Deploy schema/code behind provider switch while keeping Axinom paths intact.
4. Upload one test video through Bunny.
5. Smoke entitled/denied/watch-heartbeat/view-limit behavior.
6. Upload course videos from source files.
7. Publish Bunny rows only after each video reaches ready status and passes playback smoke.
8. Leave old provider rows untouched until all live course links point to Bunny rows.
9. Freeze old Axinom upload/process routes after Bunny acceptance.
10. Later cleanup phase can remove Axinom-specific fields/routes once no live rows need them.

## Acceptance Criteria

- Admin can upload a video to Bunny Stream from this app without exposing Bunny API keys.
- Bunny encodes the uploaded video and webhook/manual sync updates local status.
- Entitled learner can play a ready Bunny video from `/watch/[videoId]`.
- Denied learner cannot receive a signed Bunny embed URL.
- Bunny player URL is signed server-side and expires.
- App heartbeat works for Bunny iframe playback.
- View limits still block playback.
- Existing Axinom rows are not broken by Bunny migration.
- Docs explain Bunny account setup, env vars, system flow, staging smoke, and migration order.
- Verification commands cover config, signatures, route behavior, provider switching, and docs.

## Open Risks

- MediaCage Enterprise DRM is a paid/eligible feature. Account access must be confirmed before implementation starts.
- Bunny iframe fullscreen may limit app overlay watermark behavior. Rely on Bunny DRM and app telemetry first; test overlay only as enhancement.
- Bunny player.js event coverage may not provide the same precision as direct Shaka `<video>` events. Heartbeat must degrade safely to page-level intervals.
- Existing source files may be needed for migration. Encrypted Axinom output is not assumed portable.
- Staging allowed-domain configuration must match Vercel preview/custom domains exactly, without scheme.
