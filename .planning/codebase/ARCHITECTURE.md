# Architecture

**Analysis Date:** 2026-02-20

## Pattern Overview

**Overall:** Next.js App Router with Client/Server Separation using API Routes for Backend Logic

**Key Characteristics:**
- Frontend: React 19 with TypeScript, Next.js 16 with App Router
- State Management: Zustand (client-side auth state), React hooks for component state
- Backend: Next.js API routes with server-side Supabase admin client
- Data Layer: Supabase PostgreSQL with type-safe queries
- External Integrations: Solana blockchain (Helius API), Wallet connection (Phantom/Solflare)
- UI Framework: Radix UI components with Tailwind CSS styling
- Testing: Vitest with React Testing Library for unit/integration tests

## Layers

**Presentation Layer:**
- Purpose: Render user interfaces and handle user interactions
- Location: `src/app/` (pages), `src/components/` (reusable UI components)
- Contains: Page components (pages.tsx), UI components (button, card, dialog, etc.), Feature components (TradeList, WalletCard, GoalProgress)
- Depends on: Hooks, Stores, UI components, Types
- Used by: End user in browser

**State Management Layer:**
- Purpose: Manage client-side application state with localStorage persistence
- Location: `src/lib/stores/` (Zustand stores)
- Contains: `auth-store.ts` with wallet connection, authentication status, user wallet address
- Depends on: Wallet integration, localStorage API
- Used by: Page components, hooks, auth-dependent UI components

**Hook/Custom Logic Layer:**
- Purpose: Encapsulate common logic patterns and side effects
- Location: `src/hooks/`
- Contains: `useRequireAuth.ts` (protect pages requiring authentication), `useRequireSetup.ts` (protect pages requiring wallet setup)
- Depends on: Auth store, router navigation
- Used by: Page components for route protection

**API/Backend Layer:**
- Purpose: Handle server-side logic, database operations, external API calls
- Location: `src/app/api/` (Next.js API routes)
- Contains: Endpoints for trades sync, dashboard data, goal management, wallet setup
- Depends on: Supabase admin client, business logic utilities, external APIs
- Used by: Frontend via fetch requests

**Business Logic Layer:**
- Purpose: Implement core domain algorithms and calculations
- Location: `src/lib/` (utilities, calculators, services, helpers)
- Contains:
  - `trade-parser.ts` - Parse blockchain transactions into trades
  - `cashout-calculator.ts` - Calculate profit distribution percentages
  - `tier-calculator.ts` - Calculate user tier based on performance
  - `trade-service.ts` - Orchestrate trade sync, database saves, balance updates
  - `token-registry-service.ts` - Fetch token metadata
- Depends on: Types, Helius API, Supabase, helpers
- Used by: API routes, services

**Data Access Layer:**
- Purpose: Abstract database and external API interactions
- Location: `src/lib/` (clients, services)
- Contains:
  - `supabase.ts` - Client-side Supabase initialization and query builders
  - `supabase-server.ts` - Server-side admin Supabase client
  - `helius-client.ts` - Solana blockchain transaction fetching
  - Rate limiting and error handling for API calls
- Depends on: Environment variables, external SDKs
- Used by: Services, API routes

**Type Layer:**
- Purpose: Define domain models and interfaces
- Location: `src/types/`
- Contains: User, Wallet, Trade, Cashout, Goal, DashboardData types; Enums for Tier, TradeStatus, WalletType; Error classes
- Depends on: None (leaf module)
- Used by: All other layers

## Data Flow

**Authentication Flow:**

1. User lands on `src/app/page.tsx` (landing page)
2. `WalletConnectButton` component from `src/components/auth/` initiates wallet connection
3. `useAuthStore.connect()` (in `src/lib/stores/auth-store.ts`) detects Phantom/Solflare extension
4. Wallet signs message, returns wallet address
5. Store updates `isAuthenticated=true`, `walletAddress`, sets localStorage persistence
6. Middleware (`src/middleware.ts`) checks cookie flag on subsequent requests
7. Protected pages redirect unauthenticated users to `/` landing page

**Trade Data Fetch Flow:**

1. User navigates to `/dashboard` (protected by `useRequireAuth()`)
2. `src/app/dashboard/page.tsx` calls `GET /api/dashboard?walletAddress=...`
3. API route (`src/app/api/dashboard/route.ts`):
   - Verifies wallet auth cookie
   - Looks up user by wallet address in Supabase
   - Queries wallets, trades, goals from database
   - Calculates current tier using `calculateTier()` from `src/lib/tier-calculator.ts`
   - Returns aggregated `DashboardData`
4. Frontend renders data in dashboard components

**Trade Sync Flow:**

1. API route `src/app/api/trades/refresh/route.ts` is called
2. Calls `syncTrades()` from `src/lib/services/trade-service.ts`:
   - Fetches transaction history from Helius API (`src/lib/helius-client.ts`)
   - Parses transactions using `parseTrades()` from `src/lib/trade-parser.ts`
   - Groups transactions by token mint, calculates entry/exit amounts
   - Saves new trades to Supabase (idempotent by signature)
   - Updates wallet balances
3. Returns array of new trades and updated balances to frontend

**Cashout Calculation Flow:**

1. Trade is confirmed on dashboard or trades page
2. `calculateCashout()` from `src/lib/cashout-calculator.ts` is invoked with:
   - Tier (from trade data or current wallet tier)
   - Net profit in SOL
   - ROI percentage
   - Losing streak count
   - Optional goal boost multiplier
