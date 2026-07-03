# Staging Smoke Checklist

Use this checklist for Phase 6 requirements STAGE-05 and TEST-07. Fill it after deploying a Vercel Preview or Custom Environment staging build.

Allowed status values:

- `not run`
- `pass`
- `fail`
- `blocked: missing credentials/service access`

Do not paste secrets, raw tokens, service account values, DRM keys, database URLs, or full user emails into evidence.

| ID | Area | Smoke Check | Status | Evidence |
|----|------|-------------|--------|----------|
| AUTH-01 | Auth | A whitelisted staging user can sign in with Google OAuth and returns to the app through `/api/auth/callback/google`. | not run | |
| AUTH-02 | Auth | A non-whitelisted user is denied without exposing provider secrets or internal allowlist details. | not run | |
| COURSE-01 | Course access | Signed-in learner can open an enrolled or open course and sees expected course/video navigation. | not run | |
| TENCENT-UPLOAD-01 | Tencent upload | Admin creates a new video upload using Tencent VOD upload instructions and the local row stores Tencent metadata. | not run | |
| TENCENT-WEBHOOK-01 | Tencent webhook | Staging Tencent VOD webhook URL is configured as `<STAGING_ORIGIN>/api/webhook/tencent` and signature handling is verified with a safe staging event. | not run | |
| PLAYBACK-01 | Playback | Authorized learner can open `/watch/<videoId>` and the player loads a Tencent DRM staging manifest. | not run | |
| DRM-01 | DRM token | Authorized learner receives Tencent DRM playback session data for the staging test video; unauthorized user is denied. | not run | |
| SAFARI-DRM-01 | Safari DRM | On real macOS Safari with Tencent FairPlay env configured, an authorized learner can open `/watch/<videoId>`, load protected HLS, request the Tencent FairPlay license, and play for at least 10 seconds. | not run | |
| SAFARI-FALLBACK-01 | Safari fallback | When Tencent FairPlay env is not configured, Safari DRM acceptance is marked blocked; it is not recorded as FairPlay DRM success. | not run | |
| TENCENT-HLS-01 | Tencent HLS playback | Authorized Safari/FairPlay staging playback uses the Tencent VOD HLS manifest URL after entitlement; there is no app-hosted HLS proxy route after cutover. | not run | |
| ZOOM-01 | Zoom | Authenticated learner can launch the meeting page and join through the preserved Zoom iframe flow with learner role. | not run | |
| SUPPORT-01 | Support | Authenticated user can submit a support ticket with reCAPTCHA/SMTP behavior matching staging configuration. | not run | |
| REDIS-01 | Redis | Redis-backed cache/rate-limit/session-revocation paths are available and do not fall back because staging credentials are missing. | not run | |
| ADMIN-01 | Admin | Admin can open core admin pages and review analytics/security/tickets without unbounded loading or secret leakage. | not run | |
| LOGS-01 | Logs | Vercel logs show useful route/status/provider context and no raw secrets, tokens, keys, database URLs, or full user emails. | not run | |
| SENTRY-01 | Sentry | A controlled staging error reaches Sentry with staging environment context and redacted sensitive fields. | not run | |
| GAP-01 | Production gaps | Production-only gaps are reviewed and remain separate from staging readiness. | not run | |

## Production Gaps Not Closed By This Checklist

- Incident response and escalation policy.
- Credential rotation calendar and emergency rotation drill.
- Backup and restore testing.
- Load, soak, and concurrency testing for watch/admin/support/Zoom flows.
- Compliance-specific controls.
- Queue or worker architecture for long-running video processing.
