# AGENTS.md - scripts

> See root [AGENTS.md](../AGENTS.md) for project-wide conventions.

## Purpose
Utility scripts for database seeding and data management. Run manually or as part of setup.

## Structure
```
scripts/
├── seed-known-addresses.ts   # Seed whale address database
└── seed-token-mappings.ts    # Seed token symbol mappings
```

## Commands
```bash
npx tsx scripts/seed-known-addresses.ts  # Seed whale addresses
npx tsx scripts/seed-token-mappings.ts   # Seed token mappings
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| Add whale addresses | `seed-known-addresses.ts` | Known whale wallets |
| Add token mappings | `seed-token-mappings.ts` | Symbol → contract |

## Conventions (This Directory)
- Run with `npx tsx` (TypeScript execution)
- Document usage in file header comment
- Use `console.log` for progress output
- Handle errors gracefully with exit codes

## Anti-Patterns (This Directory)
- Running in production without review
- Missing error handling
- Hardcoded credentials (use env vars)

## Cross-References
- Database: [`lib/db/`](../src/lib/db/) - Schema and queries
- Config: Environment variables for database connection
