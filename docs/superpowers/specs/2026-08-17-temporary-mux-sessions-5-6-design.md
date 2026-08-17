# Temporary Mux Sessions 5 and 6 Design

**Date:** 2026-08-17  
**Status:** Approved for implementation

## Goal

Extend the temporary Mux playback override to sessions 5 and 6 while preserving
the existing protected watch flow and watermark behavior.

## Chosen Approach

Add two exact Mux entries to `src/lib/temporary-mux-playback.ts`, with aliases
for the deployed session titles:

- `Buoi 5 - Sang 17.08.2026`
- `Buoi 6 - Chieu 17.08.2026`

The resolver remains title-based. Both matching sessions use the supplied Mux
iframe data, regardless of whether the corresponding video has Tencent media.
This intentionally makes session 5 use Mux now even though it already has a
Tencent asset. Session 6 uses Mux until a later provider switch is requested.

## Boundaries

- Do not change `TemporaryMuxPlayer`, watermark rendering, entitlement checks,
  or the Tencent playback path.
- Keep the supplied Mux player URLs, metadata title query strings, and existing
  iframe permission contract unchanged.
- A later Tencent migration for session 6 requires removing its Mux playback
  entry and title alias. The current resolver cannot select Tencent dynamically
  based on its readiness without a separate provider-selection design.

## Validation

- Unit tests cover the canonical `Video buoi 5` and `Video buoi 6` titles,
  their deployed title aliases, and the exact playback IDs, URLs, and iframe
  titles.
- The non-session regression uses `Video buoi 7` to prove unmatched titles
  continue to the Tencent path.
