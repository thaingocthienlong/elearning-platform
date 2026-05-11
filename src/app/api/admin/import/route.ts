import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Expected JSON format:
// {
//   "Course Title 1": ["email1@example.com", "email2@example.com"],
//   "Course Title 2": ["email3@example.com"]
// }

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    // 1. Check Admin Permissions
    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const data = await request.json();
        const results = {
            success: [] as string[],
            errors: [] as string[],
        };

        // 2. Iterate through courses
        for (const [courseTitle, emails] of Object.entries(data)) {
            if (!Array.isArray(emails)) continue;

            // Find course
            const course = await prisma.course.findFirst({
                where: { title: courseTitle, isDeleted: false },
            });

            if (!course) {
                results.errors.push(`Course not found: ${courseTitle}`);
                continue;
            }

            // Process emails
            for (const email of emails) {
                if (typeof email !== 'string') continue;

                try {
                    // Find or Create User
                    const user = await prisma.user.upsert({
                        where: { email },
                        update: {},
                        create: {
                            id: crypto.randomUUID(),
                            email,
                            name: email.split('@')[0], // Default name from email
                            updatedAt: new Date(),
                        },
                    });

                    // Enroll User
                    await prisma.enrollment.upsert({
                        where: {
                            userId_courseId: {
                                userId: user.id,
                                courseId: course.id,
                            },
                        },
                        update: {}, // Already enrolled
                        create: {
                            userId: user.id,
                            courseId: course.id,
                        },
                    });

                    results.success.push(`Enrolled ${email} in ${courseTitle}`);
                } catch (error) {
                    console.error(`Failed to process ${email} for ${courseTitle}:`, error);
                    results.errors.push(`Failed to enroll ${email} in ${courseTitle}`);
                }
            }
        }

        return NextResponse.json(results);
    } catch (error) {
        console.error('Batch import error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
