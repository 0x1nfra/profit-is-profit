# Architecture Research: Profit is Profit (PisP)

**Research Date:** 2026-02-20
**Milestone:** Subsequent milestone - rebuilding with new API integration
**Dimension:** Architecture

---

## Executive Summary

Profit is Profit (PisP) is a Next.js-based Solana trading tool that automates profit-taking recommendations for meme coin traders. The architecture follows a classic three-tier pattern with Next.js App Router for both frontend and backend, Helius Wallet API for blockchain data, Solana wallet adapter for authentication, and Supabase for persistence.

**Key Architectural Decisions:**
- Next.js 16 with App Router for unified frontend/backend
- Server-side API routes for blockchain integration (avoids CORS, protects API keys)
- Zustand for lightweight client state management
- Supabase PostgreSQL for relational data with Row-Level Security
- Helius as single source of truth for blockchain data
- Stateless API design with database-driven state

---

## 1. System Components

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER BROWSER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ React Pages  │  │ UI Components│  │ Zustand Store│  │
│  │ (App Router) │  │ (shadcn/ui)  │  │ (Client)     │  │
│  └──────┬───────┘  └──────────────┘  └──────────────┘  │
│         │                                               │
└─────────┼───────────────────────────────────────────────┘
          │ HTTPS (fetch)
          ▼
┌─────────────────────────────────────────────────────────┐
│              NEXT.JS API ROUTES (Server)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ /api/trades  │  │ /api/wallets │  │ /api/goals   │  │
│  │   /refresh   │  │    /setup    │  │   /boost     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
│  ┌──────┴──────────────────┴──────────────────┴───────┐ │
│  │            Service Layer                            │ │
│  │  - trade-service.ts                                 │ │
│  │  - trade-parser.ts                                  │ │
│  │  - cashout-calculator.ts                            │ │
│  │  - tier-calculator.ts                               │ │
│  └──────┬────────────────────────────┬─────────────────┘ │
└─────────┼────────────────────────────┼───────────────────┘
          │                            │
    ┌─────┴─────┐              ┌───────┴────────┐
    │  Helius   │              │   Supabase     │
    │  Wallet   │              │   PostgreSQL   │
    │    API    │              │   + Auth       │
    └───────────┘              └────────────────┘
