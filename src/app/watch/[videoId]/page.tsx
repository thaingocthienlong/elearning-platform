import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SecurityWrapper } from '@/components/video/SecurityWrapper';
import WatchPageClient from '@/components/course/WatchPageClient';
import { UnsupportedPlaybackBrowser } from '@/components/video/UnsupportedPlaybackBrowser';
import { evaluateMediaEntitlement } from '@/lib/media-entitlement';
import { resolveVdoCipherAccount } from '@/lib/vdocipher-accounts';
import { getVdoCipherOtp, VdoCipherApiError } from '@/lib/vdocipher';
import { getPlaybackBrowserGate } from '@/lib/playback-browser-allowlist';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

function PlaybackUnavailable() {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4">
            <div className="w-full max-w-xl rounded-lg border border-border bg-card p-6 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-6 w-6" />
                </div>
                <p className="mt-4 text-sm font-medium text-muted-foreground">Playback provider unavailable</p>
                <h1 className="mt-2 text-2xl font-semibold">Video temporarily unavailable</h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    This lesson is available in the course, but the video provider could not prepare playback right now.
                    Please try again later or contact support.
                </p>
                <div className="mt-5 flex justify-center">
                    <Button asChild variant="outline">
                        <Link href="/courses">Back to courses</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown VdoCipher playback error';
}

function getVdoCipherErrorStatus(error: unknown) {
    return error instanceof VdoCipherApiError ? error.status : undefined;
}

export default async function WatchPage({ params }: { params: Promise<{ videoId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/api/auth/signin');
    }

    const { videoId } = await params;
    const requestHeaders = await headers();
    const browserGate = getPlaybackBrowserGate(requestHeaders.get('user-agent') || '');

    const entitlement = await evaluateMediaEntitlement({
        session,
        videoId,
        checkViewLimit: true,
    });

    if (!entitlement.allowed) {
        switch (entitlement.code) {
            case 'VIDEO_NOT_FOUND':
            case 'VIDEO_UNPUBLISHED':
            case 'VIDEO_DELETED':
                notFound();
            case 'UNAUTHENTICATED':
            case 'USER_NOT_FOUND':
                redirect('/api/auth/signin');
            case 'NOT_ENROLLED':
                redirect('/courses');
            case 'NO_VIDEO_ACCESS':
                redirect('/courses?error=video_access_denied');
            case 'ACCESS_EXPIRED':
                redirect('/courses?error=access_expired');
            case 'ACCESS_NOT_YET_VALID':
                redirect('/courses?error=access_not_yet_valid');
            case 'ACCESS_PERIOD_ENDED':
                redirect('/courses?error=access_period_ended');
            case 'VIEW_LIMIT_EXCEEDED':
                redirect('/courses?error=view_limit_exceeded');
        }
    }

    const { user, video, currentWatchRecord, effectiveViewLimit } = {
        user: entitlement.user,
        video: entitlement.video,
        currentWatchRecord: entitlement.watchRecord,
        effectiveViewLimit: entitlement.effectiveViewLimit,
    };

    if (!browserGate.allowed) {
        return <UnsupportedPlaybackBrowser browserName={browserGate.browserName} />;
    }

    const [whitelistEntry, courseVideos] = await Promise.all([
        // Whitelist data for watermark
        prisma.allowedEmail.findUnique({
            where: { email: user.email! },
            select: { fullname: true, phone: true },
        }),
        // Sidebar videos
        prisma.video.findMany({
            where: {
                courseId: video.courseId,
                published: true,
            },
            orderBy: { position: 'asc' },
            select: {
                id: true,
                title: true,
                position: true,
            },
        }),
    ]);

    const courseVideoIds = courseVideos.map((courseVideo) => courseVideo.id);
    const watchRecords = courseVideoIds.length > 0
        ? await prisma.watchRecord.findMany({
            where: {
                userId: user.id,
                videoId: {
                    in: courseVideoIds,
                },
            },
            select: {
                videoId: true,
                completedAt: true,
            },
        })
        : [];

    // Merge data for sidebar
    const sidebarVideos = courseVideos.map((v) => ({
        ...v,
        completed: !!watchRecords.find((r) => r.videoId === v.id)?.completedAt,
    }));
    const watermarkText = whitelistEntry?.fullname && whitelistEntry?.phone
        ? `${whitelistEntry.fullname} • ${whitelistEntry.phone}`
        : user.name || user.email!;

    let token = '';
    let providerPlayback:
        | { provider: 'AXINOM' }
        | { provider: 'VDOCIPHER'; otp: string; playbackInfo: string } = { provider: 'AXINOM' };

    if (video.provider === 'VDOCIPHER') {
        if (video.vdocipherStatus !== 'READY' || !video.vdocipherVideoId || !video.vdocipherAccountId) {
            notFound();
        }

        let otp;

        try {
            const account = resolveVdoCipherAccount(video.vdocipherAccountId);
            otp = await getVdoCipherOtp({
                apiSecret: account.apiSecret,
                vdoCipherVideoId: video.vdocipherVideoId,
                ttl: 300,
            });
        } catch (error) {
            console.error('VdoCipher playback initialization failed', {
                videoId,
                vdoCipherVideoId: video.vdocipherVideoId,
                vdocipherAccountId: video.vdocipherAccountId,
                providerStatus: getVdoCipherErrorStatus(error),
                message: getErrorMessage(error),
            });

            return <PlaybackUnavailable />;
        }

        providerPlayback = {
            provider: 'VDOCIPHER',
            otp: otp.otp,
            playbackInfo: otp.playbackInfo,
        };
    } else if (video.drmKeyId) {
        const { generateAxinomToken } = await import('@/lib/axinom');
        token = generateAxinomToken(video.drmKeyId);
    }

    return (
        <SecurityWrapper videoId={videoId}>
            <WatchPageClient
                videoId={videoId}
                otp={session.user.id}
                playbackInfo={{
                    url: `https://customer-254h245.cloudflare.com/video/${videoId}/manifest.mpd`,
                    drmLicenseUrl: process.env.NEXT_PUBLIC_DRM_LICENSE_URL || '',
                }}
                courseTitle={video.Course?.title || 'Course Content'}
                sidebarVideos={sidebarVideos}
                currentVideoId={videoId}
                viewCount={currentWatchRecord?.viewCount || 0}
                viewLimit={effectiveViewLimit}
                watermarkText={watermarkText}
                drmToken={token}
                dashUrl={video.dashUrl ?? null}
                hlsUrl={video.hlsUrl ?? null}
                hlsUrlClear={video.hlsUrlClear ?? null}
                isFairPlayConfigured={Boolean(process.env.AXINOM_FAIRPLAY_CERT_URL)}
                providerPlayback={providerPlayback}
                chatLog={video.chatLog}
            />
        </SecurityWrapper>
    );
}
