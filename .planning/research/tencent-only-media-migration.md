# Tencent-Only Media Migration

Date: 2026-07-02

## Decision

Future incoming courses use Tencent VOD Commercial DRM as the only media provider.
Axinom, Azure upload, R2/Azure encoded-output assumptions, and old Axinom video playback are removed from active product scope.

## What Stays

- NextAuth and whitelist access.
- Course, enrollment, direct video access, view limit, and media entitlement rules.
- Shaka/custom player first.
- Watermark and heartbeat telemetry.
- Zoom, support, admin, Redis, Prisma/MongoDB, Vercel deployment shape.

## What Ends

- Axinom upload, encoding, DRM token, webhook, sync, and setup verification.
- Azure SAS upload as the admin video upload path.
- Legacy old-course video playback support.
- Dual-provider routing between Axinom and Tencent.

## Required Gates

1. Export old course/video/media rows before cleanup.
2. Confirm Tencent Shaka/custom-player playback with a DRM test file.
3. Confirm Tencent webhook signature verification rules from console/API docs.
4. Run lint, typecheck, Jest, build, Tencent setup verification, and staging smoke.

## Rollback

Rollback code with Git before old media cleanup. After cleanup, restore old media data from the exported JSON file if the user explicitly requests rollback.
