---
phase: 7
slug: academic-frontend-redesign
status: approved
shadcn_initialized: true
preset: design-md-apple-style
created: 2026-05-11
---

# Phase 7 - UI Design Contract

Visual and interaction contract for Phase 7 after the `DESIGN.md` re-baseline. This replaces the earlier academic-only contract with a sharper split:

- Learner/public surfaces should follow `DESIGN.md`'s Apple-like product-gallery system.
- Secure playback, meeting, support, and admin surfaces must preserve operational density and workflow safety while adopting compatible tokens.

## Authority And Scope

Primary visual baseline: `DESIGN.md`.

Implementation context:
- Phase 7 goal remains: preserve existing course, watch, admin, meeting, support, auth, and system workflows.
- `07-CONTEXT.md` user decisions remain binding for security and workflow preservation.
- `07-UI-REVIEW.md` identified the current implementation as coherent but misaligned with `DESIGN.md`; this spec resolves that conflict by making `DESIGN.md` the visual target.

Route priority:

| Surface | Contract Mode |
|---------|---------------|
| `/` | Full `DESIGN.md` learner entry surface. |
| `/courses` | Product-gallery/course catalog adaptation. |
| `/courses/[courseId]` | Product-detail/course outline adaptation. |
| `/auth/signin` | Minimal Apple-style access panel. |
| Support dialog | Apple-style floating utility overlay, not a heavy dashboard modal. |
| `/watch/[videoId]` | Operational player shell with compatible tokens; player remains dominant. |
| `/meeting` | Minimal loading/error states; iframe remains full-screen when ready. |
| Admin | Preserve dense operational UI; only global tokens/nav should harmonize. |

## Design System

| Property | Value |
|----------|-------|
| Tool | Tailwind CSS with existing shadcn-style components |
| Preset | `DESIGN.md` Apple-style product/gallery system |
| Component library | Radix/shadcn primitives already present |
| Icon library | lucide-react |
| Font | `system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", sans-serif` |

Design principles:
- Use photography or real course/media imagery as the primary visual signal on learner entry/catalog/detail pages.
- UI chrome should recede. Avoid heavy borders, decorative panels, nested cards, and dashboard-like hero framing on public learner surfaces.
- Use full-bleed light/parchment/dark bands for page rhythm. Surface color change is the section divider.
- Keep existing IDs, `data-tour` attributes, auth flows, entitlement checks, DRM player behavior, Zoom iframe behavior, and support ticket behavior unchanged.

## Spacing Scale

Declared values:

| Token | Value | Usage |
|-------|-------|-------|
| xxs | 4px | Icon gaps, label offsets |
| xs | 8px | Button vertical padding, compact controls |
| sm | 12px | Inline groups, small form gaps |
| md | 17px | Body rhythm, paragraph line constants |
| lg | 24px | Utility card padding, card gutters |
| xl | 32px | Container padding, panel groups |
| 2xl | 48px | Mobile/tight section padding |
| 3xl | 64px | Hero breathing room |
| section | 80px | Desktop full-bleed tile vertical padding |

Exceptions:
- Watch page may use viewport-based sizing to preserve player priority.
- Meeting iframe ready state must remain fixed/full-screen.
- Admin pages may keep compact operational spacing for table density.

Layout rules:
- Public learner sections use full-width bands or unframed constrained content, not floating page cards.
- Full-bleed learner tiles use 0 radius and no border.
- Course utility grids use 20-24px gutters and collapse 3/4 columns to 1 column on mobile.
- Touch targets must be at least 44px high for primary actions and floating controls.
- Fixed/floating mobile controls must reserve enough inset to avoid support button, player controls, and drawer overlap.

## Typography

| Role | Size | Weight | Line Height | Letter Spacing | Usage |
|------|------|--------|-------------|----------------|-------|
| Hero display | 56px desktop, 34px mobile, 28px small phone | 600 | 1.07-1.10 | -0.28px desktop | Home/product-course tile headline |
| Display | 40px desktop, 34px tablet, 28px mobile | 600 | 1.10-1.19 | 0 to -0.28px | Catalog/detail section headings |
| Lead | 24-28px | 300-400 | 1.14-1.50 | 0 to 0.196px | One-line learner value statement |
| Body | 17px | 400 | 1.47 | -0.01em max | Paragraphs, form copy, route descriptions |
| Body strong | 17px | 600 | 1.24 | -0.01em max | Course titles, active metadata |
| Caption | 14px | 400-600 | 1.29-1.43 | 0 | Button labels, secondary metadata |
| Nav | 12px | 400 | 1.0 | 0 | Global navigation |

