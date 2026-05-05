# Phase 3 Research: Axinom Trial Setup and DRM/Encoding Validation

**Date:** 2026-05-05
**Status:** Ready for planning

## Official Axinom Findings

- Axinom DRM separates project-specific entitlement decisions from the managed License Service. In standard mode, the app/player first obtains an entitlement, then sends the DRM license request to Axinom with an Axinom License Service Message attached as a header or URL parameter. Source: https://docs.axinom.com/services/drm/license-service
- License Service Messages wrap an Entitlement Message and are signed as JWTs using the Axinom DRM Communication Key ID and base64 Communication Key value. Axinom's Node example signs with HS256 and `noTimestamp: true`; the app should put explicit validity inside the message rather than relying on broad JWT defaults. Source: https://docs.axinom.com/services/drm/license-service/sign-license-service-message
- Axinom's Shaka integration configures DRM license server URLs per key system and attaches the token as `X-AxDRM-Message` only when Shaka's request type is `LICENSE`. Source: https://docs.axinom.com/services/drm/players/shaka
- Axinom Encoding API access should use a Mosaic service account with Encoding permission; the service account obtains a JWT from Mosaic Identity and sends it as `Authorization: Bearer <JWT>` to Encoding API requests. Source: https://docs.axinom.com/services/encoding/encoding-api/
- Axinom's DRM quick start for encoding recommends a UI-first trial workflow: create input/output storage, configure acquisition/publishing profiles, configure a processing profile, upload a video, encode, and preview. Source: https://docs.axinom.com/services/drm/quickstart/encode
- Axinom recommends credentials protection when passing storage, publisher, and DRM credentials to Encoding; production-like docs must call out encrypted credentials and the certificate/tool workflow. Source: https://docs.axinom.com/services/encoding/encoding-service/credentials-protection
- Axinom webhooks are signed callbacks; Phase 2 already hardened malformed signature handling, while Phase 3 should map webhook setup and metadata behavior to explicit fields. Source: https://docs.axinom.com/concepts/webhooks/

## Current Code Findings

- `src/lib/axinom.ts` currently signs a JWT with `expiresIn: '1h'`, `jwtid`, persistence enabled, and a console log. It does not validate env shape or expose a structured payload builder for tests.
- `src/app/api/drm/token/route.ts` already uses the Phase 2 entitlement helper before signing. It can consume a stricter Axinom token helper without route-wide rewrites.
- `src/hooks/player/useShakaPlayer.ts` correctly adds `X-AxDRM-Message` only in Shaka license request filters, but still has noisy client DRM logs and lacks a testable pure helper.
- `src/components/video/DRMPlayerWrapper.tsx` reads Widevine, PlayReady, and FairPlay public envs, but docs currently omit `NEXT_PUBLIC_AX_PR_LS_URL` from `.env.example` and `docs/env-matrix.md`.
- `src/app/api/drm/license/route.ts` is a local license stub and should stop presenting itself as production DRM. It can remain as a controlled 501/quarantined endpoint for local diagnostics.
- Axinom operational IDs are inconsistent: `process` writes DRM Axinom ID into `Video.description`, clear Axinom ID into `axinomIdClear`, and sync/webhook parse description text. The Prisma `Video` model should gain explicit fields for DRM Axinom video ID, encoding status/job, output, and synced timestamps.
- `src/lib/axinom-video-service.ts`, `src/lib/axinom-encoding.ts`, and `src/server/axinom.ts` overlap. Phase 3 should not rewrite all of them, but it should centralize canonical env validation and token/LSM behavior.

## Planning Implications

1. Start with docs/env validation so maintainers understand exact portal values before code changes.
2. Centralize Axinom DRM token construction in one server-only helper with tests.
3. Quarantine local license behavior before maintainers confuse it with Axinom License Service proxy mode.
4. Extract testable Shaka config/request-filter helpers while preserving current player flow.
5. Add explicit video metadata fields and update process/sync/webhook routes to prefer them, with fallback only for legacy records.
6. Finish with opt-in staging verification docs/scripts rather than live calls in automated tests.

## Risks

- Prisma MongoDB schema changes require `prisma generate` and likely `prisma db push` in real environments; no destructive data migration should run automatically.
- Existing untracked repo baseline means commits must stage only Phase 3 files.
- Live Axinom trial values are tenant-specific; tests must use placeholders and mocks only.
