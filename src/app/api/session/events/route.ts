import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRedisClient } from '@/lib/redis';

// Store active SSE connections by connection ID
// Key format: "session_token_prefix-timestamp"
const activeConnections = new Map<string, ReadableStreamDefaultController>();

// Track connection count for monitoring
let totalConnections = 0;

type SSEController = Pick<ReadableStreamDefaultController, 'close' | 'enqueue'>;

type RevocationRedis = {
    get: (key: string) => Promise<unknown>;
} | null;

export async function notifyIfSessionRevoked(
    redis: RevocationRedis,
    revokedKey: string,
    controller: SSEController,
    connectionId: string,
    reason: string = 'Session was revoked'
) {
    if (!redis) {
        return false;
    }

    try {
        const isRevoked = await redis.get(revokedKey);
        if (isRevoked === 'true') {
            sendRevokedEvent(controller, connectionId, reason);
            return true;
        }
    } catch {
        // Redis read failures leave the SSE stream alive; client fallback validation still runs.
    }

    return false;
}

/**
 * SSE endpoint for session events (revocation, etc.)
 * Clients connect once and receive push notifications
 * 
 * Events:
 * - 'connected': Initial connection established
 * - 'ping': Keepalive every 30 seconds
 * - 'revoked': Session has been revoked, client should sign out
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return new Response('Unauthorized', { status: 401 });
    }

    // Get session token for identifying this connection
    const sessionToken = req.cookies.get('next-auth.session-token')?.value ||
        req.cookies.get('__Secure-next-auth.session-token')?.value;

    if (!sessionToken) {
        return new Response('No session token', { status: 401 });
    }

    // Create a unique connection ID (session token prefix + timestamp)
    const tokenPrefix = sessionToken.slice(0, 16);
    const connectionId = `${tokenPrefix}-${Date.now()}`;

    // Create SSE stream
    const stream = new ReadableStream({
        start(controller) {
            // Store controller for this connection
            activeConnections.set(connectionId, controller);
            totalConnections++;

            if (process.env.NODE_ENV === 'development') {
                console.log(`📡 SSE connection opened: ${connectionId.slice(0, 20)}... (total: ${totalConnections})`);
            }

            // Send initial connection event
            const connectEvent = `event: connected\ndata: ${JSON.stringify({
                connectionId: connectionId.slice(0, 20),
                timestamp: new Date().toISOString()
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(connectEvent));

            // Set up Redis for checking revocation status
            const revokedKey = `session_revoked:${sessionToken}`;
            const redis = getRedisClient();

            // Send keepalive ping every 30 seconds
            const pingInterval = setInterval(async () => {
                try {
                    const revoked = await notifyIfSessionRevoked(
                        redis,
                        revokedKey,
                        controller,
                        connectionId,
                        'Session was revoked'
                    );
                    if (revoked) {
                        clearInterval(pingInterval);
                        return;
                    }

                    const pingEvent = `event: ping\ndata: ${JSON.stringify({
                        timestamp: new Date().toISOString()
                    })}\n\n`;
                    controller.enqueue(new TextEncoder().encode(pingEvent));
                } catch {
                    // Connection closed
                    cleanup(connectionId, pingInterval);
                }
            }, 30000);

            notifyIfSessionRevoked(
                redis,
                revokedKey,
                controller,
                connectionId,
                'Session was revoked'
            ).then((revoked) => {
                if (revoked) {
                    clearInterval(pingInterval);
                }
            }).catch(() => {
                // Connection remains open; client fallback validation still protects active pages.
            });

            // Cleanup when client disconnects
            req.signal.addEventListener('abort', () => {
                cleanup(connectionId, pingInterval);
                if (process.env.NODE_ENV === 'development') {
                    console.log(`📡 SSE connection closed: ${connectionId.slice(0, 20)}... (total: ${totalConnections})`);
                }
            });
        },
        cancel() {
            activeConnections.delete(connectionId);
            totalConnections = Math.max(0, totalConnections - 1);
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
        },
    });
}

/**
 * Helper to send revoked event and close connection
 */
function sendRevokedEvent(
    controller: SSEController,
    connectionId: string,
    reason: string
) {
    try {
        const revokeEvent = `event: revoked\ndata: ${JSON.stringify({
            reason,
            timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(revokeEvent));
        controller.close();
    } catch {
        // Connection already closed
    }
    activeConnections.delete(connectionId);
    totalConnections = Math.max(0, totalConnections - 1);
}

/**
 * Cleanup intervals and connection
 */
function cleanup(
    connectionId: string,
    pingInterval: NodeJS.Timeout
) {
    clearInterval(pingInterval);
    activeConnections.delete(connectionId);
    totalConnections = Math.max(0, totalConnections - 1);
}

/**
 * Broadcast revocation to all connected clients for a session token
 * This provides instant notification (< 1ms) for in-memory connections
 * 
 * Note: This only works for connections on the same server instance.
 * For multi-instance deployments, rely on Redis-based detection.
 * 
 * @param sessionToken - The session token being revoked
 * @param reason - Human-readable reason for revocation
 */
export function broadcastSessionRevoked(sessionToken: string, reason: string = 'Session revoked') {
    const prefix = sessionToken.slice(0, 16);
    let broadcastCount = 0;

    for (const [connectionId, controller] of activeConnections.entries()) {
        if (connectionId.startsWith(prefix)) {
            try {
                const revokeEvent = `event: revoked\ndata: ${JSON.stringify({
                    reason,
                    timestamp: new Date().toISOString()
                })}\n\n`;
                controller.enqueue(new TextEncoder().encode(revokeEvent));
                controller.close();
                activeConnections.delete(connectionId);
                totalConnections = Math.max(0, totalConnections - 1);
                broadcastCount++;
            } catch {
                // Connection already closed
                activeConnections.delete(connectionId);
                totalConnections = Math.max(0, totalConnections - 1);
            }
        }
    }

    if (process.env.NODE_ENV === 'development' && broadcastCount > 0) {
        console.log(`📢 Broadcast revocation to ${broadcastCount} connections`);
    }

    return broadcastCount;
}

/**
 * Get current SSE connection statistics
 */
export function getSSEStats() {
    return {
        activeConnections: activeConnections.size,
        totalConnections,
    };
}
