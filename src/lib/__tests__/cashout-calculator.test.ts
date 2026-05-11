import { describe, it, expect } from 'vitest'
import { calculateCashout } from '../cashout-calculator'
import { Tier } from '@/types'

describe('calculateCashout', () => {
  describe('functional-logic.md Section 3.5 Examples', () => {
    it('Example 1: Tier 3, ROI 65%, Streak 0 → 25%', () => {
      const result = calculateCashout({
        tier: Tier.GROWTH,
        netProfitSOL: 1,
        roiPercent: 65,
        losingStreak: 0,
      })
      expect(result.finalCashoutPercent).toBe(25)
      expect(result.cashoutAmountSOL).toBe(0.25)
      expect(result.breakdown.baseRate).toBe(25)
      expect(result.breakdown.roiBonus).toBe(0)
      expect(result.breakdown.streakMultiplier).toBe(1)
    })

    it('Example 2: Tier 3, ROI 150%, Streak 0 → 45%', () => {
      const result = calculateCashout({
        tier: Tier.GROWTH,
        netProfitSOL: 1,
        roiPercent: 150,
        losingStreak: 0,
      })
      expect(result.finalCashoutPercent).toBe(45)
      expect(result.cashoutAmountSOL).toBe(0.45)
      expect(result.breakdown.baseRate).toBe(25)
      expect(result.breakdown.roiBonus).toBe(20)
      expect(result.breakdown.streakMultiplier).toBe(1)
    })

    it('Example 3: Tier 2, ROI 80%, Streak 2 → 11.25%', () => {
      const result = calculateCashout({
        tier: Tier.RECOVERY,
        netProfitSOL: 1,
        roiPercent: 80,
        losingStreak: 2,
      })
      expect(result.finalCashoutPercent).toBe(11.25)
      expect(result.cashoutAmountSOL).toBe(0.1125)
      expect(result.breakdown.baseRate).toBe(15)
      expect(result.breakdown.roiBonus).toBe(0)
      expect(result.breakdown.streakMultiplier).toBe(0.75)
    })

    it('Example 4: Tier 5, ROI 200%, Streak 3+ → 40%', () => {
      const result = calculateCashout({
        tier: Tier.MAXIMUM,
        netProfitSOL: 1,
        roiPercent: 200,
        losingStreak: 3,
      })
      expect(result.finalCashoutPercent).toBe(40)
      expect(result.cashoutAmountSOL).toBe(0.4)
      expect(result.breakdown.baseRate).toBe(60)
      expect(result.breakdown.roiBonus).toBe(20)
      expect(result.breakdown.streakMultiplier).toBe(0.5)
    })

    it('Example 5: Tier 1, ROI 120%, Streak 0 → 25%', () => {
      const result = calculateCashout({
        tier: Tier.REBUILD,
        netProfitSOL: 1,
        roiPercent: 120,
        losingStreak: 0,
      })
      expect(result.finalCashoutPercent).toBe(25)
      expect(result.cashoutAmountSOL).toBe(0.25)
      expect(result.breakdown.baseRate).toBe(5)
      expect(result.breakdown.roiBonus).toBe(20)
      expect(result.breakdown.streakMultiplier).toBe(1)
    })
  })

  describe('tier variations', () => {
    it('Tier 1 (REBUILD) with standard win', () => {
      const result = calculateCashout({
        tier: Tier.REBUILD,
        netProfitSOL: 2,
        roiPercent: 50,
        losingStreak: 0,
      })
      expect(result.finalCashoutPercent).toBe(5)
      expect(result.cashoutAmountSOL).toBe(0.1)
    })

    it('Tier 5 (MAXIMUM) with mega win', () => {
      const result = calculateCashout({
        tier: Tier.MAXIMUM,
        netProfitSOL: 5,
        roiPercent: 150,
        losingStreak: 0,
      })
      expect(result.finalCashoutPercent).toBe(80)
      expect(result.cashoutAmountSOL).toBe(4)
    })

    it('Tier 4 (AGGRESSIVE) with standard win', () => {
      const result = calculateCashout({
        tier: Tier.AGGRESSIVE,
        netProfitSOL: 3,
        roiPercent: 75,
        losingStreak: 0,
      })
      expect(result.finalCashoutPercent).toBe(40)
      expect(result.cashoutAmountSOL).toBe(1.2)
    })
  })

  describe('streak multipliers', () => {
    it('0-1 losses: no multiplier reduction', () => {
      const result0 = calculateCashout({
        tier: Tier.GROWTH,
        netProfitSOL: 1,
        roiPercent: 50,
        losingStreak: 0,
      })
      const result1 = calculateCashout({
        tier: Tier.GROWTH,
        netProfitSOL: 1,
        roiPercent: 50,
        losingStreak: 1,
      })
      expect(result0.finalCashoutPercent).toBe(25)
      expect(result1.finalCashoutPercent).toBe(25)
    })

    it('2 losses: 25% reduction (0.75x)', () => {
      const result = calculateCashout({
        tier: Tier.GROWTH,
        netProfitSOL: 1,
        roiPercent: 50,
        losingStreak: 2,
      })
      expect(result.finalCashoutPercent).toBe(18.75)
      expect(result.breakdown.streakMultiplier).toBe(0.75)
    })

    it('3+ losses: 50% reduction (0.5x)', () => {
      const result3 = calculateCashout({
        tier: Tier.GROWTH,
        netProfitSOL: 1,
        roiPercent: 50,
        losingStreak: 3,
      })
      const result5 = calculateCashout({
        tier: Tier.GROWTH,
        netProfitSOL: 1,
        roiPercent: 50,
        losingStreak: 5,
      })
      expect(result3.finalCashoutPercent).toBe(12.5)
      expect(result5.finalCashoutPercent).toBe(12.5)
      expect(result3.breakdown.streakMultiplier).toBe(0.5)
    })
  })

  describe('goal boost variations', () => {
    it('applies 5% goal boost correctly', () => {
      const result = calculateCashout({
        tier: Tier.GROWTH,
        netProfitSOL: 1,
        roiPercent: 50,
        losingStreak: 0,
        goalBoostPercent: 5,
      })
      // Base: 25%, after 5% boost: 25 * 1.05 = 26.25%
      expect(result.finalCashoutPercent).toBe(26.25)
      expect(result.breakdown.goalBoostMultiplier).toBe(1.05)
    })

    it('applies 10% goal boost correctly', () => {
      const result = calculateCashout({
        tier: Tier.GROWTH,
        netProfitSOL: 1,
        roiPercent: 50,
        losingStreak: 0,
        goalBoostPercent: 10,
      })
      expect(result.finalCashoutPercent).toBe(27.5)
      expect(result.breakdown.goalBoostMultiplier).toBe(1.1)
    })

    it('applies 20% goal boost correctly', () => {
      const result = calculateCashout({
        tier: Tier.GROWTH,
        netProfitSOL: 1,
        roiPercent: 50,
        losingStreak: 0,
        goalBoostPercent: 20,
      })
      expect(result.finalCashoutPercent).toBe(30)
      expect(result.breakdown.goalBoostMultiplier).toBe(1.2)
    })

    it('no goal boost when not provided', () => {
      const result = calculateCashout({
        tier: Tier.GROWTH,
        netProfitSOL: 1,
        roiPercent: 50,
        losingStreak: 0,
      })
      expect(result.finalCashoutPercent).toBe(25)
      expect(result.breakdown.goalBoostMultiplier).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('throws error for negative net profit', () => {
      expect(() =>
        calculateCashout({
          tier: Tier.GROWTH,
          netProfitSOL: -1,
          roiPercent: 50,
          losingStreak: 0,
        })
      ).toThrow('Invalid cashout input')
    })

    it('throws error for zero net profit', () => {
      expect(() =>
        calculateCashout({
          tier: Tier.GROWTH,
          netProfitSOL: 0,
          roiPercent: 50,
          losingStreak: 0,
        })
      ).toThrow('Invalid cashout input')
    })

    it('throws error for negative losing streak', () => {
      expect(() =>
        calculateCashout({
          tier: Tier.GROWTH,
          netProfitSOL: 1,
          roiPercent: 50,
          losingStreak: -1,
        })
      ).toThrow('Invalid cashout input')
    })

    it('handles exact 100% ROI boundary (mega win)', () => {
      const result = calculateCashout({
        tier: Tier.GROWTH,
        netProfitSOL: 1,
        roiPercent: 100,
        losingStreak: 0,
      })
      expect(result.finalCashoutPercent).toBe(45) // 25 + 20 = 45
      expect(result.breakdown.roiBonus).toBe(20)
    })

    it('handles just below 100% ROI (standard win)', () => {
      const result = calculateCashout({
        tier: Tier.GROWTH,
        netProfitSOL: 1,
        roiPercent: 99.99,
        losingStreak: 0,
      })
      expect(result.finalCashoutPercent).toBe(25)
      expect(result.breakdown.roiBonus).toBe(0)
    })

    it('calculates correct cashout amount with various profits', () => {
      const result = calculateCashout({
        tier: Tier.RECOVERY,
        netProfitSOL: 3.5,
        roiPercent: 75,
        losingStreak: 0,
      })
      expect(result.finalCashoutPercent).toBe(15)
      expect(result.cashoutAmountSOL).toBe(0.525)
    })

    it('combines all multipliers correctly', () => {
      const result = calculateCashout({
        tier: Tier.AGGRESSIVE, // 40% base
        netProfitSOL: 2,
        roiPercent: 150, // +20% mega win
        losingStreak: 2, // 0.75x
        goalBoostPercent: 10, // 1.1x
      })
      // (40 + 20) * 0.75 * 1.1 = 60 * 0.75 * 1.1 = 49.5%
      expect(result.finalCashoutPercent).toBe(49.5)
      expect(result.cashoutAmountSOL).toBe(0.99)
    })
  })

  describe('precision', () => {
    it('returns percentages with 2 decimal precision', () => {
      const result = calculateCashout({
        tier: Tier.RECOVERY,
        netProfitSOL: 1,
        roiPercent: 50,
        losingStreak: 2,
      })
      // 15 * 0.75 = 11.25
      expect(result.finalCashoutPercent).toBe(11.25)
    })

    it('returns SOL amounts with 9 decimal precision', () => {
      const result = calculateCashout({
        tier: Tier.REBUILD,
        netProfitSOL: 0.000000001,
        roiPercent: 50,
        losingStreak: 0,
      })
      // 5% of 0.000000001 = 0.00000000005
      expect(result.cashoutAmountSOL).toBeLessThan(0.000000001)
    })
  })

  describe('CASH-07: 65% cashout cap (Phase 3)', () => {
    it('caps Tier 5 + 200% ROI + 20% boost at 65% (uncapped would be 96%)', () => {
      const result = calculateCashout({
        tier: Tier.MAXIMUM,
        netProfitSOL: 1,
        roiPercent: 200,
        losingStreak: 0,
        goalBoostPercent: 20,
      })
      expect(result.finalCashoutPercent).toBe(65)
      expect(result.cashoutAmountSOL).toBe(0.65)
    })

    it('caps Tier 4 + 150% ROI + 20% boost at 65% (uncapped would be 72%)', () => {
      const result = calculateCashout({
        tier: Tier.AGGRESSIVE,
        netProfitSOL: 1,
        roiPercent: 150,
        losingStreak: 0,
        goalBoostPercent: 20,
      })
      expect(result.finalCashoutPercent).toBe(65)
    })

    it('caps Tier 5 + 200% ROI without boost at 65% (uncapped would be 80%)', () => {
      const result = calculateCashout({
        tier: Tier.MAXIMUM,
        netProfitSOL: 1,
        roiPercent: 200,
        losingStreak: 0,
      })
      expect(result.finalCashoutPercent).toBe(65)
    })

    it('does NOT cap Tier 3 + 150% ROI + 20% boost (54% is under cap)', () => {
      const result = calculateCashout({
        tier: Tier.GROWTH,
        netProfitSOL: 1,
        roiPercent: 150,
        losingStreak: 0,
        goalBoostPercent: 20,
      })
      expect(result.finalCashoutPercent).toBe(54)
    })

    it('does NOT cap Tier 5 + 50% ROI + 5% boost (63% is under cap)', () => {
      const result = calculateCashout({
        tier: Tier.MAXIMUM,
        netProfitSOL: 1,
        roiPercent: 50,
        losingStreak: 0,
        goalBoostPercent: 5,
      })
      expect(result.finalCashoutPercent).toBe(63)
    })

    it('caps Tier 5 + 50% ROI + 10% boost at 65% (uncapped would be 66%)', () => {
      const result = calculateCashout({
        tier: Tier.MAXIMUM,
        netProfitSOL: 1,
        roiPercent: 50,
        losingStreak: 0,
        goalBoostPercent: 10,
      })
      expect(result.finalCashoutPercent).toBe(65)
    })

    it('cashoutAmountSOL uses capped percentage (not uncapped)', () => {
      const result = calculateCashout({
        tier: Tier.MAXIMUM,
        netProfitSOL: 2,
        roiPercent: 200,
        losingStreak: 0,
        goalBoostPercent: 20,
      })
      // 2 SOL * 65% = 1.3 SOL (NOT 2 * 0.96 = 1.92)
      expect(result.cashoutAmountSOL).toBe(1.3)
    })
  })
})
