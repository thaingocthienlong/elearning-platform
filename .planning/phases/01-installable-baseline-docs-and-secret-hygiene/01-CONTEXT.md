# Phase 1: Installable Baseline, Docs, and Secret Hygiene - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase makes the handed-over repository bootstrap safely from a clean checkout. It covers dependency installation, Prisma/MongoDB setup, local dev startup, root verification scripts, initial Jest-aligned test tooling, setup documentation, env documentation, and secret hygiene inventory/scanning.

This phase does not implement the deeper media entitlement/security fixes, Axinom DRM repair, Zoom SDK upgrade, database performance work, staging deployment, or academic frontend redesign. Those are later roadmap phases.

</domain>

<decisions>
## Implementation Decisions

### Bootstrap Contract
- **D-01:** "Clean checkout works" means the local baseline can run and external-service expectations are visible. The baseline includes `npm install`, Prisma client generation, local dev startup, lint/typecheck/build/test commands, and optional service verification scripts.
- **D-02:** External credentials are optional for ordinary local setup. Service verification commands should skip with clear messages when credentials are missing by default.
- **D-03:** Verification commands should support a strict mode, CI mode, or equivalent flag where missing service credentials fail. This lets staging/CI enforce completeness without blocking local onboarding.

### Environment Documentation
- **D-04:** Phase 1 should create both a copy/paste `.env.example` and a detailed env matrix document. The matrix is the source of truth; `.env.example` is the practical starter file.
- **D-05:** The env matrix should be grouped by service: database, auth, Redis, Axinom, storage, Zoom, support/email/reCAPTCHA, observability, and public player/config values.
- **D-06:** The env matrix should include columns for sensitivity and environment applicability, including whether a variable is public, server secret, operational secret, local required, local optional, staging required, or staging optional.

### Test Baseline
- **D-07:** Phase 1 should align with Jest because the repo already contains `jest.setup.ts` and `test-plan.md` is written around Jest-style examples.
- **D-08:** Phase 1 should install/configure the runner and add a small number of representative tests. It should not attempt the full media/security test suite, because those tests belong with Phase 2 security and entitlement work.
- **D-09:** Representative tests should prove the test command works and exercise low-risk setup-adjacent boundaries such as env validation, script behavior, or simple service/route helper behavior. The planner may choose exact examples after inspecting the code.

### Secret Hygiene Boundary
- **D-10:** Phase 1 should inventory and scan secret-like/env/key/media artifacts but should not move, quarantine, or delete inherited artifacts.
- **D-11:** The inventory should list paths and risk categories without reading, printing, copying, or committing secret values.
- **D-12:** Secret scanning should be a repeatable local script or gate exposed through a root package command. It should be suitable for local maintainer use and later CI adoption, but Phase 1 does not need to create a full CI workflow.

### Setup Documentation Audience
- **D-13:** Setup docs should serve both the current maintainer and future technical staff. They should provide a quick path first and deeper handoff/troubleshooting sections second.
- **D-14:** Keep `README.md` concise and put detailed setup/runbook material under `docs/`. README should link to the detailed docs instead of becoming the only long-form setup guide.

### the agent's Discretion
- The planner may decide exact file names under `docs/`, as long as README remains concise and the detailed docs are discoverable.
- The planner may decide the exact strict-mode flag/interface for verification commands.
- The planner may decide the exact representative Jest tests, provided they remain Phase 1 appropriate and avoid deep entitlement/security implementation.
- The planner may decide the secret scanner implementation approach, provided it is local, repeatable, and avoids exposing secret values.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Planning
- `.planning/PROJECT.md` - Brownfield rescue scope, constraints, and Phase 1 priority.
- `.planning/REQUIREMENTS.md` - Phase 1 requirement IDs SETUP-01 through SETUP-07 and TEST-01.
- `.planning/ROADMAP.md` - Phase 1 goal, success criteria, dependencies, and downstream phase boundaries.
- `.planning/STATE.md` - Current project position and blockers.

### Codebase Map
- `.planning/codebase/STACK.md` - Current stack, missing direct dependency notes, env inventory, and README/database drift.
- `.planning/codebase/TESTING.md` - Existing lack of test runner, `jest.setup.ts`, `test-plan.md`, and verification script patterns.
- `.planning/codebase/CONCERNS.md` - Secret-like artifacts, setup drift, missing tests, and known safety concerns relevant to Phase 1.
- `.planning/codebase/STRUCTURE.md` - Directory layout and docs/scripts locations.

### Existing Repo Docs And Config
- `README.md` - Current setup guide to correct and keep concise.
- `package.json` - Existing scripts, dependencies, Prisma seed command, and missing root test/typecheck scripts.
- `package-lock.json` - npm lockfile that should remain authoritative for dependency installation.
- `prisma/schema.prisma` - Current MongoDB datasource and Prisma schema reality.
- `jest.setup.ts` - Existing Jest-style setup file and env mocks.
- `test-plan.md` - Existing intended Jest/Playwright testing strategy.
- `.gitignore` - Existing ignore coverage for env files, key files, media artifacts, and generated/sensitive files.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `jest.setup.ts`: Existing sanitized env setup can seed the Jest baseline instead of starting from nothing.
- `test-plan.md`: Existing testing strategy gives names, patterns, and intended coverage direction, but Phase 1 should only implement a small baseline.
- `scripts/verify-auth-sync.ts`, `scripts/verify-azure-storage.ts`, and `scripts/verify-axinom-setup.ts`: Existing verification-script style can inform optional service checks and strict-mode behavior.
- `package.json`: Root script surface already has `dev`, `build`, `start`, `lint`, and `postinstall`; Phase 1 should add missing verification scripts without disrupting existing commands.

### Established Patterns
- npm with `package-lock.json` is the package manager baseline.
- Prisma client generation currently runs via `postinstall`.
- Prisma provider is MongoDB, despite README references to PostgreSQL.
- Existing scripts use `tsx` for TypeScript execution.
- Env values are read directly from `process.env` across app routes, libraries, and scripts.

### Integration Points
- Setup docs should live under `docs/` and be linked from `README.md`.
- Env examples should be placeholder-only and must not copy values from existing env/key artifacts.
- Secret inventory/scanning should use paths and patterns only; it must not dump file contents.
- Root package scripts are the maintainer-facing entry points for install verification, tests, typecheck, and secret scanning.

</code_context>

<specifics>
## Specific Ideas

- Use README as the concise landing page and put detailed maintainer runbooks under `docs/`.
- Create both `.env.example` and a detailed service-grouped env matrix.
- Default service verification should be forgiving locally but strict in CI/staging mode.
- Keep inherited secret-like artifacts in place during Phase 1; inventory and scan only.

</specifics>

<deferred>
## Deferred Ideas

- Full media entitlement and route authorization test coverage belongs to Phase 2.
- Official Axinom DRM trial implementation and playback validation belongs to Phase 3.
- Zoom SDK cleanup/upgrade and meeting smoke coverage belongs to Phase 4.
- Database profiling and migration evaluation belongs to Phase 5.
- Staging deployment acceptance belongs to Phase 6.
- Academic frontend redesign belongs to Phase 7.

</deferred>

---

*Phase: 1-Installable Baseline, Docs, and Secret Hygiene*
*Context gathered: 2026-05-05*
