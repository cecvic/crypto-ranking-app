// Cron: Fetch activity data and compute scores for all chains
// Schedule: Every 30 minutes
// Purpose: Fetch Token Overview data, compute activity/opportunity scores, update DB

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequestWithDevBypass } from '@/lib/qstash/verify';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter/distributed';
import { getTokenOverview, BIRDEYE_CHAINS, BirdeyeChain } from '@/lib/apis/birdeye';
import { getTokensForScoring, updateTokenActivity, getTokenAddresses } from '@/lib/db/birdeye-queries';
import { buildPercentileLookup, type TokenWithMetrics } from '@/lib/scoring/normalizers';
import { calculateActivityScore } from '@/lib/scoring/activity-score';
import { calculateOpportunityScore } from '@/lib/scoring/opportunity-score';

// Route config for extended timeout
export const maxDuration = 300; // 5 minutes max

// Chains to process in priority order (highest volume first)
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

// Tokens per chain to fetch activity data for
const TOKENS_PER_CHAIN = 50;

// Delay between API calls (ms)
const API_DELAY_MS = 100;

// Helper to delay between API calls
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ChainResult {
  tokens: number;
  updated: number;
  errors: number;
  error?: string;
}

async function handler(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  console.log('[fetch-activity] Starting activity data fetching...');

  const results: Record<string, ChainResult> = {};
  let totalTokens = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  let chainsProcessed = 0;

  try {
    // Check initial rate limit headroom
    const initialStatus = await checkRateLimit(RATE_LIMITS.BIRDEYE_ACCOUNT);
    const headroomPercent = (initialStatus.remaining / RATE_LIMITS.BIRDEYE_ACCOUNT.limit) * 100;
    console.log(`[fetch-activity] Initial rate limit headroom: ${headroomPercent.toFixed(1)}%`);

    // If headroom is very low, skip this run
    if (headroomPercent < 10) {
      console.log('[fetch-activity] Rate limit headroom too low, skipping run');
      return NextResponse.json({
        success: false,
        error: 'Rate limit headroom too low',
        headroomPercent,
        resetAt: new Date(initialStatus.resetAt).toISOString(),
      }, { status: 429 });
    }

    // Step 1: Get all tokens for building percentile lookup
    console.log('[fetch-activity] Loading tokens for percentile lookup...');
    const allTokensRaw = await getTokensForScoring(undefined, 5000);

    // Convert to TokenWithMetrics format for buildPercentileLookup
    const allTokens: TokenWithMetrics[] = allTokensRaw.map(t => ({
      volume24h: t.volume24h ? parseFloat(t.volume24h) : null,
      trade24h: t.trade24h,
      uniqueWallet24h: t.uniqueWallet24h,
      liquidity: t.liquidity ? parseFloat(t.liquidity) : null,
    }));

    console.log(`[fetch-activity] Loaded ${allTokens.length} tokens for percentile calculation`);

    // Step 2: Build percentile lookup from all tokens
    const percentiles = buildPercentileLookup(allTokens);
    console.log(`[fetch-activity] Percentile arrays built: volume=${percentiles.volume24h.length}, trade=${percentiles.trade24h.length}, wallet=${percentiles.uniqueWallet24h.length}, liquidity=${percentiles.liquidity.length}`);

    // Step 3: Process each chain sequentially
    for (const chain of CHAIN_PRIORITY) {
      // Check rate limit before each chain
      const rateCheck = await checkRateLimit(RATE_LIMITS.BIRDEYE_ACCOUNT);
      if (!rateCheck.allowed) {
        console.log(`[fetch-activity] Rate limit hit at chain ${chain}, stopping`);
        results[chain] = { tokens: 0, updated: 0, errors: 0, error: 'Rate limited' };
        break;
      }

      const chainResult: ChainResult = { tokens: 0, updated: 0, errors: 0 };

      try {
        // Get token addresses for this chain (top by volume from DB)
        const addresses = await getTokenAddresses(chain, TOKENS_PER_CHAIN);
        chainResult.tokens = addresses.length;

        if (addresses.length === 0) {
          console.log(`[fetch-activity] No tokens registered for ${chain}, skipping`);
          results[chain] = chainResult;
          continue;
        }

        console.log(`[fetch-activity] Fetching activity for ${chain}: ${addresses.length} tokens...`);

        // Process each token
        for (let i = 0; i < addresses.length; i++) {
          const address = addresses[i];

          try {
            // Fetch token overview with activity metrics
            const overview = await getTokenOverview(address, chain);

            if (!overview) {
              chainResult.errors++;
              continue;
            }

            // Calculate activity score
            const activityMetrics = {
              volume24h: overview.volume24h,
              trade24h: overview.trade24h,
              uniqueWallet24h: overview.uniqueWallet24h,
              buy24h: overview.buy24h,
              sell24h: overview.sell24h,
              priceChange24h: overview.priceChange24h,
            };

            const activityScore = calculateActivityScore(activityMetrics, percentiles);

            // Calculate opportunity score
            const opportunityScore = calculateOpportunityScore(
              activityScore,
              overview.liquidity,
              overview.volume24h,
              percentiles
            );

            // Update token in database
            await updateTokenActivity(chain, address, {
              trade24h: overview.trade24h,
              uniqueWallet24h: overview.uniqueWallet24h,
              buy24h: overview.buy24h,
              sell24h: overview.sell24h,
              activityScore: activityScore.total,
              opportunityScore: opportunityScore.total,
            });

            chainResult.updated++;
            totalUpdated++;

            // Log progress every 10 tokens
            if ((i + 1) % 10 === 0) {
              console.log(`[fetch-activity] ${chain}: ${i + 1}/${addresses.length} tokens processed`);
            }

          } catch (tokenError) {
            console.error(`[fetch-activity] Error processing ${chain}:${address}:`, tokenError);
            chainResult.errors++;
            totalErrors++;
            // Continue to next token
          }

          // Add delay between API calls
          if (i < addresses.length - 1) {
            await delay(API_DELAY_MS);
          }
        }

        totalTokens += chainResult.tokens;
        chainsProcessed++;
        results[chain] = chainResult;

        console.log(`[fetch-activity] ${chain}: ${chainResult.updated}/${chainResult.tokens} tokens updated, ${chainResult.errors} errors`);

        // Add delay between chains
        await delay(API_DELAY_MS * 2);

      } catch (chainError) {
        const errorMessage = chainError instanceof Error ? chainError.message : 'Unknown error';
        console.error(`[fetch-activity] Error processing ${chain}:`, chainError);
        results[chain] = { ...chainResult, error: errorMessage };
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[fetch-activity] Completed in ${duration}ms: ${chainsProcessed} chains, ${totalUpdated}/${totalTokens} tokens, ${totalErrors} errors`);

    return NextResponse.json({
      success: true,
      chainsProcessed,
      totalTokens,
      totalUpdated,
      totalErrors,
      results,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[fetch-activity] Error:', error);

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
