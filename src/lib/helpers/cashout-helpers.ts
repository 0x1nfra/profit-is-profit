// =============================================
// Profit is Profit (PisP) - Cashout Helpers
// src/lib/helpers/cashout-helpers.ts
// =============================================

import { Tier, ValidationError } from "@/types";
import {
  ROI_MULTIPLIERS,
  STREAK_MULTIPLIERS,
  GOAL_BOOST_LEVELS,
  TIER_CONFIG,
} from "../constants";

/**
 * Input interface for cashout calculation
 */
export interface CashoutInput {
  tier: Tier;
  netProfitSOL: number;
  roiPercent: number;
  losingStreak: number;
  goalBoostPercent?: number; // Optional: 5, 10, 15, or 20
}

/**
 * Result interface for cashout calculation breakdown
 */
export interface CashoutResult {
  finalCashoutPercent: number;
  cashoutAmountSOL: number;
  breakdown: {
    baseRate: number;
    roiBonus: number;
    streakMultiplier: number;
    goalBoostMultiplier: number;
    calculatedPercent: number;
  };
}

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Calculates ROI bonus percentage
 * Returns 20 if ROI >= 100% (mega win), 0 otherwise
 * 
 * @param roi - ROI percentage from the trade
 * @returns ROI bonus percentage (0 or 20)
 * 
 * Section 3.2: Mega Win (ROI ≥ 100%) gets +20 percentage points
 */
export function calculateROIBonus(roi: number): number {
  if (roi >= ROI_MULTIPLIERS.MEGA_WIN_THRESHOLD) {
    return ROI_MULTIPLIERS.MEGA_WIN;
  }
  return ROI_MULTIPLIERS.STANDARD_WIN;
}

/**
 * Calculates the streak multiplier based on consecutive losing trades
 * 
 * @param streak - Number of consecutive losing trades
 * @returns Multiplier value (1.0, 0.75, or 0.5)
 * 
 * Section 3.3:
 * - 0-1 losses: 1.0× (no adjustment)
 * - 2 losses: 0.75× (25% reduction)
 * - 3+ losses: 0.5× (50% reduction)
 */
export function calculateStreakMultiplier(streak: number): number {
  if (streak >= STREAK_MULTIPLIERS.SEVERE.minStreak) {
    return STREAK_MULTIPLIERS.SEVERE.multiplier; // 3+ losses = 0.5
  }

  if (streak === STREAK_MULTIPLIERS.MODERATE.streak) {
    return STREAK_MULTIPLIERS.MODERATE.multiplier; // 2 losses = 0.75
  }

  return STREAK_MULTIPLIERS.NONE.multiplier; // 0-1 losses = 1.0
}

/**
 * Applies goal boost multiplier to the base percentage
 * 
 * @param basePercent - The calculated cashout percentage before boost
 * @param boostPercent - Optional goal boost percentage (5, 10, 15, or 20)
 * @returns Final percentage after applying boost multiplier
 * 
 * Section 7.2: Boost is applied as a multiplier
 * Example: 25% × 1.10 = 27.5% cashout
 */
export function applyGoalBoost(
  basePercent: number,
  boostPercent?: number
): number {
  if (!boostPercent || boostPercent <= 0) {
    return basePercent;
  }

  // Validate boost percentage is one of the allowed values
  const validBoosts: number[] = [5, 10, 15, 20];
  if (!validBoosts.includes(boostPercent)) {
    throw new ValidationError(
      `Invalid goal boost percentage: ${boostPercent}. Must be one of: ${validBoosts.join(", ")}`
    );
  }

  // Apply boost as multiplier: base × (1 + boost/100)
  const boostMultiplier = 1 + boostPercent / 100;
  return basePercent * boostMultiplier;
}

/**
 * Determines the appropriate goal boost percentage based on gap amount
 * 
 * @param gapAmount - The dollar amount behind monthly goal pace
 * @returns Recommended boost percentage (5, 10, 15, or 20)
 * 
 * Section 7.2: Gap thresholds
 * - Gap $0-50: +5% boost
 * - Gap $51-100: +10% boost
 * - Gap $101-200: +15% boost
 * - Gap $201+: +20% boost
 */
export function getGoalBoostForGap(gapAmount: number): number {
  if (gapAmount <= 0) {
    return 0; // No boost if on track or ahead
  }

  for (const level of GOAL_BOOST_LEVELS) {
    if (level.maxGap === null || gapAmount <= level.maxGap) {
      if (gapAmount >= level.minGap) {
        return level.boostPercent;
      }
    }
  }

  return 0; // Default: no boost
}

/**
 * Validates cashout input parameters
 * 
 * @param input - The cashout input to validate
 * @returns Validation result with valid flag and any error messages
 */
export function validateCashoutInput(input: CashoutInput): ValidationResult {
  const errors: string[] = [];

  // Validate tier
  if (!Object.values(Tier).includes(input.tier)) {
    errors.push(`Invalid tier: ${input.tier}. Must be between 1 and 5.`);
  }

  // Validate net profit (must be positive for cashout)
  if (input.netProfitSOL <= 0) {
    errors.push(
      `Net profit must be positive for cashout. Got: ${input.netProfitSOL} SOL`
    );
  }

  // Validate ROI
  if (input.roiPercent < -100) {
    errors.push(
      `ROI cannot be less than -100%. Got: ${input.roiPercent}%`
    );
  }

  // Validate losing streak (must be non-negative)
  if (input.losingStreak < 0) {
    errors.push(
      `Losing streak cannot be negative. Got: ${input.losingStreak}`
    );
  }

  // Validate goal boost if provided
  if (input.goalBoostPercent !== undefined) {
    const validBoosts: number[] = [5, 10, 15, 20];
    if (!validBoosts.includes(input.goalBoostPercent as number)) {
      errors.push(
        `Invalid goal boost: ${input.goalBoostPercent}%. Must be one of: ${validBoosts.join(", ")}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Gets the base cashout rate for a given tier
 *
 * @param tier - The tier to get base rate for
 * @returns Base cashout percentage for the tier
 */
export function getBaseRate(tier: Tier): number {
  return TIER_CONFIG[tier].baseRate;
}

/**
 * Computes the updated losing streak after processing a batch of trades.
 *
 * Trades are sorted ASCENDING by positionClosedAt (chronological order),
 * then iterated:
 * - Win (netProfitSol > 0): streak resets to 0
 * - Loss (netProfitSol <= 0): streak increments by 1
 *
 * @param startingStreak - Current streak before the batch
 * @param tradeResults - Trades to process; will be sorted internally
 * @returns Final streak after all trades processed
 *
 * Implementation: Plan 02 (currently a RED stub).
 */
export function computeUpdatedStreak(
  startingStreak: number,
  tradeResults: Array<{ netProfitSol: number; positionClosedAt: string }>
): number {
  throw new Error("Not implemented — see Plan 02");
}
