# Phase 3: Dashboard & Cashout Flow - Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 10 (6 new components, 2 Convex additions, 1 lib modification, 1 page expansion)
**Analogs found:** 10 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/dashboard/page.tsx` | component (page) | request-response + event-driven | `src/app/dashboard/page.tsx` (self — expand) | exact |
| `src/components/dashboard/StatsRow.tsx` | component | request-response | `src/app/dashboard/page.tsx` (wallet card block, lines 146–183) | role-match |
| `src/components/dashboard/TierBadge.tsx` | component | transform | `src/components/ui/badge.tsx` + `src/lib/tier-calculator.ts` | role-match |
| `src/components/dashboard/TradeList.tsx` | component | request-response | `src/app/dashboard/page.tsx` (trades placeholder, lines 185–191) | role-match |
| `src/components/dashboard/TradeCard.tsx` | component | event-driven | `src/components/forms/WalletSetupForm.tsx` (local state + Convex mutation) | role-match |
| `src/components/dashboard/CashoutBreakdown.tsx` | component | transform | `src/app/dashboard/page.tsx` (Card pattern) | partial |
| `src/components/dashboard/CashoutModal.tsx` | component | request-response | `src/components/ui/dialog.tsx` + `src/components/forms/WalletSetupForm.tsx` | role-match |
| `convex/trades.ts` | mutation | CRUD | `convex/wallets.ts` (`createWallets` mutation, lines 32–98) | exact |
| `convex/userState.ts` | internalMutation | CRUD | `convex/userState.ts` (`getOrCreateUserState`, lines 28–47) | exact |
| `src/lib/cashout-calculator.ts` | utility | transform | `src/lib/cashout-calculator.ts` (self — add cap) | exact |

---

## Pattern Assignments

### `src/app/dashboard/page.tsx` (page component — expand existing)

**Analog:** `src/app/dashboard/page.tsx` (current file, expand in place)

**Imports pattern** (lines 1–12 — extend these, do not replace):
```typescript
"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
// Add:
import { StatsRow } from "@/components/dashboard/StatsRow";
import { TradeList } from "@/components/dashboard/TradeList";
```

**useQuery subscription pattern** (lines 21–23 — extend):
```typescript
const wallets = useQuery(api.wallets.getUserWallets);
const trades = useQuery(api.trades.getUserTrades, { limit: 10 }); // Change limit from 50 to 10
const userState = useQuery(api.userState.getUserState);
const goalSettings = useQuery(api.goalSettings.getGoalSettings);
const syncTrades = useAction(api.sync.syncWalletTrades);
```

**Loading guard pattern** (lines 25–26, 90–96 — extend to cover new queries):
```typescript
const isLoading = wallets === undefined || trades === undefined || userState === undefined;
// ...
if (isLoading || wallets === null || wallets.length === 0) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="text-zinc-400">Loading dashboard...</div>
    </div>
  );
}
```

**Sync action + toast pattern** (lines 47–70 — copy exactly, this is the established pattern):
```typescript
const handleSync = async () => {
  if (!tradingWallet || isSyncing) return;
  setIsSyncing(true);
  try {
    const result = await syncTrades({ walletAddress: tradingWallet.address });
    if (result.newTradesCount > 0) {
      toast.success(`Found ${result.newTradesCount} new closed trade${result.newTradesCount > 1 ? "s" : ""} (${profitSign}${result.totalProfitSol.toFixed(4)} SOL)`);
    } else {
      toast.info("No new closed trades found");
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Failed to sync trades", {
      action: { label: "Retry", onClick: () => handleSync() },
    });
  } finally {
    setIsSyncing(false);
  }
};
```

**Layout container pattern** (lines 99–101 — match these exactly):
```typescript
<div className="min-h-screen bg-black px-4 py-8">
  <div className="mx-auto max-w-4xl">
