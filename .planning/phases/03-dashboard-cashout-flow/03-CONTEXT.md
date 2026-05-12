# Phase 3: Dashboard & Cashout Flow - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Users see their wallet health tier, trading and vault wallet balances, and recent closed trades with cashout recommendations. Users can confirm a manual cashout after transferring SOL to their vault wallet. System updates balances after confirmation and persists losing streak across reloads.

Creating new trades, goal tracking, and full trade history are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Dashboard layout
- Stats cards row at the top (wallet health tier, trading balance, vault balance), trade list fills the rest of the page below
- Wallet health + balances are the primary focus — users see these first on landing
- Sync button lives near the trade list header, contextually tied to the list
- Claude's discretion: number of trades to show in dashboard list (sensible default — likely 10)

### Trade card design
- Each card shows: token name/mint, P&L in SOL, ROI %, and recommended cashout amount
- Cashout breakdown (tier, ROI bonus, streak multiplier, goal boost) is hidden by default — user expands card to see breakdown panel
- Confirmed cashouts show a "Cashed Out" badge/chip on the card
- Losing trades (cashout recommendation = 0) are dimmed with a "Loss" label, no cashout action available

### Cashout confirmation flow
- Entry point: "Cash Out" button is inside the expanded breakdown panel (not on the collapsed card)
- Clicking initiates a modal showing: cashout SOL amount, vault wallet address (copyable), confirm button
- Post-confirm UX (loading state, success feedback, balance refresh timing) is Claude's discretion

### Wallet health tier display
- Tier prominence: Claude's discretion (own card alongside balances, or other treatment — whatever communicates importance clearly)
- Tiers 1–5 use color + named labels, e.g. "Critical", "Caution", "Stable", "Healthy", "Peak"
- Tier includes a brief subtitle explaining why: e.g. "Trading balance below 20% of vault"
- Losing streak display: Claude's discretion (whether/how to surface streak count on dashboard)

### Claude's Discretion
- Number of trades displayed in dashboard list
- Post-confirm UX flow (loading state, success state, balance refresh)
- Tier card prominence/size relative to balance cards
- Whether and how to surface losing streak count on dashboard

</decisions>

<specifics>
## Specific Ideas

No specific references or "I want it like X" moments — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-dashboard-cashout-flow*
*Context gathered: 2026-03-10*
