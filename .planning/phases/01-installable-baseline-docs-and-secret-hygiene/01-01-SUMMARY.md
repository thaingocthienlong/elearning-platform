---
phase: 01-installable-baseline-docs-and-secret-hygiene
plan: 01
subsystem: testing
tags: [jest, nextjs, npm, package-scripts, setup]

requires: []
provides:
  - Root package scripts for lint, typecheck, build, test, Prisma, setup verification, service verification, and secret gates
  - Direct Jest, Testing Library, and zod dependencies in npm lockfile
  - Next-aware Jest configuration and package-script contract test
affects: [phase-1-setup-docs, phase-1-secret-hygiene, later-route-service-tests]

tech-stack:
  added: [jest, jest-environment-jsdom, "@testing-library/react", "@testing-library/dom", "@testing-library/jest-dom", "@types/jest", zod]
  patterns: [next-jest-config, root-script-contract-test, tdd-red-green]

key-files:
  created:
    - package.json
    - package-lock.json
    - jest.config.ts
    - jest.setup.ts
    - __tests__/scripts/package-scripts.test.ts
  modified: []

key-decisions:
  - "Used npm install commands to update package-lock.json rather than hand-editing dependency resolution."
  - "Used Next.js official next/jest.js configuration with the existing sanitized jest.setup.ts."
  - "Kept package-script coverage setup-adjacent and deferred deeper media/security tests to later Phase 2 plans."

patterns-established:
  - "Package scripts are treated as a tested maintainer contract."
  - "Jest config uses next/jest.js with setupFilesAfterEnv and @/* alias mapping."

requirements-completed:
  - SETUP-06
  - TEST-01

duration: 3 min
completed: 2026-05-05
---

# Phase 1 Plan 01: Jest Baseline, Dependency Setup, and Root Verification Script Contract Summary

**Root verification scripts and Next-aware Jest tooling are installed, locked, configured, and guarded by a runnable package-script contract test.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-05T09:52:03Z
- **Completed:** 2026-05-05T09:54:50Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added the Phase 1 root script contract for typecheck, Jest, Prisma, setup verification, service verification, and secret hygiene commands.
- Added direct Jest, Testing Library, `@types/jest`, and `zod` dependencies through npm so clean installs use the lockfile.
- Added `jest.config.ts` with `next/jest.js`, `jest.setup.ts` wiring, and a package-script contract test.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add root scripts and direct test dependencies** - `53dc8e7` (feat)
2. **Task 2 RED: Add package script contract test** - `06cc2d5` (test)
3. **Task 2 GREEN: Add Next-aware Jest configuration** - `1c80df7` (feat)

_Note: Task 2 used the plan's TDD flag and therefore produced separate RED and GREEN commits._

## Files Created/Modified

- `package.json` - Adds maintainer-facing root scripts plus direct `zod`, Jest, Testing Library, and Jest type dependencies.
- `package-lock.json` - Locks installed dependencies through npm.
- `jest.config.ts` - Uses `next/jest.js`, jsdom, setup file wiring, alias mapping, and ignored generated/vendor paths.
- `jest.setup.ts` - Preserves mock-only environment setup and imports `@testing-library/jest-dom`.
- `__tests__/scripts/package-scripts.test.ts` - Verifies the exact Phase 1 root script contract.

## Decisions Made

- Used the official Next.js `next/jest.js` setup instead of a custom transform stack.
- Kept the first test narrow and setup-adjacent so deeper route, entitlement, and security tests remain in their owning later phases.
- Left package audit remediation out of scope because upgrading framework/runtime dependencies is not part of Plan 01.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm install` reported 43 audit findings and a warning that the existing `next@16.0.7` version has a published security advisory. This plan did not upgrade framework packages; dependency remediation should be handled in a dedicated follow-up so it can be reviewed against Next.js and project compatibility.

## Known Stubs

None found in files created or modified by this plan.

## Threat Flags

None - this plan added local package scripts and test configuration only; it did not introduce network endpoints, auth paths, file-content readers, or trust-boundary schema changes.

## Verification

- `node -e "const p=require('./package.json'); for (const s of ['typecheck','test','test:watch','prisma:generate','db:push','verify:setup','verify:services','verify:services:strict','secrets:inventory','secrets:scan']) if (!p.scripts[s]) process.exit(1)"` - passed
- `node -e "const p=require('./package.json'); if(!p.dependencies.zod || !p.devDependencies.jest || !p.devDependencies['jest-environment-jsdom'] || !p.devDependencies['@testing-library/jest-dom']) process.exit(1)"` - passed
- `Select-String -Path jest.config.ts -Pattern "next/jest" -Quiet` - passed
- `Select-String -Path jest.config.ts -Pattern "jest.setup.ts" -Quiet` - passed
- `Select-String -Path __tests__/scripts/package-scripts.test.ts -Pattern "verify:services:strict" -Quiet` - passed
- `Select-String -Path jest.setup.ts -Pattern "@testing-library/jest-dom" -Quiet` - passed
- `npm test -- package-scripts --runInBand` - passed
- `npm run typecheck` - passed

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 01-03. Later Phase 1 plans can now rely on root `npm test`, Jest configuration, and the root script contract when adding env, setup, verification, and secret hygiene tests.

## Self-Check: PASSED

- Confirmed all created files exist on disk.
- Confirmed task commits `53dc8e7`, `06cc2d5`, and `1c80df7` exist in git history.

---
*Phase: 01-installable-baseline-docs-and-secret-hygiene*
*Completed: 2026-05-05*
