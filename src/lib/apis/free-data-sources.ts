import axios from 'axios';
import Parser from 'rss-parser';

const rssParser = new Parser();

export interface TextDataItem {
  text: string;
  source: string;
  timestamp: Date;
  score?: number;
}

interface RssFeed {
  url: string;
  name: string;
  priority: number;
}

interface Subreddit {
  name: string;
  priority: number;
}

const CRYPTO_NEWS_RSS_FEEDS: RssFeed[] = [
  { url: 'https://cointelegraph.com/rss', name: 'cointelegraph', priority: 1 },
  { url: 'https://decrypt.co/feed', name: 'decrypt', priority: 1 },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'coindesk', priority: 1 },
  { url: 'https://www.theblock.co/rss.xml', name: 'theblock', priority: 1 },
  { url: 'https://blockworks.co/feed', name: 'blockworks', priority: 1 },
  { url: 'https://u.today/rss', name: 'utoday', priority: 2 },
  { url: 'https://cryptopotato.com/feed/', name: 'cryptopotato', priority: 2 },
  { url: 'https://cryptonews.com/news/feed/', name: 'cryptonews', priority: 2 },
  { url: 'https://beincrypto.com/feed/', name: 'beincrypto', priority: 2 },
  { url: 'https://ambcrypto.com/feed/', name: 'ambcrypto', priority: 2 },
  { url: 'https://cryptoslate.com/feed/', name: 'cryptoslate', priority: 3 },
  { url: 'https://www.newsbtc.com/feed/', name: 'newsbtc', priority: 3 },
  { url: 'https://bitcoinist.com/feed/', name: 'bitcoinist', priority: 3 },
  { url: 'https://dailyhodl.com/feed/', name: 'dailyhodl', priority: 3 },
  { url: 'https://watcher.guru/news/feed', name: 'watcherguru', priority: 3 },
];

const REDDIT_SUBREDDITS: Subreddit[] = [
  { name: 'cryptocurrency', priority: 1 },
  { name: 'bitcoin', priority: 1 },
  { name: 'ethereum', priority: 1 },
  { name: 'ethtrader', priority: 1 },
  { name: 'CryptoMarkets', priority: 2 },
  { name: 'CryptoTechnology', priority: 2 },
  { name: 'binance', priority: 2 },
  { name: 'SatoshiStreetBets', priority: 3 },
  { name: 'cardano', priority: 3 },
  { name: 'solana', priority: 3 },
  { name: 'BitcoinMarkets', priority: 3 },
  { name: 'altcoin', priority: 4 },
  { name: 'defi', priority: 4 },
];

const COIN_NAME_VARIANTS: Record<string, string[]> = {
  'BTC': ['bitcoin', 'btc', '$btc', 'btc/usd', 'btcusd', 'xbt'],
  'ETH': ['ethereum', 'eth', '$eth', 'ether', 'eth/usd', 'ethusd'],
  'BNB': ['binance coin', 'binance', 'bnb', '$bnb'],
  'XRP': ['ripple', 'xrp', '$xrp'],
  'ADA': ['cardano', 'ada', '$ada'],
  'SOL': ['solana', 'sol', '$sol'],
  'DOGE': ['dogecoin', 'doge', '$doge', 'shibe'],
  'DOT': ['polkadot', 'dot', '$dot'],
  'MATIC': ['polygon', 'matic', '$matic', 'pol'],
  'SHIB': ['shiba inu', 'shiba', 'shib', '$shib'],
  'LTC': ['litecoin', 'ltc', '$ltc'],
  'AVAX': ['avalanche', 'avax', '$avax'],
  'LINK': ['chainlink', 'link', '$link'],
  'ATOM': ['cosmos', 'atom', '$atom'],
  'UNI': ['uniswap', 'uni', '$uni'],
  'APT': ['aptos', 'apt', '$apt'],
  'ARB': ['arbitrum', 'arb', '$arb'],
  'OP': ['optimism', 'op', '$op'],
  'SUI': ['sui', '$sui'],
  'SEI': ['sei', '$sei'],
  'NEAR': ['near protocol', 'near', '$near'],
  'FTM': ['fantom', 'ftm', '$ftm'],
  'ALGO': ['algorand', 'algo', '$algo'],
  'VET': ['vechain', 'vet', '$vet'],
  'HBAR': ['hedera', 'hbar', '$hbar'],
  'FIL': ['filecoin', 'fil', '$fil'],
  'ICP': ['internet computer', 'icp', '$icp'],
  'IMX': ['immutable', 'imx', '$imx'],
  'INJ': ['injective', 'inj', '$inj'],
  'RENDER': ['render', 'rndr', '$rndr'],
  'TIA': ['celestia', 'tia', '$tia'],
  'JUP': ['jupiter', 'jup', '$jup'],
  'PEPE': ['pepe', '$pepe'],
  'WIF': ['dogwifhat', 'wif', '$wif'],
  'BONK': ['bonk', '$bonk'],
};

