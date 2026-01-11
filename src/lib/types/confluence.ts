// Confluence calculation types for multi-factor signal alignment

import { CoinRanking } from './index';

export type SignalDirection = 'bullish' | 'bearish' | 'neutral';

export type ConfluenceLevel = 'full' | 'strong' | 'moderate' | 'mixed';

export type FactorName = 'sentiment' | 'technical' | 'whale' | 'ai' | 'price';

export interface FactorSignal {
  factor: FactorName;
  score: number;
  direction: SignalDirection;
}

export interface ConfluenceResult {
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  level: ConfluenceLevel;
  direction: SignalDirection | 'mixed';
  factors: FactorSignal[];
}

export interface RadarDataPoint {
  factor: string;
  value: number;
  fullMark: number;
}

export interface ConfluenceOpportunity {
  ranking: CoinRanking;
  confluence: ConfluenceResult;
}
