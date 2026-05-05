# Phase 1: Installable Baseline, Docs, and Secret Hygiene - Research

**Researched:** 2026-05-05
**Domain:** Next.js 16 bootstrap, Prisma MongoDB setup, Jest baseline, env documentation, and secret hygiene
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Deferred Ideas (OUT OF SCOPE)
## Deferred Ideas

- Full media entitlement and route authorization test coverage belongs to Phase 2.
- Official Axinom DRM trial implementation and playback validation belongs to Phase 3.
- Zoom SDK cleanup/upgrade and meeting smoke coverage belongs to Phase 4.
- Database profiling and migration evaluation belongs to Phase 5.
- Staging deployment acceptance belongs to Phase 6.
- Academic frontend redesign belongs to Phase 7.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETUP-01 | Maintainer can install dependencies from a clean checkout using documented Node and npm versions. | Use Node >=20.9.0 for Next.js 16 and npm with `package-lock.json`; local Node is v24.15.0 and npm is 11.12.1. [CITED: nextjs.org/docs/app/guides/upgrading/version-16] [VERIFIED: package.json] [VERIFIED: local shell] |
| SETUP-02 | Maintainer can generate the Prisma client and prepare the MongoDB-backed schema using documented commands. | Use `npx prisma generate` plus `npx prisma db push`; Prisma MongoDB docs say MongoDB uses `db push` instead of migration files. [CITED: prisma.io/docs/prisma-orm/quickstart/mongodb] [VERIFIED: prisma/schema.prisma] |
| SETUP-03 | Maintainer can start the local development server with placeholder-safe environment documentation. | Keep `.env.example` placeholder-only; Next.js loads root `.env*` into `process.env` and exposes only `NEXT_PUBLIC_` values to browser bundles. [CITED: nextjs.org/docs/app/guides/environment-variables] [VERIFIED: codebase rg] |
| SETUP-04 | Maintainer can identify every required environment variable, owning service, secret status, and local/staging need. | Build a service-grouped env matrix from `process.env` references and known service docs; the matrix is the source of truth. [VERIFIED: codebase rg] [VERIFIED: 01-CONTEXT.md] |
| SETUP-05 | Maintainer can follow setup documentation that corrects stale README claims about PostgreSQL versus Prisma MongoDB. | README says PostgreSQL primary DB, but `prisma/schema.prisma` uses `provider = "mongodb"` with `DATABASE_URL`. [VERIFIED: README.md] [VERIFIED: prisma/schema.prisma] |
| SETUP-06 | Maintainer can run lint, typecheck, build, and test commands from root package scripts. | Existing scripts expose `dev`, `build`, `start`, `lint`, and `postinstall`; add `typecheck`, `test`, `test:watch`, `verify:*`, and `secrets:*`. [VERIFIED: package.json] |
| SETUP-07 | Repository documents how to handle sensitive env files, DRM keys, media artifacts, and sample placeholders without committing secrets. | Inventory paths only; do not read env/key/media contents; add local scanning gate with redacted output. [VERIFIED: AGENTS.md] [VERIFIED: codebase CONCERNS.md] |
| TEST-01 | Automated test tooling is installed and documented for route/service unit tests. | Use Next.js `next/jest` plus Jest, jsdom, Testing Library, and current `jest.setup.ts`; limit tests to setup-adjacent route/service utilities. [CITED: nextjs.org/docs/pages/guides/testing/jest] [VERIFIED: jest.setup.ts] |
</phase_requirements>

## Summary

Phase 1 should make the existing brownfield Next.js app installable and verifiable without changing core product behavior. The root package currently has no `test` or `typecheck` script, `node_modules` is effectively empty despite a present directory, Jest is not installed, and README setup text incorrectly describes PostgreSQL while the Prisma schema uses MongoDB. [VERIFIED: package.json] [VERIFIED: local shell] [VERIFIED: README.md] [VERIFIED: prisma/schema.prisma]

The plan should preserve npm and the current Prisma/MongoDB implementation, document Node >=20.9.0 because Next.js 16 requires it, add explicit root scripts, create concise README links into detailed docs, and introduce a placeholder-only `.env.example` plus a service-grouped env matrix. [CITED: nextjs.org/docs/app/guides/upgrading/version-16] [VERIFIED: package-lock.json] [VERIFIED: 01-CONTEXT.md]

