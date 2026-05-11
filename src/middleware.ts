import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { getRedisClient } from '@/lib/redis';

let ratelimit: Ratelimit | null = null;

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

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
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
    console.error('Middleware system mode check failed:', e);
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

  // Protected paths
  if (path.startsWith('/admin') || path.startsWith('/api/drm') || path.startsWith('/api/hls') || path.startsWith('/meeting')) {
    // For database sessions, we need to check the session cookie
    const sessionToken = req.cookies.get('next-auth.session-token')?.value ||
      req.cookies.get('__Secure-next-auth.session-token')?.value;

    if (!sessionToken) {
      // No session cookie, redirect to signin
      const signInUrl = new URL('/api/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(signInUrl);
    }

    // Check if session has been revoked (cached in Redis for fast lookup)
    // This prevents revoked sessions from accessing protected routes until cookie expires
    try {
      const redis = getRedisClient();
      if (!redis) {
        return NextResponse.next();
      }

      const revokedKey = `session_revoked:${sessionToken}`;
      const isRevoked = await redis.get(revokedKey);

      if (isRevoked === 'true') {
        // Session was explicitly revoked by admin, redirect to signin with error
        const signInUrl = new URL('/api/auth/signin', req.url);
        signInUrl.searchParams.set('error', 'SessionRevoked');
        signInUrl.searchParams.set('callbackUrl', path);
        return NextResponse.redirect(signInUrl);
      }
    } catch (error) {
      // Fail open if Redis is unavailable - server-side getServerSession will validate
      // This ensures the app remains functional even if cache is down
      console.error('Middleware session revocation check error:', error);
    }

    // Session cookie exists and not revoked, allow the request to proceed
    // The actual role check and full validation will happen server-side
    return NextResponse.next();
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
