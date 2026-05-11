---
phase: 03-dashboard-cashout-flow
plan: 02
subsystem: business-logic
tags: [convex, business-logic, security, cashout-cap, streak-logic, green-phase]
dependency_graph:
  requires:
    - 03-01 (RED tests for CASH-07 + CASH-03)
  provides:
    - CASHOUT_CAP_PERCENT = 65 constant — consumed by all downstream cashout display
    - calculateCashout with 65% cap — recommendedCashoutSol values now correctly bounded
    - computeUpdatedStreak implementation — streak logic for sync.ts and future UI
    - updateLosingStreak internalMutation — callable via internal.userState.updateLosingStreak
    - confirmCashout public mutation — callable via api.trades.confirmCashout from UI (Plans 03/04/05)
    - sync.ts status fix — winning trades now save as pending (Cash Out button can appear)
    - sync.ts streak wiring — streak updated after every non-empty sync
  affects:
    - src/lib/constants.ts
    - src/lib/cashout-calculator.ts
    - src/lib/helpers/cashout-helpers.ts
    - src/lib/__tests__/cashout-calculator.test.ts
    - convex/userState.ts
    - convex/trades.ts
    - convex/sync.ts
tech_stack:
  added: []
  patterns:
    - TDD GREEN phase — 18 RED tests driven to passing
    - Convex internalMutation for server-side-only streak updates
    - Convex public mutation with STRIDE threat mitigations (T-03-01..T-03-04)
    - Math.min cap pattern for hard-capping cashout percentage
    - localeCompare sort on ISO 8601 strings for chronological trade ordering
key_files:
  created: []
  modified:
    - src/lib/constants.ts (added CASHOUT_CAP_PERCENT = 65)
    - src/lib/cashout-calculator.ts (added cap import + Step 5b Math.min)
    - src/lib/helpers/cashout-helpers.ts (replaced computeUpdatedStreak stub with implementation)
    - src/lib/__tests__/cashout-calculator.test.ts (updated Tier 5 mega win test to 65% capped value)
    - convex/userState.ts (added internalMutation import + updateLosingStreak export)
    - convex/trades.ts (added mutation import + confirmCashout export)
    - convex/sync.ts (import + TradeRecord type fix + status ternary + streak wiring)
decisions:
  - Pre-existing "Tier 5 with mega win" test expected 80% (before cap); updated to 65% after cap implementation — correct behavior change, not a test regression
  - computeUpdatedStreak uses localeCompare (not Date.parse) for ISO 8601 sort — lexicographic sort is sufficient and avoids Date parsing edge cases
  - sync.ts newStreak and TradeRecord carry explicit TypeScript annotations per STATE.md decision 02.1-04 (circular _generated type inference in "use node" actions)
  - convex codegen not runnable without CONVEX_DEPLOYMENT env var; api.d.ts uses ApiFromModules<{...typeof trades, typeof userState}> which automatically exposes new exports at type-check time
metrics:
  duration: 7 minutes
  completed: 2026-05-11
  tasks_completed: 3
  files_created: 0
  files_modified: 7
---

# Phase 3 Plan 02: Drive Wave 0 Tests to GREEN — Cashout Cap + Streak + Convex Mutations Summary

**One-liner:** 65% cashout cap enforced in calculateCashout, computeUpdatedStreak implemented, confirmCashout and updateLosingStreak Convex mutations added, sync.ts trade status and streak wiring fixed — all 265 tests pass.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement 65% cashout cap + computeUpdatedStreak | 3c2cca4 | src/lib/constants.ts, src/lib/cashout-calculator.ts, src/lib/helpers/cashout-helpers.ts, src/lib/__tests__/cashout-calculator.test.ts |
| 2 | Add updateLosingStreak internalMutation + confirmCashout mutation | b1b0ed1 | convex/userState.ts, convex/trades.ts |
| 3 | Fix sync.ts trade status + wire updateLosingStreak | 2236e0b | convex/sync.ts |

## Test Count Delta

| Category | Count | Status |
|----------|-------|--------|
| Pre-existing lib + Convex tests (before Plan 01) | 249 | PASS (unchanged) |
| CASH-07 cap enforcement tests (Plan 01 RED) | 5 | NOW GREEN |
| CASH-07 boundary tests already passing | 2 | PASS (unchanged) |
| CASH-03 streak sequence tests (Plan 01 RED) | 11 | NOW GREEN |
| Component render stubs (Plan 01 Nyquist) | 21 | FAIL — RED (Cannot find module — Plans 03/04) |
| **Total passing** | **265** | All lib/Convex tests passing |

