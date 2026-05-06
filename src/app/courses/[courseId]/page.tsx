import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import CourseDetailClient from '@/components/course/CourseDetailClient';

export const dynamic = 'force-dynamic';

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
    const { courseId } = await params;
    const session = await getServerSession(authOptions);

    const { getCached } = await import('@/lib/redis');

    // Fetch course with Redis caching (5 minute TTL)
    const [course, user] = await Promise.all([
        getCached(
            `course:${courseId}`,
            async () => {
                return await prisma.course.findUnique({
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
            },
            300 // 5 minutes cache
        ),
        session?.user?.email
            ? prisma.user.findUnique({ where: { email: session.user.email } })
            : null,
    ]);

    if (!course) {
        notFound();
    }

    // Check enrollment
    let isEnrolled = false;
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

    return <CourseDetailClient course={course} isEnrolled={isEnrolled} />;
}
