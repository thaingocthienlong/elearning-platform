---
phase: 02-central-authorization-and-core-security-fixes
status: complete
researched_at: 2026-05-05
requirements:
  - SEC-01
  - SEC-02
  - SEC-03
  - SEC-04
  - SEC-05
  - SEC-06
  - SEC-07
  - SEC-08
  - SEC-09
  - SEC-10
  - SEC-11
  - TEST-02
  - TEST-03
  - TEST-05
  - TEST-06
---

# Phase 2 Research

## Implementation Shape

Phase 2 should be implemented as a set of server-side security contracts with tests around helper behavior and route behavior. The existing code has route-local checks across watch, DRM token, local license, HLS playlist, and heartbeat. The watch page has the broadest rule set, so the first implementation task should extract its rules into a reusable server-only helper.

## Existing Risk Areas

- `src/app/watch/[videoId]/page.tsx` checks enrollment, direct video access, access windows, and view limits, but it also performs redundant video queries.
- `src/app/api/drm/token/route.ts` checks enrollment and `VideoAccess` existence but does not check direct-access date windows or view limits.
- `src/app/api/hls/playlist/[videoId]/route.ts` only checks authentication before streaming a playlist.
- `src/app/api/drm/license/route.ts` is a local license stub; it currently performs partial entitlement only when `videoId` is supplied.
- `src/app/api/watch/heartbeat/route.ts` records watch progress and view counts without confirming the current user is still entitled to the video.
- `src/app/api/support/ticket/route.ts` trusts request-body email, uses process-local rate limiting, stores client diagnostics with minimal server-side bounds, and logs raw email.
- `src/app/api/webhook/axinom/route.ts` can throw before returning a controlled denial for malformed signatures because `timingSafeEqual` requires equal buffer lengths.
- `src/app/api/admin/security-events/route.ts` allows any admin to delete all events without explicit confirmation or an audit breadcrumb.

## Recommended Abstractions

### `src/lib/media-entitlement.ts`

Expose a server-only helper with explicit input and output types:

- `evaluateMediaEntitlement({ session, videoId, requirePublished, checkViewLimit })`
- `mapEntitlementToHttp(result)`
- denial codes such as `UNAUTHENTICATED`, `USER_NOT_FOUND`, `VIDEO_NOT_FOUND`, `VIDEO_UNPUBLISHED`, `NOT_ENROLLED`, `NO_VIDEO_ACCESS`, `ACCESS_EXPIRED`, `ACCESS_NOT_YET_VALID`, `ACCESS_PERIOD_ENDED`, and `VIEW_LIMIT_EXCEEDED`

The helper should select only fields required by route consumers and avoid printing sensitive details.

### `src/lib/request-security.ts`

Small server utility for:

- recursive redaction of sensitive diagnostic keys and string patterns
- payload byte measurement
- bounded JSON truncation/rejection decisions
- optional client IP extraction from forwarded headers

### `src/lib/server-log.ts`

Small logger wrapper for touched routes:

- `log.warn(event, metadata)`
- `log.error(event, errorOrMetadata)`
- recursive redaction before output
- no raw tokens, keys, cookies, authorization headers, or user email values in logs

### Redis Rate Limiting

Use existing `getRedisClient()` where configured. Keep local fallback for development because Phase 1 explicitly supports placeholder-only local setup. The support route should not fail closed solely because Redis env is absent locally, but strict staging docs can later require Redis.

## Test Strategy

Use Jest route/helper tests with mocked `next-auth` and Prisma:

- helper tests cover open course, enrollment/direct access, date windows, publication/deletion state, and view limits.
- route tests verify DRM/HLS/heartbeat deny calls route through helper behavior.
- support tests verify session-derived email, mismatch rejection, payload bounds, redaction, and Redis/local rate limit behavior.
- webhook tests verify missing, malformed, wrong-length, and wrong signatures return 401/403 instead of 500.
- admin tests verify security-event flush requires confirmation and records an audit breadcrumb.

## Plan Split

1. Build the entitlement helper and tests.
2. Adopt the helper in media/token/playlist/license/heartbeat surfaces.
3. Harden support ticket identity, diagnostics, and rate limiting.
4. Harden webhook signatures, security-event flush, and touched-route logging.

This ordering keeps the riskiest shared helper first and avoids mixing support/admin changes into media route refactors.
