# Provider Account Setup From Zero

This guide is for rebuilding all external provider access after inherited accounts, keys, trials, or credentials were cancelled. It covers Google OAuth, Axinom DRM/Encoding, VdoCipher, Zoom Meeting SDK, Upstash Redis, Azure Blob Storage, Cloudflare R2/S3-compatible storage, SMTP/reCAPTCHA, and Sentry.

Use placeholder values in documentation and tickets. Do not paste real secrets, tokens, service-account files, private keys, certificates, media keys, database URLs, storage keys, SDK secrets, or full user emails into this repository.

## Official References

- Google OAuth consent: https://developers.google.com/workspace/guides/configure-oauth-consent
- Google OAuth web server flow: https://developers.google.com/identity/protocols/oauth2/web-server
- Google OAuth clients: https://support.google.com/cloud/answer/6158849
- Axinom DRM: https://docs.axinom.com/services/drm/
- Axinom License Service: https://docs.axinom.com/services/drm/license-service
- Axinom License Service Message signing: https://docs.axinom.com/services/drm/license-service/sign-license-service-message
- Axinom Shaka Player integration: https://docs.axinom.com/services/drm/players/shaka
- Axinom Encoding API quickstart: https://docs.axinom.com/services/encoding/quickstart/using-api/api
- Axinom Encoding Profiles: https://docs.axinom.com/services/video/setup-encoding-profiles/
- VdoCipher upload overview: https://www.vdocipher.com/docs/server/upload/overview/
- VdoCipher upload credentials: https://www.vdocipher.com/docs/server/upload/credentials/
- VdoCipher browser upload: https://www.vdocipher.com/docs/server/upload/browser/
- VdoCipher OTP API: https://www.vdocipher.com/docs/server/playbackauth/otp/
- VdoCipher player embed: https://www.vdocipher.com/docs/player/v2/
- VdoCipher web hooks: https://www.vdocipher.com/docs/server/account/hooks
- Zoom Meeting SDK for Web: https://marketplacefront.zoom.us/sdk/meeting/web/index.html
- Zoom Meeting SDK docs: https://developers.zoom.us/docs/meeting-sdk/web/
- Upstash Redis getting started: https://upstash.com/docs/redis
- Upstash Redis REST API: https://upstash.com/docs/redis/features/restapi
- Azure storage account creation: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create
- Azure Storage CORS: https://learn.microsoft.com/en-us/rest/api/storageservices/Cross-Origin-Resource-Sharing--CORS--Support-for-the-Azure-Storage-Services
- Azure Blob CORS CLI: https://learn.microsoft.com/en-us/cli/azure/storage/account/blob-service-properties/cors-rule
- Cloudflare R2 S3 API: https://developers.cloudflare.com/r2/get-started/s3/
- Cloudflare R2 API tokens: https://developers.cloudflare.com/r2/api/s3/tokens/
- Cloudflare R2 CORS API: https://developers.cloudflare.com/api/resources/r2/
- Nodemailer SMTP transport: https://nodemailer.com/smtp
- Google reCAPTCHA website keys: https://cloud.google.com/recaptcha/docs/create-key-website
- Sentry project setup: https://docs.sentry.dev/product/sentry-basics/integrate-backend/getting-started/
- Sentry Next.js options and DSN: https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/environments/
- Sentry sensitive data handling: https://docs.sentry.dev/platforms/javascript/guides/nextjs/data-management/sensitive-data/

## 1. Before Creating New Accounts

1. Decide the canonical staging origin, for example `https://staging.example.edu`.
2. Decide the local origin, normally `http://127.0.0.1:3000`.
3. Create a secure password manager vault for provider credentials.
4. Create a new local `.env.local` from `.env.example`; do not commit it.
5. Open `docs/env-matrix.md` and keep it beside this guide.
6. Record every unavailable provider as `blocked: missing credentials/service access` until the new account is configured and smoked.
7. Revoke old/cancelled credentials in provider portals when possible.

Required callback/origin placeholders:

| Placeholder | Meaning |
|-------------|---------|
| `<LOCAL_ORIGIN>` | `http://127.0.0.1:3000` or your chosen local origin. |
| `<STAGING_ORIGIN>` | Stable Vercel Preview/Custom Environment staging URL. |
| `<GOOGLE_CALLBACK>` | `<ORIGIN>/api/auth/callback/google`. |
| `<AXINOM_WEBHOOK_URL>` | `<STAGING_ORIGIN>/api/webhook/axinom`. |
| `<VDOCIPHER_WEBHOOK_URL>` | `<STAGING_ORIGIN>/api/webhook/vdocipher?secret=<VDOCIPHER_WEBHOOK_SECRET>`. |