```

### 1.2 Component Boundaries

**Frontend (Client-Side)**
- **Pages**: Next.js App Router pages (`/src/app/*`)
- **Components**: Reusable UI components (`/src/components/ui/*`)
- **State Management**: Zustand stores for client state
- **Responsibilities**:
  - Render UI
  - Handle user interactions
  - Make API calls to backend
  - Display notifications (Sonner)
  - Manage local UI state (modals, forms)

**Backend (Server-Side API Routes)**
- **API Routes**: Next.js route handlers (`/src/app/api/*`)
- **Services**: Business logic orchestration (`/src/lib/services/*`)
- **Calculators**: Pure functions for business rules (`/src/lib/*-calculator.ts`)
- **Clients**: External API wrappers (`/src/lib/helius-client.ts`, `/src/lib/supabase.ts`)
- **Responsibilities**:
  - Authenticate requests (Supabase session)
  - Fetch blockchain data (Helius)
  - Parse and aggregate trades
  - Calculate cashout recommendations
  - Persist data (Supabase)
  - Rate limiting and error handling

**External Services**
- **Helius Wallet API**: Transaction history, token balances, SOL balance
- **Supabase**: Database, authentication, Row-Level Security
- **Future**: Price feeds (CoinGecko/Jupiter) for SOL/USD conversion

---

## 2. Data Flow

### 2.1 Authentication Flow

```
1. User clicks "Connect Wallet" (Solana wallet adapter)
   ├─> Frontend: WalletProvider detects wallet connection
   └─> Get wallet public key

2. Sign authentication message
   ├─> Frontend: wallet.signMessage(nonce)
   └─> Signature proves wallet ownership

3. Create/authenticate session
   ├─> POST /api/auth/login { publicKey, signature }
   ├─> Backend: Verify signature
   ├─> Backend: supabase.auth.signInWithPassword() or create user
   └─> Return session token

4. Store session
   ├─> Supabase client sets auth cookie
   └─> Frontend stores user context
```

**Key Decision**: Wallet-based auth (no email/password) for crypto-native UX.

### 2.2 Trade Sync Flow

```
1. User clicks "Refresh Trades" or auto-refresh triggers
   ├─> Frontend: POST /api/trades/refresh { walletAddress }
   └─> Include session cookie for auth

2. Backend authenticates request
   ├─> supabase.auth.getUser() from cookie
   └─> Extract userId

3. Fetch blockchain data
   ├─> helius.getTransactionHistory(walletAddress)
   ├─> helius.getTokenBalances(walletAddress)
   └─> helius.getSolBalance(walletAddress)

4. Parse trades
   ├─> trade-parser.parseTrades(transactions, walletAddress)
   ├─> Group by token mint
   ├─> Aggregate buys/sells
   ├─> Detect position closures (balance = 0)
   └─> Calculate net profit, ROI

5. Calculate cashout for each trade
   ├─> Get user's current tier (from wallet balance)
   ├─> Get losing streak (from user_state table)
   ├─> Get goal boost (from goal_settings table)
   ├─> cashout-calculator.calculateCashout(tier, roi, streak, boost)
   └─> Return recommended cashout %

6. Save new trades to database
   ├─> For each parsed trade:
   │   ├─> Check if trade exists (idempotent by token_mint + position_closed_at)
   │   └─> Insert if new
   └─> Update wallet balances, last_synced_at

7. Return response
   ├─> newTrades: Trade[]
   ├─> updatedBalances: { trading, vault }
   └─> lastSyncTimestamp: string

8. Frontend updates UI
   ├─> Show toast notification for new trades
   ├─> Update trade history table
   └─> Refresh dashboard stats
```

**Key Decisions**:
- **Pull-based sync**: User-initiated or scheduled, not real-time webhooks
- **Idempotency**: Duplicate trades prevented by unique constraint (token_mint + close_date)
- **Stateless API**: No in-memory caching, database is source of truth

### 2.3 Cashout Confirmation Flow

```
1. User reviews recommended cashout
   ├─> Trade card shows: "Cashout 1.5 SOL (45%) to vault"
   └─> Breakdown visible (base rate, ROI bonus, streak)

2. User clicks "Confirm Cashout"
   ├─> Frontend: POST /api/cashouts/:tradeId/confirm { amount }
   └─> Include session cookie

3. Backend validates and records
   ├─> Verify user owns trade
   ├─> Create cashout record in database
   ├─> Update trade status to "confirmed"
   ├─> Update wallet balances (trading -X, vault +X)
   └─> Update user_state (reset losing streak if profit)

4. Frontend updates
   ├─> Show success toast
   ├─> Remove trade from pending list
   ├─> Update balance display
   └─> Refresh goal progress
```

**Key Decision**: Cashout is a database operation only - user manually transfers SOL between wallets. Future versions could integrate with wallet adapter for automated transfers.

### 2.4 Goal System Flow

```
1. Weekly goal check (Sunday midnight cron or manual trigger)
   ├─> Calculate progress: vault deposits this week
   ├─> Compare to pace: (monthly_goal / 4)
   └─> Determine if behind or ahead

2. If behind pace
   ├─> Show boost suggestion: "Accept 1.5x cashout multiplier?"
   └─> User can accept or decline

3. If user accepts boost
   ├─> POST /api/goals/boost { accept: true }
   ├─> Backend: Set boost_active = true, boost_expires_at = +7 days
   └─> Frontend: Show boost badge on dashboard

4. Boost affects cashout calculation
   ├─> calculateCashout() multiplies final % by boost_multiplier
   └─> Boost shown in trade breakdown
```

---

## 3. Major Components and Connections

### 3.1 Frontend Components

**Page Components** (`/src/app/*/page.tsx`)
```
/dashboard (main)
  ├─> Fetches /api/dashboard { wallets, trades, goals }
  ├─> Displays WalletCards, GoalProgress, TradeList
  └─> Polls /api/trades/refresh on interval

/setup (first-time)
  ├─> POST /api/wallets/setup { tradingAddress, vaultAddress }
  └─> Redirects to /dashboard

