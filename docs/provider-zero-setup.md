# Provider Account Setup From Zero

This guide is for rebuilding all external provider access after inherited accounts, keys, trials, or credentials were cancelled. It covers Google OAuth, Axinom DRM/Encoding, Zoom Meeting SDK, Upstash Redis, Azure Blob Storage, Cloudflare R2/S3-compatible storage, SMTP/reCAPTCHA, and Sentry.

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

Steps:

1. Create a new Axinom trial/evaluation account or tenant.
2. In Axinom DRM, create or locate the DRM communication key.
3. Store communication key ID and secret in the password manager.
4. Copy Widevine, PlayReady, and FairPlay license service URLs for the tenant/region.
5. Configure or copy the FairPlay certificate URL when FairPlay is used.
6. In Axinom Encoding/Video Service, create service credentials for API access.
7. Create or configure encoding profiles:
   - DRM output profile.
   - Clear output profile if the app keeps a clear fallback flow.
8. Configure storage input/output connections according to the Azure containers used by this app.
9. Configure the Axinom webhook URL as `<STAGING_ORIGIN>/api/webhook/axinom`.
10. Generate a new webhook shared secret and put it in `AXINOM_WEBHOOK_SECRET`.
11. Put public license URLs into `NEXT_PUBLIC_AX_*` variables.
12. Put secrets only into local `.env.local` and Vercel encrypted env settings.

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

## 4. Zoom Meeting SDK From Zero

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

## 5. Upstash Redis From Zero

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

## 6. Azure Blob Storage From Zero

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

## 7. Cloudflare R2/S3-Compatible Storage From Zero

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

## 8. SMTP Provider From Zero

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

## 9. Google reCAPTCHA From Zero

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

## 10. Sentry From Zero

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

## 11. Vercel Staging Env Entry

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

## 12. Final Provider Readiness Table

| Provider | Account Created | Env Added Locally | Env Added To Vercel | Smoke Passed | Notes |
|----------|-----------------|-------------------|---------------------|--------------|-------|
| Google OAuth | not run | not run | not run | not run | |
| Axinom DRM/Encoding | not run | not run | not run | not run | |
| Zoom Meeting SDK | not run | not run | not run | not run | |
| Upstash Redis | not run | not run | not run | not run | |
| Azure Blob Storage | not run | not run | not run | not run | |
| Cloudflare R2/S3 | not run | not run | not run | not run | |
| SMTP Provider | not run | not run | not run | not run | |
| Google reCAPTCHA | not run | not run | not run | not run | |
| Sentry | not run | not run | not run | not run | |
