# 05-03 Summary: Ticket Diagnostics And Watermark Singleton Behavior

## Status

Complete.

## What Changed

- `docs/database-performance.md` documents support diagnostic bounds already enforced in `src/lib/request-security.ts`.
- `WatermarkSettings` now has a singleton `scope` with a unique index.
- Admin watermark reads/writes use `upsert` on `scope: "global"` instead of appending rows.
- Public watermark and Zoom signature readers use `findUnique` on the singleton scope.
- Focused tests verify singleton read/write behavior.

## Verification

- `npm run prisma:generate` passed.
- `npm test -- --runTestsByPath __tests__/api/data-bounds.test.ts __tests__/api/zoom-signature.test.ts` passed.
- `npm run typecheck` passed.

