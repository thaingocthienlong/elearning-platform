# Verification Commands

Run these commands from the repository root. They are the maintainer-facing verification surface for Phase 1 and later staging checks.

## Core Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

- `npm run lint` runs the Next.js ESLint configuration.
- `npm run typecheck` runs TypeScript with `tsc --noEmit`.
- `npm test` runs the Jest suite configured through `next/jest`.
- `npm run build` runs the Next.js production build.

## Setup Checks

```bash
npm run verify:setup
npm run verify:services
npm run verify:services:strict
npm run verify:doverunner
```

- `npm run verify:setup` checks Node >=20.9.0, npm availability, expected root setup files, Prisma schema presence, `.env.example`, `docs/env-matrix.md`, and required root package scripts.
- `npm run verify:services` derives service groups and required variable names from `docs/env-matrix.md`. In default local mode, missing external service credentials print `SKIP <service>: missing VAR_NAME` messages and the command exits 0.
- `npm run verify:services:strict` runs the same env-matrix-derived checks with strict failure semantics. It exits nonzero when required service groups are missing variables. `CI=true` applies the same strict-fail behavior.
- `npm run verify:doverunner` validates DoveRunner T&P/Multi-DRM and AWS S3 env configuration and skips live API calls by default. Use `npm run verify:doverunner -- --live` only when real DoveRunner and AWS credentials are intentionally configured.

Service verification reports missing variable names only. It must not print env values, tokens, connection strings, masks, or service-account material.

## Secret Hygiene Checks

```bash
npm run secrets:inventory
npm run secrets:scan
```

- `npm run secrets:inventory` inventories sensitive-looking paths and categories without reading or printing secret values.
- `npm run secrets:scan` runs the local secret scanning gate. Scanner output must be redacted and suitable for maintainer review without exposing matched values.

## Recommended Local Sequence

```bash
npm run verify:setup
npm run verify:services
npm run verify:doverunner
npm run lint
npm run typecheck
npm test
npm run build
npm run secrets:inventory
npm run secrets:scan
```

Use `npm run verify:services:strict` when validating staging readiness or CI completeness. Strict service verification may fail on a local placeholder-only checkout until real service credentials are configured.
