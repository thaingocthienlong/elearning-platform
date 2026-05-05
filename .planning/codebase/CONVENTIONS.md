# Coding Conventions

**Analysis Date:** 2026-05-05

## Naming Patterns

**Files:**
- Use Next.js App Router route names under `src/app/**`: `page.tsx`, `layout.tsx`, `loading.tsx`, and `route.ts` as shown in `src/app/courses/page.tsx`, `src/app/watch/[videoId]/page.tsx`, and `src/app/api/admin/whitelist/route.ts`.
- Use PascalCase for React component files outside shadcn primitives: `src/components/course/CourseCard.tsx`, `src/components/video/DRMPlayerWrapper.tsx`, `src/components/support/SubmitTicketForm.tsx`.
- Use kebab-case for shadcn UI primitive files: `src/components/ui/dropdown-menu.tsx`, `src/components/ui/scroll-area.tsx`, `src/components/ui/textarea.tsx`.
- Use camelCase with `use` prefix for hooks: `src/hooks/useSessionSSE.ts`, `src/hooks/admin/useAdminData.ts`, `src/hooks/player/useShakaPlayer.ts`.
- Use lower camel-case service/helper modules under `src/lib`: `src/lib/session-revocation.ts`, `src/lib/console-logger.ts`, `src/lib/drm-detection.ts`.

**Functions:**
- React components use PascalCase exported functions, usually default exports for page/component entry files: `WhitelistPage` in `src/app/admin/whitelist/page.tsx`, `CourseCard` in `src/components/course/CourseCard.tsx`.
- Hooks use named `useX` exports and return object-shaped state/actions: `useAdminData` in `src/hooks/admin/useAdminData.ts`, `useShakaPlayer` in `src/hooks/player/useShakaPlayer.ts`.
- App Router handlers use named HTTP method exports: `GET`, `POST`, `DELETE` in `src/app/api/admin/whitelist/route.ts`.
- Library functions use camelCase named exports: `generateAxinomToken` in `src/lib/axinom.ts`, `syncVideoWithAxinom` in `src/lib/axinom-sync.ts`, `detectDRMCapabilities` in `src/lib/drm-detection.ts`.

**Variables:**
- Component state follows `[value, setValue]` naming: `dialogOpen/setDialogOpen`, `submitting/setSubmitting`, and `deletingId/setDeletingId` in `src/app/admin/whitelist/page.tsx`.
- Module-level constants use SCREAMING_SNAKE_CASE for fixed configuration: `RATE_LIMIT_WINDOW` in `src/app/api/support/ticket/route.ts`, `AXINOM_AUTH_URL` in `src/lib/axinom-encoding.ts`.
- Environment-derived constants are read at module scope for integration clients: `accountName` and `accountKey` in `src/lib/azure-storage.ts`, `CLIENT_ID` and `CLIENT_SECRET` in `src/lib/axinom-encoding.ts`.
- Prefer `unknown` for caught errors and narrow with `instanceof Error`: `src/app/api/admin/whitelist/route.ts`, `src/lib/redis.ts`.

**Types:**
- Use PascalCase interfaces/types for props and API shapes: `CourseCardProps` in `src/components/course/CourseCard.tsx`, `UseAdminDataOptions<T>` in `src/hooks/admin/useAdminData.ts`, `DRMConfig` in `src/lib/drm-detection.ts`.
- Shared application response/table types live in `src/types/index.ts`.
- Module augmentation declarations live in `src/types/next-auth.d.ts` and `src/types/shaka-player.d.ts`.
- `any` is tolerated for dynamic Prisma access, browser experimental APIs, Zoom/Shaka SDK gaps, and generic table data; keep it isolated to files such as `src/app/api/admin/create/route.ts`, `src/types/shaka-player.d.ts`, and `src/hooks/player/useShakaPlayer.ts`.

## Code Style

**Formatting:**
- Root formatting is Prettier 3 configured in `.prettierrc`.
- Use semicolons, single quotes, 2-space tab width, and ES5 trailing commas in main app files.
- Tailwind classes are sorted through `prettier-plugin-tailwindcss`; apply it to class-heavy files such as `src/components/ui/button.tsx` and `src/app/admin/whitelist/page.tsx`.
- Generated shadcn files currently contain double quotes and no semicolons in places (`src/components/ui/button.tsx`, `src/lib/utils.ts`). Preserve local style inside shadcn primitives unless making broad formatting-only changes.
- The Zoom component demo uses separate Prettier settings in `zoom-webapp/Components/.prettierrc`: double quotes and no trailing commas.

