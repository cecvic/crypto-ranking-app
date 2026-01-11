# Implementation Plan: Authenticated Whale Alerts Page

**Generated:** 2026-01-11
**Status:** Ready for Implementation
**Estimated Effort:** 2-3 days

---

## Goal

Create an authenticated Whale Alerts page under `/dashboard/whale-alerts` that surfaces real-time whale tracking insights to users. This page will leverage the existing Alchemy webhook infrastructure and whale_events database to display meaningful whale activity data that enhances the app's overall value proposition.

### Current State
- Alchemy webhook integration receives real-time whale transactions (`src/app/api/webhooks/alchemy/route.ts`)
- Database schema exists with `whale_events`, `token_mappings`, `known_addresses` tables (`src/lib/db/schema.ts`)
- Query functions exist for metrics: `getWhaleMetrics24h`, `getBatchWhaleMetrics` (`src/lib/db/whale-queries.ts`)
- Clerk authentication integrated with dashboard layout
- No dedicated UI to view whale activity data

### Target State
- Dedicated `/dashboard/whale-alerts` page with multiple insights panels
- Real-time activity feed showing recent large transactions
- Exchange flow analysis with visual indicators
- Integration with existing whale score in rankings
- Filterable, sortable data tables

---

## Research Summary

### Existing Patterns Discovered

1. **Dashboard Component Pattern** (from `src/components/dashboard/`)
   - Client components with `'use client'` directive
   - Loading states via `isLoading` prop and skeleton components
   - TanStack Query hooks for data fetching
   - Cards with header/content structure for metrics

2. **API Route Pattern** (from `src/app/api/rankings/route.ts`)
   - Auth check with `auth()` from Clerk
   - JSON responses with `data`, `cached`, `timestamp` fields
   - Caching strategies with Redis and in-memory fallbacks

3. **Data Display Pattern** (from `rankings-table.tsx`)
   - Search and filter state with `useState`
   - Memoized filtering/sorting with `useMemo`
   - Sortable table headers
   - Skeleton loading states

4. **Whale Metrics Structure** (from `whale-queries.ts`)
   ```typescript
   interface WhaleMetrics {
     totalTransactions: number;
     exchangeInflow: number;
     exchangeOutflow: number;
     walletToWallet: number;
     netFlow: number;
     avgTransactionSize: number;
   }
   ```

---

## Existing Codebase Analysis

### Relevant Files to Reference

| File | Purpose | How It Helps |
|------|---------|--------------|
| `src/app/dashboard/page.tsx` | Dashboard main page | Layout and component composition pattern |
| `src/components/dashboard/stats-cards.tsx` | Metric cards | Stats display pattern with icons |
| `src/components/dashboard/top-movers.tsx` | Data list cards | List item display with ranking |
| `src/components/rankings/rankings-table.tsx` | Data table | Sortable table with search |
| `src/lib/db/whale-queries.ts` | Whale DB queries | Existing query functions to extend |
| `src/hooks/use-rankings.ts` | TanStack Query hooks | Hook pattern for API calls |
| `src/lib/db/schema.ts` | DB schema | WhaleEvent type definition |

### Database Schema (Already Exists)

```typescript
// whale_events table columns:
- id, transactionHash, blockNumber, blockTimestamp
- tokenAddress, tokenSymbol, coinGeckoId
- fromAddress, toAddress, valueRaw, valueToken, valueUsd
- transferType, fromLabel, toLabel
- chain, webhookId, rawPayload, receivedAt, createdAt
```

### Transfer Types
- `'wallet_to_wallet'` - Whale-to-whale transfers
- `'exchange_inflow'` - Moving to exchanges (potential sell pressure)
- `'exchange_outflow'` - Moving from exchanges (accumulation)
- `'exchange_to_exchange'` - Inter-exchange transfers

---

## Implementation Phases

### Phase 1: API Routes for Whale Data
**Estimated Time:** 0.5 days

#### 1.1 Recent Whale Events Endpoint
**File:** `src/app/api/whale/events/route.ts`

```typescript
// GET /api/whale/events?limit=50&token=&type=
// Returns recent whale transactions with pagination
// Auth required via Clerk

interface WhaleEventResponse {
  id: number;
  transactionHash: string;
  blockTimestamp: string;
  tokenSymbol: string | null;
  coinGeckoId: string | null;
  fromAddress: string;
  toAddress: string;
  valueToken: string;
  valueUsd: string | null;
  transferType: string;
  fromLabel: string | null;
  toLabel: string | null;
  chain: string;
}
```