## Convex API Delta

| Export | Type | File | Purpose |
|--------|------|------|---------|
| `confirmCashout` | public mutation | convex/trades.ts | Called by UI via `useMutation(api.trades.confirmCashout)` after user transfers SOL |
| `updateLosingStreak` | internalMutation | convex/userState.ts | Called by sync action via `internal.userState.updateLosingStreak` after every sync |

## Security Mitigations (STRIDE Register)

| Threat ID | Category | Mitigation | Location | Grep Verification |
|-----------|----------|-----------|----------|-------------------|
| T-03-01 | Elevation of Privilege (IDOR) | `trade.userId !== identity.subject` throws "Trade not found" | convex/trades.ts confirmCashout | `grep "trade.userId !== identity.subject" convex/trades.ts` |
| T-03-02 | Tampering (Replay) | `trade.status === "confirmed"` throws "Already confirmed" | convex/trades.ts confirmCashout | `grep 'if (trade.status === "confirmed")' convex/trades.ts` |
| T-03-03 | Tampering (Overextraction) | `actualCashoutSol > recommendedCashoutSol` throws "Cashout amount exceeds recommended amount" | convex/trades.ts confirmCashout | `grep "args.actualCashoutSol > trade.recommendedCashoutSol" convex/trades.ts` |
| T-03-04 | Tampering (Price manipulation) | `balanceUsd` NOT patched by confirmCashout; reconciled on next Helius sync only | convex/trades.ts confirmCashout | `grep "balanceUsd" convex/trades.ts` returns only comment lines |

## CASH-08 Confirmation

CASH-08 requires that stored `finalCashoutPercent` values cannot exceed 65%. This is confirmed because:
- `calculateCashout()` applies `Math.min(boostedPercent, CASHOUT_CAP_PERCENT)` **before** returning `finalCashoutPercent`
- `saveSyncedTrades` stores `cashoutResult.finalCashoutPercent` which is already capped
- Therefore any `recommendedCashoutSol` value stored in the DB is derived from a capped percent

## Note for Plans 03/04/05

- **confirmCashout** is now callable from React via `useMutation(api.trades.confirmCashout)` with args `{ tradeId, actualCashoutSol }`
- **recommendedCashoutSol** values stored in DB are now correctly bounded at 65% max profit extraction
- Winning trades (netProfit > 0) now save with `status: "pending"` — the Cash Out button should appear for these trades
- Losing trades (netProfit <= 0) save with `status: "confirmed"` immediately — no Cash Out button needed
- **updateLosingStreak** is internal-only; UI should read `userState.currentLosingStreak` via `getUserState` query

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated pre-existing Tier 5 mega win test to reflect capped value**
- **Found during:** Task 1 verification
- **Issue:** Pre-existing test `Tier 5 (MAXIMUM) with mega win` expected `finalCashoutPercent = 80` and `cashoutAmountSOL = 4.0`. After implementing the 65% cap, the correct output is `65%` and `3.25 SOL` (Tier 5 = 60% base + 20% ROI bonus = 80% uncapped, capped to 65%).
- **Fix:** Updated test expected values from `toBe(80)` / `toBe(4)` to `toBe(65)` / `toBe(3.25)` with a comment explaining the cap applies.
- **Files modified:** src/lib/__tests__/cashout-calculator.test.ts
- **Commit:** 3c2cca4

## Self-Check: PASSED

Files confirmed present:
- src/lib/constants.ts: FOUND (contains CASHOUT_CAP_PERCENT = 65)
- src/lib/cashout-calculator.ts: FOUND (contains Math.min(boostedPercent, CASHOUT_CAP_PERCENT))
- src/lib/helpers/cashout-helpers.ts: FOUND (contains localeCompare, no "Not implemented" stub)
- convex/userState.ts: FOUND (contains updateLosingStreak internalMutation)
- convex/trades.ts: FOUND (contains confirmCashout mutation)
- convex/sync.ts: FOUND (contains computeUpdatedStreak call + status ternary)

Commits confirmed in git log:
- 3c2cca4: feat(03-02): implement 65% cashout cap + computeUpdatedStreak
- b1b0ed1: feat(03-02): add updateLosingStreak internalMutation + confirmCashout mutation
- 2236e0b: feat(03-02): fix sync.ts trade status + wire updateLosingStreak

Test count: 265 passing (target: 265) — VERIFIED
