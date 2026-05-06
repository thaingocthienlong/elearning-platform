# Phase 6 Verification: Vercel Staging Deployment and Smoke Suite

## Result

Phase 6 complete on 2026-05-06.

Maintainers now have a Vercel staging runbook, staging callback/origin checklist, environment validation notes, a smoke checklist, and a non-secret verifier for the staging smoke contract.

## Requirements Verified

- STAGE-01: `docs/vercel-staging-runbook.md` documents Vercel Preview/Custom Environment staging setup.
- STAGE-02: `docs/env-matrix.md` covers required staging service groups and validation commands.
- STAGE-03: The runbook and env matrix document Google OAuth, Axinom webhook, Zoom, Azure/R2 CORS, and Vercel staging origin setup.
- STAGE-04: The runbook defines the staging build gate: Prisma generation, setup verification, service verification, Axinom validation, staging verifier, lint, typecheck, tests, build, and secret scan.
- STAGE-05: `docs/staging-smoke-checklist.md` covers user, admin, provider, and observability smoke checks.
- STAGE-06: Logging/Sentry guidance prohibits raw secrets while preserving route/status/provider context.
- STAGE-07: Production gaps are listed separately from staging readiness.
- TEST-07: Smoke IDs cover auth, course access, playback, DRM token issuance, HLS access, Zoom meeting launch, support ticket creation, Redis, storage, Axinom webhook readiness, logs, and Sentry.

## Commands Run

```bash
npm run verify:staging
npm run verify:setup
npm run verify:services
npm run lint
npm run typecheck
npm test
npm run build
npm run secrets:scan
```

## Command Results

- `npm run verify:staging`: passed.
- `npm run verify:setup`: passed.
- `npm run verify:services`: passed in non-strict mode; most real provider variables are absent on this machine and reported as skipped/missing by variable name only.
- `npm run lint`: passed with 157 inherited warnings and 0 errors.
- `npm run typecheck`: passed.
- `npm test`: passed, 16 suites and 64 tests.
- `npm run build`: passed. Build emitted inherited warnings about outdated baseline browser mapping, deprecated Next middleware convention, and missing local Upstash env values during static analysis.
- `npm run secrets:scan`: script completed, but gitleaks is not installed, so the redacted gitleaks scan was skipped by the existing script.

## Credential-Gated Staging Work

The following require real staging credentials/service access before a live deployment can be accepted:

- Strict service verification: `npm run verify:services:strict`.
- Strict/live Axinom validation: `npm run verify:axinom -- --strict` and any portal-backed encoding/webhook checks.
- Google OAuth test user sign-in on the actual staging URL.
- DRM playback through Axinom license services with a staging test video.
- Zoom Meeting SDK domain configuration and a real test meeting.
- Azure Blob and R2/S3 CORS checks against the actual staging origin.
- Redis-backed rate limit/cache/session checks against staging Upstash.
- SMTP/reCAPTCHA and Sentry smoke checks against staging providers.

Use `blocked: missing credentials/service access` in `docs/staging-smoke-checklist.md` for any row that cannot be run because provider access is unavailable.

## Commits

- `63e5659 docs(06): create staging phase plan`
- `5ee1882 docs(06): add vercel staging smoke contract`
