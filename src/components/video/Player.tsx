'use client';

import { useRef } from 'react';
import 'shaka-player/dist/controls.css';
import Watermark from './Watermark';
import { Maximize, Minimize } from 'lucide-react';
import { useShakaPlayer } from '@/hooks/player/useShakaPlayer';
import { usePlayerHeartbeat } from '@/hooks/player/usePlayerHeartbeat';
import { useBlackScreenDetector } from '@/hooks/player/useBlackScreenDetector';
import { usePlayerFullscreen } from '@/hooks/player/usePlayerFullscreen';

interface PlayerProps {
    manifestUrl: string;
    licenseServerUrl?: string;
    drmToken?: string;
    videoId?: string;
    viewCount?: number;
    viewLimit?: number | null;
    watermarkText?: string;
    drmType?: 'widevine' | 'playready' | 'fairplay';
    robustness?: string;
    fairplayCertUrl?: string;
    onBlackScreenDetected?: () => void;
    onFullscreenChange?: (isFullscreen: boolean) => void;
}

export default function Player({
    manifestUrl,
    licenseServerUrl,
    drmToken,
    videoId,
    viewCount = 0,
    viewLimit = null,
    watermarkText,
    drmType,
    robustness,
    fairplayCertUrl,
    onBlackScreenDetected,
    onFullscreenChange
}: PlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 1. Initialize Shaka Player
    useShakaPlayer({
        videoRef,
        containerRef,
        manifestUrl,
        licenseServerUrl,
        drmToken,
        videoId,
        drmType,
        robustness,
        fairplayCertUrl
    });

    // 2. Handle Heartbeat
    usePlayerHeartbeat({
        videoId,
        videoRef
    });

    // 3. Handle Black Screen Detection (DRM fallback)
    useBlackScreenDetector({
        videoRef,
        onBlackScreenDetected,
        robustness
    });

    // 4. Handle Fullscreen & iOS specific UI
    const { isIOS, isFakeFullscreen, toggleFakeFullscreen } = usePlayerFullscreen({
        containerRef,
        onFullscreenChange
    });

    // Generate unique container ID for watermark
    const containerId = `video-container-${videoId || 'default'}`;

    return (
        <div
            id={containerId}
            data-tour-id="video-player"
            ref={containerRef}
            className={`relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-xl touch-manipulation ${isFakeFullscreen ? 'fixed inset-0 z-[99999] w-full h-[100dvh] aspect-auto rounded-none' : ''
                }`}
        >
            {isIOS && (
                <style>{`
                    #${containerId} .shaka-fullscreen-button { display: none !important; }
                    ${isFakeFullscreen ? `
                        #${containerId} .shaka-bottom-controls {
                            padding-bottom: env(safe-area-inset-bottom) !important;
                            margin-bottom: 5px !important;
                        }
                        #${containerId} .shaka-controls-container {
                            padding-left: env(safe-area-inset-left) !important;
                            padding-right: env(safe-area-inset-right) !important;
                        }
                    ` : ''}
                    /* Fix invisible controls on iPad normal mode */
                    #${containerId} .shaka-controls-container {
                        opacity: 1 !important;
                        transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    }
                    #${containerId} .shaka-controls-container[shown="true"] {
                        opacity: 1 !important;
                    }
                    #${containerId}:active .shaka-controls-container,
                    #${containerId}:focus-within .shaka-controls-container {
                        opacity: 1 !important;
                    }
                `}</style>
            )}
            <video
                ref={videoRef}
                className="w-full h-full"
                autoPlay
                playsInline
                controls={false}
                preload="metadata"
            />
            {watermarkText && (
                <Watermark
                    text={watermarkText}
                    containerId={containerId}
                    forceFullscreenMode={isFakeFullscreen}
                    isIOS={isIOS}
                />
            )}

            {/* Custom Fullscreen Button for iOS */}
            {isIOS && (
                <button
                    onClick={toggleFakeFullscreen}
                    className="absolute top-4 right-4 z-[100] p-2 text-white bg-black/50 hover:bg-black/70 rounded-md transition-colors backdrop-blur-sm active:scale-95"
                    style={{ marginTop: 'env(safe-area-inset-top)', marginRight: 'env(safe-area-inset-right)' }}
                    aria-label={isFakeFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                    {isFakeFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                </button>
            )}
        </div>
    );
}
