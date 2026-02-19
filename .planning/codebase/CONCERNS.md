# Codebase Concerns

**Analysis Date:** 2026-02-20

## Tech Debt

**Excessive TypeScript `any` type usage:**
- Issue: 60 instances of `eslint-disable @typescript-eslint/no-explicit-any` bypass type safety throughout codebase
- Files:
  - `src/lib/services/trade-service.ts` (11 instances)
  - `src/lib/services/token-registry-service.ts` (3 instances)
  - `src/app/api/goals/route.ts` (2 instances)
  - `src/app/api/dashboard/route.ts` (1 instance)
  - `src/app/api/trades/route.ts` (1 instance)
  - `src/app/api/wallets/setup/route.ts` (1 instance)
  - Multiple test files
- Impact: Silences type errors, makes refactoring dangerous, loses editor autocomplete/safety
- Fix approach: Define proper types for Supabase queries. Create TypeScript interfaces for all API response shapes instead of casting to `any`. Use Supabase's generated types from `types/database.ts`

**Unimplemented core features:**
- Issue: Bootstrap/onboarding endpoints and handlers are stubbed out without implementation
- Files:
  - `src/app/goals/page.tsx` lines 94-102 - `handleAcceptBoost` and `handleDeclineBoost` only have `console.log` statements
  - `src/lib/services/trade-service.ts` lines 57-58, 111-112 - TODOs for using `lastSync` and `currentBalances` filtering
  - `src/lib/services/trade-service.ts` lines 260-274 - SOL→USD conversion stub (hardcoded `balance_usd: 0`)
- Impact: Features appear functional but don't work; boost system non-functional; wallet balances show incomplete data
- Fix approach: Implement boost acceptance/decline endpoints. Add price service for SOL→USD conversion. Implement timestamp-based transaction filtering

**Console logging in production code:**
- Issue: `console.log`, `console.error`, `console.warn` calls scattered throughout service and API layers
- Files:
  - `src/lib/services/trade-service.ts` (7 instances, lines 78, 84-85, 88, 100, 105, 109)
  - `src/lib/trade-parser.ts` (debug logging in parser, lines 56-66, 70, 76, 84, 97)
  - `src/lib/dexscreener-client.ts` (1 instance, line 67)
  - `src/app/api/dashboard/route.ts` (1 instance, line 201)
  - `src/app/api/trades/route.ts` (1 instance, line 84)
- Impact: Sensitive trade/wallet data exposed in browser console and server logs; performance overhead
- Fix approach: Replace with structured logging using a logger service. Add log levels. Sanitize sensitive data before logging.

## Known Bugs

**Session/user lookup broken in goals endpoints:**
- Symptoms: Goals API uses `order("created_at", { ascending: false }).limit(1)` to get "current user" - retrieves any user, not authenticated user
- Files: `src/app/api/goals/route.ts` lines 33-38, 139-144
- Trigger: Any user hitting `/api/goals` endpoint while authenticated with their own wallet gets first user in database
- Impact: Users can view/modify other users' goal settings; severe privacy violation
- Workaround: None - architecture is fundamentally broken. Needs proper session/user context
- Fix approach: Pass wallet address or user ID via request body/query params and validate against wallet auth cookie. Build proper session management instead of cookie-based boolean flag.

**Empty/stub goal boost implementation:**
- Symptoms: Boost acceptance/decline buttons render but do nothing
- Files: `src/app/goals/page.tsx` lines 94-102
- Trigger: User clicks "Accept Boost" or "Decline Boost" button
- Impact: UI misleads users that feature exists when it's non-functional
- Workaround: Hide buttons in UI until implementation complete
- Fix approach: Implement full boost lifecycle - accept, decline, activate, expire endpoints

**Missing transaction filtering prevents duplicate trades:**
- Symptoms: On each sync, re-fetches all 100 transactions every time. Relies only on checking existing trades in DB, not on lastSync timestamp
- Files: `src/lib/services/trade-service.ts` lines 57-58 (TODO comment)
- Trigger: Wallet with 1000+ transactions triggers rate limits and slow syncs
- Impact: Inefficient API usage, scales poorly, redundant parsing of old transactions
- Fix approach: Implement `getLastSyncTimestamp` properly and filter Helius queries: `getTransactionHistory(walletAddress, { limit: 100, before: lastSync })`

**Wallet balance USD conversion hardcoded to 0:**
- Symptoms: All wallet `balance_usd` values are 0, making USD displays inaccurate
- Files: `src/lib/services/trade-service.ts` lines 260-274
- Trigger: Any wallet balance update
- Impact: Dashboard shows incorrect USD equivalents. User-facing metrics are misleading.
- Fix approach: Integrate Helius or CoinGecko price API to fetch SOL→USD rate and calculate real USD balances