function getCoinNameVariants(symbol: string): string[] {
  const symbolUpper = symbol.toUpperCase();
  const symbolLower = symbol.toLowerCase();
  return COIN_NAME_VARIANTS[symbolUpper] || [symbolLower, `$${symbolLower}`];
}

export async function fetchCryptoNewsHeadlines(
  symbol: string,
  limit: number = 30
): Promise<TextDataItem[]> {
  const results: TextDataItem[] = [];
  const coinNames = getCoinNameVariants(symbol);
  
  const feedPromises = CRYPTO_NEWS_RSS_FEEDS.map(async (feed) => {
    try {
      const result = await Promise.race([
        rssParser.parseURL(feed.url),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 8000)
        ),
      ]);
      
      const items = result.items || [];
      const feedResults: TextDataItem[] = [];
      
      for (const item of items.slice(0, 30)) {
        const title = item.title || '';
        const description = item.contentSnippet || item.content || '';
        const fullText = `${title} ${description}`.toLowerCase();
        
        const isRelevant = coinNames.some(name => 
          fullText.includes(name.toLowerCase())
        );
        
        if (isRelevant) {
          feedResults.push({
            text: title,
            source: `rss:${feed.name}`,
            timestamp: item.pubDate ? new Date(item.pubDate) : new Date(),
            score: feed.priority,
          });
        }
      }
      
      return feedResults;
    } catch {
      return [];
    }
  });

  const allResults = await Promise.all(feedPromises);
  results.push(...allResults.flat());
  
  results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  return results.slice(0, limit);
}

export async function fetchGeneralCryptoNews(
  limit: number = 50
): Promise<TextDataItem[]> {
  const results: TextDataItem[] = [];
  const tier1Feeds = CRYPTO_NEWS_RSS_FEEDS.filter(f => f.priority === 1);
  
  const feedPromises = tier1Feeds.map(async (feed) => {
    try {
      const result = await Promise.race([
        rssParser.parseURL(feed.url),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 8000)
        ),
      ]);
      
      return (result.items || []).slice(0, 20).map(item => ({
        text: item.title || '',
        source: `rss:${feed.name}`,
        timestamp: item.pubDate ? new Date(item.pubDate) : new Date(),
        score: 1,
      }));
    } catch {
      return [];
    }
  });

  const allResults = await Promise.all(feedPromises);
  results.push(...allResults.flat());
  
  results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  return results.slice(0, limit);
}

export async function fetchRedditPosts(
  symbol: string,
  limit: number = 40
): Promise<TextDataItem[]> {
  const results: TextDataItem[] = [];
  const coinNames = getCoinNameVariants(symbol);

  const subredditPromises = REDDIT_SUBREDDITS.map(async (sub) => {
    try {
      const response = await axios.get(
        `https://www.reddit.com/r/${sub.name}/hot.json`,
        {
          params: { limit: 50 },
          headers: { 'User-Agent': 'CryptoRankingApp/1.0' },
          timeout: 6000,
        }
      );

      const posts = response.data?.data?.children || [];
      const subResults: TextDataItem[] = [];
      
      for (const post of posts) {
        const title = post.data?.title || '';
        const selftext = post.data?.selftext || '';
        const fullText = `${title} ${selftext}`.toLowerCase();
        const upvotes = post.data?.ups || 0;
        
        const isRelevant = coinNames.some(name => 
          fullText.includes(name.toLowerCase())
        );
        
        if (isRelevant) {
          subResults.push({
            text: title,
            source: `reddit:${sub.name}`,
            timestamp: new Date(post.data.created_utc * 1000),
            score: upvotes,
          });
        }
      }
      
      return subResults;
    } catch {
      return [];
    }
  });

  const allResults = await Promise.all(subredditPromises);
  results.push(...allResults.flat());
  
  results.sort((a, b) => (b.score || 0) - (a.score || 0));

  return results.slice(0, limit);
}

export async function fetchHackerNewsMentions(
  symbol: string,
  limit: number = 15
): Promise<TextDataItem[]> {
  const coinNames = getCoinNameVariants(symbol);
  const results: TextDataItem[] = [];
  
  for (const name of coinNames.slice(0, 2)) {
    try {
      const response = await axios.get(
        'https://hn.algolia.com/api/v1/search',
        {
          params: {
            query: name,
            tags: 'story',
            hitsPerPage: 10,
          },
          timeout: 5000,
        }
      );
      
      const hits = response.data?.hits || [];
      
      for (const hit of hits) {
        if (hit.points >= 10) {
          results.push({
            text: hit.title || '',
            source: 'hackernews',
            timestamp: new Date(hit.created_at),
            score: hit.points,
          });
        }
      }
    } catch {
      continue;
    }
  }
  
  const unique = Array.from(
    new Map(results.map(r => [r.text, r])).values()
  );
  unique.sort((a, b) => (b.score || 0) - (a.score || 0));
  
  return unique.slice(0, limit);
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

export async function fetchCoinGeckoTrending(): Promise<{
  coins: Array<{ id: string; symbol: string; name: string; marketCapRank: number }>;
  sentiment: number;
}> {
  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/search/trending',
      { timeout: 8000 }
    );
    
    const coins = (response.data?.coins || []).map((c: { item: { id: string; symbol: string; name: string; market_cap_rank: number } }) => ({
      id: c.item.id,
      symbol: c.item.symbol,
      name: c.item.name,
      marketCapRank: c.item.market_cap_rank,
    }));
    
    const avgRank = coins.reduce((sum: number, c: { marketCapRank: number }) => sum + (c.marketCapRank || 100), 0) / (coins.length || 1);
    const sentiment = avgRank < 50 ? 60 : avgRank < 100 ? 50 : 40;
    
    return { coins, sentiment };
  } catch {
    return { coins: [], sentiment: 50 };
  }
}

