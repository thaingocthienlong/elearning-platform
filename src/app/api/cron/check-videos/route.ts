import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncVideoWithAxinom, extractAxinomId } from '@/lib/axinom-sync';

export async function GET(request: NextRequest) {
    try {
        // Security: Verify cron secret
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            console.error('❌ Unauthorized cron request');
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Find all unpublished videos with Axinom IDs
        const pendingVideos = await prisma.video.findMany({
            where: {
                published: false,
                description: {
                    not: null,
                    contains: 'axinom-id:'
                }
            }
        });

        let updatedCount = 0;
        let errorCount = 0;

        // Check each video
        for (const video of pendingVideos) {
            try {
                const result = await syncVideoWithAxinom(video.id);

                if (result.success) {
                    if (result.updated) {
                        updatedCount++;
                    }
                } else {
                    console.error(`❌ Sync failed for ${video.id}: ${result.error}`);
                    errorCount++;
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
