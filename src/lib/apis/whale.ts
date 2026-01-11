// Whale Activity APIs - DefiLlama, Whale Alert, Alchemy
import axios from 'axios';
import { WhaleActivity } from '../types';
import {
  getWhaleMetrics24h,
  getBatchWhaleMetrics,
  type WhaleMetrics,
} from '@/lib/db/whale-queries';

// ============================================
// DEFILLAMA API - TVL & Protocol Data (FREE)
// ============================================
const DEFILLAMA_URL = 'https://api.llama.fi';

export async function getProtocolTVL(protocol: string): Promise<{
  tvl: number;
  change24h: number;
  change7d: number;
} | null> {
  try {
    const response = await axios.get(`${DEFILLAMA_URL}/protocol/${protocol}`);
    const data = response.data;

    const currentTvl = data.currentChainTvls?.total || data.tvl?.[data.tvl.length - 1]?.totalLiquidityUSD || 0;
    const tvl24hAgo = data.tvl?.[data.tvl.length - 2]?.totalLiquidityUSD || currentTvl;
    const tvl7dAgo = data.tvl?.[data.tvl.length - 8]?.totalLiquidityUSD || currentTvl;

    return {
      tvl: currentTvl,
      change24h: ((currentTvl - tvl24hAgo) / tvl24hAgo) * 100,
      change7d: ((currentTvl - tvl7dAgo) / tvl7dAgo) * 100,
    };
  } catch (error) {
    console.error(`DefiLlama error for ${protocol}:`, error);
    return null;
  }
}

export async function getChainTVL(chain: string): Promise<{
  tvl: number;
  protocols: number;
} | null> {
  try {
    const response = await axios.get(`${DEFILLAMA_URL}/v2/chains`);
    const chains = response.data;
    
    const chainData = chains.find((c: any) => 
      c.name.toLowerCase() === chain.toLowerCase() ||
      c.gecko_id === chain.toLowerCase()
    );

    if (chainData) {
      return {
        tvl: chainData.tvl,
        protocols: chainData.protocols || 0,
      };
    }

    return null;
  } catch (error) {
    console.error(`DefiLlama chain error for ${chain}:`, error);
    return null;
  }
}

// Get stablecoin flows (indicator of whale activity)
export async function getStablecoinFlows(): Promise<{
  totalMcap: number;
  change24h: number;
  flows: Array<{ chain: string; mcap: number; change: number }>;
} | null> {
  try {
    const response = await axios.get(`${DEFILLAMA_URL}/stablecoins`);
    const data = response.data;

    const flows = data.peggedAssets?.slice(0, 10).map((stable: any) => ({
      chain: stable.name,
      mcap: stable.circulating?.peggedUSD || 0,
      change: stable.circulatingPrevDay 
        ? ((stable.circulating?.peggedUSD - stable.circulatingPrevDay?.peggedUSD) / stable.circulatingPrevDay?.peggedUSD) * 100
        : 0,
    })) || [];

    return {
      totalMcap: data.totalCirculatingUSD?.peggedUSD || 0,
      change24h: 0, // Calculate from historical
      flows,
    };
  } catch (error) {
    console.error('DefiLlama stablecoin error:', error);
    return null;
  }
}

// ============================================
// WHALE ALERT API (Requires API Key)
// ============================================
const WHALE_ALERT_URL = 'https://api.whale-alert.io/v1';