```

**Sync button placement** — per CONTEXT.md the sync button moves from the header to near the trade list header. Keep the header's Settings + Disconnect buttons. Move `Refresh Trades` button to just above `<TradeList>`.

---

### `src/components/dashboard/StatsRow.tsx` (component, request-response)

**Analog:** `src/app/dashboard/page.tsx` wallet card block, lines 146–183

**Imports pattern:**
```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TierBadge } from "./TierBadge";
import { calculateTier } from "@/lib/tier-calculator";
import { Tier } from "@/types";
```

**Props shape** — derive from what dashboard/page.tsx already extracts:
```typescript
interface StatsRowProps {
  tradingWallet: { balanceSol: number; balanceUsd: number; address: string };
  vaultWallet: { balanceSol: number; balanceUsd: number; address: string };
  losingStreak?: number; // from userState.currentLosingStreak
}
```

**Card pattern** (lines 148–164 — copy structure, then adapt):
```typescript
<Card className="bg-zinc-950 border-zinc-800">
  <CardHeader>
    <CardTitle className="text-lg text-zinc-300">Trading Wallet</CardTitle>
    <p className="text-sm text-zinc-500">{truncateAddress(tradingWallet.address)}</p>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <p className="text-3xl font-bold text-white">
        {tradingWallet.balanceSol.toFixed(4)} SOL
      </p>
      <p className="text-lg text-zinc-400">
        ${tradingWallet.balanceUsd.toFixed(2)} USD
      </p>
    </div>
  </CardContent>
</Card>
```

**Grid layout** — extend existing `md:grid-cols-2` to 3 columns for tier card:
```typescript
<div className="grid gap-6 md:grid-cols-3">
  {/* Tier card — col 1, full prominence */}
  {/* Trading wallet card — col 2 */}
  {/* Vault wallet card — col 3 */}
</div>
```

---

### `src/components/dashboard/TierBadge.tsx` (component, transform)

**Analog:** `src/lib/tier-calculator.ts` (`getTierConfig` lines 62–76) + `src/components/ui/badge.tsx`

**Key source data — tier labels and colors** (from `tier-calculator.ts` lines 83–93 and `constants.ts` lines 26–57):
```typescript
// tier-calculator.ts lines 83-93 — getTierColor (currently private, must be exported or duplicated)
const colors: Record<Tier, string> = {
  [Tier.REBUILD]: "#ef4444",    // Red
  [Tier.RECOVERY]: "#f97316",   // Orange
  [Tier.GROWTH]: "#22c55e",     // Green
  [Tier.AGGRESSIVE]: "#3b82f6", // Blue
  [Tier.MAXIMUM]: "#8b5cf6",    // Purple
};

// constants.ts lines 26-57 — TIER_CONFIG.description
[Tier.REBUILD]:    { description: "Fear, overtrading zone" }
[Tier.RECOVERY]:   { description: "Getting stable" }
[Tier.GROWTH]:     { description: "Balanced, confident" }
[Tier.AGGRESSIVE]: { description: "At comfortable size" }
[Tier.MAXIMUM]:    { description: "Above target capacity" }
```

**User-facing tier labels** (from CONTEXT.md decisions — not yet in codebase, define in this component):
```typescript
const TIER_LABELS: Record<Tier, string> = {
  [Tier.REBUILD]: "Critical",
  [Tier.RECOVERY]: "Caution",
  [Tier.GROWTH]: "Stable",
  [Tier.AGGRESSIVE]: "Healthy",
  [Tier.MAXIMUM]: "Peak",
};
```

**Badge usage pattern** (from `src/components/ui/badge.tsx` lines 28–44):
```typescript
import { Badge } from "@/components/ui/badge";
// Badge accepts className override — use style prop for dynamic tier color
<Badge
  className="text-white font-semibold border-transparent"
  style={{ backgroundColor: color }}
>
  Tier {tier} — {label}
</Badge>
```

**Full component shape:**
```typescript
"use client";

import { Badge } from "@/components/ui/badge";
import { calculateTier, getTierConfig } from "@/lib/tier-calculator";
import { Tier } from "@/types";

interface TierBadgeProps {
  balanceSol: number;
}

