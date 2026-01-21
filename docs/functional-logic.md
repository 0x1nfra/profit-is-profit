# Functional Logic Specification: Dynamic Cashout Calculation System

## 1. Overview

This document defines the complete business logic, formulas, rules, and edge cases for the dynamic profit cashout system. All calculations and tier assignments follow the specifications outlined here.

---

## 2. Wallet Health Tier System

### 2.1 Tier Definitions

The system operates on **5 tiers** based on current trading wallet balance:

| Tier | Name               | Balance Range (SOL) | Psychological State    | Strategic Priority                          |
| ---- | ------------------ | ------------------- | ---------------------- | ------------------------------------------- |
| 1    | REBUILD            | < 1                 | Fear, overtrading zone | Rebuild wallet fast, minimal vault deposits |
| 2    | RECOVERY           | 1 - 3               | Getting stable         | Build toward comfortable size               |
| 3    | GROWTH             | 3 - 7               | Balanced, confident    | Balanced growth of wallet + vault           |
| 4    | AGGRESSIVE PROFIT  | 7 - 10              | At comfortable size    | Prioritize vault building                   |
| 5    | MAXIMUM EXTRACTION | > 10                | Above target capacity  | Aggressively secure profits                 |

### 2.2 Tier Assignment Rules

**When Tier is Calculated:**

- At the START of each trade (before position is opened)
- Based on trading wallet balance BEFORE the trade executes

**Tier Persistence:**

- Tier assignment persists for the entire trade lifecycle
- Cashout calculation uses the tier from trade start, not trade end

**Example:**

```
Starting balance: 2.5 SOL → Tier 2 (RECOVERY)
Trade profit: 5 SOL
Ending balance: 7.5 SOL (would be Tier 4)
Cashout uses: Tier 2 rates (not Tier 4)
```

**Rationale:** Prevents gaming the system by making large trades to jump tiers.

### 2.3 Tier Transition Tracking

System logs tier transitions for analytics:

- Timestamp of tier change
- Previous tier → New tier
- Triggering event (trade profit, reload, cashout)

---

## 3. Cashout Percentage Formula

### 3.1 Base Cashout Rates

Each tier has a base cashout percentage:

| Tier                   | Base Cashout % |
| ---------------------- | -------------- |
| 1 - REBUILD            | 5%             |
| 2 - RECOVERY           | 15%            |
| 3 - GROWTH             | 25%            |
| 4 - AGGRESSIVE PROFIT  | 40%            |
| 5 - MAXIMUM EXTRACTION | 60%            |

### 3.2 ROI Multiplier (2 Brackets)

**Standard Win (ROI < 100%):**

- Multiplier: 1.0× (no adjustment)
- Uses base cashout % as-is

**Mega Win (ROI ≥ 100%):**

- Multiplier: +20 percentage points
- Example: Tier 3 base = 25%, mega win = 45%

### 3.3 Losing Streak Multiplier

Tracks consecutive losing trades:

| Streak Status         | Multiplier | Effect                |
| --------------------- | ---------- | --------------------- |
| 0-1 losses            | 1.0×       | No adjustment         |
| 2 consecutive losses  | 0.75×      | Reduce cashout by 25% |
| 3+ consecutive losses | 0.5×       | Reduce cashout by 50% |

**Streak Reset:**

- Counter resets to 0 on any winning trade (ROI > 0%)

**Streak Persistence:**

