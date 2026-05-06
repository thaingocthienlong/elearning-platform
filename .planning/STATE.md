# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-06)

**Core value:** Maintainers can reliably run, secure, deploy, and evolve the platform without guessing how its DRM, Zoom, database, authentication, and streaming flows fit together.
**Current focus:** Phase 7 - Academic Frontend Redesign

## Current Position

Phase: 7 of 8 (Academic Frontend Redesign)
Plan: Not planned
Status: Phase 6 complete; ready to discuss and plan Phase 7
Last activity: 2026-05-06 - Phase 6 Vercel staging runbook, env/callback contract, smoke checklist, verifier, tests, and verification completed.

Progress: [########--] 75%

## Performance Metrics

**Velocity:**
- Total plans completed: 25
- Average duration: 4.8 min
- Total execution time: 121 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 4 | 13 min | 3.25 min |
| 2 | 4 | 25 min | 6.25 min |
| 3 | 5 | 32 min | 6.4 min |
| 4 | 4 | 19 min | 4.75 min |
| 5 | 4 | 20 min | 5 min |
| 6 | 4 | 12 min | 3 min |

**Recent Trend:**
- Last 5 plans: 05-04, 06-01, 06-02, 06-03, 06-04
- Trend: Baseline, security, Axinom, Zoom, MongoDB performance, and staging smoke contract phases complete

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 1]: Local baseline should pass lint, typecheck, Jest, build, and local non-strict secret scanning before later feature/security work.
- [Roadmap]: Stabilize first, then redesign after install, tests, security, Axinom, Zoom, data, and staging contracts are reliable.
- [Roadmap]: Optimize Prisma/MongoDB before any database migration decision.
- [Roadmap]: Preserve Axinom and Zoom providers for v1 while making their setup and upgrade paths reproducible.
- [Phase 2]: Central media authorization should be enforced through `src/lib/media-entitlement.ts` rather than route-local duplication.
- [Phase 2]: Support ticket identity must come from the authenticated session; submitted email is treated only as an optional consistency check.
- [Phase 2]: Security-event flush is destructive and requires explicit confirmation plus audit logging.
- [Phase 3]: Axinom v1 uses standard License Service Message mode, not local proxy mode.
- [Phase 3]: Local Axinom validation must not call live APIs unless `--live` is explicitly supplied.
- [Phase 3]: Axinom operational IDs and statuses belong in explicit `Video` fields, with legacy description parsing only as fallback.
- [Phase 4]: Preserve the authenticated `/meeting` iframe flow and make Zoom signatures server-owned.
- [Phase 4]: Learners receive Zoom role `0`; only existing app admins may receive role `1`.
- [Phase 4]: Keep the current Zoom 5.0.4 iframe/CDN path until a docs-verified upgrade can be smoked in staging.
- [Phase 5]: Optimize Prisma/MongoDB first; database migration remains deferred until staging evidence proves a blocker.
- [Phase 5]: Admin analytics uses bounded 30-day summaries and a short-lived 60-second cache.
- [Phase 5]: Watermark settings use a `global` singleton scope instead of append-only latest-row updates.
- [Phase 6]: Staging readiness is documented as a Vercel Preview/Custom Environment runbook plus smoke checklist, with unavailable live-provider checks marked `blocked: missing credentials/service access`.

### Pending Todos

- Discuss and plan Phase 7 academic frontend redesign.

### Blockers/Concerns

- [Phase 6]: Real staging Zoom join still requires configured Zoom Meeting SDK credentials and an available test meeting.
- [Phase 6]: Staging must verify external callbacks/origins for Google OAuth, Axinom webhooks, Zoom, storage CORS, and Vercel domains.
- [Phase 6]: Strict service and live Axinom validation require real staging credentials.
- [Quality]: `npm run lint` passes with inherited warnings; later phases should retire warnings as touched code is hardened.
- [Tooling]: `gsd-sdk` was not available on PATH during Phase 1 verification, so Markdown tracking files were updated directly.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Database Migration | Evaluate only if profiling shows MongoDB optimization cannot meet staging needs. | v2 candidate | Initialization |
| Production Hardening | Incident response, load testing, backups, and compliance controls are deferred until after staging readiness. | v2 candidate | Initialization |

## Session Continuity

Last session: 2026-05-06
Stopped at: Phase 6 complete; ready for Phase 7.
Resume file: .planning/phases/06-vercel-staging-deployment-and-smoke-suite/06-VERIFICATION.md
