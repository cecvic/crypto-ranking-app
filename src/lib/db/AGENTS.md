# AGENTS.md - lib/db

> See root [AGENTS.md](../../../AGENTS.md) for project-wide conventions.

## Purpose
Database layer using Drizzle ORM with Neon Postgres. Contains schema definitions and query functions.

## Structure
```
lib/db/
├── schema.ts         # Drizzle table definitions
├── client.ts         # Lazy-initialized DB client
├── queries.ts        # General database queries
├── whale-queries.ts  # Whale tracking queries
└── alert-queries.ts  # Alert system queries
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| Add new table | `schema.ts` | Define with Drizzle, run `drizzle-kit push` |
| Add query function | `queries.ts` or domain-specific | Use Drizzle query builder |
| Whale data access | `whale-queries.ts` | getBatchWhaleActivity, getWhaleMetrics |
| Alert management | `alert-queries.ts` | Price/whale alert CRUD |

## Conventions (This Directory)
- Use Drizzle query builder syntax, not raw SQL
- Lazy client initialization in `client.ts` (prevents build-time errors)
- Return typed results using schema inference
- Batch queries when fetching multiple records

## Anti-Patterns (This Directory)
- Raw SQL strings (use Drizzle builders)
- Eager client initialization (breaks Vercel build)
- Queries without proper error handling

## Cross-References
- Migrations: [`drizzle/`](../../../drizzle/) - Run `drizzle-kit push` after schema changes
- Cache layer: [`lib/cache/`](../cache/) - Database acts as L2 cache fallback
- Types: [`lib/types/`](../types/) - CoinRanking, WhaleActivity interfaces
