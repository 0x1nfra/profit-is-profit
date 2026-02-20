# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Prevent traders from giving back profits by automatically calculating how much to take off the table after every winning trade, based on wallet health and trade performance.
**Current focus:** Phase 1 - Foundation & Authentication

## Current Position

Phase: 1 of 5 (Foundation & Authentication)
Plan: 1 of 2 in current phase
Status: Executing
Last activity: 2026-02-20 — Completed Plan 01: Wallet authentication with Phantom/Solflare adapters

Progress: [█░░░░░░░░░] 10%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 9 min
- Total execution time: 0.15 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-authentication | 1 | 9 min | 9 min |

**Recent Trend:**
- Last 5 plans: 9min
- Trend: Just started

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

### Pending Todos

None yet.

### Blockers/Concerns

**From research:**
- Helius API beta stability — May have undocumented edge cases, need extensive testing with real wallets during Phase 1
- ~~Wallet signature verification pattern — Need to choose nonce generation strategy (timestamp vs UUID vs Supabase challenge) during Phase 1 planning~~ **RESOLVED:** Using timestamp-based messages (01-01)
- Cashout cap tuning — Hard cap of 65% needs validation, consider user override during Phase 3

## Session Continuity

Last session: 2026-02-20T08:57:40Z
Stopped at: Completed 01-01-PLAN.md (Wallet authentication)
Resume file: .planning/phases/01-foundation-authentication/01-01-SUMMARY.md
