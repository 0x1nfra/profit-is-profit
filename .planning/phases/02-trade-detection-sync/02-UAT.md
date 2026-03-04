---
status: testing
phase: 02-trade-detection-sync
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md]
started: 2026-02-22T12:00:00Z
updated: 2026-02-22T12:00:00Z
---

## Current Test

number: 1
name: Dashboard loads with Refresh Trades button
expected: |
  Navigate to the dashboard while logged in. You should see a "Refresh Trades" button in the header area (near Settings/Disconnect). The button should have a refresh icon.
awaiting: user response

## Tests

### 1. Dashboard loads with Refresh Trades button
expected: Navigate to the dashboard while logged in. You should see a "Refresh Trades" button in the header area (near Settings/Disconnect). The button should have a refresh icon.
result: [pending]

### 2. Auto-sync triggers on dashboard load
expected: When the dashboard page loads and your trading wallet + balances are ready, a sync should trigger automatically. You should see the "Refresh Trades" button briefly show a spinner with "Syncing..." text. After it finishes, a toast notification appears — either "Found N new closed trades" or "No new closed trades found".
result: [pending]

### 3. Manual refresh button triggers sync with spinner
expected: Click the "Refresh Trades" button. It should show a spinning loader icon with "Syncing..." text and be disabled (not clickable again) while syncing. When complete, it returns to the normal "Refresh Trades" state.
result: [pending]

### 4. Toast notification on sync with trades
expected: After a sync that finds closed trades, a success toast should appear showing the count and SOL profit, e.g. "Found 3 new closed trades (+2.5000 SOL)". If no new trades, an info toast says "No new closed trades found".
result: [pending]

### 5. Toast notification on sync error with retry
expected: If the sync fails (e.g. network error or API issue), an error toast appears with the error message and a "Retry" button. Clicking "Retry" should trigger the sync again.
result: [pending]

### 6. Balances refresh after successful sync
expected: After a successful trade sync completes, the wallet balances displayed on the dashboard (SOL + USD values) should update to reflect the latest state.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0

## Gaps

[none yet]
