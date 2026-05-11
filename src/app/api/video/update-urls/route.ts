import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { azureStorage } from '@/lib/azure-storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { axinomVideoId } = await request.json();

        if (!axinomVideoId) {
            return NextResponse.json({ error: 'Axinom Video ID required' }, { status: 400 });
        }

        // Find the video by Axinom ID in description
        const video = await prisma.video.findFirst({
            where: {
                description: {
                    contains: axinomVideoId
                }
            }
        });

        if (!video) {
            return NextResponse.json({ error: 'Video not found' }, { status: 404 });
        }

        // Construct manifest URLs based on Axinom's output structure
        const outputFolder = video.r2Key; // This is the folder ID
        const dashUrl = `https://${azureStorage.accountName}.blob.core.windows.net/${azureStorage.outputContainer}/${outputFolder}/cmaf/manifest.mpd`;
        const hlsUrl = `https://${azureStorage.accountName}.blob.core.windows.net/${azureStorage.outputContainer}/${outputFolder}/cmaf/manifest.m3u8`;

        // Update video with URLs
        await prisma.video.update({
            where: { id: video.id },
            data: {
                dashUrl,
                hlsUrl,
                published: true,
                // Note: drmKeyId should be fetched from Axinom API in a real implementation
                drmKeyId: 'a8b3af37-34d9-4ac0-aca8-3954904679c3' // For now, use the key from encoding
            }
        });

        return NextResponse.json({
            success: true,
            dashUrl,
            hlsUrl
        });
    } catch (error) {
        console.error('Update URLs error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
