import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
    evaluateMediaEntitlement,
    mapMediaEntitlementToHttp,
} from '@/lib/media-entitlement';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { videoId, position, isNewView } = await request.json();

        if (!videoId || position === undefined) {
            return new NextResponse('Missing required fields', { status: 400 });
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

        // Get or create watch record
        let watchRecord = await prisma.watchRecord.findUnique({
            where: {
                userId_videoId: {
                    userId: session.user.id,
                    videoId,
                },
            },
        });

        if (!watchRecord) {
            // Create new watch record
            watchRecord = await prisma.watchRecord.create({
                data: {
                    userId: session.user.id,
                    videoId,
                    lastPosition: position,
                    viewCount: isNewView ? 1 : 0,
                    lastViewedAt: new Date(),
                },
            });
        } else {
            // Determine effective view limit (per-user limit overrides video default)
            const effectiveLimit = watchRecord.viewLimit ?? entitlement.video.viewLimit ?? null;

            // Check view limit before allowing a new view
            if (isNewView && effectiveLimit !== null && watchRecord.viewCount >= effectiveLimit) {
                return NextResponse.json(
                    {
                        error: 'View limit exceeded',
                        viewCount: watchRecord.viewCount,
                        viewLimit: effectiveLimit,
                    },
                    { status: 403 }
                );
            }

            // Update existing record
            watchRecord = await prisma.watchRecord.update({
                where: {
                    userId_videoId: {
                        userId: session.user.id,
                        videoId,
                    },
                },
                data: {
                    lastPosition: position,
                    viewCount: isNewView ? { increment: 1 } : undefined,
                    lastViewedAt: new Date(),
                },
            });
        }

        // Get updated effective limit for response
        const effectiveLimit = watchRecord.viewLimit ?? entitlement.video.viewLimit ?? null;

        return NextResponse.json({
            success: true,
            viewCount: watchRecord.viewCount,
            viewLimit: effectiveLimit,
            lastPosition: watchRecord.lastPosition,
        });
    } catch (error) {
        console.error('Heartbeat error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
