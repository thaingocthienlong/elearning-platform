# Architecture Patterns

**Project:** Secure Streaming Platform Rescue
**Domain:** Brownfield secure course/video streaming platform
**Researched:** 2026-05-05
**Overall confidence:** HIGH for Next.js/Prisma/Shaka/Vercel patterns, MEDIUM for Axinom and Zoom until trial credentials are validated in this tenant.

## Recommendation

Structure the rescue around a server-owned authorization core, with SDK integrations treated as adapters at the edge of the system. Do not start by replacing the database, player, DRM provider, or meeting provider. The first architectural move should be to centralize media entitlement and environment validation, then make every playback, playlist, token, and admin path call those shared services.

The target architecture keeps the existing Next.js App Router surface but changes ownership boundaries:

```text
Browser UI
  courses/watch/admin/meeting pages
  Shaka Player hook
  Zoom iframe shell
        |
        v
Next.js App Router boundaries
  server components for protected reads
  route handlers for mutations, tokens, webhooks, signatures
        |
        v
Server-only application services
  auth/session service
  media entitlement service
  DRM entitlement service
  media delivery gateway
  Zoom meeting access service
  admin query/mutation services
        |
        v
Infrastructure adapters
  Prisma/MongoDB
  Upstash Redis
  Axinom DRM and Encoding
  Shaka-compatible license/player config
  Zoom Meeting SDK
  Azure Blob and Cloudflare R2
  Vercel/Sentry
```

## Component Boundaries

| Component | Responsibility | Current Codebase Touchpoints | Boundary Rule |
|-----------|----------------|------------------------------|---------------|
| App Router pages | Compose UI, run protected server reads, redirect on denied access | `src/app/courses`, `src/app/watch/[videoId]/page.tsx`, `src/app/admin`, `src/app/meeting/page.tsx` | Pages may call services, but should not define reusable authorization rules. |
| Route handlers | HTTP boundary for tokens, HLS, webhooks, admin mutations, support, Zoom signatures | `src/app/api/**/route.ts` | Validate session/role, parse input, call server services, return typed responses. |
| Media entitlement service | Single source of truth for course enrollment, direct video grants, grant windows, view limits, video publication, and media URL eligibility | New server-only helper such as `src/lib/media-entitlement.ts` | Every watch page, DRM token route, HLS route, local license route, and future signed media route must call this. |
| DRM entitlement service | Generate Axinom License Service Message JWTs from approved entitlement decisions | Existing `src/lib/axinom.ts`; future `src/lib/drm/axinom-entitlement.ts` | Accept only authorized video/key decisions, not raw user-submitted key IDs. |
| Playback adapter | Browser-only Shaka configuration and license-request header injection | `src/hooks/player/useShakaPlayer.ts`, `src/components/video/Player.tsx` | No entitlement decisions in browser code; use token and manifest URL returned by server. |
| Media delivery gateway | Serve/proxy private manifests and later signed segment access if needed | `src/app/api/hls/playlist/[videoId]/route.ts`, R2/Azure helpers | Must call media entitlement before any object lookup; cache only after auth and with private/user-safe headers. |
| Axinom encoding adapter | Validate trial setup, create/poll jobs, handle webhooks, map Axinom asset IDs to videos | `src/lib/axinom-video-service.ts`, `src/lib/axinom-encoding.ts`, `src/lib/axinom-sync.ts`, `src/server/axinom.ts`, `src/app/api/webhook/axinom/route.ts` | Centralize env parsing and tenant URLs; stop storing operational IDs in `Video.description`. |
| Zoom meeting service | Generate Meeting SDK JWT and server-derived meeting identity/watermark | `src/app/api/zoom/signature/route.ts`, `src/app/meeting/page.tsx`, `public/zoom-meeting.html` | Signature generation stays server-side; meeting page preserves authenticated iframe flow. |
| Persistence layer | MongoDB data contract and indexes through Prisma | `prisma/schema.prisma`, `src/lib/prisma.ts` | Optimize existing MongoDB schema first; migration is not a phase-1 architecture move. |
| Cache/rate/session state | Read-through cache, rate limits, revocation, system mode | `src/lib/redis.ts`, `src/middleware.ts`, `src/lib/session-revocation.ts` | Redis is a distributed coordination service, not a substitute for database authorization checks. |
| Deployment boundary | Vercel preview/staging with external services | `vercel.json`, `next.config.ts`, environment variables | Staging must verify env groups, webhook URLs, SDK static assets, and serverless behavior. |