Secret hygiene must be inventory-and-gate only in this phase. The repo contains secret-like env/key/media artifact paths already identified by codebase mapping, but Phase 1 must not read, print, move, delete, or commit their values. Use path/name/category inventory and a repeatable scanner command configured for redaction. [VERIFIED: AGENTS.md] [VERIFIED: codebase CONCERNS.md] [CITED: github.com/gitleaks/gitleaks]

**Primary recommendation:** Plan Phase 1 as four small implementation tracks: bootstrap scripts, docs/env matrix, Jest baseline, and secret inventory/scanning gate. [VERIFIED: 01-CONTEXT.md]

## Project Constraints (from AGENTS.md)

- Read `.planning/STATE.md`, `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, and relevant codebase/research docs before planning or implementation. [VERIFIED: AGENTS.md]
- Work phase by phase in roadmap order unless the user explicitly changes priorities. [VERIFIED: AGENTS.md]
- Keep requirement IDs visible in plans, tests, commits, and verification notes. [VERIFIED: AGENTS.md]
- Treat `.planning/PROJECT.md` decisions and constraints as authoritative unless updated by the user. [VERIFIED: AGENTS.md]
- Preserve existing user changes and do not revert unrelated edits. [VERIFIED: AGENTS.md]
- Commit planning artifacts separately from source changes when Git tracking is enabled. [VERIFIED: AGENTS.md]
- Do not read, print, copy, or commit secret values from env files, key files, DRM artifacts, service account files, certificates, or media keys. [VERIFIED: AGENTS.md]
- Stabilize install, docs, tests, and security fixes before frontend redesign. [VERIFIED: AGENTS.md]
- Optimize the current Prisma/MongoDB implementation before database migration. [VERIFIED: AGENTS.md]
- Preserve Axinom DRM and Zoom providers for v1. [VERIFIED: AGENTS.md]
- Use official documentation for Axinom, Zoom, Next.js, Prisma, Shaka, and Vercel behavior. [VERIFIED: AGENTS.md]
- Treat client-side anti-recording controls as deterrence and telemetry, not a hard security boundary. [VERIFIED: AGENTS.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Local bootstrap command surface | Developer tooling / package scripts | Next.js app | Root scripts are maintainer entry points for install, lint, typecheck, build, test, Prisma, and verification. [VERIFIED: package.json] |
| Prisma MongoDB schema preparation | Database / Storage | Developer tooling | Prisma owns client generation and `db push`; MongoDB is the active datasource provider. [VERIFIED: prisma/schema.prisma] [CITED: prisma.io/docs/prisma-orm/quickstart/mongodb] |
| Environment variable documentation | Docs / Configuration | Frontend server, API, Browser | Server secrets stay in runtime env; `NEXT_PUBLIC_` values are browser-exposed at build time. [CITED: nextjs.org/docs/app/guides/environment-variables] |
| Optional service verification | Developer tooling | External services | Verification scripts should check Axinom, storage, Redis, auth, and Zoom readiness without blocking local setup unless strict mode is enabled. [VERIFIED: 01-CONTEXT.md] |
| Jest route/service test baseline | Developer tooling | API / Backend | Direct route/helper tests exercise setup-adjacent backend behavior without starting a server. [VERIFIED: test-plan.md] [CITED: nextjs.org/docs/pages/guides/testing/jest] |
| Secret inventory and scanning | Developer tooling / Security | Git history and workspace files | The gate should detect paths/findings and redact values; it must not remediate inherited artifacts in Phase 1. [VERIFIED: AGENTS.md] [CITED: github.com/gitleaks/gitleaks] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | >=20.9.0; local v24.15.0 | Runtime for Next.js 16 and scripts | Next.js 16 requires Node.js 20.9.0 or newer. [CITED: nextjs.org/docs/app/guides/upgrading/version-16] [VERIFIED: local shell] |
| npm | local 11.12.1 | Package manager | Repo has `package-lock.json` lockfileVersion 3, so `npm ci` is the clean-checkout install command. [VERIFIED: package-lock.json] [VERIFIED: local shell] |
| Next.js | installed package.json 16.0.7; registry latest 16.2.4 published 2026-04-15 | App Router framework | Existing app uses Next.js scripts and App Router; Phase 1 should not upgrade framework versions. [VERIFIED: package.json] [VERIFIED: npm registry] |
| Prisma / @prisma/client | installed package.json 5.22.0; registry latest Prisma 7.8.0 published 2026-04-22 | MongoDB ORM and generated client | Existing schema and client are Prisma 5-based; Phase 1 should document/generate current client, not migrate Prisma major versions. [VERIFIED: package.json] [VERIFIED: npm registry] |
| Jest | registry latest 30.3.0 published 2026-03-10 | Test runner | Existing `jest.setup.ts` and `test-plan.md` are Jest-aligned. [VERIFIED: npm registry] [VERIFIED: jest.setup.ts] |
| `next/jest` | bundled with Next.js | Next-aware Jest config wrapper | Next.js docs say Next has built-in Jest configuration via `next/jest`. [CITED: nextjs.org/docs/pages/guides/testing/jest] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jest-environment-jsdom` | 30.3.0 published 2026-03-10 | DOM-like Jest environment | Needed for component/browser utility tests in the current test plan. [VERIFIED: npm registry] [CITED: nextjs.org/docs/pages/guides/testing/jest] |
| `@testing-library/react` | 16.3.2 published 2026-01-19 | React component testing | Install now because Next.js Jest docs pair Jest with React Testing Library, even if Phase 1 tests can be route/helper focused. [VERIFIED: npm registry] [CITED: nextjs.org/docs/pages/guides/testing/jest] |
| `@testing-library/dom` | 10.4.1 | DOM query helpers | Next.js docs include it in manual Jest setup. [VERIFIED: npm registry] [CITED: nextjs.org/docs/pages/guides/testing/jest] |
| `@testing-library/jest-dom` | 6.9.1 | DOM matchers | Existing `jest.setup.ts` should import it if component tests are added. [VERIFIED: npm registry] |
| `@types/jest` | 30.0.0 | TypeScript typings for Jest globals | Required for TS tests using `describe`, `test`, `expect`, and `jest.mock`. [VERIFIED: npm registry] [VERIFIED: test-plan.md] |
| `zod` | registry latest 4.4.3 published 2026-05-04 | Runtime env/input schema validation | App imports `zod` but root package does not declare it directly; add as a direct dependency if env validation uses it. [VERIFIED: npm registry] [VERIFIED: codebase CONCERNS.md] |
| Gitleaks CLI | latest not installed locally; official CLI has `--redact` default 100 | Secret scanning | Use as optional external scanner when available; pair with path-only inventory script and redacted output. [VERIFIED: local shell] [CITED: github.com/gitleaks/gitleaks] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Jest + `next/jest` | Vitest | Not aligned with existing `jest.setup.ts` and `test-plan.md`; would require rewriting planned examples. [VERIFIED: 01-CONTEXT.md] |
| Prisma `db push` | `prisma migrate dev` | MongoDB does not use migration files in the Prisma MongoDB quickstart; `db push` is the documented setup path. [CITED: prisma.io/docs/prisma-orm/quickstart/mongodb] |
| Gitleaks | Custom regex-only scanner | Custom regexes miss provider-specific tokens; if custom code is used, limit it to path inventory and rely on Gitleaks for pattern detection when installed. [CITED: github.com/gitleaks/gitleaks] [ASSUMED] |

