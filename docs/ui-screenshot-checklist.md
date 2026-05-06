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
| UI-HOME-D | Portal home | Desktop 1440x900 | `/` signed in and signed out | not run | |
| UI-HOME-M | Portal home | Mobile 390x844 | `/` signed in and signed out | not run | |
| UI-COURSES-D | Course catalog | Desktop 1440x900 | `/courses` with courses and empty state | not run | |
| UI-COURSES-M | Course catalog | Mobile 390x844 | `/courses` with courses and empty state | not run | |
| UI-COURSE-D | Course detail | Desktop 1440x900 | `/courses/<courseId>` open, enrolled, and locked states | not run | |
| UI-COURSE-M | Course detail | Mobile 390x844 | `/courses/<courseId>` open, enrolled, and locked states | not run | |
| UI-WATCH-D | Watch page | Desktop 1440x900 | `/watch/<videoId>` before and after IPR consent | not run | |
| UI-WATCH-M | Watch page | Mobile 390x844 | `/watch/<videoId>` sidebar drawer and playback shell | not run | |
| UI-MEETING-D | Meeting page | Desktop 1440x900 | `/meeting` loading, error, and iframe-ready states | not run | |
| UI-AUTH-M | Auth page | Mobile 390x844 | `/auth/signin` default and error states | not run | |
| UI-SUPPORT-D | Support dialog | Desktop 1440x900 | Floating support button, submit tab, history tab | not run | |

If Playwright or another browser automation tool is unavailable, mark screenshot capture rows as `blocked: missing browser automation tooling` and keep lint/type/test/build evidence in the phase verification.
