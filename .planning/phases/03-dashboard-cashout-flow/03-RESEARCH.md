# Phase 3: Dashboard & Cashout Flow - Research

**Researched:** 2026-05-10
**Domain:** Next.js 16 / Convex / React UI — Dashboard rendering, cashout calculation, streak persistence
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dashboard layout:**
- Stats cards row at top: wallet health tier, trading balance, vault balance; trade list fills the rest
- Wallet health + balances are primary focus — users see these first on landing
- Sync button lives near the trade list header, contextually tied to the list

**Trade card design:**
- Each card shows: token name/mint, P&L in SOL, ROI %, and recommended cashout amount
- Cashout breakdown (tier, ROI bonus, streak multiplier, goal boost) is hidden by default — expands on click
- Confirmed cashouts show a "Cashed Out" badge/chip on the card
- Losing trades (cashout recommendation = 0) are dimmed with a "Loss" label, no cashout action

**Cashout confirmation flow:**
- Entry point: "Cash Out" button is inside the expanded breakdown panel (not on the collapsed card)
- Clicking initiates a modal showing: cashout SOL amount, vault wallet address (copyable), confirm button

**Wallet health tier display:**
- Tiers 1–5 use color + named labels: "Critical" (1), "Caution" (2), "Stable" (3), "Healthy" (4), "Peak" (5)
- Tier includes a brief subtitle explaining why (e.g. "Trading balance below 20% of vault")
- Color coding: red (1), orange (2), green (3), blue (4), purple (5) — matches existing `getTierColor` in `tier-calculator.ts`

### Claude's Discretion
- Number of trades displayed in dashboard list (sensible default — likely 10)
- Post-confirm UX flow (loading state, success state, balance refresh)
- Tier card prominence/size relative to balance cards
- Whether and how to surface losing streak count on dashboard

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | User can view trading wallet balance in SOL and USD | Wallet balances already in Convex `wallets` table; `getUserWallets` query exists and dashboard already reads them |
| DASH-02 | User can view vault wallet balance in SOL and USD | Same as DASH-01 — both wallet types returned by `getUserWallets` |
| DASH-03 | User can see current wallet health tier (1-5) with color-coded badge | `calculateTier(balanceSol)` exists in `tier-calculator.ts`; `getTierColor` returns hex per tier; compute on client from trading wallet balance |
| DASH-04 | User can see recent trades with cashout recommendations | `getUserTrades` query returns trades with all cashout fields; limited to 10 for dashboard (CONTEXT default) |
| DASH-05 | User can manually trigger trade sync (refresh button) | Already implemented in dashboard — `syncWalletTrades` action hooked to "Refresh Trades" button |
| DASH-06 | Dashboard displays monthly goal progress | `goalSettings` table + `getGoalSettings` query exist; Phase 3 shows basic progress only; full goal UI is Phase 4 |
| CASH-01 | System calculates cashout % using formula: (base rate + ROI bonus) × streak multiplier × goal boost | `calculateCashout` in `cashout-calculator.ts` already implements the full formula (229 tests passing) |
| CASH-02 | System assigns tier at trade start (before position opens), persists for trade lifecycle | `tierAtTrade` stored on every trade record; already captured during sync — no new calculation needed |
| CASH-03 | System tracks losing streak (resets on any win, persists across reloads) | `userState.currentLosingStreak` in Convex; streak update logic must be added to `saveSyncedTrades` or a new `updateStreakAfterTrades` mutation |
| CASH-04 | System displays recommended cashout amount with full breakdown | `recommendedCashoutSol`, `baseCashoutPercent`, `roiBonusPercent`, `streakMultiplier`, `goalBoostMultiplier`, `finalCashoutPercent` all on the trade record |
| CASH-05 | User can confirm cashout after manually transferring SOL to vault | Need new `confirmCashout` mutation in Convex; updates trade `status` to `"confirmed"`, stores `actualCashoutSol` |
| CASH-06 | System updates wallet balances after cashout confirmation | `confirmCashout` mutation must call `updateWalletBalance` or a new public mutation to update both trading and vault balances |
| CASH-07 | System caps final cashout percentage to prevent over-extraction on mega wins | Hard cap of 65% (from STATE.md concern); `calculateCashout` does not currently enforce this cap — needs addition in `cashout-calculator.ts` or at the point of applying to UI |
| CASH-08 | System logs all trades with cashout data to database | Already done via `saveSyncedTrades` — all cashout fields stored on trade record |
</phase_requirements>

