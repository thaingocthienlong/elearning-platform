# Provider Zero Setup

This guide is for rebuilding external provider access after inherited accounts, keys, trials, or credentials were cancelled. It covers Google OAuth, Tencent VOD Commercial DRM, Zoom Meeting SDK, Upstash Redis, SMTP/reCAPTCHA, Sentry, and Vercel staging env entry.

Do not paste real secrets, tokens, service account values, database URLs, certificates, media keys, webhook sign keys, or full user emails into this repository.

## Official References

- Google OAuth web server flow: https://developers.google.com/identity/protocols/oauth2/web-server
- Tencent VOD product docs: https://cloud.tencent.com/document/product/266
- Tencent VOD Commercial DRM guide: https://www.tencentcloud.com/document/product/266/46642
- Tencent VOD ApplyUpload API: https://cloud.tencent.com/document/api/266/31767
- Tencent VOD ProcessMedia API: https://cloud.tencent.com/document/api/266/32586
- Tencent third-party DRM playback: https://cloud.tencent.com/document/product/266/103885
- Tencent client upload guide: https://www.tencentcloud.com/document/product/266/33921
- Tencent VOD event notifications: https://cloud.tencent.com/document/product/266/55244
- Tencent FairPlay certificate setup: https://www.tencentcloud.com/document/product/266/49668
- Tencent HLS private encryption: https://www.tencentcloud.com/document/product/266/46780
- Tencent third-party SimpleAES playback: https://www.tencentcloud.com/document/product/266/51849
- Tencent encryption and DRM overview: https://www.tencentcloud.com/document/product/266/49275
- Zoom Meeting SDK: https://marketplacefront.zoom.us/sdk/meeting/web/index.html
- Upstash Redis: https://upstash.com/docs/redis
- Nodemailer SMTP: https://nodemailer.com/smtp
- Google reCAPTCHA: https://cloud.google.com/recaptcha/docs/create-key-website
- Sentry setup: https://docs.sentry.dev/product/sentry-basics/integrate-backend/getting-started/
- Vercel environment variables: https://vercel.com/docs/environment-variables

## Google OAuth From Zero

Create an OAuth web client, register `<STAGING_ORIGIN>/api/auth/callback/google`, and store:

```env
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
NEXTAUTH_URL=<staging-origin>
NEXTAUTH_SECRET=<generated-secret>
AUTH_SECRET=<generated-secret>
```

## Tencent VOD Commercial DRM From Zero

This project uses Tencent VOD as a full media platform: upload, storage, processing, Commercial DRM, playback URL metadata, license requests, webhook callbacks, and deletion. It is not a DRM-only integration.

Use this first-pass setup unless a Tencent support engineer tells you otherwise:

- Tencent Cloud International console.
- Primary VOD application, not a sub-application.
- `ap-singapore` VOD API region.
- Chrome/Edge Widevine first.
- iOS/macOS WebKit fallback through Tencent HLS Private Encryption/SimpleAES or basic HLS when FairPlay is not available.
- Default Tencent playback domain first.
- No Tencent Key Hotlink Protection until the app implements Tencent playback URL signing.
- FairPlay/Safari DRM only after Widevine works and FairPlay certificate material is available.

### 1. Create or activate Tencent Cloud VOD

1. Open https://console.tencentcloud.com/.
2. Sign in or create a Tencent Cloud account.
3. Complete identity verification if the console asks for it.
4. Add billing/payment.
5. Open the VOD console: https://console.tencentcloud.com/vod.
6. If VOD shows **Activate**, **Enable**, **Buy Now**, or similar, click it and activate VOD.
7. Keep the account owner or billing admin available until upload and playback are proven.

Do not create or paste real keys into this repository. Real values belong in the password manager, local `.env.local`, and staging provider env only.

### 2. Select the VOD application

