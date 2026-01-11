// Upstash Redis Client
import { Redis } from '@upstash/redis';

// Lazy initialization to avoid build-time errors
let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set');
    }
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return _redis;
}

// Export a proxy that lazily initializes redis
export const redis = new Proxy({} as Redis, {
  get: (_, prop) => {
    const client = getRedis();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

// ============================================
// CACHE KEY CONSTANTS
// ============================================

export const CACHE_KEYS = {
  // Rankings
  RANKINGS_LATEST: 'rankings:latest',
  RANKINGS_COIN: (coinId: string) => `rankings:coin:${coinId}`,
  RANKINGS_HISTORY: (coinId: string) => `rankings:history:${coinId}`,

  // Prices (from CoinGecko)
  PRICES_LIST: 'prices:list',
  COIN_PREFIX: 'coin:',
  GLOBAL_DATA: 'global:data',

  // Sentiment
  SENTIMENT_BATCH: 'sentiment:batch',
  SENTIMENT_PREFIX: 'sentiment:coin:',
  FEAR_GREED: 'fear_greed:current',

  // Technical indicators
  TECHNICAL_PREFIX: 'technical:coin:',

  // Predictions
  PREDICTIONS_PREFIX: 'prediction:coin:',

  // Rate limiting
  RATE_LIMIT: (api: string) => `ratelimit:${api}`,
} as const;

// ============================================
// TTL CONSTANTS (in seconds)
// ============================================

export const CACHE_TTL = {
  // Rankings
  RANKINGS_LATEST: 60,        // 60 seconds
  RANKINGS_COIN: 60,          // 60 seconds
  RANKINGS_HISTORY: 300,      // 5 minutes

  // Prices (refresh every minute, but cache for 2 mins for safety)
  PRICES: 120,                // 2 minutes

  // Sentiment (refresh every 15 mins, cache for 20 mins)
  SENTIMENT: 1200,            // 20 minutes
  SENTIMENT_BATCH: 900,       // 15 minutes
  FEAR_GREED: 300,            // 5 minutes

  // Technical (refresh hourly, cache for 75 mins)
  TECHNICAL: 4500,            // 75 minutes

  // Predictions (refresh hourly, cache for 75 mins)
  PREDICTIONS: 4500,          // 75 minutes

  RATE_LIMIT_WINDOW: 60,      // 1 minute window
} as const;

// ============================================
// CACHE OPERATIONS
// ============================================

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get<T>(key);
    return data;
  } catch (error) {
    console.error(`Redis GET error for ${key}:`, error);
    return null;
  }
}

export async function setCached<T>(
  key: string,
  data: T,
  ttlSeconds: number = 60
): Promise<boolean> {
  try {
    await redis.set(key, data, { ex: ttlSeconds });
    return true;
  } catch (error) {
    console.error(`Redis SET error for ${key}:`, error);
    return false;
  }
}

export async function deleteCached(key: string): Promise<boolean> {
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error(`Redis DEL error for ${key}:`, error);
    return false;
  }
}

export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 60
): Promise<T> {
  // Try cache first
  const cached = await getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const fresh = await fetcher();

  // Store in cache (don't await - fire and forget)
  setCached(key, fresh, ttlSeconds).catch(() => {});

  return fresh;
}

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(
  api: string,
  limit: number,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowKey = `${CACHE_KEYS.RATE_LIMIT(api)}:${Math.floor(now / (windowSeconds * 1000))}`;

  try {
    const current = await redis.incr(windowKey);

    // Set expiry on first request in window
    if (current === 1) {
      await redis.expire(windowKey, windowSeconds);
    }

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetAt: Math.ceil(now / (windowSeconds * 1000)) * windowSeconds * 1000,
    };
  } catch (error) {
    console.error(`Rate limit check error for ${api}:`, error);
    // Allow on error to prevent blocking
    return { allowed: true, remaining: limit, resetAt: now + windowSeconds * 1000 };
  }
}

// ============================================
// HEALTH CHECK
// ============================================

export async function checkRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
