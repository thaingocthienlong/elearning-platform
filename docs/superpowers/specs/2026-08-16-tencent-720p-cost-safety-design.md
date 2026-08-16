# Tencent 720p Cost-Safe Processing Design

Date: 2026-08-16
Status: Ready for user review
Requirements: TENCENT-COST-01 through TENCENT-COST-06

## Context

The current Tencent upload path can submit the same named task flow twice:

1. The Web SDK upload signature contains `procedure=...`, so Tencent starts the
   task flow automatically after upload.
2. The admin UI then calls `/api/video/process`, which calls
   `ProcessMediaByProcedure` again.

The current `WV-SAES-V1` procedure also uses preset adaptive templates `16`
and `12`. Each preset contains six video resolutions: 240p, 480p, 720p, 1080p,
1440p, and 2160p. The procedure additionally contains image-sprite and cover
snapshot tasks. Tencent bills adaptive outputs by output duration and
specification, so duplicate submissions and unused resolutions multiply cost.

The live verifier currently checks environment shape only. Its `--live` mode
does not read the remote procedure or template topology, so it can report
success while the paid task flow is unsafe.

## User-Approved Outcome

Preserve both playback paths while limiting each path to one 720p-capped video
rendition:

- One HLS/fMP4 `Widevine+FairPlay` MultiDRM rendition, used by the app's
  Widevine path for Chrome, Edge, Firefox, and Android.
- One HLS/TS `SimpleAES` rendition, used by the Apple fallback path for Safari.
- No 240p, 480p, 1080p, 1440p, 2160p, separate audio-only template, sprite,
  cover, screenshot, watermark, review, recognition, analysis, or other task.

This means **two encrypted video outputs total**, with exactly one video
rendition in each DRM package. The uploaded source remains in Tencent storage
but is not an encoded rendition. Audio remains in the 720p output because the
course video must have sound. MultiDRM fMP4 may expose a required audio
adaptation track in its manifest; that is not a second video rendition.
"No watermark" here means no Tencent encoding-watermark task. The existing
client-visible user watermark remains unchanged.

`DisableHigherVideoResolution=1` and `DisableHigherVideoBitrate=1` prevent
upscaling. Tencent may filter out the only target stream when the source's
short edge is below 720 pixels or its video bitrate is below 1024 Kbps; those
flags do not guarantee a smaller fallback output. The quote therefore fails
closed unless authoritative Tencent metadata proves both minimums. An
ineligible source produces no processing call and must be replaced or handled
under a separately approved profile.

## Decision

Use an **app-owned explicit processing trigger**. Upload only stores the source
file. Paid processing starts later, after Tencent reports the real duration,
the app validates the live procedure, the app displays a numeric estimate, and
an admin explicitly approves that estimate.

Do not use `procedure` in either the Web SDK upload signature or any retained
upload helper. Do not automatically call `/api/video/process` after upload.

This is preferred over upload-owned automatic processing because an automatic
procedure starts before the app can verify authoritative duration, show cost,
or use Tencent's provider-side deduplication ID.

## Remote Tencent Profile

### MultiDRM template

Create one custom adaptive template with this contract:

```json
{
  "Name": "WVFP-HLS-720-V1",
  "Comment": "One 720p video rendition; MultiDRM; no upscaling",
  "Format": "HLS",
  "DrmType": "Widevine+FairPlay",
  "DrmKeyProvider": "VOD",
  "DrmEncryptType": "cbcs",
  "SegmentType": "mp4-mp4-segment",
  "DisableHigherVideoBitrate": 1,
  "DisableHigherVideoResolution": 1,
  "StreamInfos": [
    {
      "Video": {
        "Codec": "libx264",
        "Bitrate": 1024,
        "Fps": 25,
        "ResolutionAdaptive": "open",
        "Width": 0,
        "Height": 720,
        "FillType": "black"
      },
      "Audio": {
        "Codec": "libfdk_aac",
        "Bitrate": 48,
        "SampleRate": 44100,
        "AudioChannel": 2
      },
      "RemoveAudio": 0,
      "RemoveVideo": 0
    }
  ]
}
```

