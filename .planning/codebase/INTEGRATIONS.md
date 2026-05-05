# External Integrations

**Analysis Date:** 2026-05-05

## APIs & External Services

**DRM & Video Encoding:**
- Axinom DRM entitlement service - Generates license entitlement JWTs for encrypted playback.
  - SDK/Client: `jsonwebtoken` in `src/lib/axinom.ts`
  - Auth: `AXINOM_COM_KEY_ID`, `AXINOM_COM_KEY_SECRET`
- Axinom Identity GraphQL - Authenticates service accounts for Axinom Video Service.
  - SDK/Client: native `fetch` in `src/lib/axinom-video-service.ts`, `src/app/api/webhook/axinom/route.ts`, and `src/server/axinom.ts`
  - Auth: `AXINOM_ENCODING_CLIENT_ID`, `AXINOM_ENCODING_CLIENT_SECRET`, `AX_CLIENT_ID`, `AX_CLIENT_SECRET`
- Axinom Video Service GraphQL - Starts encoding jobs and fetches encoded video details.
  - SDK/Client: native `fetch` in `src/lib/axinom-video-service.ts`, `src/lib/axinom-sync.ts`, and `src/app/api/webhook/axinom/route.ts`
  - Auth: Bearer token returned by Axinom Identity
- Axinom Encoding REST API - Legacy/direct encoding job creation and polling.
  - SDK/Client: native `fetch` in `src/lib/axinom-encoding.ts` and `src/server/axinom.ts`
  - Auth: `AXINOM_ENCODING_CLIENT_ID`, `AXINOM_ENCODING_CLIENT_SECRET`, `AXINOM_ENCODING_API_URL`, `AX_ID_AUTH`, `AX_ENCODING_BASE`
- Axinom/FairPlay certificate URL - Serves FairPlay certs to clients.
  - SDK/Client: native `fetch` in `src/app/api/drm/fairplay-cert/route.ts`
  - Auth: `AXINOM_FAIRPLAY_CERT_URL`
- Axinom Key Server Management / WidevineProtectionInfo - Local DRM key acquisition and optional KID validation.
  - SDK/Client: native `fetch` in `scripts/drm/get-wv-keys.mjs` and `src/server/axinom.ts`
  - Auth: `MOSAIC_KEY_SIGNING_KEY`, `MOSAIC_KEY_SIGNING_IV`, `MOSAIC_KEY_PROVIDER_NAME`, `AX_KS_BASE`, `AX_KS_TENANT_ID`, `AX_KS_MANAGEMENT_KEY`

**Storage & Media Delivery:**
- Azure Blob Storage - Upload SAS generation, Axinom input/output storage, CORS setup, and manifest URL construction.
  - SDK/Client: `@azure/storage-blob` in `src/lib/azure-storage.ts`, `scripts/fix-azure-cors.ts`, and `scripts/verify-azure-storage.ts`
  - Auth: `AZURE_STORAGE_ACCOUNT`, `AZURE_STORAGE_KEY`
- Cloudflare R2 / S3-compatible object storage - S3 client wrapper and HLS object reads.
  - SDK/Client: `@aws-sdk/client-s3` in `src/lib/r2.ts` and `src/app/api/hls/playlist/[videoId]/route.ts`
  - Auth: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PREFIX`
- AWS KMS-compatible key management - Content key generation and decryption.
  - SDK/Client: `@aws-sdk/client-kms` in `src/lib/kms.ts`
  - Auth: `AWS_REGION`, `KMS_KEY_ALIAS`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- Shaka Packager CLI - Local DASH/HLS encryption/package generation.
  - SDK/Client: external `packager` binary invoked by `scripts/drm/package-dash.mjs` and `scripts/drm/package-hls.mjs`
  - Auth: local key file argument such as `keys.json`; key files are sensitive and ignored by `.gitignore`

**Playback & Meetings:**
- Shaka Player - Browser playback for DASH/HLS and DRM license/certificate flows.
  - SDK/Client: `shaka-player` in `src/hooks/player/useShakaPlayer.ts` and `src/components/video/Player.tsx`
  - Auth: app session plus DRM token API at `src/app/api/drm/token/route.ts`
- Zoom Meeting SDK - Meeting page and SDK signature flow.
  - SDK/Client: `@zoom/meetingsdk` in root `package.json` and Zoom sample packages under `zoom-webapp/`
  - Auth: `ZOOM_MEETING_SDK_KEY`, `ZOOM_MEETING_SDK_SECRET`, `NEXT_PUBLIC_ZOOM_MEETING_ID`, `NEXT_PUBLIC_ZOOM_PASSCODE`
- Mux Player - Package dependency available for media player components.
  - SDK/Client: `@mux/mux-player`, `@mux/mux-player-react` in `package.json`
  - Auth: Not detected in source usage

**Security & Support:**
- Google OAuth - Login provider for whitelisted users.
  - SDK/Client: `next-auth/providers/google` in `src/lib/auth.ts`
  - Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Google reCAPTCHA - Support ticket spam protection.
  - SDK/Client: browser script loaded in `src/components/support/SubmitTicketForm.tsx`; server verification with native `fetch` in `src/app/api/support/ticket/route.ts`
  - Auth: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`
