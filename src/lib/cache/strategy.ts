// Cache-Aside Strategy Implementation
// L1: Redis (fast, limited)
// L2: PostgreSQL (slower, persistent)

import {
  getCached,
  setCached,
  CACHE_KEYS,
  CACHE_TTL,
  checkRedisConnection,
} from './redis';
import {
  getLatestRankingsWithTimestamp,
  createSnapshot,
  getCachedData,
  setCachedData,
} from '../db/queries';
import { CoinRanking, FearGreedIndex } from '@/lib/types';

// ============================================
// RANKINGS CACHE
// ============================================

interface CachedRankings {
  rankings: CoinRanking[];
  timestamp: string;
  fearGreed?: FearGreedIndex;
}

export async function getCachedRankings(): Promise<CachedRankings | null> {
  // L1: Try Redis first
  const redisData = await getCached<CachedRankings>(CACHE_KEYS.RANKINGS_LATEST);
  if (redisData) {
    return redisData;
  }

  // L2: Fallback to PostgreSQL
  try {
    const { rankings, snapshotTime } = await getLatestRankingsWithTimestamp();
    if (rankings.length > 0) {
      // Use the REAL snapshot timestamp, not now — prevents stale DB data
      // from being treated as fresh and blocking new CoinGecko fetches
      const timestamp = snapshotTime
        ? snapshotTime.toISOString()
        : rankings[0].updatedAt;

      const data: CachedRankings = { rankings, timestamp };

      // Only warm Redis if data is reasonably recent (< 10 min)
      const ageMs = Date.now() - new Date(timestamp).getTime();
      if (ageMs < 600_000) {
        await setCached(CACHE_KEYS.RANKINGS_LATEST, data, CACHE_TTL.RANKINGS_LATEST);
      }

      return data;
    }
  } catch (error) {
    console.error('PostgreSQL fallback error:', error);
  }

  return null;
}

export async function setCachedRankings(
  rankings: CoinRanking[],
  fearGreed: FearGreedIndex
): Promise<void> {
  const data: CachedRankings = {
    rankings,
    timestamp: new Date().toISOString(),
    fearGreed,
  };

  // L1: Update Redis (fast, fire-and-forget)
  setCached(CACHE_KEYS.RANKINGS_LATEST, data, CACHE_TTL.RANKINGS_LATEST).catch(
    (error) => console.error('Redis cache update failed:', error)
  );

  // L2: Persist to PostgreSQL (important for history)
  try {
    await createSnapshot(rankings, fearGreed);
  } catch (error) {
    console.error('PostgreSQL snapshot creation failed:', error);
  }
}

// ============================================
// SINGLE COIN CACHE
// ============================================

export async function getCachedCoin(coinId: string): Promise<CoinRanking | null> {
  const key = CACHE_KEYS.RANKINGS_COIN(coinId);

  // L1: Try Redis
  const cached = await getCached<CoinRanking>(key);
  if (cached) {
    return cached;
  }

  // L2: Get from full rankings (in PostgreSQL)
  const { rankings } = await getCachedRankings() || { rankings: [] };
  const coin = rankings.find((r) => r.coin.id === coinId);

  if (coin) {
    // Warm Redis for this coin
    await setCached(key, coin, CACHE_TTL.RANKINGS_COIN);
    return coin;
  }

  return null;
}

// ============================================
// FEAR & GREED CACHE
// ============================================

export async function getCachedFearGreed(): Promise<FearGreedIndex | null> {
  // L1: Try Redis
  const cached = await getCached<FearGreedIndex>(CACHE_KEYS.FEAR_GREED);
  if (cached) {
    return cached;
  }

  // L2: Try PostgreSQL cache
  const pgCached = await getCachedData<FearGreedIndex>('fear_greed');
  if (pgCached) {
    // Warm Redis
    await setCached(CACHE_KEYS.FEAR_GREED, pgCached, CACHE_TTL.FEAR_GREED);
    return pgCached;
  }

  return null;
}

export async function setCachedFearGreed(data: FearGreedIndex): Promise<void> {
  // L1: Redis
  await setCached(CACHE_KEYS.FEAR_GREED, data, CACHE_TTL.FEAR_GREED);

  // L2: PostgreSQL (longer TTL)
  await setCachedData('fear_greed', data, 'alternative', CACHE_TTL.FEAR_GREED * 2);
}

// ============================================
// GENERIC API CACHE (for expensive calls)
// ============================================

export async function getApiCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  // L1: Try Redis
  const redisCached = await getCached<T>(`api:${key}`);
  if (redisCached) {
    return redisCached;
  }

  // L2: Try PostgreSQL
  const pgCached = await getCachedData<T>(key);
  if (pgCached) {
    // Warm Redis
    await setCached(`api:${key}`, pgCached, ttlSeconds);
    return pgCached;
  }

  // Fetch fresh
  const fresh = await fetcher();

  // Update both caches
  await Promise.all([
    setCached(`api:${key}`, fresh, ttlSeconds),
    setCachedData(key, fresh, 'api', ttlSeconds * 2),
  ]);

  return fresh;
}

// ============================================
// CACHE HEALTH
// ============================================

export interface CacheHealth {
  redis: boolean;
  postgres: boolean;
  degraded: boolean;
}

export async function checkCacheHealth(): Promise<CacheHealth> {
  const [redisOk, postgresOk] = await Promise.all([
    checkRedisConnection(),
    // Simple check - if we can get cached rankings, postgres is working
    getLatestRankingsWithTimestamp()
      .then((r) => r.rankings.length >= 0)
      .catch(() => false),
  ]);

  return {
    redis: redisOk,
    postgres: postgresOk,
    degraded: !redisOk || !postgresOk,
  };
}
