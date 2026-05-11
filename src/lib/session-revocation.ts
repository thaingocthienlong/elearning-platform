import { getRedisClient } from '@/lib/redis';

/**
 * Revoke a session and notify connected SSE clients
 * 
 * This function:
 * 1. Sets a revocation flag in Redis (detected by SSE within 30s)
 * 2. Invalidates the session validity cache
 * 3. Attempts instant broadcast to in-memory SSE connections
 * 
 * @param sessionToken - The session token to revoke
 * @param reason - Reason for revocation (for logging/display)
 * @param ttl - How long to keep the revocation flag in Redis (default: 7 days)
 */
export async function revokeSession(
    sessionToken: string,
    reason: string = 'Admin revoked',
    ttl: number = 60 * 60 * 24 * 7 // 7 days
): Promise<{ redis: boolean; broadcast: number }> {
    const redis = getRedisClient();
    if (!redis) {
        return { redis: false, broadcast: 0 };
    }

    const revokedKey = `session_revoked:${sessionToken}`;

    // Set revocation flag in Redis
    try {
        await redis.setex(revokedKey, ttl, 'true');

        // Invalidate session validity cache to force re-validation
        const validityKey = `session_valid:${sessionToken}`;
        await redis.del(validityKey);
    } catch {
        // Ignore Redis errors to prevent blocking flows
        return { redis: false, broadcast: 0 };
    }

    // Try to broadcast instantly to in-memory connections
    // This only works on single-instance deployments
    let broadcastCount = 0;
    try {
        // Dynamic import to avoid circular dependencies
        const { broadcastSessionRevoked } = await import('@/app/api/session/events/route');
        broadcastCount = broadcastSessionRevoked(sessionToken, reason);
    } catch {
        // Broadcast not available (different server instance or import error)
        // SSE will still detect via Redis within 30 seconds
    }

    if (process.env.NODE_ENV === 'development') {
        console.log(`🔴 Session revoked: ${sessionToken.slice(0, 8)}... - ${reason}`);
        console.log(`   Redis: ✓, Broadcast: ${broadcastCount} connections`);
    }

    return { redis: true, broadcast: broadcastCount };
}

/**
 * Check if a session has been revoked
 * 
 * @param sessionToken - The session token to check
 * @returns true if revoked, false otherwise
 */
export async function isSessionRevoked(sessionToken: string): Promise<boolean> {
    try {
        const redis = getRedisClient();
        if (!redis) {
            return false;
        }

        const revokedKey = `session_revoked:${sessionToken}`;
        const isRevoked = await redis.get(revokedKey);
        return isRevoked === 'true';
    } catch {
        // Redis error - fail open (assume not revoked)
        return false;
    }
}

/**
 * Remove a session revocation (allow session again)
 * 
 * @param sessionToken - The session token to unrevoke
 */
export async function unrevokeSession(sessionToken: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
        return;
    }

    const revokedKey = `session_revoked:${sessionToken}`;
    await redis.del(revokedKey);

    if (process.env.NODE_ENV === 'development') {
        console.log(`🟢 Session unrevoked: ${sessionToken.slice(0, 8)}...`);
    }
}

/**
 * Revoke all sessions for a user email
 * Useful for "sign out everywhere" functionality
 * 
 * @param email - User email to revoke all sessions for
 * @param reason - Reason for revocation
 */
export async function revokeAllSessionsForUser(
    email: string,
    reason: string = 'All sessions revoked'
): Promise<number> {
    // This requires querying the database for all sessions
    // Import prisma dynamically to avoid circular dependencies
    const { prisma } = await import('@/lib/prisma');

    const sessions = await prisma.session.findMany({
        where: {
            user: {
                email: email,
            },
        },
        select: {
            sessionToken: true,
        },
    });

    let revokedCount = 0;
    for (const session of sessions) {
        try {
            await revokeSession(session.sessionToken, reason);
            revokedCount++;
        } catch {
            // Continue even if one fails
        }
    }

    if (process.env.NODE_ENV === 'development') {
        console.log(`🔴 Revoked ${revokedCount} sessions for ${email}`);
    }

    return revokedCount;
}
