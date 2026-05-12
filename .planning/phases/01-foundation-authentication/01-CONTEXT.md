# Phase 1: Foundation & Authentication - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can securely authenticate with Solana wallets and configure trading + vault wallet addresses. After setup, users see initial wallet balances. This phase covers: wallet connection, message signing auth, wallet address setup, session persistence, and balance display. Trade detection, cashout logic, and goal tracking are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Landing & connect flow
- Brief value prop on landing page: logo, 1-2 sentences explaining profit-taking discipline, then connect button
- Degen-friendly tone — crypto-native language, casual ("Stop giving back your gains" vibes)
- Single "Connect Wallet" button that opens adapter modal showing all detected wallets (Phantom, Solflare, Backpack)
- User signs a verification message on every connect for security

### Wallet setup experience
- Claude's discretion on single page vs stepped wizard — pick what works best for the inputs
- Connected wallet auto-fills as trading wallet, but requires explicit confirmation before saving
- Inline tooltip (info icon) next to vault wallet input explaining the concept
- Invalid Solana address: inline error message under the field, blocks save until fixed
- Trading wallet and vault wallet must be validated as different addresses

### Post-setup landing
- Dashboard shows balances only — trading wallet + vault wallet (SOL & USD). Minimal, clean
- No success fanfare after setup — just redirect straight to dashboard
- User can edit wallet addresses later from a settings page (not inline on dashboard)

### Session & reconnect
- Auto-reconnect on return visits with brief toast: "Reconnected as 0xABC..."
- 7-day session TTL before requiring re-authentication (re-sign message)
- Switching wallets connects a different address but keeps the same account/data
- Claude's discretion on handling locked/unavailable wallet extension on return

### Claude's Discretion
- Balance display layout (cards, summary, etc.)
- Single page vs wizard for setup flow
- Disconnected wallet state handling (landing page vs read-only dashboard)
- Loading states and error handling patterns
- Exact spacing, typography, and visual details

</decisions>

<specifics>
## Specific Ideas

- Degen-friendly tone throughout — this is for meme coin traders, not institutional finance
- "Stop giving back your gains" energy on the landing page
- Auto-reconnect should feel seamless — user opens app and they're right back where they left off
- Wallet switching keeps same account — users who trade from multiple wallets shouldn't lose their data

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-authentication*
*Context gathered: 2026-02-20*
