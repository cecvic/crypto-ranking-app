// Whale Activity APIs - DefiLlama, Whale Alert
import axios from 'axios';
import { WhaleActivity } from '../types';

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
