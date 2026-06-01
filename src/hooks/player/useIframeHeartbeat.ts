'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface UseIframeHeartbeatProps {
  videoId?: string;
  isActive: boolean;
  iframeRef: { current: HTMLIFrameElement | null };
}

type HeartbeatPayload = {
  videoId: string;
  position: number;
  isNewView: boolean;
  isFinished: boolean;
};

type BunnyPlayerEventHandler = (...args: unknown[]) => void;

type BunnyPlayerInstance = {
  on: (event: string, handler: BunnyPlayerEventHandler) => void;
  off?: (event: string, handler: BunnyPlayerEventHandler) => void;
  destroy?: () => void;
  dispose?: () => void;
};

type BunnyPlayerJsNamespace = {
  Player: new (iframe: HTMLIFrameElement) => BunnyPlayerInstance;
};

declare global {
  interface Window {
    playerjs?: BunnyPlayerJsNamespace;
  }
}

const HEARTBEAT_INTERVAL_MS = 60_000;
const PLAYER_JS_SRC = 'https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js';
const BLOCKED_HEARTBEAT_MESSAGE =
  'Playback blocked. Your access window or view limit has been reached.';
const HEARTBEAT_FAILURE_MESSAGE = 'Playback heartbeat failed.';
const PLAYER_SETUP_FAILURE_MESSAGE = 'Unable to initialize secure playback.';

let playerJsLoaderPromise: Promise<BunnyPlayerJsNamespace> | null = null;

function toPlaybackPosition(seconds: unknown) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    return 0;
  }

  return Math.max(0, Math.floor(seconds));
}

function loadPlayerJs(): Promise<BunnyPlayerJsNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error(PLAYER_SETUP_FAILURE_MESSAGE));
  }

  if (window.playerjs?.Player) {
    return Promise.resolve(window.playerjs);
  }

  if (!playerJsLoaderPromise) {
    playerJsLoaderPromise = new Promise<BunnyPlayerJsNamespace>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${PLAYER_JS_SRC}"]`
      );

      const handleLoad = () => {
        if (window.playerjs?.Player) {
          resolve(window.playerjs);
        } else {
          reject(new Error(PLAYER_SETUP_FAILURE_MESSAGE));
        }
      };

      const handleError = () => {
        reject(new Error(PLAYER_SETUP_FAILURE_MESSAGE));
      };

      if (existingScript) {
        existingScript.addEventListener('load', handleLoad, { once: true });
        existingScript.addEventListener('error', handleError, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.src = PLAYER_JS_SRC;
      script.addEventListener('load', handleLoad, { once: true });
      script.addEventListener('error', handleError, { once: true });
      document.head.appendChild(script);
    }).catch((error) => {
      playerJsLoaderPromise = null;
      throw error;
    });
  }

  return playerJsLoaderPromise;
}