## 2. Google OAuth From Zero

Purpose in this app:

- User login through NextAuth Google provider.
- Whitelist-based app access after OAuth sign-in.

Repo env vars:

```bash
NEXTAUTH_URL=<ORIGIN>
NEXTAUTH_SECRET=<GENERATED_SECRET>
AUTH_SECRET=<SAME_OR_COMPATIBLE_SECRET>
GOOGLE_CLIENT_ID=<GOOGLE_OAUTH_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<GOOGLE_OAUTH_CLIENT_SECRET>
```

Steps:

1. Create or choose a Google Cloud project for the institute.
2. Configure the OAuth consent screen in Google Auth Platform.
3. Use the minimum scopes needed for sign-in: `openid`, `email`, and `profile`.
4. Add test users if the app is external and still in testing.
5. Create an OAuth client for a web application.
6. Add authorized redirect URIs:
   - `<LOCAL_ORIGIN>/api/auth/callback/google`
   - `<STAGING_ORIGIN>/api/auth/callback/google`
7. Save the client ID and client secret in the password manager.
8. Put the values into local `.env.local` and Vercel staging env settings.
9. Generate `NEXTAUTH_SECRET` with a secure random value.
10. Set `NEXTAUTH_URL` to the exact active origin for the environment.

Validation:

```bash
npm run verify:services
```

Manual smoke:

1. Sign in as a whitelisted learner.
2. Confirm redirect back to the app.
3. Sign in as a non-whitelisted user.
4. Confirm denial is user-safe.

Common failure points:

- `redirect_uri_mismatch`: callback URL does not exactly match Google OAuth client settings.
- Secret copied from an old cancelled OAuth client.
- `NEXTAUTH_URL` points to local while testing staging.

## 3. Axinom DRM And Encoding From Zero

Purpose in this app:

- Sign Axinom License Service Messages for DRM playback.
- Integrate Shaka Player with Axinom license URLs.
- Run Axinom Encoding and receive webhook updates.

Repo env vars:

```bash
AXINOM_COM_KEY_ID=<DRM_COMMUNICATION_KEY_ID>
AXINOM_COM_KEY_SECRET=<DRM_COMMUNICATION_KEY_SECRET>
AXINOM_ENCODING_CLIENT_ID=<ENCODING_CLIENT_ID>
AXINOM_ENCODING_CLIENT_SECRET=<ENCODING_CLIENT_SECRET>
AXINOM_ENCODING_PROFILE_DRM=<DRM_PROFILE_ID>
AXINOM_ENCODING_PROFILE_CLEAR=<CLEAR_PROFILE_ID>
AXINOM_ENCODING_API_URL=<AXINOM_ENCODING_API_URL>
AXINOM_VIDEO_SERVICE_URL=<AXINOM_VIDEO_SERVICE_URL>
AXINOM_WEBHOOK_SECRET=<WEBHOOK_SHARED_SECRET>
AXINOM_FAIRPLAY_CERT_URL=<FAIRPLAY_CERTIFICATE_URL>
NEXT_PUBLIC_AX_WV_LS_URL=<WIDEVINE_LICENSE_SERVICE_URL>
NEXT_PUBLIC_AX_PR_LS_URL=<PLAYREADY_LICENSE_SERVICE_URL>
NEXT_PUBLIC_AX_FP_LS_URL=<FAIRPLAY_LICENSE_SERVICE_URL>
```

Axinom account and tenant creation:

1. Open https://portal.axinom.com/.
2. Sign in with the maintainer email that should own the trial. If no account exists, use the portal sign-up path and verify the email.
3. Open **My Mosaic**.
4. Create or select the evaluation tenant/environment for this project.
5. Open **Overview**.
6. In the **Management System** area, copy/open the tenant Management System URL. Keep this tab open; the Encoding and Video Service GUI setup is done there.
7. In the password manager, create an entry named `Axinom - <environment> - Secure Streaming Platform`.
8. Record only labels, IDs, URLs, and non-secret notes in this document or tickets. Do not paste real secrets.

DRM credentials and license URLs:

