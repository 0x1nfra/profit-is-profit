---
phase: 03-dashboard-cashout-flow
reviewed: 2026-05-12T00:00:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - convex/sync.ts
  - convex/trades.ts
  - convex/userState.ts
  - src/app/dashboard/page.tsx
  - src/components/dashboard/CashoutBreakdown.tsx
  - src/components/dashboard/CashoutModal.tsx
  - src/components/dashboard/GoalProgress.tsx
  - src/components/dashboard/StatsRow.tsx
  - src/components/dashboard/TierBadge.tsx
  - src/components/dashboard/TradeCard.tsx
  - src/components/dashboard/TradeList.tsx
  - src/components/dashboard/__tests__/GoalProgress.test.tsx
  - src/components/dashboard/__tests__/StatsRow.test.tsx
  - src/components/dashboard/__tests__/TierBadge.test.tsx
  - src/components/dashboard/__tests__/TradeCard.test.tsx
  - src/components/dashboard/__tests__/TradeList.test.tsx
  - src/lib/__tests__/cashout-calculator.test.ts
  - src/lib/__tests__/cashout-helpers.test.ts
  - src/lib/cashout-calculator.ts
  - src/lib/constants.ts
  - src/lib/helpers/cashout-helpers.ts
  - vitest.setup.ts
findings:
  critical: 0
  warning: 6
  info: 3
  total: 9
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-05-12T00:00:00Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

All 21 source files were reviewed. The cashout calculator, streak logic, and Convex backend mutations are well-structured and correctly implement the spec. Security controls in `confirmCashout` (IDOR, replay, bounds) are sound.

Six warnings were found — none are security issues or crashes, but two are behavioural correctness issues that will produce wrong data silently in production:

- **WR-01** is the most impactful: the tier stamped on every saved trade is computed from the stale pre-sync balance rather than the freshly-fetched post-sync balance, causing systematic mis-tiering on the sync that changes wallet size.
- **WR-02** marks losing trades as `"confirmed"` at insert time, which is technically safe because `confirmCashout` won't accept them (they have `recommendedCashoutSol = 0`), but it's semantically wrong and will surface as a UI bug if the client ever renders losing trades differently based on status.
- The remaining four warnings are smaller correctness and robustness issues worth fixing before Phase 4.

No critical issues found.

---

## Warnings

### WR-01: Tier Stamped from Stale Pre-Sync Balance

**File:** `convex/sync.ts:151`
**Issue:** `calculateTier` is called with `wallet.balanceSol` — the balance stored in Convex at the start of the sync action — not the freshly-fetched `solBalance` retrieved on line 212. If this sync is the one that pushes the wallet from (e.g.) 0.8 SOL to 1.2 SOL, every trade in the batch gets `tierAtTrade: 1` (REBUILD) when the post-sync balance earns tier 2 (RECOVERY). The cashout breakdown shown to the user will reflect the wrong tier and wrong base rate.

The `solBalance` fetch happens after `saveSyncedTrades`, so moving `calculateTier` is a two-line fix: fetch `solBalance` earlier (before building `tradesToSave`) and use it for tier calculation.

**Fix:**
```typescript
// Move solBalance fetch before building tradesToSave (currently line 212):
const solBalance: number = await getSolBalance(args.walletAddress);

// Then replace line 151:
const currentTier = calculateTier(solBalance); // was: wallet.balanceSol
```

---

### WR-02: Losing Trades Saved with Status `"confirmed"`

**File:** `convex/sync.ts:182`
**Issue:** The status assignment `parsed.netProfit > 0 ? "pending" : "confirmed"` marks every losing trade as `"confirmed"` at insert time. This is semantically wrong: `"confirmed"` means "user has acknowledged and logged the cashout transfer." A losing trade has no cashout to confirm; its correct status is `"pending"` (awaiting user review) or a dedicated status like `"loss"`.

