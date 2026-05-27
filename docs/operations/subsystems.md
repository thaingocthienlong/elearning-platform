# Maintainer Subsystem Runbook

This runbook is the Phase 8 OPS-01 and OPS-03 overview for maintainers. It explains how the major subsystems fit together and points to deeper setup, staging, and vendor docs.

Do not paste real secrets, tokens, service account values, key files, database URLs, certificates, media keys, or full user emails into operational notes.

## Baseline Commands

Run these from the repository root before accepting maintainer changes:

```bash
npm run verify:setup
npm run verify:services
npm run verify:staging
npm run lint
npm run typecheck
npm test
npm run build
npm run secrets:scan
```

Use strict service checks only when real staging credentials are available:

```bash
npm run verify:services:strict
npm run verify:axinom -- --strict
```

## Auth And Whitelist

Primary files:

- `src/lib/auth.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `prisma/schema.prisma`
- `src/middleware.ts`

The app uses NextAuth with Google OAuth, Prisma sessions, and an `AllowedEmail` whitelist. A user must authenticate through Google and be permitted by the whitelist/session rules before using protected course, watch, meeting, support, or admin flows.

Operational checks:

- `NEXTAUTH_URL` must match the active local/staging origin.
- Google OAuth redirect must be `<ORIGIN>/api/auth/callback/google`.
- `NEXTAUTH_SECRET`, Google client secret, and database URL must never appear in logs.
- Whitelist changes should be tested with both allowed and denied users.

## Media Entitlement

Primary files:

- `src/lib/media-entitlement.ts`
- `src/app/watch/[videoId]/page.tsx`
- `src/app/api/drm/token/route.ts`
- `src/app/api/hls/playlist/[videoId]/route.ts`
- `src/app/api/drm/license/route.ts`
- `src/app/api/watch/heartbeat/route.ts`

Media access is enforced by one server-only entitlement helper. It checks user identity, enrollment, open course access, direct video access windows, publication/deletion state, and view limits.

Operational checks:

- Denied users must receive generic denial responses or redirects.
- HLS, DRM token, local license, heartbeat, and watch page behavior must stay aligned.
- Add tests when adding new media-serving routes.

## DRM And Axinom

Primary files/docs:

- `src/lib/axinom.ts`
- `src/lib/axinom-env.ts`
- `src/hooks/player/useShakaPlayer.ts`
- `src/app/api/webhook/axinom/route.ts`
- `docs/axinom-setup.md`
- `docs/axinom-staging-checklist.md`

Axinom is the v1 DRM provider. The app signs short-lived Axinom License Service Messages server-side and Shaka sends entitlement tokens only with license requests.

Operational checks:

- Communication key ID/secret and webhook secret stay server-only.
- FairPlay certificate URL and public license URLs match the Axinom tenant.
- Webhook verification rejects malformed signatures without leaking details.
- Local DRM license endpoint is not a production DRM substitute unless real key custody is added.

## VdoCipher Upload And Playback

Primary files/docs:

- `src/lib/vdocipher.ts`
- `src/lib/vdocipher-accounts.ts`
- `src/lib/vdocipher-watermark.ts`
- `src/app/api/vdocipher/upload-credentials/route.ts`
- `src/app/api/vdocipher/otp/route.ts`
- `src/app/api/video/vdocipher/sync/route.ts`
- `src/app/api/webhook/vdocipher/route.ts`
- `src/components/video/VdoCipherPlayer.tsx`
- `docs/provider-zero-setup.md`

VdoCipher is the new upload/playback provider for replacement videos. The app supports multiple logical VdoCipher accounts so urgent free-account quota can be spread across videos, while each video stores the exact account ID used for upload and OTP generation. The existing media entitlement helper remains the gate before server-side OTP generation.

Operational checks:

- Every ID in `VDOCIPHER_ACCOUNT_IDS` needs a matching `VDOCIPHER_API_SECRET_<ACCOUNT>` env var.
- `VDOCIPHER_DEFAULT_ACCOUNT_ID` must match one configured account when set.
- VdoCipher API secrets, webhook secrets, OTP values, and playbackInfo values must not appear in logs, docs, screenshots, or tickets.
- Admins should sync status and publish only after VdoCipher reports the video ready.
- Entitled playback must show watermarking; denied users must not receive OTP/playbackInfo.
- When moving from free accounts to a paid account, migrate videos deliberately and update the stored account/video IDs before removing old secrets.

## Video Processing And Storage

Primary files/docs:

- `src/lib/axinom-video-service.ts`
- `src/lib/axinom-encoding.ts`
- `src/lib/azure-storage.ts`
- `src/lib/r2.ts`
- `src/app/api/video/process/route.ts`
- `docs/database-performance.md`
- `docs/vercel-staging-runbook.md`

Source media and encoded output use Azure Blob and R2/S3-compatible storage. Axinom operational IDs and statuses live in explicit video fields.

Operational checks:

- Azure input/output containers and R2 bucket/prefix must match staging env.
- CORS/origin settings must include the staging origin where browser access is expected.
- `src/app/api/video/process/route.ts` is a long-running trigger path, not a production-grade worker queue.
- Production hardening should move long-running orchestration to a queue, worker, or provider-native job mechanism.

## Zoom Meetings

Primary files/docs:

- `src/app/meeting/page.tsx`
- `src/app/api/zoom/signature/route.ts`
- `public/zoom-meeting.html`
- `docs/zoom-meeting-sdk-runbook.md`

The current meeting flow is an authenticated iframe launch. The server owns the meeting number/passcode/signature response. All users receive Zoom attendee role `0`; host/start behavior requires a separate ZAK-backed flow.

Operational checks:

- Zoom SDK key and secret stay server-only except the SDK key returned for client join.
- Meeting ID/passcode are public config for the current flow, not access-control secrets.
- Staging domain must be allowed in the Zoom Meeting SDK app.
- Any SDK upgrade must pass `/meeting` smoke testing before acceptance.

## Redis, Rate Limits, Cache, And Session Revocation

Primary files:

- `src/lib/redis.ts`
- `src/middleware.ts`
- `src/lib/session-revocation.ts`
- `src/app/api/session/events/route.ts`

Upstash Redis supports cache, rate limits, system mode, and session revocation. Some live SSE behavior remains process-local; Redis-backed checks are the shared staging boundary.

Operational checks:

- `UPSTASH_REDIS_REST_URL` and token must be present in staging.
- Verify support ticket rate limiting and session revocation paths with staging credentials.
- Redis outages should fail closed or degrade only where the code explicitly permits it.

## Database

Primary files/docs:

- `prisma/schema.prisma`
- `src/lib/prisma.ts`
- `docs/database-performance.md`
- `docs/setup.md`

MongoDB is the implemented Prisma datasource. Do not treat old PostgreSQL references as authoritative.

Operational checks:

- Run `npm run prisma:generate` after schema changes.
- Confirm indexes with database tooling after deploying schema changes.
- Keep broad admin reads bounded and cached where appropriate.
- Defer database migration until profiling proves MongoDB optimization cannot meet staging needs.

## Support And Admin

Primary files:

- `src/app/api/support/ticket/route.ts`
- `src/components/support/SubmitTicketForm.tsx`
- `src/app/api/admin/**`
- `src/app/admin/**`

Support tickets derive identity from the authenticated session, redact diagnostics, and use distributed rate limiting. Admin pages remain dense and operational.

Operational checks:

- Ticket evidence must not include raw tokens, keys, database URLs, or full user emails.
- Admin destructive actions should remain confirmation-gated and audited.
- Generic admin mutation routes still deserve future type-safety hardening.

## Observability

Primary files/docs:

- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `instrumentation.ts`
- `docs/vercel-staging-runbook.md`

Sentry and Vercel logs should preserve useful route/status/provider context without secrets.

Operational checks:

- Staging Sentry project or environment tag is configured.
- Log evidence should name subsystem, route, status, and non-secret operation ID only.
- Never log raw env values, tokens, full emails, certificate content, or DRM key material.

## Frontend And Client-Side Deterrence

Primary files/docs:

- `src/app/globals.css`
- `src/components/video/SecurityWrapper.tsx`
- `src/components/video/ScreenRecordingDetector.tsx`
- `src/components/video/Watermark.tsx`
- `docs/ui-screenshot-checklist.md`

The frontend now uses the Phase 7 academic visual system. Client-side anti-recording controls are deterrence and telemetry, not a hard security boundary.

Enforceable layers are:

- Server-side entitlement checks.
- DRM license/token controls.
- Watermarking.
- Session revocation.
- Audit/security events.
- Storage and HLS route authorization.

Operational checks:

- Treat DevTools, screenshot, visibility, and screen-recording detection signals as advisory.
- Do not make product or compliance claims that client code can prevent recording.
- Run screenshot checks after visual changes once browser automation tooling is available.