1. In https://portal.axinom.com/, open **My Mosaic**.
2. Click **DRM** in the left navigation.
3. If the page shows an onboarding action such as **Acquire Credentials**, click it and complete the evaluation agreement/onboarding flow.
4. Open the DRM configuration that belongs to the new tenant/environment.
5. Find the **License Service** or **Communication Key** section.
6. Copy the **Communication Key ID** into the password manager as `AXINOM_COM_KEY_ID`.
7. Copy the **Communication Key** value into the password manager as `AXINOM_COM_KEY_SECRET`. Axinom documents this value as base64 for signing License Service Message JWTs.
8. Copy the Widevine License Service URL into `NEXT_PUBLIC_AX_WV_LS_URL`.
9. Copy the PlayReady License Service URL into `NEXT_PUBLIC_AX_PR_LS_URL`.
10. Copy the FairPlay License Service URL into `NEXT_PUBLIC_AX_FP_LS_URL`.
11. If the tenant does not show tenant-specific license URLs, use the documented Axinom defaults only for the matching DRM type:
    - Widevine: `https://drm-widevine-licensing.axprod.net/AcquireLicense`
    - PlayReady: `https://drm-playready-licensing.axprod.net/AcquireLicense`
    - FairPlay: `https://drm-fairplay-licensing.axprod.net/AcquireLicense`
12. If FairPlay is required, locate the FairPlay certificate or streaming certificate URL and store it as `AXINOM_FAIRPLAY_CERT_URL`. If FairPlay has not been provisioned yet, mark FairPlay as blocked and keep Widevine/PlayReady testing separate.
13. Open https://portal.axinom.com/Tools or the Axinom **Tools** area.
14. Open the **Entitlement Message** or **DRM Video Playback** tool.
15. Use the tool only with test content and temporary values to confirm that the Communication Key ID/value can sign a License Service Message. Do not paste production user or content identifiers.

Encoding and Video Service access:

1. Open the tenant Management System URL copied from **My Mosaic** -> **Overview** -> **Management System**.
2. Confirm the left navigation includes **Settings** and **Videos**. If it does not, the account is missing Video Service/Encoding permissions.
3. Open the Mosaic Admin Portal for the same tenant/environment.
4. Create a dedicated service account named `secure-streaming-platform-staging`.
5. Grant the service account only the permissions required for this app's Axinom flow. At minimum, Axinom's Encoding API docs call out `Videos: Encode` for encoding access.
6. Copy the service account client ID into `AXINOM_ENCODING_CLIENT_ID`.
7. Copy the service account client secret into `AXINOM_ENCODING_CLIENT_SECRET`.
8. Keep the default Video Service GraphQL URL as `https://video.service.eu.axinom.net/graphql` unless Axinom assigns a different region/tenant endpoint. Store it in `AXINOM_VIDEO_SERVICE_URL`.
9. Keep the Encoding API URL aligned with the tenant region. Axinom documents the default service URL as `https://vip-eu-west-1.axinom.com`; this repo's lower-level Encoding helper expects the API form in `AXINOM_ENCODING_API_URL`.

Storage setup inside Axinom:

1. Complete the Azure Blob or R2/S3-compatible storage setup from the storage sections of this guide first.
2. In the tenant Management System, open **Settings**.
3. Open **Video Encoding** or the **Video Settings** area.
4. Click the tile or menu for **Acquisition Profile**.
5. Create or edit the input profile.
6. Set **Title** to a stable name such as `STAGING_INPUT`.
7. Set **Storage Provider** to the storage type used for source files:
   - Use **Azure Storage** for Azure Blob input.
   - Use **S3 Compatible Storage** for R2/S3-compatible input.
   - Use **Mosaic Hosting Service** only for a pure Axinom-hosted trial.
8. For Azure input, fill **Storage Account Name**, encrypted **Storage Account Key**, and **Container Name** with the staging input container.
9. For S3-compatible input, fill **S3 Endpoint**, **Access Key Id**, encrypted **Access Key**, **Bucket name**, and region/provider fields shown by the UI.
10. Set **Root Path** only if this app uploads sources below a fixed prefix. Otherwise leave it blank and upload each source video into its own folder.
11. Save the Acquisition Profile.
12. Return to **Settings** -> **Video Encoding**.
13. Click **Publishing Profile**.
14. Create or edit the output profile.
15. Set **Title** to a stable name such as `STAGING_OUTPUT`.
16. Configure the output storage provider and output container/bucket.
17. For first staging playback, make the output manifests and media segments readable by the browser/CDN path used by this app. The Axinom quickstart notes that output needs public read access when previewing directly.
18. Save the Publishing Profile.
19. For any storage secret that Axinom asks for, use Axinom's **Credentials Protection Tool** or certificate-based credentials protection. Axinom's Encoding docs state storage and DRM secrets should be encrypted before being passed to the Encoding service.

