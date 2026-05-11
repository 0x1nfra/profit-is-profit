# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Prevent traders from giving back profits by automatically calculating how much to take off the table after every winning trade, based on wallet health and trade performance.
**Current focus:** Phase 3 - Dashboard & Cashout Flow — Ready to execute

## Current Position

Phase: 3 of 5 (Dashboard & Cashout Flow) — IN PROGRESS
Plan: 4 of 5 — Wave 2 complete
Status: Executing. Plans 03-01 through 03-04 complete. Checkpoint plan 03-05 next.
Last activity: 2026-05-11 — Plans 03-03/04 complete: all UI components built, 286 tests GREEN.

Progress: [████████░░] 80% (Phase 3)

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 16.7 min
- Total execution time: 2.23 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-authentication | 2 | 18 min | 9 min |
| 02-trade-detection-sync | 2 | 19 min | 9.5 min |
| 02.1-convex-migration | 5 | ~138 min | 27.6 min |

**Recent Trend:**
- Last 5 plans: 2min, 68min, 10min, 9min, 6min
- Trend: Plan 05 fast (Supabase cleanup — deletion + env cleanup, no new code)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Keep existing calculators — 229 tests passing, proven logic, no reason to rewrite
- Wallet-first auth — Target users are crypto-native traders, wallet is prerequisite for app functionality
- Manual cashout (no custody) — Security, no private keys in MVP, user transfers SOL manually
- Helius Wallet API over raw tx parsing — Cleaner abstraction, parsed balance changes per swap
- Removed Backpack wallet adapter — Not available in @solana/wallet-adapter-wallets package (01-01)
- ClientWalletProvider wrapper pattern — Next.js 16 compatibility with dynamic imports (01-01)
- Timestamp-based verification messages — Simpler than UUID or backend nonce storage (01-01)
- 7-day session TTL stored client-side — Standard web app session length (01-01)
- Cookie-based auth for middleware — Simpler than Supabase SSR, set cookies on auth/setup (01-02)
- CoinGecko for SOL/USD price — Public API with 60s cache, fallback to ### Decisions

50 (01-02)
- Checkbox confirmation for trading wallet — Explicit user acknowledgment of pre-filled address (01-02)
- Info tooltip on vault wallet — Inline education on vault concept (01-02)
- Enhanced API events.swap as primary SOL source — Avoids double-counting from nativeTransfers (02-01)
- wSOL filtering at extraction level — Prevents false trades from wrapped SOL operations (02-01)
- Union type for backward compatibility — Support both HeliusTransaction and EnhancedTransaction during migration (02-01)
- Cursor-based pagination with rate limiting — 200ms delays prevent rate limit issues while backfilling (02-01)
- CoinGecko for SOL/USD price — 60s cache with ### Decisions

50 fallback, no auth required (02-02)
- Backfill vs incremental sync — First sync backfills 500 txs, subsequent syncs use last_synced_at (02-02)
- Only save closed trades — Open positions (non-zero token balance) excluded from database (02-02)
- Dashboard auto-sync on load — Triggers after balances fetch for fresh data (02-02)
- Toast notifications for all sync results — Success/info/error with retry action (02-02)
- jose@6 requires { extractable: true } for generateKeyPair — WebCrypto defaults to non-extractable (02.1-01)
- camelCase schema fields eliminate as any casts from snake_case mismatch permanently (02.1-01)
- Separate CONVEX_SITE_URL for server-side use alongside NEXT_PUBLIC_CONVEX_SITE_URL (02.1-01)
- saveSyncedTrades as internalMutation — not callable from client, only from sync action in Plan 04 (02.1-02)
- updateWalletBalance as internalMutation — balance updates only happen server-side from sync action (02.1-02)
- saveSyncedTrades idempotency via by_user_token index + positionClosedAt filter — same trade never inserted twice (02.1-02)
- getUserTrades capped at 50 by default with optional limit arg — prevents unbounded reads (02.1-02)
- pisp-auth (httpOnly) and pisp-convex-token (non-httpOnly) set simultaneously — both contain same JWT; httpOnly for middleware, non-httpOnly for ConvexProviderWithAuth (02.1-03)
- Wallet public key as JWT sub claim — no database user record needed; wallet address IS the identity (02.1-03)
- Setup detection moved fully client-side via useQuery(wallets) — middleware no longer checks pisp-setup-complete (02.1-03)
- 410 stubs left on disk to surface explicit errors to any caller still using old routes (02.1-03)
- useAction (not useMutation) for Convex actions from React client — type system enforces this distinction (02.1-04)
- Explicit type annotations required in Convex "use node" actions to break circular _generated type inference (02.1-04)
- Dashboard auto-sync on load removed — replaced with manual user-triggered sync button (per user decision 02.1-04)
- [Phase 02.1-convex-migration]: trade-service.ts replaced with deprecation stub (export {}) rather than deleted — keeps git history traceable, avoids phantom import errors
- [Phase 02.1-convex-migration]: pnpm used (not npm) for package management — project uses pnpm-lock.yaml; npm fails with arborist null error on pnpm symlinks
- [02.1-05]: pisp-auth-change custom event required — ConvexClientProvider mounts once before sign-in cookie exists; event triggers re-read (simpler than shared state or polling)
- [02.1-05]: Empty wallets=[] for SolanaWalletProvider — Wallet Standard auto-discovery; explicit Phantom/Solflare adapters caused duplicate wallet keys
- [02.1-05]: JWT_PRIVATE_KEY is PEM string not JSON — removed erroneous JSON.parse that was breaking token generation in verify route
- [02.1-05]: Always route to /dashboard after auth; dashboard uses useQuery(wallets) to determine if redirect to /setup needed — single routing responsibility

### Roadmap Evolution

- Phase 2.1 inserted after Phase 2: Convex Migration (URGENT) — database.ts types out of sync with actual schema usage, forcing `as any` casts throughout trade-service.ts; migration to Convex unblocks Phase 2 UAT and eliminates schema drift permanently

### Pending Todos

None yet.

### Blockers/Concerns

**From research:**
- Helius API beta stability — May have undocumented edge cases, need extensive testing with real wallets during Phase 1
- ~~Wallet signature verification pattern — Need to choose nonce generation strategy (timestamp vs UUID vs Supabase challenge) during Phase 1 planning~~ **RESOLVED:** Using timestamp-based messages (01-01)
- ~~Cashout cap tuning — Hard cap of 65% needs validation, consider user override during Phase 3~~ **RESOLVED:** 65% hard cap enforced in `calculateCashout()` in Plan 03-02; no user override in Phase 3 (deferred to v2 CUSTOM-* requirements)

## Session Continuity

Last session: 2026-05-11
Stopped at: Phase 3 planning complete — 5 PLAN.md files created, plan checker passed, all 14 requirements covered
Resume file: N/A — Phase 3 ready to execute
