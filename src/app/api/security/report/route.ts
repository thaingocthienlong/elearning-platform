import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { waitUntil } from '@vercel/functions';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { eventType, videoId, metadata } = body;

    if (!eventType) {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 });
    }

    // Get IP address from headers
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Report security event in background
    waitUntil(
      (async () => {
        try {
          const user = await prisma.user.findUnique({
            where: { email: session.user.email! },
          });

          if (user) {
            await prisma.securityEvent.create({
              data: {
                userId: user.id,
                videoId: videoId || null,
                eventType,
                metadata: metadata || null,
                ipAddress: ip,
                userAgent,
              },
            });
            console.log(`🛡️ Security Event logged (Background): ${eventType} for ${session.user.email}`);
          }
        } catch (err) {
          console.error('Background security reporting error:', err);
        }
      })()
    );

    return NextResponse.json({ success: true, queued: true });
  } catch (error) {
    console.error('Security event reporting error:', error);
    return NextResponse.json(
      { error: 'Failed to report security event' },
      { status: 500 }
    );
  }
}
