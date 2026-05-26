# Encoding And Playback Matrix

This matrix describes repository behavior for DoveRunner T&P outputs and browser playback routing. It is a code-facing maintainer reference, not proof that every tenant/browser combination has already been smoke tested.

## Encoded Outputs

| Use case | Trigger | Stored fields | Intended consumers |
|----------|---------|---------------|--------------------|
| DoveRunner DRM output | Admin video processing route calls `activeMediaProvider.submitProcessing`, which submits a DoveRunner T&P job with DASH/HLS packaging and DRM enabled. | `mediaProvider`, `providerContentId`, `providerJobId`, `providerStatus`, `sourceStorageBucket`, `sourceStorageKey`, `outputStoragePath`, `dashUrl`, `hlsUrl`, `providerSyncedAt`. | DASH Widevine, DASH PlayReady, and HLS FairPlay playback when the DoveRunner tenant/browser supports it. |
| Local Shaka Packager DASH | `scripts/drm/package-dash.mjs`. | Local `out/cenc/manifest.mpd`. | Offline/local Widevine DASH packaging experiments only. |
| Local Shaka Packager HLS | `scripts/drm/package-hls.mjs`. | Local `out/fp/master.m3u8`. | Offline/local FairPlay HLS packaging experiments only. |

Do not record content keys, CPIX payloads, access keys, storage keys, or license tokens in evidence or docs.

## Playback Routing

| OS | Browser | Manifest | Protection selected by app | Notes |
|----|---------|----------|----------------------------|-------|
| iOS | Safari, Chrome, Edge, Firefox | HLS | FairPlay when `DOVERUNNER_FAIRPLAY_CERT_URL` is configured. | All iOS browsers use WebKit, so the app routes by iOS first. Without FairPlay config, protected HLS playback is blocked. |
| macOS | Safari | HLS | FairPlay when `DOVERUNNER_FAIRPLAY_CERT_URL` is configured. | FairPlay requires Apple FPS credentials and a DoveRunner certificate URL. |
| macOS | Chrome, Firefox, Edge | DASH | Widevine L3/software. | Non-Windows Edge is routed to Widevine, not PlayReady. |
| Windows | Edge | DASH | PlayReady. | Uses `com.microsoft.playready`. |
| Windows | Chrome, Firefox | DASH | Widevine L3/software. | Uses `com.widevine.alpha`. |
| Linux | Chrome, Firefox, Edge | DASH | Widevine L3/software. | PlayReady is not selected for Linux Edge. |
| Android | Chrome, Firefox, Edge | DASH | Widevine L1 attempt, then L3 fallback if capability detection fails. | Uses `HW_SECURE_ALL` first on mobile and falls back to `SW_SECURE_CRYPTO`. |

The route also logs the selected DRM session through `/api/drm/log-session` with browser, OS, protocol, DRM type, and robustness metadata.

## FairPlay Operating Mode

If the DoveRunner tenant does not have FairPlay/FPS credentials, keep `DOVERUNNER_FAIRPLAY_CERT_URL` unset and mark Safari/iOS protected playback blocked until FairPlay is provisioned. Do not treat clear HLS as DRM.

## Source Files

- Processing entry point: `src/app/api/video/process/route.ts`
- Provider adapter: `src/lib/media-provider/doverunner.ts`
- Upload adapter: `src/lib/media-provider/aws-s3.ts`
- DRM token helper: `src/lib/media-provider/doverunner-token.ts`
- Playback selection: `src/lib/drm-detection.ts`
- Watch page routing: `src/components/course/WatchPageClient.tsx`
- Shaka/DoveRunner license setup: `src/hooks/player/useShakaPlayer.ts`
