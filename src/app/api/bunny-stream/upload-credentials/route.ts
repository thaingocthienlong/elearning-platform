import { createHash } from 'node:crypto';
import { after, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  BunnyStreamApiError,
  createBunnyStreamVideo,
  deleteBunnyStreamVideo,
} from '@/lib/bunny-stream/client';
import { readBunnyStreamConfig } from '@/lib/bunny-stream/config';
import { generateBunnyTusSignature } from '@/lib/bunny-stream/signing';
import { serverLog } from '@/lib/server-log';

const uploadSchema = z.object({
  uploadRequestId: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
  filename: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[\w\-. ]+$/),
  contentType: z.string().regex(/^video\//),
  courseId: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid course ID format'),
  title: z.string().min(1).max(255),
  collectionId: z.string().min(1).max(128).optional(),
});

function getErrorMetadata(error: unknown) {
  return {
    errorName:
      error instanceof BunnyStreamApiError
        ? 'BunnyStreamApiError'
        : 'UnexpectedError',
    ...(error instanceof BunnyStreamApiError
      ? { apiStatus: error.status }
      : {}),
  };
}

const STALE_INITIALIZATION_TTL_MS = 15 * 60 * 1000;
const STALE_INITIALIZATION_LIMIT = 1;
const BUNNY_STREAM_CLEANUP_TIMEOUT_MS = 2500;

export const maxDuration = 60;

type BunnyStreamConfig = ReturnType<typeof readBunnyStreamConfig>;
type UploadInitializationState =
  | 'INITIALIZING'
  | 'READY'
  | 'UNCERTAIN'
  | 'ORPHANED';

function isPrismaUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

function getPayloadFingerprint(payload: {
  filename: string;
  contentType: string;
  courseId: string;
  title: string;
  bunnyLibraryId: string;
  bunnyCollectionId: string | null;
}) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function getTusCredentials(
  config: BunnyStreamConfig,
  upload: { libraryId: string; bunnyVideoId: string; localVideoId: string }
) {
  const authorizationExpire =
    Math.floor(Date.now() / 1000) + config.tusExpireSeconds;
  const authorizationSignature = generateBunnyTusSignature({
    libraryId: upload.libraryId,
    apiKey: config.apiKey,
    expirationTime: authorizationExpire,
    videoId: upload.bunnyVideoId,
  });

  return {
    uploadEndpoint: 'https://video.bunnycdn.com/tusupload',
    libraryId: upload.libraryId,
    videoId: upload.bunnyVideoId,
    authorizationExpire,
    authorizationSignature,
    localVideoId: upload.localVideoId,
  };
}

async function updateInitializationStateBestEffort(
  initializationId: string,
  state: UploadInitializationState,
  failureMarker: string
) {
  try {
    await prisma.bunnyUploadInitialization.update({
      where: { id: initializationId },
      data: { state, failureMarker },
    });
  } catch (error) {
    serverLog.warn('bunny_stream_initialization_state_update_failed', {
      initializationId,
      state,
      failureMarker,
      ...getErrorMetadata(error),
    });
  }
}

async function cleanupKnownProviderInitialization({
  initializationId,
  libraryId,
  bunnyVideoId,
  localVideoId,
  config,
}: {
  initializationId: string;
  libraryId: string;
  bunnyVideoId: string;
  localVideoId?: string;
  config: BunnyStreamConfig;
}) {
  if (localVideoId) {
    try {
      await prisma.video.delete({ where: { id: localVideoId } });
    } catch (error) {
      serverLog.warn('bunny_stream_local_video_cleanup_failed', {
        initializationId,
        localVideoId,
        ...getErrorMetadata(error),
      });
      await updateInitializationStateBestEffort(
        initializationId,
        'ORPHANED',
        'LOCAL_VIDEO_CLEANUP_FAILED'
      );
      return false;
    }
  }

  try {
    await deleteBunnyStreamVideo({
      libraryId,
      apiKey: config.apiKey,
      videoId: bunnyVideoId,
      timeoutMs: BUNNY_STREAM_CLEANUP_TIMEOUT_MS,
    });
    serverLog.info('bunny_stream_orphan_cleanup_succeeded', {
      libraryId,
      videoId: bunnyVideoId,
    });
  } catch (error) {
    serverLog.warn('bunny_stream_orphan_cleanup_failed', {
      libraryId,
      videoId: bunnyVideoId,
      ...getErrorMetadata(error),
    });
    await updateInitializationStateBestEffort(
      initializationId,
      'ORPHANED',
      'PROVIDER_CLEANUP_FAILED'
    );
    return false;
  }

  try {
    await prisma.bunnyUploadInitialization.delete({
      where: { id: initializationId },
    });
  } catch (error) {
    serverLog.warn('bunny_stream_initialization_delete_failed', {
      initializationId,
      ...getErrorMetadata(error),
    });
    await updateInitializationStateBestEffort(
      initializationId,
      'UNCERTAIN',
      'CLEANUP_SUCCEEDED_RESERVATION_DELETE_FAILED'
    );
    return false;
  }

  return true;
}

