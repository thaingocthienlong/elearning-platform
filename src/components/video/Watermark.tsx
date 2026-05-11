'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface WatermarkProps {
    text: string;
    containerId: string;
    aggressiveMode?: boolean; // Optional: enable for high-security scenarios
    forceFullscreenMode?: boolean; // Optional: force fullscreen styling (e.g. for iOS fake fullscreen)
    isIOS?: boolean; // Optional: detect iOS device
}

// Safe area aware positions
const positions = [
    { top: 'max(5%, env(safe-area-inset-top) + 20px)', left: 'max(5%, env(safe-area-inset-left) + 20px)' },
    { top: 'max(5%, env(safe-area-inset-top) + 20px)', right: 'max(5%, env(safe-area-inset-right) + 20px)' },
    { bottom: 'max(5%, env(safe-area-inset-bottom) + 40px)', left: 'max(5%, env(safe-area-inset-left) + 20px)' }, // +40px bottom for home indicator
    { bottom: 'max(5%, env(safe-area-inset-bottom) + 40px)', right: 'max(5%, env(safe-area-inset-right) + 20px)' },
    { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
];

export default function Watermark({ text, containerId, aggressiveMode = false, forceFullscreenMode = false, isIOS = false }: WatermarkProps) {
    const [positionIndex, setPositionIndex] = useState(0);
    const [renderKey, setRenderKey] = useState(0);
    const [fontSize, setFontSize] = useState(14);
    const [opacity, setOpacity] = useState(0.5);
    const [sizeMultiplier, setSizeMultiplier] = useState(1.0);
    const [mobileSizeMultiplier, setMobileSizeMultiplier] = useState(0.7);
    const [fullscreenSizeMultiplier, setFullscreenSizeMultiplier] = useState(1.3);
    const [iosFullscreenSizeMultiplier, setIosFullscreenSizeMultiplier] = useState(0.8); // Smaller for iOS fake fullscreen
    const [isMobile, setIsMobile] = useState(false);
    const [isIPad, setIsIPad] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const watermarkRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<MutationObserver | null>(null);
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const rotateIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const reRenderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Calculate video display area (letterboxing/pillarboxing)
    const [videoRect, setVideoRect] = useState<{ width: number; height: number; left: number; top: number } | null>(null);

    // Debounced re-render to prevent excessive updates
    const debouncedReRender = useCallback(() => {
        if (reRenderTimeoutRef.current) {
            clearTimeout(reRenderTimeoutRef.current);
        }
        reRenderTimeoutRef.current = setTimeout(() => {
            setRenderKey((prev) => prev + 1);
        }, 100); // Wait 100ms before re-rendering
    }, []);

    // Fetch watermark settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('/api/watermark/settings');
                if (response.ok) {
                    const data = await response.json();
                    setOpacity(data.opacity ?? 0.5);
                    setSizeMultiplier(data.sizeMultiplier ?? 1.0);
                    setMobileSizeMultiplier(data.mobileSizeMultiplier ?? 0.7);
                    setFullscreenSizeMultiplier(data.fullscreenSizeMultiplier ?? 1.3);
                    setIosFullscreenSizeMultiplier(data.iosFullscreenSizeMultiplier ?? 0.8);
                }
            } catch (error) {
                console.error('Error fetching watermark settings:', error);
                // Use defaults if fetch fails
            }
        };

        // Detect if device is mobile
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor;
            const isMobileDevice = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
            // iPad detection (iPadOS 13+ often pretends to be Mac)
            const isIPadDevice =
                /ipad/i.test(userAgent.toLowerCase()) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

            const isSmallScreen = window.innerWidth < 768; // Tailwind's md breakpoint

            setIsIPad(isIPadDevice);
            setIsMobile(isMobileDevice || (isIPadDevice && isSmallScreen) || isSmallScreen);
        };

        // Detect fullscreen mode
        const checkFullscreen = () => {
            const isInFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
            setIsFullscreen(isInFullscreen);
        };

        fetchSettings();
        checkMobile();
        checkFullscreen();

        // Re-check on resize
        window.addEventListener('resize', checkMobile);

        // Re-check on fullscreen change
        document.addEventListener('fullscreenchange', checkFullscreen);
        document.addEventListener('webkitfullscreenchange', checkFullscreen); // Safari/older WebKit

        return () => {
            window.removeEventListener('resize', checkMobile);
            document.removeEventListener('fullscreenchange', checkFullscreen);
            document.removeEventListener('webkitfullscreenchange', checkFullscreen);
        };
    }, []);

    // Rotate position every 15 seconds & Screen Layout
    useEffect(() => {
        rotateIntervalRef.current = setInterval(() => {
            setPositionIndex((prev) => (prev + 1) % positions.length);
        }, 15000);

        // Dynamically adjust font size based on container width
        // Also calculate video rect for positioning
        const updateLayout = () => {
            const container = document.getElementById(containerId);
            if (!container) return;

            const video = container.querySelector('video');
            if (!video) return;

            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;

            // Calculate video display area
            let vRect = { width: containerWidth, height: containerHeight, left: 0, top: 0 };

            if (video.videoWidth && video.videoHeight) {
                const videoRatio = video.videoWidth / video.videoHeight;
                const containerRatio = containerWidth / containerHeight;

                let renderWidth = containerWidth;
                let renderHeight = containerHeight;

                if (containerRatio > videoRatio) {
                    // Pillarbox (black bars on sides)
                    renderWidth = containerHeight * videoRatio;
                    vRect.left = (containerWidth - renderWidth) / 2;
                    vRect.width = renderWidth;
                } else {
                    // Letterbox (black bars top/bottom)
                    renderHeight = containerWidth / videoRatio;
                    vRect.top = (containerHeight - renderHeight) / 2;
                    vRect.height = renderHeight;
                }
            }

            setVideoRect(vRect);

            // Font size calculation based on VIDEO width (not container)
            const width = vRect.width;

            // Scale font size: 18px at 320px width, up to 40px at 3840px (4K)
            const minWidth = 320;
            const maxWidth = 3840;
            const minFont = 18;
            const maxFont = 40;

            const calculatedSize = minFont + ((width - minWidth) * (maxFont - minFont)) / (maxWidth - minWidth);
            const clampedSize = Math.max(minFont, Math.min(maxFont, calculatedSize));

            // Add +2px boost for HD and above (1920px+)
            const finalSize = width >= 1920 ? clampedSize + 2 : clampedSize;

            // Apply size multiplier from settings (priority: fullscreen > mobile > desktop)
            let activeSizeMultiplier = sizeMultiplier; // Default: desktop
            if (isMobile && !isIPad) activeSizeMultiplier = mobileSizeMultiplier;

            // iPad specific sizing (use desktop or slightly smaller, but bigger than phone)
            if (isIPad) activeSizeMultiplier = Math.max(mobileSizeMultiplier, 0.9); // Ensure at least 0.9x on iPad

            if (isFullscreen || forceFullscreenMode) {
                // For iPad, we might want full size in fullscreen
                if (isIPad) {
                    activeSizeMultiplier = fullscreenSizeMultiplier;
                } else {
                    activeSizeMultiplier = (isIOS && forceFullscreenMode) ? iosFullscreenSizeMultiplier : fullscreenSizeMultiplier;
                }
            }

            const adjustedSize = finalSize * activeSizeMultiplier;
            setFontSize(Math.round(adjustedSize));
        };

        const container = document.getElementById(containerId);
        if (container) {
            const resizeObserver = new ResizeObserver(updateLayout);
            resizeObserver.observe(container);
            updateLayout();

            // Listen for video events if possible (need to find video element again or assume it's stable)
            const video = container.querySelector('video');
            if (video) {
                video.addEventListener('loadedmetadata', updateLayout);
                video.addEventListener('resize', updateLayout);
            }

            return () => {
                resizeObserver.disconnect();
                if (rotateIntervalRef.current) {
                    clearInterval(rotateIntervalRef.current);
                }
                if (video) {
                    video.removeEventListener('loadedmetadata', updateLayout);
                    video.removeEventListener('resize', updateLayout);
                }
            };
        }

        return () => {
            if (rotateIntervalRef.current) {
                clearInterval(rotateIntervalRef.current);
            }
        };

    }, [containerId, sizeMultiplier, mobileSizeMultiplier, fullscreenSizeMultiplier, iosFullscreenSizeMultiplier, isMobile, isIPad, isFullscreen, forceFullscreenMode, isIOS]);

    // Protection with reasonable performance
    useEffect(() => {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Check interval: 200ms for normal, 50ms for aggressive mode
        const checkInterval = aggressiveMode ? 50 : 200;

        const checkWatermark = () => {
            if (!container) return;
            if (!watermarkRef.current || !container.contains(watermarkRef.current)) {
                // Watermark removed from DOM
                debouncedReRender();
                return;
            }

            // Check if watermark is hidden or text modified
            const element = watermarkRef.current;
            const style = window.getComputedStyle(element);

            if (
                style.display === 'none' ||
                style.visibility === 'hidden' ||
                parseFloat(style.opacity) < 0.3 ||
                element.textContent !== text
            ) {
                debouncedReRender();
            }
        };

        // Periodic check
        checkIntervalRef.current = setInterval(checkWatermark, checkInterval);

        // Single MutationObserver for efficiency
        observerRef.current = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                // Check for removal
                if (mutation.type === 'childList') {
                    for (const node of Array.from(mutation.removedNodes)) {
                        if (node === watermarkRef.current) {
                            debouncedReRender();
                            return;
                        }
                    }
                }

                // Check for text or attribute changes on watermark
                if (mutation.target === watermarkRef.current) {
                    if (
                        mutation.type === 'characterData' ||
                        mutation.type === 'childList' ||
                        mutation.type === 'attributes'
                    ) {
                        debouncedReRender();
                        return;
                    }
                }
            }
        });

        // Observe container and watermark
        observerRef.current.observe(container, {
            childList: true,
            subtree: true,
        });

        if (watermarkRef.current) {
            observerRef.current.observe(watermarkRef.current, {
                characterData: true,
                childList: true,
                attributes: true,
                subtree: true,
            });
        }

        return () => {
            // Cleanup: prevent memory leaks
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
                checkIntervalRef.current = null;
            }
            if (reRenderTimeoutRef.current) {
                clearTimeout(reRenderTimeoutRef.current);
                reRenderTimeoutRef.current = null;
            }
        };
    }, [containerId, text, aggressiveMode, debouncedReRender]);

    const currentPosition = positions[positionIndex];

    // Apply video rect offsets
    const positionStyle: React.CSSProperties = { ...currentPosition };
    if (videoRect) {
        if (positionStyle.left && typeof positionStyle.left === 'string' && positionStyle.left.includes('%')) {
            // If left is %, add videoRect.left
            positionStyle.left = `calc(${positionStyle.left} + ${videoRect.left}px)`;
        }
        if (positionStyle.right && typeof positionStyle.right === 'string' && positionStyle.right.includes('%')) {
            positionStyle.right = `calc(${positionStyle.right} + ${videoRect.left}px)`;
        }
        if (positionStyle.top && typeof positionStyle.top === 'string' && positionStyle.top.includes('%')) {
            positionStyle.top = `calc(${positionStyle.top} + ${videoRect.top}px)`;
        }
        if (positionStyle.bottom && typeof positionStyle.bottom === 'string' && positionStyle.bottom.includes('%')) {
            positionStyle.bottom = `calc(${positionStyle.bottom} + ${videoRect.top}px)`;
        }
    }

    return (
        <div
            ref={watermarkRef}
            key={renderKey}
            style={{
                position: 'absolute',
                ...positionStyle,
                zIndex: 40, // High enough to be over video, low enough to be under Dialog (z-50)
                // Fix: Merge existing transform with translateZ(0) to preserve centering
                transform: `${(currentPosition as React.CSSProperties).transform || ''} translateZ(0)`.trim(),
                pointerEvents: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                color: 'white',
                fontSize: `${fontSize}px`,
                fontWeight: '600',
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                opacity: opacity,
                transition: 'all 1s ease-in-out',
                padding: '8px 12px',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                // Additional protection
                WebkitTouchCallout: 'none',
                contentVisibility: 'auto',
            }}
        >
            {text}
        </div>
    );
}
