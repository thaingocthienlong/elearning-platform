# Technology Stack

**Analysis Date:** 2026-05-05

## Languages

**Primary:**
- TypeScript 5 - Next.js app, API routes, React components, Prisma seed/scripts, and server helpers in `src/`, `prisma/seed.ts`, and `scripts/*.ts`.
- TSX - React Server Components and Client Components under `src/app/` and `src/components/`.

**Secondary:**
- JavaScript / MJS - Root utility scripts and DRM packaging scripts in `create-bulk-apis.js`, `scripts/db/upsert-keystore.mjs`, and `scripts/drm/*.mjs`.
- CSS - Global Tailwind/shadcn styling in `src/app/globals.css` and Zoom vendor assets under `src/app/meeting/`.
- Prisma schema - MongoDB data model in `prisma/schema.prisma`.

## Runtime

**Environment:**
- Node.js 18+ - Required by `README.md`; Next.js server runtime and scripts use Node APIs such as `node:fs`, `node:crypto`, and `node:child_process` in `scripts/drm/package-dash.mjs`, `scripts/drm/package-hls.mjs`, and `src/server/axinom.ts`.
- Next.js serverless/edge runtime - App Router API routes live under `src/app/api/**/route.ts`; `instrumentation.ts` loads separate Sentry config for `nodejs` and `edge` runtimes.

**Package Manager:**
- npm - `package-lock.json` is present with `lockfileVersion: 3`.
- Lockfile: present at `package-lock.json`.

## Frameworks

**Core:**
- Next.js 16.2.6 - App Router web application; configured in `next.config.ts` and scripts in `package.json`.
- React 18.3.1 / React DOM 18.3.1 - UI runtime for `src/app/` and `src/components/`.
- Prisma 5.22.0 / `@prisma/client` 5.22.0 - Database client generated on `postinstall`; schema in `prisma/schema.prisma`; singleton client in `src/lib/prisma.ts`.
- NextAuth.js 4.24.13 - Authentication and database sessions via `src/lib/auth.ts` and `src/app/api/auth/[...nextauth]/route.ts`.

**Testing:**
- Jest setup file detected at `jest.setup.ts`, but no Jest dependency or Jest config is declared in root `package.json`.
- No root `test` script is declared in `package.json`.

**Build/Dev:**
- TypeScript 5 - Compiler settings in `tsconfig.json`; path alias `@/*` maps to `src/*`.
- ESLint 9 with `eslint-config-next` 16.2.6 - Configured in `eslint.config.mjs`; `npm run lint` runs `eslint`.
- Prettier 3.6.2 with `prettier-plugin-tailwindcss` 0.7.1 - Configured in `.prettierrc`.
- Tailwind CSS 3.4.16 - Configured in `tailwind.config.ts`; shadcn-style UI metadata in `components.json`.
- PostCSS / Autoprefixer - Configured in `postcss.config.mjs`.
- tsx 4.21.0 - Used for Prisma seed command in `package.json`.
- Vite 7.1.4 and Webpack 5.101.3 - Used only by Zoom sample subprojects under `zoom-webapp/Components`, `zoom-webapp/CDN`, and `zoom-webapp/Local`.

## Key Dependencies

**Critical:**
- `next` 16.2.6 - Web framework and API route runtime for `src/app/`.
- `react` 18.3.1 and `react-dom` 18.3.1 - Component runtime.
- `@prisma/client` 5.22.0 and `prisma` 5.22.0 - MongoDB data access; `src/lib/prisma.ts` is the shared client.
- `next-auth` 4.24.13 and `@next-auth/prisma-adapter` 1.0.7 - Google OAuth, database-backed sessions, and Prisma persistence in `src/lib/auth.ts`.
- `@azure/storage-blob` 12.29.1 - Azure Blob SAS upload/output support in `src/lib/azure-storage.ts` and `scripts/fix-azure-cors.ts`.
- `@aws-sdk/client-s3` 3.937.0 and `@aws-sdk/s3-request-presigner` 3.937.0 - Cloudflare R2/S3-compatible access via `src/lib/r2.ts` and HLS playlist reads in `src/app/api/hls/playlist/[videoId]/route.ts`.
- `@aws-sdk/client-kms` 3.936.0 - Data key generation/decryption in `src/lib/kms.ts`.
- `@upstash/redis` 1.35.6 and `@upstash/ratelimit` 2.0.7 - Redis caching, system mode flags, session revocation checks, and middleware rate limits in `src/lib/redis.ts`, `src/middleware.ts`, and `src/lib/session-revocation.ts`.
- `jsonwebtoken` 9.0.2 and `jsrsasign` 11.1.0 - Axinom entitlement JWTs in `src/lib/axinom.ts` and Zoom Meeting SDK signatures in `src/app/api/zoom/signature/route.ts`.
- `shaka-player` 4.16.9 - DRM playback in `src/hooks/player/useShakaPlayer.ts`, `src/components/video/Player.tsx`, and `src/components/video/DRMPlayerWrapper.tsx`.
- `@zoom/meetingsdk` 5.0.4 - Zoom Meeting SDK dependency for meeting flows and sample apps under `zoom-webapp/`.