export async function getWhaleTransactions(
  symbol: string,
  minValue: number = 500000
): Promise<{
  transactions: any[];
  totalVolume: number;
  exchangeInflow: number;
  exchangeOutflow: number;
} | null> {
  const apiKey = process.env.WHALE_ALERT_API_KEY;

  if (!apiKey) {
    console.warn('Whale Alert API key not configured');
    return null;
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400;

    const response = await axios.get(`${WHALE_ALERT_URL}/transactions`, {
      params: {
        api_key: apiKey,
        min_value: minValue,
        start: oneDayAgo,
        currency: symbol.toLowerCase(),
      },
    });

    const transactions = response.data.transactions || [];
    
    let exchangeInflow = 0;
    let exchangeOutflow = 0;
    let totalVolume = 0;

    for (const tx of transactions) {
      const amount = tx.amount_usd || 0;
      totalVolume += amount;

      // Check if destination is an exchange
      if (tx.to?.owner_type === 'exchange') {
        exchangeInflow += amount;
      }
      // Check if source is an exchange
      if (tx.from?.owner_type === 'exchange') {
        exchangeOutflow += amount;
      }
    }

    return {
      transactions,
      totalVolume,
      exchangeInflow,
      exchangeOutflow,
    };
  } catch (error) {
    console.error(`Whale Alert error for ${symbol}:`, error);
    return null;
  }
}

// ============================================
// AGGREGATED WHALE SCORE
// ============================================

// Protocol to symbol mapping for DeFi projects
const symbolToProtocol: Record<string, string> = {
  'UNI': 'uniswap',
  'AAVE': 'aave',
  'MKR': 'makerdao',
  'CRV': 'curve',
  'LDO': 'lido',
  'SNX': 'synthetix',
  'COMP': 'compound',
  'SUSHI': 'sushiswap',
  'YFI': 'yearn-finance',
  'BAL': 'balancer',
};

// Chain mapping for L1s
const symbolToChain: Record<string, string> = {
  'ETH': 'ethereum',
  'SOL': 'solana',
  'AVAX': 'avalanche',
  'MATIC': 'polygon',
  'FTM': 'fantom',
  'NEAR': 'near',
  'ATOM': 'cosmos',
  'DOT': 'polkadot',
  'ADA': 'cardano',
  'BNB': 'bsc',
};

export async function getWhaleActivity(
  coinId: string,
  symbol: string
): Promise<WhaleActivity> {
  // Try multiple data sources
  const [whaleAlertData, protocolData, chainData] = await Promise.all([
    getWhaleTransactions(symbol).catch(() => null),
    symbolToProtocol[symbol] ? getProtocolTVL(symbolToProtocol[symbol]).catch(() => null) : null,
    symbolToChain[symbol] ? getChainTVL(symbolToChain[symbol]).catch(() => null) : null,
  ]);

  // Calculate whale score based on available data
  let whaleScore = 50; // Default neutral

  if (whaleAlertData) {
    const netFlow = whaleAlertData.exchangeOutflow - whaleAlertData.exchangeInflow;
    // Positive net flow (more leaving exchanges) = accumulation = bullish
    if (netFlow > 0) {
      whaleScore += Math.min(25, netFlow / 10000000); // Cap bonus at 25
    } else {
      whaleScore -= Math.min(25, Math.abs(netFlow) / 10000000);
    }
  }

  if (protocolData && protocolData.change24h) {
    // TVL increasing = bullish
    whaleScore += Math.min(15, protocolData.change24h);
  }

  if (chainData && chainData.tvl > 1000000000) {
    whaleScore += 10; // Bonus for established chains with >$1B TVL
  }

  // Clamp to 0-100
  whaleScore = Math.max(0, Math.min(100, whaleScore));

  return {
    coinId,
    largeTransactions24h: whaleAlertData?.transactions?.length || 0,
    exchangeInflow24h: whaleAlertData?.exchangeInflow || 0,
    exchangeOutflow24h: whaleAlertData?.exchangeOutflow || 0,
    netFlow24h: (whaleAlertData?.exchangeOutflow || 0) - (whaleAlertData?.exchangeInflow || 0),
    whaleScore,
    source: whaleAlertData ? 'whale-alert' : 'defillama',
  };
}

// ============================================
// ALCHEMY WEBHOOK-BASED WHALE TRACKING
// ============================================

/**
 * Calculate whale score from metrics
 */
