import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET: Fetch video access records for a specific user
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return new NextResponse('userId is required', { status: 400 });
        }

        const videoAccesses = await prisma.videoAccess.findMany({
            where: { userId },
            orderBy: { grantedAt: 'desc' },
        });

        const videos = await prisma.video.findMany({
            where: {
                id: { in: [...new Set(videoAccesses.map((access) => access.videoId))] },
            },
            select: {
                id: true,
                title: true,
                courseId: true,
            },
        });
        const courses = await prisma.course.findMany({
            where: {
                id: { in: [...new Set(videos.map((video) => video.courseId))] },
            },
            select: {
                id: true,
                title: true,
            },
        });
        const videosById = new Map(videos.map((video) => [video.id, video]));
        const coursesById = new Map(courses.map((course) => [course.id, course]));

        return NextResponse.json(
            videoAccesses.map((access) => {
                const video = videosById.get(access.videoId);

                return {
                    ...access,
                    Video: video
                        ? {
                            id: video.id,
                            title: video.title,
                            Course: coursesById.get(video.courseId) ?? null,
                        }
                        : null,
                };
            })
        );
    } catch (error) {
        console.error('Fetch video access error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// POST: Grant video access to a user
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { userId, videoId } = await request.json();

        if (!userId || !videoId) {
            return new NextResponse('userId and videoId are required', { status: 400 });
        }

        // Check if access already exists
        const existing = await prisma.videoAccess.findUnique({
            where: {
                userId_videoId: {
                    userId,
                    videoId,
                },
            },
        });

        if (existing) {
            return new NextResponse('Video access already granted', { status: 400 });
        }

        // Create video access
        const videoAccess = await prisma.videoAccess.create({
            data: {
                userId,
                videoId,
            },
        });

        const [video, user] = await Promise.all([
            prisma.video.findUnique({
                where: { id: videoId },
                select: {
                    title: true,
                    courseId: true,
                },
            }),
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    email: true,
                    name: true,
                },
            }),
        ]);
        const course = video
            ? await prisma.course.findUnique({
                where: { id: video.courseId },
                select: { title: true },
            })
            : null;

        return NextResponse.json({
            ...videoAccess,
            Video: video
                ? {
                    title: video.title,
                    Course: course,
                }
                : null,
            User: user,
        });
    } catch (error) {
        console.error('Grant video access error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// DELETE: Revoke video access from a user
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return new NextResponse('id is required', { status: 400 });
        }

        await prisma.videoAccess.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Revoke video access error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
