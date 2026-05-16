'use client';

import { useEffect, useRef, useCallback } from 'react';
import { signOut } from 'next-auth/react';

interface SSEState {
    connected: boolean;
    reconnectAttempts: number;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000; // 1 second, exponential backoff

export const SESSION_REVOKED_EVENT = 'session:revoked';

export interface SessionRevokedDetail {
    reason: string;
}

export function notifySessionRevoked(reason: string) {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent<SessionRevokedDetail>(
        SESSION_REVOKED_EVENT,
        { detail: { reason } }
    ));
}

/**
 * Hook for SSE-based session monitoring
 * Receives push notifications for session revocation - no polling needed
 * 
 * @param enabled - Whether to enable SSE connection (default: true)
 * @param fallbackPollingMs - Fallback polling interval if SSE not supported (default: 300000 = 5 min)
 */
export function useSessionSSE(enabled: boolean = true, fallbackPollingMs: number = 300000) {
    const eventSourceRef = useRef<EventSource | null>(null);
    const stateRef = useRef<SSEState>({ connected: false, reconnectAttempts: 0 });
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const handleRevocation = useCallback(async (reason: string) => {
        notifySessionRevoked(reason);

        if (process.env.NODE_ENV === 'development') {
            console.log('🔴 Session revoked via SSE:', reason);
        }

        // Clear any stored session cache
        try {
            sessionStorage.removeItem('session_last_valid');
        } catch {
            // Ignore
        }

        // Sign out and redirect
        await signOut({ redirect: false });
        window.location.href = '/auth/signin?error=SessionRevoked';
    }, []);

    const connect = useCallback(() => {
        // Skip if SSE not supported or disabled
        if (typeof EventSource === 'undefined' || !enabled) {
            // Fallback to minimal polling
            if (!fallbackIntervalRef.current) {
                fallbackIntervalRef.current = setInterval(async () => {
                    // Check client-side cache first to avoid unnecessary server hits
                    try {
                        const lastCheck = sessionStorage.getItem('session_last_valid');
                        const now = Date.now();
                        // If we have a valid check within the last 5 minutes, skip this poll
                        if (lastCheck && now - parseInt(lastCheck) < 300000) {
                            return;
                        }
                    } catch {
                        // Ignore storage errors
                    }

                    try {
                        const res = await fetch('/api/session/validate');
                        const data = await res.json();
                        if (data.valid) {
                            // Update cache on success
                            try {
                                sessionStorage.setItem('session_last_valid', Date.now().toString());
                            } catch {
                                // Ignore
                            }
                        } else {
                            handleRevocation(data.reason || 'Session invalid');
                        }
                    } catch {
                        // Ignore network errors
                    }
                }, fallbackPollingMs);
            }
            return;
        }

        // Don't reconnect if already connected
        if (eventSourceRef.current?.readyState === EventSource.OPEN) {
            return;
        }

        // Close any existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        try {
            const eventSource = new EventSource('/api/session/events');
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                stateRef.current.connected = true;
                stateRef.current.reconnectAttempts = 0;
                if (process.env.NODE_ENV === 'development') {
                    console.log('✅ SSE connected for session monitoring');
                }
            };

            // Handle connection event
            eventSource.addEventListener('connected', (event) => {
                const data = JSON.parse(event.data);
                if (process.env.NODE_ENV === 'development') {
                    console.log('📡 SSE connection established:', data.connectionId);
                }
            });

            // Handle ping events (keepalive)
            eventSource.addEventListener('ping', () => {
                // Connection is alive, nothing to do
            });

            // Handle revocation event
            eventSource.addEventListener('revoked', (event) => {
                const data = JSON.parse(event.data);
                handleRevocation(data.reason);
            });

            eventSource.onerror = () => {
                stateRef.current.connected = false;
                eventSource.close();
                eventSourceRef.current = null;

                // Reconnect with exponential backoff
                if (stateRef.current.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    const delay = RECONNECT_BASE_DELAY * Math.pow(2, stateRef.current.reconnectAttempts);
                    stateRef.current.reconnectAttempts++;

                    if (process.env.NODE_ENV === 'development') {
                        console.log(`🔄 SSE reconnecting in ${delay}ms (attempt ${stateRef.current.reconnectAttempts})`);
                    }

                    reconnectTimeoutRef.current = setTimeout(connect, delay);
                } else {
                    // Fall back to polling after max reconnect attempts
                    if (process.env.NODE_ENV === 'development') {
                        console.log('⚠️ SSE max reconnects reached, falling back to polling');
                    }
                    if (!fallbackIntervalRef.current) {
                        fallbackIntervalRef.current = setInterval(async () => {
                            try {
                                const res = await fetch('/api/session/validate');
                                const data = await res.json();
                                if (!data.valid) {
                                    handleRevocation(data.reason || 'Session invalid');
                                }
                            } catch {
                                // Ignore
                            }
                        }, fallbackPollingMs);
                    }
                }
            };
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('SSE connection error:', error);
            }
        }
    }, [enabled, fallbackPollingMs, handleRevocation]);

    useEffect(() => {
        if (!enabled) return;

        // Connect when component mounts
        connect();

        // Reconnect when tab becomes visible
        const handleVisibilityChange = () => {
            if (!document.hidden && !stateRef.current.connected) {
                stateRef.current.reconnectAttempts = 0; // Reset on tab focus
                connect();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (fallbackIntervalRef.current) {
                clearInterval(fallbackIntervalRef.current);
            }
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [enabled, connect]);

    return {
        connected: stateRef.current.connected,
    };
}
