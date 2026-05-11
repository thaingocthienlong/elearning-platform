import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { azureStorage } from '@/lib/azure-storage';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Input validation schema
const uploadSchema = z.object({
    filename: z.string()
        .min(1, 'Filename is required')
        .max(255, 'Filename too long')
        .regex(/^[\w\-. ]+$/, 'Invalid filename characters'),
    contentType: z.string()
        .regex(/^video\//, 'Only video files are allowed')
        .optional(),
    courseId: z.string()
        .length(24, 'Invalid course ID format'), // MongoDB ObjectId length
    title: z.string()
        .max(255, 'Title too long')
        .optional(),
});

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Only admins can upload
    if (session.user.role !== 'ADMIN') {
        return new NextResponse('Forbidden', { status: 403 });
    }

    try {
        // Parse and validate input
        const body = await req.json();
        const validationResult = uploadSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: validationResult.error.flatten().fieldErrors
                },
                { status: 400 }
            );
        }

        const { filename, courseId, title } = validationResult.data;

        // Verify course exists before creating video
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { id: true, isDeleted: true },
        });

        if (!course || course.isDeleted) {
            return NextResponse.json(
                { error: 'Course not found' },
                { status: 404 }
            );
        }

        // Generate Azure SAS URL for upload
        const { url: signedUrl, blobName } = await azureStorage.getUploadSasUrl(filename);

        // Create video record in DB (pending state)
        const video = await prisma.video.create({
            data: {
                title: title || filename,
                courseId: courseId,
                r2Key: blobName,
                published: false,
            },
        });

        return NextResponse.json({ signedUrl, videoId: video.id, key: blobName });
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
