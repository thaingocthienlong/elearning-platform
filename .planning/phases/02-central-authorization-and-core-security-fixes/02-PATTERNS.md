---
phase: 02-central-authorization-and-core-security-fixes
status: complete
created_at: 2026-05-05
---

# Phase 2 Patterns

## Existing Patterns To Reuse

- `getServerSession(authOptions)` is used directly in API route handlers and server components.
- Prisma access is centralized through `src/lib/prisma.ts`.
- Route handlers return `NextResponse` with early auth checks and simple status codes.
- Local helper modules under `src/lib` are the right place for reusable server behavior.
- Jest tests live under `__tests__` and use direct file imports.

## New Patterns To Establish

- Shared authorization helpers must return typed decisions, not throw for expected denials.
- Route handlers should map internal denial codes to sanitized HTTP responses.
- Security-sensitive tests should mock route boundaries instead of requiring real service credentials.
- Touched security routes should use redacted logging instead of raw `console.*`.
- Support diagnostics should be bounded and recursively redacted before persistence.

## Files Most Likely To Change

- `src/lib/media-entitlement.ts`
- `src/lib/request-security.ts`
- `src/lib/server-log.ts`
- `src/app/watch/[videoId]/page.tsx`
- `src/app/api/drm/token/route.ts`
- `src/app/api/drm/license/route.ts`
- `src/app/api/hls/playlist/[videoId]/route.ts`
- `src/app/api/watch/heartbeat/route.ts`
- `src/app/api/support/ticket/route.ts`
- `src/app/api/webhook/axinom/route.ts`
- `src/app/api/admin/security-events/route.ts`
- `__tests__/lib/media-entitlement.test.ts`
- `__tests__/api/media-routes.test.ts`
- `__tests__/api/support-ticket.test.ts`
- `__tests__/api/webhook-and-admin-security.test.ts`

## Constraints

- Do not implement official Axinom setup or field migration in this phase.
- Do not redesign frontend pages in this phase.
- Do not introduce a database migration unless directly required for a security fix.
- Do not require real Redis, Axinom, R2, Azure, SMTP, or Google reCAPTCHA credentials for tests.
