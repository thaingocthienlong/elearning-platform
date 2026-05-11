import { useEffect } from 'react';

interface UseBlackScreenDetectorProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    onBlackScreenDetected?: () => void;
    robustness?: string;
}

export function useBlackScreenDetector({
    videoRef,
    onBlackScreenDetected,
    robustness
}: UseBlackScreenDetectorProps) {
    useEffect(() => {
        if (!onBlackScreenDetected || !videoRef.current || !robustness || robustness !== 'HW_SECURE_ALL') return;

        const video = videoRef.current;
        let blackScreenTimer: NodeJS.Timeout | null = null;
        let hasDetectedPlayback = false;
        let hasTriggeredFallback = false;

        const triggerFallback = () => {
            if (!hasTriggeredFallback) {
                console.warn('⚠️ Black screen detected - triggering fallback');
                hasTriggeredFallback = true;
                onBlackScreenDetected();
            }
        };

        const checkForBlackScreen = () => {
            // Check if video is attempting to play but no frames are rendering
            if (video.currentTime > 0 && video.videoWidth === 0 && video.videoHeight === 0) {
                console.warn('⚠️ Black screen detected: Video is playing but no frames rendered');
                triggerFallback();
            } else if (video.videoWidth > 0) {
                // Frames are rendering successfully
                hasDetectedPlayback = true;
                if (blackScreenTimer) {
                    clearTimeout(blackScreenTimer);
                    blackScreenTimer = null;
                }
            }
        };

        const handleError = () => {
            console.warn('⚠️ Video error detected - may be DRM issue');
            triggerFallback();
        };

        const handleLoadedMetadata = () => {
            // Set 2-second timeout to detect black screen (reduced from 5s for faster fallback)
            blackScreenTimer = setTimeout(() => {
                if (!hasDetectedPlayback) {
                    console.warn('⚠️ Black screen detected: 2 seconds elapsed with no video frames');
                    triggerFallback();
                }
            }, 2000);
        };

        const handlePlaying = () => {
            // Additional check when video starts playing
            setTimeout(() => {
                if (!hasDetectedPlayback && video.videoWidth === 0) {
                    console.warn('⚠️ Black screen detected: Playing but no frames');
                    triggerFallback();
                }
            }, 1000);
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('timeupdate', checkForBlackScreen);
        video.addEventListener('error', handleError);
        video.addEventListener('playing', handlePlaying);

        return () => {
            if (blackScreenTimer) {
                clearTimeout(blackScreenTimer);
            }
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('timeupdate', checkForBlackScreen);
            video.removeEventListener('error', handleError);
            video.removeEventListener('playing', handlePlaying);
        };
    }, [onBlackScreenDetected, robustness, videoRef]);
}
