/**
 * Screen Recording Detection Utility
 * Attempts to detect screen recording on mobile devices
 * 
 * IMPORTANT LIMITATIONS:
 * - Cannot detect system-level screen recording reliably from web browsers
 * - Android blocks most detection methods for privacy
 * - This is a best-effort deterrent, not foolproof protection
 * 
 * REAL PROTECTION:
 * - Widevine L1 (hardware DRM) - requires native app or L1-capable browser
 * - Secure Video Path enforcement
 */

/**
 * Check if screen recording might be active
 * Uses heuristics - not 100% reliable
 */
export async function detectScreenRecording(): Promise<{
    isRecording: boolean;
    method: string;
    confidence: 'high' | 'medium' | 'low' | 'none';
}> {
    const results = {
        isRecording: false,
        method: 'none',
        confidence: 'none' as const,
    };

    // Method 1: Check for MediaRecorder API usage (very limited)
    // This only detects if OUR page is recording, not system-level
    try {
        if (typeof MediaRecorder !== 'undefined') {
            // Can't actually detect if screen recording is active
            // MediaRecorder state is not exposed globally
            console.log('📹 MediaRecorder API available (cannot detect system recording)');
        }
    } catch (e) {
        console.log('MediaRecorder check failed:', e);
    }

    // Method 2: Display capture detection (Chrome 94+)
    // Detects if getDisplayMedia was called
    try {
        // @ts-ignore - Experimental API
        if (navigator.mediaDevices?.getDisplayMedia) {
            console.log('🖥️ Display capture API available');
            // Note: Can't detect if it's actively being used without permission
        }
    } catch (e) {
        console.log('Display media check failed:', e);
    }

    // Method 3: Visibility API - detect when app might be in background due to recording
    if (document.hidden) {
        console.log('⚠️ Page is hidden - might indicate screen recording overlay');
        return {
            isRecording: true,
            method: 'visibility',
            confidence: 'low',
        };
    }

    // Method 4: Performance degradation (very unreliable)
    // Screen recording can cause FPS drops
    try {
        const frameTime = performance.now();
        // Would need to track over time - too unreliable for real use
    } catch (e) {
        // Ignore
    }

    return results;
}

/**
 * Monitor for screen recording during playback
 * Shows warning and optionally pauses video
 */
export function monitorScreenRecording(
    videoElement: HTMLVideoElement,
    onRecordingDetected: () => void,
    options = { pauseOnDetect: false }
): () => void {
    let isMonitoring = true;

    // Check visibility changes
    const handleVisibilityChange = () => {
        if (document.hidden && !videoElement.paused) {
            console.warn('⚠️ Video playing while page hidden - possible screen recording');
            if (options.pauseOnDetect) {
                videoElement.pause();
            }
            onRecordingDetected();
        }
    };

    // Check for suspicious browser extensions
    const checkForSuspiciousActivity = () => {
        if (!isMonitoring) return;

        // Performance check - screen recording often causes degradation
        const checkPerformance = () => {
            // This is a heuristic - not reliable
            if (performance.now() > 0) {
                // Would need baseline measurement
            }
        };

        setTimeout(checkPerformance, 1000);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    checkForSuspiciousActivity();

    // Cleanup function
    return () => {
        isMonitoring = false;
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
}

/**
 * Get recommended security level based on device
 */
export function getSecurityRecommendation(): {
    canPreventRecording: boolean;
    recommendation: string;
    hasL1: boolean;
} {
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
    const isAndroid = /Android/.test(ua);

    return {
        canPreventRecording: false, // From web browser, very limited
        hasL1: false, // Would need to check DRM capabilities
        recommendation: isMobile
            ? 'For maximum security, use native mobile app with L1 DRM'
            : 'Desktop browsers cannot prevent screen recording reliably',
    };
}

/**
 * WARNING MESSAGE for users on L3
 */
export const SCREEN_RECORDING_WARNING = `
⚠️ SECURITY NOTICE:
Your device is using software-based DRM (Widevine L3).
This CANNOT prevent screen recording.

For full protection:
- Use a device with hardware DRM support (Widevine L1)
- Use certified, unmodified device
- Keep bootloader locked
`;

/**
 * Check if FLAG_SECURE could be applied (Android only)
 * Note: This requires native app - not available in web browsers
 */
export function canApplyFlagSecure(): boolean {
    const isAndroid = /Android/.test(navigator.userAgent);
    // In web browser, we can't set FLAG_SECURE
    // Would need native WebView wrapper
    return false;
}
