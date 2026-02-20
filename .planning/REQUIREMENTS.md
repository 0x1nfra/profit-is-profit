# Requirements: Profit is Profit

**Defined:** 2026-02-20
**Core Value:** Prevent traders from giving back profits by automatically calculating how much to take off the table after every winning trade

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can connect Solana wallet (Phantom, Solflare, Backpack) to authenticate
- [ ] **AUTH-02**: User session persists across page refresh via wallet connection state
- [ ] **AUTH-03**: User is redirected to appropriate page based on auth + setup status (landing → setup → dashboard)
- [ ] **AUTH-04**: User can disconnect wallet and return to landing page

### Wallet Setup

- [ ] **SETUP-01**: User can input trading wallet address (validated Solana address)
- [ ] **SETUP-02**: User can input vault wallet address (validated, must differ from trading wallet)
- [ ] **SETUP-03**: System fetches initial balances from Helius after wallet setup
- [ ] **SETUP-04**: User is redirected to dashboard after completing setup

### Dashboard

- [ ] **DASH-01**: User can view trading wallet balance in SOL and USD
- [ ] **DASH-02**: User can view vault wallet balance in SOL and USD
- [ ] **DASH-03**: User can see current wallet health tier (1-5) with color-coded badge
- [ ] **DASH-04**: User can see recent trades with cashout recommendations
- [ ] **DASH-05**: User can manually trigger trade sync (refresh button)
- [ ] **DASH-06**: Dashboard displays monthly goal progress

### Trade Detection

- [ ] **TRADE-01**: System fetches transaction history from Helius Wallet API `/v1/wallet/{wallet}/history`
- [ ] **TRADE-02**: System groups swap transactions by token mint into bundled trades
- [ ] **TRADE-03**: System detects position closure when token balance = 0 via Helius `/v1/wallet/{wallet}/balances`
- [ ] **TRADE-04**: System calculates net profit (total exit SOL - total entry SOL) per closed trade
- [ ] **TRADE-05**: System calculates ROI percentage per trade
- [ ] **TRADE-06**: System handles dust amounts (< 0.000001 tokens treated as 0)
- [ ] **TRADE-07**: System processes multiple token closures in a single refresh

### Cashout System

- [ ] **CASH-01**: System calculates cashout % using formula: (base rate + ROI bonus) × streak multiplier × goal boost
- [ ] **CASH-02**: System assigns tier at trade start (before position opens), persists for trade lifecycle
- [ ] **CASH-03**: System tracks losing streak (resets on any win, persists across reloads)
- [ ] **CASH-04**: System displays recommended cashout amount with full breakdown (tier, ROI bonus, streak, boost)
- [ ] **CASH-05**: User can confirm cashout after manually transferring SOL to vault
- [ ] **CASH-06**: System updates wallet balances after cashout confirmation
- [ ] **CASH-07**: System caps final cashout percentage to prevent over-extraction on mega wins
- [ ] **CASH-08**: System logs all trades with cashout data to database

### Goal Tracking

- [ ] **GOAL-01**: User can set monthly cashout goal in USD (default $400, adjustable)
- [ ] **GOAL-02**: System tracks monthly vault deposit progress toward goal
- [ ] **GOAL-03**: System displays visual progress bar with weekly pace indicator
- [ ] **GOAL-04**: System resets monthly progress on 1st of each month

### Trade History

- [ ] **HIST-01**: User can view all historical trades in table format
- [ ] **HIST-02**: Table shows: date, token, entry SOL, exit SOL, ROI, cashout %, cashout amount
- [ ] **HIST-03**: User can sort columns (date, ROI, cashout amount)
- [ ] **HIST-04**: Table supports pagination (50 trades per page)

### UI/UX

- [ ] **UI-01**: App uses dark theme with crypto-native aesthetic
- [ ] **UI-02**: App is mobile-responsive (works on iOS Safari and Android Chrome)
- [ ] **UI-03**: Toast notifications for new trade detection and cashout confirmation
- [ ] **UI-04**: Loading skeletons for dashboard data fetching
- [ ] **UI-05**: Error states with retry buttons for API failures

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Profit System

- **BOOST-01**: Sunday goal check suggests cashout boost when behind pace (+5/10/15/20%)
- **BOOST-02**: User can accept/decline boost, applied as temporary multiplier for 7 days
- **CUSTOM-01**: User can define custom tier boundaries and cashout rates
- **CUSTOM-02**: User can adjust ROI bonus thresholds

### Analytics

- **ANAL-01**: User can see win rate percentage with contextual messaging
- **ANAL-02**: User can export trade history as CSV
- **ANAL-03**: User can view trading wallet vs vault balance over time (chart)

### Advanced Monitoring

- **MON-01**: Real-time trade detection via Solana gRPC (no manual refresh)
- **MON-02**: Losing streak warning notifications

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automated on-chain cashout execution | Security risk — no private key custody in MVP |
| Advanced charting / TA tools | Not core to profit-taking, other tools do it better |
| Multi-chain support | Dilutes Solana focus, target user trades only on Solana |
| Social features / leaderboards | Encourages gambling behavior, distracts from discipline |
| Tax reporting / accounting | Too complex for MVP, users can export CSV |
| Staking / yield farming for vault | Adds financial risk, vault is for safe storage |
| AI trade predictions | Unreliable for meme coins, sets wrong expectations |
| Multi-wallet aggregation (>2) | Target user has 1-3 SOL, 2 wallets sufficient |
| In-app swapping / DEX integration | Users have preferred trading apps |
| Custom price/whale alerts | Not core to profit-taking, notification fatigue |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| SETUP-01 | Phase 1 | Pending |
| SETUP-02 | Phase 1 | Pending |
| SETUP-03 | Phase 1 | Pending |
| SETUP-04 | Phase 1 | Pending |
| TRADE-01 | Phase 2 | Pending |
| TRADE-02 | Phase 2 | Pending |
| TRADE-03 | Phase 2 | Pending |
| TRADE-04 | Phase 2 | Pending |
| TRADE-05 | Phase 2 | Pending |
| TRADE-06 | Phase 2 | Pending |
| TRADE-07 | Phase 2 | Pending |
| DASH-01 | Phase 3 | Pending |
| DASH-02 | Phase 3 | Pending |
| DASH-03 | Phase 3 | Pending |
| DASH-04 | Phase 3 | Pending |
| DASH-05 | Phase 3 | Pending |
| DASH-06 | Phase 3 | Pending |
| CASH-01 | Phase 3 | Pending |
| CASH-02 | Phase 3 | Pending |
| CASH-03 | Phase 3 | Pending |
| CASH-04 | Phase 3 | Pending |
| CASH-05 | Phase 3 | Pending |
| CASH-06 | Phase 3 | Pending |
| CASH-07 | Phase 3 | Pending |
| CASH-08 | Phase 3 | Pending |
| GOAL-01 | Phase 4 | Pending |
| GOAL-02 | Phase 4 | Pending |
| GOAL-03 | Phase 4 | Pending |
| GOAL-04 | Phase 4 | Pending |
| HIST-01 | Phase 5 | Pending |
| HIST-02 | Phase 5 | Pending |
| HIST-03 | Phase 5 | Pending |
| HIST-04 | Phase 5 | Pending |
| UI-01 | Phase 5 | Pending |
| UI-02 | Phase 5 | Pending |
| UI-03 | Phase 5 | Pending |
| UI-04 | Phase 5 | Pending |
| UI-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after roadmap creation*
