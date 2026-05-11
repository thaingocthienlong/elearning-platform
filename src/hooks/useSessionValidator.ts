'use client';

import { useSessionSSE } from './useSessionSSE';

/**
 * Hook to monitor session validity and sign out if revoked
 * 
 * This is now a wrapper around useSessionSSE for backwards compatibility.
 * Uses Server-Sent Events (SSE) for push-based revocation notifications.
 * Falls back to polling only if SSE connection fails.
 * 
 * @param intervalMs - Fallback polling interval (default: 300000 = 5 min, only used if SSE fails)
 * @deprecated Consider using useSessionSSE directly for new code
 */
export function useSessionValidator(intervalMs: number = 300000) {
    // Use SSE-based session monitoring
    // The intervalMs is now only used as fallback polling interval
    useSessionSSE(true, intervalMs);
}
