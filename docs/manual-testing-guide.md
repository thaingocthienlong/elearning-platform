# Manual Testing Guide

This guide gives maintainers a step-by-step manual test plan for local verification and staging acceptance. It complements automated tests, `docs/staging-smoke-checklist.md`, `docs/operations/health-checklist.md`, and vendor runbooks.

Do not paste secrets, tokens, service account values, DRM keys, certificates, database URLs, storage keys, Redis tokens, Zoom SDK secrets, Axinom communication secrets, VdoCipher API secrets, VdoCipher OTP/playbackInfo values, SMTP passwords, or full user emails into test evidence.

## 1. Test Evidence Rules

Use these status values for every manual test row:

- `not run`
- `pass`
- `fail`
- `blocked: missing credentials/service access`
- `blocked: missing browser automation tooling`

Evidence should include:

- Date and tester.
- Environment: local, Vercel Preview, or staging.
- Browser/device.
- Route or command.
- Expected result and actual result.
- Redacted screenshot, log line, or ticket ID when useful.

Evidence must not include:

- Raw tokens, cookies, authorization headers, SDK secrets, database URLs, storage keys, private keys, certificates, media keys, service account files, full emails, or unredacted provider payloads.

## 2. Prerequisites

Before manual tests, confirm:

1. Dependencies are installed with `npm ci` or `npm install`.
2. Prisma Client is generated with `npm run prisma:generate`.
3. Local or staging env vars are configured from `docs/env-matrix.md`.
4. Sensitive local files remain ignored and are not copied into evidence.
5. For staging, callbacks/origins are configured per `docs/vercel-staging-runbook.md`.
6. Test users exist:
   - One whitelisted learner.
   - One non-whitelisted Google account.
   - One admin account.
7. Test content exists:
   - One published open course.
   - One enrolled course for the learner.
   - One protected video with Axinom DRM metadata and playable asset URLs.
   - One VdoCipher video with a configured account ID, ready status, and playable provider ID.
8. Provider access exists or is explicitly blocked:
   - Google OAuth.
   - Axinom DRM/Encoding.
   - VdoCipher upload/playback.
   - Zoom Meeting SDK test meeting.
   - Upstash Redis.
   - Azure Blob and R2/S3-compatible storage.
   - SMTP/reCAPTCHA.
   - Sentry.

## 3. Baseline Command Gate

Run these before browser testing:

```bash
npm run verify:setup
npm run verify:services
npm run verify:staging
npm run lint
npm run typecheck
npm test
npm run build
npm run secrets:scan
```

Expected result:

- Commands exit successfully.
- `npm run verify:services` may print missing variable names in local non-strict mode.
- `npm run secrets:scan` may report that gitleaks is not installed; record that as a tooling gap if it occurs.

For staging credentials:

```bash
npm run verify:services:strict
npm run verify:axinom -- --strict
```

Expected result:

- Strict checks pass only when real staging credentials are configured.
- If provider access is unavailable, mark the affected checks `blocked: missing credentials/service access`.

## 4. Local Server Launch

Start the development server:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open:

```text
http://127.0.0.1:3000
```

Expected result:

- Home page loads with the academic portal design.
- Navbar, theme toggle, language toggle, user menu, and support button render without overlap.
- Console does not show secrets.

## 5. Authentication Tests

### AUTH-01: Whitelisted Google Sign-In

Steps:

1. Open `/auth/signin`.
2. Click the Google sign-in button.
3. Sign in with a whitelisted learner account.
4. Return to `/`.

Expected result:

- User is authenticated.
- Home page shows course and meeting actions.
- No raw OAuth tokens, cookies, or full email values appear in visible logs/evidence.

### AUTH-02: Non-Whitelisted Denial

Steps:

1. Sign out.
2. Open `/auth/signin`.
3. Sign in with a non-whitelisted Google account.

Expected result:

- Access is denied.
- Error message is user-safe.
- Internal whitelist details are not exposed.

### AUTH-03: Admin Access

Steps:

1. Sign in as an admin.
2. Open `/admin`.
3. Open core admin pages: users, whitelist, videos, tickets, analytics, security events.

Expected result:

