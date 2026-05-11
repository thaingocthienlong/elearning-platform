import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { waitUntil } from '@vercel/functions';

/**
 * DRM Session Logging Endpoint
 * Records DRM usage for security monitoring and analytics
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await req.json();
        const {
            videoId,
            drmType,
            protocol,
            robustness,
            isHardwareDRM,
            browser,
            os,
            isMobile,
        } = body;

        // Validate required fields
        if (!videoId || !drmType || !protocol) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Get IP address and user agent
        const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] ||
            req.headers.get('x-real-ip') ||
            'unknown';
        const userAgent = req.headers.get('user-agent') || null;

        // Log DRM session in background
        waitUntil(
            (async () => {
                try {
                    const drmSession = await prisma.dRMSession.create({
                        data: {
                            userId: session.user.id,
                            videoId,
                            drmType,
                            protocol,
                            robustness: robustness || null,
                            isHardwareDRM: isHardwareDRM || false,
                            browser: browser || null,
                            os: os || null,
                            isMobile: isMobile || false,
                            ipAddress,
                            userAgent,
                        },
                    });

                    console.log('🔐 DRM Session logged (Background):', {
                        id: drmSession.id,
                        user: session.user.email,
                        videoId,
                        drmType,
                        isHardwareDRM,
                    });
                } catch (err) {
                    console.error('Background DRM logging error:', err);
                }
            })()
        );

        return NextResponse.json({ success: true, queued: true });
    } catch (error) {
        console.error('Error logging DRM session:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
