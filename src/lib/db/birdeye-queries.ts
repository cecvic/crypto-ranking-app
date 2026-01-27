// Database operations for Birdeye multi-chain token data
import { getDb } from './client';
import { birdeyeTokens, BirdeyeTokenRow, NewBirdeyeTokenRow } from './schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getTokenList, BirdeyeChain, BIRDEYE_CHAINS } from '@/lib/apis/birdeye';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter/distributed';

/**
 * Seed tokens for a chain from Birdeye token list
 * Fetches top tokens by market cap and upserts into database
 */
export async function seedTokensFromBirdeye(
  chain: BirdeyeChain,
  limit: number = 100
): Promise<{ added: number; updated: number }> {
  // Check rate limit before API call
  const rateCheck = await checkRateLimit(RATE_LIMITS.BIRDEYE_ACCOUNT);
  if (!rateCheck.allowed) {
    throw new Error(`Rate limited. Reset at ${new Date(rateCheck.resetAt).toISOString()}`);
  }

  const tokens = await getTokenList(chain, limit, 'v24hUSD'); // Sort by volume for legitimate tokens

  let added = 0;
  let updated = 0;

  for (const token of tokens) {
    const existing = await getDb().select()
      .from(birdeyeTokens)
      .where(and(
        eq(birdeyeTokens.chain, chain),
        eq(birdeyeTokens.address, token.address)
      ))
      .limit(1);

    if (existing.length === 0) {
      await getDb().insert(birdeyeTokens).values({
        address: token.address,
        chain: chain,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        logoUri: token.logoURI,
        price: token.price?.toString(),
        priceChange24h: token.priceChange24h?.toString(),
        volume24h: token.volume24hUSD?.toString(),
        liquidity: token.liquidity?.toString(),
        marketCap: token.mc ? Math.round(token.mc) : null, // bigint requires integer
        lastFetchedAt: new Date(),
      });
      added++;
    } else {
      await getDb().update(birdeyeTokens)
        .set({
          symbol: token.symbol,
          name: token.name,
          logoUri: token.logoURI,
          price: token.price?.toString(),
          priceChange24h: token.priceChange24h?.toString(),
          volume24h: token.volume24hUSD?.toString(),
          liquidity: token.liquidity?.toString(),
          marketCap: token.mc ? Math.round(token.mc) : null, // bigint requires integer
          lastFetchedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(birdeyeTokens.chain, chain),
          eq(birdeyeTokens.address, token.address)
        ));
      updated++;
    }
  }

  return { added, updated };
}

/**
 * Bulk update token prices from multi_price response
 */
export async function updateTokenPrices(
  chain: BirdeyeChain,
  priceData: Map<string, { price: number; priceChange24h: number; volume24h: number; liquidity: number }>
): Promise<number> {
  let updated = 0;

  for (const [address, data] of priceData) {
    await getDb().update(birdeyeTokens)
      .set({
        price: data.price?.toString(),
        priceChange24h: data.priceChange24h?.toString(),
        volume24h: data.volume24h?.toString(),
        liquidity: data.liquidity?.toString(),
        lastFetchedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(birdeyeTokens.chain, chain),
        eq(birdeyeTokens.address, address)
      ));

    updated++;
  }

  return updated;
}

/**
 * Get token addresses for a chain (for batching price fetches)
 */
export async function getTokenAddresses(
  chain: BirdeyeChain,
  limit: number = 100
): Promise<string[]> {
  const tokens = await getDb().select({ address: birdeyeTokens.address })
    .from(birdeyeTokens)
    .where(eq(birdeyeTokens.chain, chain))
    .orderBy(desc(birdeyeTokens.marketCap))
    .limit(limit);

  return tokens.map(t => t.address);
}

/**
 * Get tokens by chain with price data
 */
export async function getTokensByChain(
  chain: BirdeyeChain,
  limit: number = 100,
  sortBy: 'marketCap' | 'volume24h' = 'marketCap'
): Promise<BirdeyeTokenRow[]> {
  const orderColumn = sortBy === 'marketCap' ? birdeyeTokens.marketCap : birdeyeTokens.volume24h;

  return getDb().select()
    .from(birdeyeTokens)
    .where(eq(birdeyeTokens.chain, chain))
    .orderBy(desc(orderColumn))
    .limit(limit);
}

/**
 * Get all tokens across all chains
 */
