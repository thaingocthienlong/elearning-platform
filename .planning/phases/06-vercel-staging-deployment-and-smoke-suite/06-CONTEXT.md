# Phase 6 Context: Vercel Staging Deployment and Smoke Suite

## Phase Goal

Maintainers can deploy and accept a staging environment that exercises real auth, media, DRM, Zoom, Redis, storage, webhook, and admin surfaces without mistaking missing credentials for completed production readiness.

## Requirements

- STAGE-01: Maintainer has a staging deployment runbook for Vercel or the chosen staging host.
- STAGE-02: Staging env var matrix covers database, auth, Redis, storage, Axinom, Zoom, SMTP/support, reCAPTCHA, Sentry, and public player URLs.
- STAGE-03: Staging deployment documents external callback and origin configuration for Google OAuth, Axinom webhooks, Zoom, Azure/R2 CORS, and Vercel domains.
- STAGE-04: Staging build verifies Prisma generation, lint, typecheck, tests, and Next build.
- STAGE-05: Staging smoke test verifies key user and admin flows before a release is accepted.
- STAGE-06: Staging logs and Sentry setup avoid exposing secrets while preserving useful failure context.
- STAGE-07: Known production gaps are documented separately from staging readiness.
- TEST-07: Staging smoke checks cover auth, course access, playback, DRM token issuance, HLS access, Zoom meeting launch, support ticket creation, Redis, storage, and Axinom webhook readiness.

## Accepted Decisions

1. Use Vercel preview/staging as the target path for Phase 6.
2. Acceptance is a build/test gate plus a documented smoke path for auth, playback, DRM, Zoom, support, Redis, storage, webhooks, logs, and Sentry.
3. Missing real provider access is represented as `blocked: missing credentials/service access`, not as pass or fail.
4. Configure and document Google OAuth, Axinom webhook, Zoom SDK domains, Azure/R2 CORS, Vercel staging domains, and public player origins.
5. Document Vercel serverless limits and avoid presenting video encoding as safe long-running request work.
6. Academic frontend redesign starts only after this staging runbook and smoke contract are complete.

## Official Docs Checked

- Vercel environments: https://vercel.com/docs/deployments/production-env
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel function limits: https://vercel.com/docs/functions/limitations/
- Vercel function duration configuration: https://vercel.com/docs/functions/configuring-functions/duration

## Implementation Notes

- `docs/env-matrix.md` already contains the service groups used by `scripts/verify-services.ts`; Phase 6 should extend staging expectations instead of replacing the matrix.
- Existing `vercel.json` only declares the Next.js framework.
- Existing scripts already provide local gates: `verify:setup`, `verify:services:strict`, `verify:axinom`, `lint`, `typecheck`, `test`, `build`, and `secrets:scan`.
- The smoke suite should be mostly documentation/checklist plus a non-secret verifier because live OAuth, Axinom, Zoom, storage, Redis, SMTP, and Sentry require tenant-specific credentials.

## Non-Goals

- Production certification, load testing, incident response, backups, and compliance controls.
- Replacing Vercel, Axinom, Zoom, Prisma/MongoDB, or storage providers.
- Reading or copying inherited env/key files.
