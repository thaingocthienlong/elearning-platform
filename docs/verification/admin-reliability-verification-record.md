# Admin Reliability Verification Record

## Scope Verified

Requirements `UI-04`, `STAGE-05`, `DATA-03`, `SEC-09`, `TENCENT-08`, and `TENCENT-09`: admin route/page loading, typed CRUD, dirty relation resilience, authorization, imports, whitelist enrollment, session revoke, dashboard accuracy, user permissions, and Tencent video administration.

## Baseline

| Command | Actual Result |
| --- | --- |
| `npm test -- --runInBand` | Passed: 31 suites, 112 tests. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed with 132 inherited warnings. |

## Final Commands

| Command | Actual Result |
| --- | --- |
| `npm test -- --runInBand` | Passed: 43 suites, 149 tests. |
| `npm run typecheck` | Passed with no errors. |
| `npm run lint` | Passed with no errors and 109 warnings, down from 132 at baseline. |
| `npm run build` | Passed: Next.js production build compiled, typechecked, and generated 68 routes/pages. |
| `npm run secrets:scan` | Command exited successfully, but reported that `gitleaks` is not installed and skipped the redacted scan. This is not counted as a completed secret scan. |
| `git diff --check` | No whitespace errors; Git reported only expected LF-to-CRLF working-copy warnings. |
| `git status --short` | Only intended repair/test/docs files plus preserved pre-existing untracked `.agents/` and `codex-plugins/`. |

## Regression Evidence

- Orphan-safe tests cover watch records, session fingerprints/revoke, security events, DRM monitoring, analytics, enrollments, admin video lists, and video-access hydration.
- Mutation tests cover supported-model validation, Mongo ObjectId defaults, edit, self-admin protection, delete/restore, session revocation, imports, user-permission reference validation, whitelist transactions, and soft-deleted enrollment recovery.
- Tencent tests cover admin authorization, ID validation, provider-before-local order, provider failure, local-only pending video deletion, idempotency, active-list filtering, delete UI wiring, and use of the admin course endpoint.
- Dashboard tests cover active-only totals, active enrollment counts, tickets-with-logs totals, and uncapped unique error counts.
- Watermark regression proves unauthenticated admin GET returns `401` without database access.

## Browser Smoke

- Local Next.js dev server started successfully at `http://localhost:3000`.
- Navigating to `/admin` redirected to `/auth/signin?callbackUrl=.../admin` as expected for the available unauthenticated browser session.
- Sign-in page rendered correctly and browser console reported no warnings or errors.
- Dev-server request evidence showed `GET /api/admin/watermark-settings 401`.
- Authenticated admin page interactions could not be exercised because no signed-in admin session was available. Automated component and route tests cover those controls.

## External-State Safety

- No real Tencent file was deleted.
- No database rows, whitelist entries, permissions, sessions, system modes, or watermark settings were changed during verification.

## Remaining Gaps

- Rerun `npm run secrets:scan` after installing `gitleaks`.
- Run one signed-in admin smoke covering create/edit/restore, session revoke, whitelist enrollment, permission save, video upload course selection, and delete confirmation. Cancel before final deletion unless a disposable Tencent file is selected.

## Result

Automated verification passed. Browser authentication and unavailable `gitleaks` are recorded, bounded gaps.

## 2026-07-13 Security-Event Flush Regression

- Requirement: `SEC-09`.
- Reported failure: admin page sent a bodyless `DELETE`, while route required `confirm: "FLUSH_SECURITY_EVENTS"`; route correctly returned `400`.
- Fix: admin page now sends JSON content type and exact confirmation token.
- Safety preserved: route remains ADMIN-only, rejects missing/wrong confirmation, deletes only after validation, and writes a surviving audit event.

| Command | Actual Result |
| --- | --- |
| `npm test -- admin-security-events --runInBand` | Passed: 2 suites, 3 tests. |
| `npm run typecheck` | Passed with no errors. |
| `npx eslint src/app/admin/security-events/page.tsx __tests__/components/admin-security-events.test.tsx` | Passed with 0 errors and 4 inherited warnings in the page. |

Live browser deletion was intentionally skipped because it would destroy current security-event rows. Component coverage verifies the outgoing request contract; route coverage verifies rejection without confirmation plus successful confirmation and retained audit behavior.