- Survives wallet reloads (adding funds doesn't reset streak)
- Only resets on actual winning trade

### 3.4 Final Cashout Formula

```
Final Cashout % = (Base Rate + ROI Bonus) × Losing Streak Multiplier

Where:
- Base Rate = Tier-based percentage (5%, 15%, 25%, 40%, 60%)
- ROI Bonus = 0% if ROI < 100%, +20% if ROI ≥ 100%
- Losing Streak Multiplier = 1.0, 0.75, or 0.5
```

### 3.5 Calculation Examples

**Example 1: Standard Win, No Streak**

- Tier: 3 (GROWTH)
- ROI: 65%
- Losing Streak: 0
- Calculation: (25% + 0%) × 1.0 = **25% cashout**

**Example 2: Mega Win, No Streak**

- Tier: 3 (GROWTH)
- ROI: 150%
- Losing Streak: 0
- Calculation: (25% + 20%) × 1.0 = **45% cashout**

**Example 3: Standard Win, 2-Loss Streak**

- Tier: 2 (RECOVERY)
- ROI: 80%
- Losing Streak: 2
- Calculation: (15% + 0%) × 0.75 = **11.25% cashout**

**Example 4: Mega Win, 3+ Loss Streak**

- Tier: 5 (MAXIMUM EXTRACTION)
- ROI: 200%
- Losing Streak: 3+
- Calculation: (60% + 20%) × 0.5 = **40% cashout**

**Example 5: Rebuild Mode, Mega Win**

- Tier: 1 (REBUILD)
- ROI: 120%
- Losing Streak: 0
- Calculation: (5% + 20%) × 1.0 = **25% cashout**

---

## 4. Trade Detection & Classification

### 4.1 Position Bundling Logic

**Trigger for Trade Completion:**

- Token balance in trading wallet = 0
- All buys/sells of same token mint aggregated into single trade

**Aggregation Method:**

```
Total Entry Cost = Sum of all SOL spent buying the token
Total Exit Value = Sum of all SOL received selling the token
Net Profit/Loss = Total Exit Value - Total Entry Cost
ROI % = (Net Profit/Loss ÷ Total Entry Cost) × 100
```

**Example: Manic Trading Session**

```
10:00 AM - Buy 1000 $ROCK for 2 SOL
10:30 AM - Buy 500 more $ROCK for 1.2 SOL
11:00 AM - Sell 500 $ROCK for 3 SOL
2:00 PM - Sell 800 $ROCK for 3.5 SOL
5:00 PM - Sell 200 $ROCK for 0.8 SOL (position closed, 0 remaining)

Aggregated Trade:
- Total Entry: 2 + 1.2 = 3.2 SOL
- Total Exit: 3 + 3.5 + 0.8 = 7.3 SOL
- Net Profit: 7.3 - 3.2 = 4.1 SOL
- ROI: (4.1 ÷ 3.2) × 100 = 128.125%
- Classification: Mega Win (≥100%)
```

### 4.2 Trade Outcome Classification

**Winning Trade:**

- Net Profit > 0 (ROI > 0%)
- Triggers cashout calculation
- Resets losing streak counter to 0

**Losing Trade:**

- Net Profit ≤ 0 (ROI ≤ 0%)
- No cashout occurs
- Increments losing streak counter by 1
- Updates trading wallet balance (reduced)

**Break-Even Trade:**

- Net Profit = 0 (ROI = 0%)
- Treated as losing trade (no cashout, increments streak)

### 4.3 Position Close Detection

**Criteria:**

```
IF trading_wallet_token_balance == 0 THEN
  position_closed = TRUE
  trigger_trade_calculation()
END IF
```

**Edge Case - Dust Amounts:**

- If balance < 0.000001 tokens (dust from rounding), treat as 0
- Prevents perpetual "open" positions from minimal leftovers

---

## 5. Cashout Amount Calculation

### 5.1 Amount Formula

```
Cashout Amount (SOL) = Net Profit (SOL) × Final Cashout %

Where:
- Net Profit = Total Exit Value - Total Entry Cost
- Final Cashout % = From Section 3.4
```

### 5.2 Balance Updates

**After Cashout Confirmation:**

```
New Trading Wallet = Current Trading Wallet - Cashout Amount
New Vault Balance = Current Vault Balance + Cashout Amount
```

**Calculation Precision:**

- All SOL amounts: 9 decimal places (lamports precision)
- Percentages: 2 decimal places for display (0.01% precision)

---

## 6. Wallet Reload Handling

### 6.1 Reload Detection

**Event:** User adds SOL to trading wallet externally

**System Response:**

1. Detect balance increase that doesn't correlate to trade profit
2. Update trading wallet balance
3. Recalculate current tier
4. **DO NOT** reset losing streak counter

**Rationale:** Reloading doesn't change trading performance; streak reflects trade outcomes, not capital injections.

### 6.2 Tier Recalculation After Reload

```
Old Balance: 0.5 SOL → Tier 1 (REBUILD)
Reload: +2.5 SOL
New Balance: 3.0 SOL → Tier 2 (RECOVERY)

Next trade uses Tier 2 cashout rates
Losing streak (if any) persists
```

---

## 7. Monthly Goal System

### 7.1 Goal Tracking

**User Sets:**

- Monthly cashout goal in USD (default: $400)
- Adjustable at any time

**System Tracks:**

```
Weekly Pace = Monthly Goal ÷ 4
Current Progress = Sum of all vault deposits this month (in USD)
Progress % = (Current Progress ÷ Monthly Goal) × 100
```

### 7.2 Sunday Goal Check

**Trigger:** Every Sunday at EOD (user timezone)

**Calculation:**

```
Weeks Elapsed = Current week number within month (1-4)
Expected Progress = (Weeks Elapsed ÷ 4) × Monthly Goal
Actual Progress = Sum of vault deposits this month
Gap = Expected Progress - Actual Progress
```

**If Gap > 0 (Behind Pace):**

```
Suggested Boost = Scale based on gap:
  - Gap $0-50: +5% boost
  - Gap $51-100: +10% boost
  - Gap $101-200: +15% boost
  - Gap $201+: +20% boost

Display: "You're $X behind monthly pace. Boost cashout by +Y% this week?"
```

**User Response:**

- **Accept:** Apply boost as temporary multiplier for 7 days
  ```
  Boosted Cashout % = Final Cashout % × (1 + Boost %)
  Example: 25% × 1.10 = 27.5% cashout
  ```
- **Decline:** Continue with normal cashout rates

**Boost Expiration:**

- Automatically expires after 7 days
- Can be reapplied on next Sunday if still behind

### 7.3 Monthly Reset

**On 1st of Each Month:**

```
Current Progress → 0
Historical Data → Archive to "Previous Months" table
Monthly Goal → Persists (user can change anytime)
Boost Multiplier → Reset to 0
```

---

## 8. Edge Cases & Special Rules

### 8.1 Trading Wallet Floor Protection

**Scenario:** Cashout would drain trading wallet below minimum threshold

**Rule:**

```
IF (Trading Wallet - Cashout Amount) < 0.1 SOL THEN
  Display Warning: "Cashout would leave you with less than 0.1 SOL"
  Suggest: Reduce cashout to maintain 0.1 SOL minimum
  Allow Override: User can proceed anyway
END IF
```

**Rationale:** Prevent user from accidentally draining wallet completely.

### 8.2 No Minimum Cashout Threshold

**Rule:**

- All profitable trades trigger cashout, regardless of amount
- Even $0.01 USD cashouts are logged and executed

**Rationale:** Build consistent habit, every profit counts.

### 8.3 Manual Override

**Capability:**

- User can manually adjust cashout amount (lower than recommended)
- Cannot increase beyond calculated recommendation

**Tracking:**

```
IF user_cashout_amount != recommended_cashout_amount THEN
  Log as "manual_override" in trade record
  Store: recommended_amount, actual_amount, override_reason (optional)
END IF
```

**Impact:**

- Does NOT affect tier calculation
- Does NOT affect losing streak counter
- Vault and wallet balances update based on actual amount

### 8.4 Simultaneous Multi-Token Trades

**Scenario:** User closes positions in multiple tokens within same refresh

**Rule:**

- Each token treated as separate trade
- Each gets its own cashout calculation
- Losing streak counter updates sequentially (order by trade close time)

**Example:**

```
User closes $ROCK (win) and $PEPE (loss) in same session
1. Process $ROCK trade (closed first): +win, streak resets to 0
2. Process $PEPE trade (closed second): +loss, streak becomes 1
```

### 8.5 Partial Position Scaling (Multiple Exits)

**Already Covered:** All exits bundled into single trade (see Section 4.1)

No special handling needed - system naturally aggregates.

### 8.6 Negative ROI (Loss) Handling

**Scenario:** Trade results in loss

```
IF ROI <= 0% THEN
  Cashout Amount = 0 SOL
  Losing Streak += 1
  Update trading wallet (reduced by loss)
  Log trade with ROI and loss amount
END IF
```

---

## 9. Calculation Validation Rules

### 9.1 Data Integrity Checks

Before finalizing any cashout:

```
✓ Trading wallet balance > 0
✓ Net profit > 0 (for cashouts)
✓ Cashout amount <= Net profit
✓ ROI calculation accurate (no division by zero)
✓ Tier assignment valid (1-5)
✓ Losing streak counter ≥ 0
```

### 9.2 Balance Reconciliation

After every cashout:

```
Expected Trading Wallet = Previous Balance + Net Profit - Cashout
Expected Vault = Previous Vault + Cashout

IF actual balances != expected balances THEN
  Flag for manual review
  Display warning to user
END IF
```

---

## 10. State Machine

### 10.1 Trade Lifecycle States

```
OPEN → User has non-zero token balance
DETECTED → Position closed (0 balance), awaiting calculation
CALCULATED → Cashout % and amount determined
PENDING_EXECUTION → User notified, awaiting manual transfer
CONFIRMED → User confirmed cashout in app
LOGGED → Trade recorded in history
```

### 10.2 Losing Streak State

```
ACTIVE → Counter > 0, multiplier applied
RESET → Win occurred, counter = 0
```

### 10.3 Goal Boost State

```
INACTIVE → No boost applied
SUGGESTED → Sunday check triggered, awaiting user response
ACTIVE → User accepted, boost applied for 7 days
EXPIRED → 7 days passed, boost removed
```

---

## 11. Formula Quick Reference

### Master Cashout Formula

```
Cashout % = (Base Rate + ROI Bonus) × Streak Multiplier × Goal Boost

Cashout Amount = Net Profit × Cashout %
```

### Component Formulas

```
Base Rate = Tier-based (5%, 15%, 25%, 40%, 60%)
ROI Bonus = ROI >= 100% ? 20% : 0%
Streak Multiplier = streak == 0-1 ? 1.0 : streak == 2 ? 0.75 : 0.5
Goal Boost = user_accepted ? (1 + boost%) : 1.0

Net Profit = Total Exit - Total Entry
ROI = (Net Profit / Total Entry) × 100
```

### Balance Updates

```
New Trading Wallet = Old Trading Wallet + Net Profit - Cashout
New Vault = Old Vault + Cashout
```

---

## Document Control

- **Version:** 1.0
- **Last Updated:** January 2026
- **Status:** Approved
- **Related:** PRD v1.0, Technical Design v1.0