**Linting:**
- Root lint command is `npm run lint`, which runs `eslint` from `package.json`.
- Root ESLint is flat config in `eslint.config.mjs`, extending `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- Root lint warnings allow unused parameters prefixed with `_`: `@typescript-eslint/no-unused-vars` has `argsIgnorePattern: "^_"` in `eslint.config.mjs`.
- Root lint disables `react/no-unescaped-entities` in `eslint.config.mjs`.
- The Zoom component demo has its own ESLint/stylelint stack in `zoom-webapp/Components/.eslintrc.cjs` and `zoom-webapp/Components/.stylelintrc.json`; run its scripts from `zoom-webapp/Components/package.json`.

## Import Organization

**Order:**
1. Framework and package imports first: `next-auth`, `next/server`, `react`, `lucide-react`, Radix packages.
2. Internal alias imports next: `@/lib/prisma`, `@/components/ui/button`, `@/hooks/admin/useAdminData`.
3. Relative imports for nearby modules: `./Watermark` in `src/components/video/Player.tsx`, `./CreateDialog` in `src/components/admin/GenericTable.tsx`.
4. Side-effect imports remain near the top when required by the module: `'use client'` directives and `import 'shaka-player/dist/controls.css'` in `src/components/video/Player.tsx`.

**Path Aliases:**
- Use `@/*` for root app imports, mapped to `./src/*` in `tsconfig.json`.
- shadcn aliases are defined in `components.json`: `@/components`, `@/components/ui`, `@/lib`, `@/hooks`, and `@/lib/utils`.
- Prefer aliases for cross-directory imports in `src/**`; use relative imports only for sibling modules.

## Error Handling

**Patterns:**
- API route handlers return `NextResponse` with explicit status codes for validation, authorization, conflicts, and server errors: `src/app/api/admin/whitelist/route.ts`, `src/app/api/support/ticket/route.ts`.
- Wrap write-heavy API handlers in `try/catch`; log the internal error and return a generic 500 response to clients: `src/app/api/admin/whitelist/route.ts`.
- Check authentication and admin authorization before executing privileged queries: `src/app/api/admin/whitelist/route.ts`, `src/app/api/admin/users/route.ts`, `src/app/api/admin/videos/route.ts`.
- Use Prisma error code checks for expected conflicts, especially `P2002` duplicate handling in `src/app/api/admin/whitelist/route.ts` and `src/app/api/admin/whitelist/bulk/route.ts`.
- Integration libraries throw `Error` for unrecoverable setup/API failures: `src/lib/axinom-encoding.ts`, `src/lib/axinom-video-service.ts`, `src/server/axinom.ts`.
- Client components catch fetch/action failures, log to console, and show `sonner` toasts when user-facing feedback is needed: `src/app/admin/whitelist/page.tsx`, `src/components/admin/CreateDialog.tsx`, `src/hooks/player/useShakaPlayer.ts`.
- Middleware fails open for Redis/rate-limit availability errors while logging them: `src/middleware.ts`.

## Logging

**Framework:** console plus Sentry configuration files.

**Patterns:**
- Use `console.error` for server/API failures and integration failures: `src/app/api/support/ticket/route.ts`, `src/lib/redis.ts`, `src/middleware.ts`.
- Use `console.warn` for degraded behavior or fallback paths: `src/lib/drm-detection.ts`, `src/hooks/player/useShakaPlayer.ts`, `src/lib/email.ts`.
- Use `console.log` for verification scripts and diagnostic flows, not for routine UI rendering: `scripts/verify-auth-sync.ts`, `scripts/verify-azure-storage.ts`, `scripts/verify-axinom-setup.ts`.
- Browser console capture is centralized in `src/lib/console-logger.ts` and initialized through `src/components/ConsoleLoggerInit.tsx`.
- Sentry is configured through `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and `instrumentation.ts`; prefer Sentry for production exception capture when adding cross-cutting observability.

## Comments

**When to Comment:**
- Comment operational tradeoffs and temporary workarounds: rate-limit storage in `src/app/api/support/ticket/route.ts`, session/fail-open behavior in `src/middleware.ts`, Prisma connection reuse in `src/lib/prisma.ts`.
- Comment non-obvious browser/DRM behavior: `src/lib/drm-detection.ts`, `src/hooks/player/useShakaPlayer.ts`, `src/hooks/player/usePlayerFullscreen.ts`.
- Avoid keeping stale refactor notes inside implementation files; `src/app/admin/whitelist/page.tsx` contains removed-state comments that should not be copied into new code.

**JSDoc/TSDoc:**
- Not established. Types are expressed through TypeScript interfaces and function signatures rather than JSDoc.
- Add JSDoc only for exported functions with non-obvious integration semantics; otherwise follow the concise inline comment style used in `src/middleware.ts` and `src/lib/prisma.ts`.

## Function Design

**Size:** Keep hooks and handlers focused on one workflow. Existing large pages such as `src/app/admin/user-permissions/page.tsx`, `src/app/admin/videos/page.tsx`, and `src/app/admin/whitelist/page.tsx` contain many local handlers; new admin behavior should move reusable fetch/filter/pagination logic into hooks like `src/hooks/admin/useAdminData.ts`, `src/hooks/admin/useAdminFilters.ts`, and `src/hooks/admin/useTablePagination.ts`.

**Parameters:** Prefer object parameters for hooks and integration helpers with multiple options: `UseAdminDataOptions<T>` in `src/hooks/admin/useAdminData.ts`, `UseShakaPlayerProps` in `src/hooks/player/useShakaPlayer.ts`, `EncodeVideoOptions` in `src/lib/axinom-video-service.ts`.

**Return Values:** Hooks return named objects, not tuples, when returning multiple values/actions: `src/hooks/admin/useAdminData.ts`, `src/hooks/player/useShakaPlayer.ts`, `src/hooks/player/usePlayerFullscreen.ts`.

## Module Design

**Exports:**
- API route files export only HTTP methods and route-local helpers: `src/app/api/admin/whitelist/route.ts`, `src/app/api/support/ticket/route.ts`.
- Shared libraries use named exports: `src/lib/redis.ts`, `src/lib/session-revocation.ts`, `src/lib/axinom-sync.ts`.
- Page files use default exports as required by Next.js: `src/app/page.tsx`, `src/app/courses/page.tsx`, `src/app/admin/whitelist/page.tsx`.
- shadcn UI primitives export the component and variants where applicable: `Button` and `buttonVariants` in `src/components/ui/button.tsx`.

**Barrel Files:**
- No broad barrel-file pattern is established for components or lib modules.
- `src/types/index.ts` acts as a shared type barrel for generic response/table/player types.
- Import concrete modules directly instead of adding new component barrels.

---

*Convention analysis: 2026-05-05*