function calculateWhaleScoreFromMetrics(metrics: WhaleMetrics): number {
  let whaleScore = 50; // Start neutral

  // Factor 1: Net flow direction (max +/-25 points)
  // Positive net flow (more leaving exchanges) = accumulation = bullish
  if (metrics.netFlow !== 0) {
    const flowImpact = Math.min(25, Math.abs(metrics.netFlow) / 10_000_000);
    whaleScore += metrics.netFlow > 0 ? flowImpact : -flowImpact;
  }

  // Factor 2: Transaction volume (max +/-15 points)
  // High whale activity = significant interest
  if (metrics.totalTransactions > 50) {
    whaleScore += 15;
  } else if (metrics.totalTransactions > 20) {
    whaleScore += 10;
  } else if (metrics.totalTransactions > 5) {
    whaleScore += 5;
  } else if (metrics.totalTransactions === 0) {
    // No activity - keep neutral or slightly bearish
    whaleScore -= 5;
  }

  // Factor 3: Accumulation ratio (max +/-10 points)
  const totalFlow = metrics.exchangeInflow + metrics.exchangeOutflow;
  if (totalFlow > 0) {
    const accumulationRatio = metrics.exchangeOutflow / totalFlow;
    if (accumulationRatio > 0.7) {
      whaleScore += 10; // Strong accumulation
    } else if (accumulationRatio > 0.55) {
      whaleScore += 5;
    } else if (accumulationRatio < 0.3) {
      whaleScore -= 10; // Strong distribution
    } else if (accumulationRatio < 0.45) {
      whaleScore -= 5;
    }
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, whaleScore));
}

/**
 * Get whale activity from Alchemy webhook database
 */
export async function getWhaleActivityFromDB(
  coinId: string,
  symbol: string
): Promise<WhaleActivity> {
  const metrics = await getWhaleMetrics24h(coinId);

  // If no data from DB, fall back to existing logic
  if (metrics.totalTransactions === 0) {
    return getWhaleActivity(coinId, symbol);
  }

  const whaleScore = calculateWhaleScoreFromMetrics(metrics);

  return {
    coinId,
    largeTransactions24h: metrics.totalTransactions,
    exchangeInflow24h: metrics.exchangeInflow,
    exchangeOutflow24h: metrics.exchangeOutflow,
    netFlow24h: metrics.netFlow,
    whaleScore,
    source: 'alchemy',
  };
}

/**
 * Batch version for efficient ranking computation
 */
export async function getBatchWhaleActivity(
  coins: Array<{ id: string; symbol: string }>
): Promise<Map<string, WhaleActivity>> {
  const coinIds = coins.map((c) => c.id);
  const metricsMap = await getBatchWhaleMetrics(coinIds);

  const results = new Map<string, WhaleActivity>();

  for (const coin of coins) {
    const metrics = metricsMap.get(coin.id);

    if (!metrics || metrics.totalTransactions === 0) {
      // No Alchemy data - return neutral score with fallback
      try {
        const fallback = await getWhaleActivity(coin.id, coin.symbol);
        results.set(coin.id, fallback);
      } catch {
        // If fallback also fails, use neutral score
        results.set(coin.id, {
          coinId: coin.id,
          largeTransactions24h: 0,
          exchangeInflow24h: 0,
          exchangeOutflow24h: 0,
          netFlow24h: 0,
          whaleScore: 50,
          source: 'defillama',
        });
      }
      continue;
    }

    const whaleScore = calculateWhaleScoreFromMetrics(metrics);

    results.set(coin.id, {
      coinId: coin.id,
      largeTransactions24h: metrics.totalTransactions,
      exchangeInflow24h: metrics.exchangeInflow,
      exchangeOutflow24h: metrics.exchangeOutflow,
      netFlow24h: metrics.netFlow,
      whaleScore,
      source: 'alchemy',
    });
  }

  return results;
}
