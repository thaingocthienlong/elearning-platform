import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { VdoCipherApiError } from '@/lib/vdocipher';
import { getVdoCipherVideoStatusWithAccountFallback } from '@/lib/vdocipher-playback';

function mapVdoCipherStatus(status: string | undefined) {
  const normalized = status?.toLowerCase();

  if (normalized === 'ready') return 'READY';
  if (normalized === 'queued' || normalized === 'processing') return 'QUEUED';
  if (normalized === 'pre-upload' || normalized === 'pre_upload') return 'PRE_UPLOAD';
  if (normalized === 'error') return 'ERROR';

  return 'QUEUED';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown VdoCipher sync error';
}

function getVdoCipherErrorStatus(error: unknown) {
  return error instanceof VdoCipherApiError ? error.status : undefined;
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

  let playback;

  try {
    playback = await getVdoCipherVideoStatusWithAccountFallback({
      preferredAccountId: video.vdocipherAccountId,
      vdoCipherVideoId: video.vdocipherVideoId,
    });
  } catch (error) {
    console.error('VdoCipher status sync failed', {
      videoId,
      vdoCipherVideoId: video.vdocipherVideoId,
      vdocipherAccountId: video.vdocipherAccountId,
      providerStatus: getVdoCipherErrorStatus(error),
      message: getErrorMessage(error),
    });

    await prisma.video.update({
      where: { id: video.id },
      data: {
        vdocipherStatus: 'ERROR',
        vdocipherSyncedAt: new Date(),
        vdocipherError: getErrorMessage(error),
      },
    });

    return NextResponse.json({ error: 'Playback provider unavailable' }, { status: 502 });
  }

  const status = playback.result;
  const mappedStatus = mapVdoCipherStatus(status.status);

  await prisma.video.update({
    where: { id: video.id },
    data: {
      vdocipherAccountId: playback.accountId,
      vdocipherStatus: mappedStatus,
      vdocipherPosterUrl: status.poster,
      vdocipherSyncedAt: new Date(),
      vdocipherError: mappedStatus === 'ERROR' ? 'VdoCipher reported processing error' : null,
    },
  });

  return NextResponse.json({
    success: true,
    status: mappedStatus,
    accountId: playback.accountId,
    recoveredAccount: playback.recovered,
  });
}