Typography rules:
- Do not use hero-scale text inside compact panels, modals, watch metadata bars, or admin tables.
- Avoid uppercase kicker labels on learner routes unless they are short, localized, and visually quiet.
- Learner-facing copy must be consistently Vietnamese unless a product/legal term intentionally remains English.
- Remove or translate current mixed labels such as "Course Registry", "Institute Course", "Course Outline", "Secure Lecture Playback", "Support Desk", and "Institute Access".

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant canvas | `#ffffff` | Light full-bleed tiles, utility cards, form surfaces |
| Secondary canvas | `#f5f5f7` | Alternating parchment bands, footer, frosted bars |
| Dark tile | `#272729`, `#2a2a2c`, `#252527` | Dark learner tiles, player-adjacent shell sections |
| Ink | `#1d1d1f` | Primary text on light surfaces |
| Muted ink | `#333333`, `#7a7a7a` | Secondary text, legal/help copy |
| On dark | `#ffffff`, `#cccccc` | Dark tile text |
| Primary action | `#0066cc` | All primary links, pill CTAs, focus signal |
| Action on dark | `#2997ff` | Links on dark tiles only |
| Focus | `#0071e3` | Keyboard focus rings |
| Hairline | `#e0e0e0` | Utility cards and frosted bar separators |
| Destructive | Existing destructive token | Errors and destructive admin actions only |

Accent reserved for:
- Primary action links and buttons.
- Focus rings.
- Selected controls.

Color rules:
- Do not use institutional green, burgundy, or gold as the dominant interactive system on learner/public surfaces if `DESIGN.md` is the target.
- Institute brand colors may appear in the logo or tiny institutional marks, but not as a second action grammar.
- Avoid decorative gradients, orbs, bokeh, and textured grid backgrounds on learner/public surfaces.
- Dark mode must not invent a separate palette for learner pages; prefer explicit light/dark tile sections from this contract.

## Components

### Navigation

Global nav:
- Height: 44px.
- Surface: true black (`#000000`) for global nav on learner routes.
- Text: 12px, quiet, compact.
- Mobile: collapse to logo/menu/actions at tablet width.
- Do not add heavy borders or card-like nav surfaces.

Sub-nav:
- Height: about 52px.
- Surface: parchment at about 80% opacity with backdrop blur.
- Left: current surface title, 21px/600.
- Right: compact route actions ending in the primary pill where useful.

### Buttons

Primary button:
- Blue pill, `#0066cc`, 9999px radius.
- 17px/400 text.
- 11px x 22px padding.
- Active/pressed: `transform: scale(0.95)`.
- Focus: 2px `#0071e3` outline.

Secondary button:
- Transparent or pearl surface.
- Blue text and, where needed, blue 1px border.
- Same pill shape as primary when paired with primary CTA.

Icon controls:
- Use lucide icons.
- Minimum 44px square.
- Circular controls may float over imagery with translucent neutral fill.

### Tiles And Cards

Full-bleed learner tiles:
- 0px radius.
- No border.
- No card shadow.
- 80px desktop vertical padding, 48px mobile.
- Centered headline, one-line supporting copy, CTA pair, and relevant image/media.

Course catalog utility cards:
- Use only for repeated course items.
- White surface, 1px hairline, 18px radius only if following the `DESIGN.md` utility-card grammar.
- No shadow by default.
- Image area should be stable with `aspect-ratio` and responsive `sizes`.

Operational panels:
- Watch, support, meeting, and admin may use bounded panels where workflow clarity requires it.
- Panels must not be nested.
- Radius should stay 8px or lower unless using the explicit utility-card grammar above.

### Media And Imagery

- Public learner surfaces need real course, institute, or media imagery. A logo-only first viewport is insufficient for the `DESIGN.md` target.
- Avoid blurred, dark, or purely atmospheric assets when users need to understand course content.
- Images must use stable dimensions and responsive constraints so layout does not shift.
- Product-style image shadow is allowed only on course/media imagery resting on a surface, never on cards, buttons, text, or nav.

