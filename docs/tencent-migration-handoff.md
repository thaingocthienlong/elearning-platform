# Tencent Migration Handoff

Date: 2026-07-03

## Completed

- Tencent-only media decision documented for future incoming courses.
- Tencent env, signing, VOD service, webhook, upload signature, processing, sync, playback session, and Shaka paths implemented.
- Admin upload now uses Tencent Web Upload SDK (`vod-js-sdk-v6`) with server-issued upload signature, stores returned Tencent `FileId`, then can submit processing.
- Previous DRM provider code, legacy upload/storage proxy, KMS helper, old provider setup docs, old verifier scripts, and active old-provider package dependencies removed.
- Old media rows exported to `reports/tencent-cutover-old-media-export.json` before any destructive cleanup.
- Destructive old-media cleanup script remains guarded and was not run.

## Verification

- `npm run prisma:generate` passed.
- `npm run lint` passed with inherited warnings and 0 errors.
- `npm run typecheck` passed.
- `npm run test -- --runInBand` passed: 30 suites, 100 tests.
- `npm run build` passed.
- `npm run verify:tencent` passed locally with expected missing-live-credentials warning.
- `npm run secrets:scan` exited 0 and reported gitleaks is not installed, so the gitleaks scan was skipped.
- Active old provider/storage scans returned no matches outside historical plan/log/verification exclusions.

## Required Staging Checks

1. Configure Tencent VOD app, Commercial DRM, procedure template, playback domain, webhook sign key, and license URLs.
2. Deploy staging with Tencent env vars.
3. Run `npm run verify:tencent -- --strict`.
4. Upload one short MP4 through admin.
5. Confirm Tencent upload completion returns a `FileId` and `/api/upload/complete` stores it.
6. Confirm Tencent processing/webhook moves video to ready state and sync stores playback URLs.
7. Confirm authorized Chrome/Edge playback through Shaka/Widevine.
8. Confirm unauthorized user cannot receive Tencent playback session data.
9. Confirm Safari/FairPlay only after Tencent FairPlay cert/license URLs are configured.
10. Confirm admin deletion marks app state and requests Tencent delete only after explicit admin action.

## Rollback

- Before old-media cleanup: revert the Tencent migration commits with Git.
- After old-media cleanup, if it is ever run: restore old rows from `reports/tencent-cutover-old-media-export.json`.
- External provider asset deletion was not performed in this migration.

## Deferred

- Live Tencent API checks, browser upload, webhook delivery, and DRM playback require Tencent credentials, console setup, and staging test media.
- Gitleaks-based secret scanning requires `gitleaks` to be installed locally or in CI.
