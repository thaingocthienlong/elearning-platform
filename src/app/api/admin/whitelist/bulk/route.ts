import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { entries, courseId } = await request.json();

        if (!entries || !Array.isArray(entries)) {
            return new NextResponse('Invalid data format', { status: 400 });
        }

        const results = {
            whitelisted: 0,
            usersCreated: 0,
            enrollmentsCreated: 0,
            duplicateWhitelist: 0,
            duplicateEnrollments: 0,
            errors: [] as string[],
        };

        if (courseId) {
            const course = await prisma.course.findFirst({
                where: {
                    id: courseId,
                    isDeleted: false,
                },
                select: { id: true },
            });

            if (!course) {
                return new NextResponse('Course not found', { status: 400 });
            }
        }

        // Process each entry
        for (const entry of entries) {
            const { fullname, phone, email } = entry;
            const normalizedEmail = email.toLowerCase().trim();

            try {
                // 1. Add to whitelist
                try {
                    await prisma.allowedEmail.create({
                        data: {
                            fullname: fullname || null,
                            phone: phone || null,
                            email: normalizedEmail,
                            notes: courseId ? 'Bulk import with enrollment' : 'Bulk import',
                            createdBy: session.user.id,
                        },
                    });
                    results.whitelisted++;
                } catch (error: unknown) {
                    if ((error as { code?: string }).code === 'P2002') {
                        results.duplicateWhitelist++;
                    } else {
                        throw error;
                    }
                }

                // 2. If courseId provided, create/find user and enroll
                if (courseId) {
                    // Create or find user
                    let user = await prisma.user.findUnique({
                        where: { email: normalizedEmail },
                    });

                    if (!user) {
                        // Create placeholder user
                        user = await prisma.user.create({
                            data: {
                                email: normalizedEmail,
                                name: fullname || normalizedEmail.split('@')[0],
                                updatedAt: new Date(),
                            },
                        });
                        results.usersCreated++;
                    }

                    // Create enrollment
                    try {
                        await prisma.enrollment.create({
                            data: {
                                userId: user.id,
                                courseId: courseId,
                            },
                        });
                        results.enrollmentsCreated++;
                    } catch (error: unknown) {
                        if ((error as { code?: string }).code === 'P2002') {
                            results.duplicateEnrollments++;
                        } else {
                            throw error;
                        }
                    }
                }
            } catch (error: unknown) {
                results.errors.push(`${normalizedEmail}: ${(error as Error).message}`);
            }
        }

        return NextResponse.json(results);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Bulk import error:', error);
        return new NextResponse(message || 'Internal Server Error', { status: 500 });
    }
}
