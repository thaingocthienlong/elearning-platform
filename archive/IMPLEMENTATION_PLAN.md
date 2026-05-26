# Security & Performance Enhancement Implementation Plan

## 🎯 Overview
This plan covers implementing advanced security features, performance optimizations, error handling, and UI improvements for the Secure Video Platform.

---

## 📊 Priority Levels
- 🔴 **P0 - Critical**: Must implement (affects security/performance)
- 🟡 **P1 - High**: Should implement (major improvements)
- 🟢 **P2 - Medium**: Nice to have (polish)

---

## Phase 1: Critical Performance & Infrastructure (Week 1)

### 🔴 P0-1: Database Indexes
**Impact:** 10-100x query performance improvement
**Effort:** 1 hour
**Files:** `prisma/schema.prisma`

**Steps:**
1. Add indexes to all foreign keys and frequently queried fields
2. Run `npx prisma db push` to apply changes
3. Test query performance before/after

**Changes:**
```prisma
model Enrollment {
  @@index([userId])
  @@index([courseId])
  @@index([isDeleted])
}

model WatchRecord {
  @@index([userId])
  @@index([videoId])
  @@index([lastViewedAt])
}

model VideoAccess {
  @@index([userId])
  @@index([videoId])
}

model Video {
  @@index([courseId])
  @@index([published])
  @@index([isDeleted])
}

model User {
  @@index([role])
}

model Ticket {
  @@index([status])
  @@index([createdAt])
}
```

---

### 🔴 P0-2: Error Boundaries & Custom Error Pages
**Impact:** Prevents app crashes, better UX
**Effort:** 2 hours
**Files:**
- `app/error.tsx` (new)
- `app/not-found.tsx` (new)
- `app/global-error.tsx` (new)
- `components/ErrorBoundary.tsx` (new)

**Steps:**
1. Create global error page
2. Create 404 page
3. Create reusable ErrorBoundary component
4. Wrap Player and other critical components

---

### 🟡 P1-1: Toast Notification System
**Impact:** Better UX, less intrusive
**Effort:** 1.5 hours
**Files:**
- Install `sonner` or `react-hot-toast`
- Update all `alert()` calls throughout app

**Steps:**
1. `npm install sonner`
2. Add Toaster to root layout
3. Replace all alert() calls
4. Add translations for toast messages

---

### 🟡 P1-2: Loading Skeletons
**Impact:** Perceived performance improvement
**Effort:** 3 hours
**Files:**
- `components/ui/skeleton.tsx` (new)
- Update all pages with loading states

**Steps:**
1. Create Skeleton component
2. Replace Loader2 in courses page
3. Add skeletons to admin tables
4. Add skeleton for video player

---

## Phase 2: Content Security Enhancements (Week 2)

### 🔴 P0-3: Right-Click & DevTools Prevention
**Impact:** Deters casual content theft
**Effort:** 2 hours
**Files:**
- `components/video/Player.tsx`
- `app/watch/[videoId]/page.tsx`
- `middleware.ts` or new `lib/security.ts`

**Implementation:**
```typescript
// components/video/SecurityWrapper.tsx
'use client';

export function SecurityWrapper({ children }) {
  useEffect(() => {
    // Disable right-click
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', preventContextMenu);

    // Disable DevTools shortcuts
    const preventDevTools = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
        return false;
      }
    };
    document.addEventListener('keydown', preventDevTools);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventDevTools);
    };
  }, []);

  return <>{children}</>;
}
```

---

### 🟡 P1-3: Screen Recording Detection
**Impact:** Alerts admins to recording attempts
**Effort:** 3 hours
**Files:**
- `components/video/ScreenRecordingDetector.tsx` (new)
- `app/api/security/report-recording/route.ts` (new)
- Database model for security events

**Implementation:**
```typescript
// Detect screen sharing API
useEffect(() => {
  let isRecording = false;

  // Monitor visibility changes (recording apps often minimize browser)
  const handleVisibilityChange = () => {
    if (document.hidden && playerRef.current?.paused === false) {
      // User left tab while playing - suspicious
      reportSecurityEvent('TAB_SWITCH_WHILE_PLAYING');
    }
  };

  // Detect screen capture
  if (navigator.mediaDevices?.getDisplayMedia) {
    const original = navigator.mediaDevices.getDisplayMedia;
    navigator.mediaDevices.getDisplayMedia = async function(...args) {
      isRecording = true;
      reportSecurityEvent('SCREEN_CAPTURE_DETECTED');
      return original.apply(this, args);
    };
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);
```

