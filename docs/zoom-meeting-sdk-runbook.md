# Zoom Meeting SDK Runbook

This runbook documents the retained Zoom Meeting SDK path for the platform after Phase 4. It is intentionally narrow: preserve the authenticated join flow, keep signatures server-side, and make SDK upgrades repeatable.

## Current Source Of Truth

The user flow is:

1. Authenticated user opens `/meeting`.
2. `src/app/meeting/page.tsx` requests `/api/zoom/signature` with a minimal request body.
3. `src/app/api/zoom/signature/route.ts` validates the NextAuth session, loads server-owned meeting config, signs an attendee-role Meeting SDK JWT, and returns browser-safe launch data.
4. `/meeting` builds an iframe URL for `public/zoom-meeting.html`.
5. `public/zoom-meeting.html` initializes Zoom Client View and applies the app watermark overlay.

The retained live SDK path is currently:

- `public/zoom-meeting.html` for the iframe shell.
- `public/lib/zoom/css/*` for local CSS patches used by the iframe shell.
- Zoom CDN `https://source.zoom.us/5.0.4/...` for the current Client View runtime.
- npm package `@zoom/meetingsdk` pinned by `package.json` as `^5.0.4`.

As of May 6, 2026, `npm view @zoom/meetingsdk version` reports `6.0.0`. Do not force this upgrade without following the upgrade procedure below and completing the smoke path.

## Marketplace App Setup Notes

The current Zoom Marketplace build flow may create this as a **General App** with **Meeting SDK** enabled. The repository still uses Meeting SDK signatures, not a stored Zoom OAuth token.

Required Marketplace setup for local/staging smoke:

1. In Zoom App Marketplace, open **Develop** -> **Build App**.
2. Create or edit the private/account-managed General App for this platform.
3. Enable **Meeting SDK**.
4. In **Basic Information**, set:
   - **OAuth Redirect URL**: `http://localhost:3000/api/zoom/oauth/callback` for local.
   - **OAuth Allow Lists**: `http://localhost:3000` for local.
   - Add the staging origin and callback when staging is deployed.
5. In **Scopes**, add the minimum read-only user/profile scope Zoom requires for **Local Test** authorization. This scope is not used by the repository's join flow.
6. In **Embed** / **Meeting SDK**, copy the SDK key/client ID and SDK secret/client secret into the app environment.
7. In **Local Test**, click **Add App Now** and authorize the app.
8. Confirm the redirect reaches `/api/zoom/oauth/callback` and returns a safe JSON `status: ok` response.

`src/app/api/zoom/oauth/callback/route.ts` intentionally does not store the OAuth `code`. It exists so Zoom's required Local Test authorization can complete without turning this project into a Zoom OAuth integration.

## Quarantined Samples

The following duplicate/sample trees were moved outside served public paths:

- `archive/zoom-sdk-quarantine/public-zoom-client-view/`
- `archive/zoom-sdk-quarantine/public-zoom/`
- `archive/zoom-sdk-quarantine/zoom-webapp/`

They are not the maintained app integration. Inspect them only when looking for inherited local patches before an SDK upgrade. Do not reintroduce them under `public/` unless the runbook source-of-truth section is updated and a staging smoke passes.

## Environment Variables

| Variable | Owner | Browser exposure | Purpose |
|----------|-------|------------------|---------|
| `ZOOM_MEETING_SDK_KEY` | Server | Returned as SDK key only | Meeting SDK key used in the signed JWT payload. |
| `ZOOM_MEETING_SDK_SECRET` | Server secret | Never | HMAC signing secret for Meeting SDK JWTs. |
| `NEXT_PUBLIC_ZOOM_MEETING_ID` | Public config | Yes | Current single meeting number. The signature route treats it as server-owned config. |
| `NEXT_PUBLIC_ZOOM_PASSCODE` | Public config | Yes | Current meeting passcode. Do not treat it as an access-control secret. |

## Security Contract