async function findLocalBunnyVideo(
  libraryId: string,
  bunnyVideoId: string
): Promise<{ id: string } | null> {
  return prisma.video.findFirst({
    where: {
      provider: 'BUNNY_STREAM',
      bunnyLibraryId: libraryId,
      bunnyVideoId,
      isDeleted: false,
    },
    select: { id: true },
  });
}

async function recoverKnownProviderInitialization({
  initializationId,
  libraryId,
  bunnyVideoId,
}: {
  initializationId: string;
  libraryId: string;
  bunnyVideoId: string;
}) {
  const localVideo = await findLocalBunnyVideo(libraryId, bunnyVideoId);
  if (!localVideo) return null;

  await prisma.bunnyUploadInitialization.update({
    where: { id: initializationId },
    data: {
      localVideoId: localVideo.id,
      state: 'READY',
      failureMarker: null,
    },
  });

  serverLog.info('bunny_stream_initialization_recovered_from_local_video', {
    libraryId,
    videoId: bunnyVideoId,
    localVideoId: localVideo.id,
  });

  return localVideo.id;
}

async function reconcileStaleInitializations(config: BunnyStreamConfig) {
  try {
    const staleInitializations =
      await prisma.bunnyUploadInitialization.findMany({
        where: {
          state: 'INITIALIZING',
          updatedAt: { lt: new Date(Date.now() - STALE_INITIALIZATION_TTL_MS) },
        },
        select: {
          id: true,
          bunnyLibraryId: true,
          bunnyVideoId: true,
          localVideoId: true,
        },
        orderBy: { updatedAt: 'asc' },
        take: STALE_INITIALIZATION_LIMIT,
      });

    for (const initialization of staleInitializations.slice(
      0,
      STALE_INITIALIZATION_LIMIT
    )) {
      if (initialization.bunnyVideoId) {
        const recoveredLocalVideoId = await recoverKnownProviderInitialization({
          initializationId: initialization.id,
          libraryId: initialization.bunnyLibraryId,
          bunnyVideoId: initialization.bunnyVideoId,
        });
        if (recoveredLocalVideoId) continue;
      }

      if (initialization.localVideoId) {
        await updateInitializationStateBestEffort(
          initialization.id,
          'UNCERTAIN',
          'STALE_LOCAL_VIDEO_REQUIRES_RECONCILIATION'
        );
        continue;
      }

      if (!initialization.bunnyVideoId) {
        await updateInitializationStateBestEffort(
          initialization.id,
          'UNCERTAIN',
          'STALE_PROVIDER_OUTCOME_UNKNOWN'
        );
        continue;
      }

      await cleanupKnownProviderInitialization({
        initializationId: initialization.id,
        libraryId: initialization.bunnyLibraryId,
        bunnyVideoId: initialization.bunnyVideoId,
        config,
      });
    }
  } catch (error) {
    serverLog.warn('bunny_stream_stale_reconciliation_failed', {
      ...getErrorMetadata(error),
    });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse('Unauthorized', { status: 401 });
    if (session.user?.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const config = readBunnyStreamConfig();
    const {
      uploadRequestId,
      filename,
      contentType,
      courseId,
      title,
      collectionId,
    } = parsed.data;
    const resolvedCollectionId = collectionId ?? config.defaultCollectionId;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isDeleted: true },
    });

    if (!course || course.isDeleted) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Keep best-effort cleanup alive after response without delaying fresh uploads.
    after(() =>
      reconcileStaleInitializations(config).catch((error) => {
        serverLog.warn('bunny_stream_stale_reconciliation_unhandled', {
          ...getErrorMetadata(error),
        });
      })
    );

    const payloadFingerprint = getPayloadFingerprint({
      filename,
      contentType,
      courseId,
      title,
      bunnyLibraryId: config.libraryId,
      bunnyCollectionId: resolvedCollectionId,
    });

    let initialization: { id: string } | null = null;
    try {
      initialization = await prisma.bunnyUploadInitialization.create({
        data: {
          uploadRequestId,
          payloadFingerprint,
          filename,
          contentType,
          courseId,
          title,
          bunnyLibraryId: config.libraryId,
          bunnyCollectionId: resolvedCollectionId,
          state: 'INITIALIZING',
        },
        select: { id: true },
      });
    } catch (error) {
      if (!isPrismaUniqueConstraintError(error)) throw error;

      const existing = await prisma.bunnyUploadInitialization.findUnique({
        where: { uploadRequestId },
        select: {
          id: true,
          payloadFingerprint: true,
          state: true,
          bunnyLibraryId: true,
          bunnyVideoId: true,
          localVideoId: true,
        },
      });

      if (!existing) throw error;
      if (existing.payloadFingerprint !== payloadFingerprint) {
        return NextResponse.json(
          { error: 'uploadRequestId was already used for a different upload' },
          { status: 409 }
        );
      }

      if (
        existing.state === 'READY' &&
        existing.bunnyVideoId &&
        existing.localVideoId
      ) {
        return NextResponse.json(
          getTusCredentials(config, {
            libraryId: existing.bunnyLibraryId,
            bunnyVideoId: existing.bunnyVideoId,
            localVideoId: existing.localVideoId,
          })
        );
      }

      if (
        existing.state === 'UNCERTAIN' &&
        !existing.bunnyVideoId &&
        !existing.localVideoId
      ) {
        await prisma.bunnyUploadInitialization.update({
          where: { id: existing.id },
          data: { state: 'INITIALIZING', failureMarker: null },
        });
        initialization = { id: existing.id };
      } else if (existing.state === 'ORPHANED' && existing.bunnyVideoId) {
        const recoveredLocalVideoId = await recoverKnownProviderInitialization({
          initializationId: existing.id,
          libraryId: existing.bunnyLibraryId,
          bunnyVideoId: existing.bunnyVideoId,
        });

        if (recoveredLocalVideoId) {
          return NextResponse.json(
            getTusCredentials(config, {
              libraryId: existing.bunnyLibraryId,
              bunnyVideoId: existing.bunnyVideoId,
              localVideoId: recoveredLocalVideoId,
            })
          );
        }

        const cleanupSucceeded = await cleanupKnownProviderInitialization({
          initializationId: existing.id,
          libraryId: existing.bunnyLibraryId,
          bunnyVideoId: existing.bunnyVideoId,
          config,
        });

        if (!cleanupSucceeded) {
          return NextResponse.json(
            {
              error:
                'Upload initialization requires provider cleanup before retry',
            },
            { status: 502 }
          );
        }

        return NextResponse.json(
          {
            error:
              'Previous upload initialization was cleaned up; retry upload initialization',
          },
          { status: 409 }
        );
      } else {
        return NextResponse.json(
          {
            error: 'Upload initialization requires reconciliation before retry',
          },
          { status: 409 }
        );
      }
    }

    if (!initialization) {
      return NextResponse.json(
        { error: 'Upload initialization requires reconciliation before retry' },
        { status: 409 }
      );
    }

    let bunnyVideo;
    try {
      bunnyVideo = await createBunnyStreamVideo({
        libraryId: config.libraryId,
        apiKey: config.apiKey,
        title,
        collectionId: resolvedCollectionId,
        timeoutMs: config.apiTimeoutMs,
      });
    } catch (error) {
      await updateInitializationStateBestEffort(
        initialization.id,
        'UNCERTAIN',
        'PROVIDER_CREATE_OUTCOME_UNKNOWN'
      );
      throw error;
    }

    if (!bunnyVideo.guid) {
      await updateInitializationStateBestEffort(
        initialization.id,
        'UNCERTAIN',
        'PROVIDER_CREATE_MISSING_VIDEO_ID'
      );
      return NextResponse.json(
        { error: 'Bunny Stream did not return a video ID' },
        { status: 502 }
      );
    }

    try {
      await prisma.bunnyUploadInitialization.update({
        where: { id: initialization.id },
        data: { bunnyVideoId: bunnyVideo.guid },
      });
    } catch (error) {
      await cleanupKnownProviderInitialization({
        initializationId: initialization.id,
        libraryId: config.libraryId,
        bunnyVideoId: bunnyVideo.guid,
        config,
      });
      throw error;
    }

    let video;
    try {
      video = await prisma.video.create({
        data: {
          title,
          courseId,
          provider: 'BUNNY_STREAM',
          bunnyLibraryId: config.libraryId,
          bunnyVideoId: bunnyVideo.guid,
          bunnyCollectionId: resolvedCollectionId,
          bunnyStatus: 'CREATED',
          published: false,
        },
      });
    } catch (error) {
      await cleanupKnownProviderInitialization({
        initializationId: initialization.id,
        libraryId: config.libraryId,
        bunnyVideoId: bunnyVideo.guid,
        config,
      });
      throw error;
    }

    try {
      await prisma.bunnyUploadInitialization.update({
        where: { id: initialization.id },
        data: {
          localVideoId: video.id,
          state: 'READY',
          failureMarker: null,
        },
      });
    } catch (error) {
      await cleanupKnownProviderInitialization({
        initializationId: initialization.id,
        libraryId: config.libraryId,
        bunnyVideoId: bunnyVideo.guid,
        localVideoId: video.id,
        config,
      });
      throw error;
    }

    return NextResponse.json(
      getTusCredentials(config, {
        libraryId: config.libraryId,
        bunnyVideoId: bunnyVideo.guid,
        localVideoId: video.id,
      })
    );
  } catch (error) {
    serverLog.error(
      'bunny_stream_upload_credentials_failed',
      getErrorMetadata(error)
    );
    return NextResponse.json(
      { error: 'Bunny Stream upload failed to initialize' },
      { status: error instanceof BunnyStreamApiError ? 502 : 500 }
    );
  }
}
