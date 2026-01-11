// Stablecoin identification for filtering
// Stablecoins are excluded from ranking as they have low volatility

// Known stablecoin IDs (CoinGecko format)
export const STABLECOIN_IDS = new Set([
  'tether',
  'usd-coin',
  'dai',
  'binance-usd',
  'trueusd',
  'frax',
  'pax-dollar',
  'usdd',
  'tusd',
  'gusd',
  'gemini-dollar',
  'first-digital-usd',
  'euro-coin',
  'stasis-eurs',
  'neutrino',
  'fei-protocol',
  'liquity-usd',
  'tether-gold',
  'paxos-gold',
  'eurs',
  'celo-dollar',
  'seur',
  'tor',
  'susd',
  'rai',
  'mimatic',
  'husd',
  'usde',
  'paypal-usd',
  'ethena-usde',
  'usdt',
  'usdc',
  'busd',
  'frax-share', // Not a stablecoin but related
]);

// Known stablecoin symbols (for DEX tokens without IDs)
export const STABLECOIN_SYMBOLS = new Set([
  'USDT',
  'USDC',
  'DAI',
  'BUSD',
  'TUSD',
  'FRAX',
  'USDP',
  'USDD',
  'GUSD',
  'LUSD',
  'SUSD',
  'RAI',
  'MIM',
  'EURS',
  'EURT',
  'HUSD',
  'CUSD',
  'CEUR',
  'PAXG', // Gold-backed but still stable
  'XAUT',
  'UST', // Algorithmic stablecoin (defunct but may still appear)
  'USDE',
  'PYUSD',
  'FDUSD',
  'EURC',
]);

// Wrapped and bridged stablecoin patterns
export const STABLECOIN_PATTERNS = [
  /^W?USDT/i,     // USDT, WUSDT
  /^W?USDC/i,     // USDC, WUSDC
  /^W?DAI/i,      // DAI, WDAI
  /^aUSD/i,       // Aave stablecoins
  /^cUSD/i,       // Compound stablecoins
  /^yUSD/i,       // Yearn stablecoins
  /^s[A-Z]*USD/i, // Synthetix stablecoins (sUSD)
  /USD[T|C]$/i,   // Ends with USDT or USDC
  /^USD[+-]/i,    // USD+ variants
];

/**
 * Check if a coin is a stablecoin based on ID, symbol, or name patterns
 */
export function isStablecoin(coin: {
  id?: string;
  symbol?: string;
  name?: string;
}): boolean {
  // Check by ID
  if (coin.id && STABLECOIN_IDS.has(coin.id.toLowerCase())) {
    return true;
  }

  // Check by symbol
  if (coin.symbol) {
    const upperSymbol = coin.symbol.toUpperCase();
    if (STABLECOIN_SYMBOLS.has(upperSymbol)) {
      return true;
    }

    // Check patterns
    for (const pattern of STABLECOIN_PATTERNS) {
      if (pattern.test(upperSymbol)) {
        return true;
      }
    }
  }

  // Check by name
  if (coin.name) {
    const lowerName = coin.name.toLowerCase();
    // Check if name contains common stablecoin identifiers
    if (
      lowerName.includes('usd coin') ||
      lowerName.includes('tether') ||
      lowerName.includes('stablecoin') ||
      lowerName.includes('stable coin') ||
      (lowerName.includes('dollar') && !lowerName.includes('dogecoin'))
    ) {
      return true;
    }
  }

  return false;
}