export function TierBadge({ balanceSol }: TierBadgeProps) {
  const tier = calculateTier(balanceSol);
  const config = getTierConfig(tier); // returns { color, description, name, ... }
  const label = TIER_LABELS[tier];

  return (
    <div className="space-y-1">
      <Badge
        className="text-white font-semibold border-transparent"
        style={{ backgroundColor: config.color }}
      >
        Tier {tier} — {label}
      </Badge>
      <p className="text-xs text-zinc-400">{config.description}</p>
    </div>
  );
}
```

**Note:** `getTierColor` in `tier-calculator.ts` is currently a private (non-exported) function. Use `getTierConfig(tier).color` — `getTierConfig` is exported and returns `color` via `getTierColor` internally (lines 62–76).

---

### `src/components/dashboard/TradeList.tsx` (component, request-response)

**Analog:** `src/app/dashboard/page.tsx` trades section (lines 185–191) + dashboard header pattern

**Imports pattern:**
```typescript
"use client";

import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TradeCard } from "./TradeCard";
import type { Doc } from "../../../convex/_generated/dataModel";
```

**Props shape:**
```typescript
interface TradeListProps {
  trades: Doc<"trades">[];
  vaultAddress: string;
  isSyncing: boolean;
  onSync: () => void;
}
```

**Sync button pattern** (from dashboard/page.tsx lines 108–126 — copy this button, it moves here):
```typescript
<Button
  onClick={onSync}
  disabled={isSyncing}
  variant="outline"
  className="border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
>
  {isSyncing ? (
    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Syncing...</>
  ) : (
    <><RefreshCw className="mr-2 h-4 w-4" />Refresh Trades</>
  )}
</Button>
```

**Section header pattern** (from dashboard/page.tsx lines 186–187):
```typescript
<div className="mt-8">
  <div className="mb-4 flex items-center justify-between">
    <h2 className="text-xl font-semibold text-white">Recent Trades</h2>
    {/* sync button here */}
  </div>
  {trades.length === 0 ? (
    <p className="text-zinc-400">No closed trades yet. Click Refresh Trades to sync.</p>
  ) : (
    <div className="space-y-3">
      {trades.map((trade) => (
        <TradeCard key={trade._id} trade={trade} vaultAddress={vaultAddress} />
      ))}
    </div>
  )}
</div>
```

---

### `src/components/dashboard/TradeCard.tsx` (component, event-driven)

**Analog:** `src/components/forms/WalletSetupForm.tsx` (local `useState` + `useMutation` from Convex)

**Local state pattern** (WalletSetupForm.tsx line 61):
```typescript
// WalletSetupForm.tsx line 61
const [isSubmitting, setIsSubmitting] = useState(false);

// TradeCard adaptation:
const [expanded, setExpanded] = useState(false);
const [cashoutOpen, setCashoutOpen] = useState(false);
```

**Imports pattern:**
```typescript
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CashoutBreakdown } from "./CashoutBreakdown";
import { CashoutModal } from "./CashoutModal";
import type { Doc } from "../../../convex/_generated/dataModel";
```

**Props shape:**
```typescript
interface TradeCardProps {
  trade: Doc<"trades">;
  vaultAddress: string;
}
```

**Loss/confirmed state derivation:**
```typescript
const isLoss = trade.netProfitSol <= 0;
const isConfirmed = trade.status === "confirmed";
const isPending = trade.status === "pending";
```

**`cn()` conditional className pattern** (from `src/lib/utils.ts` — used throughout ui components):
```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "rounded-lg border border-zinc-800 bg-zinc-950 p-4 transition-opacity",
  isLoss && "opacity-50"
)}>
```

**Badge usage for status** (from `src/components/ui/badge.tsx` — variant="outline" for Loss, className override for Cashed Out):
```typescript
{isLoss && (
  <Badge variant="outline" className="text-red-400 border-red-400/30">Loss</Badge>
)}
{isConfirmed && !isLoss && (
  <Badge className="bg-green-900/50 text-green-300 border-green-800">Cashed Out</Badge>
)}
```

**Number formatting pattern** (from dashboard/page.tsx lines 156–160):
```typescript
{trade.netProfitSol.toFixed(4)} SOL   // 4 decimal places for SOL
{trade.roiPercent.toFixed(1)}%         // 1 decimal for ROI %
{trade.recommendedCashoutSol.toFixed(4)} SOL
```

**Collapsible toggle pattern:**
```typescript
<button
  onClick={() => !isLoss && setExpanded((e) => !e)}
  className="w-full text-left"
  disabled={isLoss}
