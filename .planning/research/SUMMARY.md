# Project Research Summary

**Project:** Secure Streaming Platform Rescue
**Domain:** Brownfield secure academic streaming/course platform
**Researched:** 2026-05-05
**Confidence:** HIGH for roadmap direction, MEDIUM for tenant-specific Axinom and Zoom validation

## Executive Summary

This is a handed-over secure academic streaming platform with authenticated courses, DRM video playback, admin operations, support, analytics, Zoom meetings, and staging deployment needs. Experts build this kind of system around server-owned authorization, explicit integration adapters, reproducible environments, and conservative vendor upgrades. The current repo already has the right broad shape: Next.js App Router on Vercel, Prisma/MongoDB, NextAuth v4, Axinom DRM/Encoding, Shaka Player, Zoom Meeting SDK, Upstash Redis, Azure Blob/R2 storage, and Sentry.

The recommended roadmap is a rescue sequence, not a rewrite. First make clean install, env validation, docs, tests, and staging checks reproducible. Then centralize media entitlement and force every watch, DRM token, HLS playlist, license, heartbeat, and future media route through the same server-only decision. Only after that should Axinom trial setup, Shaka DRM behavior, Zoom SDK cleanup/upgrade, database performance, staging deployment, and academic frontend redesign proceed.

The top risks are content-access bypasses from entitlement drift, invalid or overbroad Axinom License Service Messages, Zoom signature misuse, duplicated SDK assets, serverless state assumptions, stale setup documentation, and secret-like artifacts. Mitigate them with shared authorization services, scoped signed DRM entitlements, server-side Zoom signatures, one SDK asset source of truth, Redis-backed shared state, placeholder-only env docs, secret scanning, and automated route/integration smoke tests.

## Key Findings

### Recommended Stack

Keep the current stack for the rescue milestone. Do not migrate database, auth, player, DRM provider, meeting provider, or hosting platform before staging is stable. Pin the operational baseline around Node 20, npm, Next.js 16, React 18, TypeScript 5, Prisma 5.22 with MongoDB, NextAuth v4, Axinom DRM/Encoding, Shaka 4.16.9, Zoom Meeting SDK 5.0.4 for the first rescue pass, Upstash Redis, Azure Blob, R2/S3-compatible storage, Vercel, Sentry, ESLint, Vitest, Playwright, and secret scanning.

Critical version decisions: Next.js 16 requires Node 20.9+; Prisma 7 introduces stricter Node requirements and should be deferred; Prisma MongoDB uses `db push`, not Prisma Migrate; NextAuth should stay on v4 until auth/session tests exist; Shaka 5 and Zoom SDK 6 should be handled in dedicated upgrade phases after smoke coverage exists.

**Core technologies:**
- Node 20 + npm: reproducible local and Vercel builds using the existing lockfile.
- Next.js App Router + Vercel: current deployment shape; route handlers remain the API boundary.
- Prisma 5 + MongoDB: existing schema uses ObjectId and MongoDB; optimize before any migration.
- NextAuth v4: preserve current Google OAuth/session/whitelist contracts while testing them.
- Axinom DRM/Encoding + Shaka Player: authoritative staging DRM and playback path.
- Zoom Meeting SDK: preserve authenticated meeting flow while cleaning assets and planning upgrade.
- Upstash Redis: distributed rate limiting, cache, system mode, and session revocation for serverless.
- Azure Blob + R2/S3: Axinom input/output and app media delivery storage.
- Vitest + Playwright + ESLint + secret scanning: minimum verification and safety tooling.

### Expected Features