---

## Summary

Phase 3 is primarily a **UI and mutation wiring phase** on top of an already-solid data foundation. The Convex schema (v2.1) stores all cashout calculation fields on every trade record. The cashout calculation library (`calculateCashout`, `calculateTier`) is battle-tested with 247 passing tests. The dashboard page exists with wallet balance cards and sync button — but trade cards, tier display, the cashout modal, and streak mutation are all missing.

Three new pieces of business logic need to be built or verified: (1) the 65% cashout percentage cap (currently undocumented in `cashout-calculator.ts` but flagged in STATE.md), (2) the losing streak update mutation in Convex that fires after each sync, and (3) the `confirmCashout` mutation that marks a trade confirmed, stores actual amount, and refreshes both wallet balances.

The UI layer is straightforward: expand the existing dashboard page with trade cards, a collapsible breakdown panel, and a cashout confirmation modal using the existing Radix UI `Dialog` component that's already installed.

**Primary recommendation:** Build in this order — (1) add `confirmCashout` mutation + streak update to Convex, (2) add 65% cap enforcement to cashout calculation, (3) replace the dashboard trade placeholder with full trade card components.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Wallet balance display (SOL/USD) | Frontend (React/Convex useQuery) | — | Data already in Convex; useQuery subscription auto-updates |
| Wallet health tier calculation | Frontend (client-side) | — | `calculateTier(balanceSol)` is a pure function; no DB round-trip needed |
| Tier color/label display | Frontend (React component) | — | Static mapping from tier number to color/label |
| Recent trades list | Frontend (React/Convex useQuery) | — | `getUserTrades` query with limit; Convex real-time subscription |
| Cashout breakdown display | Frontend (React component) | — | All breakdown fields already on the trade record |
| Losing streak persistence | Convex mutation (server) | — | Must be transactional; streak update fires after closed trades saved |
| Cashout confirmation | Convex mutation (server) | — | Atomically updates trade status + wallet balances |
| 65% cashout cap enforcement | Convex sync action (server) | Frontend display | Cap applied at calculation time during sync; also surface in UI |
| Monthly goal progress display | Frontend (React/Convex useQuery) | — | `getGoalSettings` query; no write needed in Phase 3 |
| Sync trigger | Frontend → Convex action | — | Already wired; `syncWalletTrades` action via `useAction` |

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| convex | ^1.32.0 | Database, real-time queries, mutations | Project DB layer — established Phase 2.1 |
| next | 16.1.4 | App framework, routing | Project framework |
| react | 19.2.3 | UI components | Project UI layer |
| @radix-ui/react-dialog | ^1.1.15 | Cashout confirmation modal | Already installed; `Dialog` component in `src/components/ui/dialog.tsx` |
| sonner | ^2.0.7 | Toast notifications | Already installed; used in dashboard for sync results |
| lucide-react | ^0.562.0 | Icons (copy, check, chevron) | Already installed |
| tailwindcss | ^4 | Styling | Project CSS framework |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | ^0.7.1 | Variant-based component styling | For tier badge color variants |
| clsx + tailwind-merge | ^2.1.1 / ^3.4.0 | Conditional className composition | Standard utility already wired in `cn()` |

### No New Dependencies Needed

All UI primitives required for Phase 3 are already installed. No new packages should be added.

**Installation:** None required.

---

## Architecture Patterns

### System Architecture Diagram

```
User Browser
    |
    |-- useQuery(getUserWallets) ---------> Convex DB (wallets table)
    |-- useQuery(getUserTrades, {limit:10})-> Convex DB (trades table)
    |-- useQuery(getUserState) -----------> Convex DB (userState table)
    |-- useQuery(getGoalSettings) --------> Convex DB (goalSettings table)
    |
    |-- [Sync button click]
    |   +-- useAction(syncWalletTrades) --> Convex Action (sync.ts)
    |                                          |-> Helius API (fetch swaps)
    |                                          |-> calculateTier() [pure fn]
    |                                          |-> calculateCashout() [pure fn]
    |                                          |-> saveSyncedTrades (internalMutation)
    |                                          |-> updateLosingStreak (internalMutation) [NEW]
    |                                          |-> updateWalletBalance (internalMutation)
    |                                      <-- SyncResult { newTradesCount, totalProfitSol }
    |
    |-- [Cash Out button click in breakdown panel]
    |   +-- Modal opens with: amount, vault address, confirm button
    |
    |-- [Modal confirm click]
    |   +-- useMutation(confirmCashout) --> Convex Mutation [NEW]
    |                                          |-> patch trade: status="confirmed", actualCashoutSol
    |                                          |-> updateWalletBalance (trading wallet)
    |                                          |-> updateWalletBalance (vault wallet)
    |                                      <-- { success: true }
    |   <-- useQuery auto-updates wallets + trades (real-time subscription)
```