>
  {/* always-visible summary row */}
</button>
{expanded && !isLoss && (
  <CashoutBreakdown
    trade={trade}
    onCashOut={() => setCashoutOpen(true)}
  />
)}
<CashoutModal
  open={cashoutOpen}
  onOpenChange={setCashoutOpen}
  trade={trade}
  vaultAddress={vaultAddress}
/>
```

---

### `src/components/dashboard/CashoutBreakdown.tsx` (component, transform)

**Analog:** `src/app/dashboard/page.tsx` Card pattern (lines 148–182) — pure display, no mutation

**Imports pattern:**
```typescript
"use client";

import { Button } from "@/components/ui/button";
import type { Doc } from "../../../convex/_generated/dataModel";
```

**Props shape:**
```typescript
interface CashoutBreakdownProps {
  trade: Doc<"trades">;
  onCashOut: () => void; // opens parent modal
}
```

**Breakdown row pattern** — display fields already on the trade record (from `convex/schema.ts` lines 32–41):
```typescript
// Fields to display (all present on trade record):
trade.tierAtTrade          // e.g., 3
trade.baseCashoutPercent   // e.g., 25
trade.roiBonusPercent      // e.g., 20
trade.streakMultiplier     // e.g., 0.75
trade.goalBoostMultiplier  // e.g., 1.10
trade.finalCashoutPercent  // e.g., 32.25
trade.recommendedCashoutSol // e.g., 0.3225
```

**Layout pattern for breakdown rows** (simple label+value, use existing text-zinc-400 / text-white convention from dashboard page):
```typescript
<div className="mt-3 border-t border-zinc-800 pt-3 space-y-2">
  <div className="flex justify-between text-sm">
    <span className="text-zinc-400">Base rate (Tier {trade.tierAtTrade})</span>
    <span className="text-white">{trade.baseCashoutPercent}%</span>
  </div>
  {/* ... more rows ... */}
  <div className="flex justify-between text-sm font-semibold border-t border-zinc-800 pt-2 mt-2">
    <span className="text-zinc-300">Final cashout</span>
    <span className="text-white">{trade.finalCashoutPercent.toFixed(2)}%</span>
  </div>
</div>
```

**Cash Out button** — only render when `trade.status === "pending"` (not confirmed):
```typescript
{trade.status === "pending" && (
  <Button
    onClick={onCashOut}
    className="mt-3 w-full bg-white text-black hover:bg-zinc-200"
  >
    Cash Out {trade.recommendedCashoutSol.toFixed(4)} SOL
  </Button>
)}
```

**Button styling reference** (from `WalletSetupForm.tsx` line 155 — same submit button pattern):
```typescript
className="w-full bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
```

---

### `src/components/dashboard/CashoutModal.tsx` (component, request-response)

**Analog:** `src/components/ui/dialog.tsx` (full Dialog primitives) + `src/components/forms/WalletSetupForm.tsx` (useMutation + toast pattern)

**Critical:** Must be `"use client"` — Dialog uses a portal (see `dialog.tsx` line 1).

**Imports pattern:**
```typescript
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { Copy, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Doc } from "../../../convex/_generated/dataModel";
```

**Props shape:**
```typescript
interface CashoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trade: Doc<"trades">;
  vaultAddress: string;
}
```

**Dialog structure** (from `dialog.tsx` lines 49–80 — use these named exports):
```typescript
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
    <DialogHeader>
      <DialogTitle>Confirm Cashout</DialogTitle>
      <DialogDescription className="text-zinc-400">
        Transfer SOL to your vault wallet, then confirm below.
      </DialogDescription>
    </DialogHeader>
    {/* body */}
    <DialogFooter>
      {/* buttons */}
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**useMutation + loading state pattern** (from `WalletSetupForm.tsx` lines 60–93 — direct copy, swap mutation):
```typescript
const confirmCashout = useMutation(api.trades.confirmCashout);
const [isConfirming, setIsConfirming] = useState(false);

const handleConfirm = async () => {
  setIsConfirming(true);
  try {
    await confirmCashout({
      tradeId: trade._id,
      actualCashoutSol: trade.recommendedCashoutSol,
    });
    toast.success("Cashout confirmed!");
    onOpenChange(false);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Failed to confirm cashout");
  } finally {
    setIsConfirming(false);
  }
};
```

