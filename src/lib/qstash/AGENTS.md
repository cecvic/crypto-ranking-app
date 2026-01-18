# AGENTS.md - lib/qstash

> See root [AGENTS.md](../../../AGENTS.md) for project-wide conventions.

## Purpose
QStash client and cron job verification. Handles secure background job scheduling on Vercel.

## Structure
```
lib/qstash/
├── client.ts   # QStash client + job scheduling
└── verify.ts   # Signature verification wrapper
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| Schedule new cron | `client.ts` | Define in CRON_SCHEDULES |
| Verify cron requests | `verify.ts` | verifyCronRequestWithDevBypass |
| Debug verification | `verify.ts` | Check signature header handling |

## Key Exports
- `qstash` - QStash client instance
- `verifyCronRequestWithDevBypass(handler)` - Wrapper for cron routes

## Conventions (This Directory)
- Never expose QSTASH_TOKEN in code or logs
- Use `verifyCronRequestWithDevBypass` for all cron routes
- Dev bypass uses `x-dev-secret` header for local testing
- Production validates `upstash-signature` header

## Anti-Patterns (This Directory)
- Logging tokens or signatures
- Skipping verification in production
- Hardcoding schedule intervals (use CRON_SCHEDULES)

## Cross-References
- Protected routes: [`app/api/cron/`](../../app/api/cron/) - All cron handlers
- Environment: Requires `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