**Query to add in `whale-queries.ts`:**
```typescript
export async function getRecentWhaleEvents(
  limit: number = 50,
  filters?: {
    coinGeckoId?: string;
    transferType?: string;
    minValueUsd?: number;
  }
): Promise<WhaleEvent[]>
```

#### 1.2 Aggregate Metrics Endpoint
**File:** `src/app/api/whale/metrics/route.ts`

```typescript
// GET /api/whale/metrics?period=24h
// Returns aggregated whale metrics
// Auth required via Clerk

interface WhaleMetricsResponse {
  totalTransactions: number;
  totalVolumeUsd: number;
  exchangeInflow: number;
  exchangeOutflow: number;
  netFlow: number;
  topTokensByVolume: Array<{
    coinGeckoId: string;
    symbol: string;
    volume: number;
    transactionCount: number;
  }>;
}
```

#### 1.3 Top Whale Movements Endpoint
**File:** `src/app/api/whale/top-movements/route.ts`

```typescript
// GET /api/whale/top-movements?period=24h&limit=10
// Returns largest transactions by value
// Auth required via Clerk
```

**Query to add in `whale-queries.ts`:**
```typescript
export async function getTopWhaleMovements(
  limit: number = 10,
  hours: number = 24
): Promise<WhaleEvent[]>
```

#### Acceptance Criteria (Phase 1)
- [ ] `/api/whale/events` returns paginated whale events
- [ ] `/api/whale/metrics` returns aggregate statistics
- [ ] `/api/whale/top-movements` returns top transactions
- [ ] All routes require Clerk authentication
- [ ] Proper error handling and caching

---

### Phase 2: TanStack Query Hooks
**Estimated Time:** 0.25 days

#### 2.1 Whale Data Hooks
**File:** `src/hooks/use-whale-data.ts`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';

// Types
export interface WhaleEvent {
  id: number;
  transactionHash: string;
  blockTimestamp: string;
  tokenSymbol: string | null;
  coinGeckoId: string | null;
  fromAddress: string;
  toAddress: string;
  valueToken: string;
  valueUsd: string | null;
  transferType: string;
  fromLabel: string | null;
  toLabel: string | null;
  chain: string;
}

export interface WhaleMetrics {
  totalTransactions: number;
  totalVolumeUsd: number;
  exchangeInflow: number;
  exchangeOutflow: number;
  netFlow: number;
  topTokensByVolume: Array<{
    coinGeckoId: string;
    symbol: string;
    volume: number;
    transactionCount: number;
  }>;
}

// Hooks
export function useWhaleEvents(options?: {
  limit?: number;
  token?: string;
  type?: string;
  refetchInterval?: number;
}) {
  return useQuery({
    queryKey: ['whale-events', options?.limit, options?.token, options?.type],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.token) params.set('token', options.token);
      if (options?.type) params.set('type', options.type);

      const response = await fetch(`/api/whale/events?${params}`);
      if (!response.ok) throw new Error('Failed to fetch whale events');
      const data = await response.json();
      return data.data as WhaleEvent[];
    },
    refetchInterval: options?.refetchInterval ?? 30000, // 30 seconds
    staleTime: 15000,
  });
}

