import { Redis } from '@upstash/redis';

/**
 * Redis Client Configuration
 * Uses @upstash/redis HTTP client for serverless/edge compatibility
 */

// Singleton Redis client
let redis: Redis | null = null;
let warnedAboutRedisConfig = false;

function isPlaceholderEnvValue(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes('example.invalid') ||
    normalized.includes('example.com') ||
    normalized.includes('<') ||
    normalized.includes('>') ||
    normalized.includes('placeholder') ||
    normalized.includes('your_') ||
    normalized.includes('your-') ||
    normalized.includes('changeme')
  );
}

export function getRedisConfigError(): string | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return 'UPSTASH_REDIS_REST_URL/TOKEN missing';
  }

  if (isPlaceholderEnvValue(url) || isPlaceholderEnvValue(token)) {
    return 'UPSTASH_REDIS_REST_URL/TOKEN still contains placeholder values';
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:') {
      return 'UPSTASH_REDIS_REST_URL must use https';
    }
  } catch {
    return 'UPSTASH_REDIS_REST_URL is not a valid URL';
  }

  return null;
}

export function isUpstashRedisConfigured(): boolean {
  return getRedisConfigError() === null;
}

/**
 * Get the singleton Redis client
 * Uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env
 */
export function getRedisClient(): Redis | null {
  const configError = getRedisConfigError();
  if (configError) {
    if (process.env.NODE_ENV === 'development' && !warnedAboutRedisConfig) {
      console.warn(`Upstash Redis not configured (${configError}), caching disabled`);
      warnedAboutRedisConfig = true;
    }
    return null;
  }

  if (!redis) {
    try {
      redis = Redis.fromEnv();
    } catch (error) {
      console.error('Failed to initialize Upstash Redis:', error);
      return null;
    }
  }

  return redis;
}

/**
 * Gracefully close Redis connection
 * No-op for Upstash HTTP client but kept for API compatibility
 */
export async function closeRedisConnection(): Promise<void> {
  // Upstash/HTTP is stateless, no connection to close
  redis = null;
}

/**
 * Get cached data or fetch fresh data if cache miss
 * @param key Cache key
 * @param fetcher Function to fetch fresh data
 * @param ttl Time to live in seconds (default: 300 = 5 minutes)
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 300
): Promise<T> {
  const client = getRedisClient();

  // If Redis is not available, just fetch fresh data
  if (!client) {
    return await fetcher();
  }

  try {
    // Try to get from cache
    // Upstash automatically attempts to parse JSON if possible
    const cached = await client.get<T>(key);

    if (cached) {
      if (process.env.NODE_ENV === 'development') {
        // console.log(`Cache HIT for key: ${key}`);
      }
      return cached;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Handle rate limit gracefully
    if (errorMessage.includes('Daily request limit exceeded')) {
      console.warn('Upstash Redis rate limit exceeded - falling back to fresh data');
    } else if (process.env.NODE_ENV === 'development') {
      console.error('Redis get error:', errorMessage);
    }
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache (fire and forget for performance)
  setCache(key, data, ttl).catch(() => {
    // Silently ignore cache set errors
  });

  return data;
}

/**
 * Invalidate cache by key pattern
 * @param pattern Redis key pattern (e.g., "courses:*")
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const client = getRedisClient();

  if (!client) {
    return;
  }

  try {
    const keys = await client.keys(pattern);

    if (keys.length > 0) {
      await client.del(...keys);
      if (process.env.NODE_ENV === 'development') {
        console.log(`Invalidated ${keys.length} cache keys matching: ${pattern}`);
      }
    }
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Cache invalidation error:', errorMessage);
    }
  }
}

/**
 * Invalidate specific cache key
 * @param key Cache key to invalidate
 */
export async function invalidateCacheKey(key: string): Promise<void> {
  const client = getRedisClient();

  if (!client) {
    return;
  }

  try {
    await client.del(key);
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Cache key invalidation error:', errorMessage);
    }
  }
}

/**
 * Set cache value directly
 * @param key Cache key
 * @param value Value to cache
 * @param ttl Time to live in seconds
 */
export async function setCache<T>(key: string, value: T, ttl = 300): Promise<void> {
  const client = getRedisClient();

  if (!client) {
    return;
  }

  try {
    // Upstash SDK handles JSON serialization automatically for objects
    await client.set(key, value, { ex: ttl });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Daily request limit exceeded')) {
      console.warn('Upstash Redis rate limit exceeded (Set) - cache skipped');
    } else if (process.env.NODE_ENV === 'development') {
      console.error('Cache set error:', errorMessage);
    }
  }
}

/**
 * Get cache value directly
 * @param key Cache key
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();

  if (!client) {
    return null;
  }

  try {
    const cached = await client.get<T>(key);
    return cached;
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Cache get error:', errorMessage);
    }
    return null;
  }
}

/**
 * Check Redis health
 * @returns true if Redis is healthy, false otherwise
 */
export async function isRedisHealthy(): Promise<boolean> {
  const client = getRedisClient();

  if (!client) {
    return false;
  }

  try {
    // Upstash doesn't strictly have a ping command in the same way, but we can try a simple op
    // Or just check if client is initialized.
    // Actually, ping() is supported in newer SDK versions or via invalid command, but let's try 'dbsize' or just assume true if client exists
    // The previous implementation used ping(). Let's try ping if supported, else just return true.
    // @ts-ignore - ping might not be in type definition depending on version
    await client.ping();
    return true;
  } catch {
    return false;
  }
}
