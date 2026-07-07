import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { describeTencentMedia, extractTencentPlaybackUrls } from '@/lib/tencent/vod';

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

        if (!video.tencentFileId) {
            return NextResponse.json({ error: 'No Tencent file found for this video' }, { status: 404 });
        }

        const mediaInfo = await describeTencentMedia(video.tencentFileId);
        const urls = extractTencentPlaybackUrls(mediaInfo);

        if (urls.playbackUrl) {
            await prisma.video.update({
                where: { id: videoId },
                data: {
                    published: true,
                    dashUrl: urls.dashUrl,
                    hlsUrl: urls.hlsUrl,
                    hlsUrlClear: urls.hlsUrlClear,
                    tencentAdaptiveTemplateId: urls.tencentAdaptiveTemplateId?.toString(),
                    tencentAppleFallbackDrmType: urls.tencentAppleFallbackDrmType,
                    tencentStatus: 'READY',
                    tencentSyncedAt: new Date(),
                },
            });

            return NextResponse.json({
                status: 'COMPLETED',
                dashUrl: urls.dashUrl,
                hlsUrl: urls.hlsUrl,
                hlsUrlClear: urls.hlsUrlClear,
                playbackUrl: urls.playbackUrl,
            });
        }

        return NextResponse.json({ status: video.tencentStatus ?? 'PROCESSING' });
    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