For the create request, `SegmentType="mp4-mp4-segment"` explicitly selects HLS
fragmented-MP4 segmentation. Tencent may normalize or describe an existing
template as `fmp4`; the verifier accepts that equivalent read-back form but the
configuration writer sends `mp4-mp4-segment`.

Keep `Widevine+FairPlay` rather than changing to Widevine-only in this repair.
The current playback token contract uses `multiDrm=1`; Tencent documents that
flag for `Widevine+FairPlay`. Apple playback still uses SimpleAES because no
FairPlay certificate is configured.

### SimpleAES template

Create one custom adaptive template with this contract:

```json
{
  "Name": "SAES-HLS-720-V1",
  "Comment": "One 720p video rendition; SimpleAES; no upscaling",
  "Format": "HLS",
  "DrmType": "SimpleAES",
  "SegmentType": "ts",
  "DisableHigherVideoBitrate": 1,
  "DisableHigherVideoResolution": 1,
  "StreamInfos": [
    {
      "Video": {
        "Codec": "libx264",
        "Bitrate": 1024,
        "Fps": 25,
        "ResolutionAdaptive": "open",
        "Width": 0,
        "Height": 720,
        "FillType": "black"
      },
      "Audio": {
        "Codec": "libfdk_aac",
        "Bitrate": 48,
        "SampleRate": 44100,
        "AudioChannel": 2
      },
      "RemoveAudio": 0,
      "RemoveVideo": 0
    }
  ]
}
```

### Procedure reset

After Tencent returns the two custom definition IDs, reset `WV-SAES-V1` to a
replacement payload containing only those definitions:

```typescript
const resetProcedurePayload = {
  "Name": "WV-SAES-V1",
  "Comment": "Exactly one 720p video rendition per DRM path; no screenshots",
  "MediaProcessTask": {
    "TranscodeTaskSet": [],
    "AnimatedGraphicTaskSet": [],
    "SnapshotByTimeOffsetTaskSet": [],
    "SampleSnapshotTaskSet": [],
    "ImageSpriteTaskSet": [],
    "CoverBySnapshotTaskSet": [],
    "AdaptiveDynamicStreamingTaskSet": [
      { "Definition": wvfp720Definition },
      { "Definition": saes720Definition }
    ]
  },
  "AiRecognitionTaskSet": [],
  "ImportMediaKnowledgeTaskSet": []
};
```

Both variables above hold the numeric definition IDs returned by Tencent; the
actual API request sends integers, not strings.

Immediately read the procedure and both templates back. Configuration is not
accepted unless every non-adaptive task is empty or absent and both adaptive
templates exactly match the approved shape. Configuration commands must never
call `ProcessMedia`, `ProcessMediaByProcedure`, or reprocess a media file.

## Upload And Approval Flow

1. Admin chooses a source video and uploads it through the existing Tencent Web
   SDK path.
2. The upload signature contains no `procedure`, `taskNotifyMode`, or processing
   `sessionContext`. It retains one-time validity and upload `sourceContext`.
3. `/api/upload/complete` binds the Tencent FileId once. Repeating the same
   `{videoId, fileId}` is an idempotent success. Trying to bind a different
   FileId to an already-bound video returns `409`.
4. The video enters `UPLOAD_CONFIRMED` or `AWAITING_PROCESSING_APPROVAL` and is
   not published.
5. A read-only quote endpoint calls `DescribeMediaInfos`, requires
   `MetaData.Duration`, source dimensions, and authoritative video-stream
   bitrate, reads the live procedure and templates, and returns:
   - source duration in seconds and `HH:MM:SS`;
   - source short edge and primary-video-stream bitrate, with confirmed
     `min(width, height) >= 720` and `bitrate >= 1,024,000 bps` eligibility;
   - two approved 720p-capped outputs;
   - current price input and output count;
   - conservative maximum processing estimate;
   - exclusions: storage, delivery traffic, and DRM playback-license requests;
   - short-lived signed quote and remote-profile fingerprint.
