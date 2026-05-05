import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encodeVideoViaService } from '@/lib/axinom-video-service';
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

        if (!video || !video.r2Key) {
            return NextResponse.json({ error: 'Video not found or missing blob key' }, { status: 404 });
        }

        const result = await encodeVideoViaService({
            videoTitle: video.title,
            sourceLocation: video.r2Key,
        });

        console.log('DRM encoding job created:', result.axinomVideoId);

        // Also trigger clear (non-DRM) encoding for iOS/Safari
        let clearResult = null;
        const clearProfileId = process.env.AXINOM_ENCODING_PROFILE_CLEAR;

        console.log('Clear profile ID from env:', clearProfileId);

        if (clearProfileId) {
            try {
                console.log('Starting clear encoding job...');
                clearResult = await encodeVideoViaService({
                    videoTitle: video.title,
                    sourceLocation: video.r2Key,
                    profileId: clearProfileId,
                });
                console.log('Clear encoding job created:', clearResult.axinomVideoId);
            } catch (error) {
                console.error('Clear encoding job failed (non-critical):', error);
            }
        } else {
            console.warn('AXINOM_ENCODING_PROFILE_CLEAR not set - skipping clear encoding');
        }

        await prisma.video.update({
            where: { id: videoId },
            data: {
                axinomVideoId: result.axinomVideoId,
                axinomIdClear: clearResult?.axinomVideoId,
                axinomEncodingStatus: 'SUBMITTED',
            },
        });

        console.log('Video updated in database:', {
            videoId,
            axinomId: result.axinomVideoId,
            axinomIdClear: clearResult?.axinomVideoId
        });

        return NextResponse.json({
            success: true,
            axinomVideoId: result.axinomVideoId,
            axinomIdClear: clearResult?.axinomVideoId,
        });
    } catch (error) {
        console.error('Processing error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
