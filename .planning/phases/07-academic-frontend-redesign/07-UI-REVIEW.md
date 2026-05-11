# Phase 7 UI Review: Academic Frontend Redesign

Date: 2026-05-11
Scope: Phase 7 implemented frontend surfaces, reviewed against `DESIGN.md`.
Baseline: `DESIGN.md` Apple-style product/gallery design system, with `UI-SPEC.md` noted as the original Phase 7 contract where it conflicts.

## Overall Score

Overall: 10/24

| Pillar | Score |
|--------|-------|
| Copywriting | 2/4 |
| Visuals | 1/4 |
| Color | 1/4 |
| Typography | 2/4 |
| Spacing | 2/4 |
| Experience Design | 2/4 |

## Summary

The implemented Phase 7 UI is coherent as a formal institute portal, but it does not match `DESIGN.md`. The design document describes an Apple-like system: photography-first full-bleed product tiles, near-invisible chrome, black global navigation, a single blue action color, sparse section rhythm, SF-style typography, pill CTAs, and minimal shadows. The current code instead uses academic panels, bordered cards, institutional green/burgundy/gold tokens, visible utility chrome, and dense operational course layouts.

This creates an important product decision point: if `UI-SPEC.md` remains authoritative, the implementation is mostly aligned and only needs polish. If `DESIGN.md` is the new target, Phase 7 needs a redesign pass rather than small fixes.

## Findings

### Copywriting - 2/4

Finding: User-facing copy is not aligned with the sparse, product-led language model in `DESIGN.md`, and learner surfaces still mix Vietnamese with English system labels.

Evidence:
- `src/app/page.tsx` is minimal and localized, but only exposes "VIEN PHUONG NAM" plus actions.
- `src/components/course/CoursesListClient.tsx` uses "Course Registry" and "available".
- `src/components/course/CourseCard.tsx` uses "Institute Course".
- `src/components/course/CourseDetailClient.tsx` uses "Course Outline", "Open access", "Enrolled", "Lesson", and "Course materials are not published yet."
- `src/components/course/WatchPageClient.tsx` uses "Secure Lecture Playback", "Watermarked", and "views".
- `src/app/auth/signin/page.tsx` uses "Institute Access" inside an otherwise Vietnamese sign-in screen.

Impact:
The UI does not yet have a single voice. It reads as a translated academic application with English scaffolding still visible, not the crisp one-line product copy and CTA rhythm defined in `DESIGN.md`.

Recommended fix:
Choose the content voice before making visual edits. For a Vietnamese institute product, move learner-facing literals into the language dictionary and use concise Vietnamese labels. For a strict `DESIGN.md` pass, reduce page copy to short headline/tagline/action patterns.

### Visuals - 1/4

Finding: The implemented visual structure conflicts with `DESIGN.md`'s core visual model.

Evidence:
- `DESIGN.md` calls for photography-first, full-bleed rectangular tiles with UI receding.
- `src/app/page.tsx` uses a centered logo inside an `academic-panel`.
- `src/app/globals.css` defines `.academic-panel` as `rounded-lg border border-border/80 bg-card shadow-sm`.
- `src/components/course/CourseCard.tsx` uses bordered cards, hover shadows, small thumbnails, and visible academic metadata.
- `src/components/Navbar.tsx` uses a light frosted card nav, not the black 44px global nav described in `DESIGN.md`.

Impact:
The first impression is a conventional academic dashboard, not a high-polish Apple-like product surface. This is not a minor styling drift; the page architecture, navigation, surfaces, and image strategy point to a different design language.

Recommended fix:
If `DESIGN.md` is now the target, rebuild the public/home and catalog surfaces around full-bleed brand/course tiles, large high-quality imagery, pill CTAs, and a much quieter nav. Keep admin and watch operational, but give learner entry routes the designed visual chassis.

### Color - 1/4

Finding: The color system is intentionally academic, but it violates `DESIGN.md`'s single-accent Apple palette.

Evidence:
- `DESIGN.md` specifies one interactive blue accent, near-white/parchment surfaces, and near-black tiles.
- `src/app/globals.css` defines institutional green as `--primary`, burgundy as `--accent`, gold chart tokens, and a textured grid background.
- Buttons, badges, banners, and support controls use `primary` green rather than Apple action blue.
- Dark mode changes the brand palette rather than preserving the design document's light/dark tile rhythm.

Impact:
The current palette is coherent on its own terms, but it cannot score high against `DESIGN.md` because the accent, surface rhythm, and brand color grammar are different.

Recommended fix:
Decide whether to adopt `DESIGN.md` tokens. If yes, replace the academic green/burgundy action system with the blue/paper/near-black palette and reserve any institute brand colors for logo or content accents only.

### Typography - 2/4

Finding: Typography is restrained and readable, but does not implement the Apple-like type system in `DESIGN.md`.

