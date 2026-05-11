import { describe, it, expect } from 'vitest'
import {
  calculateROIBonus,
  calculateStreakMultiplier,
  applyGoalBoost,
  getGoalBoostForGap,
  validateCashoutInput,
  getBaseRate,
  computeUpdatedStreak,
} from '../helpers/cashout-helpers'
import { Tier, ValidationError } from '@/types'

describe('calculateROIBonus', () => {
  it('returns 0 for standard win (ROI < 100%)', () => {
    expect(calculateROIBonus(0)).toBe(0)
    expect(calculateROIBonus(50)).toBe(0)
    expect(calculateROIBonus(99)).toBe(0)
    expect(calculateROIBonus(99.99)).toBe(0)
  })

  it('returns 20 for mega win (ROI >= 100%)', () => {
    expect(calculateROIBonus(100)).toBe(20)
    expect(calculateROIBonus(100.01)).toBe(20)
    expect(calculateROIBonus(150)).toBe(20)
    expect(calculateROIBonus(200)).toBe(20)
    expect(calculateROIBonus(1000)).toBe(20)
  })

  it('handles negative ROI correctly', () => {
    expect(calculateROIBonus(-50)).toBe(0)
    expect(calculateROIBonus(-100)).toBe(0)
  })
})

describe('calculateStreakMultiplier', () => {
  it('returns 1.0 for 0-1 losses', () => {
    expect(calculateStreakMultiplier(0)).toBe(1.0)
    expect(calculateStreakMultiplier(1)).toBe(1.0)
  })

  it('returns 0.75 for 2 losses', () => {
    expect(calculateStreakMultiplier(2)).toBe(0.75)
  })

  it('returns 0.5 for 3+ losses', () => {
    expect(calculateStreakMultiplier(3)).toBe(0.5)
    expect(calculateStreakMultiplier(4)).toBe(0.5)
    expect(calculateStreakMultiplier(10)).toBe(0.5)
    expect(calculateStreakMultiplier(100)).toBe(0.5)
  })

  it('handles edge cases', () => {
    expect(calculateStreakMultiplier(-1)).toBe(1.0) // Negative treated as 0-1
  })
})

describe('applyGoalBoost', () => {
  it('returns base percentage when no boost provided', () => {
    expect(applyGoalBoost(25)).toBe(25)
    expect(applyGoalBoost(25, undefined)).toBe(25)
  })

  it('returns base percentage when boost is 0', () => {
    expect(applyGoalBoost(25, 0)).toBe(25)
  })

  it('applies 5% boost correctly', () => {
    // 25% * 1.05 = 26.25%
    expect(applyGoalBoost(25, 5)).toBe(26.25)
  })

  it('applies 10% boost correctly', () => {
    // 25% * 1.10 = 27.5%
    expect(applyGoalBoost(25, 10)).toBeCloseTo(27.5, 2)
  })

  it('applies 15% boost correctly', () => {
    // 25% * 1.15 = 28.75%
    expect(applyGoalBoost(25, 15)).toBeCloseTo(28.75, 2)
  })

  it('applies 20% boost correctly', () => {
    // 25% * 1.20 = 30%
    expect(applyGoalBoost(25, 20)).toBe(30)
  })

  it('works with different base percentages', () => {
    expect(applyGoalBoost(15, 10)).toBe(16.5) // 15 * 1.1
    expect(applyGoalBoost(60, 20)).toBe(72) // 60 * 1.2
    expect(applyGoalBoost(5, 5)).toBe(5.25) // 5 * 1.05
  })

  it('throws ValidationError for invalid positive boost percentages', () => {
    expect(() => applyGoalBoost(25, 3)).toThrow(ValidationError)
    expect(() => applyGoalBoost(25, 7)).toThrow(ValidationError)
    expect(() => applyGoalBoost(25, 25)).toThrow(ValidationError)
  })

  it('returns base percentage for negative or zero boost (treated as no boost)', () => {
    expect(applyGoalBoost(25, -5)).toBe(25)
    expect(applyGoalBoost(25, 0)).toBe(25)
  })
})

