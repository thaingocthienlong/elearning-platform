# Zoom Session Revocation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Force an older device out of an active Zoom meeting when a newer device revokes that account session.

**Architecture:** Server-side same-device enforcement will use the shared `revokeSession()` contract so revoked sessions get Redis markers, cache invalidation, and SSE broadcast. Client-side session monitoring will dispatch a local revocation event, the meeting page will pass a same-origin leave command into the iframe, and `public/zoom-meeting.html` will call Zoom Client View `ZoomMtg.leaveMeeting({ confirm: false })` before redirecting.

**Tech Stack:** Next.js App Router route handlers, NextAuth v4, Prisma MongoDB sessions, Upstash Redis, EventSource/SSE, React 18 client components, Zoom Meeting SDK Client View, Jest, Testing Library, static contract tests.

---

## Scope Check

The spec covers one coupled workflow: multi-device session revocation for active Zoom meetings. It touches server session state, SSE delivery, client revocation cleanup, and the Zoom iframe, but each part is required for one testable user outcome. Keep this as one implementation plan with small commits.

## File Structure

- Modify `src/app/api/session/fingerprint/route.ts`
  - Owns session fingerprint registration, same-device enforcement, and current-session activity updates.
  - Change auto revocation to call `revokeSession()` for older different-fingerprint sessions.
  - Change `PATCH` activity updates to use the current cookie session token.
- Modify `src/app/api/session/validate/route.ts`
  - Owns client fallback session validity checks.
  - Check `isSessionRevoked()` before trusting `session_valid:<token>` cache.
- Modify `src/app/api/session/events/route.ts`
  - Owns SSE connection lifecycle and revocation push.
  - Add testable Redis revocation helper and use it on connect plus each keepalive.
- Modify `src/hooks/useSessionSSE.ts`
  - Owns browser session revocation response.
  - Export `SESSION_REVOKED_EVENT` and `notifySessionRevoked()`, then dispatch before sign-out.
- Modify `src/components/Providers.tsx`
  - Owns app-wide session monitoring.
  - Use `/meeting` pathname to reduce fallback polling interval while a meeting is open.
- Modify `src/app/meeting/page.tsx`
  - Owns authenticated Zoom iframe shell.
  - Listen for `session:revoked` and send same-origin `platform:leave-meeting` message to iframe.
- Modify `public/zoom-meeting.html`
  - Owns Zoom Client View runtime.
  - Listen for `platform:leave-meeting`, validate origin, call `ZoomMtg.leaveMeeting({ confirm: false })`, then redirect.
- Modify `docs/zoom-meeting-sdk-runbook.md`
  - Add a manual smoke test for two-device session revocation.
- Create `__tests__/api/session-revocation-flow.test.ts`
  - Covers fingerprint revocation, current-session activity update, and validation cache bypass.
- Create `__tests__/api/session-events.test.ts`
  - Covers Redis revocation helper for SSE.
- Create `__tests__/hooks/use-session-sse.test.tsx`
  - Covers local browser revocation event dispatch.
- Create `__tests__/components/providers-session-monitor.test.ts`
  - Static contract for meeting-only fallback polling.
- Create `__tests__/app/meeting-page-revocation.test.ts`
  - Static contract for iframe leave message.
- Create `__tests__/zoom-meeting-html.test.ts`
  - Static contract for iframe-side Zoom leave handler.
- Create `__tests__/docs/zoom-session-revocation-runbook.test.ts`
  - Ensures runbook keeps manual UAT steps.

## Task 1: Server Revocation Contract

**Files:**
- Modify: `src/app/api/session/fingerprint/route.ts`
- Modify: `src/app/api/session/validate/route.ts`
- Create: `__tests__/api/session-revocation-flow.test.ts`

- [ ] **Step 1: Write failing route tests**

