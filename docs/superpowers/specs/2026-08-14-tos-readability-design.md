# TOS Readability Refinement Design

**Status:** Approved in conversation (option A)
**Date:** 2026-08-14
**Scope:** Typography and responsive layout of the existing TOS consent dialog

## Context

The four Terms of Service clauses currently render at `text-sm` (14px), with
`text-muted-foreground`, inside a desktop dialog capped at `42rem`. In the
light theme the muted token is approximately 4.27:1 against white, below the
WCAG AA 4.5:1 threshold for normal-size text. The resulting legal copy is too
small and visually faint in the supplied 1920x994 desktop screenshot.

## Approved Direction

- Enlarge the legal body copy to 35px on desktop, exactly 2.5 times the current
  14px size.
- Use a responsive 20px / 24px / 35px scale so phones and zoomed layouts remain
  readable without extremely narrow line lengths.
- Render legal copy with `text-foreground` and a 1.55 line height.
- Expand the dialog to a maximum of `80rem` while retaining viewport gutters.
- Limit the prose measure to `68ch` and increase list padding and clause spacing.
- Increase the title, description, reading status, checkbox label, and actions
  enough to preserve a clear hierarchy around the enlarged legal copy.
- Give the scroll region more space on desktop and a smaller responsive height
  on phones so the confirmation controls remain reachable.

## Responsive Contract

| Viewport role | Legal body | Supporting copy | Dialog behavior |
| --- | --- | --- | --- |
| Phone | 20px | 16px | Viewport gutters, compact scroll region, stacked actions |
| Tablet / zoomed desktop | 24px | 18px | Wider dialog, medium scroll region |
| Desktop (`lg`) | 35px | 20px | Up to `80rem`, scroll region up to `min(58vh, 42rem)` |

The title scales from 24px to 44px. The legal body remains the dominant reading
surface; supporting labels do not scale by 2.5 times because doing so would
erase hierarchy and make mobile controls unusable.

## Preserved Behavior

- Do not change any TOS wording, translation key, `TOS_VERSION`, cookie, or
  24-hour access rule.
- Do not change scroll-to-end measurement, checkbox gating, refusal, acceptance,
  or retry behavior.
- Do not modify shared dialog primitives; scope all visual changes to
  `TosConsentDialog`.
- Add no dependency and no new design token.

## Verification

- A component regression test proves the legal list is no longer 14px/muted and
  carries the approved responsive size and foreground classes.
- Existing consent interaction tests continue to pass.
- Run scoped lint, typecheck, and the Impeccable type detector.
- Inspect rendered desktop and phone layouts for computed font size, contrast,
  wrapping, scrolling, reachable controls, and absence of horizontal overflow.