export function useWhaleMetrics(period: string = '24h') {
  return useQuery({
    queryKey: ['whale-metrics', period],
    queryFn: async () => {
      const response = await fetch(`/api/whale/metrics?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch whale metrics');
      const data = await response.json();
      return data.data as WhaleMetrics;
    },
    refetchInterval: 60000, // 1 minute
    staleTime: 30000,
  });
}

export function useTopWhaleMovements(limit: number = 10) {
  return useQuery({
    queryKey: ['whale-top-movements', limit],
    queryFn: async () => {
      const response = await fetch(`/api/whale/top-movements?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch top movements');
      const data = await response.json();
      return data.data as WhaleEvent[];
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
```

#### Acceptance Criteria (Phase 2)
- [ ] `useWhaleEvents` hook with filtering support
- [ ] `useWhaleMetrics` hook for aggregate data
- [ ] `useTopWhaleMovements` hook for leaderboard
- [ ] Proper caching and refetch intervals
- [ ] TypeScript types exported

---

### Phase 3: Whale Stats Cards Component
**Estimated Time:** 0.25 days

#### 3.1 Stats Cards
**File:** `src/components/whale/whale-stats-cards.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ActivityIcon,
  ArrowLeftRightIcon,
  WalletIcon,
  BarChart3Icon,
} from 'lucide-react';

interface WhaleStatsCardsProps {
  metrics?: WhaleMetrics;
  isLoading?: boolean;
}

export function WhaleStatsCards({ metrics, isLoading }: WhaleStatsCardsProps) {
  // Display 4 key metrics:
  // 1. Total Transactions (24h)
  // 2. Net Flow (positive = accumulation, negative = distribution)
  // 3. Exchange Inflows (sell pressure indicator)
  // 4. Exchange Outflows (accumulation indicator)

  // Use color coding:
  // - Green for positive net flow / high outflows
  // - Red for negative net flow / high inflows
  // - Neutral for balanced
}
```

**UI Design (Text-based mockup):**
```
+------------------+------------------+------------------+------------------+
| Total Txns (24h) | Net Flow         | Exchange Inflow  | Exchange Outflow |
|                  |                  | (Sell Pressure)  | (Accumulation)   |
| [Activity Icon]  | [TrendUp/Down]   | [ArrowRight]     | [ArrowLeft]      |
|                  |                  |                  |                  |
|      247         |   +$12.5M        |    $45.2M        |    $57.7M        |
|  +15 vs prev     |   Bullish        |  -8% vs avg      |  +12% vs avg     |
+------------------+------------------+------------------+------------------+
```

#### Acceptance Criteria (Phase 3)
- [ ] 4 metric cards with icons
- [ ] Color-coded based on sentiment
- [ ] Loading skeleton state
- [ ] Responsive grid layout

---

### Phase 4: Exchange Flow Analysis Component
**Estimated Time:** 0.5 days

#### 4.1 Flow Analysis Card
**File:** `src/components/whale/exchange-flow-analysis.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress'; // May need to add this component

interface ExchangeFlowAnalysisProps {
  metrics?: WhaleMetrics;
  isLoading?: boolean;
}

export function ExchangeFlowAnalysis({ metrics, isLoading }: ExchangeFlowAnalysisProps) {
  // Visual representation of inflow vs outflow
  // - Bar showing ratio
  // - Top tokens by net flow
  // - Sentiment indicator (Accumulating / Distributing / Neutral)
}
```

**UI Design (Text-based mockup):**
```
+---------------------------------------------------------------+
| Exchange Flow Analysis                              [24h v]   |
+---------------------------------------------------------------+
|                                                               |
|  Inflow vs Outflow                                            |
|  [====== INFLOW 44% ======|====== OUTFLOW 56% ======]        |
|                                                               |
|  Market Sentiment: [Accumulating]  Net: +$12.5M               |
|                                                               |
|  Top Tokens by Net Flow:                                      |
|  +----------------------------------------------------------+|
|  | ETH    | +$5.2M    | [=====>    ] | Accumulating         ||
|  | BTC    | +$3.1M    | [====>     ] | Accumulating         ||
|  | SOL    | -$1.8M    | [   <====  ] | Distributing         ||
|  | LINK   | +$0.9M    | [==>       ] | Accumulating         ||
|  +----------------------------------------------------------+|
+---------------------------------------------------------------+
```

#### Acceptance Criteria (Phase 4)
- [ ] Inflow/outflow visualization
- [ ] Per-token breakdown
- [ ] Sentiment indicator badge
- [ ] Period selector (24h, 7d)

---

### Phase 5: Whale Activity Feed Component
**Estimated Time:** 0.5 days

#### 5.1 Activity Feed
**File:** `src/components/whale/whale-activity-feed.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WhaleActivityFeedProps {
  events?: WhaleEvent[];
  isLoading?: boolean;
}

export function WhaleActivityFeed({ events, isLoading }: WhaleActivityFeedProps) {
  // Scrollable feed of recent transactions
  // - Timestamp (relative)
  // - Token symbol with icon
  // - Amount in tokens and USD
  // - From -> To with labels
  // - Transfer type badge
}
```

**UI Design (Text-based mockup):**
```
+---------------------------------------------------------------+
| Real-time Whale Activity           [All Tokens v] [All Types v]|
+---------------------------------------------------------------+
| [Auto-refresh: 30s]                                [Pause]    |
+---------------------------------------------------------------+
|                                                               |
| 2 min ago                                                     |
| [ETH icon] 500 ETH ($1.2M)                                   |
| 0x1234...5678 -> Binance (Hot Wallet)                        |
| [Exchange Inflow]                          [View on Etherscan]|
| ------------------------------------------------------------- |
|                                                               |
| 5 min ago                                                     |
| [BTC icon] 150 BTC ($4.5M)                                   |
| Coinbase -> 0xabcd...efgh                                    |
| [Exchange Outflow]                         [View on Etherscan]|
| ------------------------------------------------------------- |
|                                                               |
| ... more events ...                                           |
+---------------------------------------------------------------+
```

#### Acceptance Criteria (Phase 5)
- [ ] Scrollable feed with auto-refresh
- [ ] Token filter dropdown
- [ ] Transfer type filter
- [ ] Relative timestamps
- [ ] Etherscan links for transactions
- [ ] Address truncation with labels

---

### Phase 6: Top Whale Movements Table
**Estimated Time:** 0.5 days

#### 6.1 Top Movements Table
**File:** `src/components/whale/top-whale-movements.tsx`

```typescript
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TopWhaleMovementsProps {
  events?: WhaleEvent[];
  isLoading?: boolean;
}

export function TopWhaleMovements({ events, isLoading }: TopWhaleMovementsProps) {
  // Table showing largest transactions
  // Sortable by value
  // Filterable by token and type
}
```

**UI Design (Text-based mockup):**
```
+---------------------------------------------------------------+
| Top Whale Movements Today                         [Export CSV]|
+---------------------------------------------------------------+
| Rank | Time    | Token | Amount      | USD Value | Type       |
+---------------------------------------------------------------+
| 1    | 2h ago  | BTC   | 1,250 BTC   | $45.2M    | Outflow    |
| 2    | 4h ago  | ETH   | 15,000 ETH  | $36.0M    | Wallet     |
| 3    | 6h ago  | SOL   | 500,000 SOL | $28.5M    | Inflow     |
| 4    | 8h ago  | ETH   | 10,000 ETH  | $24.0M    | Outflow    |
| 5    | 10h ago | LINK  | 2,000,000   | $18.2M    | Wallet     |
+---------------------------------------------------------------+
```

#### Acceptance Criteria (Phase 6)
- [ ] Sortable columns
- [ ] Top 10 by default
- [ ] Transfer type badges
- [ ] Relative timestamps
- [ ] Optional CSV export

---

### Phase 7: Main Whale Alerts Page
**Estimated Time:** 0.25 days

#### 7.1 Page Component
**File:** `src/app/dashboard/whale-alerts/page.tsx`

```typescript
'use client';

import { useWhaleEvents, useWhaleMetrics, useTopWhaleMovements } from '@/hooks/use-whale-data';
import { WhaleStatsCards } from '@/components/whale/whale-stats-cards';
import { ExchangeFlowAnalysis } from '@/components/whale/exchange-flow-analysis';
import { WhaleActivityFeed } from '@/components/whale/whale-activity-feed';
import { TopWhaleMovements } from '@/components/whale/top-whale-movements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCwIcon, AnchorIcon } from 'lucide-react';

export default function WhaleAlertsPage() {
  const { data: metrics, isLoading: metricsLoading } = useWhaleMetrics();
  const { data: events, isLoading: eventsLoading, dataUpdatedAt } = useWhaleEvents({ limit: 50 });
  const { data: topMovements, isLoading: topLoading } = useTopWhaleMovements(10);

  const isLoading = metricsLoading || eventsLoading || topLoading;
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : '--:--:--';

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AnchorIcon className="h-8 w-8" />
            Whale Alerts
          </h1>
          <p className="text-muted-foreground">
            Real-time large transaction monitoring and exchange flow analysis
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCwIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Last updated: {lastUpdated}
        </div>
      </div>

      {/* Stats Cards */}
      <WhaleStatsCards metrics={metrics} isLoading={metricsLoading} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Exchange Flow Analysis */}
        <ExchangeFlowAnalysis metrics={metrics} isLoading={metricsLoading} />

        {/* Activity Feed */}
        <WhaleActivityFeed events={events} isLoading={eventsLoading} />
      </div>

      {/* Top Movements Table */}
      <TopWhaleMovements events={topMovements} isLoading={topLoading} />

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Understanding Whale Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="font-medium text-sm mb-1">Exchange Inflow</h4>
              <p className="text-xs text-muted-foreground">
                Large transfers TO exchanges often indicate potential selling pressure
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Exchange Outflow</h4>
              <p className="text-xs text-muted-foreground">
                Large transfers FROM exchanges suggest accumulation and long-term holding
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Net Flow</h4>
              <p className="text-xs text-muted-foreground">
                Positive net flow (more outflows) is typically bullish; negative is bearish
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 7.2 Update Navigation
**File:** `src/components/dashboard/header.tsx`

Add "Whale Alerts" to the navigation menu:
```typescript
<Link
  href="/dashboard/whale-alerts"
  className="text-foreground/60 hover:text-foreground transition-colors"
>
  Whale Alerts
</Link>
```

#### Acceptance Criteria (Phase 7)
- [ ] Page renders at `/dashboard/whale-alerts`
- [ ] All components integrated
- [ ] Loading states working
- [ ] Navigation link added
- [ ] Responsive layout
- [ ] Protected by Clerk auth (via dashboard layout)

---

### Phase 8: Database Query Enhancements
**Estimated Time:** 0.25 days

#### 8.1 Additional Queries
**File:** `src/lib/db/whale-queries.ts`

```typescript
/**
 * Get recent whale events with optional filters
 */
export async function getRecentWhaleEvents(
  limit: number = 50,
  filters?: {
    coinGeckoId?: string;
    transferType?: string;
    minValueUsd?: number;
  }
): Promise<WhaleEvent[]> {
  let query = getDb()
    .select()
    .from(whaleEvents)
    .orderBy(desc(whaleEvents.blockTimestamp))
    .limit(limit);

  const conditions = [];

  if (filters?.coinGeckoId) {
    conditions.push(eq(whaleEvents.coinGeckoId, filters.coinGeckoId));
  }
  if (filters?.transferType) {
    conditions.push(eq(whaleEvents.transferType, filters.transferType));
  }
  if (filters?.minValueUsd) {
    conditions.push(gte(whaleEvents.valueUsd, filters.minValueUsd.toString()));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  return query;
}

/**
 * Get top whale movements by value
 */
export async function getTopWhaleMovements(
  limit: number = 10,
  hours: number = 24
): Promise<WhaleEvent[]> {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  return getDb()
    .select()
    .from(whaleEvents)
    .where(gte(whaleEvents.blockTimestamp, cutoff))
    .orderBy(desc(whaleEvents.valueUsd))
    .limit(limit);
}

/**
 * Get aggregate metrics with token breakdown
 */
export async function getWhaleAggregateMetrics(
  hours: number = 24
): Promise<{
  totalTransactions: number;
  totalVolumeUsd: number;
  exchangeInflow: number;
  exchangeOutflow: number;
  netFlow: number;
  topTokensByVolume: Array<{
    coinGeckoId: string;
    symbol: string;
    volume: number;
    transactionCount: number;
  }>;
}> {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Get aggregate stats
  const [aggregates] = await getDb()
    .select({
      totalTransactions: sql<number>`count(*)::int`,
      totalVolumeUsd: sql<number>`COALESCE(sum(${whaleEvents.valueUsd}::numeric), 0)::float`,
      exchangeInflow: sql<number>`COALESCE(sum(CASE WHEN ${whaleEvents.transferType} = 'exchange_inflow' THEN ${whaleEvents.valueUsd}::numeric ELSE 0 END), 0)::float`,
      exchangeOutflow: sql<number>`COALESCE(sum(CASE WHEN ${whaleEvents.transferType} = 'exchange_outflow' THEN ${whaleEvents.valueUsd}::numeric ELSE 0 END), 0)::float`,
    })
    .from(whaleEvents)
    .where(gte(whaleEvents.blockTimestamp, cutoff));

  // Get top tokens
  const topTokens = await getDb()
    .select({
      coinGeckoId: whaleEvents.coinGeckoId,
      symbol: whaleEvents.tokenSymbol,
      volume: sql<number>`COALESCE(sum(${whaleEvents.valueUsd}::numeric), 0)::float`,
      transactionCount: sql<number>`count(*)::int`,
    })
    .from(whaleEvents)
    .where(
      and(
        gte(whaleEvents.blockTimestamp, cutoff),
        sql`${whaleEvents.coinGeckoId} IS NOT NULL`
      )
    )
    .groupBy(whaleEvents.coinGeckoId, whaleEvents.tokenSymbol)
    .orderBy(desc(sql`sum(${whaleEvents.valueUsd}::numeric)`))
    .limit(10);

  return {
    totalTransactions: aggregates?.totalTransactions || 0,
    totalVolumeUsd: aggregates?.totalVolumeUsd || 0,
    exchangeInflow: aggregates?.exchangeInflow || 0,
    exchangeOutflow: aggregates?.exchangeOutflow || 0,
    netFlow: (aggregates?.exchangeOutflow || 0) - (aggregates?.exchangeInflow || 0),
    topTokensByVolume: topTokens.map((t) => ({
      coinGeckoId: t.coinGeckoId || '',
      symbol: t.symbol || '',
      volume: t.volume,
      transactionCount: t.transactionCount,
    })),
  };
}
```

#### Acceptance Criteria (Phase 8)
- [ ] `getRecentWhaleEvents` with filters
- [ ] `getTopWhaleMovements` by value
- [ ] `getWhaleAggregateMetrics` with token breakdown
- [ ] Efficient queries with proper indexes

---

## File Structure Summary

```
src/
├── app/
│   ├── api/
│   │   └── whale/
│   │       ├── events/
│   │       │   └── route.ts          # GET /api/whale/events
│   │       ├── metrics/
│   │       │   └── route.ts          # GET /api/whale/metrics
│   │       └── top-movements/
│   │           └── route.ts          # GET /api/whale/top-movements
│   └── dashboard/
│       └── whale-alerts/
│           └── page.tsx              # Main page component
├── components/
│   └── whale/
│       ├── whale-stats-cards.tsx     # Metric cards
│       ├── exchange-flow-analysis.tsx # Flow visualization
│       ├── whale-activity-feed.tsx    # Real-time feed
│       └── top-whale-movements.tsx    # Top transactions table
├── hooks/
│   └── use-whale-data.ts             # TanStack Query hooks
└── lib/
    └── db/
        └── whale-queries.ts          # Extended (add new queries)
```

---

## Testing Strategy

### Manual Testing
1. Verify auth protection (logged-out users redirected)
2. Check all components load with real data
3. Test filters on activity feed
4. Verify auto-refresh behavior
5. Test mobile responsive layout

### Data Scenarios
1. Empty state (no whale events)
2. High activity (many events)
3. Mixed transfer types
4. Unknown tokens (no coinGeckoId)

### Performance
1. Monitor query performance on large datasets
2. Verify caching reduces DB load
3. Check bundle size impact

---

## Risks & Considerations

### Data Availability
- **Risk:** No whale events if webhook not receiving data
- **Mitigation:** Add empty states with helpful messages explaining setup

### Query Performance
- **Risk:** Large whale_events table could slow queries
- **Mitigation:** Use existing indexes, consider pagination for large result sets

### Real-time Updates
- **Risk:** Auto-refresh could cause rate limiting
- **Mitigation:** Use TanStack Query's staleTime and refetchInterval wisely

### USD Value Accuracy
- **Risk:** `valueUsd` may be null for some transactions
- **Mitigation:** Show token amount as primary, USD as secondary when available

---

## Future Enhancements (Out of Scope)

1. **User Alert Configuration** - Allow users to set custom thresholds
2. **Push Notifications** - Email/browser notifications for large movements
3. **Historical Charts** - Visualize flow trends over time
4. **Whale Address Tracking** - Follow specific whale wallets
5. **Multi-chain Support** - Expand beyond Ethereum

---

## Estimated Complexity

| Phase | Complexity | Dependencies |
|-------|------------|--------------|
| Phase 1 | Medium | Database queries |
| Phase 2 | Low | Phase 1 |
| Phase 3 | Low | Phase 2 |
| Phase 4 | Medium | Phase 2, may need Progress component |
| Phase 5 | Medium | Phase 2 |
| Phase 6 | Medium | Phase 2 |
| Phase 7 | Low | Phases 3-6 |
| Phase 8 | Medium | None |

**Recommended Implementation Order:**
1. Phase 8 (DB queries) - Foundation
2. Phase 1 (API routes) - Depends on Phase 8
3. Phase 2 (Hooks) - Depends on Phase 1
4. Phases 3-6 (Components) - Can be parallelized after Phase 2
5. Phase 7 (Page) - Final integration

---

## Summary

This implementation plan creates a comprehensive Whale Alerts page that:
- Surfaces real-time whale transaction data from the existing Alchemy webhook infrastructure
- Provides meaningful insights through stats cards, flow analysis, and activity feeds
- Follows existing codebase patterns for consistency
- Is protected by Clerk authentication
- Uses TanStack Query for efficient data management
- Is fully responsive and provides good loading states

The estimated effort is 2-3 days for a complete implementation with all phases.
