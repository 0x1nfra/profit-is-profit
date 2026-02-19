# Project Research Summary

**Project:** Profit is Profit (PisP)
**Domain:** Crypto trading tools - Solana meme coin profit-taking automation
**Researched:** 2026-02-20
**Confidence:** HIGH

## Executive Summary

Profit is Profit is a Next.js-based Solana trading tool that automates profit-taking recommendations for low-capital meme coin traders. Research shows this product type is best built as a unified Next.js App Router application with server-side blockchain integration, behavioral psychology-driven UX, and strict non-custodial architecture.

The recommended approach centers on a three-tier architecture: Next.js 16 for frontend/backend, Helius Wallet API for blockchain data ingestion, and Supabase for persistence. The key differentiator is the 5-tier wallet health system that provides adaptive cashout recommendations based on capital state - no other tool in this space offers prescriptive profit-taking guidance. Core technical challenges include Helius API beta instability, complex trade aggregation logic with race conditions, and wallet authentication security.

Critical risks include Helius API breaking changes (beta product), weak authentication enabling impersonation, and race conditions in multi-transaction trade detection. Mitigation strategies center on strict schema validation, cryptographic signature verification, and transaction ordering with idempotency guarantees. The architecture supports rapid MVP development while providing clear evolution paths for automated cashouts, real-time updates, and multi-chain support.

## Key Findings

### Recommended Stack

The stack prioritizes production-ready libraries compatible with Next.js 16 App Router and React 19's server component architecture, with Helius Wallet API as the single blockchain data source.

**Core technologies:**
- **Next.js 16 App Router**: Unified frontend/backend reduces deployment complexity, built-in API routes avoid CORS issues
- **@solana/wallet-adapter-react v0.15.35+**: Industry standard for Solana wallet integration, supports 20+ wallets
- **Helius Wallet API (beta)**: Simplified blockchain data access via REST instead of raw RPC calls, includes parsed transaction data
- **TanStack Query v5**: Server state management with built-in cursor pagination for Helius infinite scroll
- **Zustand v5**: Lightweight client state for wallet/UI state without Redux boilerplate
- **Supabase**: Managed PostgreSQL with built-in Row-Level Security and wallet-based authentication
- **ky v1.7+**: Modern fetch wrapper with retry logic and rate limiting for Helius integration
- **Zod v3.24+**: Runtime validation to catch Helius API schema drift

**Critical version constraints:**
- Use @solana/web3.js v1.x (NOT v2 - still beta, adapter incompatibility)
- Next.js 16 requires proper client/server boundaries for wallet adapters (SSR challenges)
- Tailwind CSS 4 already in stack, shadcn/ui components compatible

**Bundle impact:** ~280KB uncompressed (~75KB gzipped) for full Solana stack

### Expected Features

Research identifies clear separation between table stakes (competitive parity), differentiators (unique value), and anti-features (deliberately avoided complexity).

**Must have (table stakes):**
- Real-time wallet balance tracking - users expect this in all crypto apps
- Transaction detection and P&L calculation - core to trust and verification
- Wallet-based authentication - standard Web3 UX pattern
- Mobile-responsive design - meme traders operate on mobile
- Basic dashboard view - orientation and status at a glance

**Should have (competitive differentiators):**
- 5-tier wallet health system (Critical/Low/Healthy/Comfortable/Thriving) - unique mechanic not found in competitors
- Automated cashout recommendations (not execution) - removes decision paralysis
- Monthly goal tracking ($400 USD target) - motivational framing for low-port traders
- Vault wallet integration - behavioral separation of "play money" vs "secured profits"
- Simplified UX for 1-3 SOL traders - competitors overwhelm with features for whales

**Defer (v2+):**
- Sunday boost system (2x cashout % on Sundays) - nice-to-have behavioral nudge
- Win rate awareness display - educational but not MVP-critical
- CSV export for tax reporting - users can use external tools initially

**Anti-features (deliberately excluded):**
- Automated trading/execution - regulatory risk, custodial complexity, out of scope
- Advanced charting/TA tools - other tools do this better, not core to profit-taking
- Multi-chain support - dilutes focus, Solana-only is differentiated positioning
- Social features/leaderboards - encourages gambling behavior contrary to product mission
- Tax reporting - complex compliance burden for MVP

**Competitive positioning:** PisP differentiates on profit discipline and behavioral psychology, not trading execution or technical analysis.

### Architecture Approach

The architecture follows a pragmatic monolithic Next.js pattern with stateless API design and pure business logic functions. Database-driven state eliminates in-memory caching complexity.

**Major components:**

