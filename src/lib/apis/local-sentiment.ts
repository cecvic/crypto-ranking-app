// Local Sentiment Analysis - In-house replacement for LunarCrush/CryptoPanic
// Uses sentiment.js (AFINN-based) for text analysis
// Cost: $0/month

import Sentiment from 'sentiment';
import { SentimentData } from '../types';

const analyzer = new Sentiment();

// Crypto-specific word additions to improve accuracy
const cryptoLexicon: Record<string, number> = {
  // Bullish terms
  'moon': 4,
  'mooning': 4,
  'bullish': 3,
  'hodl': 2,
  'hodling': 2,
  'pump': 2,
  'pumping': 3,
  'lambo': 3,
  'ath': 3, // All time high
  'breakout': 2,
  'accumulate': 2,
  'accumulating': 2,
  'undervalued': 2,
  'gem': 2,
  'alpha': 2,
  'wagmi': 3, // We're all gonna make it
  'gm': 1, // Good morning (crypto culture)
  'lfg': 3, // Let's f***ing go
  'send': 2,
  'sending': 2,
  'rip': -2, // Context dependent but usually negative
  'dip': -1,
  'buying': 1,
  'bought': 1,
  'long': 1,
  'longs': 1,
  
  // Bearish terms
  'bearish': -3,
  'dump': -3,
  'dumping': -3,
  'crash': -4,
  'crashing': -4,
  'rug': -4,
  'rugpull': -5,
  'rugged': -4,
  'scam': -4,
  'ponzi': -4,
  'sell': -1,
  'selling': -2,
  'sold': -1,
  'short': -1,
  'shorts': -1,
  'rekt': -3,
  'liquidated': -3,
  'liquidation': -2,
  'ngmi': -3, // Not gonna make it
  'fud': -2,
  'fear': -2,
  'panic': -3,
  'bleeding': -2,
  'dead': -3,
  'dying': -3,
  'capitulation': -3,
  'overvalued': -2,
  
  // Neutral/context
  'whale': 0,
  'whales': 0,
  'btc': 0,
  'eth': 0,
  'crypto': 0,
  'bitcoin': 0,
  'ethereum': 0,
  'altcoin': 0,
  'altcoins': 0,
  'defi': 0,
  'nft': 0,
};

// Register custom lexicon
analyzer.registerLanguage('en', {
  labels: cryptoLexicon,
});

/**
 * Analyze sentiment of a single text
 * @returns score from -5 to 5 (raw), normalized to 0-100
 */
export function analyzeText(text: string): { score: number; comparative: number; tokens: string[] } {
  const result = analyzer.analyze(text, { extras: cryptoLexicon });
  return {
    score: result.score,
    comparative: result.comparative, // Score per word
    tokens: result.tokens,
  };
}

/**
 * Analyze multiple texts and return aggregated sentiment
 * @param texts Array of text content (tweets, comments, news headlines)
 * @returns Normalized sentiment score 0-100 (50 = neutral)
 */
export function analyzeMultipleTexts(texts: string[]): {
  score: number;
  positive: number;
  negative: number;
  volume: number;
} {
  if (texts.length === 0) {
    return { score: 50, positive: 50, negative: 50, volume: 0 };
  }

  let totalScore = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  for (const text of texts) {
    const result = analyzer.analyze(text, { extras: cryptoLexicon });
    totalScore += result.comparative; // Use comparative for fair averaging
    
    if (result.score > 0) positiveCount++;
    else if (result.score < 0) negativeCount++;
    else neutralCount++;
  }

  const avgComparative = totalScore / texts.length;
  
  // Normalize comparative score (-1 to 1 typical range) to 0-100
  // Using sigmoid-like transformation for better distribution
  const normalizedScore = 50 + (Math.tanh(avgComparative * 2) * 50);
  
  const total = positiveCount + negativeCount + neutralCount;
  const positivePercent = (positiveCount / total) * 100;
  const negativePercent = (negativeCount / total) * 100;

  return {
    score: Math.round(normalizedScore),
    positive: Math.round(positivePercent),
    negative: Math.round(negativePercent),
    volume: texts.length,
  };
}

/**
 * Generate SentimentData from analyzed texts
 * Compatible with existing app interface
 */
export function generateSentimentData(
  coinId: string,
  texts: string[]
): SentimentData {
  const analysis = analyzeMultipleTexts(texts);
  
  return {
    coinId,
    socialScore: analysis.score,
    socialVolume: analysis.volume,
    sentimentPositive: analysis.positive,
    sentimentNegative: analysis.negative,
    source: 'local' as SentimentData['source'],
  };
}

/**
 * Quick sentiment check for a coin based on symbol mentions
 * Uses heuristics when no text data is available
 */
export function getQuickSentiment(
  coinId: string,
  priceChange24h: number,
  priceChange7d: number,
  volume24h: number,
  avgVolume: number
): SentimentData {
  // Price momentum sentiment (40% weight)
  const priceScore24h = Math.tanh(priceChange24h / 10) * 20; // -20 to +20
  const priceScore7d = Math.tanh(priceChange7d / 20) * 10; // -10 to +10
  
  // Volume sentiment (10% weight) - high volume on up days is bullish
  const volumeRatio = avgVolume > 0 ? volume24h / avgVolume : 1;
  const volumeScore = priceChange24h > 0 
    ? Math.min(10, (volumeRatio - 1) * 5) 
    : Math.max(-10, (1 - volumeRatio) * 5);
  
  // Base neutral + adjustments
  const totalScore = 50 + priceScore24h + priceScore7d + volumeScore;
  const normalizedScore = Math.max(0, Math.min(100, totalScore));
  
  return {
    coinId,
    socialScore: Math.round(normalizedScore),
    socialVolume: 0, // No social data
    sentimentPositive: normalizedScore > 50 ? normalizedScore : 50,
    sentimentNegative: normalizedScore < 50 ? 100 - normalizedScore : 50,
    source: 'local' as SentimentData['source'],
  };
}
