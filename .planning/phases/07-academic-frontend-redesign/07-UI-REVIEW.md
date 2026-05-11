# Phase 7 UI Review: Academic Frontend Redesign

Date: 2026-05-11
Scope: Phase 7 implemented frontend surfaces, current code after recent branding updates.
Baseline: `.planning/phases/07-academic-frontend-redesign/UI-SPEC.md`

## Overall Score

Overall: 17/24

| Pillar | Score |
|--------|-------|
| Copywriting | 2/4 |
| Visuals | 3/4 |
| Color | 3/4 |
| Typography | 3/4 |
| Spacing | 3/4 |
| Experience Design | 3/4 |

## Summary

The redesigned frontend largely satisfies the formal institute direction: shared academic tokens exist, primary routes use restrained panels and operational layouts, cards stay compact, and the watch/meeting flows preserve their functional priorities. The strongest remaining visual risk is language and content consistency. Several primary user surfaces still mix English system copy with Vietnamese/localized copy, while the latest homepage simplification now underuses the "usable portal first" contract by making the first screen mostly logo plus actions.

Automated screenshot verification could not be completed in this session. Playwright MCP is available, but browser launch failed because the Chromium executable is not installed under `ms-playwright`. This review therefore treats screenshot coverage as blocked, consistent with the Phase 7 verification notes.

## Findings

### Copywriting - 2/4

Finding: Mixed English and Vietnamese copy remains across the redesigned primary surfaces.

Evidence:
- `src/components/course/CoursesListClient.tsx` uses "Course Registry" and "available" alongside localized course text.
- `src/components/course/CourseCard.tsx` uses "Institute Course".
- `src/components/course/CourseDetailClient.tsx` uses "Course Outline", "Open access", "Enrolled", "Lesson", and "Course materials are not published yet."
- `src/components/course/WatchPageClient.tsx` uses "Secure Lecture Playback", "Watermarked", and "views".
- `src/components/course/VideoSidebarWrapper.tsx` uses "Course Videos".
- `src/app/meeting/page.tsx` and `src/app/auth/signin/page.tsx` still use English state labels.

Impact:
The institute brand now reads Vietnamese on the homepage and navbar, but the next click moves users back into English UI chrome. This weakens perceived polish and creates avoidable cognitive switching for learners.

Recommended fix:
Move these literals into the existing language dictionary and provide Vietnamese strings for the current production locale. Prioritize course list, course detail, watch, meeting, and sign-in states before secondary admin copy.

### Visuals - 3/4

Finding: The implementation follows the formal academic style, but the homepage has become too sparse for the route contract.

Evidence:
- `src/app/page.tsx` now centers the remote logo and "VIEN PHUONG NAM" label in a large panel.
- `UI-SPEC.md` says `/` should be an academic portal entry with quick access to courses, meeting, admin if applicable, and browser support notice.
- The current homepage still has quick actions, but removed the visible readiness/support context and relies on a console notice.

Impact:
The page is cleaner and brand-forward, but it no longer communicates much operational context to learners. It risks feeling like a splash screen rather than a portal entry.

Recommended fix:
Keep the centered logo treatment, but add a compact Vietnamese action/status row or unobtrusive portal metadata near the existing action band. Avoid restoring the removed card trio.

### Color - 3/4

Finding: The palette matches the UI spec and avoids obvious one-note styling, with minor semantic-color drift in support/status states.

Evidence:
- `src/app/globals.css` defines neutral paper, ink, institutional green, burgundy accent, and gold/chart accents.
- Primary route components use `primary`, `secondary`, `muted`, `border`, and `card` tokens instead of hard-coded brand colors.
- Some support/status details still use direct green/yellow/blue utility colors in support ticket components.

Impact:
The main visual system is coherent. Direct status utilities are acceptable for semantic states, but should remain bounded so they do not fragment the institutional palette.

Recommended fix:
When support surfaces are touched next, map ticket statuses to tokenized semantic variants or a small status helper so repeated colors stay consistent.

### Typography - 3/4

Finding: Typography hierarchy is generally well-scaled for operational UI, with a few uppercase kicker labels and English labels creating visual noise.

Evidence:
- Page headings use compact `text-3xl` and `text-xl` scales rather than oversized marketing hero type.
- The homepage uses `text-2xl`/`sm:text-4xl`, appropriate for a brand mark.
- Kicker labels use high letter spacing through `academic-kicker` and component-local `tracking-[0.14em]`.

Impact:
Hierarchy is readable and restrained. The repeated uppercase English kicker labels make the system feel less localized and slightly more template-like.

Recommended fix:
Translate or reduce kicker usage on learner surfaces. Keep uppercase tracking for short Vietnamese labels only where it still reads cleanly.

### Spacing - 3/4

Finding: Layout spacing is stable and responsive, but the watch mobile controls need screenshot verification.

Evidence:
- Shared `academic-container`, `academic-panel`, and grid classes provide stable page rhythm.
- Course cards use fixed minimum heights and aspect-ratio thumbnails.
- Watch page uses `h-[calc(100vh-4rem)]`, a fixed desktop sidebar, and a mobile slide-over drawer.

Impact:
The desktop structure is solid. The mobile watch page has multiple fixed/floating layers: browser banner, player area, support button, and course video drawer button. Without screenshots, overlap risk remains unresolved.

Recommended fix:
Run mobile screenshot checks for `/watch/<videoId>` with the sidebar drawer open and IPR overlay visible. If overlap appears, reserve bottom inset space or reposition the course video button.

### Experience Design - 3/4

Finding: Core workflows remain intact, but visual verification and localized user feedback are incomplete.

Evidence:
- Phase 7 verification confirms lint, typecheck, tests, build, and secret scan command coverage.
- `docs/ui-screenshot-checklist.md` still has all rows marked `not run`.
- Playwright MCP launch failed in this audit because the browser executable is missing.
- Functional entry points are preserved: courses, meeting, admin, sign-in, watch sidebar, support dialog.

Impact:
The implementation is likely usable, but UI-07 is not truly closed from a visual quality standpoint. Code contract tests cannot catch mobile overlap, real thumbnail behavior, long Vietnamese text wrapping, or production asset loading.

Recommended fix:
Install Playwright browsers or configure an equivalent browser automation path, then update `docs/ui-screenshot-checklist.md` with actual pass/fail evidence for desktop and mobile rows.

## Automated UI Verification

Attempted:

```text
mcp__playwright__.playwright_navigate
URL: https://elearning.vienphuongnam.com.vn/
Viewport: 1440x900
```

Result:

```text
Blocked: Chromium headless shell executable is not installed in ms-playwright.
```

Status:
`blocked: missing browser automation tooling`

## Top Fixes

1. Translate remaining learner-facing English strings and move them into the existing language dictionary.
2. Add a compact Vietnamese portal context/status area on the homepage without restoring the removed card trio.
3. Install/configure Playwright browser binaries and complete the screenshot checklist for `/`, `/courses`, course detail, watch, meeting, sign-in, and support dialog.

## Next

- `$gsd-verify-work 7` - UAT testing for Phase 7.
- Fix the three top items above, then rerun `$gsd-ui-review 7`.
