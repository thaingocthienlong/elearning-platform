import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
    evaluateMediaEntitlement,
    mapMediaEntitlementToHttp,
} from '@/lib/media-entitlement';
import { serverLog } from '@/lib/server-log';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    try {
        const { kids, videoId } = await req.json();

        if (!kids || !Array.isArray(kids)) {
            return new NextResponse('Invalid request', { status: 400 });
        }

        // If videoId provided, verify entitlement
        if (videoId) {
            const entitlement = await evaluateMediaEntitlement({
                session,
                videoId,
                checkViewLimit: true,
            });

            if (!entitlement.allowed) {
                const denial = mapMediaEntitlementToHttp(entitlement);
                return new NextResponse(denial.body, { status: denial.status });
            }
        }

        return NextResponse.json(
            {
                error: 'Local DRM license endpoint is not implemented for production DRM.',
                provider: 'DoveRunner Multi-DRM',
            },
            { status: 501 }
        );
    } catch (error) {
        serverLog.error('Local DRM license endpoint error', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
