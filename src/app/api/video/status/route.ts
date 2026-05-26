import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activeMediaProvider } from '@/lib/media-provider';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { videoId } = await request.json();

        const video = await prisma.video.findUnique({
            where: { id: videoId },
        });

        if (!video) {
            return NextResponse.json({ error: 'Video not found' }, { status: 404 });
        }

        if (!video.providerJobId) {
            return NextResponse.json({ error: 'No provider processing job found for this video' }, { status: 404 });
        }

        const result = await activeMediaProvider.syncProcessing({
            videoId,
            providerJobId: video.providerJobId,
            providerContentId: video.providerContentId ?? video.id,
        });

        if (result.ready) {
            await prisma.video.update({
                where: { id: videoId },
                data: {
                    published: true,
                    providerStatus: result.status,
                    providerSyncedAt: new Date(),
                    dashUrl: result.dashUrl,
                    hlsUrl: result.hlsUrl,
                },
            });

            return NextResponse.json({
                status: result.status,
                dashUrl: result.dashUrl,
                hlsUrl: result.hlsUrl,
            });
        }

        await prisma.video.update({
            where: { id: videoId },
            data: {
                providerStatus: result.status,
                providerSyncedAt: new Date(),
            },
        });

        return NextResponse.json({ status: result.status });
    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
