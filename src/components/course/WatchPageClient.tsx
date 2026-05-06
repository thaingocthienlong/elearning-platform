'use client';

import { useState } from 'react';
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
    chatLog,
}: WatchPageClientProps & { chatLog?: any }) {
    const { t } = useLanguage();
    const [isIPRAccepted, setIsIPRAccepted] = useState(false);
    const [isIOSorSafari] = useState(() => {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent;
        const isIOS = /iPhone|iPad|iPod/.test(ua);
        const isMac = /Mac OS/.test(ua) && !/iPhone|iPad|iPod/.test(ua);
        const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);

        return isIOS || (isMac && isSafari);
    });
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
                            <div className="academic-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="academic-kicker">Secure Lecture Playback</p>
                                    <h1 className="mt-1 truncate text-xl font-semibold">{courseTitle}</h1>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary" className="rounded-md">DRM</Badge>
                                    <Badge variant="outline" className="rounded-md border-primary/30 text-primary">Watermarked</Badge>
                                    {viewLimit !== null && (
                                        <Badge variant="outline" className="rounded-md">
                                            {viewCount}/{viewLimit} views
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
                                    dashUrl={isIOSorSafari ? null : dashUrl}
                                    hlsUrl={isIOSorSafari && hlsUrlClear ? hlsUrlClear : hlsUrl}
                                    drmToken={isIOSorSafari && hlsUrlClear ? '' : drmToken}
                                    videoId={videoId}
                                    viewCount={viewCount}
                                    viewLimit={viewLimit}
                                    watermarkText={watermarkText}
                                    requireHD={false}
                                    onFullscreenChange={setIsVideoFullscreen}
                                />
                                {/* Chat Log Viewer */}
                                <div className="academic-panel p-4">
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
