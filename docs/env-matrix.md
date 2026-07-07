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
| Tencent VOD | TENCENT_SECRET_ID | operational secret | optional | required | src/lib/tencent/env.ts | Tencent Cloud API secret ID for VOD OpenAPI calls. |
| Tencent VOD | TENCENT_SECRET_KEY | server secret | optional | required | src/lib/tencent/env.ts | Tencent Cloud API secret key; never print or expose to browser code. |
| Tencent VOD | TENCENT_VOD_PLAYBACK_KEY | server secret | optional | required | src/lib/tencent/env.ts | VOD playback key used to sign third-party Commercial DRM `DrmToken` values; never expose to browser code. |
| Tencent VOD | TENCENT_VOD_REGION | public | optional | required | src/lib/tencent/env.ts | Tencent VOD OpenAPI region, for example `ap-singapore`. |
| Tencent VOD | TENCENT_VOD_SUB_APP_ID | public | optional | optional | src/lib/tencent/env.ts | Optional VOD sub-application ID when the Tencent account uses sub-apps. |
| Tencent VOD | TENCENT_VOD_PROCEDURE_NAME | public | optional | required | src/lib/tencent/env.ts | Tencent VOD DRM processing procedure name for upload and processing tasks; should include Widevine plus SimpleAES/basic HLS Apple fallback output when FairPlay is unavailable. |
| Tencent VOD | TENCENT_VOD_WEBHOOK_SIGN_KEY | server secret | optional | required | src/lib/tencent/env.ts | Shared sign key used to verify Tencent VOD event callbacks. |
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
| Public player/config | NEXT_PUBLIC_ASSET_BASE | public | optional | optional | src/components/video | Optional browser-exposed asset base URL for non-provider assets. |
| Public player/config | NEXT_PUBLIC_TENCENT_WIDEVINE_LICENSE_URL | public | optional | required | src/lib/shaka-tencent.ts | Browser-exposed Tencent Widevine license URL used by Shaka. |
| Public player/config | NEXT_PUBLIC_TENCENT_FAIRPLAY_LICENSE_URL | public | optional | required | src/lib/shaka-tencent.ts | Browser-exposed Tencent FairPlay license URL used by Shaka when FairPlay is configured. |
| Public player/config | NEXT_PUBLIC_TENCENT_FAIRPLAY_CERT_URL | public | optional | optional | src/app/api/drm/fairplay-cert/route.ts | Browser-safe FairPlay certificate URL or endpoint. |

## Staging Validation

Use this matrix with `docs/vercel-staging-runbook.md` before accepting a Vercel Preview or Custom Environment deployment.

```bash
npm run verify:setup
npm run verify:services:strict
npm run verify:tencent -- --strict
npm run verify:staging
```

Staging-specific callback and origin values must be configured outside the repository:

| Service | Staging configuration item | Required value shape |
|---------|----------------------------|----------------------|
| Auth | Google OAuth redirect URI | `<STAGING_ORIGIN>/api/auth/callback/google` |
| Auth | NextAuth base URL | `NEXTAUTH_URL=<STAGING_ORIGIN>` |
| Tencent VOD | Webhook URL | `<STAGING_ORIGIN>/api/webhook/tencent` |
| Tencent VOD | Playback domain | Tencent VOD playback domain allowed for the course delivery origin |
| Tencent VOD | DRM processing procedure | Procedure named by `TENCENT_VOD_PROCEDURE_NAME` with Commercial DRM Widevine output and SimpleAES/basic HLS Apple fallback output when FairPlay is unavailable |
| Tencent VOD | License URLs | `NEXT_PUBLIC_TENCENT_WIDEVINE_LICENSE_URL`; FairPlay URL/certificate only when Safari FairPlay is enabled |
| Zoom | Meeting SDK domain/origin allowlist | The exact staging origin or domain used by `/meeting` |
| Observability | Sentry environment | Staging project or staging environment tag with redaction enabled |

If real provider access is unavailable during setup, record the affected smoke row as `blocked: missing credentials/service access` in `docs/staging-smoke-checklist.md`.
