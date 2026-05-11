import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface UsePlayerHeartbeatProps {
    videoId?: string;
    videoRef: React.RefObject<HTMLVideoElement>;
}

export function usePlayerHeartbeat({ videoId, videoRef }: UsePlayerHeartbeatProps) {
    const [isNewView, setIsNewView] = useState(true);
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!videoId || !videoRef.current) return;

        const sendHeartbeat = async () => {
            if (!videoRef.current) return;

            const currentPosition = Math.floor(videoRef.current.currentTime);
            const isFinished = videoRef.current.ended;

            try {
                const response = await fetch('/api/watch/heartbeat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        videoId,
                        position: currentPosition,
                        isNewView,
                        isFinished,
                    }),
                });

                if (response.ok) {
                    // Mark as not new view after first successful heartbeat
                    if (isNewView) {
                        setIsNewView(false);
                    }
                } else if (response.status === 403) {
                    // View limit exceeded
                    const data = await response.json();
                    toast.error(`View limit exceeded! You have watched this video ${data.viewCount}/${data.viewLimit} times.`);
                    if (videoRef.current) {
                        videoRef.current.pause();
                    }
                }
            } catch (error) {
                console.error('Heartbeat error:', error);
            }
        };

        // Send first heartbeat when playback starts
        const handlePlay = () => {
            sendHeartbeat();

            // Set up interval for subsequent heartbeats (every 60 seconds)
            if (!heartbeatIntervalRef.current) {
                heartbeatIntervalRef.current = setInterval(sendHeartbeat, 60000);
            }
        };

        // Clear interval when paused
        const handlePause = () => {
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
                heartbeatIntervalRef.current = null;
            }
            // Send final heartbeat on pause to save position
            sendHeartbeat();
        };

        const video = videoRef.current;
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('ended', handlePause);

        return () => {
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
            }
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('ended', handlePause);
        };
    }, [videoId, isNewView, videoRef]);

    return { isNewView };
}
