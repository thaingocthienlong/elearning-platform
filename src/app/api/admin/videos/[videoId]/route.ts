import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteTencentMedia } from '@/lib/tencent/vod';

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ videoId: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { videoId } = await params;
    if (!/^[0-9a-fA-F]{24}$/.test(videoId)) {
        return NextResponse.json({ error: 'Invalid video id' }, { status: 400 });
    }

    let video;

    try {
        video = await prisma.video.findUnique({
            where: { id: videoId },
            select: {
                id: true,
                isDeleted: true,
                tencentFileId: true,
                tencentDeletedAt: true,
            },
        });
    } catch (error) {
        console.error('Find admin video error:', error);
        return NextResponse.json({ error: 'Failed to load video' }, { status: 500 });
    }

    if (!video) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (video.isDeleted && video.tencentDeletedAt) {
        return NextResponse.json({
            success: true,
            providerDeleted: Boolean(video.tencentFileId),
            alreadyDeleted: true,
        });
    }

    if (video.tencentFileId) {
        try {
            await deleteTencentMedia(video.tencentFileId);
        } catch (error) {
            console.error('Delete Tencent media error:', error);
            return NextResponse.json(
                { error: 'Failed to delete video from storage. The local video was not deleted.' },
                { status: 502 }
            );
        }
    }

    const deletedAt = new Date();

    try {
        await prisma.video.update({
            where: { id: video.id },
            data: {
                isDeleted: true,
                published: false,
                dashUrl: null,
                hlsUrl: null,
                hlsUrlClear: null,
                tencentStatus: 'DELETED',
                tencentDeletedAt: deletedAt,
            },
        });
    } catch (error) {
        console.error('Soft-delete admin video error:', error);
        return NextResponse.json(
            {
                error: video.tencentFileId
                    ? 'Storage deletion completed, but the local video could not be marked deleted. Retry the request.'
                    : 'Failed to delete the local video.',
            },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        providerDeleted: Boolean(video.tencentFileId),
        alreadyDeleted: false,
        deletedAt,
    });
}
