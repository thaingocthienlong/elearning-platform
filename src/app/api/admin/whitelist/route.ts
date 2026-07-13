import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const allowedEmails = await prisma.allowedEmail.findMany({
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(allowedEmails);
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { fullname, phone, email, notes, courseId } = await request.json();

        if (typeof email !== 'string') {
            return new NextResponse('Email is required', { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();
        if (!/^[^\s@]+@[^\s@]+$/.test(normalizedEmail)) {
            return new NextResponse('A valid email is required', { status: 400 });
        }

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

        const allowedEmailData = {
            fullname: fullname || null,
            phone: phone || null,
            email: normalizedEmail,
            notes,
            createdBy: session.user.id,
        };

        let allowedEmail;

        try {
            if (!courseId) {
                allowedEmail = await prisma.allowedEmail.create({ data: allowedEmailData });
            } else {
                allowedEmail = await prisma.$transaction(async (transaction) => {
                    const createdAllowedEmail = await transaction.allowedEmail.create({
                        data: allowedEmailData,
                    });

                    const user = await transaction.user.upsert({
                        where: { email: normalizedEmail },
                        create: {
                            email: normalizedEmail,
                            name: fullname || normalizedEmail.split('@')[0],
                            updatedAt: new Date(),
                        },
                        update: {
                            isDeleted: false,
                        },
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

                    return createdAllowedEmail;
                });
            }
        } catch (error: unknown) {
            if ((error as { code?: string }).code === 'P2002') {
                return new NextResponse('Email already whitelisted', { status: 409 });
            }
            throw error;
        }

        return NextResponse.json(allowedEmail);
    } catch (error: unknown) {
        console.error('Whitelist create error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return new NextResponse('ID is required', { status: 400 });
        }

        await prisma.allowedEmail.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Whitelist delete error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