## Copywriting Contract

Learner-facing UI language: Vietnamese by default.

| Element | Copy Contract |
|---------|---------------|
| Home H1 | Brand or literal learning portal name, not an explanatory slogan. |
| Home lead | One short sentence explaining secure learning access. |
| Primary CTA | Specific verb plus noun, for example "Vao khoa hoc" or localized equivalent. |
| Secondary CTA | Specific route action, for example meeting access or sign-in. |
| Empty state heading | Plain status plus next step. |
| Empty state body | Explain who can resolve it without exposing internal implementation. |
| Error state | Problem plus recovery action. |
| Destructive confirmation | Action name plus explicit confirmation phrase. |

Rules:
- Do not mix English scaffolding with Vietnamese learner flows.
- Keep copy compact on hero/tile surfaces.
- Support and auth copy should be calm and procedural, not marketing-heavy.
- Admin copy may remain denser, but should still avoid untranslated learner-facing strings where shared components appear.

## Route Coverage

| Route/Surface | Contract |
|---------------|----------|
| `/` | First viewport uses `DESIGN.md` tile grammar with brand, useful portal CTAs, and a visual asset beyond the logo. Avoid a floating card as the whole experience. |
| `/courses` | Course catalog adapts store/accessory grid grammar: clear title, count/access state, course imagery, compact CTAs, and empty state. |
| `/courses/[courseId]` | Course detail behaves like a product/detail page: title, concise metadata, access state, video list, and stable watch buttons. |
| `/watch/[videoId]` | Player remains primary. Apply compatible tokens, avoid decorative chrome, preserve DRM, watermark, IPR overlay, sidebar, heartbeat, fullscreen, and support access. |
| `/meeting` | Loading/error states use minimal design language. Ready state remains full-screen iframe with no extra chrome. |
| `/auth/signin` | Minimal access surface with translated copy, one Google action, clear error states, and no dashboard card excess. |
| Support dialog | Floating support action remains available outside meeting. Dialog uses compact Apple-style utility overlay treatment and translated tabs. |
| Admin | No broad rewrite. Shared nav/tokens must not reduce density, table scan speed, or destructive-action clarity. |

## Accessibility And Interaction

- Preserve keyboard focus visibility on every interactive element.
- Preserve semantic buttons and links; do not replace controls with non-semantic divs.
- Buttons must not resize when loading text/spinners appear.
- Long Vietnamese strings must wrap or truncate intentionally without overlapping controls.
- Mobile watch page must be tested with support button, course drawer, player controls, and IPR overlay visible.
- Meeting iframe must keep `allow` permissions required by Zoom.
- Client-side anti-recording UI remains deterrence/telemetry only; do not imply it is a hard security boundary.

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn local primitives | Button, Card, Dialog, Alert, Badge, ScrollArea, form primitives | Allowed; preserve existing variants and accessibility behavior |
| Radix local primitives | Dialog, dropdown, select, checkbox, scroll area | Allowed; do not replace with unvetted components |
| Third-party UI blocks | None approved | Requires manual diff review and security/accessibility check before use |

## Verification Contract

- Lint, typecheck, Jest, build, and secret scan remain passing after implementation.
- UI contract tests should assert the selected design hooks/tokens on touched routes.
- Screenshot checklist must include desktop and mobile evidence for `/`, `/courses`, `/courses/[courseId]`, `/watch/[videoId]`, `/meeting`, `/auth/signin`, and support dialog.
- Authenticated screenshots require seeded credentials and representative course/video data. If unavailable, mark rows `blocked: missing credentials/service access`.
- Visual review must explicitly compare learner/public surfaces against `DESIGN.md`, not the older academic-only interpretation.

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS with requirement to localize learner-facing English scaffolding.
- [x] Dimension 2 Visuals: PASS with `DESIGN.md` as visual target and operational exceptions documented.
- [x] Dimension 3 Color: PASS with single blue learner action grammar documented.
- [x] Dimension 4 Typography: PASS with explicit roles and responsive sizing.
- [x] Dimension 5 Spacing: PASS with full-bleed tile rhythm and operational exceptions.
- [x] Dimension 6 Registry Safety: PASS with local shadcn/Radix reuse and third-party block gate.

Approval: approved 2026-05-11
