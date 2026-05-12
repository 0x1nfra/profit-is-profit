---
phase: 03-dashboard-cashout-flow
verified: 2026-05-12T00:31:00Z
status: human_needed
score: 7/7 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Navigate to /dashboard in browser — verify trading wallet balance (SOL + USD) appears in the Trading Wallet card"
    expected: "Balance displays as X.XXXX SOL and $Y.YY USD"
    why_human: "DASH-01 is user-visible UI — requires live Convex data and browser rendering"
  - test: "Navigate to /dashboard in browser — verify vault wallet balance (SOL + USD) appears in the Vault Wallet card"
    expected: "Balance displays as X.XXXX SOL and $Y.YY USD"
    why_human: "DASH-02 is user-visible UI — requires live Convex data and browser rendering"
  - test: "Navigate to /dashboard — verify Wallet Health card shows tier number (1–5), tier label (Critical/Caution/Stable/Healthy/Peak), and color-coded badge/border"
    expected: "Tier badge renders with correct color and label for current trading wallet balance"
    why_human: "DASH-03 color rendering and tier label accuracy requires visual inspection"
  - test: "Navigate to /dashboard — if trades exist, verify each card shows token, P&L (SOL), ROI%, and recommended cashout amount in yellow. Click a pending winning trade to expand it and verify breakdown (Tier base / ROI bonus / Streak / Goal boost / final SOL)"
    expected: "Trade cards render with all fields; expanded breakdown shows all 5 cashout components"
    why_human: "DASH-04 + CASH-04 require live trade data and visual inspection of the breakdown panel"
  - test: "Click 'Refresh Trades' button in the trade list section header — verify spinner appears and a toast shows sync result"
    expected: "Button shows 'Syncing...' during in-flight action, then shows toast (new trades found / up to date / error)"
    why_human: "DASH-05 requires live Helius API call and real-time UI state"
  - test: "Navigate to /dashboard — verify 'Goal: $X / $Y this month' text and progress bar appear below the stats row"
    expected: "GoalProgress renders with dollar amounts and a progress bar"
    why_human: "DASH-06 requires live goalSettings Convex data"
  - test: "Hard-refresh /dashboard — verify skeleton placeholders appear briefly before data loads"
    expected: "Three 3-column skeleton cards flash, then real StatsRow renders"
    why_human: "Loading skeleton timing requires real network latency to observe"
  - test: "On a pending winning trade, click 'Cash Out' in the breakdown. Verify modal opens with vault address, copy button (Copy→Check feedback), amount, 'Go Back' button, and 'I've transferred the SOL — Confirm Cashout' button"
    expected: "Modal renders correctly; copy button shows green Check for 2s; clicking Confirm Cashout shows spinner then success toast"
    why_human: "CASH-05 + CASH-06 cashout confirmation UX requires real mutation call and clipboard interaction"
---

# Phase 3: Dashboard & Cashout Flow Verification Report

