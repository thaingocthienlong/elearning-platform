import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
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
    const where: Prisma.SecurityEventWhereInput = {
      createdAt: {
        gte: since,
      },
    };

    if (eventType) {
      where.eventType = eventType;
    }

    if (search) {
      const [matchingUsers, matchingVideos] = await Promise.all([
        prisma.user.findMany({
          where: {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        }),
        prisma.video.findMany({
          where: { title: { contains: search, mode: 'insensitive' } },
          select: { id: true },
        }),
      ]);

      where.OR = [
        { userId: { in: matchingUsers.map((user) => user.id) } },
        { videoId: { in: matchingVideos.map((video) => video.id) } },
      ];
    }

    // Fetch events with pagination
    const [events, totalCount] = await Promise.all([
      prisma.securityEvent.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.securityEvent.count({ where }),
    ]);

    const eventUserIds = [...new Set(events.map((event) => event.userId))];
    const eventVideoIds = [
      ...new Set(events.flatMap((event) => (event.videoId ? [event.videoId] : []))),
    ];
    const [users, videos] = await Promise.all([
      eventUserIds.length > 0
        ? prisma.user.findMany({
          where: { id: { in: eventUserIds } },
          select: { id: true, name: true, email: true },
        })
        : Promise.resolve([]),
      eventVideoIds.length > 0
        ? prisma.video.findMany({
          where: { id: { in: eventVideoIds } },
          select: { id: true, title: true },
        })
        : Promise.resolve([]),
    ]);
    const usersById = new Map(users.map((user) => [user.id, user]));
    const videosById = new Map(videos.map((video) => [video.id, video]));
    const formattedEvents = events.map((event) => ({
      ...event,
      User: usersById.get(event.userId) ?? {
        name: 'Nguoi dung khong ton tai',
        email: 'Email khong ton tai',
      },
      Video: event.videoId ? (videosById.get(event.videoId) ?? null) : null,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      events: formattedEvents,
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