The current implementation is coincidentally safe because `confirmCashout` rejects any trade with `recommendedCashoutSol = 0` (the upper-bound check `actualCashoutSol > 0` would pass, but losing trades are stored as `"confirmed"` so the replay check fires first). However, if Phase 4 adds a UI path that renders or filters trades by status, the mixing of `"confirmed"` semantics will cause display bugs.

**Fix:**
```typescript
// Option A: use "pending" for all new trades regardless of P&L
status: "pending" as "pending",

// Option B: introduce a "loss" literal (requires schema migration):
status: (parsed.netProfit > 0 ? "pending" : "loss") as "pending" | "loss",
```
Option A is the zero-migration path; Option B is cleaner long-term.

---

### WR-03: `confirmCashout` Accepts `"overridden"` Status Trades

**File:** `convex/trades.ts:104`
**Issue:** The replay protection check on line 104 only blocks `status === "confirmed"`. The schema accepts a third status value `"overridden"` (defined in the `saveSyncedTrades` validator on line 42-46). If a trade is ever persisted with `status: "overridden"`, a client can call `confirmCashout` on it (since the check only rejects `"confirmed"`), effectively double-actioning the trade.

There is no code path today that sets `status: "overridden"` at insert time, so this is a latent defect. It will become a real vulnerability when Phase 4 adds override functionality.

**Fix:**
```typescript
// Line 104 — block all non-pending statuses:
if (trade.status !== "pending") {
  throw new Error("Trade is not in a pending state");
}
```

---

### WR-04: `getGoalBoostForGap` Returns `0` (Silently) for Gaps > $200 When GOAL_BOOST_LEVELS Is Reordered

**File:** `src/lib/helpers/cashout-helpers.ts:130-143`
**Issue:** The loop iterates `GOAL_BOOST_LEVELS` in array order and uses two nested conditions:
```
outer: maxGap === null || gapAmount <= maxGap
inner: gapAmount >= level.minGap
```
For the last level (`minGap: 201, maxGap: null`), the outer condition always passes when `maxGap === null`. The inner condition then checks `gapAmount >= 201`. This happens to work because `GOAL_BOOST_LEVELS` is defined with the open-ended level last.

However, if a value of e.g. `gapAmount = 50` is evaluated: level 1 outer passes (`50 <= 50`), inner passes (`50 >= 0`) → returns 5. Correct. But the dual-condition logic is fragile: if levels are ever reordered (e.g., descending), the loop would match the wrong level. The function also returns a silent `0` fallback if nothing matches — this is unreachable today but would be a silent data error if reached.

**Fix:** Use a single clear condition per level — an inclusive range check — and remove the unreachable fallback:
```typescript
export function getGoalBoostForGap(gapAmount: number): number {
  if (gapAmount <= 0) return 0;

  for (const level of GOAL_BOOST_LEVELS) {
    const withinMax = level.maxGap === null || gapAmount <= level.maxGap;
    if (gapAmount >= level.minGap && withinMax) {
      return level.boostPercent;
    }
  }

  // Should be unreachable given GOAL_BOOST_LEVELS covers all positive gaps.
  // Throw to surface any future misconfiguration rather than silently returning 0.
  throw new Error(`No boost level found for gap: ${gapAmount}`);
}
```

---

### WR-05: `CashoutModal` Does Not Guard Against Empty `vaultAddress`

**File:** `src/components/dashboard/CashoutModal.tsx:43` / `src/app/dashboard/page.tsx:163`
**Issue:** `TradeList` is passed `vaultAddress={vaultWallet?.address ?? ""}` (page.tsx line 163), meaning an empty string is the fallback when no vault wallet exists. `CashoutModal` receives this `vaultAddress` and renders it directly (line 89) and passes it to `navigator.clipboard.writeText` (line 43). If the user triggers the modal before the vault wallet is set up, they will see an empty vault address field and copy an empty string to their clipboard — with no error or warning.

The upstream conditional `{tradingWallet && vaultWallet && <StatsRow ...>}` on line 145 does guard the StatsRow render, but `TradeList` is rendered unconditionally on line 160 with the `""`-fallback. The user can still click "Cash Out" on a pending trade.

