import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
    evaluateMediaEntitlement,
    mapMediaEntitlementToHttp,
} from '@/lib/media-entitlement';
import { serverLog } from '@/lib/server-log';
import { activeMediaProvider } from '@/lib/media-provider';
import type { DrmType } from '@/lib/media-provider/types';

function isDrmType(value: unknown): value is DrmType {
    return value === 'widevine' || value === 'playready' || value === 'fairplay';
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    try {
        const { videoId, drmType = 'widevine' } = await req.json();

        if (!videoId) {
            return new NextResponse('Invalid request', { status: 400 });
        }

        if (!isDrmType(drmType)) {
            return new NextResponse('Unsupported DRM type', { status: 400 });
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

        const contentId = entitlement.video.providerContentId || entitlement.video.id;

        if (!contentId) {
            return new NextResponse('Video not found or not encrypted', { status: 404 });
        }

        const token = activeMediaProvider.createLicenseToken({
            contentId,
            userId: entitlement.user.id,
            drmType,
            ttlSeconds: Number(process.env.DOVERUNNER_LICENSE_TOKEN_TTL_SECONDS ?? 300),
        });

        return NextResponse.json({ token });
    } catch (error) {
        serverLog.error('DRM token generation error', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
