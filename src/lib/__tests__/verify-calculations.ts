// =============================================
// Verification Tests for Cashout Calculator
// Run with: npx ts-node src/lib/__tests__/verify-calculations.ts
// =============================================

import { Tier } from "@/types";
import { calculateCashout } from "../cashout-calculator";
import { calculateTier } from "../tier-calculator";

interface TestCase {
  name: string;
  input: {
    tier: Tier;
    netProfitSOL: number;
    roiPercent: number;
    losingStreak: number;
    goalBoostPercent?: number;
  };
  expectedPercent: number;
}

// Test cases from functional-logic.md Section 3.5
const testCases: TestCase[] = [
  {
    name: "Example 1: Tier 3, ROI 65%, Streak 0 → 25%",
    input: {
      tier: Tier.GROWTH,
      netProfitSOL: 1.0, // Arbitrary positive value
      roiPercent: 65,
      losingStreak: 0,
    },
    expectedPercent: 25,
  },
  {
    name: "Example 2: Tier 3, ROI 150%, Streak 0 → 45%",
    input: {
      tier: Tier.GROWTH,
      netProfitSOL: 1.0,
      roiPercent: 150,
      losingStreak: 0,
    },
    expectedPercent: 45,
  },
  {
    name: "Example 3: Tier 2, ROI 80%, Streak 2 → 11.25%",
    input: {
      tier: Tier.RECOVERY,
      netProfitSOL: 1.0,
      roiPercent: 80,
      losingStreak: 2,
    },
    expectedPercent: 11.25,
  },
  {
    name: "Example 4: Tier 5, ROI 200%, Streak 3+ → 40%",
    input: {
      tier: Tier.MAXIMUM,
      netProfitSOL: 1.0,
      roiPercent: 200,
      losingStreak: 3,
    },
    expectedPercent: 40,
  },
  {
    name: "Example 5: Tier 1, ROI 120%, Streak 0 → 25%",
    input: {
      tier: Tier.REBUILD,
      netProfitSOL: 1.0,
      roiPercent: 120,
      losingStreak: 0,
    },
    expectedPercent: 25,
  },
];

// Tier boundary test cases
const tierBoundaryTests = [
  { balance: 0.99, expected: Tier.REBUILD, description: "0.99 SOL → Tier 1 (REBUILD)" },
  { balance: 1.0, expected: Tier.RECOVERY, description: "1.0 SOL → Tier 2 (RECOVERY)" },
  { balance: 3.0, expected: Tier.GROWTH, description: "3.0 SOL → Tier 3 (GROWTH)" },
  { balance: 7.0, expected: Tier.AGGRESSIVE, description: "7.0 SOL → Tier 4 (AGGRESSIVE)" },
  { balance: 10.0, expected: Tier.MAXIMUM, description: "10.0 SOL → Tier 5 (MAXIMUM)" },
  { balance: 10.01, expected: Tier.MAXIMUM, description: "10.01 SOL → Tier 5 (MAXIMUM)" },
];

console.log("\n========================================");
console.log("CASHOUT CALCULATOR VERIFICATION TESTS");
console.log("========================================\n");

let allPassed = true;

// Test cashout calculations
console.log("1. Cashout Calculation Tests (Section 3.5 Examples):");
console.log("-----------------------------------------------------");

for (const testCase of testCases) {
  try {
    const result = calculateCashout(testCase.input);
    const passed = Math.abs(result.finalCashoutPercent - testCase.expectedPercent) < 0.01;
    
    if (passed) {
      console.log(`✓ ${testCase.name}`);
      console.log(`  Result: ${result.finalCashoutPercent}% (expected: ${testCase.expectedPercent}%)`);
    } else {
      console.log(`✗ ${testCase.name}`);
      console.log(`  FAILED: Got ${result.finalCashoutPercent}%, expected ${testCase.expectedPercent}%`);
      allPassed = false;
    }
    
    // Print breakdown
    console.log(`  Breakdown: Base=${result.breakdown.baseRate}%, ROI=${result.breakdown.roiBonus}%, Streak=${result.breakdown.streakMultiplier}x`);
    console.log("");
  } catch (error) {
    console.log(`✗ ${testCase.name}`);
    console.log(`  ERROR: ${error}`);
    allPassed = false;
    console.log("");
  }
}

// Test tier boundaries
console.log("\n2. Tier Boundary Tests (Section 2.1):");
console.log("---------------------------------------");

for (const test of tierBoundaryTests) {
  const result = calculateTier(test.balance);
  const passed = result === test.expected;
  
  if (passed) {
    console.log(`✓ ${test.description}`);
  } else {
    console.log(`✗ ${test.description}`);
    console.log(`  FAILED: Got Tier ${result}, expected Tier ${test.expected}`);
    allPassed = false;
  }
}

console.log("\n========================================");
if (allPassed) {
  console.log("✓ ALL TESTS PASSED");
} else {
  console.log("✗ SOME TESTS FAILED");
  process.exit(1);
}
console.log("========================================\n");