/trades (history)
  ├─> GET /api/trades?limit=50&offset=0
  └─> Displays TradeHistoryTable with pagination
```

**UI Components** (`/src/components/ui/*`)
```
WalletCard
  ├─> Props: { balance, tier, walletType }
  └─> Displays balance in SOL/USD, tier badge

TradeCard
  ├─> Props: { trade, onConfirm }
  ├─> Shows token, ROI, profit, cashout recommendation
  └─> Breakdown tooltip (hover for calculation details)

GoalProgressBar
  ├─> Props: { current, goal, pace }
  └─> Visual progress bar with ahead/behind indicator

CashoutDialog
  ├─> Props: { trade, onConfirm, onOverride }
  ├─> Modal for confirming or overriding cashout
  └─> Form with manual amount input
```

**Zustand Stores** (`/src/stores/*`)
```
useWalletStore
  ├─> State: { tradingWallet, vaultWallet, balances }
  └─> Actions: { setWallets, updateBalances }

useTradeStore
  ├─> State: { trades, pendingTrades, isRefreshing }
  └─> Actions: { refreshTrades, confirmCashout }

useGoalStore
  ├─> State: { monthlyGoal, progress, boostActive }
  └─> Actions: { updateGoal, acceptBoost }
```

### 3.2 Backend Services

**API Routes** (`/src/app/api/*/route.ts`)
```
/api/trades/refresh [POST]
  ├─> Auth: Supabase session
  ├─> Calls: syncTrades(walletAddress, userId)
  └─> Returns: { newTrades, updatedBalances }

/api/wallets/setup [POST]
  ├─> Auth: Supabase session
  ├─> Creates: trading + vault wallet records
  └─> Returns: { wallets }

/api/cashouts/confirm [POST]
  ├─> Auth: Supabase session
  ├─> Creates: cashout record
  ├─> Updates: wallet balances, trade status
  └─> Returns: { success }

/api/goals/boost [POST]
  ├─> Auth: Supabase session
  ├─> Updates: goal_settings.boost_active
  └─> Returns: { boost }
```

**Service Layer** (`/src/lib/services/trade-service.ts`)
```
syncTrades(walletAddress, userId)
  ├─> Orchestrates entire sync flow
  ├─> Calls: getTransactionHistory(), parseTrades(), saveTrade()
  ├─> Idempotent: Skips existing trades
  └─> Returns: SyncResult

saveTrade(parsedTrade, userId, walletId)
  ├─> Gets user context (tier, streak, boost)
  ├─> Calls: calculateCashout()
  ├─> Inserts trade with all calculated fields
  └─> Returns: Trade
```

**Calculators** (Pure Functions)
```
cashout-calculator.ts
  ├─> calculateCashout(input): CashoutResult
  ├─> Pure function (no side effects)
  └─> Fully tested (24 unit tests)

trade-parser.ts
  ├─> parseTrades(transactions, wallet): ParsedTrade[]
  ├─> Stateless aggregation logic
  └─> Fully tested (trade-parser.test.ts)

tier-calculator.ts
  ├─> calculateTier(balance): Tier
  └─> Simple boundary logic
```

**External Clients**
```
helius-client.ts
  ├─> getTransactionHistory(address): HeliusTransaction[]
  ├─> getTokenBalances(address): TokenBalance[]
  ├─> getSolBalance(address): number
  ├─> Rate limiting: 10 req/sec
  └─> Retry logic: exponential backoff, max 3 retries

supabase.ts
  ├─> supabase (client-side): For auth, realtime
  ├─> supabaseAdmin (server-side): For API routes
  └─> Query helpers: tradesQuery(), walletsQuery()
```

### 3.3 Database Schema (Supabase)

**Tables**
```
users
  ├─> Minimal user record (id, email)
  └─> Created during wallet authentication

wallets
  ├─> Trading wallet (with tier tracking)
  ├─> Vault wallet (accumulator)
  └─> 1:2 relationship (user has 2 wallets)

trades
  ├─> Parsed trade records
  ├─> Includes cashout calculation fields
  └─> Many:1 relationship (user has many trades)

cashouts
  ├─> Confirmed cashout actions
  ├─> Links trade to balance updates
  └─> Audit trail

