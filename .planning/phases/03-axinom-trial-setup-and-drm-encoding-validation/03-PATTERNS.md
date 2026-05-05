# Phase 3 Patterns

**Date:** 2026-05-05

## Existing Patterns To Reuse

- **Server-only helpers:** Follow `src/lib/media-entitlement.ts` by keeping Axinom env validation and License Service Message signing out of client modules.
- **Route tests:** Follow `__tests__/api/media-routes.test.ts` with mocked `next-auth`, helper modules, and provider calls.
- **Unit tests:** Follow `__tests__/lib/media-entitlement.test.ts` for pure helper coverage without real external services.
- **Env docs:** Follow `.env.example` plus `docs/env-matrix.md`, using placeholder-only values and service-grouped rows.
- **Verification scripts:** Follow `scripts/verify-services.ts` and `scripts/verify-axinom-setup.ts`, where local checks skip missing external credentials unless strict mode is enabled.
- **Redacted logging:** Use `src/lib/server-log.ts` in touched server routes and avoid client logs that expose token or tenant details.

## Target Additions

- `src/lib/axinom-env.ts`: canonical Axinom env/default validation, legacy alias detection, and strict/local modes.
- `src/lib/axinom.ts`: official-doc-shaped LSM/entitlement payload builder and JWT signer.
- `src/lib/shaka-axinom.ts`: pure helpers for license server defaults and request header attachment decisions.
- `docs/axinom-setup.md`: official-doc-based guide and repo env mapping.
- `docs/axinom-staging-checklist.md`: tenant-only smoke procedure.
- `__tests__/lib/axinom*.test.ts` and focused route/client-helper tests.

## Codebase Touch Points

- `prisma/schema.prisma`
- `.env.example`
- `docs/env-matrix.md`
- `scripts/verify-axinom-setup.ts`
- `src/lib/axinom.ts`
- `src/app/api/drm/token/route.ts`
- `src/app/api/drm/license/route.ts`
- `src/hooks/player/useShakaPlayer.ts`
- `src/components/video/DRMPlayerWrapper.tsx`
- `src/app/api/video/process/route.ts`
- `src/lib/axinom-sync.ts`
- `src/app/api/webhook/axinom/route.ts`

## Non-Patterns

- Do not read or copy local Axinom env files, key files, certificates, CPIX files, or media keys.
- Do not make live Axinom API calls in Jest or default setup verification.
- Do not implement proxy mode unless the phase is explicitly replanned.
- Do not remove all legacy `AX_*` aliases immediately; strict mode should detect and fail ambiguous/legacy-only usage while local mode warns.