1. **Frontend (Client-Side)** - Next.js App Router pages, shadcn/ui components, Zustand stores for UI state
   - Renders UI, handles interactions, makes API calls
   - Wallet adapter requires `'use client'` boundary and SSR workarounds

2. **Backend (Server-Side API Routes)** - Next.js route handlers orchestrate business logic
   - `/api/trades/refresh`: Fetches Helius data, parses trades, calculates cashouts
   - `/api/wallets/setup`: Creates trading + vault wallet records
   - `/api/cashouts/confirm`: Records cashout, updates balances (user executes transfer manually)
   - Authenticates via Supabase session, not exposed service role

3. **Service Layer** - Business logic orchestration (`trade-service.ts`, `trade-parser.ts`, `cashout-calculator.ts`)
   - `syncTrades()`: Helius fetch → parse → calculate → save pipeline
   - Pure functions for calculators (100% test coverage, 229 passing unit tests)
   - Separation of concerns: parsing vs calculation vs persistence

4. **External Integrations**
   - Helius Wallet API: Transaction history, balances (rate limited: 150 req/min free tier)
   - Supabase PostgreSQL: User data with Row-Level Security enforcing isolation
   - Jupiter Price API v2: Live SOL/USD pricing (~1s latency, no auth required)

**Key patterns:** Service layer for orchestration, repository pattern (implicit via Supabase helpers), strategy pattern for cashout calculation, facade for Helius client complexity.

**Data flow:** User triggers refresh → API authenticates → Helius fetch → Parse trades → Calculate cashouts → Save to Supabase → Return to frontend → Update UI

**Build order dependencies:** Foundation (calculators, clients) → Backend services (parsers, APIs) → Authentication (wallet signatures) → Frontend UI → Cashout flow → Goal system → Polish

### Critical Pitfalls

Research identified 22 pitfalls across critical, technical, UX, and domain-specific categories. Top 5 by impact:

1. **Helius API Beta Breaking Changes** - Endpoint schemas can change without warning, silently corrupting trade detection
   - **Prevention:** Strict Zod validation before parsing, integration tests with saved fixtures, subscribe to Helius changelog, implement fallback to raw RPC
   - **Phase impact:** Phase 1 must implement response validation, ongoing monitoring required

2. **Weak Wallet Authentication Enables Impersonation** - Current boolean cookie can be manually set, allows anyone to view any wallet's data
   - **Prevention:** Implement message signing with wallet private key, validate signature server-side, use JWT tokens with wallet address in claims, add CSRF protection
   - **Phase impact:** Phase 1 auth foundation must use signed message verification, not cookies

3. **Race Conditions in Trade Aggregation** - Multiple buys/sells of same token can arrive out of order, causing duplicate or incorrect trades
   - **Prevention:** Sort transactions by blockTime before parsing, use database transactions for atomic saves, implement idempotency via signature tracking, verify position closure with balance queries
   - **Phase impact:** Phase 1 trade detection needs signature deduplication and transaction sorting

4. **Stale SOL/USD Pricing During Volatility** - Hourly Helius prices can be 20-50% off during pumps, making USD displays misleading
   - **Prevention:** Display staleness indicator, fetch from multiple sources (Helius + Jupiter + CoinGecko median), force fresh fetch for cashout calculations, store SOL amount separately from USD
   - **Phase impact:** Phase 2 dashboard needs staleness UI, Phase 3 cashout needs multi-source validation

5. **ROI Bonus Over-Extraction at High Tiers** - Known issue: +20% ROI bonus on mega wins (>500% ROI) pushes cashout too high at Tier 5 (80% extraction unsustainable)
   - **Prevention:** Hard cap final cashout at 65%, scale ROI bonus inversely with tier (T1: +20%, T5: +5%), warn if cashout drops wallet below tier threshold
   - **Phase impact:** Phase 2 cashout calculator must implement cap mechanism

**Additional notable pitfalls:** Next.js SSR/hydration mismatch with wallet adapter (requires `'use client'` boundary + useEffect initialization), Helius rate limiting (switch to Enhanced Transactions API to reduce calls), token metadata staleness (6-hour cache TTL for meme coins), no pagination causing memory issues (default 50 trades per page), failed transactions counted as valid trades (check `tx.meta.err === null`).

## Implications for Roadmap

Based on research, suggested phase structure prioritizes foundation → core flows → behavioral features → polish. Architecture dependencies and pitfall mitigation inform sequencing.

### Phase 1: Foundation & Data Ingestion
**Rationale:** Pure functions and external clients have no internal dependencies, must be built first. Trade detection is critical path - all features depend on accurate trade data.

