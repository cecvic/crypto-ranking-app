// Cron: Poll Birdeye prices for all chains
// Schedule: Every 15 minutes
// Purpose: Fetch multi-chain token prices using multi_price endpoint

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequestWithDevBypass } from '@/lib/qstash/verify';
import { getMultiPrice, BirdeyeChain } from '@/lib/apis/birdeye';
import { getTokenAddresses, updateTokenPrices } from '@/lib/db/birdeye-queries';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter/distributed';
import { getRedis, setCached, CACHE_KEYS, CACHE_TTL, getBirdeyeDynamicTTL } from '@/lib/cache/redis';

// Route config for extended timeout
export const maxDuration = 60; // 60 seconds max (Vercel free tier limit)

// Chains to poll in priority order (highest volume first)
const CHAIN_PRIORITY: BirdeyeChain[] = [
  'solana',
  'ethereum',
  'base',
  'arbitrum',
  'bsc',
  'polygon',
  'optimism',
  'avalanche',
  'zksync',
  'sui',
  'aptos',
];

// Tokens per chain (balance coverage vs rate limits)
const TOKENS_PER_CHAIN = 100;

async function handler(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  console.log('[poll-birdeye] Starting multi-chain price polling...');

  const results: Record<string, { tokens: number; updated: number; error?: string }> = {};
  let totalTokens = 0;
  let totalUpdated = 0;
  let chainsPolled = 0;

  try {
    // Check initial rate limit headroom
    const initialStatus = await checkRateLimit(RATE_LIMITS.BIRDEYE_ACCOUNT);
    const headroomPercent = (initialStatus.remaining / RATE_LIMITS.BIRDEYE_ACCOUNT.limit) * 100;
    console.log(`[poll-birdeye] Initial rate limit headroom: ${headroomPercent.toFixed(1)}%`);

    // If headroom is very low, skip this run
    if (headroomPercent < 10) {
      console.log('[poll-birdeye] Rate limit headroom too low, skipping run');
      return NextResponse.json({
        success: false,
        error: 'Rate limit headroom too low',
        headroomPercent,
        resetAt: new Date(initialStatus.resetAt).toISOString(),
      }, { status: 429 });
    }

    // Adjust tokens per chain based on headroom
    let tokensPerChain = TOKENS_PER_CHAIN;
    if (headroomPercent < 30) {
      tokensPerChain = 50; // Reduce coverage when tight
      console.log(`[poll-birdeye] Reducing to ${tokensPerChain} tokens per chain due to rate limits`);
    }

    // Poll chains sequentially to manage rate limits
    for (const chain of CHAIN_PRIORITY) {
      // Check rate limit before each chain
      const rateCheck = await checkRateLimit(RATE_LIMITS.BIRDEYE_ACCOUNT);
      if (!rateCheck.allowed) {
        console.log(`[poll-birdeye] Rate limit hit at chain ${chain}, stopping`);
        results[chain] = { tokens: 0, updated: 0, error: 'Rate limited' };
        break;
      }

      try {
        // Get token addresses for this chain
        const addresses = await getTokenAddresses(chain, tokensPerChain);

        if (addresses.length === 0) {
          console.log(`[poll-birdeye] No tokens registered for ${chain}, skipping`);
          results[chain] = { tokens: 0, updated: 0, error: 'No tokens registered' };
          continue;
        }

        // Fetch prices in batches of 100 (API limit)
        const priceData = await getMultiPrice(addresses, chain);

        if (priceData.size === 0) {
          console.log(`[poll-birdeye] No price data returned for ${chain}`);
          results[chain] = { tokens: addresses.length, updated: 0, error: 'No price data' };
          continue;
        }

        // Map priceData to match updateTokenPrices expected format (volume24hUSD -> volume24h)
        const priceDataForDb = new Map<string, { price: number; priceChange24h: number; volume24h: number; liquidity: number }>();
        for (const [address, data] of priceData) {
          priceDataForDb.set(address, {
            price: data.price,
            priceChange24h: data.priceChange24h,
            volume24h: data.volume24hUSD,
            liquidity: data.liquidity,
          });
        }

        // Update database
        const updated = await updateTokenPrices(chain, priceDataForDb);

        // Cache in Redis
        const dynamicTTL = getBirdeyeDynamicTTL((rateCheck.remaining / RATE_LIMITS.BIRDEYE_ACCOUNT.limit) * 100);
        await setCached(
          CACHE_KEYS.BIRDEYE_PRICES_CHAIN(chain),
          Object.fromEntries(priceData),
          dynamicTTL
        );

        results[chain] = { tokens: addresses.length, updated };
        totalTokens += addresses.length;
        totalUpdated += updated;
        chainsPolled++;

        console.log(`[poll-birdeye] ${chain}: ${updated}/${addresses.length} tokens updated`);

        // Small delay between chains to spread rate limit usage
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[poll-birdeye] Error polling ${chain}:`, error);
        results[chain] = { tokens: 0, updated: 0, error: errorMessage };
      }
    }

    // Aggregate all chain data into PRICES_ALL cache
    const redis = getRedis();
    const allPrices: Record<string, unknown> = {};
    for (const chain of CHAIN_PRIORITY) {
      const chainPrices = await redis.get(CACHE_KEYS.BIRDEYE_PRICES_CHAIN(chain));
      if (chainPrices) {
        allPrices[chain] = chainPrices;
      }
    }
    await setCached(CACHE_KEYS.BIRDEYE_PRICES_ALL, allPrices, CACHE_TTL.BIRDEYE_PRICES);

    const duration = Date.now() - startTime;
    console.log(`[poll-birdeye] Completed in ${duration}ms: ${chainsPolled} chains, ${totalUpdated}/${totalTokens} tokens`);

    return NextResponse.json({
      success: true,
      chainsPolled,
      totalTokens,
      totalUpdated,
      results,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[poll-birdeye] Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export const POST = verifyCronRequestWithDevBypass(handler);

// Allow GET for local testing
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  return handler(req);
}
