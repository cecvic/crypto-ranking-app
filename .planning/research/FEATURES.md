# Features Research: Birdeye API Capabilities

**Domain:** Crypto data API for ranking application
**Researched:** 2026-01-21
**Confidence:** HIGH (verified via official documentation)

## Executive Summary

Birdeye API is a DEX-focused data provider with strong on-chain analytics, but it differs fundamentally from CoinGecko. CoinGecko provides aggregated CEX+DEX market data with global market cap rankings; Birdeye provides granular DEX-level data per chain with real-time on-chain analytics.

**Key finding:** Birdeye excels at what CoinGecko cannot do (whale tracking, holder analysis, security checks) but requires extra work to achieve CoinGecko parity for basic market data display.

---

## Table Stakes (CoinGecko Parity)

These are the CoinPrice type fields currently fetched from CoinGecko and how Birdeye can provide them.

| CoinPrice Field | CoinGecko Source | Birdeye Equivalent | Parity Status |
|-----------------|------------------|-------------------|---------------|
| `current_price` | `/coins/markets` | `/defi/price` | FULL - 10 CU |
| `total_volume` | `/coins/markets` | `/defi/tokenlist` (v24hUSD) | FULL - 30 CU |
| `price_change_percentage_24h` | `/coins/markets` | `/defi/price` (priceChange24h) | FULL - 10 CU |
| `price_change_percentage_7d` | `/coins/markets` | OHLCV calculation required | PARTIAL - 40 CU |
| `market_cap` | `/coins/markets` | `/defi/v3/token/market-data` (mc) | FULL - 15 CU |
| `market_cap_rank` | `/coins/markets` | NOT AVAILABLE | GAP |
| `sparkline_in_7d` | `/coins/markets` (sparkline=true) | OHLCV/history_price required | PARTIAL - 60 CU |
| `image` | `/coins/markets` | `/defi/tokenlist` (logoURI) | FULL |
| `last_updated` | `/coins/markets` | All endpoints (updateUnixTime) | FULL |

### Endpoint Mapping for Table Stakes

**1. Price Data - `/defi/price`**
```
GET https://public-api.birdeye.so/defi/price?address={token_address}
Headers: x-chain: {chain}, X-API-KEY: {key}

Response:
{
  "success": true,
  "data": {
    "value": 0.00001234,           // current_price
    "updateUnixTime": 1705853400,
    "updateHumanTime": "2026-01-21T10:30:00",
    "priceChange24h": -2.5,        // price_change_percentage_24h
    "liquidity": 50000             // bonus: liquidity data
  }
}
```
- Cost: 10 CU per call
- Rate limit: 300 rps (Premium tier)

**2. Token List - `/defi/tokenlist`**
```
GET https://public-api.birdeye.so/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&limit=50
Headers: x-chain: {chain}

Response per token:
{
  "address": "...",
  "symbol": "SOL",
  "name": "Solana",
  "decimals": 9,
  "logoURI": "https://...",        // image
  "liquidity": 1000000,
  "v24hUSD": 500000000,            // total_volume
  "v24hChangePercent": -2.5,       // price_change_percentage_24h
  "price": 150.25,                 // current_price
  "mc": 65000000000                // market_cap (optional, may be null)
}
```
- Cost: 30 CU per call
- Returns up to 50 tokens per request

**3. OHLCV Data - `/defi/ohlcv`**
```
GET https://public-api.birdeye.so/defi/ohlcv?address={addr}&type=1H&time_from={7d_ago}&time_to={now}

Response:
{
  "success": true,
  "data": {
    "items": [
      { "o": 150, "h": 152, "l": 149, "c": 151, "v": 1000000, "unixTime": 1705853400 }
    ]
  }
}
```
- Cost: 40 CU per call
- Max 1000 records (v1) or 5000 records (v3)
- Intervals: 1m, 3m, 5m, 15m, 30m, 1H, 2H, 4H, 6H, 8H, 12H, 1D, 3D, 1W, 1M
- V3 adds: 1s, 15s, 30s intervals (sub-minute data since May 2025)

### Sparkline Generation Strategy

CoinGecko provides sparkline as a pre-built array of 168 hourly prices. Birdeye requires manual construction:

```typescript
// To generate 7-day sparkline equivalent
async function getSparkline(address: string, chain: string): Promise<number[]> {
  const now = Math.floor(Date.now() / 1000);
  const sevenDaysAgo = now - (7 * 24 * 60 * 60);

  const response = await birdeyeApi.get('/defi/ohlcv', {
    params: {
      address,
      type: '1H',  // hourly for 168 data points
      time_from: sevenDaysAgo,
      time_to: now
    }
  });

  return response.data.data.items.map(item => item.c); // close prices
}
```
- Cost: 40 CU per token
- Must be called separately per token