**Delivers:**
- Helius client with rate limiting and retry logic
- Trade parser with transaction sorting and signature deduplication
- Tier and cashout calculators (pure functions)
- Wallet authentication with signed message verification (not cookies)
- Database schema with RLS policies

**Addresses features:**
- Transaction detection and P&L calculation (table stakes)
- Real-time balance tracking (table stakes)
- 5-tier health system (differentiator)

**Avoids pitfalls:**
- Helius API beta breaking changes: Zod validation implemented from start
- Weak wallet authentication: Signed message verification, not boolean cookies
- Race conditions in aggregation: Transaction sorting and idempotency built-in
- Failed transactions counted: Filter by `tx.meta.err === null`

**Research flag:** MEDIUM - Helius Wallet API beta may have undocumented quirks, test extensively with real wallets

### Phase 2: Core User Flows
**Rationale:** With foundation in place, build the primary user journey: connect wallet → see trades → get recommendations → confirm cashouts.

**Delivers:**
- Dashboard with wallet cards and tier display
- Trade list with P&L visualization
- Cashout recommendation UI with breakdown tooltips
- Manual cashout confirmation flow
- SOL/USD pricing with staleness indicators

**Uses stack:**
- TanStack Query for infinite scroll trades list
- Zustand for UI state (modals, loading states)
- Jupiter Price API for live SOL/USD rates

**Implements architecture:**
- Frontend pages (dashboard, setup)
- API routes (trades/refresh, cashouts/confirm)
- Service layer orchestration (syncTrades, saveTrade)

**Avoids pitfalls:**
- Stale pricing during volatility: Multi-source price validation, staleness indicators
- ROI bonus over-extraction: Hard cap at 65%, tier-based scaling implemented
- Misleading cashout UX: Breakdown tooltips explain tier/ROI/streak components
- No pagination: Default 50 trades per page with infinite scroll

**Research flag:** LOW - Standard Next.js patterns, well-documented

### Phase 3: Vault Integration & Goals
**Rationale:** Behavioral features (vault separation, goal tracking) depend on core flows being functional but are independent from each other.

**Delivers:**
- Vault wallet setup and tracking
- Monthly goal tracking ($400 USD target)
- Goal progress visualization
- Vault deposit detection and confirmation

**Addresses features:**
- Vault wallet integration (differentiator)
- Monthly goal tracking (differentiator)

**Avoids pitfalls:**
- Wallet security best practices: Validate trading != vault address, warn on large balances
- Misleading goal progress: Display SOL alongside USD, lock-in progress when goal reached

**Research flag:** LOW - Straightforward feature additions on proven foundation

### Phase 4: Polish & Optimization
**Rationale:** With MVP functional, address UX friction, performance bottlenecks, and edge cases discovered in testing.

**Delivers:**
- Background sync for active wallets (cron job)
- Token metadata caching with smart TTL
- Network congestion handling (fallback RPCs)
- Progress indicators for long operations
- Onboarding tutorial for first-time users
- Error states with clear messaging

**Avoids pitfalls:**
- Trade sync feels broken: Progress indicators, estimated time, disable during operation
- Helius rate limiting: Enhanced Transactions API, cursor pagination, signature caching
- Token metadata staleness: 6-hour cache, refresh button, multi-source validation
- Network congestion: Status indicators, fallback RPCs, smart retry logic

**Research flag:** LOW - Standard optimization techniques

### Phase 5: Advanced Features (Post-MVP)
**Rationale:** Features that enhance but aren't critical for core value proposition.

**Delivers:**
- Sunday boost system (2x cashout % on Sundays)
- Win rate display and messaging
- Transaction history export (CSV)
- Wash trading detection heuristics

**Addresses features:**
- Sunday boost (deferred differentiator)
- Win rate awareness (deferred feature)

**Research flag:** MEDIUM - Behavioral features need user validation before extensive build

### Phase Ordering Rationale

**Critical path:** Phase 1 (Foundation) → Phase 2 (Core Flows) → Phase 3 (Goals) → Phase 4 (Polish)

**Why this order:**
- **Foundation first:** Calculators and clients have no internal dependencies, must exist before services
- **Core flows second:** Can't build UI without working APIs; can't build APIs without parsers/calculators
- **Goals third:** Independent feature, doesn't block core value prop, can be parallel with Phase 4
- **Polish fourth:** Can't optimize what doesn't exist; performance work requires representative data
- **Advanced last:** Post-MVP features validated by user feedback, not built on speculation

**Dependency insights from architecture research:**
- Auth can partially overlap with Phase 1 (both setup Supabase)
- Phase 3 and Phase 4 can be partially parallel (goals vs optimization are independent)
- Phase 5 entirely post-MVP, gated by user feedback

