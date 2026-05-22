import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    applyAxinomMessageHeader,
    createAxinomDrmConfiguration,
} from '@/lib/shaka-axinom';

interface UseShakaPlayerProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    containerRef: React.RefObject<HTMLDivElement>;
    manifestUrl: string;
    licenseServerUrl?: string;
    drmToken?: string;
    videoId?: string;
    drmType?: 'widevine' | 'playready' | 'fairplay';
    robustness?: string;
    fairplayCertUrl?: string;
}

export function useShakaPlayer({
    videoRef,
    containerRef,
    manifestUrl,
    licenseServerUrl,
    drmToken,
    videoId,
    drmType,
    robustness,
    fairplayCertUrl
}: UseShakaPlayerProps) {
    // We use any here because Shaka types might not be fully available globally or installed in types
    // But ideally we use shaka.Player
    const [player, setPlayer] = useState<shaka.Player | null>(null);

    useEffect(() => {
        let activePlayer: shaka.Player | null = null;

        const initPlayer = async () => {
            if (!videoRef.current || !containerRef.current) return;

            // Dynamic import for Shaka Player to ensure it runs only on client
            const shakaModule = await import('shaka-player/dist/shaka-player.ui.js');
            const shaka = shakaModule.default || shakaModule;

            if (!shaka) return;

            const newPlayer = new shaka.Player();
            activePlayer = newPlayer;
            await newPlayer.attach(videoRef.current);

            // Configure Multi-DRM with L1 support
            // Skip DRM config for clear HLS (FairPlay without certificate)
            const isClearPlayback = drmType === 'fairplay' && !fairplayCertUrl;

            if (isClearPlayback) {
                newPlayer.configure({
                    streaming: {
                        preferNativeHls: true,
                    },
                });
            }

            if (licenseServerUrl && drmType && !isClearPlayback) {
                let fairplayServerCertificate: Uint8Array | undefined;

                if (drmType === 'fairplay' && fairplayCertUrl) {
                    try {
                        const certResponse = await fetch(fairplayCertUrl);
                        const certArrayBuffer = await certResponse.arrayBuffer();
                        fairplayServerCertificate = new Uint8Array(certArrayBuffer);
                    } catch (error) {
                        console.error('Failed to fetch FairPlay certificate:', error);
                        toast.error('Failed to load DRM certificate');
                        return;
                    }
                }

                const drmConfig = createAxinomDrmConfiguration({
                    drmType,
                    licenseServerUrl,
                    robustness,
                    fairplayServerCertificate,
                });

                newPlayer.configure(drmConfig);
            }

            // Add DRM token to license requests
            if (drmToken && !isClearPlayback) {
                newPlayer.getNetworkingEngine()?.registerRequestFilter(async (type: number, request: { headers: Record<string, string> }) => {
                    let message = drmToken;

                    if (type === shaka.net.NetworkingEngine.RequestType.LICENSE && videoId) {
                        try {
                            const response = await fetch('/api/drm/token', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ videoId }),
                            });

                            if (response.ok) {
                                const data = await response.json();
                                if (typeof data.token === 'string' && data.token) {
                                    message = data.token;
                                }
                            } else {
                                console.warn('Failed to refresh DRM token:', response.status);
                            }
                        } catch (error) {
                            console.warn('Failed to refresh DRM token:', error);
                        }
                    }

                    applyAxinomMessageHeader({
                        requestType: type,
                        licenseRequestType: shaka.net.NetworkingEngine.RequestType.LICENSE,
                        request,
                        message,
                    });
                });
            }

            try {
                await newPlayer.load(manifestUrl);

                // Create UI overlay
                const ui = new shaka.ui.Overlay(newPlayer, containerRef.current, videoRef.current);

                const config = {
                    controlPanelElements: [
                        'play_pause',
                        'time_and_duration',
                        'spacer',
                        'mute',
                        'volume',
                        'fullscreen',
                        'overflow_menu',
                    ],
                    overflowMenuButtons: [
                        'captions',
                        'quality',
                        'playback_rate',
                    ],
                    addSeekBar: true,
                    addBigPlayButton: true,
                    castReceiverAppId: '',
                    clearBufferOnQualityChange: false,
                    fadeDelay: 3,
                };
                ui.configure(config);
            } catch (e: unknown) {
                const error = e as { code: number; data: unknown[] };
                console.error('Shaka player error:', error.code, error.data);

                // Handle Error 6012: REQUESTED_KEY_SYSTEM_CONFIG_UNAVAILABLE (Robustness Fallback)
                if (error.code === 6012 && robustness) {
                    console.warn('DRM robustness check failed; retrying without robustness requirement.');

                    if (newPlayer) {
                        newPlayer.configure({
                            drm: {
                                advanced: {
                                    'com.widevine.alpha': {
                                        videoRobustness: undefined,
                                        audioRobustness: undefined
                                    }
                                }
                            }
                        });

                        try {
                            await newPlayer.load(manifestUrl);
                        } catch (retryError) {
                            console.error('Shaka retry without robustness failed:', retryError);
                        }
                    }
                }
            }

            setPlayer(newPlayer);
        };

        initPlayer();

        return () => {
            if (activePlayer) {
                void activePlayer.destroy();
            }
        };
    }, [manifestUrl, licenseServerUrl, drmToken, videoId, drmType, robustness, fairplayCertUrl, videoRef, containerRef]);

    return { player };
}
