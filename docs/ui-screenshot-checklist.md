# UI Screenshot Checklist

Phase 7 uses this checklist for UI-07. Capture desktop and mobile screenshots after starting a local or staging build with representative test data.

Allowed status values:

- `not run`
- `pass`
- `fail`
- `blocked: missing browser automation tooling`
- `blocked: missing credentials/service access`

| ID | Surface | Viewport | Route/State | Status | Evidence |
|----|---------|----------|-------------|--------|----------|
| UI-HOME-D | Portal home | Desktop 1440x900 | `/` signed out | pass | `.planning/phases/07-academic-frontend-redesign/screenshots/execute-design-home-desktop-2026-05-11T12-30-50-786Z.png` |
| UI-HOME-M | Portal home | Mobile 390x844 | `/` signed out | pass | `.planning/phases/07-academic-frontend-redesign/screenshots/execute-design-home-mobile-2026-05-11T12-31-15-288Z.png` |
| UI-COURSES-D | Course catalog | Desktop 1440x900 | `/courses` with courses and empty state | blocked: missing credentials/service access | Requires authenticated test session and representative course data. |
| UI-COURSES-M | Course catalog | Mobile 390x844 | `/courses` with courses and empty state | blocked: missing credentials/service access | `/courses` redirects to sign-in without a test session. |
| UI-COURSE-D | Course detail | Desktop 1440x900 | `/courses/<courseId>` open, enrolled, and locked states | blocked: missing credentials/service access | Requires authenticated test session and representative course data. |
| UI-COURSE-M | Course detail | Mobile 390x844 | `/courses/<courseId>` open, enrolled, and locked states | blocked: missing credentials/service access | Requires authenticated test session and representative course data. |
| UI-WATCH-D | Watch page | Desktop 1440x900 | `/watch/<videoId>` before and after IPR consent | blocked: missing credentials/service access | Requires authenticated entitlement and representative video data. |
| UI-WATCH-M | Watch page | Mobile 390x844 | `/watch/<videoId>` sidebar drawer and playback shell | blocked: missing credentials/service access | Requires authenticated entitlement and representative video data. |
| UI-MEETING-D | Meeting page | Desktop 1440x900 | `/meeting` loading, error, and iframe-ready states | blocked: missing credentials/service access | Requires authenticated Zoom-capable test session and meeting env. |
| UI-AUTH-M | Auth page | Mobile 390x844 | `/auth/signin` default and error states | pass | `.planning/phases/07-academic-frontend-redesign/screenshots/execute-design-signin-mobile-2026-05-11T12-31-32-781Z.png` |
| UI-SUPPORT-D | Support dialog | Desktop 1440x900 | Floating support button, submit tab, history tab | blocked: missing credentials/service access | Submit/history states require session and reCAPTCHA/service setup for full validation. |

If Playwright or another browser automation tool is unavailable, mark screenshot capture rows as `blocked: missing browser automation tooling` and keep lint/type/test/build evidence in the phase verification.
