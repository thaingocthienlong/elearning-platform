# Phase 3: Axinom Trial Setup and DRM/Encoding Validation - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 makes the inherited Axinom DRM and Encoding path reproducible and tenant-safe. It must produce official-doc-based setup guidance, map Axinom portal values to canonical repo env vars, repair License Service Message generation and Shaka license-request behavior, quarantine misleading local DRM license behavior, add explicit Axinom operational video fields, and provide tests plus an opt-in staging checklist for a real trial tenant video.

</domain>

<decisions>
## Implementation Decisions

### Axinom DRM Setup Scope
- Official Axinom Mosaic documentation is the source of truth; repo-specific docs must map those official concepts to this codebase.
- v1 should use Axinom standard mode: the app issues short-lived License Service Message JWTs and Shaka sends them as `X-AxDRM-Message` on license requests.
- The local DRM license endpoint should be quarantined or disabled as non-production unless real key custody is implemented.
- Env validation should warn/skip for local placeholder use, but strict or staging checks must fail missing, ambiguous, or legacy-only Axinom values.

### Axinom Encoding And Video Metadata
- Document Axinom Encoding through a Mosaic UI-first flow with API notes because trial setup is easiest to reproduce in Mosaic first.
- Store Axinom operational data in explicit video fields instead of parsing `description` for Axinom IDs.
- Consolidate env validation, token, and License Service Message behavior now; keep broader encoding-service cleanup focused and test-backed.
- Phase 3 success can be proven with automated unit tests plus a staging runbook/checklist for a real Axinom trial tenant video; this environment does not require live tenant credentials.

### Shaka Playback And License URLs
- License service URLs should come from public env vars with documented Axinom defaults and tenant-dedicated override support.
- Shaka should attach `X-AxDRM-Message` only to license requests, never manifest or media segment requests.
- FairPlay should use documented dedicated license/certificate envs where available, but Phase 3 must not invent local Apple FPS credentials.
- Reduce token and DRM operational console logging in touched player code rather than adding richer client telemetry in this phase.

### Verification Boundaries
- Mandatory tests cover Axinom env validation, License Service Message signing shape, DRM token route behavior, and practical Shaka request-filter behavior.
- Phase 3 must not touch live Axinom APIs automatically; live checks must be opt-in scripts or runbook steps so local tests never require secrets.
- Add a dedicated Axinom setup document with official source links and repo env mapping.
- Legacy `AX_*` aliases may be temporarily supported with warnings, but strict mode should fail ambiguous or legacy-only canonical values.

### the agent's Discretion
Use the existing Next.js, Prisma, Jest, and route-helper patterns from earlier phases. Keep implementation incremental and preserve the current successful watch/playback flow while replacing misleading or unsafe Axinom assumptions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/media-entitlement.ts` is the server-only authorization gate created in Phase 2 and is already consumed by the DRM token route.
- `src/lib/axinom.ts` currently signs Axinom tokens, but needs official-doc alignment, short-lived payload validation, and safer logging.
- `src/app/api/drm/token/route.ts` is the server endpoint that should issue authorized Axinom License Service Message JWTs.
- `src/hooks/player/useShakaPlayer.ts` already registers a Shaka request filter for license requests and can be tightened/tested.
- `scripts/verify-axinom-setup.ts`, `docs/env-matrix.md`, and `.env.example` provide the existing service-verification and env-documentation shape.

### Established Patterns
- External service checks are optional locally and strict in staging/CI-style mode.
- Tests mock sessions, Prisma, and external providers instead of requiring real secrets.
- Documentation uses placeholder-only values and should not copy local env, key, certificate, or media-secret material.

### Integration Points
- Prisma `Video` currently stores `dashUrl`, `hlsUrl`, `hlsUrlClear`, `drmKeyId`, and `axinomIdClear`; Phase 3 should add explicit Axinom operational fields.
- Axinom code is split across `src/lib/axinom.ts`, `src/lib/axinom-video-service.ts`, `src/lib/axinom-encoding.ts`, `src/lib/axinom-sync.ts`, `src/server/axinom.ts`, webhook routes, and verification scripts.
- Public license URLs are consumed by `DRMPlayerWrapper` and `useShakaPlayer`; env docs currently list Widevine and FairPlay but are missing a PlayReady matrix row.

</code_context>

<specifics>
## Specific Ideas

- Official Axinom sources to cite include DRM License Service, License Service Message signing, Entitlement Message tool, Shaka Player integration, Encoding API, Encoding Quick Start, Encoding credentials protection, and webhooks.
- Preserve Axinom and Shaka as the v1 provider path; do not replace DRM provider or move to a different player.
- Keep live tenant validation opt-in and documented because real trial credentials are tenant-specific and must not be required for local automated tests.

</specifics>

<deferred>
## Deferred Ideas

- Full Axinom service-module rewrite beyond env/LSM/playback/documentation/test needs.
- Production load, billing, and incident-response controls for Axinom usage.
- Zoom SDK upgrade, database performance work, staging deployment acceptance, and frontend redesign remain later roadmap phases.

</deferred>