**Copy-to-clipboard pattern** (no analog in codebase — use Web API directly):
```typescript
const [copied, setCopied] = useState(false);

const handleCopy = async (text: string) => {
  await navigator.clipboard.writeText(text);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

// In JSX:
<button onClick={() => handleCopy(vaultAddress)} className="ml-2 text-zinc-400 hover:text-white">
  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
</button>
```

**Confirm button with loading state** (from `WalletSetupForm.tsx` line 155–161 — same pattern):
```typescript
<Button
  onClick={handleConfirm}
  disabled={isConfirming}
  className="w-full bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isConfirming ? (
    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Confirming...</>
  ) : (
    "I've transferred the SOL — Confirm Cashout"
  )}
</Button>
```

---

### `convex/trades.ts` — ADD `confirmCashout` mutation

**Analog:** `convex/wallets.ts` `createWallets` mutation (lines 32–98) — same auth + ownership check + patch pattern

**Auth + ownership pattern** (from `convex/wallets.ts` lines 37–40):
```typescript
import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Add to existing imports at top of convex/trades.ts:
// mutation is not currently imported — add it
import { query, mutation, internalMutation } from "./_generated/server";
```

**Mutation structure** (modeled on `convex/wallets.ts` lines 32–40 — auth first, ownership second):
```typescript
export const confirmCashout = mutation({
  args: {
    tradeId: v.id("trades"),
    actualCashoutSol: v.number(),
  },
  handler: async (ctx, args) => {
    // Step 1: Auth check (same pattern as every mutation)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Step 2: Fetch and ownership verify
    const trade = await ctx.db.get(args.tradeId);
    if (!trade || trade.userId !== identity.subject) throw new Error("Trade not found");
    if (trade.status === "confirmed") throw new Error("Already confirmed");

    // Step 3: Input validation (ASVS V5)
    if (args.actualCashoutSol <= 0) throw new Error("Cashout amount must be positive");
    if (args.actualCashoutSol > trade.recommendedCashoutSol) {
      throw new Error("Cashout amount exceeds recommended amount");
    }

    // Step 4: Patch trade
    await ctx.db.patch(args.tradeId, {
      status: "confirmed",
      actualCashoutSol: args.actualCashoutSol,
    });

    // Step 5: Update trading wallet (subtract)
    const tradingWallet = await ctx.db.get(trade.tradingWalletId);
    if (tradingWallet) {
      await ctx.db.patch(tradingWallet._id, {
        balanceSol: Math.max(0, tradingWallet.balanceSol - args.actualCashoutSol),
      });
    }

    // Step 6: Update vault wallet (add) — use by_user_type index (Pitfall 3 prevention)
    const vaultWallet = await ctx.db
      .query("wallets")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", identity.subject).eq("walletType", "vault")
      )
      .first();
    if (vaultWallet) {
      await ctx.db.patch(vaultWallet._id, {
        balanceSol: vaultWallet.balanceSol + args.actualCashoutSol,
      });
    }
  },
});
```

**Index reference** (from `convex/schema.ts` line 18): `"by_user_type"` index exists on `wallets` table as `["userId", "walletType"]`.

**Note on `balanceUsd`:** Per RESEARCH.md assumption A1, the mutation does NOT update `balanceUsd` (display only; reconciled on next sync). This avoids needing a SOL price arg from the client.

