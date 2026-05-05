# Domain Pitfalls

**Domain:** Secure DRM video platform rescue and modernization
**Project:** Secure Streaming Platform Rescue
**Researched:** 2026-05-05
**Overall confidence:** HIGH for repo-specific pitfalls from local codebase map; MEDIUM-HIGH for Axinom/Zoom caveats verified against current official documentation.

## Critical Pitfalls

Mistakes that cause security bypasses, broken playback, failed staging, or major rewrites.

### Pitfall 1: Treating the Watch Page as the Authorization Boundary
**What goes wrong:** The UI blocks access, but media/token/playlist APIs enforce different subsets of enrollment, direct access windows, course access, and view limits.
**Why it happens:** Brownfield code added route-local checks over time instead of a single server-only entitlement contract.
**Warning signs:** Watch page redirects but `/api/drm/token`, `/api/hls/playlist/:videoId`, or `/api/drm/license` still responds for the same user/video; duplicated access SQL/Prisma queries; comments saying "TODO entitlement" in media-serving routes.
**Consequences:** Authenticated users can fetch playlists or license tokens for videos they should not access. Manual UI testing misses the bypass.
**Prevention:** Create one `authorizeVideoPlayback` server helper that returns user, video, enrollment/direct-grant state, time-window status, view-limit status, and denial reason. Call it from watch page, DRM token route, DRM license route, HLS playlist route, and any future signed media route.
**Detection:** Add route-handler tests for enrolled, open-course, direct-grant valid, direct-grant expired, direct-grant not-yet-valid, non-enrolled, disabled video, and over-limit cases. Confirm every route returns the same allow/deny result.
**Roadmap phase:** Phase 2 - Critical Authorization and Security Fixes.
**Confidence:** HIGH; verified by local codebase concerns.

### Pitfall 2: Issuing Axinom Entitlements Without Matching Project Authorization
**What goes wrong:** The app signs a token that the Axinom License Service accepts, but the token is not tied tightly enough to the repo's access rules, Key IDs, time windows, and user identity.
**Why it happens:** Axinom separates responsibilities: Axinom's License Service issues DRM licenses, while the project must implement the Entitlement Service authorization logic. The inherited code has multiple Axinom helpers and inconsistent env names, making it easy to believe Axinom "does authorization" automatically.
**Warning signs:** Entitlement messages are generated directly from `videoId` without rechecking access; "allow-all" style token behavior in non-test code; missing `license.start_datetime`, `expiration_datetime`, or `duration`; missing content Key ID mapping; token route ignores `VideoAccess.validFrom`, `validUntil`, or `expiresAt`.
**Consequences:** DRM becomes a strong decryption layer around a weak entitlement decision. A valid signed message can authorize the wrong key, too broad a time range, or any key in a development setup.
**Prevention:** Model the app as the Entitlement Service. Generate Axinom License Service Messages only after route-level authorization passes. Include only authorized Key IDs in `content_keys_source.inline`, use license time restrictions that mirror app access windows, and keep allow-all entitlement messages strictly for local/test tooling.
**Detection:** Test Axinom token payload construction with fixed fixtures. Decode generated JWTs in tests to assert `com_key_id`, `message.type`, `message.version`, allowed key IDs, license duration/time range, and user/session metadata.
**Roadmap phase:** Phase 3 - Axinom DRM Trial Setup and Validation.
**Confidence:** HIGH; Axinom docs state the project developer must implement the Entitlement Service and that the player sends a signed entitlement token to the License Service.

### Pitfall 3: Misusing Axinom Communication Keys and License Message Signing
**What goes wrong:** Tokens fail in staging, or worse, secrets leak through logs/docs because communication key format and signing behavior are misunderstood.
**Why it happens:** Axinom communication key ID and communication key value are different values; the key value is base64 in the portal/config and must be decoded before HS256 signing. The repo also has secret-like files and logging of integration details.
**Warning signs:** `AXINOM_COM_KEY_SECRET` treated as a plain UTF-8 string; copied real communication keys in docs; token validation failures after deploy but not locally; logging token prefixes, communication IDs, or env-derived identifiers.
**Consequences:** Broken playback, secret exposure, stale trial credentials, and hard-to-debug license-service 4xx responses.
**Prevention:** Centralize Axinom env validation in one server-only module. Name variables explicitly (`AXINOM_COM_KEY_ID`, `AXINOM_COM_KEY_BASE64`) or document current names precisely. Decode the key from base64 before signing, sign with HS256, and never print token contents or key material.
**Detection:** Add a verification script that uses placeholder/test credentials only in CI and real staging credentials only when explicitly enabled. Validate env presence, UUID shape, base64 decode length, and generated JWT header/payload shape without printing secrets.
**Roadmap phase:** Phase 1 - Reproducible Setup and Secret Hygiene; Phase 3 - Axinom Validation.
**Confidence:** HIGH; verified against Axinom signing documentation and local secret-handling concerns.

