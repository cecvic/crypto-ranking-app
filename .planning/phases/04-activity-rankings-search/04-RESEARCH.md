# Phase 4: Activity Rankings & Search - Research

**Researched:** 2026-01-27
**Domain:** Token activity scoring and cross-chain search via Birdeye API
**Confidence:** MEDIUM

## Summary

This phase implements activity-based token rankings (replacing market cap as the default sort) and a global search feature across all 11 supported chains. Birdeye provides the necessary data through three key endpoints: Token Overview (for activity metrics like trade count, unique wallets, buy/sell volumes), Trade Data Single (for detailed trading activity), and Search V3 (for cross-chain token discovery by name, symbol, or address).

The activity scoring algorithm combines normalized metrics for 24h volume, trade count, unique wallets, and price momentum into a composite score. The opportunity score extends this with liquidity depth and buy/sell ratio analysis. For search, Birdeye's `/defi/v3/search` endpoint supports multi-chain queries, but requires chain iteration for comprehensive results.

**Primary recommendation:** Use Birdeye Token Overview endpoint for activity metrics (trade24h, uniqueWallet24h, buy24h, sell24h), implement a weighted composite scoring algorithm with normalization, and add the shadcn/ui Command component (cmdk) for global search with Cmd+K shortcut.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cmdk | 1.x | Command palette | Unstyled, accessible, fuzzy search built-in, used by Linear/Raycast |
| @radix-ui/react-dialog | 1.x | Search modal | Already in project (shadcn/ui), accessible overlay |
| simple-statistics | 7.x | Score normalization | Already in project, provides percentile/standardization functions |
| use-debounce | 10.x | Search input debounce | Prevents API spam during typing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fuse.js | 7.x | Client-side fuzzy search | Fallback/offline search of cached tokens |
| command-score | 0.1.x | Fuzzy match scoring | Built into cmdk, no extra install needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cmdk | react-cmdk | cmdk is more unstyled/flexible, react-cmdk has pre-built UI |
| Birdeye Search API | Local DB search | API ensures fresh results across all chains; local is faster but limited to seeded tokens |

**Installation:**
```bash
pnpm add cmdk use-debounce
pnpm dlx shadcn@latest add command dialog
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── scoring/
│   │   ├── activity-score.ts      # Activity score calculation
│   │   ├── opportunity-score.ts   # Opportunity score calculation
│   │   └── normalizers.ts         # Score normalization utilities
│   └── apis/
│       └── birdeye.ts             # Add getTokenOverview, search methods
├── hooks/
│   ├── use-activity-rankings.ts   # Hook for ranked token list
│   └── use-token-search.ts        # Hook for search with debounce
├── components/
│   ├── search/
│   │   ├── global-search.tsx      # Cmd+K search component
│   │   └── search-results.tsx     # Search result items
│   └── tokens/
│       ├── activity-score-badge.tsx    # Visual score indicator
│       └── opportunity-score-badge.tsx # Visual score indicator
└── app/
    └── api/
        ├── tokens/search/route.ts      # Search API endpoint
        └── tokens/activity/route.ts    # Activity-ranked tokens endpoint
```

### Pattern 1: Composite Activity Score Calculation
**What:** Combine multiple activity metrics into a single normalized score (0-100)
**When to use:** Ranking tokens by activity instead of market cap

**Example:**
```typescript
// Source: Token velocity and activity scoring research
interface ActivityMetrics {
  volume24h: number;
  trade24h: number;
  uniqueWallet24h: number;
  buy24h: number;
  sell24h: number;
  priceChange24h: number;
}

interface ActivityScore {
  total: number;           // 0-100 composite score
  volumeScore: number;     // 0-100
  tradeScore: number;      // 0-100
  walletScore: number;     // 0-100
  momentumScore: number;   // 0-100
}

function calculateActivityScore(
  metrics: ActivityMetrics,
  percentiles: PercentileLookup  // Pre-computed from all tokens
): ActivityScore {
  // Normalize each metric to 0-100 using percentile rank
  const volumeScore = percentileRank(metrics.volume24h, percentiles.volume24h);
  const tradeScore = percentileRank(metrics.trade24h, percentiles.trade24h);
  const walletScore = percentileRank(metrics.uniqueWallet24h, percentiles.uniqueWallet24h);

  // Momentum: combine price change with buy/sell ratio
  const buySellRatio = metrics.buy24h / Math.max(metrics.sell24h, 1);
  const momentumRaw = (metrics.priceChange24h / 100) * Math.min(buySellRatio, 3);
  const momentumScore = normalizeToRange(momentumRaw, -1, 1, 0, 100);

  // Weighted composite (weights should be configurable)
  const weights = { volume: 0.30, trade: 0.25, wallet: 0.25, momentum: 0.20 };

  const total =
    volumeScore * weights.volume +
    tradeScore * weights.trade +
    walletScore * weights.wallet +
    momentumScore * weights.momentum;

  return { total, volumeScore, tradeScore, walletScore, momentumScore };
}
```

