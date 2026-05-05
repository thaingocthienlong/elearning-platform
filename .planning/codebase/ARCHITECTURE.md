<!-- refreshed: 2026-05-05 -->
# Architecture

**Analysis Date:** 2026-05-05

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router UI                     │
├──────────────────┬──────────────────┬───────────────────────┤
│  Course Pages    │  Watch Player    │  Admin/Meeting UI     │
│ `src/app/courses`│ `src/app/watch`  │ `src/app/admin`,      │
│                  │                  │ `src/app/meeting`     │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Route Handlers / Middleware                  │
│ `src/app/api/**/route.ts`, `src/middleware.ts`               │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Service and Client Layer                    │
│ `src/lib`, `src/server`, `src/hooks`, `src/components`       │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│      Persistence, Cache, DRM, Storage, Analytics, SDKs       │
│ `prisma/schema.prisma`, Upstash Redis, Axinom, R2/Azure,     │
│ Zoom SDK assets under `public/zoom*` and `public/lib/zoom`   │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Root layout | Global providers, navbar, support reporting, toasts, analytics, fonts, theme shell | `src/app/layout.tsx` |
| Global middleware | System mode redirects, API/auth rate limiting, protected route session-cookie and revocation checks | `src/middleware.ts` |
| Auth configuration | Google sign-in, Prisma adapter, database sessions, whitelist gating, role enrichment | `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts` |
| Course pages | Server-side session checks, course enrollment lookup, cached course lists, client handoff | `src/app/courses/page.tsx`, `src/app/courses/[courseId]/page.tsx` |
| Watch page | Server-side access checks, view-limit checks, watermark source lookup, DRM token generation | `src/app/watch/[videoId]/page.tsx` |
| Video player | Shaka Player wrapper, DRM setup, heartbeat, fullscreen handling, watermark overlay | `src/components/video/Player.tsx`, `src/hooks/player/useShakaPlayer.ts` |
| API routes | JSON endpoints for admin CRUD, course data, DRM, uploads, sessions, support, video processing, Zoom signatures | `src/app/api/**/route.ts` |
| Admin shell | Client admin navigation and dashboard views backed by admin API routes | `src/app/admin/**/page.tsx`, `src/components/admin/**` |
| Admin hooks | Shared fetch, filtering, and pagination behavior for admin screens | `src/hooks/admin/useAdminData.ts`, `src/hooks/admin/useAdminFilters.ts`, `src/hooks/admin/useTablePagination.ts` |
| Persistence | Prisma client singleton and MongoDB schema models | `src/lib/prisma.ts`, `prisma/schema.prisma` |
| Redis layer | Optional cache, cache invalidation, rate-limit backend, system mode, session revocation flags | `src/lib/redis.ts`, `src/lib/session-revocation.ts` |
| Axinom integration | DRM token generation, video service auth, encoding job creation, sync helpers | `src/lib/axinom.ts`, `src/lib/axinom-video-service.ts`, `src/lib/axinom-encoding.ts`, `src/lib/axinom-sync.ts` |
| Storage integrations | R2 S3 client and Azure Blob helpers for upload and encoded video assets | `src/lib/r2.ts`, `src/lib/azure-storage.ts` |
| Meeting integration | Authenticated meeting iframe bootstrap, Zoom signature API, static Zoom client page | `src/app/meeting/page.tsx`, `src/app/api/zoom/signature/route.ts`, `public/zoom-meeting.html` |

## Pattern Overview

**Overall:** Next.js App Router with server components for protected data loading, colocated route handlers for backend behavior, and thin service clients in `src/lib`.

**Key Characteristics:**
- Use route segments in `src/app` as the primary feature boundary: pages live beside their URL path, and API handlers live beside their HTTP path.
- Use server components for database-backed page reads and redirects, for example `src/app/courses/page.tsx:19` and `src/app/watch/[videoId]/page.tsx:10`.
- Use client components only when browser state, SDKs, effects, or user interaction are required, for example `src/components/Providers.tsx:1`, `src/app/meeting/page.tsx:1`, and `src/components/video/Player.tsx:1`.
- Keep external clients and reusable server helpers in `src/lib`; route handlers and pages import these helpers through the `@/*` path alias configured in `tsconfig.json:25`.
- Use Prisma models in `prisma/schema.prisma` as the central data contract for users, sessions, courses, videos, access grants, watch records, tickets, DRM sessions, security events, and watermark settings.

## Layers

