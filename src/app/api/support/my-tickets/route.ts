import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        // Case 1: Logged-in User
        if (session?.user?.id) {
            const tickets = await prisma.ticket.findMany({
                where: {
                    OR: [
                        { userId: session.user.id },
                        { email: session.user.email || '' }
                    ]
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    status: true,
                    createdAt: true,
                    description: true,
                }
            });
            return NextResponse.json({ tickets });
        }

        // Case 2: Guest User with email
        if (email) {
            const tickets = await prisma.ticket.findMany({
                where: { email },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    status: true,
                    createdAt: true,
                    description: true,
                }
            });
            return NextResponse.json({ tickets });
        }

        return NextResponse.json({ tickets: [] });

    } catch (error) {
        console.error('Error fetching tickets:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