**Must have (table stakes):**
- Reproducible install, setup docs, env inventory, Prisma generation, and staging runbook.
- Automated verification for lint, typecheck, build, entitlement, DRM token, HLS, Zoom signature, support, admin mutation, webhook, and smoke flows.
- Central media entitlement helper covering enrollment, open/direct access, time windows, publication/deletion, view limits, user identity, and denial reasons.
- Authorized HLS/DASH manifest access and scoped Axinom DRM token generation.
- Official Axinom trial setup mapped to repo env vars, modules, license URLs, communication keys, encoding profiles, Shaka config, and webhook flow.
- Upload/ingest status with explicit Axinom operational fields instead of `Video.description` parsing.
- Server-side Zoom signature generation, authenticated meeting page preservation, and one maintained SDK asset path.
- Role-based admin access, typed admin operations, support identity hardening, Redis-backed limits/revocation, security logging, and safe staging deployment.

**Should have (differentiators):**
- Repo-specific Axinom onboarding guide that maintainers can follow without inherited secrets.
- Unified entitlement decision/audit reason model for support and compliance.
- One-command staging smoke test covering auth, course access, DRM, Zoom, Redis, storage, and webhooks.
- Admin health dashboard for Axinom, Zoom, Redis, storage, database indexes, and webhook readiness.
- Structured redacted logging and vendor upgrade playbooks.
- Course/cohort presets, watermark policy presets, and academic navigation polish after stabilization.

**Defer (v2+ or later phases):**
- Database migration away from MongoDB unless profiling proves a blocker.
- Replacing Axinom or Zoom.
- Full academic frontend redesign before install, auth, media, DRM, Zoom, and tests are stable.
- Advanced analytics, cohort exports, operational dashboards, and granular watermark/security policies.
- Any claim that client-side screen-recording deterrence is a hard security boundary.

### Architecture Approach

Use the existing Next.js App Router surface, but move critical decisions into server-only application services and integration adapters. Pages compose UI and protected reads; route handlers validate session/input and call services; services own auth, entitlement, DRM, media delivery, Zoom, admin operations, and integration validation; adapters isolate Prisma/MongoDB, Redis, Axinom, Shaka config, Zoom, storage, Vercel, and Sentry.

**Major components:**
1. App Router pages and route handlers: UI composition plus HTTP boundaries for tokens, playlists, webhooks, signatures, support, and admin mutations.
2. Media entitlement service: single source of truth for every playback, manifest, token, license, heartbeat, and future signed-media decision.
3. DRM entitlement service: server-only Axinom License Service Message builder fed only by approved entitlement decisions.
4. Playback adapter: browser-only Shaka setup with `X-AxDRM-Message` attached only to license requests.
5. Media delivery gateway: private manifest/object access after entitlement checks, with conservative cache headers.
6. Axinom encoding adapter: one env/config boundary for encoding jobs, profiles, webhooks, asset IDs, and status updates.
7. Zoom meeting service: server-side SDK signature/JWT generation and authenticated meeting identity/watermark handling.
8. Admin operation registry: typed allowlists, validation, side effects, and audit for admin mutations.
9. Redis/session/cache boundary: distributed rate limiting, revocation, and cache behavior suitable for Vercel serverless.

### Critical Pitfalls

1. **Treating the watch page as authorization**: prevent by routing watch, DRM token, HLS playlist, license, heartbeat, and signed media through one entitlement helper and testing allow/deny parity.
2. **Issuing broad Axinom entitlements**: prevent by acting as the project Entitlement Service, checking repo access first, signing only authorized key IDs, and mirroring access windows in license policy.
3. **Misusing Axinom communication keys**: prevent by centralizing env validation, separating key ID from base64 key value, decoding before HS256 signing, and never logging tokens or key material.
4. **Leaving local DRM license stubs ambiguous**: prevent by choosing Axinom License Service for staging and disabling/quarantining local license endpoints unless real key custody is designed.
5. **Zoom signature and asset drift**: prevent by generating signatures server-side, deriving learner role/meeting from app context, and retaining one SDK package or asset directory.
6. **Serverless shared-state assumptions**: prevent by moving limits and revocation to Redis/database; treat SSE and in-memory maps as best-effort only.
7. **Stale docs and secret artifacts**: prevent by documenting MongoDB/Prisma reality, using placeholder env examples only, scanning secrets, and rotating any exposed credentials.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Installable Baseline, Docs, and Secret Hygiene
**Rationale:** No high-risk integration work is trustworthy until maintainers can install, build, validate env vars, and see failures consistently.
**Delivers:** Node/npm guidance, package script fixes, missing dependencies, Prisma generate/db push/seed path, env inventory, setup docs, secret-artifact inventory, secret scanning, lint/typecheck/build/test scripts, and initial smoke checks.
**Addresses:** Reproducible install, maintainer setup guide, env inventory, verification baseline, staging prerequisites.
**Avoids:** Documentation drift, hidden local artifacts, secret leakage, nested dependency drift, and clean-checkout failures.