**Installation:**
```bash
npm install
npm install zod
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @types/jest
```

**Version verification:** Verified via `npm view` on 2026-05-05. Next latest: 16.2.4, Prisma latest: 7.8.0, Jest latest: 30.3.0, jsdom env latest: 30.3.0, Testing Library React latest: 16.3.2, zod latest: 4.4.3. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
Clean checkout
  |
  v
Node/npm prerequisite check
  |
  v
npm ci / npm install
  |
  +--> postinstall: prisma generate
  |
  v
Placeholder .env.example + docs/env-matrix.md
  |
  v
npm run db:push? / npm run prisma:generate
  |
  v
Root verification surface
  |
  +--> npm run lint
  +--> npm run typecheck
  +--> npm run test
  +--> npm run build
  +--> npm run verify:services [default skip missing creds | strict fails]
  +--> npm run secrets:inventory + secrets:scan [paths/findings only, redacted]
  |
  v
Maintainer can run npm run dev and inspect docs/runbooks
```

### Recommended Project Structure

```text
docs/
├── setup.md                 # Full bootstrap/runbook
├── env-matrix.md            # Source of truth for env vars and sensitivity
├── secret-hygiene.md        # Handling/inventory/scanning policy
└── verification.md          # Root command and strict-mode behavior

scripts/
├── verify-services.ts       # Optional service checks with strict flag
├── inventory-sensitive-files.ts
└── scan-secrets.ts          # Wrapper around gitleaks when available