### Recommended Project Structure

```
src/
├── app/dashboard/
│   └── page.tsx                    # Existing — expand with new sections
├── components/dashboard/
│   ├── TierBadge.tsx               # NEW — color-coded tier display with label + subtitle
│   ├── StatsRow.tsx                # NEW — tier card + balance cards (3-col grid)
│   ├── TradeList.tsx               # NEW — list of TradeCard components
│   ├── TradeCard.tsx               # NEW — collapsed: token, P&L, ROI, cashout amount
│   ├── CashoutBreakdown.tsx        # NEW — expanded panel: tier/bonus/streak/boost + Cash Out button
│   └── CashoutModal.tsx            # NEW — confirmation dialog (amount, vault address, confirm)
convex/
├── trades.ts                       # ADD confirmCashout mutation
└── userState.ts                    # ADD updateLosingStreak internalMutation (or internal fn)
src/lib/
└── cashout-calculator.ts           # ADD 65% cap enforcement to calculateCashout
```

### Pattern 1: Convex Real-Time Subscription (established)

**What:** `useQuery` subscribes to Convex queries; any DB write causes auto-re-render with fresh data. No manual refetch.

**When to use:** All read-only data in the dashboard — wallets, trades, userState, goalSettings.

```typescript
// Source: convex.dev/docs
// Already in use in dashboard/page.tsx
const wallets = useQuery(api.wallets.getUserWallets);
const trades = useQuery(api.trades.getUserTrades, { limit: 10 });
const userState = useQuery(api.userState.getUserState);
const goalSettings = useQuery(api.goalSettings.getGoalSettings);
// undefined = loading, null = not authenticated, [] = empty
```

### Pattern 2: Convex Mutation from React Client

**What:** `useMutation` for write operations that don't need external I/O (no Helius calls). Optimistic updates optional.

**When to use:** `confirmCashout` — marks trade confirmed, updates balances.

```typescript
// Source: [CITED: docs.convex.dev/client/react/mutations]
const confirmCashout = useMutation(api.trades.confirmCashout);

const handleConfirm = async () => {
  setIsConfirming(true);
  try {
    await confirmCashout({ tradeId: trade._id, actualCashoutSol: trade.recommendedCashoutSol });
    toast.success("Cashout confirmed!");
    setIsOpen(false);
  } catch (err) {
    toast.error("Failed to confirm cashout");
  } finally {
    setIsConfirming(false);
  }
};
```

### Pattern 3: Collapsible Trade Card (local state)

**What:** `useState(false)` for expanded/collapsed breakdown panel. No server state needed.

**When to use:** Each TradeCard manages its own expanded state independently.

```typescript
// Source: [ASSUMED] — standard React pattern
const [expanded, setExpanded] = useState(false);

return (
  <div>
    <button onClick={() => setExpanded(e => !e)}>
      {/* collapsed view: token, P&L, ROI, recommended amount */}
    </button>
    {expanded && <CashoutBreakdown trade={trade} />}
  </div>
);
```

### Pattern 4: Copy-to-Clipboard for Vault Address

**What:** `navigator.clipboard.writeText()` with visual feedback state.

**When to use:** Vault wallet address in cashout modal.

```typescript
// Source: [ASSUMED] — Web API, no library needed
const [copied, setCopied] = useState(false);
const handleCopy = async (text: string) => {
  await navigator.clipboard.writeText(text);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};
```

### Anti-Patterns to Avoid

