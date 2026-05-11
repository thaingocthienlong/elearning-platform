import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    const { courseId } = await params;
    const session = await getServerSession(authOptions);

    try {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                Video: {
                    where: { published: true },
                    orderBy: { position: 'asc' },
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        if (!course) {
            return new NextResponse('Course not found', { status: 404 });
        }

        let isEnrolled = false;
        if (session?.user?.email) {
            const user = await prisma.user.findUnique({
                where: { email: session.user.email },
            });
            if (user) {
                const enrollment = await prisma.enrollment.findUnique({
                    where: {
                        userId_courseId: {
                            userId: user.id,
                            courseId: courseId,
                        },
                        isDeleted: false,
                    },
                });
                isEnrolled = !!enrollment;
            }
        }

        return NextResponse.json({
            id: course.id,
            title: course.title,
            videos: course.Video,
            isEnrolled,
        });
    } catch (error) {
        console.error('Error fetching course:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