### Pitfall 4: Leaving the Local DRM License Endpoint as a Credible-Looking Stub
**What goes wrong:** Maintainers assume `/api/drm/license` is a functioning license service because it authenticates sessions and references KMS, but it returns no content keys.
**Why it happens:** Brownfield rescue often preserves placeholder endpoints so the app builds, while docs and UI suggest the flow is complete.
**Warning signs:** License endpoint returns `keys: []`; comments say real decryption is skipped; no encrypted content-key persistence model; Shaka config alternates between local license URL and Axinom license URLs.
**Consequences:** Playback paths diverge. Debugging focuses on Shaka/Axinom when the selected license URL is actually a local stub. Security review may miss that real key handling is undefined.
**Prevention:** Decide one license architecture for v1: prefer Axinom License Service for staging. Mark the local endpoint as disabled unless implementing direct-key storage, KMS encryption/decryption, and strict key entitlement.
**Detection:** Smoke tests must assert the active player config uses Axinom URLs in staging and that local stub routes are not referenced by public config unless fully implemented.
**Roadmap phase:** Phase 3 - Axinom Validation; Phase 5 - Staging Deployment.
**Confidence:** HIGH; verified by local codebase concerns and Axinom docs.

### Pitfall 5: Storing Operational Axinom IDs in User-Facing Text
**What goes wrong:** Encoding sync and webhooks depend on parsing `Video.description` for `axinom-id:<id>`.
**Why it happens:** A quick rescue-era integration avoided schema migration by hiding operational identifiers in a free-text field.
**Warning signs:** `contains` lookups against description; admin users can edit descriptions; multiple videos can match the same substring; webhook processing cannot find exact jobs.
**Consequences:** Webhooks update the wrong video or fail silently. Academic redesign work can break DRM sync by changing copy.
**Prevention:** Add explicit indexed fields such as `axinomVideoId`, `axinomEncodingJobId`, `drmKeyId`, `encodingStatus`, and `playbackManifestUrl`. Migrate current description markers once and remove parsing.
**Detection:** Backfill script reports all videos with parsed Axinom IDs, duplicates, malformed markers, and videos with both user text and operational markers.
**Roadmap phase:** Phase 3 - Axinom Validation; Phase 6 - Database Performance and Data Cleanup.
**Confidence:** HIGH; verified by local codebase concerns.

### Pitfall 6: Upgrading Zoom by Copying More SDK Assets
**What goes wrong:** Multiple Zoom SDK bundles remain in `public/zoom`, `public/lib/zoom`, and `zoom-webapp`, and an upgrade changes one copy while production serves another.
**Why it happens:** Meeting SDK demos and CDN/local distributions are often copied into apps during integration. This repo already has duplicated vendor assets and a package dependency.
**Warning signs:** Two or more copies of Zoom JS/WASM/CSS; unclear served HTML page; root package version differs from vendored assets; no checksum/version metadata; `zoom-webapp` sample code mixed with app-owned public assets.
**Consequences:** Security updates are missed, bundle size stays high, and staging bugs depend on which asset path the browser loads.
**Prevention:** Keep `@zoom/meetingsdk` as the source of truth when possible. If vendoring is required, keep exactly one generated asset directory with version metadata, removal instructions, and a reproducible upgrade script.
**Detection:** CI/script checks for duplicate Zoom asset trees and reports the SDK version from `package-lock.json` plus the retained static asset manifest.
**Roadmap phase:** Phase 4 - Zoom Meeting SDK Upgrade and Asset Cleanup.
**Confidence:** HIGH for repo condition; MEDIUM-HIGH for current SDK integration patterns from official Zoom GitHub/npm docs.

