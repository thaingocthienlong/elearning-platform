import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const videos = await prisma.video.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                createdAt: true,
                published: true,
                description: true,
                dashUrl: true,
                hlsUrl: true,
                hlsUrlClear: true,
                mediaProvider: true,
                providerContentId: true,
                providerJobId: true,
                providerStatus: true,
                sourceStorageKey: true,
                outputStoragePath: true,
                providerSyncedAt: true,
            }
        });

        return NextResponse.json(videos);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
    }
}
