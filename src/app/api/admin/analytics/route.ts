import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCached } from '@/lib/redis';

const ANALYTICS_WINDOW_DAYS = 30;
const ANALYTICS_CACHE_TTL_SECONDS = 60;
const POPULAR_LIMIT = 10;
const TOP_VIEWER_SCAN_LIMIT = 100;
const RECENT_ACTIVITY_LIMIT = 20;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    void req;
    const payload = await getCached('admin:analytics:v1', buildAnalyticsPayload, ANALYTICS_CACHE_TTL_SECONDS);

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

async function buildAnalyticsPayload() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - ANALYTICS_WINDOW_DAYS);

    // Fetch overview metrics
    const [
      totalUsers,
      activeUsers,
      totalCourses,
      publishedCourses,
      totalVideos,
      publishedVideos,
      totalEnrollments,
      totalViews,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          WatchRecord: {
            some: {
              lastViewedAt: {
                gte: thirtyDaysAgo,
              },
            },
          },
        },
      }),
      prisma.course.count({ where: { isDeleted: false } }),
      prisma.course.count({ where: { published: true, isDeleted: false } }),
      prisma.video.count({ where: { isDeleted: false } }),
      prisma.video.count({ where: { published: true, isDeleted: false } }),
      prisma.enrollment.count({ where: { isDeleted: false } }),
      prisma.watchRecord.aggregate({
        _sum: {
          viewCount: true,
        },
        where: {
          lastViewedAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
    ]);

    // Fetch popular videos (top 10 by view count)
    const popularVideosRaw = await prisma.video.findMany({
      where: {
        published: true,
        isDeleted: false,
      },
      select: {
        id: true,
        title: true,
        courseId: true,
        WatchRecord: {
          select: {
            viewCount: true,
            userId: true,
          },
        },
      },
      orderBy: {
        WatchRecord: {
          _count: 'desc',
        },
      },
      take: POPULAR_LIMIT,
    });

    const popularVideoCourseIds = [...new Set(popularVideosRaw.map((video) => video.courseId))];
    const popularVideoCourses = popularVideoCourseIds.length > 0
      ? await prisma.course.findMany({
          where: { id: { in: popularVideoCourseIds } },
          select: { id: true, title: true },
        })
      : [];
    const popularVideoCoursesById = new Map(
      popularVideoCourses.map((course) => [course.id, course.title])
    );

    const popularVideos = popularVideosRaw.map((video) => {
      const totalViewCount = video.WatchRecord.reduce(
        (sum, record) => sum + record.viewCount,
        0
      );
      const uniqueViewers = new Set(video.WatchRecord.map((r) => r.userId)).size;

      return {
        id: video.id,
        title: video.title,
        courseTitle: popularVideoCoursesById.get(video.courseId) ?? 'Unknown Course',
        viewCount: totalViewCount,
        uniqueViewers,
      };
    }).sort((a, b) => b.viewCount - a.viewCount);

    // Fetch popular courses (top 10 by enrollment count)
    const popularCoursesRaw = await prisma.course.findMany({
      where: {
        published: true,
        isDeleted: false,
      },
      select: {
        id: true,
        title: true,
        Enrollment: {
          where: {
            isDeleted: false,
          },
          select: {
            id: true,
          },
        },
        Video: {
          where: {
            isDeleted: false,
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        Enrollment: {
          _count: 'desc',
        },
      },
      take: POPULAR_LIMIT,
    });

    const popularCourses = popularCoursesRaw.map((course) => ({
      id: course.id,
      title: course.title,
      enrollmentCount: course.Enrollment.length,
      videoCount: course.Video.length,
    }));

    // Fetch top viewers (users with most total views)
    const topViewersRaw = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        WatchRecord: {
          select: {
            viewCount: true,
            videoId: true,
          },
        },
      },
      where: {
        WatchRecord: {
          some: {
            lastViewedAt: {
              gte: thirtyDaysAgo,
            },
          },
        },
      },
      take: TOP_VIEWER_SCAN_LIMIT,
    });

    const topViewers = topViewersRaw
      .map((user) => {
        const totalViews = user.WatchRecord.reduce(
          (sum, record) => sum + record.viewCount,
          0
        );
        const uniqueVideos = new Set(user.WatchRecord.map((r) => r.videoId)).size;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          totalViews,
          uniqueVideos,
        };
      })
      .filter((user) => user.totalViews > 0)
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 10);

    // Fetch recent activity (latest 20 watch records)
    const recentActivityRaw = await prisma.watchRecord.findMany({
      where: {
        viewCount: {
          gt: 0,
        },
        lastViewedAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        id: true,
        userId: true,
        videoId: true,
        viewCount: true,
        lastViewedAt: true,
      },
      orderBy: {
        lastViewedAt: 'desc',
      },
      take: RECENT_ACTIVITY_LIMIT,
    });

    const recentUserIds = [...new Set(recentActivityRaw.map((record) => record.userId))];
    const recentVideoIds = [...new Set(recentActivityRaw.map((record) => record.videoId))];
    const [recentUsers, recentVideos] = await Promise.all([
      recentUserIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: recentUserIds } },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
      recentVideoIds.length > 0
        ? prisma.video.findMany({
            where: { id: { in: recentVideoIds } },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
    ]);
    const recentUsersById = new Map(recentUsers.map((user) => [user.id, user]));
    const recentVideosById = new Map(recentVideos.map((video) => [video.id, video]));

    const recentActivity = recentActivityRaw.map((record) => {
      const user = recentUsersById.get(record.userId);
      const video = recentVideosById.get(record.videoId);
      return {
        id: record.id,
        userName: user?.name || (user ? 'No name' : 'Deleted user'),
        userEmail: user?.email ?? `deleted-user:${record.userId}`,
        videoTitle: video?.title ?? 'Deleted video',
        lastViewedAt: record.lastViewedAt.toISOString(),
        viewCount: record.viewCount,
      };
    });

    const viewsRaw = await prisma.watchRecord.groupBy({
      by: ['lastViewedAt'],
      _sum: {
        viewCount: true,
      },
      where: {
        lastViewedAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Group by date (YYYY-MM-DD) manually since Prisma groupBy is on DateTime
    const viewsMap = new Map<string, number>();

    // Initialize last 30 days with 0
    for (let i = 0; i < ANALYTICS_WINDOW_DAYS; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      viewsMap.set(dateStr, 0);
    }

    viewsRaw.forEach((item) => {
      const dateStr = item.lastViewedAt.toISOString().split('T')[0];
      const current = viewsMap.get(dateStr) || 0;
      viewsMap.set(dateStr, current + (item._sum.viewCount || 0));
    });

    const viewsOverTime = Array.from(viewsMap.entries())
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      overview: {
        totalUsers,
        activeUsers,
        totalCourses,
        publishedCourses,
        totalVideos,
        publishedVideos,
        totalViews: totalViews._sum.viewCount || 0,
        totalEnrollments,
      },
      popularVideos,
      popularCourses,
      topViewers,
      recentActivity,
      viewsOverTime,
    };
}
