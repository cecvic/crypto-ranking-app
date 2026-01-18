# AGENTS.md - components/whale

> See root [AGENTS.md](../../../AGENTS.md) for project-wide conventions.

## Purpose
Whale tracking UI components. Visualize large crypto movements and exchange flows.

## Structure
```
components/whale/
├── whale-activity-feed.tsx    # Transaction feed
├── whale-stats-cards.tsx      # Summary metrics
├── top-whale-movements.tsx    # Largest movements table
└── exchange-flow-analysis.tsx # Exchange in/out flows
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| Transaction list | `whale-activity-feed.tsx` | Real-time feed |
| Summary cards | `whale-stats-cards.tsx` | Quick stats |
| Big movements | `top-whale-movements.tsx` | Sortable table |
| Flow analysis | `exchange-flow-analysis.tsx` | In/out charts |

## Conventions (This Directory)
- Use `useWhaleData()` hook for data fetching
- Apply `cn()` for conditional Tailwind classes
- Show skeleton states during loading
- Format large numbers with abbreviations (1.2M, 500K)

## Anti-Patterns (This Directory)
- Direct API calls (use hooks)
- Hardcoded currency formatting
- Missing loading/error states

## Cross-References
- Data hook: [`hooks/use-whale-data.ts`](../../hooks/use-whale-data.ts)
- API: [`app/api/whale/`](../../app/api/whale/)
- UI primitives: [`components/ui/`](../ui/)