6. The admin must check an explicit confirmation and click a button containing
   the displayed USD estimate. Upload completion alone never starts processing.
7. The submit route verifies the signed quote, refetches duration and remote
   topology, recomputes cost, and rejects any drift. A changed quote requires a
   new visible approval.
8. Only after all checks pass does the route create a durable processing-attempt
   claim atomically and call `ProcessMediaByProcedure` once.

Both quote and submit routes require an authenticated `ADMIN` session. An
unauthenticated request returns `401`; an authenticated non-admin request
returns `403`. Either rejection makes zero Tencent API calls.

The quote is signed server-side with a domain-separated key derived from the
existing server auth secret. It expires quickly and contains no provider secret,
media URL, or DRM token.

## Cost Policy

Use two strict configuration values:

- `TENCENT_VOD_H264_720_USD_PER_MINUTE=0.0061`
- `TENCENT_VOD_MAX_PROCESSING_USD=5.00`

Strict production verification fails if either is missing, invalid, or not
positive. The unit price is an operator-maintained input linked to Tencent's
current pricing page; it is not silently fetched or assumed forever.

Use a conservative quote:

```text
billableMinutes = ceil(durationSeconds / 60)
estimatedProcessingUsd = billableMinutes * 2 outputs * unitPrice
```

For the observed 16,863.765-second source, this is approximately:

```text
282 * 2 * 0.0061 USD = 3.4404 USD
```

Tencent's unrounded duration example is approximately 3.43 USD. The UI uses
the conservative rounded-up value. If the estimate exceeds the configured hard
cap, the server returns a blocking response and makes no processing call.
Raising the cap requires an explicit environment change and redeploy.

## Duplicate And Failure Safety

Use both local and Tencent-side idempotency:

- Persist a processing-attempt ledger with a unique key derived from
  `{subAppId, fileId, profileVersion}`. The ledger is permanent audit data; a
  finished, failed, aborted, unknown, or old attempt still blocks another
  provider call for that same key.
- Atomic DB compare-and-set creates that ledger row only for a matching FileId
  in an approvable status. A concurrent loser makes no Tencent call.
- Derive a stable Tencent `SessionId` of at most 50 characters from
  `{subAppId, fileId, profileVersion}`.
- Send the local video ID and profile version through `SessionContext`.
- A provider submission is attempted at most once for a durable attempt row.
  Application retries never call Tencent again, even with the same SessionId.
- Before first submission, reject any prior local attempt, required output pair,
  or Tencent task for the FileId whose returned `SessionId` matches locally.
- Treat Tencent duplicate-session responses as idempotent conflicts, then
  reconcile read-only.

Tencent's `SessionId` rejection lasts only seven days. It is a second layer,
not the permanent guarantee; the unique local attempt key closes the gap after
that provider window expires.

If Tencent may have accepted a request but the response is lost, record
`SUBMISSION_UNKNOWN`. Do not automatically reopen the row or submit again.
Reconcile through webhook, paginated `DescribeTasks` filtered by FileId, local
matching against each returned `SessionId`, `DescribeTaskDetail` for the matched
TaskId, and `DescribeMediaInfos`. Never resend an ambiguous attempt, including
after Tencent's seven-day window. A genuinely new try requires a new approved
profile version, a fresh numeric quote, and an explicit operator recovery action.

## Readiness Contract

A video is `READY` and publishable only when the expected custom definition IDs
produce both:

- a protected MultiDRM HLS URL; and
- a SimpleAES HLS fallback URL.

For each returned adaptive output, `SubStreamSet` must contain exactly one
`Type="video"` stream whose short edge is at most 720 pixels. Required audio
entries are allowed and do not count as extra video renditions. `SubStreamSet`
does not expose the codec; H.264 proof comes from re-reading the expected custom
template and matching its approved fingerprint. Any extra video stream, higher
resolution, missing substream metadata, definition mismatch, or template
fingerprint drift keeps the video unpublishable.

