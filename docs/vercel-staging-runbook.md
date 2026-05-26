# Vercel Staging Runbook

This runbook covers Phase 6 requirements STAGE-01 through STAGE-07 and TEST-07. It targets a Vercel Preview or Custom Environment staging deployment with the existing MongoDB, DoveRunner, Zoom, Redis, AWS S3, Google OAuth, support, and Sentry providers.

Use placeholder names in tickets and docs. Do not paste real tokens, keys, webhook secrets, certificate values, media keys, or database URLs into this repository.

## Official References

- Vercel environments: https://vercel.com/docs/deployments/production-env
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel function limits: https://vercel.com/docs/functions/limitations/
- Vercel function duration configuration: https://vercel.com/docs/functions/configuring-functions/duration

## Staging Shape

Use one of these Vercel targets:

| Target | Use When | Env Scope |
|--------|----------|-----------|
| Preview deployment | The team can use a non-production branch as staging. | Preview, optionally branch-scoped. |
| Custom Environment | The Vercel plan supports a named `staging` environment. | Custom `staging` environment. |

The staging URL must be stable enough to register with Google OAuth, Zoom SDK domain/origin settings, AWS S3 CORS/public asset rules, and any Sentry environment filters.

Vercel environment variable changes only apply to new deployments. Redeploy staging after changing any provider credential, callback URL, public player URL, or secret.

## Pre-Deploy Gate

Run from the repository root before accepting a staging deployment:

```bash
npm ci
npm run prisma:generate
npm run verify:setup
npm run verify:services:strict
npm run verify:doverunner -- --live
npm run verify:staging
npm run lint
npm run typecheck
npm test
npm run build
npm run secrets:scan
```

If provider credentials are unavailable locally, `npm run verify:services:strict` and live DoveRunner checks may be blocked. Record the block in `docs/staging-smoke-checklist.md` as `blocked: missing credentials/service access` with the missing service name, not as a pass.

## Vercel Environment Setup

1. Create or identify the Vercel project.
2. Select Preview or a Custom Environment for staging.
3. Add environment variables from `docs/env-matrix.md` to the staging scope.
4. Keep `NEXT_PUBLIC_` values limited to browser-safe public configuration.
5. Add `NEXTAUTH_URL` with the exact staging origin, for example `https://staging.example.edu`.
6. Redeploy after every environment change.
7. Verify the deployed build ran `npm run build` successfully and generated Prisma Client during install/postinstall.

Do not store real `.env.local`, service account files, key files, or DRM artifacts in Vercel build logs, Git commits, pull request comments, or smoke evidence.

## Callback And Origin Checklist

| Provider | Required Staging Configuration | Verification |
|----------|--------------------------------|--------------|
| Google OAuth | Add the staging redirect URI: `<STAGING_ORIGIN>/api/auth/callback/google`. Keep `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` scoped to staging. | Sign in with a whitelisted test user and confirm return to the app. |
| DoveRunner T&P and DRM | Configure DoveRunner Site ID, access key, T&P account ID/access key, input/output storage IDs, license URL, and output base URL. Configure `DOVERUNNER_FAIRPLAY_CERT_URL` only if FairPlay/FPS is provisioned. | Upload/process/sync a staging video and confirm token/license requests are limited to authorized DRM playback. |
| Zoom Meeting SDK | Allow the staging origin/domain in the Zoom Meeting SDK app and configure `ZOOM_MEETING_SDK_KEY`, `ZOOM_MEETING_SDK_SECRET`, `NEXT_PUBLIC_ZOOM_MEETING_ID`, and `NEXT_PUBLIC_ZOOM_PASSCODE`. | Authenticated learner can launch the meeting and receives learner role. |
| AWS S3 | Configure input/output buckets, CORS, DoveRunner storage access, and playback origin used by `DOVERUNNER_OUTPUT_BASE_URL`. | Browser source upload works, DoveRunner can read input/write output, and packaged media is readable through the expected playback origin. |
| Upstash Redis | Configure REST URL/token for staging. | Rate limit, cache, system mode, and session revocation paths do not fail because Redis is missing. |
| SMTP/reCAPTCHA | Configure SMTP sender/recipient and site/secret keys for the staging domain. | Support ticket smoke sends or records expected notification behavior. |
| Sentry | Use a staging DSN/project or environment tag and verify redaction rules. | Error evidence includes route/status/context but no secrets, tokens, raw emails, or key material. |

## Deploy Commands

For Git-connected Vercel projects, push the staging branch and inspect the Preview deployment. For CLI-driven staging, use the Vercel CLI after project linking:

```bash
vercel pull --environment=preview
vercel build
vercel deploy --prebuilt
```

For production deployments later, do not reuse this staging acceptance checklist as production certification. Production needs separate incident response, backups, load testing, rotation, and compliance review.

## Serverless Limits

`src/app/api/video/process/route.ts` declares `maxDuration = 300`. Vercel supports configurable function durations within plan limits, but long HTTP requests are still a fragile place to perform real video encoding work. Treat this route as an encoding trigger/orchestration endpoint for staging. Production hardening should move long-running encoding control to a queue, worker, or provider-native job orchestration path.

Check Vercel function logs for timeout status, memory pressure, bundle-size issues, and external API latency. Do not add secrets to logs while debugging.

## Logs And Sentry

Staging evidence should include:

- Route or page name.
- HTTP status or visible failure state.
- Request correlation ID if one exists.
- Provider name and non-secret operation ID when needed.
- Browser and device class for playback/Zoom failures.

Staging evidence must not include:

- Raw tokens, OAuth secrets, DoveRunner access keys, Zoom SDK secrets, Redis tokens, database URLs, storage keys, SMTP passwords, service account files, certificates, private keys, media keys, or full user emails.

## Acceptance

Phase 6 staging readiness is accepted when:

- The pre-deploy gate passes, except credential-gated checks recorded as blocked.
- `docs/env-matrix.md` covers every staging service group.
- Callback and origin configuration is documented for the actual staging URL.
- `docs/staging-smoke-checklist.md` has one row per required smoke ID.
- Every smoke row is marked `pass`, `fail`, `not run`, or `blocked: missing credentials/service access`.
- Production-only work remains listed as a gap and is not claimed as complete.
