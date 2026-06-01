import { NextResponse } from 'next/server';
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
    ...(error instanceof BunnyStreamApiError ? { apiStatus: error.status } : {}),
  };
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
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const config = readBunnyStreamConfig();
    const { courseId, title, collectionId } = parsed.data;
    const resolvedCollectionId = collectionId ?? config.defaultCollectionId;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isDeleted: true },
    });

    if (!course || course.isDeleted) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const bunnyVideo = await createBunnyStreamVideo({
      libraryId: config.libraryId,
      apiKey: config.apiKey,
      title,
      collectionId: resolvedCollectionId,
      timeoutMs: config.apiTimeoutMs,
    });

    if (!bunnyVideo.guid) {
      return NextResponse.json(
        { error: 'Bunny Stream did not return a video ID' },
        { status: 502 }
      );
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
      try {
        await deleteBunnyStreamVideo({
          libraryId: config.libraryId,
          apiKey: config.apiKey,
          videoId: bunnyVideo.guid,
          timeoutMs: config.apiTimeoutMs,
        });
        serverLog.info('bunny_stream_orphan_cleanup_succeeded', {
          libraryId: config.libraryId,
          videoId: bunnyVideo.guid,
        });
      } catch (cleanupError) {
        serverLog.warn('bunny_stream_orphan_cleanup_failed', {
          libraryId: config.libraryId,
          videoId: bunnyVideo.guid,
          ...getErrorMetadata(cleanupError),
        });
      }

      throw error;
    }

    const authorizationExpire =
      Math.floor(Date.now() / 1000) + config.tusExpireSeconds;
    const authorizationSignature = generateBunnyTusSignature({
      libraryId: config.libraryId,
      apiKey: config.apiKey,
      expirationTime: authorizationExpire,
      videoId: bunnyVideo.guid,
    });

    return NextResponse.json({
      uploadEndpoint: 'https://video.bunnycdn.com/tusupload',
      libraryId: config.libraryId,
      videoId: bunnyVideo.guid,
      authorizationExpire,
      authorizationSignature,
      localVideoId: video.id,
    });
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
