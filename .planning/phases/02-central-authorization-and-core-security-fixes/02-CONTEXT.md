# Phase 2: Central Authorization and Core Security Fixes - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers server-owned security consistency for media entitlement, support ticket abuse controls, malformed Axinom webhook signatures, selected admin destructive actions, and logging/redaction on touched security routes. It must preserve the existing user-facing course, watch, support, and admin workflows while tightening denied paths and adding automated tests for the critical behavior.

</domain>

<decisions>
## Implementation Decisions

### Media Entitlement Contract
- Use one server-only helper in `src/lib/media-entitlement.ts` as the source of truth for media access, returning the authenticated user, video, entitlement status, effective view limit, and denial reason.
- Enforce authenticated user, user existence, video existence, video deletion/publication state, open-course access, enrollment, direct `VideoAccess`, `expiresAt`, `validFrom`, `validUntil`, and view limits.
- Use internal denial codes plus sanitized HTTP mapping: 401 for unauthenticated, 404 for missing/unpublished video, and 403 for denied, expired, not-yet-valid, period-ended, or view-limit failures.
- Make the watch page, DRM token route, HLS playlist route, local license route, heartbeat route, and future media routes consume the shared helper directly.

### Support Ticket Abuse Controls
- For authenticated users, derive `email` and `userId` from the session and reject request-body/session email mismatches; unauthenticated ticket creation remains unavailable unless explicitly designed later.
- Enforce byte and entry limits for `description`, `consoleLogs`, `browserInfo`, and `pageUrl`; truncate or reject oversized payloads before persistence.
- Add recursive redaction for common token, key, email, password, cookie, and authorization fields before storing `consoleLogs` and `browserInfo`.
- Move ticket-specific rate limiting to Upstash Redis when configured, keyed by session/user/email plus IP where available, with a local fallback for development.

### Admin, Webhook, And Logging Safety
- Protect security-event flushing with explicit confirmation text and admin identity audit metadata; prefer recording a flush audit event before or after delete.
- Validate Axinom webhook signature format and buffer length before `crypto.timingSafeEqual`; invalid or malformed signatures return 403 instead of 500.
- Add a small server logger/redaction utility and use it on touched Phase 2 routes to avoid raw tokens, keys, emails, and credential-like values.
- Scope Phase 2 admin hardening to destructive security-event protection and logging; leave the broader typed admin CRUD registry for a later admin/data phase unless tests expose urgent breakage.

### Phase 2 Test And Rollout Strategy
- Add Jest route/helper tests for entitlement allow/deny, DRM token denial, HLS denial, heartbeat denial/view-limit behavior, support mismatch/limits/redaction/rate-limit paths, and malformed webhook signatures.
- Mock Prisma and `getServerSession` at route boundaries, with focused factories for users, videos, courses, enrollments, access grants, watch records, and tickets.
- Preserve user-facing routes and success paths; tighten denied paths first; keep deny messages sanitized and document changed status behavior in summaries.
- Defer Axinom official setup, Zoom SDK cleanup, database indexing/performance, full admin CRUD registry, and UI redesign to their mapped later phases.

### the agent's Discretion
No additional discretionary decisions were requested. Use existing codebase patterns, conservative route-level changes, and focused tests.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/auth.ts` exports `authOptions` for route and page session checks.
- `src/lib/prisma.ts` exports the Prisma singleton and is the current data access path.
- `src/lib/redis.ts` exposes optional Upstash helpers and gracefully returns `null` when Redis env vars are absent.
- Existing Jest setup from Phase 1 supports direct route/helper tests with `@/*` imports.

### Established Patterns
- App Router pages and API routes call `getServerSession(authOptions)` directly.
- Route handlers return `NextResponse` with simple status codes and JSON where needed.
- Server components redirect or call `notFound()` rather than returning JSON.
- Current code favors local helpers under `src/lib` for shared server behavior.

### Integration Points
- Watch page: `src/app/watch/[videoId]/page.tsx`
- DRM token route: `src/app/api/drm/token/route.ts`
- Local DRM license route: `src/app/api/drm/license/route.ts`
- HLS playlist route: `src/app/api/hls/playlist/[videoId]/route.ts`
- Heartbeat route: `src/app/api/watch/heartbeat/route.ts`
- Support ticket route: `src/app/api/support/ticket/route.ts`
- Security events route: `src/app/api/admin/security-events/route.ts`
- Axinom webhook route: `src/app/api/webhook/axinom/route.ts`
- Prisma models: `User`, `Course`, `Video`, `Enrollment`, `VideoAccess`, `WatchRecord`, `Ticket`, and `SecurityEvent`.

</code_context>

<specifics>
## Specific Ideas

- The shared entitlement helper should remove the current drift where the watch page enforces access windows and view limits but DRM/HLS/license/heartbeat routes enforce only subsets.
- HLS playlist access must not succeed for a signed-in but unauthorized user.
- DRM token issuance must not ignore expired, not-yet-valid, or ended direct-access windows.
- Support tickets should not persist client-supplied identity or raw sensitive diagnostic fields.
- Malformed webhook signatures should be treated as invalid signatures, not server errors.

</specifics>

<deferred>
## Deferred Ideas

- Official Axinom setup and deeper Axinom operational field migration remain Phase 3.
- Zoom SDK cleanup and role/signature modernization remain Phase 4.
- Database indexing, broad admin query optimization, and full typed admin CRUD registry remain later data/admin work.
- Academic frontend redesign remains Phase 7.

</deferred>