**Routing and Rendering:**
- Purpose: Own URL structure, layouts, server-side page data loading, redirects, loading states, and error boundaries.
- Location: `src/app`
- Contains: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `global-error.tsx`, API `route.ts` handlers.
- Depends on: `next`, `next-auth`, `@/lib/*`, `@/components/*`, `@/hooks/*`.
- Used by: Browser requests and Next.js runtime.

**HTTP API:**
- Purpose: Own mutations, admin table operations, video processing, DRM token/license requests, support ticket submission, SSE, webhooks, upload URLs, and Zoom signatures.
- Location: `src/app/api`
- Contains: One `route.ts` file per endpoint.
- Depends on: `NextResponse`, `getServerSession`, `authOptions`, `prisma`, service helpers from `src/lib`.
- Used by: Client components, player hooks, admin hooks, external webhooks, cron triggers.

**Middleware:**
- Purpose: Run before matched requests for system-mode redirects, rate limiting, and coarse protected-route session checks.
- Location: `src/middleware.ts`
- Contains: One exported `middleware(req)` and `config.matcher`.
- Depends on: `@upstash/ratelimit`, `@upstash/redis`, `next/server`.
- Used by: Next.js edge middleware runtime.

**Service Helpers:**
- Purpose: Centralize reusable integrations and state clients.
- Location: `src/lib`
- Contains: Auth options, Prisma singleton, Redis cache helpers, Axinom clients, storage clients, email helpers, console logging, DRM and screen recording detection.
- Depends on: External SDKs and environment variables.
- Used by: `src/app/**`, `src/components/**`, `src/hooks/**`, and scripts.

**Client Experience:**
- Purpose: Render interactive UI, video playback, admin tools, support dialogs, providers, language/theme state, and browser-only security checks.
- Location: `src/components`, `src/hooks`, `src/contexts`
- Contains: UI primitives, domain components, custom hooks, React contexts.
- Depends on: React, NextAuth client APIs, Shaka Player, Radix UI, Tailwind utilities, app API endpoints.
- Used by: App Router pages and layouts.

**Persistence:**
- Purpose: Define and access application data.
- Location: `prisma/schema.prisma`, `src/lib/prisma.ts`, `prisma/migrations`, `prisma/seed.ts`
- Contains: Prisma MongoDB datasource and models including `User`, `Session`, `Course`, `Video`, `Enrollment`, `VideoAccess`, `WatchRecord`, `SecurityEvent`, `DRMSession`, `Ticket`, `WatermarkSettings`.
- Depends on: `DATABASE_URL`.
- Used by: Auth, page data loading, admin APIs, playback APIs, support APIs, sync jobs.

**Static and Vendor Assets:**
- Purpose: Serve images, Zoom Meeting SDK files, patched meeting client, icons, media samples.
- Location: `public`, `zoom-webapp`
- Contains: Static web assets, copied Zoom SDK bundles, sample app source.
- Depends on: Next.js static asset serving.
- Used by: `src/app/meeting/page.tsx`, `public/zoom-meeting.html`, browser requests.

## Data Flow

### Course List Request Path

1. Browser requests `/courses`; `src/middleware.ts:18` checks system mode and `src/middleware.ts:42` applies rate limiting only to API/auth paths.
2. `src/app/courses/page.tsx:19` runs as an async server component and validates the database session through `getServerSession(authOptions)`.
3. `src/app/courses/page.tsx:27` loads the current user with Prisma.
4. `src/app/courses/page.tsx:36` imports Redis helpers and `src/app/courses/page.tsx:38` wraps enrollment and course queries in `getCached`.
5. `src/app/courses/page.tsx:81` passes data into `src/components/course/CoursesListClient.tsx` for client rendering.

### Protected Video Playback Path

1. Browser requests `/watch/[videoId]`; `src/middleware.ts:79` requires a session cookie for protected paths and `src/middleware.ts:92` checks Redis revocation flags.
2. `src/app/watch/[videoId]/page.tsx:10` validates the session and redirects unauthenticated users.
3. `src/app/watch/[videoId]/page.tsx:19` loads user and video, then `src/app/watch/[videoId]/page.tsx:28` loads access grants, enrollment, sidebar videos, and watch records.
4. `src/app/watch/[videoId]/page.tsx:100` enforces course access, video access windows, and view limits.
5. `src/app/watch/[videoId]/page.tsx:141` dynamically imports `generateAxinomToken` from `src/lib/axinom.ts`.
6. `src/app/watch/[videoId]/page.tsx:147` renders `SecurityWrapper` and `WatchPageClient`.
7. `src/components/video/Player.tsx:44` initializes Shaka Player through `src/hooks/player/useShakaPlayer.ts`; `src/components/video/Player.tsx:56` starts heartbeat updates through `src/hooks/player/usePlayerHeartbeat.ts`.
8. `src/app/api/watch/heartbeat/route.ts:6` records playback position and view counts in `WatchRecord`.

