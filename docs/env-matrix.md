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
| Axinom | AXINOM_COM_KEY_ID | operational secret | optional | required | src/lib/axinom.ts | Axinom DRM communication key identifier. |
| Axinom | AXINOM_COM_KEY_SECRET | server secret | optional | required | src/lib/axinom.ts | Axinom DRM communication key secret. |
| Axinom | AXINOM_ENCODING_CLIENT_ID | operational secret | optional | required | src/lib/axinom-video-service.ts | Axinom Encoding API client identifier. |
| Axinom | AXINOM_ENCODING_CLIENT_SECRET | server secret | optional | required | src/lib/axinom-video-service.ts | Axinom Encoding API client secret. |
| Axinom | AXINOM_ENCODING_PROFILE_DRM | operational secret | optional | required | src/lib/axinom-video-service.ts | Axinom encoding profile ID for DRM output. |
| Axinom | AXINOM_ENCODING_PROFILE_CLEAR | operational secret | optional | required | src/lib/axinom-video-service.ts | Axinom encoding profile ID required for the clear HLS fallback on Apple browsers. New video uploads fail processing when this is missing. |
| Axinom | AXINOM_ENCODING_API_URL | public | optional | required | src/lib/axinom-env.ts | Axinom Encoding API base URL; default examples use the EU endpoint. Legacy alias `AX_ENCODING_BASE` is local-only compatibility. |
| Axinom | AXINOM_VIDEO_SERVICE_URL | operational secret | optional | required | src/lib/axinom-video-service.ts | Axinom video service API base URL. |
| Axinom | AXINOM_WEBHOOK_SECRET | server secret | optional | required | src/app/api/axinom/webhook/route.ts | Shared secret for Axinom webhook verification. |
| Axinom | AXINOM_FAIRPLAY_CERT_URL | operational secret | optional | required | src/server/axinom.ts | FairPlay certificate URL used by player integration. |
| Storage | AZURE_STORAGE_ACCOUNT | operational secret | optional | required | src/lib/azure-storage.ts | Azure Blob account for upload/input/output containers. |
| Storage | AZURE_STORAGE_KEY | server secret | optional | required | src/lib/azure-storage.ts | Azure Blob account key. |
| Storage | AZURE_VIDEO_INPUT_CONTAINER | operational secret | optional | required | src/lib/azure-storage.ts | Azure input container for source media. |
| Storage | AZURE_VIDEO_OUTPUT_CONTAINER | operational secret | optional | required | src/lib/azure-storage.ts | Azure output container for encoded assets. |
| Storage | R2_ENDPOINT | operational secret | optional | required | src/lib/r2.ts | Cloudflare R2 or S3-compatible endpoint. |
| Storage | R2_ACCESS_KEY_ID | operational secret | optional | required | src/lib/r2.ts | R2 access key ID. |
| Storage | R2_SECRET_ACCESS_KEY | server secret | optional | required | src/lib/r2.ts | R2 secret access key. |
| Storage | R2_BUCKET | operational secret | optional | required | src/lib/r2.ts | R2 bucket containing playback assets. |
| Storage | R2_PREFIX | public | optional | optional | src/lib/r2.ts | Optional asset key prefix; safe only when it does not disclose private naming. |
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
| Observability | SENTRY_DSN | operational secret | optional | optional | sentry.client.config.ts | Sentry DSN; can identify the project and should be configured per environment. |
| Public player/config | NEXT_PUBLIC_RECAPTCHA_SITE_KEY | public | optional | required | src/components/support | Browser-exposed reCAPTCHA site key. |
| Public player/config | NEXT_PUBLIC_ZOOM_MEETING_ID | public | optional | required | src/app/meeting | Browser-exposed meeting ID for the current staging meeting flow. |
| Public player/config | NEXT_PUBLIC_ZOOM_PASSCODE | public | optional | required | src/app/meeting | Browser-exposed Zoom passcode; do not treat as an access-control secret. |
| Public player/config | NEXT_PUBLIC_ASSET_BASE | public | optional | required | src/components/video | Browser-exposed playback asset base URL. |
| Public player/config | NEXT_PUBLIC_AX_WV_LS_URL | public | optional | required | src/hooks/player/useShakaPlayer.ts | Browser-exposed Axinom Widevine license service URL. |
| Public player/config | NEXT_PUBLIC_AX_PR_LS_URL | public | optional | required | src/hooks/player/useShakaPlayer.ts | Browser-exposed Axinom PlayReady license service URL. |
| Public player/config | NEXT_PUBLIC_AX_FP_LS_URL | public | optional | required | src/hooks/player/useShakaPlayer.ts | Browser-exposed Axinom FairPlay license service URL. |

## Staging Validation

Use this matrix with `docs/vercel-staging-runbook.md` before accepting a Vercel Preview or Custom Environment deployment.

```bash
npm run verify:setup
npm run verify:services:strict
npm run verify:axinom -- --strict
npm run verify:staging
```

Staging-specific callback and origin values must be configured outside the repository:

| Service | Staging configuration item | Required value shape |
|---------|----------------------------|----------------------|
| Auth | Google OAuth redirect URI | `<STAGING_ORIGIN>/api/auth/callback/google` |
| Auth | NextAuth base URL | `NEXTAUTH_URL=<STAGING_ORIGIN>` |
| Axinom | Webhook URL | `<STAGING_ORIGIN>/api/webhook/axinom` |
| Zoom | Meeting SDK domain/origin allowlist | The exact staging origin or domain used by `/meeting` |
| Storage | Azure Blob CORS | Staging origin allowed where browser upload/output reads are required |
| Storage | Cloudflare R2/S3 CORS and asset origin | Staging origin and `NEXT_PUBLIC_ASSET_BASE` aligned with the playback bucket/prefix |
| Observability | Sentry environment | Staging project or staging environment tag with redaction enabled |

If real provider access is unavailable during setup, record the affected smoke row as `blocked: missing credentials/service access` in `docs/staging-smoke-checklist.md`.