### Pitfall 7: Generating Zoom Meeting SDK Signatures Too Broadly
**What goes wrong:** Any authenticated user can request a host-capable SDK JWT, a JWT for the wrong meeting, or a JWT with excessive lifetime.
**Why it happens:** Signature endpoints often start from sample code and trust request body fields like `meetingNumber` and `role`.
**Warning signs:** Signature route accepts `role: 1` from clients; meeting number comes from the request rather than server-side course/session config; passcode is exposed as a broad public env; no audit record of meeting joins.
**Consequences:** Users can start or control meetings, join unintended meetings, or reuse signatures beyond the intended session.
**Prevention:** Derive meeting number, role, display name, and email from the authenticated app context. Force learner role `0` except for explicit admin/instructor paths. Use short expirations within Zoom's allowed range, validate `meetingNumber` and `role`, and never expose the SDK secret.
**Detection:** Route tests for attendee vs admin, missing meeting, wrong meeting, tampered role, expired course access, and unauthenticated users. Decode JWT in tests to assert `mn`, `role`, `iat`, `exp`, `tokenExp`, and `sdkKey`.
**Roadmap phase:** Phase 4 - Zoom Meeting SDK Upgrade and Asset Cleanup.
**Confidence:** HIGH; Zoom auth sample requires `meetingNumber` and `role` together, constrains role to `0` or `1`, and signs server-side with `ZOOM_MEETING_SDK_SECRET`.

### Pitfall 8: Assuming Serverless Memory Is Shared State
**What goes wrong:** Rate limiting, session revocation, SSE broadcasts, and security controls work locally but fail across Vercel instances or cold starts.
**Why it happens:** The app has module-level maps/controllers and process-local ticket rate limiting while deploying to a serverless target.
**Warning signs:** `Map` used for limits or active clients; session revocation broadcasts only to current process; Redis errors fail open; behavior differs after redeploy or cold start.
**Consequences:** Revoked sessions stay active in another instance, support spam bypasses local limits, and staging smoke tests pass only by chance on a single warm instance.
**Prevention:** Move shared limits and revocation state to Upstash Redis or database-backed checks. Treat SSE as best-effort UI feedback and enforce revocation in middleware/API/database on every privileged request.
**Detection:** Integration tests that simulate Redis outage, repeated support submissions across fresh handler instances, and session revocation followed by direct API requests.
**Roadmap phase:** Phase 2 - Critical Authorization and Security Fixes; Phase 5 - Staging Deployment.
**Confidence:** HIGH; verified by local codebase concerns.

### Pitfall 9: Shipping Staging With Secret Artifacts Still in Workspace or History
**What goes wrong:** Sensitive env files, DRM key material, certificates, local private keys, or generated media artifacts remain accessible or committed.
**Why it happens:** DRM/video integrations generate many files, and rescue work can focus on making playback work before credential hygiene.
**Warning signs:** Root files such as service-account envs, key JSON, CPIX XML, base64 certificates, PSSH files, localhost keys, or nested keystores; docs mention real IDs/secrets; no secret scanning in CI.
**Consequences:** Credential rotation becomes mandatory, staging trust is unclear, and third-party trials can be abused.
**Prevention:** Inventory sensitive artifacts without reading/copying contents, remove committed secrets from history if present, rotate exposed credentials, keep only `.example` placeholders, and add secret scanning before staging deployment.
**Detection:** `git ls-files` and secret scanner output reviewed before any staging deploy; env docs use placeholders only.
**Roadmap phase:** Phase 1 - Reproducible Setup and Secret Hygiene.
**Confidence:** HIGH; verified by local codebase concerns.

### Pitfall 10: Redesigning the Academic Frontend Before Stabilizing Flows
**What goes wrong:** Visual redesign changes auth, course access, player layout, meeting launch, support diagnostics, or admin workflows before there are tests to catch regressions.
**Why it happens:** UI work feels bounded, but this app's pages mix rendering with fetch/mutation/security behavior.
**Warning signs:** Large page rewrites before entitlement tests; player/watermark components moved without playback smoke tests; admin pages restyled while generic mutations are still unsafe.
**Consequences:** Existing rescue bugs become harder to distinguish from redesign regressions, and staging readiness slips.
**Prevention:** Stabilize install, docs, tests, security, Axinom, and Zoom first. During redesign, preserve route contracts and extract UI components incrementally behind existing data hooks.
**Detection:** Before/after screenshots plus smoke tests for sign-in, course list, watch access, DRM token fetch, meeting join, ticket submit, and admin table operations.
**Roadmap phase:** Phase 7 - Academic Frontend Redesign.
**Confidence:** HIGH; verified by project constraints and local codebase structure.