**Infrastructure:**
- `@sentry/nextjs` 10.27.0 - Error tracking and replay setup in `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/app/error.tsx`, and `src/app/global-error.tsx`.
- `@vercel/analytics` 1.6.0 and `@vercel/speed-insights` 1.3.0 - Client analytics mounted in `src/app/layout.tsx`.
- `nodemailer` 7.0.11 - SMTP support notifications in `src/lib/email.ts`.
- `@mui/material` 7.1.0, `@mui/icons-material` 7.1.0, `@emotion/react` 11.14.0, and `@emotion/styled` 11.14.0 - Material UI dependencies available to the app.
- `@radix-ui/*`, `class-variance-authority`, `tailwind-merge`, `clsx`, and `lucide-react` - shadcn/Radix UI component stack in `src/components/ui/`.
- `framer-motion`, `motion`, `lottie-react`, `recharts`, `sonner`, `next-themes`, and `nextstepjs` - UI animation, charts, notifications, theming, and tour support.
- `zod` 4.3.5 - Used by `src/app/api/upload/presigned/route.ts` and `src/app/api/admin/config/mode/route.ts`; present in `package-lock.json` as a transitive dependency but not declared directly in root `package.json`.

## Configuration

**Environment:**
- Environment values are read through `process.env` across `src/lib/*.ts`, `src/app/api/**/route.ts`, `src/middleware.ts`, and `scripts/*.ts`.
- Root env-like files are present and must not be read or committed with values: `mosaic-service-account-config.env`, `mosaic-service-account-config (1).env`, `mosaic-service-account-config (2).env`, and `packager.env`.
- Sensitive generated/key artifacts are present at the root and listed in `.gitignore`: `keys.json`, `KIDs.json`, `keys.cpix.xml`, `cert.der.b64`, and `wv_pssh.hex`.
- Required database env: `DATABASE_URL` for Prisma MongoDB in `prisma/schema.prisma` and `src/lib/prisma.ts`.
- Required auth env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXTAUTH_SECRET` for NextAuth in `src/lib/auth.ts`.
- Required Redis env: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for `src/lib/redis.ts` and `src/middleware.ts`.
- Required media/storage env: `AZURE_STORAGE_ACCOUNT`, `AZURE_STORAGE_KEY`, `AZURE_VIDEO_INPUT_CONTAINER`, `AZURE_VIDEO_OUTPUT_CONTAINER`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, and `R2_PREFIX`.
- Required DRM/encoding env: `AXINOM_ENCODING_CLIENT_ID`, `AXINOM_ENCODING_CLIENT_SECRET`, `AXINOM_ENCODING_PROFILE_DRM`, `AXINOM_ENCODING_PROFILE_CLEAR`, `AXINOM_VIDEO_SERVICE_URL`, `AXINOM_COM_KEY_ID`, `AXINOM_COM_KEY_SECRET`, `AXINOM_WEBHOOK_SECRET`, `AXINOM_FAIRPLAY_CERT_URL`, and legacy `AX_*` values used by `src/server/axinom.ts`.
- Required communications env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `ADMIN_EMAIL`, `RECAPTCHA_SECRET_KEY`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `ZOOM_MEETING_SDK_KEY`, `ZOOM_MEETING_SDK_SECRET`, `NEXT_PUBLIC_ZOOM_MEETING_ID`, and `NEXT_PUBLIC_ZOOM_PASSCODE`.

**Build:**
- `package.json`: npm scripts, dependencies, and Prisma seed command.
- `package-lock.json`: npm lockfile.
- `tsconfig.json`: TypeScript compiler options and `@/*` alias.
- `next.config.ts`: Next.js image remote patterns for R2, server external packages for Prisma, and COOP/COEP headers for Zoom pages.
- `eslint.config.mjs`: ESLint 9 flat config using Next core web vitals and TypeScript rules.
- `.prettierrc`: Prettier formatting and Tailwind class sorting.
- `tailwind.config.ts`: Tailwind content paths and theme tokens.
- `components.json`: shadcn/Radix UI alias and style config.
- `postcss.config.mjs`: PostCSS/Tailwind pipeline.
- `vercel.json`: Vercel framework set to `nextjs`.
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and `instrumentation.ts`: Sentry runtime setup.

## Platform Requirements

**Development:**
- Node.js 18+ and npm install from root `package.json`.
- MongoDB-compatible database URL for Prisma; `prisma/schema.prisma` uses `provider = "mongodb"`.
- Azure Blob Storage account for upload/output paths used by `src/lib/azure-storage.ts`.
- Axinom service account and processing profile IDs for encoding/DRM flows in `src/lib/axinom-video-service.ts`, `src/lib/axinom-encoding.ts`, and `src/server/axinom.ts`.
- Upstash Redis REST credentials for middleware rate limiting, caching, session revocation, and system mode.
- Google OAuth credentials for sign-in.
- Zoom Meeting SDK credentials for `/api/zoom/signature`.
- Optional SMTP and Sentry DSN for notifications and observability.
- Shaka Packager CLI named `packager` on PATH for local DRM packaging scripts in `scripts/drm/package-dash.mjs` and `scripts/drm/package-hls.mjs`.

**Production:**
- Vercel is the detected deployment target via `vercel.json`, `@vercel/analytics`, `@vercel/speed-insights`, and Next.js serverless route conventions.
- Next.js App Router server/edge routes serve API endpoints from `src/app/api/`.
- `src/app/api/video/process/route.ts` declares `maxDuration = 300`, requiring hosting support for long-running encoding trigger requests.
- MongoDB is the active Prisma datasource. `README.md` mentions PostgreSQL, but `prisma/schema.prisma` and ObjectId annotations define the implemented database provider as MongoDB.

---

*Stack analysis: 2026-05-05*