goal_settings
  ├─> Monthly goal target
  ├─> Boost state (active, expires_at)
  └─> 1:1 relationship (one per user)

user_state
  ├─> Losing streak counter
  ├─> Last trade timestamp
  └─> 1:1 relationship (one per user)
```

**Key Constraints**
```sql
-- Prevent duplicate trades
UNIQUE(user_id, token_mint, position_closed_at)

-- One wallet per type per user
UNIQUE(user_id, wallet_type)

-- One goal setting per user
UNIQUE(user_id) ON goal_settings

-- Tier boundaries
CHECK (current_tier >= 1 AND current_tier <= 5)
```

---

## 4. Suggested Build Order

### Phase 1: Foundation (Dependencies: None)

**Week 1: Database + Core Logic**
1. Set up Supabase project, apply schema migrations
2. Implement pure calculation functions:
   - `tier-calculator.ts` (no dependencies)
   - `cashout-calculator.ts` (no dependencies)
3. Write unit tests for calculators (100% coverage)
4. Implement `helius-client.ts` with rate limiting
5. Write Helius integration tests (mock API)

**Why first**: Pure functions and external clients have no internal dependencies.

### Phase 2: Backend Services (Dependencies: Phase 1)

**Week 2: API + Service Layer**
1. Implement `trade-parser.ts` (depends on helius-client)
2. Write trade parser tests
3. Implement `trade-service.ts` (orchestration layer)
   - `syncTrades()`: Depends on helius-client, trade-parser, calculators
   - `saveTrade()`: Depends on calculators, supabase
4. Implement API routes:
   - `/api/trades/refresh` (depends on trade-service)
   - `/api/wallets/setup` (depends on supabase)
5. Test API endpoints (integration tests)

**Why second**: Service layer depends on calculators and clients.

### Phase 3: Authentication (Dependencies: Phase 1)

**Week 2-3: Auth Flow**
1. Set up Solana wallet adapter provider
2. Implement wallet connection UI
3. Implement signature verification API route
4. Implement session management (Supabase auth)
5. Add auth middleware to API routes

**Why third**: Can be developed in parallel with Phase 2, but not critical path for logic testing.

### Phase 4: Frontend UI (Dependencies: Phases 2-3)

**Week 3-4: Core UI**
1. Implement page layouts:
   - `/dashboard` (depends on API routes)
   - `/setup` (depends on wallet setup API)
2. Implement UI components:
   - `WalletCard` (display only, no dependencies)
   - `TradeCard` (depends on trade data structure)
   - `GoalProgressBar` (display only)
3. Implement Zustand stores (depends on API contracts)
4. Wire up data fetching and state updates
5. Add error handling and loading states

**Why fourth**: UI depends on working backend APIs.

### Phase 5: Cashout Flow (Dependencies: Phases 1-4)

**Week 4: Cashout Confirmation**
1. Implement `/api/cashouts/confirm` route
2. Implement `CashoutDialog` component
3. Add balance update logic in service layer
4. Wire up frontend confirmation flow
5. Test end-to-end cashout flow

**Why fifth**: Cashout depends on trades existing in database.

### Phase 6: Goal System (Dependencies: Phases 1-4)

**Week 5: Goals + Boost**
1. Implement goal tracking logic
2. Implement `/api/goals/boost` route
3. Implement Sunday check logic (cron or manual)
4. Add goal UI components
5. Test goal boost affecting cashout calculation

**Why sixth**: Goal system is independent feature, not blocking core flows.

### Phase 7: Polish (Dependencies: All previous)

**Week 6: Testing + Deployment**
1. End-to-end testing (manual or Playwright)
2. Error handling and edge cases
3. Responsive design and mobile optimization
4. Performance optimization (caching, debouncing)
5. Deploy to Vercel, configure environment variables

**Why last**: Polish depends on all features being functional.

---

## 5. Build Order Dependencies Graph

```
Phase 1: Foundation
  ├─> tier-calculator.ts
  ├─> cashout-calculator.ts
  ├─> helius-client.ts
  └─> supabase.ts

Phase 2: Backend Services (depends on Phase 1)
  ├─> trade-parser.ts (depends on helius-client)
  ├─> trade-service.ts (depends on parser, calculators, supabase)
  └─> /api/trades/refresh (depends on trade-service)