### 7-Day Price Change Calculation

```typescript
// Calculate 7d change from OHLCV data
function calculate7dChange(ohlcvItems: OHLCVItem[]): number {
  if (ohlcvItems.length < 2) return 0;
  const oldestPrice = ohlcvItems[0].o;
  const currentPrice = ohlcvItems[ohlcvItems.length - 1].c;
  return ((currentPrice - oldestPrice) / oldestPrice) * 100;
}
```

---

## Differentiators (Birdeye Advantages)

These capabilities are unique to Birdeye and enable features CoinGecko cannot provide.

### 1. Real-Time Transaction Monitoring (Whale Detection)

**Endpoint:** `/defi/txs/token`
```
GET https://public-api.birdeye.so/defi/txs/token?address={addr}&tx_type=swap&limit=50

Response item:
{
  "txHash": "...",
  "blockUnixTime": 1705853400,
  "source": "raydium",
  "side": "buy",
  "owner": "wallet_address",
  "volumeUsd": 50000,              // Trade size in USD
  "amount": 1000,
  "priceUsd": 150.25
}
```
- Cost: 10 CU per call
- Max 50 items per request (offset + limit <= 10000)
- Filter by tx_type: swap, add, remove, all

**V3 Trades by Volume - `/defi/v3/trades/token-by-volume`**
- Filter trades by min_volume and max_volume
- Perfect for whale detection (e.g., min_volume: 10000 USD)
- Unlimited time range for historical analysis
- Cost: 25 CU per call

### 2. Token Holder Analysis

**Endpoint:** `/defi/v3/token/holder`
```
GET https://public-api.birdeye.so/defi/v3/token/holder?address={addr}

Returns: Top 10,000 token holders with:
- Wallet addresses
- Token amounts (raw and ui_amount)
- Holder concentration metrics
```
- Cost: 50 CU per call
- Available: Starter tier and above
- Use case: Detect distribution changes, insider accumulation

### 3. Token Security Analysis (Rug Pull Detection)

**Endpoint:** `/defi/token_security`
```
GET https://public-api.birdeye.so/defi/token_security?address={addr}

Response:
{
  "isToken2022": false,
  "freezeAuthority": null,         // null = safe, address = risk
  "mintAuthority": null,           // null = supply locked
  "isProxy": false,
  "creatorAddress": "...",
  "creationTime": 1705853400
}
```
- Cost: 50 CU per call
- Critical for new token evaluation
- Maps directly to existing `BirdeyeSecurityInfo` type

### 4. Multi-Chain Support

Birdeye supports 11 chains vs CoinGecko's chain-agnostic approach:
- Solana (primary focus)
- Ethereum
- Base
- Arbitrum
- Optimism
- Polygon
- BSC
- Avalanche
- zkSync
- Sui
- Monad

**Header-based chain selection:**
```
x-chain: solana | ethereum | base | arbitrum | ...
```

### 5. Real-Time WebSocket Streaming

**Available subscriptions:**
- `SUBSCRIBE_PRICE` - Real-time OHLCV updates
- `SUBSCRIBE_TXS` - Transaction stream per token/pair
- `SUBSCRIBE_TOKEN_NEW_LISTING` - New token alerts
- `SUBSCRIBE_WALLET_TXS` - Wallet activity monitoring

**Requirements:** Business tier ($699/month) minimum for WebSocket access

### 6. Liquidity Data

Every price endpoint includes optional liquidity data:
```
GET /defi/price?address={addr}&include_liquidity=true

Response includes:
{
  "liquidity": 500000  // USD liquidity in pools
}
```

### 7. Exit Liquidity Analysis (New 2025)

**Endpoint:** `/defi/v3/token/exit-liquidity`
- Analyze how much a holder could actually sell
- Critical for risk assessment on low-cap tokens

---

## Gaps (Missing vs CoinGecko)

### Critical Gaps

| Feature | CoinGecko | Birdeye | Impact |
|---------|-----------|---------|--------|
| **Global Market Cap Rank** | Native field | NOT AVAILABLE | Cannot show "Rank #5" style display |
| **Global Market Data** | `/global` endpoint | NOT AVAILABLE | No total crypto market cap, BTC dominance |
| **Category Filtering** | `category` param | NOT AVAILABLE | Cannot fetch "all meme coins" in one call |
| **CEX Data** | Aggregated | DEX only | Misses Binance, Coinbase, etc. volume |
| **Coin ID System** | Consistent IDs (bitcoin, ethereum) | Address-based only | Must map symbols to addresses per chain |
| **Fiat Pairs** | Multiple vs_currency | USD only | No EUR, GBP price display |

