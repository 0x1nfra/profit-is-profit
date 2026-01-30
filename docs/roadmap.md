# Profit is Profit (PisP) - Development Roadmap

## Timeline Overview

**Total Duration:** 3 weeks (21 days)
**Target Launch:** End of Week 3
**Status:** 🟢 Ready to Start

---

## Week 1: Foundation & Core Features (Days 1-7)

### Day 1-2: Database & Type System

**Goal:** Establish data layer foundation

#### Tasks

- [x] Set up Supabase project
- [x] Create database schema (users, wallets, trades, cashouts, goal_settings, user_state)
- [x] Set up Row Level Security (RLS) policies
- [x] Create Supabase client wrapper (`src/lib/supabase.ts`)
- [x] Define TypeScript interfaces (`src/types/index.ts`)
  - User, Wallet, Trade, Cashout, GoalSettings, UserState
  - API request/response types
  - Enums (Tier, TradeStatus, CashoutStatus)

**Deliverables:**

- ✅ Working database with all tables
- ✅ Type-safe database client
- ✅ Complete TypeScript type definitions

**Dependencies:** None
**Blockers:** Need Supabase API keys

---

### Day 3-4: Core Business Logic Modules

**Goal:** Build calculation engines (no UI yet)

#### Tasks

- [x] **Tier Calculator** (`src/lib/tier-calculator.ts`)
  - `calculateTier(balanceSOL: number): Tier`
  - `getTierName(tier: Tier): string`
  - `getTierConfig(tier: Tier): TierConfig`
  - Unit tests for all tier boundaries

- [x] **Cashout Calculator** (`src/lib/cashout-calculator.ts`)
  - `calculateCashout(input: CashoutInput): CashoutResult`
  - Handle all multipliers (tier, ROI, streak, goal boost)
  - Unit tests for all examples from functional-logic.md

- [x] **Constants & Config** (`src/lib/constants.ts`)
  - Tier boundaries, base rates, multipliers
  - ROI thresholds, streak rules

**Deliverables:**

- ✅ All calculation functions working
- ✅ 136 unit tests passing (Vitest + React Testing Library)
- ✅ Example calculations verified against spec (Section 3.5)
- ✅ Tier boundary tests complete (0.99, 1.0, 3.0, 7.0, 10.0, 10.01)

**Dependencies:** Day 1-2 (types)
**Blockers:** None

---

### Day 5-6: Helius API Integration

**Goal:** Fetch and parse real Solana transaction data

#### Tasks

- [x] **Helius Client** (`src/lib/helius-client.ts`)
  - `getTransactionHistory(address: string): Promise<HeliusTransaction[]>`
  - `getTokenBalances(address: string): Promise<TokenBalance[]>`
  - `getSolBalance(address: string): Promise<number>`
  - Rate limiting (10 req/sec) with Token Bucket algorithm
  - Exponential backoff retry logic for 5xx errors
  - Request/response logging

- [x] **Trade Parser** (`src/lib/trade-parser.ts`)
  - `parseTrades(transactions, walletAddress): ParsedTrade[]`
  - `aggregateTokenTransactions(transactions, tokenMint, walletAddress): AggregatedTrade`
  - `detectPositionClosure(balances, tokenMint): boolean`
  - Group transactions by token mint
  - Aggregate entry/exit SOL amounts
  - Calculate ROI and net profit
  - Handle dust amounts (< 0.000001 SOL)
  - Section 4.1 example verified (Entry: 3.2, Exit: 7.3, Profit: 4.1, ROI: 128.125%)

- [x] **Trade Service** (`src/lib/services/trade-service.ts`)
  - `syncTrades(walletAddress, userId): SyncResult` - Orchestrate full sync
  - `saveTrade(parsedTrade, userId, walletId): Trade` - Idempotent save
  - `updateWalletBalance(walletId, newBalance): Wallet`
  - `getLastSyncTimestamp(walletAddress): string | null`
  - Integrates with cashout calculator for recommendations

- [x] **API Route: Trade Refresh** (`src/app/api/trades/refresh/route.ts`)
  - POST `/api/trades/refresh` endpoint
  - Request body: `{ walletAddress: string }`
  - Response: `{ success, newTrades, updatedBalances }`
  - Error handling: 400 (invalid address), 401 (unauthorized), 404 (wallet not found), 429 (rate limit), 500 (internal)

**Deliverables:**

- ✅ Working Helius integration with rate limiting
- ✅ Trade detection and parsing logic (93 tests)
- ✅ API endpoint returns parsed trades with proper error handling
- ✅ Idempotent trade saving prevents duplicates
- ✅ Position closure detection when balance = 0