### Pattern 2: Opportunity Score with Liquidity Factor
**What:** Extend activity score with liquidity depth and risk metrics
**When to use:** Helping users identify tokens with good activity AND tradability

**Example:**
```typescript
// Source: Token opportunity scoring patterns
interface OpportunityScore {
  total: number;           // 0-100 composite
  activityScore: number;   // From activity calculation
  liquidityScore: number;  // 0-100
  riskAdjusted: number;    // Penalizes low liquidity
}

function calculateOpportunityScore(
  activityScore: ActivityScore,
  liquidity: number,
  volume24h: number,
  percentiles: PercentileLookup
): OpportunityScore {
  // Liquidity score (higher is better, but with diminishing returns)
  const liquidityScore = percentileRank(liquidity, percentiles.liquidity);

  // Volume-to-liquidity ratio (healthy range: 0.5-2.0)
  const volLiqRatio = volume24h / Math.max(liquidity, 1);
  const healthyRatio = volLiqRatio >= 0.5 && volLiqRatio <= 2.0;

  // Risk penalty: low liquidity tokens get score reduction
  const riskMultiplier = liquidity < 10000 ? 0.5 :
                         liquidity < 50000 ? 0.75 :
                         liquidity < 100000 ? 0.9 : 1.0;

  const total = (
    activityScore.total * 0.60 +
    liquidityScore * 0.25 +
    (healthyRatio ? 15 : 0)  // Bonus for healthy vol/liq ratio
  ) * riskMultiplier;

  return {
    total: Math.min(100, total),
    activityScore: activityScore.total,
    liquidityScore,
    riskAdjusted: riskMultiplier < 1.0,
  };
}
```

### Pattern 3: Global Search with Cmd+K
**What:** Command palette that searches tokens by name, symbol, or address
**When to use:** Global navigation from anywhere in the app

**Example:**
```typescript
// Source: shadcn/ui Command + cmdk documentation
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useTokenSearch } from '@/hooks/use-token-search';

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  const { data: results, isLoading } = useTokenSearch(query, {
    enabled: open && query.length >= 2,
  });

  // Cmd+K keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (token: SearchResult) => {
    setOpen(false);
    router.push(`/token/${token.chain}/${token.address}`);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search tokens by name, symbol, or address..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading ? 'Searching...' : 'No tokens found.'}
        </CommandEmpty>
        {results?.map((chain) => (
          <CommandGroup key={chain.name} heading={chain.name}>
            {chain.tokens.map((token) => (
              <CommandItem
                key={`${token.chain}-${token.address}`}
                onSelect={() => handleSelect(token)}
              >
                <TokenSearchResult token={token} />
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
```

### Pattern 4: Score Visual Indicators
**What:** Color-coded badges/bars showing score levels
**When to use:** Rankings table, token cards, search results

