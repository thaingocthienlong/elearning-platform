'use client';

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
