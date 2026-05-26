# Environment Matrix

This matrix is the source of truth for environment variables used by the platform. `.env.example` is a placeholder-only starter; real values belong in local `.env.local` or the staging host's encrypted environment settings.

`NEXT_PUBLIC_` variables are bundled into browser code by Next.js and must be treated as public configuration, not secrets.

| Service | Variable | Sensitivity | Local | Staging | Source | Notes |
|---------|----------|-------------|-------|---------|--------|-------|
| Database | DATABASE_URL | server secret | required | required | prisma/schema.prisma | MongoDB connection string used by Prisma; never commit a real value. |
| Auth | NEXTAUTH_URL | public | required | required | src/lib/auth.ts | Base application URL for NextAuth callbacks. |
| Auth | NEXTAUTH_SECRET | server secret | required | required | src/lib/auth.ts | NextAuth signing/encryption secret for sessions and tokens. |
| Auth | AUTH_SECRET | server secret | optional | required | jest.setup.ts | Legacy/auth alias used by existing setup and tests; keep aligned with auth docs. |
| Auth | GOOGLE_CLIENT_ID | public | required | required | src/lib/auth.ts | Google OAuth client identifier. |
| Auth | GOOGLE_CLIENT_SECRET | server secret | required | required | src/lib/auth.ts | Google OAuth client secret. |
| Redis | UPSTASH_REDIS_REST_URL | operational secret | optional | required | src/lib/redis.ts | Upstash REST endpoint for cache, rate limits, system mode, and revocation checks. |
| Redis | UPSTASH_REDIS_REST_TOKEN | server secret | optional | required | src/lib/redis.ts | Upstash REST token. |
| Redis | REDIS_URL | operational secret | optional | optional | .planning/codebase/STACK.md | Local Redis URL or legacy fallback for scripts/tests. |
| DoveRunner | DOVERUNNER_SITE_ID | operational secret | optional | required | src/lib/media-provider/doverunner-env.ts | DoveRunner Site ID used for Multi-DRM token generation and T&P API paths. |
| DoveRunner | DOVERUNNER_ACCESS_KEY | server secret | optional | required | src/lib/media-provider/doverunner-token.ts | Site access key used server-side to encrypt and hash DoveRunner license token policy. |
| DoveRunner | DOVERUNNER_LICENSE_URL | public | optional | required | src/lib/media-provider/doverunner-env.ts | DoveRunner Multi-DRM license URL used by Shaka playback. |
| DoveRunner | DOVERUNNER_TNP_ACCOUNT_ID | operational secret | optional | required | src/lib/media-provider/doverunner.ts | DoveRunner account email/ID for T&P token API Basic auth. |
| DoveRunner | DOVERUNNER_TNP_ACCESS_KEY | server secret | optional | required | src/lib/media-provider/doverunner.ts | DoveRunner T&P access key for token API Basic auth. |
| DoveRunner | DOVERUNNER_TNP_INPUT_STORAGE_ID | operational secret | optional | required | src/lib/media-provider/doverunner.ts | Registered DoveRunner T&P input storage ID for the AWS S3 source bucket. |
| DoveRunner | DOVERUNNER_TNP_OUTPUT_STORAGE_ID | operational secret | optional | required | src/lib/media-provider/doverunner.ts | Registered DoveRunner T&P output storage ID for the AWS S3 output bucket. |
| DoveRunner | DOVERUNNER_TNP_API_BASE_URL | public | optional | required | src/lib/media-provider/doverunner-env.ts | T&P API base URL; default is `https://tnp.doverunner.com`. |
| DoveRunner | DOVERUNNER_OUTPUT_BASE_URL | public | optional | required | src/lib/media-provider/doverunner-env.ts | CDN or HTTPS base URL for DoveRunner-packaged output objects in the AWS S3 output bucket. |
| DoveRunner | DOVERUNNER_DASH_MANIFEST_NAME | public | optional | optional | src/lib/media-provider/doverunner-env.ts | DASH manifest filename under each output path; default `manifest.mpd`. |
| DoveRunner | DOVERUNNER_HLS_MANIFEST_NAME | public | optional | optional | src/lib/media-provider/doverunner-env.ts | HLS manifest filename under each output path; default `master.m3u8`. |
| DoveRunner | DOVERUNNER_LICENSE_TOKEN_TTL_SECONDS | public | optional | optional | src/lib/media-provider/doverunner-env.ts | License token policy duration in seconds; default `300`. |
| DoveRunner | DOVERUNNER_FAIRPLAY_CERT_URL | operational secret | optional | optional | src/app/watch/[videoId]/page.tsx, src/app/api/drm/fairplay-cert/route.ts | FairPlay certificate URL used only when FairPlay playback is provisioned. |
| Storage | AWS_REGION | public | optional | required | src/lib/media-provider/aws-s3.ts | AWS region for the S3 input/output buckets registered in DoveRunner T&P. |
| Storage | AWS_S3_INPUT_BUCKET | operational secret | optional | required | src/lib/media-provider/aws-s3.ts | AWS S3 bucket where browser uploads source media before T&P processing. |
| Storage | AWS_S3_OUTPUT_BUCKET | operational secret | optional | required | scripts/verify-doverunner-setup.ts | AWS S3 bucket where DoveRunner T&P writes packaged DASH/HLS output. |
| Storage | AWS_ACCESS_KEY_ID | operational secret | optional | required | src/lib/media-provider/aws-s3.ts | AWS access key ID with least-privilege S3 access for upload presigning and optional live verification. |
| Storage | AWS_SECRET_ACCESS_KEY | server secret | optional | required | src/lib/media-provider/aws-s3.ts | AWS secret access key; never expose to browser code. |
| Zoom | ZOOM_MEETING_SDK_KEY | operational secret | optional | required | src/app/api/zoom/signature/route.ts | Zoom Meeting SDK key used server-side for signatures. |
| Zoom | ZOOM_MEETING_SDK_SECRET | server secret | optional | required | src/app/api/zoom/signature/route.ts | Zoom Meeting SDK secret; must never be exposed to browser code. |
| Support/Email/reCAPTCHA | SMTP_HOST | operational secret | optional | required | src/lib/email.ts | SMTP host for support notifications. |
| Support/Email/reCAPTCHA | SMTP_PORT | public | optional | required | src/lib/email.ts | SMTP port. |
| Support/Email/reCAPTCHA | SMTP_SECURE | public | optional | required | src/lib/email.ts | SMTP TLS mode. |
| Support/Email/reCAPTCHA | SMTP_USER | operational secret | optional | required | src/lib/email.ts | SMTP username. |
| Support/Email/reCAPTCHA | SMTP_PASS | server secret | optional | required | src/lib/email.ts | SMTP password. |
| Support/Email/reCAPTCHA | SMTP_FROM | public | optional | required | src/lib/email.ts | From address used for support emails. |
| Support/Email/reCAPTCHA | ADMIN_EMAIL | public | optional | required | src/lib/email.ts | Administrative support recipient. |
| Support/Email/reCAPTCHA | RECAPTCHA_SECRET_KEY | server secret | optional | required | src/app/api/support/route.ts | Server-side reCAPTCHA verification key. |
| Observability | SENTRY_DSN | operational secret | optional | optional | sentry.server.config.ts, sentry.edge.config.ts | Server/edge Sentry DSN; can identify the project and should be configured per environment. |
| Observability | NEXT_PUBLIC_SENTRY_DSN | public | optional | optional | sentry.client.config.ts | Browser-exposed Sentry DSN alias. Set only when client-side Sentry capture is required. |
| Public player/config | NEXT_PUBLIC_RECAPTCHA_SITE_KEY | public | optional | required | src/components/support | Browser-exposed reCAPTCHA site key. |
| Public player/config | NEXT_PUBLIC_ZOOM_MEETING_ID | public | optional | required | src/app/meeting | Browser-exposed meeting ID for the current staging meeting flow. |
| Public player/config | NEXT_PUBLIC_ZOOM_PASSCODE | public | optional | required | src/app/meeting | Browser-exposed Zoom passcode; do not treat as an access-control secret. |
| Public player/config | NEXT_PUBLIC_ASSET_BASE | public | optional | optional | src/components/video | Legacy browser-exposed playback asset base URL for static HLS flows. New DoveRunner videos store explicit DASH/HLS URLs per video. |

## Staging Validation

Use this matrix with `docs/vercel-staging-runbook.md` before accepting a Vercel Preview or Custom Environment deployment.

```bash
npm run verify:setup
npm run verify:services:strict
npm run verify:doverunner -- --live
npm run verify:staging
```

Staging-specific callback and origin values must be configured outside the repository:

| Service | Staging configuration item | Required value shape |
|---------|----------------------------|----------------------|
| Auth | Google OAuth redirect URI | `<STAGING_ORIGIN>/api/auth/callback/google` |
| Auth | NextAuth base URL | `NEXTAUTH_URL=<STAGING_ORIGIN>` |
| DoveRunner | T&P job API access | Site ID, account ID, access key, input storage ID, and output storage ID from DoveRunner Console |
| Zoom | Meeting SDK domain/origin allowlist | The exact staging origin or domain used by `/meeting` |
| Storage | AWS S3 CORS and bucket policy | Staging origin can PUT source uploads; DoveRunner can read input and write output; playback origin can read packaged output |
| Observability | Sentry environment | Staging project or staging environment tag with redaction enabled |

If real provider access is unavailable during setup, record the affected smoke row as `blocked: missing credentials/service access` in `docs/staging-smoke-checklist.md`.