describe('getGoalBoostForGap', () => {
  it('returns 0 for gap <= 0', () => {
    expect(getGoalBoostForGap(0)).toBe(0)
    expect(getGoalBoostForGap(-10)).toBe(0)
    expect(getGoalBoostForGap(-100)).toBe(0)
  })

  it('returns 5% for gap $0-50', () => {
    expect(getGoalBoostForGap(1)).toBe(5)
    expect(getGoalBoostForGap(25)).toBe(5)
    expect(getGoalBoostForGap(50)).toBe(5)
  })

  it('returns 10% for gap $51-100', () => {
    expect(getGoalBoostForGap(51)).toBe(10)
    expect(getGoalBoostForGap(75)).toBe(10)
    expect(getGoalBoostForGap(100)).toBe(10)
  })

  it('returns 15% for gap $101-200', () => {
    expect(getGoalBoostForGap(101)).toBe(15)
    expect(getGoalBoostForGap(150)).toBe(15)
    expect(getGoalBoostForGap(200)).toBe(15)
  })

  it('returns 20% for gap $201+', () => {
    expect(getGoalBoostForGap(201)).toBe(20)
    expect(getGoalBoostForGap(500)).toBe(20)
    expect(getGoalBoostForGap(1000)).toBe(20)
  })
})

