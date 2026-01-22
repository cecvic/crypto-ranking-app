// Distributed Rate Limiter using Redis
// Ensures rate limits are respected across multiple instances

import { getRedis } from '@/lib/cache/redis';

export interface RateLimitConfig {
  key: string;
  limit: number;
  window: number; // seconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  current: number;
}

// Pre-configured rate limits for external APIs
export const RATE_LIMITS = {
  COINGECKO: {
    key: 'ratelimit:coingecko',
    limit: 10,      // 10 requests per minute (conservative for free tier)
    window: 60,
  },
  COINGECKO_PRO: {
    key: 'ratelimit:coingecko',
    limit: 500,     // Pro tier
    window: 60,
  },
  LUNARCRUSH: {
    key: 'ratelimit:lunarcrush',
    limit: 40,      // ~1000/day = ~40/hour
    window: 3600,
  },
  TAAPI: {
    key: 'ratelimit:taapi',
    limit: 1,       // 1 request per 15 seconds
    window: 15,
  },
  CRYPTOPANIC: {
    key: 'ratelimit:cryptopanic',
    limit: 40,      // ~1000/day = ~40/hour
    window: 3600,
  },
  WHALE_ALERT: {
    key: 'ratelimit:whalealert',
    limit: 10,      // 10 per minute
    window: 60,
  },
  // DEPRECATED: Use BIRDEYE_ACCOUNT for new code. This key is retained for backward
  // compatibility with existing code that may reference it.
  BIRDEYE: {
    key: 'ratelimit:birdeye',
    limit: 100,     // 100 per minute (free tier)
    window: 60,
  },
  // Account-level Birdeye rate limit - ALL Birdeye API calls (price, trending,
  // security, trades, multi_price) consume from this shared pool
  BIRDEYE_ACCOUNT: {
    key: 'ratelimit:birdeye:account',
    limit: 100,     // Account-level: 100 requests per minute (free tier)
    window: 60,
  },
  DEXSCREENER: {
    key: 'ratelimit:dexscreener',
    limit: 300,     // 300 per minute
    window: 60,
  },
} as const;

/**
 * Check if a request is allowed under the rate limit
 * Uses sliding window counter algorithm
 */
export async function checkRateLimit(
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedis();
  const now = Date.now();
  const windowStart = Math.floor(now / (config.window * 1000));
  const windowKey = `${config.key}:${windowStart}`;

  // Increment counter for current window
  const current = await redis.incr(windowKey);

  // Set expiry if this is the first request in the window
  if (current === 1) {
    await redis.expire(windowKey, config.window);
  }

  const resetAt = (windowStart + 1) * config.window * 1000;

  return {
    allowed: current <= config.limit,
    remaining: Math.max(0, config.limit - current),
    resetAt,
    current,
  };
}

/**
 * Wait until rate limit allows a request
 * Returns the wait time in milliseconds (0 if allowed immediately)
 */
export async function waitForRateLimit(
  config: RateLimitConfig,
  maxWaitMs: number = 60000
): Promise<number> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const result = await checkRateLimit(config);

    if (result.allowed) {
      return Date.now() - startTime;
    }

    // Calculate wait time until next window
    const waitTime = Math.min(result.resetAt - Date.now(), maxWaitMs - (Date.now() - startTime));

    if (waitTime <= 0) {
      break;
    }

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  // Exceeded max wait time
  throw new Error(`Rate limit wait exceeded ${maxWaitMs}ms for ${config.key}`);
}

/**
 * Decorator to apply rate limiting to an async function
 */
export function withRateLimit<T>(
  config: RateLimitConfig,
  fn: () => Promise<T>
): () => Promise<T> {
  return async () => {
    await waitForRateLimit(config);
    return fn();
  };
}

/**
 * Batch requests respecting rate limits
 * Processes items in chunks with delays between chunks
 */
export async function batchWithRateLimit<T, R>(
  items: T[],
  config: RateLimitConfig,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const chunkSize = config.limit;

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);

    // Check rate limit before processing chunk
    const rateCheck = await checkRateLimit({
      ...config,
      limit: chunk.length,
    });

    if (!rateCheck.allowed) {
      // Wait until rate limit resets
      const waitTime = rateCheck.resetAt - Date.now();
      if (waitTime > 0) {
        console.log(`[RateLimit] Waiting ${waitTime}ms for ${config.key}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Process chunk in parallel
    const chunkResults = await Promise.all(chunk.map(processor));
    results.push(...chunkResults);

    // Small delay between chunks to be safe
    if (i + chunkSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Get current rate limit status for monitoring
 */
export async function getRateLimitStatus(
  configKey: keyof typeof RATE_LIMITS
): Promise<RateLimitResult & { configKey: string }> {
  const config = RATE_LIMITS[configKey];
  const result = await checkRateLimit(config);

  // Don't count the check request
  if (result.current > 0) {
    const redis = getRedis();
    const now = Date.now();
    const windowStart = Math.floor(now / (config.window * 1000));
    const windowKey = `${config.key}:${windowStart}`;
    await redis.decr(windowKey);
    result.current = Math.max(0, result.current - 1);
    result.remaining = Math.min(config.limit, result.remaining + 1);
  }

  return {
    ...result,
    configKey,
  };
}