- SMTP email - Admin support ticket notifications.
  - SDK/Client: `nodemailer` in `src/lib/email.ts`
  - Auth: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `ADMIN_EMAIL`

**Observability & Hosting:**
- Sentry - Browser, server, and edge error tracking plus session replay.
  - SDK/Client: `@sentry/nextjs` in `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`, `src/app/error.tsx`, and `src/app/global-error.tsx`
  - Auth: `NEXT_PUBLIC_SENTRY_DSN`
- Vercel Analytics and Speed Insights - Frontend analytics/performance.
  - SDK/Client: `@vercel/analytics/react` and `@vercel/speed-insights/next` in `src/app/layout.tsx`
  - Auth: Vercel project configuration

## Data Storage

**Databases:**
- MongoDB via Prisma
  - Connection: `DATABASE_URL`
  - Client: `@prisma/client` singleton in `src/lib/prisma.ts`
  - Schema: `prisma/schema.prisma`
  - Models: `User`, `Account`, `Session`, `Course`, `Enrollment`, `Video`, `WatchRecord`, `AllowedEmail`, `Ticket`, `VideoAccess`, `SecurityEvent`, `DRMSession`, `WatermarkSettings`, `RevokedSession`
- PostgreSQL
  - Connection: README mentions `DATABASE_URL` as PostgreSQL in `README.md`
  - Client: Not implemented in current Prisma schema; `prisma/schema.prisma` uses `provider = "mongodb"`

**File Storage:**
- Azure Blob Storage - Primary upload and Axinom input/output storage in `src/lib/azure-storage.ts`.
- Cloudflare R2 / S3-compatible storage - R2 client and bucket prefix config in `src/lib/r2.ts`; HLS route reads objects in `src/app/api/hls/playlist/[videoId]/route.ts`.
- Local filesystem - DRM packaging scripts read local key/video files and write `out/cenc` / `out/fp` in `scripts/drm/package-dash.mjs` and `scripts/drm/package-hls.mjs`.

**Caching:**
- Upstash Redis REST
  - Connection: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - Client: `@upstash/redis` in `src/lib/redis.ts`, `src/middleware.ts`, `src/lib/session-revocation.ts`, and `src/app/api/session/events/route.ts`
  - Uses: course/data caching, cache invalidation, system mode key `config:system_mode`, revoked-session lookup, and SSE/session helpers.

## Authentication & Identity

