# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-06)

**Core value:** Maintainers can reliably run, secure, deploy, and evolve the platform without guessing how its DRM, Zoom, database, authentication, and streaming flows fit together.
**Current focus:** Phase 10 - 24-Hour TOS Access Guard

## Current Position

Phase: 10 of 10 (24-Hour TOS Access Guard)
Plan: docs/superpowers/plans/2026-07-29-tos-access-guard.md
Status: Implementation and automated, desktop, and mobile deny/UI smoke verified; authenticated allow-path proof pending.
Last activity: 2026-07-30 - Implemented Phase 10 and verified automated plus desktop/mobile deny/UI smoke paths.

Progress: [#########-] 90%

## Performance Metrics

**Velocity:**
- Total plans completed: 33
- Average duration: 4.6 min
- Total execution time: 149 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 4 | 13 min | 3.25 min |
| 2 | 4 | 25 min | 6.25 min |
| 3 | 5 | 32 min | 6.4 min |
| 4 | 4 | 19 min | 4.75 min |
| 5 | 4 | 20 min | 5 min |
| 6 | 4 | 12 min | 3 min |
| 7 | 4 | 16 min | 4 min |
| 8 | 4 | 12 min | 3 min |

**Recent Trend:**
- Last 5 plans: 07-04, 08-01, 08-02, 08-03, 08-04
- Trend: All v1 rescue phases complete

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
- [Phase 7]: Academic redesign prioritizes primary user surfaces and preserves admin density; screenshot rows exist but automated capture is blocked until browser automation tooling is installed.
- [Phase 8]: Production launch blockers are tracked separately in `docs/operations/hardening-backlog.md`; v1 completion means staging-ready rescue baseline, not production certification.
- [Phase 9]: Future incoming courses use Tencent VOD Commercial DRM as the only media provider; old Axinom videos are not supported after cutover.
- [Phase 9]: Export old media rows before any cleanup and do not delete external provider assets without explicit user confirmation.
- [Phase 10]: Use a signed session-bound HttpOnly cookie for TOS acceptance; browser-and-session scope needs no database, Redis key, or cross-device history, and native Web Crypto supplies tamper resistance.

### Pending Todos

- Run Tencent staging pilot after credentials, console setup, webhook URL, and test media are available.

### Blockers/Concerns

- [Phase 6]: Real staging Zoom join still requires configured Zoom Meeting SDK credentials and an available test meeting.
- [Phase 6]: Staging must verify external callbacks/origins for Google OAuth, Axinom webhooks, Zoom, storage CORS, and Vercel domains.
- [Phase 6]: Strict service and live Axinom validation require real staging credentials.
- [Phase 7]: Automated screenshot capture is blocked until Playwright or equivalent browser automation tooling is installed/configured.
- [Phase 8]: Production hardening P0 items remain open by design: strict CI secret scanning, credential rotation decisions, durable video processing orchestration, backup/restore drills, and incident response.
- [Phase 9]: Local Tencent-only migration is complete; live Tencent API checks and browser playback smoke require Tencent credentials, console templates, webhook URL, and a test video.
- [Phase 10]: Browser allow, re-entry, and session-change smoke remains blocked: Google-only NextAuth uses Prisma MongoDB database sessions, but no local MongoDB, test auth fixture, or browser storage state exists. Resume with checklist items 6-9 using a valid authenticated local/staging session, then close GSD.
- [Quality]: `npm run lint` passes with inherited warnings; later phases should retire warnings as touched code is hardened.
- [Tooling]: `gsd-sdk` was not available on PATH during Phase 1 verification, so Markdown tracking files were updated directly.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Database Migration | Evaluate only if profiling shows MongoDB optimization cannot meet staging needs. | v2 candidate | Initialization |
| Production Hardening | Incident response, load testing, backups, and compliance controls are deferred until after staging readiness. | v2 candidate | Initialization |

## Session Continuity

Last session: 2026-07-30
Stopped at: Phase 10 authenticated browser allow-path verification.
Resume: Run checklist items 6-9 with a valid authenticated local/staging session, then close GSD.
Resume file: docs/superpowers/plans/2026-07-29-tos-access-guard.md