DRM processing profile:

1. In the tenant Management System, open **Settings** -> **Video Encoding**.
2. Click **Processing** or **Processing Profile**.
3. Create a new profile or duplicate/edit `DEFAULT`.
4. Set **Title** to `STAGING_DRM`.
5. Set the output format to the format this app should test first:
   - Prefer **CMAF** when one output should support Widevine, PlayReady, and FairPlay.
   - Use **DASH** for Widevine/PlayReady-only testing.
   - Use **HLS** for FairPlay-specific testing.
6. Enable **DRM Protection**.
7. Choose the DRM mode that uses Axinom Key Service/DRM-managed keys.
8. Open the **DRM Settings** area for the profile.
9. Fill the Key Service **Management API URL**, **Tenant ID**, encrypted **Management Key**, and encrypted **Key Seed ID** from **My Mosaic** -> **DRM** -> **Key Service**. Axinom notes that the Key Seed is usually created automatically during DRM setup.
10. Save the profile.
11. Copy the saved profile database ID from the Management System URL, details panel, GraphQL query, or admin metadata view into `AXINOM_ENCODING_PROFILE_DRM`.
12. Repeat the profile step with **DRM Protection** disabled, title it `STAGING_CLEAR`, save it, and copy its ID into `AXINOM_ENCODING_PROFILE_CLEAR`.
13. Treat `AXINOM_ENCODING_PROFILE_CLEAR` as required for new admin uploads; processing fails without it so Safari/iOS do not silently publish without `hlsUrlClear`.

Webhook setup:

1. Generate a new random webhook secret in the password manager. Store it as `AXINOM_WEBHOOK_SECRET`.
2. In the tenant Management System or Mosaic Admin Portal, open the webhook/integration settings for Video Service/Encoding events.
3. Add a webhook subscription for the encoding completion/failure event used by the tenant's Video Service.
4. Set the target URL to:

```text
https://<staging-domain>/api/webhook/axinom
```

5. Configure the webhook signing/shared secret with the value stored as `AXINOM_WEBHOOK_SECRET`.
6. Save and enable the webhook.
7. If the Axinom UI offers a test delivery, send a test event and confirm the app returns an expected non-500 response. Do not paste the signature or secret into evidence.

First encoding job through Axinom UI:

1. Prepare a short non-sensitive `.mp4` file, ideally 1-2 minutes.
2. Upload it to the configured input storage in a dedicated folder, for example `staging-smoke-001/source.mp4`.
3. In the tenant Management System, click **Videos**.
4. Click **New**.
5. Select the folder as **Source Location**.
6. Select the `STAGING_DRM` processing profile.
7. Click **Encode**.
8. Wait for encoding to finish. Use the job details/logs in the Management System.
9. Click **Preview** or open the video details to copy the DASH/HLS manifest URLs.
10. Confirm the protected preview can obtain an entitlement message and license service URLs. Axinom's protected preview docs expect entitlement data plus Widevine/PlayReady/FairPlay license service URLs and, for FairPlay, the streaming certificate URL.

Connect the Axinom tenant to this app:

1. Add the repo env vars above to local `.env.local` for local smoke only. Do not commit the file.
2. Add the same values to Vercel encrypted environment settings for staging.
3. Use canonical `AXINOM_*` names. Do not rely on legacy `AX_CLIENT_ID`, `AX_CLIENT_SECRET`, `AX_PROFILE_ID`, or `AX_ENCODING_BASE` in staging.
4. Confirm `AXINOM_VIDEO_SERVICE_URL` matches the tenant region.
5. Confirm `NEXT_PUBLIC_AX_WV_LS_URL`, `NEXT_PUBLIC_AX_PR_LS_URL`, and `NEXT_PUBLIC_AX_FP_LS_URL` are public license URLs only, not secrets.
6. Restart/redeploy the app after changing environment variables.

Validation:

```bash
npm run verify:axinom -- --strict
npm run verify:staging
```

Manual smoke:

1. Encode or select a staging test video.
2. Confirm explicit Axinom operational IDs/statuses are stored on the `Video`.
3. Open `/watch/<videoId>` as an entitled learner.
4. Confirm Shaka sends entitlement tokens only to license requests.
5. Send or trigger a safe signed webhook event.
6. Confirm malformed webhook signatures are rejected.

Common failure points:

