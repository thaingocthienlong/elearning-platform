# Task Brief

## Goal

Remove Axinom/Azure/R2 media pipeline dependencies and make Tencent VOD Commercial DRM the only upload, processing, DRM, playback, and deletion path for future incoming courses.

## Lane

security-sensitive change

## Scope

In scope:

- Tencent-only media planning, schema, upload, processing, webhook, playback, admin UI, docs, verification, and old-media cleanup tooling.
- Axinom active code, env, docs, scripts, and UI labels.
- Old media row export and guarded cleanup.

Out of scope:

- Supporting old Axinom videos after cutover.
- Deleting external provider assets without explicit user confirmation.
- Replacing LMS auth, course, enrollment, Zoom, support, Redis, or Prisma/MongoDB core.

## Current Evidence

- `prisma/schema.prisma` currently stores Axinom-shaped `Video` metadata.
- `src/app/api/drm/token/route.ts` currently issues Axinom tokens after media entitlement.
- `src/hooks/player/useShakaPlayer.ts` currently attaches Axinom license request headers.
- `src/app/api/upload/presigned/route.ts` currently creates Azure upload URLs.
- `src/app/api/video/process/route.ts` currently submits Axinom encoding jobs.

## Tools To Use

- Superpowers skill: `superpowers:subagent-driven-development` or `superpowers:executing-plans`.
- Code discovery: `codebase-memory-mcp` first for code graph, then `rg` for string/config/doc scans.
- Current docs: Context7 for Tencent VOD, Shaka, Next.js, Prisma, and Vercel behavior.
- Browser proof: run staging/local browser playback smoke when Tencent credentials and test video exist.
- Security scan: `npm run secrets:scan` plus targeted no-secret review for changed code/docs.
- Subagents: use only for independent task slices with disjoint write scopes.

## No-Secret Rule

Do not read, print, copy, or commit secret values from env files, key files, certificates, service credentials, DRM artifacts, or media keys. List sensitive-looking paths by path only.

## Expected Deliverable

- Tencent-only media migration implemented, verified, documented, and handed off with rollback instructions.
