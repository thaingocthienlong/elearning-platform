# Technology Stack

**Project:** Secure Streaming Platform Rescue
**Researched:** 2026-05-05
**Dimension:** Stack and staging setup
**Overall confidence:** HIGH for official setup path, MEDIUM for Axinom trial/account details that require portal access

## Recommendation

Keep the current architecture for the rescue milestone: Next.js App Router on Vercel, Prisma with MongoDB, NextAuth v4, Axinom DRM and Encoding, Shaka Player, Zoom Meeting SDK, Upstash Redis, Azure Blob input/output storage, R2/S3-compatible delivery storage, Sentry, ESLint, Playwright, Vitest, and secret scanning. Do not migrate the database, auth system, video provider, meeting provider, or hosting platform during staging rescue.

The first stack goal is reproducibility: a clean checkout should install, generate Prisma Client, validate env vars, run lint/typecheck/tests, build on Node 20, and deploy to a Vercel preview with external staging services. The second goal is integration correctness: Axinom license tokens must be signed server-side, Shaka must send `X-AxDRM-Message` only on license requests, Zoom signatures must be generated server-side, and every media-serving route must enforce the same entitlement helper.

## Recommended Stack

### Runtime and Framework

| Technology | Current repo | Recommended for staging | Purpose | Why |
|------------|--------------|-------------------------|---------|-----|
| Node.js | README says 18+ | Pin `>=20.9.0`; prefer Node 20 LTS until dependency upgrades are planned | Local, Vercel build, Next.js runtime | Next.js 16 requires Node 20.9+; Prisma 7 requires stricter Node 20.19+/22.12+, so stay on Prisma 5 for now. |
| npm | lockfile v3 | Keep npm and `npm ci` | Reproducible installs | Existing lockfile is npm-based; do not introduce pnpm/yarn during rescue. |
| Next.js | `16.2.6` | Keep 16.x, patch within 16 only after smoke tests | App Router UI and route handlers | Current app is already App Router/Vercel-shaped; official docs require explicit ESLint CLI because `next build` no longer runs lint. |
| React | `18.3.1` | Keep React 18 | UI runtime | Avoid React 19 migration until Zoom/Shaka client components and effects have tests. |
| TypeScript | `^5` | Keep TypeScript 5; add `typecheck` script | Static checks | Required by Next 16 and critical for brownfield rescue. |
| Tailwind/Radix/shadcn | Present | Keep | UI components | Existing admin/client UI already uses this stack. |

