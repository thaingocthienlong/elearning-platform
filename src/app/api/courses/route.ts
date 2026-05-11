import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getCached } from '@/lib/redis';

export async function GET() {
    try {
        const courses = await getCached(
            'courses:all:published',
            async () => {
                return await prisma.course.findMany({
                    where: {
                        published: true,
                        isDeleted: false,
                    },
                    select: {
                        id: true,
                        title: true,
                        thumbnail: true,
                        published: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                });
            },
            300 // 5 minutes cache
        );

        return NextResponse.json(courses, {
            headers: {
                // Cache for 1 minute, stale for 5 minutes
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            },
        });
    } catch (error) {
        console.error('Failed to fetch courses:', error);
        return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }
}
