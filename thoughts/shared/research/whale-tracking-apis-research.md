# Whale Alert & Tracking APIs Research Report

**Generated:** 2026-01-11  
**Purpose:** Find free/cheap whale tracking APIs for crypto-ranking 5-factor signal system

---

## Executive Summary

For the crypto-ranking app, the **recommended approach** is a tiered strategy:

1. **Primary (Free):** Alchemy Webhooks + Etherscan API for EVM chains
2. **Secondary (Free):** Dune Analytics SQL queries for historical whale data
3. **Fallback:** Whale Alert free tier (10 req/min) for real-time alerts
4. **Future upgrade:** Bitquery or Moralis if volume demands it

---

## Detailed Options Analysis

### Tier 1: Free APIs (Best Options)

#### 1. Alchemy Webhooks (RECOMMENDED)
**Cost:** Free tier - 300M compute units/month  
**Whale Tracking:** Yes, via webhooks

| Feature | Details |
|---------|---------|
| Transaction alerts | Real-time for ETH, ERC20, ERC721, ERC1155 |
| Whale tracking | Native support in documentation |
| Address monitoring | Unlimited addresses via API |
| Rate limits | 300M CU/month (very generous) |

**API Example:**
```javascript
// Alchemy Notify API - Webhook for large transfers
// Configure via dashboard or API
{
  "network": "ETH_MAINNET",
  "webhook_type": "ADDRESS_ACTIVITY",
  "addresses": ["0xwhale1...", "0xwhale2..."]
}
```

**Pros:**
- Very generous free tier
- Real-time webhooks (no polling needed)
- Multi-chain support (ETH, Polygon, Arbitrum, Optimism, Base)
- Production-grade reliability

**Cons:**
- Requires setting up webhook endpoint
- No built-in whale address database (need to source addresses)

