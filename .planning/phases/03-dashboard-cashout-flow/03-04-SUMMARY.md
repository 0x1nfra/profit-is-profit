---
phase: 03-dashboard-cashout-flow
plan: 04
subsystem: ui-components
tags: [ui, components, dashboard, cashout-flow, tdd-green, wave2]
dependency_graph:
  requires:
    - 03-01 (Nyquist component test stubs — TradeCard/TradeList RED state)
    - 03-02 (confirmCashout mutation + api.trades.confirmCashout callable)
  provides:
    - CashoutBreakdown — expanded breakdown panel with 5 cashout fields + gated Cash Out button
    - CashoutModal — Convex mutation dialog with copy-to-clipboard and loading state
    - TradeCard — collapsible trade card (loss / pending / confirmed states)
    - TradeList — section header + sync button + mapped TradeCard list + empty state
  affects:
    - src/components/dashboard/CashoutBreakdown.tsx
    - src/components/dashboard/CashoutModal.tsx
    - src/components/dashboard/TradeCard.tsx
    - src/components/dashboard/TradeList.tsx
    - vitest.setup.ts
tech_stack:
  added: []
  patterns:
    - Controlled Dialog (open + onOpenChange) from Radix UI via shadcn
    - useMutation from convex/react with try/catch/finally loading pattern
    - navigator.clipboard.writeText with 2s setTimeout feedback
    - cn() helper for conditional class merging (opacity-50 on loss)
    - Pure presentational components (CashoutBreakdown, TradeCard, TradeList) — no Convex imports
    - TDD GREEN phase — 8 pre-created RED component tests now passing
key_files:
  created:
    - src/components/dashboard/CashoutBreakdown.tsx (59 lines)
    - src/components/dashboard/CashoutModal.tsx (135 lines)
    - src/components/dashboard/TradeCard.tsx (102 lines)
    - src/components/dashboard/TradeList.tsx (64 lines)
  modified:
    - vitest.setup.ts (added convex/react mock — useMutation/useQuery/useAction)
decisions:
  - vitest.setup.ts global convex/react mock added so TradeCard unit tests don't require ConvexProvider wrapper
  - CashoutModal passes trade.recommendedCashoutSol as actualCashoutSol — user confirms recommended amount only in MVP (custom amounts deferred to v2)
  - CashoutModal dialog renders as sibling of card div (not inside button) — required because Dialog renders into a portal
  - node_modules symlinked from main repo to worktree (same approach as Plan 03)
metrics:
  duration: 5 minutes
  completed: 2026-05-11
  tasks_completed: 2
  files_created: 4
  files_modified: 1
---

# Phase 3 Plan 04: CashoutBreakdown, CashoutModal, TradeCard, TradeList Components Summary

**One-liner:** Four trade-flow UI components — CashoutBreakdown (breakdown panel), CashoutModal (Convex mutation dialog with clipboard copy), TradeCard (3-state collapsible card), TradeList (section + empty state) — all 8 pre-created tests GREEN, 286 total passing.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create CashoutBreakdown + CashoutModal components | ead89cb | src/components/dashboard/CashoutBreakdown.tsx, src/components/dashboard/CashoutModal.tsx |
| 2 | Create TradeCard + TradeList components | 8907e97 | src/components/dashboard/TradeCard.tsx, src/components/dashboard/TradeList.tsx, vitest.setup.ts |

## Test Count Delta

| Category | Count | Status |
|----------|-------|--------|
| All prior tests (Plans 01–03) | 265 | PASS (unchanged) |
| TradeCard component tests (Plan 01 RED stubs) | 4 | NOW GREEN |
| TradeList component tests (Plan 01 RED stubs) | 4 | NOW GREEN |
| **Total driven to GREEN this plan** | **8** | All passing |
| **Total passing** | **286** | All tests |

## Component Prop Signatures (for Plan 05)

### CashoutBreakdown

```typescript
interface CashoutBreakdownProps {
  trade: Doc<"trades">;
  onCashOut: () => void;
}
export function CashoutBreakdown({ trade, onCashOut }: CashoutBreakdownProps)
```

Displays: tierAtTrade, baseCashoutPercent, roiBonusPercent, streakMultiplier, goalBoostMultiplier, finalCashoutPercent, recommendedCashoutSol. Cash Out button only rendered when `trade.status === "pending"`.

### CashoutModal

```typescript
interface CashoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trade: Doc<"trades">;
  vaultAddress: string;
}
export function CashoutModal({ open, onOpenChange, trade, vaultAddress }: CashoutModalProps)
```

