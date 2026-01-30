// =============================================
// Profit is Profit (PisP) - Tier Helpers
// src/lib/helpers/tier-helpers.ts
// =============================================

import { Tier } from "@/types";
import { TIER_CONFIG } from "../constants";

/**
 * Validates if a given number is a valid tier (1-5)
 * 
 * @param tier - The tier number to validate
 * @returns True if tier is valid (1-5), false otherwise
 */
export function isValidTier(tier: number): boolean {
  return Object.values(Tier)
    .filter((v): v is number => typeof v === "number")
    .includes(tier);
}

/**
 * Gets the next tier level (for progression tracking)
 * Returns null if already at maximum tier
 * 
 * @param currentTier - The current tier
 * @returns The next tier or null if at maximum
 */
export function getNextTier(currentTier: Tier): Tier | null {
  switch (currentTier) {
    case Tier.REBUILD:
      return Tier.RECOVERY;
    case Tier.RECOVERY:
      return Tier.GROWTH;
    case Tier.GROWTH:
      return Tier.AGGRESSIVE;
    case Tier.AGGRESSIVE:
      return Tier.MAXIMUM;
    case Tier.MAXIMUM:
      return null; // Already at max tier
    default:
      return null;
  }
}

/**
 * Formats tier information for display purposes
 * Returns a formatted string with tier number and name
 * 
 * @param tier - The tier to format
 * @returns Formatted display string (e.g., "Tier 3: GROWTH")
 */
export function formatTierDisplay(tier: Tier): string {
  const config = TIER_CONFIG[tier];
  return `Tier ${tier}: ${config.name}`;
}

/**
 * Gets tier information for display with emoji/icon indicators
 * Useful for UI components that need visual tier representation
 * 
 * @param tier - The tier to get display info for
 * @returns Object with formatted display properties
 */
export function getTierDisplayInfo(tier: Tier): {
  label: string;
  description: string;
  priority: string;
} {
  const config = TIER_CONFIG[tier];

  return {
    label: formatTierDisplay(tier),
    description: config.description,
    priority: config.priority,
  };
}