## Security Considerations

**Weak authentication using simple cookie flag:**
- Risk: `pisp-wallet-auth=true` cookie can be manually set by user in browser console; no signature/validation
- Files:
  - `src/middleware.ts` lines 13, 16
  - `src/app/api/dashboard/route.ts` lines 17-26
  - `src/app/api/trades/route.ts` lines 15-24
  - `src/app/api/goals/route.ts` lines 19-29, 112-122
  - `src/app/api/wallets/setup/route.ts` lines 19-29
  - `src/lib/stores/auth-store.ts` - sets cookie from frontend
- Current mitigation: None; relying only on cookie presence
- Recommendations:
  1. Use signed/encrypted cookies (Next.js middleware handles this)
  2. Validate wallet signature server-side
  3. Implement proper JWT or session tokens
  4. Add CSRF protection

**User lookup by wallet address without proper isolation:**
- Risk: Multiple places query `users` table by `wallet_address` only, no user context verification
- Files:
  - `src/app/api/goals/route.ts` lines 33-38 - Gets first user ordered by created_at
  - `src/app/api/trades/route.ts` lines 47-51
  - `src/app/api/dashboard/route.ts` lines 49-63
  - `src/app/api/trades/refresh/route.ts` lines 94-99
- Current mitigation: Cookie-based auth check (which can be spoofed)
- Recommendations:
  1. Pass authenticated user context through middleware
  2. Validate wallet signature against request
  3. Use Supabase RLS (Row Level Security) policies instead of app-level checks
  4. Never rely solely on query parameters for user identity

