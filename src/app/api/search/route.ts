import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { searchCoins } from '@/lib/apis/coingecko';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const query = request.nextUrl.searchParams.get('q');
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ data: [] });
    }

    const results = await searchCoins(query.trim());

    const data = results.map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image,
      current_price: coin.current_price ?? 0,
      market_cap: coin.market_cap ?? 0,
      market_cap_rank: coin.market_cap_rank ?? 0,
      price_change_percentage_24h: coin.price_change_percentage_24h ?? 0,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search coins' },
      { status: 500 },
    );
  }
}