- Using cancelled communication keys.
- Mixing old `AX_*` legacy aliases with canonical `AXINOM_*` vars.
- Webhook URL points to local or old staging domain.
- License URL region does not match the tenant.

## 4. VdoCipher Upload And Playback From Zero

Purpose in this app:

- Create short-lived browser upload credentials from the server.
- Store each uploaded video with its VdoCipher video ID, account ID, and processing status.
- Generate short-lived OTP/playbackInfo values only after the existing course/video entitlement check passes.
- Render the VdoCipher player iframe for VdoCipher-backed videos while keeping Axinom playback for older videos.

Repo env vars:

```bash
VDOCIPHER_ACCOUNT_IDS=primary,backup_1,backup_2,backup_3,backup_4
VDOCIPHER_DEFAULT_ACCOUNT_ID=primary
VDOCIPHER_API_SECRET_PRIMARY=<PRIMARY_ACCOUNT_API_SECRET>
VDOCIPHER_API_SECRET_BACKUP_1=<BACKUP_1_ACCOUNT_API_SECRET>
VDOCIPHER_API_SECRET_BACKUP_2=<BACKUP_2_ACCOUNT_API_SECRET>
VDOCIPHER_API_SECRET_BACKUP_3=<BACKUP_3_ACCOUNT_API_SECRET>
VDOCIPHER_API_SECRET_BACKUP_4=<BACKUP_4_ACCOUNT_API_SECRET>
VDOCIPHER_WEBHOOK_SECRET=<WEBHOOK_SHARED_SECRET>
VDOCIPHER_PLAYBACK_WHITELIST_HREF=<PLAYBACK_HOSTNAME>
```

Account and API setup:

1. Create the required VdoCipher account or accounts in the VdoCipher dashboard.
2. For the temporary free-account split, assign a stable logical ID to each account, for example `primary`, `backup_1`, `backup_2`, `backup_3`, and `backup_4`.
3. In each account, copy the API secret into the password manager. Do not paste it into tickets, docs, screenshots, or chat.
4. Set `VDOCIPHER_ACCOUNT_IDS` to the comma-separated logical IDs.
5. Set `VDOCIPHER_DEFAULT_ACCOUNT_ID` to the account that should receive new uploads by default.
6. For each account ID, create one secret variable using the normalized uppercase suffix. For example `backup_1` uses `VDOCIPHER_API_SECRET_BACKUP_1`.
7. Set `VDOCIPHER_PLAYBACK_WHITELIST_HREF` to the exact playback hostname, for example `elearning.vienphuongnam.com.vn`, when you need an explicit override. If this env var is unset, the app uses the active request hostname, then falls back to the hostname from `NEXTAUTH_URL`.
8. In every active VdoCipher account dashboard, allow the same playback hostname under the domain/URL restriction settings.
9. Add the same values to local `.env.local` for urgent local upload work and to Vercel encrypted environment settings for staging.
10. Run `npm run verify:services`; missing VdoCipher values should be treated as blocked for upload/playback work, not ignored.

Upload workflow:

1. Sign in as an admin.
2. Open `/admin/videos`.
3. Select provider `VdoCipher`.
4. Choose the intended VdoCipher account when multiple accounts are configured.
5. Start upload. The server calls VdoCipher's upload credentials endpoint and stores a local `Video` row with status `PRE_UPLOAD`.
6. Upload the file from the browser using the returned `clientPayload.uploadLink` data. The API secret must never be sent to the browser.
7. Use the admin sync action after upload to refresh VdoCipher processing status.
8. Publish the video only after VdoCipher status is ready.

Webhook setup:

1. Generate a random `VDOCIPHER_WEBHOOK_SECRET`.
2. In VdoCipher, configure a webhook for video-ready or processing events where supported.
3. Set the target URL to:

```text
https://<staging-domain>/api/webhook/vdocipher?secret=<VDOCIPHER_WEBHOOK_SECRET>
```

4. Use a safe staging video event to confirm the route returns a non-500 response.
5. Do not paste API secrets, OTP values, playbackInfo values, webhook secrets, or raw provider payloads into evidence.

Playback validation:

1. Sign in as an entitled learner.
2. Open `/watch/<videoId>` for a VdoCipher-backed video.
3. Confirm the server generates OTP/playbackInfo only after entitlement succeeds.
4. Confirm the server OTP request sends `whitelisthref` for the active playback hostname.
5. Confirm visible watermarking remains present around the secure playback shell.
6. Sign in as a learner without access and confirm the watch page and `/api/vdocipher/otp` deny playback.
7. Refresh the page if the OTP expires before the learner starts playback.

