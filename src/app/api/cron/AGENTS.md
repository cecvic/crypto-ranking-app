# AGENTS.md - app/api/cron

> See root [AGENTS.md](../../../../AGENTS.md) for project-wide conventions.

## Purpose
Background job routes triggered by QStash. Handle data collection, ranking computation, and cleanup tasks.

## Structure
```
api/cron/
├── compute-rankings/   # Main ranking calculation job
├── collect-prices/     # Price data aggregation
├── collect-sentiment/  # Sentiment data collection
├── check-confluence/   # Signal confluence analysis
└── cleanup/            # Stale data cleanup
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| Modify ranking logic | `compute-rankings/route.ts` | Orchestrates 5-factor scoring |
| Add price source | `collect-prices/route.ts` | Aggregates from multiple APIs |
| Debug sentiment | `collect-sentiment/route.ts` | Social/news sentiment |
| Signal analysis | `check-confluence/route.ts` | Multi-indicator confluence |

## Conventions (This Directory)
- Wrap handler with `verifyCronRequestWithDevBypass` from `lib/qstash/verify`
- Production: QStash signature verification required
- Development: GET requests allowed for local testing (returns 405 in prod)
- Log timing with `startTime` and duration calculation
- Use Redis for intermediate state between jobs

## Anti-Patterns (This Directory)
- Exposing routes without verification wrapper
- Long-running operations without timeout handling
- Missing error logging with `[route-name]` prefix

## Cross-References
- Verification: [`lib/qstash/`](../../lib/qstash/) - verifyCronRequestWithDevBypass
- Ranking engine: [`lib/ranking/`](../../lib/ranking/) - calculateRankingScore
- Database: [`lib/db/`](../../lib/db/) - Data persistence
- Cache: [`lib/cache/`](../../lib/cache/) - Redis state management