describe('validateCashoutInput', () => {
  it('validates correct input', () => {
    const result = validateCashoutInput({
      tier: Tier.GROWTH,
      netProfitSOL: 1,
      roiPercent: 50,
      losingStreak: 0,
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('invalidates negative net profit', () => {
    const result = validateCashoutInput({
      tier: Tier.GROWTH,
      netProfitSOL: -1,
      roiPercent: 50,
      losingStreak: 0,
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Net profit must be positive for cashout. Got: -1 SOL')
  })

  it('invalidates zero net profit', () => {
    const result = validateCashoutInput({
      tier: Tier.GROWTH,
      netProfitSOL: 0,
      roiPercent: 50,
      losingStreak: 0,
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Net profit must be positive for cashout. Got: 0 SOL')
  })

  it('invalidates negative losing streak', () => {
    const result = validateCashoutInput({
      tier: Tier.GROWTH,
      netProfitSOL: 1,
      roiPercent: 50,
      losingStreak: -1,
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Losing streak cannot be negative. Got: -1')
  })

  it('invalidates ROI < -100%', () => {
    const result = validateCashoutInput({
      tier: Tier.GROWTH,
      netProfitSOL: 1,
      roiPercent: -101,
      losingStreak: 0,
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('ROI cannot be less than -100%. Got: -101%')
  })

  it('accepts ROI = -100%', () => {
    const result = validateCashoutInput({
      tier: Tier.GROWTH,
      netProfitSOL: 1,
      roiPercent: -100,
      losingStreak: 0,
    })
    expect(result.valid).toBe(true)
  })

  it('invalidates invalid goal boost', () => {
    const result = validateCashoutInput({
      tier: Tier.GROWTH,
      netProfitSOL: 1,
      roiPercent: 50,
      losingStreak: 0,
      goalBoostPercent: 7, // Invalid - should be 5, 10, 15, or 20
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Invalid goal boost'))).toBe(true)
  })

  it('validates valid goal boost percentages', () => {
    const validBoosts = [5, 10, 15, 20]
    validBoosts.forEach(boost => {
      const result = validateCashoutInput({
        tier: Tier.GROWTH,
        netProfitSOL: 1,
        roiPercent: 50,
        losingStreak: 0,
        goalBoostPercent: boost,
      })
      expect(result.valid).toBe(true)
    })
  })

  it('accumulates multiple errors', () => {
    const result = validateCashoutInput({
      tier: Tier.GROWTH,
      netProfitSOL: -1,
      roiPercent: -150,
      losingStreak: -2,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })
})

describe('getBaseRate', () => {
  it('returns correct base rate for each tier', () => {
    expect(getBaseRate(Tier.REBUILD)).toBe(5)
    expect(getBaseRate(Tier.RECOVERY)).toBe(15)
    expect(getBaseRate(Tier.GROWTH)).toBe(25)
    expect(getBaseRate(Tier.AGGRESSIVE)).toBe(40)
    expect(getBaseRate(Tier.MAXIMUM)).toBe(60)
  })
})

describe('computeUpdatedStreak (CASH-03 — Phase 3)', () => {
  it('returns startingStreak unchanged for empty array', () => {
    expect(computeUpdatedStreak(5, [])).toBe(5)
  })

  it('returns 0 when startingStreak=0 and single win', () => {
    expect(computeUpdatedStreak(0, [
      { netProfitSol: 1, positionClosedAt: '2026-01-01T00:00:00Z' },
    ])).toBe(0)
  })

  it('resets to 0 when startingStreak=2 and single win', () => {
    expect(computeUpdatedStreak(2, [
      { netProfitSol: 1, positionClosedAt: '2026-01-01T00:00:00Z' },
    ])).toBe(0)
  })

  it('increments to 1 when startingStreak=0 and single loss', () => {
    expect(computeUpdatedStreak(0, [
      { netProfitSol: -0.5, positionClosedAt: '2026-01-01T00:00:00Z' },
    ])).toBe(1)
  })

  it('increments to 3 when startingStreak=2 and single loss', () => {
    expect(computeUpdatedStreak(2, [
      { netProfitSol: -0.5, positionClosedAt: '2026-01-01T00:00:00Z' },
    ])).toBe(3)
  })

  it('treats zero profit as loss (increments)', () => {
    expect(computeUpdatedStreak(0, [
      { netProfitSol: 0, positionClosedAt: '2026-01-01T00:00:00Z' },
    ])).toBe(1)
  })

  it('processes [loss, loss, win] chronologically — last win resets streak to 0', () => {
    expect(computeUpdatedStreak(0, [
      { netProfitSol: -0.5, positionClosedAt: '2026-01-01T00:00:00Z' },
      { netProfitSol: -0.3, positionClosedAt: '2026-01-02T00:00:00Z' },
      { netProfitSol: 0.8, positionClosedAt: '2026-01-03T00:00:00Z' },
    ])).toBe(0)
  })

  it('processes [win, loss, loss] chronologically — final streak is 2', () => {
    expect(computeUpdatedStreak(0, [
      { netProfitSol: 0.8, positionClosedAt: '2026-01-01T00:00:00Z' },
      { netProfitSol: -0.5, positionClosedAt: '2026-01-02T00:00:00Z' },
      { netProfitSol: -0.3, positionClosedAt: '2026-01-03T00:00:00Z' },
    ])).toBe(2)
  })

  it('processes [loss, win, loss] from startingStreak=3 — final streak is 1', () => {
    expect(computeUpdatedStreak(3, [
      { netProfitSol: -0.5, positionClosedAt: '2026-01-01T00:00:00Z' },
      { netProfitSol: 0.8, positionClosedAt: '2026-01-02T00:00:00Z' },
      { netProfitSol: -0.3, positionClosedAt: '2026-01-03T00:00:00Z' },
    ])).toBe(1)
  })

  it('accumulates 4 consecutive losses', () => {
    expect(computeUpdatedStreak(0, [
      { netProfitSol: -0.1, positionClosedAt: '2026-01-01T00:00:00Z' },
      { netProfitSol: -0.2, positionClosedAt: '2026-01-02T00:00:00Z' },
      { netProfitSol: -0.3, positionClosedAt: '2026-01-03T00:00:00Z' },
      { netProfitSol: -0.4, positionClosedAt: '2026-01-04T00:00:00Z' },
    ])).toBe(4)
  })

  it('sorts out-of-order input ASC by positionClosedAt before processing', () => {
    // Input deliberately reversed: win first by array index, but later by timestamp
    // Sorted: loss (Jan 1) → win (Jan 2). Final streak: 0+1=1, then win resets to 0.
    expect(computeUpdatedStreak(0, [
      { netProfitSol: 1, positionClosedAt: '2026-03-02T00:00:00Z' },
      { netProfitSol: -1, positionClosedAt: '2026-03-01T00:00:00Z' },
    ])).toBe(0)
  })
})
