# Pitfalls Research

**Research Date:** 2026-02-20
**Project:** Profit is Profit (PisP) - Solana profit-taking trading tool
**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase, Helius Wallet API, @solana/wallet-adapter-react

---

## Critical Pitfalls

### 1. Helius API Beta Breaking Changes Without Warning

**Description:**
Helius Wallet API is in beta, meaning endpoint schemas, response formats, and rate limits can change without notice. The `/v1/wallet/{wallet}/history` and `/v1/wallet/{wallet}/balances` endpoints may introduce breaking changes that silently corrupt trade detection logic.

**Warning Signs:**
- Sudden increase in parsing errors or null values in trade records
- Trades showing incorrect SOL amounts or missing token symbols
- API returns 400 errors for previously valid requests
- Balance queries return different schema (nested fields, renamed properties)
- Transaction history missing expected fields like `nativeBalanceChange` or `tokenBalanceChanges`

**Prevention Strategy:**
1. Pin Helius API requests to specific schema version if available (check docs for versioning)
2. Implement strict response validation using Zod schemas before parsing - reject unknown fields
3. Add integration tests with real Helius responses saved as fixtures
4. Subscribe to Helius changelog/Discord for beta API updates
5. Log all API response schemas to detect drift (compare response shape against expected type)
6. Implement fallback to raw transaction parsing if Wallet API fails validation

**Phase Mapping:**
- **Phase 1 (Data Fetching):** Set up response validation and schema pinning
- **Phase 2 (Trade Detection):** Add comprehensive integration tests with real API responses
- **Ongoing:** Monitor logs for schema changes, subscribe to Helius updates

---

### 2. Weak Wallet Authentication Allows Impersonation

**Description:**
Current implementation uses a simple boolean cookie (`pisp-wallet-auth=true`) that can be manually set by users in browser console. No cryptographic signature validation means anyone can impersonate any wallet address by setting cookie + passing address in query params.

**Warning Signs:**
- Users report seeing other users' trade data
- Wallet addresses in database don't match connected wallet in UI
- Auth cookie present but wallet disconnected in browser extension
- Multiple sessions for same wallet showing different data

**Prevention Strategy:**
1. Implement message signing with wallet: user signs nonce with private key, server validates signature
2. Use Supabase Auth with custom wallet provider instead of boolean cookies
3. Generate JWT tokens server-side after signature validation, include wallet address in claims
4. Add CSRF protection to all mutation endpoints
5. Validate wallet signature on every protected API call (not just cookie presence)
6. Store session invalidation list in Redis for instant revocation

**Phase Mapping:**
- **Phase 1 (Auth Foundation):** Replace cookie auth with signed message verification
- **Phase 2 (Security Hardening):** Implement JWT tokens and CSRF protection
- **Phase 3 (Production):** Add session management and revocation

---

### 3. Race Conditions in Trade Detection with Multiple Buys/Sells

**Description:**
Aggregating multiple swaps of the same token into a single trade is complex when transactions arrive out of order or during concurrent syncs. Helius API doesn't guarantee transaction ordering, leading to incorrect entry/exit SOL calculations or duplicate trades in database.

**Warning Signs:**
- Same token mint appears as multiple trades instead of aggregated position
- Total entry SOL doesn't match sum of individual buy transactions
- Position marked as closed when user still holds tokens (or vice versa)
- Trades showing negative ROI when all swaps were profitable
- Database contains duplicate trades with same signature set

**Prevention Strategy:**
1. Always sort transactions by `blockTime` before aggregation (not by API response order)
2. Use database transactions (BEGIN/COMMIT) when saving aggregated trades to prevent partial writes
3. Implement idempotency: save transaction signatures and reject duplicates before parsing
4. Fetch current balances (`/v1/wallet/{wallet}/balances`) to confirm position closure, don't rely on transaction parsing alone
5. Add `last_synced_signature` to track cursor position instead of timestamp-based filtering
6. Handle partial sells properly: if balance > 0 after exit transactions, mark position as open

**Phase Mapping:**
- **Phase 1 (Trade Detection):** Implement signature-based deduplication and sorting
- **Phase 2 (Aggregation Logic):** Add balance verification for position closure
- **Phase 3 (Sync Reliability):** Implement cursor-based pagination with signature tracking

---

### 4. Stale SOL/USD Pricing During Volatile Markets

**Description:**
Helius provides SOL/USD prices with hourly updates and only for top 10K tokens by market cap. During meme coin pumps or market volatility, hour-old prices can be off by 20-50%, making USD displays and goal tracking inaccurate.

