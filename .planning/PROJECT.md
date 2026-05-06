# Secure Streaming Platform Rescue

## What This Is

This is an existing secure video streaming and course platform that was handed over for maintenance, stabilization, and enhancement. It provides authenticated course access, DRM-protected playback, admin management, Zoom meeting access, support tickets, watermarking, session controls, analytics, and external integrations around Axinom, storage, Redis, Google OAuth, and Vercel.

The next work is a brownfield rescue and modernization effort: make the repo installable and runnable, document setup and staging deployment, fix bugs and security holes, update Zoom, research and document official Axinom DRM trial setup, improve database performance, and redesign the frontend in an institute/academic style.

## Core Value

Maintainers can reliably run, secure, deploy, and evolve the platform without guessing how its DRM, Zoom, database, authentication, and streaming flows fit together.

## Requirements

### Validated

- Existing Next.js App Router application with protected course, watch, admin, meeting, support, and API routes - existing.
- Existing Google OAuth and NextAuth session model with whitelisted-user access control - existing.
- Existing Prisma data model for users, sessions, courses, enrollments, videos, access grants, watch records, tickets, security events, DRM sessions, and watermark settings - existing.
- Existing Axinom DRM and video-service integration modules for entitlement tokens, encoding, sync, webhooks, and FairPlay certificate retrieval - existing but needs validation against official setup.
- Existing Shaka Player playback flow with DRM token handoff, heartbeat tracking, fullscreen handling, and watermark/security components - existing.
- Existing Zoom meeting flow with authenticated meeting page, SDK signature API, and static meeting client page - existing but needs upgrade and cleanup.
- Existing admin interfaces for users, courses, videos, analytics, whitelist, permissions, tickets, security events, and watermark settings - existing.
- Existing storage integrations for Azure Blob input/output and Cloudflare R2/S3-compatible HLS object access - existing.
- Existing Upstash Redis usage for cache, rate limiting, system mode, and session revocation - existing.
- Existing Vercel-oriented deployment shape through Next.js App Router, `vercel.json`, Vercel Analytics, and Speed Insights - existing.
- Phase 6 Vercel staging runbook, callback/origin contract, env matrix staging notes, and smoke checklist/verifier - validated.
- Phase 7 formal institute-style frontend treatment for primary user routes, watch shell, meeting states, auth, support shell, navigation, and screenshot checklist - validated.

### Active

- [ ] Make dependency installation reproducible from a clean checkout, including missing direct dependencies, package scripts, Node version expectations, and generated Prisma client setup.
- [ ] Create maintainer setup documentation covering prerequisites, environment variables, local services, install commands, seed/setup steps, local dev server launch, and staging deployment checks.
- [ ] Add or repair test infrastructure so critical flows can be verified through scripts, automated tests, or documented manual checks.
- [ ] Fix known bugs and logic holes, starting with media entitlement drift, HLS playlist authorization, DRM token access windows, generic admin mutations, session fingerprint updates, malformed webhook signatures, and broken documentation claims.
- [ ] Fix security issues, including secret handling, spoofable support ticket emails, support rate limiting, logging redaction, client-side-only deterrence assumptions, admin destructive audit behavior, and sensitive files in the workspace/history.
- [ ] Research official Axinom DRM trial documentation and produce a step-by-step guide for account setup, credentials, communication keys, entitlement/license messages, encoding profiles, Shaka integration, staging env vars, and how this repo maps to those steps.
- [ ] Validate and repair the Axinom integration against official documentation, including entitlement JWT signing, license service URLs, encoding profile setup, webhook verification, env var naming, and failure handling.
- [ ] Update Zoom Meeting SDK integration to the latest supported implementation while preserving the current authenticated meeting flow, SDK signature flow, meeting number/passcode configuration, and watermark/user identity behavior.
- [ ] Reduce duplicated/generated Zoom assets and document the retained source of truth for SDK assets and upgrade procedure.
- [x] Redesign the frontend into a formal institute/academic style while preserving existing course, watch, admin, meeting, support, and authentication workflows.
- [ ] Improve database performance by optimizing the current Prisma/MongoDB implementation first: profile query hotspots, fix redundant queries, add indexes where needed, limit broad admin reads, and cache read-heavy summaries.
- [ ] Evaluate database migration only if profiling shows the current database is the bottleneck or staging requirements cannot be met safely with MongoDB.
- [x] Prepare a staging deployment path, including Vercel configuration, required external services, environment variables, smoke tests, and access expectations.

### Out of Scope

- Immediate database migration - optimize the current Prisma/MongoDB implementation first and migrate only with evidence.
- Production launch certification in the first milestone - staging readiness is the target, with production hardening tracked separately.
- Replacing Axinom DRM in v1 - the project currently relies on Axinom DRM trial services and must first be made reproducible with official Axinom setup.
- Replacing Zoom with another meeting provider - preserve and modernize the current Zoom-based flow.
- Treating client-side screen recording prevention as a hard security boundary - server-side entitlement, DRM, watermarking, and audit controls remain the enforceable layers.
- Unbounded visual redesign before stabilization - the frontend redesign must follow after install, test, setup, security, and critical flow clarity are in place.

## Context

The codebase has already been mapped under `.planning/codebase/`. The map identifies a Next.js 16, React 18, TypeScript, Tailwind/shadcn/Radix, Prisma, NextAuth, Shaka Player, Axinom, Zoom Meeting SDK, Upstash Redis, Azure Blob, Cloudflare R2, Sentry, and Vercel-oriented application.

