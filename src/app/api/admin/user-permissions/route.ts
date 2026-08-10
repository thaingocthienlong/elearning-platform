import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { invalidateCacheKey, invalidateCache } from '@/lib/redis';
import { z } from 'zod';

const permissionUpdateSchema = z.object({
    userId: z.string().min(1),
    enrollments: z.array(z.string().min(1)).max(500),
    videoAccess: z.array(z.string().min(1)).max(2_000),
});

// GET - Fetch user's current permissions
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return new NextResponse('User ID is required', { status: 400 });
        }

        const [enrollments, videoAccess] = await Promise.all([
            prisma.enrollment.findMany({
                where: {
                    userId,
                    isDeleted: false,
                },
                select: { courseId: true },
            }),
            prisma.videoAccess.findMany({
                where: { userId },
                select: { videoId: true },
            }),
        ]);

        const [activeCourses, activeVideos] = await Promise.all([
            prisma.course.findMany({
                where: {
                    id: { in: enrollments.map((enrollment) => enrollment.courseId) },
                    isDeleted: false,
                },
                select: { id: true },
            }),
            prisma.video.findMany({
                where: {
                    id: { in: videoAccess.map((access) => access.videoId) },
                    isDeleted: false,
                },
                select: { id: true, courseId: true },
            }),
        ]);

        const activeCourseIds = new Set(activeCourses.map((course) => course.id));
        const activeVideoIds = new Set(
            activeVideos
                .filter((video) => activeCourseIds.has(video.courseId))
                .map((video) => video.id)
        );

        return NextResponse.json({
            enrollments: enrollments
                .map((enrollment) => enrollment.courseId)
                .filter((courseId) => activeCourseIds.has(courseId)),
            videoAccess: videoAccess
                .map((access) => access.videoId)
                .filter((videoId) => activeVideoIds.has(videoId)),
        });
    } catch (error) {
        console.error('Failed to fetch user permissions:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// POST - Update user's permissions
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const parsed = permissionUpdateSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid permissions payload' }, { status: 400 });
        }
        const userId = parsed.data.userId;
        const enrollments = [...new Set(parsed.data.enrollments)];
        const videoAccess = [...new Set(parsed.data.videoAccess)];

        const [user, courseCount, videos] = await Promise.all([
            prisma.user.findFirst({
                where: { id: userId, isDeleted: false },
                select: { id: true },
            }),
            prisma.course.count({
                where: { id: { in: enrollments }, isDeleted: false },
            }),
            prisma.video.findMany({
                where: { id: { in: videoAccess }, isDeleted: false },
                select: { id: true, courseId: true },
            }),
        ]);

        if (!user || courseCount !== enrollments.length || videos.length !== videoAccess.length) {
            return NextResponse.json({ error: 'Permissions reference an inactive or missing record' }, { status: 400 });
        }

        const invalidVideos = videos.filter(
            (video) => !enrollments.includes(video.courseId)
        );

        if (invalidVideos.length > 0) {
            return new NextResponse(
                'Cannot grant video access for videos in courses user is not enrolled in',
                { status: 400 }
            );
        }

        // Get current enrollments and video access
        const currentEnrollments = await prisma.enrollment.findMany({
            where: { userId, isDeleted: false },
            select: { id: true, courseId: true },
        });

        const currentVideoAccess = await prisma.videoAccess.findMany({
            where: { userId },
            select: { id: true, videoId: true },
        });

        const currentEnrollmentCourseIds = currentEnrollments.map((e) => e.courseId);
        const currentVideoAccessIds = currentVideoAccess.map((v) => v.videoId);

        // Calculate changes for enrollments
        const enrollmentsToAdd = enrollments.filter(
            (id: string) => !currentEnrollmentCourseIds.includes(id)
        );
        const enrollmentsToRemove = currentEnrollments.filter(
            (e) => !enrollments.includes(e.courseId)
        );

        // Calculate changes for video access
        const videoAccessToAdd = videoAccess.filter(
            (id: string) => !currentVideoAccessIds.includes(id)
        );
        const videoAccessToRemove = currentVideoAccess.filter(
            (v) => !videoAccess.includes(v.videoId)
        );

        // Execute changes in a transaction
        await prisma.$transaction(async (tx) => {
            // Add new enrollments (Upsert to handle soft-deleted reactivation)
            for (const courseId of enrollmentsToAdd) {
                await tx.enrollment.upsert({
                    where: {
                        userId_courseId: {
                            userId,
                            courseId
                        }
                    },
                    create: { userId, courseId },
                    update: { isDeleted: false, enrolledAt: new Date() }
                });
            }

            // Soft delete removed enrollments and clean up video access
            for (const enrollment of enrollmentsToRemove) {
                await tx.enrollment.update({
                    where: { id: enrollment.id },
                    data: { isDeleted: true },
                });

                // Remove video access for videos in the removed course
                const videosInCourse = await tx.video.findMany({
                    where: { courseId: enrollment.courseId },
                    select: { id: true },
                });

                const videoIdsInCourse = videosInCourse.map((v) => v.id);

                if (videoIdsInCourse.length > 0) {
                    await tx.videoAccess.deleteMany({
                        where: {
                            userId,
                            videoId: { in: videoIdsInCourse },
                        },
                    });
                }
            }

            // Add new video access
            for (const videoId of videoAccessToAdd) {
                try {
                    await tx.videoAccess.create({
                        data: { userId, videoId },
                    });
                } catch (error: unknown) {
                    if ((error as { code?: string }).code !== 'P2002') {
                        // Ignore duplicates
                        throw error;
                    }
                }
            }

            // Delete removed video access
            for (const access of videoAccessToRemove) {
                await tx.videoAccess.delete({
                    where: { id: access.id },
                });
            }
        });

        // Invalidate user's course and video access caches
        try {
            await invalidateCacheKey(`courses:user:${userId}`);
            await invalidateCache(`access:${userId}:*`);
        } catch (cacheError) {
            console.error('Failed to invalidate cache:', cacheError);
            // Non-blocking error
        }

        return NextResponse.json({
            enrollmentsCreated: enrollmentsToAdd.length,
            enrollmentsDeleted: enrollmentsToRemove.length,
            videoAccessCreated: videoAccessToAdd.length,
            videoAccessDeleted: videoAccessToRemove.length,
        });
    } catch (error: unknown) {
        console.error('Failed to update user permissions:', error);
        return NextResponse.json({ error: 'Failed to update user permissions' }, { status: 500 });
    }
}
