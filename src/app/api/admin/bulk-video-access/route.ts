import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }
    try {
        const { userIds, videoIds } = await request.json();
        if (!Array.isArray(userIds) || !Array.isArray(videoIds)) {
            return new NextResponse('Invalid input', { status: 400 });
        }
        let created = 0;
        let skipped = 0;
        for (const userId of userIds) {
            for (const videoId of videoIds) {
                try {
                    await prisma.videoAccess.create({ data: { userId, videoId } });
                    created++;
                } catch (error) { skipped++; }
            }
        }
        return NextResponse.json({ created, skipped, total: userIds.length * videoIds.length });
    } catch (error) {
        console.error('Bulk video access error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}