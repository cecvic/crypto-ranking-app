import { NextResponse } from 'next/server';
import { getFearGreedIndex } from '@/lib/apis/sentiment';

// Cache for Fear & Greed data
let cachedData: any = null;
let lastFetchTime = 0;
const CACHE_DURATION = 300000; // 5 minutes cache

export async function GET() {
  try {
    const now = Date.now();

    // Return cached data if fresh
    if (cachedData && now - lastFetchTime < CACHE_DURATION) {
      return NextResponse.json({
        data: cachedData,
        cached: true,
        timestamp: new Date(lastFetchTime).toISOString(),
      });
    }

    // Fetch fresh data
    const fearGreed = await getFearGreedIndex();

    // Update cache
    cachedData = fearGreed;
    lastFetchTime = now;

    return NextResponse.json({
      data: fearGreed,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Fear & Greed API error:', error);

    // Return cached data on error
    if (cachedData) {
      return NextResponse.json({
        data: cachedData,
        cached: true,
        timestamp: new Date(lastFetchTime).toISOString(),
        error: 'Using cached data',
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch Fear & Greed index' },
      { status: 500 }
    );
  }
}
