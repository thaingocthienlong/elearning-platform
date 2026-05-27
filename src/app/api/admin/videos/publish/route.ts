import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { invalidateCacheKey } from '@/lib/redis';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { videoId } = await req.json();

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  const video = await prisma.video.findUnique({ where: { id: videoId } });

  if (!video || video.isDeleted) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  if (
    video.provider === 'VDOCIPHER' &&
    (video.vdocipherStatus !== 'READY' || !video.vdocipherVideoId || !video.vdocipherAccountId)
  ) {
    return NextResponse.json(
      { error: 'VdoCipher video is not ready for publishing' },
      { status: 409 }
    );
  }

  await prisma.video.update({
    where: { id: video.id },
    data: { published: true },
  });

  await invalidateCacheKey(`course:${video.courseId}`);

  return NextResponse.json({ success: true, published: true });
}
