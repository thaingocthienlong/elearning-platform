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

        if (!email) {
            return new NextResponse('Email is required', { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

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

        // 1. Add to whitelist
        let allowedEmail;
        try {
            allowedEmail = await prisma.allowedEmail.create({
                data: {
                    fullname: fullname || null,
                    phone: phone || null,
                    email: normalizedEmail,
                    notes,
                    createdBy: session.user.id,
                },
            });
        } catch (error: unknown) {
            if ((error as { code?: string }).code === 'P2002') {
                return new NextResponse('Email already whitelisted', { status: 409 });
            }
            throw error;
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
            }

            // Create enrollment
            try {
                await prisma.enrollment.create({
                    data: {
                        userId: user.id,
                        courseId: courseId,
                    },
                });
            } catch (error: unknown) {
                if ((error as { code?: string }).code !== 'P2002') { // Ignore duplicate enrollments
                    console.error('Enrollment error:', error);
                }
            }
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