Required package scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "postinstall": "prisma generate",
    "db:push": "prisma db push",
    "db:seed": "prisma db seed",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "vercel-build": "prisma generate && next build"
  }
}
```

### Database and Auth

| Technology | Current repo | Recommended for staging | Purpose | Why |
|------------|--------------|-------------------------|---------|-----|
| MongoDB Atlas or compatible MongoDB | Prisma datasource is `mongodb` | Keep MongoDB | Primary database | Schema uses ObjectId and Prisma MongoDB; README PostgreSQL references are stale. |
| Prisma ORM | `5.22.0` | Keep 5.22 initially; patch only within Prisma 5/6 after tests | Database client | Prisma 7 is current but requires stricter Node engines and may introduce avoidable rescue risk. |
| Prisma Client generation | `postinstall` exists | Keep `postinstall`; run `prisma generate` in Vercel build | Generated DB client | Official Prisma Vercel docs call out stale client risk with dependency caching. |
| Prisma schema sync | No migrations | Use `prisma db push` for staging schema changes | MongoDB schema/index sync | Prisma MongoDB does not support Prisma Migrate; use `db push`. |
| NextAuth.js | `4.24.13` | Patch to `4.24.14`, do not migrate to Auth.js v5 yet | Google OAuth + DB sessions | Existing session, whitelist, revocation, and middleware logic depends on v4 contracts. |

Database setup path:

```bash
npm ci
npx prisma generate
npx prisma db push
npx prisma db seed
```

Staging database requirements:

| Requirement | Prescription |
|-------------|--------------|
| Connection string | `DATABASE_URL` must point to staging MongoDB, not local/dev/prod. |
| Indexes | Keep existing `@@index` and `@@unique` entries; add explicit indexes before broad admin analytics fixes. |
| Migration policy | Use `db push` only; do not add PostgreSQL migrations or Prisma Migrate. |
| Data safety | Seed only test admin/users/courses/videos; do not import production user or key material. |

### DRM, Encoding, and Playback

| Technology | Current repo | Recommended for staging | Purpose | Why |
|------------|--------------|-------------------------|---------|-----|
| Axinom DRM License Service | Existing custom token code | Keep; validate against official entitlement docs | Managed DRM license issuance | Axinom separates project-specific entitlement from managed license issuing. |
| Axinom Communication Key | Env-driven | Required: communication key ID and base64 secret in server env only | Sign License Service Messages | Axinom requires Communication Key ID/value to sign the JWT with HS256. |
| Axinom Entitlement Message | Existing `jsonwebtoken` implementation | Generate server-side after shared entitlement check | License policy | Entitlement controls content keys, license time windows, usage policy, and session/user data. |
| Axinom Encoding/Video Service | Existing GraphQL/REST code | Keep; document profile IDs and webhook URL | Protected video processing | Trial setup must create acquisition, publishing, and processing profiles before staging upload tests. |
| Shaka Player | `4.16.9`; npm latest observed `5.1.3` | Keep 4.16.9 for rescue; upgrade only after browser playback tests | DASH/HLS + EME playback | Current Axinom docs still show Shaka 4 examples; upgrade risk is in client DRM behavior. |
| Shaka Packager CLI | Scripts call `packager` | Optional local-only tool | Local DRM packaging experiments | Do not make local packaging a staging dependency if Axinom Encoding is authoritative. |

Axinom trial setup path:

1. Create or access the Axinom Mosaic/DRM trial tenant in the Axinom Portal.
2. In DRM configuration, obtain License Service URLs, Communication Key ID, Communication Key value, and FairPlay certificate URL if FairPlay is enabled.
3. Configure server-side env vars for `AXINOM_COM_KEY_ID`, `AXINOM_COM_KEY_SECRET`, `AXINOM_FAIRPLAY_CERT_URL`, and public license URLs.
4. Create Axinom Encoding/Video acquisition and publishing profiles for staging storage. Prefer separate input/output containers; development may share storage only by distinct containers or prefixes.
5. Create processing profiles for clear and DRM outputs; store IDs in `AXINOM_ENCODING_PROFILE_CLEAR` and `AXINOM_ENCODING_PROFILE_DRM`.
6. Configure Axinom webhook target to the Vercel preview/staging URL at `/api/webhook/axinom`; set a staging-only `AXINOM_WEBHOOK_SECRET`.
7. Upload one non-sensitive test video to staging input storage, start a DRM encode, wait for webhook/sync, then test playback with Axinom's DRM Video Playback Tool and the app watch page.

Required Axinom env vars:

```bash
AXINOM_COM_KEY_ID=
AXINOM_COM_KEY_SECRET=
AXINOM_ENCODING_CLIENT_ID=
AXINOM_ENCODING_CLIENT_SECRET=
AXINOM_ENCODING_PROFILE_DRM=
AXINOM_ENCODING_PROFILE_CLEAR=
AXINOM_VIDEO_SERVICE_URL=
AXINOM_ENCODING_API_URL=
AXINOM_WEBHOOK_SECRET=
AXINOM_FAIRPLAY_CERT_URL=
NEXT_PUBLIC_AX_WV_LS_URL=https://drm-widevine-licensing.axprod.net/AcquireLicense
NEXT_PUBLIC_AX_PR_LS_URL=https://drm-playready-licensing.axprod.net/AcquireLicense
NEXT_PUBLIC_AX_FP_LS_URL=https://drm-fairplay-licensing.axprod.net/AcquireLicense
```

Player prescription:

```ts
player.configure({
  drm: {
    servers: {
      "com.widevine.alpha": process.env.NEXT_PUBLIC_AX_WV_LS_URL,
      "com.microsoft.playready": process.env.NEXT_PUBLIC_AX_PR_LS_URL,
      "com.apple.fps": process.env.NEXT_PUBLIC_AX_FP_LS_URL
    },
    advanced: {
      "com.apple.fps": {
        serverCertificateUri: fairPlayCertificateUrl
      }
    }
  }
});

