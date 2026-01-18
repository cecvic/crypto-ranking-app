# AGENTS.md - lib/ranking

> See root [AGENTS.md](../../../AGENTS.md) for project-wide conventions.

## Purpose
Core 5-factor scoring algorithm that ranks cryptocurrencies. The business logic heart of the application.

## Structure
```
lib/ranking/
└── calculator.ts   # Main scoring functions
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| Modify scoring weights | `calculator.ts` | WEIGHTS constant |
| Add ranking factor | `calculator.ts` | Add to calculateRankingScore |
| Change normalization | `calculator.ts` | normalize() function |

## Key Functions
- `normalize(value, min, max)` - Scale to 0-100
- `calculatePricePerformanceScore()` - Price momentum scoring
- `calculateRankingScore()` - Composite 5-factor score
- `rankCoins()` - Sort and assign ranks
- `calculateRankChanges()` - Compute rank deltas

## Conventions (This Directory)
- All scores normalized to 0-100 scale
- Use `Math.max(0, Math.min(100, ...))` for clamping
- Pure functions with explicit return types
- Weights defined as constants, not magic numbers

## Anti-Patterns (This Directory)
- Magic numbers (define as SCREAMING_SNAKE constants)
- Side effects in calculation functions
- Persisting rankChange to database (calculated on-the-fly)

## Cross-References
- Triggered by: [`app/api/cron/compute-rankings/`](../../app/api/cron/compute-rankings/)
- Types: [`lib/types/`](../types/) - CoinRanking interface
- Data sources: [`lib/apis/`](../apis/) - Input data for scoring