Evidence:
- `DESIGN.md` specifies SF Pro-style stacks, 17px body text, 40-56px display headings, and very specific weight/line-height behavior.
- The implementation uses Tailwind/system defaults with `text-3xl`, `text-xl`, `text-sm`, `tracking-tight`, and uppercase `academic-kicker` labels.
- `src/app/page.tsx` uses `tracking-wide` on the brand title, while `DESIGN.md` emphasizes tight display tracking.
- Compact panels such as sign-in and meeting states correctly avoid oversized type, but they do not express the specified editorial/product hierarchy.

Impact:
The UI is legible and appropriate for the original academic spec. Against `DESIGN.md`, it lacks the signature display scale and typographic cadence.

Recommended fix:
Introduce explicit typography tokens before changing components: display, lead, body, caption, nav, and button. Then apply them consistently to home, catalog, course detail, auth, and support.

### Spacing - 2/4

Finding: Layout spacing is stable and responsive, but it follows dashboard spacing instead of the spacious full-bleed section rhythm in `DESIGN.md`.

Evidence:
- `DESIGN.md` expects sections with about 80px vertical padding, full-bleed tiles, and large image-to-copy separation.
- `src/app/page.tsx` uses a contained panel with `py-8 sm:py-12` and a bottom action band.
- Course surfaces use dense grids, cards, headers, and `p-3` to `p-5` operational spacing.
- Watch page spacing is suitable for player-first workflow, but includes fixed/floating mobile layers that still need authenticated screenshot verification.

Impact:
The spacing works for a portal application, but it does not create the museum-like product rhythm described by `DESIGN.md`.

Recommended fix:
For public learner entry routes, convert contained panels into full-width bands and reserve dense card spacing for authenticated course/admin workflows.

### Experience Design - 2/4

Finding: The implementation preserves critical workflows, but `DESIGN.md`'s expected experience is not the one users receive.

Evidence:
- Home, sign-in, support, meeting states, courses, and watch routes remain wired into the application workflows.
- The homepage is usable but sparse: logo, login, theme/language controls, and support.
- `/courses` redirects to sign-in without an authenticated session, so course catalog, detail, watch, and meeting-ready states could not be visually certified in this audit.
- `docs/ui-screenshot-checklist.md` still has authenticated course/watch/meeting/support rows not run.

Impact:
As an operational institute portal, the experience is functional. As an Apple-like product-gallery interface, it is incomplete because imagery, tile rhythm, catalog browsing presentation, and CTA grammar are missing.

Recommended fix:
Keep the authenticated workflow contracts intact, but create a clear route split: public/learner discovery routes can adopt the `DESIGN.md` visual system, while admin/watch routes keep dense operational ergonomics with matching tokens.

## Automated UI Verification

Local app started with:

```text
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Verified with Playwright MCP:

| Surface | Viewport | Result | Evidence |
|---------|----------|--------|----------|
| `/` | Desktop 1440x900 | Pass for render; fails `DESIGN.md` visual match | `.planning/phases/07-academic-frontend-redesign/screenshots/ui-review-design-home-desktop-2026-05-11T12-05-39-155Z.png` |
| `/` | Mobile 390x844 | Pass for render; fails `DESIGN.md` visual match | `.planning/phases/07-academic-frontend-redesign/screenshots/ui-review-design-home-mobile-2026-05-11T12-06-08-522Z.png` |
| `/auth/signin` | Mobile 390x844 | Pass for render; copy/design mismatch remains | `.planning/phases/07-academic-frontend-redesign/screenshots/ui-review-design-signin-mobile-2026-05-11T12-05-50-597Z.png` |
| `/courses` | Mobile 390x844 | Blocked for catalog review | Redirected to sign-in because no authenticated test session was available. |

Observed public-page text:

```text
Homepage: Đổi giao diện, VI, VIỆN PHƯƠNG NAM, Đăng nhập, Báo Cáo Vấn Đề
Sign-in: Đổi giao diện, Institute Access, Chào mừng trở lại, Nhập email để đăng nhập vào tài khoản, Đăng nhập với Google, Báo Lỗi
```

Authenticated course, course detail, watch, meeting-ready, and support-history states still require a test account/session and representative data before they can be marked visually verified.

## Top Fixes

1. Resolve the design authority conflict: keep `UI-SPEC.md` academic direction or replace it with `DESIGN.md` as the new Phase 7 target.
2. If `DESIGN.md` wins, rebuild public learner surfaces around full-bleed imagery, black/frosted nav, single blue accent, pill CTAs, and sparse product-tile rhythm.
3. Localize remaining English learner-facing strings or intentionally rewrite all visible copy into the concise `DESIGN.md` product-copy style.
4. Complete authenticated screenshot coverage with seeded credentials/data for `/courses`, course detail, watch, meeting, and support dialog.

## Next

- `$gsd-verify-work 7` - UAT testing for the original Phase 7 academic contract.
- Create a follow-up UI phase if `DESIGN.md` is the new target, because the current implementation is a different design system rather than a near-miss.