The current repo has a documentation drift problem. `README.md` describes PostgreSQL as the primary database, but `prisma/schema.prisma` uses `provider = "mongodb"` with ObjectId fields. Setup documentation must correct this and should distinguish verified requirements from stale README claims.

The platform has several high-risk known concerns from the codebase map:

- No automated test suite or root `test` script is detected.
- `zod` is imported by app code but is not declared as a direct dependency.
- Media entitlement logic is duplicated and inconsistent across watch page, DRM token route, local DRM license route, and HLS playlist route.
- HLS playlist access does not enforce the same entitlement checks as the watch page.
- DRM token issuance does not fully honor direct-access validity windows.
- Local DRM license endpoint is a stub and does not issue content keys.
- Support ticket submission trusts client-supplied email and diagnostics too much.
- Ticket-specific rate limiting is process-local and bypassable in serverless environments.
- Multiple secret-like and key artifacts exist in the workspace and require audit, removal from history if committed, and credential rotation decisions.
- Zoom SDK assets are duplicated across public/vendor folders and need a single maintained upgrade path.
- Axinom integration spans several modules with overlapping env var names and partial legacy paths.

Axinom is central to the project. The current backend depends on an Axinom DRM free trial/service configuration, so the maintainer workflow must include official Axinom setup rather than relying on inherited env files. Official documentation to incorporate includes:

- Axinom DRM License Service and entitlement flow: https://docs.axinom.com/services/drm/license-service
- Axinom Entitlement Message tool: https://docs.axinom.com/general/tools/entitlement-message
- Signing Axinom License Service Messages: https://docs.axinom.com/services/drm/license-service/sign-license-service-message
- Axinom DRM Quick Start player integration: https://docs.axinom.com/services/drm/quickstart/player
- Axinom Shaka Player integration: https://docs.axinom.com/services/drm/players/shaka
- Axinom Encoding API quickstart: https://docs.axinom.com/services/encoding/quickstart/using-api/api
- Axinom Encoding Profiles setup: https://docs.axinom.com/services/video/setup-encoding-profiles/

## Constraints

- **Priority**: Stabilize first - install, launch, document, test, and fix blockers before broad redesign or invasive rewrites.
- **Launch target**: Staging deployment - setup and verification should target a working staging environment, likely Vercel plus external services.
- **Database**: Optimize existing Prisma/MongoDB first - migration is a later evidence-based decision, not the default v1 path.
- **DRM provider**: Axinom DRM free trial is currently required - setup must be documented from official Axinom sources and mapped to repo env vars and modules.
- **Meeting provider**: Zoom must remain - update to latest supported SDK integration while preserving current app behavior.
- **Frontend direction**: Institute/academic style - formal, credible, learning-oriented, and operational rather than marketing-heavy.
- **Security**: Sensitive env/key/media artifacts must not be read unnecessarily, copied into docs, or committed; docs should use placeholder examples only.
- **Runtime**: Node.js, npm, Next.js App Router, Prisma client generation, and external service credentials must be documented as explicit prerequisites.
- **Deployment**: Vercel is the detected deployment target; any staging plan must account for serverless limits, env vars, long-running video processing triggers, Redis availability, and external webhook URLs.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat this as brownfield rescue and modernization | The repo already implements major flows but has setup drift, security gaps, missing tests, and integration uncertainty. | Pending |
| Stabilize before redesign | A new academic UI is valuable only after the platform can be installed, launched, tested, and deployed reliably. | Pending |
| Optimize current database before migration | Prisma schema currently uses MongoDB; changing providers would be high risk before profiling and tests exist. | Pending |
| Target staging readiness for the first roadmap | The maintainer needs reproducible setup and deploy confidence before production claims. | Pending |
| Use official Axinom docs for DRM setup | The current Axinom trial integration is critical and inherited; setup must be reproducible without tribal knowledge. | Pending |
| Preserve Zoom flow while upgrading SDK | Users depend on the current meeting behavior; modernization should not remove existing access/signature/watermark behavior. | Pending |
| Preserve authenticated Zoom iframe flow with server-owned signatures | Phase 4 found the current flow can be hardened without replacing the user-visible join path. | Accepted in Phase 4 |
| Do not force latest Zoom SDK without smokeable upgrade path | npm reports `@zoom/meetingsdk` 6.0.0, but the retained iframe currently uses Zoom CDN 5.0.4; upgrade requires official-doc review and staging smoke. | Accepted in Phase 4 |
| Optimize Prisma/MongoDB before migration | Phase 5 removed known query waste, added bounds/indexes, and documented migration deferral until staging evidence proves a blocker. | Accepted in Phase 5 |
| Use singleton watermark settings | Append-only latest-row watermark settings created ambiguous reads and unbounded growth; the app now uses a `global` singleton scope. | Accepted in Phase 5 |
| Represent unavailable live staging checks explicitly | Phase 6 cannot certify real Google, Axinom, Zoom, Redis, storage, SMTP, or Sentry behavior without tenant credentials; smoke rows use `blocked: missing credentials/service access` instead of false pass/fail claims. | Accepted in Phase 6 |
| Redesign primary user surfaces before deep admin UI | Phase 7 user choice prioritized home, courses, course detail, watch, meeting, support/auth, while preserving dense admin behavior through shared tokens/nav. | Accepted in Phase 7 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? Move to Out of Scope with reason.
2. Requirements validated? Move to Validated with phase reference.
3. New requirements emerged? Add to Active.
4. Decisions to log? Add to Key Decisions.
5. "What This Is" still accurate? Update if drifted.

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections.
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state.

---
*Last updated: 2026-05-06 after Phase 7 verification*
