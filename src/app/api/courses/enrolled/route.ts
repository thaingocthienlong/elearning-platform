import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCached } from '@/lib/redis';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return new NextResponse('User not found', { status: 404 });
        }

        // Use caching with 5 minute TTL
        const courses = await getCached(
            `courses:user:${user.id}`,
            async () => {
                const enrollments = await prisma.enrollment.findMany({
                    where: {
                        userId: user.id,
                        isDeleted: false,
                    },
                    select: {
                        courseId: true,
                    },
                });

                const enrolledCourseIds = enrollments.map(e => e.courseId);

                return await prisma.course.findMany({
                    where: {
                        id: { in: enrolledCourseIds },
                        published: true,
                        isDeleted: false,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                    select: {
                        id: true,
                        title: true,
                        thumbnail: true,
                    },
                });
            },
            300 // 5 minutes TTL
        );

        return NextResponse.json(courses);
    } catch (error) {
        console.error('Error fetching enrolled courses:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
