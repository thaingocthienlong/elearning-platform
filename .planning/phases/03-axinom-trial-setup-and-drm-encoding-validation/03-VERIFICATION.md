# Phase 3 Verification: Axinom Trial Setup and DRM/Encoding Validation

status: passed
date: 2026-05-05
phase: 3

## Requirement Coverage

- **DRM-01**: `docs/axinom-setup.md` documents official Axinom DRM trial setup, Communication Key values, license service URLs, and required secrets.
- **DRM-02**: `docs/axinom-setup.md` documents Axinom Encoding setup, service accounts, storage, profiles, credentials protection, and webhooks.
- **DRM-03**: `src/lib/axinom-env.ts`, `.env.example`, `docs/env-matrix.md`, and `npm run verify:axinom` map canonical Axinom env vars and report legacy aliases.
- **DRM-04**: `src/lib/axinom.ts` centralizes server-only short-lived License Service Message generation and signing.
- **DRM-05**: `src/lib/shaka-axinom.ts` and `src/hooks/player/useShakaPlayer.ts` ensure Shaka uses documented license URLs and sends `X-AxDRM-Message` only on license requests.
- **DRM-06**: `/api/drm/license` is quarantined as a non-production local endpoint and no longer implies production key issuance.
- **DRM-07**: Phase 2 malformed webhook signature handling remains in force and Phase 3 webhook changes preserved the tested behavior.
- **DRM-08**: `Video` now has explicit Axinom operational fields and process/sync/webhook flows prefer them with legacy fallback.
- **DRM-09**: `docs/axinom-staging-checklist.md` defines the opt-in staging path to encode, publish, authorize, and play a real Axinom-protected test video.

## Verification Commands

```powershell
npm run prisma:generate
npm run verify:setup
npm run verify:axinom
npm run lint
npm run typecheck
npm test
npm run build
npm run secrets:scan
```

## Results

- `npm run prisma:generate`: passed.
- `npm run verify:setup`: passed.
- `npm run verify:axinom`: passed; live API calls skipped by default.
- `npm run lint`: passed with inherited warnings only.
- `npm run typecheck`: passed.
- `npm test`: passed, 13 suites and 55 tests.
- `npm run build`: passed.
- `npm run secrets:scan`: passed local non-strict mode; gitleaks is not installed, so gitleaks-backed scanning was skipped by the existing script.

## Code Review

See `03-REVIEW.md`.

Review fixes were applied before this verification:

- Removed newly introduced lint noise in touched Axinom verifier, webhook, and Shaka player files.
- Kept live tenant checks opt-in to avoid accidental secret use or external service mutation.

## Residual Risks

- A real Axinom tenant was not exercised locally; that validation is intentionally documented as staging-only in `docs/axinom-staging-checklist.md`.
- Staging maintainers must run `npm run db:push` after reviewing the Prisma `Video` field additions.
- Existing repo-wide lint warnings remain outside Phase 3 scope.
- Strict secret scanning still requires installing gitleaks.

## Verdict

Phase 3 passes its defined success criteria and can be closed.
