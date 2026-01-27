# Phase 2: Whale Detection - User Acceptance Testing

**Phase Goal:** Dashboard shows DEX-sourced whale activity from on-chain trades

**Started:** 2026-01-27
**Status:** In Progress

---

## Test Checklist

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | Token table displays a "Whale" column between Volume and Market Cap | ⏳ | |
| 2 | WhaleIndicator shows score 0-100 with directional coloring (green=accumulation, red=distribution, neutral=gray) | ⏳ | |
| 3 | Hovering over WhaleIndicator shows tooltip with 24h breakdown (net flow, buy/sell volumes, buy ratio) | ⏳ | |
| 4 | `/api/tokens` endpoint returns whale metrics (whaleScore, netFlow24h, buyVolume24h, sellVolume24h) | ⏳ | |
| 5 | `/api/tokens/[chain]` endpoint returns whale metrics for chain-specific tokens | ⏳ | |
| 6 | Tokens without whale data show neutral/empty indicator (not error) | ⏳ | |

---

## Test Results

### Test 1: Token table displays "Whale" column

**Expected:** Token table has a column labeled "Whale" positioned between Volume and Market Cap columns

**Result:** ⏳ Pending

---

### Test 2: WhaleIndicator directional coloring

**Expected:**
- Green indicator for tokens with net whale buying (accumulation)
- Red indicator for tokens with net whale selling (distribution)
- Neutral/gray for tokens with <$10k net flow

**Result:** ⏳ Pending

---

### Test 3: WhaleIndicator tooltip

**Expected:** Hovering shows:
- Net flow (positive = buys exceed sells)
- 24h buy volume
- 24h sell volume
- Buy ratio percentage

**Result:** ⏳ Pending

---

### Test 4: /api/tokens whale metrics

**Expected:** API response includes whale fields for each token:
```json
{
  "whaleScore": 65,
  "netFlow24h": 250000,
  "buyVolume24h": 500000,
  "sellVolume24h": 250000
}
```

**Result:** ⏳ Pending

---

### Test 5: /api/tokens/[chain] whale metrics

**Expected:** Chain-specific endpoint also returns whale metrics merged into token data

**Result:** ⏳ Pending

---

### Test 6: Graceful handling of missing whale data

**Expected:** Tokens without whale metrics display neutral indicator, not error or broken UI

**Result:** ⏳ Pending

---

## Issues Found

_None yet_

---

## Session Log

- 2026-01-27: UAT session created with 6 tests

---
*Phase: 02-whale-detection*
*UAT Created: 2026-01-27*
