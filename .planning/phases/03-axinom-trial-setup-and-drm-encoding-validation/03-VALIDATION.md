# Phase 3 Validation Strategy

**Date:** 2026-05-05

## Automated Gates

- `npm run prisma:generate`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run secrets:scan`

## Focused Test Expectations

- Axinom env validation:
  - local mode accepts missing credentials with warnings.
  - strict mode fails missing canonical values.
  - legacy aliases are detected and reported.
  - public license URL defaults are documented and returned.
- License Service Message signing:
  - payload contains `version: 1`, `com_key_id`, `message.type`, `message.version`, authorized key IDs, user/session identity, and explicit expiration.
  - signing uses HS256 with base64-decoded communication key and does not expose the communication key to client code.
  - invalid/missing key IDs fail before signing.
- DRM token route:
  - unauthorized entitlement never signs.
  - authorized request returns a token from the centralized Axinom helper.
  - missing `drmKeyId` remains a controlled denial.
- Local DRM license route:
  - returns a clear non-production response instead of implying key issuance.
- Shaka helpers:
  - token header is added only for Shaka `LICENSE` request type.
  - manifest/media request types do not receive `X-AxDRM-Message`.
  - default Widevine, PlayReady, and FairPlay URLs are available unless tenant-specific public env overrides exist.
- Metadata routes/helpers:
  - video process stores explicit Axinom IDs and statuses.
  - sync/webhook prefer explicit fields and retain legacy description fallback only for inherited records.

## Manual/Tenant Validation

Live Axinom validation is intentionally opt-in and documented:

1. Configure a trial tenant through My Mosaic / Mosaic Admin using `docs/axinom-setup.md`.
2. Configure staging env vars from `docs/env-matrix.md`.
3. Run the strict Axinom verification script.
4. Encode one staging test video.
5. Confirm webhook updates explicit Axinom fields.
6. Confirm authorized playback requests an Axinom license with `X-AxDRM-Message`.

## Pass Criteria

Phase 3 passes when all automated gates pass, docs cover official setup and staging validation, and live-tenant-only work is clearly marked as manual/opt-in rather than silently skipped.
