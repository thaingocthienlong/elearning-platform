'use client';

import { useMemo, useRef, useState } from 'react';
import { Loader2, Maximize, Minimize, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useIframeHeartbeat } from '@/hooks/player/useIframeHeartbeat';
import { usePlayerFullscreen } from '@/hooks/player/usePlayerFullscreen';
import type { VideoWatermarkSettings } from '@/lib/watermark-settings';
import Watermark from './Watermark';

interface BunnyStreamPlayerProps {
  videoId: string;
  libraryId: string;
  bunnyVideoId: string;
  viewCount: number;
  viewLimit: number | null;
  watermarkText: string;
  watermarkSettings?: VideoWatermarkSettings | null;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

const PLAYBACK_START_ERROR_MESSAGE = 'Unable to start secure playback.';
const PLAYBACK_SETUP_ERROR_MESSAGE = 'Unable to initialize secure playback.';

export default function BunnyStreamPlayer({
  videoId,
  libraryId,
  bunnyVideoId,
  viewCount,
  viewLimit,
  watermarkText,
  watermarkSettings,
  onFullscreenChange,
}: BunnyStreamPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [signedEmbedUrl, setSignedEmbedUrl] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const { isBlocked, playerError } = useIframeHeartbeat({
    videoId,
    iframeRef,
    isActive: Boolean(signedEmbedUrl),
  });
  const { isIOS, isFakeFullscreen, toggleFakeFullscreen } = usePlayerFullscreen({
    containerRef,
    onFullscreenChange,
  });
  const containerId = `bunny-stream-player-${videoId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  const containerClassName = useMemo(
    () =>
      `relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-xl touch-manipulation ${
        isFakeFullscreen ? 'fixed inset-0 z-[99999] h-[100dvh] rounded-none aspect-auto' : ''
      }`,
    [isFakeFullscreen]
  );

  const startPlayback = async () => {
    if (isStarting || signedEmbedUrl) {
      return;
    }

    setIsStarting(true);

    try {
      const response = await fetch('/api/video/bunny-stream/playback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId }),
      });

      if (!response.ok) {
        toast.error(PLAYBACK_START_ERROR_MESSAGE);
        return;
      }

      const payload: {
        signedEmbedUrl?: string;
      } = await response.json();

      if (!payload.signedEmbedUrl) {
        toast.error(PLAYBACK_START_ERROR_MESSAGE);
        return;
      }

      setSignedEmbedUrl(payload.signedEmbedUrl);
    } catch {
      toast.error(PLAYBACK_START_ERROR_MESSAGE);
    } finally {
      setIsStarting(false);
    }
  };

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
      {signedEmbedUrl ? (
        playerError ? (
          <div className="flex h-full w-full items-center justify-center bg-black px-6 text-center text-white">
            <div className="max-w-sm">
              <p className="text-xl font-semibold">Playback unavailable</p>
              <p className="mt-2 text-sm text-white/70">{PLAYBACK_SETUP_ERROR_MESSAGE}</p>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            title="Secure Bunny Stream player"
            src={signedEmbedUrl}
            className="h-full w-full border-0"
            allow="autoplay; encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-black via-black to-slate-950">
          <div className="flex flex-col items-center gap-4 px-6 text-center text-white">
            <button
              type="button"
              onClick={() => void startPlayback()}
              disabled={isStarting}
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isStarting ? 'Loading secure player...' : 'Start secure player'}
            </button>
            <p className="max-w-md text-sm text-white/70">
              Playback starts after you choose to load the secured stream.
            </p>
          </div>
        </div>
      )}

      {watermarkText && (
        <Watermark
          text={watermarkText}
          containerId={containerId}
          forceFullscreenMode={isFakeFullscreen}
          isIOS={isIOS}
          settings={watermarkSettings}
        />
      )}

      {viewLimit !== null && (
        <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
          {viewCount}/{viewLimit} views
        </div>
      )}

      {signedEmbedUrl && !playerError && (
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
