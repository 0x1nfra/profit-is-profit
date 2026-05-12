# Features Research: Crypto Profit-Taking & Trading Management Tools

**Project**: Profit is Profit (PisP)
**Research Date**: 2026-02-20
**Researcher**: Claude Sonnet 4.5
**Context**: Automated profit-taking system for Solana meme coin traders

---

## Executive Summary

This research analyzes features in crypto profit-taking and trading management tools to identify table stakes (must-haves), differentiators (competitive advantages), and anti-features (deliberately avoided) for PisP.

**Key Findings**:
- Table stakes center on real-time data, transaction tracking, and basic portfolio visibility
- Differentiators emerge from automation intelligence, behavioral psychology integration, and simplified UX for low-capital traders
- Anti-features should avoid complexity that intimidates the target user (low-port meme coin traders)

---

## Table Stakes Features

These are **must-have** features. Users will leave if these are missing or poorly implemented.

### 1. Real-Time Wallet Balance Tracking
**Complexity**: Low
**Dependencies**: Helius API integration, Solana RPC
**Description**: Display current SOL and token balances for both trading and vault wallets in real-time.

**Why Table Stakes**:
- Users need to know their current position at all times
- Core to calculating profit and cashout recommendations
- Standard in all crypto wallet/trading apps (Phantom, Solflare, Birdeye, etc.)

**Implementation Notes**:
- Poll Helius API or use webhooks for balance updates
- Show USD equivalent values
- Differentiate between trading wallet and vault wallet clearly

---

### 2. Transaction History & Detection
**Complexity**: Medium
**Dependencies**: Helius Wallet API, transaction parsing logic
**Description**: Automatically detect and log all trades (buys/sells) with profit/loss calculations.

**Why Table Stakes**:
- Users need to verify the system is tracking their trades correctly
- Essential for calculating profit and triggering cashout recommendations
- Every trading tool (Dexscreener, Photon, BullX) has this

**Implementation Notes**:
- Parse Helius transaction data for swap/trade events
- Calculate P&L per trade (entry price vs exit price)
- Filter noise (failed txs, non-trade transfers)

---

### 3. Manual Cashout Confirmation
**Complexity**: Low
**Dependencies**: None (user-initiated action)
**Description**: User manually confirms and executes transfer from trading wallet to vault wallet.

