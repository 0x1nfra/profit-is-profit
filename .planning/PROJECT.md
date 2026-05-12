# Profit is Profit (PisP)

## What This Is

An automated profit-taking system for Solana meme coin traders that scans on-chain trading activity and recommends dynamic cashout percentages based on wallet health tiers. It solves the "win big, give it all back" pattern by systematically extracting profits from a trading wallet into a separate vault wallet.

## Core Value

Prevent traders from giving back profits by automatically calculating how much to take off the table after every winning trade, based on wallet health and trade performance.

## Requirements

### Validated

- ✓ Tier calculator (5-tier system based on SOL balance) — existing `src/lib/tier-calculator.ts`
- ✓ Cashout calculator (base rate + ROI bonus + streak multiplier + goal boost) — existing `src/lib/cashout-calculator.ts`
- ✓ Constants and tier config — existing `src/lib/constants.ts`
- ✓ 229 unit tests covering core business logic — existing test suite

### Active

- [ ] Rebuild app using Helius Wallet API (replaces raw transaction parsing)
- [ ] Trade detection via `/v1/wallet/{wallet}/history` with balance change parsing
- [ ] Position bundling: group swaps by token mint, aggregate entry/exit SOL, detect closure via `/v1/wallet/{wallet}/balances`
- [ ] Wallet-based authentication (Phantom, Solflare, Backpack) via `@solana/wallet-adapter-react`
- [ ] Wallet setup flow: trading wallet + vault wallet addresses
- [ ] Dashboard: wallet balances (SOL + USD), current tier, recent trades, goal progress
- [ ] Cashout recommendation display with breakdown (tier, ROI bonus, streak, boost)
- [ ] Manual cashout confirmation flow (user transfers SOL, confirms in app)
- [ ] Trade history with sortable columns and pagination
- [ ] Monthly goal system with weekly pace tracking
- [ ] Sunday goal check with boost suggestions (+5/10/15/20% for 7 days)
- [ ] Dark theme, crypto-native UI aesthetic
- [ ] Cashout cap to prevent over-extraction on mega wins (address bonus % issue)

### Out of Scope

- Automated on-chain cashout execution (no private key custody) — security risk for MVP
- Real-time monitoring via gRPC/WebSocket — manual refresh sufficient for v1
- Portfolio tracking across multiple wallets — single trading + vault pair only
- Tax reporting / PnL calculations — not core to profit-taking
- Social features (leaderboards, sharing) — solo tool
- Mobile native app — web-first, responsive design
- Custom user-defined tiers — future feature (noted for v2)
- SOL → stablecoin swap integration — future feature
- Email/password auth — wallet-first for crypto-native users

## Context

**Existing Code:** Brownfield project with backend business logic complete (tier calculator, cashout calculator, trade parser, Helius client, trade service). 229 unit tests passing. Frontend has mock UI drafts on `feat/mock-ui` branch.

**Rebuild Scope:** Fresh UI and data fetching layer using Helius Wallet API (`/v1/wallet/{wallet}/balances`, `/v1/wallet/{wallet}/history`). Keep proven business logic modules (calculators, constants). Replace raw transaction parsing with Wallet API's parsed balance changes.

**Target User:** Low-port meme coin traders on Solana (1-3 SOL trading capital, <50% win rate, multiple daily trades). Comfortable trading size: 10 SOL. Monthly cashout goal: $400+ USD.

**Known Issue — Bonus % Over-Extraction:** The +20% ROI bonus on mega wins can push cashout too high at upper tiers (e.g., Tier 5: 60% + 20% = 80% of profit). Need a cap mechanism to prevent wallet drainage. Options: hard cap on final %, or scale bonus inversely with tier.

**Tech Stack:**
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + Radix UI (shadcn/ui pattern)
- Zustand for client state
- Supabase (PostgreSQL + Auth)
- Helius Wallet API for on-chain data
- Vitest for testing
- pnpm package manager

## Constraints

- **API:** Helius Wallet API (beta) — `/history` and `/balances` endpoints; 100 credits per balances call; cursor-based pagination
- **Auth:** Read-only wallet monitoring only — no private keys stored, no transaction signing
- **Data:** USD prices from Helius update hourly, only top 10K tokens by market cap have pricing
- **Infra:** Supabase free tier (500MB DB), Helius free tier (10K req/day)
- **Business Logic:** Tier system is constant for v1 (5 tiers, fixed boundaries and rates per functional-logic.md)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Helius Wallet API over raw tx parsing | Cleaner abstraction — parsed balance changes per swap, no raw Solana tx interpretation needed | — Pending |
| Keep existing calculators | 229 tests passing, proven logic, no reason to rewrite | ✓ Good |
| Wallet-first auth | Target users are crypto-native traders, wallet is prerequisite for app functionality | — Pending |
| Dark crypto-native theme | Matches target audience expectations and trading app conventions | — Pending |
| Cashout cap for bonus % | Prevent over-extraction on mega wins at high tiers | — Pending |
| Manual cashout (no custody) | Security — no private keys in MVP, user transfers SOL manually | ✓ Good |

---
*Last updated: 2026-02-20 after initialization*
