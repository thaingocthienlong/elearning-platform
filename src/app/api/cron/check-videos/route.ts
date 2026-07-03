import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { describeTencentMedia, extractTencentPlaybackUrls } from '@/lib/tencent/vod';

export async function GET(request: NextRequest) {
    try {
        // Security: Verify cron secret
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            console.error('❌ Unauthorized cron request');
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const pendingVideos = await prisma.video.findMany({
            where: {
                published: false,
                isDeleted: false,
                tencentFileId: { not: null },
            }
        });

        let updatedCount = 0;
        let errorCount = 0;

        // Check each video
        for (const video of pendingVideos) {
            try {
                const mediaInfo = await describeTencentMedia(video.tencentFileId!);
                const urls = extractTencentPlaybackUrls(mediaInfo);

                if (urls.playbackUrl) {
                    await prisma.video.update({
                        where: { id: video.id },
                        data: {
                            dashUrl: urls.dashUrl,
                            hlsUrl: urls.hlsUrl,
                            tencentStatus: 'READY',
                            tencentSyncedAt: new Date(),
                            published: true,
                        },
                    });
                    updatedCount++;
                } else {
                    await prisma.video.update({
                        where: { id: video.id },
                        data: {
                            tencentStatus: video.tencentStatus ?? 'PROCESSING',
                            tencentSyncedAt: new Date(),
                        },
                    });
                }
            } catch (error) {
                console.error(`❌ Error processing video ${video.id}:`, error);
                errorCount++;
            }
        }

        const summary = {
            success: true,
            timestamp: new Date().toISOString(),
            checked: pendingVideos.length,
            updated: updatedCount,
            errors: errorCount,
            pending: pendingVideos.length - updatedCount - errorCount
        };

        return NextResponse.json(summary);

    } catch (error) {
        console.error('❌ Cron job failed:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}
