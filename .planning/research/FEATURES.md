# Feature Landscape

**Domain:** Secure academic streaming/course platform rescue
**Researched:** 2026-05-05
**Research mode:** Features dimension
**Overall confidence:** HIGH for repo-local capability inventory and official Axinom/Zoom integration requirements; MEDIUM for ecosystem expectations beyond the current codebase.

## Table Stakes

Features users and maintainers expect. Missing or broken = the product feels unsafe, unfinished, or unmaintainable.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Reproducible local install and launch | A handed-over platform must run from a clean checkout before any rescue work is trustworthy. | Medium | `package.json`, lockfile, Node version, Prisma generate, env docs, seed/setup scripts | Current README has database drift: it names PostgreSQL while Prisma is configured for MongoDB. Correct docs are table stakes, not polish. |
| Explicit environment variable inventory | DRM, Zoom, auth, Redis, storage, and deployment all depend on secrets and service URLs. | Medium | NextAuth, Prisma/MongoDB, Upstash Redis, Axinom, Zoom, Azure/R2, Vercel | Use placeholder examples only. Do not copy inherited secret-like files into docs. |
| Maintainer setup guide | The maintainer needs prerequisites, service accounts, install commands, setup order, and verification steps. | Medium | Install reproducibility, env inventory, service verification scripts | This should be a first-phase deliverable because it reduces guesswork across every later phase. |
| Automated or scripted verification | Critical flows cannot be rescued safely without repeatable checks. | High | Test runner selection, mocks, seed data, existing `verify-*` scripts | Start with lint/build plus focused route/service tests for entitlement, auth, Zoom signature, support, admin mutations, and webhooks. |
| Authenticated course catalog and course detail views | Academic streaming users expect enrolled/open courses to be visible after sign-in. | Medium | NextAuth, Prisma `User`, `Course`, `Enrollment`, cache | Existing flow is present but should be covered by tests and staging smoke checks. |
| Centralized media entitlement helper | Every media-serving route must agree on access, time windows, enrollment, direct grants, and view limits. | High | Prisma `Enrollment`, `VideoAccess`, `WatchRecord`, `Video`, server-only auth helper | This is the highest-priority product capability fix because current route drift creates access holes. |
| Authorized HLS/DASH manifest access | Authenticated users should only fetch playlists/manifests for media they are entitled to watch. | High | Entitlement helper, storage proxy/signing, video metadata, cache | Current HLS playlist endpoint is known to miss entitlement enforcement. |
| DRM-protected playback through Axinom | Secure paid/institute video platforms need real license authorization, not only page gating. | High | Axinom DRM tenant, communication key, entitlement messages, license service URLs, Shaka Player, content key IDs | Axinom docs state the project-specific entitlement service must authorize the user and produce tamper-proof entitlement messages consumed by the License Service. |
| Axinom entitlement message generation | The app must generate valid, scoped messages for authorized key IDs and license restrictions. | High | Communication key, signing implementation, video key IDs, user/session context | Include start/expiration/duration rules, persistence policy, key ID allowlist, and user/session fields. Avoid allow-all outside development/test. |
| Axinom Shaka Player integration | Browser playback must pass Axinom license service messages to license requests in the Shaka DRM configuration. | Medium | Shaka Player, Axinom license URLs, generated entitlement token/message, browser DRM support | Existing Shaka flow should be validated against official Axinom player docs rather than inherited assumptions. |
| Axinom encoding/profile setup documentation | Maintainers need to create input/output storage, encoding profiles, service account credentials, protected outputs, and job/webhook paths. | High | Axinom Encoding, Axinom Video Service, Azure Blob or S3-compatible storage, encrypted credentials | Official Axinom docs require acquisition/publishing profiles and recommend encrypting storage secrets with credentials protection. |
| Upload/ingest workflow with clear processing states | Admins need to add course videos and understand whether encoding, DRM protection, and publishing succeeded. | High | Storage, Axinom encoding API, webhook/sync, Prisma video status fields | Current use of `Video.description` for Axinom IDs is not maintainable; explicit operational fields are table stakes for rescue. |
| Watermarked secure player | Academic/institute content usually needs traceable viewing for leak deterrence. | Medium | Server-derived user identity, watermark settings, player overlay, security events | Treat as deterrence and audit signal, not a hard security boundary. |
| Heartbeat and watch progress tracking | Users expect resume/progress; admins expect engagement visibility. | Medium | Player heartbeat, `WatchRecord`, admin analytics | Optimize write frequency and test view-count semantics before relying on analytics. |
| Session revocation and device/session controls | Secure streaming platforms need the ability to revoke compromised sessions and enforce institutional rules. | High | NextAuth database sessions, Redis revocation keys, SSE/polling, middleware | Existing implementation is fragile across serverless instances; Redis-backed enforcement is table stakes, instance-local SSE is only an optimization. |
| Role-based admin access | Admin areas must not be reachable by normal learners. | Medium | NextAuth role enrichment, route checks, middleware, tests | Admin routes should use explicit permission checks, not duplicated ad hoc checks. |
| Admin user, whitelist, course, video, access, ticket, watermark, analytics management | Maintainers need operational control without database surgery. | High | Prisma models, admin UI, typed API routes, audit logging | Current generic admin CRUD should be replaced or constrained with typed registries and field allowlists. |
| Support ticket flow tied to authenticated identity | Learners need support, and admins need trustworthy identity and diagnostics. | Medium | NextAuth session, ticket model, reCAPTCHA/rate limit, logging redaction | For signed-in users, derive email from session and cap/sanitize client diagnostics. |
| Security event capture and retention | DRM/security incidents need review without unbounded storage or destructive blind deletes. | Medium | `SecurityEvent`, admin UI, throttling, retention policy, audit trail | Security event flush should require audit metadata and likely archival/retention rather than blanket delete. |
| Zoom Meeting SDK integration | Course platforms often include live class/session access; current product already has this flow. | Medium | `@zoom/meetingsdk`, server-side signature API, meeting number/passcode, authenticated meeting page | Preserve the current authenticated meeting flow while upgrading assets and SDK usage. |
| Zoom server-side signature/JWT generation | Zoom official samples require a backend-generated Meeting SDK JWT/signature before joining. | Medium | Zoom Meeting SDK key/client ID, secret/client secret, meeting number, role, expiration | The signature endpoint must validate role, meeting config, auth, and avoid exposing SDK secrets to the browser. |
| Single maintained Zoom SDK asset/source path | Duplicated SDK bundles cause upgrade drift and security-review noise. | Medium | `@zoom/meetingsdk`, `public/zoom*`, `zoom-webapp`, documented upgrade process | Pick package-based integration where possible; if vendoring remains necessary, keep one versioned artifact path. |
| Staging deployment path | Rescue target is staging readiness, not production certification. | High | Vercel, MongoDB, Redis, Axinom, Zoom, storage, webhooks, env vars, smoke tests | Include staging env var checklist, webhook public URL setup, build/runtime checks, and rollback notes. |
| Academic/institute frontend redesign | The platform should look credible for institutional learning while preserving workflows. | Medium | Existing pages/components, Tailwind/shadcn/Radix/MUI cleanup, accessibility | Redesign after stabilization. Use restrained academic information architecture, not a marketing landing-page rewrite. |
| Database performance pass | Admin analytics, watch pages, and broad reads need predictable staging behavior. | Medium | Prisma/MongoDB profiling, indexes, query limits, cache | Optimize existing MongoDB first. Migration is out of scope until profiling shows a database-provider blocker. |
| Maintainer documentation set | A maintained platform needs setup, service setup, staging, testing, operations, and upgrade docs. | Medium | README replacement/addendum, official Axinom and Zoom mappings, verification scripts | Documentation should separate verified facts from stale inherited claims. |

