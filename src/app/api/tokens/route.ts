// API: Get all Birdeye tokens across chains
// Cache-first with database fallback

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';
import { getAllTokens, getTokensByChain } from '@/lib/db/birdeye-queries';
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
}

function formatToken(row: BirdeyeTokenRow): TokenResponse {
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

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const sortBy = (searchParams.get('sortBy') || 'marketCap') as 'marketCap' | 'volume24h';
    const chain = searchParams.get('chain') as BirdeyeChain | null;
    const skipCache = searchParams.get('nocache') === 'true' && process.env.NODE_ENV !== 'production';

    // Validate chain if provided
    if (chain && !Object.keys(BIRDEYE_CHAINS).includes(chain)) {
      return NextResponse.json({
        error: 'Invalid chain',
        validChains: Object.keys(BIRDEYE_CHAINS),
      }, { status: 400 });
    }

    // Build cache key based on params
    const cacheKey = chain
      ? `${CACHE_KEYS.BIRDEYE_PRICES_CHAIN(chain)}:list:${limit}:${sortBy}`
      : `${CACHE_KEYS.BIRDEYE_PRICES_ALL}:list:${limit}:${sortBy}`;

    // Try cache first (unless skipCache is set)
    if (!skipCache) {
      const cached = await getCached<TokenResponse[]>(cacheKey);
      if (cached) {
        return NextResponse.json({
          data: cached,
          cached: true,
          chain: chain || 'all',
          count: cached.length,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Fetch from database
    const tokens = chain
      ? await getTokensByChain(chain, limit, sortBy)
      : await getAllTokens(limit, sortBy);

    const formattedTokens = tokens.map(formatToken);

    // Cache result
    await setCached(cacheKey, formattedTokens, CACHE_TTL.BIRDEYE_PRICES);

    return NextResponse.json({
      data: formattedTokens,
      cached: false,
      chain: chain || 'all',
      count: formattedTokens.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[API /tokens] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch tokens'
    }, { status: 500 });
  }
}