**Phase Goal:** Users can see their dashboard with wallet health tier, wallet balances, trade history with cashout recommendations, and can manually trigger a cashout flow.
**Verified:** 2026-05-12T00:31:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees trading wallet balance and vault wallet balance (both SOL and USD) on dashboard | ✓ VERIFIED | `StatsRow` wired to live `useQuery(api.wallets.getUserWallets)` in page.tsx; renders `{balanceSol.toFixed(4)} SOL` + `${balanceUsd.toFixed(2)} USD` |
| 2 | User sees current wallet health tier (1-5) displayed with color-coded badge | ✓ VERIFIED | `TierBadge` receives `balanceSol` prop, calls `calculateTier()` + `getTierConfig()`, renders tier number + TIER_LABELS + inline `style={{ backgroundColor: config.color }}` |
| 3 | User sees recent trades with calculated cashout recommendations and full breakdown (tier, ROI bonus, streak multiplier, goal boost) | ✓ VERIFIED | `TradeList → TradeCard → CashoutBreakdown` renders all 5 fields: `baseCashoutPercent`, `roiBonusPercent`, `streakMultiplier`, `goalBoostMultiplier`, `finalCashoutPercent` + `recommendedCashoutSol` |
| 4 | User can confirm a cashout after manually transferring SOL to vault wallet | ✓ VERIFIED | `CashoutModal` calls `useMutation(api.trades.confirmCashout)` with `{ tradeId: trade._id, actualCashoutSol: trade.recommendedCashoutSol }` |
| 5 | System updates wallet balances after cashout confirmation | ✓ VERIFIED | `confirmCashout` in convex/trades.ts patches both trading wallet (`Math.max(0, balanceSol - actualCashoutSol)`) and vault wallet (`balanceSol + actualCashoutSol`) |
| 6 | System caps cashout percentage to prevent over-extraction on mega wins | ✓ VERIFIED | `calculateCashout` applies `Math.min(boostedPercent, CASHOUT_CAP_PERCENT)` at line 65 of cashout-calculator.ts; `CASHOUT_CAP_PERCENT = 65` in constants.ts |
| 7 | System persists losing streak across page reloads and resets on any win | ✓ VERIFIED | `computeUpdatedStreak` implementation (localeCompare sort + win-reset/loss-increment); `updateLosingStreak` internalMutation upserts `userState.currentLosingStreak`; streak wired in `sync.ts` after every non-empty sync |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/constants.ts` | CASHOUT_CAP_PERCENT = 65 | ✓ VERIFIED | Line 121: `export const CASHOUT_CAP_PERCENT = 65` |
| `src/lib/cashout-calculator.ts` | 65% cap enforcement | ✓ VERIFIED | Line 65: `Math.min(boostedPercent, CASHOUT_CAP_PERCENT)` |
| `src/lib/helpers/cashout-helpers.ts` | computeUpdatedStreak implementation | ✓ VERIFIED | Lines 221–237: full implementation with localeCompare sort; no "Not implemented" stub remaining |
| `convex/userState.ts` | updateLosingStreak internalMutation | ✓ VERIFIED | Line 56: `export const updateLosingStreak = internalMutation(...)` with upsert logic |
| `convex/trades.ts` | confirmCashout public mutation | ✓ VERIFIED | Line 87: `export const confirmCashout = mutation(...)` with all 4 STRIDE mitigations |
| `convex/sync.ts` | status fix + streak update wiring | ✓ VERIFIED | Line 182: ternary `netProfit > 0 ? "pending" : "confirmed"`; Lines 196–207: `computeUpdatedStreak` call + `updateLosingStreak` mutation |
| `src/components/dashboard/TierBadge.tsx` | Color-coded tier badge | ✓ VERIFIED | 49 lines; `TIER_LABELS`, `calculateTier`, `getTierConfig`, `{losingStreak}-loss streak` |
| `src/components/dashboard/StatsRow.tsx` | 3-card stats grid | ✓ VERIFIED | 92 lines; `md:grid-cols-3`, `border-l-4`, `TierBadge` import |
| `src/components/dashboard/GoalProgress.tsx` | Monthly goal progress | ✓ VERIFIED | 28 lines; `Progress`, `Math.min(100, ...)`, "this month" copy |
| `src/components/dashboard/CashoutBreakdown.tsx` | Cashout breakdown panel | ✓ VERIFIED | 59 lines; all 5 cashout fields rendered; `trade.status === "pending"` gate on Cash Out button |
| `src/components/dashboard/CashoutModal.tsx` | Confirmation dialog | ✓ VERIFIED | 135 lines; `useMutation(api.trades.confirmCashout)`, clipboard copy, 2s timeout, Loader2 spinner |
| `src/components/dashboard/TradeCard.tsx` | Collapsible trade card | ✓ VERIFIED | 102 lines; `expanded`, `CashoutBreakdown`, `CashoutModal`, 3 states (loss/pending/confirmed) |
| `src/components/dashboard/TradeList.tsx` | List with section header | ✓ VERIFIED | 64 lines; "Recent Trades" h2, "Refresh Trades"/"Syncing...", "No trades yet" empty state |
| `src/app/dashboard/page.tsx` | Fully composed dashboard | ✓ VERIFIED | 169 lines; 4 queries, LoadingSkeleton, StatsRow + GoalProgress + TradeList wired with live data |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `cashout-calculator.ts` | `constants.ts` | `import CASHOUT_CAP_PERCENT` | ✓ WIRED | Line 15 import confirmed |
| `convex/sync.ts` | `convex/userState.ts` | `internal.userState.updateLosingStreak` | ✓ WIRED | Line 205 call confirmed |
| `convex/trades.ts confirmCashout` | `convex/wallets.ts` | `.withIndex('by_user_type', ...)` | ✓ WIRED | Line 133 confirmed |
| `convex/sync.ts` | `cashout-helpers.ts` | `import { computeUpdatedStreak }` | ✓ WIRED | Line 6 import + line 198 call confirmed |
| `CashoutModal.tsx` | `convex/trades.ts (confirmCashout)` | `useMutation(api.trades.confirmCashout)` | ✓ WIRED | Lines 4 (import) + 38 (usage) confirmed |
| `TradeCard.tsx` | `CashoutBreakdown.tsx` | expanded panel render | ✓ WIRED | Lines 7 (import) + 90 (render) confirmed |
| `TradeCard.tsx` | `CashoutModal.tsx` | controlled open state | ✓ WIRED | Lines 8 (import) + 94 (render) confirmed |
| `TradeList.tsx` | `TradeCard.tsx` | `trades.map(trade => <TradeCard ...>)` | ✓ WIRED | Lines 5 (import) + 58 (map) confirmed |
| `page.tsx` | `api.wallets.getUserWallets` | `useQuery` | ✓ WIRED | Line 46 confirmed |
| `page.tsx` | `api.trades.getUserTrades` | `useQuery` | ✓ WIRED | Line 47 confirmed |
| `page.tsx` | `api.userState.getUserState` | `useQuery` | ✓ WIRED | Line 49 confirmed |
| `page.tsx` | `api.goalSettings.getGoalSettings` | `useQuery` | ✓ WIRED | Line 50 confirmed |
| `page.tsx` | `StatsRow.tsx` | import + props | ✓ WIRED | Lines 12 (import) + 146–151 (render with losingStreak) confirmed |
| `page.tsx` | `GoalProgress.tsx` | import + props | ✓ WIRED | Lines 14 (import) + 154–157 (render with currentMonthProgressUsd fallback) confirmed |
| `page.tsx` | `TradeList.tsx` | import + onSync | ✓ WIRED | Lines 13 (import) + 160–165 (render with handleSync) confirmed |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `StatsRow` | `tradingWallet`, `vaultWallet` | `useQuery(api.wallets.getUserWallets)` → convex/wallets.ts `.withIndex("by_user")` | Yes — real DB query scoped to user | ✓ FLOWING |
| `TierBadge` | `balanceSol` | Passed from StatsRow from real wallet data | Yes — flows from DB | ✓ FLOWING |
| `TradeList` | `trades` | `useQuery(api.trades.getUserTrades, { limit: 10 })` → convex/trades.ts `.withIndex("by_user")` | Yes — real DB query | ✓ FLOWING |
| `GoalProgress` | `currentProgressUsd`, `monthlyGoalUsd` | `useQuery(api.goalSettings.getGoalSettings)` → convex/goalSettings.ts | Yes — real DB query (returns `currentMonthProgressUsd: 0` default for new users — valid initial state) | ✓ FLOWING |
| `CashoutBreakdown` | `trade.*` fields | From `trades` query — all cashout fields stored by `sync.ts` from `calculateCashout()` | Yes — all 5 breakdown fields stored in DB by sync | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Test suite passes with 286 tests | `pnpm test` | 286 passed, 0 failed, 15 test files | ✓ PASS |
| CASH-07 cap tests pass (7 tests) | included in suite | Cap boundary tests GREEN | ✓ PASS |
| CASH-03 streak tests pass (11 tests) | included in suite | All streak sequence tests GREEN | ✓ PASS |
| Component tests pass (21 tests) | included in suite | TierBadge/StatsRow/GoalProgress/TradeCard/TradeList all GREEN | ✓ PASS |
| CASHOUT_CAP_PERCENT = 65 in constants | `grep "CASHOUT_CAP_PERCENT = 65" src/lib/constants.ts` | Match found at line 121 | ✓ PASS |
| confirmCashout has IDOR check | `grep "trade.userId !== identity.subject" convex/trades.ts` | Match at line 99 | ✓ PASS |
| sync.ts uses pending/confirmed ternary | `grep 'netProfit > 0 ? "pending" : "confirmed"' convex/sync.ts` | Match at line 182 | ✓ PASS |
| TypeScript (source files only) | `pnpm tsc --noEmit \| grep "error TS" \| grep -v "__tests__"` | No errors in production source files | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DASH-01 | 03-05 | Trading wallet balance visible | ✓ SATISFIED | StatsRow Trading Wallet card wired to live `wallets` query; `{balanceSol.toFixed(4)} SOL` render |
| DASH-02 | 03-05 | Vault wallet balance visible | ✓ SATISFIED | StatsRow Vault Wallet card wired to live `wallets` query |
| DASH-03 | 03-05 | Wallet health tier with color badge | ✓ SATISFIED | TierBadge with `TIER_LABELS` + inline `style={{ backgroundColor: config.color }}` |
| DASH-04 | 03-05 | Recent trades with cashout recommendations | ✓ SATISFIED | TradeList → TradeCard renders `recommendedCashoutSol.toFixed(4) SOL` in yellow for pending trades |
| DASH-05 | 03-05 | Refresh Trades button triggers sync | ✓ SATISFIED | `onSync={handleSync}` wired in page.tsx; `handleSync` calls `useAction(api.sync.syncWalletTrades)` |
| DASH-06 | 03-05 | Monthly goal progress bar | ✓ SATISFIED | GoalProgress renders "Goal: $X / $Y this month" + `<Progress value={percent}>` |
| CASH-01 | 03-02 | Cashout % formula: (base + ROI bonus) × streak × boost | ✓ SATISFIED | `calculateCashout` in cashout-calculator.ts applies full formula via `calculateROIBonus`, `calculateStreakMultiplier`, `applyGoalBoost` |
| CASH-02 | 03-02 | Tier assigned at trade start, persists for lifecycle | ✓ SATISFIED | `sync.ts` line 174: `tierAtTrade: currentTier` stored at sync time; never recomputed from changing balance |
| CASH-03 | 03-02 | Losing streak tracks, resets on win, persists | ✓ SATISFIED | `computeUpdatedStreak` implementation + `updateLosingStreak` internalMutation called after every sync; `currentLosingStreak` in userState DB |
| CASH-04 | 03-04 | Recommended cashout with full breakdown | ✓ SATISFIED | `CashoutBreakdown` renders all 5 fields: Tier base, ROI bonus, Streak, Goal boost, final %; "Take off the table" summary row |
| CASH-05 | 03-04 | User can confirm cashout after transfer | ✓ SATISFIED | `CashoutModal` → `useMutation(api.trades.confirmCashout)` with loading state + success toast |
| CASH-06 | 03-02 | Wallet balances updated after cashout | ✓ SATISFIED | `confirmCashout` patches trading wallet (subtract) and vault wallet (add) balanceSol |
| CASH-07 | 03-02 | System caps cashout % to prevent over-extraction | ✓ SATISFIED | `Math.min(boostedPercent, CASHOUT_CAP_PERCENT)` at line 65 of cashout-calculator.ts |
| CASH-08 | 03-02 | All trades logged with cashout data | ✓ SATISFIED | `saveSyncedTrades` stores `baseCashoutPercent`, `roiBonusPercent`, `streakMultiplier`, `goalBoostMultiplier`, `finalCashoutPercent`, `recommendedCashoutSol` from `calculateCashout()` result |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/dashboard/__tests__/TierBadge.test.tsx` | 1 | Missing `import { describe, it, expect } from 'vitest'` — relies on vitest globals but tsconfig lacks `@vitest/globals` types | ⚠️ Warning | Tests run fine via vitest, but `pnpm tsc --noEmit` reports 48 errors across all 5 component test files. Production source files are clean. |
| `src/components/dashboard/__tests__/StatsRow.test.tsx` | 1 | Same — missing vitest explicit imports | ⚠️ Warning | Same impact as above |
| `src/components/dashboard/__tests__/GoalProgress.test.tsx` | 1 | Same — missing vitest explicit imports | ⚠️ Warning | Same impact as above |
| `src/components/dashboard/__tests__/TradeCard.test.tsx` | 1 | Same — missing vitest explicit imports | ⚠️ Warning | Same impact as above |
| `src/components/dashboard/__tests__/TradeList.test.tsx` | 1 | Same — missing vitest explicit imports | ⚠️ Warning | Same impact as above |

