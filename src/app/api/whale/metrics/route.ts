import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getWhaleAggregateMetrics } from '@/lib/db/whale-queries';

/**
 * GET /api/whale/metrics
 * Returns aggregated whale metrics with token breakdown
 *
 * Query params:
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
    const period = searchParams.get('period') || '24h';

    // Convert period to hours
    let hours = 24;
    if (period === '7d') {
      hours = 24 * 7;
    } else if (period === '1h') {
      hours = 1;
    }

    const metrics = await getWhaleAggregateMetrics(hours);

    return NextResponse.json({
      data: metrics,
      period,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Whale metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch whale metrics' },
      { status: 500 }
    );
  }
}