Phase 3: Authentication (depends on Phase 1 - supabase)
  ├─> Wallet adapter setup
  ├─> /api/auth/login (depends on supabase)
  └─> Auth middleware

Phase 4: Frontend UI (depends on Phases 2-3)
  ├─> Page layouts
  ├─> UI components
  └─> Zustand stores

Phase 5: Cashout Flow (depends on Phase 4)
  ├─> /api/cashouts/confirm
  └─> CashoutDialog component

Phase 6: Goal System (depends on Phase 4)
  ├─> /api/goals/boost
  └─> Goal UI components

Phase 7: Polish (depends on all)
  ├─> E2E tests
  ├─> Error handling
  └─> Deployment
```

**Critical Path**: Phase 1 → Phase 2 → Phase 4 → Phase 5
**Parallel Tracks**: Phase 3 can overlap with Phase 2; Phase 6 can overlap with Phase 5

---

## 6. Key Architectural Patterns

### 6.1 Design Patterns Used

**Service Layer Pattern**
- `trade-service.ts` orchestrates complex operations
- Separates business logic from API routes
- Easier to test in isolation

**Repository Pattern** (Implicit)
- Supabase query helpers abstract database access
- `walletsQuery()`, `tradesQuery()` provide consistent interface

**Strategy Pattern**
- Cashout calculation varies by tier, streak, boost
- Encapsulated in pure function with input object

**Facade Pattern**
- `helius-client.ts` provides simple interface over complex Helius API
- Handles rate limiting, retries, error formatting internally

### 6.2 Architectural Principles

**Separation of Concerns**
- Frontend: UI rendering, user interaction
- API Routes: HTTP handling, auth, validation
- Service Layer: Business logic orchestration
- Calculators: Pure business rules
- Clients: External service integration

**Single Responsibility**
- Each module has one clear purpose
- `trade-parser.ts`: Only parses trades
- `cashout-calculator.ts`: Only calculates cashout
- `helius-client.ts`: Only talks to Helius

**Dependency Inversion**
- High-level services depend on abstractions (types)
- `trade-service` depends on `Trade`, `ParsedTrade` interfaces
- Not tightly coupled to Supabase schema

**Testability**
- Pure functions for core logic (no side effects)
- 229 unit tests covering calculators, parsers, helpers
- Easy to mock external clients (Helius, Supabase)

### 6.3 State Management Strategy

**Server State** (Supabase)
- User profiles, wallets, trades, cashouts, goals
- Source of truth for all persistent data
- No client-side caching (always fetch fresh)

**Client State** (Zustand)
- UI state: modals, forms, loading states
- Temporary optimistic updates (rollback on error)
- Auth state: current user, session

**URL State** (Next.js)
- Pagination: `/trades?page=2`
- Filters: `/trades?status=pending`
- Deep linking for specific trades

**No Global Caching**
- Fresh data on every request (simple, correct)
- Trade-off: More API calls vs. data consistency
- Future: Add SWR or React Query for smart caching

---

## 7. Integration Points

### 7.1 Helius Wallet API

**Endpoints Used**
```
POST /v0/addresses/:address/transactions
  ├─> Returns: Transaction history with parsed swap data
  └─> Rate limit: 150 req/min (free tier)

POST /v0/addresses/:address/balances
  ├─> Returns: Current token balances
  └─> Used to detect position closures

POST /v0/addresses/:address
  ├─> Returns: SOL balance (lamports)
  └─> Used to update wallet balance and calculate tier
```

**Error Handling**
- 429 Rate Limit: Exponential backoff, max 3 retries
- 5xx Server Error: Retry with jitter
- 4xx Client Error: Fail fast, don't retry
- Network Error: Retry once

**Data Mapping**
```typescript
HeliusTransaction → ParsedTrade
  ├─> Extract: tokenMint, tokenSymbol
  ├─> Aggregate: buys (total_entry_sol), sells (total_exit_sol)
  ├─> Calculate: net_profit_sol, roi_percent
  └─> Detect: position_closed (current balance = 0)
```

### 7.2 Supabase Integration

**Authentication**
```
Session-based auth (cookie)
  ├─> supabase.auth.getUser() extracts userId from cookie
  ├─> Row-Level Security enforces user_id = auth.uid()
  └─> No user can access another user's data