## Data Flow

### Playback Request Flow

1. User opens `/watch/[videoId]`.
2. Middleware performs only coarse protection and session-revocation checks.
3. Watch page calls `getMediaEntitlement({ userEmail, videoId, purpose: "watch-page" })`.
4. The entitlement service loads user, video, course, enrollment, video access, direct access windows, watch record, and view-limit state from Prisma.
5. If denied, the page redirects with a reason. If allowed, the page receives a typed decision containing video metadata, allowed manifest URLs, key IDs, watermark identity, view count, and course sidebar data references.
6. The DRM entitlement service generates an Axinom token only from the approved key IDs.
7. `WatchPageClient` passes the manifest URL, DRM token, and license URL to Shaka.
8. Shaka configures license servers and sends the Axinom token in `X-AxDRM-Message` for license requests.
9. Heartbeat records progress and view count; the heartbeat endpoint must also re-check a lightweight entitlement or at least validate the watch record belongs to the same user/video.

### HLS Playlist Flow

1. User requests `/api/hls/playlist/[videoId]`.
2. Route validates the NextAuth session.
3. Route calls the same media entitlement service with `purpose: "manifest"`.
4. Only after an allow decision, the route resolves the R2 key from the stored HLS URL and streams the manifest.
5. Response cache should start as `private, no-store` or short `private` cache until segment access and manifest rewriting are audited. The current `public, s-maxage=60` shape is unsafe for personalized authorization.

### DRM Token Flow

1. Client posts `videoId` to `/api/drm/token`.
2. Route validates session and input.
3. Route calls `getMediaEntitlement({ purpose: "drm-token" })`.
4. Route rejects expired, future, deleted, unpublished, over-limit, or unenrolled access using the same denial codes as the watch page.
5. Route calls `generateAxinomLicenseServiceJwt({ keyIds, policy, expiresAt })`.
6. Route returns only the token and expiry metadata; it never accepts a raw key ID from the client.

### Axinom Encoding and Webhook Flow

1. Admin uploads or selects a source in Azure/R2.
2. Video processing route validates admin role and calls a single Axinom encoding adapter.
3. Adapter validates required trial credentials and profile IDs before job submission.
4. Encoding submits source/output/profile settings to Axinom.
5. Webhook handler verifies signature length and HMAC before parsing payload.
6. Handler uses stable Axinom asset/job IDs stored on `Video` fields, not `description`, to update `dashUrl`, `hlsUrl`, `drmKeyId`, status, and error metadata.
7. Admin status page reads these fields with indexed filters.

### Zoom Meeting Flow

1. Authenticated user opens `/meeting`.
2. Meeting page requests `/api/zoom/signature` with the configured meeting number and attendee role.
3. Signature route validates the session before generating any SDK JWT.
4. Route derives user display identity and watermark from session/whitelist data.
5. Meeting page constructs the existing iframe URL to `public/zoom-meeting.html`.
6. Static Zoom page initializes the retained SDK asset source and joins with signature, meeting number, passcode, user identity, and watermark params.
7. Upgrade work should preserve this flow while replacing duplicated SDK assets with one source of truth.

## Patterns to Follow

### Pattern 1: Server-Only Entitlement Decision

**What:** Extract the duplicated video authorization logic into a server-only helper that returns an allow/deny decision plus the data needed by callers.

**When:** Use it in watch page rendering, `/api/drm/token`, `/api/hls/playlist/[videoId]`, `/api/drm/license`, heartbeat, and future media URL signing.

**Example shape:**

```typescript
type MediaEntitlementPurpose = "watch-page" | "drm-token" | "manifest" | "heartbeat";

type MediaEntitlementDecision =
  | {
      allowed: true;
      userId: string;
      videoId: string;
      courseId: string;
      drmKeyIds: string[];
      dashUrl?: string | null;
      hlsUrl?: string | null;
      watermarkText: string;
      effectiveViewLimit?: number | null;
    }
  | {
      allowed: false;
      reason:
        | "unauthenticated"
        | "user_not_found"
        | "video_not_found"
        | "not_enrolled"
        | "video_access_missing"
        | "access_expired"
        | "access_not_yet_valid"
        | "view_limit_exceeded";
      status: 401 | 403 | 404;
    };
```