**Dependencies:** Day 3-4 (business logic)
**Blockers:** None - using environment variables for API key

---

### Day 7: Trade Service Layer

**Goal:** Complete trade sync service and API endpoint

#### Tasks

- [x] **Trade Service** (`src/lib/services/trade-service.ts`)
  - `syncTrades(walletAddress, userId)` - Orchestrate full sync from Helius
  - `saveTrade(parsedTrade, userId, walletId)` - Idempotent save with duplicate detection
  - `updateWalletBalance(walletId, newBalance)` - Update wallet after sync
  - `calculateCashoutForTrade()` - Integrate cashout calculator for recommendations
  - Helper functions for wallet lookup, existing trade checks, streak updates

- [x] **API Route: Trade Refresh** (`src/app/api/trades/refresh/route.ts`)
  - POST `/api/trades/refresh` endpoint
  - Request body: `{ walletAddress: string }`
  - Response: `{ success, newTrades, updatedBalances }`
  - Error handling: 400 (invalid address), 401 (unauthorized), 404 (wallet not found), 429 (rate limit), 500 (internal)

**Deliverables:**

- ✅ Trade sync service with idempotent operations
- ✅ API endpoint for refreshing trades from Helius
- ✅ Full error handling with proper HTTP status codes
- ✅ Integration with cashout calculator for trade recommendations

**Dependencies:** Day 1-6
**Blockers:** None

---

## Week 2: UI & User Flows (Days 8-14)

### Day 8-9: Wallet Setup Flow

**Goal:** First-time user onboarding

#### Tasks

- [ ] **Setup Page** (`src/app/setup/page.tsx`)
  - Form for trading wallet address
  - Form for vault wallet address
  - Validation (valid Solana addresses)
  - Save to database
  - Redirect to dashboard

- [ ] **UI Components**
  - `WalletAddressInput` component
  - Form validation with react-hook-form + Zod
  - Loading states
  - Error handling UI

**Deliverables:**

- ✅ Complete onboarding flow
- ✅ Wallet addresses saved to DB
- ✅ User redirected to dashboard

**Dependencies:** Week 1 (API routes, wallet service)
**Blockers:** None

---

### Day 10-11: Dashboard UI

**Goal:** Main dashboard with wallet balances and tier display

#### Tasks

- [ ] **Dashboard Page** (`src/app/dashboard/page.tsx`)
  - Fetch wallet balances on load
  - Display trading wallet (SOL + USD)
  - Display vault wallet (SOL + USD)
  - Show current tier badge
  - Refresh button to fetch new trades

- [ ] **UI Components**
  - `WalletCard` - Display wallet balance + tier
  - `TierBadge` - Color-coded tier indicator
  - `RefreshButton` - Manual refresh trigger
  - SOL/USD price conversion

- [ ] **Dashboard API** (`src/app/api/dashboard/route.ts`)
  - Aggregate endpoint for all dashboard data
  - Returns: wallets, current tier, recent trades, goal progress

**Deliverables:**

- ✅ Functional dashboard
- ✅ Real-time balance display
- ✅ Tier visualization

**Dependencies:** Day 8-9 (setup flow)
**Blockers:** None

---

### Day 12-13: Trade Detection & Cashout Flow

**Goal:** Core feature - detect trades and suggest cashouts

#### Tasks

- [ ] **Trade List Component** (`src/components/TradeList.tsx`)
  - Display recent trades
  - Show: token, ROI, profit, recommended cashout
  - Status indicators (pending, confirmed)

- [ ] **Cashout Card** (`src/components/CashoutCard.tsx`)
  - Trade summary
  - Cashout breakdown (tier, ROI bonus, streak)
  - Recommended amount (SOL + USD)
  - "Confirm Cashout" button

- [ ] **Cashout API** (`src/app/api/cashouts/[tradeId]/confirm/route.ts`)
  - POST to confirm cashout executed
  - Update wallet balances
  - Update trade status
  - Log cashout record

- [ ] **Toast Notifications**
  - Sonner integration
  - Notify when new trade detected
  - Confirm cashout success

**Deliverables:**

- ✅ Trade detection working
- ✅ Cashout suggestions displayed
- ✅ Cashout confirmation flow complete

**Dependencies:** Day 10-11 (dashboard)
**Blockers:** None

---

### Day 14: Trade History View

**Goal:** Historical trade logging and display

#### Tasks

