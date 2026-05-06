import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import CoursesListClient from '@/components/course/CoursesListClient';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect('/auth/signin');
    }

    // Fetch user and courses in parallel
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        redirect('/auth/signin');
    }

    // Use Redis caching for enrolled courses (5 minute TTL)
    const { getCached } = await import('@/lib/redis');

    const courses = await getCached(
        `courses:list:v2:${user.id}`, // Updated cache key to force refresh
        async () => {
            // Fetch enrolled courses
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
                    AND: [
                        {
                            OR: [
                                { id: { in: enrolledCourseIds } },
                                { accessType: 'OPEN' }
                            ]
                        },
                        { published: true },
                        { isDeleted: false },
                    ]
                },
                orderBy: {
                    createdAt: 'desc',
                },
                select: {
                    id: true,
                    title: true,
                    thumbnail: true,
                    accessType: true, // Select this for potential UI use
                },
            });
        },
        300 // 5 minutes cache
    );

    return <CoursesListClient courses={courses} />;
}
