# Research Summary: Birdeye API Migration

**Project:** crypto-ranking - Birdeye API multi-chain integration
**Domain:** Crypto data aggregation
**Researched:** 2026-01-21
**Overall Confidence:** HIGH

## Key Findings

### Stack

- **Continue with axios + axios-retry** - The codebase already has a working Birdeye client pattern; Birdeye provides no official SDK, so REST via axios is the canonical approach. No new dependencies required.
- **Extend existing infrastructure** - Redis caching, distributed rate limiting, and type system are already in place. The migration is additive, not a rewrite.
- **Multi-chain orchestration requires rate-aware batching** - Birdeye rate limits are account-level (not per-endpoint), so querying 11 chains must budget from a single quota. Sequential polling with 3-chain concurrency is recommended.

### Capabilities

- **Table stakes achievable with caveats** - Price, volume, 24h change, market cap, and images can all be sourced from Birdeye. However, market_cap_rank is NOT available and must be calculated locally.
- **Sparkline/7d change require extra API calls** - Unlike CoinGecko's single-call sparkline, Birdeye requires OHLCV fetches (40 CU each) to build sparklines. This adds significant CU cost.
- **Differentiators unlock new features** - Birdeye excels where CoinGecko cannot: whale transaction monitoring (`/defi/v3/trades/token-by-volume`), holder concentration analysis, token security checks for rug pull detection, and real liquidity data.

### Architecture

- **Additive integration, not replacement** - Birdeye becomes a new data source in the existing coin-aggregator pipeline. Existing sources (DexPaprika, DexScreener, CoinGecko) continue working unchanged.
- **Cross-chain token identity is the key challenge** - Same token (e.g., USDC) has different addresses on different chains. Solution: three-layer identity system (canonical_id, address index, aggregated data) with a new `multi_chain_tokens` table.
- **Cache-first architecture** - Per-chain caching enables graceful degradation. If one chain fails, others continue. 5-minute TTL for chain data, 30-second TTL for prices.

### Pitfalls

- **Account-level rate limits** - All Birdeye endpoints share ONE rate budget. Parallel calls to different endpoints (token list + security + trades) drain the same quota. Must implement global rate tracking.
- **Compute Unit (CU) explosion risk** - Endpoints cost 1-500 CU each. Security checks = 50 CU/token, OHLCV = 40 CU, scroll pagination = 500 CU. At scale, monthly allocation burns fast.
- **No CoinGecko-to-Birdeye token mapping exists** - Cannot simply convert CoinGecko IDs to Birdeye addresses. Must build and maintain a mapping table or use hybrid approach.

## Critical Decisions Required

1. **Subscription tier selection** - Free tier (30k CU/month) is inadequate. Starter ($99/mo, 5M CU) minimum for 100-token tracking; Premium ($199/mo, 15M CU) for production scale.

2. **Hybrid vs full migration** - Keep CoinGecko for global rankings/sparklines/categories, or migrate fully and accept feature gaps (no market_cap_rank, no category queries, no global market data)?

3. **Chain priority order** - Which of the 11 supported chains to poll? Solana/Ethereum/Base are highest priority; Sui has significant data gaps.

4. **Sparkline strategy** - Accept 40 CU per token for sparklines (expensive), defer sparklines to v2, or maintain CoinGecko solely for sparkline data?

5. **Rate limiter scope** - Current Birdeye rate limit is 100/minute. Needs upgrade to global tracking across all endpoints, not per-endpoint.

## Recommended Approach

**Implement a hybrid data strategy.** Use Birdeye for:
- Multi-chain DEX token data (where it excels)
- Whale transaction monitoring (unique capability)
- Token security analysis (unique capability)
- Real liquidity data (unique capability)

Continue using CoinGecko for:
- Global market cap rankings (not available in Birdeye)
- Category-based queries (meme, AI, DeFi categories)
- Sparkline data (single-call vs multi-call cost)

This hybrid approach minimizes CU costs, preserves existing features, and unlocks new differentiators without a complete data model rewrite.

**Implementation order:** Foundation (rate limiting + types) -> Birdeye collector service -> Cross-chain aggregation -> Token registry -> Feature rollout.

## Phase Structure Implications