**Why:** This is the highest-leverage stabilization step. The current watch page enforces more rules than the DRM token route, and the HLS route does not enforce entitlement at all.

### Pattern 2: Integration Adapters With Env Validation

**What:** Put Axinom, Zoom, R2, Azure, Redis, and Sentry configuration parsing in server-only adapter modules. Each adapter should expose a `validateSetup()` function used by setup scripts and staging smoke checks.

**When:** Use before calling external APIs and in a staging readiness command.

**Why:** This repo has inherited env drift and overlapping Axinom variable names. A brownfield rescue needs runtime failure to become explicit and early.

### Pattern 3: Explicit Admin Operation Registry

**What:** Replace dynamic Prisma table access with an explicit registry mapping each admin operation to allowed fields, required role, validation, side effects, and cache invalidation.

**When:** Use for generic create/delete/restore and future admin table mutations.

**Why:** Prisma type safety is currently bypassed in generic admin mutations, and some models such as `Ticket` do not have the fields assumed by the generic route.

### Pattern 4: Dynamic Personalized Routes

**What:** Keep personalized pages and routes dynamic, with deliberate cache headers. Use `export const dynamic = "force-dynamic"` or `revalidate = 0` where protected content depends on current session state.

**When:** Watch page, meeting page, token/license routes, HLS manifest route, admin APIs, support history, session events.

**Why:** Next.js App Router can cache aggressively by default. Official Next.js docs recommend route segment config such as `force-dynamic`, `force-no-store`, and `revalidate = 0` when request-time behavior must be guaranteed.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Media Authorization

**What:** Treating a rendered watch page, hidden URL, watermark, or browser-only detector as the authorization boundary.

**Why bad:** Users can call API routes directly. Client security controls are deterrence and telemetry, not enforcement.

**Instead:** Enforce entitlement in every route that returns a token, manifest, license, signed URL, media object, or watch mutation.

### Anti-Pattern 2: Multiple Axinom Implementations

**What:** Keeping parallel token, encoding, sync, webhook, and script implementations with different env names and URL assumptions.

**Why bad:** Trial setup validation becomes guesswork and webhook/status behavior drifts.

**Instead:** Keep one Axinom configuration module, one DRM entitlement module, and one encoding/video-service adapter. Legacy scripts can import those modules.

### Anti-Pattern 3: Public Caching of Protected Media Manifests

**What:** Returning protected HLS manifests with shared CDN cache headers before entitlement and segment strategy are validated.

**Why bad:** A public cache key based only on `videoId` can serve a protected manifest beyond the user or grant that authorized it.

**Instead:** Start private/no-store, then introduce signed URLs or cache keys that are explicitly safe.

### Anti-Pattern 4: Database Migration as First Rescue Move

**What:** Moving from MongoDB to another database before profiling and test coverage.

**Why bad:** The Prisma schema is MongoDB-specific with ObjectId fields and relation patterns. Migration would multiply risk before the current app is stable.

**Instead:** Add targeted indexes, reduce broad reads, cap admin queries, cache summary data, and profile staging load first.

## Build Order

### Phase 1: Installable, Observable Baseline

**Goal:** Make the app reproducible before changing high-risk flows.

**Build:**
- Confirm Node/npm versions, `npm ci`, `prisma generate`, lint/build scripts, and missing direct dependencies.
- Add setup/staging env validation scripts that check required keys by name without printing secret values.
- Add smoke checks for auth page, course list, watch denial, Zoom signature denial, Redis optional behavior, and Prisma connectivity.
- Add structured redacted logging wrapper for integration failures.

**Architectural reason:** No integration rescue is trustworthy until maintainers can install, build, and observe failures consistently.

### Phase 2: Central Media Authorization

**Goal:** Remove entitlement drift.

**Build:**
- Create `src/lib/media-entitlement.ts` as server-only logic.
- Refactor watch page to consume the helper.
- Refactor `/api/drm/token` to enforce the exact same enrollment, direct access, time window, publication, deletion, and view-limit rules.
- Refactor `/api/hls/playlist/[videoId]` to call the helper before R2 access.
- Mark protected media routes dynamic/no-store unless proven safe.
- Add focused tests for allow/deny cases using seeded Prisma data or mocked Prisma access.

**Architectural reason:** This is the core security boundary for the product.

### Phase 3: Axinom Trial Validation and DRM Adapter

**Goal:** Make Axinom setup reproducible and map official trial setup to repo behavior.

