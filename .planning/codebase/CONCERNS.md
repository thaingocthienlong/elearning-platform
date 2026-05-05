# Codebase Concerns

**Analysis Date:** 2026-05-05

## Tech Debt

**Missing direct dependency for upload validation:**
- Issue: `src/app/api/upload/presigned/route.ts` imports `zod`, but `package.json` does not list `zod` and `npm ls zod --depth=0` reports no direct install.
- Files: `src/app/api/upload/presigned/route.ts`, `package.json`, `package-lock.json`
- Impact: Builds or deployments can fail with module resolution errors when the transitive packages that mention `zod` do not expose it to the app.
- Fix approach: Add `zod` to `dependencies` or replace the route schema with an installed validation utility. Keep validation at the route boundary.

**DRM license endpoint is a stub:**
- Issue: `src/app/api/drm/license/route.ts` validates the session and then returns `keys: []`; comments state encrypted keys are not stored and real decryption is skipped.
- Files: `src/app/api/drm/license/route.ts`, `src/lib/kms.ts`, `prisma/schema.prisma`
- Impact: Any playback path depending on this local license API cannot issue content keys. Future maintainers may assume DRM is complete because auth and KMS helpers exist.
- Fix approach: Add a key storage model or fields for encrypted content keys, persist key material during packaging, and return only keys entitled for the authenticated user.

**Axinom IDs are stored in `Video.description`:**
- Issue: Encoding jobs write `description: axinom-id:<id>` and sync/webhook code parses or searches that free-text field.
- Files: `src/app/api/video/process/route.ts`, `src/lib/axinom-sync.ts`, `src/app/api/webhook/axinom/route.ts`, `prisma/schema.prisma`
- Impact: User-facing descriptions and operational identifiers are coupled. Editing a description can break sync, and `contains` lookups can match the wrong video.
- Fix approach: Add explicit `axinomIdDrm` and status fields to `Video`; migrate existing `description` values; make sync/webhook lookups use exact indexed fields.

**Dynamic admin CRUD bypasses type safety:**
- Issue: Generic admin routes use dynamic Prisma access with `@ts-ignore` and `any`.
- Files: `src/app/api/admin/create/route.ts`, `src/app/api/admin/table-action/route.ts`, `src/app/admin/[table]/page.tsx`
- Impact: Table-specific schema mismatches surface at runtime. The generic delete route attempts `isDeleted` updates for models that do not all have that field.
- Fix approach: Use a typed table registry with per-model create/update/delete handlers and explicit field allowlists.

**Large page components concentrate too many responsibilities:**
- Issue: Several client/admin pages exceed 300-600 lines and mix data fetching, filtering, form state, rendering, and mutation flows.
- Files: `src/app/admin/user-permissions/page.tsx`, `src/app/admin/whitelist/page.tsx`, `src/app/admin/videos/page.tsx`, `src/app/admin/analytics/page.tsx`, `src/app/admin/watermark-settings/page.tsx`, `src/components/admin/CreateDialog.tsx`
- Impact: Changes to admin workflows are hard to review and easy to regress because behavior is not isolated behind focused components or hooks.
- Fix approach: Extract table/query state to hooks, split forms into focused components, and keep route pages as composition shells.

**Committed vendor and generated assets:**
- Issue: The repository includes duplicated Zoom SDK bundles and a nested `scripts/packager/node_modules` tree.
- Files: `public/zoom/**`, `public/lib/zoom/**`, `zoom-webapp/**`, `scripts/packager/node_modules/**`
- Impact: Repo size and scan time grow sharply. Security updates for vendored JavaScript/WASM are manual and duplicate files can drift.
- Fix approach: Keep a single vetted Zoom SDK asset source, document its version, exclude nested package installs, and regenerate/vendor assets through a script.

**Production logging uses raw `console`:**
- Issue: Many server and client paths log operational details with `console.log`, including tokens prefixes, profile IDs, emails, session revocation events, and ticket metadata.
- Files: `src/lib/axinom.ts`, `src/lib/email.ts`, `src/lib/session-revocation.ts`, `src/app/api/video/process/route.ts`, `src/app/api/support/ticket/route.ts`, `src/hooks/useSessionSSE.ts`, `src/components/video/DRMPlayerWrapper.tsx`
- Impact: Logs can leak personal or operational details and are hard to filter by severity, request, or user.
- Fix approach: Introduce a structured logger with redaction rules and environment-gated debug logs. Avoid logging env-derived IDs and user identifiers unless needed for audit trails.

