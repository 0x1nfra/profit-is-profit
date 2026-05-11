---
phase: 03-dashboard-cashout-flow
plan: 01
subsystem: test-infrastructure
tags: [test, tdd, red-state, wave0, nyquist, cashout-cap, streak-logic, components]
dependency_graph:
  requires: []
  provides:
    - RED test cases for CASH-07 (65% cashout cap) — consumed by Plan 02 GREEN phase
    - RED test cases for CASH-03 (streak update sequence) — consumed by Plan 02 GREEN phase
    - computeUpdatedStreak stub — contract for Plan 02 implementation
    - Component test stubs for TierBadge, StatsRow, GoalProgress — consumed by Plan 03 GREEN phase
    - Component test stubs for TradeCard, TradeList — consumed by Plan 04 GREEN phase
  affects:
    - src/lib/__tests__/cashout-calculator.test.ts
    - src/lib/__tests__/cashout-helpers.test.ts
    - src/lib/helpers/cashout-helpers.ts
    - src/components/dashboard/__tests__/
tech_stack:
  added: []
  patterns:
    - TDD RED phase — tests written before implementation
    - Stub function signature with throw to enforce contract
    - Nyquist compliance — component render tests pre-created for Plans 03/04
key_files:
  created:
    - src/components/dashboard/__tests__/TierBadge.test.tsx
    - src/components/dashboard/__tests__/StatsRow.test.tsx
    - src/components/dashboard/__tests__/GoalProgress.test.tsx
    - src/components/dashboard/__tests__/TradeCard.test.tsx
    - src/components/dashboard/__tests__/TradeList.test.tsx
  modified:
    - src/lib/__tests__/cashout-calculator.test.ts
    - src/lib/__tests__/cashout-helpers.test.ts
    - src/lib/helpers/cashout-helpers.ts
decisions:
  - computeUpdatedStreak stub throws "Not implemented — see Plan 02" to keep TypeScript compiling while ensuring all 11 test cases fail in RED state
  - 2 of 7 CASH-07 tests pass in RED state (the "does NOT cap" boundary tests) because uncapped values are already correct at 54% and 63% — this is valid RED state, the exit code is still non-zero from the 5 cap-enforcement failures
metrics:
  duration: 3 minutes
  completed: 2026-05-11
  tasks_completed: 3
  files_created: 5
  files_modified: 3
---

# Phase 3 Plan 01: TDD RED State — Cashout Cap + Streak Tests + Component Stubs Summary

**One-liner:** 18 new failing tests establish RED state for 65% cashout cap (CASH-07), streak sequence logic (CASH-03), and 5 dashboard component stubs (Nyquist compliance for Plans 03/04).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add CASH-07 65% cashout cap RED test cases | b6dbe7b | src/lib/__tests__/cashout-calculator.test.ts |
| 2 | Add computeUpdatedStreak stub + CASH-03 RED tests | 7ea3a16 | src/lib/helpers/cashout-helpers.ts, src/lib/__tests__/cashout-helpers.test.ts |
| 3 | Create component render test stubs (Nyquist) | 8281da7 | src/components/dashboard/__tests__/ (5 new files) |

## Test Count Delta

| Category | Count | Status |
|----------|-------|--------|
| Pre-existing lib tests | 249 | PASS (unchanged) |
| CASH-07 cap enforcement tests (new) | 5 | FAIL — RED (cap not yet implemented) |
| CASH-07 boundary tests already correct (new) | 2 | PASS — correct uncapped values |
| CASH-03 streak sequence tests (new) | 11 | FAIL — RED ("Not implemented") |
| Component render stubs (new) | 21 | FAIL — RED ("Cannot find module") |
| **Total new tests** | **39** | 16 lib RED + 21 component RED |

## Production Logic Changes

None. Zero production code was changed in this plan. The only source file modified was `src/lib/helpers/cashout-helpers.ts` to add the `computeUpdatedStreak` stub — which throws immediately and has no effect on existing behavior.

## Note for Plan 02

Plan 02 must drive both new test groups to GREEN:

1. **CASH-07:** Implement 65% cap in `calculateCashout()` — clamp `finalCashoutPercent` to max 65 before computing `cashoutAmountSOL`.
2. **CASH-03:** Implement `computeUpdatedStreak()` body in `cashout-helpers.ts` — sort by `positionClosedAt` ASC, iterate, reset on win (> 0), increment on loss (<= 0).

## Deviations from Plan

### Auto-noted Behavior

**1. 2 of 7 CASH-07 tests pass in RED state**
- **Found during:** Task 1 verification
- **Issue:** Tests 4 ("does NOT cap...54%") and 5 ("does NOT cap...63%") pass before Plan 02 because those uncapped values (54%, 63%) are already the correct output — they prove the cap is NOT applied when it shouldn't be. Since the uncapped formula already returns correct values for these inputs, the tests pass trivially.
- **Impact:** Non-zero exit code still achieved (5 other cap-enforcement tests fail). RED state for the critical cap behavior is intact.
- **Resolution:** This is correct behavior, not a deviation from intent. The 2 boundary tests will remain passing after Plan 02 implements the cap.

## Self-Check: PASSED

All 8 files confirmed present on disk. All 3 task commits (b6dbe7b, 7ea3a16, 8281da7) confirmed in git log.
