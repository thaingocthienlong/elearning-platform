'use client';

import { useRef } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { useIframeHeartbeat } from '@/hooks/player/useIframeHeartbeat';
import { usePlayerFullscreen } from '@/hooks/player/usePlayerFullscreen';

interface BunnyStreamPlayerProps {
  videoId: string;
  libraryId: string;
  bunnyVideoId: string;
  signedEmbedUrl: string;
  viewCount: number;
  viewLimit: number | null;
  watermarkText: string;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export default function BunnyStreamPlayer({
  videoId,
  libraryId,
  bunnyVideoId,
  signedEmbedUrl,
  viewCount,
  viewLimit,
  watermarkText,
  onFullscreenChange,
}: BunnyStreamPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isBlocked } = useIframeHeartbeat({ videoId });
  const { isIOS, isFakeFullscreen, toggleFakeFullscreen } = usePlayerFullscreen({
    containerRef,
    onFullscreenChange,
  });
  const containerId = `bunny-stream-player-${videoId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  const containerClassName = `relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-xl touch-manipulation ${
    isFakeFullscreen ? 'fixed inset-0 z-[99999] h-[100dvh] rounded-none aspect-auto' : ''
  }`;

  if (isBlocked) {
    return (
      <div
        ref={containerRef}
        id={containerId}
        className={containerClassName}
        data-library-id={libraryId}
        data-bunny-video-id={bunnyVideoId}
      >
        <div className="flex h-full items-center justify-center px-6 text-center text-white">
          <div>
            <p className="text-xl font-semibold">Playback blocked</p>
            <p className="mt-2 text-sm text-white/70">
              Your access window or view limit has been reached.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id={containerId}
      className={containerClassName}
      data-library-id={libraryId}
      data-bunny-video-id={bunnyVideoId}
    >
      <iframe
        title="Secure Bunny Stream player"
        src={signedEmbedUrl}
        className="h-full w-full border-0"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />

      {watermarkText && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-full bg-black/60 px-3 py-1 text-xs text-white/90 backdrop-blur-sm">
          {watermarkText}
        </div>
      )}

      {viewLimit !== null && (
        <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
          {viewCount}/{viewLimit} views
        </div>
      )}

      {isIOS && (
        <button
          type="button"
          onClick={toggleFakeFullscreen}
          className="absolute right-4 top-4 z-20 rounded-md bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70 active:scale-95"
          style={{
            marginTop: 'env(safe-area-inset-top)',
            marginRight: 'env(safe-area-inset-right)',
          }}
          aria-label={isFakeFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFakeFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
        </button>
      )}
    </div>
  );
}