**Warning Signs:**
- Dashboard shows USD balance significantly different from wallet explorer (Solscan, etc.)
- Monthly goal progress jumps 30%+ between refreshes
- Users report profit targets met but UI shows "not reached"
- Token prices show 0 USD for legitimate tokens
- Mega wins (>500% ROI) show incorrect cashout USD amounts

**Prevention Strategy:**
1. Display price staleness indicator: "Prices updated 47 min ago"
2. Fetch prices from multiple sources (Helius, Jupiter, CoinGecko) and use median
3. Cache prices client-side with TTL, show warning if >15 min old
4. For critical decisions (cashout recommendations), fetch live price from Jupiter Aggregator
5. Add "Refresh Prices" button that forces fresh price fetch
6. Store both SOL amount and USD equivalent in database - recalculate USD on display

**Phase Mapping:**
- **Phase 2 (Dashboard):** Add price staleness indicators and refresh mechanism
- **Phase 3 (Cashout System):** Implement multi-source price validation for cashout calculations
- **Ongoing:** Monitor price deviation between sources

---

### 5. Position Closure Detection Fails on Dust Amounts

**Description:**
Solana token accounts often leave "dust" amounts (0.000001 tokens) due to rounding in swaps. If dust is treated as open position, users see closed trades marked as open forever. If ignored improperly, real partial sells appear as full exits.