1. In the VOD console, click **Application Management**.
2. For the first staging test, use the **Primary Application**.
3. Click the application name to enter its settings.
4. If you use the Primary Application, leave `TENCENT_VOD_SUB_APP_ID` empty.
5. If you intentionally create a sub-application later:
   - Click **Create Application** or **Create Subapplication**.
   - Name it something like `secure-streaming-staging`.
   - Copy its numeric application ID into `TENCENT_VOD_SUB_APP_ID`.

Primary-app first avoids confusing root account AppId, VOD SubAppId, task flow, callback, and playback key scope during initial proof.

### 3. Create Tencent API credentials

1. Open CAM API key management: https://console.tencentcloud.com/cam/capi.
2. Prefer a sub-user instead of the root account.
3. In CAM, create a user named `secure-streaming-vod-staging` or similar.
4. Enable programmatic/API access.
5. Attach VOD permissions. For the first staging proof, Tencent's managed VOD full-access policy is acceptable; reduce to least privilege after upload, processing, media info, webhook, and deletion calls are known.
6. Open the user details page.
7. Open **API Keys**.
8. Click **Create Key**.
9. Copy `SecretId` immediately into the password manager and staging env.
10. Copy `SecretKey` immediately into the password manager and staging env. Tencent may show the `SecretKey` only once.

Map these values:

```env
TENCENT_SECRET_ID=<cam-api-secret-id>
TENCENT_SECRET_KEY=<cam-api-secret-key>
TENCENT_VOD_REGION=ap-singapore
```

### 4. Enable or confirm Commercial DRM

1. In VOD console, go to **Application Management**.
2. Click the selected application name.
3. Open **Media Processing**.
4. Open **DRM Configuration** or **Commercial DRM**.
5. Enable Commercial DRM/MultiDRM if the console shows an enable action.
6. For the first test, configure Widevine only if Tencent lets you choose.
7. Skip FairPlay until Chrome/Edge playback works.

FairPlay is needed for Safari. To configure it later:

1. Prepare Apple FairPlay materials outside the repo:
   - `fairplay.cer`
   - `privatekey.pem`
   - private key password
   - ASK
2. In VOD console, open **Application Management** > selected app > **Media Processing** > **DRM Configuration**.
3. Click **Edit**.
4. Upload `fairplay.cer`.
5. Upload `privatekey.pem`.
6. Enter the private key password.
7. Enter ASK.
8. Click **Save**.
9. Copy the FairPlay certificate URL shown by Tencent and map it to `NEXT_PUBLIC_TENCENT_FAIRPLAY_CERT_URL`.

Never commit FairPlay certificates, private keys, passwords, ASK values, or screenshots that reveal them.

### 4b. Configure Apple fallback without FairPlay

If you do not have Apple Developer Program membership, use Tencent HLS Private Encryption/SimpleAES as the Apple-browser fallback. This is not FairPlay and not hardware DRM, but Tencent documents it as a compatibility-first encrypted HLS protection path for broad device support.

Console intent:

1. Keep Commercial DRM/Widevine output for Chrome, Edge, and Android Chrome.
2. Add a second adaptive bitrate output for Apple fallback.
3. Set that second output encryption type to **Private (SimpleAES)** or **HLS Private Encryption**.
4. Keep the Apple fallback below 720p because Tencent states HLS private encryption supports resolutions lower than 720p.
5. If SimpleAES is unavailable in your console, use a basic unencrypted HLS output as the last-resort Apple fallback and treat it as lower security.

Implementation behavior:

- The app stores Widevine/DRM HLS or DASH in `dashUrl`/`hlsUrl`.
- The app stores the Apple fallback HLS output in `hlsUrlClear`.
- If Tencent reports `DrmType=SimpleAES`, the app inserts `voddrm.token.<DrmToken>.` into the HLS manifest filename before sending it to iOS/macOS WebKit.
- If Tencent reports an unencrypted HLS output, the app uses it without a `DrmToken`.
- Docs, tests, and reports must describe this as **Apple fallback**, not as FairPlay success.

