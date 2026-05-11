import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Assuming authOptions is exported from here
import { getRedisClient } from '@/lib/redis';
import { z } from 'zod';

const SYSTEM_MODE_KEY = 'config:system_mode';

const updateModeSchema = z.object({
    mode: z.enum(['courses', 'meeting']),
});

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    // Allow admins to fetch the config (or public if needed, but safe to restrict to admin for now, 
    // frontend public state usually derived from redirect behavior or separate public config endpoint)
    // Actually, for the admin toggle to show current state, admin access is required.
    if (session?.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const redis = getRedisClient();
        if (!redis) {
            return NextResponse.json({ mode: 'courses', configured: false });
        }

        const mode = await redis.get(SYSTEM_MODE_KEY) || 'courses';
        return NextResponse.json({ mode, configured: true });
    } catch (error) {
        console.error('Failed to fetch system mode:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (session?.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const redis = getRedisClient();
        if (!redis) {
            return new NextResponse('Redis Not Configured', { status: 503 });
        }

        const body = await req.json();
        const { mode } = updateModeSchema.parse(body);

        await redis.set(SYSTEM_MODE_KEY, mode);

        return NextResponse.json({ mode, success: true });
    } catch (error) {
        console.error('Failed to update system mode:', error);
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid Request', { status: 400 });
        }
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
