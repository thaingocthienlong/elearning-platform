import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Expected JSON format:
// {
//   "Course Title 1": ["email1@example.com", "email2@example.com"],
//   "Course Title 2": ["email3@example.com"]
// }

const emailSchema = z.string().trim().toLowerCase().email().max(320);
const importSchema = z
    .record(
        z.string().trim().min(1).max(300),
        z.array(emailSchema).min(1).max(1_000)
    )
    .refine((data) => Object.keys(data).length > 0, 'At least one course is required')
    .refine((data) => Object.keys(data).length <= 100, 'Too many courses');

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    // 1. Check Admin Permissions
    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const parsed = importSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    try {
        const results = {
            success: [] as string[],
            errors: [] as string[],
        };

        // 2. Iterate through courses
        for (const [courseTitle, emails] of Object.entries(parsed.data)) {
            // Find course
            const course = await prisma.course.findFirst({
                where: { title: courseTitle, isDeleted: false },
            });

            if (!course) {
                results.errors.push(`Course not found: ${courseTitle}`);
                continue;
            }

            // Process emails
            for (const email of [...new Set(emails)]) {
                try {
                    // Find or Create User
                    const user = await prisma.user.upsert({
                        where: { email },
                        update: { isDeleted: false },
                        create: {
                            email,
                            name: email.split('@')[0], // Default name from email
                        },
                    });

                    // Enroll User
                    const enrolledAt = new Date();
                    await prisma.enrollment.upsert({
                        where: {
                            userId_courseId: {
                                userId: user.id,
                                courseId: course.id,
                            },
                        },
                        update: {
                            isDeleted: false,
                            enrolledAt,
                        },
                        create: {
                            userId: user.id,
                            courseId: course.id,
                            enrolledAt,
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
