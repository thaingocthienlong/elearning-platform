import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Generate a simple browser fingerprint
function generateFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    navigator.hardwareConcurrency || 'unknown',
    navigator.platform,
  ];

  const fingerprint = components.join('|');

  // Create a simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
}

export function useSessionFingerprint() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Send fingerprint on login
      const fingerprint = generateFingerprint();

      fetch('/api/session/fingerprint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fingerprint }),
      }).catch((error) => {
        console.error('Failed to send fingerprint:', error);
      });

      // Update session activity every 5 minutes
      // Update session activity on user interaction (focus/visibility)
      // Throttled to once every 10 minutes to reduce DB writes
      const updateActivity = () => {
        const now = Date.now();
        const lastUpdate = parseInt(sessionStorage.getItem('lastActivityUpdate') || '0');
        const THROTTLE_MS = 10 * 60 * 1000; // 10 minutes

        if (now - lastUpdate > THROTTLE_MS) {
          fetch('/api/session/fingerprint', { method: 'PATCH' })
            .then(() => {
              sessionStorage.setItem('lastActivityUpdate', now.toString());
            })
            .catch((error) => console.error('Failed to update session activity:', error));
        }
      };

      // Initial check on mount
      updateActivity();

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          updateActivity();
        }
      };

      const handleFocus = () => {
        updateActivity();
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [status, session?.user]);
}
