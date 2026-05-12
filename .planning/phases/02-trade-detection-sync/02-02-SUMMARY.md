---
phase: 02-trade-detection-sync
plan: 02
subsystem: trade-sync
tags: [price-service, trade-orchestration, dashboard-sync, auto-sync, toast-notifications]
dependency_graph:
  requires:
    - 02-01 (Enhanced API client, trade parser with position boundaries)
  provides:
    - End-to-end trade sync pipeline (dashboard → API → Helius → DB)
    - SOL/USD price service with caching
    - Position closure detection
    - Dashboard auto-sync and manual refresh
  affects:
    - Future P&L calculations will use USD values
    - Dashboard shows real-time trade sync feedback
tech_stack:
  added:
    - CoinGecko API for SOL/USD price
  patterns:
    - Backfill vs incremental sync logic
    - Price caching (60s TTL)
    - Auto-sync on page load
    - Toast notifications for UX feedback
key_files:
  created:
    - src/lib/services/price-service.ts (SOL/USD price with 60s cache)
  modified:
    - src/lib/services/trade-service.ts (backfill/incremental sync, position closure detection)
    - src/types/index.ts (Trade, SyncResult, TradeRefreshResponse with USD fields)
    - src/app/api/trades/refresh/route.ts (return sync metrics)
    - src/app/dashboard/page.tsx (handleSync, auto-sync, refresh button)
    - src/lib/trade-parser.ts (support both HeliusTransaction and EnhancedTransaction)
    - src/lib/helpers/trade-helpers.ts (union type support for helpers)
decisions:
  - CoinGecko free API for SOL/USD price (60s cache, $150 fallback on failure)
  - Auto-sync on dashboard page load after balances fetch (LOCKED user decision)
  - Manual refresh button with spinner (LOCKED user decision)
  - Toast notifications for all sync results - success with trade count/SOL, info if empty, error with retry button (LOCKED user decision)
  - Only save CLOSED trades (positions with zero token balance)
  - Backfill up to 500 swap transactions on first sync, incremental (since last_synced_at) on subsequent syncs
metrics:
  duration_minutes: 10
  tasks_completed: 2
  commits: 2
  tests_added: 0
  tests_total: 247
  files_modified: 7
  completed_at: "2026-02-22"
---

# Phase 02 Plan 02: Trade Sync Orchestration & Dashboard Integration Summary

End-to-end trade sync pipeline: SOL/USD price service, backfill/incremental sync orchestration with position closure detection, and dashboard with auto-sync and manual refresh.

## What Was Built

Wired the trade detection pipeline from Plan 01 to the user-facing dashboard. Created a price service for USD conversion, refactored trade-service to use Enhanced API with backfill/incremental sync logic, detect position closures via token balance checks, and built dashboard UI with auto-sync on load and manual refresh with toast notifications.

## Implementation Details

### Task 1: Create price service and refactor trade-service sync orchestration (ab98cfc)

**Price Service (src/lib/services/price-service.ts):**

Created `getSolUsdPrice()` function using CoinGecko free API:
- Fetches from `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd`
- 60-second cache (`PRICE_CACHE_MS = 60_000`)
- Falls back to $150 if API fails (per Phase 1 decision)
- Returns cached price if fresh, or stale cached price if API fails
- Graceful error handling with console.warn

**Trade Service refactor (src/lib/services/trade-service.ts):**

Replaced `getTransactionHistory` with Enhanced API functions:
1. **Imports updated:** Added `getSwapHistory`, `backfillSwapHistory`, `getTokenBalances`, `getSolUsdPrice`, `updatePositionClosureStatus`

2. **Backfill vs incremental logic:**
   ```typescript
   if (!lastSync) {
     // First sync: backfill up to 500 swap transactions
     allSwaps = await backfillSwapHistory(walletAddress, 500);
   } else {
     // Incremental: fetch recent swaps, filter by timestamp > lastSync
     allSwaps = await getSwapHistory(walletAddress);
     allSwaps = allSwaps.filter(tx => tx.timestamp > lastSyncTimestamp);
   }
   ```

