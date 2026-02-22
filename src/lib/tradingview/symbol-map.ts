// Maps CoinGecko IDs to TradingView symbols

export interface TradingViewSymbolInfo {
  symbol: string;
  exchange: string;
  isSupported: boolean;
}

const SYMBOL_MAP: Record<string, { symbol: string; exchange: string }> = {
  bitcoin: { symbol: 'BTCUSDT', exchange: 'BINANCE' },
  ethereum: { symbol: 'ETHUSDT', exchange: 'BINANCE' },
  solana: { symbol: 'SOLUSDT', exchange: 'BINANCE' },
  'binancecoin': { symbol: 'BNBUSDT', exchange: 'BINANCE' },
  ripple: { symbol: 'XRPUSDT', exchange: 'BINANCE' },
  cardano: { symbol: 'ADAUSDT', exchange: 'BINANCE' },
  dogecoin: { symbol: 'DOGEUSDT', exchange: 'BINANCE' },
  avalanche: { symbol: 'AVAXUSDT', exchange: 'BINANCE' },
  'avalanche-2': { symbol: 'AVAXUSDT', exchange: 'BINANCE' },
  polkadot: { symbol: 'DOTUSDT', exchange: 'BINANCE' },
  chainlink: { symbol: 'LINKUSDT', exchange: 'BINANCE' },
  'matic-network': { symbol: 'MATICUSDT', exchange: 'BINANCE' },
  polygon: { symbol: 'MATICUSDT', exchange: 'BINANCE' },
  'near-protocol': { symbol: 'NEARUSDT', exchange: 'BINANCE' },
  near: { symbol: 'NEARUSDT', exchange: 'BINANCE' },
  litecoin: { symbol: 'LTCUSDT', exchange: 'BINANCE' },
  'bitcoin-cash': { symbol: 'BCHUSDT', exchange: 'BINANCE' },
  uniswap: { symbol: 'UNIUSDT', exchange: 'BINANCE' },
  'shiba-inu': { symbol: 'SHIBUSDT', exchange: 'BINANCE' },
  tron: { symbol: 'TRXUSDT', exchange: 'BINANCE' },
  cosmos: { symbol: 'ATOMUSDT', exchange: 'BINANCE' },
  stellar: { symbol: 'XLMUSDT', exchange: 'BINANCE' },
  'internet-computer': { symbol: 'ICPUSDT', exchange: 'BINANCE' },
  filecoin: { symbol: 'FILUSDT', exchange: 'BINANCE' },
  arbitrum: { symbol: 'ARBUSDT', exchange: 'BINANCE' },
  optimism: { symbol: 'OPUSDT', exchange: 'BINANCE' },
  aptos: { symbol: 'APTUSDT', exchange: 'BINANCE' },
  sui: { symbol: 'SUIUSDT', exchange: 'BINANCE' },
  aave: { symbol: 'AAVEUSDT', exchange: 'BINANCE' },
  maker: { symbol: 'MKRUSDT', exchange: 'BINANCE' },
  render: { symbol: 'RENDERUSDT', exchange: 'BINANCE' },
  'render-token': { symbol: 'RENDERUSDT', exchange: 'BINANCE' },
  injective: { symbol: 'INJUSDT', exchange: 'BINANCE' },
  'injective-protocol': { symbol: 'INJUSDT', exchange: 'BINANCE' },
  'the-graph': { symbol: 'GRTUSDT', exchange: 'BINANCE' },
  fantom: { symbol: 'FTMUSDT', exchange: 'BINANCE' },
  mantle: { symbol: 'MNTUSDT', exchange: 'BINANCE' },
  sei: { symbol: 'SEIUSDT', exchange: 'BINANCE' },
  pepe: { symbol: 'PEPEUSDT', exchange: 'BINANCE' },
  'floki-inu': { symbol: 'FLOKIUSDT', exchange: 'BINANCE' },
  floki: { symbol: 'FLOKIUSDT', exchange: 'BINANCE' },
  bonk: { symbol: 'BONKUSDT', exchange: 'BINANCE' },
  'bonk-1': { symbol: 'BONKUSDT', exchange: 'BINANCE' },
  jupiter: { symbol: 'JUPUSDT', exchange: 'BINANCE' },
  'jupiter-exchange-solana': { symbol: 'JUPUSDT', exchange: 'BINANCE' },
  'ondo-finance': { symbol: 'ONDOUSDT', exchange: 'BINANCE' },
  ondo: { symbol: 'ONDOUSDT', exchange: 'BINANCE' },
  celestia: { symbol: 'TIAUSDT', exchange: 'BINANCE' },
  'starknet-token': { symbol: 'STRKUSDT', exchange: 'BINANCE' },
  starknet: { symbol: 'STRKUSDT', exchange: 'BINANCE' },
  'immutable-x': { symbol: 'IMXUSDT', exchange: 'BINANCE' },
  algorand: { symbol: 'ALGOUSDT', exchange: 'BINANCE' },
  'hedera-hashgraph': { symbol: 'HBARUSDT', exchange: 'BINANCE' },
  hedera: { symbol: 'HBARUSDT', exchange: 'BINANCE' },
  'lido-dao': { symbol: 'LDOUSDT', exchange: 'BINANCE' },
  'ethereum-classic': { symbol: 'ETCUSDT', exchange: 'BINANCE' },
  monero: { symbol: 'XMRUSDT', exchange: 'BINANCE' },
  'leo-token': { symbol: 'LEOUSDT', exchange: 'BITFINEX' },
  'wrapped-bitcoin': { symbol: 'WBTCUSDT', exchange: 'BINANCE' },
  okb: { symbol: 'OKBUSDT', exchange: 'OKX' },
  cronos: { symbol: 'CROUSDT', exchange: 'BINANCE' },
  kaspa: { symbol: 'KASUSDT', exchange: 'BINANCE' },
  'fetch-ai': { symbol: 'FETUSDT', exchange: 'BINANCE' },
  'artificial-superintelligence-alliance': { symbol: 'FETUSDT', exchange: 'BINANCE' },
  thorchain: { symbol: 'RUNEUSDT', exchange: 'BINANCE' },
  'theta-network': { symbol: 'THETAUSDT', exchange: 'BINANCE' },
  eos: { symbol: 'EOSUSDT', exchange: 'BINANCE' },
  'flow-token': { symbol: 'FLOWUSDT', exchange: 'BINANCE' },
  flow: { symbol: 'FLOWUSDT', exchange: 'BINANCE' },
  axie: { symbol: 'AXSUSDT', exchange: 'BINANCE' },
  'axie-infinity': { symbol: 'AXSUSDT', exchange: 'BINANCE' },
  decentraland: { symbol: 'MANAUSDT', exchange: 'BINANCE' },
  'the-sandbox': { symbol: 'SANDUSDT', exchange: 'BINANCE' },
  'gala-games': { symbol: 'GALAUSDT', exchange: 'BINANCE' },
  gala: { symbol: 'GALAUSDT', exchange: 'BINANCE' },
  'elrond-erd-2': { symbol: 'EGLDUSDT', exchange: 'BINANCE' },
  'multiversx-egld': { symbol: 'EGLDUSDT', exchange: 'BINANCE' },
  'compound-governance-token': { symbol: 'COMPUSDT', exchange: 'BINANCE' },
  curve: { symbol: 'CRVUSDT', exchange: 'BINANCE' },
  'curve-dao-token': { symbol: 'CRVUSDT', exchange: 'BINANCE' },
  '1inch': { symbol: '1INCHUSDT', exchange: 'BINANCE' },
  '1inch-network': { symbol: '1INCHUSDT', exchange: 'BINANCE' },
  ens: { symbol: 'ENSUSDT', exchange: 'BINANCE' },
  'ethereum-name-service': { symbol: 'ENSUSDT', exchange: 'BINANCE' },
  pendle: { symbol: 'PENDLEUSDT', exchange: 'BINANCE' },
  worldcoin: { symbol: 'WLDUSDT', exchange: 'BINANCE' },
  'worldcoin-wld': { symbol: 'WLDUSDT', exchange: 'BINANCE' },
  pyth: { symbol: 'PYTHUSDT', exchange: 'BINANCE' },
  'pyth-network': { symbol: 'PYTHUSDT', exchange: 'BINANCE' },
  wormhole: { symbol: 'WUSDT', exchange: 'BINANCE' },
  toncoin: { symbol: 'TONUSDT', exchange: 'BINANCE' },
  'the-open-network': { symbol: 'TONUSDT', exchange: 'BINANCE' },
};

/**
 * Try to build a TradingView symbol from a ticker symbol dynamically.
 * Falls back to BINANCE:{SYMBOL}USDT format.
 */
function dynamicFallback(tickerSymbol: string): TradingViewSymbolInfo {
  const upper = tickerSymbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return {
    symbol: `BINANCE:${upper}USDT`,
    exchange: 'BINANCE',
    isSupported: false, // not verified
  };
}

/**
 * Get the TradingView symbol for a CoinGecko coin ID.
 * @param coinGeckoId - e.g. "bitcoin", "ethereum"
 * @param tickerSymbol - e.g. "BTC", "ETH" (used for dynamic fallback)
 */
export function getTradingViewSymbol(
  coinGeckoId: string,
  tickerSymbol?: string
): TradingViewSymbolInfo {
  const mapped = SYMBOL_MAP[coinGeckoId.toLowerCase()];
  if (mapped) {
    return {
      symbol: `${mapped.exchange}:${mapped.symbol}`,
      exchange: mapped.exchange,
      isSupported: true,
    };
  }

  if (tickerSymbol) {
    return dynamicFallback(tickerSymbol);
  }

  return {
    symbol: '',
    exchange: '',
    isSupported: false,
  };
}
