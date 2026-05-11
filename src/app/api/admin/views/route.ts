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
            include: {
                User: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                Video: {
                    select: {
                        title: true,
                        viewLimit: true,
                    },
                },
            },
            orderBy: { lastViewedAt: 'desc' },
        });

        const formattedRecords = records.map((record) => ({
            id: record.id,
            userId: record.userId,
            videoId: record.videoId,
            lastPosition: record.lastPosition,
            viewCount: record.viewCount,
            viewLimit: record.viewLimit,
            lastViewedAt: record.lastViewedAt.toISOString(),
            userName: record.User.name,
            userEmail: record.User.email,
            videoTitle: record.Video.title,
            videoViewLimit: record.Video.viewLimit,
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
