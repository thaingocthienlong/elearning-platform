# Task Brief

## Goal

Make every current admin navigation surface load safely and make its visible create, edit, revoke, status, upload, and delete actions perform the advertised operation.

## Lane

security-sensitive change

## Scope

In scope:

- Admin pages, shared admin components/hooks, and admin-facing route handlers.
- Prisma/MongoDB reads that currently crash on orphan relations.
- Typed create, update, soft-delete, and restore behavior for generic admin tables.
- Tencent video upload course selection, status refresh, and provider-confirmed deletion.
- Regression tests, browser smoke, verification record, handoff, and rollback notes.

Out of scope:

- Database migration, production data cleanup, or external media deletion outside an explicit admin delete request.
- Zoom, learner playback, support submission, or broad visual redesign work unrelated to admin reliability.
- Reading, printing, copying, or changing environment and secret values.

## Current Evidence

- Baseline `npm test -- --runInBand`: 31 suites and 112 tests passed.
- Baseline `npm run typecheck`: passed.
- Baseline `npm run lint`: passed with 132 inherited warnings, including admin generic `any` and placeholder warnings.
- `src/app/api/admin/views/route.ts` and `src/app/api/admin/session-fingerprints/route.ts` again use required-relation includes that previously failed on orphan rows.
- `src/app/api/admin/create/route.ts` supplies `crypto.randomUUID()` to a MongoDB `@db.ObjectId` field with `@default(auto())`.
- `src/components/admin/GenericTable.tsx` exposes an Edit action whose handler is only a placeholder.
- `src/lib/tencent/vod.ts` implements `deleteTencentMedia`, but no admin route or UI invokes it.
- `src/app/admin/videos/page.tsx` loads public published courses instead of the complete admin course list.

## Tools To Use

- Workflow: `codex-operating-workflow`.
- Code discovery: fresh `codebase-memory-mcp` index first; `rg` for string/config checks.
- Current docs: Context7 Prisma documentation and official Tencent VOD `DeleteMedia` documentation.
- Browser proof: local or signed-in admin smoke when a usable session is available.
- Security scan: targeted admin authorization review plus `npm run secrets:scan`.
- Subagents: independent read-only audits when available; root agent owns edits and verification.

## No-Secret Rule

Do not read, print, copy, or commit secret values from env files, key files, certificates, service credentials, DRM artifacts, or media keys. List sensitive-looking paths by path only.

## Expected Deliverable

- Admin reliability fixes implemented with regression tests, full repository gates, browser evidence when feasible, verification record, handoff, and exact rollback guidance.