**Why Table Stakes**:
- Non-custodial requirement (PisP doesn't hold keys)
- Regulatory/security best practice
- Users must maintain control over their funds

**Implementation Notes**:
- Display recommended cashout amount
- Provide clear instructions for manual transfer
- Confirm receipt of transfer in vault wallet

---

### 4. Wallet-Based Authentication
**Complexity**: Medium
**Dependencies**: Solana wallet adapters (Phantom, Solflare, etc.)
**Description**: Users connect their Solana wallet to authenticate and access the app.

**Why Table Stakes**:
- Standard Web3 UX pattern (no email/password friction)
- Required to fetch wallet-specific data
- Users expect this in all Solana dApps

**Implementation Notes**:
- Support major wallets (Phantom, Solflare, Backpack)
- Use @solana/wallet-adapter-react
- Persist session across page refreshes

---

### 5. Basic Dashboard View
**Complexity**: Low
**Dependencies**: Wallet balances, wallet tier calculation
**Description**: Single-page overview of wallet health tier, balances, and next recommended action.

**Why Table Stakes**:
- Users need a "home screen" to orient themselves
- Core value prop visibility (what tier am I in?)
- Standard in all financial apps

**Implementation Notes**:
- Minimal, focused layout (avoid clutter)
- Highlight current tier prominently
- Show trading wallet vs vault wallet balances side-by-side

---

### 6. Profit/Loss Calculation Per Trade
**Complexity**: Medium
**Dependencies**: Trade detection, price data
**Description**: Calculate and display P&L for each detected trade.

**Why Table Stakes**:
- Users need to understand which trades are winners/losers
- Core to determining when to recommend cashouts (only on winning trades)
- Expected in all trading trackers

**Implementation Notes**:
- Track entry and exit prices per trade
- Handle partial fills and multi-leg trades
- Display P&L in SOL and USD

---

### 7. Mobile-Responsive Design
**Complexity**: Low
**Dependencies**: None (design/CSS)
**Description**: UI works seamlessly on mobile devices.

**Why Table Stakes**:
- Most meme coin traders trade on mobile (quick, opportunistic trades)
- Poor mobile UX = immediate churn
- Industry standard for all modern web apps

**Implementation Notes**:
- Use Tailwind CSS or similar responsive framework
- Test on iOS Safari and Android Chrome
- Prioritize portrait orientation

---

## Differentiating Features

These are **competitive advantages** that set PisP apart from generic trading trackers.

### 1. 5-Tier Wallet Health System
**Complexity**: Medium
**Dependencies**: Balance tracking, tier calculation logic
**Description**: Categorize wallet state into 5 tiers (Critical, Low, Healthy, Comfortable, Thriving) that determine cashout percentage.

**Why Differentiating**:
- **Unique mechanic**: No other tool uses health-based cashout recommendations
- **Behavioral psychology**: Gamifies profit-taking, reduces emotional decision-making
- **Adaptive**: Recommendations scale with user's actual capital state

**Implementation Notes**:
- Define tier thresholds (e.g., Critical = <0.5 SOL, Thriving = >4 SOL)
- Visual tier indicators (color-coded, progress bars)
- Tier impacts cashout % (Critical = 10%, Thriving = 80%)

**Competitive Examples**:
- Most tools just show raw P&L without prescriptive guidance
- PisP tells users exactly what to do based on their state

---

### 2. Sunday Boost System
**Complexity**: Medium
**Dependencies**: Monthly goal tracking, date logic
**Description**: Every Sunday, double the cashout recommendation percentage to accelerate goal progress.

**Why Differentiating**:
- **Behavioral nudge**: Creates weekly anticipation, encourages Sunday trading
- **Goal acceleration**: Helps users hit $400/month target faster
- **Unique**: No other tool has time-based cashout modifiers

**Implementation Notes**:
- Detect if current day is Sunday
- Multiply recommended cashout % by 2x
- Display "Sunday Boost Active!" badge in UI

**Risks**:
- Users might wait for Sundays to cash out (may need to iterate)

---

### 3. Monthly Goal Tracking ($400 USD Target)
**Complexity**: Medium
**Dependencies**: Transaction history, USD conversion, date tracking
**Description**: Track progress toward $400/month cashout goal with visual progress indicator.

**Why Differentiating**:
- **Motivational**: Turns abstract "take profits" into concrete monthly target
- **Target user alignment**: $400/month is meaningful for low-port traders
- **Unique**: Most tools don't prescribe income goals

**Implementation Notes**:
- Reset on 1st of each month
- Show progress bar (e.g., "$180 / $400")
- Celebrate when goal is hit (confetti, badge, etc.)

**Competitive Examples**:
- Trading journals show P&L but don't frame it as monthly income goal

---

### 4. Automated Cashout Recommendations (Not Execution)
**Complexity**: Medium
**Dependencies**: Tier system, trade detection, P&L calculation
**Description**: After each winning trade, system calculates and displays recommended cashout amount based on current tier.

**Why Differentiating**:
- **Removes decision paralysis**: Users don't need to guess how much to cash out
- **Non-custodial safety**: Recommends but doesn't execute (user keeps control)
- **Tier-aware**: Recommendations adapt to user's capital health

**Implementation Notes**:
- Trigger recommendation only on winning trades (P&L > 0)
- Calculate cashout % based on tier (Critical = 10%, Thriving = 80%)
- Display as actionable notification ("Cash out 0.3 SOL to vault")

**Competitive Examples**:
- Most tools require manual calculation or don't provide guidance
- PisP automates the mental math

---

### 5. Vault Wallet Integration
**Complexity**: Low
**Dependencies**: Multi-wallet tracking
**Description**: Track both trading wallet and separate vault wallet for cashed-out profits.

**Why Differentiating**:
- **Behavioral separation**: Physically separates "play money" from "secured profits"
- **Reduces tilt**: Users can't immediately re-gamble cashed-out profits
- **Psychological win**: Watching vault grow is motivating

**Implementation Notes**:
- User provides two wallet addresses (trading + vault)
- Display both balances prominently
- Detect transfers between wallets

**Competitive Examples**:
- Most tools track one wallet or portfolio, not separation of capital

---

### 6. Simplified UX for Low-Port Traders
**Complexity**: Low (design focus)
**Dependencies**: None
**Description**: Minimal, jargon-free interface optimized for 1-3 SOL traders (not whales).

**Why Differentiating**:
- **Target user focus**: Most tools cater to high-capital traders
- **Reduced cognitive load**: No confusing charts, metrics, or settings
- **Faster decisions**: Clear recommendations, not data overload

**Implementation Notes**:
- Avoid technical jargon (e.g., say "Cashout" not "Rebalance")
- Limit dashboard to 3-4 key metrics
- Use plain language for tier descriptions

**Competitive Examples**:
- Photon, BullX, Trojan are feature-rich but overwhelming for beginners
- PisP is opinionated and focused

---

### 7. Win Rate Awareness (Target <50% Win Rate Users)
**Complexity**: Medium
**Dependencies**: Trade history, P&L tracking
**Description**: Calculate and display user's win rate to reinforce profit-taking discipline.

**Why Differentiating**:
- **Reality check**: Most low-port traders lose more often than they win
- **Reinforces value prop**: If win rate is low, taking profits on wins is critical
- **Educational**: Helps users understand their actual performance

**Implementation Notes**:
- Calculate: (winning trades / total trades) * 100
- Display prominently (e.g., "Win Rate: 35%")
- Contextual messaging if <50% ("You win 1 in 3 trades—lock in profits when you do!")

**Competitive Examples**:
- Trading journals show this but don't tie it to profit-taking behavior

---

## Anti-Features

These are features we **deliberately avoid** to maintain focus and simplicity.

### 1. Automated Trading / Trade Execution
**Why Avoid**:
- Regulatory risk (would require licenses)
- Custodial risk (would need to hold user keys)
- Out of scope (PisP is profit management, not a trading bot)
- Target users want control over trades

**Alternative**: Provide recommendations, let users execute manually

---

### 2. Advanced Charting / Technical Analysis Tools
**Why Avoid**:
- Not core to profit-taking (that's for entry/exit decisions)
- Target users (low-port meme traders) don't use TA extensively
- Adds UI complexity without value for use case
- Other tools (TradingView, Dexscreener) do this better

**Alternative**: Link out to Dexscreener for price charts if needed

---

### 3. Multi-Chain Support (Non-Solana)
**Why Avoid**:
- Dilutes focus (Solana meme coin traders are a specific niche)
- Increases complexity (different APIs, tx formats, etc.)
- Target user trades on Solana exclusively
- Can add later if validated

**Alternative**: Stay laser-focused on Solana ecosystem

---

### 4. Social Features / Leaderboards
**Why Avoid**:
- Encourages gambling behavior (competition to show highest profits)
- Distracts from core value prop (disciplined profit-taking)
- Requires moderation and community management
- Privacy concerns (users may not want to share wallet data)

**Alternative**: Keep experience personal and private

---

### 5. Tax Reporting / Accounting Integration
**Why Avoid**:
- Complex (different jurisdictions, tax laws, etc.)
- Not core to MVP (users can export data and use CoinTracker, etc.)
- Requires legal review and compliance
- Can add later if users request

**Alternative**: Provide exportable transaction history (CSV)

---

### 6. Staking / Yield Farming for Vault Wallet
**Why Avoid**:
- Adds financial risk (smart contract risk, impermanent loss, etc.)
- Distracts from core value prop (vault is for safe storage)
- Increases complexity (need to integrate with protocols)
- Users can do this themselves if desired

**Alternative**: Keep vault wallet simple (just holds SOL)

---

### 7. AI-Powered Trade Predictions
**Why Avoid**:
- Snake oil territory (can't reliably predict meme coin prices)
- Sets wrong expectations (PisP is about profit discipline, not alpha)
- Liability risk (users blame tool for bad predictions)
- Expensive to build and maintain

**Alternative**: Focus on behavioral guidance, not price predictions

---

### 8. Portfolio Aggregation Across Multiple Wallets
**Why Avoid**:
- Target user has 1-3 SOL total, unlikely to split across many wallets
- Adds complexity for minimal user benefit
- Trading wallet + vault wallet (2) is sufficient

**Alternative**: Support exactly 2 wallets (trading + vault)

---

### 9. Custom Alerts / Notifications (Price Alerts, Whale Alerts, etc.)
**Why Avoid**:
- Not core to profit-taking (these are for entry decisions)
- Other tools (Telegram bots, Dexscreener) do this better
- Adds notification fatigue

**Alternative**: Only notify on cashout recommendations (post-trade)

---

### 10. In-App Swapping / DEX Integration
**Why Avoid**:
- Users already have preferred trading apps (Photon, BullX, Jupiter)
- Adds complexity and maintenance burden
- Regulatory gray area
- Not differentiated (many tools do this)

**Alternative**: PisP is post-trade profit management, not trading platform

---

## Feature Complexity Matrix

| Feature | Complexity | Dependencies | Priority |
|---------|-----------|--------------|----------|
| Real-time balance tracking | Low | Helius API | P0 (MVP) |
| Transaction detection | Medium | Helius API, parsing | P0 (MVP) |
| Manual cashout confirmation | Low | None | P0 (MVP) |
| Wallet-based auth | Medium | Wallet adapters | P0 (MVP) |
| Basic dashboard | Low | Balances, tier | P0 (MVP) |
| P&L per trade | Medium | Trade detection, pricing | P0 (MVP) |
| Mobile-responsive | Low | None | P0 (MVP) |
| 5-tier health system | Medium | Balance, logic | P0 (MVP) |
| Cashout recommendations | Medium | Tier, P&L | P0 (MVP) |
| Vault wallet integration | Low | Multi-wallet tracking | P0 (MVP) |
| Monthly goal tracking | Medium | Transaction history, date | P0 (MVP) |
| Sunday boost | Medium | Date logic, tier | P1 (Post-MVP) |
| Win rate display | Medium | Trade history | P1 (Post-MVP) |
| Simplified UX | Low (design) | None | P0 (MVP) |

---

## Feature Dependencies Map

```
Wallet Auth
  ↓
Real-time Balance Tracking
  ↓
5-Tier Health System
  ↓
Transaction Detection
  ↓
P&L Calculation
  ↓
Cashout Recommendations
  ↓
Manual Cashout Confirmation
  ↓
Vault Wallet Integration
  ↓
Monthly Goal Tracking
  ↓
Sunday Boost System
```

**Critical Path**: Auth → Balance → Tier → Transactions → P&L → Recommendations

**Parallel Tracks**:
- UI/UX design (mobile-responsive, dashboard) can be built alongside backend logic
- Win rate calculation can be added after transaction detection is stable

---

## Competitive Landscape: Feature Comparison

| Feature | PisP | Photon | BullX | Trojan | Birdeye |
|---------|------|--------|-------|--------|---------|
| Wallet balance tracking | ✅ | ✅ | ✅ | ✅ | ✅ |
| Transaction history | ✅ | ✅ | ✅ | ✅ | ✅ |
| Trade execution | ❌ | ✅ | ✅ | ✅ | ❌ |
| Profit-taking recommendations | ✅ | ❌ | ❌ | ❌ | ❌ |
| Health-based cashout tiers | ✅ | ❌ | ❌ | ❌ | ❌ |
| Monthly goal tracking | ✅ | ❌ | ❌ | ❌ | ❌ |
| Vault wallet separation | ✅ | ❌ | ❌ | ❌ | ❌ |
| Advanced charts/TA | ❌ | ✅ | ✅ | ✅ | ✅ |
| Multi-chain support | ❌ | ✅ | ✅ | ✅ | ✅ |
| Sniper tools | ❌ | ✅ | ✅ | ✅ | ❌ |
| Copy trading | ❌ | ✅ | ✅ | ✅ | ❌ |

**Key Takeaway**: PisP differentiates on profit *discipline* and *behavioral psychology*, not trading execution or analysis.

---

## Recommendations for Requirements Definition

### Must Build (MVP - Table Stakes + Core Differentiators)
1. Wallet authentication (Solana wallet adapter)
2. Real-time balance tracking (Helius API)
3. Transaction detection and P&L calculation
4. 5-tier wallet health system
5. Cashout recommendations (tier-based %)
6. Manual cashout confirmation flow
7. Vault wallet integration (2-wallet tracking)
8. Basic dashboard (tier, balances, next action)
9. Monthly goal tracking ($400 USD target)
10. Mobile-responsive UI

### Should Build (Post-MVP - Enhanced Differentiators)
1. Sunday boost system (2x cashout % on Sundays)
2. Win rate display and messaging
3. Transaction history page (detailed view)
4. CSV export for transaction data

### Won't Build (Anti-Features)
1. Automated trading / trade execution
2. Advanced charting / TA tools
3. Multi-chain support (non-Solana)
4. Social features / leaderboards
5. Tax reporting / accounting integration
6. Staking / yield farming
7. AI trade predictions
8. Multi-wallet portfolio aggregation (>2 wallets)
9. Custom price/whale alerts
10. In-app swapping / DEX integration

---

## Quality Gate Checklist

- [x] **Categories are clear**: Table stakes, differentiators, and anti-features are explicitly separated
- [x] **Complexity noted**: Each feature has complexity rating (Low/Medium) and dependencies listed
- [x] **Dependencies identified**: Feature dependency map shows critical path and parallel tracks
- [x] **Competitive context**: Feature comparison table shows PisP vs existing tools
- [x] **Actionable for requirements**: Clear MVP vs post-MVP recommendations provided

---

## Appendix: Target User Profile (for context)

- **Capital**: 1-3 SOL (~$200-$600 USD at current prices)
- **Win Rate**: <50% (most trades are losses)
- **Trade Frequency**: Multiple trades per day (high volume, low conviction)
- **Goal**: $400/month in cashed-out profits (meaningful side income)
- **Pain Point**: Emotional trading, giving back profits, lack of discipline
- **Solution Need**: Automated recommendations to take profits systematically

---

**Next Steps**: Use this research to define technical requirements in REQUIREMENTS.md, focusing on MVP features that balance table stakes with core differentiators.
