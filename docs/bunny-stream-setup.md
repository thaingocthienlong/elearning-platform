# Bunny Stream Setup

This guide maps Bunny Stream to this repository. Real credentials belong only in local `.env.local` or encrypted staging and production environment settings.

## Official Bunny Docs

- Stream quickstart: https://docs.bunny.net/docs/stream-quickstart-guide
- Authentication / API key lookup: https://docs.bunny.net/stream/authentication
- TUS resumable uploads: https://docs.bunny.net/stream/tus-resumable-uploads
- Stream security: https://docs.bunny.net/stream/security
- Stream security options: https://docs.bunny.net/docs/stream-understanding-bunny-stream-security-options
- MediaCage DRM: https://docs.bunny.net/stream/drm
- Embed view token authentication: https://docs.bunny.net/docs/stream-embed-token-authentication
- Playback control API and player.js events: https://docs.bunny.net/stream/playback-api
- Webhooks: https://docs.bunny.net/stream/webhooks

## How This Repo Uses Bunny Stream

- Admins create upload credentials from `/api/bunny-stream/upload-credentials`.
- The upload route creates or reserves a Bunny video object, then returns TUS credentials to the browser.
- The request body includes `uploadRequestId`, `fileSize`, and `fileLastModified` so retries can be matched to the same upload intent.
- The route also performs best-effort cleanup for stale provider initializations, so retries are idempotent instead of creating duplicate uploads.
- Bunny processing updates local status through `/api/webhook/bunny-stream`.
- Learner playback does not get a signed URL from page props. The watch UI requests it just in time from `/api/video/bunny-stream/playback` after entitlement passes.
- The Bunny iframe uses player.js events, and the app records watch progress through `/api/watch/heartbeat`.

## Bunny Dashboard Setup

1. Create a Bunny Stream video library for the environment.
2. Confirm MediaCage Enterprise DRM account access before treating the library as production-ready.
3. Enable embed view token authentication for the library.
4. Keep Early-Play disabled for protected course videos.
5. Add allowed domains without a scheme, such as `localhost`, a staging domain, or the production hostname.
6. Configure the webhook URL as `<APP_ORIGIN>/api/webhook/bunny-stream`.
7. Review the library player settings so the embedded player matches the current repo flow.

MediaCage Enterprise DRM is account-gated. If the Bunny account does not have that feature enabled yet, document the limitation and keep the staging checklist row blocked instead of pretending the control is active.
The security and options docs above explain the dashboard controls that govern allowed domains, token auth, and DRM-related protections; this setup guide does not prove those account settings are enabled.

## Repository Environment

```text
BUNNY_STREAM_LIBRARY_ID=<numeric-library-id>
BUNNY_STREAM_API_KEY=<server-secret>
BUNNY_STREAM_READ_ONLY_API_KEY=<server-secret>
BUNNY_STREAM_TOKEN_SECURITY_KEY=<server-secret>
BUNNY_STREAM_API_TIMEOUT_MS=10000
BUNNY_STREAM_TUS_EXPIRE_SECONDS=86400
BUNNY_STREAM_EMBED_TOKEN_TTL_SECONDS=300
BUNNY_STREAM_PULL_ZONE_HOSTNAME=<optional-pull-zone-hostname>
BUNNY_STREAM_DEFAULT_COLLECTION_ID=<optional-collection-id>
```

## Operator Workflow

1. Open `/admin/videos` and start a Bunny upload.
2. The browser sends the upload intent with `uploadRequestId`, `fileSize`, `fileLastModified`, `filename`, `contentType`, `courseId`, `title`, and optional `collectionId`.
3. The server creates the Bunny video, reserves the upload intent, and returns TUS credentials.
4. The browser uploads through `tus-js-client` using the returned Bunny credentials.
5. Bunny sends webhook callbacks to `/api/webhook/bunny-stream`, or an operator can run the sync route if a callback was missed.
6. The operator reviews the Bunny status and publishes the local `Video` row when the item is `READY` or explicitly accepted as `PLAYABLE`.
7. The learner opens `/watch/[videoId]`, the app checks entitlement, mints a short-lived playback URL through `/api/video/bunny-stream/playback`, and loads the Bunny iframe.
8. `useIframeHeartbeat` listens to player.js `play`, `timeupdate`, `pause`, `ended`, `error`, and page visibility changes before posting to `/api/watch/heartbeat`.

## Rollback And Known Limits

- Rollback for a staging mistake means stopping new Bunny uploads, unpublishing affected Bunny rows, and keeping legacy Axinom rows available for the videos that already depend on them.
- `uploadRequestId` is part of the upload contract. Reusing the same request ID with different file metadata should be treated as a conflicting retry, not a new upload.
- MediaCage Enterprise DRM, embed view token auth, and allowed domains are dashboard settings, not app-side substitutes for server entitlement.
- Early-Play should stay off for protected course videos.
- The app expects Bunny webhook and player.js behavior to remain compatible with the current route and heartbeat flow.