```

**Database Queries**
```
Insert Trade (idempotent)
  ├─> INSERT INTO trades (...) ON CONFLICT (user_id, token_mint, position_closed_at) DO NOTHING
  └─> Returns affected rows (0 if duplicate)

Update Wallet Balance
  ├─> UPDATE wallets SET balance_sol = $1, updated_at = NOW() WHERE id = $2
  └─> Atomic operation (no race conditions)

Get User State
  ├─> SELECT current_losing_streak FROM user_state WHERE user_id = $1
  └─> Used in cashout calculation
```

**Realtime (Future)**
```
supabase
  .channel('trades')
  .on('INSERT', payload => showNewTradeToast(payload.new))
  .subscribe()
```

### 7.3 Solana Wallet Adapter

**Used For**
- Wallet connection (Phantom, Solflare, etc.)
- Signing authentication messages
- Reading wallet public key

**NOT Used For** (MVP)
- Sending transactions
- Transferring SOL (manual for MVP)
- Smart contract interaction

**Integration**
```tsx
<WalletProvider wallets={[new PhantomWalletAdapter()]}>
  <WalletModalProvider>
    {children}
  </WalletModalProvider>
</WalletProvider>
```

---

## 8. Scalability Considerations

### 8.1 Current Bottlenecks

**Helius API Rate Limit**
- Free tier: 150 req/min, 10k req/day
- Refresh flow uses ~3 requests (history, balances, SOL)
- Max ~3,000 refreshes/day per API key
- Mitigation: Rate limiter in client, exponential backoff

**Database Queries**
- Trade history grows linearly with user activity
- No pagination on `/api/trades` (returns all)
- Future: Add LIMIT/OFFSET or cursor pagination

**Sync Performance**
- Fetching 100 transactions + parsing can take 2-5 seconds
- Future: Background job queue (Vercel Cron, Inngest)

### 8.2 Scaling Strategy

**Phase 1: Vertical (Current)**
- Optimize queries (add indexes)
- Cache SOL/USD price for 5 minutes
- Reduce Helius requests (skip unchanged data)

**Phase 2: Horizontal (Future)**
- Multiple Helius API keys (round-robin)
- Supabase connection pooling (Supavisor)
- CDN for static assets (Vercel built-in)

**Phase 3: Architecture Changes (Future)**
- Move trade sync to background workers (Inngest, BullMQ)
- Add Redis for caching (Upstash)
- Use Helius webhooks for real-time updates (avoid polling)

---

## 9. Security Architecture

### 9.1 Threat Model

**Attack Vectors**
1. **Unauthorized data access**: User A reads User B's trades
   - Mitigation: Supabase Row-Level Security
2. **API key exposure**: Helius key leaked in frontend
   - Mitigation: Server-side API routes only
3. **Session hijacking**: Stolen auth cookie
   - Mitigation: HttpOnly cookies, SameSite=Strict
4. **SQL injection**: Malicious input in queries
   - Mitigation: Parameterized queries (Supabase client)

**Non-Threats (MVP)**
- Private key theft (no keys stored)
- Smart contract exploits (no contract interaction)
- Phishing (no transactions sent)

### 9.2 Security Layers

**Layer 1: Network**
- HTTPS everywhere (Vercel enforced)
- CORS configured (only allow same-origin)

**Layer 2: Authentication**
- Wallet signature verification (prove ownership)
- Session cookies (HttpOnly, Secure, SameSite)

**Layer 3: Authorization**
- Row-Level Security on all tables
- API routes check `auth.uid() = user_id`

**Layer 4: Input Validation**
- Zod schemas for API request bodies
- Solana address validation (base58, length)

**Layer 5: Data Privacy**
- No PII collected (only wallet addresses)
- User can delete all data (GDPR compliant)

---

## 10. Monitoring and Observability

### 10.1 Logging Strategy

**Current Logging**
```typescript
// Helius requests
logHeliusRequest(method, endpoint, body)
logHeliusResponse(endpoint, status)

// API routes
console.error('Trade sync failed:', error)

