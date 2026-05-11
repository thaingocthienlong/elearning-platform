import { prisma } from '@/lib/prisma';

// Helper: Extract Axinom ID from description field
export function extractAxinomId(description: string | null): string | null {
    if (!description) return null;
    const match = description.match(/axinom-id:([a-f0-9-]+)/i);
    return match ? match[1] : null;
}

import { getAuthToken } from './axinom-video-service';

// Helper: Query Axinom for video details
async function getVideoDetails(axinomVideoId: string) {
    const VIDEO_SERVICE_URL = process.env.AXINOM_VIDEO_SERVICE_URL || 'https://video.service.eu.axinom.net/graphql';

    // 1. Authenticate
    const token = await getAuthToken();

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
            encodingState
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

export type SyncResult = {
    success: boolean;
    status: string;
    updated: boolean;
    error?: string;
};

function getStoredAxinomVideoId(video: {
    axinomVideoId?: string | null;
    description?: string | null;
}) {
    return video.axinomVideoId || extractAxinomId(video.description ?? null);
}

export async function syncVideoWithAxinom(videoId: string): Promise<SyncResult> {
    try {
        const video = await prisma.video.findUnique({
            where: { id: videoId }
        });

        if (!video) {
            return { success: false, status: 'NOT_FOUND', updated: false, error: 'Video not found' };
        }

        const axinomVideoId = getStoredAxinomVideoId(video);
        if (!axinomVideoId) {
            return { success: false, status: 'NO_AXINOM_ID', updated: false, error: 'No Axinom ID found' };
        }

        // Fetch DRM video details
        const axinomVideo = await getVideoDetails(axinomVideoId);
        let updated = false;

        await prisma.video.update({
            where: { id: videoId },
            data: {
                axinomVideoId,
                axinomEncodingStatus: axinomVideo.encodingState,
                axinomOutputLocation: axinomVideo.outputLocation,
                axinomSyncedAt: new Date(),
                updatedAt: new Date()
            }
        });

        // Check if DRM video is ready
        if (axinomVideo.encodingState === 'READY') {
            const keyIds = [
                ...new Set(
                    axinomVideo.videoStreams.nodes
                        .map((s: { keyId: string }) => s.keyId)
                        .filter(Boolean)
                )
            ] as string[];

            const updateData: {
                dashUrl: string;
                hlsUrl: string;
                drmKeyId: string;
                axinomVideoId: string;
                axinomEncodingStatus: string;
                axinomOutputLocation?: string;
                axinomSyncedAt: Date;
                updatedAt: Date;
                hlsUrlClear?: string;
                published?: boolean;
            } = {
                dashUrl: axinomVideo.dashManifestPath,
                hlsUrl: axinomVideo.hlsManifestPath,
                drmKeyId: keyIds.join(','),
                axinomVideoId,
                axinomEncodingStatus: axinomVideo.encodingState,
                axinomOutputLocation: axinomVideo.outputLocation,
                axinomSyncedAt: new Date(),
                updatedAt: new Date()
            };

            // Also check clear video if axinomIdClear exists
            if (video.axinomIdClear) {
                try {
                    const clearVideo = await getVideoDetails(video.axinomIdClear);
                    if (clearVideo.encodingState === 'READY') {
                        updateData.hlsUrlClear = clearVideo.hlsManifestPath;
                    }
                } catch (error) {
                    console.error('Failed to fetch clear video details:', error instanceof Error ? error.message : String(error));
                }
            }

            // Only mark as published if DRM video is ready
            updateData.published = true;

            await prisma.video.update({
                where: { id: videoId },
                data: updateData
            });

            updated = true;
        }

        return {
            success: true,
            status: axinomVideo.encodingState,
            updated
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Sync error for video ${videoId}:`, errorMessage);
        return {
            success: false,
            status: 'ERROR',
            updated: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
