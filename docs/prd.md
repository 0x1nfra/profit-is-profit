# Product Requirements Document: Dynamic Profit Cashout System

## 1. Product Overview

### 1.1 Product Name

**Take More Profits (TMP)** (working title - still brainstorming)

### 1.2 Product Vision

A disciplined profit-taking system for meme coin traders that prevents the common pattern of "winning big, giving it all back" by intelligently extracting profits while maintaining a healthy trading wallet balance.

### 1.3 Problem Statement

High-frequency meme coin traders face a critical psychological challenge: after profitable trades, increased capital leads to overconfidence, larger position sizes, and ultimately giving gains back to the market. Traditional flat-percentage profit-taking systems fail because they:

- Drain trading wallet below effective trading thresholds
- Don't account for wallet health vs. vault growth balance
- Lead to fear-based overtrading when capital is low
- Create a cycle of boom-bust that prevents sustainable growth

### 1.4 Target User

**Primary Persona: The Low-Port Meme Coin Trader**

- Trading capital: 1-3 SOL (reloading range)
- Win rate: <50%
- Trading frequency: Multiple trades daily
- Platform: Solana DEXs (Raydium, Jupiter, Pump.fun)
- Comfortable trading size: 10 SOL (aspirational)
- Minimum viable size: 1 SOL (below = fear/overtrading)
- Monthly cashout goal: $400+ USD

**Pain Points:**

- Gives back profits after wins due to overconfidence
- Overtrades with small balances trying to "get back"
- No systematic profit extraction discipline
- Hard to track trading wallet health vs. vault growth

---

## 2. Product Goals

### 2.1 Primary Goals

1. **Systematic Profit Extraction:** Automatically calculate optimal cashout percentages after every profitable trade
2. **Wallet Health Maintenance:** Prevent trading wallet from dropping below effective thresholds
3. **Psychological Safety:** Create a "vault" of secured profits that can't be given back to the market
4. **Goal Tracking:** Help users hit monthly cashout targets ($400+ USD)

### 2.2 Success Metrics

**Primary KPIs:**

- Monthly vault deposits (target: $400+ USD)
- Weekly vault deposits (target: $100+ USD)
- Trading wallet stability (% of time in "comfortable" range: 3-10 SOL)
- User retention (daily active usage over 30+ days)

**Secondary KPIs:**

- Average cashout percentage per trade
- Time distribution across wallet health tiers
- Goal achievement rate (% of months hitting $400+)
- Trade logging consistency (% of trades recorded)

**Health Indicators:**

- 🔴 Red Flag: >50% of time in critical/rebuild tiers (<3 SOL)
- 🟡 Yellow Flag: <$100/week vault deposits for 2+ consecutive weeks
- 🟢 Green Flag: Consistent monthly goals + growing trading wallet

---

## 3. Core Features (MVP)

### 3.1 Dashboard

- Current trading wallet balance (SOL + USD)
- Current vault wallet balance (SOL + USD)
- Current tier indicator
- Weekly/monthly goal progress
- Recent trades list

### 3.2 Trade Detection & Cashout Calculation

- Manual refresh to pull trades from Helius API
- Automatic trade bundling (multiple entries/exits for same token)
- Dynamic cashout percentage calculation based on:
  - Wallet health tier (1-5)
  - Trade ROI (<100% vs ≥100%)
  - Losing streak status
- Toast notification when new completed trade detected

### 3.3 Manual Cashout Execution

- Display recommended cashout amount in SOL
- User manually transfers SOL to vault wallet
- User confirms cashout in app to update balances

### 3.4 Trade Logging

- Automatic logging of all detected trades
- Display: Date, Token, Entry, Exit, ROI, Cashout %, Amount
- Historical trade archive (indefinite retention)

### 3.5 Goal Management

- User sets monthly cashout goal (default: $400 USD, adjustable)
- Weekly progress tracker
- Sunday check: Suggests cashout boost if behind pace

### 3.6 Wallet Setup

- Input trading wallet address (Solana)
- Input vault wallet address (Solana)
- Read-only monitoring (no private keys in MVP)

---

## 4. Future Enhancements (Post-MVP)

### 4.1 High Priority

- Real-time monitoring via Solana gRPC (no manual refresh)
- Automated cashout execution (import private key, restricted permissions)
- In-app SOL → Stablecoin swap integration (Jupiter API)
- Losing streak warning notifications

### 4.2 Medium Priority

- Custom ROI brackets (user-defined cashout tiers)
- Adjustable vault deposit safety valve (force cashout after X days)
- Trading wallet vs vault balance charts
- Multi-wallet support (separate strategies)

### 4.3 Low Priority

- Tier customization (adjust boundaries and cashout rates)
- Advanced losing streak logic (tier demotion after 5+ losses)
- Win streak bonuses (+5% cashout after 3+ wins)
- Export trade history (CSV/PDF)
- Mobile app (iOS/Android)

---

