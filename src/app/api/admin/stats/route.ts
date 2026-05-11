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
        const videoCount = await prisma.video.count();
        const courseCount = await prisma.course.count();
        const userCount = await prisma.user.count();

        return NextResponse.json({ videoCount, courseCount, userCount });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
