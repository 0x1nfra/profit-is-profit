// =============================================
// Profit is Profit (PisP) - Tier Calculator
// src/lib/tier-calculator.ts
// =============================================

import { Tier, TierConfig } from "@/types";
import { TIER_BOUNDARIES, TIER_CONFIG } from "./constants";

/**
 * Calculates the appropriate tier based on wallet balance in SOL
 * Tier assignment is based on balance BEFORE trade execution
 * 
 * @param balanceSOL - Current trading wallet balance in SOL
 * @returns Tier (1-5) based on balance thresholds
 * 
 * Tier Boundaries (Section 2.1):
 * - Tier 1 (REBUILD): < 1 SOL
 * - Tier 2 (RECOVERY): 1 - 3 SOL (inclusive of 1, exclusive of 3)
 * - Tier 3 (GROWTH): 3 - 7 SOL (inclusive of 3, exclusive of 7)
 * - Tier 4 (AGGRESSIVE PROFIT): 7 - 10 SOL (inclusive of 7, exclusive of 10)
 * - Tier 5 (MAXIMUM EXTRACTION): >= 10 SOL
 */
export function calculateTier(balanceSOL: number): Tier {
  if (balanceSOL < 0) {
    throw new Error("Balance cannot be negative");
  }

  if (balanceSOL < TIER_BOUNDARIES[Tier.REBUILD].max) {
    return Tier.REBUILD; // < 1 SOL
  }

  if (balanceSOL < TIER_BOUNDARIES[Tier.RECOVERY].max) {
    return Tier.RECOVERY; // 1 - 3 SOL
  }

  if (balanceSOL < TIER_BOUNDARIES[Tier.GROWTH].max) {
    return Tier.GROWTH; // 3 - 7 SOL
  }

  if (balanceSOL < TIER_BOUNDARIES[Tier.AGGRESSIVE].max) {
    return Tier.AGGRESSIVE; // 7 - 10 SOL
  }

  return Tier.MAXIMUM; // >= 10 SOL
}

/**
 * Gets the display name for a given tier
 * 
 * @param tier - The tier enum value
 * @returns Human-readable tier name (e.g., "REBUILD", "GROWTH")
 */
export function getTierName(tier: Tier): string {
  return TIER_CONFIG[tier].name;
}

/**
 * Gets the complete tier configuration including name, base rate, and balance ranges
 * 
 * @param tier - The tier enum value
 * @returns Complete TierConfig object with all tier metadata
 */
export function getTierConfig(tier: Tier): TierConfig {
  const config = TIER_CONFIG[tier];
  const boundaries = TIER_BOUNDARIES[tier];

  return {
    tier,
    name: config.name,
    minBalance: boundaries.min,
    maxBalance: boundaries.max,
    baseCashoutPercent: config.baseRate,
    description: config.description,
    color: getTierColor(tier),
  };
}

/**
 * Gets the color associated with each tier for UI display
 * @param tier - The tier enum value
 * @returns Color code for the tier
 */
function getTierColor(tier: Tier): string {
  const colors: Record<Tier, string> = {
    [Tier.REBUILD]: "#ef4444",    // Red - danger/warning
    [Tier.RECOVERY]: "#f97316",   // Orange - caution
    [Tier.GROWTH]: "#22c55e",     // Green - balanced
    [Tier.AGGRESSIVE]: "#3b82f6", // Blue - confident
    [Tier.MAXIMUM]: "#8b5cf6",    // Purple - maximum extraction
  };

  return colors[tier];
}
