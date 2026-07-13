import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const videos = await prisma.video.findMany({
            where: {
                published: true,
                isDeleted: false,
            },
            select: {
                id: true,
                title: true,
                courseId: true,
            },
            orderBy: [
                { courseId: 'asc' },
                { position: 'asc' },
            ],
        });

        const courseIds = [...new Set(videos.map((video) => video.courseId))];
        const courses = courseIds.length > 0
            ? await prisma.course.findMany({
                where: { id: { in: courseIds } },
                select: { id: true, title: true },
            })
            : [];
        const coursesById = new Map(courses.map((course) => [course.id, course]));

        // Transform to simpler format
        const formattedVideos = videos.map((video) => ({
            id: video.id,
            title: video.title,
            courseId: video.courseId,
            courseTitle: coursesById.get(video.courseId)?.title || 'Unknown Course',
        }));

        return NextResponse.json(formattedVideos);
    } catch (error) {
        console.error('Fetch all videos error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
