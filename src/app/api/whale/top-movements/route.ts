import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTopWhaleMovements } from '@/lib/db/whale-queries';

/**
 * GET /api/whale/top-movements
 * Returns the largest whale transactions by USD value
 *
 * Query params:
 * - limit: number (default: 10, max: 50)
 * - period: '24h' | '7d' (default: '24h')
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const period = searchParams.get('period') || '24h';

    // Convert period to hours
    let hours = 24;
    if (period === '7d') {
      hours = 24 * 7;
    }

    const events = await getTopWhaleMovements(limit, hours);

    // Transform decimal fields to strings for JSON serialization
    const serializedEvents = events.map((event) => ({
      id: event.id,
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      blockTimestamp: event.blockTimestamp.toISOString(),
      tokenAddress: event.tokenAddress,
      tokenSymbol: event.tokenSymbol,
      coinGeckoId: event.coinGeckoId,
      fromAddress: event.fromAddress,
      toAddress: event.toAddress,
      valueRaw: event.valueRaw,
      valueToken: event.valueToken?.toString() || null,
      valueUsd: event.valueUsd?.toString() || null,
      transferType: event.transferType,
      fromLabel: event.fromLabel,
      toLabel: event.toLabel,
      chain: event.chain,
    }));

    return NextResponse.json({
      data: serializedEvents,
      period,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Top whale movements API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top whale movements' },
      { status: 500 }
    );
  }
}
