# API Documentation

**Base URL**: `/api`

## Authentication & Session

### GET /api/session/validate

- **Description**: Checks if current session is strictly valid.
- **Auth**: Required.
- **Response**: `{ valid: boolean, reason?: string }`
- **Optimization**: Uses Redis cache; rate limit exempted.

### POST /api/session/fingerprint

- **Description**: Registers/Updates browser fingerprint for concurrency control.
- **Body**: `{ fingerprint: string }`

### GET /api/session/events

- **Description**: Server-Sent Events (SSE) stream for real-time session updates (revocation).
- **Connection**: Long-lived.

## Video & DRM

### POST /api/watch/heartbeat

- **Description**: Updates watch progress.
- **Body**: `{ videoId: string, position: number, isNewView: boolean }`
- **Interval**: Called every 60 seconds during playback.
- **Optimization**: Rate limit exempted.

### POST /api/drm/license

- **Description**: Proxy for DRM license acquisition.

## Admin

### GET /api/admin/analytics

- **Description**: Returns dashboard metrics.
- **Response**:
  - `overview`: { totalUsers, activeUsers, ... }
  - `viewsOverTime`: [ { date: string, views: number }, ... ]
  - `popularVideos`, `recentActivity`, etc.

### GET /api/admin/users

- **Query**: Filters (search, role, etc.)
- **Response**: List of users.

### GET /api/admin/whitelist

- **Description**: Get allowed emails.
- **Response**: List of whitelist entries.

### GET /api/admin/videos

- **Description**: Get all videos.

*(Note: This is a partial list of key endpoints. See source `src/app/api` for full routing)*
