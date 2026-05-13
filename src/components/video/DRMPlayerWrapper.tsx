'use client';

import { useEffect, useState } from 'react';
import Player from './Player';
import { detectDRMCapabilities, getOptimalDRMConfig, getBrowserInfo, DRMConfig } from '@/lib/drm-detection';
import { toast } from 'sonner';
import { resolveAxinomLicenseServerUrl } from '@/lib/shaka-axinom';

interface DRMPlayerWrapperProps {
    dashUrl: string | null;
    hlsUrl: string | null;
    drmToken: string;
    videoId: string;
    viewCount: number;
    viewLimit: number | null;
    watermarkText: string;
    requireHD?: boolean;
    isClearHlsFallback?: boolean;
    isFairPlayConfigured?: boolean;
    onFullscreenChange?: (isFullscreen: boolean) => void;
}

export default function DRMPlayerWrapper({
    dashUrl,
    hlsUrl,
    drmToken,
    videoId,
    viewCount,
    viewLimit,
    watermarkText,
    requireHD = false,
    isClearHlsFallback = false,
    isFairPlayConfigured = false,
    onFullscreenChange,
}: DRMPlayerWrapperProps) {
    const [drmConfig, setDrmConfig] = useState<DRMConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [robustnessOverride, setRobustnessOverride] = useState<string | null>(null);
    const [hasAttemptedL1, setHasAttemptedL1] = useState(false);

    useEffect(() => {
        const initDRM = async () => {
            try {
                // Check localStorage for cached robustness level for this device
                const cachedRobustness = typeof window !== 'undefined'
                    ? localStorage.getItem('drm_robustness_widevine')
                    : null;

                // Detect DRM capabilities
                const caps = await detectDRMCapabilities();

                // Get optimal configuration
                const config = getOptimalDRMConfig(
                    dashUrl,
                    hlsUrl,
                    requireHD,
                    isClearHlsFallback,
                    isFairPlayConfigured
                );

                if (!config) {
                    toast.error('No compatible DRM manifest available for your device');
                    setIsLoading(false);
                    return;
                }

                // Apply robustness override (from cache or fallback)
                if (robustnessOverride) {
                    config.robustness = robustnessOverride;
                } else if (cachedRobustness && !hasAttemptedL1) {
                    config.robustness = cachedRobustness;
                }

                // CRITICAL: If device doesn't support L1, force L3 immediately
                // Don't attempt L1 if capability detection says it won't work
                if (config.robustness === 'HW_SECURE_ALL' && config.drmType === 'widevine' && !caps.widevineL1) {
                    console.warn('⚠️ Device does not support Widevine L1 - forcing L3');
                    config.robustness = 'SW_SECURE_CRYPTO';
                    config.requiresL1 = false;
                }

                // Mark that we've attempted L1 if using HW_SECURE_ALL
                if (config.robustness === 'HW_SECURE_ALL' && !hasAttemptedL1) {
                    setHasAttemptedL1(true);
                }

                // Verify device supports the recommended DRM
                if (config.drmType === 'widevine' && !caps.widevine) {
                    toast.error('Your device does not support Widevine DRM');
                    setIsLoading(false);
                    return;
                }

                if (config.drmType === 'playready' && !caps.playready) {
                    toast.error('Your device does not support PlayReady DRM');
                    setIsLoading(false);
                    return;
                }

                // Skip FairPlay verification if using clear HLS (no cert available)
                if (config.drmType === 'fairplay' && config.requiresL1 && !caps.fairplay) {
                    toast.error('Your device does not support FairPlay DRM');
                    setIsLoading(false);
                    return;
                }

                const browserInfo = getBrowserInfo();
                setDrmConfig(config);

                // Log DRM session for security monitoring
                try {
                    await fetch('/api/drm/log-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            videoId,
                            drmType: config.drmType,
                            protocol: config.protocol,
                            robustness: config.robustness,
                            isHardwareDRM: config.robustness === 'HW_SECURE_ALL',
                            browser: browserInfo.browser,
                            os: browserInfo.os,
                            isMobile: browserInfo.isMobile,
                        }),
                    });
                } catch (error) {
                    console.error('Failed to log DRM session:', error);
                    // Don't block playback if logging fails
                }
            } catch (error) {
                console.error('DRM initialization error:', error);
                toast.error('Failed to initialize DRM protection');
            } finally {
                setIsLoading(false);
            }
        };

        initDRM();
    }, [
        dashUrl,
        hlsUrl,
        requireHD,
        isClearHlsFallback,
        isFairPlayConfigured,
        robustnessOverride,
        videoId,
        hasAttemptedL1,
    ]);

    // Callback for when black screen is detected
    const handleBlackScreenDetected = () => {
        console.warn('⚠️ Black screen detected with L1 - falling back to L3');
        toast.info('Switching to software DRM for compatibility...');

        // Cache the working robustness level
        if (typeof window !== 'undefined') {
            localStorage.setItem('drm_robustness_widevine', 'SW_SECURE_CRYPTO');
        }

        // Trigger re-initialization with L3
        setRobustnessOverride('SW_SECURE_CRYPTO');
        setIsLoading(true);
    };

    if (isLoading) {
        return (
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-xl flex items-center justify-center">
                <div className="text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p>Initializing secure playback...</p>
                </div>
            </div>
        );
    }

    if (!drmConfig) {
        return (
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-xl flex items-center justify-center">
                <div className="text-white text-center p-8">
                    <p className="text-xl mb-2">Unable to play video</p>
                    <p className="text-sm text-gray-400">
                        Your device does not support the required DRM protection for this content.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <Player
            manifestUrl={drmConfig.manifestUrl}
            licenseServerUrl={resolveAxinomLicenseServerUrl(drmConfig.drmType)}
            drmToken={drmToken}
            videoId={videoId}
            viewCount={viewCount}
            viewLimit={viewLimit}
            watermarkText={watermarkText}
            drmType={drmConfig.drmType}
            robustness={drmConfig.robustness}
            fairplayCertUrl={drmConfig.drmType === 'fairplay' && !drmConfig.isClearPlayback ? '/api/drm/fairplay-cert' : undefined}
            onBlackScreenDetected={drmConfig.robustness === 'HW_SECURE_ALL' ? handleBlackScreenDetected : undefined}
            onFullscreenChange={onFullscreenChange}
        />
    );
}
