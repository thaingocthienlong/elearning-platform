import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createBunnyStreamSignedPlayback,
  readBunnyStreamConfig,
} from '@/lib/bunny-stream';
import {
  evaluateMediaEntitlement,
  mapMediaEntitlementToHttp,
} from '@/lib/media-entitlement';
import { serverLog } from '@/lib/server-log';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new NextResponse('Invalid request', { status: 400 });
    }

    const videoId = typeof body === 'object' && body !== null && typeof (body as { videoId?: unknown }).videoId === 'string'
      ? (body as { videoId: string }).videoId.trim()
      : '';

    if (!videoId) {
      return new NextResponse('Invalid request', { status: 400 });
    }

    const entitlement = await evaluateMediaEntitlement({
      session,
      videoId,
      checkViewLimit: true,
    });

    if (!entitlement.allowed) {
      const denial = mapMediaEntitlementToHttp(entitlement);
      return new NextResponse(denial.body, { status: denial.status });
    }

    if (
      entitlement.video.provider !== 'BUNNY_STREAM' ||
      !entitlement.video.bunnyLibraryId ||
      !entitlement.video.bunnyVideoId ||
      (entitlement.video.bunnyStatus !== 'READY' &&
        entitlement.video.bunnyStatus !== 'PLAYABLE')
    ) {
      return new NextResponse('Not found', { status: 404 });
    }

    const config = readBunnyStreamConfig();
    const playback = createBunnyStreamSignedPlayback({
      libraryId: entitlement.video.bunnyLibraryId,
      bunnyVideoId: entitlement.video.bunnyVideoId,
      tokenSecurityKey: config.tokenSecurityKey,
      embedTokenTtlSeconds: config.embedTokenTtlSeconds,
    });

    return NextResponse.json(playback);
  } catch (error) {
    serverLog.error('Bunny playback signing error', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
