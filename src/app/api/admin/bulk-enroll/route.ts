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
        const { userIds, courseIds } = await request.json();
        if (!Array.isArray(userIds) || !Array.isArray(courseIds)) {
            return new NextResponse('Invalid input', { status: 400 });
        }
        let created = 0;
        let skipped = 0;
        for (const userId of userIds) {
            for (const courseId of courseIds) {
                try {
                    await prisma.enrollment.create({ data: { userId, courseId } });
                    created++;
                } catch (error) { skipped++; }
            }
        }
        return NextResponse.json({ created, skipped, total: userIds.length * courseIds.length });
    } catch (error) {
        console.error('Bulk enroll error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}