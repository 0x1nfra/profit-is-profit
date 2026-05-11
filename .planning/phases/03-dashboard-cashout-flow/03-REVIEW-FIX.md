---
phase: 03-dashboard-cashout-flow
fixed_at: 2026-05-12T00:00:00Z
review_path: .planning/phases/03-dashboard-cashout-flow/03-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 3: Code Review Fix Report

**Fixed at:** 2026-05-12T00:00:00Z
**Source review:** `.planning/phases/03-dashboard-cashout-flow/03-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (all WR-* warnings; no CR-* criticals; IN-* info excluded per fix_scope)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### WR-01: Tier Stamped from Stale Pre-Sync Balance

**Files modified:** `convex/sync.ts`
**Commit:** `30ec264`
**Applied fix:** Moved `getSolBalance()` fetch to before the `tradesToSave` build loop (line 152) and passed `solBalance` to `calculateTier()` instead of `wallet.balanceSol`. Removed the now-duplicate `getSolBalance()` call that previously appeared after `saveSyncedTrades` — the single early fetch is reused for both the tier calculation and the wallet balance update mutation.

---

### WR-02: Losing Trades Saved with Status `"confirmed"`

**Files modified:** `convex/sync.ts`
**Commit:** `71f507d`
**Applied fix:** Changed the status assignment from the conditional `(parsed.netProfit > 0 ? "pending" : "confirmed")` to unconditionally `"pending"` for all new trades. Losing trades now enter the system with `"pending"` status, which correctly reflects that no cashout action has been taken yet.

---

### WR-03: `confirmCashout` Accepts `"overridden"` Status Trades

**Files modified:** `convex/trades.ts`
**Commit:** `b2b51ca`
**Applied fix:** Changed the replay-protection check from `if (trade.status === "confirmed")` to `if (trade.status !== "pending")`. This blocks any non-pending status (both `"confirmed"` and `"overridden"`) from being actioned, closing the latent vulnerability before Phase 4 introduces override functionality.

---

### WR-04: `getGoalBoostForGap` Returns `0` Silently for Misconfigured Levels

**Files modified:** `src/lib/helpers/cashout-helpers.ts`
**Commit:** `36b35d0`
**Applied fix:** Replaced the nested dual-condition logic (`outer: maxGap check`, `inner: minGap check`) with a single clear inclusive-range check per level (`gapAmount >= level.minGap && withinMax`). Replaced the silent `return 0` fallback with `throw new Error(...)` so any future misconfiguration of `GOAL_BOOST_LEVELS` is surfaced immediately rather than producing wrong silent data.

---

### WR-05: `CashoutModal` Does Not Guard Against Empty `vaultAddress`

**Files modified:** `src/components/dashboard/CashoutModal.tsx`
**Commit:** `5aaeb9d`
**Applied fix:** Added an early-return guard at the top of the component body: when `vaultAddress` is falsy (empty string or missing), the modal renders a "No Vault Wallet" dialog with an explanatory message and a Close button, instead of showing an empty address field and allowing the user to copy an empty string to clipboard.

---

### WR-06: `CashoutBreakdown` Streak Label Uses `×` Prefix on a Count

**Files modified:** `src/components/dashboard/CashoutBreakdown.tsx`
**Commit:** `b8db670`
**Applied fix:** Changed the streak label from `"Streak ×{trade.losingStreakAtTrade}"` to `"Streak ({trade.losingStreakAtTrade} losses)"`. The value column continues to render `"×{trade.streakMultiplier}"`, so the row now clearly distinguishes the loss count from the multiplier applied to the cashout percentage.

---

## Skipped Issues

None — all 6 in-scope findings were successfully fixed.

---

_Fixed: 2026-05-12T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
