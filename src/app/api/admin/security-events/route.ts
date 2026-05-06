import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { serverLog } from '@/lib/server-log';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_LOOKBACK_DAYS = 90;

function boundedPositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = boundedPositiveInt(searchParams.get('page'), 1, 10_000);
    const limit = boundedPositiveInt(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
    const search = searchParams.get('search') || '';
    const eventType = searchParams.get('eventType') || '';
    const sinceParam = searchParams.get('since');

    const defaultSince = new Date();
    defaultSince.setDate(defaultSince.getDate() - DEFAULT_LOOKBACK_DAYS);
    const requestedSince = sinceParam ? new Date(sinceParam) : null;
    const since =
      requestedSince && !Number.isNaN(requestedSince.getTime())
        ? requestedSince
        : defaultSince;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      createdAt: {
        gte: since,
      },
    };

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
      limit,
      since: since.toISOString(),
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
