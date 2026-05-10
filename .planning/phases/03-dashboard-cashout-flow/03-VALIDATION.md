---
phase: 3
slug: dashboard-cashout-flow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-11
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + jsdom |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test:coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test:coverage`
- **Before `/gsd-verify-work`:** Full suite must be green (247+ tests passing)
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | CASH-07 | T-03-03 | 65% cap applied before storing `finalCashoutPercent` | unit | `pnpm test src/lib/__tests__/cashout-calculator.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 0 | CASH-03 | — | Streak resets on win, increments on loss in correct order | unit | `pnpm test src/lib/__tests__/cashout-helpers.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | CASH-01 | — | Cashout formula: (base + ROI) × streak × boost | unit | `pnpm test src/lib/__tests__/cashout-calculator.test.ts` | ✅ | ⬜ pending |
| 03-01-04 | 01 | 1 | CASH-02, DASH-03 | — | Tier 1–5 correctly computed from balance | unit | `pnpm test src/lib/__tests__/tier-calculator.test.ts` | ✅ | ⬜ pending |
| 03-02-01 | 02 | 2 | CASH-05, CASH-06 | T-03-01, T-03-02, T-03-04 | `confirmCashout` checks userId, idempotency, and amount bounds | manual | N/A — Convex mutation | — | ⬜ pending |
| 03-02-02 | 02 | 2 | DASH-01, DASH-02 | — | Balances display from Convex in SOL + USD | manual | N/A — UI smoke test | — | ⬜ pending |
| 03-02-03 | 02 | 2 | DASH-04 | — | Trade cards render with breakdown panel | manual | N/A — UI smoke test | — | ⬜ pending |
| 03-02-04 | 02 | 2 | DASH-05 | — | Sync button triggers `syncWalletTrades` action | manual | N/A — UI smoke test | — | ⬜ pending |
| 03-02-05 | 02 | 2 | DASH-06 | — | Goal progress line renders monthly progress | manual | N/A — UI smoke test | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/cashout-calculator.test.ts` — add 65% cap boundary cases: Tier 5 + mega win + 20% goal boost = 96% uncapped, clamped to 65% (covers CASH-07)
- [ ] `src/lib/__tests__/cashout-helpers.test.ts` — add streak update computation test: list of trade results processed in `positionClosedAt` ascending order; win resets to 0, loss increments (covers CASH-03)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `confirmCashout` marks trade "confirmed" and rejects duplicate | CASH-05 | Convex mutation — no unit test harness | Connect wallet, sync trades, click Cash Out, confirm; verify trade card shows "Cashed Out". Attempt second confirm — must error |
| Wallet balances update after cashout confirm | CASH-06 | Convex real-time + Helius data | After confirming cashout, verify trading wallet balance decreases and vault wallet balance increases by `actualCashoutSol` |
| Wallet balances display from Convex | DASH-01, DASH-02 | UI integration | Dashboard shows SOL + USD amounts for both trading and vault wallets matching Convex `wallets` records |
| Trade cards render with breakdown | DASH-04 | UI smoke test | Expand trade card — breakdown shows tier base %, ROI bonus %, streak multiplier, goal boost, final SOL amount |
| Sync button triggers action | DASH-05 | UI smoke test | Click "Refresh Trades" — spinner appears, toast shows result, trade list updates |
| Goal progress line appears | DASH-06 | UI smoke test | Dashboard shows "Goal: $X / $400 this month" progress line below section header |
| IDOR: cannot confirm another user's trade | CASH-05 | Security — Convex auth context | Attempt to call `confirmCashout` with a `tradeId` belonging to a different wallet — must throw "Not found" |

---

## Threat Verification Map

| Threat ID | Pattern | Mitigation | Verified By |
|-----------|---------|------------|-------------|
| T-03-01 | IDOR: confirm another user's trade | `trade.userId === identity.subject` check in mutation | Manual — IDOR test above |
| T-03-02 | Replay: confirm same trade twice | `trade.status !== "confirmed"` check before patch | Manual — duplicate confirm test above |
| T-03-03 | Overextraction: `actualCashoutSol` > recommended | `args.actualCashoutSol <= trade.recommendedCashoutSol` validation | Manual — pass inflated amount to mutation |
| T-03-04 | SOL price manipulation via client | `balanceUsd` computed from client-supplied `solPriceUsd`; treat as display-only, not financial truth | Code review — mutation design |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