## Differentiators

Features that can make the platform stronger once table stakes are stable.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Official Axinom trial onboarding guide mapped to repo modules | Reduces handoff risk by showing exactly how tenant setup, communication keys, entitlement messages, encoding profiles, and env vars map to this codebase. | High | Axinom Portal, DRM License Service, Encoding, Shaka, repo env validation | This is a differentiator for maintainability even though DRM itself is table stakes. |
| Unified entitlement decision/audit reason model | Admins can explain why a learner can or cannot watch a video. | Medium | Shared entitlement helper, denial codes, admin/user-facing messages, tests | Useful for support and compliance; should follow after the helper exists. |
| Staging smoke-test command | Maintainers can verify auth, course access, DRM token, Zoom signature, Redis, storage, and webhook reachability with one command. | High | Seed/test account, Playwright or route tests, service health checks | Distinguishes the platform from a fragile inherited app. |
| Admin operational health dashboard | Shows integration readiness: Axinom credentials, Zoom signature config, Redis, storage, database indexes, webhook URL state. | Medium | Health-check APIs, secret-safe status reporting, admin permissions | Valuable after setup docs and smoke tests are in place. |
| Course/cohort access presets | Academic admins can grant access by class, cohort, institute, semester, or expiry window. | Medium | Data model changes, entitlement helper, admin UX | Build only after base access rules are centralized. |
| Watermark policy presets | Admins can choose formal policies such as static, rotating, high-risk, meeting-visible, or exam mode. | Medium | Watermark settings model, player overlay, Zoom identity conventions | Keep server-derived identity as the source of truth. |
| Structured redacted logging | Faster operations and safer support without leaking tokens, emails, or credentials. | Medium | Logger utility, Sentry, redaction rules, route refactors | Particularly valuable because current console logging is broad and raw. |
| Academic content navigation polish | Course pages can feel like a formal institute portal with syllabus structure, modules, progress, and resources. | Medium | Frontend redesign, data model, content admin | Defer until install/security/testing no longer block. |
| Instructor/admin analytics summaries | Cohort progress and engagement reports help academic staff act on the data. | Medium | Optimized aggregates, cache, filters, export policy | Avoid unbounded application-side aggregation. |
| Documented SDK/vendor upgrade playbooks | Maintainers can update Zoom, Shaka, Axinom integration code, and security dependencies predictably. | Low | Dependency inventory, package scripts, staging smoke tests | High leverage for future maintenance. |

