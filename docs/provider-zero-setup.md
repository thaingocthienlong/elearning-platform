# Provider Zero Setup

This guide is for rebuilding external provider access after inherited accounts, keys, trials, or credentials were cancelled. It covers Google OAuth, Tencent VOD Commercial DRM, Zoom Meeting SDK, Upstash Redis, SMTP/reCAPTCHA, Sentry, and Vercel staging env entry.

Do not paste real secrets, tokens, service account values, database URLs, certificates, media keys, webhook sign keys, or full user emails into this repository.

## Official References

- Google OAuth web server flow: https://developers.google.com/identity/protocols/oauth2/web-server
- Tencent VOD product docs: https://cloud.tencent.com/document/product/266
- Tencent VOD ApplyUpload API: https://cloud.tencent.com/document/api/266/31767
- Tencent VOD ProcessMedia API: https://cloud.tencent.com/document/api/266/32586
- Tencent third-party DRM playback: https://cloud.tencent.com/document/product/266/103885
- Tencent VOD event notifications: https://cloud.tencent.com/document/product/266/55244
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

Create or select a Tencent Cloud account with VOD and Commercial DRM enabled. Configure a VOD application, playback domain, DRM-capable procedure/template, and event notification endpoint:

```text
https://<staging-domain>/api/webhook/tencent
```

Store only placeholder names in repo docs. Store real values in a password manager and in encrypted local/staging env:

```env
TENCENT_SECRET_ID=<tencent-secret-id>
TENCENT_SECRET_KEY=<tencent-secret-key>
TENCENT_VOD_REGION=<vod-region>
TENCENT_VOD_SUB_APP_ID=<optional-sub-app-id>
TENCENT_VOD_PROCEDURE_NAME=<drm-procedure-name>
TENCENT_VOD_WEBHOOK_SIGN_KEY=<webhook-sign-key>
NEXT_PUBLIC_TENCENT_WIDEVINE_LICENSE_URL=<widevine-license-url>
NEXT_PUBLIC_TENCENT_FAIRPLAY_LICENSE_URL=<fairplay-license-url>
NEXT_PUBLIC_TENCENT_FAIRPLAY_CERT_URL=<fairplay-certificate-url>
```

Validation:

```bash
npm run verify:tencent -- --strict
```

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
