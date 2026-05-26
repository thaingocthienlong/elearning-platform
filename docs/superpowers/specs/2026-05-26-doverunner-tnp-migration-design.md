# DoveRunner T&P Migration Design

Date: 2026-05-26

## Context

The Axinom account used by this project has expired and cannot be extended. Axinom is no longer a viable provider for upload, video processing, DRM license issuance, or playback validation. The platform must migrate the full media pipeline to DoveRunner Transcoding & Packaging (T&P) SaaS, DoveRunner Multi-DRM, and AWS S3 storage.

The existing app already has useful boundaries to preserve:

- Admin upload flow: `/api/upload/presigned`
- Processing trigger: `/api/video/process`
- Status sync: `/api/video/sync`
- Entitlement-gated token route: `/api/drm/token`
- Shaka playback hook: `src/hooks/player/useShakaPlayer.ts`
- Central media authorization: `src/lib/media-entitlement.ts`

The design keeps those app-level entry points while replacing provider-specific internals.

## Official DoveRunner Sources

- DoveRunner Multi-DRM Guide: https://docs.doverunner.com/content-security/multi-drm/
- DRM License Issuance: https://docs.doverunner.com/content-security/multi-drm/license/
- License Token Guide: https://docs.doverunner.com/content-security/multi-drm/license/license-token/
- HTML5 Player Integration Guide: https://docs.doverunner.com/content-security/multi-drm/clients/html5-player/
- Transcoding & Packaging Service Guide: https://docs.doverunner.com/content-security/tnp/tnp-service-guide/
- Transcoding & Packaging API Guide: https://docs.doverunner.com/content-security/tnp/tnp-api-guide/

## Goals

1. Replace Axinom upload, transcode, package, license, and playback dependencies with DoveRunner T&P and Multi-DRM.
2. Use AWS S3 as the source and output storage for DoveRunner T&P.
3. Preserve current admin and learner workflows where possible.
4. Keep entitlement checks server-side and reuse existing media authorization before issuing any DRM token.
5. Avoid copying, logging, or committing secrets, license tokens, content keys, storage keys, or FairPlay certificate material.
6. Make the migration provider-neutral enough that future provider changes do not require another Axinom-style rename across the app.

## Non-Goals

- Do not build a custom transcoder or packager.
- Do not proxy all license traffic in the first migration.
- Do not keep Axinom fallback paths as active staging dependencies.
- Do not implement forensic watermarking in this first migration.
- Do not claim production certification; the target is a staging-verified replacement pipeline.

## Chosen Approach

Use AWS S3 upload, DoveRunner T&P job polling, and DoveRunner direct token license issuance.

The app uploads source media to an AWS S3 input bucket with a presigned PUT URL. The backend creates a DoveRunner T&P job that reads from a registered DoveRunner input storage ID, writes packaged DASH/HLS output to a registered output storage ID, and enables DRM. The admin status action polls DoveRunner T&P job detail until completion. Playback continues to use Shaka, but the license token and request header change from Axinom's License Service Message model to DoveRunner's license token model.

SNS-based job notifications are deferred until the polling path works in staging.

## Architecture

### Provider Boundary

Add a provider-neutral media processing boundary:

- `src/lib/media-provider/types.ts`
- `src/lib/media-provider/doverunner.ts`
- `src/lib/media-provider/index.ts`

The provider interface should expose:

```ts
type CreateUploadUrlInput = {
  filename: string;
  contentType: string;
};

type CreateUploadUrlResult = {
  uploadUrl: string;
  sourceKey: string;
  sourceBucket: string;
};

type SubmitProcessingInput = {
  videoId: string;
  title: string;
  sourceKey: string;
};

type SubmitProcessingResult = {
  providerJobId: string;
  providerContentId: string;
  outputPath: string;
  status: string;
};

type SyncProcessingResult = {
  status: string;
  dashUrl?: string;
  hlsUrl?: string;
  ready: boolean;
};

type CreateLicenseTokenInput = {
  contentId: string;
  userId: string;
  drmType: 'widevine' | 'playready' | 'fairplay';
  ttlSeconds: number;
};
```

This separates app routes from DoveRunner-specific token, storage, and job request details.

### Upload Flow

1. Admin opens the existing upload dialog.
2. `/api/upload/presigned` validates admin session and course ID.
3. Backend creates an S3 presigned PUT URL for `s3://<input-bucket>/videos/<videoId>/source.<ext>`.
4. Backend creates or updates the `Video` row with:
   - `mediaProvider = "doverunner"`
   - `sourceStorageKey`
   - `sourceStorageBucket`
   - `providerStatus = "UPLOAD_URL_CREATED"`
   - `published = false`
5. Browser uploads directly to S3.
6. Admin UI calls `/api/video/process` as it does today.

### Processing Flow