### Phase 2: Central Authorization and Core Security Fixes
**Rationale:** Media entitlement drift is the highest content-leak risk and blocks credible DRM, HLS, analytics, and redesign work.
**Delivers:** Server-only media entitlement helper, shared denial model, refactored watch/token/HLS/license/heartbeat routes, no-store/dynamic protected routes, support identity hardening, Redis-backed rate/revocation checks, typed admin mutation direction, and route tests.
**Addresses:** Central entitlement, authorized manifests, DRM token access windows, session revocation, support trust boundaries, role-based admin enforcement.
**Avoids:** Watch-page-only security, route bypasses, serverless memory reliance, spoofed support data, and generic admin mutation bugs.

### Phase 3: Axinom Trial Setup and DRM/Encoding Validation
**Rationale:** Axinom is the staging DRM authority, but tenant credentials, communication keys, license messages, profiles, Shaka headers, and webhooks must be aligned with official docs after entitlement is centralized.
**Delivers:** Official Axinom trial guide, centralized Axinom env validation, scoped License Service Message signing, license URL/FairPlay cert mapping, Shaka `X-AxDRM-Message` verification, encoding profile setup, webhook signature hardening, explicit Axinom `Video` fields, and one test video playback path.
**Addresses:** DRM-protected playback, Axinom entitlement generation, encoding/profile docs, ingest processing states, webhook/sync behavior.
**Avoids:** Allow-all entitlements, base64 key misuse, local DRM stub confusion, operational ID parsing in descriptions, malformed webhook 500s.

### Phase 4: Zoom Meeting SDK Preservation and Upgrade Path
**Rationale:** Meetings are an existing workflow and should be modernized without changing auth, signature, identity, passcode, role, or watermark behavior accidentally.
**Delivers:** Authenticated signature route validation, learner/admin role rules, single SDK source of truth, duplicate asset cleanup plan, redirect fixes, upgrade guide for Zoom SDK 6, and meeting smoke tests.
**Addresses:** Zoom server-side signature/JWT generation, single maintained SDK asset path, authenticated meeting page.
**Avoids:** Client-side secrets, host-capable signatures for learners, wrong meeting joins, stale vendored assets, and version drift.

### Phase 5: Prisma/MongoDB Performance and Data Cleanup
**Rationale:** Research strongly recommends optimizing existing MongoDB before migration; this phase should follow security/integration fixes so profiling reflects intended behavior.
**Delivers:** Query profiling, indexes, admin pagination/date bounds, cached summaries, watch-page query reduction, ticket/security payload caps, watermark settings cleanup, and Axinom operational-field backfill.
**Addresses:** Database performance, admin analytics scalability, broad reads, storage of operational metadata.
**Avoids:** Premature database migration, app-side aggregation, ambiguous watermark rows, and slow staging with realistic data.

