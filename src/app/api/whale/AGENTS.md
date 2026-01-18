# AGENTS.md - app/api/whale

> See root [AGENTS.md](../../../../AGENTS.md) for project-wide conventions.

## Purpose
Whale tracking API endpoints. Provides whale activity data, metrics, and top movements.

## Structure
```
api/whale/
├── metrics/        # Whale metrics aggregation
├── events/         # Individual whale transactions
└── top-movements/  # Largest recent movements
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| Whale summary stats | `metrics/route.ts` | Aggregated metrics |
| Transaction history | `events/route.ts` | Individual events |
| Big moves tracking | `top-movements/route.ts` | Largest transfers |

## Conventions (This Directory)
- Require Clerk auth: `const { userId } = await auth()`
- Return 401 if not authenticated
- Standard JSON response with `timestamp` field
- Use `console.error('[whale/endpoint]', error)` for logging

## Anti-Patterns (This Directory)
- Missing auth checks
- Exposing internal error details to client
- Direct database queries (use lib/db/whale-queries.ts)

## Cross-References
- Database: [`lib/db/whale-queries.ts`](../../lib/db/whale-queries.ts) - Query functions
- External APIs: [`lib/apis/whale.ts`](../../lib/apis/whale.ts) - Whale Alert, Alchemy
- UI: [`components/whale/`](../../../components/whale/) - Frontend consumers
- Hooks: [`hooks/use-whale-data.ts`](../../../hooks/use-whale-data.ts) - TanStack Query
