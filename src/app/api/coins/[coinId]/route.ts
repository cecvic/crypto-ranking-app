import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCoinById, getCoinChart } from '@/lib/apis/coingecko';
import { getAggregatedSentiment } from '@/lib/apis/sentiment';
import { getTechnicalAnalysis } from '@/lib/apis/technical';
import { getWhaleActivity } from '@/lib/apis/whale';
import { getAIPrediction } from '@/lib/apis/prediction';
import { calculateRankingScore } from '@/lib/ranking/calculator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ coinId: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { coinId } = await params;

    // Fetch coin data from CoinGecko
    const coinData = await getCoinById(coinId);

    if (!coinData) {
      return NextResponse.json(
        { error: 'Coin not found' },
        { status: 404 }
      );
    }

    // Map to our CoinPrice format
    const coin = {
      id: coinData.id,
      symbol: coinData.symbol.toUpperCase(),
      name: coinData.name,
      image: coinData.image?.large || coinData.image?.small || '',
      current_price: coinData.market_data?.current_price?.usd || 0,
      market_cap: coinData.market_data?.market_cap?.usd || 0,
      market_cap_rank: coinData.market_cap_rank || 0,
      total_volume: coinData.market_data?.total_volume?.usd || 0,
      price_change_percentage_24h: coinData.market_data?.price_change_percentage_24h || 0,
      price_change_percentage_7d: coinData.market_data?.price_change_percentage_7d || 0,
      sparkline_in_7d: coinData.market_data?.sparkline_7d,
      last_updated: coinData.last_updated,
    };

    // Fetch all ranking data in parallel
    const [sentiment, technical, whale, ai] = await Promise.all([
      getAggregatedSentiment(coin.id, coin.symbol).catch(() => null),
      getTechnicalAnalysis(coin.symbol).catch(() => null),
      getWhaleActivity(coin.id, coin.symbol).catch(() => null),
      getAIPrediction(coin.id, coin.symbol, coin.current_price).catch(() => null),
    ]);

    // Calculate ranking score
    const { scores, signals } = calculateRankingScore(
      coin,
      sentiment,
      technical,
      whale,
      ai
    );

    // Additional coin details
    const details = {
      description: coinData.description?.en?.slice(0, 500) || '',
      links: {
        homepage: coinData.links?.homepage?.[0],
        twitter: coinData.links?.twitter_screen_name 
          ? `https://twitter.com/${coinData.links.twitter_screen_name}`
          : null,
        reddit: coinData.links?.subreddit_url,
        github: coinData.links?.repos_url?.github?.[0],
      },
      community: {
        twitterFollowers: coinData.community_data?.twitter_followers || 0,
        redditSubscribers: coinData.community_data?.reddit_subscribers || 0,
      },
      marketData: {
        ath: coinData.market_data?.ath?.usd || 0,
        athDate: coinData.market_data?.ath_date?.usd,
        athChangePercentage: coinData.market_data?.ath_change_percentage?.usd || 0,
        atl: coinData.market_data?.atl?.usd || 0,
        atlDate: coinData.market_data?.atl_date?.usd,
        high24h: coinData.market_data?.high_24h?.usd || 0,
        low24h: coinData.market_data?.low_24h?.usd || 0,
        circulatingSupply: coinData.market_data?.circulating_supply || 0,
        totalSupply: coinData.market_data?.total_supply || 0,
        maxSupply: coinData.market_data?.max_supply,
      },
    };

    return NextResponse.json({
      data: {
        coin,
        scores,
        signals,
        details,
        rank: 0, // Would need to fetch full rankings to determine
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Coin API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coin data' },
      { status: 500 }
    );
  }
}