- Admin pages load.
- Tables remain dense and scannable.
- No unbounded loading state appears.

## 6. Course And Navigation Tests

### COURSE-01: Course Catalog

Steps:

1. Sign in as a whitelisted learner.
2. Open `/courses`.
3. Review course cards and empty-state behavior if no courses exist.
4. Use desktop and mobile viewport widths.

Expected result:

- Course catalog shows formal academic styling.
- Course count and course cards are readable.
- Buttons do not wrap badly or overlap.
- Browser recommendation notice does not cover content.

### COURSE-02: Course Detail Access State

Steps:

1. Open an enrolled course at `/courses/<courseId>`.
2. Open an open course.
3. Open a locked course as a learner without enrollment.

Expected result:

- Enrolled/open states show watch actions.
- Locked state shows disabled access without exposing internal authorization details.
- Video lesson order is stable.

### COURSE-03: Navigation And Back Behavior

Steps:

1. Navigate from `/` to `/courses`.
2. Open a course detail page.
3. Use the navbar back button.
4. Use browser back/forward.

Expected result:

- Navigation remains predictable.
- Navbar does not appear on `/meeting`.
- Layout does not shift unexpectedly.

## 7. Playback And DRM Tests

### PLAYBACK-01: Watch Page Shell

Steps:

1. Sign in as a learner entitled to a video.
2. Open `/watch/<videoId>`.
3. Review the secure lecture playback shell before accepting IPR consent.
4. Accept IPR consent.

Expected result:

- Academic watch shell loads.
- IPR consent overlay appears before playback.
- After consent, player loads.
- Sidebar shows current lesson and completion state.
- Fullscreen hides non-player UI as expected.

### DRM-01: Entitled DRM Token And License

Steps:

1. Open browser developer tools network tab.
2. Load `/watch/<videoId>` as an entitled learner.
3. Filter requests for DRM token and license calls.

Expected result:

- Entitled user receives a scoped token/license path.
- Token is sent only with license requests.
- Evidence redacts token values.

### DRM-02: Unauthorized Playback Denial

Steps:

1. Sign in as a learner without access to the video.
2. Open `/watch/<videoId>` directly.
3. Request the DRM token route directly if appropriate for staging.

Expected result:

- User is redirected or denied.
- Denial is generic and does not expose operational secrets.

### HLS-01: HLS Playlist Authorization

Steps:

1. As an entitled learner, request `/api/hls/playlist/<videoId>`.
2. As a non-entitled learner, request the same route.

Expected result:

- Entitled request succeeds.
- Non-entitled request is denied.
- HLS object URLs or storage keys are not exposed in evidence.

### WATERMARK-01: Watermark And Deterrence

Steps:

1. Start playback as a learner.
2. Confirm visible watermark text.
3. Trigger supported client-side deterrence checks if safe to do so.

Expected result:

- Watermark displays learner identity or configured whitelist details.
- Client-side anti-recording signals are treated as deterrence/telemetry only.
- Access enforcement remains server entitlement plus DRM/storage controls.

### VDOCIPHER-01: Upload And Sync

Steps:

1. Sign in as admin.
2. Open `/admin/videos`.
3. Select provider `VdoCipher`.
4. Select a configured VdoCipher account if multiple accounts exist.
5. Upload a short safe staging `.mp4`.
6. Use the admin sync action after upload completes.

Expected result:

- Upload credentials are created without exposing VdoCipher API secrets to browser code.
- The local video stores provider `VDOCIPHER`, account ID, VdoCipher video ID, and status.
- Sync updates the VdoCipher status to ready or a clear blocked/error state.
- Evidence redacts API secrets, webhook secrets, OTP values, and playbackInfo values.

### VDOCIPHER-02: Entitled Playback And Denial

Steps:

1. Publish a ready VdoCipher-backed video in an accessible course.
2. Confirm the VdoCipher account that owns the video allows the active playback hostname.
3. Sign in as an entitled learner.
4. Open `/watch/<videoId>`.
5. Accept IPR consent and start playback.
6. Sign in as a learner without access and request the same watch page or `/api/vdocipher/otp`.

Expected result:

- Entitled playback loads the VdoCipher iframe with `allow="encrypted-media"` and fullscreen enabled.
- VdoCipher license requests do not return `403` or `Error 2138 Website not allowed for playback`.
- Watermarking remains visible around the secure playback shell.
- OTP/playbackInfo are generated by the server only after entitlement succeeds.
- Non-entitled users are denied and do not receive OTP/playbackInfo.

### VDOCIPHER-03: Webhook Readiness

Steps:

1. Configure VdoCipher webhook target as `<STAGING_ORIGIN>/api/webhook/vdocipher?secret=<VDOCIPHER_WEBHOOK_SECRET>`.
2. Trigger a safe staging video event when provider access allows it.
3. Send an invalid-secret request in a safe environment.

Expected result:

- Valid event updates the local VdoCipher status without a 500.
- Invalid secret is rejected.
- Raw webhook secret and provider payload are not copied into evidence.

## 8. Zoom Meeting Tests

### ZOOM-01: Learner Join

Steps:

1. Sign in as a learner.
2. Open `/meeting`.
3. Wait for the meeting iframe to load.
4. Join the configured staging test meeting.

Expected result:

- Signature request succeeds.
- Learner joins with role `0`.
- SDK secret is never exposed to browser code.
- Watermark/user identity behavior is preserved.

### ZOOM-02: Admin Role Control

Steps:

1. Sign in as an admin.
2. Open `/meeting`.
3. Inspect the signature response shape without copying secrets.

Expected result:

- Admin receives attendee role `0` in the retained iframe join flow.
- No user can mint role `1` until a reviewed ZAK-backed host/start flow exists.

### ZOOM-03: Missing Zoom Configuration

Steps:

1. Test in an environment without Zoom credentials or with intentionally unavailable meeting config.
2. Open `/meeting`.

Expected result:

- User sees the academic meeting unavailable state.
- Error does not leak SDK secret or provider details.

## 9. Support Ticket Tests

### SUPPORT-01: Submit Ticket

Steps:

1. Sign in as a whitelisted user.
2. Click the support button.
3. Submit a ticket with a short test description.
4. Complete reCAPTCHA when configured.

Expected result:

- Ticket submits successfully or is clearly blocked by missing reCAPTCHA/SMTP access.
- Submitted identity comes from the session.
- Diagnostics are size-limited and redacted.

### SUPPORT-02: Rate Limit

Steps:

1. Submit tickets repeatedly with the same test user until the limit should apply.
2. Observe response and UI message.

Expected result:

- Rate limit is enforced through Redis in staging.
- Response does not reveal internals.

### SUPPORT-03: Ticket History

Steps:

1. Open support dialog.
2. Switch to the ticket history tab.

Expected result:

- User sees their own tickets only.
- No other user's full email or diagnostics are exposed.

## 10. Admin Tests

### ADMIN-01: Analytics And Security Events

Steps:

1. Sign in as admin.
2. Open `/admin/analytics`.
3. Open `/admin/security-events`.
4. Change pagination or filters where available.

Expected result:

- Analytics uses bounded recent summaries.
- Security events page uses bounded pagination/default lookback.
- No raw token/key/email data appears.

### ADMIN-02: Watermark Settings

Steps:

1. Open `/admin/watermark-settings`.
2. Change a safe test watermark setting.
3. Open a watch page and verify the user-facing effect.

Expected result:

- Settings update the global singleton.
- Reads are stable and not ambiguous.

### ADMIN-03: Destructive Security Event Flush

Steps:

1. Open the security events admin page.
2. Attempt the flush/delete action only in a safe non-production environment.
3. Provide required confirmation metadata.

Expected result:

- Action is confirmation-gated.
- Audit event records who performed it.

## 11. External Service Tests

### REDIS-01: Redis Availability

Steps:

1. Configure staging Upstash credentials.
2. Run `npm run verify:services:strict`.
3. Exercise support rate limit and session revocation flows.

Expected result:

- Redis-backed features work.
- Missing credentials are marked blocked, not pass.

### STORAGE-01: Azure And R2/S3

Steps:

1. Confirm Azure input/output containers exist.
2. Confirm R2/S3 bucket and prefix exist.
3. Confirm CORS/origin rules include staging.
4. Load a playback asset through the app flow.