- [ ] **Trade History Page** (`src/app/trades/page.tsx`)
  - Table view of all trades
  - Columns: Date, Token, Entry, Exit, ROI, Cashout %, Amount
  - Sortable columns
  - Filter by date range
  - Pagination (100 trades per page)

- [ ] **Trade History API** (`src/app/api/trades/route.ts`)
  - GET endpoint with pagination
  - Query params: page, limit, dateFrom, dateTo
  - Return formatted trade data

**Deliverables:**

- ✅ Trade history view working
- ✅ Sorting and filtering functional
- ✅ Pagination implemented

**Dependencies:** Day 12-13 (trade detection)
**Blockers:** None

---

## Week 3: Goal System & Polish (Days 15-21)

### Day 15-16: Goal Tracking System

**Goal:** Monthly cashout goals with progress tracking

#### Tasks

- [ ] **Goal Settings** (`src/lib/stores/goal-store.ts`)
  - Zustand store for goal state
  - Monthly goal amount (default $400)
  - Weekly/monthly progress

- [ ] **Goal API Routes**
  - `GET /api/goals` - Get current goal settings
  - `PUT /api/goals` - Update monthly goal
  - `POST /api/goals/boost` - Accept/decline weekly boost

- [ ] **Goal Service** (`src/lib/services/goal-service.ts`)
  - Calculate weekly pace (goal ÷ 4)
  - Track progress (sum of vault deposits)
  - Sunday check logic (detect if behind pace)
  - Calculate suggested boost percentage

- [ ] **Goal Progress Component** (`src/components/GoalProgress.tsx`)
  - Visual progress bar
  - Weekly/monthly breakdown
  - Behind/ahead indicator
  - Boost suggestion UI (if applicable)

**Deliverables:**

- ✅ Goal tracking functional
- ✅ Progress visualization
- ✅ Sunday boost suggestions

**Dependencies:** Week 2 (cashout flow)
**Blockers:** None

---

### Day 17: Sunday Goal Check & Boost System

**Goal:** Automated weekly goal check with boost suggestions

#### Tasks

- [ ] **Sunday Check Cron** (if using Vercel Cron or manual trigger)
  - Check if user is behind weekly pace
  - Calculate gap amount
  - Determine boost percentage (5%, 10%, 15%, 20%)
  - Store suggestion in database

- [ ] **Boost UI Flow**
  - Display boost suggestion on dashboard
  - "Accept" / "Decline" buttons
  - Apply boost multiplier if accepted
  - Track boost expiration (7 days)

- [ ] **Boost Integration in Cashout Calculator**
  - Update `cashout-calculator.ts` to include goal boost
  - `finalPercent = (baseRate + roiBonus) × streakMult × goalBoost`

**Deliverables:**

- ✅ Sunday check logic working
- ✅ Boost suggestions displayed
- ✅ Boost applied to cashouts

**Dependencies:** Day 15-16 (goal system)
**Blockers:** None

---

### Day 18-19: Error Handling & Loading States

**Goal:** Polish UX with proper error handling

#### Tasks

- [ ] **Error Boundaries**
  - React error boundaries for component failures
  - Fallback UI for errors

- [ ] **Loading States**
  - Skeleton loaders for dashboard
  - Loading spinners for API calls
  - Optimistic UI updates

- [ ] **Error Handling**
  - API error responses (standardized format)
  - Toast notifications for errors
  - Retry logic for failed requests
  - Validation error messages

- [ ] **Edge Case Handling**
  - Wallet address validation
  - Trade detection edge cases
  - Helius API rate limiting
  - Database connection errors

**Deliverables:**

- ✅ Graceful error handling
- ✅ Clear loading indicators
- ✅ User-friendly error messages

**Dependencies:** All previous features
**Blockers:** None

---

### Day 20: Testing & Bug Fixes

**Goal:** Comprehensive testing and bug squashing

#### Tasks

- [x] **Unit Tests (Vitest Setup Complete Day 3-4)**
  - Tier calculator tests (27 tests)
  - Cashout calculator tests (24 tests - all examples from spec)
  - Cashout helper tests (31 tests)
  - Tier helper tests (18 tests)
  - Utility tests (13 tests)
  - Error class tests (23 tests)
  - **Total: 136 unit tests passing**

- [ ] **Integration Tests**
  - API route tests (Supertest)
  - Database operations
  - Full trade flow (detect → calculate → confirm)

- [ ] **Manual Testing**
  - Test with real wallet addresses
  - Test with real Helius data
  - Verify calculations match spec
  - Test all user flows
  - Mobile responsive testing

