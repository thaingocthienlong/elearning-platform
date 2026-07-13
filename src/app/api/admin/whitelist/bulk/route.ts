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

        // Process each entry independently so one malformed row cannot abort the batch.
        for (const [index, rawEntry] of entries.entries()) {
            const entry = rawEntry && typeof rawEntry === 'object'
                ? rawEntry as { fullname?: unknown; phone?: unknown; email?: unknown }
                : {};
            const fullname = typeof entry.fullname === 'string' ? entry.fullname : '';
            const phone = typeof entry.phone === 'string' ? entry.phone : '';
            const normalizedEmail = typeof entry.email === 'string'
                ? entry.email.toLowerCase().trim()
                : '';

            if (!/^[^\s@]+@[^\s@]+$/.test(normalizedEmail)) {
                results.errors.push(`Entry ${index + 1}: a valid email is required`);
                continue;
            }

            try {
                const entryResult = await prisma.$transaction(async (transaction) => {
                    const entryCounts = {
                        whitelisted: 0,
                        usersCreated: 0,
                        enrollmentsCreated: 0,
                        duplicateWhitelist: 0,
                        duplicateEnrollments: 0,
                    };

                    const existingAllowedEmail = await transaction.allowedEmail.findUnique({
                        where: { email: normalizedEmail },
                        select: { id: true },
                    });

                    if (existingAllowedEmail) {
                        entryCounts.duplicateWhitelist++;
                    } else {
                        await transaction.allowedEmail.create({
                            data: {
                                fullname: fullname || null,
                                phone: phone || null,
                                email: normalizedEmail,
                                notes: courseId ? 'Bulk import with enrollment' : 'Bulk import',
                                createdBy: session.user.id,
                            },
                        });
                        entryCounts.whitelisted++;
                    }

                    if (courseId) {
                        let user = await transaction.user.findUnique({
                            where: { email: normalizedEmail },
                            select: { id: true, isDeleted: true },
                        });

                        if (!user) {
                            user = await transaction.user.create({
                                data: {
                                    email: normalizedEmail,
                                    name: fullname || normalizedEmail.split('@')[0],
                                    updatedAt: new Date(),
                                },
                                select: { id: true, isDeleted: true },
                            });
                            entryCounts.usersCreated++;
                        } else if (user.isDeleted) {
                            await transaction.user.update({
                                where: { id: user.id },
                                data: { isDeleted: false },
                            });
                        }

                        const existingEnrollment = await transaction.enrollment.findUnique({
                            where: {
                                userId_courseId: {
                                    userId: user.id,
                                    courseId,
                                },
                            },
                            select: { isDeleted: true },
                        });

                        await transaction.enrollment.upsert({
                            where: {
                                userId_courseId: {
                                    userId: user.id,
                                    courseId,
                                },
                            },
                            create: {
                                userId: user.id,
                                courseId,
                            },
                            update: {
                                isDeleted: false,
                            },
                        });

                        if (!existingEnrollment || existingEnrollment.isDeleted) {
                            entryCounts.enrollmentsCreated++;
                        } else {
                            entryCounts.duplicateEnrollments++;
                        }
                    }

                    return entryCounts;
                });

                results.whitelisted += entryResult.whitelisted;
                results.usersCreated += entryResult.usersCreated;
                results.enrollmentsCreated += entryResult.enrollmentsCreated;
                results.duplicateWhitelist += entryResult.duplicateWhitelist;
                results.duplicateEnrollments += entryResult.duplicateEnrollments;
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                results.errors.push(`${normalizedEmail}: ${message}`);
            }
        }

        return NextResponse.json(results);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Bulk import error:', error);
        return new NextResponse(message || 'Internal Server Error', { status: 500 });
    }
}