### Phase 6: Vercel Staging Deployment and Smoke Suite
**Rationale:** Staging readiness is the project target and should exercise real external services after core authorization, Axinom, Zoom, and database basics are stable.
**Delivers:** Vercel Preview/custom staging env matrix, webhook URL setup, external service checklist, smoke command, logs/error review, rollback notes, and tests for auth, courses, watch allow/deny, DRM token/playback, HLS authorization, Zoom signature, support, Redis, storage, and Axinom webhook.
**Addresses:** Staging deployment path, service readiness, serverless constraints, operational confidence.
**Avoids:** Production claims without validation, callback/domain mismatch, memory-only controls, public caching of personalized media, and long-running work in request handlers.

### Phase 7: Academic Frontend Redesign
**Rationale:** Redesign is valuable, but only after route contracts, smoke tests, and protected workflows are stable enough to catch regressions.
**Delivers:** Formal institute-style course, watch, admin, meeting, support, and auth UI refinements; accessibility/responsive pass; preserved workflow contracts; screenshots and smoke tests.
**Addresses:** Academic/institute frontend direction and navigation polish.
**Avoids:** Security-sensitive UI rewrites before tests, marketing-first redesign, and broken player/meeting/admin workflows.

### Phase 8: Maintainer Operations and Hardening
**Rationale:** After staging works, maintainers need durable playbooks for operations, upgrades, incident review, and future production hardening.
**Delivers:** Operations docs, vendor upgrade playbooks, admin health dashboard, redacted logging policy, retention/audit policy, remaining production-hardening backlog, and validated limits of watermark/screen-recording deterrence.
**Addresses:** Maintainer documentation set, operational readiness, differentiators.
**Avoids:** Overstated security guarantees and unmaintainable vendor upgrades.

### Phase Ordering Rationale

- Installability, env validation, docs, and tests come first because every later integration needs a reproducible baseline.
- Entitlement comes before Axinom because Axinom's License Service enforces signed messages, not the product's business authorization.
- Axinom comes before staging because official trial setup, communication keys, encoding profiles, webhooks, and playback must be real for staging smoke tests.
- Zoom is isolated because SDK upgrade risk is mostly asset/signature flow risk and should not mix with DRM or database changes.
- MongoDB performance follows correctness so profiling is against the intended access model.
- Frontend redesign waits until smoke tests and route contracts protect existing workflows.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** Axinom trial setup is official-doc driven but tenant-specific; portal access must confirm communication key values, license URLs, encoding profiles, storage profiles, webhook config, and FairPlay setup.
- **Phase 4:** Zoom SDK 6 upgrade should be checked against installed SDK docs/samples, asset requirements, Component View vs Client View, browser permissions, and authenticated iframe behavior.
- **Phase 6:** Staging may need callback/domain allowlist research for Axinom, Zoom, Google OAuth, Vercel Preview/custom environments, Azure/R2 CORS, and webhook URLs.
- **Phase 7:** UI redesign should use project-specific workflow review and screenshots after stabilization.

Phases with standard patterns (skip research-phase unless new constraints appear):
- **Phase 1:** Clean install, env validation, docs, lint/typecheck/build/test, and secret scanning are well-documented engineering patterns.
- **Phase 2:** Server-side authorization helpers, route-handler validation, Redis-backed rate limiting, and typed admin registries are standard patterns.
- **Phase 5:** Query profiling, indexes, pagination, bounded reads, and cache invalidation are standard MongoDB/Prisma performance work.
- **Phase 8:** Maintainer runbooks, upgrade playbooks, redacted logging, and incident documentation are standard operations work.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Current repo shape and official Next.js, Vercel, Prisma, Axinom, Zoom, and Shaka docs support keeping the stack and deferring migrations/upgrades. |
| Features | HIGH | Table stakes are strongly supported by `.planning/PROJECT.md`, local codebase maps, and integration requirements; ecosystem expectations beyond the repo are MEDIUM. |
| Architecture | HIGH | Server-owned authorization, adapter boundaries, dynamic protected routes, and Redis-backed shared state directly address observed codebase risks. |
| Pitfalls | HIGH | Most pitfalls are repo-specific and verified by local codebase concerns; Axinom/Zoom caveats are backed by official docs but require tenant/runtime validation. |