__tests__/
├── env/
│   └── env-schema.test.ts
└── scripts/
    └── verify-services.test.ts
```

### Pattern 1: Root Script Contract

**What:** Add root scripts for `typecheck`, `test`, `test:watch`, `prisma:generate`, `db:push`, `verify:services`, `secrets:inventory`, and `secrets:scan`. [VERIFIED: package.json]

**When to use:** Use root scripts for every maintainer-facing command so docs and CI/staging can share the same command surface. [VERIFIED: 01-CONTEXT.md]

**Example:**
```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "prisma:generate": "prisma generate",
    "db:push": "prisma db push",
    "verify:services": "tsx scripts/verify-services.ts",
    "verify:services:strict": "tsx scripts/verify-services.ts --strict",
    "secrets:inventory": "tsx scripts/inventory-sensitive-files.ts",
    "secrets:scan": "tsx scripts/scan-secrets.ts"
  }
}
```

### Pattern 2: Next-Aware Jest Config

**What:** Use `next/jest` and the existing `jest.setup.ts` instead of a standalone `ts-jest` transform. Next.js official docs state Next has built-in Jest configuration since Next.js 12. [CITED: nextjs.org/docs/pages/guides/testing/jest]

**When to use:** Use for route/helper/component tests in a Next app; avoid async Server Component tests in Jest because Next docs recommend E2E for async components. [CITED: nextjs.org/docs/pages/guides/testing/jest]

**Example:**
```typescript
// Source: Next.js Jest docs, adapted to this repo.
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
};

export default createJestConfig(config);
```

### Pattern 3: Service Verification Default-Skip, Strict-Fail

**What:** Verification scripts should check required variable names for each service group and skip missing credential checks locally unless `--strict` or `CI=true` is present. [VERIFIED: 01-CONTEXT.md]

**When to use:** Use for Axinom, Azure/R2, Redis, Zoom, SMTP, reCAPTCHA, and observability checks that require real external credentials. [VERIFIED: codebase rg]

**Example:**
```typescript
type ServiceCheck = {
  service: string;
  required: string[];
  verify?: () => Promise<void>;
};

const strict = process.argv.includes('--strict') || process.env.CI === 'true';

