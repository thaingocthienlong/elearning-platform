import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encodeVideoViaService } from '@/lib/axinom-video-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { activeMediaProvider } from '@/lib/media-provider';
import { isDoveRunnerTnpError } from '@/lib/media-provider/doverunner';

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

        if (!video) {
            return NextResponse.json({ error: 'Video not found' }, { status: 404 });
        }

        if (video.sourceStorageKey) {
            const result = await activeMediaProvider.submitProcessing({
                videoId: video.id,
                title: video.title,
                sourceKey: video.sourceStorageKey,
            });

            await prisma.video.update({
                where: { id: videoId },
                data: {
                    providerJobId: result.providerJobId,
                    providerContentId: result.providerContentId,
                    providerStatus: result.status,
                    outputStoragePath: result.outputPath,
                    providerSyncedAt: new Date(),
                },
            });

            return NextResponse.json({
                success: true,
                provider: activeMediaProvider.name,
                providerJobId: result.providerJobId,
                providerContentId: result.providerContentId,
                status: result.status,
            });
        }

        if (!video.r2Key) {
            return NextResponse.json({ error: 'Video not found or missing source media key' }, { status: 404 });
        }

        const drmProfileId = process.env.AXINOM_ENCODING_PROFILE_DRM?.trim() || process.env.AX_PROFILE_ID?.trim();
        const clearProfileId = process.env.AXINOM_ENCODING_PROFILE_CLEAR?.trim();

        if (!drmProfileId) {
            throw new Error('AXINOM_ENCODING_PROFILE_DRM or AX_PROFILE_ID is required to submit DRM encoding');
        }

        if (!clearProfileId) {
            throw new Error('AXINOM_ENCODING_PROFILE_CLEAR is required to submit Safari clear HLS encoding');
        }

        const result = await encodeVideoViaService({
            videoTitle: video.title,
            sourceLocation: video.r2Key,
            profileId: drmProfileId,
        });

        const clearResult = await encodeVideoViaService({
            videoTitle: video.title,
            sourceLocation: video.r2Key,
            profileId: clearProfileId,
        });

        await prisma.video.update({
            where: { id: videoId },
            data: {
                axinomVideoId: result.axinomVideoId,
                axinomIdClear: clearResult?.axinomVideoId,
                axinomEncodingStatus: 'SUBMITTED',
            },
        });

        return NextResponse.json({
            success: true,
            axinomVideoId: result.axinomVideoId,
            axinomIdClear: clearResult?.axinomVideoId,
        });
    } catch (error) {
        console.error('Processing error:', error instanceof Error ? error.message : 'UnknownError');
        if (isDoveRunnerTnpError(error)) {
            return NextResponse.json({
                error: error.message,
                providerErrorCode: error.code,
            }, { status: 502 });
        }
        return NextResponse.json({ error: 'Video processing submission failed' }, { status: 500 });
    }
}
