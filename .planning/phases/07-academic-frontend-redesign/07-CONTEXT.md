# Phase 7 Context: Academic Frontend Redesign

## Phase Goal

Users experience the existing course, watch, meeting, support, auth, and system workflows through a formal institute-style frontend without workflow regressions.

## Requirements

- UI-01: Frontend visual direction is redesigned into a formal institute/academic style while preserving existing routes and workflows.
- UI-02: Course browsing and course detail pages support a credible academic learning experience with clear hierarchy and access state.
- UI-03: Watch page preserves DRM playback, watermarking, sidebar/course navigation, and security controls while receiving the new visual system.
- UI-04: Admin pages remain dense, scannable, and operational rather than marketing-style.
- UI-05: Meeting page preserves the existing Zoom join flow while matching the academic visual system.
- UI-06: Support/auth/system pages match the redesigned institute style and remain accessible on mobile and desktop.
- UI-07: Visual regression or screenshot checks cover primary redesigned pages after implementation.

## User Decisions

1. Visual direction: formal institute style with restrained academic palette, dense operational UI, and preserved workflows.
2. Initial redesign scope: primary user routes first - home, courses, course detail, watch, meeting, support/auth.
3. Verification: screenshot-capable coverage where feasible.
4. Component strategy: reuse existing shadcn/Radix/lucide patterns and restyle them.

## Current Frontend Shape

- App uses Next.js App Router, Tailwind, shadcn-style Radix components, lucide icons, and `next-themes`.
- Primary user pages are `src/app/page.tsx`, `src/app/courses/page.tsx`, `src/app/courses/[courseId]/page.tsx`, `src/app/watch/[videoId]/page.tsx`, `src/app/meeting/page.tsx`, and `src/app/auth/signin/page.tsx`.
- Course UI is split into `CoursesListClient`, `CourseCard`, `CourseDetailClient`, `WatchPageClient`, `VideoSidebarWrapper`, and `VideoSidebar`.
- Support UI is a floating `ReportButton` with `SubmitTicketForm` and ticket history.
- Global navigation is `Navbar`.

## Design Contract Summary

- Style: formal institute portal, quiet and work-focused.
- Palette: neutral paper/white foundation, ink text, institutional green, burgundy accent, restrained gold accent. Avoid one-hue dominance and avoid decorative orb/background effects.
- Layout: dense but clear dashboards and page bands, not marketing hero pages or nested cards.
- Controls: keep lucide icons in buttons and existing shadcn/Radix interaction patterns.
- Accessibility: no overlapping text, stable button sizes, responsive constraints, visible focus states, and readable mobile layouts.
- Watch page: keep DRM player, watermark, sidebar, IPR overlay, session validation, and fullscreen behavior intact.
- Meeting page: preserve authenticated signature fetch and iframe join flow.

## Non-Goals

- Full admin redesign in this first pass.
- Replacing component libraries.
- Changing auth, DRM, Zoom, entitlement, support, or data-fetching behavior.
- Adding marketing landing pages.
