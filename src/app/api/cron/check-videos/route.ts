import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { activeMediaProvider } from '@/lib/media-provider';

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
                providerJobId: { not: null },
            }
        });

        let updatedCount = 0;
        let errorCount = 0;

        // Check each video
        for (const video of pendingVideos) {
            try {
                const result = await activeMediaProvider.syncProcessing({
                    videoId: video.id,
                    providerJobId: video.providerJobId!,
                    providerContentId: video.providerContentId ?? video.id,
                });

                await prisma.video.update({
                    where: { id: video.id },
                    data: {
                        providerStatus: result.status,
                        providerSyncedAt: new Date(),
                        ...(result.ready
                            ? {
                                published: true,
                                dashUrl: result.dashUrl,
                                hlsUrl: result.hlsUrl,
                            }
                            : {}),
                    },
                });

                if (result.ready) {
                    updatedCount++;
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