**Fix:**
```typescript
// CashoutModal.tsx — guard before rendering the dialog body:
if (!vaultAddress) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">No Vault Wallet</DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm">
            Set up a vault wallet in Settings before cashing out.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

### WR-06: `CashoutBreakdown` "Streak" Label Uses `×` Prefix on a Count, Not a Multiplier

**File:** `src/components/dashboard/CashoutBreakdown.tsx:34`
**Issue:** The label renders as `"Streak ×{trade.losingStreakAtTrade}"` (e.g., "Streak ×2") while the value column renders `"×{trade.streakMultiplier}"` (e.g., "×0.75"). The `×` prefix on the label implies the count is a multiplier, but it's a count of consecutive losses. A user reading the row sees "Streak ×2" → "×0.75" and cannot immediately tell which is the multiplier and which is the count.

**Fix:**
```tsx
// line 34 — remove the × prefix from the label:
<span className="text-zinc-400">Streak ({trade.losingStreakAtTrade} losses)</span>
<span className="text-white">×{trade.streakMultiplier}</span>
```

---

## Info

### IN-01: `goalBoost || undefined` Coerces `0` to `undefined`

**File:** `convex/sync.ts:160`
**Issue:** `goalBoostPercent: goalBoost || undefined` uses the falsy-coercion pattern. When `goalBoost` is `0` (no active boost), `0 || undefined` correctly passes `undefined` to `calculateCashout`, which is fine since `calculateCashout` treats `undefined` as no-boost. However, if the boost system is ever extended to support a `0` boost value with distinct semantics from "no boost", this line will silently suppress it.

**Fix:** Use an explicit comparison:
```typescript
goalBoostPercent: goalBoost > 0 ? goalBoost : undefined,
```

---

### IN-02: Dashboard Page Briefly Renders with `null` Wallet Data Before Redirect

**File:** `src/app/dashboard/page.tsx:64-70`
**Issue:** When `wallets === null` (unauthenticated), `isLoading` evaluates to `false` (because `null !== undefined`), so the loading skeleton is not shown. The page renders with `tradingWallet = undefined`, `vaultWallet = undefined`, and the conditional `{tradingWallet && vaultWallet && <StatsRow ...>}` suppresses the crash. The `useEffect` on lines 64-70 fires asynchronously after the render, triggering the signout and redirect. This produces a visible flash of the empty dashboard UI (header buttons, `GoalProgress`, `TradeList` empty state) before the redirect completes.

This is a UX issue, not a crash, and middleware should prevent most unauthenticated access. No code change strictly required for Phase 3, but worth tracking for Phase 4 auth hardening.

**Fix (optional):** Add `wallets === null` to the loading condition:
```typescript
const isLoading =
  wallets === undefined ||
  wallets === null ||   // <-- add this
  trades === undefined ||
  userState === undefined ||
  goalSettings === undefined;
```

---

### IN-03: `computeUpdatedStreak` Uses ISO String `localeCompare` for Chronological Sort

**File:** `src/lib/helpers/cashout-helpers.ts:226`
**Issue:** The sort uses `a.positionClosedAt.localeCompare(b.positionClosedAt)`. ISO 8601 strings (`YYYY-MM-DDTHH:mm:ssZ`) sort correctly lexicographically only when all timestamps use the same timezone offset notation. A mix of `Z` and `+00:00` suffixes would sort incorrectly (`"2026-01-01T00:00:00Z"` vs `"2026-01-01T00:00:00+00:00"` compares the `Z` (ASCII 90) against `+` (ASCII 43), placing `+00:00` before `Z` — which is wrong since they're the same instant).

The sync action always produces `toISOString()` output which always ends in `Z`, so this is currently safe. It becomes a risk if any trade timestamp ever originates from a different serialization path.

**Fix:** Sort numerically by parsed date for robustness:
```typescript
const sorted = [...tradeResults].sort(
  (a, b) => new Date(a.positionClosedAt).getTime() - new Date(b.positionClosedAt).getTime()
);
```

---

_Reviewed: 2026-05-12T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
