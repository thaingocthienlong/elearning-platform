import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  BunnyStreamApiError,
  getBunnyStreamVideo,
} from '@/lib/bunny-stream/client';
import { readBunnyStreamConfig } from '@/lib/bunny-stream/config';
import { mapBunnyStreamStatus } from '@/lib/bunny-stream/status';
import { verifyBunnyWebhookSignature } from '@/lib/bunny-stream/signing';
import { serverLog } from '@/lib/server-log';

type BunnyWebhookPayload = {
  VideoLibraryId: number;
  VideoGuid: string;
  Status: number;
};

function isBunnyWebhookPayload(value: unknown): value is BunnyWebhookPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;
  const libraryId = payload.VideoLibraryId;
  const videoGuid = payload.VideoGuid;
  const status = payload.Status;

  return (
    typeof libraryId === 'number' &&
    Number.isInteger(libraryId) &&
    libraryId > 0 &&
    typeof videoGuid === 'string' &&
    videoGuid.trim().length > 0 &&
    typeof status === 'number' &&
    Number.isInteger(status) &&
    status >= 0
  );
}

function getErrorMetadata(error: unknown) {
  return {
    errorName: error instanceof BunnyStreamApiError ? 'BunnyStreamApiError' : 'UnexpectedError',
    ...(error instanceof BunnyStreamApiError ? { apiStatus: error.status } : {}),
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureVersion = request.headers.get('X-BunnyStream-Signature-Version');
  const signatureAlgorithm = request.headers.get('X-BunnyStream-Signature-Algorithm');
  const signature = request.headers.get('X-BunnyStream-Signature');

  let config: ReturnType<typeof readBunnyStreamConfig>;
  try {
    config = readBunnyStreamConfig(process.env);
  } catch (error) {
    serverLog.error('bunny_stream_webhook_config_error', getErrorMetadata(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  if (
    !verifyBunnyWebhookSignature({
      rawBody,
      signature,
      version: signatureVersion,
      algorithm: signatureAlgorithm,
      readOnlyApiKey: config.readOnlyApiKey,
    })
  ) {
    serverLog.warn('bunny_stream_webhook_signature_rejected', {
      hasSignature: Boolean(signature),
      hasVersion: Boolean(signatureVersion),
      hasAlgorithm: Boolean(signatureAlgorithm),
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    serverLog.warn('bunny_stream_webhook_payload_parse_failed');
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (!isBunnyWebhookPayload(payload)) {
    serverLog.warn('bunny_stream_webhook_payload_invalid');
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const libraryId = String(payload.VideoLibraryId);
  const localVideo = await prisma.video.findFirst({
    where: {
      provider: 'BUNNY_STREAM',
      bunnyLibraryId: libraryId,
      bunnyVideoId: payload.VideoGuid,
      isDeleted: false,
    },
    select: {
      id: true,
      bunnyStatus: true,
    },
  });

  if (!localVideo) {
    serverLog.info('bunny_stream_webhook_unmatched', {
      libraryId,
      videoId: payload.VideoGuid,
    });
    return NextResponse.json({ success: true, matched: false });
  }

  try {
    const bunnyVideo = await getBunnyStreamVideo({
      libraryId: config.libraryId,
      apiKey: config.apiKey,
      videoId: payload.VideoGuid,
      timeoutMs: config.apiTimeoutMs,
    });

    const sourceStatus =
      typeof bunnyVideo.status === 'number' ? bunnyVideo.status : payload.Status;
    const mappedStatus = mapBunnyStreamStatus(sourceStatus, localVideo.bunnyStatus);

    await prisma.video.update({
      where: { id: localVideo.id },
      data: {
        bunnyStatus: mappedStatus,
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
        bunnyError: mappedStatus === 'FAILED' ? 'FAILED' : null,
      },
    });

    serverLog.info('bunny_stream_webhook_matched', {
      videoId: payload.VideoGuid,
      libraryId,
      status: mappedStatus,
    });

    return NextResponse.json({
      success: true,
      matched: true,
      status: mappedStatus,
    });
  } catch (error) {
    serverLog.error('bunny_stream_webhook_sync_failed', {
      libraryId,
      videoId: payload.VideoGuid,
      ...getErrorMetadata(error),
    });

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: error instanceof BunnyStreamApiError ? 502 : 500 }
    );
  }
}