## Known Bugs

**Generic delete/restore fails for tickets:**
- Symptoms: Admin table action can accept `table: "ticket"` but then updates `isDeleted`, a field absent from `Ticket`.
- Files: `src/app/api/admin/table-action/route.ts`, `prisma/schema.prisma`
- Trigger: POST `/api/admin/table-action` with `{ "table": "ticket", "action": "delete", "ids": [...] }`.
- Workaround: Use ticket-specific status workflows instead of the generic table action for tickets.

**HLS playlist endpoint does not enforce entitlements:**
- Symptoms: Authenticated users can request a playlist for any `videoId` with `hlsUrl`; the entitlement check is only a comment.
- Files: `src/app/api/hls/playlist/[videoId]/route.ts`, `src/app/watch/[videoId]/page.tsx`, `src/app/api/drm/token/route.ts`
- Trigger: Sign in as any user and call `/api/hls/playlist/<videoId>` for a video outside that user's enrollment/access.
- Workaround: Keep HLS URLs private and route playback through the watch page until the API performs the same enrollment, video access, time-window, and open-course checks.

**DRM token route ignores time-based access windows:**
- Symptoms: `src/app/api/drm/token/route.ts` checks enrollment and `videoAccess` existence, but not `expiresAt`, `validFrom`, or `validUntil`.
- Files: `src/app/api/drm/token/route.ts`, `src/app/watch/[videoId]/page.tsx`, `prisma/schema.prisma`
- Trigger: A user with expired or not-yet-valid `VideoAccess` can request a DRM token directly even though the watch page redirects them.
- Workaround: Keep token requests coupled to the watch page until route-level time-window checks are added.

**Session activity updates the most recent fingerprinted session, not necessarily the current cookie session:**
- Symptoms: PATCH `/api/session/fingerprint` selects the user's latest fingerprinted session by expiry instead of looking up the current `sessionToken`.
- Files: `src/app/api/session/fingerprint/route.ts`
- Trigger: A user has multiple active sessions with fingerprints and the browser calls the activity endpoint.
- Workaround: Use POST fingerprint registration for current-session updates; avoid relying on PATCH for accurate per-device activity until it reads the cookie token.

**Webhook signature verification can throw on malformed signatures:**
- Symptoms: `crypto.timingSafeEqual` is called without checking buffer length first.
- Files: `src/app/api/webhook/axinom/route.ts`
- Trigger: POST `/api/webhook/axinom` with an `x-mosaic-signature` value whose byte length differs from the expected HMAC hex length.
- Workaround: Upstream retries may recover from transient 500s, but invalid signatures should return 403 consistently.

## Security Considerations

**Secret-like files and keys are present in the repo:**
- Risk: Environment files, DRM key material, private localhost keys, and media/key artifacts exist in the workspace even though `.gitignore` marks many as sensitive. Contents were not read during this audit.
- Files: `mosaic-service-account-config.env`, `mosaic-service-account-config (1).env`, `mosaic-service-account-config (2).env`, `packager.env`, `keys.json`, `KIDs.json`, `job.json`, `keys.cpix.xml`, `cert.der.b64`, `wv_pssh.hex`, `scripts/keystore.json`, `scripts/packager/keystore.json`, `zoom-webapp/CDN/localhost.key`, `zoom-webapp/Local/localhost.key`, `.gitignore`
- Current mitigation: `.gitignore` contains patterns for `.env*`, `mosaic-service-account-config*.env`, key JSON files, media, and DRM artifacts.
- Recommendations: Remove sensitive artifacts from git history if committed, rotate affected credentials/keys, store examples as `.example` placeholders, and enforce secret scanning in CI.

**Support ticket endpoint accepts spoofable email and client-supplied diagnostics:**
- Risk: The POST route links a ticket to `session.user.id` but trusts the submitted `email` for whitelist checks and storage; logged-in users can submit tickets under another whitelisted email. It also stores client-supplied console logs and browser info.
- Files: `src/app/api/support/ticket/route.ts`, `src/components/support/SubmitTicketForm.tsx`, `src/lib/console-logger.ts`, `src/components/admin/ConsoleLogsViewer.tsx`
- Current mitigation: Email format validation, whitelist lookup, reCAPTCHA for non-tablet clients, React text rendering in the admin viewer, and basic log sanitization.
- Recommendations: For authenticated users, derive email from the session and reject mismatches. Cap `description`, `consoleLogs`, and `browserInfo` payload sizes; sanitize nested sensitive fields recursively before persistence.