**Build:**
- Centralize Axinom env validation for communication key ID, base64 communication key secret, license service URLs, FairPlay cert URL, encoding credentials, profile IDs, and webhook secret.
- Adjust `generateAxinomToken` to be a license service JWT builder that accepts explicit entitlement policy from the media entitlement service.
- Verify Shaka sends `X-AxDRM-Message` on license requests and uses configured Widevine/PlayReady/FairPlay license URLs.
- Validate encoding profile setup: acquisition storage, publishing storage, processing profile, output format, DRM protection, and DRM settings.
- Add webhook signature length check before `timingSafeEqual`.
- Store stable Axinom IDs/status fields on `Video`; migrate away from `description` parsing.

**Architectural reason:** Axinom is both a playback dependency and an ingest/encoding dependency. It needs one adapter boundary before staging can be credible.

### Phase 4: Zoom Meeting SDK Preservation and Upgrade

**Goal:** Preserve current authenticated meeting flow while making SDK assets maintainable.

**Build:**
- Keep `/meeting` as authenticated host and `/api/zoom/signature` as server-side JWT generator.
- Validate session before generating a signature; reject unauthenticated signature requests.
- Use the current `@zoom/meetingsdk` package version as the retained source of truth, or document one static asset directory if static serving is required.
- Remove or quarantine duplicate `public/zoom`, `public/lib/zoom`, and `zoom-webapp` copies after verifying which asset path is served.
- Fix redirect mismatch from `/login` to `/auth/signin` or `/api/auth/signin`.
- Add manual smoke test for meeting join, passcode, user identity, leave URL, watermark, and camera/mic permissions.

**Architectural reason:** Official Zoom docs state Meeting SDK signatures should be generated by a server-side function where SDK credentials are secure, and older client-side signature generation APIs have been removed in recent Web SDK versions.

### Phase 5: Prisma/MongoDB Performance Pass

**Goal:** Optimize the existing database before considering migration.

**Build:**
- Profile watch page, courses, admin analytics, admin tables, session events, and support ticket endpoints.
- Fix redundant watch-page video queries by reusing course video IDs.
- Add or validate indexes for admin filters and Axinom lookup fields.
- Add pagination and date bounds to broad admin reads.
- Cache dashboard summaries and course list data with explicit invalidation.
- Add payload caps for tickets and security event throttling/retention.

**Architectural reason:** Official Prisma docs state the MongoDB connector uses the MongoDB driver pool, not Prisma's relational connection pool. Performance work should focus on query shape, indexes, payload size, and connection string settings.

### Phase 6: Staging Deployment

**Goal:** Produce a Vercel staging path that exercises real external services without production claims.

**Build:**
- Create a staging environment checklist for Vercel Preview or custom environment variables.
- Configure webhook callback URLs for staging.
- Verify Vercel env variable scopes: Development, Preview/custom staging, and Production.
- Run smoke checks for auth, course list, watch deny/allow, DRM token, Shaka playback, HLS authorization, Zoom signature, support ticket, Redis rate limit/session revocation, and Axinom webhook.
- Document serverless limits: no reliance on module-level memory for cross-instance revocation, no long-running encoding work inside request handlers, no public cache for personalized media.

**Architectural reason:** Vercel's environment model supports distinct env scopes, and the current app already has a Vercel-oriented shape, but serverless behavior changes assumptions around memory, Redis, callbacks, and SDK assets.

## Integration Points in This Codebase

