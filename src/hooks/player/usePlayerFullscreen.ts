import { useEffect, useState } from 'react';

// Use type assertion for experimental Wake Lock API
interface NavigatorWithWakeLock extends Navigator {
    wakeLock: any;
}

interface WakeLockSentinel extends EventTarget {
    release: () => Promise<void>;
    readonly released: boolean;
    readonly type: string;
}

interface UsePlayerFullscreenProps {
    containerRef: React.RefObject<HTMLDivElement>;
    onFullscreenChange?: (isFullscreen: boolean) => void;
}

export function usePlayerFullscreen({ containerRef, onFullscreenChange }: UsePlayerFullscreenProps) {
    const [isIOS, setIsIOS] = useState(false);
    const [isFakeFullscreen, setIsFakeFullscreen] = useState(false);

    // Detect iOS
    useEffect(() => {
        const checkIOS = () => {
            const userAgent = navigator.userAgent || navigator.vendor;
            // Simple iOS detection
            const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as unknown as { MSStream: unknown }).MSStream;
            setIsIOS(isIOSDevice);
        };
        checkIOS();
    }, []);

    const toggleFakeFullscreen = () => {
        const newFullscreenState = !isFakeFullscreen;
        setIsFakeFullscreen(newFullscreenState);
        onFullscreenChange?.(newFullscreenState);

        // Toggle body class for global styles (hiding navbar)
        if (!isFakeFullscreen) { // Entering fullscreen
            document.body.classList.add('video-fullscreen-mode');
        } else { // Exiting fullscreen
            document.body.classList.remove('video-fullscreen-mode');
        }
    };

    // Cleanup body class on unmount
    useEffect(() => {
        return () => {
            document.body.classList.remove('video-fullscreen-mode');
        };
    }, []);

    // Handle Wake Lock and Scrolling when in fullscreen
    useEffect(() => {
        let wakeLock: WakeLockSentinel | null = null;

        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await (navigator as unknown as NavigatorWithWakeLock).wakeLock.request('screen');
                }
            } catch (err) {
                console.error('Wake Lock error:', err);
            }
        };

        if (isFakeFullscreen && containerRef.current) {
            // Scroll player into view when entering fullscreen
            setTimeout(() => {
                containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);

            // Request Wake Lock
            requestWakeLock();
        }

        return () => {
            if (wakeLock) {
                wakeLock.release();
            }
        };
    }, [isFakeFullscreen, containerRef]);

    return {
        isIOS,
        isFakeFullscreen,
        toggleFakeFullscreen
    };
}
