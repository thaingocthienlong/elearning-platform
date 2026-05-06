# Phase 5: Prisma/MongoDB Performance and Data Cleanup - Context

**Gathered:** 2026-05-06T09:02:08.5302595+07:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 optimizes the current Prisma/MongoDB implementation before any migration decision. It focuses on query shape, bounded reads, indexes, small data-growth controls, and maintainer evidence for staging readiness.

</domain>

<decisions>
## Implementation Decisions

### Optimization Scope
- Optimize current Prisma/MongoDB query shape, indexes, and bounded reads first.
- Database migration remains out of scope unless profiling proves MongoDB cannot meet staging needs.
- Evidence should come from code/query review, targeted tests, and documentation; no synthetic load-test harness in this phase.
- Prioritize watch page queries, admin analytics, ticket/security-event bounds, and watermark settings.

### Query And Index Strategy
- Apply targeted fixes to known hotspots while preserving response shapes.
- Add or review Prisma MongoDB indexes for observed high-traffic filters and sorts.
- Improve admin analytics with bounded ranges/limits and low-risk short-lived caching where useful.
- Improve the watch page by removing redundant video reads and reusing already-loaded course/video IDs.

### Data Growth And Retention
- Enforce or document support ticket diagnostic payload bounds and truncation behavior.
- Add or document security-event query/retention bounds; avoid unbounded dashboard reads.
- Move watermark settings toward one active settings document or explicit singleton read/update behavior.
- Keep historical cleanup non-destructive in this phase; no destructive migration of existing records.

### Verification And Documentation
- Prove the phase with focused tests for changed query/bounds behavior plus docs describing profiling evidence.
- Write maintainer documentation for before/after risks, chosen indexes, and bounds.
- Add short-lived cache only for low-risk summaries with clear TTL/invalidation.
- Completion is blocked by tests, typecheck, build, and docs; real staging latency numbers defer to Phase 6.

### the agent's Discretion
The agent may choose exact helper names, cache keys, test shape, and documentation filename. Preserve existing route response shapes unless a change is explicitly documented.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/media-entitlement.ts` already centralizes watch-page authorization and returns the current video, user, watch record, and effective view limit.
- `src/lib/request-security.ts` already defines support diagnostic limits and redaction helpers.
- `src/lib/redis.ts` already provides `getCached` and `invalidateCache` for low-risk short-lived summary caching.

### Established Patterns
- Prisma schema uses MongoDB and ObjectId fields. Optimization should use indexes, bounded query shapes, and Prisma-compatible changes rather than relational migration assumptions.
- Admin routes validate `session.user.role === "ADMIN"` before broad reads.
- Existing docs correct the PostgreSQL drift and should be extended instead of introducing a second database story.

### Integration Points
- `src/app/watch/[videoId]/page.tsx` has a duplicate `video.findMany` inside the watch-record query for sidebar completion state.
- `src/app/api/admin/analytics/route.ts` performs multiple broad reads and application-side reductions.
- `src/app/api/admin/security-events/route.ts` paginates but accepts unbounded `limit` and lacks explicit date bounds.
- `src/app/api/admin/watermark-settings/route.ts`, `src/app/api/watermark/settings/route.ts`, and `src/app/api/zoom/signature/route.ts` read latest watermark settings by `updatedAt`.
- `prisma/schema.prisma` has many useful indexes already, but `Ticket`, `SecurityEvent`, `WatchRecord`, and `WatermarkSettings` can be tightened for Phase 5 query shapes.

</code_context>

<specifics>
## Specific Ideas

The accepted direction is a pragmatic performance pass: remove obvious duplicate queries, bound broad admin reads, document current MongoDB indexes and limits, and avoid any destructive data migration.

</specifics>

<deferred>
## Deferred Ideas

- Real staging latency measurements belong in Phase 6.
- Database migration planning remains deferred until profiling shows current MongoDB optimization cannot satisfy staging needs.

</deferred>