Common failure points:

- Account ID suffix does not match the env var name, for example `backup-1` normalizes to `VDOCIPHER_API_SECRET_BACKUP_1`.
- `VDOCIPHER_DEFAULT_ACCOUNT_ID` points to an account not listed in `VDOCIPHER_ACCOUNT_IDS`.
- Upload succeeds but admin publishes before VdoCipher status is ready.
- VdoCipher player shows `Error 2138 Website not allowed for playback`; verify the active video's VdoCipher account allows the playback hostname and that `VDOCIPHER_PLAYBACK_WHITELIST_HREF`, the active request host, or the `NEXTAUTH_URL` fallback resolves to that same hostname.
- Evidence includes OTP or playbackInfo values, which should be redacted.
- A free account runs out of storage/quota; move the affected videos to the paid account and update the stored account/video IDs.

## 5. Zoom Meeting SDK From Zero

Purpose in this app:

- Authenticated users join Zoom through `/meeting`.
- Server generates SDK signatures through `/api/zoom/signature`.

Repo env vars:

```bash
ZOOM_MEETING_SDK_KEY=<ZOOM_MEETING_SDK_KEY>
ZOOM_MEETING_SDK_SECRET=<ZOOM_MEETING_SDK_SECRET>
NEXT_PUBLIC_ZOOM_MEETING_ID=<TEST_MEETING_ID>
NEXT_PUBLIC_ZOOM_PASSCODE=<TEST_MEETING_PASSCODE>
```

Steps:

1. Create or choose a Zoom account that owns the staging test meeting.
2. Create a Meeting SDK app in the Zoom App Marketplace or current Zoom developer portal.
3. Copy the Meeting SDK key and secret.
4. Add or allow the staging domain/origin for the SDK app if required by the Zoom app settings.
5. Create a recurring or durable staging test meeting owned by the same Zoom account.
6. Store meeting ID and passcode as public config for this app's current flow.
7. Put SDK key/secret in local `.env.local` and Vercel staging env.
8. Put meeting ID/passcode in local and staging env.

Validation:

```bash
npm run verify:services
```

Manual smoke:

1. Sign in as a learner.
2. Open `/meeting`.
3. Confirm the iframe loads and learner joins with role `0`.
4. Sign in as admin and verify role behavior according to server rules.
5. Confirm `ZOOM_MEETING_SDK_SECRET` is never sent to the browser.

Common failure points:

- SDK credentials belong to a different Zoom account than the meeting.
- Staging domain is not allowed.
- Old JWT-era credentials are used instead of current Meeting SDK credentials.
- Meeting ID/passcode were cancelled or regenerated.

## 6. Upstash Redis From Zero

Purpose in this app:

- Cache.
- Rate limiting.
- System mode.
- Session revocation checks.

Repo env vars:

```bash
UPSTASH_REDIS_REST_URL=<UPSTASH_REDIS_REST_URL>
UPSTASH_REDIS_REST_TOKEN=<UPSTASH_REDIS_REST_TOKEN>
```

Steps:

1. Create an Upstash account.
2. Create a Redis database.
3. Choose the primary region closest to the Vercel staging region/users.
4. Open the database REST API section.
5. Copy the REST URL and REST token.
6. Store them in the password manager.
7. Add them to local `.env.local` and Vercel staging env.

Validation:

```bash
npm run verify:services:strict
```

Manual smoke:

1. Submit support tickets until rate limit behavior can be observed.
2. Test session revocation or system-mode features in staging.
3. Confirm no Redis token is printed in logs.

Common failure points:

- Using Redis TCP URL instead of Upstash REST URL.
- Token belongs to a deleted database.
- Vercel env was updated but staging was not redeployed.

## 7. Azure Blob Storage From Zero

Purpose in this app:

- Source/input video storage.
- Axinom input/output containers.
- Upload and processing support.

Repo env vars:

```bash
AZURE_STORAGE_ACCOUNT=<ACCOUNT_NAME>
AZURE_STORAGE_KEY=<ACCOUNT_KEY>
AZURE_VIDEO_INPUT_CONTAINER=<INPUT_CONTAINER_NAME>
AZURE_VIDEO_OUTPUT_CONTAINER=<OUTPUT_CONTAINER_NAME>
```

Steps:

