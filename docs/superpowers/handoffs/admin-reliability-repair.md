# Admin Reliability Repair Handoff

## Outcome

Admin reliability repair implemented for `UI-04`, `STAGE-05`, `DATA-03`, `SEC-09`, `TENCENT-08`, and `TENCENT-09`.

The repair removes relation-join crashes on dirty MongoDB data; completes generic create/edit/delete/restore; validates permission and import references; restores soft-deleted whitelist users/enrollments; protects admin watermark settings; corrects dashboard/error metrics; fixes Radix trigger refs; and adds provider-first Tencent deletion with explicit irreversible UI confirmation.

## Important Behavior

- Generic CRUD supports only users, courses, and enrollments. Videos and tickets use their dedicated admin pages/routes.
- Disabling a user revokes and removes active sessions before soft deletion.
- Missing related rows render explicit fallback identities instead of crashing an entire admin page.
- Tencent deletion calls `DeleteMedia` before local soft deletion. Provider failure leaves the local video active.
- Video deletion is irreversible after Tencent accepts it; code rollback cannot restore provider media.
- Whitelist-with-course writes are transactional and restore soft-deleted users/enrollments.

## Verification

- Jest: 43 suites, 149 tests passed.
- TypeScript: passed.
- ESLint: zero errors; 109 inherited warnings, improved from 132 baseline.
- Production build: passed.
- Browser: unauthenticated `/admin` redirected to sign-in; page rendered with zero console warnings/errors; admin watermark API returned `401`.
- Secret scan: not completed because `gitleaks` is unavailable.

Full evidence: `docs/verification/admin-reliability-verification-record.md`.

## Rollback

No commit was created. Roll back with targeted inverse patches for the source, test, and documentation paths listed by `git status --short`; preserve the pre-existing untracked `.agents/` and `codex-plugins/` directories.

If committed later, use `git revert <commit>` instead of reset. A revert restores application code and local metadata behavior only. It cannot restore Tencent media already deleted by a real admin action.

## Recommended Follow-Up

1. Install `gitleaks` and rerun `npm run secrets:scan`.
2. Sign in with an admin test account and run the bounded smoke checklist in the verification record.
3. Use a disposable Tencent media item for the final delete test; confirm its provider deletion before accepting the local row state.
