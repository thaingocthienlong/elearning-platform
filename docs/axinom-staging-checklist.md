# Axinom Staging Checklist

Use this checklist after `docs/axinom-setup.md` is complete for a real Axinom trial tenant. Do not run these steps with placeholder env values.

## 1. Tenant Access

Confirm the maintainer has access to:

- My Mosaic / Mosaic Management System tenant.
- DRM configuration and Communication Key values.
- Encoding service-account management.
- Input and output storage used by Axinom Encoding.
- Staging host environment settings.
- Staging database/admin access for one test video.

## 2. Staging Environment

Configure canonical variables in the staging host. Do not rely on legacy `AX_*` aliases.

Required Axinom variables:

- `AXINOM_COM_KEY_ID`
- `AXINOM_COM_KEY_SECRET`
- `AXINOM_ENCODING_CLIENT_ID`
- `AXINOM_ENCODING_CLIENT_SECRET`
- `AXINOM_ENCODING_PROFILE_DRM`
- `AXINOM_ENCODING_PROFILE_CLEAR`
- `AXINOM_ENCODING_API_URL`
- `AXINOM_VIDEO_SERVICE_URL`
- `AXINOM_WEBHOOK_SECRET`
- `NEXT_PUBLIC_AX_WV_LS_URL`
- `NEXT_PUBLIC_AX_PR_LS_URL`

Optional FairPlay variables, required only if Apple FPS/FairPlay is configured instead of the clear HLS fallback:

- `AXINOM_FAIRPLAY_CERT_URL`
- `NEXT_PUBLIC_AX_FP_LS_URL`

Run:

```bash
npm run verify:axinom -- --strict
```

Expected result: validation passes without printing secret values.

## 3. Optional Live Connectivity

Run live checks only after staging or a secure local shell has real tenant credentials:

```bash
npm run verify:axinom -- --strict --live
```

Expected result:

- Identity authentication succeeds.
- Video Service request reaches Axinom.
- Dummy job behavior is understood; a missing source file may still fail later by design.

Do not paste live token, service-account secret, Communication Key value, or storage key into tickets or logs.

## 4. Encode A Test Video

1. Upload one short non-sensitive test video to the configured input storage.
2. Create or select an unpublished `Video` row in the app.
3. Ensure the row has `r2Key` or the expected source path for the encoding helper.
4. Trigger the admin video processing route from the app UI or an authenticated admin request.
5. Confirm the row now has:
   - `axinomVideoId`
   - `axinomIdClear` if clear fallback is configured
   - `axinomEncodingStatus`

## 5. Webhook Callback

Configure the Axinom webhook URL:

```text
https://<staging-domain>/api/webhook/axinom
```

Expected after Encoding completion:

- Webhook returns a 200 for valid signed callbacks.
- Video row has `dashUrl`, `hlsUrl`, `drmKeyId`, `axinomOutputLocation`, `axinomSyncedAt`, and `axinomEncodingStatus`.
- Malformed signatures return 403 without server 500s.

## 6. Authorized Playback

1. Grant a staging learner access to the course/video.
2. Open the watch page as that learner.
3. Confirm `/api/drm/token` returns a token only after entitlement passes.
4. In browser network tools, confirm Shaka sends `X-AxDRM-Message` only on DRM license requests.
5. Confirm manifest and media segment requests do not include `X-AxDRM-Message`.
6. Confirm playback starts for a supported DRM/browser combination.

For tenants without FairPlay/FPS credentials, Safari and iOS acceptance requires `hlsUrlClear` from the clear processing profile. Treat clear HLS as a fallback protected by auth, HLS authorization, watermarking, session controls, and audit telemetry, not by DRM.

## 6A. Local App Playback Smoke

Use this when Axinom Encoding has finished and staging deployment is not ready yet.

1. Open the completed video in the Axinom Management System.
2. Copy the DASH and HLS manifest URLs from the video details or preview page.
3. Fetch the DASH manifest and record only the DRM `default_KID` values. Do not record DRM content keys, CPIX data, license tokens, or Communication Key values.
4. Create or update one app `Video` row with:
   - `dashUrl`
   - `hlsUrl`
   - comma-separated `drmKeyId`
   - `axinomVideoId`
   - `axinomJobId`
   - `axinomOutputLocation`
   - `axinomEncodingStatus=READY`
5. Ensure the video is reachable through an open course, enrollment, or `VideoAccess` row.
6. Sign in to the local app with a whitelisted user.
7. Open `/watch/<videoId>`.
8. Accept the IPR consent prompt.
9. Confirm the browser loads the DASH manifest.
10. Confirm the browser sends a license request to the Axinom license service.
11. Confirm encrypted media segments load from the output storage host.
12. Press play and confirm the video element `currentTime` advances without a video element error.

Local evidence from the 2026-05-09 rescue smoke:

- Axinom Encoding completed a protected BigBuckBunny test video.
- The app watch page loaded the DASH manifest and encrypted media from Axinom-managed Azure Blob output.
- A Widevine license request reached Axinom License Service.
- Playback advanced in the browser through the app path.
- The Axinom portal preview had previously shown a preview configuration error, so app playback is the source-of-truth acceptance path for this repository.

## 6B. macOS Safari FairPlay Smoke

Use real macOS Safari for acceptance. Playwright WebKit is useful for browser automation checks, but Playwright WebKit is not a FairPlay acceptance substitute because it is not branded Safari and media behavior varies by operating system.

Before opening the watch page, run:

```bash
npm run verify:safari-fairplay
```

Expected FairPlay-ready result:

```text
Safari FairPlay readiness: ready
Mode: fairplay-drm
Checked: AXINOM_FAIRPLAY_CERT_URL, NEXT_PUBLIC_AX_FP_LS_URL
```

If the verifier reports `blocked`, Safari acceptance must use `hlsUrlClear` from the clear processing profile instead of claiming FairPlay DRM playback.

Real-device FairPlay smoke steps:

1. Use a Mac with current Safari and no custom browser automation patches.
2. Sign in as an entitled staging learner.
3. Open `/watch/<videoId>` for a video row with `hlsUrl`, `drmKeyId`, and no `hlsUrlClear` fallback selected.
4. Accept the IPR consent prompt.
5. In Safari Web Inspector, confirm the HLS manifest request loads.
6. Confirm the FairPlay license request goes to the Axinom FairPlay License Service URL.
7. Confirm the license request includes `X-AxDRM-Message`.
8. Confirm manifest and media segment requests do not include `X-AxDRM-Message`.
9. Press play and confirm the video element `currentTime` advances for at least 10 seconds.
10. Record evidence as sanitized status, browser version, video row ID, public Axinom operational status fields, and HTTP status codes only.

Do not paste license tokens, certificate contents, Communication Key values, or DRM content keys into docs, screenshots, tickets, or chat.

## 7. Expected Failures

Record failures by symptom and path, not by secret value:

- Env validation missing variable names.
- Axinom API HTTP status and sanitized error category.
- Webhook status code.
- Browser DRM error code.
- Video row IDs and public operational status fields.

Never capture or share Communication Key value, service-account secret, license token, storage key, DRM content keys, CPIX files, or local env files.

## Acceptance

The Axinom staging path is accepted when:

- Strict Axinom validation passes.
- One test video is encoded with DRM output.
- Webhook updates explicit Axinom fields.
- An authorized learner can play the test video through Shaka and Axinom License Service.
- Denied users cannot mint a DRM token for the test video.