**Support rate limiting is process-local and bypassable:**
- Risk: `rateLimitStore` is an in-memory `Map`, so limits reset on serverless cold starts and do not apply across instances. The tablet/iPad path bypasses reCAPTCHA based on user-agent.
- Files: `src/app/api/support/ticket/route.ts`, `src/components/support/SubmitTicketForm.tsx`
- Current mitigation: Middleware rate limiting applies to non-skipped API routes when Upstash Redis works.
- Recommendations: Move ticket-specific rate limiting to Redis using email, IP, and session keys. Remove or narrowly scope the tablet bypass and avoid default reCAPTCHA test keys in production.

**Authentication account linking is intentionally dangerous:**
- Risk: Google provider sets `allowDangerousEmailAccountLinking: true`.
- Files: `src/lib/auth.ts`
- Current mitigation: Sign-in requires whitelisted email and soft-deleted users are blocked unless re-whitelisted.
- Recommendations: Keep this setting only if the whitelist is the authority. Document the reason, require verified provider emails, and add tests for account-linking edge cases.

**Security controls rely heavily on client-side deterrence:**
- Risk: Context-menu blocking, shortcut blocking, visibility checks, DevTools heuristics, watermark mutation checks, and `getDisplayMedia` monkey-patching can be bypassed by users or browser changes.
- Files: `src/components/video/SecurityWrapper.tsx`, `src/components/video/ScreenRecordingDetector.tsx`, `src/lib/screen-recording-detection.ts`, `src/components/video/Watermark.tsx`
- Current mitigation: Server-side session checks, watermarking, DRM token generation, and security-event reporting exist.
- Recommendations: Treat client-side controls as telemetry/deterrence only. Enforce access at every media-serving API, prefer hardware DRM where supported, and keep watermark text server-derived.

**Security event flushing has no audit or scoping guard:**
- Risk: Any admin can delete all security events with `deleteMany({})`.
- Files: `src/app/api/admin/security-events/route.ts`
- Current mitigation: The route requires an admin session.
- Recommendations: Require explicit confirmation metadata, log who flushed events, prefer retention/archival over hard delete, and add a role or permission separate from general admin.

## Performance Bottlenecks

**Middleware performs Redis calls on most matched requests:**
- Problem: `src/middleware.ts` checks `config:system_mode` for every matched path and uses Redis rate limiting for many API/auth requests.
- Files: `src/middleware.ts`
- Cause: The matcher covers nearly all routes except static/image/favicon, and Redis is instantiated inside the middleware path as well as in the module-level rate limiter.
- Improvement path: Limit the system-mode check to affected route prefixes, cache mode in Edge Config or a short-lived edge cache, and apply rate limiting only where abuse risk justifies the latency.

**Watch page performs redundant video queries:**
- Problem: The watch page queries course videos once for the sidebar and then performs another `video.findMany` inside the watch-record query to compute IDs.
- Files: `src/app/watch/[videoId]/page.tsx`
- Cause: The query for `watchRecords` contains an awaited nested `prisma.video.findMany` even though `courseVideos` is fetched in the same `Promise.all`.
- Improvement path: Fetch `courseVideos` first or select sidebar IDs in one shared query, then query watch records with those IDs.

**Admin analytics loads and aggregates broad datasets in application code:**
- Problem: Analytics fetches many records and maps/reduces them in the route rather than pushing aggregation to the database.
- Files: `src/app/api/admin/analytics/route.ts`, `src/app/admin/analytics/page.tsx`
- Cause: Multiple `findMany` calls read videos, courses, users, watch records, and recent activity with nested includes.
- Improvement path: Add date filters and limits, use database aggregation where Prisma/Mongo supports it, and cache dashboard summaries for short intervals.

**SSE session revocation is instance-local:**
- Problem: Active SSE controllers live in a module-level `Map`; broadcasts only reach the current server instance.
- Files: `src/app/api/session/events/route.ts`, `src/lib/session-revocation.ts`, `src/hooks/useSessionSSE.ts`
- Cause: Serverless/multi-instance deployments do not share process memory.
- Improvement path: Use Redis pub/sub or polling against revocation keys for cross-instance delivery. Keep in-memory broadcast as an optimization only.

**Public static assets are very large and duplicated:**
- Problem: `public/` contains about 154 MB of assets, including duplicated Zoom SDK WASM/JS/CSS under both `public/zoom` and `public/lib/zoom`.
- Files: `public/zoom/**`, `public/lib/zoom/**`, `next.config.ts`
- Cause: Full SDK distributions are committed twice and served as static assets.
- Improvement path: Keep one SDK copy, remove unused locales/assets, compress/cache with versioned paths, and document upgrade procedure.

