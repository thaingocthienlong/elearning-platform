import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SecurityWrapper } from '@/components/video/SecurityWrapper';
import WatchPageClient from '@/components/course/WatchPageClient';
import { evaluateMediaEntitlement } from '@/lib/media-entitlement';

export const dynamic = 'force-dynamic';

export default async function WatchPage({ params }: { params: Promise<{ videoId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/api/auth/signin');
    }

    const { videoId } = await params;

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

    // Generate DRM token
    const { generateAxinomToken } = await import('@/lib/axinom');
    let token = '';
    if (video.drmKeyId) {
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
                watermarkText={whitelistEntry?.fullname && whitelistEntry?.phone
                    ? `${whitelistEntry.fullname} • ${whitelistEntry.phone}`
                    : user.name || user.email!}
                drmToken={token}
                dashUrl={video.dashUrl ?? null}
                hlsUrl={video.hlsUrl ?? null}
                hlsUrlClear={video.hlsUrlClear ?? null}
                isFairPlayConfigured={Boolean(process.env.AXINOM_FAIRPLAY_CERT_URL)}
                chatLog={(video as any).chatLog}
            />
        </SecurityWrapper>
    );
}
