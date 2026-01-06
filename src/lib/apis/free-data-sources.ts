import axios from 'axios';
import Parser from 'rss-parser';

const rssParser = new Parser();

interface TextDataItem {
  text: string;
  source: string;
  timestamp: Date;
}

const CRYPTO_NEWS_RSS_FEEDS = [
  'https://cointelegraph.com/rss',
  'https://decrypt.co/feed',
  'https://bitcoinmagazine.com/.rss/full/',
];

const REDDIT_SUBREDDITS = ['cryptocurrency', 'bitcoin', 'ethereum', 'altcoin'];

export async function fetchCryptoNewsHeadlines(
  symbol: string,
  limit: number = 20
): Promise<TextDataItem[]> {
  const results: TextDataItem[] = [];
  const symbolLower = symbol.toLowerCase();
  const coinNames = getCoinNameVariants(symbol);

  const feedPromises = CRYPTO_NEWS_RSS_FEEDS.map(async (feedUrl) => {
    try {
      const feed = await rssParser.parseURL(feedUrl);
      const items = feed.items || [];
      
      for (const item of items.slice(0, 50)) {
        const title = item.title || '';
        const description = item.contentSnippet || item.content || '';
        const fullText = `${title} ${description}`.toLowerCase();
        
        const isRelevant = coinNames.some(name => fullText.includes(name.toLowerCase()));
        
        if (isRelevant) {
          results.push({
            text: title,
            source: 'rss',
            timestamp: item.pubDate ? new Date(item.pubDate) : new Date(),
          });
        }
      }
    } catch {
      // RSS feed unavailable, continue with others
    }
  });

  await Promise.all(feedPromises);
  
  return results.slice(0, limit);
}

export async function fetchRedditPosts(
  symbol: string,
  limit: number = 25
): Promise<TextDataItem[]> {
  const results: TextDataItem[] = [];
  const coinNames = getCoinNameVariants(symbol);

  for (const subreddit of REDDIT_SUBREDDITS) {
    try {
      const response = await axios.get(
        `https://www.reddit.com/r/${subreddit}/hot.json`,
        {
          params: { limit: 50 },
          headers: { 'User-Agent': 'CryptoRankingApp/1.0' },
          timeout: 5000,
        }
      );

      const posts = response.data?.data?.children || [];
      
      for (const post of posts) {
        const title = post.data?.title || '';
        const selftext = post.data?.selftext || '';
        const fullText = `${title} ${selftext}`.toLowerCase();
        
        const isRelevant = coinNames.some(name => fullText.includes(name.toLowerCase()));
        
        if (isRelevant) {
          results.push({
            text: title,
            source: 'reddit',
            timestamp: new Date(post.data.created_utc * 1000),
          });
        }
      }
    } catch {
      // Reddit unavailable, continue
    }
  }

  return results.slice(0, limit);
}

export async function fetchCoinGeckoCommunityData(
  coinId: string
): Promise<{ twitterFollowers: number; redditSubscribers: number; sentiment: number } | null> {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${coinId}`,
      {
        params: {
          localization: false,
          tickers: false,
          market_data: false,
          community_data: true,
          developer_data: false,
        },
        timeout: 10000,
      }
    );

    const community = response.data?.community_data;
    if (!community) return null;

    const upVotes = community.sentiment_votes_up_percentage || 50;
    
    return {
      twitterFollowers: community.twitter_followers || 0,
      redditSubscribers: community.reddit_subscribers || 0,
      sentiment: upVotes,
    };
  } catch {
    return null;
  }
}

export async function aggregateTextData(
  coinId: string,
  symbol: string
): Promise<TextDataItem[]> {
  const [newsItems, redditItems] = await Promise.all([
    fetchCryptoNewsHeadlines(symbol, 15).catch(() => []),
    fetchRedditPosts(symbol, 20).catch(() => []),
  ]);

  const allItems = [...newsItems, ...redditItems];
  
  allItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  return allItems;
}

function getCoinNameVariants(symbol: string): string[] {
  const symbolUpper = symbol.toUpperCase();
  const symbolLower = symbol.toLowerCase();
  
  const commonNames: Record<string, string[]> = {
    'BTC': ['bitcoin', 'btc', '$btc'],
    'ETH': ['ethereum', 'eth', '$eth', 'ether'],
    'BNB': ['binance', 'bnb', '$bnb'],
    'XRP': ['ripple', 'xrp', '$xrp'],
    'ADA': ['cardano', 'ada', '$ada'],
    'SOL': ['solana', 'sol', '$sol'],
    'DOGE': ['dogecoin', 'doge', '$doge'],
    'DOT': ['polkadot', 'dot', '$dot'],
    'MATIC': ['polygon', 'matic', '$matic'],
    'SHIB': ['shiba', 'shib', '$shib'],
    'LTC': ['litecoin', 'ltc', '$ltc'],
    'AVAX': ['avalanche', 'avax', '$avax'],
    'LINK': ['chainlink', 'link', '$link'],
    'ATOM': ['cosmos', 'atom', '$atom'],
    'UNI': ['uniswap', 'uni', '$uni'],
  };
  
  return commonNames[symbolUpper] || [symbolLower, `$${symbolLower}`];
}