**Example:**
```typescript
// Source: UI best practices for score visualization
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500 bg-green-500/10';
  if (score >= 60) return 'text-emerald-500 bg-emerald-500/10';
  if (score >= 40) return 'text-yellow-500 bg-yellow-500/10';
  if (score >= 20) return 'text-orange-500 bg-orange-500/10';
  return 'text-red-500 bg-red-500/10';
}

function ActivityScoreBadge({ score }: { score: number }) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-mono text-sm',
      getScoreColor(score)
    )}>
      <div
        className="h-1.5 w-8 rounded-full bg-current/20 overflow-hidden"
      >
        <div
          className="h-full bg-current rounded-full transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
      <span>{score.toFixed(0)}</span>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Calculating percentiles on every request:** Pre-compute percentile lookups in a cron job, cache for 15 minutes
- **Fetching Token Overview for all tokens at once:** Use batch endpoints when available, paginate for large sets
- **Client-side sorting of 500+ tokens:** Keep sorting server-side with indexed DB queries
- **Searching all 11 chains in parallel:** Will hit rate limits; use staggered requests or cache recent results
- **Hardcoding score weights:** Make weights configurable for tuning without code changes

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy text matching | Custom string matching | cmdk built-in (command-score) | Handles typos, partial matches, ranking by relevance |
| Percentile calculation | Manual sorting/indexing | simple-statistics `percentileRank` | Already in project, handles edge cases |
| Input debouncing | setTimeout wrapper | use-debounce hook | Handles cleanup, race conditions, proper timing |
| Score normalization | Min-max scaling | Percentile rank | More robust to outliers (crypto has many outliers) |
| Command palette UI | Custom modal + keyboard | shadcn Command | Accessibility, keyboard nav, focus management |

**Key insight:** Score normalization using percentile rank (not min-max) is crucial because crypto metrics have extreme outliers (e.g., meme coins with 1000x volume spikes). Percentile rank gives meaningful 0-100 scores regardless of outliers.

## Common Pitfalls

### Pitfall 1: Score Instability from Outliers
**What goes wrong:** One token with 10x normal volume skews all other scores down
**Why it happens:** Using min-max normalization instead of percentile rank
**How to avoid:**
1. Use percentile rank for normalization (not linear scaling)
2. Compute percentiles from a stable window (e.g., all tokens, not just current page)
3. Cap extreme values before scoring (e.g., volume > 3 std dev = 3 std dev)
**Warning signs:** Scores jump wildly between refreshes; most tokens cluster at 0-10

### Pitfall 2: Search API Rate Limiting
**What goes wrong:** Searching all 11 chains per keystroke exhausts rate limit quickly
**Why it happens:** Birdeye search is chain-specific; must call 11x for "all chains"
**How to avoid:**
1. Debounce search input (300-500ms minimum)
2. Require minimum 2-3 characters before searching
3. Cache recent search results (5 min TTL)
4. Prioritize high-volume chains first (solana, ethereum, base)
5. Consider hybrid: search local DB first, then Birdeye for gaps
**Warning signs:** 429 errors in logs; search results inconsistent or slow

### Pitfall 3: Missing Activity Data for Some Tokens
**What goes wrong:** Token Overview returns null/0 for trade24h, uniqueWallet24h
**Why it happens:** New tokens, low-activity tokens, or API data gaps
**How to avoid:**
1. Handle null/undefined gracefully with default values
2. Exclude tokens with no activity data from activity rankings (or show "N/A")
3. Fall back to volume-only scoring when trade data unavailable
4. Log missing data patterns to detect API issues
**Warning signs:** Many tokens show score 0; activity metrics null in logs

### Pitfall 4: Search Results Across Chains Causing Confusion
**What goes wrong:** User searches "USDC" and sees 8+ results with same name
**Why it happens:** Same token exists on multiple chains
**How to avoid:**
1. Group search results by chain (show "Ethereum", "Solana" headers)
2. Display chain badge prominently in each result
3. Show address preview (first/last 4 chars) for verification
4. Sort by liquidity/volume within each chain group
**Warning signs:** Users click wrong chain's token; complaints about duplicate results

### Pitfall 5: Stale Percentile Data Causing Inaccurate Scores
**What goes wrong:** Activity scores don't reflect current market (e.g., during pumps)
**Why it happens:** Percentile lookup table cached too long
**How to avoid:**
1. Refresh percentile calculations every 15-30 minutes via cron
2. Use exponential moving average for stability with responsiveness
3. Consider separate percentiles for each chain (activity levels differ)
**Warning signs:** Hot tokens don't rank highly; scores feel "stuck"

## Code Examples

Verified patterns from official sources:

### Birdeye Token Overview Endpoint
```typescript
// Source: Birdeye API documentation - Token Overview
// Note: Exact response fields may vary; verify with actual API response