Create `__tests__/api/session-revocation-flow.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/redis';
import { isSessionRevoked, revokeSession } from '@/lib/session-revocation';
import { POST as postFingerprint, PATCH as patchFingerprint } from '@/app/api/session/fingerprint/route';
import { GET as validateSession } from '@/app/api/session/validate/route';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/redis', () => ({
  getCache: jest.fn(),
  invalidateCacheKey: jest.fn(),
  setCache: jest.fn(),
}));

jest.mock('@/lib/session-revocation', () => ({
  isSessionRevoked: jest.fn(),
  revokeSession: jest.fn(),
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
  session: {
    deleteMany: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};
const mockedGetCache = getCache as jest.Mock;
const mockedSetCache = setCache as jest.Mock;
const mockedIsSessionRevoked = isSessionRevoked as jest.Mock;
const mockedRevokeSession = revokeSession as jest.Mock;

function nextRequest(
  url: string,
  init: RequestInit & { token?: string } = {}
) {
  const headers = new Headers(init.headers);
  if (init.token) {
    headers.set('cookie', `next-auth.session-token=${init.token}`);
  }

  return new NextRequest(url, {
    ...init,
    headers,
  });
}

describe('session revocation flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({
      user: {
        email: 'learner@example.test',
        id: 'user-1',
      },
    });
    mockedGetCache.mockResolvedValue(null);
    mockedIsSessionRevoked.mockResolvedValue(false);
    mockedRevokeSession.mockResolvedValue({ redis: true, broadcast: 1 });
    mockedSetCache.mockResolvedValue(undefined);
  });

  test('revokes different-fingerprint sessions through revokeSession before deleting DB rows', async () => {
    const currentSession = {
      id: 'current-session',
      sessionToken: 'current-token',
      userId: 'user-1',
      fingerprint: 'old-current-fingerprint',
      lastActive: new Date('2026-05-16T00:00:00.000Z'),
    };
    const staleDeviceSession = {
      id: 'old-session',
      sessionToken: 'old-token',
      userId: 'user-1',
      fingerprint: 'iphone-fingerprint',
      lastActive: new Date('2026-05-15T00:00:00.000Z'),
    };
    const sameDeviceSession = {
      id: 'same-device-session',
      sessionToken: 'same-device-token',
      userId: 'user-1',
      fingerprint: 'chrome-fingerprint',
      lastActive: new Date('2026-05-15T00:00:00.000Z'),
    };
    const unknownFingerprintSession = {
      id: 'unknown-session',
      sessionToken: 'unknown-token',
      userId: 'user-1',
      fingerprint: null,
      lastActive: new Date('2026-05-15T00:00:00.000Z'),
    };

    mockedPrisma.session.findUnique.mockResolvedValue(currentSession);
    mockedPrisma.session.findMany.mockResolvedValue([
      staleDeviceSession,
      sameDeviceSession,
      unknownFingerprintSession,
    ]);
    mockedPrisma.session.update.mockResolvedValue({
      ...currentSession,
      fingerprint: 'chrome-fingerprint',
    });
    mockedPrisma.session.deleteMany.mockResolvedValue({ count: 1 });

    const response = await postFingerprint(
      nextRequest('http://localhost.test/api/session/fingerprint', {
        method: 'POST',
        token: 'current-token',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Chrome',
          'x-forwarded-for': '203.0.113.10',
        },
        body: JSON.stringify({ fingerprint: 'chrome-fingerprint' }),
      })
    );

    expect(response.status).toBe(200);
    expect(mockedPrisma.session.update).toHaveBeenCalledWith({
      where: { id: 'current-session' },
      data: {
        fingerprint: 'chrome-fingerprint',
        ipAddress: '203.0.113.10',
        lastActive: expect.any(Date),
        userAgent: 'Chrome',
      },
    });
    expect(mockedRevokeSession).toHaveBeenCalledTimes(1);
    expect(mockedRevokeSession).toHaveBeenCalledWith(
      'old-token',
      'Signed in on another device'
    );
    expect(mockedPrisma.session.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['old-session'] },
      },
    });
  });

  test('updates activity for the current cookie session only', async () => {
    const oldLastActive = new Date(Date.now() - 31 * 60 * 1000);
    mockedPrisma.session.findUnique.mockResolvedValue({
      id: 'current-session',
      sessionToken: 'current-token',
      userId: 'user-1',
      fingerprint: 'chrome-fingerprint',
      lastActive: oldLastActive,
    });
    mockedPrisma.session.update.mockResolvedValue({
      id: 'current-session',
      lastActive: new Date(),
    });

    const response = await patchFingerprint(
      nextRequest('http://localhost.test/api/session/fingerprint', {
        method: 'PATCH',
        token: 'current-token',
      })
    );

    expect(response.status).toBe(200);
    expect(mockedPrisma.session.findUnique).toHaveBeenCalledWith({
      where: { sessionToken: 'current-token' },
    });
    expect(mockedPrisma.session.update).toHaveBeenCalledWith({
      where: { id: 'current-session' },
      data: { lastActive: expect.any(Date) },
    });
  });

  test('rejects revoked sessions before trusting cached validity', async () => {
    mockedIsSessionRevoked.mockResolvedValue(true);
    mockedGetCache.mockResolvedValue(true);

    const response = await validateSession(
      nextRequest('http://localhost.test/api/session/validate', {
        token: 'old-token',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      valid: false,
      reason: 'Session revoked',
    });
    expect(mockedGetCache).not.toHaveBeenCalled();
    expect(mockedSetCache).not.toHaveBeenCalled();
  });

  test('keeps cached valid response for non-revoked sessions', async () => {
    mockedIsSessionRevoked.mockResolvedValue(false);
    mockedGetCache.mockResolvedValue(true);

    const response = await validateSession(
      nextRequest('http://localhost.test/api/session/validate', {
        token: 'current-token',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ valid: true });
    expect(mockedGetCache).toHaveBeenCalledWith('session_valid:current-token');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- --runTestsByPath __tests__/api/session-revocation-flow.test.ts
```

