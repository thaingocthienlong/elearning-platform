# Codebase Structure

**Analysis Date:** 2026-05-05

## Directory Layout

```text
secure-streaming-platform/
├── src/                         # Next.js application source
│   ├── app/                     # App Router pages, layouts, route handlers, errors
│   │   ├── admin/               # Admin dashboard pages
│   │   ├── api/                 # Backend route handlers
│   │   ├── auth/                # Sign-in page
│   │   ├── courses/             # Course list/detail pages
│   │   ├── meeting/             # Zoom meeting page and layout
│   │   └── watch/               # Secure video watch page
│   ├── components/              # React components grouped by domain
│   │   ├── admin/               # Admin widgets and charts
│   │   ├── course/              # Course and watch-page UI
│   │   ├── providers/           # Provider wrappers
│   │   ├── support/             # Ticket/report UI
│   │   ├── tour/                # Guided tour wrappers
│   │   ├── ui/                  # Reusable UI primitives
│   │   └── video/               # Player, watermark, and video security UI
│   ├── contexts/                # React contexts
│   ├── hooks/                   # Shared client hooks
│   │   ├── admin/               # Admin data/filter/pagination hooks
│   │   └── player/              # Player-specific hooks
│   ├── lib/                     # Server/client services, integrations, utilities
│   ├── server/                  # Server-side Axinom helper module
│   └── types/                   # Type augmentations and declarations
├── prisma/                      # Prisma schema, migrations, seed
├── public/                      # Public static assets and copied SDK bundles
│   ├── lib/zoom/                # Zoom Meeting SDK assets used by public page
│   ├── zoom/                    # Additional Zoom SDK asset copy
│   └── zoom-meeting.html        # Isolated Zoom meeting client shell
├── scripts/                     # Verification, migration, DRM packaging utilities
│   ├── db/                      # Database helper scripts
│   ├── drm/                     # DRM packaging scripts
│   └── packager/                # Packager support data
├── docs/                        # Project documentation and reports
│   ├── api/                     # API docs
│   ├── architecture/            # Architecture docs
│   └── business/                # Business rules
├── zoom-webapp/                 # Zoom sample app source/reference implementations
├── Shaka Packager Script/       # PowerShell packaging helper
├── .planning/                   # GSD planning and codebase mapping artifacts
├── package.json                 # npm scripts and dependencies
├── next.config.ts               # Next.js runtime/build configuration
├── tsconfig.json                # TypeScript and `@/*` alias configuration
├── tailwind.config.ts           # Tailwind theme/content configuration
├── eslint.config.mjs            # ESLint configuration
├── jest.setup.ts                # Jest test setup
├── instrumentation.ts           # Next/Sentry instrumentation
├── sentry.*.config.ts           # Sentry client/server/edge configuration
└── vercel.json                  # Vercel configuration
```

## Directory Purposes

**`src/app`:**
- Purpose: Owns routable application surfaces and HTTP endpoints.
- Contains: App Router `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `global-error.tsx`, and nested API `route.ts` files.
- Key files: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/courses/page.tsx`, `src/app/watch/[videoId]/page.tsx`, `src/app/meeting/page.tsx`, `src/app/api/auth/[...nextauth]/route.ts`.

**`src/app/api`:**
- Purpose: Backend surface for browser fetches, admin operations, DRM, uploads, sessions, support, cron, webhooks, and Zoom signature generation.
- Contains: One `route.ts` per API path, usually exporting HTTP method functions.
- Key files: `src/app/api/drm/token/route.ts`, `src/app/api/watch/heartbeat/route.ts`, `src/app/api/session/events/route.ts`, `src/app/api/video/process/route.ts`, `src/app/api/admin/table-action/route.ts`, `src/app/api/zoom/signature/route.ts`.

**`src/app/admin`:**
- Purpose: Admin dashboard and management pages.
- Contains: Page-level client and server components for analytics, videos, views, whitelist, tickets, session fingerprints, security events, DRM monitoring, and generic table management.
- Key files: `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/app/admin/[table]/page.tsx`, `src/app/admin/videos/page.tsx`.

**`src/app/courses`:**
- Purpose: Student course list and course detail pages.
- Contains: Dynamic server components and loading skeletons.
- Key files: `src/app/courses/page.tsx`, `src/app/courses/[courseId]/page.tsx`, `src/app/courses/loading.tsx`.

**`src/app/watch`:**
- Purpose: Secure video playback route.
- Contains: Dynamic server component and loading state.
- Key files: `src/app/watch/[videoId]/page.tsx`, `src/app/watch/[videoId]/loading.tsx`.

**`src/app/meeting`:**
- Purpose: Authenticated Zoom Meeting iframe host.
- Contains: Client page, meeting-specific layout, exit page, and vendor CSS.
- Key files: `src/app/meeting/page.tsx`, `src/app/meeting/layout.tsx`, `src/app/meeting/exit/page.tsx`, `src/app/meeting/zoom-vendor.css`.

**`src/components`:**
- Purpose: Shared React UI grouped by application domain.
- Contains: Top-level app widgets plus domain subfolders.
- Key files: `src/components/Providers.tsx`, `src/components/Navbar.tsx`, `src/components/UserMenu.tsx`, `src/components/SystemNotices.tsx`, `src/components/ConsoleLoggerInit.tsx`.

**`src/components/ui`:**
- Purpose: Reusable UI primitives.
- Contains: Button, card, input, table, dialog, select, checkbox, switch, skeleton, alert, badge, scroll area, loading and empty states.
- Key files: `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/table.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/ThemeToggle.tsx`.

**`src/components/course`:**
- Purpose: Course list/detail UI and watch-page client composition.
- Contains: Course cards, course detail/list clients, sidebar, chat log viewer, IPR consent overlay, watch page client.
- Key files: `src/components/course/WatchPageClient.tsx`, `src/components/course/CoursesListClient.tsx`, `src/components/course/CourseDetailClient.tsx`, `src/components/course/VideoSidebar.tsx`.

**`src/components/video`:**
- Purpose: Video playback UI and browser-side playback security.
- Contains: Player wrapper, DRM wrapper, watermark, screen recording detector, security wrapper, loading state.
- Key files: `src/components/video/Player.tsx`, `src/components/video/DRMPlayerWrapper.tsx`, `src/components/video/Watermark.tsx`, `src/components/video/SecurityWrapper.tsx`.

**`src/components/admin`:**
- Purpose: Admin reusable widgets and analytics visualizations.
- Contains: Generic table, create dialog, console logs viewer, chart components, analytics charts.
- Key files: `src/components/admin/GenericTable.tsx`, `src/components/admin/CreateDialog.tsx`, `src/components/admin/ViewsChart.tsx`, `src/components/admin/analytics/ErrorTrendsChart.tsx`.

**`src/components/support`:**
- Purpose: User support ticket submission and history UI.
- Contains: Report button, submit form, ticket history.
- Key files: `src/components/support/ReportButton.tsx`, `src/components/support/SubmitTicketForm.tsx`, `src/components/support/TicketHistory.tsx`.

**`src/hooks`:**
- Purpose: Reusable client-side behavior.
- Contains: Session validation/SSE/fingerprint hooks, prefetch hooks, admin hooks, player hooks.
- Key files: `src/hooks/useSessionSSE.ts`, `src/hooks/useSessionFingerprint.ts`, `src/hooks/usePrefetch.ts`, `src/hooks/admin/useAdminData.ts`, `src/hooks/player/useShakaPlayer.ts`.

**`src/contexts`:**
- Purpose: React context providers.
- Contains: Language context.
- Key files: `src/contexts/LanguageContext.tsx`.

**`src/lib`:**
- Purpose: Cross-cutting utilities, integration clients, and service helpers.
- Contains: Auth, Prisma, Redis, Axinom, storage, email, DRM detection, session revocation, console logger, translations, class-name helper.
- Key files: `src/lib/auth.ts`, `src/lib/prisma.ts`, `src/lib/redis.ts`, `src/lib/session-revocation.ts`, `src/lib/axinom.ts`, `src/lib/axinom-video-service.ts`, `src/lib/azure-storage.ts`, `src/lib/r2.ts`.

**`src/server`:**
- Purpose: Server-only Axinom encoding/storage helper module.
- Contains: JWT, key-protection, Azure URI, job creation, polling, and KSM validation helpers.
- Key files: `src/server/axinom.ts`.

**`src/types`:**
- Purpose: Global type augmentation and declarations.
- Contains: NextAuth session/user type extension, Shaka Player declarations, shared type index.
- Key files: `src/types/next-auth.d.ts`, `src/types/shaka-player.d.ts`, `src/types/index.ts`.

**`prisma`:**
- Purpose: Data model and database lifecycle.
- Contains: Prisma schema, migrations, seed script.
- Key files: `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/migrations/migration_lock.toml`.

**`public`:**
- Purpose: Static files served by Next.js.
- Contains: SVGs, Zoom client pages/assets, SDK bundles, WASM/audio/font/image assets.
- Key files: `public/zoom-meeting.html`, `public/zoom-client-view/index.html`, `public/lib/zoom/zoom-meeting-5.0.4.min.js`, `public/lib/zoom/css/zoom-patch.css`.

**`scripts`:**
- Purpose: Operational and setup scripts outside the web runtime.
- Contains: Azure verification, Axinom verification, auth sync verification, data migration, CORS fix, DRM packaging, database upsert scripts.
- Key files: `scripts/verify-azure-storage.ts`, `scripts/verify-axinom-setup.ts`, `scripts/migrate-data.ts`, `scripts/drm/package-dash.mjs`, `scripts/db/upsert-keystore.mjs`.

**`docs`:**
- Purpose: Human-readable project documentation.
- Contains: Architecture notes, API endpoints, business rules, fix plans, reports, optimization notes.
- Key files: `docs/architecture/system_overview.md`, `docs/api/endpoints.md`, `docs/business/rules.md`.

**`zoom-webapp`:**
- Purpose: Zoom Meeting SDK sample/reference implementations.
- Contains: CDN, Local, Components, and auth endpoint sample folders.
- Key files: `zoom-webapp/README.md`, `zoom-webapp/Components/src/index.tsx`, `zoom-webapp/CDN/index.html`, `zoom-webapp/Local/index.html`.

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Global App Router layout and providers.
- `src/app/page.tsx`: Home page.
- `src/app/courses/page.tsx`: Course list route.
- `src/app/courses/[courseId]/page.tsx`: Course detail route.
- `src/app/watch/[videoId]/page.tsx`: Protected watch route.
- `src/app/admin/page.tsx`: Admin dashboard.
- `src/app/admin/[table]/page.tsx`: Generic admin table route.
- `src/app/meeting/page.tsx`: Zoom meeting route.
- `src/middleware.ts`: Request middleware.
- `instrumentation.ts`: Runtime instrumentation.

**Configuration:**
- `package.json`: npm scripts, app dependencies, Prisma seed command.
- `package-lock.json`: npm lockfile.
- `next.config.ts`: React strict mode setting, Prisma server external packages, remote image patterns, Zoom COOP/COEP headers.
- `tsconfig.json`: TypeScript strictness, JSX mode, Next plugin, `@/*` alias, `zoom-webapp` exclusion.
- `tailwind.config.ts`: Tailwind design tokens and content paths.
- `postcss.config.mjs`: PostCSS/Tailwind processing.
- `eslint.config.mjs`: ESLint configuration.
- `.prettierrc`: Prettier configuration.
- `components.json`: shadcn/ui component configuration.
- `vercel.json`: Vercel deployment configuration.
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`: Sentry configuration.
- `.env`-style files at repo root: environment configuration exists; contents must not be read or copied.

**Core Logic:**
- `src/lib/auth.ts`: NextAuth and whitelist login rules.
- `src/lib/prisma.ts`: Prisma client singleton.
- `prisma/schema.prisma`: Database models and indexes.
- `src/lib/redis.ts`: Redis cache helpers.
- `src/lib/session-revocation.ts`: Session revocation utilities.
- `src/app/api/session/events/route.ts`: SSE session event stream.
- `src/lib/axinom.ts`: Axinom DRM token generation.
- `src/lib/axinom-video-service.ts`: Axinom Video Service GraphQL integration.
- `src/lib/axinom-encoding.ts`: Axinom encoding job status/client helpers.
- `src/lib/axinom-sync.ts`: Axinom video sync helper.
- `src/lib/azure-storage.ts`: Azure Blob storage helper.
- `src/lib/r2.ts`: R2/S3 client configuration.
- `src/lib/drm-detection.ts`: Browser DRM capability detection.
- `src/lib/screen-recording-detection.ts`: Browser screen recording detection.
- `src/lib/console-logger.ts`: Browser console capture for support tickets.

**API Routes:**
- `src/app/api/auth/[...nextauth]/route.ts`: NextAuth handler.
- `src/app/api/courses/route.ts`: Course list API.
- `src/app/api/courses/[courseId]/route.ts`: Course detail API.
- `src/app/api/drm/token/route.ts`: DRM token endpoint.
- `src/app/api/drm/license/route.ts`: DRM license proxy/endpoint.
- `src/app/api/drm/fairplay-cert/route.ts`: FairPlay certificate endpoint.
- `src/app/api/hls/playlist/[videoId]/route.ts`: HLS playlist route.
- `src/app/api/watch/heartbeat/route.ts`: Watch progress and view count route.
- `src/app/api/video/process/route.ts`: Admin video processing/encoding route.
- `src/app/api/video/status/route.ts`: Video encoding status route.
- `src/app/api/video/sync/route.ts`: Axinom sync route.
- `src/app/api/upload/presigned/route.ts`: Upload URL route.
- `src/app/api/support/ticket/route.ts`: Support ticket create/list route.
- `src/app/api/security/report/route.ts`: Security event reporting.
- `src/app/api/webhook/axinom/route.ts`: Axinom webhook receiver.
- `src/app/api/cron/check-videos/route.ts`: Scheduled video checks.
- `src/app/api/zoom/signature/route.ts`: Zoom Meeting SDK signature route.

**Admin API Routes:**
- `src/app/api/admin/stats/route.ts`: Dashboard stats.
- `src/app/api/admin/analytics/route.ts`: Analytics data.
- `src/app/api/admin/error-analytics/route.ts`: Error analytics.
- `src/app/api/admin/users/route.ts`: User admin data.
- `src/app/api/admin/courses/route.ts`: Course admin data.
- `src/app/api/admin/courses/[courseId]/route.ts`: Course admin updates.
- `src/app/api/admin/videos/route.ts`: Video admin data.
- `src/app/api/admin/videos/all/route.ts`: All videos endpoint.
- `src/app/api/admin/videos/chat/route.ts`: Video chat metadata endpoint.
- `src/app/api/admin/views/route.ts`: View/watch records management.
- `src/app/api/admin/whitelist/route.ts`: Whitelist management.
- `src/app/api/admin/whitelist/bulk/route.ts`: Bulk whitelist import.
- `src/app/api/admin/tickets/route.ts`: Ticket admin updates.
- `src/app/api/admin/table-action/route.ts`: Generic soft-delete/restore.
- `src/app/api/admin/create/route.ts`: Generic create endpoint.
- `src/app/api/admin/options/route.ts`: Admin select options.
- `src/app/api/admin/watermark-settings/route.ts`: Watermark settings admin.
- `src/app/api/admin/user-permissions/route.ts`: User permission management.
- `src/app/api/admin/session-fingerprints/route.ts`: Session fingerprint list.
- `src/app/api/admin/security-events/route.ts`: Security event list/delete.

**Testing:**
- `jest.setup.ts`: Jest setup file.
- No colocated `*.test.*` or `*.spec.*` source files are present in the scanned source tree.

## Naming Conventions

**Files:**
- App Router files use framework names: `page.tsx`, `layout.tsx`, `loading.tsx`, `route.ts`, `error.tsx`, `global-error.tsx`, `not-found.tsx`.
- Dynamic route folders use bracket syntax: `src/app/watch/[videoId]`, `src/app/courses/[courseId]`, `src/app/admin/[table]`, `src/app/api/auth/[...nextauth]`.
- React component files use PascalCase: `src/components/course/CourseCard.tsx`, `src/components/video/DRMPlayerWrapper.tsx`, `src/components/admin/GenericTable.tsx`.
- UI primitive files use lowercase or kebab-case: `src/components/ui/button.tsx`, `src/components/ui/dropdown-menu.tsx`, `src/components/ui/scroll-area.tsx`.
- Hook files start with `use`: `src/hooks/usePrefetch.ts`, `src/hooks/admin/useAdminData.ts`, `src/hooks/player/useShakaPlayer.ts`.
- Service/helper files in `src/lib` use kebab-case for multiword modules: `src/lib/session-revocation.ts`, `src/lib/axinom-video-service.ts`, `src/lib/screen-recording-detection.ts`.
- Type declaration files use `.d.ts`: `src/types/next-auth.d.ts`, `src/types/shaka-player.d.ts`.
- Operational scripts use `.ts` for TypeScript scripts and `.mjs` for Node ESM scripts: `scripts/verify-auth-sync.ts`, `scripts/drm/package-hls.mjs`.

**Directories:**
- Feature route directories mirror URLs under `src/app`: `src/app/courses`, `src/app/watch`, `src/app/admin`, `src/app/api/drm`.
- Domain component directories group reusable UI by area: `src/components/course`, `src/components/video`, `src/components/admin`, `src/components/support`.
- Hook subdirectories group hooks by functional area: `src/hooks/admin`, `src/hooks/player`.
- Vendor/static SDK trees stay under `public` or `zoom-webapp`, not under `src`.

## Where to Add New Code

**New Page or Route Segment:**
- Primary code: `src/app/<route>/page.tsx`
- Layout for the route subtree: `src/app/<route>/layout.tsx`
- Loading UI: `src/app/<route>/loading.tsx`
- Error UI: `src/app/<route>/error.tsx`
- Shared client UI: `src/components/<domain>/`

**New API Endpoint:**
- Primary code: `src/app/api/<domain>/<operation>/route.ts`
- Shared server logic: `src/lib/<domain>.ts`
- Auth pattern: import `getServerSession` and `authOptions` from `next-auth` and `@/lib/auth`, then validate session/role before side effects.
- Response pattern: use `NextResponse.json(...)` for JSON and `new NextResponse(message, { status })` for simple status failures.

**New Admin Page:**
- Primary code: `src/app/admin/<feature>/page.tsx`
- API route: `src/app/api/admin/<feature>/route.ts`
- Shared admin UI: `src/components/admin/`
- Shared hooks: `src/hooks/admin/useAdminData.ts`, `src/hooks/admin/useAdminFilters.ts`, `src/hooks/admin/useTablePagination.ts`

**New Student Course/Watch Feature:**
- Course page logic: `src/app/courses` or `src/components/course`
- Watch-page server checks: `src/app/watch/[videoId]/page.tsx`
- Player/browser logic: `src/components/video` and `src/hooks/player`
- Shared access or entitlement logic: add a helper in `src/lib` and import it from both pages and API routes.

**New Integration:**
- Server/client helper: `src/lib/<service-name>.ts`
- API surface: `src/app/api/<service-name>/route.ts` or a domain-specific API folder.
- Verification script: `scripts/verify-<service-name>-setup.ts`
- Environment values: use env vars; do not hard-code secrets in source or docs.

**New Database Model or Field:**
- Schema: `prisma/schema.prisma`
- Migration: `prisma/migrations/<timestamp>_<name>/migration.sql` when using migration workflow.
- Data seed/update: `prisma/seed.ts` or `scripts/db/`
- Access helper: keep generic Prisma client in `src/lib/prisma.ts`; add domain logic in a separate `src/lib/<domain>.ts` helper when reused.

**New UI Primitive:**
- Implementation: `src/components/ui/<primitive>.tsx`
- Shared class merging: use `cn` from `src/lib/utils.ts`.
- Domain-specific components should not go in `src/components/ui`; place them in `src/components/<domain>`.

**New Utility:**
- Shared app helper: `src/lib/<name>.ts`
- Client hook: `src/hooks/use<Name>.ts` or `src/hooks/<domain>/use<Name>.ts`
- React context: `src/contexts/<Name>Context.tsx`
- Global type augmentation: `src/types/<package-or-domain>.d.ts`

**New Script:**
- Verification or setup: `scripts/verify-<thing>.ts`
- DRM packaging: `scripts/drm/<name>.mjs`
- Database operation: `scripts/db/<name>.mjs`
- Use `tsx` for TypeScript scripts, matching `package.json` dev dependencies.

## Special Directories

**`public/lib/zoom`:**
- Purpose: Static Zoom Meeting SDK bundle, fonts, images, audio, WASM, CSS, and patched UI assets used by the isolated meeting page.
- Generated: Yes, copied/vendor assets.
- Committed: Yes.

**`public/zoom`:**
- Purpose: Additional Zoom SDK asset copy.
- Generated: Yes, copied/vendor assets.
- Committed: Yes.

**`public/zoom-client-view`:**
- Purpose: Static Zoom client-view sample assets.
- Generated: Yes, copied/sample assets.
- Committed: Yes.

**`zoom-webapp`:**
- Purpose: Zoom sample app source/reference implementations separate from the main Next.js app.
- Generated: No, vendor/sample source.
- Committed: Yes.

**`prisma/migrations`:**
- Purpose: Database migration history.
- Generated: Yes, by Prisma migration workflow.
- Committed: Yes.

**`.planning`:**
- Purpose: GSD workflow state, codebase maps, plans, and project artifacts.
- Generated: Yes, by GSD commands and mapper agents.
- Committed: Project-dependent; do not modify other mapper files while mapping one focus area.

**`archive`:**
- Purpose: Archived project artifacts.
- Generated: Project workflow output.
- Committed: Present in repo; excluded from architecture scan unless directly relevant.

**`Shaka Packager Script`:**
- Purpose: PowerShell helper for Shaka Packager with Axinom key service.
- Generated: No.
- Committed: Yes.

**Root media and DRM sample files:**
- Purpose: Local sample media and packaging inputs/outputs, such as `source.mp4`, `hd.mp4`, `sd.mp4`, `audio.mp4`, `KIDs.json`, `job.json`, `payload.json`, `wv_pssh.hex`.
- Generated: Mixed operational/sample artifacts.
- Committed: Present in repo.

**Root env-like files:**
- Purpose: Environment configuration files, including `.env`-style and `packager.env`-style files.
- Generated: No.
- Committed: Present in repo.
- Note: Contents must not be read, quoted, copied, or documented.

---

*Structure analysis: 2026-05-05*