- `/api/zoom/signature` must validate the NextAuth session before generating a signature.
- Browser requests must not control `meetingNumber`, `passcode`, or `role`.
- All retained iframe joins receive attendee role `0`.
- Host role `1` requires a separate reviewed flow that supplies a valid Zoom ZAK token.
- Missing Zoom config fails closed: no signature is generated.
- The response must never include `ZOOM_MEETING_SDK_SECRET`.

## Official Docs To Check Before Upgrade

Use official Zoom documentation before changing SDK behavior:

- Zoom Meeting SDK for Web: https://developers.zoom.us/docs/meeting-sdk/web/
- Meeting SDK authorization: https://developers.zoom.us/docs/meeting-sdk/auth/
- Client View: https://developers.zoom.us/docs/meeting-sdk/web/client-view/
- Component View: https://developers.zoom.us/docs/meeting-sdk/web/component-view/
- Web SDK changelog: https://developers.zoom.us/changelog/meeting-sdk/web/

The current implementation preserves Client View. Component View is reference material only unless a future phase explicitly replaces the iframe flow.

## Upgrade Procedure

1. Check the current app versions:

   ```bash
   npm view @zoom/meetingsdk version
   rg -n "source.zoom.us|@zoom/meetingsdk|ZoomMtg|5.0.4" package.json public src docs
   ```

2. Read the official docs and changelog for the target version. Confirm whether Client View, signature payload fields, asset paths, required React/runtime assumptions, and `ZoomMtg.setZoomJSLib` behavior changed.
3. Update `package.json` and `package-lock.json` only if the retained flow needs the package version changed.
4. Update `public/zoom-meeting.html` CDN version and asset paths only if the target version supports the current Client View flow.
5. Keep the previous working version documented until the staging smoke passes.
6. Run focused automated tests:

   ```bash
   npm test -- --runTestsByPath __tests__/api/zoom-signature.test.ts
   npm run typecheck
   ```

7. Run the manual staging smoke below with real Zoom Meeting SDK credentials and a real meeting.

## Manual Staging Smoke

Use a staging environment with real Zoom SDK values and a test meeting.

1. Configure `ZOOM_MEETING_SDK_KEY`, `ZOOM_MEETING_SDK_SECRET`, `NEXT_PUBLIC_ZOOM_MEETING_ID`, and `NEXT_PUBLIC_ZOOM_PASSCODE`.
2. Use a meeting owned by the same Zoom account as the SDK app for first smoke.
3. Sign in as a learner and open `/meeting`.
4. Confirm the iframe launches the configured meeting and does not show raw operational errors.
5. Confirm user identity appears as expected.
6. Confirm passcode handling succeeds.
7. Confirm camera and microphone prompts work.
8. Confirm watermark text appears and follows active video/share targets.
9. Leave the meeting and confirm the app exits cleanly.
10. Sign in as an admin and verify the iframe still receives attendee role `0`; host/start behavior requires a separate ZAK-backed flow.

Local evidence from the 2026-05-09 rescue smoke:

- Google-authenticated admin reached `/meeting`.
- `/api/zoom/signature` generated the Meeting SDK signature server-side.
- The iframe loaded Zoom Client View and reached the live meeting UI.
- The SDK secret was not exposed to the browser response.
- The test meeting ID/passcode were treated as public configuration, not access-control secrets.

If real credentials or meeting availability are missing, record the smoke as `requires staging credentials`; do not mark automated signature/API tests optional.

## Rollback

If an SDK upgrade breaks join behavior:

1. Restore the last working `@zoom/meetingsdk` version in `package.json` and `package-lock.json`.
2. Restore the last working CDN version and `ZoomMtg.setZoomJSLib` path in `public/zoom-meeting.html`.
3. Restore any required local CSS patches under `public/lib/zoom/css/`.
4. Re-run focused tests and the manual staging smoke.
5. Keep the failed target version and failure notes in this runbook or the phase summary before attempting another upgrade.

Do not restore quarantined sample directories to served public paths as a rollback shortcut unless they are explicitly made the new source of truth and smoke-tested.
