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
- `AXINOM_FAIRPLAY_CERT_URL`
- `NEXT_PUBLIC_AX_WV_LS_URL`
- `NEXT_PUBLIC_AX_PR_LS_URL`
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
