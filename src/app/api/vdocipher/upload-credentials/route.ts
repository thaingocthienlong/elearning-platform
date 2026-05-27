import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveVdoCipherAccount } from '@/lib/vdocipher-accounts';
import { createVdoCipherUpload } from '@/lib/vdocipher';

const uploadSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long'),
  contentType: z.string().regex(/^video\//, 'Only video files are allowed').optional(),
  courseId: z.string().length(24, 'Invalid course ID format'),
  title: z.string().max(255, 'Title too long').optional(),
  accountId: z.string().max(80, 'Account ID too long').optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = uploadSchema.parse(await req.json());
    const course = await prisma.course.findUnique({
      where: { id: body.courseId },
      select: { id: true, isDeleted: true },
    });

    if (!course || course.isDeleted) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const account = resolveVdoCipherAccount(body.accountId);
    const title = body.title?.trim() || body.filename;
    const upload = await createVdoCipherUpload({
      apiSecret: account.apiSecret,
      title,
    });

    const video = await prisma.video.create({
      data: {
        title,
        courseId: body.courseId,
        provider: 'VDOCIPHER',
        vdocipherAccountId: account.id,
        vdocipherVideoId: upload.videoId,
        vdocipherStatus: 'PRE_UPLOAD',
        published: false,
      },
    });

    return NextResponse.json({
      videoId: video.id,
      vdocipherVideoId: upload.videoId,
      accountId: account.id,
      clientPayload: upload.clientPayload,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create VdoCipher upload' },
      { status: 400 }
    );
  }
}
