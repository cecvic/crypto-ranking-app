// Confluence calculation utilities for multi-factor signal alignment

import { CoinRanking } from '@/lib/types';
import {
  ConfluenceResult,
  FactorSignal,
  SignalDirection,
  ConfluenceLevel,
  RadarDataPoint,
  ConfluenceOpportunity,
} from '@/lib/types/confluence';

// Thresholds for signal classification
const BULLISH_THRESHOLD = 60;
const BEARISH_THRESHOLD = 40;

/**
 * Determine signal direction from a score (0-100)
 */
export function getSignalDirection(score: number): SignalDirection {
  if (score > BULLISH_THRESHOLD) return 'bullish';
  if (score < BEARISH_THRESHOLD) return 'bearish';
  return 'neutral';
}

/**
 * Calculate confluence from a coin's 5-factor scores
 */
export function calculateConfluence(scores: CoinRanking['scores']): ConfluenceResult {
  const factors: FactorSignal[] = [
    {
      factor: 'sentiment',
      score: scores.sentiment ?? 50,
      direction: getSignalDirection(scores.sentiment ?? 50),
    },
    {
      factor: 'technical',
      score: scores.technical ?? 50,
      direction: getSignalDirection(scores.technical ?? 50),
    },
    {
      factor: 'whale',
      score: scores.whale ?? 50,
      direction: getSignalDirection(scores.whale ?? 50),
    },
    {
      factor: 'ai',
      score: scores.ai ?? 50,
      direction: getSignalDirection(scores.ai ?? 50),
    },
    {
      factor: 'price',
      score: scores.pricePerformance ?? 50,
      direction: getSignalDirection(scores.pricePerformance ?? 50),
    },
  ];

  const bullishCount = factors.filter((f) => f.direction === 'bullish').length;
  const bearishCount = factors.filter((f) => f.direction === 'bearish').length;
  const neutralCount = factors.filter((f) => f.direction === 'neutral').length;

  // Determine confluence level based on max aligned factors
  let level: ConfluenceLevel;
  const maxAligned = Math.max(bullishCount, bearishCount);

  if (maxAligned === 5) level = 'full';
  else if (maxAligned === 4) level = 'strong';
  else if (maxAligned === 3) level = 'moderate';
  else level = 'mixed';

  // Determine overall direction
  let direction: SignalDirection | 'mixed';
  if (bullishCount > bearishCount && bullishCount >= 3) direction = 'bullish';
  else if (bearishCount > bullishCount && bearishCount >= 3) direction = 'bearish';
  else direction = 'mixed';

  return {
    bullishCount,
    bearishCount,
    neutralCount,
    level,
    direction,
    factors,
  };
}

/**
 * Transform scores to Recharts radar data format
 */
export function scoresToRadarData(scores: CoinRanking['scores']): RadarDataPoint[] {
  return [
    { factor: 'Sentiment', value: scores.sentiment ?? 50, fullMark: 100 },
    { factor: 'Technical', value: scores.technical ?? 50, fullMark: 100 },
    { factor: 'Whale', value: scores.whale ?? 50, fullMark: 100 },
    { factor: 'AI', value: scores.ai ?? 50, fullMark: 100 },
    { factor: 'Price', value: scores.pricePerformance ?? 50, fullMark: 100 },
  ];
}

/**
 * Get badge/background color for confluence level
 */
export function getConfluenceColor(
  level: ConfluenceLevel,
  direction: SignalDirection | 'mixed'
): string {
  if (direction === 'mixed') return '#eab308'; // yellow-500

  if (direction === 'bullish') {
    switch (level) {
      case 'full':
        return '#22c55e'; // green-500
      case 'strong':
        return '#4ade80'; // green-400
      case 'moderate':
        return '#86efac'; // green-300
      default:
        return '#eab308';
    }
  }

  // bearish
  switch (level) {
    case 'full':
      return '#ef4444'; // red-500
    case 'strong':
      return '#f87171'; // red-400
    case 'moderate':
      return '#fca5a5'; // red-300
    default:
      return '#eab308';
  }
}

/**
 * Get radar polygon fill color based on confluence direction
 */
export function getRadarFillColor(direction: SignalDirection | 'mixed'): string {
  switch (direction) {
    case 'bullish':
      return 'rgba(34, 197, 94, 0.3)'; // green with opacity
    case 'bearish':
      return 'rgba(239, 68, 68, 0.3)'; // red with opacity
    default:
      return 'rgba(234, 179, 8, 0.2)'; // yellow with opacity
  }
}

/**
 * Get radar polygon stroke color based on confluence direction
 */
export function getRadarStrokeColor(direction: SignalDirection | 'mixed'): string {
  switch (direction) {
    case 'bullish':
      return '#22c55e'; // green-500
    case 'bearish':
      return '#ef4444'; // red-500
    default:
      return '#eab308'; // yellow-500
  }
}

/**
 * Get human-readable confluence label
 */
export function getConfluenceLabel(result: ConfluenceResult): string {
  const alignedCount = Math.max(result.bullishCount, result.bearishCount);

  switch (result.level) {
    case 'full':
      return `Full Confluence (${alignedCount}/5)`;
    case 'strong':
      return `Strong (${alignedCount}/5)`;
    case 'moderate':
      return `Moderate (${alignedCount}/5)`;
    default:
      return 'Mixed Signals';
  }
}

/**
 * Get short confluence badge text
 */
export function getConfluenceBadgeText(result: ConfluenceResult): string {
  const alignedCount = Math.max(result.bullishCount, result.bearishCount);
  return `${alignedCount}/5`;
}

/**
 * Find coins with highest confluence alignment
 */
export function getTopConfluenceOpportunities(
  rankings: CoinRanking[],
  options: {
    direction?: 'bullish' | 'bearish';
    minAligned?: number;
    limit?: number;
  } = {}
): ConfluenceOpportunity[] {
  const { direction = 'bullish', minAligned = 4, limit = 10 } = options;

  const opportunities: ConfluenceOpportunity[] = rankings
    .map((ranking) => ({
      ranking,
      confluence: calculateConfluence(ranking.scores),
    }))
    .filter((opp) => {
      const alignedCount =
        direction === 'bullish' ? opp.confluence.bullishCount : opp.confluence.bearishCount;
      return alignedCount >= minAligned && opp.confluence.direction === direction;
    })
    .sort((a, b) => {
      const aAligned =
        direction === 'bullish' ? a.confluence.bullishCount : a.confluence.bearishCount;
      const bAligned =
        direction === 'bullish' ? b.confluence.bullishCount : b.confluence.bearishCount;
      // Sort by aligned count first, then by overall score
      if (bAligned !== aAligned) return bAligned - aAligned;
      return b.ranking.scores.overall - a.ranking.scores.overall;
    })
    .slice(0, limit);

  return opportunities;
}
