'use client';

import type { TemporaryMuxPlayback } from '@/lib/temporary-mux-playback';

export default function TemporaryMuxPlayer({ playback }: { playback: TemporaryMuxPlayback }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black shadow-xl">
      <iframe
        src={playback.playerUrl}
        title={playback.iframeTitle}
        className="h-full w-full border-0"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
      />
    </div>
  );
}