3. **Parse trades:** Call `parseTrades(allSwaps, walletAddress)` which now handles both HeliusTransaction and EnhancedTransaction

4. **Detect closures:**
   - Fetch current token balances via `getTokenBalances(walletAddress)`
   - Use `updatePositionClosureStatus` to mark which trades have zero token balance
   - Only save CLOSED trades (open positions are not actionable for cashout)

5. **USD conversion:**
   - Fetch SOL price via `getSolUsdPrice()`
   - Calculate `net_profit_usd = net_profit_sol * solPrice`
   - Also calculate `total_entry_usd` and `total_exit_usd` (stored in Trade record)

6. **Fee tracking:** New `parseTrades` already provides `totalFeesSol` per trade (added in Plan 01)

7. **Deduplication:** Kept existing `findExistingTrade` logic (user_id + token_mint + position_closed_at)

8. **Save trade:** Updated `saveTrade` to accept `solPrice` parameter and include new fields:
   - `total_fees_sol`
   - `net_profit_usd`
   - `roi_multiplier`

9. **SyncResult updates:** Return new fields:
   - `closedTradesCount: number`
   - `totalProfitSol: number`
   - `totalProfitUsd: number`
   - `solPrice: number`

10. **Error handling:** Wrapped Helius calls in try/catch. Auto-retry is handled by `retryWithBackoff` in helius-client. If all retries fail, error propagates to API route.

**Type updates (src/types/index.ts):**

Updated `Trade` interface:
- Added `total_fees_sol: number`
- Added `net_profit_usd?: number`
- Added `roi_multiplier?: number`

Updated `SyncResult`:
- Added `closedTradesCount: number`
- Added `totalProfitSol: number`
- Added `totalProfitUsd: number`
- Added `solPrice: number`

Updated `TradeRefreshResponse`:
- Added same fields as `SyncResult`

Fixed `TokenTransfer.tokenStandard` from required to optional (compatibility with EnhancedTransaction)

**Parser updates (src/lib/trade-parser.ts):**

Updated `parseTrades` and `aggregateTokenTransactions` to accept union type:
- `(HeliusTransaction | EnhancedTransaction)[]`
- Check for `events.swap` to determine if EnhancedTransaction
- Use `extractSwapAmounts` for EnhancedTransaction (events.swap data)
- Use legacy `extractNativeTransfers` for HeliusTransaction
- Both paths calculate `totalFeesSol`, `solSpent`, `solReceived`

**Helper updates (src/lib/helpers/trade-helpers.ts):**

Updated functions to support union type:
- `getTransactionsByTokenMint`
- `sortTransactionsByTime`
- `getFirstTransactionTime`
- `getLastTransactionTime`

**Result:** All 247 tests passing, type checking successful.

### Task 2: Update API route and dashboard with sync UI (25ddc64)

**API Route (src/app/api/trades/refresh/route.ts):**

Updated POST handler response:
```typescript
const response: TradeRefreshResponse = {
  success: true,
  newTrades: result.newTrades,
  updatedBalances: result.updatedBalances,
  closedTradesCount: result.closedTradesCount,
  totalProfitSol: result.totalProfitSol,
  totalProfitUsd: result.totalProfitUsd,
  solPrice: result.solPrice,
};
```

Error handling remains the same (ValidationError → 400, ApiError → dynamic status, generic → 500).

**Dashboard (src/app/dashboard/page.tsx):**

1. **State added:** `isSyncing: boolean` for refresh button spinner

2. **Auto-sync on mount:** Triggers after wallets and balances are loaded:
   ```typescript
   useEffect(() => {
     const tradingWallet = wallets.find(w => w.wallet_type === 'trading');
     if (tradingWallet && !isLoadingBalances && !isSyncing && balances.size > 0) {
       handleSync();
     }
   }, [wallets, isLoadingBalances]);
   ```

