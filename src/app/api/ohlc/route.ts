/**
 * OHLC data API endpoint
 * Returns cached OHLC candles for direct chart data fetching
 */

import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';
import { getCoinChart } from '@/lib/apis/coingecko';
import { generateAnnotations, calculateSwingAnalysis } from '@/lib/crypto/swing-analysis';
import type { OHLCCandle, CachedOHLC } from '@/lib/types/ai';

/**
 * Determine OHLC granularity based on days (CoinGecko auto-selects)
 */
function getGranularity(days: number): '30m' | '4h' | '4d' {
  if (days === 1) return '30m';
  if (days <= 30) return '4h';
  return '4d';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get('tokenId');
  const daysParam = searchParams.get('days');

  if (!tokenId) {
    return Response.json({ error: 'tokenId parameter is required' }, { status: 400 });
  }

  const days = daysParam ? parseInt(daysParam, 10) : 7;

  // Validate days parameter
  const validDays = [1, 7, 14, 30, 90, 180, 365];
  if (!validDays.includes(days)) {
    return Response.json(
      { error: `Invalid days parameter. Must be one of: ${validDays.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const cacheKey = CACHE_KEYS.OHLC(tokenId, days);

    const data = await getCachedOrFetch<CachedOHLC>(
      cacheKey,
      async () => {
        // Fetch fresh OHLC from CoinGecko
        const candles = await getCoinChart(tokenId, days);

        return {
          candles: candles as OHLCCandle[],
          granularity: getGranularity(days),
          tokenId,
          days,
          cached_at: new Date().toISOString(),
        };
      },
      CACHE_TTL.OHLC
    );

    // Generate swing annotations and analysis
    const annotations = generateAnnotations(data.candles);
    const swingAnalysis = calculateSwingAnalysis(data.candles);

    return Response.json({
      ...data,
      annotations,
      swingAnalysis,
    });
  } catch (error) {
    console.error('Failed to fetch OHLC data:', error);
    return Response.json({ error: 'Failed to fetch OHLC data' }, { status: 500 });
  }
}
