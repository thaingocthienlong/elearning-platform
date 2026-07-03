import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const completeSchema = z.object({
  videoId: z.string().length(24, 'Invalid video ID format'),
  fileId: z.string().min(1, 'Tencent file ID is required').max(128),
  mediaUrl: z.string().url().optional(),
});

function playbackUrlPatch(mediaUrl?: string) {
  if (!mediaUrl) return {};
  if (mediaUrl.endsWith('.mpd')) return { dashUrl: mediaUrl };
  if (mediaUrl.includes('.m3u8')) return { hlsUrl: mediaUrl };
  return {};
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });
  if (session.user.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });

  const validation = completeSchema.safeParse(await req.json());
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { videoId, fileId, mediaUrl } = validation.data;
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, isDeleted: true },
  });

  if (!video || video.isDeleted) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  const updated = await prisma.video.update({
    where: { id: videoId },
    data: {
      tencentFileId: fileId,
      tencentStatus: 'UPLOAD_CONFIRMED',
      tencentSyncedAt: new Date(),
      ...playbackUrlPatch(mediaUrl),
    },
    select: {
      id: true,
      tencentFileId: true,
      tencentStatus: true,
      dashUrl: true,
      hlsUrl: true,
    },
  });

  return NextResponse.json({
    success: true,
    provider: 'tencent',
    video: updated,
  });
}
