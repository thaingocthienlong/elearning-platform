import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { serverLog } from '@/lib/server-log';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const eventType = searchParams.get('eventType') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (eventType) {
      where.eventType = eventType;
    }

    if (search) {
      where.OR = [
        {
          User: {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          Video: {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    // Fetch events with pagination
    const [events, totalCount] = await Promise.all([
      prisma.securityEvent.findMany({
        where,
        include: {
          User: {
            select: {
              name: true,
              email: true,
            },
          },
          Video: {
            select: {
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.securityEvent.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      events,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('Security events fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security events' },
      { status: 500 }
    );
  }
}


export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN' || !session.user.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== 'FLUSH_SECURITY_EVENTS') {
      return NextResponse.json(
        { error: 'Explicit confirmation required' },
        { status: 400 }
      );
    }

    const result = await prisma.securityEvent.deleteMany({});
    await prisma.securityEvent.create({
      data: {
        userId: session.user.id,
        eventType: 'SECURITY_EVENTS_FLUSHED',
        metadata: {
          deletedCount: result.count,
          confirmed: true,
        },
        ipAddress:
          req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          req.headers.get('x-real-ip') ||
          null,
        userAgent: req.headers.get('user-agent'),
      },
    });

    serverLog.warn('Security events flushed', {
      adminUserId: session.user.id,
      deletedCount: result.count,
    });

    return NextResponse.json({
      message: 'All security events flushed successfully',
      count: result.count
    });
  } catch (error) {
    serverLog.error('Security events flush error', error);
    return NextResponse.json(
      { error: 'Failed to flush security events' },
      { status: 500 }
    );
  }
}
