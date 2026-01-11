// Utility functions for coin data processing
// Includes deduplication, normalization, and filtering

import { AggregatedCoin, DexPaprikaToken, DexScreenerPair, CoinPrice, CoinSource } from '../types';
import { isStablecoin } from '../constants/stablecoins';

/**
 * Normalize DexPaprika token to AggregatedCoin format
 */
export function normalizeDexPaprikaToken(token: DexPaprikaToken): AggregatedCoin {
  return {
    id: `dexpaprika-${token.chain}-${token.address}`,
    symbol: token.symbol.toUpperCase(),
    name: token.name,
    image: token.logo_url,
    price: token.price_usd,
    volume_24h: token.volume_24h_usd,
    price_change_24h: token.price_change_24h,
    market_cap: token.market_cap_usd,
    chain: token.chain,
    address: token.address,
    source: 'dexpaprika',
    last_updated: new Date().toISOString(),
  };
}

/**
 * Normalize DexScreener pair to AggregatedCoin format
 */
export function normalizeDexScreenerPair(pair: DexScreenerPair): AggregatedCoin {
  return {
    id: `dexscreener-${pair.chainId}-${pair.baseToken.address}`,
    symbol: pair.baseToken.symbol.toUpperCase(),
    name: pair.baseToken.name,
    image: pair.info?.imageUrl,
    price: parseFloat(pair.priceUsd) || 0,
    volume_24h: pair.volume?.h24 || 0,
    price_change_24h: pair.priceChange?.h24 || 0,
    market_cap: pair.marketCap || pair.fdv,
    chain: pair.chainId,
    address: pair.baseToken.address,
    source: 'dexscreener',
    last_updated: new Date().toISOString(),
  };
}

/**
 * Normalize CoinGecko coin to AggregatedCoin format
 */
export function normalizeCoingeckoCoin(
  coin: CoinPrice,
  category?: 'meme' | 'ai' | 'defi'
): AggregatedCoin {
  const aggregated: AggregatedCoin = {
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    image: coin.image,
    price: coin.current_price,
    volume_24h: coin.total_volume,
    price_change_24h: coin.price_change_percentage_24h,
    market_cap: coin.market_cap,
    source: 'coingecko',
    last_updated: coin.last_updated,
  };

  // Set category flags
  if (category === 'meme') {
    aggregated.is_meme = true;
    aggregated.categories = ['meme'];
  } else if (category === 'ai') {
    aggregated.is_ai = true;
    aggregated.categories = ['ai'];
  } else if (category === 'defi') {
    aggregated.is_defi = true;
    aggregated.categories = ['defi'];
  }

  return aggregated;
}

/**
 * Create a unique key for deduplication
 * Priority: address > id > symbol+name
 */
function getDeduplicationKey(coin: AggregatedCoin): string {
  // If we have an address, use chain+address
  if (coin.address && coin.chain) {
    return `${coin.chain.toLowerCase()}-${coin.address.toLowerCase()}`;
  }

  // For CoinGecko coins, use the id (which is unique)
  if (coin.source === 'coingecko' && coin.id && !coin.id.startsWith('dex')) {
    return `coingecko-${coin.id}`;
  }

  // Fallback to symbol + normalized name
  return `${coin.symbol.toUpperCase()}-${coin.name.toLowerCase().replace(/\s+/g, '-')}`;
}

/**
 * Deduplicate coins from multiple sources
 * Priority: CoinGecko > DexPaprika > DexScreener (for metadata quality)
 */
export function deduplicateCoins(coins: AggregatedCoin[]): AggregatedCoin[] {
  const seen = new Map<string, AggregatedCoin>();
  const symbolMap = new Map<string, AggregatedCoin[]>();

  // First pass: group by deduplication key
  for (const coin of coins) {
    const key = getDeduplicationKey(coin);

    if (!seen.has(key)) {
      seen.set(key, coin);
    } else {
      // Merge: prefer CoinGecko data, accumulate sources and categories
      const existing = seen.get(key)!;
      seen.set(key, mergeCoinData(existing, coin));
    }

    // Also track by symbol for additional dedup
    const symbolKey = coin.symbol.toUpperCase();
    if (!symbolMap.has(symbolKey)) {
      symbolMap.set(symbolKey, []);
    }
    symbolMap.get(symbolKey)!.push(coin);
  }

  // Second pass: dedupe by symbol for coins that might have different addresses
  // but are the same token (e.g., bridged tokens)
  const result = Array.from(seen.values());

  // Remove duplicates with same symbol but different sources
  // Keep the one with highest volume or market cap
  const finalMap = new Map<string, AggregatedCoin>();

  for (const coin of result) {
    const symbolKey = coin.symbol.toUpperCase();
    const existing = finalMap.get(symbolKey);

    if (!existing) {
      finalMap.set(symbolKey, coin);
    } else {
      // Keep the coin with better data quality
      const existingScore = getCoinDataQuality(existing);
      const newScore = getCoinDataQuality(coin);

      if (newScore > existingScore) {
        // Merge categories and sources from existing
        const merged = mergeCoinData(coin, existing);
        finalMap.set(symbolKey, merged);
      } else {
        // Merge categories and sources from new into existing
        const merged = mergeCoinData(existing, coin);
        finalMap.set(symbolKey, merged);
      }
    }
  }

  return Array.from(finalMap.values());
}

