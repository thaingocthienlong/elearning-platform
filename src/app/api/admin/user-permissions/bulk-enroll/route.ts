import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { courseId, userIds: targetUserIds, action } = await request.json();

        if (!courseId) {
            return new NextResponse('Course ID is required', { status: 400 });
        }

        // Default to ENROLL_ONLY if not specified, for safety, or reject? 
        // Let's default to ENROLL_ONLY to be safe.
        const mode = action === 'SYNC_VIDEO_ACCESS' ? 'SYNC_VIDEO_ACCESS' : 'ENROLL_ONLY';

        // 1. Get all videos for this course
        const videos = await prisma.video.findMany({
            where: { courseId, isDeleted: false },
            select: { id: true }
        });

        const videoIds = videos.map(v => v.id);

        // 2. Determine users to process
        let allUsers: { id: string }[] = [];

        if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
            // Process specific users (Client-side Chunking)
            allUsers = targetUserIds.map((id: string) => ({ id }));
        } else {
            // Process ALL users (Legacy / Fallback)
            allUsers = await prisma.user.findMany({
                where: { isDeleted: false },
                select: { id: true }
            });
        }

        console.log(`Processing bulk action: ${mode} for ${allUsers.length} users into course ${courseId}`);

        let totalUsersEnrolled = 0;
        let totalVideoAccessGranted = 0;

        // 3. Process in chunks
        const CHUNK_SIZE = 50;
        for (let i = 0; i < allUsers.length; i += CHUNK_SIZE) {
            const userChunk = allUsers.slice(i, i + CHUNK_SIZE);
            const userIds = userChunk.map(u => u.id);

            // === A. MODE: ENROLL_ONLY ===
            if (mode === 'ENROLL_ONLY') {
                const existingEnrollments = await prisma.enrollment.findMany({
                    where: {
                        courseId,
                        userId: { in: userIds },
                    },
                    select: { userId: true, isDeleted: true }
                });

                const existingEnrollmentMap = new Map(existingEnrollments.map(e => [e.userId, e]));
                const userIdsToCreate: string[] = [];
                const userIdsToReactivate: string[] = [];

                for (const user of userChunk) {
                    const existing = existingEnrollmentMap.get(user.id);
                    if (!existing) {
                        userIdsToCreate.push(user.id);
                    } else if (existing.isDeleted) {
                        userIdsToReactivate.push(user.id);
                    }
                }

                if (userIdsToReactivate.length > 0) {
                    const updateResult = await prisma.enrollment.updateMany({
                        where: { courseId, userId: { in: userIdsToReactivate } },
                        data: { isDeleted: false, enrolledAt: new Date() }
                    });
                    totalUsersEnrolled += updateResult.count;
                }

                if (userIdsToCreate.length > 0) {
                    const enrollmentData = userIdsToCreate.map(userId => ({
                        userId: userId,
                        courseId: courseId,
                    }));
                    const result = await prisma.enrollment.createMany({ data: enrollmentData });
                    totalUsersEnrolled += result.count;
                }
            }

            // === B. MODE: SYNC_VIDEO_ACCESS ===
            if (mode === 'SYNC_VIDEO_ACCESS') {
                if (videoIds.length > 0) {
                    // Only grant access to users who ARE enrolled (active)
                    const enrolledUsersInChunk = await prisma.enrollment.findMany({
                        where: {
                            courseId,
                            userId: { in: userIds },
                            isDeleted: false
                        },
                        select: { userId: true }
                    });

                    const enrolledUserIds = enrolledUsersInChunk.map(e => e.userId);

                    if (enrolledUserIds.length > 0) {
                        const existingAccess = await prisma.videoAccess.findMany({
                            where: {
                                userId: { in: enrolledUserIds },
                                videoId: { in: videoIds }
                            },
                            select: { userId: true, videoId: true }
                        });

                        const existingAccessSet = new Set(existingAccess.map(a => `${a.userId}-${a.videoId}`));
                        const newAccessData: { userId: string; videoId: string }[] = [];

                        for (const userId of enrolledUserIds) {
                            for (const videoId of videoIds) {
                                if (!existingAccessSet.has(`${userId}-${videoId}`)) {
                                    newAccessData.push({ userId, videoId });
                                }
                            }
                        }

                        if (newAccessData.length > 0) {
                            const accessResult = await prisma.videoAccess.createMany({ data: newAccessData });
                            totalVideoAccessGranted += accessResult.count;
                        }
                    }
                }
            }
        }

        return NextResponse.json({
            message: 'Bulk enrollment complete',
            usersEnrolled: totalUsersEnrolled,
            videoAccessGranted: totalVideoAccessGranted
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Bulk enrollment error:', error);
        // Retrun the actual error message to help debugging
        return new NextResponse(`Internal Server Error: ${message}`, { status: 500 });
    }
}

