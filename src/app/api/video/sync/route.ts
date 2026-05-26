import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activeMediaProvider } from '@/lib/media-provider';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { videoId } = await request.json();

        if (!videoId) {
            return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
        }

        const video = await prisma.video.findUnique({ where: { id: videoId } });

        if (!video) {
            return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
        }

        if (!video.providerJobId || !video.providerContentId) {
            return NextResponse.json({ success: false, error: 'No provider job found' }, { status: 404 });
        }

        const result = await activeMediaProvider.syncProcessing({
            videoId: video.id,
            providerJobId: video.providerJobId,
            providerContentId: video.providerContentId,
        });

        await prisma.video.update({
            where: { id: videoId },
            data: {
                providerStatus: result.status,
                providerSyncedAt: new Date(),
                ...(result.ready
                    ? {
                        dashUrl: result.dashUrl,
                        hlsUrl: result.hlsUrl,
                        published: true,
                    }
                    : {}),
            },
        });

        return NextResponse.json({
            success: true,
            status: result.status,
            updated: result.ready,
            dashUrl: result.dashUrl,
            hlsUrl: result.hlsUrl,
        });
    } catch (error) {
        console.error('Status sync error:', error instanceof Error ? error.message : 'UnknownError');
        return NextResponse.json(
            { success: false, error: 'Video status sync failed' },
            { status: 500 }
        );
    }
}