/**
 * Calculate data quality score for prioritization
 */
function getCoinDataQuality(coin: AggregatedCoin): number {
  let score = 0;

  // Source priority
  if (coin.source === 'coingecko') score += 100;
  else if (coin.source === 'dexpaprika') score += 50;
  else if (coin.source === 'dexscreener') score += 25;

  // Has market cap
  if (coin.market_cap && coin.market_cap > 0) score += 30;

  // Has image
  if (coin.image) score += 10;

  // Has volume
  if (coin.volume_24h && coin.volume_24h > 0) score += 20;

  // Has categories
  if (coin.categories && coin.categories.length > 0) score += 15;

  return score;
}

/**
 * Merge two coin records, preferring data from the higher quality source
 */
function mergeCoinData(primary: AggregatedCoin, secondary: AggregatedCoin): AggregatedCoin {
  const merged: AggregatedCoin = { ...primary };

  // Merge sources
  const sources = new Set<CoinSource>(merged.sources || [merged.source]);
  sources.add(secondary.source);
  if (secondary.sources) {
    secondary.sources.forEach(s => sources.add(s));
  }
  merged.sources = Array.from(sources);

  // Merge categories
  const categories = new Set(merged.categories || []);
  if (secondary.categories) {
    secondary.categories.forEach(c => categories.add(c));
  }
  merged.categories = Array.from(categories);

  // Merge category flags
  merged.is_meme = merged.is_meme || secondary.is_meme;
  merged.is_ai = merged.is_ai || secondary.is_ai;
  merged.is_defi = merged.is_defi || secondary.is_defi;
  merged.is_gaming = merged.is_gaming || secondary.is_gaming;

  // Fill in missing data from secondary
  if (!merged.image && secondary.image) merged.image = secondary.image;
  if (!merged.market_cap && secondary.market_cap) merged.market_cap = secondary.market_cap;
  if (!merged.chain && secondary.chain) merged.chain = secondary.chain;
  if (!merged.address && secondary.address) merged.address = secondary.address;

  return merged;
}

/**
 * Filter out stablecoins from the coin list
 */
export function filterStablecoins(coins: AggregatedCoin[]): AggregatedCoin[] {
  return coins.filter(coin => !isStablecoin({
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
  }));
}

/**
 * Filter coins by minimum volume threshold
 */
export function filterByVolume(coins: AggregatedCoin[], minVolume: number): AggregatedCoin[] {
  return coins.filter(coin => coin.volume_24h >= minVolume);
}

/**
 * Filter coins by category
 */
export function filterByCategory(
  coins: AggregatedCoin[],
  category: 'meme' | 'ai' | 'defi' | 'all'
): AggregatedCoin[] {
  if (category === 'all') return coins;

  return coins.filter(coin => {
    switch (category) {
      case 'meme': return coin.is_meme;
      case 'ai': return coin.is_ai;
      case 'defi': return coin.is_defi;
      default: return true;
    }
  });
}

/**
 * Sort coins by a specific field
 */
export function sortCoins(
  coins: AggregatedCoin[],
  field: 'volume' | 'price' | 'change' | 'market_cap',
  direction: 'asc' | 'desc' = 'desc'
): AggregatedCoin[] {
  const sorted = [...coins].sort((a, b) => {
    let aVal: number, bVal: number;

    switch (field) {
      case 'volume':
        aVal = a.volume_24h || 0;
        bVal = b.volume_24h || 0;
        break;
      case 'price':
        aVal = a.price || 0;
        bVal = b.price || 0;
        break;
      case 'change':
        aVal = a.price_change_24h || 0;
        bVal = b.price_change_24h || 0;
        break;
      case 'market_cap':
        aVal = a.market_cap || 0;
        bVal = b.market_cap || 0;
        break;
      default:
        return 0;
    }

    return direction === 'desc' ? bVal - aVal : aVal - bVal;
  });

  return sorted;
}

/**
 * Convert AggregatedCoin to CoinPrice for backward compatibility
 */
export function aggregatedToCoinPrice(coin: AggregatedCoin): CoinPrice {
  return {
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    image: coin.image || '/placeholder-coin.png',
    current_price: coin.price,
    market_cap: coin.market_cap || 0,
    market_cap_rank: 0, // Will be computed by rankings
    total_volume: coin.volume_24h,
    price_change_percentage_24h: coin.price_change_24h,
    price_change_percentage_7d: 0, // Not available from DEX sources
    last_updated: coin.last_updated,
  };
}
