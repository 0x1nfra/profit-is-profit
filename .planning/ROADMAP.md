# Roadmap: Profit is Profit

## Overview

This roadmap transforms existing backend business logic (tier calculator, cashout calculator, 229 passing tests) into a fully functional web application. The journey moves from foundation (wallet authentication, database setup) through core profit-taking flows (trade detection, cashout recommendations) to behavioral features (goal tracking, history views) and final polish. Each phase delivers observable user capabilities, building systematically toward a complete profit-discipline tool for Solana meme coin traders.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Authentication** - User connects wallet, sets up trading + vault wallets, database ready
- [ ] **Phase 2: Trade Detection & Sync** - System detects closed trades from Helius and calculates profit/loss
- [ ] **Phase 3: Dashboard & Cashout Flow** - User sees wallet health, gets cashout recommendations, confirms cashouts
- [ ] **Phase 4: Goal Tracking** - User sets monthly goals, tracks vault deposit progress
- [ ] **Phase 5: Trade History & UI Polish** - User browses historical trades, responsive design, error states

## Phase Details

### Phase 1: Foundation & Authentication
**Goal**: Users can securely authenticate with Solana wallets and configure trading + vault wallet addresses
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, SETUP-01, SETUP-02, SETUP-03, SETUP-04
**Success Criteria** (what must be TRUE):
  1. User can connect their Solana wallet (Phantom, Solflare, or Backpack) from landing page
  2. User session persists across browser refresh without re-connecting wallet
  3. User can input and save trading wallet address and vault wallet address (validated as different)
  4. User sees initial wallet balances (SOL + USD) after completing setup
  5. User is automatically routed to setup page if not configured, dashboard if configured
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md — Wallet adapter setup, WalletProvider, Zustand store, landing page with connect/sign/disconnect
- [ ] 01-02-PLAN.md — Wallet setup form, save API, Helius balance API, dashboard, route middleware

### Phase 2: Trade Detection & Sync
**Goal**: System accurately detects closed trades from Helius transaction history and calculates P&L
**Depends on**: Phase 1
**Requirements**: TRADE-01, TRADE-02, TRADE-03, TRADE-04, TRADE-05, TRADE-06, TRADE-07
**Success Criteria** (what must be TRUE):
  1. User can trigger manual trade sync from dashboard (refresh button)
  2. System fetches transaction history from Helius and groups swaps by token mint
  3. System detects when a position is closed (token balance = 0) and calculates net profit in SOL
  4. System calculates ROI percentage for each closed trade
  5. System handles multiple token closures in single sync without duplication
  6. System treats dust amounts (<0.000001 tokens) as zero when detecting closure
**Plans**: TBD

Plans:
- TBD (will be created during plan-phase)

### Phase 3: Dashboard & Cashout Flow
**Goal**: Users see wallet health tier, recent trades with recommendations, and can confirm manual cashouts
**Depends on**: Phase 2
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, CASH-01, CASH-02, CASH-03, CASH-04, CASH-05, CASH-06, CASH-07, CASH-08
**Success Criteria** (what must be TRUE):
  1. User sees trading wallet balance and vault wallet balance (both SOL and USD) on dashboard
  2. User sees current wallet health tier (1-5) displayed with color-coded badge
  3. User sees recent trades with calculated cashout recommendations and full breakdown (tier, ROI bonus, streak multiplier, goal boost)
  4. User can confirm a cashout after manually transferring SOL to vault wallet
  5. System updates wallet balances after cashout confirmation
  6. System caps cashout percentage to prevent over-extraction on mega wins
  7. System persists losing streak across page reloads and resets on any win
**Plans**: TBD

Plans:
- TBD (will be created during plan-phase)

### Phase 4: Goal Tracking
**Goal**: Users set monthly cashout goals and track progress toward them with visual feedback
**Depends on**: Phase 3
**Requirements**: GOAL-01, GOAL-02, GOAL-03, GOAL-04
**Success Criteria** (what must be TRUE):
  1. User can set or adjust monthly cashout goal in USD (defaults to $400)
  2. Dashboard displays visual progress bar showing monthly vault deposits vs goal
  3. User sees weekly pace indicator (on track / behind / ahead)
  4. System resets monthly progress on 1st of each month automatically
**Plans**: TBD

Plans:
- TBD (will be created during plan-phase)

### Phase 5: Trade History & UI Polish
**Goal**: Users browse full trade history with sorting/pagination and experience polished, mobile-responsive UI
**Depends on**: Phase 4
**Requirements**: HIST-01, HIST-02, HIST-03, HIST-04, UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. User can view all historical trades in table format (date, token, entry SOL, exit SOL, ROI, cashout %, cashout amount)
  2. User can sort table by date, ROI, or cashout amount
  3. Table supports pagination at 50 trades per page
  4. App uses dark theme with crypto-native aesthetic across all pages
  5. App is fully responsive on mobile (iOS Safari, Android Chrome)
  6. User sees toast notifications for new trade detection and cashout confirmation
  7. User sees loading skeletons during data fetches and error states with retry buttons
**Plans**: TBD

Plans:
- TBD (will be created during plan-phase)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Authentication | 0/2 | Planning complete | - |
| 2. Trade Detection & Sync | 0/TBD | Not started | - |
| 3. Dashboard & Cashout Flow | 0/TBD | Not started | - |
| 4. Goal Tracking | 0/TBD | Not started | - |
| 5. Trade History & UI Polish | 0/TBD | Not started | - |
