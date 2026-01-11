import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getRecentWhaleEvents } from '@/lib/db/whale-queries';

/**
 * GET /api/whale/events
 * Returns recent whale events with optional filters
 *
 * Query params:
 * - limit: number (default: 50)
 * - token: coinGeckoId filter
 * - type: transferType filter
 * - minValue: minimum USD value
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const token = searchParams.get('token') || undefined;
    const type = searchParams.get('type') || undefined;
    const minValue = searchParams.get('minValue')
      ? parseFloat(searchParams.get('minValue')!)
      : undefined;

    const events = await getRecentWhaleEvents(limit, {
      coinGeckoId: token,
      transferType: type,
      minValueUsd: minValue,
    });

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
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Whale events API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch whale events' },
      { status: 500 }
    );
  }
}