### 5. Create or select a DRM-capable procedure

Tencent encrypts VOD output through media processing. This repo sends a `procedure` value during upload/processing, so the procedure name must exactly match a Tencent task flow.

Recommended preset path:

1. VOD console > **Application Management**.
2. Click the selected app.
3. Open **Media Processing** > **Task Flow** or **Task Flow Template**.
4. Look for Tencent's MultiDRM preset. Official docs commonly name it `MultiDrm-WV-FP-V1-Preset`; some console surfaces show `WidevineFairPlayPreset`.
5. Open or view the preset details.
6. Confirm it creates adaptive bitrate output with Widevine DRM encryption.
7. Copy the exact task flow name into `TENCENT_VOD_PROCEDURE_NAME`.

If the preset is unavailable, create a custom task flow:

1. Click **Create Task Flow**.
2. Name it `course-drm-720p`.
3. Add an adaptive bitrate or HLS output step.
4. Set the output to a 720p-focused profile for the first course test.
5. Enable MultiDRM/Commercial DRM encryption on the main adaptive output for Widevine.
6. Add a second adaptive bitrate/HLS output for Apple fallback.
7. Set the second output to **Private (SimpleAES)** or **HLS Private Encryption** and keep it below 720p.
8. Save the task flow.
9. Use `course-drm-720p` as `TENCENT_VOD_PROCEDURE_NAME`.

Map the value:

```env
TENCENT_VOD_PROCEDURE_NAME=<exact-drm-task-flow-name>
```

### 6. Configure the playback domain

1. VOD console > **Application Management**.
2. Click the selected app.
3. Open **Distribution and Playback** > **Domain Name**.
4. For the first staging test, use the Tencent default playback domain if it is active.
5. If you need a custom domain:
   - Click **Add Domain**.
   - Enter the playback domain, for example `video-staging.example.com`.
   - Follow Tencent's CNAME DNS instruction.
   - Wait until the domain status is online.

Do not enable **Key Hotlink Protection** for the first test. Tencent's docs put it under **Domain Name** > **Set** > **Access Control** > **Key Hotlink Protection**, but this repo does not currently document Tencent URL signing. Enabling it too early can make otherwise valid playback URLs fail.

### 7. Copy the playback key for DrmToken signing

Tencent's third-party DRM playback flow requires a `DrmToken`. Official docs say this token is signed with the VOD playback key, not the CAM `TENCENT_SECRET_KEY`.

1. VOD console > **Application Management**.
2. Click the selected app.
3. Open **Distribution and Playback**.
4. Open **Default Distribution Configuration** or the equivalent playback settings panel.
5. Find **Playback Key**.
6. Click **Generate**, **Show**, or **Copy**.
7. Save it in the password manager.

Implementation note: this repo uses `TENCENT_VOD_PLAYBACK_KEY` for Tencent third-party DRM `DrmToken` signing. Legacy aliases `TENCENT_PLAYBACK_KEY` and `TENCENT_VOD_PKEY` are accepted, but use `TENCENT_VOD_PLAYBACK_KEY` in new Vercel/local env.

Planned/env value after implementation support:

```env
TENCENT_VOD_PLAYBACK_KEY=<vod-playback-key-used-for-drmtoken-signing>
```

### 8. Configure license URLs

Use Tencent's official third-party DRM license endpoints:

```env
NEXT_PUBLIC_TENCENT_WIDEVINE_LICENSE_URL=https://widevine.drm.vod-qcloud.com/widevine/getlicense/v2
NEXT_PUBLIC_TENCENT_FAIRPLAY_LICENSE_URL=https://fairplay.drm.vod-qcloud.com/fairplay/getlicense/v2
NEXT_PUBLIC_TENCENT_FAIRPLAY_CERT_URL=<fairplay-certificate-url-or-empty-until-fairplay-is-configured>
```

