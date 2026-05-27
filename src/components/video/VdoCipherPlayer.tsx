'use client';

import { useEffect, useRef } from 'react';
import Watermark from '@/components/video/Watermark';

type VdoCipherPlayerProps = {
    otp: string;
    playbackInfo: string;
    title: string;
    videoId: string;
    watermarkText: string;
};

export default function VdoCipherPlayer({ otp, playbackInfo, title, videoId, watermarkText }: VdoCipherPlayerProps) {
    const params = new URLSearchParams({ otp, playbackInfo });
    const containerId = `vdocipher-player-${videoId}`;
    const countedViewRef = useRef(false);

    useEffect(() => {
        countedViewRef.current = false;

        const sendHeartbeat = async (isNewView: boolean) => {
            try {
                const response = await fetch('/api/watch/heartbeat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        videoId,
                        position: 0,
                        isNewView,
                        isFinished: false,
                    }),
                });

                if (response.ok && isNewView) {
                    countedViewRef.current = true;
                }
            } catch (error) {
                console.error('VdoCipher heartbeat error:', error);
            }
        };

        void sendHeartbeat(true);

        const interval = window.setInterval(() => {
            void sendHeartbeat(!countedViewRef.current);
        }, 60000);

        return () => {
            window.clearInterval(interval);
        };
    }, [videoId]);

    return (
        <div id={containerId} className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-xl">
            <iframe
                title={title}
                src={`https://player.vdocipher.com/v2/?${params.toString()}`}
                className="relative z-0 h-full w-full border-0"
                allow="encrypted-media"
            />
            <Watermark text={watermarkText} containerId={containerId} aggressiveMode />
        </div>
    );
}
