---
phase: 03-dashboard-cashout-flow
plan: 05
subsystem: dashboard-composition
tags: [ui, wiring, dashboard, composition, wave3]
dependency_graph:
  requires:
    - 03-03 (StatsRow, GoalProgress, TierBadge components)
    - 03-04 (TradeList, TradeCard, CashoutBreakdown, CashoutModal components)
  provides:
    - Fully composed dashboard page with live Convex data (DASH-01 through DASH-06)
  affects:
    - src/app/dashboard/page.tsx
tech_stack:
  added: []
  patterns:
    - useQuery for 4 reactive Convex queries (wallets, trades, userState, goalSettings)
    - useAction wired to TradeList onSync callback
    - LoadingSkeleton function component guards all 4 queries
    - Composition pattern — page.tsx owns data; presentational components own rendering
key_files:
  created: []
  modified:
    - src/app/dashboard/page.tsx (182 lines, rewritten from 195 lines)
decisions:
  - node_modules symlinked from main repo to worktree (same approach as Plans 03/04 — not committed)
  - LoadingSkeleton defined as local function above DashboardPage (not a separate file — Plan 05 only use)
  - vaultWallet?.address ?? "" fallback for TradeList when wallet not yet loaded (isLoading guard prevents render, but TS requires fallback)
  - Removed old Refresh Trades button from page header — TradeList section owns it per CONTEXT.md decision
  - Old Card-based wallet display removed; replaced entirely by StatsRow component
metrics:
  duration: 1 minute
  completed: 2026-05-11
  tasks_completed: 1
  files_created: 0
  files_modified: 1
---

# Phase 3 Plan 05: Dashboard Composition Summary

**One-liner:** Composed dashboard/page.tsx with StatsRow, GoalProgress, and TradeList backed by 4 live Convex queries (wallets, trades, userState, goalSettings), making all six DASH-* requirements user-observable.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Compose dashboard page with live Convex data | c181664 | src/app/dashboard/page.tsx |

## Task 2: Checkpoint (Awaiting Human Verification)

| Task | Name | Status |
|------|------|--------|
| 2 | Human verification of dashboard in browser | AWAITING |

## What Changed in page.tsx

### Removed
- `import { Card, CardContent, CardHeader, CardTitle }` — old wallet cards replaced by StatsRow
- `import { RefreshCw, Loader2 }` — now owned by TradeList component
- Old `isLoading` check (`wallets === undefined` only) — replaced by 4-query guard
- Old wallet balance card JSX (two Card components for trading/vault)
- Old trades placeholder (`{trades.length} closed trades synced`)
- Old Refresh Trades button from page header

### Added
- `import { StatsRow, TradeList, GoalProgress }` — three dashboard section components
- `import { Skeleton }` from `@/components/ui/skeleton`
- `import { DEFAULTS }` from `@/lib/constants`
- `useQuery(api.userState.getUserState)` — for losingStreak data
- `useQuery(api.goalSettings.getGoalSettings)` — for monthly goal progress
- Changed `limit: 50` to `limit: 10` (dashboard only shows recent 10 trades)
- 4-query `isLoading` guard (wallets | trades | userState | goalSettings undefined)
- `LoadingSkeleton` local function with 3-column skeleton grid + list items
- `StatsRow` with live tradingWallet, vaultWallet, and losingStreak from userState
- `GoalProgress` with currentMonthProgressUsd and monthlyGoalUsd (fallback to DEFAULTS)
- `TradeList` with trades, vaultAddress, isSyncing, and handleSync wired as onSync

### Preserved Unchanged
- `useEffect` for wallets === null (signout + redirect to "/")
- `useEffect` for wallets.length === 0 (redirect to "/setup")
- `handleSync` function (syncTrades action + toast notifications)
- `handleDisconnect` function (signout, reset, disconnect, router.push)
- Settings icon button + Disconnect button in header

## Requirements Closed

| Requirement | Description | Status |
|-------------|-------------|--------|
| DASH-01 | Trading wallet SOL + USD balance visible | CLOSED — StatsRow Trading Wallet card |
| DASH-02 | Vault wallet SOL + USD balance visible | CLOSED — StatsRow Vault Wallet card |
| DASH-03 | Wallet health tier with color-coded badge | CLOSED — StatsRow Tier Card via TierBadge |
| DASH-04 | Trade list with cashout recommendations | CLOSED — TradeList + TradeCard |
| DASH-05 | Refresh Trades button in trade list section | CLOSED — TradeList section header button wired to onSync |
| DASH-06 | Monthly goal progress bar | CLOSED — GoalProgress below StatsRow |

## Deviations from Plan

### Infrastructure Fix

**[Rule 3 - Blocking] Symlinked node_modules to worktree**
- **Found during:** Task 1 verification (tsc run)
- **Issue:** Git worktree has no `node_modules` directory. Running `pnpm tsc` failed with "Command not found". Same issue as Plans 03/04.
- **Fix:** `ln -s /path/to/main/node_modules /path/to/worktree/node_modules`. Symlink not committed.
- **Impact:** TypeScript verification now works correctly in the worktree context.

## Known Stubs

None. All props are wired to live Convex data. GoalProgress and StatsRow receive real data with `?? 0` / `?? DEFAULTS.MONTHLY_GOAL_USD` fallbacks for the case where the user hasn't yet initialized their goal settings (valid new-user state, not a stub).

## Threat Flags

No new security-relevant surface introduced. The two new Convex queries (`getUserState`, `getGoalSettings`) are read-only, scoped to `identity.subject` on the server side, and return null for unauthenticated callers (consistent with existing query patterns). Threat T-03-06 (undefined guard DoS) mitigated as planned — all 4 queries are included in the `isLoading` guard.

## Self-Check: PASSED

Files confirmed present:
- src/app/dashboard/page.tsx: FOUND

Commits confirmed in git log:
- c181664: feat(03-05): compose dashboard with live Convex data and new components