## Fragile Areas

**Video entitlement logic is duplicated and inconsistent:**
- Files: `src/app/watch/[videoId]/page.tsx`, `src/app/api/drm/token/route.ts`, `src/app/api/drm/license/route.ts`, `src/app/api/hls/playlist/[videoId]/route.ts`
- Why fragile: The watch page enforces enrollment, direct video access, time windows, and view limits; API routes enforce only subsets or no entitlement.
- Safe modification: Extract a shared server-only authorization helper that returns the video, user, entitlement status, and denial reason; call it from every media/token/playlist route.
- Test coverage: No test files were detected under `src`, `prisma`, or `scripts`.

**Session revocation and same-device policy span DB, Redis, and SSE:**
- Files: `src/lib/session-revocation.ts`, `src/app/api/session/events/route.ts`, `src/app/api/session/fingerprint/route.ts`, `src/hooks/useSessionSSE.ts`, `src/middleware.ts`
- Why fragile: Revocation uses DB deletes, Redis markers/cache invalidation, process-local SSE broadcasts, middleware fail-open behavior, and client reconnect logic.
- Safe modification: Define a single session state contract and add integration tests for login, revocation, reconnect, Redis outage, and multi-device flows.
- Test coverage: Not detected.

**Watermark settings accumulate as append-only rows:**
- Files: `src/app/api/admin/watermark-settings/route.ts`, `src/app/api/watermark/settings/route.ts`, `prisma/schema.prisma`
- Why fragile: Every update creates a new `WatermarkSettings` row and reads the latest by `updatedAt`. Unbounded history can grow indefinitely, and concurrent updates can create ambiguous latest state.
- Safe modification: Use a singleton settings document or add bounded audit history with an explicit active flag and unique key.
- Test coverage: Not detected.

**Axinom integration has multiple partially overlapping implementations:**
- Files: `src/lib/axinom.ts`, `src/lib/axinom-video-service.ts`, `src/lib/axinom-sync.ts`, `src/server/axinom.ts`, `src/app/api/webhook/axinom/route.ts`, `scripts/verify-axinom-setup.ts`
- Why fragile: Token generation, encoding, video sync, webhook querying, and legacy server helpers use different env var names and GraphQL paths.
- Safe modification: Centralize Axinom clients and env validation in one server-only module, then make routes/scripts consume that module.
- Test coverage: Not detected.

**Generated/imported Zoom webapp code is mixed with app-owned assets:**
- Files: `zoom-webapp/**`, `public/zoom/**`, `public/lib/zoom/**`, `public/zoom-meeting.html`
- Why fragile: There are multiple local, CDN, component, and public copies of Zoom SDK files and certificates. It is unclear which copy is authoritative.
- Safe modification: Identify the served runtime path, delete unused duplicates, and store vendor metadata/version checks beside the retained assets.
- Test coverage: Not detected.

## Scaling Limits

**Serverless connection and query volume:**
- Current capacity: Prisma is configured as a singleton per runtime instance and comments mention `connection_limit=5`; no explicit connection limit is enforced in code.
- Limit: Concurrent admin dashboards, watch pages, session polling, and API calls can amplify MongoDB queries per user/session.
- Scaling path: Add connection-string-level limits if required, centralize caching for read-heavy endpoints, and add request-level query budgets for pages with many parallel Prisma calls.

**Support diagnostics storage:**
- Current capacity: Client logger keeps up to 500 log entries per browser session and submits them in ticket payloads.
- Limit: Large `consoleLogs` and `browserInfo` JSON blobs can bloat `Ticket` documents and admin responses.
- Scaling path: Enforce payload byte limits, truncate logs before persistence, and store large diagnostics in object storage if needed.

**Security events retention:**
- Current capacity: `SecurityEvent` has indexes for user, type, video, and created time, but no retention policy.
- Limit: Frequent tab-switch/devtools heuristics can generate high event volume.
- Scaling path: Add event throttling on the client/server, retention windows, and aggregated counters for dashboards.

## Dependencies at Risk