## Anti-Features

Features to explicitly avoid in this rescue milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Treating screen-recording prevention as guaranteed security | Browser/client deterrence can be bypassed and should not be represented as an enforceable boundary. | Enforce server-side entitlement, Axinom DRM licenses, short access windows, watermarking, and audit events. |
| Allow-all Axinom entitlement messages in staging/production | Axinom docs warn this grants licenses for any key ID and recommend it only for development/test when risks are understood. | Generate key-ID-scoped entitlement messages with license restrictions. |
| Client-side Zoom signature generation | It exposes SDK secrets and violates the backend signature model in Zoom official samples. | Keep signature/JWT generation server-side behind authenticated, validated API routes. |
| Replacing Zoom with another provider | The milestone explicitly preserves the current Zoom flow. | Upgrade the current Meeting SDK integration and document the retained source of truth. |
| Replacing Axinom DRM in v1 | The product is already built around Axinom trial services and must first become reproducible. | Validate and document Axinom, then revisit providers only in a future roadmap if evidence supports it. |
| Immediate database migration | It expands blast radius before tests, profiling, and staging checks exist. | Optimize Prisma/MongoDB queries and indexes first. |
| Marketing-site redesign before stabilization | Visual polish cannot compensate for broken install, auth, media access, or DRM. | Redesign workflow screens in an academic style after rescue foundations are reliable. |
| Generic dynamic admin mutation for all models | It bypasses type safety and breaks on model-specific fields like tickets. | Use typed model registries or focused routes with validation and side-effect handling. |
| Trusting client-supplied support identity/diagnostics | Users can spoof email and submit oversized/sensitive payloads. | Derive identity from session, enforce payload limits, sanitize recursively, rate limit with Redis. |
| Committing copied secrets, DRM keys, local certs, or generated media artifacts | It creates credential-rotation and legal/security risk. | Keep `.example` files only, rotate exposed credentials, and document secret provenance. |

## Maintenance Requirements

| Requirement | Why Required | Complexity | Dependency Notes |
|-------------|--------------|------------|------------------|
| Correct README/setup docs | Current README contains stale database claims and incomplete env/service setup. | Medium | Must be updated from actual Prisma schema and verified service requirements. |
| `.env.example` or equivalent placeholder inventory | Maintainers need safe placeholders and descriptions without leaking inherited values. | Low | Include Axinom, Zoom, NextAuth, MongoDB, Redis, storage, Sentry/Vercel as applicable. |
| Dependency health check | Missing direct dependencies and vendored assets can break clean installs. | Medium | Add missing direct dependencies, clarify Node/npm versions, keep `postinstall` Prisma generate. |
| Test script and minimum critical tests | Rescue work needs automated regression checks. | High | Start with entitlement, DRM token, HLS playlist, Zoom signature, support ticket, admin mutation, webhook signature tests. |
| Staging runbook | Maintainer needs deployment order, env var setup, external service readiness, smoke tests, and rollback steps. | High | Vercel plus MongoDB, Upstash Redis, Axinom, Zoom, Azure/R2, webhook URLs. |
| Official Axinom trial setup guide | DRM setup is inherited and central to product value. | High | Must cover account/tenant, communication key, license service URL, entitlement signing, key IDs, encoding/storage/profile setup, Shaka mapping. |
| Official Zoom upgrade guide | Meeting flow depends on SDK package/assets and a signature endpoint. | Medium | Must cover SDK version, implementation type, asset source, backend JWT/signature, meeting number/passcode/role, user identity/watermark behavior. |
| Secret handling and rotation notes | Secret-like files exist in workspace and may have history risk. | Medium | Document detection, removal, rotation decision boundaries, and CI secret scanning. |
| Integration failure handling | DRM, encoding, Zoom, Redis, and storage failures should be visible and actionable. | Medium | Add user-safe errors, admin diagnostics, structured logs, and retry/idempotency where needed. |
| Performance/index review notes | Staging should not depend on broad admin reads or redundant watch-page queries. | Medium | Profile before changing database provider; add indexes and cache summaries where needed. |