1. `/api/video/process` validates admin session and loads the video.
2. Backend calls DoveRunner T&P token API using `DOVERUNNER_TNP_ACCOUNT_ID`, `DOVERUNNER_TNP_ACCESS_KEY`, and `DOVERUNNER_SITE_ID`.
3. Backend submits a T&P create-job request:
   - `content_id`: use the app `Video.id` unless DoveRunner support requires a separate stable alphanumeric ID.
   - `input.storage_id`: `DOVERUNNER_TNP_INPUT_STORAGE_ID`
   - `input.files[].file_path`: the S3 key under the registered input storage.
   - `output.storage_id`: `DOVERUNNER_TNP_OUTPUT_STORAGE_ID`
   - `output.path`: `videos/<videoId>/`
   - `output.packaging`: DASH and HLS enabled.
   - `output.drm.enabled`: true.
   - `output.drm.option.multi_key`: false for first staging migration unless multi-track policy is required.
4. Store:
   - `providerJobId`
   - `providerContentId`
   - `providerStatus = "SUBMITTED"`
   - `outputStoragePath`
   - `providerSyncedAt`

### Status Sync Flow

1. `/api/video/sync` validates admin session.
2. Backend calls DoveRunner T&P get-job-detail or search-job endpoint.
3. If job is queued or progressing, update `providerStatus`.
4. If job is complete:
   - Set `dashUrl = <DOVERUNNER_OUTPUT_BASE_URL>/videos/<videoId>/<dash-manifest-name>`.
   - Set `hlsUrl = <DOVERUNNER_OUTPUT_BASE_URL>/videos/<videoId>/<hls-master-name>`.
   - Set `providerStatus = "READY"`.
   - Set `published = true`.
   - Set `providerSyncedAt = now`.
5. If the exact manifest filenames differ by DoveRunner output format, make them configurable:
   - `DOVERUNNER_DASH_MANIFEST_NAME`
   - `DOVERUNNER_HLS_MANIFEST_NAME`

### Playback Flow

1. Watch page keeps using central media entitlement before rendering playback.
2. `/api/drm/token` keeps the entitlement check and view-limit behavior.
3. Token generation changes to DoveRunner license token:
   - `site_id`
   - `drm_type`
   - `user_id`
   - `cid` / content ID
   - timestamp
   - encrypted policy
   - SHA256 hash per DoveRunner token specification
4. The Shaka request filter sends this token only on license requests using `pallycon-customdata-v2`.
5. License server URL changes to DoveRunner's configured license URL, defaulting to `https://drm-license.doverunner.com/ri/licenseManager.do` unless the account provides a tenant-specific URL.
6. Keep the existing DRM capability selection for Widevine, PlayReady, and FairPlay, but rename Axinom helpers to provider-neutral helpers.

### FairPlay

FairPlay remains optional until the DoveRunner account has Apple FPS material registered and a verified certificate flow.

If FairPlay is not configured:

- Safari/iOS playback is marked blocked for DRM playback.
- Do not silently fall back to clear HLS unless the owner explicitly accepts that policy later.
- The old Axinom clear-HLS fallback should not be reused without a new security decision.

## Data Model

Add provider-neutral fields to `Video`:

```prisma
mediaProvider       String?   // "doverunner"
providerContentId   String?
providerJobId       String?
providerStatus      String?
sourceStorageBucket String?
sourceStorageKey    String?
outputStorageBucket String?
outputStoragePath   String?
providerSyncedAt    DateTime?
```

Keep legacy Axinom fields during migration:

- `axinomVideoId`
- `axinomIdClear`
- `axinomJobId`
- `axinomEncodingStatus`
- `axinomOutputLocation`
- `axinomSyncedAt`

New code should not write Axinom fields. Later cleanup can remove them after data migration and acceptance.

`drmKeyId` is not required for DoveRunner token playback if `content_id` is the license identity, but keep it for existing code compatibility and possible future diagnostics. It must not store content keys.

## Environment Variables

Add these required staging variables:

```text
DOVERUNNER_SITE_ID=<site-id>
DOVERUNNER_ACCESS_KEY=<site-access-key>
DOVERUNNER_LICENSE_URL=https://drm-license.doverunner.com/ri/licenseManager.do
DOVERUNNER_TNP_ACCOUNT_ID=<account-email-or-id>
DOVERUNNER_TNP_ACCESS_KEY=<tnp-access-key>
DOVERUNNER_TNP_INPUT_STORAGE_ID=<input-storage-id>
DOVERUNNER_TNP_OUTPUT_STORAGE_ID=<output-storage-id>
DOVERUNNER_TNP_API_BASE_URL=https://tnp.doverunner.com
DOVERUNNER_OUTPUT_BASE_URL=https://<cdn-or-s3-output-host>
DOVERUNNER_DASH_MANIFEST_NAME=manifest.mpd
DOVERUNNER_HLS_MANIFEST_NAME=master.m3u8
AWS_REGION=<aws-region>
AWS_S3_INPUT_BUCKET=<input-bucket>
AWS_S3_OUTPUT_BUCKET=<output-bucket>
AWS_ACCESS_KEY_ID=<upload-signing-access-key>
AWS_SECRET_ACCESS_KEY=<upload-signing-secret>
```

