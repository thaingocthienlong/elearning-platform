'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import VideoSidebarWrapper from '@/components/course/VideoSidebarWrapper';
import { toast } from 'sonner';

import PlayerLoading from '@/components/video/PlayerLoading';
import { useLanguage } from '@/contexts/LanguageContext';

const DRMPlayerWrapper = dynamic(() => import('@/components/video/DRMPlayerWrapper'), {
    ssr: false,
    loading: () => <PlayerLoading />
});
import BrowserBanner from '@/components/BrowserBanner';
import IPRConsentOverlay from '@/components/course/IPRConsentOverlay';
import { useSessionValidator } from '@/hooks/useSessionValidator';
import ChatLogViewer from '@/components/course/ChatLogViewer';
import { Badge } from '@/components/ui/badge';
import { selectWatchPlaybackSources } from '@/lib/playback-routing';

interface WatchPageClientProps {
    videoId: string;
    otp: string;
    playbackInfo: {
        url: string;
        drmLicenseUrl: string;
    };
    courseTitle: string;
    sidebarVideos: any[];
    currentVideoId: string;
    viewCount: number;
    viewLimit: number | null;
    watermarkText: string;
    drmToken: string;
    dashUrl: string | null;
    hlsUrl: string | null;
    hlsUrlClear: string | null;
    isFairPlayConfigured: boolean;
    chatLog?: any;
}

export default function WatchPageClient({
    videoId,
    otp,
    playbackInfo,
    courseTitle,
    sidebarVideos,
    currentVideoId,
    viewCount,
    viewLimit,
    watermarkText,
    drmToken,
    dashUrl,
    hlsUrl,
    hlsUrlClear,
    isFairPlayConfigured,
    chatLog,
}: WatchPageClientProps & { chatLog?: any }) {
    const { t } = useLanguage();
    const [isIPRAccepted, setIsIPRAccepted] = useState(false);
    const playbackSources = useMemo(() =>
        selectWatchPlaybackSources({
            userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
            dashUrl,
            hlsUrl,
            hlsUrlClear,
            drmToken,
        }),
        [dashUrl, hlsUrl, hlsUrlClear, drmToken]
    );
    const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);

    // SSE-based session monitoring - instant logout if revoked by admin
    // Falls back to 5-min polling if SSE unavailable
    useSessionValidator();

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
            {/* Browser Recommendation Banner - Hidden during fullscreen */}
            {!isVideoFullscreen && (
                <div className="border-b border-primary/15 bg-primary/5 px-4 py-2 text-center text-sm">
                    <BrowserBanner />
                </div>
            )}

            <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
                {/* Player Area with Overlay - only overlay blocks this section */}
                <div className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
                    <div className="mx-auto flex max-w-5xl flex-col gap-4">
                        {!isVideoFullscreen && (
                            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-none sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="text-[14px] text-muted-foreground">{t('secureLecturePlayback')}</p>
                                    <h1 className="mt-1 truncate text-[21px] font-semibold leading-[1.19]">{courseTitle}</h1>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary" className="rounded-full">DRM</Badge>
                                    <Badge variant="outline" className="rounded-full border-primary/30 text-primary">{t('watermarked')}</Badge>
                                    {viewLimit !== null && (
                                        <Badge variant="outline" className="rounded-full">
                                            {viewCount}/{viewLimit} {t('views')}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* IPR Overlay or Player */}
                        {!isIPRAccepted ? (
                            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-xl">
                                <IPRConsentOverlay onAccept={() => {
                                    setIsIPRAccepted(true);
                                    // Warn iOS Safari users
                                    const ua = navigator.userAgent;
                                    const isIOS = /iPhone|iPad|iPod/.test(ua);
                                    const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);
                                    if (isIOS && isSafari) {
                                        toast.warning(t('iosSafariWarning'), {
                                            duration: 6000,
                                        });
                                    }
                                }} />
                            </div>
                        ) : (
                            <>
                                <DRMPlayerWrapper
                                    dashUrl={playbackSources.dashUrl}
                                    hlsUrl={playbackSources.hlsUrl}
                                    drmToken={playbackSources.drmToken}
                                    videoId={videoId}
                                    viewCount={viewCount}
                                    viewLimit={viewLimit}
                                    watermarkText={watermarkText}
                                    requireHD={false}
                                    isClearHlsFallback={playbackSources.isClearHlsFallback}
                                    isFairPlayConfigured={isFairPlayConfigured}
                                    onFullscreenChange={setIsVideoFullscreen}
                                />
                                {/* Chat Log Viewer */}
                                <div className="rounded-lg border border-border bg-card p-4 shadow-none">
                                    <ChatLogViewer chatLog={chatLog} />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Sidebar - Hidden during fullscreen */}
                {!isVideoFullscreen && (
                    <VideoSidebarWrapper
                        courseTitle={courseTitle}
                        videos={sidebarVideos}
                        currentVideoId={currentVideoId}
                    />
                )}
            </div>
        </div>
    );
}
