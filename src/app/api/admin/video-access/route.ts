import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET: Fetch video access records for a specific user
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return new NextResponse('userId is required', { status: 400 });
        }

        const videoAccesses = await prisma.videoAccess.findMany({
            where: { userId },
            include: {
                Video: {
                    select: {
                        id: true,
                        title: true,
                        Course: {
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                    },
                },
            },
            orderBy: { grantedAt: 'desc' },
        });

        return NextResponse.json(videoAccesses);
    } catch (error) {
        console.error('Fetch video access error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// POST: Grant video access to a user
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { userId, videoId } = await request.json();

        if (!userId || !videoId) {
            return new NextResponse('userId and videoId are required', { status: 400 });
        }

        // Check if access already exists
        const existing = await prisma.videoAccess.findUnique({
            where: {
                userId_videoId: {
                    userId,
                    videoId,
                },
            },
        });

        if (existing) {
            return new NextResponse('Video access already granted', { status: 400 });
        }

        // Create video access
        const videoAccess = await prisma.videoAccess.create({
            data: {
                userId,
                videoId,
            },
            include: {
                Video: {
                    select: {
                        title: true,
                        Course: {
                            select: {
                                title: true,
                            },
                        },
                    },
                },
                User: {
                    select: {
                        email: true,
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json(videoAccess);
    } catch (error) {
        console.error('Grant video access error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// DELETE: Revoke video access from a user
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return new NextResponse('id is required', { status: 400 });
        }

        await prisma.videoAccess.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Revoke video access error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