**Warning Signs:**
- Trades closed weeks ago still show as "open" in dashboard
- Dust amounts (< 0.01 tokens) trigger "position open" flag
- Users report selling 99% of position but app shows 0% closed
- Token balances query returns accounts with tiny amounts for hundreds of tokens
- Position closure logic inconsistent between trades (some detect dust, some don't)

**Prevention Strategy:**
1. Define dust threshold per token (0.01 for most, 0.0001 for high-value tokens like BTC)
2. Implement `handleDustAmounts()` consistently across all balance checks (already in codebase)
3. Fetch `uiAmount` from Helius (human-readable) instead of raw `amount` to avoid decimal math errors
4. Add "partial close" state: position marked as "90% closed" if substantial but not 100%
5. Let users manually mark positions as closed if dust persists
6. Filter token balances query: exclude accounts with `uiAmount < 0.01`

**Phase Mapping:**
- **Phase 1 (Trade Detection):** Implement consistent dust handling in aggregation logic
- **Phase 2 (Position Tracking):** Add partial closure states and manual override
- **Phase 3 (UX Polish):** Filter dust from balance displays

---

### 6. ROI Bonus Over-Extraction at High Tiers

**Description:**
Known issue: +20% ROI bonus on mega wins (>500% ROI) can push cashout percentage too high at upper tiers (e.g., Tier 5: 60% base + 20% bonus = 80% of profit extracted). Repeatedly extracting 80% from vault wallet drains capital and prevents compounding.

**Warning Signs:**
- Wallet balance drops below tier threshold after multiple cashouts
- Users manually reject cashout recommendations frequently
- Average cashout percentage exceeds 70% for Tier 4-5 users
- Vault balance grows faster than trading wallet (unsustainable)
- User complaints about "app telling me to take too much profit"

**Prevention Strategy:**
1. Implement hard cap on final cashout percentage: max 65% regardless of bonuses
2. Scale ROI bonus inversely with tier: Tier 1 gets +20%, Tier 5 gets +5%
3. Add "compounding mode" setting: user opts to cap cashouts at 50% to preserve capital
4. Show warning in UI if recommended cashout would drop wallet below current tier threshold
5. Calculate "sustainable extraction rate" based on win rate and tier velocity
6. Add override mechanism: user can manually set max cashout % per tier

**Phase Mapping:**
- **Phase 2 (Cashout Calculator):** Implement cap mechanism and tier-based scaling
- **Phase 3 (UX Refinement):** Add warnings and user overrides
- **Phase 4 (Advanced Features):** Implement compounding mode and dynamic cap

---

## Technical Pitfalls

### 7. Next.js App Router SSR/Hydration Mismatch with Wallet Adapter

**Description:**
`@solana/wallet-adapter-react` relies on browser APIs (localStorage, window) that don't exist during server-side rendering in Next.js App Router. Wrapping wallet provider in client component isn't enough - hydration mismatches occur when server renders "disconnected" state but client immediately shows "connected" from localStorage.

**Warning Signs:**
- React hydration errors in console: "Expected server HTML to contain matching text node"
- Wallet connection button flashes from "Connect" to wallet address on page load
- `useWallet()` hook returns null on first render even when wallet connected
- Errors like "localStorage is not defined" or "window is undefined" in server logs
- Wallet adapter modals don't render or appear off-screen

**Prevention Strategy:**
1. Create dedicated `WalletProvider` client component with `'use client'` directive
2. Use `useEffect()` to initialize wallet state client-side only - render null on server
3. Implement `<Suspense>` boundary around wallet-dependent components
4. Add `suppressHydrationWarning` to wallet UI elements that differ server/client
5. Store wallet address in cookie for SSR access (read-only, don't use for auth)
6. Use dynamic import with `{ ssr: false }` for wallet adapter components

**Phase Mapping:**
- **Phase 1 (Wallet Integration):** Set up proper client/server boundary for wallet provider
- **Phase 2 (SSR Optimization):** Implement suspense boundaries and hydration fixes
- **Testing:** Add E2E tests for wallet connection flow with SSR enabled

**Code Example:**
```tsx
// app/providers.tsx
'use client'

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'
import { useMemo, useEffect, useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const wallets = useMemo(() => [new PhantomWalletAdapter()], [])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null // Prevent SSR render

  return (
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>{children}</WalletModalProvider>
    </WalletProvider>
  )
}
```

---

### 8. Helius Rate Limiting Breaks Trade Sync for Active Wallets

**Description:**
Current implementation fetches transaction history with `limit: 100` and then makes individual `getTransaction` calls for each signature (line 203-231 in `helius-client.ts`). Active meme traders with 1000+ transactions hit 10 req/sec rate limit, causing sync to fail or take 100+ seconds.

**Warning Signs:**
- Trade sync endpoint returns 429 errors during peak hours
- Sync process takes >30 seconds for wallets with >500 transactions
- Rate limiter logs show bursts of requests followed by long waits
- New trades don't appear for hours after execution
- Helius API usage dashboard shows sudden spikes near daily limit

**Prevention Strategy:**
1. Use Helius Enhanced Transactions API (`/v0/addresses/{address}/transactions?api-key=`) which returns full transaction details in single call (no per-signature fetch needed)
2. Implement cursor-based pagination: save `last_synced_signature` and use `before` parameter
3. Add background sync job (cron) instead of sync-on-request for active wallets
4. Cache transaction signatures in database to skip re-fetching already parsed transactions
5. Batch signature fetches: use `getMultipleTransactions` RPC method (up to 100 signatures per call)
6. Implement exponential backoff that respects rate limit headers from Helius

**Phase Mapping:**
- **Phase 1 (Data Fetching):** Switch to Enhanced Transactions API to reduce call volume
- **Phase 2 (Sync Optimization):** Implement cursor pagination and signature caching
- **Phase 3 (Scalability):** Add background sync jobs for active wallets

---

### 9. Supabase Service Role Key Exposed in API Routes

**Description:**
Using `SUPABASE_SERVICE_ROLE_KEY` in API routes bypasses Row Level Security (RLS) and gives unlimited database access. Combined with weak cookie auth, this allows attackers to read/write any data by hitting API endpoints with spoofed cookies.

**Warning Signs:**
- Database queries succeed even when RLS policies deny access
- Users can query other users' data by manipulating request parameters
- Audit logs show admin-level operations from regular user sessions
- No RLS policy violations logged despite security misconfiguration
- Service role key appears in client-side error stack traces

**Prevention Strategy:**
1. Never use service role key in API routes accessible to users
2. Implement proper Supabase Auth with user-scoped sessions (`supabase.auth.getUser()`)
3. Enable RLS policies on all tables and use anon key for user-scoped queries
4. Reserve service role for admin-only operations (migrations, backfills, internal tools)
5. Add middleware that validates user session and injects user context into request
6. Implement API key rotation policy: rotate service role monthly

**Phase Mapping:**
- **Phase 1 (Security Foundation):** Replace service role with proper user auth
- **Phase 2 (RLS Implementation):** Enable and test RLS policies on all tables
- **Phase 3 (Audit):** Add logging for service role usage, alert on anomalies

---

### 10. Transaction Parsing Assumes Consistent Helius Schema

**Description:**
Trade parser in `src/lib/trade-parser.ts` extracts token transfers and native transfers without validating structure. If Helius changes transaction format (nested fields, renamed properties) or returns partial data, parser silently fails, creating trades with 0 amounts or missing tokens.

**Warning Signs:**
- Trades suddenly show `totalEntry: 0` or `totalExit: 0` despite valid transactions
- Token symbols missing (`undefined`) for all new trades
- Parser throws type errors like "Cannot read property 'amount' of undefined"
- Old trades parse correctly but new ones fail
- Helius API returns success (200) but parsed data is incomplete

**Prevention Strategy:**
1. Add Zod schema validation for `HeliusTransaction` type before parsing
2. Implement defensive checks: `if (!transfer?.amount) return null` instead of assuming presence
3. Log unparsable transactions to separate table for manual review
4. Add integration tests with real Helius responses (save fixtures for major schema versions)
5. Implement schema versioning: detect Helius API version from response headers and route to correct parser
6. Fallback to raw transaction parsing if Wallet API format unrecognized

**Phase Mapping:**
- **Phase 1 (Trade Detection):** Add Zod validation before parsing
- **Phase 2 (Error Handling):** Implement logging for unparsable transactions
- **Phase 3 (Resilience):** Add schema versioning and fallback parser

---

### 11. Token Metadata Fetched Individually in Sync Loop

**Description:**
`getTokenSymbol(trade.tokenMint)` called for each parsed trade individually (line 194 in `trade-service.ts`), making separate DexScreener API call per token. 10 trades with 10 different tokens = 10 sequential API calls, hitting rate limits and slowing sync to 5-10 seconds.

**Warning Signs:**
- Trade sync takes significantly longer for wallets with many unique tokens
- DexScreener rate limit errors (429) during sync
- Token symbols missing for trades even though metadata exists
- Dashboard shows "Loading..." for token symbols indefinitely
- API logs show sequential DexScreener calls instead of batched

**Prevention Strategy:**
1. Collect all unique token mints from parsed trades before metadata lookup
2. Use DexScreener batch endpoint (already implemented: up to 30 tokens per request)
3. Cache token metadata in `token_registry` table with 24-hour TTL
4. Fetch metadata in parallel using `Promise.all()` instead of sequential loop
5. Pre-populate token registry during sync: save all token metadata before saving trades
6. Implement queue system: batch metadata lookups every 5 seconds instead of per-trade

**Phase Mapping:**
- **Phase 1 (Optimization):** Batch token metadata lookups before saving trades
- **Phase 2 (Caching):** Implement database-backed token registry
- **Phase 3 (Performance):** Add queueing system for metadata fetches

---

### 12. No Pagination on Trades Endpoint Causes Memory Issues

**Description:**
`GET /api/trades` returns ALL trades for user without limit/offset (line 65-72 in `src/app/api/trades/route.ts`). Active traders with 1000+ trades load entire history on every page load, causing slow network, high memory usage, and potential browser crashes.

**Warning Signs:**
- Dashboard takes 10+ seconds to load for active traders
- Browser memory usage spikes when loading trades page
- Network tab shows 5MB+ JSON responses
- Mobile browsers crash when opening trades list
- Users complain about "app is slow" or "can't see my trades"

**Prevention Strategy:**
1. Add `limit` and `offset` query parameters to trades endpoint: default 50 trades per page
2. Return pagination metadata: `{ trades: [], total: 1234, page: 1, perPage: 50 }`
3. Implement cursor-based pagination using `created_at` for better performance
4. Add infinite scroll or "Load More" button on frontend instead of showing all trades
5. Cache paginated results in Redis with 1-minute TTL
6. Add database index on `(user_id, position_closed_at DESC)` for fast sorted queries

**Phase Mapping:**
- **Phase 2 (Trade History):** Implement pagination in API and UI
- **Phase 3 (Performance):** Add cursor-based pagination and caching
- **Testing:** Load test with 10K+ trade dataset

---

## UX Pitfalls

### 13. Misleading "Connected" State When Wallet Lacks Permissions

**Description:**
Wallet adapter shows "Connected" even when user denied permissions or connected in read-only mode. App proceeds to fetch data and shows empty states or errors instead of prompting for proper permissions. Users think app is broken when they just need to approve connection properly.

**Warning Signs:**
- Wallet shows connected but dashboard displays "No wallets found"
- Trade sync returns empty array for wallets with known activity
- Error messages like "Unauthorized" or "Access denied" despite connection
- Users report "I connected but nothing happens"
- Wallet address appears in UI but API calls fail with 403

**Prevention Strategy:**
1. Check wallet connection status AND permissions: `wallet.connected && wallet.readyState === 'Installed'`
2. Add permission check flow: after connection, verify wallet allows reading public key
3. Display specific error: "Wallet connected but permission denied. Please reconnect and approve access."
4. Implement reconnection flow with explicit permission prompt
5. Add visual indicator: "Connected (Read-Only)" vs "Connected (Full Access)"
6. Test with all major wallets (Phantom, Solflare, Backpack) - permission flows differ

**Phase Mapping:**
- **Phase 1 (Wallet Integration):** Add permission validation after connection
- **Phase 2 (UX Polish):** Implement clear error states and reconnection flow
- **Testing:** Test permission flows across all supported wallets

---

### 14. Cashout Recommendations Without Context Confuse Users

**Description:**
Showing "Withdraw 4.5 SOL (55%)" without explaining WHY (tier, ROI bonus, streak) makes users distrust recommendations. They don't understand why percentage changes between trades or why it's higher/lower than expected. Users ignore recommendations or over-extract manually.

**Warning Signs:**
- Users ask "Why does it say 55% and not 50%?"
- Cashout acceptance rate <30% (users reject most recommendations)
- Manual cashouts significantly higher than recommendations (users over-extract)
- Support requests about "wrong cashout calculation"
- Users disable cashout notifications

**Prevention Strategy:**
1. Show breakdown in UI: "Base: 50% (Tier 3) + 5% (ROI Bonus) = 55%"
2. Add tooltip explaining each component (tier rate, streak multiplier, goal boost)
3. Display tier threshold: "You're in Tier 3 (5-10 SOL). Next tier at 10 SOL = 55% base rate."
4. Show historical context: "Your average cashout: 48% | Recommended: 55%"
5. Add "Learn More" link to docs explaining cashout system
6. Implement onboarding tutorial that walks through first cashout recommendation

**Phase Mapping:**
- **Phase 2 (Cashout System):** Add breakdown display and tooltips
- **Phase 3 (UX Refinement):** Implement historical context and onboarding
- **User Testing:** Validate understanding with target users

---

### 15. Trade Sync Feels Broken Due to Lack of Progress Indicators

**Description:**
Clicking "Refresh Trades" triggers 30+ second sync process with no feedback. Users think app froze, click multiple times, triggering concurrent syncs that compound delays. No indication of progress (fetching transactions, parsing trades, saving to DB) leads to abandonment.

**Warning Signs:**
- Users report "refresh button doesn't work"
- Multiple concurrent sync API calls from same user
- High bounce rate on trades page (users leave during sync)
- Support requests: "How long does sync take?"
- Users refresh browser mid-sync, aborting process

**Prevention Strategy:**
1. Show progress indicator: "Fetching transactions... (1/3)"
2. Display step-by-step status: "Fetched 127 transactions → Parsing trades → Saving to database"
3. Add estimated time remaining: "Usually takes 15-20 seconds for wallets with 500+ trades"
4. Disable refresh button during sync to prevent duplicates
5. Show partial results: display trades as they're parsed instead of waiting for all
6. Add cancel button: allow users to abort long-running syncs
7. Implement background sync: show cached trades immediately, update in background

**Phase Mapping:**
- **Phase 2 (Trade Sync):** Add progress indicators and estimated time
- **Phase 3 (UX Polish):** Implement partial results and background sync
- **User Testing:** Validate sync experience with target users

---

### 16. Monthly Goal Progress Misleading During Volatile Markets

**Description:**
Goal progress calculated in USD using stale prices (hourly updates). During meme coin pumps/dumps, progress can swing wildly between refreshes (40% → 80% → 50%), making users distrust goal tracking. Some users "reach" goal when price high, lose it when price updates.

**Warning Signs:**
- Goal progress chart shows jagged swings instead of smooth progression
- Users report "I hit my goal but then it disappeared"
- Progress percentage changes significantly without new trades
- USD amounts don't match user's manual calculations
- Goal reached notification triggers then retracts

**Prevention Strategy:**
1. Display goal progress in SOL (stable) alongside USD (volatile)
2. Add price update timestamp: "Goal progress based on prices from 23 min ago"
3. Show "locked-in" progress: only count closed trades, exclude open position USD value
4. Implement goal snapshot: when user reaches goal, save snapshot - don't recalculate with new prices
5. Add volatility warning: "Your goal is $400/month. Current progress may fluctuate with market prices."
6. Let users choose goal currency: SOL (stable tracking) or USD (familiar metric)

**Phase Mapping:**
- **Phase 2 (Goal System):** Display SOL alongside USD, add price timestamps
- **Phase 3 (UX Refinement):** Implement locked-in progress and goal snapshots
- **User Testing:** Test goal tracking during volatile market conditions

---

## Domain-Specific Pitfalls

### 17. Failed Transactions Counted as Valid Trades

**Description:**
Not all Solana transactions succeed - some fail due to slippage, insufficient funds, or program errors. If parser doesn't check transaction status, failed swaps appear as trades with incorrect amounts. Users see "ghost trades" that never happened.

**Warning Signs:**
- Trades appear for tokens user never bought
- Entry/exit amounts don't match wallet history in Solscan
- Trades with impossible timing (same second as another trade)
- Net profit calculations way off from user's manual tracking
- Users report "I didn't make that trade"

**Prevention Strategy:**
1. Check transaction status before parsing: `tx.meta.err === null` (success) vs `!== null` (failed)
2. Filter failed transactions early: exclude from trade aggregation entirely
3. Add "status" field to trades table: "success" | "failed" | "pending"
4. Display failed transactions separately in UI: "Failed Swaps (Not Counted in Stats)"
5. Log failed transaction rate: if >20%, investigate wallet for systematic failures
6. Validate amounts against on-chain state: compare parsed amounts to actual balance changes

**Phase Mapping:**
- **Phase 1 (Trade Detection):** Add transaction status filtering
- **Phase 2 (Data Quality):** Implement failed transaction tracking
- **Phase 3 (Debugging):** Add validation against on-chain state

---

### 18. Token Swap Programs Vary - Parser Assumes Raydium/Jupiter Only

**Description:**
Solana has multiple DEX programs (Raydium, Orca, Jupiter, Phoenix, Meteora) with different instruction formats. Parser built for Raydium/Jupiter may miss swaps on other DEXs or parse them incorrectly, causing incomplete trade history.

**Warning Signs:**
- User reports trades missing despite visible in wallet explorer
- Specific tokens never appear in trade history despite user confirmation
- Swaps on Orca/Phoenix don't get parsed
- `isSwapTransaction()` returns false for valid swap transactions
- Token transfer detected but no corresponding SOL transfer

**Prevention Strategy:**
1. Use Helius Enhanced Transactions which normalizes all DEX formats
2. Don't rely on program ID matching - check for balance changes instead
3. Detect swaps by pattern: native transfer + token transfer in same transaction
4. Add DEX program allowlist: support top 5 DEXs (Raydium, Jupiter, Orca, Phoenix, Meteora)
5. Log unrecognized transaction types for manual review
6. Implement plugin architecture: add DEX parsers as needed without rewriting core logic

**Phase Mapping:**
- **Phase 1 (Trade Detection):** Use Helius parsed data instead of program-specific parsing
- **Phase 2 (Coverage):** Add support for top 5 DEX programs
- **Phase 3 (Extensibility):** Implement plugin system for new DEXs

---

### 19. Meme Coin Metadata Changes - Token Symbols Become Stale

**Description:**
Meme coins frequently rebrand (symbol change, new mint after migration). Cached token metadata becomes stale, showing old symbols for migrated tokens or missing symbols for rebranded tokens. Users see "UNKNOWN" instead of current token name.

**Warning Signs:**
- Token symbols show outdated names (old ticker after rebrand)
- "UNKNOWN" tokens appear for trades user knows the name of
- Symbol cache returns data for tokens that migrated to new mint
- Users report "wrong token name in my trades"
- Dashboard shows multiple entries for same token (old + new mint)

**Prevention Strategy:**
1. Set aggressive cache TTL for meme coins: 6 hours instead of 24 hours
2. Implement cache invalidation: manual button to "refresh token metadata"
3. Check token migration status: query registry for mint migrations (old → new)
4. Display mint address alongside symbol for user verification
5. Add "Report Wrong Name" button: users can flag stale metadata
6. Use multiple metadata sources: DexScreener + Jupiter + Helius, prefer most recent

**Phase Mapping:**
- **Phase 2 (Token Metadata):** Implement shorter cache TTL and refresh mechanism
- **Phase 3 (Data Quality):** Add migration detection and multi-source validation
- **Ongoing:** Monitor user reports of incorrect symbols

---

### 20. Wallet Security Best Practices Not Enforced

**Description:**
App doesn't warn users about security risks: using trading wallet address as vault (defeating purpose), connecting hardware wallet in read-only mode, or storing large amounts in hot wallets. Users make unsafe configurations that reduce effectiveness or increase risk.

**Warning Signs:**
- Users set same address for trading and vault wallets
- Vault wallet contains <1 SOL (defeats profit extraction purpose)
- Users ask "Is it safe to keep 100 SOL in my trading wallet?"
- No warnings about hot wallet risks for large balances
- Users connect read-only wallet and don't understand why sync fails

**Prevention Strategy:**
1. Validate wallet setup: reject if trading wallet === vault wallet
2. Show warning if trading wallet balance >20 SOL: "Consider using hardware wallet for large amounts"
3. Add vault wallet verification: require proof of ownership (sign message with vault wallet)
4. Display security checklist during onboarding: separate wallets, use hardware for vault, etc.
5. Implement wallet health score: grade based on balance distribution, wallet types, etc.
6. Add educational content: "Why separate wallets?" with diagrams

**Phase Mapping:**
- **Phase 1 (Wallet Setup):** Add validation preventing same wallet for trading/vault
- **Phase 2 (Security):** Implement warnings for large balances and wallet verification
- **Phase 3 (Education):** Add security checklist and wallet health score

---

### 21. Solana Network Congestion Causes Sync Failures

**Description:**
During meme coin mania or NFT mints, Solana network congestion causes RPC timeouts, failed transactions, and slow block times. Helius API may timeout or return partial data, causing sync failures. Users blame app when it's network-wide issue.

**Warning Signs:**
- Sync fails with timeout errors during peak hours (US afternoon)
- Helius requests take >30 seconds instead of <5 seconds
- Recent trades missing from history despite being on-chain
- Multiple consecutive sync attempts fail
- Users report "app not working" during network congestion events

**Prevention Strategy:**
1. Implement retry logic with exponential backoff (already in codebase, verify works correctly)
2. Display network status indicator: "Solana Network: Congested (Slow Syncs Expected)"
3. Add fallback RPC endpoints: try Helius, QuickNode, Triton if primary fails
4. Increase timeout during congestion: detect slow responses and extend timeout to 60s
5. Queue sync requests: if network slow, process syncs sequentially instead of concurrently
6. Cache last successful sync: show cached data with staleness warning during outages

**Phase Mapping:**
- **Phase 2 (Reliability):** Add network status indicator and fallback RPCs
- **Phase 3 (Resilience):** Implement smart retry logic and request queueing
- **Monitoring:** Track network congestion metrics to predict failures

---

### 22. Wash Trading Detection Missing - Inflated ROI Stats

**Description:**
Users can artificially inflate ROI by wash trading: buy token with wallet A, sell to wallet B (also owned), repeat. App counts these as legitimate profitable trades, triggering high cashout recommendations and goal bonuses when no real profit exists.

**Warning Signs:**
- User has 100% win rate over 50+ trades (statistically impossible)
- Trades show suspiciously consistent ROI (all ~150%)
- Same tokens bought and sold repeatedly within minutes
- Net profit matches trading fees exactly (break-even disguised as wins)
- Vault wallet never receives cashouts despite "profitable" trades

**Prevention Strategy:**
1. Detect circular trading patterns: same token bought/sold >5 times in 24 hours
2. Flag suspiciously high win rates: >80% over 20+ trades triggers review
3. Require vault cashout before goal credit: goal progress only updates after vault deposit confirmed
4. Add heuristic scoring: analyze trading patterns for wash trading indicators
5. Display warning: "Unusual trading pattern detected - profit calculations may be inaccurate"
6. Implement peer comparison: show user's win rate vs community average

**Phase Mapping:**
- **Phase 3 (Anti-Abuse):** Implement wash trading detection heuristics
- **Phase 4 (Advanced Features):** Add peer comparison and pattern analysis
- **Ongoing:** Monitor for abuse patterns and refine detection

---

## Prevention Checklist

### Data Fetching & Integration
- [ ] Validate all Helius API responses with Zod schemas before parsing
- [ ] Pin API schema version if Helius supports versioning
- [ ] Implement fallback to raw transaction parsing if Wallet API fails
- [ ] Subscribe to Helius changelog/Discord for beta API updates
- [ ] Test with real Helius responses saved as fixtures
- [ ] Add retry logic with exponential backoff for rate limits
- [ ] Switch to Enhanced Transactions API to reduce API calls
- [ ] Implement cursor-based pagination using `last_synced_signature`
- [ ] Batch token metadata lookups (30 tokens per request)
- [ ] Cache token metadata in database with 6-12 hour TTL
- [ ] Check transaction status (`tx.meta.err === null`) before parsing
- [ ] Support top 5 DEX programs (Raydium, Jupiter, Orca, Phoenix, Meteora)

### Authentication & Security
- [ ] Replace boolean cookie auth with signed message verification
- [ ] Implement JWT tokens with wallet address in claims
- [ ] Add CSRF protection to all mutation endpoints
- [ ] Validate wallet signature on every protected API call
- [ ] Replace service role with user-scoped Supabase auth
- [ ] Enable RLS policies on all database tables
- [ ] Implement session invalidation/revocation mechanism
- [ ] Add audit logging for all write operations
- [ ] Validate wallet setup: reject if trading === vault address
- [ ] Require vault wallet ownership proof (signed message)

### Trade Detection & Aggregation
- [ ] Sort transactions by `blockTime` before aggregation
- [ ] Use database transactions (BEGIN/COMMIT) for atomic saves
- [ ] Implement idempotency: track transaction signatures to prevent duplicates
- [ ] Fetch current balances to verify position closure (don't rely on parsing alone)
- [ ] Define and apply dust thresholds consistently (`handleDustAmounts()`)
- [ ] Add partial closure state (90% closed) instead of binary open/closed
- [ ] Log unparsable transactions to separate table for review
- [ ] Implement wash trading detection heuristics
- [ ] Filter failed transactions early (check `tx.meta.err`)

### Wallet Integration & SSR
- [ ] Create `WalletProvider` client component with `'use client'` directive
- [ ] Use `useEffect()` to initialize wallet state client-side only
- [ ] Implement `<Suspense>` boundary around wallet-dependent components
- [ ] Add `suppressHydrationWarning` to wallet UI elements
- [ ] Use dynamic import with `{ ssr: false }` for wallet components
- [ ] Check wallet connection AND permissions before proceeding
- [ ] Add reconnection flow with explicit permission prompt
- [ ] Test permission flows across all supported wallets (Phantom, Solflare, Backpack)

### Price Handling & Display
- [ ] Display price staleness: "Prices updated 47 min ago"
- [ ] Fetch prices from multiple sources (Helius, Jupiter, CoinGecko), use median
- [ ] Add "Refresh Prices" button for manual price updates
- [ ] For cashouts, fetch live price from Jupiter Aggregator
- [ ] Store SOL amount and USD equivalent separately, recalculate USD on display
- [ ] Show volatility warning for USD-based goals
- [ ] Let users choose goal currency: SOL or USD

### UX & Feedback
- [ ] Show cashout breakdown: "Base: 50% (Tier 3) + 5% (ROI) = 55%"
- [ ] Add tooltips explaining each cashout component
- [ ] Display tier threshold and progression
- [ ] Show progress indicator during sync: "Fetching transactions... (1/3)"
- [ ] Add estimated time remaining for long-running operations
- [ ] Disable buttons during operations to prevent duplicate requests
- [ ] Show partial results instead of waiting for completion
- [ ] Add clear error states with specific messages (not generic "Error occurred")
- [ ] Implement onboarding tutorial for first-time users

### Performance & Scalability
- [ ] Add pagination to trades endpoint: default 50 per page
- [ ] Return pagination metadata (total, page, perPage)
- [ ] Add database indexes on commonly queried columns
- [ ] Cache paginated results with 1-minute TTL
- [ ] Implement background sync for active wallets instead of sync-on-request
- [ ] Use `Promise.all()` for parallel operations instead of sequential loops
- [ ] Add rate limiting per user/wallet (1 sync/min, 60 reads/min)
- [ ] Implement network status indicator for Solana congestion
- [ ] Add fallback RPC endpoints if primary fails

### Monitoring & Observability
- [ ] Log all API response schemas to detect drift
- [ ] Add error monitoring (Sentry or similar)
- [ ] Track network congestion metrics
- [ ] Monitor price deviation between sources
- [ ] Log unparsable transactions for manual review
- [ ] Track wash trading detection flags
- [ ] Add audit trail for all mutations
- [ ] Monitor API usage to stay within Helius limits

### Cashout System
- [ ] Implement hard cap on final cashout percentage (max 65%)
- [ ] Scale ROI bonus inversely with tier (Tier 1: +20%, Tier 5: +5%)
- [ ] Show warning if cashout would drop wallet below tier threshold
- [ ] Calculate sustainable extraction rate based on win rate
- [ ] Add "compounding mode" setting to cap cashouts at 50%
- [ ] Allow user override: manual max cashout % per tier

---

*This pitfalls research document should be reviewed and updated as the project evolves and new issues are discovered during development.*
