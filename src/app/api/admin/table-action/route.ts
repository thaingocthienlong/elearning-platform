import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { invalidateCache, invalidateCacheKey } from '@/lib/redis';
import { revokeSession } from '@/lib/session-revocation';

const actionSchema = z.object({
  table: z.enum(['user', 'course', 'enrollment']),
  ids: z.array(z.string().min(1)).min(1).max(100),
  action: z.enum(['delete', 'restore']),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid table action' }, { status: 400 });
  }

  const { table, ids, action } = parsed.data;
  const isDeleted = action === 'delete';

  if (table === 'user' && isDeleted && session.user.id && ids.includes(session.user.id)) {
    return NextResponse.json({ error: 'You cannot delete your own admin account' }, { status: 400 });
  }

  try {
    let count = 0;

    if (table === 'user') {
      if (isDeleted) {
        const sessions = await prisma.session.findMany({
          where: { userId: { in: ids } },
          select: { sessionToken: true },
        });
        await Promise.all(
          sessions.map((record) => revokeSession(record.sessionToken, 'User disabled by admin'))
        );
        await prisma.session.deleteMany({ where: { userId: { in: ids } } });
      }

      const result = await prisma.user.updateMany({
        where: { id: { in: ids } },
        data: { isDeleted },
      });
      count = result.count;
    } else if (table === 'course') {
      const result = await prisma.course.updateMany({
        where: { id: { in: ids } },
        data: { isDeleted },
      });
      count = result.count;
      await invalidateCache('courses:*');
    } else {
      const enrollments = await prisma.enrollment.findMany({
        where: { id: { in: ids } },
        select: { userId: true },
      });
      const result = await prisma.enrollment.updateMany({
        where: { id: { in: ids } },
        data: { isDeleted },
      });
      count = result.count;
      await Promise.all(
        [...new Set(enrollments.map((record) => record.userId))].map((userId) =>
          invalidateCacheKey(`courses:user:${userId}`)
        )
      );
    }

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Table action failed:', error);
    return NextResponse.json({ error: 'Table action failed' }, { status: 500 });
  }
}
