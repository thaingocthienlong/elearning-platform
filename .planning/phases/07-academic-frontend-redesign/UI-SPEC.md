# UI-SPEC: Academic Frontend Redesign

## Purpose

Define the visual and interaction contract for Phase 7 so the redesign is formal, credible, and maintainable while preserving the platform's secure streaming workflows.

## Visual Direction

- The app should feel like an institute learning portal: formal, calm, reliable, and oriented around learning operations.
- Use restrained surfaces and clear hierarchy, not oversized marketing blocks.
- Primary colors:
  - Paper background: off-white/white.
  - Ink foreground: near-black neutral.
  - Institutional green: primary actions and active states.
  - Burgundy: secondary institutional accent.
  - Gold: small status/accent use only.
- Cards must stay at 8px radius or less unless inherited UI primitives require less churn.
- Avoid decorative orbs, bokeh, heavy gradients, and one-note palettes.

## Layout Principles

- Global navigation stays fixed and compact.
- First screen is the usable portal experience, not a marketing landing page.
- Course pages use structured academic hierarchy: heading, access state, course count, course/video list, clear action.
- Watch page prioritizes the player and course navigation, with support/security context visually quiet.
- Meeting page keeps the full-screen iframe path after setup; loading and error states should match the academic design.
- Support/auth pages use the same institutional surfaces and button styling.

## Component Rules

- Reuse existing `Button`, `Card`, `Dialog`, `Alert`, `Badge`, `ScrollArea`, and lucide icons.
- Use icons for navigation/action affordances where available.
- Avoid cards inside cards.
- Keep text sizes appropriate for containers; do not use hero-scale type inside compact panels.
- Preserve IDs/data-tour attributes used by existing onboarding flows.

## Route Coverage

| Route/Surface | Contract |
|---------------|----------|
| `/` | Academic portal entry with quick access to courses, meeting, admin if applicable, and browser support notice. |
| `/courses` | Course catalog layout with formal heading, counts, access-state cards, and empty state. |
| `/courses/[courseId]` | Course outline with access badge, video count, locked/open states, and stable watch buttons. |
| `/watch/[videoId]` | Academic shell around DRM player; sidebar navigation preserved; fullscreen remains clean. |
| `/meeting` | Formal loading/error states; iframe remains full-screen once ready. |
| `/auth/signin` | Formal sign-in panel with Google action and error states. |
| Support dialog | Floating support action remains available outside meeting; dialog matches institute styling. |
| Admin | No full rewrite in this phase; global tokens/nav should not make admin pages less dense or scannable. |

## Verification Contract

- Lint, typecheck, Jest, build, and secret scan remain passing.
- UI contract tests verify key redesigned files contain the expected shared classes/route hooks.
- Screenshot checklist documents desktop and mobile captures for `/`, `/courses`, `/courses/[courseId]`, `/watch/[videoId]`, `/meeting`, `/auth/signin`, and support dialog.
- If Playwright is unavailable, record that screenshot capture is blocked by missing browser automation tooling rather than claiming visual regression pass.
