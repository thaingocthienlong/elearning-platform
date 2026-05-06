# Phase 8 Context: Maintainer Operations and Hardening Backlog

## Phase Goal

Maintainers can understand, check, upgrade, and harden the platform after staging readiness without overstating production guarantees.

## Requirements

- OPS-01: Maintainer docs explain the app's major subsystems, including auth, entitlement, DRM, video processing, storage, Zoom, Redis, database, support, and admin flows.
- OPS-02: Vendor upgrade playbooks exist for Axinom, Zoom, Next.js, Prisma, Shaka, and deployment dependencies.
- OPS-03: Operations docs define what client-side anti-recording controls can and cannot guarantee.
- OPS-04: Admin health or checklist documentation identifies readiness of Axinom, Zoom, Redis, storage, database, OAuth, Sentry, and webhooks.
- OPS-05: Remaining production-hardening items are captured after staging readiness is achieved.

## User Decisions

1. Ops docs style: subsystem runbooks and checklists.
2. Hardening backlog: prioritized by risk and staging blockers.
3. Vendor upgrade docs: Axinom, Zoom, Next.js, Prisma, Shaka, and Vercel/deployment dependencies.
4. Health/readiness checks: documented manual checklist plus existing scripts.

## Official Docs Checked

- Axinom DRM overview: https://docs.axinom.com/services/drm/
- Axinom License Service: https://docs.axinom.com/services/drm/license-service
- Axinom Encoding API quickstart: https://docs.axinom.com/services/encoding/quickstart/using-api/api
- Zoom Meeting SDK for Web: https://marketplacefront.zoom.us/sdk/meeting/web/index.html
- Next.js upgrading guide: https://nextjs.org/docs/app/guides/upgrading
- Next.js 16 upgrade guide: https://nextjs.org/docs/app/guides/upgrading/version-16
- Prisma upgrade guide: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v5
- Prisma 7 upgrade guide: https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7
- Shaka Player upgrade guide: https://shaka-player-demo.appspot.com/docs/api/tutorial-upgrade.html
- Vercel deployment methods: https://vercel.com/docs/deployments/deployment-methods
- Vercel Next.js overview: https://vercel.com/docs/concepts/next.js/overview

## Implementation Notes

- Link existing docs instead of duplicating every setup detail.
- Keep docs placeholder-safe and avoid secret values.
- Use existing verification scripts rather than adding live-provider scripts in this phase.
- Production launch remains out of scope; capture hardening work as a prioritized backlog.
