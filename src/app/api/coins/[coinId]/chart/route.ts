import { NextRequest, NextResponse } from 'next/server';
import { getCoinChart } from '@/lib/apis/coingecko';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ coinId: string }> }
) {
  try {
    const { coinId } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const chartData = await getCoinChart(coinId, days);

    return NextResponse.json({
      data: chartData,
      coinId,
      days,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chart API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}
