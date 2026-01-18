# AGENTS.md - hooks

> See root [AGENTS.md](../../AGENTS.md) for project-wide conventions.

## Purpose
TanStack Query hooks for data fetching. Centralized data access layer for React components.

## Structure
```
hooks/
├── use-rankings.ts    # Rankings data hook
└── use-whale-data.ts  # Whale tracking hook
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| Rankings data | `use-rankings.ts` | Main rankings query |
| Whale data | `use-whale-data.ts` | Whale metrics + events |

## Hook Pattern
```typescript
export function useRankings() {
  return useQuery({
    queryKey: ['rankings'],
    queryFn: () => fetch('/api/rankings').then(r => r.json()),
  });
}
```

## Conventions (This Directory)
- Prefix all hooks with `use`
- Return `{ data, isLoading, error }` shape
- Use descriptive queryKey arrays
- Handle loading and error states in consumers

## Anti-Patterns (This Directory)
- Direct fetch in components (use hooks)
- Missing queryKey causing cache issues
- Side effects inside query functions

## Cross-References
- API routes: [`app/api/`](../app/api/) - Backend endpoints
- Types: [`lib/types/`](../lib/types/) - Response interfaces
- Consumers: [`components/`](../components/) - UI components
