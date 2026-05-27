import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveVdoCipherAccount } from '@/lib/vdocipher-accounts';
import { getVdoCipherVideoStatus } from '@/lib/vdocipher';

function mapVdoCipherStatus(status: string | undefined) {
  const normalized = status?.toLowerCase();

  if (normalized === 'ready') return 'READY';
  if (normalized === 'queued' || normalized === 'processing') return 'QUEUED';
  if (normalized === 'pre-upload' || normalized === 'pre_upload') return 'PRE_UPLOAD';
  if (normalized === 'error') return 'ERROR';

  return 'QUEUED';
}

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

  if (
    !video ||
    video.provider !== 'VDOCIPHER' ||
    !video.vdocipherVideoId ||
    !video.vdocipherAccountId
  ) {
    return NextResponse.json({ error: 'VdoCipher video not found' }, { status: 404 });
  }

  const account = resolveVdoCipherAccount(video.vdocipherAccountId);
  const status = await getVdoCipherVideoStatus({
    apiSecret: account.apiSecret,
    vdoCipherVideoId: video.vdocipherVideoId,
  });
  const mappedStatus = mapVdoCipherStatus(status.status);

  await prisma.video.update({
    where: { id: video.id },
    data: {
      vdocipherStatus: mappedStatus,
      vdocipherPosterUrl: status.poster,
      vdocipherSyncedAt: new Date(),
      vdocipherError: mappedStatus === 'ERROR' ? 'VdoCipher reported processing error' : null,
    },
  });

  return NextResponse.json({ success: true, status: mappedStatus });
}
