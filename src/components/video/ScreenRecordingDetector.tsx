'use client';

import { useEffect, useRef } from 'react';

interface ScreenRecordingDetectorProps {
  videoId?: string;
  enabled?: boolean;
}

export function ScreenRecordingDetector({ videoId, enabled = true }: ScreenRecordingDetectorProps) {
  const hasReported = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const reportSecurityEvent = async (eventType: string, metadata?: any) => {
      try {
        await fetch('/api/security/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType,
            videoId,
            metadata,
          }),
        });
      } catch (error) {
        console.error('Failed to report security event:', error);
      }
    };

    // Detect visibility changes (user switched tabs while video is playing)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportSecurityEvent('TAB_SWITCH_WHILE_WATCHING', {
          timestamp: new Date().toISOString(),
        });
      }
    };

    // Detect screen capture attempts
    // Note: This is not foolproof but can detect some screen capture methods
    const detectScreenCapture = async () => {
      try {
        // @ts-ignore - getDisplayMedia is available in modern browsers
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;

          // @ts-ignore
          navigator.mediaDevices.getDisplayMedia = async function (...args) {
            if (!hasReported.current) {
              reportSecurityEvent('SCREEN_CAPTURE_DETECTED', {
                timestamp: new Date().toISOString(),
                method: 'getDisplayMedia',
              });
              hasReported.current = true;
            }
            // @ts-ignore
            return originalGetDisplayMedia.apply(this, args);
          };
        }
      } catch (error) {
        console.error('Screen capture detection error:', error);
      }
    };

    // Detect if DevTools is open (window size changes)
    let devtoolsCheckInterval: NodeJS.Timeout;
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;

      if (widthThreshold || heightThreshold) {
        reportSecurityEvent('DEVTOOLS_LIKELY_OPEN', {
          timestamp: new Date().toISOString(),
          outerWidth: window.outerWidth,
          innerWidth: window.innerWidth,
          outerHeight: window.outerHeight,
          innerHeight: window.innerHeight,
        });
      }
    };

    // Initialize detectors
    document.addEventListener('visibilitychange', handleVisibilityChange);
    detectScreenCapture();

    // Check for DevTools every 2 seconds
    devtoolsCheckInterval = setInterval(checkDevTools, 2000);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (devtoolsCheckInterval) {
        clearInterval(devtoolsCheckInterval);
      }
    };
  }, [videoId, enabled]);

  return null; // This component doesn't render anything
}
