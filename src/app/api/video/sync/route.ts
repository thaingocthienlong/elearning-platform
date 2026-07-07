import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { describeTencentMedia, extractTencentPlaybackUrls } from '@/lib/tencent/vod';

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

        if (!video?.tencentFileId) {
            return NextResponse.json(
                { success: false, error: 'No Tencent file ID found' },
                { status: 404 }
            );
        }

        const mediaInfo = await describeTencentMedia(video.tencentFileId);
        const urls = extractTencentPlaybackUrls(mediaInfo);

        const updated = await prisma.video.update({
            where: { id: videoId },
            data: {
                dashUrl: urls.dashUrl,
                hlsUrl: urls.hlsUrl,
                hlsUrlClear: urls.hlsUrlClear,
                tencentAdaptiveTemplateId: urls.tencentAdaptiveTemplateId?.toString(),
                tencentAppleFallbackDrmType: urls.tencentAppleFallbackDrmType,
                tencentStatus: urls.playbackUrl ? 'READY' : (video.tencentStatus ?? 'PROCESSING'),
                tencentSyncedAt: new Date(),
                published: Boolean(urls.playbackUrl),
            },
        });

        return NextResponse.json({
            success: true,
            status: updated.tencentStatus,
            updated: true,
            dashUrl: updated.dashUrl,
            hlsUrl: updated.hlsUrl,
            hlsUrlClear: updated.hlsUrlClear,
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}