- [ ] **Bug Fixes**
  - Fix any issues found during testing
  - Verify edge cases handled properly

**Deliverables:**

- ✅ All tests passing
- ✅ No critical bugs
- ✅ Mobile responsive

**Dependencies:** All features complete
**Blockers:** None

---

### Day 21: Deployment & Documentation

**Goal:** Ship to production

#### Tasks

- [ ] **Environment Setup**
  - Vercel production environment variables
  - Supabase production database
  - Enable RLS policies

- [ ] **Deployment**
  - Deploy to Vercel
  - Run database migrations
  - Smoke tests on production
  - Monitor error rates

- [ ] **Documentation**
  - Update README with setup instructions
  - API documentation
  - User guide (how to use the app)
  - Known limitations

- [ ] **Launch Prep**
  - Final user testing
  - Performance monitoring setup
  - Analytics setup (optional)

**Deliverables:**

- ✅ App live in production
- ✅ Documentation complete
- ✅ Monitoring active

**Dependencies:** Day 20 (testing complete)
**Blockers:** None

---

## Feature Priority Matrix

### Must-Have (P0) - MVP Blockers

- ✅ Database schema & setup
- ✅ Wallet management (setup + display)
- ✅ Helius API integration
- ✅ Trade detection & parsing
- ✅ Cashout calculation engine
- ✅ Cashout confirmation flow
- ✅ Dashboard UI
- ✅ Goal tracking system

### Should-Have (P1) - Important but not blocking

- ✅ Trade history view
- ✅ Sunday goal boost
- ✅ Error handling & loading states
- ✅ Toast notifications
- ⚠️ Mobile responsive design

### Nice-to-Have (P2) - Post-MVP

- ❌ Dark mode toggle
- ❌ Export trade history (CSV)
- ❌ Advanced analytics/charts
- ❌ Onboarding tutorial
- ❌ User settings page

---

## Risk Mitigation

### High-Risk Items

| Risk                        | Impact | Mitigation                                               | Owner   |
| --------------------------- | ------ | -------------------------------------------------------- | ------- |
| Helius API rate limits      | High   | Implement caching, monitor usage, upgrade plan if needed | Backend |
| Trade bundling logic errors | High   | Extensive unit tests, test with real data early          | Backend |
| Cashout calculation bugs    | High   | Verify against spec examples, peer review                | Backend |
| Database performance        | Medium | Proper indexing, monitor query times                     | Backend |

### Dependencies

| Feature         | Depends On                   | Critical Path? |
| --------------- | ---------------------------- | -------------- |
| Dashboard       | Wallet Setup                 | Yes            |
| Trade Detection | Helius Integration           | Yes            |
| Cashout Flow    | Trade Detection + Calculator | Yes            |
| Goal System     | Cashout Flow                 | Yes            |
| All UI          | Database + API Routes        | Yes            |

---

## Success Criteria

### Week 1 Complete

- [ ] Database fully functional
- [ ] All business logic modules working
- [ ] Helius integration successful
- [ ] API routes returning data

### Week 2 Complete

- [ ] User can complete setup flow
- [ ] Dashboard displays wallet balances
- [ ] Trades detected and displayed
- [ ] Cashout confirmation working
- [ ] Trade history viewable

### Week 3 Complete

- [ ] Goal tracking functional
- [ ] Sunday boost working
- [ ] All error states handled
- [ ] App deployed to production
- [ ] Documentation complete

### MVP Launch Ready

- [ ] All P0 features complete
- [ ] All P1 features complete
- [ ] Tests passing
- [ ] No critical bugs
- [ ] Performance acceptable (<2s page load)
- [ ] Mobile responsive

---

## Daily Standup Template

**What I completed yesterday:**

- [ ] Feature/task completed

**What I'm working on today:**

- [ ] Current task

**Blockers:**

- [ ] Any blockers or dependencies

**On track for timeline?**

- [ ] Yes / No (if no, explain)

---

## Notes

- This roadmap assumes 1 developer working full-time
- Adjust timeline if working part-time or with multiple developers
- Buffer days built into Week 3 for unexpected issues
- Can parallelize some tasks in Week 2 if needed
- Features can be swapped if priorities change

**Last Updated:** January 30, 2026
**Status:** In Progress 🟡

### Progress Update (Jan 30)

- ✅ Day 1-2: Database & Type System (Complete)
- ✅ Day 3-4: Core Business Logic (Complete - 136 unit tests passing)
- ⏳ Day 5-6: Helius API Integration (Next)
