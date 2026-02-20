# Phase 2: Trade Detection & Sync - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

System fetches Helius transaction history for the user's trading wallet, groups swaps by token mint, detects when positions are closed, and calculates profit/loss in SOL. Users trigger sync manually or on page load. Creating cashout recommendations or displaying dashboard UI is Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Trade closure logic
- **Closure detection:** Claude's discretion — determine the best threshold for considering a position closed (balance = 0 with dust tolerance, or high % sold)
- **Re-entry handling:** Claude's discretion — decide whether same-token re-entries are separate trades or merged positions based on what works best for downstream cashout calculations
- **Historical backfill:** Yes — fetch past trades on first sync, not just new trades. Claude decides the backfill window (balance data volume vs usefulness)

### Sync trigger & feedback
- **Trigger:** Auto-sync on dashboard page load + manual refresh button
- **Progress indicator:** Claude's discretion on level of detail (spinner vs step-by-step)
- **Results notification:** Toast notification — "Found 3 new closed trades" (or similar)
- **Empty sync:** Always notify — toast like "No new closed trades found" so user knows sync worked

### P&L calculation rules
- **Currency display:** SOL + USD for all P&L values
- **USD conversion:** Claude's discretion on whether to use historical or current SOL price
- **Fees:** Include transaction fees in P&L — show true net profit/loss
- **ROI format:** Show both percentage AND multiplier — e.g., "+150% (2.5x)"

### Edge case handling
- **Rug pulls:** Claude's discretion — decide whether to flag separately or track as normal loss
- **Airdrops:** Claude's discretion — decide whether to ignore or track with 0 cost basis
- **API failures:** Auto-retry silently, then show error with retry button if all retries fail
- **wSOL handling:** Claude's discretion — decide based on how DEX swap mechanics actually work on Solana

### Claude's Discretion
- Trade closure threshold (dust amount, percentage-based)
- Re-entry as separate trades vs merged positions
- Historical backfill depth
- Sync progress indicator detail level
- USD price source (historical vs current)
- Rug pull classification
- Airdrop handling
- wSOL swap treatment

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User defers most technical decisions to Claude's judgment, with strong opinions on:
- Must backfill historical trades (not just new ones)
- Must show both SOL and USD
- Must show ROI as both percentage and multiplier ("+150% (2.5x)")
- Must include fees in P&L for accuracy
- Must auto-sync on page load
- Must always toast after sync (even when nothing found)
- Must auto-retry Helius failures before showing error

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-trade-detection-sync*
*Context gathered: 2026-02-20*
