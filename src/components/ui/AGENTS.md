# AGENTS.md - components/ui

> See root [AGENTS.md](../../../AGENTS.md) for project-wide conventions.

## Purpose
Radix UI primitive wrappers with Tailwind styling. Shared design system components.

## Structure
```
components/ui/
├── button.tsx      # Button variants
├── card.tsx        # Card container
├── table.tsx       # Data table
├── tabs.tsx        # Tab navigation
├── select.tsx      # Dropdown select
├── dropdown-menu.tsx # Context menus
├── tooltip.tsx     # Hover tooltips
├── skeleton.tsx    # Loading placeholders
└── ...             # Other primitives
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| Add button variant | `button.tsx` | Use cva() for variants |
| Table component | `table.tsx` | Header, Body, Row, Cell |
| Loading state | `skeleton.tsx` | Placeholder shimmer |

## Conventions (This Directory)
- Use `cn()` from `lib/utils` for class merging
- Keep props interface minimal
- Forward refs for DOM access
- Use `cva()` for component variants

## Anti-Patterns (This Directory)
- Complex business logic (belongs in parent)
- Direct Tailwind without cn()
- Hardcoded colors (use CSS variables)

## Cross-References
- Utility: [`lib/utils.ts`](../../lib/utils.ts) - cn() function
- Consumers: All component directories
