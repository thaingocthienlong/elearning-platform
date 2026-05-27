import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET - Fetch all watch records
export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const records = await prisma.watchRecord.findMany({
            orderBy: { lastViewedAt: 'desc' },
        });

        const userIds = [...new Set(records.map((record) => record.userId))];
        const videoIds = [...new Set(records.map((record) => record.videoId))];

        const [users, videos] = await Promise.all([
            userIds.length > 0
                ? prisma.user.findMany({
                    where: { id: { in: userIds } },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                })
                : Promise.resolve([]),
            videoIds.length > 0
                ? prisma.video.findMany({
                    where: { id: { in: videoIds } },
                    select: {
                        id: true,
                        title: true,
                        viewLimit: true,
                    },
                })
                : Promise.resolve([]),
        ]);

        const usersById = new Map(users.map((user) => [user.id, user]));
        const videosById = new Map(videos.map((video) => [video.id, video]));

        const formattedRecords = records.map((record) => ({
            id: record.id,
            userId: record.userId,
            videoId: record.videoId,
            lastPosition: record.lastPosition,
            viewCount: record.viewCount,
            viewLimit: record.viewLimit,
            lastViewedAt: record.lastViewedAt.toISOString(),
            userName: usersById.get(record.userId)?.name ?? 'Người dùng không tồn tại',
            userEmail: usersById.get(record.userId)?.email ?? '',
            videoTitle: videosById.get(record.videoId)?.title ?? 'Video không tồn tại',
            videoViewLimit: videosById.get(record.videoId)?.viewLimit ?? null,
        }));

        return NextResponse.json(formattedRecords);
    } catch (error) {
        console.error('Failed to fetch watch records:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// PUT - Update a watch record
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { id, lastPosition, viewCount, viewLimit } = await request.json();

        if (!id) {
            return new NextResponse('Record ID is required', { status: 400 });
        }

        const updated = await prisma.watchRecord.update({
            where: { id },
            data: {
                lastPosition: lastPosition || 0,
                viewCount: viewCount || 0,
                viewLimit: viewLimit === null ? null : viewLimit,
                lastViewedAt: new Date(),
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Failed to update watch record:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// DELETE - Delete a watch record
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return new NextResponse('Record ID is required', { status: 400 });
        }

        await prisma.watchRecord.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete watch record:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
