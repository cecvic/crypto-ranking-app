// Cron: Seed Birdeye token registry
// Schedule: Daily at 4 AM UTC
// Purpose: Populate/refresh token registry from Birdeye rankings

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequestWithDevBypass } from '@/lib/qstash/verify';
import { BIRDEYE_CHAINS, BirdeyeChain } from '@/lib/apis/birdeye';
import { seedTokensFromBirdeye, getTokenCountByChain } from '@/lib/db/birdeye-queries';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter/distributed';

// Route config for extended timeout
export const maxDuration = 60;

// Tokens to seed per chain (Birdeye API max is 50 per request)
const TOKENS_PER_CHAIN = 50;

// Chains in priority order
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

async function handler(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  console.log('[seed-birdeye] Starting token registry seeding...');
  console.log('[seed-birdeye] BIRDEYE_API_KEY exists:', !!process.env.BIRDEYE_API_KEY, 'length:', process.env.BIRDEYE_API_KEY?.length ?? 0);

  const results: Record<string, { added: number; updated: number; error?: string }> = {};
  let totalAdded = 0;
  let totalUpdated = 0;

  try {
    // Get initial token counts
    const initialCounts = await getTokenCountByChain();
    console.log('[seed-birdeye] Initial token counts:', initialCounts);

    // Seed each chain sequentially
    for (const chain of CHAIN_PRIORITY) {
      // Check rate limit before each chain
      const rateCheck = await checkRateLimit(RATE_LIMITS.BIRDEYE_ACCOUNT);
      if (!rateCheck.allowed) {
        console.log(`[seed-birdeye] Rate limit hit at chain ${chain}, waiting...`);
        // Wait for reset and continue (seeding is less time-sensitive)
        const waitTime = rateCheck.resetAt - Date.now();
        if (waitTime > 0 && waitTime < 65000) { // Max wait 65s to stay under timeout
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          results[chain] = { added: 0, updated: 0, error: 'Rate limit, skipped' };
          continue;
        }
      }

      try {
        console.log(`[seed-birdeye] Seeding ${chain}...`);
        const result = await seedTokensFromBirdeye(chain, TOKENS_PER_CHAIN);
        results[chain] = result;
        totalAdded += result.added;
        totalUpdated += result.updated;
        console.log(`[seed-birdeye] ${chain}: added=${result.added}, updated=${result.updated}`);

        // Delay between chains to spread rate limit usage
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[seed-birdeye] Error seeding ${chain}:`, error);
        results[chain] = { added: 0, updated: 0, error: errorMessage };
      }
    }

    // Get final token counts
    const finalCounts = await getTokenCountByChain();

    const duration = Date.now() - startTime;
    console.log(`[seed-birdeye] Completed in ${duration}ms: added=${totalAdded}, updated=${totalUpdated}`);

    return NextResponse.json({
      success: true,
      totalAdded,
      totalUpdated,
      results,
      tokenCounts: {
        before: initialCounts,
        after: finalCounts,
      },
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[seed-birdeye] Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export const POST = verifyCronRequestWithDevBypass(handler);

// Allow GET for local testing and manual trigger
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  return handler(req);
}
