/**
 * Swing point detection and analysis utilities
 * Detects swing highs/lows and calculates support/resistance levels
 */

import type { OHLCCandle, ChartAnnotation, SwingAnalysis } from '@/lib/types/ai';

interface SwingPoint {
  type: 'high' | 'low';
  index: number;
  time: number;
  price: number;
}

/**
 * Detect swing highs and lows using N-bar lookback
 * A swing high is a candle with lower highs on both sides
 * A swing low is a candle with higher lows on both sides
 */
export function detectSwingPoints(
  candles: OHLCCandle[],
  lookback: number = 3
): SwingPoint[] {
  const swings: SwingPoint[] = [];

  if (candles.length < lookback * 2 + 1) {
    return swings;
  }

  for (let i = lookback; i < candles.length - lookback; i++) {
    const current = candles[i];

    // Check for swing high
    let isSwingHigh = true;
    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].high >= current.high || candles[i + j].high >= current.high) {
        isSwingHigh = false;
        break;
      }
    }

    if (isSwingHigh) {
      swings.push({
        type: 'high',
        index: i,
        time: current.time,
        price: current.high,
      });
    }

    // Check for swing low
    let isSwingLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].low <= current.low || candles[i + j].low <= current.low) {
        isSwingLow = false;
        break;
      }
    }

    if (isSwingLow) {
      swings.push({
        type: 'low',
        index: i,
        time: current.time,
        price: current.low,
      });
    }
  }

  return swings;
}

/**
 * Calculate support and resistance levels from swing points
 * Groups nearby price levels and returns the most significant ones
 */
function calculateSupportResistance(
  swings: SwingPoint[],
  currentPrice: number,
  tolerance: number = 0.02 // 2% price tolerance for grouping
): { support: number | null; resistance: number | null } {
  const highs = swings.filter((s) => s.type === 'high').map((s) => s.price);
  const lows = swings.filter((s) => s.type === 'low').map((s) => s.price);

  // Find nearest resistance (swing high above current price)
  const resistanceLevels = highs.filter((p) => p > currentPrice);
  const resistance = resistanceLevels.length > 0 ? Math.min(...resistanceLevels) : null;

  // Find nearest support (swing low below current price)
  const supportLevels = lows.filter((p) => p < currentPrice);
  const support = supportLevels.length > 0 ? Math.max(...supportLevels) : null;

  return { support, resistance };
}

/**
 * Generate chart annotations from candle data
 * Returns swing markers and support/resistance lines
 */
export function generateAnnotations(candles: OHLCCandle[]): ChartAnnotation[] {
  if (candles.length < 7) {
    return [];
  }

  const annotations: ChartAnnotation[] = [];

  // Detect swing points with lookback based on data length
  const lookback = candles.length < 20 ? 2 : 3;
  const swings = detectSwingPoints(candles, lookback);

  // Limit to most recent swing points (last 6 of each type)
  const recentHighs = swings.filter((s) => s.type === 'high').slice(-6);
  const recentLows = swings.filter((s) => s.type === 'low').slice(-6);

  // Add swing high markers
  recentHighs.forEach((swing) => {
    annotations.push({
      type: 'swing-high',
      time: swing.time,
      price: swing.price,
      label: 'SH',
    });
  });

  // Add swing low markers
  recentLows.forEach((swing) => {
    annotations.push({
      type: 'swing-low',
      time: swing.time,
      price: swing.price,
      label: 'SL',
    });
  });

  // Calculate support/resistance from all swings
  const currentPrice = candles[candles.length - 1].close;
  const { support, resistance } = calculateSupportResistance(swings, currentPrice);

  if (support !== null) {
    annotations.push({
      type: 'support',
      price: support,
      label: `Support $${formatPrice(support)}`,
    });
  }

  if (resistance !== null) {
    annotations.push({
      type: 'resistance',
      price: resistance,
      label: `Resistance $${formatPrice(resistance)}`,
    });
  }

  return annotations;
}

/**
 * Calculate swing analysis metrics (velocity, acceleration, magnitude)
 */