- **Fetching balances after confirmCashout manually:** Don't call Helius or refetch — Convex useQuery subscriptions update automatically when the mutation patches wallet records. The mutation itself should patch balances, then the client auto-refreshes.
- **Calculating tier in the mutation:** Tier display is read from `tradingWallet.balanceSol` via client-side `calculateTier()`. Don't add a separate DB field for "current tier" — the trading wallet balance IS the source of truth.
- **Passing the full trades array to child components without memoization:** With 10 trades and complex cards, wrap stable data in `useMemo` to prevent unnecessary re-renders when unrelated state changes.
- **Putting cashout cap logic only in the UI:** The 65% cap must be enforced in `calculateCashout()` so it applies at sync time, not only at display time.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal/dialog | Custom overlay + focus trap | `Dialog` from `@radix-ui/react-dialog` (already in `src/components/ui/dialog.tsx`) | Accessibility (focus trap, aria-modal, keyboard close) handled |
| Badge/chip styling | Inline style objects | `Badge` from `src/components/ui/badge.tsx` with `className` overrides for tier colors | Already has variants, consistent with design system |
| Cashout % formula | Any recalculation | `calculateCashout()` from `src/lib/cashout-calculator.ts` — 247 tests covering all edge cases | Formula already verified; don't duplicate |
| Tier number → color | Switch statement in component | `getTierColor()` from `src/lib/tier-calculator.ts` | Returns correct hex per tier |
| Toast notifications | Alert/console | `toast` from `sonner` (already used in dashboard) | Consistent with existing sync success/error toasts |
| Clipboard | execCommand('copy') | `navigator.clipboard.writeText()` | Modern async API, works in all target browsers |

**Key insight:** This phase is UI wiring on top of existing infrastructure. The math is done; the storage is done; the auth is done. Every primitive already exists — compose them.

---

## Critical Business Logic: Missing Implementations

### CASH-03 — Losing Streak Update (NOT YET IMPLEMENTED)

The `currentLosingStreak` field exists in `userState` and is READ during sync to apply the streak multiplier. However, `syncWalletTrades` does NOT update the streak after processing trades.

**What needs to happen after each sync:**
1. For each newly saved closed trade in order of `positionClosedAt`:
   - If `netProfitSol > 0` (win): reset streak to 0
   - If `netProfitSol <= 0` (loss): increment streak by 1
2. Patch `userState.currentLosingStreak` with the final value

**Implementation location:** Add `updateLosingStreak` as an `internalMutation` in `convex/userState.ts`. Call it from `syncWalletTrades` after `saveSyncedTrades`.

```typescript
// convex/userState.ts — NEW internalMutation
export const updateLosingStreak = internalMutation({
  args: { userId: v.string(), newStreak: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userState")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { currentLosingStreak: args.newStreak });
    } else {
      await ctx.db.insert("userState", {
        userId: args.userId,
        currentLosingStreak: args.newStreak,
      });
    }
  },
});
```

### CASH-07 — 65% Cashout Cap (NOT YET IMPLEMENTED)

The 65% hard cap is mentioned in `STATE.md` ("Hard cap of 65% needs validation, consider user override during Phase 3") but not enforced in `cashout-calculator.ts`.

Maximum possible uncapped result: `(60% base + 20% ROI bonus) × 1.0 streak × 1.20 goal boost = 96%`. Without the cap, a Tier 5 mega win with active goal boost can recommend cashing out 96% of profits.

**Where to enforce:** Clamp `finalCashoutPercent` in `calculateCashout()` before computing `cashoutAmountSOL`:

```typescript
// src/lib/cashout-calculator.ts — add after Step 5 (applyGoalBoost)
const CASHOUT_CAP_PERCENT = 65;
const cappedPercent = Math.min(finalCashoutPercent, CASHOUT_CAP_PERCENT);
const cashoutAmountSOL = (input.netProfitSOL * cappedPercent) / 100;
```

Add `CASHOUT_CAP_PERCENT = 65` to `src/lib/constants.ts`.

**Note:** This changes existing behavior for Tier 5 + mega win + goal boost scenarios. Existing test in `cashout-calculator.test.ts` Example 4 shows Tier 5 + 200% ROI + streak 3 = 40% (capped naturally by streak). New tests needed for the cap boundary.

### CASH-05 / CASH-06 — confirmCashout Mutation (NOT YET IMPLEMENTED)

