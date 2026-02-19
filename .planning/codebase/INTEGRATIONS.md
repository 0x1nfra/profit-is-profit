# External Integrations

**Analysis Date:** 2026-02-20

## APIs & External Services

**Blockchain Data:**
- Helius API - Solana blockchain data and transaction enrichment
  - SDK/Client: Custom implementation in `src/lib/helius-client.ts`
  - Auth: `HELIUS_API_KEY` environment variable
  - Rate limit: 10 requests/second with exponential backoff
  - Base URL: `https://mainnet.helius-rpc.com`
  - Timeout: 30 seconds
  - Features used:
    - `getBalance()` - Fetch native SOL balance for addresses
    - `getTokenAccountsByOwner()` - Token balance fetching
    - `getTransactionHistory()` - Enhanced transaction data via `/v0/addresses/{address}/transactions`
    - Max retry attempts: 3 with exponential backoff

**Token Metadata:**
- DexScreener API - Token symbol and metadata lookup
  - Endpoint: `https://api.dexscreener.com`
  - Client: `src/lib/dexscreener-client.ts`
  - Auth: None (public API)
  - Rate limit: 60 requests/minute (client-side enforcement)
  - Features:
    - Batch token metadata lookup (up to 30 tokens per request)
    - In-memory cache with 24-hour TTL
    - No authentication required

## Data Storage

**Databases:**
- Supabase PostgreSQL
  - Connection: Environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Client: `@supabase/supabase-js` ^2.91.0
  - Admin access: Service role key `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
  - Tables in schema:
    - `users` - User accounts linked to wallet addresses
    - `wallets` - Trading and vault wallet tracking
    - `trades` - Individual trade records with profit/loss calculations
    - `cashouts` - Vault cashout history
    - `goal_settings` - Monthly profit goals and boost settings
    - `user_state` - Current user state (losing streaks, etc.)
    - `token_registry` - Token metadata cache (optional)
  - Features:
    - Real-time subscriptions for wallet changes and trades (via `subscribeToWalletChanges()`, `subscribeToNewTrades()`)
    - Row Level Security (RLS) for user data isolation
    - Admin operations via service role key in `src/lib/supabase-server.ts`

**File Storage:**
- Not detected - Application is stateless regarding file uploads

**Caching:**
- In-memory caching only:
  - DexScreener token metadata cache (24-hour TTL) in `src/lib/dexscreener-client.ts`
  - No external cache service (Redis, Memcached, etc.)

## Authentication & Identity

**Auth Provider:**
- Supabase Authentication (built-in)
  - Implementation: Email/password auth via Supabase (`supabase.auth.*`)
  - Wallet-based identification: Wallet address linked to user record
  - Session management: Auto-refresh token enabled for client auth
  - Cookie-based auth: `pisp-wallet-auth` cookie set on wallet connection
  - Code location: `src/lib/supabase.ts` handles auth helpers

**Auth Patterns:**
- Client-side: `getCurrentUser()`, `isAuthenticated()`, `signOut()` helpers
- Server-side: Service role key for admin operations that bypass RLS
- Wallet-first: Users identified by Solana wallet address

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, Rollbar, or similar service integrated

**Logs:**
- Console-based logging only
  - Development: Detailed logging via `logHeliusRequest()`, `logHeliusResponse()` in helpers
  - Custom error classes: `HeliusError`, `ValidationError`, `SupabaseError` in type definitions
  - Location: `src/lib/helpers/helius-helpers.ts`

**Debugging:**
- NODE_ENV checks for development mode in `src/lib/helpers/helius-helpers.ts`
- Console.error and console.warn throughout codebase

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured - Framework agnostic setup (Vercel-ready)
- Next.js compatible with:
  - Vercel (first-party)
  - Self-hosted Node.js servers
  - Docker containers

**CI Pipeline:**
- Not detected - No GitHub Actions, CI config files found

**Build Output:**
- Next.js standard build (`.next/` directory)
- Static and dynamic routes handled by app router in `src/app/`

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Public Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anonymous key for client access
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key (server-side only, for wallet setup and API operations)
- `HELIUS_API_KEY` - Helius API key (server-side only, for blockchain data)

**Optional env vars:**
- `NODE_ENV` - Inferred by Next.js; used for debug logging

**Secrets location:**
- `.env.local` (local development, NOT committed)
- `.env` template provided in `.env.example`
- Production: Environment-specific configuration (e.g., Vercel secrets, Docker env files)

**Validation:**
- Environment variables checked at initialization:
  - `src/lib/supabase.ts` - Throws error if SUPABASE_URL or ANON_KEY missing
  - `src/lib/supabase-server.ts` - Throws error if SERVICE_ROLE_KEY missing
  - `src/lib/helius-client.ts` - Throws ValidationError if HELIUS_API_KEY missing

## Webhooks & Callbacks

**Incoming:**
- Not detected - No webhook endpoints for external services

**Outgoing:**
- Not detected - Application does not send data to external services
- Supabase changes tracked via real-time subscriptions only

## API Endpoints Overview

**Internal API Routes** (for frontend consumption):

- `GET /api/trades` - Fetch all trades for authenticated user
  - Auth: Cookie-based (`pisp-wallet-auth`)
  - Query: `walletAddress` parameter
  - Response: Array of Trade objects

- `POST /api/wallets/setup` - Initialize or update trading/vault wallets
  - Auth: Cookie-based (`pisp-wallet-auth`)
  - Body: `{ tradingWalletAddress, vaultWalletAddress }`
  - Response: WalletSetupResponse with both wallet objects
  - Side effects: Creates user if not exists, initializes user_state and goal_settings

- `GET /api/dashboard` - Dashboard data aggregation
  - Details: Location `src/app/api/dashboard/route.ts`

- `POST /api/goals` - Manage profit goals
  - Details: Location `src/app/api/goals/route.ts`

- `POST /api/trades/refresh` - Fetch and update trades from blockchain
  - Details: Location `src/app/api/trades/refresh/route.ts`

## Service Integration Patterns

**Helius Integration:**
- Centralized in `src/lib/helius-client.ts`
- Rate-limited via `RateLimiter` class (10 req/sec)
- Error handling: Custom `HeliusError` class with HTTP status codes
- Retry logic: `retryWithBackoff()` helper with exponential backoff (max 3 retries)
- All functions return Promise-based results

**DexScreener Integration:**
- Centralized in `src/lib/dexscreener-client.ts`
- Batch processing: Groups up to 30 tokens per request
- Cache-first strategy: Checks in-memory cache before API call
- Rate limiting: 60 requests/minute soft limit with warning fallback

**Supabase Integration:**
- Two clients:
  - Public client (`src/lib/supabase.ts`) - Client-side with session persistence
  - Admin client (`src/lib/supabase-server.ts`) - Server-side with service role
- Type-safe queries via generated `Database` type (`src/types/database.ts`)
- Services layer in `src/lib/services/` for business logic

---

*Integration audit: 2026-02-20*
