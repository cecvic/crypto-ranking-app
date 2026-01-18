# AGENTS.md - lib/types

> See root [AGENTS.md](../../../AGENTS.md) for project-wide conventions.

## Purpose
TypeScript interfaces and type definitions. Single source of truth for data shapes.

## Structure
```
lib/types/
├── index.ts       # Main interfaces (CoinRanking, WhaleActivity, etc.)
└── confluence.ts  # Confluence-specific types
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| Add coin interface | `index.ts` | Core data types |
| Confluence types | `confluence.ts` | Signal analysis types |

## Key Interfaces
- `CoinRanking` - Main ranked coin data
- `CoinData` - Raw coin information
- `WhaleActivity` - Whale transaction data
- `SentimentData` - Social sentiment scores

## Conventions (This Directory)
- PascalCase for interface names
- Export all types from `index.ts`
- Use `type` for unions, `interface` for objects
- Explicit optional fields with `?`

## Anti-Patterns (This Directory)
- Inline types in components (centralize here)
- `any` or `unknown` without narrowing
- Duplicate type definitions

## Cross-References
- Used by: All `lib/`, `hooks/`, `components/` directories
- Schema mapping: [`lib/db/schema.ts`](../db/schema.ts) - Database types