export async function getAllTokens(
  limit: number = 500,
  sortBy: 'marketCap' | 'volume24h' = 'marketCap'
): Promise<BirdeyeTokenRow[]> {
  const orderColumn = sortBy === 'marketCap' ? birdeyeTokens.marketCap : birdeyeTokens.volume24h;

  return getDb().select()
    .from(birdeyeTokens)
    .orderBy(desc(orderColumn))
    .limit(limit);
}

/**
 * Get token count per chain
 */
export async function getTokenCountByChain(): Promise<Record<BirdeyeChain, number>> {
  const counts = await getDb().select({
    chain: birdeyeTokens.chain,
    count: sql<number>`count(*)::int`,
  })
    .from(birdeyeTokens)
    .groupBy(birdeyeTokens.chain);

  const result: Partial<Record<BirdeyeChain, number>> = {};
  for (const row of counts) {
    result[row.chain as BirdeyeChain] = row.count;
  }

  // Fill in zeros for chains with no tokens
  for (const chain of Object.keys(BIRDEYE_CHAINS)) {
    if (!(chain in result)) {
      result[chain as BirdeyeChain] = 0;
    }
  }

  return result as Record<BirdeyeChain, number>;
}

// ============================================
// ACTIVITY DATA OPERATIONS
// ============================================

/**
 * Data for updating token activity metrics
 */
export interface ActivityUpdateData {
  trade24h?: number | null;
  uniqueWallet24h?: number | null;
  buy24h?: number | null;
  sell24h?: number | null;
  activityScore?: number | null;
  opportunityScore?: number | null;
}

/**
 * Get tokens for scoring with metrics needed to build percentile lookups
 * Returns tokens sorted by volume24h DESC (prioritize active tokens)
 *
 * @param chain - Optional chain filter; if not provided, returns all chains
 * @param limit - Maximum tokens to return (default 500)
 */
export async function getTokensForScoring(
  chain?: BirdeyeChain,
  limit: number = 500
): Promise<Array<{
  address: string;
  chain: string;
  price: string | null;
  priceChange24h: string | null;
  volume24h: string | null;
  liquidity: string | null;
  trade24h: number | null;
  uniqueWallet24h: number | null;
  buy24h: number | null;
  sell24h: number | null;
}>> {
  const query = getDb().select({
    address: birdeyeTokens.address,
    chain: birdeyeTokens.chain,
    price: birdeyeTokens.price,
    priceChange24h: birdeyeTokens.priceChange24h,
    volume24h: birdeyeTokens.volume24h,
    liquidity: birdeyeTokens.liquidity,
    trade24h: birdeyeTokens.trade24h,
    uniqueWallet24h: birdeyeTokens.uniqueWallet24h,
    buy24h: birdeyeTokens.buy24h,
    sell24h: birdeyeTokens.sell24h,
  })
    .from(birdeyeTokens)
    .orderBy(desc(birdeyeTokens.volume24h))
    .limit(limit);

  if (chain) {
    return query.where(eq(birdeyeTokens.chain, chain));
  }

  return query;
}

/**
 * Update token activity metrics and scores
 * Uses existing pattern from updateTokenPrices
 *
 * @param chain - Token chain
 * @param address - Token address
 * @param data - Activity metrics and scores to update
 */
export async function updateTokenActivity(
  chain: BirdeyeChain,
  address: string,
  data: ActivityUpdateData
): Promise<void> {
  await getDb().update(birdeyeTokens)
    .set({
      trade24h: data.trade24h ?? undefined,
      uniqueWallet24h: data.uniqueWallet24h ?? undefined,
      buy24h: data.buy24h ?? undefined,
      sell24h: data.sell24h ?? undefined,
      activityScore: data.activityScore?.toString() ?? undefined,
      opportunityScore: data.opportunityScore?.toString() ?? undefined,
      lastFetchedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(
      eq(birdeyeTokens.chain, chain),
      eq(birdeyeTokens.address, address)
    ));
}

/**
 * Get tokens sorted by activity score for rankings
 * Returns tokens with all display-relevant fields
 *
 * @param options - Query options (chain filter, pagination)
 */
export async function getTokensByActivityScore(
  options: {
    chain?: BirdeyeChain;
    limit?: number;
    offset?: number;
  } = {}
): Promise<BirdeyeTokenRow[]> {
  const { chain, limit = 100, offset = 0 } = options;

  const query = getDb().select()
    .from(birdeyeTokens)
    .orderBy(sql`${birdeyeTokens.activityScore} DESC NULLS LAST`)
    .limit(limit)
    .offset(offset);

  if (chain) {
    return query.where(eq(birdeyeTokens.chain, chain));
  }

  return query;
}
