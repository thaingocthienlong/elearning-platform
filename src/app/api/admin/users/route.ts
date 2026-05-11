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
        const users = await prisma.user.findMany({
            where: { isDeleted: false },
            select: {
                id: true,
                email: true,
                name: true,
            },
            orderBy: { email: 'asc' },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error('Fetch users error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
