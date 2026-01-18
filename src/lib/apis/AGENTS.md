# AGENTS.md - lib/apis

> See root [AGENTS.md](../../../AGENTS.md) for project-wide conventions.

## Purpose
External API integrations for crypto data. Handles price feeds, sentiment, whale tracking, and technical analysis.

## Structure
```
lib/apis/
├── coingecko.ts        # CoinGecko price/market data
├── dexscreener.ts      # DEX token data
├── dexpaprika.ts       # DexPaprika integration
├── whale.ts            # Whale Alert + Alchemy whale tracking
├── sentiment.ts        # External sentiment APIs
├── local-sentiment.ts  # In-house sentiment calculation
├── prediction.ts       # External AI predictions
├── local-prediction.ts # In-house prediction model
├── technical.ts        # Technical analysis (TAAPI)
└── free-data-sources.ts # RSS/Reddit/HN aggregation
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| Price data | `coingecko.ts`, `dexscreener.ts` | Primary price sources |
| Whale activity | `whale.ts` | Multi-source whale tracking |
| Sentiment analysis | `sentiment.ts`, `local-sentiment.ts` | Use local for free tier |
| Technical indicators | `technical.ts` | RSI, MACD, etc. |
| Social mentions | `free-data-sources.ts` | Reddit, HN, RSS feeds |

## Conventions (This Directory)
- Return `null` on failure, never throw
- Use rate limiter from `lib/rate-limiter/distributed.ts`
- Batch requests with `Promise.all` (max 5 concurrent)
- Generate mock data when API keys unavailable (see `generateMock*` functions)
- Log errors with `console.error` and descriptive prefix

## Anti-Patterns (This Directory)
- Throwing exceptions (return null instead)
- Direct fetch without rate limiting
- Hardcoded API keys (use env vars)
- Missing timeout handling

## Cross-References
- Rate limiting: [`lib/rate-limiter/`](../rate-limiter/) - Distributed sliding window
- Caching: [`lib/cache/`](../cache/) - Cache responses to reduce API calls
- Types: [`lib/types/`](../types/) - CoinData, WhaleActivity, SentimentData
