// =============================================
// Profit is Profit (PisP) - Cashout Calculator
// src/lib/cashout-calculator.ts
// =============================================

import {
  CashoutInput,
  CashoutResult,
  calculateROIBonus,
  calculateStreakMultiplier,
  applyGoalBoost,
  validateCashoutInput,
  getBaseRate,
} from "./helpers/cashout-helpers";
import { CASHOUT_CAP_PERCENT } from "./constants";

/**
 * Calculates the final cashout percentage and amount based on tier, ROI, streak, and optional goal boost
 * 
 * Formula (Section 3.4 & 3.5):
 * Final Cashout % = (Base Rate + ROI Bonus) × Streak Multiplier × Goal Boost
 * Cashout Amount = Net Profit × Final Cashout %
 * 
 * @param input - CashoutInput containing tier, netProfitSOL, roiPercent, losingStreak, and optional goalBoostPercent
 * @returns CashoutResult with final percentage, amount, and breakdown
 * 
 * @throws ValidationError if input is invalid
 * 
 * Examples from functional-logic.md Section 3.5:
 * - Example 1: Tier 3, ROI 65%, Streak 0 → 25%
 * - Example 2: Tier 3, ROI 150%, Streak 0 → 45%
 * - Example 3: Tier 2, ROI 80%, Streak 2 → 11.25%
 * - Example 4: Tier 5, ROI 200%, Streak 3+ → 40%
 * - Example 5: Tier 1, ROI 120%, Streak 0 → 25%
 */
export function calculateCashout(input: CashoutInput): CashoutResult {
  // Validate input
  const validation = validateCashoutInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid cashout input: ${validation.errors.join(", ")}`);
  }

  // Step 1: Get base rate for the tier
  const baseRate = getBaseRate(input.tier);

  // Step 2: Calculate ROI bonus (0 or 20)
  const roiBonus = calculateROIBonus(input.roiPercent);

  // Step 3: Calculate streak multiplier (1.0, 0.75, or 0.5)
  const streakMultiplier = calculateStreakMultiplier(input.losingStreak);

  // Step 4: Calculate pre-boost percentage
  // Formula: (Base Rate + ROI Bonus) × Streak Multiplier
  const preBoostPercent = (baseRate + roiBonus) * streakMultiplier;

  // Step 5: Apply goal boost if provided
  // Goal boost is applied as a multiplier: percent × (1 + boost/100)
  const boostedPercent = applyGoalBoost(
    preBoostPercent,
    input.goalBoostPercent
  );

  // Step 5b: Apply hard cap (CASH-07 — prevents over-extraction on mega wins)
  // Tier 5 + 200% ROI + 20% boost = 96% uncapped; 65% cap clamps it.
  const finalCashoutPercent = Math.min(boostedPercent, CASHOUT_CAP_PERCENT);

  // Step 6: Calculate cashout amount in SOL (uses capped percent)
  const cashoutAmountSOL =
    (input.netProfitSOL * finalCashoutPercent) / 100;

  // Step 7: Calculate goal boost multiplier for breakdown
  const goalBoostMultiplier = input.goalBoostPercent
    ? 1 + input.goalBoostPercent / 100
    : 1;

  return {
    finalCashoutPercent: Number(finalCashoutPercent.toFixed(2)),
    cashoutAmountSOL: Number(cashoutAmountSOL.toFixed(9)),
    breakdown: {
      baseRate,
      roiBonus,
      streakMultiplier,
      goalBoostMultiplier,
      calculatedPercent: Number(preBoostPercent.toFixed(2)),
    },
  };
}