3. **Manual refresh button:** Added in header next to Settings/Disconnect:
   ```tsx
   <Button onClick={handleSync} disabled={isSyncing}>
     {isSyncing ? (
       <><Loader2 className="animate-spin" /> Syncing...</>
     ) : (
       <><RefreshCw /> Refresh Trades</>
     )}
   </Button>
   ```
   Imports: `RefreshCw` and `Loader2` from `lucide-react`

4. **handleSync function:**
   - Fetches from `/api/trades/refresh` with trading wallet address
   - On success with trades: `toast.success("Found N new closed trades (+X.XXXX SOL)")`
   - On success with no trades: `toast.info("No new closed trades found")`
   - On error: `toast.error(message, { action: { label: 'Retry', onClick: handleSync } })`
   - After successful sync: re-fetch balances to show updated values

5. **Toast configuration:** Sonner `Toaster` already in layout from Phase 1. Toasts show:
   - Success with count and profit (with sign: +/-)
   - Info for empty sync
   - Error with retry button action

6. **Balance refresh:** After successful sync, re-fetch balances using existing `/api/wallets/balances` endpoint

**Result:** All 247 tests passing, type checking successful.

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions

1. **CoinGecko for SOL/USD price:** Using free public API with 60s cache and $150 fallback. Simple, no auth required, sufficient for MVP.

2. **Auto-sync on page load:** Triggers after balances are fetched (LOCKED user decision from research). Ensures fresh trade data without manual action.

3. **Manual refresh button:** Always available, shows spinner during sync (LOCKED user decision). User can trigger sync at any time.

4. **Toast notifications for all results:** Success shows trade count and SOL profit, empty sync shows info toast, errors show with retry button (LOCKED user decision). Clear UX feedback for all scenarios.

5. **Only save closed trades:** Only positions with zero token balance are actionable for cashout. Open positions are filtered out before saving.

6. **Backfill vs incremental sync:** First sync backfills up to 500 transactions, subsequent syncs fetch since last_synced_at. Efficient and prevents re-processing.

## Testing Strategy

- Type checking: All types updated to include new fields
- Unit tests: All 247 existing tests still passing (no new tests added - this is integration work)
- Trade parser supports both transaction types via union type
- Helpers updated to handle union types throughout

## What Works Now

1. SOL/USD price fetched from CoinGecko with 60s cache and $150 fallback
2. First sync backfills up to 500 swap transactions via Enhanced API
3. Subsequent syncs fetch only new transactions since last_synced_at
4. Position closure detected via token balance check (zero balance = closed)
5. Only closed trades saved to database (open positions excluded)
6. P&L values include both SOL and USD
7. Dashboard auto-syncs on page load after balances fetch
8. Manual refresh button with spinner and disabled state
9. Toast notifications for all sync results:
   - Success with trade count: "Found 3 new closed trades (+2.5000 SOL)"
   - Success with no trades: "No new closed trades found"
   - Error with retry: "Failed to sync trades" with Retry button
10. Balances refresh after successful sync
11. All 247 tests passing

## What's Next

- 02-03 (if planned): Trade history UI to display closed trades
- Phase 3: Cashout calculation and recommendation UI
- Phase 4: Goal tracking and boost logic
- Phase 5: Vault wallet integration

## Self-Check: PASSED

Files created:
- FOUND: src/lib/services/price-service.ts

Files modified:
- FOUND: src/lib/services/trade-service.ts
- FOUND: src/types/index.ts
- FOUND: src/app/api/trades/refresh/route.ts
- FOUND: src/app/dashboard/page.tsx
- FOUND: src/lib/trade-parser.ts
- FOUND: src/lib/helpers/trade-helpers.ts

Commits exist:
- FOUND: ab98cfc (Task 1: price service and trade-service refactor)
- FOUND: 25ddc64 (Task 2: dashboard sync UI)

All tests passing: 247/247
Type checking: PASSED
