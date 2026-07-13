import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const [videoCount, courseCount, userCount] = await Promise.all([
            prisma.video.count({ where: { isDeleted: false } }),
            prisma.course.count({ where: { isDeleted: false } }),
            prisma.user.count({ where: { isDeleted: false } }),
        ]);

        return NextResponse.json({ videoCount, courseCount, userCount });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
