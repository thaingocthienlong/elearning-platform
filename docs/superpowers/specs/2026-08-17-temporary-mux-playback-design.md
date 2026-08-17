# Temporary Mux Playback for Sessions 1–4

**Status:** Approved on 2026-08-17

## Purpose

Tencent VOD processing is temporarily too expensive for the four existing session recordings. Serve those recordings through the supplied public Mux player embeds without changing Tencent upload, processing, webhook, or data-management flows.

## Scope

The authenticated watch page will select a Mux iframe only when the normalized video title is exactly `video buoi 1`, `video buoi 2`, `video buoi 3`, or `video buoi 4`. Case, Vietnamese accents, and repeated whitespace are normalized before comparison. Every other video retains the existing Tencent DRM/Shaka playback path.

| Video title | Mux playback ID | Player source |
| --- | --- | --- |
| Video buổi 1 | `Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc` | `https://player.mux.com/Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc?metadata-video-title=video1448353709&video-title=video1448353709` |
| Video buổi 2 | `rcckJNkDpVjKGcZz9kD3gFQ00j75pJMZOoWm4Z01HbFkI` | `https://player.mux.com/rcckJNkDpVjKGcZz9kD3gFQ00j75pJMZOoWm4Z01HbFkI?metadata-video-title=video1293633231&video-title=video1293633231` |
| Video buổi 3 | `uTpirfGCW8hzK02FkCJYvj4eXWeb4bkYKAMgG02tlH6bw` | `https://player.mux.com/uTpirfGCW8hzK02FkCJYvj4eXWeb4bkYKAMgG02tlH6bw?metadata-video-title=video1634486089&video-title=video1634486089` |
| Video buổi 4 | `F01QluvVYbhckxauduQkF69leqZ3aERdhEcGsxSEJnVc` | `https://player.mux.com/F01QluvVYbhckxauduQkF69leqZ3aERdhEcGsxSEJnVc?metadata-video-title=video1558523669&video-title=video1558523669` |

## Architecture

Add one server-safe, pure resolver that owns the title-to-Mux mapping and returns either a typed embed configuration or `null`. The watch server component continues to authenticate the session, require TOS acceptance, and evaluate media entitlement before it calls the resolver. It passes the result to the client watch shell.

The client watch shell conditionally renders a focused Mux iframe component inside the existing 16:9 player area. The iframe uses the supplied source URL, `allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"`, and `allowFullScreen`. The trailing semicolon is retained exactly as supplied. When the resolver returns `null`, the current `DRMPlayerWrapper` remains unchanged.

## Security and operational boundary

The application-level session, TOS, enrollment, direct-access, and view-limit checks still run before any Mux iframe is sent to the browser. Tencent operations are not called or reconfigured by this change; no existing Tencent video is encoded or reprocessed.

The supplied Mux Playback IDs are public iframe sources. They do not inherit Tencent DRM, Shaka controls, or the in-player watermark. A viewer who receives an embed URL can access it outside the application. This is an explicit temporary trade-off to avoid Tencent encoding cost and must be removed before requiring DRM-grade protection for these recordings.

## Error handling

Resolver inputs that are missing or do not match one of the four exact normalized titles return `null` and use the normal Tencent path. The Mux component has no provider-side API call, so it does not add a client-side retry or change video readiness state. Browser iframe load failures remain visible in the embedded player and do not trigger Tencent fallback or media processing.

## Verification

Automated tests will prove that each normalized title maps to the intended playback ID and exact embed URL, unrelated titles resolve to `null`, the Mux branch emits the required iframe attributes, and the Tencent DRM player remains the fallback. Typecheck, relevant Jest tests, lint, and a production build will be run after implementation.

## Out of scope

This temporary change does not alter Prisma models, mutate database rows, add Mux upload or signed-playback support, remove Tencent VOD, reconfigure Tencent processing templates, or modify the current Phase 10.1 cost-safety implementation plan.