player.getNetworkingEngine()?.registerRequestFilter((type, request) => {
  if (type === shaka.net.NetworkingEngine.RequestType.LICENSE) {
    request.headers["X-AxDRM-Message"] = entitlementToken;
  }
});
```

Do not expose `AXINOM_COM_KEY_SECRET` to the browser. Do not use the local `/api/drm/license` stub as a real DRM license server. The staging path should use Axinom's License Service, with the app acting as the entitlement service.

### Meeting Integration

| Technology | Current repo | Recommended for staging | Purpose | Why |
|------------|--------------|-------------------------|---------|-----|
| Zoom Meeting SDK for Web | `@zoom/meetingsdk` `5.0.4`; npm latest observed `6.0.0` | Keep 5.0.4 for first staging rescue, then upgrade in a dedicated Zoom phase | Embedded Zoom meetings | Existing duplicated assets and auth flow need cleanup before a major SDK upgrade. |
| Zoom signature endpoint | Existing `/api/zoom/signature` | Keep server-side only; sign role 0 for attendees | Meeting SDK auth | Zoom requires SDK JWT/signature from secure backend credentials. |
| Client View vs Component View | Existing static/client assets | Retain current view for staging; choose Component View only during redesign | Meeting UI | Changing view affects layout, WASM/CSS assets, and user experience. |

Required Zoom env vars:

```bash
ZOOM_MEETING_SDK_KEY=
ZOOM_MEETING_SDK_SECRET=
NEXT_PUBLIC_ZOOM_MEETING_ID=
NEXT_PUBLIC_ZOOM_PASSCODE=
```

Zoom setup path:

1. Create/verify a Zoom Meeting SDK app in the Zoom App Marketplace/Developer portal.
2. Store SDK key/client ID and secret only in Vercel env vars.
3. Generate signatures in the Next.js route handler using role `0` for learner joins. Use role `1` plus host ZAK only if the app must start meetings.
4. Keep one authoritative SDK asset path. Remove duplicate `public/zoom`, `public/lib/zoom`, and `zoom-webapp` copies only after confirming the served runtime path.
5. Add a Playwright smoke test that authenticates, opens `/meeting`, fetches a signature, and verifies the SDK container reaches the initialized/joinable state without logging secrets.

### Storage, Cache, and Hosting

| Technology | Current repo | Recommended for staging | Purpose | Why |
|------------|--------------|-------------------------|---------|-----|
| Azure Blob Storage | Present | Keep for Axinom input/output | Encoding source/output | Current Axinom profile docs support Azure storage and repo has Azure helpers. |
| Cloudflare R2/S3-compatible storage | Present | Keep for app HLS/object reads | Delivery/object storage | Existing route and S3 SDK wrappers target this shape. |
| Upstash Redis REST | Present | Keep | Rate limiting, cache, revocation | Serverless-friendly REST Redis fits Vercel. |
| Vercel | Present | Keep for staging previews | Hosting | Official Next.js/Vercel path is zero-config and supports App Router, route handlers, middleware, streaming, analytics. |
| Sentry | Present | Keep | Error monitoring | Already wired for client, server, and edge configs. |

Required storage/cache env vars:

```bash
AZURE_STORAGE_ACCOUNT=
AZURE_STORAGE_KEY=
AZURE_VIDEO_INPUT_CONTAINER=
AZURE_VIDEO_OUTPUT_CONTAINER=
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PREFIX=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_SENTRY_DSN=
```

Vercel staging setup path:

```bash
npm install -g vercel
vercel link
vercel env pull .env.local
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
vercel deploy
vercel logs --deployment <preview-deployment-id> --level error
```

Use Vercel Preview for staging until a fixed staging domain is required for Axinom/Zoom callback allowlists. Add every secret to the Preview environment first; promote to Production only after staging smoke tests pass.

### Security and Testing Tooling

| Tool | Recommended version path | Purpose | Why |
|------|--------------------------|---------|-----|
| Zod | Add direct dependency, npm latest observed `4.4.3` | Runtime request/env validation | App imports `zod` without declaring it directly. |
| Vitest | Add, npm latest observed `4.1.5` | Fast unit/integration tests | Good fit for server helpers, entitlement logic, signature generation, and pure utilities. |
| Playwright | Add `@playwright/test`, npm latest observed `1.59.1` | End-to-end browser smoke tests | Needed for auth, watch playback shell, Zoom page, admin flows, and staging verification. |
| ESLint | Existing ESLint 9 | Static lint | Required because Next 16 build does not run lint automatically. |
| Prettier + Tailwind plugin | Existing | Formatting | Keep current style tooling. |
| `npm audit` | Built in | Dependency vulnerability gate | Zero extra dependency; run in CI and before staging. |
| Gitleaks or equivalent secret scanner | Add CI step | Secret leakage detection | Workspace contains env/key-like artifacts; secret scanning is mandatory before staging. |
| Sentry | Existing | Runtime error capture | Validate DSN and source maps in staging later. |

Minimum tests before staging is considered real:

| Area | Required checks |
|------|-----------------|
| Env validation | Missing required env vars fail fast with redacted messages. |
| Axinom token | Unit test signs a License Service Message with a fake base64 communication key and never exposes the secret client-side. |
| Entitlement | Shared helper tests enrollment, direct access, `validFrom`, `validUntil`, `expiresAt`, published/deleted state, and view limit. |
| HLS/DRM routes | API tests prove unauthorized users cannot fetch playlists or tokens. |
| Zoom signature | Unit test validates role, meeting number, expiration, and no client-side secret. |
| Webhook | Test malformed signatures return 403, not 500. |
| E2E smoke | Sign in, view course, open watch page, request DRM token, open meeting page, and verify admin access control. |

Suggested dev dependency install:

```bash
npm install zod
npm install -D vitest @playwright/test eslint-plugin-security
npx playwright install --with-deps
```

## What Not to Migrate Yet

| Do not migrate | Why not now | Revisit when |
|----------------|-------------|--------------|
| MongoDB to PostgreSQL | Schema is ObjectId/MongoDB and there are no tests; migration would be a rewrite. | Profiling shows MongoDB is the bottleneck after indexes/cache/query fixes. |
| NextAuth v4 to Auth.js v5 | Session and whitelist logic are security-sensitive and already fragile. | Auth/session tests exist and staging auth is stable. |
| Shaka 4 to 5 | DRM playback can regress by browser and key system. | Playback matrix exists for Chrome/Edge/Safari and Axinom tokens are verified. |
| Zoom SDK 5 to 6 | Current repo has duplicated SDK assets and unclear source of truth. | One asset path is retained and meeting smoke tests exist. |
| Axinom replacement | Axinom trial integration is a core current dependency. | Official setup is documented and provider limitations are proven. |
| Vercel replacement | Deployment target is already Vercel-shaped. | Function duration, cost, or compliance limits are measured and blocking. |
| Local DRM license server | Current endpoint is a stub and key custody is unresolved. | A formal key management design exists. |

## Required Environment Variable Inventory

### Core

```bash
NODE_ENV=
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ADMIN_EMAIL=
```

### DRM and Encoding

```bash
AXINOM_COM_KEY_ID=
AXINOM_COM_KEY_SECRET=
AXINOM_ENCODING_CLIENT_ID=
AXINOM_ENCODING_CLIENT_SECRET=
AXINOM_ENCODING_PROFILE_DRM=
AXINOM_ENCODING_PROFILE_CLEAR=
AXINOM_ENCODING_API_URL=
AXINOM_VIDEO_SERVICE_URL=
AXINOM_WEBHOOK_SECRET=
AXINOM_FAIRPLAY_CERT_URL=
NEXT_PUBLIC_AX_WV_LS_URL=
NEXT_PUBLIC_AX_PR_LS_URL=
NEXT_PUBLIC_AX_FP_LS_URL=
NEXT_PUBLIC_DRM_LICENSE_URL=
```

### Storage and Delivery

```bash
AZURE_STORAGE_ACCOUNT=
AZURE_STORAGE_KEY=
AZURE_VIDEO_INPUT_CONTAINER=
AZURE_VIDEO_OUTPUT_CONTAINER=
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PREFIX=
AWS_REGION=
KMS_KEY_ALIAS=
```

### Redis, Meeting, Support, Observability

```bash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
ZOOM_MEETING_SDK_KEY=
ZOOM_MEETING_SDK_SECRET=
NEXT_PUBLIC_ZOOM_MEETING_ID=
NEXT_PUBLIC_ZOOM_PASSCODE=
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=
NEXT_PUBLIC_SENTRY_DSN=
```

Keep legacy `AX_*` and `MOSAIC_*` env vars only until the Axinom modules are consolidated. Mark them deprecated in docs rather than deleting them before setup verification.

## Setup Path for Maintainers

```bash
# 1. Prerequisites
node --version  # must be >=20.9.0
npm --version

