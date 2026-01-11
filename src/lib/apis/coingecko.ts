// CoinGecko API - Price data and market information
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { CoinPrice, ChartData } from '../types';

const BASE_URL = 'https://api.coingecko.com/api/v3';

// Rate limiting: CoinGecko free tier allows 10-30 calls/minute
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
  },
});

// Add retry logic with exponential backoff (Tiger 4 mitigation)
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry on network errors and rate limits
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           error.response?.status === 429 ||  // Rate limited
           error.response?.status === 503;    // Service unavailable
  },
  onRetry: (retryCount, error) => {
    console.log(`[CoinGecko] Retry attempt ${retryCount} after error: ${error.message}`);
  },
});

// Add API key if available (for higher rate limits)
if (process.env.COINGECKO_API_KEY) {
  api.defaults.headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
}

export async function getTopCoins(
  limit: number = 100,
  page: number = 1,
  sparkline: boolean = true
): Promise<CoinPrice[]> {
  try {
    const response = await api.get('/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: limit,
        page: page,
        sparkline: sparkline,
        price_change_percentage: '24h,7d',
        locale: 'en',
      },
    });

    return response.data.map((coin: any) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image,
      current_price: coin.current_price,
      market_cap: coin.market_cap,
      market_cap_rank: coin.market_cap_rank,
      total_volume: coin.total_volume,
      price_change_percentage_24h: coin.price_change_percentage_24h || 0,
      price_change_percentage_7d: coin.price_change_percentage_7d_in_currency || 0,
      sparkline_in_7d: coin.sparkline_in_7d,
      last_updated: coin.last_updated,
    }));
  } catch (error) {
    console.error('CoinGecko API error:', error);
    throw new Error('Failed to fetch coins from CoinGecko');
  }
}

export async function getCoinById(coinId: string): Promise<any> {
  try {
    const response = await api.get(`/coins/${coinId}`, {
      params: {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: true,
        developer_data: false,
        sparkline: true,
      },
    });

    return response.data;
  } catch (error) {
    console.error(`CoinGecko API error for ${coinId}:`, error);
    throw new Error(`Failed to fetch coin ${coinId}`);
  }
}

export async function getCoinChart(
  coinId: string,
  days: number = 7,
  interval?: 'daily' | 'hourly'
): Promise<ChartData[]> {
  try {
    const response = await api.get(`/coins/${coinId}/ohlc`, {
      params: {
        vs_currency: 'usd',
        days: days,
      },
    });

    // CoinGecko OHLC format: [timestamp, open, high, low, close]
    return response.data.map((candle: number[]) => ({
      time: Math.floor(candle[0] / 1000), // Convert to seconds
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
    }));
  } catch (error) {
    console.error(`CoinGecko chart error for ${coinId}:`, error);
    throw new Error(`Failed to fetch chart for ${coinId}`);
  }
}

export async function getGlobalData(): Promise<{
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  marketCapChange24h: number;
}> {
  try {
    const response = await api.get('/global');
    const data = response.data.data;

    return {
      totalMarketCap: data.total_market_cap.usd,
      totalVolume: data.total_volume.usd,
      btcDominance: data.market_cap_percentage.btc,
      marketCapChange24h: data.market_cap_change_percentage_24h_usd,
    };
  } catch (error) {
    console.error('CoinGecko global data error:', error);
    throw new Error('Failed to fetch global market data');
  }
}

export async function searchCoins(query: string): Promise<CoinPrice[]> {
  try {
    const response = await api.get('/search', {
      params: { query },
    });

    // Return top 10 matches
    const coins = response.data.coins.slice(0, 10);
    
    // Fetch full data for matched coins
    if (coins.length > 0) {
      const ids = coins.map((c: any) => c.id).join(',');
      const fullData = await api.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          ids: ids,
          sparkline: true,
          price_change_percentage: '24h,7d',
        },
      });
      return fullData.data;
    }

    return [];
  } catch (error) {
    console.error('CoinGecko search error:', error);
    throw new Error('Failed to search coins');
  }
}

// Utility to map symbol to CoinGecko ID
export const symbolToId: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'XRP': 'ripple',
  'DOGE': 'dogecoin',
  'ADA': 'cardano',
  'AVAX': 'avalanche-2',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'LTC': 'litecoin',
  'ATOM': 'cosmos',
  'XLM': 'stellar',
};

export function getIdFromSymbol(symbol: string): string {
  return symbolToId[symbol.toUpperCase()] || symbol.toLowerCase();
}

// ============================================
// Category-based coin fetching
// ============================================

export type CoinCategory = 'meme-token' | 'artificial-intelligence' | 'decentralized-finance-defi';

/**
 * Get coins by category
 * Categories: meme-token, artificial-intelligence, decentralized-finance-defi
 */
export async function getCoinsByCategory(
  category: CoinCategory,
  limit: number = 250
): Promise<CoinPrice[]> {
  try {
    console.log(`[CoinGecko] Fetching ${category} coins (limit: ${limit})...`);

    const response = await api.get('/coins/markets', {
      params: {
        vs_currency: 'usd',
        category: category,
        order: 'volume_desc',
        per_page: Math.min(limit, 250), // API max is 250
        page: 1,
        sparkline: false,
        price_change_percentage: '24h,7d',
        locale: 'en',
      },
    });

    const coins = response.data.map((coin: CoinGeckoMarketCoin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image,
      current_price: coin.current_price || 0,
      market_cap: coin.market_cap || 0,
      market_cap_rank: coin.market_cap_rank || 0,
      total_volume: coin.total_volume || 0,
      price_change_percentage_24h: coin.price_change_percentage_24h || 0,
      price_change_percentage_7d: coin.price_change_percentage_7d_in_currency || 0,
      sparkline_in_7d: coin.sparkline_in_7d,
      last_updated: coin.last_updated || new Date().toISOString(),
    }));

    console.log(`[CoinGecko] Fetched ${coins.length} ${category} coins`);
    return coins;
  } catch (error) {
    console.error(`[CoinGecko] Error fetching ${category} coins:`, error);
    return [];
  }
}

/**
 * Get all available categories
 */
export async function getAllCategories(): Promise<CategoryInfo[]> {
  try {
    const response = await api.get('/coins/categories/list');
    return response.data;
  } catch (error) {
    console.error('[CoinGecko] Error fetching categories:', error);
    return [];
  }
}

/**
 * Get meme coins
 */
export async function getMemeCoins(limit: number = 250): Promise<CoinPrice[]> {
  return getCoinsByCategory('meme-token', limit);
}

/**
 * Get AI coins
 */
export async function getAICoins(limit: number = 250): Promise<CoinPrice[]> {
  return getCoinsByCategory('artificial-intelligence', limit);
}

/**
 * Get DeFi coins
 */
export async function getDefiCoins(limit: number = 250): Promise<CoinPrice[]> {
  return getCoinsByCategory('decentralized-finance-defi', limit);
}

// ============================================
// Type definitions
// ============================================

interface CoinGeckoMarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  sparkline_in_7d?: { price: number[] };
  last_updated: string;
}

interface CategoryInfo {
  category_id: string;
  name: string;
}
