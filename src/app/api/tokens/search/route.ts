// Search API endpoint for multi-chain token search
import { NextRequest, NextResponse } from 'next/server';
import { getDb, birdeyeTokens } from '@/lib/db/client';
import { searchAllChains, BirdeyeChain, BirdeyeSearchResult } from '@/lib/apis/birdeye';
import { getCached, setCached } from '@/lib/cache/redis';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter/distributed';
import { or, ilike, desc } from 'drizzle-orm';

// Search response types
interface SearchToken {
  address: string;
  symbol: string;
  name: string;
  logoUri: string | null;
  price: number | null;
  liquidity: number | null;
  volume24h: number | null;
}

interface ChainSearchResult {
  chain: string;
  tokens: SearchToken[];
}

interface SearchResponse {
  results: ChainSearchResult[];
  query: string;
  timestamp: string;
  fromCache?: boolean;
  localOnly?: boolean;
}

// Cache TTL for search results (5 minutes)
const SEARCH_CACHE_TTL = 300;

/**
 * Search tokens by name, symbol, or address across all chains
 *
 * Query params:
 * - q: Search query (required, min 2 characters)
 *
 * Response:
 * - results: Array of chain groups with matching tokens
 * - query: The search query
 * - timestamp: ISO timestamp
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    // Validate query
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    if (query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = `search:${normalizedQuery}`;

    // Check cache first
    const cached = await getCached<SearchResponse>(cacheKey);
    if (cached) {
      console.log(`[Search API] Cache hit for "${query}"`);
      return NextResponse.json({ ...cached, fromCache: true });
    }

    console.log(`[Search API] Cache miss for "${query}", fetching fresh data`);

    // 1. Search local database first (fast)
    const localResults = await searchLocalDb(normalizedQuery);
    console.log(`[Search API] Local DB returned ${localResults.size} chains with results`);

    // 2. Check rate limit before calling Birdeye API
    const rateCheck = await checkRateLimit(RATE_LIMITS.BIRDEYE_ACCOUNT);

    let apiResults: Record<BirdeyeChain, BirdeyeSearchResult[]> | null = null;
    let localOnly = false;

    if (rateCheck.allowed) {
      try {
        // Call Birdeye search across all chains
        apiResults = await searchAllChains(query);
        console.log(`[Search API] Birdeye API search complete`);
      } catch (error) {
        console.error('[Search API] Birdeye API error, using local results only:', error);
        localOnly = true;
      }
    } else {
      console.log(`[Search API] Rate limited, using local results only. Reset at ${new Date(rateCheck.resetAt).toISOString()}`);
      localOnly = true;
    }

    // 3. Merge and deduplicate results
    const mergedResults = mergeResults(localResults, apiResults);
    console.log(`[Search API] Merged results: ${mergedResults.length} chains`);

    const response: SearchResponse = {
      results: mergedResults,
      query,
      timestamp: new Date().toISOString(),
      localOnly,
    };

    // Cache the results
    await setCached(cacheKey, response, SEARCH_CACHE_TTL);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Search API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Search local database for tokens matching query
 */
async function searchLocalDb(query: string): Promise<Map<string, SearchToken[]>> {
  const results = new Map<string, SearchToken[]>();

  try {
    const db = getDb();
    const searchPattern = `%${query}%`;

    // Search by symbol or name (case-insensitive)
    const tokens = await db.select()
      .from(birdeyeTokens)
      .where(
        or(
          ilike(birdeyeTokens.symbol, searchPattern),
          ilike(birdeyeTokens.name, searchPattern)
        )
      )
      .orderBy(desc(birdeyeTokens.liquidity))
      .limit(100);

    // Group by chain
    for (const token of tokens) {
      const chain = token.chain;
      if (!results.has(chain)) {
        results.set(chain, []);
      }

      results.get(chain)!.push({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        logoUri: token.logoUri,
        price: token.price ? parseFloat(token.price) : null,
        liquidity: token.liquidity ? parseFloat(token.liquidity) : null,
        volume24h: token.volume24h ? parseFloat(token.volume24h) : null,
      });
    }
  } catch (error) {
    console.error('[Search API] Local DB search error:', error);
  }

  return results;
}

/**
 * Merge local DB results with Birdeye API results
 * Deduplicate by chain+address, prefer API data for freshness
 */
function mergeResults(
  localResults: Map<string, SearchToken[]>,
  apiResults: Record<BirdeyeChain, BirdeyeSearchResult[]> | null
): ChainSearchResult[] {
  // Use a map to track tokens by chain+address
  const tokenMap = new Map<string, { chain: string; token: SearchToken }>();

  // Add local results first
  for (const [chain, tokens] of localResults) {
    for (const token of tokens) {
      const key = `${chain}:${token.address}`;
      tokenMap.set(key, { chain, token });
    }
  }

  // Overlay API results (fresher data takes priority)
  if (apiResults) {
    for (const [chain, tokens] of Object.entries(apiResults)) {
      for (const apiToken of tokens) {
        const key = `${chain}:${apiToken.address}`;
        tokenMap.set(key, {
          chain,
          token: {
            address: apiToken.address,
            symbol: apiToken.symbol,
            name: apiToken.name,
            logoUri: apiToken.logoURI || null,
            price: apiToken.price ?? null,
            liquidity: apiToken.liquidity ?? null,
            volume24h: apiToken.volume24h ?? null,
          },
        });
      }
    }
  }

  // Group by chain and sort by liquidity within each chain
  const chainGroups = new Map<string, SearchToken[]>();
  for (const { chain, token } of tokenMap.values()) {
    if (!chainGroups.has(chain)) {
      chainGroups.set(chain, []);
    }
    chainGroups.get(chain)!.push(token);
  }

  // Sort tokens within each chain by liquidity DESC
  const results: ChainSearchResult[] = [];

  // Define chain order (major chains first)
  const chainOrder = [
    'solana', 'ethereum', 'base', 'arbitrum', 'bsc',
    'polygon', 'optimism', 'avalanche', 'zksync', 'sui', 'aptos'
  ];

  for (const chain of chainOrder) {
    const tokens = chainGroups.get(chain);
    if (tokens && tokens.length > 0) {
      // Sort by liquidity DESC (null liquidity goes to end)
      tokens.sort((a, b) => {
        if (a.liquidity === null && b.liquidity === null) return 0;
        if (a.liquidity === null) return 1;
        if (b.liquidity === null) return -1;
        return b.liquidity - a.liquidity;
      });

      results.push({
        chain,
        tokens: tokens.slice(0, 10), // Limit to top 10 per chain
      });
    }
  }

  // Add any chains not in the order (shouldn't happen but just in case)
  for (const [chain, tokens] of chainGroups) {
    if (!chainOrder.includes(chain) && tokens.length > 0) {
      tokens.sort((a, b) => {
        if (a.liquidity === null && b.liquidity === null) return 0;
        if (a.liquidity === null) return 1;
        if (b.liquidity === null) return -1;
        return b.liquidity - a.liquidity;
      });
      results.push({ chain, tokens: tokens.slice(0, 10) });
    }
  }

  return results;
}