# 2. Install
npm ci

# 3. Configure env
vercel env pull .env.local
# or create .env.local from documented placeholders, never from inherited secret files

# 4. Generate and sync Prisma
npx prisma generate
npx prisma db push
npx prisma db seed

# 5. Verify locally
npm run lint
npm run typecheck
npm run test
npm run build
npm run dev

# 6. Verify staging
vercel deploy
vercel logs --deployment <preview-deployment-id> --level error
```

## Staging Service Checklist

| Service | Required staging setup |
|---------|------------------------|
| MongoDB | Dedicated staging cluster/db, IP/network access for Vercel, no production data by default. |
| Google OAuth | Staging callback URL for `/api/auth/callback/google`. |
| Axinom | Trial tenant, communication key, license URLs, encoding service account, clear/DRM profiles, webhook target. |
| Azure Blob | Staging input/output containers; least-privilege key/SAS; CORS only where required. |
| R2/S3 | Staging bucket or prefix; credentials scoped to bucket/prefix. |
| Upstash Redis | Dedicated staging database. |
| Zoom | Meeting SDK app credentials; staging meeting ID/passcode; callback/domain allowlists as required by Zoom. |
| Vercel | Preview environment variables, fixed staging domain if external callback allowlists need stability. |
| Sentry | Staging project/environment tag. |

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Next.js/Vercel | HIGH | Official Next.js/Vercel docs and current npm registry agree on Node 20+ direction. |
| Prisma/MongoDB | HIGH | Schema is MongoDB and official Prisma docs state MongoDB uses `db push`, not Prisma Migrate. |
| Axinom DRM | HIGH for token/player mechanics, MEDIUM for trial portal specifics | Official Axinom docs define entitlement/license signing and Shaka integration; actual tenant setup must be verified in portal. |
| Zoom Meeting SDK | MEDIUM | Official docs and package registry confirm backend JWT/signature flow; major version upgrade from repo 5.0.4 to current 6.0.0 needs hands-on validation. |
| Shaka Player | HIGH for integration pattern, MEDIUM for upgrade | Official Shaka/Axinom docs confirm DRM servers and license request headers; repo should defer Shaka major upgrade until playback tests exist. |
| Testing/security tools | MEDIUM | Tool recommendations are standard for Next.js rescue, but exact CI choice depends on repository hosting. |

## Sources

- Next.js installation and Node requirements: https://nextjs.org/docs/app/getting-started/installation
- Next.js deployment docs: https://nextjs.org/docs/app/getting-started/deploying
- Vercel Next.js docs: https://vercel.com/docs/frameworks/nextjs
- Vercel CLI deployment path: https://vercel.com/docs/projects/deploy-from-cli
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Prisma Next.js/Vercel guide: https://www.prisma.io/docs/guides/frameworks/nextjs
- Prisma Vercel deployment notes: https://www.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel
- Prisma MongoDB connector: https://www.prisma.io/docs/orm/core-concepts/supported-databases/mongodb
- Prisma `db push`: https://www.prisma.io/docs/cli/db/push
- Axinom DRM License Service: https://docs.axinom.com/services/drm/license-service
- Axinom Entitlement Message tool: https://docs.axinom.com/general/tools/entitlement-message
- Axinom License Service Message signing: https://docs.axinom.com/services/drm/license-service/sign-license-service-message
- Axinom player quick start: https://docs.axinom.com/services/drm/quickstart/player
- Axinom Shaka Player integration: https://docs.axinom.com/services/drm/players/shaka
- Axinom encoding profiles: https://docs.axinom.com/services/video/setup-encoding-profiles/
- Zoom Meeting SDK web docs: https://developers.zoom.us/docs/meeting-sdk/web/
- Zoom Meeting SDK authorization: https://developers.zoom.us/docs/meeting-sdk/auth/
- Zoom Meeting SDK web GitHub/README: https://github.com/zoom/meetingsdk-web
- Shaka Player DRM configuration: https://shaka-player-demo.appspot.com/docs/api/tutorial-drm-config.html
- Shaka Player license server auth: https://shaka-player-demo.appspot.com/docs/api/tutorial-license-server-auth.html
- Playwright installation: https://playwright.dev/docs/intro
