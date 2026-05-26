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
npm run verify:doverunner -- --live
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

## DRM And DoveRunner

Primary files/docs:

- `src/lib/media-provider/doverunner.ts`
- `src/lib/media-provider/doverunner-token.ts`
- `src/lib/shaka-drm.ts`
- `src/hooks/player/useShakaPlayer.ts`
- `docs/doverunner-setup.md`
- `docs/playback-encoding-matrix.md`

DoveRunner is the media provider for upload, T&P, DRM token creation, and playback. The app creates short-lived DoveRunner license tokens server-side and Shaka sends them only with license requests.

Operational checks:

- DoveRunner access keys stay server-only.
- FairPlay certificate URL and license URL match the DoveRunner tenant.
- Browser/OS playback routing matches `docs/playback-encoding-matrix.md`.
- License tokens are never logged or stored.

## Video Processing And Storage

Primary files/docs:

- `src/lib/media-provider/doverunner.ts`
- `src/lib/media-provider/aws-s3.ts`
- `src/lib/media-provider/types.ts`
- `src/app/api/video/process/route.ts`
- `docs/playback-encoding-matrix.md`
- `docs/database-performance.md`
- `docs/vercel-staging-runbook.md`

Source media and packaged output use AWS S3 registered in DoveRunner T&P. Provider operational IDs and statuses live in provider-neutral video fields.

Operational checks:

- AWS S3 input/output buckets, DoveRunner storage IDs, and output base URL must match staging env.
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
