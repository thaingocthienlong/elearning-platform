# Admin Reliability Repair Implementation Plan

**Goal:** Make current admin navigation pages load safely and make every visible create, edit, revoke, upload, status, and delete control execute its advertised operation.

**Lane:** Security-sensitive code/config change.

**Requirements:** `UI-04`, `STAGE-05`, `DATA-03`, `SEC-09`, `TENCENT-08`, `TENCENT-09`.

## Constraints

- Preserve current Prisma/MongoDB architecture and Tencent-only future-media direction.
- Preserve unrelated user work, including untracked `.agents/` and `codex-plugins/`.
- Never inspect or print env, credential, DRM-key, certificate, or media-key values.
- Provider media deletion must succeed before local video metadata is marked deleted.
- Admin mutations must use explicit supported-model handlers, not unrestricted dynamic Prisma access.

## Task 1: Orphan-Safe Admin Reads

- [x] Restore scalar-first, batch-hydrated reads for admin watch records and session fingerprints.
- [x] Make session revoke work when its related user row is missing.
- [x] Apply the same fallback contract to security events, analytics, DRM monitoring, generic enrollment rows, and admin video option/access reads.
- [x] Add regression tests that fail if a required-relation `include` returns to these dirty-data boundaries.

## Task 2: Finish Generic Admin CRUD

- [x] Remove invalid UUID assignment and let Prisma generate MongoDB ObjectIds.
- [x] Validate and normalize create/update payloads with explicit supported table handlers.
- [x] Implement the visible Edit action for users, courses, and enrollments.
- [x] Restrict soft-delete/restore to models that actually implement `isDeleted`; revoke/delete active user sessions when a user is disabled.
- [x] Add route and component regression tests for create, edit, delete, restore, validation, and error feedback.

## Task 3: Finish Tencent Video Administration

- [x] Load all active courses from the admin course endpoint in the upload dialog.
- [x] Add authenticated provider-first Tencent deletion route with idempotent local soft-delete.
- [x] Add delete control, confirmation, progress, and error feedback to admin video UI.
- [x] Exclude locally deleted videos from the active admin video list.
- [x] Add Tencent delete route and admin UI regression tests.

## Task 4: Verification and Handoff

- [x] Run targeted Jest tests while iterating.
- [x] Run full `npm test -- --runInBand`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run secrets:scan`.
- [x] Inspect intended diff and confirm unrelated work remains untouched.
- [x] Run browser-visible admin smoke or record the exact auth/service blocker.
- [x] Complete verification record and handoff with rollback instructions.

## Rollback

- Before commit: revert only paths listed in the final handoff through targeted inverse patches.
- After commit: use `git revert <commit>`; do not reset or overwrite unrelated work.
- Tencent delete cannot restore provider media after Tencent confirms deletion; code rollback restores only application behavior and local metadata handling.