interface BirdeyeTokenOverviewResponse {
  success: boolean;
  data: {
    address: string;
    symbol: string;
    name: string;
    price: number;
    priceChange24h: number;
    volume24h: number;
    liquidity: number;
    mc: number;

    // Activity metrics (from Token Overview / Trade Data)
    trade24h?: number;        // Number of trades in 24h
    trade8h?: number;         // Number of trades in 8h
    buy24h?: number;          // Number of buy trades
    sell24h?: number;         // Number of sell trades
    uniqueWallet24h?: number; // Unique wallets trading
    buyVolume24h?: number;    // USD volume of buys
    sellVolume24h?: number;   // USD volume of sells
  };
}

async function getTokenOverview(
  address: string,
  chain: BirdeyeChain
): Promise<BirdeyeTokenOverviewResponse['data'] | null> {
  try {
    const response = await api.get('/defi/token_overview', {
      params: { address },
      headers: { 'x-chain': chain },
    });

    if (!response.data?.success) return null;
    return response.data.data;
  } catch (error) {
    console.error(`[Birdeye] Token overview error for ${address}:`, error);
    return null;
  }
}
```

### Birdeye Search Endpoint
```typescript
// Source: Birdeye API documentation - Search V3
// Searches by name, symbol, or address within a single chain

interface BirdeyeSearchResponse {
  success: boolean;
  data: {
    items: Array<{
      type: 'token' | 'pair';
      result: {
        address: string;
        symbol: string;
        name: string;
        logoURI?: string;
        decimals?: number;
        liquidity?: number;
        volume24h?: number;
        price?: number;
      };
    }>;
  };
}

async function searchTokens(
  keyword: string,
  chain: BirdeyeChain
): Promise<BirdeyeSearchResponse['data']['items']> {
  try {
    const response = await api.get('/defi/v3/search', {
      params: { keyword },
      headers: { 'x-chain': chain },
    });

    if (!response.data?.success) return [];
    return response.data.data.items.filter(item => item.type === 'token');
  } catch (error) {
    console.error(`[Birdeye] Search error on ${chain}:`, error);
    return [];
  }
}

// Search across all chains (with rate limiting)
async function searchAllChains(keyword: string): Promise<SearchResultsByChain> {
  const chains: BirdeyeChain[] = [
    'solana', 'ethereum', 'base', 'arbitrum', 'bsc',
    'polygon', 'optimism', 'avalanche', 'zksync', 'sui', 'aptos'
  ];

  const results: SearchResultsByChain = {};

  // Stagger requests to avoid rate limits
  for (const chain of chains) {
    const chainResults = await searchTokens(keyword, chain);
    if (chainResults.length > 0) {
      results[chain] = chainResults.slice(0, 5); // Top 5 per chain
    }
    await sleep(100); // 100ms between chains
  }

  return results;
}
```

### Percentile Rank Calculation
```typescript
// Source: simple-statistics library
import { quantileRank } from 'simple-statistics';

// Pre-compute percentile lookup from all tokens
function buildPercentileLookup(tokens: TokenWithMetrics[]): PercentileLookup {
  const volume24h = tokens.map(t => t.volume24h).sort((a, b) => a - b);
  const trade24h = tokens.map(t => t.trade24h ?? 0).sort((a, b) => a - b);
  const uniqueWallet24h = tokens.map(t => t.uniqueWallet24h ?? 0).sort((a, b) => a - b);
  const liquidity = tokens.map(t => t.liquidity).sort((a, b) => a - b);

  return { volume24h, trade24h, uniqueWallet24h, liquidity };
}

