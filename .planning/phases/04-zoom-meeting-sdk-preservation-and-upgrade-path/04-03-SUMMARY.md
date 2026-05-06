# 04-03 Summary: Zoom SDK Source Of Truth And Upgrade Runbook

## Status

Complete.

## What Changed

- Added `docs/zoom-meeting-sdk-runbook.md`.
- Documented the retained source of truth: `/meeting`, `/api/zoom/signature`, `public/zoom-meeting.html`, `public/lib/zoom/css/*`, and Zoom CDN 5.0.4.
- Recorded that `npm view @zoom/meetingsdk version` returned `6.0.0` on 2026-05-06 while the app currently uses `^5.0.4`.
- Moved inherited duplicate/sample SDK trees out of served public paths into `archive/zoom-sdk-quarantine/`.
- Added a quarantine README and ignore rule so large vendor bundles and inherited sample cert/key material are not committed accidentally.
- Excluded the quarantine path from TypeScript compilation.

## Verification

- `rg -n "zoom-client-view|zoom-webapp|source.zoom.us/5.0.4|@zoom/meetingsdk|Zoom Meeting SDK|zoom-sdk-quarantine" docs public src package.json archive/zoom-sdk-quarantine --glob '!archive/zoom-sdk-quarantine/**'` confirmed the retained references.
- `npm run typecheck` passed after excluding the quarantine path.

