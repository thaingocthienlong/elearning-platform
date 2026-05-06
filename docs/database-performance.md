# Prisma/MongoDB Performance Notes

This project currently uses Prisma with MongoDB. The active datasource is `provider = "mongodb"` in `prisma/schema.prisma`; PostgreSQL is not the implemented primary database.

Phase 5 keeps MongoDB and optimizes the current implementation before any migration decision.

## Query Risks Addressed

### Watch Page

`src/app/watch/[videoId]/page.tsx` previously fetched course videos for the sidebar and then performed another nested `video.findMany` only to get the same course video IDs for watch records. The page now reuses IDs from the already-loaded sidebar video query before fetching watch records.

Relevant indexes:

- `Video`: `[courseId, published, isDeleted]`, `[courseId, position]`
- `WatchRecord`: `[userId, videoId]`, `[userId, lastViewedAt]`

### Admin Analytics

`src/app/api/admin/analytics/route.ts` now uses a 30-day analytics window for active users, recent activity, top-viewer scan, total views, and views over time. It also keeps top/recent result sets bounded:

- Popular videos: 10
- Popular courses: 10
- Top-viewer scan: 100 users with recent watch activity
- Recent activity: 20 watch records

The response is cached for 60 seconds under `admin:analytics:v1` through `getCached`. This is intentionally short-lived because analytics are operational summaries, not transactional data.

### Security Events

`src/app/api/admin/security-events/route.ts` clamps pagination:

- Default page size: 20
- Max page size: 100
- Default lookback: 90 days
- Optional `since` query param may narrow or expand the lower date bound when admins need a specific window.

Relevant indexes:

- `SecurityEvent`: `[createdAt]`, `[userId, createdAt]`, `[eventType, createdAt]`

### Support Tickets

Support ticket diagnostics are bounded by `src/lib/request-security.ts`:

- Description: 5,000 bytes
- Diagnostics JSON: 50,000 bytes
- Console logs retained: latest 100 entries
- Page URL: 2,048 bytes

Diagnostics are recursively redacted for sensitive keys, bearer tokens, and email-like values before persistence.

Relevant indexes:

- `Ticket`: `[status]`, `[status, createdAt]`, `[createdAt]`, `[email]`, `[userId]`

### Watermark Settings

Watermark settings now use an explicit singleton scope:

- `WatermarkSettings.scope` defaults to `global`
- `@@unique([scope])` prevents multiple active settings documents for the same scope
- Admin reads/writes use `upsert({ where: { scope: "global" } })`
- Public and Zoom reads use `findUnique({ where: { scope: "global" } })`

This avoids ambiguous latest-row reads and stops normal updates from appending unbounded settings history. Existing historical rows are not destructively cleaned up in Phase 5.

## Migration Position

Do not migrate away from MongoDB in v1 unless staging evidence shows the optimized query shapes, indexes, bounds, and short-lived caching cannot meet requirements. A migration would need its own plan covering data validation, rollback, downtime expectations, and Prisma schema changes.

## Verification

Use these commands after query/index changes:

```bash
npm run prisma:generate
npm run typecheck
npm test
npm run build
```

For staging, Phase 6 should add real latency observations for watch page load, admin analytics, security-event pagination, support ticket submission, and watermark settings reads.
