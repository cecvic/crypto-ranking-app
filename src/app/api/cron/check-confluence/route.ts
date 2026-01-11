// Cron: Check Confluence & Send Alerts
// Schedule: Every 5 minutes
// Purpose: Detect coins with 4+/5 confluence and notify subscribed users

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequestWithDevBypass } from '@/lib/qstash/verify';
import { getRedis, CACHE_KEYS } from '@/lib/cache/redis';
import { CoinRanking } from '@/lib/types';
import { calculateConfluence, getTopConfluenceOpportunities } from '@/lib/confluence/calculator';
import {
  getActiveSubscriptions,
  hasRemainingAlerts,
  wasAlertSentRecently,
  logAlertSent,
  incrementAlertCount,
} from '@/lib/db/alert-queries';
import { sendConfluenceAlert, AlertCoin } from '@/lib/email/resend';

// Cache key for tracking last confluence check
const CONFLUENCE_LAST_CHECK_KEY = 'confluence:last_check';
const DEDUPLICATION_HOURS = 6;

interface ConfluenceOpportunity {
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  direction: 'bullish' | 'bearish';
  confluenceLevel: number;
  overallScore: number;
  factors: {
    sentiment: number;
    technical: number;
    whale: number;
    ai: number;
    price: number;
  };
}

