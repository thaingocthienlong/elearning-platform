import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
    evaluateMediaEntitlement,
    mapMediaEntitlementToHttp,
} from '@/lib/media-entitlement';
import { serverLog } from '@/lib/server-log';
import { createTencentDrmToken, resolveTencentLicenseUrl } from '@/lib/tencent/vod';
import type { TencentDrmType } from '@/lib/tencent/types';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    try {
        const { videoId, drmType = 'widevine' } = await req.json() as {
            videoId?: string;
            drmType?: TencentDrmType;
        };

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

        if (!entitlement.video.tencentFileId) {
            return new NextResponse('Video not found or not ready for Tencent playback', { status: 404 });
        }

        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        const token = createTencentDrmToken({
            fileId: entitlement.video.tencentFileId,
            userId: entitlement.user.id,
            videoId,
            expiresAt,
        });

        return NextResponse.json({
            provider: 'tencent',
            token,
            drmToken: token,
            videoId,
            fileId: entitlement.video.tencentFileId,
            manifestUrl: entitlement.video.dashUrl ?? entitlement.video.hlsUrl,
            licenseUrl: resolveTencentLicenseUrl(drmType),
            fairplayCertUrl: process.env.NEXT_PUBLIC_TENCENT_FAIRPLAY_CERT_URL,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (error) {
        serverLog.error('DRM token generation error', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