Chrome and Edge use Widevine. iOS and macOS WebKit use the Apple fallback HLS output when FairPlay certificate setup is not available.

### 9. Configure the Tencent webhook callback

Tencent must call a public HTTPS endpoint after upload and processing events. For staging, use the deployed staging origin:

```text
https://<staging-domain>/api/webhook/tencent
```

For local callback testing, expose the dev server with a trusted HTTPS tunnel and use the tunnel origin temporarily.

Console steps:

1. VOD console > **Application Management**.
2. Click the selected app.
3. Open **Callback Settings**, **Event Notification**, or **Callback Configuration**.
4. Click **Set**, **Edit**, or **Go to set**.
5. Select **Normal Callback** or HTTP callback.
6. Set callback URL to `https://<staging-domain>/api/webhook/tencent`.
7. Generate a random webhook sign key outside the repo.
8. Paste that sign key into Tencent's callback sign key field if the console provides one.
9. Select upload complete, task flow/procedure complete, media processing complete, and delete events if the console lets you choose individual events. If Tencent offers **Select all**, use it for staging.
10. If Tencent shows separate v2.0 and v3.0 callback settings, configure v3.0.
11. Click **Confirm** or **Save**.

Map the webhook sign key:

```env
TENCENT_VOD_WEBHOOK_SIGN_KEY=<random-webhook-sign-key>
```

### 10. Final Tencent env checklist

Store real values in the password manager and in encrypted local/staging env. Keep only placeholders in repo docs:

```env
TENCENT_SECRET_ID=<cam-api-secret-id>
TENCENT_SECRET_KEY=<cam-api-secret-key>
TENCENT_VOD_REGION=ap-singapore
TENCENT_VOD_SUB_APP_ID=<optional-sub-app-id>
TENCENT_VOD_PROCEDURE_NAME=<exact-drm-task-flow-name>
TENCENT_VOD_WEBHOOK_SIGN_KEY=<random-webhook-sign-key>
NEXT_PUBLIC_TENCENT_WIDEVINE_LICENSE_URL=https://widevine.drm.vod-qcloud.com/widevine/getlicense/v2
NEXT_PUBLIC_TENCENT_FAIRPLAY_LICENSE_URL=https://fairplay.drm.vod-qcloud.com/fairplay/getlicense/v2
NEXT_PUBLIC_TENCENT_FAIRPLAY_CERT_URL=<fairplay-certificate-url-or-empty-until-fairplay-is-configured>
```

Also save the VOD playback key for Tencent `DrmToken` signing. Do not expose it to browser code:

```env
TENCENT_VOD_PLAYBACK_KEY=<vod-playback-key-used-for-drmtoken-signing>
```

`npm run verify:tencent -- --strict` requires `TENCENT_VOD_PLAYBACK_KEY`; if it is missing, Tencent license playback cannot work.

### 11. Verify setup from the repo

After local `.env.local` or staging env is configured, run:

```bash
npm run verify:tencent -- --strict
```

For broader staging readiness, also run:

```bash
npm run verify:setup
npm run verify:services:strict
npm run verify:staging
```

`verify:tencent` proves env shape and API reachability. It does not replace real browser playback.

### 12. Manual Tencent staging smoke

1. Deploy staging with the Tencent env values above.
2. Sign in as an admin.
3. Open the admin video page.
4. Upload a short MP4 test file, ideally 30-60 seconds.
5. Confirm upload completion returns a Tencent `FileId`.
6. Confirm the local video row stores Tencent metadata.
7. Wait for Tencent processing and webhook events.
8. If the webhook does not arrive, use the admin resync/status action and check Tencent's task list in the VOD console.
9. Confirm the video reaches the app's ready state.
10. Sign in as an entitled learner.
11. Open `/watch/<videoId>` in Chrome or Edge.
12. Confirm the player loads the Tencent DRM manifest and sends a Widevine license request to `https://widevine.drm.vod-qcloud.com/widevine/getlicense/v2`.
13. Sign in as a user without entitlement and confirm playback session data is denied.
14. Open the same `/watch/<videoId>` in iOS Safari or iOS Chrome.
15. Confirm the app loads the Tencent Apple fallback HLS manifest.
16. For SimpleAES fallback, confirm the manifest filename contains `voddrm.token.` and playback starts.
17. Mark Safari/FairPlay DRM as blocked until FairPlay certificate URL and license flow are configured; record SimpleAES/basic HLS as Apple fallback success only.

