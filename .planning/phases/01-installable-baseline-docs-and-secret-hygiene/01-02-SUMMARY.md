---
phase: 01-installable-baseline-docs-and-secret-hygiene
plan: 02
subsystem: setup
tags: [node, npm, prisma, mongodb, env, verification]

requires:
  - phase: 01-installable-baseline-docs-and-secret-hygiene
    provides: Root package script contract from Plan 01-01
  - phase: 01-installable-baseline-docs-and-secret-hygiene
    provides: Placeholder `.env.example` and service-grouped env matrix from Plan 01-03
provides:
  - Node version pin and local bootstrap verification script
  - Env-matrix-derived service verification with default-skip and strict-fail modes
  - Clean-checkout setup and verification runbooks for Prisma MongoDB
affects: [phase-1-readme-secret-hygiene, phase-3-axinom-setup, phase-6-staging-env]

tech-stack:
  added: []
  patterns: [node-pin, setup-smoke-script, env-matrix-service-verifier, default-skip-strict-fail]

key-files:
  created:
    - .nvmrc
    - scripts/verify-setup.ts
    - scripts/verify-services.ts
    - docs/setup.md
    - docs/verification.md
    - __tests__/scripts/verify-bootstrap.test.ts
  modified: []

key-decisions:
  - "Kept service verification local-only in Phase 1: it checks env presence from docs/env-matrix.md and does not call vendor APIs."
  - "Used default skip for local service gaps and strict/CI nonzero failure for staging completeness."
  - "Documented Prisma MongoDB as the active setup path and used `npm run db:push` rather than SQL migration instructions."

patterns-established:
  - "Verification scripts report command, file, service, and missing variable names only; env values are never printed."
  - "Service required variables are derived from docs/env-matrix.md instead of a duplicated hardcoded variable list."

requirements-completed:
  - SETUP-01
  - SETUP-02
  - SETUP-03

duration: 4 min
completed: 2026-05-05
---

# Phase 1 Plan 02: Clean-Checkout Bootstrap, Prisma MongoDB Setup, and Service Verification Summary

**Node/npm bootstrap checks, env-matrix-derived service verification, and Prisma MongoDB setup runbooks now make local install and startup reproducible.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-05T10:02:24Z
- **Completed:** 2026-05-05T10:06:25Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `.nvmrc` with Node `20.11.1` and a setup verifier that checks Node >=20.9.0, npm availability, required files, Prisma schema presence, env docs, and package scripts.
- Added a service verifier that parses `docs/env-matrix.md`, groups required variables by service, skips missing external credentials locally, and fails in strict or CI mode.
- Added maintainer setup and verification docs covering npm install, `.env.example` to `.env.local`, Prisma MongoDB, `npm run db:push`, local dev startup, optional service checks, and secret-hygiene commands.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Add bootstrap verification contract** - `5f1052e` (test)
2. **Task 1 GREEN: Add setup and service verification scripts** - `6293291` (feat)
3. **Task 2: Document install and Prisma MongoDB setup** - `a189536` (docs)

_Note: Task 1 used the plan's TDD flag and therefore produced separate RED and GREEN commits._

## Files Created/Modified

- `.nvmrc` - Pins the local Node version to `20.11.1`.
- `scripts/verify-setup.ts` - Verifies clean-checkout prerequisites and root script contracts using Node built-ins.
- `scripts/verify-services.ts` - Loads `.env`/`.env.local`, parses `docs/env-matrix.md`, and applies default-skip versus strict-fail checks.
- `docs/setup.md` - Clean-checkout setup runbook for npm, placeholder env, Prisma MongoDB, `db:push`, local dev, and troubleshooting.
- `docs/verification.md` - Exact root verification command guide with service verification and secret hygiene semantics.
- `__tests__/scripts/verify-bootstrap.test.ts` - TDD contract for the Node pin and verification script behavior.

## Decisions Made