## 5. User Flows

### 5.1 First-Time Setup

1. User lands on app
2. User inputs trading wallet address
3. User inputs vault wallet address
4. User sets monthly goal (or uses default $400)
5. System fetches initial wallet balances
6. Dashboard displays current tier and status

### 5.2 Daily Trading Flow

1. User trades normally on DEXs
2. User closes position (0 tokens remaining)
3. User opens app, clicks "Refresh"
4. System detects completed trade, calculates cashout
5. Toast notification: "Trade detected! Cashout 2.5 SOL (45%)"
6. User transfers 2.5 SOL to vault wallet manually
7. User clicks "Confirm Cashout" in app
8. System updates balances and logs trade

### 5.3 Weekly Goal Check (Sunday)

1. System checks weekly progress vs. monthly goal pace
2. If behind: Display suggestion "You're $60 behind pace. Boost cashout by +10% this week?"
3. User accepts or declines
4. If accepted: Temporary multiplier applied for next 7 days

---

## 6. Technical Stack

### 6.1 Frontend

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI primitives)
- **State Management:** React Context / Zustand
- **Notifications:** Sonner (via shadcn/ui)

### 6.2 Backend

- **Runtime:** Node.js
- **Framework:** Next.js API Routes (serverless)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (wallet-based optional, or simple session)
- **ORM:** Prisma or Supabase Client

### 6.3 External APIs

- **Helius API:** Solana transaction history and wallet data
- **CoinGecko/Jupiter:** SOL/USD price conversion for vault value display
- **(Future) Solana gRPC:** Real-time transaction monitoring

### 6.4 Deployment

- **Hosting:** Vercel (Next.js optimized)
- **Database:** Supabase Cloud (free tier)
- **Domain:** TBD
- **Analytics:** (Optional) Vercel Analytics or PostHog

### 6.5 Security

- No private keys stored in MVP
- Read-only wallet monitoring via public addresses
- Supabase Row Level Security (RLS) for user data isolation
- Environment variables for API keys

---

## 7. Non-Goals (Out of Scope for MVP)

- ❌ Portfolio tracking across multiple wallets
- ❌ On-chain transaction execution (automated cashouts)
- ❌ Tax reporting / PnL calculations
- ❌ Social features (leaderboards, sharing)
- ❌ Trading signals or recommendations
- ❌ Integration with centralized exchanges
- ❌ Mobile native app (web-first, mobile-responsive)

---

## 8. Open Questions & Decisions Needed

### 8.1 Branding

- [x] Finalize product name = "Profit is Profit"
- [ ] Logo and color scheme
- [ ] Tagline/positioning

### 8.2 Monetization (Future)

- Free tier: Core features
- Potential premium features: Real-time monitoring, automated execution, advanced analytics
- No monetization in MVP

### 8.3 User Onboarding

- [ ] Should we have a tutorial/walkthrough for first-time users?
- [ ] Demo mode with sample data?

---

## 9. Timeline & Milestones

### Phase 1: MVP Development (Weeks 1-3)

- Week 1: Core UI/UX + Database schema + Helius API integration
- Week 2: Trade detection logic + Cashout calculation + Logging
- Week 3: Goal tracking + Testing + Deployment

### Phase 2: User Testing (Week 4)

- Internal testing with real trades
- Gather feedback and iterate

### Phase 3: Launch & Iterate (Week 5+)

- Soft launch to small user group
- Monitor usage and refine based on data
- Plan Phase 2 features based on user needs

---

## 10. Risks & Mitigations

| Risk                                    | Impact | Mitigation                                               |
| --------------------------------------- | ------ | -------------------------------------------------------- |
| Helius API rate limits (free tier)      | High   | Monitor usage, implement caching, upgrade if needed      |
| User doesn't manually execute cashouts  | High   | Clear UI prompts, notifications, confirmation tracking   |
| Trade detection errors (bundling logic) | Medium | Thorough testing with edge cases, manual override option |
| Users abandon after setup               | Medium | Strong onboarding flow, demo mode, clear value prop      |
| Supabase free tier limits               | Low    | Monitor usage, plan for upgrade path                     |

---

## 11. Appendix

### 11.1 Related Documents

- **Functional Logic Spec:** Detailed formulas, tiers, and business rules
- **Technical Design / MVP Spec:** Architecture, API contracts, data models

### 11.2 Glossary

- **Trading Wallet:** Primary wallet used for active trading
- **Vault Wallet:** Separate wallet for storing secured profits
- **Cashout:** Transfer of SOL from trading wallet to vault wallet
- **Tier:** Wallet health level (1-5) that determines cashout percentage
- **ROI:** Return on Investment (% profit/loss on a trade)
- **Position Closed:** Token balance = 0 in trading wallet

---

## Document Control

- **Version:** 1.0
- **Last Updated:** January 2026
- **Status:** Approved for Development
- **Owner:** Product Team
- **Next Review:** Post-MVP Launch
