import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function mapVdoCipherStatus(status: string | undefined) {
  const normalized = status?.toLowerCase();

  if (normalized === 'ready') return 'READY';
  if (normalized === 'queued' || normalized === 'processing') return 'QUEUED';
  if (normalized === 'pre-upload' || normalized === 'pre_upload') return 'PRE_UPLOAD';
  if (normalized === 'error') return 'ERROR';

  return 'QUEUED';
}

export async function POST(req: Request) {
  const expectedSecret = process.env.VDOCIPHER_WEBHOOK_SECRET?.trim();

  if (expectedSecret) {
    const url = new URL(req.url);
    const providedSecret = url.searchParams.get('secret');

    if (providedSecret !== expectedSecret) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  const payload = await req.json();
  const vdocipherVideoId = payload.videoId || payload.id;

  if (!vdocipherVideoId) {
    return NextResponse.json({ error: 'Missing VdoCipher video ID' }, { status: 400 });
  }

  const video = await prisma.video.findFirst({
    where: {
      provider: 'VDOCIPHER',
      vdocipherVideoId,
    },
  });

  if (!video) {
    return NextResponse.json({ ok: true });
  }

  const mappedStatus = mapVdoCipherStatus(payload.status);

  await prisma.video.update({
    where: { id: video.id },
    data: {
      vdocipherStatus: mappedStatus,
      vdocipherSyncedAt: new Date(),
      vdocipherError: mappedStatus === 'ERROR' ? 'VdoCipher webhook reported processing error' : null,
    },
  });

  return NextResponse.json({ ok: true });
}