- Kept service verification scoped to env presence and matrix consistency in Phase 1; real Axinom, Zoom, storage, Redis, SMTP, and reCAPTCHA connectivity remains for later integration/staging phases.
- Treated `docs/env-matrix.md` as the source of truth for service variables while hardcoding only the required service group names from D-05.
- Documented MongoDB as the active Prisma datasource and avoided PostgreSQL primary database language in new setup docs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added Windows-safe npm availability detection**
- **Found during:** Task 1 (Add setup and service verification scripts)
- **Issue:** `execFileSync('npm')` did not resolve successfully from the TypeScript script on Windows PowerShell.
- **Fix:** Added fallback execution through `process.env.npm_execpath`, with a Windows `cmd.exe` fallback when needed.
- **Files modified:** `scripts/verify-setup.ts`
- **Verification:** `npm run verify:setup` exits 0.
- **Committed in:** `6293291`

**2. [Rule 1 - Bug] Checked required service groups against the full matrix**
- **Found during:** Task 1 (Add setup and service verification scripts)
- **Issue:** The service-group guard initially checked only groups with required variables, so optional-only Observability rows were treated as absent.
- **Fix:** Added a full-matrix service group scan for D-05 guard validation while keeping required-variable checks derived from required Local/Staging cells.
- **Files modified:** `scripts/verify-services.ts`
- **Verification:** `npm run verify:services` exits 0 with SKIP messages for missing local credentials.
- **Committed in:** `6293291`

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes were necessary for the planned verification commands to work correctly on this Windows checkout and with the existing env matrix. No scope expansion.

## Issues Encountered

- `npm run verify:services:strict` fails on the placeholder-only local checkout, as expected, because real service env vars are not configured. This was used as a negative check for strict-fail behavior.
- Jest emits a `baseline-browser-mapping` freshness warning during tests. It does not fail the suite and was not caused by this plan.

## Known Stubs

None. Placeholder references in `docs/setup.md` and `docs/verification.md` are intentional setup guidance for `.env.example`, not runtime or UI stubs.

## Threat Flags

None beyond the plan's threat model. The new service verifier reads env presence only, prints missing variable names only, and introduces no network endpoints, auth paths, schema changes, or external service calls.

## Verification

- `npm test -- verify-bootstrap --runInBand` - passed.
- `npm run verify:setup` - passed.
- `npm run verify:services` - passed with default SKIP messages for missing local service credentials.
- `npm run verify:services:strict` - failed as expected on missing placeholder-only local service credentials.
- `Get-Content .nvmrc` exact check for `20.11.1` - passed.
- `Select-String -Path scripts/verify-setup.ts -Pattern "20.9.0" -Quiet` - passed.
- `Select-String -Path scripts/verify-services.ts -Pattern "--strict" -Quiet` - passed.
- `Select-String -Path scripts/verify-services.ts -Pattern "docs/env-matrix.md" -Quiet` - passed.
- `Select-String -Path scripts/verify-services.ts -Pattern "SKIP" -Quiet` - passed.
- `Select-String -Path docs/setup.md -Pattern "Node >=20.9.0" -Quiet` - passed.
- `Select-String -Path docs/setup.md -Pattern "Prisma MongoDB" -Quiet` - passed.
- `Select-String -Path docs/setup.md -Pattern "npm run db:push" -Quiet` - passed.
- `Select-String -Path docs/setup.md -Pattern "npm run dev" -Quiet` - passed.
- `Select-String -Path docs/setup.md -Pattern "docs/env-matrix.md" -Quiet` - passed.
- `Select-String -Path docs/verification.md -Pattern "npm run verify:services:strict" -Quiet` - passed.
- `Select-String -Path docs/setup.md -Pattern "PostgreSQL.*primary|Primary DB.*PostgreSQL"` - no matches.

## User Setup Required

None - no external service configuration was performed. Maintainers still need real `.env.local` values for integrations and staging checks.

## Next Phase Readiness

Ready for Plan 01-04. README and secret-hygiene documentation can link to `docs/setup.md`, `docs/verification.md`, `.env.example`, and `docs/env-matrix.md`.

## Self-Check: PASSED

- Confirmed `.nvmrc`, `scripts/verify-setup.ts`, `scripts/verify-services.ts`, `docs/setup.md`, `docs/verification.md`, and `__tests__/scripts/verify-bootstrap.test.ts` exist on disk.
- Confirmed task commits `5f1052e`, `6293291`, and `a189536` exist in git history.
- Confirmed `.planning/STATE.md` and `.planning/ROADMAP.md` were not modified by this plan.

---
*Phase: 01-installable-baseline-docs-and-secret-hygiene*
*Completed: 2026-05-05*
