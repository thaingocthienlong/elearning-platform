---
phase: 01-installable-baseline-docs-and-secret-hygiene
plan: 04
subsystem: docs
tags: [readme, secret-hygiene, gitleaks, jest, setup]

requires:
  - phase: 01-installable-baseline-docs-and-secret-hygiene
    provides: Root Jest and package-script contract from Plan 01-01
  - phase: 01-installable-baseline-docs-and-secret-hygiene
    provides: Setup, env matrix, and verification docs from Plans 01-02 and 01-03
provides:
  - Concise README that documents Prisma MongoDB instead of stale PostgreSQL setup
  - Secret hygiene policy for inherited env, key, DRM, certificate, and media artifacts
  - Path-only sensitive artifact inventory command
  - Redacted gitleaks scan wrapper with local skip and strict failure behavior
affects: [phase-1-secret-hygiene, phase-2-security-fixes, phase-6-staging-env]

tech-stack:
  added: []
  patterns: [docs-contract-test, path-only-inventory, redacted-secret-scan]

key-files:
  created:
    - __tests__/docs/readme-and-secret-hygiene.test.ts
    - docs/secret-hygiene.md
    - scripts/inventory-sensitive-files.ts
    - scripts/scan-secrets.ts
  modified:
    - README.md

key-decisions:
  - "Kept Phase 1 secret handling to inventory and redacted scanning only; no inherited artifacts were moved, deleted, copied, or remediated."
  - "Made gitleaks optional for local onboarding but required in strict or CI mode."
  - "Kept README concise and delegated detailed setup, env, verification, and secret hygiene instructions to docs/."

patterns-established:
  - "README setup correctness is guarded by a Jest docs contract."
  - "Sensitive artifact inventory reports paths, categories, git state, size, and review action only."
  - "Secret scanning uses gitleaks with --redact when available and never falls back to printing matched values."

requirements-completed:
  - SETUP-05
  - SETUP-07

duration: 3 min
completed: 2026-05-05
---

# Phase 1 Plan 04: README Drift Correction and Secret Hygiene Inventory Summary

**README now points maintainers to Prisma MongoDB setup while secret hygiene commands inventory paths and run redacted scans without exposing values.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-05T10:09:05Z
- **Completed:** 2026-05-05T10:11:55Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added a Jest contract covering README database drift, required docs links, and secret hygiene safeguards.
- Added metadata-only sensitive artifact inventory with `InventoryItem`, git tracking checks, git-ignore checks, and path/category output only.
- Added `npm run secrets:scan` backing script that runs `gitleaks detect --source . --redact --no-banner` when available.
- Added secret hygiene documentation for inherited artifacts, placeholder-only examples, path-only inventory, redacted scanning, and later rotation/removal review.
- Replaced stale README PostgreSQL claims with concise Prisma MongoDB setup and detailed docs links.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add README and secret hygiene contract tests** - `72e2e8e` (test)
2. **Task 2: Implement path-only inventory and redacted scan scripts** - `e3dd0c7` (feat)
3. **Task 3: Replace stale README setup claims with concise links** - `0161275` (docs)

## Files Created/Modified

- `__tests__/docs/readme-and-secret-hygiene.test.ts` - Docs/security contract for README links, PostgreSQL drift, path-only inventory, and redacted scan safeguards.
- `docs/secret-hygiene.md` - Maintainer policy for inherited sensitive artifacts and Phase 1 inventory/scan boundaries.
- `scripts/inventory-sensitive-files.ts` - Metadata-only inventory of sensitive-looking paths and categories without file content reads.
- `scripts/scan-secrets.ts` - Optional local gitleaks wrapper with `--redact` and strict/CI scanner requirement.
- `README.md` - Concise setup landing page for Node >=20.9.0, npm, Prisma MongoDB, setup commands, and docs links.

## Decisions Made

- Kept inventory remediation out of scope for Phase 1; tracked sensitive-looking artifacts remain review candidates for later rotation/removal decisions.
- Used gitleaks as the scanner integration point when installed, with no custom secret-value matching fallback that could print sensitive matches.
- Kept README brief and linked to `docs/setup.md`, `docs/env-matrix.md`, `docs/verification.md`, and `docs/secret-hygiene.md` for details.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The plan's nested PowerShell acceptance command for Task 1 had quoting issues when run from the active PowerShell shell. The same file/pattern checks were rerun directly in PowerShell and passed.
- `npm run secrets:scan` found that `gitleaks` is not installed locally. This is the planned local default path: the command prints installation guidance and exits 0; strict or CI mode would fail until gitleaks is installed.
- Jest continues to print the pre-existing `baseline-browser-mapping` freshness warning. It does not fail the suite and was not caused by this plan.

## Known Stubs

- `README.md` and `docs/secret-hygiene.md` contain intentional placeholder guidance for `.env.local`, `.env.example`, and example secret names. These are setup documentation examples only, not runtime/UI stubs.
- `scripts/inventory-sensitive-files.ts` includes the `document-placeholder-only` action label for future review classification; current output uses concrete metadata from the workspace.

## Threat Flags

None beyond the plan's threat model. The plan added local file metadata inventory and a redacted scanner wrapper; it did not add network endpoints, auth paths, schema changes, or secret-value readers.

## Verification

- `npm test -- readme-and-secret-hygiene --runInBand` - passed.
- `npm run secrets:inventory` - passed; output listed paths, categories, git state, size, and action only.
- `npm run secrets:scan` - passed in local default mode; gitleaks was missing and the script printed install guidance without failing.
- `Select-String -Path scripts/inventory-sensitive-files.ts -Pattern "type InventoryItem" -Quiet` - passed.
- `Select-String -Path scripts/inventory-sensitive-files.ts -Pattern "readFileSync"` - no matches.
- `Select-String -Path scripts/scan-secrets.ts -Pattern "--redact" -Quiet` - passed.
- `Select-String -Path docs/secret-hygiene.md -Pattern "Do not read, print, copy, move, delete, or commit secret values" -Quiet` - passed.
- `Select-String -Path README.md -Pattern "Prisma MongoDB" -Quiet` - passed.
- `Select-String -Path README.md -Pattern "docs/setup.md" -Quiet` - passed.
- `Select-String -Path README.md -Pattern "docs/env-matrix.md" -Quiet` - passed.
- `Select-String -Path README.md -Pattern "docs/secret-hygiene.md" -Quiet` - passed.
- `Select-String -Path README.md -Pattern "PostgreSQL \(Primary DB\)|Postgres \+ Mongo|DATABASE_URL \(PostgreSQL\)"` - no matches.
- `git status --short .planning/STATE.md .planning/ROADMAP.md` - no changes.

## User Setup Required

None - no external service configuration was performed. For strict secret scanning or CI adoption, install `gitleaks` before running `npm run secrets:scan -- --strict`.

## Next Phase Readiness

Phase 1 plan work is complete from this executor's scope. The orchestrator still owns STATE.md and ROADMAP.md phase tracking.

## Self-Check: PASSED

- Confirmed `README.md`, `docs/secret-hygiene.md`, `scripts/inventory-sensitive-files.ts`, `scripts/scan-secrets.ts`, and `__tests__/docs/readme-and-secret-hygiene.test.ts` exist on disk.
- Confirmed task commits `72e2e8e`, `e3dd0c7`, and `0161275` exist in git history.
- Confirmed `.planning/STATE.md` and `.planning/ROADMAP.md` were not modified by this plan.

---
*Phase: 01-installable-baseline-docs-and-secret-hygiene*
*Completed: 2026-05-05*
