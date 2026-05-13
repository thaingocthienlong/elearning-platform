# No-FairPlay Apple Fallback Design

Date: 2026-05-13

## Context

The Axinom DRM tenant does not currently have a FairPlay/FPS certificate. The
previous repository handled this by using clear HLS for iOS and Safari instead
of attempting FairPlay playback.

Official Axinom documentation says FairPlay requires content-owner Apple FPS
credentials and a FairPlay certificate URL. Axinom provides an evaluation
certificate for testing, but it is not guaranteed and must not become the
production fallback.

The current repository already documents and partially implements a no-FairPlay
mode:

- `docs/axinom-setup.md`
- `docs/playback-encoding-matrix.md`
- `src/lib/drm-detection.ts`
- `src/components/course/WatchPageClient.tsx`
- `src/components/video/DRMPlayerWrapper.tsx`
- `src/hooks/player/useShakaPlayer.ts`

## Decision

Use clear HLS as the intentional Apple-browser fallback when real FairPlay is
not configured.

Do not configure `AXINOM_FAIRPLAY_CERT_URL` or route Apple browsers through
FairPlay unless real FairPlay/FPS credentials and a tenant certificate URL are
available.

## Goals

- Preserve the old repository behavior for iOS and Safari.
- Keep Axinom DRM for non-Apple DRM playback through DASH Widevine and
  PlayReady.
- Avoid relying on Axinom's evaluation FairPlay certificate as an application
  fallback.
- Make the no-FairPlay mode explicit in code, docs, tests, and staging checks.
- Keep server-side entitlement, HLS authorization, watermarking, session
  controls, and audit telemetry active for clear HLS playback.

## Non-Goals

- Implement production FairPlay onboarding.
- Use Axinom's evaluation certificate outside isolated testing.
- Claim clear HLS is DRM-protected.
- Replace Axinom DRM, Shaka Player, or the existing video processing flow.

## Runtime Behavior

### Encoding

For each protected video that needs Apple-browser playback:

1. Run the DRM encode using `AXINOM_ENCODING_PROFILE_DRM`.
2. Run the clear HLS fallback encode using `AXINOM_ENCODING_PROFILE_CLEAR`.
3. Persist the DRM output fields:
   - `dashUrl`
   - `hlsUrl`
   - `drmKeyId`
   - `axinomVideoId`
   - `axinomEncodingStatus`
4. Persist the clear fallback fields:
   - `axinomIdClear`
   - `hlsUrlClear`

If `AXINOM_ENCODING_PROFILE_CLEAR` is missing, Apple-browser playback is not
available unless real FairPlay is configured.

### Playback Routing

For iOS browsers and macOS Safari:

- If `hlsUrlClear` exists, load that manifest.
- Pass an empty DRM token to the player.
- Set the player path to clear playback.
- Do not request `/api/drm/fairplay-cert`.
- Do not configure FairPlay license servers in Shaka.

For iOS browsers and macOS Safari without `hlsUrlClear`:

- If `AXINOM_FAIRPLAY_CERT_URL` is configured, use FairPlay HLS.
- If no certificate is configured, show unsupported playback instead of
  attempting FairPlay.

For non-Apple browser paths:

- Windows Edge uses DASH PlayReady.
- Chrome, Firefox, non-Windows Edge, Linux, macOS Chromium browsers, and Android
  use DASH Widevine.

## Security Model

Clear HLS is not DRM. In no-FairPlay mode, Apple-browser protection depends on:

- NextAuth session checks.
- Centralized media entitlement in `src/lib/media-entitlement.ts`.
- HLS playlist authorization before serving manifest data.
- Per-user watermarking.
- Session revocation and fingerprint checks.
- Watch heartbeat and DRM/playback session logging where applicable.
- Security event telemetry.

Docs and UI copy must not describe clear HLS as FairPlay or DRM-protected.

## Error Handling

- Missing `hlsUrlClear` and missing FairPlay certificate: show a clear
  unsupported-playback state.
- Missing `AXINOM_ENCODING_PROFILE_CLEAR` in no-FairPlay staging: verifier
  should fail or warn according to strictness mode.
- FairPlay certificate endpoint must not log certificate URLs or certificate
  contents.
- Axinom evaluation certificate may be documented as a manual staging experiment
  only, not as an app default.

## Testing

Required automated tests:

- iOS user agent with `hlsUrlClear` selects clear HLS and sets
  `isClearPlayback`.
- macOS Safari with `hlsUrlClear` selects clear HLS and does not require
  FairPlay.
- iOS/macOS Safari without `hlsUrlClear` and without FairPlay config returns no
  playable config.
- Safari with real FairPlay config still routes to FairPlay HLS.
- Non-Apple browser routing remains unchanged for Widevine and PlayReady.
- HLS playlist route denies unauthorized users using centralized entitlement.
- Player code does not send Axinom DRM tokens for clear HLS playback.

Required documentation checks:

- `docs/axinom-setup.md` explains the no-FairPlay mode.
- `docs/playback-encoding-matrix.md` identifies clear HLS as non-DRM.
- `docs/env-matrix.md` marks `AXINOM_ENCODING_PROFILE_CLEAR` as required for
  Apple-browser fallback when FairPlay is absent.
- Staging docs separate real FairPlay from clear HLS fallback.

## Acceptance Criteria

- Maintainers can configure the app without a FairPlay certificate and still
  support iOS/Safari through clear HLS.
- iOS/Safari playback does not call the FairPlay certificate endpoint when
  `hlsUrlClear` exists.
- The app never falls back to Axinom's evaluation FairPlay certificate
  automatically.
- Unsupported Apple-browser playback fails visibly when neither `hlsUrlClear`
  nor real FairPlay is configured.
- Docs explicitly state that clear HLS is a compatibility fallback, not DRM.

## References

- Axinom FairPlay setup:
  https://docs.axinom.com/services/drm/license-service/fairplay/
- Axinom FairPlay certificate:
  https://docs.axinom.com/services/drm/license-service/fairplay/fairplay-certificate
- Axinom FairPlay evaluation certificate:
  https://docs.axinom.com/services/drm/license-service/fairplay/fairplay-evaluation-certificate
- Axinom Shaka Player integration:
  https://docs.axinom.com/services/drm/players/shaka