The original media URL, one encrypted output, a stale preset output, or a plain
HLS URL is insufficient. Webhook, sync, status, and cron code must use this same
dual-output invariant and must never trigger processing themselves.

Persist the procedure name and both output template IDs for audit. The schema
must use the existing adaptive-template field for the MultiDRM definition and
add a dedicated Apple-fallback definition-ID field plus an approved-profile
fingerprint; storing only one definition is invalid. The permanent attempt
ledger stores its unique attempt key, FileId, profile version/fingerprint,
provider SessionId, provider TaskId when known, state, and timestamps.

## Live Verification And Configuration Tooling

`npm run verify:tencent -- --strict --live` becomes genuinely read-only and
must call:

- `DescribeProcedureTemplates`;
- `DescribeAdaptiveDynamicStreamingTemplates`.

It fails closed unless the remote shape exactly matches this specification. It
prints safe names, definition IDs, DRM types, stream counts, resolution caps,
and task counts only. It never prints credentials, tokens, media URLs, manifest
URLs, or license material.

The configuration command is dry-run by default. Apply mode requires an exact
confirmation argument, snapshots the old non-secret topology for rollback,
creates/reuses the two custom templates idempotently, resets `WV-SAES-V1`, and
performs immediate read-back verification. It never accepts a FileId and never
contains a media-processing API action.

## UI States

Admin video status distinguishes:

- upload in progress;
- uploaded, awaiting processing approval;
- quote unavailable or remote profile unsafe;
- quote ready with duration, outputs, and maximum USD estimate;
- submitting;
- submission status unknown, reconciliation required;
- processing;
- Widevine ready but Apple fallback missing;
- fully ready with both outputs.

The upload dialog remains recoverable if closed. An uploaded but unprocessed row
shows a separate `Review cost and process` action. There is no hidden automatic
submission, timer, effect, webhook, sync, status, or cron path.

## Tencent Documentation Conflict

One older Tencent best-practice page says HLS private encryption should or can
play only below 720p, and its preset example keeps the fallback at 480p or
lower. Newer template APIs accept general dimensions, the live Tencent preset
contains 720p, and a prior live Safari test successfully used SimpleAES.

Treat 720p SimpleAES as user-approved but require a short, separately approved
Safari canary before claiming the new custom template is production-validated.
Do not reprocess an existing long video for this pilot.

## Deployment Order

1. Freeze new admin media processing.
2. Ship code that removes upload-owned processing and fails closed on unsafe
   remote topology.
3. Run the Tencent configuration tool in dry-run mode and review its diff.
4. With explicit apply confirmation, create the two custom templates and reset
   `WV-SAES-V1`. This changes configuration only and processes no media.
5. Run strict live read-only verification.
6. Deploy required price/cap environment values and confirm the app uses
   `WV-SAES-V1`.
7. Unfreeze upload only after route and verifier tests pass.
8. Request separate approval for one short canary and its numeric estimate.
9. Verify Chrome/Android Widevine and Safari SimpleAES output topology and
   playback before declaring the profile validated.

## Planning Placement

Record this as inserted **Phase 10.1: Tencent 720p Cost-Safe Processing**. Do not
rewrite the completed Phase 9 migration history.

- `TENCENT-COST-01`: exact approved two-template, one-720p-per-path topology.
- `TENCENT-COST-02`: one app-owned paid-processing trigger.
- `TENCENT-COST-03`: authoritative quote, explicit numeric approval, hard cap.
- `TENCENT-COST-04`: permanent attempt ledger, local CAS, stable SessionId,
  uncertain-state recovery.
- `TENCENT-COST-05`: real read-only live verifier and guarded config tooling.
- `TENCENT-COST-06`: no automatic reprocessing; tests, docs, audit, rollback.

Planning, source, remote configuration, and verification commits remain
separate. Existing user changes are not included.

## Testing

Required automated tests include:

