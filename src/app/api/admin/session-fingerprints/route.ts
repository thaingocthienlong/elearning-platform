import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    const skip = (page - 1) * limit;
    const where: Prisma.SessionWhereInput = {};

    if (search) {
      const matchingUsers = await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      const matchingUserIds = matchingUsers.map((user) => user.id);

      where.OR = [
        { userId: { in: matchingUserIds } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Identify suspicious users (sharing accounts via multiple IPs)
    // Use findMany + distinct instead of groupBy to avoid Prisma engine panic
    const userIpGroups = await prisma.session.findMany({
      where: {
        expires: { gt: new Date() }, // Only count currently valid sessions
      },
      select: {
        userId: true,
        ipAddress: true,
      },
      distinct: ['userId', 'ipAddress'],
    });

    const ipCountsByUser = userIpGroups.reduce((acc, curr) => {
      if (curr.userId) {
        acc[curr.userId] = (acc[curr.userId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const suspiciousUserIds = Object.keys(ipCountsByUser).filter(
      (userId) => ipCountsByUser[userId] > 1
    );

    if (searchParams.get('suspicious') === 'true') {
      where.userId = { in: suspiciousUserIds };
    }

    const [sessions, totalCount, uniqueUsers] = await Promise.all([
      prisma.session.findMany({
        where,
        select: {
          id: true,
          userId: true,
          fingerprint: true,
          userAgent: true,
          ipAddress: true,
          lastActive: true,
          expires: true,
        },
        orderBy: {
          lastActive: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.session.count({ where }),
      prisma.session.findMany({
        where,
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    const sessionUserIds = [...new Set(sessions.map((sessionRecord) => sessionRecord.userId))];
    const users = sessionUserIds.length > 0
      ? await prisma.user.findMany({
        where: { id: { in: sessionUserIds } },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })
      : [];
    const usersById = new Map(users.map((user) => [user.id, user]));
    const formattedSessions = sessions.map((sessionRecord) => {
      const user = usersById.get(sessionRecord.userId);

      return {
        ...sessionRecord,
        user: {
          name: user?.name ?? 'Nguoi dung khong ton tai',
          email: user?.email ?? sessionRecord.userId,
        },
      };
    });

    // Calculate active sessions (last active within 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const activeSessions = sessions.filter(
      (s) => new Date(s.lastActive) > thirtyMinutesAgo
    ).length;

    // Calculate suspicious sessions logic is now handled above
    // const userFingerprints = ... (removed)

    const stats = {
      totalSessions: totalCount,
      activeSessions,
      uniqueUsers: uniqueUsers.length,
      suspiciousCount: suspiciousUserIds.length,
    };

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      sessions: formattedSessions,
      stats,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('Session fingerprints fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session fingerprints' },
      { status: 500 }
    );
  }
}