Expected: FAIL. The first test fails because `revokeSession` is not called. The third test fails because `/api/session/validate` trusts cached validity before checking revocation.

- [ ] **Step 3: Update fingerprint route**

In `src/app/api/session/fingerprint/route.ts`, replace the entire file with:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revokeSession } from '@/lib/session-revocation';

const DEVICE_REPLACED_REASON = 'Signed in on another device';

function getSessionToken(req: NextRequest) {
  return req.cookies.get('next-auth.session-token')?.value ||
    req.cookies.get('__Secure-next-auth.session-token')?.value;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fingerprint } = await req.json();

    if (!fingerprint) {
      return NextResponse.json({ error: 'Fingerprint required' }, { status: 400 });
    }

    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = req.headers.get('user-agent') || null;
    const sessionToken = getSessionToken(req);

    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token not found' }, { status: 401 });
    }

    const currentSession = await prisma.session.findUnique({
      where: { sessionToken },
    });

    if (!currentSession) {
      return NextResponse.json({ error: 'Session not found in DB' }, { status: 404 });
    }

    if (currentSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Session user mismatch' }, { status: 403 });
    }

    await prisma.session.update({
      where: { id: currentSession.id },
      data: {
        fingerprint,
        ipAddress,
        userAgent,
        lastActive: new Date(),
      },
    });

    const otherSessions = await prisma.session.findMany({
      where: {
        userId: session.user.id,
        id: { not: currentSession.id },
      },
    });

    const sessionsToRevoke = otherSessions.filter((otherSession) => {
      return Boolean(
        otherSession.sessionToken &&
        otherSession.fingerprint &&
        otherSession.fingerprint !== fingerprint
      );
    });

    if (sessionsToRevoke.length > 0) {
      for (const staleSession of sessionsToRevoke) {
        await revokeSession(staleSession.sessionToken, DEVICE_REPLACED_REASON);
      }

      await prisma.session.deleteMany({
        where: {
          id: { in: sessionsToRevoke.map((staleSession) => staleSession.id) },
        },
      });

      console.log(
        `Enforced Same-Device Policy: Revoked ${sessionsToRevoke.length} session(s) on different devices`
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fingerprint update error:', error);
    return NextResponse.json(
      { error: 'Failed to update fingerprint' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionToken = getSessionToken(req);

    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token not found' }, { status: 401 });
    }

    const currentSession = await prisma.session.findUnique({
      where: { sessionToken },
    });

    if (!currentSession || currentSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (currentSession.lastActive < thirtyMinutesAgo) {
      await prisma.session.update({
        where: { id: currentSession.id },
        data: { lastActive: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session activity update error:', error);
    return NextResponse.json(
      { error: 'Failed to update session activity' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Update validate route**

In `src/app/api/session/validate/route.ts`, replace the entire file with:

```ts
import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCache, setCache } from '@/lib/redis';
import { isSessionRevoked } from '@/lib/session-revocation';

function getSessionToken(req: NextRequest) {
  return req.cookies.get('next-auth.session-token')?.value ||
    req.cookies.get('__Secure-next-auth.session-token')?.value;
}

export async function GET(req: NextRequest) {
  const sessionToken = getSessionToken(req);

  if (sessionToken) {
    const revoked = await isSessionRevoked(sessionToken);
    if (revoked) {
      return NextResponse.json(
        { valid: false, reason: 'Session revoked' },
        { status: 401 }
      );
    }

    try {
      const cachedValidity = await getCache<boolean>(`session_valid:${sessionToken}`);
      if (cachedValidity === true) {
        return NextResponse.json({ valid: true });
      }
    } catch {
      // Redis cache failure falls through to NextAuth database validation.
    }
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { valid: false, reason: 'No session' },
      { status: 401 }
    );
  }

  if (sessionToken) {
    setCache(`session_valid:${sessionToken}`, true, 600).catch(() => {
      // Cache writes must not block validation success.
    });
  }

  return NextResponse.json({ valid: true });
}
```

- [ ] **Step 5: Run task tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/api/session-revocation-flow.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit server revocation contract**

Run:

```bash
git add src/app/api/session/fingerprint/route.ts src/app/api/session/validate/route.ts __tests__/api/session-revocation-flow.test.ts
git commit -m "fix(session): revoke replaced devices"
```

## Task 2: SSE Redis Revocation Detection

**Files:**
- Modify: `src/app/api/session/events/route.ts`
- Create: `__tests__/api/session-events.test.ts`

- [ ] **Step 1: Write failing SSE helper tests**

Create `__tests__/api/session-events.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { notifyIfSessionRevoked } from '@/app/api/session/events/route';

describe('session events route helpers', () => {
  test('sends revoked event and closes stream when Redis marks session revoked', async () => {
    const redis = {
      get: jest.fn().mockResolvedValue('true'),
    };
    const controller = {
      close: jest.fn(),
      enqueue: jest.fn(),
    };

    const revoked = await notifyIfSessionRevoked(
      redis,
      'session_revoked:old-token',
      controller,
      'old-token-prefix-123',
      'Signed in on another device'
    );

    expect(revoked).toBe(true);
    expect(redis.get).toHaveBeenCalledWith('session_revoked:old-token');
    expect(controller.enqueue).toHaveBeenCalledWith(expect.any(Uint8Array));
    expect(new TextDecoder().decode(controller.enqueue.mock.calls[0][0])).toContain('event: revoked');
    expect(new TextDecoder().decode(controller.enqueue.mock.calls[0][0])).toContain('Signed in on another device');
    expect(controller.close).toHaveBeenCalled();
  });

  test('keeps stream open when Redis has no revocation marker', async () => {
    const redis = {
      get: jest.fn().mockResolvedValue(null),
    };
    const controller = {
      close: jest.fn(),
      enqueue: jest.fn(),
    };

    const revoked = await notifyIfSessionRevoked(
      redis,
      'session_revoked:current-token',
      controller,
      'current-token-prefix-123'
    );

    expect(revoked).toBe(false);
    expect(controller.enqueue).not.toHaveBeenCalled();
    expect(controller.close).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- --runTestsByPath __tests__/api/session-events.test.ts
```

Expected: FAIL with `notifyIfSessionRevoked` not exported.

- [ ] **Step 3: Add testable Redis revocation helper**

In `src/app/api/session/events/route.ts`, add these types and exported helper above `export async function GET`:

```ts
type SSEController = Pick<ReadableStreamDefaultController, 'close' | 'enqueue'>;

type RevocationRedis = {
  get: (key: string) => Promise<unknown>;
} | null;

export async function notifyIfSessionRevoked(
  redis: RevocationRedis,
  revokedKey: string,
  controller: SSEController,
  connectionId: string,
  reason: string = 'Session was revoked'
) {
  if (!redis) {
    return false;
  }

  try {
    const isRevoked = await redis.get(revokedKey);
    if (isRevoked === 'true') {
      sendRevokedEvent(controller, connectionId, reason);
      return true;
    }
  } catch {
    // Redis read failures leave the SSE stream alive; fallback validation still runs client-side.
  }

  return false;
}
```

Change `sendRevokedEvent` signature in the same file from:

```ts
function sendRevokedEvent(
    controller: ReadableStreamDefaultController,
    connectionId: string,
    reason: string
) {
```

to:

```ts
function sendRevokedEvent(
    controller: SSEController,
    connectionId: string,
    reason: string
) {
```

- [ ] **Step 4: Use helper on connection and keepalive**

In `src/app/api/session/events/route.ts`, replace the current initial Redis check and ping interval block:

```ts
// Check if already revoked on connection
if (redis) {
    redis.get(revokedKey).then((isRevoked) => {
        if (isRevoked === 'true') {
            sendRevokedEvent(controller, connectionId, 'Session was revoked');
        }
    }).catch(() => {
        // Ignore Redis errors on initial check
    });
}

// Send keepalive ping every 30 seconds
const pingInterval = setInterval(() => {
    try {
        const pingEvent = `event: ping\ndata: ${JSON.stringify({
            timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(pingEvent));
    } catch {
        // Connection closed
        cleanup(connectionId, pingInterval);
    }
}, 30000);
```

with:

```ts
const pingInterval = setInterval(async () => {
    try {
        const revoked = await notifyIfSessionRevoked(
            redis,
            revokedKey,
            controller,
            connectionId,
            'Session was revoked'
        );
        if (revoked) {
            clearInterval(pingInterval);
            return;
        }

        const pingEvent = `event: ping\ndata: ${JSON.stringify({
            timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(pingEvent));
    } catch {
        cleanup(connectionId, pingInterval);
    }
}, 30000);

notifyIfSessionRevoked(
    redis,
    revokedKey,
    controller,
    connectionId,
    'Session was revoked'
).then((revoked) => {
    if (revoked) {
        clearInterval(pingInterval);
    }
}).catch(() => {
    // Connection remains open; client fallback validation still protects the meeting page.
});
```

- [ ] **Step 5: Run task tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/api/session-events.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit SSE Redis detection**

Run:

```bash
git add src/app/api/session/events/route.ts __tests__/api/session-events.test.ts
git commit -m "fix(session): detect SSE revokes via Redis"
```

## Task 3: Client Revocation Cleanup and Meeting Fallback

**Files:**
- Modify: `src/hooks/useSessionSSE.ts`
- Modify: `src/components/Providers.tsx`
- Modify: `src/app/meeting/page.tsx`
- Create: `__tests__/hooks/use-session-sse.test.tsx`
- Create: `__tests__/components/providers-session-monitor.test.ts`
- Create: `__tests__/app/meeting-page-revocation.test.ts`

- [ ] **Step 1: Write failing client tests**

Create `__tests__/hooks/use-session-sse.test.tsx`:

```ts
import {
  SESSION_REVOKED_EVENT,
  notifySessionRevoked,
} from '@/hooks/useSessionSSE';

describe('session SSE client events', () => {
  test('dispatches a browser event with the revocation reason', () => {
    const listener = jest.fn();
    window.addEventListener(SESSION_REVOKED_EVENT, listener);

    notifySessionRevoked('Signed in on another device');

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({
      reason: 'Signed in on another device',
    });

    window.removeEventListener(SESSION_REVOKED_EVENT, listener);
  });
});
```

Create `__tests__/components/providers-session-monitor.test.ts`:

```ts
import { readFileSync } from 'fs';
import path from 'path';

describe('Providers session monitor', () => {
  test('uses a shorter fallback polling interval on meeting pages', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/components/Providers.tsx'),
      'utf8'
    );

    expect(source).toContain("import { usePathname } from 'next/navigation'");
    expect(source).toContain("pathname?.startsWith('/meeting')");
    expect(source).toContain("useSessionSSE(status === 'authenticated', isMeetingPath ? 15000 : 300000)");
  });
});
```

Create `__tests__/app/meeting-page-revocation.test.ts`:

```ts
import { readFileSync } from 'fs';
import path from 'path';

describe('meeting page session revocation bridge', () => {
  test('listens for session revocation and posts a leave message to the Zoom iframe', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/app/meeting/page.tsx'),
      'utf8'
    );

    expect(source).toContain('SESSION_REVOKED_EVENT');
    expect(source).toContain("type: 'platform:leave-meeting'");
    expect(source).toContain('iframeRef.current?.contentWindow?.postMessage');
    expect(source).toContain('window.location.origin');
    expect(source).toContain('ref={iframeRef}');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- --runTestsByPath __tests__/hooks/use-session-sse.test.tsx __tests__/components/providers-session-monitor.test.ts __tests__/app/meeting-page-revocation.test.ts
```

Expected: FAIL. `SESSION_REVOKED_EVENT` and `notifySessionRevoked` are not exported, Providers does not use pathname-specific fallback polling, and meeting page does not post a leave message.

- [ ] **Step 3: Export revocation client event from `useSessionSSE`**

In `src/hooks/useSessionSSE.ts`, add this code after `const RECONNECT_BASE_DELAY = 1000;`:

```ts
export const SESSION_REVOKED_EVENT = 'session:revoked';

export interface SessionRevokedDetail {
    reason: string;
}

export function notifySessionRevoked(reason: string) {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent<SessionRevokedDetail>(
        SESSION_REVOKED_EVENT,
        { detail: { reason } }
    ));
}
```

Then update `handleRevocation` in the same file from:

```ts
const handleRevocation = useCallback(async (reason: string) => {
```

to:

```ts
const handleRevocation = useCallback(async (reason: string) => {
    notifySessionRevoked(reason);
```

Keep the existing `sessionStorage.removeItem`, `signOut`, and redirect code after that new call.

- [ ] **Step 4: Lower fallback polling only on meeting pages**

In `src/components/Providers.tsx`, add this import:

```ts
import { usePathname } from 'next/navigation';
```

Replace the current `SessionMonitor` function with:

```tsx
function SessionMonitor() {
  const { status } = useSession();
  const pathname = usePathname();
  const isMeetingPath = pathname?.startsWith('/meeting') ?? false;

  useSessionSSE(status === 'authenticated', isMeetingPath ? 15000 : 300000);

  return null;
}
```

- [ ] **Step 5: Send leave command from meeting page to iframe**

In `src/app/meeting/page.tsx`, add this import:

```ts
import {
    SESSION_REVOKED_EVENT,
    type SessionRevokedDetail,
} from '@/hooks/useSessionSSE';
```

Inside `MeetingPage`, after `const [error, setError] = useState<string | null>(null);`, add:

```ts
const iframeRef = useRef<HTMLIFrameElement>(null);
const hasRequestedIframeLeave = useRef(false);
```

Add this effect before the existing session validation effect:

```ts
useEffect(() => {
    const handleSessionRevoked = (event: Event) => {
        if (hasRequestedIframeLeave.current) return;

        hasRequestedIframeLeave.current = true;
        const reason = (event as CustomEvent<SessionRevokedDetail>).detail?.reason ||
            'Session revoked';

        iframeRef.current?.contentWindow?.postMessage(
            { type: 'platform:leave-meeting', reason },
            window.location.origin
        );
    };

    window.addEventListener(SESSION_REVOKED_EVENT, handleSessionRevoked);

    return () => {
        window.removeEventListener(SESSION_REVOKED_EVENT, handleSessionRevoked);
    };
}, []);
```

Update the iframe JSX from:

```tsx
<iframe
    src={iframeSrc}
    allow="camera; microphone; fullscreen; display-capture; autoplay"
    className="w-full h-full border-none"
    title="Zoom Meeting"
/>
```

to:

```tsx
<iframe
    ref={iframeRef}
    src={iframeSrc}
    allow="camera; microphone; fullscreen; display-capture; autoplay"
    className="w-full h-full border-none"
    title="Zoom Meeting"
/>
```

- [ ] **Step 6: Run task tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/hooks/use-session-sse.test.tsx __tests__/components/providers-session-monitor.test.ts __tests__/app/meeting-page-revocation.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit client revocation cleanup**

Run:

```bash
git add src/hooks/useSessionSSE.ts src/components/Providers.tsx src/app/meeting/page.tsx __tests__/hooks/use-session-sse.test.tsx __tests__/components/providers-session-monitor.test.ts __tests__/app/meeting-page-revocation.test.ts
git commit -m "fix(meeting): leave iframe on session revoke"
```

## Task 4: Zoom Iframe Leave Handler and Runbook

**Files:**
- Modify: `public/zoom-meeting.html`
- Modify: `docs/zoom-meeting-sdk-runbook.md`
- Create: `__tests__/zoom-meeting-html.test.ts`
- Create: `__tests__/docs/zoom-session-revocation-runbook.test.ts`

- [ ] **Step 1: Write failing static contract tests**

Create `__tests__/zoom-meeting-html.test.ts`:

```ts
import { readFileSync } from 'fs';
import path from 'path';

describe('Zoom meeting iframe revocation handler', () => {
  test('accepts same-origin leave command and calls Zoom leaveMeeting directly', () => {
    const html = readFileSync(
      path.join(process.cwd(), 'public/zoom-meeting.html'),
      'utf8'
    );

    expect(html).toContain("type !== 'platform:leave-meeting'");
    expect(html).toContain('event.origin !== window.location.origin');
    expect(html).toContain('ZoomMtg.leaveMeeting');
    expect(html).toContain('confirm: false');
    expect(html).toContain('/auth/signin?error=SessionRevoked');
  });
});
```

Create `__tests__/docs/zoom-session-revocation-runbook.test.ts`:

```ts
import { readFileSync } from 'fs';
import path from 'path';

describe('Zoom runbook session revocation smoke test', () => {
  test('documents the two-device meeting revocation check', () => {
    const docs = readFileSync(
      path.join(process.cwd(), 'docs/zoom-meeting-sdk-runbook.md'),
      'utf8'
    );

    expect(docs).toContain('Two-device session revocation smoke test');
    expect(docs).toContain('iPhone Safari');
    expect(docs).toContain('Windows Chrome');
    expect(docs).toContain('15 seconds');
    expect(docs).toContain('SessionRevoked');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- --runTestsByPath __tests__/zoom-meeting-html.test.ts __tests__/docs/zoom-session-revocation-runbook.test.ts
```

Expected: FAIL because iframe leave handler and runbook smoke test are not present.

- [ ] **Step 3: Add iframe-side leave handler**

In `public/zoom-meeting.html`, add this script block after the global `window.Redux`, `window.ReduxThunk`, and `window._` assignments and before `ZoomMtg.setZoomJSLib(...)`:

```html
        let hasForcedLeaveForRevocation = false;

        function redirectAfterSessionRevoked() {
            window.parent.location.href = '/auth/signin?error=SessionRevoked';
        }

        function forceLeaveMeetingForRevokedSession() {
            if (hasForcedLeaveForRevocation) return;
            hasForcedLeaveForRevocation = true;

            try {
                if (window.ZoomMtg && typeof ZoomMtg.leaveMeeting === 'function') {
                    ZoomMtg.leaveMeeting({
                        confirm: false,
                        success: redirectAfterSessionRevoked,
                        error: redirectAfterSessionRevoked
                    });
                    return;
                }
            } catch (error) {
                console.error('Forced Zoom leave failed', error);
            }

            redirectAfterSessionRevoked();
        }

        window.addEventListener('message', function (event) {
            if (event.origin !== window.location.origin) return;

            const data = event.data;
            if (!data || data.type !== 'platform:leave-meeting') return;

            forceLeaveMeetingForRevokedSession();
        });
```

- [ ] **Step 4: Add manual UAT to Zoom runbook**

Append this section to `docs/zoom-meeting-sdk-runbook.md`:

```md
## Two-device session revocation smoke test

Use this check after changing session revocation, SSE, or the Zoom iframe bridge.

1. Sign in on iPhone Safari as a learner and open `/meeting`.
2. Confirm the learner joins the Zoom meeting and the iframe shows active meeting UI.
3. On Windows Chrome, sign in as the same learner and open `/meeting`.
4. Confirm the Windows Chrome session can join the meeting.
5. Watch the iPhone Safari device for up to 15 seconds.
6. Pass condition: iPhone Safari leaves the Zoom meeting or redirects to `/auth/signin?error=SessionRevoked`.
7. Fail condition: iPhone Safari continues hearing or seeing the meeting after 15 seconds while Windows Chrome remains active.

If the fail condition occurs, inspect:

- `POST /api/session/fingerprint` response on Windows Chrome.
- Redis key `session_revoked:<old-session-token>` without printing the token value in shared logs.
- `/api/session/events` connection status on iPhone Safari.
- Browser console message from `public/zoom-meeting.html` around `platform:leave-meeting`.
```

- [ ] **Step 5: Run task tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/zoom-meeting-html.test.ts __tests__/docs/zoom-session-revocation-runbook.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit iframe leave handler and runbook**

Run:

```bash
git add public/zoom-meeting.html docs/zoom-meeting-sdk-runbook.md __tests__/zoom-meeting-html.test.ts __tests__/docs/zoom-session-revocation-runbook.test.ts
git commit -m "fix(zoom): leave meeting on revoked session"
```

## Task 5: Full Verification

**Files:**
- Verify all files changed by Tasks 1-4.

- [ ] **Step 1: Run targeted regression suite**

Run:

```bash
npm test -- --runTestsByPath __tests__/api/session-revocation-flow.test.ts __tests__/api/session-events.test.ts __tests__/hooks/use-session-sse.test.tsx __tests__/components/providers-session-monitor.test.ts __tests__/app/meeting-page-revocation.test.ts __tests__/zoom-meeting-html.test.ts __tests__/docs/zoom-session-revocation-runbook.test.ts __tests__/api/zoom-signature.test.ts
```

Expected: PASS for all listed suites.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test -- --runInBand
```

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 4: Run lint**

Run:

```bash
npm run lint
```

Expected: exit code 0. Existing warnings may remain; new files should not add warnings.

- [ ] **Step 5: Run production build**

Run:

```bash
npm run build
```

Expected: exit code 0.

- [ ] **Step 6: Manual two-device smoke check**

Run this on a staging or local environment with working Google auth, Redis, and Zoom Meeting SDK credentials:

```text
1. iPhone Safari signs in as learner and opens /meeting.
2. Windows Chrome signs in as same learner and opens /meeting.
3. iPhone Safari leaves Zoom or redirects to /auth/signin?error=SessionRevoked within 15 seconds.
4. Windows Chrome remains signed in and joined.
```

Expected: old device exits within 15 seconds. Do not print raw session tokens while inspecting Redis or browser logs.

- [ ] **Step 7: Commit verification notes if docs changed during smoke**

If manual smoke findings require a runbook correction, edit only `docs/zoom-meeting-sdk-runbook.md`, then run:

```bash
git add docs/zoom-meeting-sdk-runbook.md
git commit -m "docs(zoom): clarify revocation smoke check"
```

If no doc correction is needed, skip this commit.

## Self-Review

Spec coverage:

- Server auto revocation uses `revokeSession()`: Task 1.
- Revoked token bypasses stale cache: Task 1.
- SSE detects Redis revocation after connection: Task 2.
- Client dispatches `session:revoked`: Task 3.
- Meeting page posts iframe leave message: Task 3.
- Zoom iframe calls `ZoomMtg.leaveMeeting({ confirm: false })`: Task 4.
- Meeting fallback polling around 15 seconds: Task 3.
- Manual UAT for iPhone Safari and Windows Chrome: Task 4 and Task 5.

Placeholder scan:

- No unresolved placeholder tokens are intentionally present.
- No task depends on omitted code.

Type consistency:

- Event name is `SESSION_REVOKED_EVENT` with value `session:revoked`.
- Event detail type is `SessionRevokedDetail` with `{ reason: string }`.
- Iframe message type is `platform:leave-meeting`.
- Server revocation reason is `Signed in on another device`.
