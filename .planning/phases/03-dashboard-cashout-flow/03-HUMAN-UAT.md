---
status: partial
phase: 03-dashboard-cashout-flow
source: [03-VERIFICATION.md]
started: 2026-05-12T00:35:00Z
updated: 2026-05-12T00:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Trading wallet balance visible (DASH-01)
expected: Balance displays as X.XXXX SOL and $Y.YY USD in Trading Wallet card
result: [pending]

### 2. Vault wallet balance visible (DASH-02)
expected: Balance displays as X.XXXX SOL and $Y.YY USD in Vault Wallet card
result: [pending]

### 3. Wallet health tier badge (DASH-03)
expected: Tier badge renders with correct color, tier number (1-5), and label (Critical/Caution/Stable/Healthy/Peak)
result: [pending]

### 4. Trade list with cashout breakdown (DASH-04 + CASH-04)
expected: Trade cards show token, P&L, ROI%, cashout amount; expanded breakdown shows tier base / ROI bonus / streak / goal boost / final SOL
result: [pending]

### 5. Refresh Trades button in trade list header (DASH-05)
expected: Button shows spinner during sync, then toast with result
result: [pending]

### 6. Goal progress bar (DASH-06)
expected: "Goal: $X / $Y this month" text and progress bar below stats row
result: [pending]

### 7. Loading skeleton on hard-refresh
expected: Three 3-column skeleton placeholders flash briefly before data loads
result: [pending]

### 8. Cash Out modal flow (CASH-05 + CASH-06)
expected: Modal shows vault address, copy button (Copy→Check feedback), amount, Go Back, and Confirm Cashout (spinner → success toast)
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
