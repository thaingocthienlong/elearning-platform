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
            include: {
                Course: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: [
                { courseId: 'asc' },
                { position: 'asc' },
            ],
        });

        // Transform to simpler format
        const formattedVideos = videos.map((video) => ({
            id: video.id,
            title: video.title,
            courseId: video.courseId,
            courseTitle: video.Course?.title || 'Unknown Course',
        }));

        return NextResponse.json(formattedVideos);
    } catch (error) {
        console.error('Fetch all videos error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
