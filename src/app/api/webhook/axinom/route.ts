import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { serverLog } from '@/lib/server-log';

// Webhook payload types
interface VideoEncodingFinishedPayload {
    eventType: 'VideoEncodingFinished';
    videoId: string; // Axinom Video ID
    title: string;
    sourceLocation: string;
    publishLocation: string;
    timestamp: string;
}

type AxinomVideoDetails = {
    dashManifestPath: string;
    hlsManifestPath: string;
    outputLocation?: string;
    videoStreams: {
        nodes: { keyId: string }[];
    };
};

/**
 * Verify HMAC signature from Axinom webhook
 */
function verifySignature(payload: string, signature: string): boolean {
    const secret = process.env.AXINOM_WEBHOOK_SECRET;

    if (!secret) {
        serverLog.error('AXINOM_WEBHOOK_SECRET not configured');
        return false;
    }

    if (!/^[a-f0-9]{64}$/i.test(signature)) {
        return false;
    }

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(
        signatureBuffer,
        expectedBuffer
    );
}

/**
 * Query Axinom for video details (manifest URLs + DRM key IDs)
 */
async function getVideoDetails(axinomVideoId: string): Promise<AxinomVideoDetails> {
    const CLIENT_ID = process.env.AXINOM_ENCODING_CLIENT_ID!;
    const CLIENT_SECRET = process.env.AXINOM_ENCODING_CLIENT_SECRET!;
    const IDENTITY_URL = 'https://id.service.eu.axinom.net/graphql';
    const VIDEO_SERVICE_URL = 'https://video.service.eu.axinom.net/graphql';

    // 1. Authenticate
    const authRes = await fetch(IDENTITY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: `
        mutation Authenticate($clientId: String!, $clientSecret: String!) {
          authenticateServiceAccount(input: { clientId: $clientId, clientSecret: $clientSecret }) {
            accessToken
          }
        }
      `,
            variables: { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }
        })
    });

    const authData = await authRes.json();
    if (authData.errors) {
        throw new Error(`Auth failed: ${JSON.stringify(authData.errors)}`);
    }
    const token = authData.data.authenticateServiceAccount.accessToken;

    // 2. Query video details
    const videoRes = await fetch(VIDEO_SERVICE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            query: `
        query VideoQuery($id: UUID!) {
          video(id: $id) {
            dashManifestPath
            hlsManifestPath
            outputLocation
            videoStreams {
              nodes {
                keyId
              }
            }
          }
        }
      `,
            variables: { id: axinomVideoId }
        })
    });

    const videoData = await videoRes.json();
    if (videoData.errors) {
        throw new Error(`Video query failed: ${JSON.stringify(videoData.errors)}`);
    }
    return videoData.data.video;
}

export async function POST(request: NextRequest) {
    try {
        // 1. Get raw body and signature
        const rawBody = await request.text();
        const signature = request.headers.get('x-mosaic-signature');

        if (!signature) {
            serverLog.warn('Missing Axinom webhook signature header');
            return NextResponse.json(
                { error: 'Missing signature header' },
                { status: 401 }
            );
        }

        // 2. Verify signature
        const isValid = verifySignature(rawBody, signature);
        if (!isValid) {
            serverLog.warn('Invalid Axinom webhook signature');
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 403 }
            );
        }

        // 3. Parse payload
        const payload: VideoEncodingFinishedPayload = JSON.parse(rawBody);

        if (payload.eventType !== 'VideoEncodingFinished') {
            return NextResponse.json({ message: 'Event ignored' });
        }

        // 4. Find our video record by explicit Axinom IDs, with legacy description fallback.
        const video = await prisma.video.findFirst({
            where: {
                OR: [
                    { axinomVideoId: payload.videoId },
                    { axinomIdClear: payload.videoId },
                    {
                        description: {
                            contains: payload.videoId
                        }
                    }
                ]
            }
        });

        if (!video) {
            serverLog.warn('Video not found for Axinom webhook ID', {
                axinomVideoId: payload.videoId,
            });
            return NextResponse.json(
                { message: 'Video not found in database' },
                { status: 404 }
            );
        }

        // 5. Fetch video details from Axinom
        const axinomVideo = await getVideoDetails(payload.videoId);
        const isClearEncode = video.axinomIdClear === payload.videoId;

        if (isClearEncode) {
            await prisma.video.update({
                where: { id: video.id },
                data: {
                    hlsUrlClear: axinomVideo.hlsManifestPath,
                    axinomSyncedAt: new Date(),
                    updatedAt: new Date()
                }
            });

            return NextResponse.json({
                success: true,
                message: 'Clear encoding webhook processed successfully',
                videoId: video.id,
                axinomVideoId: payload.videoId
            });
        }

        // 6. Extract unique key IDs
        const keyIds = [
            ...new Set(
                axinomVideo.videoStreams.nodes.map((stream) => stream.keyId)
            )
        ];

        // 7. Update database
        await prisma.video.update({
            where: { id: video.id },
            data: {
                dashUrl: axinomVideo.dashManifestPath,
                hlsUrl: axinomVideo.hlsManifestPath,
                drmKeyId: keyIds.join(','), // Store as comma-separated
                axinomVideoId: payload.videoId,
                axinomEncodingStatus: 'READY',
                axinomOutputLocation: axinomVideo.outputLocation,
                axinomSyncedAt: new Date(),
                published: true, // Auto-publish
                updatedAt: new Date()
            }
        });

        // 8. Return success (Axinom expects 200 OK)
        return NextResponse.json({
            success: true,
            message: 'Webhook processed successfully',
            videoId: video.id,
            axinomVideoId: payload.videoId
        });

    } catch (error) {
        serverLog.error('Axinom webhook processing error', error);
        return NextResponse.json(
            {
                error: 'Internal server error'
            },
            { status: 500 }
        );
    }
}
