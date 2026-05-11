---
phase: 03-dashboard-cashout-flow
plan: 03
subsystem: ui-components
tags: [ui, components, dashboard, tdd-green, wave2]
dependency_graph:
  requires:
    - 03-01 (Nyquist component test stubs — TierBadge/StatsRow/GoalProgress RED state)
    - 03-02 (calculateTier, getTierConfig exports confirmed working)
  provides:
    - TierBadge — color-coded tier badge with label, subtitle, optional losing streak
    - StatsRow — 3-col grid (tier card + trading wallet card + vault wallet card)
    - GoalProgress — minimal monthly goal progress display (DASH-06 Phase 3 scope)
  affects:
    - src/components/dashboard/TierBadge.tsx
    - src/components/dashboard/StatsRow.tsx
    - src/components/dashboard/GoalProgress.tsx
tech_stack:
  added: []
  patterns:
    - Pure presentational components (props-only, no Convex)
    - Inline style for runtime tier color (getTierConfig(tier).color)
    - TDD GREEN phase — 13 pre-created RED tests now passing
key_files:
  created:
    - src/components/dashboard/TierBadge.tsx (49 lines)
    - src/components/dashboard/StatsRow.tsx (92 lines)
    - src/components/dashboard/GoalProgress.tsx (28 lines)
  modified: []
decisions:
  - node_modules symlinked from main repo to worktree (git worktree has no local node_modules — symlink is not committed)
  - GoalProgress accepts monthlyGoalUsd as prop (no constants import) — fallback to DEFAULTS.MONTHLY_GOAL_USD handled by Plan 05 page
metrics:
  duration: 4 minutes
  completed: 2026-05-11
  tasks_completed: 3
  files_created: 3
  files_modified: 0
---

# Phase 3 Plan 03: TierBadge, StatsRow, GoalProgress Components Summary

**One-liner:** Three pure presentational dashboard components — TierBadge (tier color/label/streak), StatsRow (3-col grid with tier + wallet cards), and GoalProgress (minimal DASH-06 progress bar) — all 13 pre-created tests GREEN.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create TierBadge component | 4025041 | src/components/dashboard/TierBadge.tsx |
| 2 | Create StatsRow component | 1b730b8 | src/components/dashboard/StatsRow.tsx |
| 3 | Create GoalProgress component | e4c25b6 | src/components/dashboard/GoalProgress.tsx |

## Test Count Delta

| Category | Count | Status |
|----------|-------|--------|
| TierBadge tests (Plan 01 RED stubs) | 5 | NOW GREEN |
| StatsRow tests (Plan 01 RED stubs) | 5 | NOW GREEN |
| GoalProgress tests (Plan 01 RED stubs) | 3 | NOW GREEN |
| **Total driven to GREEN this plan** | **13** | All passing |
| Component stubs still RED (Plans 04) | 8 | FAIL — Expected (TradeCard, TradeList) |

## Component Prop Signatures (for Plan 05)

### TierBadge

```typescript
interface TierBadgeProps {
  balanceSol: number;
  losingStreak?: number;  // defaults to 0; renders "{N}-loss streak" when > 0
}
export function TierBadge({ balanceSol, losingStreak = 0 }: TierBadgeProps)
```

Usage in Plan 05: `<TierBadge balanceSol={tradingWallet.balanceSol} losingStreak={userState?.currentLosingStreak ?? 0} />`

### StatsRow

```typescript
interface WalletDisplay {
  address: string;
  balanceSol: number;
  balanceUsd: number;
}
interface StatsRowProps {
  tradingWallet: WalletDisplay;
  vaultWallet: WalletDisplay;
  losingStreak?: number;  // defaults to 0; passed through to TierBadge
}
export function StatsRow({ tradingWallet, vaultWallet, losingStreak = 0 }: StatsRowProps)
```

Usage in Plan 05: `<StatsRow tradingWallet={...} vaultWallet={...} losingStreak={userState?.currentLosingStreak ?? 0} />`

### GoalProgress

```typescript
interface GoalProgressProps {
  currentProgressUsd: number;
  monthlyGoalUsd: number;
}
export function GoalProgress({ currentProgressUsd, monthlyGoalUsd }: GoalProgressProps)
```

Usage in Plan 05: `<GoalProgress currentProgressUsd={goalSettings?.currentMonthProgressUsd ?? 0} monthlyGoalUsd={goalSettings?.monthlyGoalUsd ?? DEFAULTS.MONTHLY_GOAL_USD} />`

## No Convex Imports Confirmation

Verified: `grep -rn "convex/react" TierBadge.tsx StatsRow.tsx GoalProgress.tsx` returns no matches. All three components are purely presentational — they accept props and render UI; no `useQuery`, `useMutation`, or `useAction` calls anywhere.

## UI-SPEC Compliance Notes

- **Typography:** `text-3xl font-semibold` (NOT `font-bold`) for SOL balance display — matches UI-SPEC normalized weight declarations
- **Colors:** Tier colors applied via `style={{ backgroundColor: config.color }}` (inline, not Tailwind) — runtime values from `getTierConfig(tier).color`
- **Tier card border:** `border-l-4` with `style={{ borderLeftColor: tierColor }}` — per UI-SPEC StatsRow Tier Card Treatment
- **Forbidden patterns absent:** No `font-bold`, no `text-lg`, no `text-xs` — all verified clean

## Deviations from Plan

### Infrastructure Fix

**[Rule 3 - Blocking] Symlinked node_modules to worktree**
- **Found during:** Task 1 verification
- **Issue:** Git worktree has no `node_modules` directory (pnpm doesn't create per-worktree node_modules). Running `pnpm test` failed with `sh: vitest: command not found`.
- **Fix:** Created a symlink `ln -s /path/to/main/node_modules /path/to/worktree/node_modules`. The symlink is not tracked by git and does not affect the codebase.
- **Impact:** Tests now run correctly in the worktree context.

## Known Stubs

None. All three components are fully wired to their props and render live data. No hardcoded empty values or placeholder text.

## Threat Flags

No new security-relevant surface introduced. These components are purely client-side rendering components with no network calls, no mutations, no auth paths, and no file access. The plan's threat register disposition (T-03-04: accept) applies — `balanceUsd` is display-only and not used in financial calculations.

## Self-Check: PASSED

Files confirmed present:
- src/components/dashboard/TierBadge.tsx: FOUND (49 lines)
- src/components/dashboard/StatsRow.tsx: FOUND (92 lines)
- src/components/dashboard/GoalProgress.tsx: FOUND (28 lines)

Commits confirmed in git log:
- 4025041: feat(03-03): create TierBadge component
- 1b730b8: feat(03-03): create StatsRow component
- e4c25b6: feat(03-03): create GoalProgress component

Test count: 13 passing (target: 13) — VERIFIED
