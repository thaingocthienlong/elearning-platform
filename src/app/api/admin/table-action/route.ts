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
        const { table, ids, action } = await request.json();

        // Validate table name
        const validTables = ['user', 'course', 'video', 'enrollment', 'ticket'];
        if (!validTables.includes(table)) {
            return new NextResponse('Invalid table', { status: 400 });
        }

        // @ts-ignore - Dynamic Prisma access
        const model: any = prisma[table];

        if (action === 'delete') {
            await model.updateMany({
                where: { id: { in: ids } },
                data: { isDeleted: true },
            });
        } else if (action === 'restore') {
            await model.updateMany({
                where: { id: { in: ids } },
                data: { isDeleted: false },
            });
        } else {
            return new NextResponse('Invalid action', { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Table action error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
