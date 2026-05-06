# Zoom SDK Quarantine

This directory holds inherited Zoom sample/static SDK trees that were moved out of served public paths during Phase 4.

Do not commit the quarantined vendor files. Some samples include development certificate/key material and large generated bundles. Use this directory only to inspect inherited patches before a documented Zoom SDK upgrade.

Tracked source of truth:

- `docs/zoom-meeting-sdk-runbook.md`
- `public/zoom-meeting.html`
- `public/lib/zoom/css/`
- `src/app/api/zoom/signature/route.ts`
- `src/app/meeting/page.tsx`
