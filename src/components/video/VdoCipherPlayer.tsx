'use client';

type VdoCipherPlayerProps = {
    otp: string;
    playbackInfo: string;
    title: string;
};

export default function VdoCipherPlayer({ otp, playbackInfo, title }: VdoCipherPlayerProps) {
    const params = new URLSearchParams({ otp, playbackInfo });

    return (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-xl">
            <iframe
                title={title}
                src={`https://player.vdocipher.com/v2/?${params.toString()}`}
                className="h-full w-full border-0"
                allow="encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
            />
        </div>
    );
}