## Moderate Pitfalls

### Pitfall 1: Trusting Support Ticket Client Data
**What goes wrong:** Authenticated users can submit another whitelisted email, oversized diagnostics, or sensitive browser logs.
**Warning signs:** Ticket route stores submitted `email`, `consoleLogs`, or `browserInfo` as-is; tablet user-agent bypasses reCAPTCHA; payload size not capped.
**Prevention:** Derive email from session for authenticated users, cap payload sizes, recursively redact sensitive fields, and move ticket rate limiting to Redis using user/session/IP/email keys.
**Roadmap phase:** Phase 2 - Critical Authorization and Security Fixes.
**Confidence:** HIGH.

### Pitfall 2: Letting Generic Admin Mutations Bypass Model Rules
**What goes wrong:** Dynamic Prisma routes mutate models without per-table allowlists and fail at runtime for models lacking assumed fields.
**Warning signs:** `@ts-ignore`, `any`, dynamic table names, generic delete/restore writing `isDeleted` to all tables.
**Prevention:** Replace generic mutations with a typed registry of allowed models, allowed fields, and model-specific actions. Require audit entries for destructive operations.
**Roadmap phase:** Phase 2 - Critical Authorization and Security Fixes.
**Confidence:** HIGH.

### Pitfall 3: Keeping Broad Admin Reads and App-Side Aggregation
**What goes wrong:** Admin analytics and management pages load large MongoDB datasets into Next.js handlers and aggregate in application memory.
**Warning signs:** `findMany` without date/limit filters; nested includes across users/videos/watch records; dashboards slow with realistic data.
**Prevention:** Add indexes, limits, date filters, database aggregation where Prisma/Mongo supports it, and short-lived cached summaries for dashboards.
**Roadmap phase:** Phase 6 - Database Performance and Data Cleanup.
**Confidence:** HIGH.

### Pitfall 4: Treating Client-Side Screen-Recording Deterrence as Security
**What goes wrong:** Context-menu blocking, shortcut blocking, visibility detection, DevTools heuristics, and display-capture monkey-patching are described as hard protection.
**Warning signs:** Documentation claims "prevents recording"; access control skipped because watermark/security wrapper exists.
**Prevention:** Document these controls as deterrence and telemetry only. Enforce security with server entitlement, DRM license restrictions, watermark identity, audit logs, and rapid revocation.
**Roadmap phase:** Phase 2 - Critical Authorization and Security Fixes; Phase 8 - Documentation and Staging Hardening.
**Confidence:** HIGH.

### Pitfall 5: Webhook Verification That Throws Instead of Rejecting
**What goes wrong:** Malformed Axinom webhook signatures produce 500s due to unsafe `timingSafeEqual` usage.
**Warning signs:** No buffer length check before constant-time comparison; invalid signature tests missing; retry logs show 500s for bad signatures.
**Prevention:** Parse expected signature format, compare lengths first, return 403 for invalid signatures, and make webhook processing idempotent.
**Roadmap phase:** Phase 3 - Axinom DRM Trial Setup and Validation.
**Confidence:** HIGH.

### Pitfall 6: Documentation Drift Around Database and Setup
**What goes wrong:** Maintainers follow stale README instructions for PostgreSQL or missing dependencies while the app actually uses Prisma with MongoDB and direct dependencies are incomplete.
**Warning signs:** README and schema disagree; `npm install` from clean checkout fails; `zod` imported but not declared; no Node version or Prisma generation step.
**Prevention:** Create setup docs from verified repo behavior, add missing dependencies, document Node/npm expectations, and include `prisma generate` and local/staging env matrix.
**Roadmap phase:** Phase 1 - Reproducible Setup and Secret Hygiene.
**Confidence:** HIGH.

## Minor Pitfalls

### Pitfall 1: Unstructured Production Console Logging
**What goes wrong:** Logs leak user emails, token fragments, integration IDs, or operational details and cannot be filtered by severity/request.
**Prevention:** Introduce a structured logger with redaction, environment-gated debug logs, and Sentry for exceptions.
**Roadmap phase:** Phase 2 - Critical Authorization and Security Fixes.