// Service layer
console.log('Synced trades for user:', userId)
```

**Future Enhancements**
- Structured logging (Winston, Pino)
- Log levels (DEBUG, INFO, WARN, ERROR)
- Request tracing (correlation IDs)
- Error aggregation (Sentry)

### 10.2 Metrics to Track

**Business Metrics**
- Daily active users (unique wallet connections)
- Trade sync frequency (refreshes per user per day)
- Cashout confirmation rate (confirmed / total trades)
- Goal achievement rate (users hitting monthly target)

**Technical Metrics**
- API response times (p50, p95, p99)
- Helius API usage (requests per day, rate limit hits)
- Database query performance (slow queries > 1s)
- Error rates (5xx per endpoint)

**Future: Dashboards**
- Vercel Analytics (built-in)
- Grafana + Prometheus (self-hosted)
- Supabase dashboard (database metrics)

---

## 11. Future Architecture Evolution

### 11.1 Short-Term Improvements (3-6 months)

**Background Sync**
- Move trade refresh to cron job (Vercel Cron or Inngest)
- Sync all users every 15 minutes
- Push notifications for new trades (Pushover, Telegram)

**Smart Caching**
- Cache Helius responses for 30 seconds (Redis)
- Cache SOL price for 5 minutes
- SWR on frontend for stale-while-revalidate

**Real-Time Updates**
- Use Helius webhooks instead of polling
- Supabase Realtime for live balance updates
- WebSocket connection for instant notifications

### 11.2 Long-Term Vision (6-12 months)

**Automated Cashouts**
- Integrate Solana wallet adapter for transaction sending
- User approves transaction, app executes transfer
- Track on-chain cashout status

**Multi-Chain Support**
- Abstract blockchain client (interface)
- Add Ethereum, Base, Arbitrum support
- Unified trade detection across chains

**Advanced Analytics**
- Performance metrics (Sharpe ratio, win rate)
- Token leaderboard (most profitable tokens)
- Portfolio allocation recommendations

**Social Features**
- Share trade results (optional)
- Leaderboard (anonymous)
- Community goals (group challenges)

---

## 12. Decision Log

### 12.1 Key Architectural Decisions

**Decision 1: Next.js App Router vs. Separate Backend**
- **Chosen**: Next.js App Router (unified)
- **Alternative**: Express.js + React SPA
- **Reasoning**: Simpler deployment, better SEO, API routes colocated
- **Trade-offs**: Less flexible than microservices, Vercel lock-in

**Decision 2: Supabase vs. Self-Hosted PostgreSQL**
- **Chosen**: Supabase (managed)
- **Alternative**: Railway Postgres, Neon, self-hosted
- **Reasoning**: Built-in auth, Row-Level Security, generous free tier
- **Trade-offs**: Vendor lock-in, less control over DB tuning

**Decision 3: Zustand vs. Redux vs. Context**
- **Chosen**: Zustand
- **Alternative**: Redux Toolkit, React Context, Jotai
- **Reasoning**: Lightweight, minimal boilerplate, TypeScript-friendly
- **Trade-offs**: Less middleware support than Redux

**Decision 4: Client-Side Wallet Auth vs. Traditional Auth**
- **Chosen**: Wallet signature authentication
- **Alternative**: Email/password, social login
- **Reasoning**: Crypto-native UX, no email required, wallet = identity
- **Trade-offs**: Higher barrier for non-crypto users

**Decision 5: Pull-Based Sync vs. Webhook Push**
- **Chosen**: Pull-based (user-initiated refresh)
- **Alternative**: Helius webhooks for real-time
- **Reasoning**: Simpler MVP, no webhook infrastructure needed
- **Trade-offs**: Not real-time, requires manual refresh

### 12.2 Deferred Decisions

**Not Yet Decided**
- Price feed provider (CoinGecko vs. Jupiter vs. Pyth)
- Background job queue (Vercel Cron vs. Inngest vs. BullMQ)
- Error monitoring (Sentry vs. LogRocket vs. Highlight)
- E2E testing framework (Playwright vs. Cypress vs. none)

---

## 13. Risks and Mitigations

### 13.1 Technical Risks

**Risk 1: Helius API Changes**
- **Impact**: Trade parsing breaks, no new data
- **Likelihood**: Medium (API versioned, but format can change)
- **Mitigation**: Version pinning, regression tests, fallback to raw RPC

**Risk 2: Supabase Downtime**
- **Impact**: No data access, users can't refresh trades
- **Likelihood**: Low (99.9% SLA)
- **Mitigation**: Show cached data, queue writes, status page

**Risk 3: Rate Limit Exhaustion**
- **Impact**: Users can't refresh trades during peak hours
- **Likelihood**: Medium (free tier limited)
- **Mitigation**: Upgrade to paid tier, multiple API keys, user rate limiting

### 13.2 Product Risks

**Risk 1: Inaccurate Trade Detection**
- **Impact**: Missing trades, incorrect profit calculations
- **Likelihood**: Medium (complex parsing logic)
- **Mitigation**: Manual override, extensive testing, user feedback loop

**Risk 2: Poor User Adoption**
- **Impact**: Product doesn't find PMF
- **Likelihood**: Unknown
- **Mitigation**: Launch MVP fast, iterate on feedback, A/B test features

---

## 14. Testing Strategy

### 14.1 Current Test Coverage

**Unit Tests** (229 tests passing)
- `tier-calculator.test.ts`: 27 tests (all tier boundaries)
- `cashout-calculator.test.ts`: 24 tests (all calculation scenarios)
- `trade-parser.test.ts`: Trade aggregation logic
- `helius-helpers.test.ts`: Rate limiting, retries, validation
- `cashout-helpers.test.ts`, `tier-helpers.test.ts`, `trade-helpers.test.ts`

**Integration Tests** (Planned)
- API routes with mocked Supabase and Helius
- Full sync flow: fetch → parse → calculate → save

**E2E Tests** (Future)
- User flow: connect wallet → refresh trades → confirm cashout
- Goal flow: accept boost → see increased cashout

### 14.2 Test Pyramid

```
      E2E Tests (Manual/Playwright)
         /            \
        /              \
    Integration Tests   \
    (API Routes)         \
   /                      \
  /                        \