---

### `convex/userState.ts` — ADD `updateLosingStreak` internalMutation

**Analog:** `convex/userState.ts` `getOrCreateUserState` mutation (lines 28–47) — same upsert pattern

**Pattern to copy** (lines 28–47 — exact structure, change to internalMutation):
```typescript
// Current getOrCreateUserState (lines 28-47) — upsert shape to copy:
const existing = await ctx.db
  .query("userState")
  .withIndex("by_user", (q) => q.eq("userId", identity.subject))
  .first();

if (existing) return existing;

await ctx.db.insert("userState", {
  userId: identity.subject,
  currentLosingStreak: 0,
});
```

**New internalMutation** (add `internalMutation` to the import line 2):
```typescript
// Line 2 — change:
import { query, mutation, internalQuery } from "./_generated/server";
// To:
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";

// New export:
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

**Caller location:** Add call in `convex/sync.ts` after `saveSyncedTrades` (line 188). Compute `newStreak` from `tradesToSave` array sorted ascending by `positionClosedAt`, applying: win resets to 0, loss increments by 1.

---

### `src/lib/cashout-calculator.ts` — ADD 65% cap enforcement

**Analog:** Self (lines 56–81 — modify Step 5/Step 6 block)

**Current Step 5–6** (lines 56–65):
```typescript
// Step 5: Apply goal boost if provided
const finalCashoutPercent = applyGoalBoost(
  preBoostPercent,
  input.goalBoostPercent
);

// Step 6: Calculate cashout amount in SOL
const cashoutAmountSOL =
  (input.netProfitSOL * finalCashoutPercent) / 100;
```

**Modified Step 5–6** (insert cap between boost and amount calculation):
```typescript
// Step 5: Apply goal boost if provided
const boostedPercent = applyGoalBoost(
  preBoostPercent,
  input.goalBoostPercent
);

// Step 5b: Apply hard cap (CASH-07 — 65% max to prevent over-extraction)
const finalCashoutPercent = Math.min(boostedPercent, CASHOUT_CAP_PERCENT);

// Step 6: Calculate cashout amount in SOL
const cashoutAmountSOL =
  (input.netProfitSOL * finalCashoutPercent) / 100;
```

**Constant to add to `src/lib/constants.ts`** (after `CALCULATION` block, line 112):
```typescript
// =============================================
// CASHOUT CAP (Phase 3 — CASH-07)
// Hard cap prevents over-extraction on mega wins
// =============================================
export const CASHOUT_CAP_PERCENT = 65; // Maximum final cashout percentage
```

**Import in `cashout-calculator.ts`** — add `CASHOUT_CAP_PERCENT` to the existing import from `./constants` (currently imports nothing from constants directly; `cashout-helpers.ts` handles that). Add import:
```typescript
import { CASHOUT_CAP_PERCENT } from "./constants";
```

---

### `convex/sync.ts` — FIX trade status on save (Pitfall 2 prevention)

**Analog:** Self (line 181 — single line change)

**Current line 181** (in the `tradesToSave` map):
```typescript
status: "confirmed" as const,
```

**Corrected version** (win = pending, loss = confirmed since there's nothing to cash out):
```typescript
status: (parsed.netProfit > 0 ? "pending" : "confirmed") as "pending" | "confirmed",
```

**Location in file:** Inside the `tradesToSave.map()` callback, line 181, within the return object.

---

## Shared Patterns

### Authentication (all Convex mutations)

**Source:** `convex/wallets.ts` lines 37–40 (createWallets) and `convex/userState.ts` lines 7–9 (getUserState)

**Apply to:** `confirmCashout` mutation (new), `updateLosingStreak` internalMutation (called from action, no identity needed)

```typescript
// Public mutations: always first line of handler
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");
const userId = identity.subject;

