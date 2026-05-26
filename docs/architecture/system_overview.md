# System Architecture Overview

**Project**: Secure Video Platform
**Version**: 0.2.0
**Date**: 2026-01-16

## 1. High-Level Architecture

The platform is a secure video streaming application built with Next.js (App Router), leveraging a hybrid architecture of server-side rendering (SSR) and client-side interactivity.

### Core Components

- **Frontend**: Next.js 16 (React 18/19), TailwindCSS, Shadcn UI.
- **Backend**: Next.js API Routes (Serverless Functions), Middleware.
- **Database**: PostgreSQL (via Prisma ORM), MongoDB (for logs/analytics - *Legacy/Hybrid*).
- **Caching & Rate Limiting**: Upstash Redis.
- **Authentication**: NextAuth.js (JWT + Session).
- **Video Player**: Shaka Player (Client-side) with Multi-DRM (Widevine, PlayReady, FairPlay) via Axinom.
- **Video Meeting**: Zoom Meeting SDK (WebAssembly).

## 2. Key Modules

### 2.1. Authentication & Session Management

- **NextAuth**: Handles login/logout.
- **Session Enforcement**:
  - **Middleware**: Checks session token validity and revocation status (via Redis `session_revoked:*`) on every protected request.
  - **SSE (Server-Sent Events)**: `/api/session/events` pushes revocation signals to the client effectively in real-time.
  - **Polling Fallback**: `useSessionValidator` checks `/api/session/validate` (with client-side caching) if SSE fails.

### 2.2. Admin Dashboard

- Generic, reusable architecture using shared hooks:
  - `useAdminData`: Centralized fetching, error handling, and transformation.
  - `useAdminFilters`: Client-side filtering logic.
  - `useTablePagination`: Client-side pagination.
- Features: User management, Whitelist (allowed emails), Video management, Analytics.

### 2.3. Video Playback & DRM

- **Player**: Custom wrapper around Shaka Player.
- **DRM**: Integration with Axinom DRM License Server.
- **Security**:
  - **Heartbeat**: Tracks playback position every 60s (`/api/watch/heartbeat`).
  - **Concurrency Control**: Prevents multiple active sessions (Session Fingerprinting).
  - **Watermarking**: Dynamic overlay on player.

## 3. Data Flow & Caching (Redis Optimization)

We utilize Upstash Redis for high-performance edge caching and rate limiting.

| Feature | Key Pattern | TTL | Strategy |
|---------|-------------|-----|----------|
| **Rate Limiting** | `ratelimit:*` | 10s | Sliding window. **Exemptions**: Heartbeat, Session Validate. |
| **Session Validity** | `session_valid:<token>` | 10m | Cache `true` to avoid DB hits on `/api/session/validate`. |
| **Session Revocation** | `session_revoked:<token>` | Session | Checked in Middleware. Blocks access immediately. |

## 4. Database Schema (Prisma)

*Detailed schema is defined in `prisma/schema.prisma`.*

- **User**: Core identity.
- **Course/Enrollment**: Content access control.
- **Video**: Video metadata, DRM keys.
- **WatchRecord**: Analytics, heartbeat tracking.
- **AllowedEmail**: Whitelist for registration.

## 5. Deployment

- **Platform**: Vercel (recommended).
- **Environment Variables**: Managed via Vercel Dashboard (secrets sanitization enforced).