**Overall confidence:** HIGH for phase order and rescue strategy; MEDIUM for exact Axinom portal steps and Zoom major-version upgrade details until exercised with staging credentials.

### Gaps to Address

- Axinom tenant specifics: confirm trial tenant, Communication Key ID/value format, license URLs, FairPlay certificate URL, encoding credentials, storage profiles, processing profiles, webhook signing, and sample video playback during Phase 3.
- Zoom SDK upgrade specifics: validate SDK 6 package/API, served asset path, Client View vs Component View decision, meeting role rules, iframe/static page behavior, and permissions during Phase 4.
- Secret exposure status: inventory tracked files and history before staging; rotate any exposed DRM, Zoom, storage, OAuth, Redis, or private-key material.
- Existing code details: verify actual route names, env aliases, package scripts, and duplicated asset paths before finalizing phase plans.
- Production hardening: staging readiness is the target; compliance, production load, incident process, and provider replacement decisions remain later work.

## Sources

### Primary (HIGH confidence)
- `.planning/PROJECT.md` - project scope, validated/active requirements, constraints, and decisions.
- `.planning/research/STACK.md` - stack recommendations, versions, setup paths, env inventory, and official dependency links.
- `.planning/research/FEATURES.md` - table stakes, differentiators, anti-features, maintenance requirements, and feature dependencies.
- `.planning/research/ARCHITECTURE.md` - target component boundaries, data flows, patterns, anti-patterns, and build order.
- `.planning/research/PITFALLS.md` - critical/moderate/minor pitfalls and phase-specific warnings.
- Axinom DRM License Service: https://docs.axinom.com/services/drm/license-service
- Axinom Entitlement Message tool: https://docs.axinom.com/general/tools/entitlement-message
- Axinom signing License Service Messages: https://docs.axinom.com/services/drm/license-service/sign-license-service-message
- Axinom DRM Quick Start player integration: https://docs.axinom.com/services/drm/quickstart/player
- Axinom Shaka Player integration: https://docs.axinom.com/services/drm/players/shaka
- Axinom Encoding API quickstart: https://docs.axinom.com/services/encoding/quickstart/using-api/api
- Axinom Encoding Profiles setup: https://docs.axinom.com/services/video/setup-encoding-profiles/
- Zoom Meeting SDK web docs: https://developers.zoom.us/docs/meeting-sdk/web/
- Zoom Meeting SDK authorization docs: https://developers.zoom.us/docs/meeting-sdk/auth/
- Zoom Meeting SDK web sample: https://github.com/zoom/meetingsdk-web-sample
- Zoom Meeting SDK auth endpoint sample: https://github.com/zoom/meetingsdk-auth-endpoint-sample
- Shaka Player DRM configuration: https://shaka-player-demo.appspot.com/docs/api/tutorial-drm-config.html
- Shaka Player license server auth: https://shaka-player-demo.appspot.com/docs/api/tutorial-license-server-auth.html
- Next.js installation and Node requirements: https://nextjs.org/docs/app/getting-started/installation
- Next.js caching docs: https://nextjs.org/docs/app/building-your-application/caching
- Vercel Next.js docs: https://vercel.com/docs/frameworks/nextjs
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Prisma MongoDB connector: https://www.prisma.io/docs/orm/core-concepts/supported-databases/mongodb
- Prisma `db push`: https://www.prisma.io/docs/cli/db/push
- Prisma Vercel deployment notes: https://www.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel
- Playwright installation: https://playwright.dev/docs/intro

### Secondary (MEDIUM confidence)
- Local codebase maps under `.planning/codebase/` - high confidence for repo condition, but implementation should re-check actual files before edits.
- npm latest-version observations in research files - useful for upgrade planning, but should be refreshed at phase start.

---
*Research completed: 2026-05-05*
*Ready for roadmap: yes*
