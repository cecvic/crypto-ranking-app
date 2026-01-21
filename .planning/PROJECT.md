# Birdeye API Migration

## What This Is

Migrate the crypto ranking app's data layer from CoinGecko to Birdeye API, enabling multi-chain token discovery with DEX-level data including transaction monitoring and liquidity analysis. The app provides realtime rankings based on sentiment, technical analysis, and neural network scores — this migration replaces the underlying price/volume data source while preserving the scoring algorithms.

## Core Value

Provide realtime multi-chain crypto rankings with on-chain transaction visibility and liquidity depth that centralized aggregators like CoinGecko cannot offer.

## Requirements

### Validated

- ✓ Real-time ranking engine with 5-factor scoring (sentiment, technical, whale, AI, price) — existing
- ✓ Dashboard with rankings table, stats cards, top movers — existing
- ✓ Coin detail pages with TradingView charts — existing
- ✓ Whale alerts and transaction tracking via Alchemy — existing
- ✓ AI chat integration — existing
- ✓ User authentication via Clerk — existing
- ✓ Multi-tier caching (Redis → PostgreSQL → in-memory) — existing
- ✓ Cron-based data collection pipeline — existing

### Active

- [ ] Replace CoinGecko price/volume collection with Birdeye `/defi/v3/token/list` and `/defi/multi_price`
- [ ] Support all Birdeye chains (solana, ethereum, arbitrum, avalanche, bsc, optimism, polygon, base, zksync, sui, aptos)
- [ ] Searchable token table with liquidity-based filtering
- [ ] Transaction monitoring — fetch DEX-level trades via Birdeye `/defi/txs/token`
- [ ] Liquidity analysis — display pool depth and liquidity metrics per token
- [ ] Token discovery — integrate trending tokens endpoint for new opportunity detection

### Out of Scope

- Scoring algorithm changes — existing sentiment/technical/AI/whale scoring stays as-is
- Chart data migration — TradingView handles charting, not Birdeye
- Historical data backfill — start fresh with Birdeye data going forward
- WebSocket real-time feeds — use polling initially, WebSocket is v2

## Context

**Current state:** The app uses CoinGecko API for price/volume data, which limits coverage to their curated coin list and provides aggregated CEX+DEX data rather than pure on-chain data.

**Why Birdeye:**
- Direct on-chain data from DEXes
- Multi-chain support including Solana (major gap with CoinGecko)
- Transaction-level visibility for better whale detection
- Liquidity metrics for trading opportunity assessment
- Birdeye API key already configured in `.env`

**Key differences from CoinGecko:**
- Token addresses instead of coin IDs (need mapping strategy)
- Per-chain queries (no unified "top 100" across all chains)
- Pagination limit: offset + limit ≤ 10,000
- Rate limits apply per API key tier

## Constraints

- **API Rate Limits**: Birdeye enforces rate limits; batch requests where possible (multi_price max 100 tokens)
- **Pagination Ceiling**: Max 10,000 records per query (offset + limit ≤ 10,000)
- **Token Identification**: Must use token contract addresses, not human-readable IDs
- **Existing Types**: Must maintain compatibility with `CoinPrice` and `CoinRanking` types used throughout the app

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Replace CoinGecko entirely vs hybrid | Birdeye has better on-chain data; maintaining two sources adds complexity | — Pending |
| Token address mapping strategy | Need to map between internal coin IDs and chain-specific addresses | — Pending |
| Multi-chain aggregation approach | How to rank tokens across different chains | — Pending |

---
*Last updated: 2026-01-21 after initialization*
