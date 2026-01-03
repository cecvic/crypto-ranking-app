// Ranking Engine - Weighted scoring algorithm
import { 
  CoinPrice, 
  CoinRanking, 
  RankingWeights,
  SentimentData,
  TechnicalAnalysis,
  WhaleActivity,
  AIPrediction 
} from '../types';

// Default weights for the 5-factor ranking system
export const DEFAULT_WEIGHTS: RankingWeights = {
  sentiment: 0.20,        // Social/news sentiment
  technicalAnalysis: 0.25, // RSI, MACD, etc.
  whaleActivity: 0.20,    // Large transactions, exchange flows
  aiPrediction: 0.20,     // ML/AI price forecasts
  pricePerformance: 0.15, // Recent price action
};

// Normalize a value to 0-100 scale
export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  const normalized = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

// Calculate price performance score
export function calculatePricePerformanceScore(coin: CoinPrice): number {
  let score = 50; // Start neutral

  // 24h performance contribution (weighted more)
  const change24h = coin.price_change_percentage_24h || 0;
  if (change24h > 10) {
    score += 25;
  } else if (change24h > 5) {
    score += 15;
  } else if (change24h > 2) {
    score += 10;
  } else if (change24h > 0) {
    score += 5;
  } else if (change24h > -2) {
    score -= 5;
  } else if (change24h > -5) {
    score -= 10;
  } else if (change24h > -10) {
    score -= 15;
  } else {
    score -= 25;
  }

  // 7d performance contribution
  const change7d = coin.price_change_percentage_7d || 0;
  if (change7d > 20) {
    score += 15;
  } else if (change7d > 10) {
    score += 10;
  } else if (change7d > 5) {
    score += 5;
  } else if (change7d < -5) {
    score -= 5;
  } else if (change7d < -10) {
    score -= 10;
  } else if (change7d < -20) {
    score -= 15;
  }

  // Volume analysis (high volume during price increase = bullish)
  // This would need additional data, so we'll add a small bonus for top market cap coins
  if (coin.market_cap_rank && coin.market_cap_rank <= 20) {
    score += 5; // Established coins get stability bonus
  }

  return Math.max(0, Math.min(100, score));
}

// Calculate overall ranking score
export function calculateRankingScore(
  coin: CoinPrice,
  sentiment: SentimentData | null,
  technical: TechnicalAnalysis | null,
  whale: WhaleActivity | null,
  ai: AIPrediction | null,
  weights: RankingWeights = DEFAULT_WEIGHTS
): {
  scores: CoinRanking['scores'];
  signals: CoinRanking['signals'];
} {
  // Calculate individual scores (default to 50 if data unavailable)
  const sentimentScore = sentiment?.socialScore ?? 50;
  const technicalScore = technical?.score ?? 50;
  const whaleScore = whale?.whaleScore ?? 50;
  const aiScore = ai?.aiScore ?? 50;
  const priceScore = calculatePricePerformanceScore(coin);

  // Calculate weighted overall score
  const overall = 
    (sentimentScore * weights.sentiment) +
    (technicalScore * weights.technicalAnalysis) +
    (whaleScore * weights.whaleActivity) +
    (aiScore * weights.aiPrediction) +
    (priceScore * weights.pricePerformance);

  return {
    scores: {
      sentiment: Math.round(sentimentScore * 10) / 10,
      technical: Math.round(technicalScore * 10) / 10,
      whale: Math.round(whaleScore * 10) / 10,
      ai: Math.round(aiScore * 10) / 10,
      pricePerformance: Math.round(priceScore * 10) / 10,
      overall: Math.round(overall * 10) / 10,
    },
    signals: {
      sentiment,
      technical,
      whale,
      ai,
    },
  };
}

// Sort and rank coins
export function rankCoins(
  rankings: Omit<CoinRanking, 'rank' | 'rankChange'>[]
): CoinRanking[] {
  // Sort by overall score descending
  const sorted = [...rankings].sort((a, b) => b.scores.overall - a.scores.overall);

  // Assign ranks
  return sorted.map((ranking, index) => ({
    ...ranking,
    rank: index + 1,
    previousRank: undefined, // Will be populated from cache
    rankChange: undefined,
  }));
}

// Get signal label from score
export function getSignalLabel(score: number): {
  label: string;
  color: 'green' | 'lime' | 'yellow' | 'orange' | 'red';
} {
  if (score >= 80) {
    return { label: 'Strong Buy', color: 'green' };
  } else if (score >= 60) {
    return { label: 'Buy', color: 'lime' };
  } else if (score >= 40) {
    return { label: 'Neutral', color: 'yellow' };
  } else if (score >= 20) {
    return { label: 'Sell', color: 'orange' };
  } else {
    return { label: 'Strong Sell', color: 'red' };
  }
}

// Calculate rank change
export function calculateRankChanges(
  currentRankings: CoinRanking[],
  previousRankings: Map<string, number>
): CoinRanking[] {
  return currentRankings.map(ranking => {
    const previousRank = previousRankings.get(ranking.coin.id);
    const rankChange = previousRank ? previousRank - ranking.rank : undefined;

    return {
      ...ranking,
      previousRank,
      rankChange,
    };
  });
}

// Filter rankings by criteria
export function filterRankings(
  rankings: CoinRanking[],
  filters: {
    minScore?: number;
    maxRank?: number;
    signal?: 'buy' | 'sell' | 'neutral';
    minMarketCap?: number;
  }
): CoinRanking[] {
  return rankings.filter(ranking => {
    if (filters.minScore && ranking.scores.overall < filters.minScore) {
      return false;
    }
    if (filters.maxRank && ranking.rank > filters.maxRank) {
      return false;
    }
    if (filters.minMarketCap && ranking.coin.market_cap < filters.minMarketCap) {
      return false;
    }
    if (filters.signal) {
      const signalLabel = getSignalLabel(ranking.scores.overall).label.toLowerCase();
      if (filters.signal === 'buy' && !signalLabel.includes('buy')) {
        return false;
      }
      if (filters.signal === 'sell' && !signalLabel.includes('sell')) {
        return false;
      }
      if (filters.signal === 'neutral' && signalLabel !== 'neutral') {
        return false;
      }
    }
    return true;
  });
}

// Get top movers (biggest rank changes)
export function getTopMovers(
  rankings: CoinRanking[],
  limit: number = 10
): { gainers: CoinRanking[]; losers: CoinRanking[] } {
  const withChanges = rankings.filter(r => r.rankChange !== undefined);

  const sortedByChange = [...withChanges].sort(
    (a, b) => (b.rankChange || 0) - (a.rankChange || 0)
  );

  return {
    gainers: sortedByChange.slice(0, limit),
    losers: sortedByChange.slice(-limit).reverse(),
  };
}

// Get best opportunities (high score, lower market cap)
export function getBestOpportunities(
  rankings: CoinRanking[],
  limit: number = 10
): CoinRanking[] {
  // Filter out top 20 by market cap and get highest scores
  const filtered = rankings.filter(
    r => r.coin.market_cap_rank && r.coin.market_cap_rank > 20
  );

  return filtered
    .sort((a, b) => b.scores.overall - a.scores.overall)
    .slice(0, limit);
}