export async function aggregateTextData(
  coinId: string,
  symbol: string
): Promise<TextDataItem[]> {
  const [newsItems, redditItems, hnItems] = await Promise.all([
    fetchCryptoNewsHeadlines(symbol, 25).catch(() => []),
    fetchRedditPosts(symbol, 30).catch(() => []),
    fetchHackerNewsMentions(symbol, 10).catch(() => []),
  ]);

  const allItems = [...newsItems, ...redditItems, ...hnItems];
  
  allItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  return allItems;
}

export async function aggregateMarketSentiment(): Promise<{
  newsItems: TextDataItem[];
  trendingCoins: Array<{ id: string; symbol: string; name: string }>;
  overallSentiment: number;
}> {
  const [newsItems, trending] = await Promise.all([
    fetchGeneralCryptoNews(30).catch(() => []),
    fetchCoinGeckoTrending().catch(() => ({ coins: [], sentiment: 50 })),
  ]);
  
  return {
    newsItems,
    trendingCoins: trending.coins,
    overallSentiment: trending.sentiment,
  };
}

export function getDataSourceStats(): {
  rssFeeds: number;
  subreddits: number;
  coinsCovered: number;
} {
  return {
    rssFeeds: CRYPTO_NEWS_RSS_FEEDS.length,
    subreddits: REDDIT_SUBREDDITS.length,
    coinsCovered: Object.keys(COIN_NAME_VARIANTS).length,
  };
}

let cachedAllTexts: TextDataItem[] = [];
let cacheTimestamp = 0;
const BATCH_CACHE_DURATION = 600000;

async function fetchAllTextDataOnce(): Promise<TextDataItem[]> {
  const now = Date.now();
  if (cachedAllTexts.length > 0 && now - cacheTimestamp < BATCH_CACHE_DURATION) {
    return cachedAllTexts;
  }

  const tier1Feeds = CRYPTO_NEWS_RSS_FEEDS.filter(f => f.priority <= 2);
  const tier1Subs = REDDIT_SUBREDDITS.filter(s => s.priority <= 2);

  const [rssResults, redditResults] = await Promise.all([
    Promise.all(
      tier1Feeds.map(async (feed) => {
        try {
          const result = await Promise.race([
            rssParser.parseURL(feed.url),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 6000)
            ),
          ]);
          return (result.items || []).slice(0, 20).map(item => ({
            text: `${item.title || ''} ${item.contentSnippet || ''}`,
            source: `rss:${feed.name}`,
            timestamp: item.pubDate ? new Date(item.pubDate) : new Date(),
            score: feed.priority,
          }));
        } catch {
          return [];
        }
      })
    ),
    Promise.all(
      tier1Subs.map(async (sub) => {
        try {
          const response = await axios.get(
            `https://www.reddit.com/r/${sub.name}/hot.json`,
            {
              params: { limit: 30 },
              headers: { 'User-Agent': 'CryptoRankingApp/1.0' },
              timeout: 5000,
            }
          );
          const posts = response.data?.data?.children || [];
          return posts.map((post: { data: { title?: string; selftext?: string; ups?: number; created_utc: number } }) => ({
            text: `${post.data?.title || ''} ${post.data?.selftext?.slice(0, 200) || ''}`,
            source: `reddit:${sub.name}`,
            timestamp: new Date(post.data.created_utc * 1000),
            score: post.data?.ups || 0,
          }));
        } catch {
          return [];
        }
      })
    ),
  ]);

  const allTexts = [...rssResults.flat(), ...redditResults.flat()];
  cachedAllTexts = allTexts;
  cacheTimestamp = now;
  
  console.log(`[FreeDataSources] Fetched ${allTexts.length} texts from ${tier1Feeds.length} feeds + ${tier1Subs.length} subreddits`);
  return allTexts;
}

function matchTextToCoin(text: string, symbol: string): boolean {
  const textLower = text.toLowerCase();
  const variants = getCoinNameVariants(symbol);
  return variants.some(v => textLower.includes(v.toLowerCase()));
}

export async function batchGetTextDataForCoins(
  coins: Array<{ id: string; symbol: string }>
): Promise<Map<string, TextDataItem[]>> {
  const allTexts = await fetchAllTextDataOnce();
  const results = new Map<string, TextDataItem[]>();

  for (const coin of coins) {
    const matched = allTexts.filter(t => matchTextToCoin(t.text, coin.symbol));
    results.set(coin.symbol.toUpperCase(), matched);
  }

  return results;
}
