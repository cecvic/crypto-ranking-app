// TradingView widget configuration constants

export const TRADINGVIEW_SCRIPT_URL = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';

export const TRADINGVIEW_WIDGET_BASE = 'https://s3.tradingview.com/external-embedding/';

export const WIDGET_SCRIPTS = {
  advancedChart: 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js',
  technicalAnalysis: 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js',
  tickerTape: 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js',
  symbolInfo: 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js',
} as const;

export const DARK_THEME = {
  colorTheme: 'dark' as const,
  backgroundColor: 'rgba(0, 0, 0, 0)',
  gridLineColor: 'rgba(255, 255, 255, 0.06)',
  fontColor: '#9ca3af',
  isTransparent: true,
} as const;

export const CHART_STUDIES = [
  'RSI@tv-basicstudies',
  'MACD@tv-basicstudies',
  'Volume@tv-basicstudies',
] as const;

export const TICKER_TAPE_SYMBOLS = [
  { proName: 'BINANCE:BTCUSDT', title: 'BTC/USDT' },
  { proName: 'BINANCE:ETHUSDT', title: 'ETH/USDT' },
  { proName: 'BINANCE:SOLUSDT', title: 'SOL/USDT' },
  { proName: 'BINANCE:BNBUSDT', title: 'BNB/USDT' },
  { proName: 'BINANCE:XRPUSDT', title: 'XRP/USDT' },
  { proName: 'BINANCE:ADAUSDT', title: 'ADA/USDT' },
  { proName: 'BINANCE:DOGEUSDT', title: 'DOGE/USDT' },
  { proName: 'BINANCE:AVAXUSDT', title: 'AVAX/USDT' },
  { proName: 'BINANCE:DOTUSDT', title: 'DOT/USDT' },
  { proName: 'BINANCE:LINKUSDT', title: 'LINK/USDT' },
  { proName: 'BINANCE:MATICUSDT', title: 'MATIC/USDT' },
  { proName: 'BINANCE:NEARUSDT', title: 'NEAR/USDT' },
] as const;

export const TA_INTERVALS = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1D', label: '1D' },
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
] as const;