for (const check of checks) {
  const missing = check.required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    const message = `${check.service}: skipped, missing ${missing.join(', ')}`;
    if (strict) throw new Error(message);
    console.warn(message);
    continue;
  }
  await check.verify?.();
}
```

### Anti-Patterns to Avoid

- **Documenting PostgreSQL as primary DB:** The implemented Prisma datasource is MongoDB, so PostgreSQL docs/scripts create setup drift. [VERIFIED: README.md] [VERIFIED: prisma/schema.prisma]
- **Using inherited env files as examples:** Existing env/key files may contain secrets; `.env.example` must use placeholders only. [VERIFIED: AGENTS.md]
- **Failing local setup when optional vendor creds are absent:** Local default should skip missing external credentials with clear messages; strict mode should fail for CI/staging. [VERIFIED: 01-CONTEXT.md]
- **Reading secret files for inventory:** Inventory must use paths, names, extensions, file sizes, and categories only; do not print contents. [VERIFIED: AGENTS.md]
- **Testing deep entitlement behavior in Phase 1:** Full media/security route coverage is deferred to Phase 2. [VERIFIED: 01-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Next.js Jest transforms | Custom TS/JS/Babel transform stack | `next/jest` | It loads Next config and handles common transforms. [CITED: nextjs.org/docs/pages/guides/testing/jest] |
| MongoDB schema preparation | SQL migrations or PostgreSQL setup | `prisma generate` and `prisma db push` | Prisma MongoDB docs use `db push` without migration files. [CITED: prisma.io/docs/prisma-orm/quickstart/mongodb] |
| Secret pattern engine | Large custom regex scanner | Gitleaks with `--redact` where available | Official CLI supports git/directory scans, JSON/SARIF reports, and redaction. [CITED: github.com/gitleaks/gitleaks] |
| Env parsing in app/tests | Ad hoc scattered checks | A shared env schema/module plus `.env.example` and matrix | Code already reads many env vars directly; centralizing names prevents docs drift. [VERIFIED: codebase rg] |

**Key insight:** Phase 1 should standardize command and documentation boundaries before changing business logic; custom setup logic that diverges from Next/Prisma/Jest conventions will recreate the maintainability problem this phase is meant to remove. [VERIFIED: 01-CONTEXT.md]

## Common Pitfalls

### Pitfall 1: Node Version Drift
**What goes wrong:** README says Node 18+, but Next.js 16 requires Node >=20.9.0. [VERIFIED: README.md] [CITED: nextjs.org/docs/app/guides/upgrading/version-16]
**Why it happens:** The repo upgraded Next without updating setup docs. [VERIFIED: README.md] [VERIFIED: package.json]
**How to avoid:** Add `.nvmrc` or `.node-version` with a compatible version and document `node --version`. [ASSUMED]
**Warning signs:** `npm run dev` or `npm run build` fails before app code loads. [ASSUMED]

### Pitfall 2: Prisma 7 Documentation vs Prisma 5 Project
**What goes wrong:** Current docs mention Prisma v7 config behavior, while the repo pins Prisma 5.22.0. [VERIFIED: package.json] [CITED: prisma.io/docs/cli/db/push]
**Why it happens:** Official docs are current, but the project is on an older major. [VERIFIED: npm registry]
**How to avoid:** Use repo-pinned `prisma` package commands through `npm run` after install; do not upgrade to Prisma 7 in Phase 1. [VERIFIED: package.json] [ASSUMED]
**Warning signs:** `npx prisma` downloads Prisma 7 when local dependencies are absent, as observed locally. [VERIFIED: local shell]

### Pitfall 3: `.env.example` Becoming a Secret Dump
**What goes wrong:** Maintainers copy inherited real values into examples or docs. [VERIFIED: AGENTS.md]
**Why it happens:** The workspace contains env-like and key-like artifacts. [VERIFIED: codebase CONCERNS.md]
**How to avoid:** Use placeholders only and list sensitivity in `docs/env-matrix.md`. [VERIFIED: 01-CONTEXT.md]
**Warning signs:** Example values look tenant-specific, token-like, private-key-like, or production-domain-specific. [ASSUMED]

### Pitfall 4: Secret Scanner Exposes the Secret
**What goes wrong:** Scanner logs or reports include matched values. [CITED: github.com/gitleaks/gitleaks]
**Why it happens:** Some tools include match/line fields in reports unless redacted/configured. [CITED: github.com/gitleaks/gitleaks]
**How to avoid:** Always use redaction, avoid verbose logs, and make custom inventory path-only. [CITED: github.com/gitleaks/gitleaks] [VERIFIED: AGENTS.md]
**Warning signs:** Report includes `Secret`, `Match`, or full line text fields. [CITED: github.com/gitleaks/gitleaks]

### Pitfall 5: Testing Async Server Components with Jest
**What goes wrong:** Tests become brittle or unsupported when importing async Server Components. [CITED: nextjs.org/docs/pages/guides/testing/jest]
**Why it happens:** Jest does not currently support async Server Components according to Next docs. [CITED: nextjs.org/docs/pages/guides/testing/jest]
**How to avoid:** Keep Phase 1 tests to env validation, scripts, pure helpers, and direct route handlers where dependencies are mocked. [VERIFIED: test-plan.md]
**Warning signs:** Test imports a page component that awaits Prisma/session calls at module render time. [ASSUMED]

## Code Examples

### Env Matrix Row Shape

```markdown
| Service | Variable | Sensitivity | Local | Staging | Source | Notes |
|---------|----------|-------------|-------|---------|--------|-------|
| Database | DATABASE_URL | server secret | required | required | prisma/schema.prisma | MongoDB connection string; never commit real value. |
```

### Path-Only Sensitive Inventory Shape

```typescript
type InventoryItem = {
  path: string;
  category: 'env-file' | 'drm-key' | 'certificate' | 'media-artifact' | 'service-account' | 'unknown-sensitive';
  trackedByGit: boolean;
  ignoredByGit: boolean;
  action: 'document' | 'rotate-review-later';
};
```

### Representative Jest Test Target

```typescript
describe('env documentation contract', () => {
  test('documents DATABASE_URL as MongoDB-owned server secret', () => {
    expect(envMatrix.DATABASE_URL.service).toBe('database');
    expect(envMatrix.DATABASE_URL.sensitivity).toBe('server secret');
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| README Node 18+ for Next app | Node >=20.9.0 for Next.js 16 | Next.js 16 docs current on 2026-05-05 | Phase 1 docs should require Node 20.9+ and can use local Node 24.15.0. [CITED: nextjs.org/docs/app/guides/upgrading/version-16] [VERIFIED: local shell] |
| `next dev --turbo` / `next build --turbo` | `next dev` / `next build` use Turbopack by default in Next 16 | Next.js 16 | Existing scripts are already aligned; no turbo flag needed. [CITED: nextjs.org/docs/app/guides/upgrading/version-16] [VERIFIED: package.json] |
| PostgreSQL primary DB docs | Prisma MongoDB `DATABASE_URL` and `db push` | Current repo state | README must be corrected to MongoDB. [VERIFIED: README.md] [VERIFIED: prisma/schema.prisma] |
| Standalone Jest TS transform | `next/jest` | Next.js docs current on 2026-05-05 | Use Next-aware Jest config. [CITED: nextjs.org/docs/pages/guides/testing/jest] |

**Deprecated/outdated:**
- README PostgreSQL setup claim: outdated because schema provider is MongoDB. [VERIFIED: README.md] [VERIFIED: prisma/schema.prisma]
- README Node 18+ claim: outdated for Next.js 16. [VERIFIED: README.md] [CITED: nextjs.org/docs/app/guides/upgrading/version-16]
- `npx prisma` before install: unsafe for planning because it downloaded Prisma 7 locally while package.json pins Prisma 5.22.0. [VERIFIED: local shell] [VERIFIED: package.json]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A `.nvmrc` or `.node-version` is the best way to pin local Node for this repo. | Common Pitfalls | Maintainers may prefer Volta/asdf; planner should choose based on team tooling. |
| A2 | Custom scanner code should be limited to path inventory while Gitleaks handles pattern detection. | Don't Hand-Roll | If Gitleaks cannot be installed in the environment, planner needs a fallback script with lower detection confidence. |
| A3 | Scanner warning signs include token-like or production-domain-like examples. | Common Pitfalls | False positives may occur; human review is still required. |
| A4 | Async page/component imports that await Prisma/session calls are poor Phase 1 Jest targets. | Common Pitfalls | Some components may be refactored into testable units later, but not needed for Phase 1. |

## Open Questions (RESOLVED)

1. **Which Node pinning file should the project use?**
   - What we know: Next.js 16 requires Node >=20.9.0, local shell has Node v24.15.0, and no `.nvmrc`, `.node-version`, or Volta config was found. [CITED: nextjs.org/docs/app/guides/upgrading/version-16] [VERIFIED: local shell]
   - Plan-selected answer: Use `.nvmrc` with `20.11.1` as specified in `01-02-PLAN.md`. This satisfies the Next.js 16 minimum while choosing the common nvm-compatible pinning file for the clean-checkout baseline. [VERIFIED: 01-02-PLAN.md]

2. **Should Phase 1 install Gitleaks as a prerequisite or provide a fallback?**
   - What we know: Gitleaks is not installed locally; official CLI supports redaction. [VERIFIED: local shell] [CITED: github.com/gitleaks/gitleaks]
   - Plan-selected answer: Local path-only inventory can run without Gitleaks. `secrets:scan` should use Gitleaks when available and must fail in strict/CI mode when the scanner is unavailable or findings exist; non-strict local mode gives clear skip/fallback messaging instead of blocking onboarding. [VERIFIED: 01-04-PLAN.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Next.js/scripts | yes | v24.15.0 | Install Node >=20.9.0. [VERIFIED: local shell] |
| npm | Package install/scripts | yes | 11.12.1 | Use npm because lockfile exists. [VERIFIED: local shell] [VERIFIED: package-lock.json] |
| Git | Secret scan/history awareness | yes | 2.54.0.windows.1 | None needed. [VERIFIED: local shell] |
| Local installed dependencies | Typecheck/build/test | no | `npm ls --depth=0` empty | Run `npm install` or `npm ci`. [VERIFIED: local shell] |
| TypeScript CLI | `npm run typecheck` | no until install | package declares `typescript` ^5 | Run dependency install first. [VERIFIED: package.json] [VERIFIED: local shell] |
| Prisma CLI | Prisma generate/db push | no until install; `npx` downloaded 7.8.0 | package pins 5.22.0 | Use local `npm run prisma:*` after install. [VERIFIED: package.json] [VERIFIED: local shell] |
| MongoDB / mongosh | `db:push` target verification | no CLI found | — | Use hosted MongoDB connection via `DATABASE_URL`; docs must state requirement. [VERIFIED: local shell] [VERIFIED: prisma/schema.prisma] |
| Gitleaks | Secret scanning | no | — | Path-only inventory plus strict install guidance. [VERIFIED: local shell] |

**Missing dependencies with no fallback:**
- A MongoDB-compatible `DATABASE_URL` is required for real `prisma db push`. [VERIFIED: prisma/schema.prisma]

**Missing dependencies with fallback:**
- Gitleaks is missing; path-only inventory can still run, but pattern-based secret scanning has lower confidence until Gitleaks is installed. [VERIFIED: local shell] [ASSUMED]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 plus `next/jest`, `jest-environment-jsdom` 30.3.0, Testing Library React 16.3.2. [VERIFIED: npm registry] [CITED: nextjs.org/docs/pages/guides/testing/jest] |
| Config file | Missing now; add `jest.config.ts`. [VERIFIED: codebase TESTING.md] |
| Quick run command | `npm test -- --runInBand` [ASSUMED] |
| Full suite command | `npm run lint && npm run typecheck && npm test && npm run build` [ASSUMED] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| SETUP-01 | Node/npm prerequisite docs and scripts are present | smoke/script | `npm run verify:setup` | no, Wave 0 |
| SETUP-02 | Prisma MongoDB commands are documented and exposed | smoke/script | `npm run prisma:generate` | no, Wave 0 |
| SETUP-03 | `.env.example` has placeholders and local docs link | unit/docs | `npm test -- env` | no, Wave 0 |
| SETUP-04 | Env matrix covers discovered env vars by service/sensitivity | unit/docs | `npm test -- env` | no, Wave 0 |
| SETUP-05 | README no longer claims PostgreSQL primary DB | docs check | `npm test -- docs` | no, Wave 0 |
| SETUP-06 | Root scripts expose lint/typecheck/build/test | unit/script | `npm test -- package-scripts` | no, Wave 0 |
| SETUP-07 | Sensitive artifacts are inventoried path-only and scanning is redacted | unit/script | `npm run secrets:inventory && npm run secrets:scan` | no, Wave 0 |
| TEST-01 | Jest route/service tooling runs representative tests | unit | `npm test` | no, Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- --runInBand` for test/config tasks; `npm run secrets:inventory` for secret-doc tasks. [ASSUMED]
- **Per wave merge:** `npm run lint && npm run typecheck && npm test`. [ASSUMED]
- **Phase gate:** `npm run lint && npm run typecheck && npm test && npm run build && npm run secrets:scan`. [ASSUMED]

### Wave 0 Gaps

- [ ] `jest.config.ts` - Next-aware Jest config. [VERIFIED: codebase TESTING.md]
- [ ] `__tests__/env/env-matrix.test.ts` - validates SETUP-03 and SETUP-04 docs contract. [ASSUMED]
- [ ] `__tests__/scripts/package-scripts.test.ts` - validates SETUP-06 script surface. [ASSUMED]
- [ ] Jest dependencies in `devDependencies`. [VERIFIED: package.json]
- [ ] `zod` as direct dependency if shared env validation uses it. [VERIFIED: codebase CONCERNS.md]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Docs must classify Google OAuth and NextAuth server secrets; no auth behavior changes in Phase 1. [VERIFIED: codebase rg] |
| V3 Session Management | yes | Docs must list `NEXTAUTH_SECRET`/auth env; no session logic changes in Phase 1. [VERIFIED: jest.setup.ts] [ASSUMED] |
| V4 Access Control | no direct implementation | Deeper entitlement/access control fixes are Phase 2. [VERIFIED: 01-CONTEXT.md] |
| V5 Input Validation | yes | Use `zod` or equivalent for env/script option validation; `zod` is already imported by app code. [VERIFIED: codebase CONCERNS.md] |
| V6 Cryptography | yes | Do not hand-roll crypto or inspect key material; document DRM/key artifacts path-only. [VERIFIED: AGENTS.md] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret values committed through examples or scanner output | Information Disclosure | Placeholder-only examples, redacted Gitleaks output, path-only inventory. [VERIFIED: AGENTS.md] [CITED: github.com/gitleaks/gitleaks] |
| Public env variable misuse | Information Disclosure | Prefix only intentionally browser-exposed config with `NEXT_PUBLIC_`; document that those values are bundled for the browser. [CITED: nextjs.org/docs/app/guides/environment-variables] |
| Optional service checks hide staging gaps | Security Misconfiguration | Default skip locally, strict fail for CI/staging. [VERIFIED: 01-CONTEXT.md] |
| Stale docs point maintainers to wrong database | Operational Failure | Correct README and env matrix to MongoDB/Prisma `db push`. [VERIFIED: README.md] [VERIFIED: prisma/schema.prisma] |

## Sources

### Primary (HIGH confidence)

- `AGENTS.md` - project workflow and secret handling constraints. [VERIFIED: local file]
- `.planning/phases/01-installable-baseline-docs-and-secret-hygiene/01-CONTEXT.md` - locked decisions and deferred scope. [VERIFIED: local file]
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/PROJECT.md` - phase requirements and project constraints. [VERIFIED: local files]
- `.planning/codebase/STACK.md`, `.planning/codebase/TESTING.md`, `.planning/codebase/CONCERNS.md` - stack, missing tests, setup drift, secret concerns. [VERIFIED: local files]
- `package.json`, `README.md`, `jest.setup.ts`, `test-plan.md`, `prisma/schema.prisma` - implementation and docs reality. [VERIFIED: local files]
- Next.js 16 upgrade docs - Node requirement and Turbopack default: https://nextjs.org/docs/app/guides/upgrading/version-16. [CITED: official docs]
- Next.js Jest docs - `next/jest`, Jest packages, async Server Component caveat: https://nextjs.org/docs/pages/guides/testing/jest. [CITED: official docs]
- Next.js environment variables docs - `.env*`, `NEXT_PUBLIC_`, test env behavior: https://nextjs.org/docs/app/guides/environment-variables. [CITED: official docs]
- Prisma MongoDB quickstart - `db push` for MongoDB: https://www.prisma.io/docs/prisma-orm/quickstart/mongodb. [CITED: official docs]
- Prisma `db push` CLI docs - command behavior and Prisma v7 note: https://www.prisma.io/docs/cli/db/push. [CITED: official docs]
- Gitleaks README - redaction and reports: https://github.com/gitleaks/gitleaks. [CITED: official GitHub]

### Secondary (MEDIUM confidence)

- npm registry metadata from `npm view` for current package versions and publish dates. [VERIFIED: npm registry]
- Local shell checks for Node, npm, Git, missing `mongosh`, missing Gitleaks, and empty installed package tree. [VERIFIED: local shell]

### Tertiary (LOW confidence)

- Assumptions in the Assumptions Log about preferred Node pinning, Gitleaks fallback strategy, and test target ergonomics. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified against package.json, npm registry, and official Next/Prisma/Jest docs.
- Architecture: HIGH - constrained by phase context and existing repo shape.
- Pitfalls: MEDIUM - major pitfalls verified; some implementation warning signs are assumptions requiring planner judgment.

**Research date:** 2026-05-05
**Valid until:** 2026-06-04 for dependency versions; official docs and package latest versions should be rechecked before implementation if delayed.
