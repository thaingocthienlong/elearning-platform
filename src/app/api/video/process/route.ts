import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processTencentMedia } from '@/lib/tencent/vod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const maxDuration = 300;

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { videoId } = await request.json();

        if (!videoId) {
            return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
        }

        const video = await prisma.video.findUnique({
            where: { id: videoId },
        });

        if (!video || !video.tencentFileId) {
            return NextResponse.json({ error: 'Video not found or missing Tencent file ID' }, { status: 404 });
        }

        const result = await processTencentMedia(video.tencentFileId);

        await prisma.video.update({
            where: { id: videoId },
            data: {
                tencentTaskId: result.TaskId,
                tencentStatus: 'PROCESSING',
            },
        });

        return NextResponse.json({
            success: true,
            provider: 'tencent',
            taskId: result.TaskId,
        });
    } catch (error) {
        console.error('Processing error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
