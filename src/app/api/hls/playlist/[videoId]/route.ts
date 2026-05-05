import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { r2, R2_BUCKET } from '@/lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import {
    evaluateMediaEntitlement,
    mapMediaEntitlementToHttp,
} from '@/lib/media-entitlement';

export async function GET(req: Request, { params }: { params: Promise<{ videoId: string }> }) {
    const session = await getServerSession(authOptions);
    const { videoId } = await params;

    const entitlement = await evaluateMediaEntitlement({
        session,
        videoId,
        checkViewLimit: true,
    });

    if (!entitlement.allowed) {
        const denial = mapMediaEntitlementToHttp(entitlement);
        return new NextResponse(denial.body, { status: denial.status });
    }

    if (!entitlement.video.hlsUrl) {
        return new NextResponse('Video not found', { status: 404 });
    }

    // Extract key from URL (assuming stored as full URL, but we need R2 key)
    // video.hlsUrl is like https://cdn.../processed/id/master.m3u8
    // We need processed/id/master.m3u8
    const url = new URL(entitlement.video.hlsUrl);
    const key = url.pathname.substring(1); // Remove leading /

    try {
        const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
        const response = await r2.send(command);

        if (!response.Body) {
            return new NextResponse('Manifest not found', { status: 404 });
        }

        // Stream the manifest
        const stream = response.Body as Readable;

        return new NextResponse(stream as any, {
            headers: {
                'Content-Type': 'application/vnd.apple.mpegurl',
                // Cache for 1 minute, stale for 5 minutes (Master playlist rarely changes)
                'Cache-Control': 'private, no-store',
            },
        });
    } catch (error) {
        console.error('HLS Gateway error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