### DRM Token Path

1. Client posts a `videoId` to `src/app/api/drm/token/route.ts:7`.
2. The route validates the session at `src/app/api/drm/token/route.ts:8`.
3. The route loads video metadata and user data at `src/app/api/drm/token/route.ts:16` and `src/app/api/drm/token/route.ts:25`.
4. Non-open courses require `VideoAccess` and `Enrollment` checks at `src/app/api/drm/token/route.ts:35`.
5. `src/app/api/drm/token/route.ts:66` returns an Axinom token generated by `src/lib/axinom.ts`.

### Admin Mutation Path

1. Admin pages in `src/app/admin/**/page.tsx` use client-side fetch hooks such as `src/hooks/admin/useAdminData.ts:12`.
2. `src/hooks/admin/useAdminData.ts:43` builds query strings and `src/hooks/admin/useAdminData.ts:46` fetches the configured API endpoint.
3. Admin API routes validate role with `getServerSession(authOptions)`; `src/app/api/admin/table-action/route.ts:7` is the generic pattern.
4. Mutating routes use Prisma directly, for example `src/app/api/admin/table-action/route.ts:22` selects an allowed model and `src/app/api/admin/table-action/route.ts:25` soft-deletes/restores records.
5. Routes that affect cached data call invalidation helpers from `src/lib/redis.ts`, for example admin watermark and user-permission endpoints.

### Meeting Path

1. Browser requests `/meeting`; `src/middleware.ts:79` treats it as protected.
2. `src/app/meeting/page.tsx:7` runs as a client component using `useSession`.
3. `src/app/meeting/page.tsx:66` posts meeting number and role to `src/app/api/zoom/signature/route.ts`.
4. `src/app/api/zoom/signature/route.ts:12` reads Zoom SDK credentials, `src/app/api/zoom/signature/route.ts:45` signs a JWT, and `src/app/api/zoom/signature/route.ts:56` loads whitelist details for watermark text.
5. `src/app/meeting/page.tsx:86` builds query params and `src/app/meeting/page.tsx:143` renders an iframe to `public/zoom-meeting.html`.

### Session Revocation Path

1. `src/components/Providers.tsx:33` wraps the app in `SessionProvider`, `LanguageProvider`, fingerprint tracking, and SSE monitoring.
2. `src/components/Providers.tsx:21` runs `useSessionSSE` only for authenticated users.
3. `src/app/api/session/events/route.ts:22` opens a server-sent event stream for a valid session.
4. `src/lib/session-revocation.ts:15` writes `session_revoked:<token>` to Redis and `src/lib/session-revocation.ts:40` attempts same-instance SSE broadcast.
5. `src/middleware.ts:92` and `src/app/api/session/events/route.ts:59` detect revoked sessions through Redis.

**State Management:**
- Server data state is stored in MongoDB through Prisma models in `prisma/schema.prisma`.
- Cache, system mode, rate limiting, and session revocation state use Upstash Redis via `src/lib/redis.ts`, `src/lib/session-revocation.ts`, and `src/middleware.ts`.
- Browser state uses React hooks and contexts in `src/hooks`, `src/contexts/LanguageContext.tsx`, and `src/components/Providers.tsx`.
- Player state is encapsulated in player hooks under `src/hooks/player`.

## Key Abstractions

**Prisma Singleton:**
- Purpose: Provide one Prisma client per runtime instance and reuse it during development.
- Examples: `src/lib/prisma.ts`, `prisma/schema.prisma`.
- Pattern: Module-level singleton with `globalThis` cache in non-production.