Expected result:

- Storage is reachable through intended app paths.
- Direct sensitive storage credentials are not exposed.

### AXINOM-01: Webhook Readiness

Steps:

1. Confirm Axinom webhook URL is `<STAGING_ORIGIN>/api/webhook/axinom`.
2. Send or trigger a safe signed staging event.
3. Send or simulate a malformed signature in a safe environment.

Expected result:

- Valid signed event is accepted and processed.
- Malformed signature is rejected without 500 errors or secret leakage.

### AXINOM-02: Encoding And Playback

Steps:

1. Use a staging test video.
2. Start or verify an Axinom encoding job.
3. Confirm explicit Axinom operational fields/statuses on the video.
4. Play the result through the watch page.

Expected result:

- Encoding status is visible to admins.
- Playback succeeds for entitled users only.

### VDOCIPHER-04: Account Config

Steps:

1. Configure `VDOCIPHER_ACCOUNT_IDS`, `VDOCIPHER_DEFAULT_ACCOUNT_ID`, each `VDOCIPHER_API_SECRET_<ACCOUNT>`, and the playback hostname through `VDOCIPHER_PLAYBACK_WHITELIST_HREF` or `NEXTAUTH_URL`.
2. Run `npm run verify:services`.
3. Check `/api/vdocipher/accounts` as admin.

Expected result:

- Service verification reports VdoCipher variables present or a credential block.
- Admin account list shows only safe account IDs and default markers.
- Duplicate or invalid account IDs are rejected during server startup/request handling.
- The playback hostname matches the VdoCipher dashboard domain/URL restriction for each active account.

### SENTRY-01: Error Capture

Steps:

1. Trigger a controlled staging error.
2. Open Sentry staging project or staging environment.
3. Review captured context.

Expected result:

- Error appears with route/status/provider context.
- No secrets, tokens, keys, database URLs, or full emails appear.

## 12. UI And Responsive Tests

Use `docs/ui-screenshot-checklist.md` for evidence rows.

Steps:

1. Capture desktop screenshots at 1440x900.
2. Capture mobile screenshots at 390x844.
3. Cover `/`, `/courses`, `/courses/<courseId>`, `/watch/<videoId>`, `/meeting`, `/auth/signin`, and support dialog.
4. Test light and dark themes when practical.
5. Test English and Vietnamese language states when practical.

Expected result:

- Text does not overlap or overflow.
- Buttons retain stable sizes.
- Cards use 8px-or-less radius.
- UI is formal and academic, not marketing-style.
- Admin pages remain dense and usable.

If browser automation is unavailable, mark rows `blocked: missing browser automation tooling`.

## 13. Production Gap Review

Before calling staging accepted, review `docs/operations/hardening-backlog.md`.

Required acknowledgement:

- Staging readiness is not production launch certification.
- P0 hardening items remain open unless explicitly completed:
  - Strict CI secret scanning with gitleaks.
  - Credential/key rotation decisions.
  - Durable video processing orchestration.
  - Backup/restore drills.
  - Incident response and escalation.

## 14. Manual Test Report Template

Copy this structure into an issue, release note, or staging report. Keep all evidence redacted.

```markdown
# Manual Test Report

Date:
Tester:
Environment:
Commit:
Base URL:
Browser/device:

## Command Gate
- verify:setup:
- verify:services:
- verify:staging:
- lint/typecheck/test/build:
- secrets:scan:

## Browser Flows
- AUTH-01:
- AUTH-02:
- COURSE-01:
- COURSE-02:
- PLAYBACK-01:
- DRM-01:
- HLS-01:
- VDOCIPHER-01:
- VDOCIPHER-02:
- ZOOM-01:
- SUPPORT-01:
- ADMIN-01:

## External Services
- REDIS-01:
- STORAGE-01:
- AXINOM-01:
- AXINOM-02:
- VDOCIPHER-03:
- VDOCIPHER-04:
- SENTRY-01:

## UI Screenshots
- Desktop:
- Mobile:
- Blocked rows:

## Production Gaps Reviewed
- P0 backlog acknowledged:
- Follow-up owner:
```