- upload signature excludes `procedure` and does not start processing;
- upload completion is same-FileId idempotent and rejects FileId replacement;
- quote reads duration/topology but never calls a processing action;
- unauthenticated and non-admin quote/submit requests return `401`/`403` and
  make zero Tencent calls;
- missing, expired, changed, over-cap, or unconfirmed quote makes zero provider
  processing calls;
- source below 720 pixels on the short edge, source video bitrate below 1024
  Kbps, or missing eligibility metadata makes zero provider processing calls;
- exact cost calculation and duration formatting;
- wrong DRM type, codec, preset type, extra stream, non-720 stream, audio-only
  template, snapshot, cover, watermark, review, or AI task fails template or
  profile validation;
- two concurrent submits make exactly one provider processing call;
- application retries and an attempt older than seven days make zero additional
  provider calls; the original attempt keeps the same SessionId permanently;
- ambiguous provider failure remains closed and reconciles read-only;
- task reconciliation paginates by FileId, matches returned SessionId locally,
  and requests detail only for the matching TaskId;
- READY/published requires both expected definition IDs and URLs;
- READY rejects an output with extra video substreams, a video short edge above
  720 pixels, missing `SubStreamSet` evidence, or template-fingerprint drift;
- both definition IDs and the approved profile fingerprint are persisted;
- webhook, sync, status, cron, and live verifier never submit processing;
- admin upload completion does not automatically call `/api/video/process`;
- one explicit approved click submits once;
- no existing FileId is reprocessed by configuration or deployment tests.

Verification gates:

```text
npm run prisma:generate
npm run lint
npm run typecheck
npm test -- --runInBand
npm run build
npm run verify:tencent -- --strict --live
npm run secrets:scan
```

The live verifier is safe because it uses only Describe APIs. A media canary is
not part of this command and requires separate user approval.

## Acceptance Criteria

- A completed upload has zero Tencent processing tasks until an admin approves
  a current numeric quote.
- One approved FileId/profile produces at most one Tencent procedure task.
- `WV-SAES-V1` contains exactly two custom adaptive tasks and no other task.
- Each custom template has exactly one H.264 video stream capped at 720p.
- A source that cannot safely produce that target is blocked before paid work.
- The permanent local attempt key prevents a repeat after Tencent's seven-day
  deduplication window.
- No existing media is processed or reprocessed during code deployment or
  Tencent profile configuration.
- The app never publishes an original-only or one-path-only video.
- Strict live verification detects any remote topology drift before paid work.
- A separately approved short canary proves Chrome/Android Widevine and Safari
  SimpleAES before production validation is claimed.
- Refund/support text is drafted separately and is never sent without the
  user's final approval.

## Alternatives Rejected

### Keep automatic upload procedure and remove the explicit API call

Smallest code change, but Tencent starts paid work before authoritative duration
and cost approval. Upload signatures also lack provider `SessionId` deduplication.

### Use one total SimpleAES output

Cheapest and broadly compatible, but drops the existing commercial Widevine
protection requirement on Chrome/Android.

### Use one total Widevine output

Preserves commercial DRM but drops Safari playback without FairPlay.

### Replace the named procedure with direct fixed-template `ProcessMedia`

Could make topology more immutable, but is a larger migration. Exact procedure
validation plus explicit server trigger provides the required safety now.

## References

- Tencent client upload and automatic `procedure` behavior:
  https://www.tencentcloud.com/document/product/266/33921
- Tencent `ProcessMediaByProcedure` and `SessionId`:
  https://www.tencentcloud.com/document/product/266/34782
- Tencent adaptive template creation:
  https://cloud.tencent.com/document/api/266/43068
- Tencent procedure reset:
  https://cloud.tencent.com/document/api/266/33894
- Tencent DRM token `multiDrm` contract:
  https://cloud.tencent.com/document/product/266/103885
- Tencent adaptive-streaming billing:
  https://www.tencentcloud.com/document/product/266/14666
- Tencent encryption best-practice caveat:
  https://intl.cloud.tencent.com/document/product/266/38131
