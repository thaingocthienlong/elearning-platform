import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { courseId } = await params;
        const { accessType } = await request.json();

        // Validate input
        if (accessType !== 'OPEN' && accessType !== 'VERIFY') {
            return new NextResponse('Invalid access type', { status: 400 });
        }

        const updatedCourse = await prisma.course.update({
            where: { id: courseId },
            data: { accessType },
        });

        return NextResponse.json(updatedCourse);
    } catch (error) {
        console.error('Update course error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
