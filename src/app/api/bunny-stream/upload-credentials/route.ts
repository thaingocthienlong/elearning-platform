import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createBunnyStreamVideo } from '@/lib/bunny-stream/client';
import { readBunnyStreamConfig } from '@/lib/bunny-stream/config';
import { generateBunnyTusSignature } from '@/lib/bunny-stream/signing';

const uploadSchema = z.object({
  filename: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[\w\-. ]+$/),
  contentType: z.string().regex(/^video\//),
  courseId: z.string().length(24),
  title: z.string().min(1).max(255),
  collectionId: z.string().min(1).max(128).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });
  if (session.user?.role !== 'ADMIN') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const parsed = uploadSchema.safeParse(await req.json());
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
    });

    if (!bunnyVideo.guid) {
      return NextResponse.json(
        { error: 'Bunny Stream did not return a video ID' },
        { status: 502 }
      );
    }

    const video = await prisma.video.create({
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
    console.error('Bunny Stream upload credentials error:', error);
    return NextResponse.json(
      { error: 'Bunny Stream upload failed to initialize' },
      { status: 500 }
    );
  }
}
