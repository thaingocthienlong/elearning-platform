import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  BunnyStreamApiError,
  getBunnyStreamVideo,
} from '@/lib/bunny-stream/client';
import { readBunnyStreamConfig } from '@/lib/bunny-stream/config';
import { mapBunnyStreamStatus } from '@/lib/bunny-stream/status';
import { serverLog } from '@/lib/server-log';

type SyncRequestBody = {
  videoId: string;
};

function isSyncRequestBody(value: unknown): value is SyncRequestBody {
  const body = value as Record<string, unknown>;
  const videoId = body?.videoId;

  return (
    !!value &&
    typeof value === 'object' &&
    typeof videoId === 'string' &&
    /^[a-f0-9]{24}$/i.test(videoId.trim())
  );
}

function getErrorMetadata(error: unknown) {
  return {
    errorName: error instanceof BunnyStreamApiError ? 'BunnyStreamApiError' : 'UnexpectedError',
    ...(error instanceof BunnyStreamApiError ? { apiStatus: error.status } : {}),
  };
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let config: ReturnType<typeof readBunnyStreamConfig>;
  try {
    config = readBunnyStreamConfig(process.env);
  } catch (error) {
    serverLog.error('bunny_stream_manual_sync_config_error', getErrorMetadata(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    serverLog.warn('bunny_stream_manual_sync_payload_parse_failed');
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (!isSyncRequestBody(body)) {
    serverLog.warn('bunny_stream_manual_sync_payload_invalid');
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const video = await prisma.video.findFirst({
      where: {
        id: body.videoId.trim(),
        provider: 'BUNNY_STREAM',
        bunnyLibraryId: { not: null },
        bunnyVideoId: { not: null },
        isDeleted: false,
      },
      select: {
        id: true,
        provider: true,
        bunnyLibraryId: true,
        bunnyVideoId: true,
        bunnyStatus: true,
      },
    });

    if (
      !video ||
      video.provider !== 'BUNNY_STREAM' ||
      !video.bunnyLibraryId ||
      !video.bunnyVideoId
    ) {
      return NextResponse.json(
        { error: 'Bunny Stream video not found' },
        { status: 404 }
      );
    }

    const bunnyVideo = await getBunnyStreamVideo({
      libraryId: video.bunnyLibraryId,
      apiKey: config.apiKey,
      videoId: video.bunnyVideoId,
      timeoutMs: config.apiTimeoutMs,
    });

    if (typeof bunnyVideo.status !== 'number') {
      throw new BunnyStreamApiError('Bunny Stream API returned invalid video data', 502);
    }

    const status = mapBunnyStreamStatus(bunnyVideo.status, video.bunnyStatus);

    await prisma.video.update({
      where: { id: video.id },
      data: {
        bunnyStatus: status,
        bunnyEncodeProgress:
          typeof bunnyVideo.encodeProgress === 'number'
            ? bunnyVideo.encodeProgress
            : null,
        bunnyAvailableRes:
          typeof bunnyVideo.availableResolutions === 'string' &&
          bunnyVideo.availableResolutions.trim().length > 0
            ? bunnyVideo.availableResolutions.trim()
            : null,
        bunnyThumbnailUrl:
          typeof bunnyVideo.thumbnailFileName === 'string' &&
          bunnyVideo.thumbnailFileName.trim().length > 0
            ? bunnyVideo.thumbnailFileName.trim()
            : null,
        bunnySyncedAt: new Date(),
        bunnyError: status === 'FAILED' ? 'FAILED' : null,
      },
    });

    serverLog.info('bunny_stream_manual_sync_succeeded', {
      videoId: video.id,
      libraryId: video.bunnyLibraryId,
      status,
    });

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    serverLog.error('bunny_stream_manual_sync_failed', {
      videoId: body.videoId.trim(),
      ...getErrorMetadata(error),
    });

    return NextResponse.json(
      { error: 'Failed to sync Bunny Stream video' },
      { status: error instanceof BunnyStreamApiError ? 502 : 500 }
    );
  }
}