// Get percentile rank (0-100) for a value
function percentileRank(value: number, sortedArray: number[]): number {
  return quantileRank(sortedArray, value) * 100;
}
```

### Database Schema Extension
```sql
-- Add activity columns to birdeye_tokens table
ALTER TABLE birdeye_tokens ADD COLUMN IF NOT EXISTS trade_24h INTEGER;
ALTER TABLE birdeye_tokens ADD COLUMN IF NOT EXISTS unique_wallet_24h INTEGER;
ALTER TABLE birdeye_tokens ADD COLUMN IF NOT EXISTS buy_24h INTEGER;
ALTER TABLE birdeye_tokens ADD COLUMN IF NOT EXISTS sell_24h INTEGER;
ALTER TABLE birdeye_tokens ADD COLUMN IF NOT EXISTS activity_score DECIMAL(5, 2);
ALTER TABLE birdeye_tokens ADD COLUMN IF NOT EXISTS opportunity_score DECIMAL(5, 2);

-- Index for activity-based sorting
CREATE INDEX IF NOT EXISTS idx_birdeye_tokens_activity_score
ON birdeye_tokens (activity_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_birdeye_tokens_opportunity_score
ON birdeye_tokens (opportunity_score DESC NULLS LAST);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Market cap ranking | Activity-based ranking | 2025+ | Surfaces active/trending tokens, not just large caps |
| Symbol-only search | Address + name + symbol search | N/A | Prevents wrong token selection, supports same-symbol tokens |
| Per-chain search | Cross-chain search aggregation | 2025 | Better UX for multi-chain users |
| Linear score normalization | Percentile rank normalization | N/A | More robust to outliers in crypto data |

**Deprecated/outdated:**
- `/defi/tokenlist` for activity data: Use Token Overview or Trade Data endpoints for activity metrics
- Single-chain search assumption: Users expect multi-chain results now

## Open Questions

Things that couldn't be fully resolved:

1. **Exact Birdeye Token Overview response fields**
   - What we know: Endpoint exists, returns activity metrics
   - What's unclear: Exact field names (trade24h vs trades24h vs numTrades24h)
   - Recommendation: Make first API call, log response, adjust types accordingly

2. **Birdeye Search API rate limits**
   - What we know: Account-level rate limits apply
   - What's unclear: Specific cost of search endpoint vs other endpoints
   - Recommendation: Start with conservative 100ms delays, monitor 429s

3. **Optimal activity score weights**
   - What we know: Volume, trades, wallets, momentum are key factors
   - What's unclear: Ideal weight distribution for crypto use case
   - Recommendation: Start with equal weights, tune based on user feedback

4. **Trade Data vs Token Overview endpoint choice**
   - What we know: Both provide activity metrics; Trade Data is more detailed
   - What's unclear: Which is more reliable/complete; CU costs differ
   - Recommendation: Start with Token Overview (simpler), add Trade Data if needed

## Sources

### Primary (HIGH confidence)
- [Birdeye API Search Endpoint](https://docs.birdeye.so/reference/get-defi-v3-search) - Search by name, symbol, address
- [shadcn/ui Command Component](https://ui.shadcn.com/docs/components/command) - Command palette installation
- [cmdk GitHub](https://github.com/dip/cmdk) - Command palette patterns
- [simple-statistics percentileRank](https://simplestatistics.org/docs/#quantilerank) - Normalization method

### Secondary (MEDIUM confidence)
- [Birdeye Token Overview](https://docs.birdeye.so/reference/get-defi-token_overview) - Activity metrics available
- [Birdeye Trade Data Single](https://docs.birdeye.so/reference/get-defi-v3-token-trade-data-single) - Detailed trade metrics
- [Token velocity research](https://blockapps.net/blog/tokenomics-in-crypto-understanding-token-velocity-and-its-implications/) - Activity scoring concepts
- [TokenScore methodology](https://vocal.media/theChain/ai-crypto-trading-and-token-score-the-smart-money-revolution-has-begun) - Composite scoring patterns

### Tertiary (LOW confidence)
- [birdeye-py SDK](https://birdeye-py.readthedocs.io/en/stable/code_overview/resources/token.html) - Method signatures (no response schemas)
- Token Overview exact response fields - Need to verify with actual API call

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - cmdk, shadcn/ui, simple-statistics are well-documented
- Architecture: MEDIUM - Scoring algorithm is standard pattern, but Birdeye field names need verification
- Pitfalls: MEDIUM - Based on common patterns but not Birdeye-specific production experience

**Research date:** 2026-01-27
**Valid until:** 2026-02-10 (14 days - API response schemas should be verified early in implementation)