### Moderate Gaps

| Feature | CoinGecko | Birdeye |
|---------|-----------|---------|
| Built-in sparkline | Single API call | Requires OHLCV call per token |
| Pre-calculated 7d change | Included | Must calculate from OHLCV |
| Search by name | `/search` endpoint | Must maintain local index |
| Community data | Included | Not available |
| Developer data | Included | Not available |

### Gap Mitigation Strategies

**1. Market Cap Rank**
- Option A: Maintain rank locally based on market cap values
- Option B: Use CoinGecko for global rankings, Birdeye for on-chain data
- Recommendation: Hybrid approach - CoinGecko for top 100, Birdeye for DEX tokens

**2. Sparkline Generation**
```typescript
// Batch OHLCV fetches with caching
async function batchSparklines(addresses: string[], chain: string) {
  const results = await Promise.all(
    addresses.map(addr => getCachedOHLCV(addr, chain, '1H', 168))
  );
  return results.map(r => r.items.map(i => i.c));
}
```
- Cache sparklines for 1 hour (data is hourly anyway)
- Pre-fetch during off-peak times

**3. Category Discovery**
- Build local category mapping
- Use token metadata/tags from Birdeye responses
- Cross-reference with existing DexScreener categorization

---

## Key Endpoints Summary

### Price & Market Data

| Endpoint | Path | CU Cost | Description |
|----------|------|---------|-------------|
| Price (single) | `/defi/price` | 10 | Real-time price + 24h change |
| Price (multiple) | `/defi/multi_price` | 10 | Batch price queries |
| Price (history) | `/defi/history_price` | 60 | Historical price line chart |
| Price (history unix) | `/defi/historical_price_unix` | 10 | Bulk historical by timestamp |
| Market Data | `/defi/v3/token/market-data` | 15 | MC, supply, liquidity |
| Token Overview | `/defi/token_overview` | 30 | All-in-one token data |

### Lists & Discovery

| Endpoint | Path | CU Cost | Description |
|----------|------|---------|-------------|
| Token List | `/defi/tokenlist` | 30 | List by volume/liquidity |
| Token List V3 | `/defi/v3/token/list` | 100 | Advanced filtering, sorting |
| Trending | `/defi/token_trending` | 10 | Trending by rank/volume |
| New Listings | WebSocket only | - | Real-time new token alerts |

### OHLCV & Charts

| Endpoint | Path | CU Cost | Description |
|----------|------|---------|-------------|
| OHLCV (token) | `/defi/ohlcv` | 40 | Candlestick data, max 1000 |
| OHLCV V3 | `/defi/v3/ohlcv` | 40 | Max 5000, sub-minute intervals |
| OHLCV (pair) | `/defi/ohlcv/pair` | 40 | Pair-based candlesticks |

### Trades & Transactions

| Endpoint | Path | CU Cost | Description |
|----------|------|---------|-------------|
| Trades (token) | `/defi/txs/token` | 10 | Recent swaps, max 50 |
| Trades (pair) | `/defi/txs/pair` | 10 | Pair-specific trades |
| Trades by Volume V3 | `/defi/v3/trades/token-by-volume` | 25 | Filter by trade size |

### Security & Holders

| Endpoint | Path | CU Cost | Description |
|----------|------|---------|-------------|
| Token Security | `/defi/token_security` | 50 | Rug pull indicators |
| Holder List | `/defi/v3/token/holder` | 50 | Top 10,000 holders |

---

## Data Mapping: Birdeye to CoinPrice Type

```typescript
// Current CoinPrice interface
interface CoinPrice {
  id: string;                      // Birdeye: address (chain-specific)
  symbol: string;                  // Birdeye: symbol
  name: string;                    // Birdeye: name
  image: string;                   // Birdeye: logoURI
  current_price: number;           // Birdeye: price or value
  market_cap: number;              // Birdeye: mc (may be null)
  market_cap_rank: number;         // Birdeye: NOT AVAILABLE (calculate locally)
  total_volume: number;            // Birdeye: v24hUSD or volume24hUSD
  price_change_percentage_24h: number; // Birdeye: priceChange24h or v24hChangePercent
  price_change_percentage_7d: number;  // Birdeye: Calculate from OHLCV
  sparkline_in_7d?: { price: number[] }; // Birdeye: Build from OHLCV
  last_updated: string;            // Birdeye: updateHumanTime
}

// Transformation function
function birdeyeToCoingPrice(token: BirdeyeToken, chain: string): CoinPrice {
  return {
    id: `${chain}:${token.address}`,  // Composite ID for multi-chain
    symbol: token.symbol,
    name: token.name,
    image: token.logoURI || '',
    current_price: token.price,
    market_cap: token.mc || 0,
    market_cap_rank: 0,               // Calculate separately
    total_volume: token.volume24hUSD,
    price_change_percentage_24h: token.priceChange24h,
    price_change_percentage_7d: 0,    // Fetch separately via OHLCV
    sparkline_in_7d: undefined,       // Fetch separately via OHLCV
    last_updated: new Date().toISOString()
  };
}
```

