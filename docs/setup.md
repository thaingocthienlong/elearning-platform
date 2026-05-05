# Maintainer Setup

This runbook is the clean-checkout setup path for the Secure Video Platform. It documents the current implementation: Next.js 16, npm with `package-lock.json`, and Prisma MongoDB through `prisma/schema.prisma`.

## Quick Path

```bash
npm install
cp .env.example .env.local
npm run verify:setup
npm run prisma:generate
npm run db:push
npm run verify:services
npm run dev
```

Replace placeholder values in `.env.local` before running commands that need real external services.

## Prerequisites

- Node >=20.9.0. The repo pins `20.11.1` in `.nvmrc`.
- npm, using the committed `package-lock.json`.
- A MongoDB-compatible database connection for `DATABASE_URL` when preparing the Prisma schema.
- External service credentials only when verifying or using those integrations: Google OAuth, Upstash Redis, Axinom, Azure/R2 storage, Zoom, SMTP, reCAPTCHA, and Sentry.

## Install From Clean Checkout

Use npm from the repository root:

```bash
npm install
```

The `postinstall` script runs Prisma client generation. You can also run it explicitly:

```bash
npm run prisma:generate
```

Validate the local bootstrap contract:

```bash
npm run verify:setup
```

This checks the Node minimum, npm availability, expected root files, and maintainer-facing package scripts.

## Environment File

Create a local env file from the placeholder starter:

```bash
cp .env.example .env.local
```

Do not copy inherited real env values into docs or examples. `.env.example` is placeholder-only. `docs/env-matrix.md` is the source of truth for each variable's service owner, sensitivity, and local/staging requirement level.

For ordinary local setup, missing external credentials are allowed. The app can still install, generate Prisma client code, and start once required local placeholders are replaced enough for the workflow being exercised.

Axinom DRM and Encoding have a dedicated setup guide at `docs/axinom-setup.md`. Use it when configuring an Axinom trial tenant, communication keys, license service URLs, encoding profiles, and webhook callbacks.

After configuring real tenant values, use `docs/axinom-staging-checklist.md` for the opt-in staging playback validation path.

## Prisma MongoDB Setup

The active Prisma datasource is MongoDB:

```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}
```

Set `DATABASE_URL` in `.env.local` to a MongoDB connection string. For a local database this usually looks like:

```text
mongodb://localhost:27017/secure_video_platform
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Prepare the MongoDB-backed schema with Prisma:

```bash
npm run db:push
```

MongoDB setup uses `prisma db push`; do not follow stale SQL migration instructions for this repo's current datasource.

## Start Local Development

After install, env setup, and Prisma generation:

```bash
npm run dev
```

The Next.js development server starts from the repository root. Public browser configuration uses `NEXT_PUBLIC_` variables from `.env.local`; server secrets must remain server-only and are documented in `docs/env-matrix.md`.

## Optional Service Checks

Run local service verification:

```bash
npm run verify:services
```

This command reads `docs/env-matrix.md`, groups variables by service, and checks whether variables marked required for local or staging are present. By default it prints `SKIP <service>: missing ...` for missing external credentials and exits 0.

For staging or CI readiness, use strict mode:

```bash
npm run verify:services:strict
```

Strict mode, and `CI=true`, fails if any required service group is missing variables. The verifier does not call external service APIs in Phase 1 and does not print env values.

Axinom has a narrower verifier:

```bash
npm run verify:axinom
npm run verify:axinom -- --strict
npm run verify:axinom -- --strict --live
```

The default and strict Axinom modes validate configuration only. `--live` is opt-in and should be used only after real Axinom trial tenant values are configured.

## Troubleshooting

- `npm run verify:setup` reports `node >=20.9.0 required`: install a compatible Node version or use `.nvmrc`.
- `npm install` fails during Prisma generation: confirm dependencies installed from `package-lock.json`, then rerun `npm run prisma:generate`.
- `npm run db:push` cannot connect: confirm `DATABASE_URL` is a valid MongoDB connection string and the database is reachable.
- `npm run verify:services` prints `SKIP`: add the listed variable names to `.env.local` only if you need that integration locally.
- `npm run verify:services:strict` fails locally: this is expected until real staging-style credentials are configured.
- `npm run dev` fails before rendering the app: rerun `npm run verify:setup`, confirm `.env.local` exists, and check that required local variables in `docs/env-matrix.md` have usable placeholder or real values.
