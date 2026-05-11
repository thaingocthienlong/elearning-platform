import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    try {
        if (type === 'user') {
            const users = await prisma.user.findMany({
                where: { isDeleted: false },
                select: { id: true, email: true, name: true },
                orderBy: { email: 'asc' },
            });
            return NextResponse.json(
                users.map((u) => ({
                    id: u.id,
                    label: `${u.email} (${u.name || 'No Name'})`,
                }))
            );
        } else if (type === 'course') {
            const courses = await prisma.course.findMany({
                where: { isDeleted: false },
                select: { id: true, title: true },
                orderBy: { title: 'asc' },
            });
            return NextResponse.json(
                courses.map((c) => ({
                    id: c.id,
                    label: c.title,
                }))
            );
        } else {
            return new NextResponse('Invalid type', { status: 400 });
        }
    } catch (error) {
        console.error('Options fetch error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