**Classification:** The 5 new component test files created in Plan 01 omit explicit vitest imports (`import { describe, it, expect } from 'vitest'`) that exist in the pre-Phase-3 test files (e.g., `cashout-calculator.test.ts` line 1). The vitest config has `globals: true` which allows runtime execution, but the tsconfig does not include `"types": ["vitest/globals"]` so `tsc --noEmit` reports errors. This is a test tooling inconsistency, not a production code defect. Fix: add `import { describe, it, expect } from 'vitest'` to all 5 test files, or add `"types": ["vitest/globals"]` to tsconfig.

### Human Verification Required

All automated checks pass (7/7 truths, 14 artifacts, 15 key links, 286 tests, clean source tsc). Human verification is required to confirm the user-observable DASH-* requirements work end-to-end in a browser with live Convex data.

#### 1. DASH-01 / DASH-02: Wallet Balances Visible

**Test:** Navigate to `/dashboard` (signed in). Check the Stats Row.
**Expected:** Two wallet cards render — "Trading Wallet" showing X.XXXX SOL + $Y.YY USD, "Vault Wallet" showing X.XXXX SOL + $Y.YY USD
**Why human:** Live Convex query data + browser rendering required

#### 2. DASH-03: Wallet Health Tier with Color-Coded Badge

**Test:** View "Wallet Health" card in the Stats Row.
**Expected:** Tier number (1–5) + label (Critical/Caution/Stable/Healthy/Peak) rendered with correct tier color (#ef4444 / #f97316 / #22c55e / #3b82f6 / #8b5cf6). Colored left border on the card.
**Why human:** Visual color rendering requires browser inspection

#### 3. DASH-04 / CASH-04: Trade List with Cashout Breakdown

**Test:** If trades exist after sync: verify trade cards show token, P&L, ROI. Click a pending winning trade to expand — breakdown should show Tier base / ROI bonus / Streak / Goal boost / final SOL. Verify "Loss" badge dims losing trades to 50% opacity.
**Expected:** All trade states render correctly; breakdown panel has 5 rows + "Take off the table" summary
**Why human:** Requires live trade data; visual inspection of card states

#### 4. DASH-05: Refresh Trades Button

**Test:** Click "Refresh Trades" inside the trade list section header.
**Expected:** Button changes to "Syncing..." with spinner during action; toast shows sync result after
**Why human:** Real Helius API call; timing-dependent UI state

#### 5. DASH-06: Monthly Goal Progress Bar

**Test:** Check below the Stats Row for GoalProgress component.
**Expected:** "Goal: $X / $Y this month" text and a progress bar render correctly
**Why human:** Live goalSettings Convex query required; bar fills correctly

#### 6. CASH-05 / CASH-06: Cashout Confirmation Flow

**Test:** On a pending winning trade: expand card → click "Cash Out" → modal opens. Verify vault address shown, copy button works (shows Check icon for 2s), "I've transferred the SOL — Confirm Cashout" button shows spinner during confirm, success toast on confirm.
**Expected:** Full cashout flow executes; wallet balances update; trade status changes to "Cashed Out" badge
**Why human:** Real Convex mutation call; clipboard API; real-time UI state transitions

#### 7. Loading Skeleton

**Test:** Hard-refresh `/dashboard` — observe loading state before data arrives.
**Expected:** 3-column skeleton placeholders flash briefly before real StatsRow renders
**Why human:** Network timing required to observe skeleton

#### 8. Error-Free Console

**Test:** Open browser DevTools during all above tests.
**Expected:** No React errors, no unhandled promise rejections, no hydration warnings
**Why human:** Runtime error detection requires browser

### Gaps Summary

No automated gaps found. All 7 roadmap success criteria are verified by code inspection, all 14 required artifacts exist and are substantive, all 15 key links are wired, all 14 requirements have implementation evidence, and 286 tests pass.

The only warning-level finding is that 5 new component test files rely on vitest globals without the required `import { describe, it, expect } from 'vitest'` statements present in pre-Phase-3 test files — causing `pnpm tsc --noEmit` to report 48 errors confined to test files. Production source code is clean. This should be fixed but does not block the phase goal.

Human verification is required because DASH-01 through DASH-06 and the cashout confirmation flow are user-observable behaviors that require a live browser session with real Convex data.

---

_Verified: 2026-05-12T00:31:00Z_
_Verifier: Claude (gsd-verifier)_
