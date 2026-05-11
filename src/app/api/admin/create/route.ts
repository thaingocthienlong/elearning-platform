import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { table, data } = await request.json();

        // Validate table name
        const validTables = ['user', 'course', 'video', 'enrollment', 'ticket'];
        if (!validTables.includes(table)) {
            return new NextResponse('Invalid table', { status: 400 });
        }

        let result;

        // @ts-ignore - Dynamic Prisma access
        const model: any = prisma[table];

        // Handle each table type differently based on required fields
        if (table === 'user') {
            result = await model.create({
                data: {
                    id: crypto.randomUUID(),
                    name: data.name,
                    email: data.email,
                    role: data.role || 'USER',
                    updatedAt: new Date(),
                },
            });
        } else if (table === 'course') {
            // Check for duplicate course title
            const existingCourse = await prisma.course.findFirst({
                where: {
                    title: data.title,
                    isDeleted: false,
                },
            });

            if (existingCourse) {
                return new NextResponse(
                    `A course with the title "${data.title}" already exists.`,
                    { status: 409 }
                );
            }

            result = await model.create({
                data: {
                    title: data.title,
                    thumbnail: data.thumbnail || null,
                    published: data.published || false,
                },
            });
        } else if (table === 'video') {
            // Check for duplicate video title within the same course
            const existingVideo = await prisma.video.findFirst({
                where: {
                    title: data.title,
                    courseId: data.courseId,
                    isDeleted: false,
                },
            });

            if (existingVideo) {
                return new NextResponse(
                    `A video with the title "${data.title}" already exists in this course.`,
                    { status: 409 }
                );
            }

            result = await model.create({
                data: {
                    title: data.title,
                    description: data.description || null,
                    courseId: data.courseId,
                    published: data.published || false,
                    position: data.position || 0,
                },
            });
        } else if (table === 'enrollment') {
            result = await model.create({
                data: {
                    userId: data.userId,
                    courseId: data.courseId,
                },
            });
        } else if (table === 'ticket') {
            result = await model.create({
                data: {
                    email: data.email,
                    description: data.description,
                    status: data.status || 'WAITING',
                },
            });
        }

        return NextResponse.json({ success: true, data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Create error:', error);
        return new NextResponse(message || 'Internal Server Error', { status: 500 });
    }
}