**Pitfall-driven sequencing:**
- Phase 1 must solve authentication before Phase 2 (impersonation risk blocks launch)
- Phase 1 must solve race conditions before Phase 2 (bad data corrupts all features)
- Phase 2 must solve pricing staleness before Phase 3 (goal tracking depends on accurate USD)
- Phase 4 addresses UX pitfalls only visible after core flows functional

### Research Flags

**Phases likely needing deeper research during planning:**

- **Phase 1 (Foundation):** Helius Wallet API beta quirks - official docs limited, may need reverse-engineering from real transactions. Plan for 2-3 day exploration period to validate parsing logic.

- **Phase 5 (Advanced):** Wash trading detection - no established patterns for Solana DEX analysis, will need custom heuristics. Defer research until user feedback validates need.

**Phases with standard patterns (skip research-phase):**

- **Phase 2 (Core Flows):** Well-documented Next.js/TanStack Query patterns, no novel integration challenges

- **Phase 3 (Vault & Goals):** Straightforward CRUD operations on proven foundation

- **Phase 4 (Polish):** Standard optimization techniques (pagination, caching, error handling)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH (92%) | TanStack Query + wallet-adapter-react are battle-tested, ky is modern/stable. Only risk: Helius API beta (70% confidence) |
| Features | VERY HIGH (95%) | Clear differentiation vs competitors, target user pain points well-researched, table stakes validated across 5+ competitor tools |
| Architecture | HIGH (90%) | Next.js monolith is proven pattern, 229 passing unit tests validate core logic. Risk: Helius rate limits may force background workers sooner than planned |
| Pitfalls | HIGH (88%) | 22 identified pitfalls across 4 categories with concrete prevention strategies. Known unknowns: beta API edge cases, Solana network congestion patterns |

**Overall confidence:** HIGH (91%)

### Gaps to Address

**During Phase 1 planning:**
- **Helius API pagination edge cases:** Beta docs don't specify behavior when cursor is stale (>24 hours old). Test with real wallets during implementation.
- **Wallet signature verification implementation:** Research shows Sign-in with Solana (SIWS) pattern recommended but doesn't specify nonce generation strategy. Decide: timestamp-based vs UUID vs Supabase challenge.

**During Phase 2 planning:**
- **Price feed fallback priority:** Jupiter vs CoinGecko vs Helius priority order not determined. Load test each API's reliability during market volatility before choosing.
- **Cashout cap tuning:** Hard cap of 65% is recommendation from research, but optimal value needs validation. Plan A/B test or user override during Phase 2.

**During Phase 3 planning:**
- **Goal reset timing:** Monthly reset at midnight (which timezone?) or rolling 30-day window? Target users global, need to decide UX for timezone handling.

**During Phase 4 planning:**
- **Background sync frequency:** Research suggests 15-minute cron for active wallets, but "active" threshold not defined. Monitor during Phase 2-3 to set threshold (e.g., >10 trades/week).

**Post-MVP validation:**
- **Sunday boost effectiveness:** No data on whether 2x multiplier actually changes behavior. Implement as flag, test with cohort analysis.
- **Wash trading detection accuracy:** Heuristics proposed in research need tuning against real trading patterns to avoid false positives.

## Sources

### Primary (HIGH confidence)
- Helius Wallet API Documentation (official): Transaction schemas, rate limits, pagination
- @solana/wallet-adapter-react GitHub (official): Next.js 16 integration patterns, SSR workarounds
- TanStack Query v5 Documentation (official): Infinite query patterns, cursor pagination
- Next.js 16 App Router Documentation (official): Server components, client boundaries, API routes
- Supabase Row-Level Security Documentation (official): Auth patterns, policy examples

### Secondary (MEDIUM confidence)
- Photon, BullX, Trojan, Birdeye competitive analysis: Feature comparison, UX patterns
- Solana Cookbook: DEX transaction parsing patterns, token metadata fetching
- Jupiter Price API v2 Documentation: Endpoint schemas, rate limits (unofficial but reliable)
- DexScreener API Documentation: Token metadata batch endpoints

### Tertiary (LOW confidence)
- Meme coin trader behavior analysis: Reddit/Twitter sentiment, no formal research
- Cashout percentage recommendations: Inferred from trading psychology literature, not validated for crypto
- Wash trading detection heuristics: Adapted from TradFi patterns, needs Solana-specific tuning

---

**Research completed:** 2026-02-20
**Ready for roadmap:** Yes
**Next step:** Requirements definition using research as foundation
