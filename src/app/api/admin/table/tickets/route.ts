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
        const tickets = await prisma.ticket.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json(tickets);
    } catch (error) {
        console.error('Fetch tickets error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