**Auth Provider:**
- NextAuth.js with Google OAuth and Prisma Adapter
  - Implementation: `src/lib/auth.ts` configures `GoogleProvider`, `PrismaAdapter(prisma)`, database sessions, custom sign-in page `/auth/signin`, whitelist checks via `AllowedEmail`, soft-delete restoration, and single-device session revocation.
  - Route: `src/app/api/auth/[...nextauth]/route.ts`
  - Session storage: Prisma `Session` model in `prisma/schema.prisma`
  - Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`

**Authorization:**
- Role-based access uses `User.role` enum in `prisma/schema.prisma`; server routes check `session.user.role`, for example `src/app/api/upload/presigned/route.ts` and `src/app/api/video/process/route.ts`.
- Middleware protects `/admin`, `/api/drm`, `/api/hls`, and `/meeting` by checking NextAuth session cookies in `src/middleware.ts`.
- Video access combines `VideoAccess`, `Enrollment`, and `Course.accessType` checks in `src/app/api/drm/token/route.ts` and `src/app/api/drm/license/route.ts`.

## Monitoring & Observability

**Error Tracking:**
- Sentry is configured for client, server, and edge runtimes.
  - Client config: `sentry.client.config.ts`
  - Server config: `sentry.server.config.ts`
  - Edge config: `sentry.edge.config.ts`
  - Runtime loader: `instrumentation.ts`
  - Error capture: `src/app/error.tsx`, `src/app/global-error.tsx`

**Logs:**
- Application logs use `console.log`, `console.warn`, and `console.error` throughout API routes and helpers, including `src/lib/redis.ts`, `src/lib/email.ts`, `src/app/api/video/process/route.ts`, and `src/app/api/webhook/axinom/route.ts`.
- Client console logs are captured for support tickets through `src/components/ConsoleLoggerInit.tsx`, `src/lib/console-logger.ts`, and `Ticket.consoleLogs` in `prisma/schema.prisma`.
- Vercel Analytics and Speed Insights are mounted in `src/app/layout.tsx`.
- Admin analytics/error/security pages read persisted application data through API routes under `src/app/api/admin/`.

## CI/CD & Deployment

**Hosting:**
- Vercel
  - Config: `vercel.json` sets `"framework": "nextjs"`.
  - Runtime: Next.js App Router and Vercel packages in `package.json`.
  - Analytics: `@vercel/analytics` and `@vercel/speed-insights` in `src/app/layout.tsx`.

**CI Pipeline:**
- Not detected.
- No GitHub Actions, GitLab CI, CircleCI, Azure Pipelines, or root CI config files were detected during the scan.

## Environment Configuration

**Required env vars:**
- Database/auth: `DATABASE_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Redis/rate limiting: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Azure Blob: `AZURE_STORAGE_ACCOUNT`, `AZURE_STORAGE_KEY`, `AZURE_VIDEO_INPUT_CONTAINER`, `AZURE_VIDEO_OUTPUT_CONTAINER`
- R2/S3: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PREFIX`
- AWS KMS: `AWS_REGION`, `KMS_KEY_ALIAS`
- Axinom DRM/encoding: `AXINOM_COM_KEY_ID`, `AXINOM_COM_KEY_SECRET`, `AXINOM_ENCODING_CLIENT_ID`, `AXINOM_ENCODING_CLIENT_SECRET`, `AXINOM_ENCODING_PROFILE_DRM`, `AXINOM_ENCODING_PROFILE_CLEAR`, `AXINOM_ENCODING_API_URL`, `AXINOM_VIDEO_SERVICE_URL`, `AXINOM_WEBHOOK_SECRET`, `AXINOM_FAIRPLAY_CERT_URL`
- Legacy/server Axinom script config: `AX_ID_AUTH`, `AX_CLIENT_ID`, `AX_CLIENT_SECRET`, `AX_ENCODING_BASE`, `AX_PROFILE_ID`, `AX_BLOB_ACCOUNT`, `AX_INPUT_CONTAINER`, `AX_INPUT_ROOT`, `AX_OUTPUT_CONTAINER`, `AX_OUTPUT_ROOT`, `AX_STORAGE_ACCOUNT_KEY`, `AX_KS_BASE`, `AX_KS_TENANT_ID`, `AX_KS_MANAGEMENT_KEY`, `AX_VALIDATE_KIDS`
- Mosaic key scripts: `MOSAIC_KEY_SIGNING_KEY`, `MOSAIC_KEY_SIGNING_IV`, `MOSAIC_KEY_PROVIDER_NAME`
- Zoom: `ZOOM_MEETING_SDK_KEY`, `ZOOM_MEETING_SDK_SECRET`, `NEXT_PUBLIC_ZOOM_MEETING_ID`, `NEXT_PUBLIC_ZOOM_PASSCODE`
- Support/email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `ADMIN_EMAIL`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`
- Observability: `NEXT_PUBLIC_SENTRY_DSN`
- Public DRM player URLs: `NEXT_PUBLIC_AX_WV_LS_URL`, `NEXT_PUBLIC_AX_PR_LS_URL`, `NEXT_PUBLIC_AX_FP_LS_URL`, `NEXT_PUBLIC_DRM_LICENSE_URL`

**Secrets location:**
- Runtime secrets are expected in environment variables accessed through `process.env`.
- Root env files exist: `mosaic-service-account-config.env`, `mosaic-service-account-config (1).env`, `mosaic-service-account-config (2).env`, and `packager.env`; contents were not read.
- Sensitive root key/media artifacts exist and are ignored by `.gitignore`: `keys.json`, `KIDs.json`, `keys.cpix.xml`, `cert.der.b64`, `wv_pssh.hex`, and media files.
- `.gitignore` ignores `.env*`, `mosaic-service-account-config*.env`, `keys.json`, `KIDs.json`, `job.json`, `*.hex`, `*.der.b64`, and `*.cpix.xml`.

## Webhooks & Callbacks

**Incoming:**
- `POST /api/webhook/axinom` - Receives Axinom `VideoEncodingFinished` events, verifies `x-mosaic-signature` HMAC with `AXINOM_WEBHOOK_SECRET`, fetches video details from Axinom, and updates `Video` records in `src/app/api/webhook/axinom/route.ts`.
- `POST /api/support/ticket` - Receives support tickets and reCAPTCHA tokens from `src/components/support/SubmitTicketForm.tsx`; verifies with Google reCAPTCHA and sends optional SMTP notification in `src/app/api/support/ticket/route.ts`.
- NextAuth OAuth callbacks are handled by `src/app/api/auth/[...nextauth]/route.ts`.

**Outgoing:**
- Axinom Identity and Video Service calls from `src/lib/axinom-video-service.ts`, `src/lib/axinom-encoding.ts`, `src/lib/axinom-sync.ts`, `src/server/axinom.ts`, and `src/app/api/webhook/axinom/route.ts`.
- Azure Blob SAS generation and service property updates from `src/lib/azure-storage.ts` and `scripts/fix-azure-cors.ts`.
- Google reCAPTCHA verification from `src/app/api/support/ticket/route.ts`.
- SMTP messages from `src/lib/email.ts`.
- Zoom SDK signatures returned by `src/app/api/zoom/signature/route.ts`.
- Sentry event delivery from `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/app/error.tsx`, and `src/app/global-error.tsx`.

---

*Integration audit: 2026-05-05*
