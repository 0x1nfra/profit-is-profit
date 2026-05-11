// =============================================
// Profit is Profit (PisP) - Constants & Configuration
// src/lib/constants.ts
// =============================================

import { Tier } from "@/types";

// =============================================
// TIER BOUNDARIES (Section 2.1)
// Defines SOL balance thresholds for each tier
// =============================================

export const TIER_BOUNDARIES = {
  [Tier.REBUILD]: { min: 0, max: 1 },      // < 1 SOL
  [Tier.RECOVERY]: { min: 1, max: 3 },     // 1 - 3 SOL
  [Tier.GROWTH]: { min: 3, max: 7 },       // 3 - 7 SOL
  [Tier.AGGRESSIVE]: { min: 7, max: 10 },  // 7 - 10 SOL
  [Tier.MAXIMUM]: { min: 10, max: null },  // > 10 SOL (no upper bound)
} as const;

// =============================================
// TIER CONFIGURATION (Section 3.1)
// Base cashout percentages for each tier
// =============================================

export const TIER_CONFIG = {
  [Tier.REBUILD]: {
    name: "REBUILD",
    baseRate: 5,           // 5%
    description: "Fear, overtrading zone",
    priority: "Rebuild wallet fast, minimal vault deposits",
  },
  [Tier.RECOVERY]: {
    name: "RECOVERY",
    baseRate: 15,          // 15%
    description: "Getting stable",
    priority: "Build toward comfortable size",
  },
  [Tier.GROWTH]: {
    name: "GROWTH",
    baseRate: 25,          // 25%
    description: "Balanced, confident",
    priority: "Balanced growth of wallet + vault",
  },
  [Tier.AGGRESSIVE]: {
    name: "AGGRESSIVE PROFIT",
    baseRate: 40,          // 40%
    description: "At comfortable size",
    priority: "Prioritize vault building",
  },
  [Tier.MAXIMUM]: {
    name: "MAXIMUM EXTRACTION",
    baseRate: 60,          // 60%
    description: "Above target capacity",
    priority: "Aggressively secure profits",
  },
} as const;

// =============================================
// ROI MULTIPLIERS (Section 3.2)
// Bonus percentage for mega wins (ROI >= 100%)
// =============================================

export const ROI_MULTIPLIERS = {
  STANDARD_WIN: 0,         // ROI < 100%: no bonus
  MEGA_WIN: 20,            // ROI >= 100%: +20 percentage points
  MEGA_WIN_THRESHOLD: 100, // Threshold for mega win classification
} as const;

// =============================================
// STREAK MULTIPLIERS (Section 3.3)
// Reduces cashout percentage during losing streaks
// =============================================

export const STREAK_MULTIPLIERS = {
  NONE: { maxStreak: 1, multiplier: 1.0 },      // 0-1 losses: no reduction
  MODERATE: { streak: 2, multiplier: 0.75 },    // 2 losses: 25% reduction
  SEVERE: { minStreak: 3, multiplier: 0.5 },    // 3+ losses: 50% reduction
} as const;

// =============================================
// GOAL BOOST LEVELS (Section 7.2)
// Suggested boost percentages based on goal gap
// =============================================

export const GOAL_BOOST_LEVELS = [
  { minGap: 0, maxGap: 50, boostPercent: 5 },      // Gap $0-50: +5%
  { minGap: 51, maxGap: 100, boostPercent: 10 },   // Gap $51-100: +10%
  { minGap: 101, maxGap: 200, boostPercent: 15 },  // Gap $101-200: +15%
  { minGap: 201, maxGap: null, boostPercent: 20 }, // Gap $201+: +20%
] as const;

// =============================================
// TOKEN CONSTANTS
// =============================================

export const WSOL_MINT = "So11111111111111111111111111111111111111112";

// =============================================
// CALCULATION CONSTANTS
// =============================================

export const CALCULATION = {
  // Decimal precision for SOL calculations (lamports)
  SOL_PRECISION: 9,
  // Decimal precision for percentage display
  PERCENT_PRECISION: 2,
  // Minimum trading wallet floor (Section 8.1)
  MIN_WALLET_FLOOR_SOL: 0.1,
  // Dust threshold for token balance (Section 4.3)
  DUST_THRESHOLD: 0.000001,
} as const;

// =============================================
// CASHOUT CAP (Phase 3 — CASH-07)
// Hard cap on final cashout percentage to prevent over-extraction
// on mega wins (e.g., Tier 5 + 200% ROI + 20% goal boost = 96% uncapped).
// CASHOUT_CAP_PERCENT is imported by cashout-calculator.ts in Step 5b.
// =============================================

export const CASHOUT_CAP_PERCENT = 65; // Maximum final cashout percentage

// =============================================
// ROI DISPLAY CONSTANTS
// =============================================

export const ROI_DISPLAY = {
  // Cap display for airdrop sells
  MAX_ROI_PERCENT: 9999,
  // Decimal places for multiplier (e.g., 2.5x)
  MULTIPLIER_PRECISION: 1,
} as const;

// =============================================
// DEFAULT VALUES
// =============================================

export const DEFAULTS = {
  MONTHLY_GOAL_USD: 400,
  BOOST_DURATION_DAYS: 7,
  WEEKS_IN_MONTH: 4,
} as const;

// =============================================
// HELIUS API CONFIGURATION
// =============================================

export const HELIUS_CONFIG = {
  // Base URL for Helius API
  API_BASE_URL: "https://mainnet.helius-rpc.com",
  // Enhanced API base URL
  ENHANCED_API_BASE_URL: "https://api-mainnet.helius-rpc.com",
  // Rate limit: max requests per second
  RATE_LIMIT: 10,
  // Max retries for failed requests
  MAX_RETRIES: 3,
  // Initial retry delay in milliseconds (exponential backoff)
  RETRY_DELAY_MS: 1000,
  // Maximum delay between retries
  MAX_RETRY_DELAY_MS: 10000,
  // Request timeout in milliseconds
  REQUEST_TIMEOUT_MS: 30000,
  // Default limit for transaction history
  DEFAULT_TX_LIMIT: 100,
  // Maximum limit for transaction history
  MAX_TX_LIMIT: 1000,
  // Default swap limit for Enhanced API
  DEFAULT_SWAP_LIMIT: 100,
  // Maximum backfill transactions
  MAX_BACKFILL_TRANSACTIONS: 500,
  // Wait between backfill pages
  BACKFILL_RATE_LIMIT_MS: 200,
} as const;