**Database Schema:**
```prisma
model SecurityEvent {
  id          String   @id @default(cuid())
  userId      String
  videoId     String?
  eventType   String   // SCREEN_CAPTURE, TAB_SWITCH, etc.
  metadata    Json?    // Additional context
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())
  User        User     @relation(fields: [userId], references: [id])
  Video       Video?   @relation(fields: [videoId], references: [id])

  @@index([userId])
  @@index([eventType])
  @@index([createdAt])
}
```

---

### 🟡 P1-4: Session Fingerprinting
**Impact:** Detect account sharing and session hijacking
**Effort:** 4 hours
**Files:**
- `lib/fingerprint.ts` (new)
- Update Session model in schema
- `app/api/auth/[...nextauth]/route.ts`

**Implementation:**
```typescript
// lib/fingerprint.ts
export function generateFingerprint(): string {
  const data = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
  };

  return hashFingerprint(JSON.stringify(data));
}

// Update Session model
model Session {
  id           String   @id
  sessionToken String   @unique
  userId       String
  expires      DateTime
  fingerprint  String?  // NEW
  ipAddress    String?  // NEW
  userAgent    String?  // NEW
  lastActive   DateTime @default(now()) // NEW
  user         User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([fingerprint])
}
```

---

### 🟡 P1-5: Concurrent Session Limits
**Impact:** Prevent account sharing
**Effort:** 3 hours
**Files:**
- `app/api/auth/[...nextauth]/route.ts`
- `lib/session-manager.ts` (new)

**Implementation:**
```typescript
// In NextAuth callbacks
async signIn({ user }) {
  // Count active sessions
  const activeSessions = await prisma.session.count({
    where: {
      userId: user.id,
      expires: { gt: new Date() }
    }
  });

  const MAX_SESSIONS = 2; // Allow 2 concurrent devices

  if (activeSessions >= MAX_SESSIONS) {
    // Option 1: Reject login
    throw new Error('Maximum sessions reached');

    // Option 2: Invalidate oldest session
    const oldestSession = await prisma.session.findFirst({
      where: { userId: user.id },
      orderBy: { lastActive: 'asc' }
    });
    await prisma.session.delete({ where: { id: oldestSession.id } });
  }

  return true;
}
```

---

### 🟢 P2-1: Time-Based Access Windows
**Impact:** Useful for timed exams/limited access
**Effort:** 2 hours
**Files:**
- Update VideoAccess model
- `app/watch/[videoId]/page.tsx`
- Admin UI for setting time windows

**Schema Changes:**
```prisma
model VideoAccess {
  id         String    @id @default(cuid())
  userId     String
  videoId    String
  grantedAt  DateTime  @default(now())
  expiresAt  DateTime? // NEW: Access expires
  validFrom  DateTime? // NEW: Access starts
  validUntil DateTime? // NEW: Access ends (different from expiresAt)
  User       User      @relation(fields: [userId], references: [id])
  Video      Video     @relation(fields: [videoId], references: [id])

  @@unique([userId, videoId])
  @@index([userId])
  @@index([videoId])
  @@index([expiresAt]) // NEW
}
```

**Enforcement:**
```typescript
// Check time-based access
const now = new Date();
if (
  (videoAccess.validFrom && now < videoAccess.validFrom) ||
  (videoAccess.validUntil && now > videoAccess.validUntil) ||
  (videoAccess.expiresAt && now > videoAccess.expiresAt)
) {
  redirect(`/courses/${video.courseId}?error=access_expired`);
}
```

---

## Phase 3: Error Tracking & Monitoring (Week 3)

### 🔴 P0-4: Sentry Integration
**Impact:** Real-time error tracking in production
**Effort:** 2 hours
**Cost:** Free tier (10k errors/month)

**Steps:**
1. Sign up at sentry.io
2. `npm install @sentry/nextjs`
3. `npx @sentry/wizard@latest -i nextjs`
4. Configure error boundaries
5. Add user context

**Implementation:**
```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,

  beforeSend(event, hint) {
    // Add user context
    if (session?.user) {
      event.user = {
        id: session.user.id,
        email: session.user.email,
      };
    }
    return event;
  },
});
```

---

### 🟡 P1-6: API Retry Logic
**Impact:** Better reliability for unstable connections
**Effort:** 2 hours
**Files:**
- `lib/api-client.ts` (new)
- Update all fetch calls

**Implementation:**
```typescript
// lib/api-client.ts
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
  backoff = 1000
) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      // Only retry on network errors or 5xx
      if (response.ok || response.status < 500) {
        return response;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;

      // Exponential backoff
      await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
    }
  }
}

// Usage
const data = await fetchWithRetry('/api/courses/enrolled');
```

---

## Phase 4: Redis Caching (Week 4)

