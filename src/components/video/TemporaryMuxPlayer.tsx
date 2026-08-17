'use client';

import type { TemporaryMuxPlayback } from '@/lib/temporary-mux-playback';
import Watermark from '@/components/video/Watermark';

export default function TemporaryMuxPlayer({
  playback,
  watermarkText,
}: {
  playback: TemporaryMuxPlayback;
  watermarkText: string;
}) {
  const containerId = `temporary-mux-player-${playback.playbackId}`;

  return (
    <div id={containerId} className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-xl">
      <iframe
        src={playback.playerUrl}
        title={playback.iframeTitle}
        className="h-full w-full border-0"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
      />
      <Watermark text={watermarkText} containerId={containerId} />
    </div>
  );
}