### Phase 1: Foundation
**Rationale:** Rate limiting and data model must be correct before any API integration work.
**Delivers:** Global rate limiter, extended types (`CoinSource`, `ChainData`), Birdeye cache keys/TTLs.
**Avoids:** Account-level rate limit exhaustion, type mismatches.
**Standard patterns:** Yes - rate limiting and caching are well-documented.

### Phase 2: Birdeye Collector Service
**Rationale:** Isolated service enables testing without affecting existing aggregation.
**Delivers:** `birdeye-collector.ts` with sequential chain polling, per-chain caching, error isolation.
**Implements:** Multi-chain fetching with rate-aware batching.
**Avoids:** All-or-nothing failures, rate limit spikes.

### Phase 3: Cross-Chain Aggregation
**Rationale:** Depends on collector service being stable.
**Delivers:** Enhanced `coin-aggregator.ts` integration, symbol-based deduplication with chain awareness, merged multi-chain data.
**Addresses:** Token identity mapping problem.
**Needs research:** Optimal deduplication heuristics for edge cases (same symbol, different tokens).

### Phase 4: Token Registry
**Rationale:** Registry lookup optimizes aggregation and enables cross-chain features.
**Delivers:** `multi_chain_tokens` table, `token-registry.ts` service, canonical ID resolution.
**Uses:** PostgreSQL with JSONB for chain_addresses.
**Needs research:** Seeding strategy for initial token mappings.

### Phase 5: Feature Rollout
**Rationale:** New features only after core data pipeline is stable.
**Delivers:** Whale detection, security analysis, liquidity display.
**Uses:** `/defi/v3/trades/token-by-volume`, `/defi/token_security`, liquidity fields.
**Standard patterns:** Yes - API consumption is straightforward once data model is correct.

### Phase Ordering Rationale

- **Rate limiting before everything** - Getting rate limited breaks all subsequent work
- **Collector before aggregation** - Need data source before integration
- **Aggregation before registry** - Registry optimizes aggregation, but aggregation works without it
- **Features last** - Core data must be stable before building features on top

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (Aggregation):** Symbol collision handling when same symbol exists for different tokens across chains
- **Phase 4 (Registry):** Best approach for seeding token mappings (manual, CoinGecko cross-reference, or build-on-demand)

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Rate limiting and caching are well-documented patterns
- **Phase 2 (Collector):** Birdeye API is well-documented; sequential fetching is standard
- **Phase 5 (Features):** API consumption once data model is correct

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No SDK exists; axios is correct; verified via official docs |
| Features | HIGH | Endpoint mapping verified; CU costs documented |
| Architecture | HIGH | Pattern extends existing codebase; data flow verified |
| Pitfalls | HIGH | Rate limits, CU costs all verified via official docs |

**Overall confidence:** HIGH - All research verified against official Birdeye documentation. The codebase already has partial Birdeye integration providing additional validation.

### Gaps to Address

- **Optimal concurrency for chain polling** - Suggested concurrency=3 is heuristic; may need tuning based on actual tier
- **Token registry seeding** - No automated mapping between CoinGecko IDs and Birdeye addresses; must build manually or on-demand
- **Sui chain limitations** - Significant data gaps; may need to exclude from initial rollout
- **WebSocket feasibility** - Requires Business tier ($699/mo); defer unless real-time is critical

## Sources

### Primary (HIGH confidence)
- [Birdeye Official Documentation](https://docs.birdeye.so/)
- [Birdeye Rate Limiting](https://docs.birdeye.so/docs/rate-limiting)
- [Birdeye Compute Unit Costs](https://docs.birdeye.so/docs/compute-unit-cost)
- [Birdeye Supported Networks](https://docs.birdeye.so/docs/supported-networks)
- [Birdeye Token List V3 API](https://docs.birdeye.so/reference/get-defi-v3-token-list)
- [Birdeye Pricing](https://docs.birdeye.so/docs/pricing)

### Secondary (MEDIUM confidence)
- Existing codebase analysis (`/src/lib/apis/birdeye.ts`, `coin-aggregator.ts`)
- [DEX API Comparison 2025](https://coinpaprika.com/education/best-free-dex-api-2025-dexpaprika-vs-dextools-vs-geckoterminal-vs-dexscreener-vs-birdeye/)

---
*Research completed: 2026-01-21*
*Ready for roadmap: yes*
