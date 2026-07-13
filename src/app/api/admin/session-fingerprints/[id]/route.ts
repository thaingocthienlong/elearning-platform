import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revokeSession } from '@/lib/session-revocation';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;

    // Fetch scalar session data first so orphaned sessions remain revocable.
    const sessionToDelete = await prisma.session.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        sessionToken: true,
      },
    });

    if (!sessionToDelete) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionToDelete.userId },
      select: { email: true },
    });
    const auditEmail = user?.email ?? `deleted-user:${sessionToDelete.userId}`;

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
          email: auditEmail,
          reason: 'Revoked by admin',
        },
      }),
    ]);

    if (process.env.NODE_ENV === 'development') {
      console.log('Session revoked and deleted for:', auditEmail);
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