## Feature Dependencies

```text
Clean install -> Setup docs -> Test/build verification -> Staging runbook

Env inventory -> Axinom trial setup guide -> Axinom entitlement validation -> DRM playback repair

Central entitlement helper -> Watch page access -> DRM token route -> HLS playlist route -> Playback smoke tests

Central entitlement helper -> Admin access grants -> Support denial explanations -> Analytics accuracy

Zoom SDK source-of-truth decision -> Server-side signature route validation -> Authenticated meeting page preservation -> Zoom upgrade guide

Typed admin API registry -> Admin user/course/video/ticket actions -> Audit logging -> Admin tests

Database profiling -> Query/index fixes -> Cached dashboard summaries -> Staging load confidence

Security logging/redaction -> Support diagnostics safety -> Operational health dashboard

Stabilized workflows -> Academic frontend redesign -> Accessibility/responsive polish
```

## MVP Recommendation

Prioritize:
1. Reproducible install, accurate setup docs, env inventory, and a minimal verification command.
2. Centralized media entitlement with route-level enforcement for watch, DRM token, and HLS playlist access.
3. Official Axinom trial setup documentation plus validation of entitlement signing, license URLs, Shaka configuration, encoding profiles, and webhook/sync assumptions.
4. Zoom Meeting SDK upgrade path preserving authenticated meeting page, server-side signature route, meeting number/passcode, role, and user identity/watermark behavior.
5. Staging deployment runbook and smoke tests covering auth, course access, DRM token/playback, Zoom signature, Redis, storage, and webhook reachability.

Defer:
- Full academic frontend redesign: blocked by stabilization and should preserve existing workflows.
- Database migration: requires profiling evidence after MongoDB optimization.
- Advanced cohort analytics and operational dashboards: valuable, but depend on stable data contracts and indexed queries.
- More granular watermark/security policies: useful after server-side entitlement and audit behavior are correct.

## Complexity and Risk Notes

| Area | Complexity | Risk | Phase Implication |
|------|------------|------|-------------------|
| DRM entitlement and Axinom setup | High | Access-control bugs can become content leaks or playback outages. | Needs early focused phase with official-doc validation and tests. |
| Zoom SDK modernization | Medium | SDK asset duplication and version drift can break meetings or bloat deployment. | Keep scope to preserving the current meeting flow and documenting source of truth. |
| Admin mutation repair | High | Generic routes can mutate wrong models or fail at runtime. | Needs typed refactor after tests exist for current behavior. |
| Support/security hardening | Medium | Spoofed identity and oversized diagnostics can pollute support/admin data. | Pair with Redis rate limiting and logging redaction. |
| Staging deployment | High | External service setup order and webhook URLs can block validation. | Build runbook alongside smoke tests, not after all features are complete. |
| Frontend redesign | Medium | Redesign can accidentally break protected workflows. | Do after workflow tests and staging baseline. |

## Sources

- Local project context: `.planning/PROJECT.md` (HIGH confidence)
- Local codebase map: `.planning/codebase/ARCHITECTURE.md` (HIGH confidence)
- Local concern audit: `.planning/codebase/CONCERNS.md` (HIGH confidence)
- Local testing map: `.planning/codebase/TESTING.md` (HIGH confidence)
- Local README drift reference: `README.md` (HIGH confidence for drift identification)
- Axinom DRM License Service: https://docs.axinom.com/services/drm/license-service (HIGH confidence)
- Axinom Entitlement Message tool: https://docs.axinom.com/general/tools/entitlement-message (HIGH confidence)
- Axinom signing License Service Messages: https://docs.axinom.com/services/drm/license-service/sign-license-service-message (HIGH confidence)
- Axinom DRM Quick Start player integration: https://docs.axinom.com/services/drm/quickstart/player (HIGH confidence)
- Axinom Shaka Player integration: https://docs.axinom.com/services/drm/players/shaka (HIGH confidence)
- Axinom Encoding API quickstart: https://docs.axinom.com/services/encoding/quickstart/using-api/api (HIGH confidence)
- Axinom Encoding Profiles setup: https://docs.axinom.com/services/video/setup-encoding-profiles/ (HIGH confidence)
- Zoom Meeting SDK web sample: https://github.com/zoom/meetingsdk-web-sample (HIGH confidence for sample-supported integration shapes and latest sample release metadata)
- Zoom Meeting SDK auth endpoint sample: https://github.com/zoom/meetingsdk-auth-endpoint-sample (HIGH confidence for server-side JWT/signature requirement and request fields)

