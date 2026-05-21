import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateAxinomToken } from '@/lib/axinom';
import {
    evaluateMediaEntitlement,
    mapMediaEntitlementToHttp,
} from '@/lib/media-entitlement';
import { serverLog } from '@/lib/server-log';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    try {
        const { videoId } = await req.json();

        if (!videoId) {
            return new NextResponse('Invalid request', { status: 400 });
        }

        const entitlement = await evaluateMediaEntitlement({
            session,
            videoId,
            checkViewLimit: true,
        });

        if (!entitlement.allowed) {
            const denial = mapMediaEntitlementToHttp(entitlement);
            return new NextResponse(denial.body, { status: denial.status });
        }

        if (!entitlement.video.drmKeyId) {
            return new NextResponse('Video not found or not encrypted', { status: 404 });
        }

        const token = generateAxinomToken({
            keyIds: entitlement.video.drmKeyId,
            userId: entitlement.user.id,
            messageTtlSeconds: 300,
            licenseDurationSeconds: 12600,
            allowPersistence: false,
        });

        return NextResponse.json({ token });
    } catch (error) {
        serverLog.error('DRM token generation error', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