| Concern | Keep | Refactor | Validate |
|---------|------|----------|----------|
| Auth | `src/lib/auth.ts`, NextAuth database sessions, whitelist gating | Meeting redirects and API imports should use the canonical auth module | Google OAuth credentials and sign-in callback in staging |
| Media auth | Watch page logic as behavioral reference | Extract to `src/lib/media-entitlement.ts` and reuse in token/HLS/license routes | Expired, future, unenrolled, open course, direct grant, view limit |
| DRM token | `src/lib/axinom.ts` concept | Make server-only adapter, remove secret/key-prefix logging, drive policy from entitlement decision | Axinom communication key ID and base64 secret |
| Shaka | `src/hooks/player/useShakaPlayer.ts` dynamic import and request filter | Reduce console leakage; fail clearly by DRM type; avoid robustness-only failures | License servers, `X-AxDRM-Message`, HTTPS/localhost EME constraints |
| HLS | R2 gateway shape | Enforce entitlement before object access; revisit cache headers and manifest rewriting | Private media object access and no public leakage |
| Axinom encoding | Existing encoding/sync/webhook modules | Single adapter, stable `Video` fields for Axinom IDs/status | Profiles, storage, DRM settings, webhook signature |
| Zoom | Authenticated `/meeting` plus iframe static shell | Server auth before signature; single SDK asset source | SDK JWT payload, meeting number/passcode, watermark |
| Prisma/MongoDB | Existing schema and ObjectId model | Add fields/indexes only where measured; cap broad reads | Query plans and staging latency |
| Redis | Cache/rate/revocation helper pattern | Do not depend on in-memory SSE as sole delivery | Upstash env and outage behavior |
| Vercel | `vercel.json`, Next.js App Router deployment | Add staging env/check docs, route cache decisions | Preview/custom env vars, webhook URLs |

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| Media authorization | Direct Prisma checks per request are acceptable | Cache stable course/user grants briefly, still re-check time windows and revocation | Dedicated authorization read model or signed short-lived media grants |
| DRM token issuance | Generate JWT per watch/token request | Cache per user/video/key/policy for very short TTL if needed | Token service boundary with audit and rate limiting |
| HLS manifests | Private gateway with no-store is acceptable | Signed manifest/segment URLs or CDN with entitlement-safe keys | Dedicated media CDN authorization layer |
| Admin analytics | Simple queries with limits | Precomputed summaries in Redis/Mongo collections | Event pipeline and analytics store |
| Session revocation | Redis flags plus same-instance SSE | Redis pub/sub or polling fallback required | Central session service; avoid process-local state |
| Axinom encoding | Manual/admin-triggered jobs | Queue job submissions and polling outside request path | External worker/orchestrator and idempotent event handling |
| Zoom assets | Single static SDK copy works | Versioned asset path and documented upgrade script | Vendor update automation and regression smoke suite |

## Research Confidence

| Area | Confidence | Reason |
|------|------------|--------|
| Media entitlement architecture | HIGH | Directly supported by current codebase risks and standard server-side authorization practice. |
| Axinom DRM token/player flow | HIGH | Official Axinom docs describe entitlement messages wrapped as signed License Service JWTs and Shaka sending `X-AxDRM-Message`. Tenant-specific trial setup remains MEDIUM until credentials are tested. |
| Axinom encoding setup | MEDIUM | Official docs define profiles, storage, processing, output format, and DRM settings; current repo has multiple modules that must be reconciled. |
| Zoom Meeting SDK flow | MEDIUM | Official Zoom API docs and typed docs require server-side signature generation; current docs pages were partially inaccessible through tooling, so confirm against the installed SDK during implementation. |
| Prisma/MongoDB optimization | HIGH | Official Prisma docs clearly state MongoDB pooling is managed by the MongoDB driver; current schema already has useful indexes but broad reads remain. |
| Vercel staging | HIGH | Official Vercel docs define environment scopes and limits; repo already has Vercel/Next.js config. |

## Sources

- Axinom License Service: https://docs.axinom.com/services/drm/license-service
- Axinom signing License Service Messages: https://docs.axinom.com/services/drm/license-service/sign-license-service-message
- Axinom Shaka Player integration: https://docs.axinom.com/services/drm/players/shaka
- Axinom Encoding overview: https://docs.axinom.com/services/encoding
- Axinom Video encoding profiles: https://docs.axinom.com/services/video/setup-encoding-profiles/
- Shaka Player DRM configuration tutorial: https://shaka-player-demo.appspot.com/docs/api/tutorial-drm-config.html
- Zoom Meeting SDK Web `generateSDKSignature` deprecation note: https://marketplacefront.zoom.us/sdk/meeting/web/functions/ZoomMtg.generateSDKSignature.html
- Zoom Meeting SDK authorization docs: https://developers.zoom.us/docs/meeting-sdk/auth/
- Prisma connection pool docs: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool
- Next.js App Router caching docs: https://nextjs.org/docs/app/building-your-application/caching
- Vercel environment variable docs: https://vercel.com/docs/environment-variables
- Local architecture map: `.planning/codebase/ARCHITECTURE.md`
- Local concerns map: `.planning/codebase/CONCERNS.md`
- Local integrations map: `.planning/codebase/INTEGRATIONS.md`
- Local Prisma schema: `prisma/schema.prisma`