**Helius API key exposed in environment:**
- Risk: `process.env.HELIUS_API_KEY` is used directly in client code; no API gateway layer
- Files: `src/lib/helius-client.ts` lines 56-67
- Current mitigation: File is backend-only (imported by services), but still exposes key in process
- Recommendations:
  1. Create dedicated API route for Helius calls (`/api/helius/*)
  2. Never pass Helius API interactions to client-side code
  3. Rate limit and auth-check at API gateway layer
  4. Log and monitor API key usage

**Supabase admin client created with SERVICE_ROLE_KEY:**
- Risk: Service role key has unlimited database access, used in frontend context with weak auth checks
- Files:
  - `src/app/api/trades/refresh/route.ts` lines 83-92
  - `src/app/api/goals/route.ts` lines 16, 109
  - `src/app/api/dashboard/route.ts` lines 46
  - `src/app/api/trades/route.ts` lines 44
  - `src/app/api/wallets/setup/route.ts` lines 16
- Current mitigation: API endpoint-level auth checks (cookie flag)
- Recommendations:
  1. Require proper session token (not just cookie flag)
  2. Implement Supabase RLS policies to enforce row-level access
  3. Use user-scoped service role (if available) or implement stricter auth
  4. Add audit logging for all mutations

**Insufficient input validation:**
- Risk: Some endpoints validate wallet address format but not token amounts, goal values, or sync parameters
- Files:
  - `src/app/api/goals/route.ts` lines 128-136 - Only checks `typeof monthlyGoalUsd === "number"`; no upper bound check
  - `src/app/api/wallets/setup/route.ts` lines 47-66 - Validates address format but not against known bad addresses
- Current mitigation: Database schema constraints (may exist but not verified)
- Recommendations:
  1. Use Zod/validation library (already imported in types but not used consistently)
  2. Validate all numeric inputs have reasonable bounds
  3. Validate against blocklists (sanctioned addresses, known honeypots)
  4. Add request rate limiting per user/wallet

## Performance Bottlenecks

**Unbounded Helius transaction fetching:**
- Problem: `getTransactionHistory(walletAddress, { limit: 100 })` fetches same 100 transactions every sync
- Files: `src/lib/services/trade-service.ts` lines 61-63
- Cause: No timestamp-based filtering; no pagination continuation
- Impact: Wallets with >1000 transactions hit Helius rate limits; sync takes 10-30+ seconds
- Improvement path:
  1. Store `last_synced_at` and use `getTransactionHistory(walletAddress, { limit: 100, before: lastSync })`
  2. Implement cursor-based pagination for initial sync
  3. Cache transaction signatures to skip already-parsed transactions

**Trade aggregation happens in-memory during parsing:**
- Problem: All token mint grouping and aggregation happens in single-threaded JS during API request
- Files: `src/lib/trade-parser.ts` lines 72-99
- Cause: Complex calculation loops with no optimization
- Impact: Trades sync endpoint blocks for complex wallets; frontend waits 5+ seconds
- Improvement path:
  1. Move aggregation to database (PostgreSQL window functions)
  2. Add caching layer for parsed trades
  3. Implement background sync job instead of sync-on-request

**Token symbol/metadata fetched per trade in sync operation:**
- Problem: `getTokenSymbol(trade.tokenMint)` called for each parsed trade individually
- Files: `src/lib/services/trade-service.ts` line 194
- Cause: Called inside loop, makes separate request per token
- Impact: 10 trades = 10 DexScreener API calls; rate limited quickly
- Improvement path:
  1. Batch token lookups: fetch all unique mints once per sync
  2. Cache symbols in database
  3. Use token registry service properly (already exists but not used in saveTrade)

**No pagination on trades endpoint:**
- Problem: Returns ALL trades for user in single query (no limit)
- Files: `src/app/api/trades/route.ts` lines 65-72
- Cause: No `.limit()` or `.offset()` in query
- Impact: Users with 1000+ trades fetch entire history for each page load; slow network, high bandwidth
- Improvement path:
  1. Add limit/offset parameters to query: `select().limit(50).offset(pageNum * 50)`
  2. Return pagination metadata (total count, next/previous cursors)
  3. Implement infinite scroll or cursor-based pagination on frontend

**Dashboard API fetches same data repeatedly:**
- Problem: Queries wallets, trades, goals, user_state separately without batching
- Files: `src/app/api/dashboard/route.ts` lines 68-170
- Cause: Sequential Supabase queries instead of batch operations
- Impact: 5+ database round-trips per dashboard load; 2-3 second latency
- Improvement path:
  1. Use Supabase `select()` with foreign key joins
  2. Batch related queries into single request
  3. Implement API response caching (1-5 minute TTL)

## Fragile Areas

**Trade parser is core business logic with limited test coverage:**
- Files: `src/lib/trade-parser.ts` (255 lines), test file exists but coverage unknown
- Why fragile: Complex aggregation logic with many transaction types (swap, token transfer, native transfer); edge cases for partial fills, dust amounts
- Safe modification:
  1. Write comprehensive unit tests for each transaction type
  2. Add property-based testing for aggregation (10 trades with different sizes/fees)
  3. Add integration tests with real Helius transactions
  4. Version control trade parsing logic separately
- Test coverage: 12 test files total in codebase, but not clear which cover parser

**Cashout calculation logic embedded in service:**
- Files: `src/lib/services/trade-service.ts` lines 180-191
- Why fragile: Depends on `calculateCashout()` function, but calculation itself lives in separate file; changes to tier/streak need updates in two places
- Safe modification:
  1. Add exhaustive tests for cashout calculation under different conditions
  2. Document all tier/streak/goal boost multiplier combinations
  3. Add integration tests with known output values
  4. Create change control process before tweaking multipliers

**Database schema not validated at application startup:**
- Files: All API routes assume schema exists with specific columns
- Why fragile: No schema validation; type mismatch between code and DB silently fails at runtime
- Safe modification:
  1. Add startup health check that validates schema (queries `information_schema.columns`)
  2. Generate types from actual DB schema using Supabase CLI (already partially done in `types/database.ts`)
  3. Add migration version tracking to prevent schema drift

**Middleware/auth check repeated in every API route:**
- Files: Cookie check duplicated in:
  - `src/middleware.ts` (partial)
  - `src/app/api/dashboard/route.ts`
  - `src/app/api/trades/route.ts`
  - `src/app/api/goals/route.ts`
  - `src/app/api/wallets/setup/route.ts`
  - `src/app/api/trades/refresh/route.ts`
- Why fragile: Each route has its own auth logic; changing auth scheme requires updates everywhere
- Safe modification:
  1. Create middleware function: `authenticateWallet(request)` that validates and returns user
  2. Wrap all protected routes with auth middleware
  3. Centralize error responses
  4. Add logging/audit trail for auth failures

## Scaling Limits

**In-memory token cache in DexScreener client:**
- Current capacity: 24-hour cache for ~100-200 tokens (typical user portfolio)
- Limit: Multiple users with overlapping token interests share nothing; 1000 users = 1000 independent caches
- Scaling path:
  1. Move to Redis cache shared across processes
  2. Implement distributed cache invalidation
  3. Add cache hit/miss metrics

**Rate limiter is per-process in Helius client:**
- Current capacity: 10 requests/second enforced per Node.js process
- Limit: Horizontal scaling breaks rate limiter (each instance thinks it can do 10 req/s = 10N total)
- Scaling path:
  1. Move rate limiting to Redis with atomic operations
  2. Implement token bucket algorithm with shared state
  3. Add rate limit headers to responses

**Stateless authentication blocks session features:**
- Current capacity: Can handle many users but no session state = can't revoke access mid-session
- Limit: If wallet is compromised, old cookies remain valid until expiry (7 days)
- Scaling path:
  1. Implement token blacklist/revocation (Redis-backed)
  2. Add session table to database
  3. Support "logout all" and "revoke access from device" features

**Single Supabase project limits database connections:**
- Current capacity: ~100 concurrent connections typical
- Limit: More than 50-100 concurrent users hits connection pool
- Scaling path:
  1. Implement connection pooling (PgBouncer at Supabase)
  2. Migrate to multi-region Supabase if needed
  3. Add query result caching layer (Redis)

## Dependencies at Risk

**Supabase JavaScript client without SLA dependency:**
- Risk: Used for all database operations; no versioning strategy for breaking changes
- Current version: `^2.91.0` (caret range allows any 2.x)
- Impact: New 2.x release breaks API, entire application down
- Migration plan:
  1. Pin to specific version `2.91.0` (not `^2.91.0`)
  2. Subscribe to Supabase security advisories
  3. Add migration guide for major version bumps
  4. Test minor version updates in CI before deploying

**Axios for HTTP requests without retry logic:**
- Risk: Network failures in Helius/DexScreener calls not retried
- Current version: `^1.13.2`
- Impact: Intermittent network hiccup causes trade sync to fail completely
- Migration plan:
  1. Add retry middleware with exponential backoff
  2. Consider replacing with native `fetch()` (no dependencies)
  3. Add timeout handling per request

**Zod validation library imported but underutilized:**
- Risk: Only imported in types; API routes don't validate request bodies with Zod schemas
- Files: Manual validation in each route instead of consistent schema validation
- Impact: Easy to miss validation cases; inconsistent error messages
- Migration plan:
  1. Create Zod schemas for each API request body
  2. Add validation middleware that uses schemas
  3. Auto-generate API documentation from schemas

## Missing Critical Features

**Audit logging:**
- Problem: No record of who did what, when. Can't investigate fraud, bugs, or security issues.
- Blocks: Compliance, debugging production issues, user support
- Implementation approach:
  1. Create `audit_logs` table (user_id, action, resource, changes, timestamp)
  2. Log all writes to trades, wallets, goal_settings
  3. Add read access logs for sensitive operations

**Error monitoring/reporting:**
- Problem: Errors logged to stdout only; no centralized error tracking
- Blocks: Can't see patterns in failures; hard to debug in production
- Implementation approach:
  1. Integrate Sentry or similar (free tier sufficient)
  2. Log error context (wallet, user, trade ID, etc.)
  3. Alert on error spikes

**Rate limiting per user:**
- Problem: Any authenticated user can hammer /api/trades/refresh without limits
- Blocks: DoS protection, resource management
- Implementation approach:
  1. Redis-backed sliding window rate limiter
  2. Different limits per endpoint (sync = 1 req/min, read = 60 req/min)
  3. Return 429 Too Many Requests when exceeded

## Test Coverage Gaps

**API routes untested:**
- What's not tested: All `/api/*` endpoints (goals, trades, dashboard, wallets/setup, trades/refresh)
- Files: No test files in `src/app/api/`
- Risk: Breaking changes to request/response format go undetected; security checks removed silently
- Priority: HIGH - These are user-facing contract

**Authentication/authorization untested:**
- What's not tested: Cookie-based auth checks, wallet address isolation, user lookup logic
- Files: Auth logic in every API route but no integration tests
- Risk: Auth bypass possible; users can access other users' data
- Priority: HIGH - Security-critical

**Trade sync integration untested:**
- What's not tested: Full sync flow (Helius fetch → parse → save) with real transaction data
- Files: `src/lib/services/trade-service.ts` has no test file; only parser tests exist
- Risk: Sync failures, duplicate trades, lost transactions go undetected until production
- Priority: HIGH - Core business logic

**Component rendering untested:**
- What's not tested: Most UI components in `src/app/` pages (trades, goals, dashboard)
- Files: 12 test files total, mostly for utilities/helpers not components
- Risk: UI bugs, missing error states, inaccessible components
- Priority: MEDIUM - Affects user experience

**Edge cases in calculators:**
- What's not tested: Tier calculation edge cases (balance exactly at boundary), cashout at 0 balance, negative ROI
- Files: Tests exist (`src/lib/__tests__/`) but may not cover edge cases
- Risk: Incorrect tier/cashout recommendations for edge case wallets
- Priority: MEDIUM - Affects user trust

---

*Concerns audit: 2026-02-20*