3. Calculation: `(Base Rate + ROI Bonus) × Streak Multiplier × Goal Boost`
4. Returns recommended cashout percentage and SOL amount
5. User can confirm or override the recommendation

**State Management:**

- **Client State:** Wallet address, authentication status, connection status stored in Zustand with localStorage persistence
- **Server State:** User profile, wallets, trades, goals stored in Supabase PostgreSQL
- **UI State:** Component-level loading, error, and form states using React hooks (useState)
- **Cache:** Minimal - data is fresh-fetched from API routes on page load

## Key Abstractions

**Auth Store:**
- Purpose: Single source of truth for wallet authentication state
- Examples: `src/lib/stores/auth-store.ts`
- Pattern: Zustand with persist middleware; exports `useAuthStore` hook for component access

**Trade Service:**
- Purpose: Orchestrate multi-step trade data operations
- Examples: `src/lib/services/trade-service.ts`
- Pattern: Exported async functions that coordinate Helius fetch → parse → calculate → save

**Calculator Functions:**
- Purpose: Pure functions for deterministic business logic
- Examples: `src/lib/tier-calculator.ts`, `src/lib/cashout-calculator.ts`
- Pattern: Accept typed input, validate, compute, return typed result; no side effects

**Helper Utilities:**
- Purpose: Reusable pure functions for calculations and validation
- Examples: `src/lib/helpers/trade-helpers.ts`, `src/lib/helpers/cashout-helpers.ts`, `src/lib/helpers/helius-helpers.ts`
- Pattern: Exported functions with clear single responsibility (e.g., `calculateNetProfit`, `validateCashoutInput`, `isValidSolanaAddress`)

**Radix UI Component Wrapping:**
- Purpose: Create application-specific UI components from Radix primitives
- Examples: `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/dialog.tsx`
- Pattern: Minimal wrapper around Radix with Tailwind styling; exported as reusable components

## Entry Points

**Landing/Auth Page:**
- Location: `src/app/page.tsx`
- Triggers: User visits "/" or is logged out
- Responsibilities: Display hero section, wallet connection CTA, handle wallet connection success/error

**Dashboard Page:**
- Location: `src/app/dashboard/page.tsx`
- Triggers: Authenticated user clicks dashboard link or is redirected after login
- Responsibilities: Fetch dashboard data from `/api/dashboard`, render wallet cards, trade summary, goal progress

**Trades Page:**
- Location: `src/app/trades/page.tsx`
- Triggers: User navigates to "/trades" from sidebar
- Responsibilities: Fetch all trades for authenticated user, render trade list with details

**Goals Page:**
- Location: `src/app/goals/page.tsx`
- Triggers: User navigates to "/goals" from sidebar
- Responsibilities: Display goal progress, allow goal setup/editing

**Wallet Setup:**
- Location: `src/app/setup/page.tsx` (currently redirected to dashboard)
- Route: `POST /api/wallets/setup`
- Triggers: New user completes initial onboarding
- Responsibilities: Create user and wallet records in Supabase

**API Routes:**
- `GET /api/dashboard` - Fetch user's wallet balances, recent trades, goals
- `GET /api/trades` - Fetch all trades for authenticated user
- `POST /api/trades/refresh` - Sync new trades from Helius
- `POST /api/wallets/setup` - Initialize user with trading and vault wallets
- `GET /api/goals` - Fetch user's goal settings

**Middleware:**
- Location: `src/middleware.ts`
- Triggers: Every request matching `/`, `/setup`, `/dashboard`, `/trades`, `/goals`, `/api/:path*`
- Responsibilities: Check wallet auth cookie, redirect unauthenticated users, allow public routes

## Error Handling

**Strategy:** Layered error handling with custom error classes and HTTP status codes

**Patterns:**

1. **Custom Error Classes** (`src/types/index.ts`):
   - `ApiError` - HTTP errors with status code and error code
   - `ValidationError` - Input validation failures
   - `HeliusError` - Blockchain API failures
   - `SupabaseError` - Database operation failures

2. **API Routes**: Return JSON with `{ success: false, error: { message, code } }` format and appropriate HTTP status (400, 401, 404, 500)

3. **Frontend Components**: Catch errors from API calls, display user-friendly toast messages using `sonner` package, provide retry buttons

4. **Services**: Log errors with context (function name, inputs), throw typed errors for caller to handle

## Cross-Cutting Concerns

**Logging:**
- Console.log statements throughout services and trade parser for debugging transaction processing
- No centralized logging framework; output to browser console or server logs

**Validation:**
- Input validation at API route level (e.g., wallet address format)
- Type validation using TypeScript compiler
- Functional validation using helper functions (e.g., `validateCashoutInput`)
- Solana address validation using regex pattern in helpers

**Authentication:**
- Wallet-based (non-custodial) - user signs message in their wallet extension
- Cookie-based session tracking (`pisp-wallet-auth` cookie set to "true")
- Middleware checks for cookie presence before allowing protected routes
- No server-side session storage or JWT tokens

**Rate Limiting:**
- Helius API calls rate limited to 10 requests per second using `RateLimiter` class in `src/lib/helius-client.ts`
- Solana blockchain calls respect Helius rate limits

---

*Architecture analysis: 2026-02-20*