```typescript
// convex/trades.ts — NEW public mutation
export const confirmCashout = mutation({
  args: {
    tradeId: v.id("trades"),
    actualCashoutSol: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const trade = await ctx.db.get(args.tradeId);
    if (!trade || trade.userId !== identity.subject) throw new Error("Not found");
    if (trade.status === "confirmed") throw new Error("Already confirmed");

    // Patch trade to confirmed
    await ctx.db.patch(args.tradeId, {
      status: "confirmed",
      actualCashoutSol: args.actualCashoutSol,
    });

    // Update trading wallet balance (subtract cashout)
    const tradingWallet = await ctx.db.get(trade.tradingWalletId);
    if (tradingWallet) {
      await ctx.db.patch(tradingWallet._id, {
        balanceSol: tradingWallet.balanceSol - args.actualCashoutSol,
        balanceUsd: (tradingWallet.balanceSol - args.actualCashoutSol) * solPrice,
      });
    }

    // Update vault wallet balance (add cashout)
    const vaultWallet = await ctx.db
      .query("wallets")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", identity.subject).eq("walletType", "vault")
      )
      .first();
    if (vaultWallet) {
      await ctx.db.patch(vaultWallet._id, {
        balanceSol: vaultWallet.balanceSol + args.actualCashoutSol,
        balanceUsd: (vaultWallet.balanceSol + args.actualCashoutSol) * solPrice,
      });
    }
  },
});
```

**Design decision needed by planner:** The `confirmCashout` mutation needs current SOL/USD price to update `balanceUsd`. Options:
1. Accept `solPriceUsd` as an arg from the client (simpler, trusts client)
2. Fetch price in a Convex action instead of mutation (requires action, adds latency)
3. Only update `balanceSol`; leave `balanceUsd` to be refreshed on next sync

Recommendation: Option 1 (pass price from client — price is display only, not financial truth). [ASSUMED]

---

## Common Pitfalls

### Pitfall 1: Streak Not Updated During Sync

**What goes wrong:** `syncWalletTrades` reads `currentLosingStreak` at the start to apply the multiplier, but never writes back the updated streak. Every subsequent sync uses the same stale streak value.

**Why it happens:** `saveSyncedTrades` is an internalMutation that only inserts trades; no streak update logic was added in Phase 2.1.

**How to avoid:** Add `updateLosingStreak` internalMutation call at the END of `syncWalletTrades`, after `saveSyncedTrades`, computing the new streak from the `tradesToSave` array sorted by `positionClosedAt`.

**Warning signs:** `currentLosingStreak` in `userState` stays 0 regardless of losses.

### Pitfall 2: Trade Status Mismatch ("confirmed" vs "pending")

**What goes wrong:** The `sync.ts` currently saves ALL closed trades with `status: "confirmed"` (hardcoded). This means all newly synced trades appear as already-confirmed cashouts, making the "Cash Out" button never appear.

**Why it happens:** The `status: "confirmed" as const` on line 183 of `sync.ts` was a placeholder — the intent was for freshly-detected trades to start as `"pending"` and only move to `"confirmed"` after user action.