async function handler(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  console.log('[check-confluence] Starting confluence check...');

  try {
    const redis = getRedis();

    // 1. Get cached rankings
    const cachedRankings = await redis.get<string>(CACHE_KEYS.RANKINGS_LATEST);
    if (!cachedRankings) {
      console.log('[check-confluence] No cached rankings found, skipping');
      return NextResponse.json({
        success: false,
        error: 'No rankings data available',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    const rankings: CoinRanking[] = typeof cachedRankings === 'string'
      ? JSON.parse(cachedRankings)
      : cachedRankings;

    console.log(`[check-confluence] Processing ${rankings.length} coins`);

    // 2. Find coins with 4+ confluence (both bullish and bearish)
    const bullishOpps = getTopConfluenceOpportunities(rankings, {
      direction: 'bullish',
      minAligned: 4,
      limit: 20,
    });

    const bearishOpps = getTopConfluenceOpportunities(rankings, {
      direction: 'bearish',
      minAligned: 4,
      limit: 20,
    });

    // Transform to simpler structure
    const currentOpportunities: ConfluenceOpportunity[] = [
      ...bullishOpps.map((opp) => ({
        coinId: opp.ranking.coin.id,
        symbol: opp.ranking.coin.symbol,
        name: opp.ranking.coin.name,
        image: opp.ranking.coin.image,
        direction: 'bullish' as const,
        confluenceLevel: opp.confluence.bullishCount,
        overallScore: opp.ranking.scores.overall,
        factors: {
          sentiment: opp.ranking.scores.sentiment ?? 50,
          technical: opp.ranking.scores.technical ?? 50,
          whale: opp.ranking.scores.whale ?? 50,
          ai: opp.ranking.scores.ai ?? 50,
          price: opp.ranking.scores.pricePerformance ?? 50,
        },
      })),
      ...bearishOpps.map((opp) => ({
        coinId: opp.ranking.coin.id,
        symbol: opp.ranking.coin.symbol,
        name: opp.ranking.coin.name,
        image: opp.ranking.coin.image,
        direction: 'bearish' as const,
        confluenceLevel: opp.confluence.bearishCount,
        overallScore: opp.ranking.scores.overall,
        factors: {
          sentiment: opp.ranking.scores.sentiment ?? 50,
          technical: opp.ranking.scores.technical ?? 50,
          whale: opp.ranking.scores.whale ?? 50,
          ai: opp.ranking.scores.ai ?? 50,
          price: opp.ranking.scores.pricePerformance ?? 50,
        },
      })),
    ];

    console.log(`[check-confluence] Found ${bullishOpps.length} bullish, ${bearishOpps.length} bearish opportunities`);

    // 3. Get last check to find NEW opportunities
    const lastCheckData = await redis.get<string>(CONFLUENCE_LAST_CHECK_KEY);
    const lastCheck: ConfluenceOpportunity[] = lastCheckData
      ? (typeof lastCheckData === 'string' ? JSON.parse(lastCheckData) : lastCheckData)
      : [];

    // Find coins that are NEW (not in last check with same direction)
    const lastCheckMap = new Map(lastCheck.map((o) => [`${o.coinId}:${o.direction}`, o]));
    const newOpportunities = currentOpportunities.filter(
      (opp) => !lastCheckMap.has(`${opp.coinId}:${opp.direction}`)
    );

    console.log(`[check-confluence] ${newOpportunities.length} are NEW opportunities`);

    // 4. Store current opportunities for next comparison
    await redis.setex(
      CONFLUENCE_LAST_CHECK_KEY,
      600, // 10 minutes TTL
      JSON.stringify(currentOpportunities)
    );

    // 5. If no new opportunities, we're done
    if (newOpportunities.length === 0) {
      const duration = Date.now() - startTime;
      return NextResponse.json({
        success: true,
        message: 'No new opportunities to alert',
        bullishCount: bullishOpps.length,
        bearishCount: bearishOpps.length,
        newCount: 0,
        alertsSent: 0,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      });
    }

    // 6. Get active subscriptions
    const subscriptions = await getActiveSubscriptions();
    console.log(`[check-confluence] ${subscriptions.length} active subscriptions`);

    if (subscriptions.length === 0) {
      const duration = Date.now() - startTime;
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions',
        bullishCount: bullishOpps.length,
        bearishCount: bearishOpps.length,
        newCount: newOpportunities.length,
        alertsSent: 0,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      });
    }

    // 7. Process each subscription
    let alertsSent = 0;
    const errors: string[] = [];

    for (const subscription of subscriptions) {
      // Check rate limit
      if (!(await hasRemainingAlerts(subscription))) {
        console.log(`[check-confluence] Rate limit reached for ${subscription.email}`);
        continue;
      }

      // Filter opportunities based on user preferences
      const userOpportunities = newOpportunities.filter((opp) => {
        // Check direction preference
        if (opp.direction === 'bullish' && !subscription.enableBullish) return false;
        if (opp.direction === 'bearish' && !subscription.enableBearish) return false;

        // Check minimum confluence level
        if (opp.confluenceLevel < subscription.minConfluence) return false;

        return true;
      });

      if (userOpportunities.length === 0) {
        continue;
      }

      // Check deduplication for each coin
      const coinsToAlert: AlertCoin[] = [];
      for (const opp of userOpportunities) {
        const recentlySent = await wasAlertSentRecently(
          subscription.id,
          opp.coinId,
          DEDUPLICATION_HOURS
        );
        if (!recentlySent) {
          coinsToAlert.push({
            id: opp.coinId,
            name: opp.name,
            symbol: opp.symbol,
            image: opp.image,
            confluenceLevel: opp.confluenceLevel,
            direction: opp.direction,
            overallScore: opp.overallScore,
            factors: opp.factors,
          });
        }
      }

      if (coinsToAlert.length === 0) {
        continue;
      }

      // Send email
      const result = await sendConfluenceAlert({
        to: subscription.email,
        coins: coinsToAlert,
      });

      if (result.success) {
        alertsSent++;

        // Log alerts to history
        for (const coin of coinsToAlert) {
          await logAlertSent({
            subscriptionId: subscription.id,
            coinId: coin.id,
            direction: coin.direction,
            confluenceLevel: coin.confluenceLevel,
            overallScore: String(coin.overallScore),
          });
        }

        // Increment daily counter
        await incrementAlertCount(subscription.id);

        console.log(`[check-confluence] Sent alert to ${subscription.email} for ${coinsToAlert.length} coins`);
      } else {
        errors.push(`${subscription.email}: ${result.error}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[check-confluence] Completed in ${duration}ms, sent ${alertsSent} alerts`);

    return NextResponse.json({
      success: true,
      bullishCount: bullishOpps.length,
      bearishCount: bearishOpps.length,
      newCount: newOpportunities.length,
      subscriptions: subscriptions.length,
      alertsSent,
      errors: errors.length > 0 ? errors : undefined,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[check-confluence] Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
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