export function useIframeHeartbeat({ videoId, isActive, iframeRef }: UseIframeHeartbeatProps) {
  const [blockedVideoId, setBlockedVideoId] = useState<string | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const blockedRef = useRef(false);
  const hasSuccessfulInitialHeartbeatRef = useRef(false);
  const hasShownHeartbeatFailureRef = useRef(false);
  const hasShownPlayerSetupFailureRef = useRef(false);
  const latestPositionRef = useRef(0);
  const isPlayingRef = useRef(false);
  const isBlocked = blockedVideoId === videoId;

  useEffect(() => {
    if (!videoId || !isActive || !iframeRef.current) {
      return;
    }

    blockedRef.current = false;
    hasSuccessfulInitialHeartbeatRef.current = false;
    hasShownHeartbeatFailureRef.current = false;
    hasShownPlayerSetupFailureRef.current = false;
    latestPositionRef.current = 0;
    isPlayingRef.current = false;
    setPlayerError(null);

    const clearHeartbeatInterval = () => {
      if (heartbeatIntervalRef.current !== null) {
        window.clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };

    const showSetupFailure = () => {
      if (!hasShownPlayerSetupFailureRef.current) {
        hasShownPlayerSetupFailureRef.current = true;
        toast.error(PLAYER_SETUP_FAILURE_MESSAGE);
      }

      setPlayerError(PLAYER_SETUP_FAILURE_MESSAGE);
      clearHeartbeatInterval();
    };

    const sendHeartbeat = async (options: { isNewView: boolean; isFinished: boolean }) => {
      if (blockedRef.current) {
        return;
      }

      const payload: HeartbeatPayload = {
        videoId,
        position: latestPositionRef.current,
        isNewView: options.isNewView,
        isFinished: options.isFinished,
      };

      try {
        const response = await fetch('/api/watch/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.status === 403) {
          blockedRef.current = true;
          setBlockedVideoId(videoId);
          clearHeartbeatInterval();
          toast.error(BLOCKED_HEARTBEAT_MESSAGE);
          return;
        }

        if (!response.ok) {
          if (!hasShownHeartbeatFailureRef.current) {
            hasShownHeartbeatFailureRef.current = true;
            toast.error(HEARTBEAT_FAILURE_MESSAGE);
          }
          return;
        }

        if (!hasSuccessfulInitialHeartbeatRef.current) {
          hasSuccessfulInitialHeartbeatRef.current = true;
        }

        if (isPlayingRef.current && !options.isFinished && !heartbeatIntervalRef.current) {
          heartbeatIntervalRef.current = window.setInterval(() => {
            if (!isPlayingRef.current || blockedRef.current) {
              return;
            }

            void sendHeartbeat({ isNewView: false, isFinished: false });
          }, HEARTBEAT_INTERVAL_MS);
        }
      } catch {
        if (!hasShownHeartbeatFailureRef.current) {
          hasShownHeartbeatFailureRef.current = true;
          toast.error(HEARTBEAT_FAILURE_MESSAGE);
        }
      }
    };

    let player: BunnyPlayerInstance | null = null;
    let cancelled = false;
    const cleanupHandlers: Array<() => void> = [];

    const registerPlayerListener = (event: string, handler: BunnyPlayerEventHandler) => {
      player?.on(event, handler);

      cleanupHandlers.push(() => {
        player?.off?.(event, handler);
      });
    };

    void loadPlayerJs()
      .then((playerJs) => {
        if (cancelled || !iframeRef.current) {
          return;
        }

        try {
          player = new playerJs.Player(iframeRef.current);
        } catch {
          showSetupFailure();
          return;
        }

        registerPlayerListener('play', () => {
          if (blockedRef.current) {
            return;
          }

          isPlayingRef.current = true;

          void sendHeartbeat({
            isNewView: !hasSuccessfulInitialHeartbeatRef.current,
            isFinished: false,
          });
        });

        registerPlayerListener('timeupdate', (data) => {
          const eventData = data as { seconds?: number; duration?: number } | undefined;
          latestPositionRef.current = toPlaybackPosition(eventData?.seconds);
        });

        registerPlayerListener('pause', () => {
          if (!isPlayingRef.current || blockedRef.current) {
            return;
          }

          isPlayingRef.current = false;
          clearHeartbeatInterval();
          void sendHeartbeat({ isNewView: false, isFinished: false });
        });

        registerPlayerListener('ended', () => {
          if (blockedRef.current) {
            return;
          }

          isPlayingRef.current = false;
          clearHeartbeatInterval();
          void sendHeartbeat({ isNewView: false, isFinished: true });
        });

        registerPlayerListener('error', () => {
          showSetupFailure();
        });

        const handleVisibilityChange = () => {
          if (document.visibilityState !== 'hidden' || !isPlayingRef.current || blockedRef.current) {
            return;
          }

          isPlayingRef.current = false;
          clearHeartbeatInterval();
          void sendHeartbeat({ isNewView: false, isFinished: false });
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        cleanupHandlers.push(() => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        });
      })
      .catch(() => {
        if (!cancelled) {
          showSetupFailure();
        }
      });

    return () => {
      cancelled = true;
      clearHeartbeatInterval();

      for (const cleanupHandler of cleanupHandlers) {
        cleanupHandler();
      }

      player?.destroy?.();
      player?.dispose?.();
    };
  }, [videoId, iframeRef, isActive]);

  return { isBlocked, playerError };
}