1. Create an Azure account/subscription if needed.
2. Create a new StorageV2/general-purpose storage account.
3. Choose a region appropriate for Axinom/Vercel usage.
4. Create input and output blob containers.
5. Keep container public access disabled unless a documented playback path requires otherwise.
6. Copy one active storage account key or create a more restricted credential path if the app is later changed to support it.
7. Configure Blob service CORS for `<LOCAL_ORIGIN>` and `<STAGING_ORIGIN>` when browser-origin access is required.
8. Store account name/key/container names in the password manager.
9. Add env values to `.env.local` and Vercel staging env.

Example Azure CLI CORS shape:

```bash
az storage account blob-service-properties cors-rule add \
  --account-name <AZURE_STORAGE_ACCOUNT> \
  --resource-group <RESOURCE_GROUP> \
  --allowed-origins <STAGING_ORIGIN> \
  --allowed-methods GET PUT POST OPTIONS \
  --allowed-headers "*" \
  --exposed-headers "*" \
  --max-age 3600
```

Validation:

```bash
npm run verify:services:strict
```

Manual smoke:

1. Confirm upload/input container is reachable by the app flow.
2. Confirm Axinom can read input and write output.
3. Confirm staging browser CORS behavior where relevant.

Common failure points:

- CORS configured on the wrong Azure service.
- Container names differ from env values.
- Old account key was rotated or cancelled.

## 8. Cloudflare R2/S3-Compatible Storage From Zero

Purpose in this app:

- HLS/playback object reads through S3-compatible API.
- Optional public asset base for playback.

Repo env vars:

```bash
R2_ENDPOINT=<R2_S3_API_ENDPOINT>
R2_ACCESS_KEY_ID=<R2_ACCESS_KEY_ID>
R2_SECRET_ACCESS_KEY=<R2_SECRET_ACCESS_KEY>
R2_BUCKET=<R2_BUCKET_NAME>
R2_PREFIX=<OPTIONAL_PREFIX>
NEXT_PUBLIC_ASSET_BASE=<PUBLIC_OR_APP_ROUTE_ASSET_BASE>
```

Steps:

1. Create a Cloudflare account if needed.
2. Enable R2.
3. Create a bucket for staging playback assets.
4. Create an R2 API token for S3 clients with the minimum bucket scope needed.
5. Copy Access Key ID, Secret Access Key, and S3 API endpoint.
6. Configure CORS for `<LOCAL_ORIGIN>` and `<STAGING_ORIGIN>` if browser-origin access is used.
7. Decide whether assets are accessed through app routes, signed URLs, or a public/custom domain.
8. Set `NEXT_PUBLIC_ASSET_BASE` only to browser-safe public configuration.
9. Store credentials in the password manager.
10. Add env values to `.env.local` and Vercel staging env.

Validation:

```bash
npm run verify:services:strict
```

Manual smoke:

1. Upload or sync a known test HLS asset.
2. Open `/api/hls/playlist/<videoId>` as an entitled user.
3. Confirm non-entitled users are denied.
4. Confirm R2 secret key is not visible in browser/network evidence.

Common failure points:

- Endpoint includes the bucket when the SDK expects account endpoint shape.
- Token scope does not include the bucket.
- Public asset base exposes objects that should be served only through app authorization.

## 9. SMTP Provider From Zero

Purpose in this app:

- Support ticket notifications.

Repo env vars:

```bash
SMTP_HOST=<SMTP_HOST>
SMTP_PORT=<SMTP_PORT>
SMTP_SECURE=<true_OR_false>
SMTP_USER=<SMTP_USERNAME>
SMTP_PASS=<SMTP_PASSWORD_OR_API_KEY>
SMTP_FROM=<FROM_ADDRESS>
ADMIN_EMAIL=<SUPPORT_RECIPIENT>
```

Steps:

1. Choose an email provider that supports SMTP, such as Google Workspace SMTP relay, SendGrid SMTP, Mailgun SMTP, Amazon SES SMTP, or another institute-approved provider.
2. Create or verify the sender domain/address.
3. Configure SPF/DKIM/DMARC according to the provider's official docs.
4. Create SMTP credentials or an SMTP API key.
5. Record host, port, TLS mode, username, password/API key, sender, and admin recipient.
6. Store credentials in the password manager.
7. Add env values to `.env.local` and Vercel staging env.

Recommended SMTP settings pattern:

| Variable | Meaning |
|----------|---------|
| `SMTP_HOST` | Provider SMTP hostname. |
| `SMTP_PORT` | Usually `465` for implicit TLS or `587` for STARTTLS. |
| `SMTP_SECURE` | `true` for port `465`; commonly `false` for port `587` with STARTTLS. |
| `SMTP_USER` | Provider username or fixed value such as `apikey`, depending on provider. |
| `SMTP_PASS` | Provider password or API key. |
| `SMTP_FROM` | Verified sender address. |
| `ADMIN_EMAIL` | Support ticket recipient. |