---

## Limitations & Constraints

### Rate Limits by Tier

| Tier | Rate Limit | CUs/Month | Monthly Cost |
|------|-----------|-----------|--------------|
| Free | 1 rps | 30,000 | $0 |
| Starter | 15 rps | 5,000,000 | $99 |
| Premium | 50 rps | 15,000,000 | $199 |
| Business | 100 rps | 100,000,000 | $699 |

### CU Budget Example (100 tokens, hourly refresh)

| Operation | Per Token | Total/Hour | Total/Day | CUs/Month |
|-----------|-----------|------------|-----------|-----------|
| Price fetch | 10 CU | 1,000 CU | 24,000 CU | 720,000 CU |
| OHLCV (sparkline) | 40 CU | 4,000 CU | 96,000 CU | 2,880,000 CU |
| Security check | 50 CU | 5,000 CU | Once/day | 150,000 CU |
| **Total** | | | | **3,750,000 CU** |

**Recommendation:** Starter tier ($99/month) sufficient for 100-token tracking with hourly updates.

### Pagination Constraints

- `/defi/txs/token`: offset + limit <= 10,000
- `/defi/tokenlist`: max 50 per request
- `/defi/ohlcv`: max 1000 records (v1), 5000 (v3)
- `/defi/v3/token/holder`: max 10,000 holders

### Network-Specific Limitations

- **Sui network:** Reduced functionality (no wallet APIs, different liquidity calculation)
- **Wallet APIs (all chains):** Beta, limited to 5 rps / 75 rpm across all tiers

---

## Recommendations

### For CoinGecko Replacement

1. **Hybrid approach recommended:** Keep CoinGecko for global rankings and sparklines for top coins; use Birdeye for DEX-specific data and whale tracking.

2. **If full Birdeye migration:**
   - Accept loss of market_cap_rank (calculate locally)
   - Budget 40 CU per token for sparkline generation
   - Implement aggressive caching (sparklines valid for 1 hour)
   - Starter tier ($99/month) minimum

### For Whale Detection (New Feature)

Use `/defi/v3/trades/token-by-volume` with min_volume filter:
```typescript
const whaleThreshold = 10000; // $10k USD
const trades = await birdeyeApi.get('/defi/v3/trades/token-by-volume', {
  params: { address, min_volume: whaleThreshold }
});
```

### For Liquidity Analysis (New Feature)

Combine:
1. `/defi/price?include_liquidity=true` - Current liquidity
2. `/defi/v3/token/exit-liquidity` - Sellable liquidity
3. `/defi/v3/token/holder` - Concentration risk

### Multi-Chain Expansion

Birdeye supports 11 chains. Extend `BIRDEYE_CHAINS` constant:
```typescript
export const BIRDEYE_CHAINS = {
  solana: 'solana',
  ethereum: 'ethereum',
  base: 'base',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  polygon: 'polygon',
  bsc: 'bsc',
  avalanche: 'avalanche',
  zksync: 'zksync',
  sui: 'sui',
  monad: 'monad'
} as const;
```

---

## Sources

### Primary (HIGH confidence)
- [Birdeye Official Documentation](https://docs.birdeye.so/)
- [Birdeye API Reference](https://docs.birdeye.so/reference/get-defi-price)
- [Birdeye Pricing & CU Costs](https://docs.birdeye.so/docs/pricing)
- [Birdeye Supported Networks](https://docs.birdeye.so/docs/supported-networks)
- [Birdeye Data Accessibility](https://docs.birdeye.so/docs/data-accessibility-by-packages)

### Secondary (MEDIUM confidence)
- [Birdeye Developer Portal](https://developers.birdeye.com/)
- [Birdeye Data Services Blog](https://bds.birdeye.so/)
- [Token List V3 Announcement](https://medium.com/@birdeye-data/new-api-token-list-v3-api-2bf5f24b8e75)
- [Trades by Volume V3 Blog](https://bds.birdeye.so/blog/detail/filter-analyze-and-discover-token-activity-with-trades-by-volume-v3)

### Comparative
- [DEX API Comparison 2025](https://coinpaprika.com/education/best-free-dex-api-2025-dexpaprika-vs-dextools-vs-geckoterminal-vs-dexscreener-vs-birdeye/)
- [CoinGecko Coins Markets Endpoint](https://docs.coingecko.com/v3.0.1/reference/coins-markets)