### Pitfall 2: Watermark Settings as Ambiguous Append-Only Rows
**What goes wrong:** Latest-by-`updatedAt` settings become ambiguous under concurrent updates and grow without retention.
**Prevention:** Use a singleton active settings document or bounded audit history with an explicit active flag.
**Roadmap phase:** Phase 6 - Database Performance and Data Cleanup.

### Pitfall 3: Nested Package Installs and Vendored Dependency Trees
**What goes wrong:** `scripts/packager/node_modules` and demo dependencies bypass the root lockfile and dependency scanning.
**Prevention:** Remove nested installs from version control and either move packager dependencies into a workspace/package manifest or document external binary prerequisites.
**Roadmap phase:** Phase 1 - Reproducible Setup and Secret Hygiene.

### Pitfall 4: Strict Mode Disabled Hiding Client Effect Leaks
**What goes wrong:** SSE reconnects, intervals, mutation observers, console monkey-patching, and player hooks leak or double-register under future React behavior.
**Prevention:** Fix cleanup in high-risk hooks/components, then re-enable Strict Mode after tests cover player/session behavior.
**Roadmap phase:** Phase 7 - Academic Frontend Redesign.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Phase 1 - Setup and secret hygiene | Clean checkout still depends on local artifacts or stale README assumptions | Add direct dependencies, Node/npm guidance, Prisma generate step, env matrix, placeholder examples, and secret inventory without copying secret contents |
| Phase 2 - Security and authorization | Fixing one media route leaves another route bypassable | Build a shared authorization helper first, then refactor watch/token/license/playlist routes and test them as a matrix |
| Phase 3 - Axinom validation | Playback debug gets split across local DRM stub, Axinom token generation, and Shaka config | Choose Axinom License Service for staging, disable or clearly quarantine local stub, and validate signed entitlement payloads against official docs |
| Phase 4 - Zoom upgrade | SDK version changes but stale vendored assets are still served | Pick package or one vendor directory as source of truth, delete duplicates, and add version/asset verification |
| Phase 5 - Vercel staging | Local-memory behavior passes locally but breaks across instances | Move rate limiting/revocation to Redis/database, add smoke tests for cold-start-compatible behavior, and verify all external callback URLs |
| Phase 6 - Prisma/MongoDB performance | Premature database migration hides simpler query/index fixes | Profile first, add indexes and limits, cache read-heavy summaries, and migrate only with evidence |
| Phase 7 - Academic redesign | UI refactor changes security-sensitive flows | Freeze route/API contracts, add smoke tests before redesign, and refactor large pages incrementally |
| Phase 8 - Maintainer docs and hardening | Docs overstate DRM/screen-recording guarantees | Document verified controls, known limits, staging smoke tests, and remaining production-hardening gaps |

## Sources

- Axinom DRM License Service: https://docs.axinom.com/services/drm/license-service (HIGH confidence)
- Axinom Signing License Service Message: https://docs.axinom.com/services/drm/license-service/sign-license-service-message (HIGH confidence)
- Axinom Entitlement Message tool: https://docs.axinom.com/general/tools/entitlement-message (HIGH confidence)
- Axinom player integration quick start: https://docs.axinom.com/services/drm/quickstart/player (HIGH confidence)
- Axinom Shaka Player integration: https://docs.axinom.com/services/drm/players/shaka (MEDIUM-HIGH confidence; official page reviewed, implementation details should still be validated during phase work)
- Zoom Meeting SDK for Web README: https://raw.githubusercontent.com/zoom/meetingsdk-web/master/README.md (HIGH confidence)
- Zoom Meeting SDK Auth Endpoint sample README: https://raw.githubusercontent.com/zoom/meetingsdk-auth-endpoint-sample/master/README.md (HIGH confidence)
- Zoom Meeting SDK Auth Endpoint sample implementation: https://raw.githubusercontent.com/zoom/meetingsdk-auth-endpoint-sample/master/src/index.js (HIGH confidence)
- Local project context: `.planning/PROJECT.md`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/TESTING.md`, `.planning/codebase/INTEGRATIONS.md`, `.planning/codebase/CONVENTIONS.md` (HIGH confidence for repo-specific conditions)