**Next 16 with disabled React Strict Mode:**
- Risk: `next.config.ts` sets `reactStrictMode: false`, which hides double-render/effect issues during development.
- Impact: Client components with intervals, mutation observers, console monkey-patching, and SSE reconnect logic are more likely to leak or behave differently under future React/Next behavior.
- Migration plan: Enable Strict Mode after fixing effect cleanup hotspots in `src/lib/console-logger.ts`, `src/components/video/Watermark.tsx`, `src/components/video/ScreenRecordingDetector.tsx`, and `src/hooks/useSessionSSE.ts`.

**Vendored Zoom SDK assets:**
- Risk: Zoom SDK JavaScript/WASM/CSS files are checked into `public/zoom`, `public/lib/zoom`, and `zoom-webapp` rather than managed as a single package artifact.
- Impact: CVE response and SDK upgrades require manual file auditing across duplicates.
- Migration plan: Prefer `@zoom/meetingsdk` from `package.json` where possible; otherwise keep one generated asset directory and version it explicitly.

**Nested package install in `scripts/packager`:**
- Risk: `scripts/packager/node_modules` contains thousands of files and a separate dependency tree.
- Impact: Dependency scanning, repository size, and reproducibility suffer because this install is not governed by the root `package-lock.json`.
- Migration plan: Remove nested installs from version control and move packager dependencies into a package/workspace manifest.

## Missing Critical Features

**No automated test suite detected:**
- Problem: No `*.test.*` or `*.spec.*` files were found under `src`, `prisma`, or `scripts`.
- Blocks: Safe changes to entitlement, admin mutations, session revocation, webhooks, and support flows.

**No CI configuration detected:**
- Problem: No CI workflow files were detected in the top-level scan; package scripts include `lint` but no `test` script.
- Blocks: Automated enforcement of lint, typecheck, build, dependency health, and secret scanning.

**No explicit media entitlement helper:**
- Problem: Entitlement checks are route-local and inconsistent.
- Blocks: Confident addition of new playback formats, license flows, or signed media routes.

**No documented secret rotation boundary:**
- Problem: The repo contains multiple secret-like files while `.gitignore` also marks them sensitive.
- Blocks: Determining which credentials need immediate rotation and which files are safe sample artifacts.

## Test Coverage Gaps

**Media authorization and DRM:**
- What's not tested: Enrollment checks, direct video access, time windows, view limits, token issuance, local license response, and HLS playlist authorization.
- Files: `src/app/watch/[videoId]/page.tsx`, `src/app/api/drm/token/route.ts`, `src/app/api/drm/license/route.ts`, `src/app/api/hls/playlist/[videoId]/route.ts`
- Risk: Users can gain or lose access through route drift that manual UI checks do not catch.
- Priority: High

**Admin destructive actions:**
- What's not tested: Generic create/delete/restore routes, security event flush, bulk enrollment/import, and video-access mutations.
- Files: `src/app/api/admin/create/route.ts`, `src/app/api/admin/table-action/route.ts`, `src/app/api/admin/security-events/route.ts`, `src/app/api/admin/import/route.ts`, `src/app/api/admin/user-permissions/bulk-enroll/route.ts`
- Risk: Admin operations can fail at runtime or mutate unintended records.
- Priority: High

**Session lifecycle:**
- What's not tested: Login revocation, same-device enforcement, Redis failure behavior, SSE reconnect/fallback, and current-session activity updates.
- Files: `src/lib/auth.ts`, `src/lib/session-revocation.ts`, `src/app/api/session/events/route.ts`, `src/app/api/session/fingerprint/route.ts`, `src/hooks/useSessionSSE.ts`, `src/middleware.ts`
- Risk: Revoked sessions can stay active or valid sessions can be deleted unexpectedly.
- Priority: High

**Support ticket abuse controls:**
- What's not tested: reCAPTCHA validation, tablet bypass, rate limiting across instances, email/session mismatch, payload size limits, and diagnostic sanitization.
- Files: `src/app/api/support/ticket/route.ts`, `src/components/support/SubmitTicketForm.tsx`, `src/lib/console-logger.ts`
- Risk: Spam, spoofed tickets, oversized payloads, or sensitive diagnostics can reach persistent storage.
- Priority: Medium

**Axinom sync and webhook processing:**
- What's not tested: HMAC verification edge cases, webhook idempotency, Axinom GraphQL errors, `description` parsing, and clear/DRM encoding status transitions.
- Files: `src/app/api/webhook/axinom/route.ts`, `src/app/api/video/process/route.ts`, `src/lib/axinom-sync.ts`, `src/lib/axinom-video-service.ts`
- Risk: Encoding completion can publish incorrect videos or fail silently.
- Priority: Medium

---

*Concerns audit: 2026-05-05*