### 🟡 P1-7: Redis Setup & Caching Layer
**Impact:** 50-100x faster for cached queries
**Effort:** 6 hours
**Cost:** Free (Redis Cloud free tier or local Redis)

**Setup:**
1. `npm install ioredis`
2. Setup Redis Cloud or local Redis
3. Create caching utilities
4. Implement cache strategies

**Implementation:**
```typescript
// lib/redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 300 // 5 minutes default
): Promise<T> {
  // Try cache first
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache it
  await redis.setex(key, ttl, JSON.stringify(data));

  return data;
}

export async function invalidateCache(pattern: string) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

**Usage:**
```typescript
// app/api/courses/enrolled/route.ts
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  return getCached(
    `courses:user:${session.user.id}`,
    async () => {
      return await prisma.enrollment.findMany({
        where: { userId: session.user.id },
        include: { Course: true }
      });
    },
    300 // 5 minutes
  );
}
```

**What to cache:**
- User's enrolled courses (5 min TTL)
- Course video lists (5 min TTL)
- Video access checks (1 min TTL)
- Analytics dashboard (15 min TTL)
- User permissions (10 min TTL)

**Cache invalidation:**
```typescript
// When course is updated
await invalidateCache(`courses:*`);

// When video access is granted
await invalidateCache(`access:${userId}:*`);
```

---

## 📈 Implementation Timeline

### Week 1: Critical Performance (16 hours)
- ✅ Day 1-2: Database indexes (1h) + Error pages (2h) + Toast notifications (1.5h)
- ✅ Day 3-5: Loading skeletons (3h) + Testing (2h)

### Week 2: Security Features (20 hours)
- ✅ Day 1-2: Right-click prevention (2h) + Screen recording detection (3h)
- ✅ Day 3-4: Session fingerprinting (4h) + Concurrent sessions (3h)
- ✅ Day 5: Time-based access (2h) + Testing (3h)

### Week 3: Error Tracking (12 hours)
- ✅ Day 1-2: Sentry integration (2h) + Configuration (2h)
- ✅ Day 3-4: API retry logic (2h) + Testing (3h)
- ✅ Day 5: Security event monitoring dashboard (3h)

### Week 4: Caching Layer (12 hours)
- ✅ Day 1-2: Redis setup (2h) + Cache utilities (2h)
- ✅ Day 3-4: Implement caching (4h)
- ✅ Day 5: Performance testing + Optimization (4h)

**Total Effort:** ~60 hours (1.5 months part-time or 2 weeks full-time)

---

## 🧪 Testing Checklist

### Performance Testing
- [ ] Load 1000+ users and measure query times
- [ ] Test cache hit rates (target: >80%)
- [ ] Monitor database query count before/after indexes

### Security Testing
- [ ] Try bypassing right-click prevention (DevTools beforehand)
- [ ] Test screen recording detection with OBS
- [ ] Try logging in from 3+ devices simultaneously
- [ ] Test time-based access boundaries

### Error Handling Testing
- [ ] Simulate network failures
- [ ] Test error boundaries by throwing errors
- [ ] Verify Sentry receives errors in production

---

## 💰 Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| Redis Cloud | Free - $10/mo | Free tier: 30MB, 30 connections |
| Sentry | Free - $26/mo | Free tier: 10k errors/month |
| **Total** | **$0-36/mo** | Can start with free tiers |

---

## 🎯 Success Metrics

After implementation, you should see:

1. **Performance:**
   - Page load time: <2s (currently ~3-5s)
   - API response time: <200ms (cached), <1s (uncached)
   - Database query time: <50ms (with indexes)

2. **Security:**
   - Screen recording alerts: Track in admin dashboard
   - Session sharing: <5% of users (monitor concurrent sessions)
   - Security events: Real-time dashboard

3. **Reliability:**
   - Error rate: <0.1% (via Sentry)
   - API success rate: >99.5% (with retries)
   - Uptime: >99.9%

4. **User Experience:**
   - Toast notification usage: 100% (no more alerts)
   - Loading skeleton usage: 100%
   - Error recovery: 95% (via retries)

---

## 📝 Notes

- Start with P0 (Critical) items first
- Test each phase before moving to next
- Monitor Sentry dashboard daily for first week
- Adjust cache TTLs based on actual usage patterns
- Document all security event types for admin dashboard

---

## 🚀 Quick Start Commands

```bash
# Phase 1: Database Indexes
npx prisma db push
npx prisma generate

# Phase 1: Toast Notifications
npm install sonner

# Phase 3: Sentry
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs

# Phase 4: Redis
npm install ioredis
```

---

**End of Implementation Plan**
