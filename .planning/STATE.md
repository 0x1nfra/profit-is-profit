# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Prevent traders from giving back profits by automatically calculating how much to take off the table after every winning trade, based on wallet health and trade performance.
**Current focus:** Phase 2 - Trade Detection & Sync

## Current Position

Phase: 2 of 5 (Trade Detection & Sync)
Plan: 2 of 2 in current phase
Status: Complete
Last activity: 2026-02-22 — Completed Plan 02: Trade sync orchestration and dashboard integration

Progress: [████░░░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 9.5 min
- Total execution time: 0.63 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-authentication | 2 | 18 min | 9 min |
| 02-trade-detection-sync | 2 | 19 min | 9.5 min |

**Recent Trend:**
- Last 5 plans: 10min, 9min, 9min, 9min
- Trend: Consistent velocity

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
- CoinGecko for SOL/USD price — Public API with 60s cache, fallback to $150 (01-02)
- Checkbox confirmation for trading wallet — Explicit user acknowledgment of pre-filled address (01-02)
- Info tooltip on vault wallet — Inline education on vault concept (01-02)
- Enhanced API events.swap as primary SOL source — Avoids double-counting from nativeTransfers (02-01)
- wSOL filtering at extraction level — Prevents false trades from wrapped SOL operations (02-01)
- Union type for backward compatibility — Support both HeliusTransaction and EnhancedTransaction during migration (02-01)
- Cursor-based pagination with rate limiting — 200ms delays prevent rate limit issues while backfilling (02-01)
- CoinGecko for SOL/USD price — 60s cache with $150 fallback, no auth required (02-02)
- Backfill vs incremental sync — First sync backfills 500 txs, subsequent syncs use last_synced_at (02-02)
- Only save closed trades — Open positions (non-zero token balance) excluded from database (02-02)
- Dashboard auto-sync on load — Triggers after balances fetch for fresh data (02-02)
- Toast notifications for all sync results — Success/info/error with retry action (02-02)

### Pending Todos

None yet.

### Blockers/Concerns

**From research:**
- Helius API beta stability — May have undocumented edge cases, need extensive testing with real wallets during Phase 1
- ~~Wallet signature verification pattern — Need to choose nonce generation strategy (timestamp vs UUID vs Supabase challenge) during Phase 1 planning~~ **RESOLVED:** Using timestamp-based messages (01-01)
- Cashout cap tuning — Hard cap of 65% needs validation, consider user override during Phase 3

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed 02-02-PLAN.md (Phase 2 complete)
Resume file: .planning/phases/03-cashout-recommendation/03-01-PLAN.md
