/**
 * Trending tokens API endpoint
 * Returns cached trending tokens from CoinGecko
 */

import { getCachedOrFetch, CACHE_TTL } from '@/lib/cache/redis';
import { fetchCoinGeckoTrending } from '@/lib/apis/free-data-sources';

export async function GET() {
  try {
    const data = await getCachedOrFetch(
      'trending:coins',
      async () => {
        const trending = await fetchCoinGeckoTrending();
        return {
          coins: trending.coins.map((c) => ({
            id: c.id,
            symbol: c.symbol.toUpperCase(),
            name: c.name,
            market_cap_rank: c.marketCapRank,
          })),
          cached_at: new Date().toISOString(),
        };
      },
      CACHE_TTL.PRICES // 2 minutes TTL
    );

    return Response.json(data);
  } catch (error) {
    console.error('Failed to fetch trending:', error);
    // Return empty data on error - client will use fallback prompts
    return Response.json({ coins: [], cached_at: new Date().toISOString() });
  }
}
