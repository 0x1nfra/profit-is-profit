# Technical Design & MVP Specification

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────┐
│   User Browser  │
│   (Next.js App) │
└────────┬────────┘
         │
         │ HTTPS
         ▼
┌─────────────────────────┐
│   Vercel (Hosting)      │
│  ┌──────────────────┐   │
│  │  Next.js API     │   │
│  │  Routes          │   │
│  └────────┬─────────┘   │
└───────────┼─────────────┘
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
┌─────────┐    ┌──────────┐
│ Helius  │    │ Supabase │
│   API   │    │   (DB)   │
└─────────┘    └──────────┘
```

### 1.2 Component Breakdown

**Frontend (Next.js Client)**

- React components (UI)
- Client-side state management
- API calls to Next.js backend
- Toast notifications
- Real-time balance updates

**Backend (Next.js API Routes)**

- Authentication middleware
- Helius API integration
- Trade parsing logic
- Cashout calculations
- Database operations

**Database (Supabase PostgreSQL)**

- User profiles
- Wallet configurations
- Trade history
- Cashout logs
- Goal tracking

**External Services**

- Helius API: Solana transaction data
- CoinGecko/Jupiter: Price data (SOL/USD)

---

## 2. Technology Stack Details

### 2.1 Frontend Stack

```json
{
  "framework": "Next.js 14",
  "language": "TypeScript",
  "styling": "Tailwind CSS",
  "ui-components": "shadcn/ui",
  "state": "Zustand",
  "forms": "React Hook Form",
  "notifications": "Sonner",
  "charts": "Recharts",
  "icons": "Lucide React"
}
```

### 2.2 Backend Stack

```json
{
  "runtime": "Node.js 20+",
  "framework": "Next.js API Routes",
  "database": "PostgreSQL (Supabase)",
  "orm": "Prisma",
  "validation": "Zod",
  "api-client": "Axios"
}
```

### 2.3 Testing Stack

```json
{
  "test-runner": "Vitest",
  "test-environment": "jsdom",
  "react-testing": "@testing-library/react",
  "user-events": "@testing-library/user-event",
  "matchers": "@testing-library/jest-dom",
  "coverage": "@vitest/coverage-v8",
  "mocks": "vitest-mock-extended"
}
```

**Test Configuration:**

- 229 unit tests covering core business logic, Helius integration, and trade parsing
- Tests for tier calculator (27 tests), cashout calculator (24 tests), and helpers (124 tests)
- Helius client tests with rate limiting and retry logic
- Trade parser tests for transaction aggregation and profit calculation
- React component tests with RTL (ready for future UI testing)
- Coverage reporting with v8 provider
- Next.js path aliases (`@/*`) configured
- All tests passing with `pnpm test`

### 2.4 DevOps & Deployment

```json
{
  "hosting": "Vercel",
  "database-hosting": "Supabase Cloud",
  "env-management": "Vercel Environment Variables",
  "ci-cd": "Vercel Git Integration",
  "monitoring": "Vercel Analytics",
  "logging": "Console + Sentry (optional)"
}
```

---

## 3. Database Schema

### 3.1 ERD Overview

```
users
  ├── wallets (1:many)
  ├── trades (1:many)
  ├── cashouts (1:many)
  └── goal_settings (1:1)
```

### 3.2 Table Schemas

**users**

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT UNIQUE, -- optional for auth
  username TEXT UNIQUE -- optional
);
```

**wallets**

```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_type TEXT NOT NULL, -- 'trading' or 'vault'
  address TEXT NOT NULL,
  balance_sol DECIMAL(18,9) DEFAULT 0,
  balance_usd DECIMAL(18,2) DEFAULT 0,
  current_tier INTEGER, -- 1-5, only for trading wallet
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, wallet_type)
);
```

**trades**

```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trading_wallet_id UUID REFERENCES wallets(id),

  -- Trade identification
  token_mint TEXT NOT NULL,
  token_symbol TEXT,

  -- Aggregated trade data
  total_entry_sol DECIMAL(18,9) NOT NULL,
  total_exit_sol DECIMAL(18,9) NOT NULL,
  net_profit_sol DECIMAL(18,9) NOT NULL,
  roi_percent DECIMAL(10,2) NOT NULL,

  -- Tier & streak at trade time
  tier_at_trade INTEGER NOT NULL,
  losing_streak_at_trade INTEGER NOT NULL,

  -- Cashout calculation
  base_cashout_percent DECIMAL(5,2) NOT NULL,
  roi_bonus_percent DECIMAL(5,2) NOT NULL,
  streak_multiplier DECIMAL(3,2) NOT NULL,
  goal_boost_multiplier DECIMAL(3,2) DEFAULT 1.0,
  final_cashout_percent DECIMAL(5,2) NOT NULL,
  recommended_cashout_sol DECIMAL(18,9) NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending', -- pending, confirmed, overridden
  actual_cashout_sol DECIMAL(18,9), -- if user overrides

  -- Timestamps
  position_opened_at TIMESTAMPTZ,
  position_closed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);
```

**cashouts**

```sql
CREATE TABLE cashouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES trades(id),

  amount_sol DECIMAL(18,9) NOT NULL,
  amount_usd DECIMAL(18,2) NOT NULL,
  sol_price_at_cashout DECIMAL(18,2) NOT NULL,

  from_wallet_id UUID REFERENCES wallets(id),
  to_wallet_id UUID REFERENCES wallets(id),

  status TEXT DEFAULT 'pending', -- pending, confirmed
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**goal_settings**

```sql
CREATE TABLE goal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  monthly_goal_usd DECIMAL(18,2) DEFAULT 400.00,
  current_month_progress_usd DECIMAL(18,2) DEFAULT 0,
  current_month DATE DEFAULT DATE_TRUNC('month', NOW()),

  -- Goal boost tracking
  boost_active BOOLEAN DEFAULT FALSE,
  boost_percent DECIMAL(5,2) DEFAULT 0,
  boost_activated_at TIMESTAMPTZ,
  boost_expires_at TIMESTAMPTZ,

  last_sunday_check TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**user_state**

```sql
CREATE TABLE user_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  current_losing_streak INTEGER DEFAULT 0,
  last_trade_at TIMESTAMPTZ,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 Indexes

```sql
-- Performance indexes
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_created_at ON trades(created_at DESC);
CREATE INDEX idx_cashouts_user_id ON cashouts(user_id);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
```

---

## 4. API Design

### 4.1 API Routes

**Authentication**

- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - User login (optional for MVP)

**Wallet Management**

- `POST /api/wallets/setup` - Initial wallet setup
- `GET /api/wallets` - Get user's wallets
- `PUT /api/wallets/:id` - Update wallet address

**Trade Detection**

- `POST /api/trades/refresh` - Fetch and parse new trades from Helius
- `GET /api/trades` - Get trade history
- `GET /api/trades/:id` - Get specific trade details

**Cashout Management**

- `POST /api/cashouts/:tradeId/confirm` - Confirm cashout executed
- `PUT /api/cashouts/:id/override` - Manual override cashout amount

**Goals**

- `GET /api/goals` - Get current goal settings
- `PUT /api/goals` - Update monthly goal
- `POST /api/goals/boost` - Accept/decline weekly boost

**Dashboard**

- `GET /api/dashboard` - Get all dashboard data (wallets, goals, recent trades)

### 4.2 Example API Contract

**POST /api/trades/refresh**

Request:

```json
{
  "walletAddress": "7xKxy..."
}
```

Response:

```json
{
  "success": true,
  "newTrades": [
    {
      "id": "uuid",
      "tokenSymbol": "$ROCK",
      "roi": 128.5,
      "netProfit": 4.1,
      "recommendedCashout": 1.845,
      "cashoutPercent": 45,
      "tier": 3,
      "status": "pending"
    }
  ],
  "updatedBalance": {
    "trading": 7.5,
    "vault": 25.3
  }
}
```

---

## 5. Helius API Integration

### 5.1 API Endpoints Used

**Get Transaction History**

```
GET https://api.helius.xyz/v0/addresses/{address}/transactions
?api-key={key}
&limit=100
&before={beforeTx}
```

**Get Token Balances**

```
GET https://api.helius.xyz/v0/addresses/{address}/balances
?api-key={key}
```

### 5.2 Transaction Parsing Logic

**Implementation Files:**

- `src/lib/trade-parser.ts` - Main parsing logic with `parseTrades()` and `aggregateTokenTransactions()`
- `src/lib/helpers/trade-helpers.ts` - Helper functions for swap detection, profit calculation, and data extraction

**Filter Criteria:**

```javascript
// Detect swap transactions (DEX trades)
isSwapTransaction(tx) checks for:
- tx.type === "SWAP" || tx.type === "swap"
- tx.swap.tokenInputs || tx.swap.tokenOutputs
- Both token and native transfers present
- DEX sources: JUPITER, RAYDIUM, ORCA, METEORA, PHOENIX, PUMP_FUN

// Group by token mint
groupBy(transactions, (tx) => tx.tokenMint);

// Aggregate entry/exit per token
const trades = tokens
  .map((tokenMint) => {
    const txs = getTransactionsForToken(tokenMint);
    const entryTransfers = extractNativeTransfers(txs, 'out'); // SOL spent
    const exitTransfers = extractNativeTransfers(txs, 'in');   // SOL received

    const totalEntry = sum(entryTransfers.map((t) => t.amount));
    const totalExit = sum(exitTransfers.map((t) => t.amount));
    const netProfit = calculateNetProfit(totalEntry, totalExit);
    const roi = calculateTradeROI(totalEntry, totalExit);

    // Check if position closed (balance = 0)
    const currentBalance = getCurrentTokenBalance(tokenMint);
    const isClosed = detectPositionClosure(currentBalance);
    if (!isClosed) return null; // Still open

    return {
      tokenMint,
      tokenSymbol: extractTokenSymbol(txs),
      totalEntrySOL: totalEntry,
      totalExitSOL: totalExit,
      netProfitSOL: netProfit,
      roiPercent: roi,
      positionOpenedAt: getFirstTransactionTime(txs),
      positionClosedAt: getLastTransactionTime(txs),
    };
  })
  .filter(Boolean);
```

### 5.3 Rate Limiting & Error Handling

**Helius Free Tier:**

- 150 requests/minute
- 10,000 requests/day

**Implementation:**

- `RateLimiter` class in `src/lib/helius-client.ts` - Token bucket algorithm
- Configurable rate limit: 10 requests/second (from `HELIUS_CONFIG.RATE_LIMIT`)
- Exponential backoff retry logic for 5xx errors (max 3 retries)
- Request/response logging for debugging

**Error Handling:**

- `HeliusError` class for API-specific errors
- `ValidationError` for invalid addresses
- `ApiError` for general API failures
- Retry logic with jitter for transient failures
- Proper error propagation to API routes with HTTP status codes

---

## 6. Core Business Logic Implementation

### 6.1 Cashout Calculator Module

**File:** `lib/cashout-calculator.ts`

```typescript
interface CashoutInput {
  tier: number;
  roi: number;
  losingStreak: number;
  goalBoost: number;
  netProfit: number;
}

interface CashoutResult {
  baseRate: number;
  roiBonus: number;
  streakMultiplier: number;
  goalBoost: number;
  finalPercent: number;
  cashoutAmount: number;
}

function calculateCashout(input: CashoutInput): CashoutResult {
  // Get base rate from tier
  const baseRate = getBaseRateForTier(input.tier);

  // Calculate ROI bonus
  const roiBonus = input.roi >= 100 ? 20 : 0;

  // Get streak multiplier
  const streakMultiplier =
    input.losingStreak === 0 || input.losingStreak === 1
      ? 1.0
      : input.losingStreak === 2
        ? 0.75
        : 0.5;

  // Calculate final percentage
  const finalPercent =
    (baseRate + roiBonus) * streakMultiplier * input.goalBoost;

  // Calculate amount
  const cashoutAmount = input.netProfit * (finalPercent / 100);

  return {
    baseRate,
    roiBonus,
    streakMultiplier,
    goalBoost: input.goalBoost,
    finalPercent,
    cashoutAmount,
  };
}
```

### 6.2 Trade Parser Module

**File:** `lib/trade-parser.ts`

```typescript
interface HeliusTransaction {
  signature: string;
  type: string;
  timestamp: number;
  tokenMint: string;
  tokenSymbol: string;
  solAmount: number;
  direction: "BUY" | "SELL";
}

interface ParsedTrade {
  tokenMint: string;
  tokenSymbol: string;
  totalEntry: number;
  totalExit: number;
  netProfit: number;
  roi: number;
  positionClosed: boolean;
}

async function parseTrades(
  transactions: HeliusTransaction[],
  walletAddress: string,
): Promise<ParsedTrade[]> {
  // Group by token mint
  const grouped = groupBy(transactions, "tokenMint");

  const trades: ParsedTrade[] = [];

  for (const [mint, txs] of Object.entries(grouped)) {
    const buys = txs.filter((tx) => tx.direction === "BUY");
    const sells = txs.filter((tx) => tx.direction === "SELL");

    const totalEntry = sum(buys, "solAmount");
    const totalExit = sum(sells, "solAmount");

    // Check current balance
    const balance = await getTokenBalance(walletAddress, mint);
    const positionClosed = balance === 0;

    if (!positionClosed) continue; // Skip open positions

    const netProfit = totalExit - totalEntry;
    const roi = (netProfit / totalEntry) * 100;

    trades.push({
      tokenMint: mint,
      tokenSymbol: txs[0].tokenSymbol,
      totalEntry,
      totalExit,
      netProfit,
      roi,
      positionClosed,
    });
  }

  return trades;
}
```

### 6.3 Tier Calculator Module

**File:** `lib/tier-calculator.ts`

```typescript
enum Tier {
  REBUILD = 1,
  RECOVERY = 2,
  GROWTH = 3,
  AGGRESSIVE = 4,
  MAXIMUM = 5,
}

function calculateTier(balanceSOL: number): Tier {
  if (balanceSOL < 1) return Tier.REBUILD;
  if (balanceSOL < 3) return Tier.RECOVERY;
  if (balanceSOL < 7) return Tier.GROWTH;
  if (balanceSOL <= 10) return Tier.AGGRESSIVE;
  return Tier.MAXIMUM;
}

function getTierName(tier: Tier): string {
  const names = {
    [Tier.REBUILD]: "Rebuild",
    [Tier.RECOVERY]: "Recovery",
    [Tier.GROWTH]: "Growth",
    [Tier.AGGRESSIVE]: "Aggressive Profit",
    [Tier.MAXIMUM]: "Maximum Extraction",
  };
  return names[tier];
}
```

---

## 7. MVP Feature Breakdown

### 7.1 Phase 1: Core Features (Week 1-2)

**Must-Have (P0):**

- [x] Database schema + Supabase setup (Day 1-2)
- [x] Cashout calculation engine (Day 3-4)
- [x] Helius API integration (Day 5-6)
- [x] Trade detection and parsing logic (Day 5-6)
- [x] Trade service layer with sync operations (Day 7)
- [x] API endpoint for trade refresh (Day 7)
- [ ] User wallet setup (trading + vault addresses)
- [ ] Basic dashboard UI (balances, tier, recent trades)

**Should-Have (P1):**

- [ ] Manual refresh button
- [ ] Toast notifications for new trades
- [ ] Trade history table
- [ ] Cashout confirmation flow

**Completed:** 229 unit tests covering all calculation logic, Helius integration, and trade parsing.

### 7.2 Phase 2: Goal System (Week 2-3)

**Must-Have (P0):**

- [ ] Monthly goal setting
- [ ] Progress tracking (weekly/monthly)
- [ ] Sunday goal check logic
- [ ] Boost suggestion UI

**Should-Have (P1):**

- [ ] Goal progress charts
- [ ] Historical goal achievement

### 7.3 Phase 3: Polish (Week 3)

**Must-Have (P0):**

- [ ] Error handling + loading states
- [ ] Responsive mobile design
- [ ] Data validation (Zod schemas)

**Nice-to-Have (P2):**

- [ ] Dark mode
- [ ] Export trade history (CSV)
- [ ] Onboarding tutorial

---

## 8. UI/UX Components

### 8.1 Page Structure

```
/
├── /dashboard (main page)
├── /setup (first-time wallet setup)
├── /trades (detailed trade history)
├── /goals (goal management)
└── /settings (user preferences)
```

### 8.2 Dashboard Layout

```
┌─────────────────────────────────────────┐
│  Header: TMP Logo | Refresh | User     │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐       │
│  │  Trading    │  │   Vault     │       │
│  │  Wallet     │  │   Wallet    │       │
│  │  2.5 SOL    │  │   3.2 SOL   │       │
│  │  $312.50    │  │   $400.00   │       │
│  │  Tier 2     │  │             │       │
│  └─────────────┘  └─────────────┘       │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │  Monthly Goal Progress          │    │
│  │  $125 / $400 (31%)              │    │
│  │  ████████░░░░░░░░░░░░            │    │
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│  Recent Trades                          │
│  ┌─────────────────────────────────┐    │
│  │ $ROCK | +128% | 2.5 SOL (45%)  │    │
│  │ [Confirm Cashout]               │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ $PEPE | -15% | Loss             │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 8.3 Key UI Components

**TierBadge:**

- Color-coded by tier (red → green gradient)
- Shows tier name + number

**CashoutCard:**

- Trade summary (token, ROI, profit)
- Recommended cashout (SOL + USD)
- Breakdown (tier, ROI bonus, streak)
- "Confirm Cashout" button

**GoalProgressBar:**

- Weekly + Monthly progress
- Visual progress bar
- Behind/ahead indicator

**TradeHistoryTable:**

- Sortable columns (date, token, ROI, cashout)
- Filter by date range
- Pagination

---

## 9. Security & Privacy

### 9.1 Data Security

**No Private Keys Stored:**

- MVP uses read-only wallet addresses
- No transaction signing capability
- No custody of user funds

**Supabase RLS (Row Level Security):**

```sql
-- Users can only access their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_access ON users
  FOR ALL
  USING (auth.uid() = id);

CREATE POLICY wallet_access ON wallets
  FOR ALL
  USING (user_id = auth.uid());

-- Apply to all tables
```

**API Key Management:**

- Helius API key in environment variables
- Never exposed to client
- Rate limiting on API routes

### 9.2 Privacy

**Minimal Data Collection:**

- No email required (optional)
- Only wallet addresses stored
- No KYC/identity verification

**Data Retention:**

- Trade history stored indefinitely (user preference)
- User can request data deletion

---

## 10. Testing Strategy

### 10.1 Unit Tests

**Core Logic:**

- Cashout calculator (all tier/ROI/streak combinations)
- Trade parser (bundling, edge cases)
- Tier calculator (boundary conditions)

**Tools:** Jest + React Testing Library

### 10.2 Integration Tests

**API Routes:**

- Trade refresh flow
- Cashout confirmation
- Goal boost acceptance

**Tools:** Supertest

### 10.3 E2E Tests

**Critical Flows:**

- Setup → Refresh → Cashout → Confirm
- Goal check → Accept boost
- Trade history view

**Tools:** Playwright (optional for MVP)

### 10.4 Manual Testing Checklist

- [ ] Setup with real wallet addresses
- [ ] Refresh with real trades from Helius
- [ ] Verify cashout calculations match specs
- [ ] Confirm balances update correctly
- [ ] Test on mobile (responsive)
- [ ] Test error states (API failures, invalid inputs)

---

## 11. Deployment & DevOps

### 11.1 Environment Setup

**Development:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
HELIUS_API_KEY=xxx
COINGECKO_API_KEY=xxx (optional)
```

**Production:**

- Same env vars
- Enable Supabase production mode
- Vercel production environment

### 11.2 Deployment Pipeline

```
1. Push to GitHub (main branch)
2. Vercel auto-deploys
3. Run database migrations (Prisma)
4. Smoke tests (API health checks)
5. Monitor error rates (Sentry)
```

### 11.3 Monitoring

**Metrics to Track:**

- API response times
- Helius API usage
- Error rates (500s, 400s)
- User signup rate
- Daily active users

**Tools:**

- Vercel Analytics (built-in)
- Sentry (error tracking, optional)
- Supabase dashboard (DB performance)

---

## 12. Performance Considerations

### 12.1 Optimization Strategies

**API Response Caching:**

- Cache Helius responses for 30 seconds
- Cache SOL/USD price for 5 minutes

**Database Queries:**

- Use indexes on frequently queried columns
- Limit trade history to last 100 trades by default

**Frontend:**

- Lazy load trade history
- Debounce refresh button (prevent spam)
- Optimistic UI updates (instant feedback)

### 12.2 Scalability

**Current Limits:**

- Supabase free tier: 500MB DB, unlimited API requests
- Helius free tier: 10k requests/day
- Vercel: 100GB bandwidth/month

**Upgrade Path:**

- Supabase Pro: $25/mo (8GB DB)
- Helius Developer: $50/mo (500 req/min)
- Vercel Pro: $20/mo (1TB bandwidth)

---

## 13. Development Timeline

### Week 1: Foundation

- **Days 1-2:** Project setup, DB schema, Supabase config
- **Days 3-4:** Helius integration, trade parser
- **Days 5-7:** Cashout calculator, tier logic

### Week 2: UI & Features

- **Days 1-2:** Dashboard UI, wallet setup flow
- **Days 3-4:** Trade history, cashout confirmation
- **Days 5-7:** Goal system, Sunday check

### Week 3: Polish & Deploy

- **Days 1-3:** Testing, bug fixes, error handling
- **Days 4-5:** Responsive design, mobile optimization
- **Days 6-7:** Deploy to production, user testing

---

## Document Control

- **Version:** 1.0
- **Last Updated:** January 2026
- **Status:** Ready for Development
- **Related:** PRD v1.0, Functional Logic Spec v1.0
