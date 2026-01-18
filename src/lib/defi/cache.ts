/**
 * Cache-aside pattern for DeFi protocol data
 * Uses Redis (Upstash) with TTL-based expiration
 */

import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';
import { fetchProtocols, fetchProtocol } from './defillama';
import type { DefiProtocol, CachedProtocols, CachedProtocol } from '@/lib/types/ai';

/**
 * Get top N protocols by TVL with cache-aside pattern
 * @param limit - Number of protocols to return (default 10)
 */
export async function getCachedProtocols(limit: number = 10): Promise<CachedProtocols> {
  const cacheKey = CACHE_KEYS.DEFI_PROTOCOLS(limit);

  return getCachedOrFetch<CachedProtocols>(
    cacheKey,
    async () => {
      // Cache miss - fetch from DefiLlama
      const protocols = await fetchProtocols();

      // Sort by TVL descending and slice to limit
      const sorted = protocols
        .filter((p) => p.tvl > 0) // Exclude protocols with 0 TVL
        .sort((a, b) => b.tvl - a.tvl)
        .slice(0, limit);

      return {
        protocols: sorted,
        cached_at: new Date().toISOString(),
      };
    },
    CACHE_TTL.DEFI_PROTOCOLS
  );
}

/**
 * Get single protocol by slug with cache-aside pattern
 * @param slug - Protocol slug (e.g., "aave", "uniswap", "lido")
 */
export async function getCachedProtocol(slug: string): Promise<CachedProtocol> {
  const cacheKey = CACHE_KEYS.DEFI_PROTOCOL(slug.toLowerCase());

  return getCachedOrFetch<CachedProtocol>(
    cacheKey,
    async () => {
      // Cache miss - fetch from DefiLlama
      const protocol = await fetchProtocol(slug);

      return {
        protocol,
        cached_at: new Date().toISOString(),
      };
    },
    CACHE_TTL.DEFI_PROTOCOL
  );
}
