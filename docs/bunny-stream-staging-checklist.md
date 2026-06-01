# Bunny Stream Staging Checklist

Use this checklist when validating Bunny Stream in staging. Mark a row as `blocked: missing credentials/service access` if the Bunny library, MediaCage Enterprise DRM access, or other required account-level controls are not available yet.

## Provider Setup

- [ ] Bunny Stream library exists for staging.
- [ ] MediaCage Enterprise DRM account access is verified or the limitation is recorded.
- [ ] Embed view token authentication is enabled.
- [ ] Early-Play is disabled for protected videos.
- [ ] allowed domains are configured without `https://`.
- [ ] Webhook URL is `<STAGING_ORIGIN>/api/webhook/bunny-stream`.

## App Setup

- [ ] `npm run verify:bunny-stream -- --strict` passes in staging.
- [ ] `npm run verify:services:strict` includes Bunny Stream.
- [ ] The upload route accepts `uploadRequestId`, `fileSize`, and `fileLastModified`.
- [ ] Retry cleanup or idempotency reservation prevents duplicate provider initialization.
- [ ] No real Bunny key, signed URL, or webhook signature appears in logs, screenshots, docs, or commits.

## Smoke

- [ ] Admin creates Bunny upload credentials from `/admin/videos`.
- [ ] Browser uploads through TUS with `tus-js-client`.
- [ ] Bunny dashboard shows processing and the local video status updates through `/api/webhook/bunny-stream` or the sync route.
- [ ] Entitled learner can start playback through `/api/video/bunny-stream/playback`.
- [ ] Bunny iframe player.js events drive `/api/watch/heartbeat`.
- [ ] Denied learner cannot obtain playback.
- [ ] View limit blocks later playback when configured.