**How to avoid:** Change `sync.ts` to save winning trades as `status: "pending"` and losing trades (netProfitSol <= 0, recommendedCashoutSol = 0) as `status: "confirmed"` (since there's nothing to cash out). Only set `status: "confirmed"` for losing/zero trades and for the `confirmCashout` mutation result.

**Warning signs:** Every synced winning trade shows "Cashed Out" badge immediately; "Cash Out" button never renders.

### Pitfall 3: `by_user_type` Index Usage for Vault Lookup

**What goes wrong:** Querying for vault wallet using `.filter()` instead of the compound index causes a full table scan.

**Why it happens:** Easy to forget the compound index exists; `.filter()` "works" but doesn't use the index.

**How to avoid:** Use `.withIndex("by_user_type", q => q.eq("userId", userId).eq("walletType", "vault"))` in the `confirmCashout` mutation.

### Pitfall 4: Cashout Cap Not Applied at Sync Time

**What goes wrong:** Cap is only added as a display-level clamp in the UI. The stored `finalCashoutPercent` and `recommendedCashoutSol` in the database exceed 65%.

**Why it happens:** It seems simpler to just clamp in the render function.

**How to avoid:** Add the cap to `calculateCashout()` in `cashout-calculator.ts` so the capped value is what gets stored in the DB. Then the displayed value is always accurate.

### Pitfall 5: useQuery Returns `undefined` on First Render

**What goes wrong:** Rendering trade cards or computing tier before `wallets` / `trades` data arrives causes flicker or runtime errors.

**Why it happens:** `useQuery` returns `undefined` while the subscription initializes.

**How to avoid:** Always guard: `if (wallets === undefined || trades === undefined) return <LoadingSkeleton />`. The existing dashboard already does this for wallets; extend it to trades.

### Pitfall 6: Dialog Accessibility in Next.js App Router

**What goes wrong:** `Dialog` from Radix UI renders a portal; in Next.js App Router with streaming, the portal target may not exist at the time the dialog tries to render.

**Why it happens:** App Router server components don't have a DOM portal target; dialog must be in a client component.

**How to avoid:** The `CashoutModal` component must include `"use client"` at the top. The existing `dialog.tsx` already includes `"use client"`. Ensure `CashoutModal` wraps `Dialog` (not `DialogContent` alone).

---

## Code Examples

### Tier Badge Component Pattern

```typescript
// Source: [ASSUMED] — composing existing tier-calculator.ts + badge.tsx
import { Badge } from "@/components/ui/badge";
import { calculateTier, getTierColor } from "@/lib/tier-calculator";
import { Tier } from "@/types";
import { TIER_CONFIG } from "@/lib/constants";

const TIER_LABELS: Record<Tier, string> = {
  [Tier.REBUILD]: "Critical",
  [Tier.RECOVERY]: "Caution",
  [Tier.GROWTH]: "Stable",
  [Tier.AGGRESSIVE]: "Healthy",
  [Tier.MAXIMUM]: "Peak",
};

function TierBadge({ balanceSol }: { balanceSol: number }) {
  const tier = calculateTier(balanceSol);
  const color = getTierColor(tier);
  const label = TIER_LABELS[tier];
  const description = TIER_CONFIG[tier].description;

  return (
    <div>
      <Badge
        className="text-white font-semibold"
        style={{ backgroundColor: color, borderColor: color }}
      >
        Tier {tier} — {label}
      </Badge>
      <p className="text-xs text-zinc-400 mt-1">{description}</p>
    </div>
  );
}
```

### Trade Card (Collapsed State) Pattern

```typescript
// Source: [ASSUMED] — composing Convex trade record fields
// trade is the raw Convex document from getUserTrades
function TradeCard({ trade, vaultAddress }: { trade: Doc<"trades">, vaultAddress: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLoss = trade.netProfitSol <= 0;
  const isConfirmed = trade.status === "confirmed";

  return (
    <div className={cn("rounded-lg border p-4", isLoss && "opacity-50")}>
      {/* Collapsed header — always visible */}
      <button onClick={() => setExpanded(e => !e)} className="w-full text-left">
        <div className="flex justify-between items-center">
          <span className="font-mono text-sm text-zinc-300">
            {trade.tokenSymbol ?? trade.tokenMint.slice(0, 8) + "..."}
          </span>
          <div className="flex items-center gap-2">
            {isLoss && <Badge variant="outline" className="text-red-400">Loss</Badge>}
            {isConfirmed && !isLoss && <Badge className="bg-green-900 text-green-300">Cashed Out</Badge>}
            {!isLoss && !isConfirmed && (
              <span className="text-yellow-400 text-sm font-medium">
                {trade.recommendedCashoutSol.toFixed(4)} SOL
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-4 mt-1 text-sm text-zinc-400">
          <span>{trade.netProfitSol >= 0 ? "+" : ""}{trade.netProfitSol.toFixed(4)} SOL</span>
          <span>{trade.roiPercent.toFixed(1)}% ROI</span>
        </div>
      </button>
      {/* Expanded breakdown */}
      {expanded && !isLoss && (
        <CashoutBreakdown trade={trade} vaultAddress={vaultAddress} />
      )}
    </div>
  );
}
```

### Convex `getUserTrades` with limit 10

```typescript
// Source: convex/trades.ts (existing) — call with limit: 10 from dashboard
const trades = useQuery(api.trades.getUserTrades, { limit: 10 });
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase DB + REST routes | Convex DB + query/mutation functions | Phase 2.1 (2026-02-24) | No manual refetch; real-time subscriptions auto-update UI |
| API route for cashout confirm | Convex mutation (client-callable) | Phase 3 (new) | Type-safe, auth-checked at the function level |
| Status all "confirmed" on sync | "pending" for wins, "confirmed" on user action | Phase 3 (fix) | Enables "Cash Out" button workflow |

**Deprecated/outdated:**
- `/api/trades/refresh`: Already stubbed out as 410 Gone in Phase 2.1. Do not reference.
- `trade-service.ts`: Deprecated stub (empty exports). All sync logic is in `convex/sync.ts`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `confirmCashout` mutation should accept `solPriceUsd` from client to compute `balanceUsd` (rather than fetching in an action) | Critical Business Logic: confirmCashout | If fetching price server-side is required, mutation becomes an action — changes call pattern from `useMutation` to `useAction` |
| A2 | The 65% cashout cap is a hard cap applied to `finalCashoutPercent` before computing `cashoutAmountSOL` | Critical Business Logic: CASH-07 | If the cap should be 70% or configurable, tests need adjustment |
| A3 | Dashboard trade list default is 10 items (per CONTEXT: "likely 10") | Standard Stack / patterns | If user wants 20, minor limit change — no architecture impact |
| A4 | Losing streak update for batch of trades in a single sync processes wins/losses in `positionClosedAt` ascending order | Critical Business Logic: CASH-03 | If order is wrong, streak value could differ for edge cases where a win and loss occur in the same sync |
| A5 | `confirmCashout` only updates balances optimistically (subtracts/adds `actualCashoutSol` from stored values) — balance reconciliation against Helius happens on next sync | Critical Business Logic: CASH-06 | If user needs confirmed balances to match on-chain immediately, a Helius refetch in an action would be needed |

---

## Open Questions (RESOLVED)

1. **Should winning trades start as `"pending"` and losing trades as `"confirmed"`?** *(RESOLVED: Plan 02 Task 3, EDIT 3)*
   - What we know: Current code hardcodes `status: "confirmed" as const` for all trades in `sync.ts`
   - What's unclear: Was this intentional or a placeholder? With the current code, the "Cash Out" button can never appear for freshly synced trades
   - Recommendation: Change to `status: trade.netProfitSol > 0 ? "pending" : "confirmed"` in `sync.ts` — this is the correct semantic
   - **Resolution:** Implemented in Plan 02 Task 3 (EDIT 3). Winning trades saved as `"pending"`, losing trades as `"confirmed"`. Confirmed by `grep 'parsed.netProfit > 0 ? "pending" : "confirmed"' convex/sync.ts` acceptance criterion.

2. **Does `confirmCashout` need a Helius balance refetch, or is optimistic update sufficient?** *(RESOLVED: Plan 02 Task 2, T-03-04 disposition)*
   - What we know: After user manually transfers SOL, the actual on-chain balances will reflect the cashout already; the app's Convex records will be slightly off until next sync
   - What's unclear: Is the optimistic balance update (subtract cashout from stored balance) acceptable, or must we fetch live from Helius?
   - Recommendation: Optimistic update is fine for MVP; the sync button gives users a way to get fresh on-chain balances
   - **Resolution:** Optimistic update adopted (T-03-04 accepted). `confirmCashout` patches `balanceSol` only; `balanceUsd` reconciled on next Helius sync. No `solPriceUsd` arg accepted.

3. **DASH-06 scope in Phase 3 vs Phase 4:** *(RESOLVED: Plan 03 Task 3 + Plan 05)*
   - What we know: DASH-06 is listed in Phase 3 requirements but Goal Tracking is Phase 4's primary focus
   - What's unclear: How much goal UI to build now vs defer to Phase 4
   - Recommendation: Phase 3 should show a minimal progress indicator (e.g., "Goal: $X / $400 this month") using `getGoalSettings` query. Full goal editing and progress bar is Phase 4.
   - **Resolution:** `GoalProgress` component (Plan 03 Task 3) renders "Goal: $X / $Y this month" + progress bar from props. Plan 05 wires `useQuery(api.goalSettings.getGoalSettings)` and `currentMonthProgressUsd` into the component. Full goal management deferred to Phase 4.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 3 is purely frontend UI + Convex mutations. No new external tools, CLIs, or services beyond what was established in previous phases. Convex dev server and Helius API are already verified working from Phase 2.1.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + jsdom |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test:coverage` |

**Note:** `src/app/` and `src/components/ui/` are excluded from coverage per `vitest.config.ts`. New dashboard components in `src/components/dashboard/` WILL be included in coverage.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CASH-01 | Cashout % formula: (base + ROI) × streak × boost | unit | `pnpm test src/lib/__tests__/cashout-calculator.test.ts` | ✅ (24 tests) |
| CASH-07 | 65% hard cap on `finalCashoutPercent` | unit | `pnpm test src/lib/__tests__/cashout-calculator.test.ts` | ❌ Wave 0 — new test cases needed |
| CASH-03 | Losing streak resets on win, increments on loss | unit | `pnpm test src/lib/__tests__/cashout-helpers.test.ts` | ✅ (helpers tested); ❌ Wave 0 — streak update mutation logic needs test |
| CASH-02 | Tier persisted at trade start | unit | `pnpm test src/lib/__tests__/tier-calculator.test.ts` | ✅ (existing) |
| DASH-03 | Tier 1–5 correctly derived from balance | unit | `pnpm test src/lib/__tests__/tier-calculator.test.ts` | ✅ (27 tests) |
| CASH-05 | confirmCashout marks trade "confirmed" | manual | N/A (Convex mutation — no unit test harness) | manual only |
| CASH-06 | Wallet balances update after confirm | manual | N/A (Convex mutation) | manual only |
| DASH-01/02 | Balances displayed from Convex | manual | N/A (UI smoke test) | manual only |
| DASH-04 | Trades rendered with breakdown | manual | N/A (UI smoke test) | manual only |
| DASH-05 | Sync button triggers action | manual | N/A (UI smoke test) | manual only |

### Sampling Rate

- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test:coverage`
- **Phase gate:** Full suite green (247+ tests) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] Add 65% cap test cases to `src/lib/__tests__/cashout-calculator.test.ts` — covers CASH-07 boundary (Tier 5 + mega win + 20% boost = 96% uncapped, 65% capped)
- [ ] Add streak update computation test in `src/lib/__tests__/cashout-helpers.test.ts` — covers CASH-03 streak calculation from a list of trade results

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Convex `ctx.auth.getUserIdentity()` — all mutations check identity |
| V3 Session Management | no | JWT session established in Phase 1; not changed here |
| V4 Access Control | yes | `confirmCashout` must verify `trade.userId === identity.subject` before patching |
| V5 Input Validation | yes | `actualCashoutSol` must be validated: > 0, <= `recommendedCashoutSol` |
| V6 Cryptography | no | No new crypto in Phase 3 |

### Known Threat Patterns for Convex Mutations

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR: confirm another user's trade | Elevation of Privilege | Verify `trade.userId === identity.subject` in `confirmCashout` |
| Replay: confirm same trade twice | Tampering | Check `trade.status !== "confirmed"` before patching |
| Overextraction: client passes inflated `actualCashoutSol` | Tampering | Validate `args.actualCashoutSol <= trade.recommendedCashoutSol` server-side |
| SOL price manipulation: client passes $0 price | Tampering | Only compute `balanceUsd` updates client-side; treat as display-only |

---

## Sources

### Primary (HIGH confidence)

- Codebase — `convex/schema.ts` — Verified all table fields, indexes, and types
- Codebase — `convex/trades.ts`, `convex/wallets.ts`, `convex/userState.ts`, `convex/sync.ts` — Verified all existing mutations and queries
- Codebase — `src/lib/cashout-calculator.ts`, `src/lib/tier-calculator.ts`, `src/lib/constants.ts` — Verified calculation logic and constants
- Codebase — `src/app/dashboard/page.tsx` — Verified existing dashboard structure
- Codebase — `src/components/ui/dialog.tsx`, `badge.tsx`, `card.tsx` — Verified available UI primitives
- Codebase — `package.json` — Verified installed dependencies and versions
- Codebase — `docs/functional-logic.md` — Verified business rules (tier system, formulas, edge cases)
- Test suite — `pnpm test` — 247 tests passing, confirmed baseline

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — 65% cashout cap mentioned as a concern ("Hard cap of 65% needs validation, consider user override during Phase 3") — treating as agreed requirement
- `.planning/phases/03-dashboard-cashout-flow/03-CONTEXT.md` — User decisions, locked choices

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all verified from package.json and codebase
- Architecture: HIGH — all Convex functions and data shapes verified from source
- Pitfalls: HIGH — two pitfalls (status hardcoded "confirmed", streak not updated) verified directly from sync.ts source code
- Business logic gaps: HIGH — confirmed by reading every Convex function that exists

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (stable stack; Convex API unlikely to change)
