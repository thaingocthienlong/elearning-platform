import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const courses = await prisma.course.findMany({
            where: { isDeleted: false },
            select: {
                id: true,
                title: true,
                accessType: true,
                _count: {
                    select: { Enrollment: true },
                },
            },
            orderBy: { title: 'asc' },
        });

        return NextResponse.json(courses);
    } catch (error) {
        console.error('Fetch courses error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