Calls `useMutation(api.trades.confirmCashout)` with `{ tradeId: trade._id, actualCashoutSol: trade.recommendedCashoutSol }`.

### TradeCard

```typescript
interface TradeCardProps {
  trade: Doc<"trades">;
  vaultAddress: string;
}
export function TradeCard({ trade, vaultAddress }: TradeCardProps)
```

Manages own `expanded` + `cashoutOpen` state. Renders CashoutBreakdown when expanded. Renders CashoutModal as sibling (portal).

### TradeList

```typescript
interface TradeListProps {
  trades: Doc<"trades">[];
  vaultAddress: string;
  isSyncing: boolean;
  onSync: () => void;
}
export function TradeList({ trades, vaultAddress, isSyncing, onSync }: TradeListProps)
```

Usage in Plan 05: `<TradeList trades={trades} vaultAddress={vaultWallet.address} isSyncing={isSyncing} onSync={handleSync} />`

## Component Hierarchy

```
TradeList
  └── TradeCard (× N)
        ├── CashoutBreakdown (expanded panel)
        └── CashoutModal (portal dialog)
```

## UI-SPEC Copywriting Compliance

All copy matches UI-SPEC verbatim:

| Element | Expected | Status |
|---------|----------|--------|
| Modal title | "Confirm Cashout" | MATCH |
| Modal description | "Transfer SOL to your vault wallet, then confirm below." | MATCH |
| Confirm button | "I've transferred the SOL — Confirm Cashout" (em-dash) | MATCH |
| Cancel button | "Go Back" | MATCH |
| Success toast | "Cashout confirmed — {X.XXXX} SOL logged" | MATCH |
| Error toast (fallback) | "Failed to confirm cashout. Try again." | MATCH |
| Empty state heading | "No trades yet" | MATCH |
| Empty state body | "Sync your wallet to detect closed trades and get cashout recommendations." | MATCH |
| Sync button idle | "Refresh Trades" | MATCH |
| Sync button loading | "Syncing..." | MATCH |
| Loss badge | "Loss" | MATCH |
| Confirmed badge | "Cashed Out" | MATCH |
| Breakdown final row | "Take off the table" | MATCH |

## Security Mitigations (STRIDE Register — Plan Trust Boundary)

All T-03-0x mitigations are implemented at the correct layer:

| Threat ID | UI Defense (this plan) | Server Defense (Plan 02) |
|-----------|----------------------|--------------------------|
| T-03-01 (IDOR) | Passes only `trade._id` from `useQuery` (already user-scoped) | confirmCashout verifies `trade.userId === identity.subject` |
| T-03-02 (Replay) | `disabled={isConfirming}` on both buttons during in-flight mutation | confirmCashout rejects if `trade.status === "confirmed"` |
| T-03-03 (Overextraction) | Passes `trade.recommendedCashoutSol` — no user-editable amount | confirmCashout validates `actualCashoutSol <= recommendedCashoutSol` |
| T-03-04 (Price manip) | UI does NOT pass solPriceUsd | Mutation does not accept it |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added convex/react mock to vitest.setup.ts**
- **Found during:** Task 2 verification (test run)
- **Issue:** `TradeCard` renders `<CashoutModal>` which calls `useMutation(api.trades.confirmCashout)`. Without a `ConvexProvider` wrapper in the test environment, all 4 TradeCard tests threw "Could not find Convex client!" error.
- **Fix:** Added `vi.mock('convex/react', ...)` to `vitest.setup.ts` globally, mocking `useMutation`, `useQuery`, `useAction`, and `ConvexProvider`. This is the correct approach — unit tests verify UI behavior, not Convex integration.
- **Files modified:** vitest.setup.ts
- **Commit:** 8907e97

## Known Stubs

None. All four components render live data from props. No hardcoded empty values, placeholder text, or TODO markers.

## Threat Flags

No new security-relevant surface beyond the plan's declared trust boundary (Browser → Convex mutation via `confirmCashout`). No new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

Files confirmed present:
- src/components/dashboard/CashoutBreakdown.tsx: FOUND (59 lines)
- src/components/dashboard/CashoutModal.tsx: FOUND (135 lines)
- src/components/dashboard/TradeCard.tsx: FOUND (102 lines)
- src/components/dashboard/TradeList.tsx: FOUND (64 lines)

Commits confirmed in git log:
- ead89cb: feat(03-04): create CashoutBreakdown + CashoutModal components
- 8907e97: feat(03-04): create TradeCard + TradeList components; add convex/react mock to test setup

Test count: 286 passing (target: 286) — VERIFIED