**Auth Options:**
- Purpose: Centralize NextAuth provider, adapter, session, and callback configuration.
- Examples: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`.
- Pattern: Export `authOptions` once and import it in pages/routes that need `getServerSession`.

**API Route Handlers:**
- Purpose: Map HTTP methods directly to backend operations.
- Examples: `src/app/api/drm/token/route.ts`, `src/app/api/video/process/route.ts`, `src/app/api/admin/table-action/route.ts`.
- Pattern: Export `GET`, `POST`, `PATCH`, or `DELETE`; validate session/role first; parse request; query or mutate with Prisma; return `NextResponse`.

**Redis Cache Helpers:**
- Purpose: Hide optional Redis availability and provide `getCached`, `setCache`, and invalidation helpers.
- Examples: `src/lib/redis.ts`, `src/app/courses/page.tsx`.
- Pattern: Fetch-through cache with graceful fallback to source data.

**Session Revocation:**
- Purpose: Enforce single-device login and admin revocations.
- Examples: `src/lib/session-revocation.ts`, `src/app/api/session/events/route.ts`, `src/middleware.ts`.
- Pattern: Redis revocation flags plus best-effort in-memory SSE broadcast.

**Player Hook Bundle:**
- Purpose: Keep `Player` rendering thin while DRM, heartbeat, fullscreen, and black-screen detection live in focused hooks.
- Examples: `src/components/video/Player.tsx`, `src/hooks/player/useShakaPlayer.ts`, `src/hooks/player/usePlayerHeartbeat.ts`, `src/hooks/player/usePlayerFullscreen.ts`, `src/hooks/player/useBlackScreenDetector.ts`.
- Pattern: One hook per browser-side concern.

**Admin Data Hooks:**
- Purpose: Reuse admin fetching, filtering, and pagination across table-like admin screens.
- Examples: `src/hooks/admin/useAdminData.ts`, `src/hooks/admin/useAdminFilters.ts`, `src/hooks/admin/useTablePagination.ts`.
- Pattern: Client hook composes endpoint string, filters, transform callback, loading/error state, and refetch trigger.

## Entry Points

**Application Shell:**
- Location: `src/app/layout.tsx`
- Triggers: Every App Router page render.
- Responsibilities: Global metadata, fonts, theme, session/language providers, navigation, support button, toaster, system notices, Vercel analytics.

**Home Page:**
- Location: `src/app/page.tsx`
- Triggers: Browser request to `/`.
- Responsibilities: Landing/home experience and course prefetch behavior.

**Course Pages:**
- Location: `src/app/courses/page.tsx`, `src/app/courses/[courseId]/page.tsx`
- Triggers: Browser requests to `/courses` and `/courses/[courseId]`.
- Responsibilities: Session gating, course access lookup, enrollment-aware data loading, client rendering handoff.

**Watch Page:**
- Location: `src/app/watch/[videoId]/page.tsx`
- Triggers: Browser request to `/watch/[videoId]`.
- Responsibilities: Protected video access checks, view-limit checks, DRM token generation, player composition.

**Admin Pages:**
- Location: `src/app/admin/**/page.tsx`
- Triggers: Browser requests to `/admin/**`.
- Responsibilities: Admin dashboard and management screens.

**Meeting Page:**
- Location: `src/app/meeting/page.tsx`
- Triggers: Browser request to `/meeting`.
- Responsibilities: Authenticated Zoom meeting iframe initialization.

**API Routes:**
- Location: `src/app/api/**/route.ts`
- Triggers: HTTP requests from clients, webhooks, cron, and SDK flows.
- Responsibilities: Backend JSON/stream endpoints, authentication, role checks, persistence, external calls.

**Middleware:**
- Location: `src/middleware.ts`
- Triggers: Requests matched by `src/middleware.ts:120`.
- Responsibilities: System mode, rate limiting, protected-route cookie and revocation checks.

**Instrumentation:**
- Location: `instrumentation.ts`
- Triggers: Next.js instrumentation lifecycle.
- Responsibilities: Sentry registration by runtime.

**Scripts:**
- Location: `scripts/**`, `prisma/seed.ts`, `create-bulk-apis.js`
- Triggers: Manual or npm/tsx execution.
- Responsibilities: Data migration, verification, DRM packaging, setup checks.

## Architectural Constraints

- **Threading:** The app uses Next.js request/response execution and browser event loops. SSE in `src/app/api/session/events/route.ts` stores in-memory connection controllers per server instance; cross-instance delivery relies on Redis polling checks.
- **Global state:** `src/lib/prisma.ts` caches Prisma on `globalThis`; `src/lib/redis.ts` caches a Redis client; `src/lib/axinom-video-service.ts` caches an Axinom auth token; `src/app/api/session/events/route.ts` stores active SSE controllers and counts in module-level variables.
- **Circular imports:** `src/lib/session-revocation.ts:40` dynamically imports `@/app/api/session/events/route` to avoid a direct static dependency cycle between session utilities and the SSE route.
- **Server/client split:** Browser-only SDKs and hooks must stay in client components or dynamic imports. `src/hooks/player/useShakaPlayer.ts:33` dynamically imports Shaka Player, and files using hooks start with `'use client'`.
- **Path alias:** Use `@/*` imports for source-root paths according to `tsconfig.json:25`; relative imports are used within a small local component/hook folder.
- **Generated/vendor folders:** `public/zoom`, `public/lib/zoom`, and `zoom-webapp` contain copied or sample Zoom SDK assets. Application code should integrate through `src/app/meeting/page.tsx`, `src/app/api/zoom/signature/route.ts`, and `public/zoom-meeting.html`.
- **Database provider:** `prisma/schema.prisma:5` configures Prisma for MongoDB, so model IDs use `@db.ObjectId` and relation patterns must remain compatible with Prisma MongoDB constraints.

## Anti-Patterns

### Importing API Routes From Libraries

**What happens:** `src/lib/session-revocation.ts:40` imports `@/app/api/session/events/route` to broadcast revocations.
**Why it's wrong:** Route files are HTTP entry points; importing them from libraries couples reusable code to route-module state and only works for same-instance in-memory connections.
**Do this instead:** Keep reusable broadcast/session primitives outside route handlers, for example in `src/lib/session-revocation.ts` or a dedicated `src/lib/session-events.ts`, then have `src/app/api/session/events/route.ts` import that helper.

### Duplicating Access Checks Across Pages and APIs

**What happens:** Video access logic is implemented in both `src/app/watch/[videoId]/page.tsx:100` and `src/app/api/drm/token/route.ts:33`.
**Why it's wrong:** Permission rules can drift between page render and token issuance.
**Do this instead:** Put shared video entitlement checks in a helper under `src/lib`, then call it from the watch page and DRM route.

### Dynamic Prisma Model Access in Generic Routes

**What happens:** `src/app/api/admin/table-action/route.ts:22` uses `prisma[table]` with `@ts-ignore`.
**Why it's wrong:** It bypasses Prisma type safety and makes table-specific behavior hard to validate.
**Do this instead:** Use an explicit typed model map in the route or separate route modules for operations with different validation and side effects.

### Client Route Mismatch

**What happens:** `src/app/meeting/page.tsx:23` redirects unauthenticated users to `/login`, while the configured sign-in page is `src/lib/auth.ts:102` at `/auth/signin`.
**Why it's wrong:** New protected pages can point to paths that are not part of the App Router auth flow.
**Do this instead:** Use `/auth/signin` or `/api/auth/signin` consistently, matching `src/lib/auth.ts`.

## Error Handling

**Strategy:** Route handlers validate early and return HTTP status responses; page components redirect or call `notFound`; services throw for integration failures; most cache/Redis helpers fail open where availability should not block core flows.

**Patterns:**
- Use `return new NextResponse('Unauthorized', { status: 401 })` for unauthenticated route handlers, as in `src/app/api/drm/token/route.ts:9`.
- Use `NextResponse.json({ error }, { status })` for structured JSON API failures, as in `src/app/api/video/process/route.ts:20`.
- Use `redirect(...)` and `notFound()` in server components, as in `src/app/watch/[videoId]/page.tsx:24`.
- Log integration and mutation failures with `console.error`, then return `500`, as in `src/app/api/watch/heartbeat/route.ts:91`.
- Allow cache and Redis helpers to degrade gracefully where possible, as in `src/lib/redis.ts:58` and `src/middleware.ts:72`.

## Cross-Cutting Concerns

**Logging:** Console logging is used across route handlers and integrations; browser console capture is initialized by `src/components/ConsoleLoggerInit.tsx` and implemented in `src/lib/console-logger.ts`; Sentry is wired through `sentry.*.config.ts`, `instrumentation.ts`, `src/app/error.tsx`, and `src/app/global-error.tsx`.

**Validation:** Validation is mostly manual in route handlers using required-field checks and role/session checks. `zod` appears in `src/app/api/admin/config/mode/route.ts` for system mode validation.

**Authentication:** NextAuth with Google provider and Prisma database sessions is configured in `src/lib/auth.ts`. Whitelist gating is enforced in `src/lib/auth.ts:22`; role checks are repeated in admin and processing routes. Middleware performs coarse cookie presence checks and revocation checks before server-side session validation.

**Authorization:** User course/video access is represented by `Enrollment`, `VideoAccess`, course `accessType`, and per-video/per-watch view limits in `prisma/schema.prisma`.

**Caching:** `src/lib/redis.ts` provides optional fetch-through caching and invalidation. Middleware uses Upstash Redis directly for system mode and rate limiting.

**Security:** Session fingerprinting and SSE monitoring are wired through `src/components/Providers.tsx`; revocation lives in `src/lib/session-revocation.ts`; playback security includes watermarks, DRM tokening, screen recording detection, heartbeat, and black-screen fallback in `src/components/video/**`, `src/hooks/player/**`, and `src/lib/screen-recording-detection.ts`.

---

*Architecture analysis: 2026-05-05*