// internalMutations called from actions: userId passed as arg, no identity check needed
args: { userId: v.string(), ... }
```

### Convex useQuery Subscription

**Source:** `src/app/dashboard/page.tsx` lines 21–24

**Apply to:** `src/app/dashboard/page.tsx` (extended), `src/components/dashboard/TradeList.tsx` (receives data as prop — no direct useQuery)

```typescript
// Always check undefined (loading) before null (unauthed) before data
const wallets = useQuery(api.wallets.getUserWallets);
if (wallets === undefined) return <LoadingSkeleton />;
if (wallets === null) { /* handle unauthed */ }
```

### Toast Notification

**Source:** `src/app/dashboard/page.tsx` lines 54–65

**Apply to:** `CashoutModal.tsx` (success/error after confirmCashout)

```typescript
import { toast } from "sonner";
toast.success("Cashout confirmed!");
toast.error(error instanceof Error ? error.message : "Failed to confirm cashout");
```

### Convex useMutation Call

**Source:** `src/components/forms/WalletSetupForm.tsx` lines 60–93

**Apply to:** `CashoutModal.tsx`

```typescript
const mutation = useMutation(api.namespace.functionName);
const [isPending, setIsPending] = useState(false);

const handleAction = async () => {
  setIsPending(true);
  try {
    await mutation({ ...args });
    toast.success("...");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Failed");
  } finally {
    setIsPending(false);
  }
};
```

### Convex Index Lookup

**Source:** `convex/wallets.ts` lines 6–15 (`getUserWallets`) and schema line 18

**Apply to:** `confirmCashout` mutation vault wallet lookup

```typescript
// Always use withIndex, never .filter() for indexed fields
ctx.db
  .query("wallets")
  .withIndex("by_user_type", (q) =>
    q.eq("userId", userId).eq("walletType", "vault")
  )
  .first();
```

### Tailwind Dark Theme

**Source:** `src/app/dashboard/page.tsx` throughout

**Apply to:** All new dashboard components

```
bg-black          — page background
bg-zinc-950       — card background
bg-zinc-900       — input/button background
border-zinc-800   — card borders
text-white        — primary text
text-zinc-300     — secondary text
text-zinc-400     — muted text / labels
text-zinc-500     — subtlest text (addresses)
```

### `cn()` Conditional ClassNames

**Source:** `src/lib/utils.ts` lines 1–6 (re-exported from clsx + tailwind-merge)

**Apply to:** All new components that have conditional styling (TradeCard, TierBadge)

```typescript
import { cn } from "@/lib/utils";
className={cn("base-classes", condition && "conditional-classes")}
```

---

## No Analog Found

All Phase 3 files have analogs in the existing codebase. No new patterns require external reference.

| File | Closest Approach |
|---|---|
| Copy-to-clipboard in CashoutModal | No analog — use `navigator.clipboard.writeText()` directly (Web API) |
| Losing streak computation logic in sync.ts | Logic described in RESEARCH.md CASH-03; implement as array reduce over `tradesToSave` sorted by `positionClosedAt` |

---

## Critical Pitfall Index

| Pitfall | Where It Bites | Prevention |
|---|---|---|
| All synced trades show "Cashed Out" immediately | `convex/sync.ts` line 181 | Change `"confirmed" as const` to `netProfit > 0 ? "pending" : "confirmed"` |
| Streak never updates | `convex/sync.ts` — missing call after saveSyncedTrades | Add `updateLosingStreak` internalMutation call at end of syncWalletTrades |
| Vault lookup full table scan | `confirmCashout` mutation | Use `.withIndex("by_user_type", ...)` not `.filter()` |
| 65% cap only in UI, not in stored data | `cashout-calculator.ts` | Add `Math.min(boostedPercent, CASHOUT_CAP_PERCENT)` before computing SOL amount |
| Dialog SSR crash | `CashoutModal.tsx` | Must have `"use client"` at top; wrap full `<Dialog>` not just `<DialogContent>` |
| useQuery undefined on first render | Dashboard page and all consumers | Guard: `if (data === undefined) return <LoadingSkeleton />` |

---

## Metadata

**Analog search scope:** `src/app/`, `src/components/`, `src/lib/`, `convex/`
**Files scanned:** 22 source files read in full
**Pattern extraction date:** 2026-05-11
