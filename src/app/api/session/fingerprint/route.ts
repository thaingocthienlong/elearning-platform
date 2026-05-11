import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { invalidateCacheKey } from '@/lib/redis';

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

    // Get IP address and user agent
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = req.headers.get('user-agent') || null;

    // Get session token from cookies to identify the CURRENT session
    // NextAuth uses different cookie names for secure (prod) and non-secure (dev)
    const sessionToken = req.cookies.get('next-auth.session-token')?.value ||
      req.cookies.get('__Secure-next-auth.session-token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token not found' }, { status: 401 });
    }

    // Find the SPECIFIC current session
    const currentSession = await prisma.session.findUnique({
      where: { sessionToken },
    });

    if (!currentSession) {
      return NextResponse.json({ error: 'Session not found in DB' }, { status: 404 });
    }

    // Update the current session with fingerprint
    await prisma.session.update({
      where: { id: currentSession.id },
      data: {
        fingerprint,
        ipAddress,
        userAgent,
        lastActive: new Date(),
      },
    });

    // Enforce "Same Device" Policy
    // Revoke ONLY sessions that have a DIFFERENT fingerprint
    // This allows multiple browsers/tabs on the SAME device (same fingerprint)
    // but blocks sessions on DIFFERENT devices.

    // Find all other sessions for this user
    const otherSessions = await prisma.session.findMany({
      where: {
        userId: session.user.id,
        id: { not: currentSession.id }, // Exclude current session
      }
    });

    const sessionsToRevoke = otherSessions.filter(s => {
      // If the other session has a fingerprint AND it's different from current -> Revoke
      // We don't revoke sessions with null fingerprints to be safe (or we could, depending on strictness)
      // Here we strictly revoke DIFFERENT devices.
      return s.fingerprint && s.fingerprint !== fingerprint;
    });

    if (sessionsToRevoke.length > 0) {
      await prisma.session.deleteMany({
        where: {
          id: { in: sessionsToRevoke.map(s => s.id) }
        }
      });

      // Invalidate cache for revoked sessions
      for (const s of sessionsToRevoke) {
        if (s.sessionToken) {
          await invalidateCacheKey(`session_valid:${s.sessionToken}`);
        }
      }

      console.log(`🔒 Enforced Same-Device Policy: Revoked ${sessionsToRevoke.length} session(s) on different devices for ${session.user.email}`);
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

// Update session activity
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the most recent session for this user
    const userSession = await prisma.session.findFirst({
      where: {
        userId: session.user.id,
        fingerprint: { not: null },
      },
      orderBy: {
        expires: 'desc',
      },
    });

    if (userSession) {
      // Update last active time only if > 30 minutes ago to reduce DB writes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      if (userSession.lastActive < thirtyMinutesAgo) {
        await prisma.session.update({
          where: {
            id: userSession.id,
          },
          data: {
            lastActive: new Date(),
          },
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  } catch (error) {
    console.error('Session activity update error:', error);
    return NextResponse.json(
      { error: 'Failed to update session activity' },
      { status: 500 }
    );
  }
}
