# Temporary Mux Watermark Design

**Date:** 2026-08-17  
**Status:** Approved for implementation

## Goal

Restore the existing Tencent player watermark behavior for the four temporary
Mux playback sessions without changing their supplied Mux iframe URLs or adding
new watermark settings.

## Chosen Approach

Reuse the existing client-side `Watermark` component inside
`TemporaryMuxPlayer`.

`WatchPageClient` already receives the server-derived `watermarkText` used by
`DRMPlayerWrapper`. It will pass that same value to `TemporaryMuxPlayer`.
The Mux wrapper will render `Watermark` above the cross-origin iframe, so it
uses the same learner identity text, admin-controlled settings endpoint,
position rotation, styling, and DOM-tamper deterrence as Tencent playback.

`Watermark` will treat a player container without a local `<video>` element as
an iframe-backed player: it will size against the container rather than return
early. Native Tencent video layout calculations remain unchanged when a local
video element is present.

## Alternatives Considered

1. **Reuse `Watermark` above the Mux iframe (chosen).** Preserves the existing
   identity and admin settings flow with the smallest focused change.
2. **Create a second static Mux-only watermark.** Simpler, but would drift from
   the existing settings, rotation, and text behavior.
3. **Replace the iframe with a custom Mux/HLS player.** Could control the full
   player surface, but changes the user-provided embed integration and is out
   of scope for this temporary cost-saving switch.

## Behavior and Boundaries

- The normal Mux watch surface shows the same watermark text supplied to the
  Tencent player, including the existing whitelist-derived identity behavior.
- Existing watermark settings continue to control opacity and size; no schema,
  endpoint, or admin UI change is required.
- The Mux iframe URL, permissions, and `allowfullscreen` behavior remain
  unchanged.
- A native fullscreen action inside a cross-origin Mux iframe may not retain a
  parent-page overlay. This is a browser isolation limitation, not a security
  guarantee. The watermark remains a client-side deterrent, as it is for the
  existing player.

## Validation

- Component test proves `TemporaryMuxPlayer` receives and renders the shared
  watermark component alongside the approved iframe contract.
- Component test proves the Mux branch in `WatchPageClient` passes the same
  `watermarkText` it receives.
- Focused Mux, watch-page, and Tencent playback tests remain green.