**Sources:**
- [Alchemy Webhooks](https://www.alchemy.com/webhooks)
- [Alchemy Free RPC](https://www.alchemy.com/overviews/free-ethereum-rpc)

---

#### 2. Dune Analytics (RECOMMENDED for Historical)
**Cost:** Free tier - 2,500 credits/month  
**Whale Tracking:** Yes, via SQL queries

| Feature | Details |
|---------|---------|
| Query type | SQL on blockchain data |
| Chains | 100+ blockchains |
| API access | Yes, in free tier |
| Community dashboards | 700,000+ including whale trackers |

**API Example:**
```sql
-- Find large ETH transfers in last 24h
SELECT 
  from_address,
  to_address,
  value / 1e18 as eth_amount,
  block_time
FROM ethereum.transactions
WHERE value > 1000 * 1e18  -- > 1000 ETH
  AND block_time > now() - interval '24 hours'
ORDER BY value DESC
LIMIT 100
```

**Pros:**
- Extremely flexible (write any query)
- Huge community query library
- 100+ chains
- API access in free tier

**Cons:**
- Queries can be slow
- Free tier queries are public
- 2,500 credits may limit high-frequency use

**Sources:**
- [Dune Pricing](https://dune.com/pricing)
- [Dune API Overview](https://docs.dune.com/api-reference/overview/introduction)

---

#### 3. Etherscan API
**Cost:** Free tier available  
**Whale Tracking:** Indirect (need to monitor addresses)

| Feature | Details |
|---------|---------|
| Rate limit | 5 calls/sec (free tier) |
| Historical data | Yes |
| Address watchlist | Email alerts for wallet activity |

**Pros:**
- Well-documented
- Reliable
- Good for Ethereum-specific tracking

**Cons:**
- Limited free tier chains
- Need to build whale logic yourself
- No built-in "large transaction" filter

**Sources:**
- [Etherscan APIs](https://etherscan.io/apis)

---

### Tier 2: Cheap APIs ($30-50/month)

#### 4. Whale Alert API
**Cost:** $29.95/month (Alerts plan)  
**Free tier:** 10 requests/minute, 1-month history

| Feature | Details |
|---------|---------|
| Free tier | 10 req/min, REST only |
| Paid tier | 60 req/min, WebSocket, custom alerts |
| Assets | 100+ cryptocurrencies |
| Blockchains | 10+ chains |

**API Example (Free Tier):**
```bash
curl "https://api.whale-alert.io/v1/transactions?api_key=YOUR_KEY&min_value=1000000"
```

**Response format:**
```json
{
  "transactions": [{
    "blockchain": "bitcoin",
    "symbol": "BTC",
    "transaction_type": "transfer",
    "hash": "abc123...",
    "from": { "address": "...", "owner": "Binance" },
    "to": { "address": "...", "owner": "unknown" },
    "amount": 1500,
    "amount_usd": 45000000
  }]
}
```

**Pros:**
- Purpose-built for whale alerts
- Labels known entities (exchanges, etc.)
- Multi-chain coverage

**Cons:**
- Free tier very limited (10 req/min)
- No WebSocket in free tier
- Only 1-month history

**Sources:**
- [Whale Alert Pricing](https://developer.whale-alert.io/pricing.html)
- [Whale Alert Documentation](https://developer.whale-alert.io/documentation/)

---

#### 5. Moralis API
**Cost:** Free: 40k CU/day | $49/month: More CU  
**Whale Tracking:** Yes, via Wallet API

| Feature | Details |
|---------|---------|
| Free tier | ~40,000 compute units/day |
| DeFi positions | Full protocol tracking |
| Wallet networth | USD valuation |
| Token holders | Historical + current |

**Pros:**
- DeFi-native (great for TVL correlation)
- Multi-chain EVM support
- Real-time streams available

**Cons:**
- Paid plans billed annually
- Free tier may not be enough for production

**Sources:**
- [Moralis Pricing](https://moralis.com/pricing/)
- [Moralis Wallet API](https://moralis.com/api/wallet/)

---

#### 6. Bitquery
**Cost:** Free: 10k points/month | Custom pricing  
**Whale Tracking:** Yes, via GraphQL

| Feature | Details |
|---------|---------|
| Free tier | 10,000 API points for 1 month |
| Chains | 40+ blockchains |
| Query type | GraphQL |
| Real-time | WebSocket subscriptions |

**API Example:**
```graphql
subscription {
  EVM(network: eth) {
    Transfers(
      where: {Transfer: {Amount: {ge: "1000000"}}}
    ) {
      Transfer {
        Amount
        Currency {
          Symbol
        }
        Sender
        Receiver
      }
    }
  }
}
```

**Pros:**
- GraphQL is flexible
- Real-time subscriptions
- Good for custom queries

**Cons:**
- Pricing not transparent
- Free tier very limited

**Sources:**
- [Bitquery Pricing](https://bitquery.io/pricing)

---

### Tier 3: Enterprise/Expensive

#### 7. Arkham Intelligence
**Cost:** $149/month (Standard) | $999/month (Pro API)

| Feature | Details |
|---------|---------|
| Wallet labels | 500M+ labeled addresses |
| Smart money | Track hedge funds, VCs |
| Entity identification | AI-powered |

**Not recommended** for our use case due to high cost.

**Sources:**
- [Arkham API](https://intel.arkm.com/explorer/token/whale)

---

#### 8. Nansen
**Cost:** Free tier limited | Paid plans expensive

| Feature | Details |
|---------|---------|
| Smart money labels | 350M+ addresses |
| Whale tracking | Native feature |

**Not recommended** - overpriced for this use case.

**Sources:**
- [Nansen Pricing](https://www.nansen.ai/api)

---

#### 9. Glassnode
**Cost:** Free tier basic | Paid for full access

| Feature | Details |
|---------|---------|
| On-chain metrics | Comprehensive |
| Whale supply | Track holders >1K BTC |
| Exchange flows | Native feature |

**Good for metrics, less for real-time alerts.**

**Sources:**
- [Glassnode Docs](https://docs.glassnode.com/)

---

### Tier 4: Open Source / Self-Hosted

#### 10. GitHub: crypto-whale-tracker (by jamsturg)
**Cost:** Free (self-hosted)  
**URL:** https://github.com/jamsturg/crypto-whale-tracker

Advanced multi-chain whale monitoring system.

---

#### 11. GitHub: whale-watcher (by wmalgo)
**Cost:** Free (self-hosted)  
**URL:** https://github.com/wmalgo/whale-watcher

Telegram bot for EVM-compatible chains. Requires:
- JSON-RPC provider (Alchemy free tier works)
- Telegram bot setup

---

#### 12. GitHub: btc-whale-tracker (by nickpagz)
**Cost:** Free (self-hosted)  
**URL:** https://github.com/nickpagz/btc-whale-tracker

Python + Telegram for BTC whale tracking.

---

#### 13. GitHub: whallets (by darkrenaissance)
**Cost:** Free (self-hosted)  
**URL:** https://github.com/darkrenaissance/whallets

Database and tools to monitor whale wallets on chain.

---

### Tier 5: Alternative Approaches

#### Using Existing DefiLlama Integration
Since the app already uses DefiLlama, consider:

1. **TVL Changes as Proxy:** Large TVL drops = whale exits
2. **Stablecoin Flows:** Track major stablecoin movements via DefiLlama
3. **Protocol Inflows/Outflows:** Already available in DefiLlama API

#### Direct RPC Monitoring
Free RPC providers for self-built monitoring:

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| Alchemy | 300M CU/month | Best option |
| Infura | 100k req/day | Ethereum focused |
| QuickNode | Limited free | Multi-chain |
| Ankr | 1M req/month | Multi-chain |

---

## Recommendation for crypto-ranking

### Phase 1: MVP (Free)
```
Alchemy Webhooks → Track known whale addresses
           ↓
    Process large transactions (>$1M USD)
           ↓
    Store in database → Calculate whale signal
```

**Implementation:**
1. Create list of known whale addresses (from public sources)
2. Set up Alchemy webhook for address activity
3. Filter for transactions > threshold
4. Calculate "whale activity score" for each token

### Phase 2: Enhanced (Free)
Add Dune Analytics queries for:
- Historical whale accumulation patterns
- Top holder distribution changes
- Exchange inflow/outflow metrics

### Phase 3: Production ($30/month)
If free tiers become limiting:
- Upgrade to Whale Alert ($29.95/month)
- Get pre-labeled entities and real-time alerts

---

## API Comparison Matrix

| API | Free Tier | Cost | Real-time | Multi-chain | Best For |
|-----|-----------|------|-----------|-------------|----------|
| Alchemy | 300M CU/mo | Free | Yes (webhooks) | EVM | Production webhooks |
| Dune | 2,500 credits | Free | No | 100+ | Historical analysis |
| Etherscan | 5 calls/sec | Free | No | ETH only | Simple lookups |
| Whale Alert | 10 req/min | $29.95/mo | Yes (paid) | 10+ | Pre-labeled alerts |
| Moralis | 40k CU/day | $49/mo | Yes | EVM | DeFi tracking |
| Bitquery | 10k points | Custom | Yes | 40+ | GraphQL queries |
| BlockCypher | 2k/day | $119/mo | Yes | BTC/ETH/LTC | Simple webhooks |

---

## Next Steps

1. **Immediate:** Set up Alchemy account and test webhook for whale addresses
2. **Week 1:** Create Dune dashboard for historical whale metrics
3. **Week 2:** Integrate whale signal into ranking algorithm
4. **Month 1:** Evaluate if free tiers are sufficient for production load

---

## Sources

### Official Documentation
- [Alchemy Webhooks](https://www.alchemy.com/webhooks)
- [Whale Alert API](https://developer.whale-alert.io/documentation/)
- [Dune API](https://docs.dune.com/api-reference/overview/introduction)
- [Etherscan APIs](https://etherscan.io/apis)
- [Moralis Pricing](https://moralis.com/pricing/)
- [Bitquery](https://bitquery.io/pricing)
- [BlockCypher](https://www.blockcypher.com/pricing.html)

### Research Articles
- [7 Best Crypto Whale Trackers 2025](https://cryptonews.com/cryptocurrency/best-crypto-whale-trackers/)
- [How to Track Crypto Whale Movements - Ledger](https://www.ledger.com/academy/topics/crypto/how-to-track-crypto-whale-movements)
- [Best Crypto Data Platforms 2026 - CoinAPI](https://www.coinapi.io/blog/best-crypto-data-platforms-2026)

### Open Source Projects
- [crypto-whale-tracker](https://github.com/jamsturg/crypto-whale-tracker)
- [whale-watcher](https://github.com/wmalgo/whale-watcher)
- [btc-whale-tracker](https://github.com/nickpagz/btc-whale-tracker)
- [whallets](https://github.com/darkrenaissance/whallets)
- [wallet-tracker GitHub topic](https://github.com/topics/wallet-tracker)
