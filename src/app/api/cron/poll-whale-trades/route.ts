// Cron: Poll Birdeye whale trades for all chains
// Schedule: Every 15 minutes
// Purpose: Fetch large DEX trades and store aggregated metrics

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequestWithDevBypass } from '@/lib/qstash/verify';
import { getWhaleTrades, aggregateWhaleTrades, BirdeyeChain } from '@/lib/apis/birdeye';
import { getTokenAddresses } from '@/lib/db/birdeye-queries';
import { batchUpsertWhaleMetrics } from '@/lib/db/birdeye-whale-queries';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter/distributed';
import { calculateWhaleScore } from '@/lib/scoring/whale-score';

// Route config for extended timeout
export const maxDuration = 60; // 60 seconds max

// Whale trade threshold in USD
const WHALE_THRESHOLD_USD = 100000; // $100k minimum trade size

// Chains to poll in priority order
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

// Tokens per chain to poll for whale activity
const TOKENS_PER_CHAIN = 20; // Top tokens by volume

async function handler(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  console.log('[poll-whale-trades] Starting whale trade polling...');

  const results: Record<string, { tokens: number; updated: number; error?: string }> = {};
  let totalTokens = 0;
  let totalUpdated = 0;
  let chainsPolled = 0;

  try {
    // Check initial rate limit headroom
    const initialStatus = await checkRateLimit(RATE_LIMITS.BIRDEYE_ACCOUNT);
    const headroomPercent = (initialStatus.remaining / RATE_LIMITS.BIRDEYE_ACCOUNT.limit) * 100;
    console.log(`[poll-whale-trades] Initial rate limit headroom: ${headroomPercent.toFixed(1)}%`);

    // If headroom is low, skip this run (whale polling is lower priority than price polling)
    if (headroomPercent < 20) {
      console.log('[poll-whale-trades] Rate limit headroom too low, skipping run');
      return NextResponse.json({
        success: false,
        error: 'Rate limit headroom too low',
        headroomPercent,
        resetAt: new Date(initialStatus.resetAt).toISOString(),
      }, { status: 429 });
    }

    // Calculate 24h lookback window
    const now = Math.floor(Date.now() / 1000);
    const timeFrom = now - 24 * 60 * 60; // 24 hours ago

    // Poll chains sequentially to manage rate limits
    for (const chain of CHAIN_PRIORITY) {
      // Check rate limit before each chain
      const rateCheck = await checkRateLimit(RATE_LIMITS.BIRDEYE_ACCOUNT);
      if (!rateCheck.allowed) {
        console.log(`[poll-whale-trades] Rate limit hit at chain ${chain}, stopping`);
        results[chain] = { tokens: 0, updated: 0, error: 'Rate limited' };
        break;
      }

      try {
        // Get top tokens by volume for this chain
        const addresses = await getTokenAddresses(chain, TOKENS_PER_CHAIN);

        if (addresses.length === 0) {
          console.log(`[poll-whale-trades] No tokens registered for ${chain}, skipping`);
          results[chain] = { tokens: 0, updated: 0, error: 'No tokens registered' };
          continue;
        }

        // Fetch whale trades and aggregate metrics for each token
        const metricsMap = new Map<string, {
          buyVolume24h: number;
          sellVolume24h: number;
          buyCount24h: number;
          sellCount24h: number;
          netFlow24h: number;
          largestTrade24h: number;
          whaleScore: number;
        }>();

        for (const tokenAddress of addresses) {
          // Rate limit check per token (conservative)
          const tokenRateCheck = await checkRateLimit(RATE_LIMITS.BIRDEYE_ACCOUNT);
          if (!tokenRateCheck.allowed) {
            console.log(`[poll-whale-trades] Rate limit hit during ${chain} tokens, stopping chain`);
            break;
          }

          const trades = await getWhaleTrades(
            chain,
            tokenAddress,
            WHALE_THRESHOLD_USD,
            timeFrom,
            now
          );

          const aggregated = aggregateWhaleTrades(trades);
          const whaleScore = calculateWhaleScore(aggregated);

          metricsMap.set(tokenAddress, {
            ...aggregated,
            whaleScore,
          });

          // Small delay between tokens
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Batch upsert metrics to database
        const updated = await batchUpsertWhaleMetrics(chain, metricsMap);

        results[chain] = { tokens: addresses.length, updated };
        totalTokens += addresses.length;
        totalUpdated += updated;
        chainsPolled++;

        console.log(`[poll-whale-trades] ${chain}: ${updated}/${addresses.length} tokens updated`);

        // Delay between chains
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[poll-whale-trades] Error polling ${chain}:`, error);
        results[chain] = { tokens: 0, updated: 0, error: errorMessage };
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[poll-whale-trades] Completed in ${duration}ms: ${chainsPolled} chains, ${totalUpdated}/${totalTokens} tokens`);

    return NextResponse.json({
      success: true,
      chainsPolled,
      totalTokens,
      totalUpdated,
      whaleThresholdUsd: WHALE_THRESHOLD_USD,
      results,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[poll-whale-trades] Error:', error);

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
