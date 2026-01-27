// API: Get Birdeye tokens for a specific chain
// Cache-first with database fallback

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';
import { getTokensByChain } from '@/lib/db/birdeye-queries';
import { getWhaleMetricsByChain } from '@/lib/db/birdeye-whale-queries';
import { BIRDEYE_CHAINS, BirdeyeChain } from '@/lib/apis/birdeye';
import { BirdeyeTokenRow } from '@/lib/db/schema';

interface TokenResponse {
  address: string;
  chain: string;
  symbol: string;
  name: string;
  logoUri: string | null;
  price: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  liquidity: number | null;
  marketCap: number | null;
  lastFetchedAt: string | null;
  // Whale metrics
  whaleScore: number | null;
  netFlow24h: number | null;
  buyVolume24h: number | null;
  sellVolume24h: number | null;
}

function formatToken(row: BirdeyeTokenRow): Omit<TokenResponse, 'whaleScore' | 'netFlow24h' | 'buyVolume24h' | 'sellVolume24h'> {
  return {
    address: row.address,
    chain: row.chain,
    symbol: row.symbol,
    name: row.name,
    logoUri: row.logoUri,
    price: row.price ? parseFloat(row.price) : null,
    priceChange24h: row.priceChange24h ? parseFloat(row.priceChange24h) : null,
    volume24h: row.volume24h ? parseFloat(row.volume24h) : null,
    liquidity: row.liquidity ? parseFloat(row.liquidity) : null,
    marketCap: row.marketCap,
    lastFetchedAt: row.lastFetchedAt?.toISOString() || null,
  };
}

interface RouteContext {
  params: Promise<{ chain: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get chain from route params
    const { chain } = await context.params;

    // Validate chain
    if (!Object.keys(BIRDEYE_CHAINS).includes(chain)) {
      return NextResponse.json({
        error: 'Invalid chain',
        validChains: Object.keys(BIRDEYE_CHAINS),
      }, { status: 400 });
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const sortBy = (searchParams.get('sortBy') || 'marketCap') as 'marketCap' | 'volume24h';
    const skipCache = searchParams.get('nocache') === 'true' && process.env.NODE_ENV !== 'production';

    // Build cache key
    const cacheKey = `${CACHE_KEYS.BIRDEYE_PRICES_CHAIN(chain)}:list:${limit}:${sortBy}`;

    // Try cache first (unless skipCache is set)
    if (!skipCache) {
      const cached = await getCached<TokenResponse[]>(cacheKey);
      if (cached) {
        return NextResponse.json({
          data: cached,
          cached: true,
          chain,
          count: cached.length,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Fetch from database
    const tokens = await getTokensByChain(chain as BirdeyeChain, limit, sortBy);

    // Fetch whale metrics for this chain and merge
    const whaleMetrics = await getWhaleMetricsByChain(chain, limit);
    const whaleMetricsMap = new Map(
      whaleMetrics.map((m) => [m.tokenAddress, m])
    );

    // Merge whale metrics into token response
    const tokensWithWhale: TokenResponse[] = tokens.map((token) => {
      const formatted = formatToken(token);
      const whale = whaleMetricsMap.get(token.address);

      return {
        ...formatted,
        whaleScore: whale?.whaleScore ?? null,
        netFlow24h: whale?.netFlow24h ? parseFloat(whale.netFlow24h) : null,
        buyVolume24h: whale?.buyVolume24h ? parseFloat(whale.buyVolume24h) : null,
        sellVolume24h: whale?.sellVolume24h ? parseFloat(whale.sellVolume24h) : null,
      };
    });

    // Cache result
    await setCached(cacheKey, tokensWithWhale, CACHE_TTL.BIRDEYE_PRICES);

    return NextResponse.json({
      data: tokensWithWhale,
      cached: false,
      chain,
      count: tokensWithWhale.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[API /tokens/[chain]] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch tokens'
    }, { status: 500 });
  }
}