Unit Tests (Calculators, Parsers)
```

**Current**: Strong base of unit tests
**Next**: Add integration tests for API routes
**Future**: Automate E2E tests (optional)

---

## 15. Deployment Architecture

### 15.1 Production Environment

**Hosting**
- Vercel (Next.js app)
- Supabase Cloud (database + auth)
- Helius (blockchain data)

**Environment Variables**
```bash
# Public (exposed to browser)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

# Private (server-side only)
SUPABASE_SERVICE_ROLE_KEY
HELIUS_API_KEY
```

**Deployment Pipeline**
```
1. Push to GitHub (main branch)
2. Vercel auto-builds and deploys
3. Run database migrations (manual for MVP)
4. Smoke test (curl /api/health-check)
5. Monitor error rates (Vercel logs)
```

### 15.2 Environments

**Development**
- `localhost:3000`
- Local Supabase (optional, or use dev project)
- Helius dev API key

**Staging** (Future)
- `staging.pisp.app`
- Supabase staging project
- Separate Helius key

**Production**
- `pisp.app`
- Supabase production project
- Production Helius key

---

## Conclusion

The Profit is Profit architecture follows a pragmatic, monolithic Next.js pattern optimized for rapid MVP development. Key strengths include:

1. **Unified Stack**: Single Next.js codebase for frontend and backend reduces complexity
2. **Stateless Design**: Database-driven state, no in-memory caching simplifies reasoning
3. **Pure Business Logic**: Calculation functions are testable, composable, and well-covered
4. **Secure by Default**: Supabase RLS, server-side API keys, wallet-based auth
5. **Scalable Foundation**: Clear upgrade path to background jobs, webhooks, caching

The suggested build order (Foundation → Backend → Auth → Frontend → Features → Polish) ensures dependencies are resolved sequentially while allowing parallelization where possible.

This architecture supports the current MVP scope and provides clear evolution paths for future features like automated cashouts, real-time updates, and multi-chain support.

---

**Document Metadata**
- Version: 1.0
- Author: AI Research Assistant
- Date: 2026-02-20
- Status: Complete
- Related Docs: `/docs/techincal-design.md`, `/docs/roadmap.md`, `/docs/prd.md`
