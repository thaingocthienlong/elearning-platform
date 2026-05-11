import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getJobStatus } from '@/lib/axinom-encoding';
import { prisma } from '@/lib/prisma';
import { azureStorage } from '@/lib/azure-storage';

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

        // Extract job ID from description (temporary storage)
        const jobIdMatch = video.description?.match(/Job ID: (.+)/);
        if (!jobIdMatch) {
            return NextResponse.json({ error: 'No encoding job found for this video' }, { status: 404 });
        }

        const jobId = jobIdMatch[1];
        const status = await getJobStatus(jobId);

        // If completed, update video with URLs
        if (status.status === 'COMPLETED' || status.status === 'Finished') {
            const dashUrl = azureStorage.getOutputUrl(`${videoId}/manifest.mpd`);
            const hlsUrl = azureStorage.getOutputUrl(`${videoId}/master.m3u8`);

            await prisma.video.update({
                where: { id: videoId },
                data: {
                    published: true,
                    dashUrl: dashUrl,
                    hlsUrl: hlsUrl,
                },
            });

            return NextResponse.json({
                status: 'COMPLETED',
                dashUrl,
                hlsUrl,
            });
        }

        return NextResponse.json({ status: status.status });
    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