Optional:

```text
DOVERUNNER_FAIRPLAY_CERT_URL=<server-side-certificate-url>
DOVERUNNER_LICENSE_TOKEN_TTL_SECONDS=300
```

Deprecate Axinom env vars in docs and validation, but do not delete compatibility references until code no longer imports Axinom modules.

## Security

- Browser receives only S3 presigned upload URLs, public playback URLs, and short-lived license tokens.
- Server secrets stay server-side: DoveRunner access keys, AWS secret key, and any FairPlay certificate URL.
- License token route must always call `evaluateMediaEntitlement` before token generation.
- Shaka must attach `pallycon-customdata-v2` only to DRM license requests, never manifest or segment requests.
- Logs may include video ID, provider status, provider job ID, and HTTP status. Logs must not include access keys, license tokens, token policy plaintext, hash inputs, S3 credentials, or certificate bytes.
- S3 input bucket should deny public reads. S3 output bucket should be fronted by a CDN or configured for controlled public playback according to staging needs.

## Error Handling

- Upload URL creation failure returns a generic 500 to browser and logs a sanitized provider error.
- DoveRunner token API failure marks processing as `PROVIDER_AUTH_FAILED`.
- Create-job failure marks processing as `SUBMISSION_FAILED`.
- Sync failure keeps prior status and reports sanitized DoveRunner error code/message.
- Playback token failure returns generic media denial or server error according to existing entitlement mapping.
- Player license errors should surface a user-safe playback error while logging non-secret DoveRunner error code.

## Testing

Unit tests:

- DoveRunner license token generation produces required token fields and hash without leaking inputs.
- `/api/drm/token` denies unentitled users and issues token for entitled users.
- Shaka request filter attaches `pallycon-customdata-v2` only for license requests.
- `/api/video/process` maps missing config and DoveRunner failures to safe statuses.
- `/api/video/sync` updates ready and non-ready jobs correctly.

Integration or mocked route tests:

- Admin upload route creates S3 presigned URL and pending video row.
- Admin processing route submits T&P job with expected content ID and storage IDs.
- Admin sync route publishes video only when T&P job is complete.

Manual staging smoke:

1. Configure DoveRunner T&P input/output storage IDs for AWS S3.
2. Upload a small MP4 through admin UI.
3. Confirm source object appears in the S3 input bucket.
4. Trigger processing and confirm a DoveRunner T&P job is created.
5. Sync until job complete.
6. Confirm DASH/HLS output exists in the S3 output bucket.
7. Open watch page as entitled learner.
8. Confirm token route returns a short-lived DoveRunner token.
9. Confirm Shaka sends `pallycon-customdata-v2` only on license requests.
10. Confirm playback advances in a supported Widevine or PlayReady browser.
11. Confirm unentitled user cannot mint a token or play.

## Documentation Updates

Replace or supersede:

- `docs/axinom-setup.md`
- `docs/axinom-staging-checklist.md`
- Axinom sections in `docs/env-matrix.md`
- Axinom sections in `docs/operations/subsystems.md`
- Axinom references in `docs/operations/vendor-upgrades.md`
- staging smoke rows that name Axinom webhook or Axinom license service

Add:

- `docs/doverunner-setup.md`
- `docs/doverunner-staging-checklist.md`
- DoveRunner provider section in operations docs
- AWS S3 input/output CORS and bucket-policy notes

## Open Questions

1. Exact T&P output manifest filenames must be verified against a real DoveRunner job or account sample.
2. Whether DoveRunner T&P storage registration accepts only AWS S3 or also S3-compatible providers is no longer blocking because AWS S3 is selected.
3. FairPlay acceptance requires DoveRunner FPS certificate setup; otherwise Safari DRM playback stays blocked.
4. SNS job notifications are deferred, but the design should leave room for `/api/webhook/doverunner` or AWS SNS/Lambda integration later.

## Acceptance Criteria

- Axinom is no longer required for upload, processing, DRM token generation, or playback.
- Admin can upload an MP4 to AWS S3 through the app.
- Admin can submit and sync a DoveRunner T&P job.
- Completed jobs populate playable DASH/HLS URLs.
- Entitled users can play protected content through Shaka and DoveRunner license service.
- Unentitled users cannot get a DoveRunner license token.
- Docs and env validation name DoveRunner and AWS S3 as the active media pipeline.
- No secrets, license tokens, content keys, or credential values are committed or logged.