Common failure mapping:

- `verify:tencent` fails with missing env: add the named env var to local/staging env and redeploy if using Vercel.
- Upload fails before `FileId`: check CAM permissions, `TENCENT_SECRET_ID`, `TENCENT_SECRET_KEY`, `TENCENT_VOD_REGION`, and optional `TENCENT_VOD_SUB_APP_ID`.
- Upload succeeds but processing never starts: check `TENCENT_VOD_PROCEDURE_NAME` exactly matches the Tencent task flow name.
- Processing succeeds in Tencent but the app stays pending: check webhook URL, webhook sign key, staging logs, and manual resync.
- Manifest URL is missing: check that the task flow creates adaptive DRM output, then resync media info.
- Widevine license request returns authorization/token errors: verify Tencent third-party DRM `DrmToken` signing against the official docs and confirm the app uses the VOD playback key, not the CAM API secret.
- Safari fails with no fallback URL: update the Tencent task flow to generate SimpleAES/private HLS or basic HLS, rerun processing, then use manual resync.
- Safari loads fallback URL but playback fails: confirm the fallback output is below 720p, the URL is an HLS `.m3u8`, and SimpleAES URLs include `voddrm.token.` before the manifest filename.
- Safari FairPlay fails: configure FairPlay certificate material first and set `NEXT_PUBLIC_TENCENT_FAIRPLAY_CERT_URL`.

Staging smoke must prove upload metadata, processing status, webhook verification, entitlement denial, and Tencent DRM playback before cutover acceptance.

## Zoom Meeting SDK From Zero

Create or select the Zoom Meeting SDK app, allow the staging domain, and store:

```env
ZOOM_MEETING_SDK_KEY=<zoom-sdk-key>
ZOOM_MEETING_SDK_SECRET=<zoom-sdk-secret>
NEXT_PUBLIC_ZOOM_MEETING_ID=<meeting-id>
NEXT_PUBLIC_ZOOM_PASSCODE=<meeting-passcode>
```

## Upstash Redis From Zero

Create a Redis database and store:

```env
UPSTASH_REDIS_REST_URL=<upstash-rest-url>
UPSTASH_REDIS_REST_TOKEN=<upstash-rest-token>
REDIS_URL=<optional-local-redis-url>
```

## SMTP Provider From Zero

Create a sender account or SMTP relay and store:

```env
SMTP_HOST=<smtp-host>
SMTP_PORT=<smtp-port>
SMTP_SECURE=<true-or-false>
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-password>
SMTP_FROM=<support-from-address>
ADMIN_EMAIL=<support-recipient>
```

## Google reCAPTCHA From Zero

Create a website key for the staging domain and store:

```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<recaptcha-site-key>
RECAPTCHA_SECRET_KEY=<recaptcha-secret-key>
```

## Sentry From Zero

Create a staging project/environment and store:

```env
SENTRY_DSN=<sentry-dsn>
```

## Vercel Staging Env Entry

Add all values from `docs/env-matrix.md` to the staging environment scope. Redeploy after every env change because Vercel env changes apply only to new deployments.

Run:

```bash
npm run verify:setup
npm run verify:services:strict
npm run verify:tencent -- --strict
npm run verify:staging
```

Record missing real provider access as `blocked: missing credentials/service access`, not as a pass.
