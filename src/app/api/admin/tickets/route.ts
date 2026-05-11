import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

// PATCH: Update ticket status
export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { id, status } = await request.json();

        if (!id || !status) {
            return new NextResponse('ID and status are required', { status: 400 });
        }

        const validStatuses = ['WAITING', 'RESOLVING', 'RESOLVED'];
        if (!validStatuses.includes(status)) {
            return new NextResponse('Invalid status', { status: 400 });
        }

        const ticket = await prisma.ticket.update({
            where: { id },
            data: { status },
        });

        return NextResponse.json(ticket);
    } catch (error) {
        console.error('Ticket update error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
