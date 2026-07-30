import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { getRedisClient } from '@/lib/redis';
import {
  TOS_COOKIE_NAME,
  TOS_REQUIRED_CODE,
  readSessionToken,
  verifyTosAccessToken,
} from '@/lib/tos-access';

let ratelimit: Ratelimit | null = null;

const TOS_PAGE_PREFIXES = ['/courses', '/watch', '/meeting'] as const;
const TOS_API_PATHS = new Set(['/api/drm/token', '/api/zoom/signature']);
const TOS_BYPASS_PREFIXES = ['/tos-approval', '/api/tos/accept', '/api/auth', '/_next'] as const;

function isPathOrChild(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function getRateLimiter() {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  ratelimit ??= new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '10 s'),
    analytics: true,
  });

  return ratelimit;
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const bypassesTos = TOS_BYPASS_PREFIXES.some((prefix) => isPathOrChild(path, prefix));
  const isTosProtectedPage = !bypassesTos &&
    TOS_PAGE_PREFIXES.some((prefix) => isPathOrChild(path, prefix));
  const isTosProtectedApi = !bypassesTos && TOS_API_PATHS.has(path);
  // console.log(`Middleware Global Debug: Request for ${path}`);


  // System Mode Check (Courses vs Meeting) using simple Redis check
  // Note: For high performance, this should be cached or use Edge Config.
  // Here we use standard Upstash Redis REST which is fetch-based and works in Edge.
  try {
    const redis = getRedisClient();
    const mode = redis ? await redis.get<string>('config:system_mode') || 'courses' : 'courses';
    if (mode === 'meeting' && path.startsWith('/courses')) {
      const url = new URL('/', req.url);
      url.searchParams.set('notice', 'courses_closed');
      return NextResponse.redirect(url);
    }

    if (mode === 'courses' && path.startsWith('/meeting')) {
      const url = new URL('/', req.url);
      url.searchParams.set('notice', 'meeting_closed');
      return NextResponse.redirect(url);
    }
  } catch (e) {
    console.error('Proxy system mode check failed:', e);
    // Fail open (allow access) or closed?
    // Fail open to courses to prevent total lockout if Redis is down
  }


  // Rate Limiting (Skip for static assets and internal APIs if needed)
  if (!path.startsWith('/_next') && !path.startsWith('/favicon.ico')) {
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';

    // Skip rate limiting for high-frequency authenticated APIs and SSE
    // These endpoints are protected by session auth and not susceptible to abuse
    const skipRateLimitPaths = [
      '/api/watch/heartbeat',
      '/api/session/validate',
      '/api/session/fingerprint',
      '/api/session/events',  // SSE endpoint - long-lived connection
      '/api/auth', // NextAuth endpoints (session, providers, etc) - protected internally
    ];
    const shouldSkipRateLimit = skipRateLimitPaths.some(p => path.startsWith(p));

    // Only rate limit API routes and Auth pages to prevent abuse
    if ((path.startsWith('/api') || path.startsWith('/auth')) && !shouldSkipRateLimit) {
      try {
        const rateLimiter = getRateLimiter();
        if (rateLimiter) {
          const { success, limit, reset, remaining } = await rateLimiter.limit(ip);

          if (!success) {
            return new NextResponse('Too Many Requests', {
              status: 429,
              headers: {
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': reset.toString(),
              },
            });
          }
        }
      } catch (error) {
        // Fail open if Redis is down or not configured
        console.error('Rate limiting error:', error);
      }
    }
  }

  const usesExistingSessionGate =
    path.startsWith('/admin') ||
    path.startsWith('/api/drm') ||
    isPathOrChild(path, '/meeting') ||
    isTosProtectedPage;
  const sessionToken = readSessionToken(req.cookies);

  if (usesExistingSessionGate) {
    if (!sessionToken) {
      const signInUrl = new URL('/api/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(signInUrl);
    }

    try {
      const redis = getRedisClient();
      if (redis) {
        const isRevoked = await redis.get(`session_revoked:${sessionToken}`);
        if (isRevoked === 'true') {
          const signInUrl = new URL('/api/auth/signin', req.url);
          signInUrl.searchParams.set('error', 'SessionRevoked');
          signInUrl.searchParams.set('callbackUrl', path);
          return NextResponse.redirect(signInUrl);
        }
      }
    } catch (error) {
      console.error('Proxy session revocation check error:', error);
    }
  }

  if (isTosProtectedApi && !sessionToken) {
    // Downstream API auth owns the unauthenticated response before TOS applies.
    return NextResponse.next();
  }

  if (isTosProtectedPage || isTosProtectedApi) {
    const acceptanceToken = req.cookies.get(TOS_COOKIE_NAME)?.value;
    const accepted = await verifyTosAccessToken(
      acceptanceToken,
      sessionToken,
      process.env.NEXTAUTH_SECRET,
    );

    if (!accepted) {
      const response = isTosProtectedApi
        ? NextResponse.json({ code: TOS_REQUIRED_CODE }, { status: 403 })
        : NextResponse.rewrite(new URL('/tos-approval', req.url));

      if (acceptanceToken) {
        response.cookies.delete(TOS_COOKIE_NAME);
      }
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
