# Health And Readiness Checklist

This checklist satisfies OPS-04. It is a manual readiness layer tied to existing scripts and staging smoke docs.

Allowed status values:

- `not run`
- `pass`
- `fail`
- `blocked: missing credentials/service access`
- `blocked: missing browser automation tooling`

## Script Gate

| ID | Check | Command | Status | Evidence |
|----|-------|---------|--------|----------|
| HEALTH-SCRIPT-01 | Setup contract | `npm run verify:setup` | not run | |
| HEALTH-SCRIPT-02 | Non-strict service matrix | `npm run verify:services` | not run | |
| HEALTH-SCRIPT-03 | Strict staging service matrix | `npm run verify:services:strict` | not run | |
| HEALTH-SCRIPT-04 | Axinom setup validation | `npm run verify:axinom -- --strict` | not run | |
| HEALTH-SCRIPT-05 | Staging smoke contract | `npm run verify:staging` | not run | |
| HEALTH-SCRIPT-06 | Lint/type/test/build | `npm run lint && npm run typecheck && npm test && npm run build` | not run | |
| HEALTH-SCRIPT-07 | Secret scan | `npm run secrets:scan` | not run | |

## Service Readiness

| ID | Service | Readiness Question | Status | Evidence |
|----|---------|--------------------|--------|----------|
| HEALTH-AUTH-01 | OAuth | Does Google OAuth allow the staging redirect URI and deny non-whitelisted users? | not run | |
| HEALTH-DB-01 | Database | Does MongoDB staging use the current Prisma schema and expected indexes? | not run | |
| HEALTH-REDIS-01 | Redis | Are Upstash cache, rate limit, system mode, and session revocation paths available? | not run | |
| HEALTH-AXINOM-01 | Axinom DRM | Can an entitled staging learner obtain a token and license for a test video? | not run | |
| HEALTH-AXINOM-02 | Axinom webhooks | Is `<STAGING_ORIGIN>/api/webhook/axinom` configured and signature-verified? | not run | |
| HEALTH-ZOOM-01 | Zoom | Can a learner join `/meeting` with role `0` through the staging domain? | not run | |
| HEALTH-STORAGE-01 | Azure/R2 storage | Are Azure containers, R2 bucket/prefix, CORS, and asset URLs aligned with staging? | not run | |
| HEALTH-SUPPORT-01 | Support | Can a signed-in user submit a ticket with rate limit and diagnostic redaction active? | not run | |
| HEALTH-SENTRY-01 | Sentry/logs | Do Sentry and Vercel logs contain useful route/status context without secrets? | not run | |
| HEALTH-UI-01 | UI screenshots | Are primary desktop/mobile route screenshots captured or explicitly blocked? | not run | |
| HEALTH-SECRETS-01 | Secret hygiene | Are env/key/media artifacts ignored and excluded from evidence? | not run | |

## Release Acceptance Rule

A staging release can be accepted only when:

- Script gate rows are `pass`, except credential-gated rows marked `blocked: missing credentials/service access`.
- Service readiness rows for configured providers are `pass`.
- Missing provider access is recorded as a block, not a pass.
- Screenshot rows are either `pass` or `blocked: missing browser automation tooling`.
- Production-only hardening work remains in `docs/operations/hardening-backlog.md`.