export function calculateSwingAnalysis(candles: OHLCCandle[]): SwingAnalysis | null {
  if (candles.length < 10) {
    return null;
  }

  const swings = detectSwingPoints(candles, candles.length < 20 ? 2 : 3);
  const currentPrice = candles[candles.length - 1].close;
  const firstPrice = candles[0].open;

  // Calculate velocity (rate of price change)
  const totalDays = (candles[candles.length - 1].time - candles[0].time) / 86400;
  const totalChange = ((currentPrice - firstPrice) / firstPrice) * 100;
  const velocity = totalDays > 0 ? totalChange / totalDays : 0;

  // Determine velocity signal
  let velocitySignal: 'accelerating' | 'decelerating' | 'stable';
  if (Math.abs(velocity) < 0.5) {
    velocitySignal = 'stable';
  } else {
    // Compare recent velocity to earlier velocity
    const midIndex = Math.floor(candles.length / 2);
    const midPrice = candles[midIndex].close;
    const firstHalfChange = ((midPrice - firstPrice) / firstPrice) * 100;
    const secondHalfChange = ((currentPrice - midPrice) / midPrice) * 100;

    if (Math.abs(secondHalfChange) > Math.abs(firstHalfChange) * 1.2) {
      velocitySignal = 'accelerating';
    } else if (Math.abs(secondHalfChange) < Math.abs(firstHalfChange) * 0.8) {
      velocitySignal = 'decelerating';
    } else {
      velocitySignal = 'stable';
    }
  }

  // Calculate acceleration (change in velocity)
  const recentCandles = candles.slice(-Math.floor(candles.length / 3));
  const recentChange =
    ((recentCandles[recentCandles.length - 1].close - recentCandles[0].open) /
      recentCandles[0].open) *
    100;
  const recentDays =
    (recentCandles[recentCandles.length - 1].time - recentCandles[0].time) / 86400;
  const recentVelocity = recentDays > 0 ? recentChange / recentDays : 0;
  const acceleration = recentVelocity - velocity;

  let accelerationSignal: 'increasing' | 'decreasing' | 'neutral';
  if (acceleration > 0.3) {
    accelerationSignal = 'increasing';
  } else if (acceleration < -0.3) {
    accelerationSignal = 'decreasing';
  } else {
    accelerationSignal = 'neutral';
  }

  // Calculate magnitude from last significant swing
  const recentSwingLows = swings.filter((s) => s.type === 'low');
  const lastSwingLow = recentSwingLows[recentSwingLows.length - 1];
  let magnitude = Math.abs(totalChange);
  if (lastSwingLow) {
    magnitude = ((currentPrice - lastSwingLow.price) / lastSwingLow.price) * 100;
  }

  let magnitudeSignal: 'strong' | 'moderate' | 'weak';
  if (Math.abs(magnitude) > 15) {
    magnitudeSignal = 'strong';
  } else if (Math.abs(magnitude) > 5) {
    magnitudeSignal = 'moderate';
  } else {
    magnitudeSignal = 'weak';
  }

  return {
    velocity: {
      value: Math.round(velocity * 100) / 100,
      signal: velocitySignal,
      context: `Price moving ${velocity > 0 ? 'up' : 'down'} ~${Math.abs(velocity).toFixed(1)}% per day`,
    },
    acceleration: {
      value: Math.round(acceleration * 100) / 100,
      signal: accelerationSignal,
      context:
        accelerationSignal === 'neutral'
          ? 'Momentum holding steady'
          : accelerationSignal === 'increasing'
            ? 'Momentum building'
            : 'Momentum fading',
    },
    magnitude: {
      value: Math.round(magnitude * 100) / 100,
      signal: magnitudeSignal,
      context: `${Math.abs(magnitude).toFixed(1)}% move from recent swing`,
    },
  };
}

/**
 * Format price for display
 */
function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  } else if (price >= 1) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  } else {
    return price.toLocaleString('en-US', { maximumFractionDigits: 6 });
  }
}
