import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCache, setCache } from '@/lib/redis';

export async function GET(req: NextRequest) {
    // Get session token for cache key
    const sessionToken = req.cookies.get('next-auth.session-token')?.value ||
        req.cookies.get('__Secure-next-auth.session-token')?.value;

    // Check Redis cache first (single GET operation)
    if (sessionToken) {
        try {
            const cachedValidity = await getCache<boolean>(`session_valid:${sessionToken}`);
            if (cachedValidity === true) {
                return NextResponse.json({ valid: true });
            }
        } catch {
            // Redis error - fall through to database check
        }
    }

    // Fallback to database check via getServerSession
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return NextResponse.json({ valid: false, reason: 'No session' }, { status: 401 });
    }

    // Valid session - cache result for 10 minutes (single SET operation)
    if (sessionToken) {
        // Fire and forget - don't await to reduce latency
        setCache(`session_valid:${sessionToken}`, true, 600).catch(() => {
            // Ignore cache errors
        });
    }

    return NextResponse.json({ valid: true });
}