Validation:

```bash
npm run verify:services:strict
```

Manual smoke:

1. Submit a support ticket as a signed-in staging user.
2. Confirm ticket is persisted.
3. Confirm email notification is sent or provider block is recorded.
4. Confirm SMTP secret is not logged.

Common failure points:

- Sender address is not verified.
- Provider blocks new accounts until domain authentication is complete.
- Wrong TLS mode for port.
- API key was cancelled or copied into the wrong env var.

## 10. Google reCAPTCHA From Zero

Purpose in this app:

- Support ticket spam protection.

Repo env vars:

```bash
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<RECAPTCHA_SITE_KEY>
RECAPTCHA_SECRET_KEY=<RECAPTCHA_SECRET_KEY>
```

Steps:

1. Open Google Cloud reCAPTCHA.
2. Create a website key.
3. Choose the key type expected by the current app flow. The current UI uses the checkbox-style challenge flow, so use a v2/challenge-compatible key unless the app code is changed.
4. Add domains:
   - Localhost/local test domain if needed.
   - Staging domain.
   - Production domain later.
5. Copy site key and secret key.
6. Store the secret key in the password manager.
7. Add the site key to browser-public env and the secret key to server-only env.

Validation:

```bash
npm run verify:services:strict
```

Manual smoke:

1. Open support dialog.
2. Complete reCAPTCHA.
3. Submit a test ticket.
4. Confirm failed/missing reCAPTCHA gives a safe error.

Common failure points:

- Domain missing from reCAPTCHA key settings.
- v3 key used while app renders explicit checkbox flow.
- Site key and secret key swapped.

## 11. Sentry From Zero

Purpose in this app:

- Client/server/edge error capture.
- Staging failure context.

Repo env vars:

```bash
SENTRY_DSN=<SENTRY_DSN>
NEXT_PUBLIC_SENTRY_DSN=<SENTRY_DSN_IF_USED_BY_CLIENT_CONFIG>
```

Steps:

1. Create a Sentry account or organization if needed.
2. Create a project for this Next.js app.
3. Choose JavaScript/Next.js setup in Sentry.
4. Copy the project DSN.
5. Configure staging environment tagging in Sentry and/or app config.
6. Review Sentry sensitive data scrubbing settings.
7. Add DSN values to local `.env.local` and Vercel staging env.
8. Do not put auth tokens or source-map upload tokens into docs or client env unless explicitly needed and understood.

Validation:

```bash
npm run verify:services
```

Manual smoke:

1. Trigger a controlled staging error.
2. Confirm event appears in Sentry with staging context.
3. Confirm no raw secrets, tokens, full emails, database URLs, or key material appear.

Common failure points:

- DSN configured for the wrong project/environment.
- Sensitive data scrubbing is not enabled.
- Client/server/edge configs drift from each other.

## 12. Vercel Staging Env Entry

After every provider is configured:

1. Open the Vercel project.
2. Add all values from this guide to the Preview or Custom Environment used for staging.
3. Keep secrets encrypted in Vercel env settings.
4. Redeploy staging after changing env vars.
5. Run strict verification when credentials are available:

```bash
npm run verify:services:strict
npm run verify:axinom -- --strict
npm run verify:staging
```

6. Complete:
   - `docs/staging-smoke-checklist.md`
   - `docs/operations/health-checklist.md`
   - `docs/manual-testing-guide.md`

## 13. Final Provider Readiness Table

| Provider | Account Created | Env Added Locally | Env Added To Vercel | Smoke Passed | Notes |
|----------|-----------------|-------------------|---------------------|--------------|-------|
| Google OAuth | not run | not run | not run | not run | |
| Axinom DRM/Encoding | not run | not run | not run | not run | |
| VdoCipher upload/playback | not run | not run | not run | not run | |
| Zoom Meeting SDK | not run | not run | not run | not run | |
| Upstash Redis | not run | not run | not run | not run | |
| Azure Blob Storage | not run | not run | not run | not run | |
| Cloudflare R2/S3 | not run | not run | not run | not run | |
| SMTP Provider | not run | not run | not run | not run | |
| Google reCAPTCHA | not run | not run | not run | not run | |
| Sentry | not run | not run | not run | not run | |
