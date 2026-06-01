'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface UseIframeHeartbeatProps {
  videoId?: string;
}

type HeartbeatPayload = {
  videoId: string;
  position: number;
  isNewView: boolean;
  isFinished: boolean;
};

const HEARTBEAT_INTERVAL_MS = 60_000;
const BLOCKED_HEARTBEAT_MESSAGE =
  'Playback blocked. Your access window or view limit has been reached.';

export function useIframeHeartbeat({ videoId }: UseIframeHeartbeatProps) {
  const [blockedVideoId, setBlockedVideoId] = useState<string | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const blockedRef = useRef(false);
  const hasSuccessfulInitialHeartbeatRef = useRef(false);
  const isBlocked = blockedVideoId === videoId;

  useEffect(() => {
    if (!videoId) {
      return;
    }

    blockedRef.current = false;
    hasSuccessfulInitialHeartbeatRef.current = false;

    const clearHeartbeatInterval = () => {
      if (heartbeatIntervalRef.current) {
        window.clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };

    const sendHeartbeat = async (isNewView: boolean) => {
      if (blockedRef.current) {
        return;
      }

      const payload: HeartbeatPayload = {
        videoId,
        position: 0,
        isNewView,
        isFinished: false,
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
          return;
        }

        if (!hasSuccessfulInitialHeartbeatRef.current) {
          hasSuccessfulInitialHeartbeatRef.current = true;

          if (!heartbeatIntervalRef.current) {
            heartbeatIntervalRef.current = window.setInterval(() => {
              void sendHeartbeat(false);
            }, HEARTBEAT_INTERVAL_MS);
          }
        }
      } catch {
        // Silent failure keeps playback from surfacing noisy transport errors.
      }
    };

    void sendHeartbeat(true);

    return () => {
      clearHeartbeatInterval();
    };
  }, [videoId]);

  return { isBlocked };
}
