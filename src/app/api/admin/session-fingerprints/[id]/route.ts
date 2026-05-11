import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revokeSession } from '@/lib/session-revocation';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;

    // Get session details before deleting (to get user email and token)
    const sessionToDelete = await prisma.session.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!sessionToDelete) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Mark session as revoked in Redis for SSE clients
    // This will trigger immediate sign-out for connected clients
    await revokeSession(sessionToDelete.sessionToken, 'Revoked by admin');

    // Delete the session from database and record the revocation
    await prisma.$transaction([
      // Delete the session
      prisma.session.delete({
        where: { id },
      }),
      // Record revocation for cooldown/audit
      prisma.revokedSession.create({
        data: {
          email: sessionToDelete.user.email!,
          reason: 'Revoked by admin',
        },
      }),
    ]);

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Session revoked and deleted for:', sessionToDelete.user.email);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session fingerprint deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete session fingerprint' },
      { status: 500 }
    );
  }
}
