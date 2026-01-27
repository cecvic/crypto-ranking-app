// API: Get tokens ranked by activity score
// Returns tokens with activity metrics and scores, sorted by activity score
// Cache-first with database fallback

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCached, setCached } from '@/lib/cache/redis';
import { getTokensByActivityScore } from '@/lib/db/birdeye-queries';
import { BIRDEYE_CHAINS, BirdeyeChain } from '@/lib/apis/birdeye';
import { BirdeyeTokenRow } from '@/lib/db/schema';

// Cache TTL: 2 minutes (activity data refreshes every 30 min, but allow frequent reads)
const CACHE_TTL = 120;

interface ActivityRankedToken {
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
  activityScore: number | null;
  opportunityScore: number | null;
  trade24h: number | null;
  uniqueWallet24h: number | null;
}

function formatToken(row: BirdeyeTokenRow): ActivityRankedToken {
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
    activityScore: row.activityScore ? parseFloat(row.activityScore) : null,
    opportunityScore: row.opportunityScore ? parseFloat(row.opportunityScore) : null,
    trade24h: row.trade24h,
    uniqueWallet24h: row.uniqueWallet24h,
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
    const chain = searchParams.get('chain') as BirdeyeChain | null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');
    const skipCache = searchParams.get('nocache') === 'true' && process.env.NODE_ENV !== 'production';

    // Validate chain if provided
    if (chain && !Object.keys(BIRDEYE_CHAINS).includes(chain)) {
      return NextResponse.json({
        error: 'Invalid chain',
        validChains: Object.keys(BIRDEYE_CHAINS),
      }, { status: 400 });
    }

    // Build cache key based on params
    const cacheKey = `tokens:activity:${chain || 'all'}:${limit}:${offset}`;

    // Try cache first (unless skipCache is set)
    if (!skipCache) {
      const cached = await getCached<ActivityRankedToken[]>(cacheKey);
      if (cached) {
        return NextResponse.json({
          data: cached,
          count: cached.length,
          cached: true,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Fetch from database
    const tokens = await getTokensByActivityScore({
      chain: chain || undefined,
      limit,
      offset,
    });

    const formattedTokens = tokens.map(formatToken);

    // Cache result
    await setCached(cacheKey, formattedTokens, CACHE_TTL);

    return NextResponse.json({
      data: formattedTokens,
      count: formattedTokens.length,
      cached: false,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[API /tokens/activity] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch activity-ranked tokens'
    }, { status: 500 });
  }
}
