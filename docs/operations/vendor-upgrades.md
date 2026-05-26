# Vendor Upgrade Playbooks

This document satisfies OPS-02. It defines repeatable upgrade playbooks for DoveRunner, Zoom, Next.js, Prisma, Shaka Player, and Vercel/deployment dependencies.

No upgrade is complete until local gates and staging smoke checks pass. Do not copy real credentials, keys, tokens, certificates, database URLs, or service account values into upgrade notes.

## Universal Upgrade Gate

Before changing versions:

```bash
npm run verify:setup
npm run verify:staging
npm run lint
npm run typecheck
npm test
npm run build
npm run secrets:scan
```

After changing versions:

```bash
npm install
npm run prisma:generate
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:staging
```

Then run the relevant live staging smoke rows in:

- `docs/staging-smoke-checklist.md`
- `docs/doverunner-setup.md`
- `docs/ui-screenshot-checklist.md`

## DoveRunner T&P And Multi-DRM

Official docs:

- https://docs.doverunner.com/content-security/tnp/tnp-service-guide/
- https://docs.doverunner.com/content-security/tnp/tnp-api-guide/
- https://docs.doverunner.com/content-security/multi-drm/license/license-token/
- https://docs.doverunner.com/content-security/multi-drm/clients/html5-player/

Upgrade steps:

1. Review DoveRunner Console notices, T&P API changes, license token requirements, storage registration, and DRM player integration behavior.
2. Update `docs/doverunner-setup.md` if portal fields, env names, license URLs, or T&P job payloads change.
3. Keep license token generation centralized in server-only code.
4. Verify `scripts/verify-doverunner-setup.ts` still maps canonical env values and only runs live checks when explicitly requested.
5. Run DoveRunner staging smoke with a test video before accepting playback changes.

Rollback:

- Revert source/doc changes and restore the previous staging env values.
- Redeploy because Vercel env changes apply only to new deployments.

## Zoom Meeting SDK

Official docs:

- https://marketplacefront.zoom.us/sdk/meeting/web/index.html
- https://developers.zoom.us/docs/meeting-sdk/web/

Upgrade steps:

1. Check `npm view @zoom/meetingsdk version` and Zoom release notes.
2. Review whether the current iframe/CDN path or package-driven path is the supported source of truth.
3. Keep `/api/zoom/signature` server-owned and role-controlled.
4. Keep the retained iframe flow on attendee role `0`; add a reviewed ZAK-backed path before enabling host role `1`.
5. Update `docs/zoom-meeting-sdk-runbook.md` with SDK version, asset path, and smoke evidence.
6. Smoke `/meeting` with a learner and admin on staging.

Rollback:

- Restore the previous Zoom SDK asset/package version and redeploy.
- Keep quarantined sample/vendor directories out of served paths.

## Next.js And React

Official docs:

- https://nextjs.org/docs/app/guides/upgrading
- https://nextjs.org/docs/app/guides/upgrading/version-16

Current baseline after the 2026-05-15 framework refresh:

- `next` and `eslint-config-next`: `16.2.6`
- `react` and `react-dom`: `18.3.1`
- Node.js requirement: `>=20.9.0`; repo `.nvmrc` remains `20.11.1`.

Upgrade steps:

1. Read the version-specific guide before changing `next`, `react`, `react-dom`, or `eslint-config-next`.
2. Run the official codemod only on a branch and inspect every changed file.
3. Pay special attention to middleware/proxy conventions, App Router behavior, caching, server actions, image behavior, and Turbopack warnings.
4. Run full local gates and build.
5. Smoke auth, course, watch, support, meeting, admin, and API routes in staging.

Rollback:

- Revert package and lockfile changes plus codemod edits.
- Redeploy the previous known-good staging deployment if needed.

## Prisma And MongoDB

Official docs:

- https://www.prisma.io/docs/guides/upgrade-prisma-orm/v5
- https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7

Upgrade steps:

1. Review the guide for the target version and confirm MongoDB support changes.
2. Upgrade `prisma` and `@prisma/client` together.
3. Run `npm run prisma:generate`.
4. Review schema validation warnings and generated client type changes.
5. Run tests for media entitlement, data bounds, admin analytics, watermark settings, and DoveRunner sync.
6. Confirm indexes in the staging MongoDB database.

Rollback:

- Revert package/lockfile/schema changes and regenerate Prisma Client.
- Reapply previous database indexes only if an upgrade changed them explicitly.

## Shaka Player

Official docs:

- https://shaka-player-demo.appspot.com/docs/api/tutorial-upgrade.html
- https://shaka-player-demo.appspot.com/docs/api/tutorial-drm-config.html

Upgrade steps:

1. Read Shaka's upgrade guide for API removals and DRM configuration changes.
2. Review `src/hooks/player/useShakaPlayer.ts`, `src/components/video/Player.tsx`, and DRM license request filter behavior.
3. Verify Widevine, PlayReady, FairPlay certificate, and HLS fallback behavior.
4. Smoke playback on Chrome, Edge, Safari/iOS where available.
5. Confirm Shaka still sends DoveRunner license tokens only to license requests.

Rollback:

- Revert `shaka-player` version and playback integration changes.
- Keep the previous DRM token and license request behavior.

## Vercel And Deployment Dependencies

Official docs:

- https://vercel.com/docs/deployments/deployment-methods
- https://vercel.com/docs/concepts/next.js/overview
- https://vercel.com/docs/environment-variables
- https://vercel.com/docs/functions/limitations/
- https://vercel.com/docs/functions/configuring-functions/duration

Upgrade steps:

1. Review Vercel deployment, environment, and function-limit docs before changing deployment behavior.
2. Reconfirm `NEXTAUTH_URL`, OAuth callbacks, Zoom allowed domains, AWS S3 CORS, DoveRunner storage IDs, and public player origins.
3. Do not treat long video processing HTTP requests as production workers.
4. Run `vercel build` or the Vercel preview deployment build.
5. Complete `docs/staging-smoke-checklist.md`.

Rollback:

- Use Vercel rollback for a previous deployment when appropriate.
- Restore environment variables and redeploy because env changes do not apply retroactively.
