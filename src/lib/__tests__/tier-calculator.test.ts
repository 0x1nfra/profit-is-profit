import { describe, it, expect } from 'vitest'
import { calculateTier, getTierName, getTierConfig } from '../tier-calculator'
import { Tier } from '@/types'

describe('calculateTier', () => {
  describe('boundary tests (Section 2.1)', () => {
    it('Tier 1: < 1 SOL (0.99 SOL → REBUILD)', () => {
      expect(calculateTier(0.99)).toBe(Tier.REBUILD)
    })

    it('Tier 2: 1.0 SOL → RECOVERY', () => {
      expect(calculateTier(1.0)).toBe(Tier.RECOVERY)
    })

    it('Tier 2: 2.5 SOL → RECOVERY', () => {
      expect(calculateTier(2.5)).toBe(Tier.RECOVERY)
    })

    it('Tier 2: 2.99 SOL → RECOVERY', () => {
      expect(calculateTier(2.99)).toBe(Tier.RECOVERY)
    })

    it('Tier 3: 3.0 SOL → GROWTH', () => {
      expect(calculateTier(3.0)).toBe(Tier.GROWTH)
    })

    it('Tier 3: 5.0 SOL → GROWTH', () => {
      expect(calculateTier(5.0)).toBe(Tier.GROWTH)
    })

    it('Tier 3: 6.99 SOL → GROWTH', () => {
      expect(calculateTier(6.99)).toBe(Tier.GROWTH)
    })

    it('Tier 4: 7.0 SOL → AGGRESSIVE', () => {
      expect(calculateTier(7.0)).toBe(Tier.AGGRESSIVE)
    })

    it('Tier 4: 8.5 SOL → AGGRESSIVE', () => {
      expect(calculateTier(8.5)).toBe(Tier.AGGRESSIVE)
    })

    it('Tier 4: 9.99 SOL → AGGRESSIVE', () => {
      expect(calculateTier(9.99)).toBe(Tier.AGGRESSIVE)
    })

    it('Tier 5: 10.0 SOL → MAXIMUM', () => {
      expect(calculateTier(10.0)).toBe(Tier.MAXIMUM)
    })

    it('Tier 5: 10.01 SOL → MAXIMUM', () => {
      expect(calculateTier(10.01)).toBe(Tier.MAXIMUM)
    })

    it('Tier 5: 100 SOL → MAXIMUM', () => {
      expect(calculateTier(100)).toBe(Tier.MAXIMUM)
    })
  })

  describe('edge cases', () => {
    it('throws error for negative balance', () => {
      expect(() => calculateTier(-1)).toThrow('Balance cannot be negative')
    })

    it('handles zero balance as Tier 1', () => {
      expect(calculateTier(0)).toBe(Tier.REBUILD)
    })

    it('handles very small balance as Tier 1', () => {
      expect(calculateTier(0.000000001)).toBe(Tier.REBUILD)
    })

    it('handles large balance as Tier 5', () => {
      expect(calculateTier(1000)).toBe(Tier.MAXIMUM)
    })
  })

  describe('tier progression', () => {
    it('progresses correctly through all tiers', () => {
      const balances = [0.5, 1, 2, 3, 4, 7, 8, 10, 15]
      const expectedTiers = [
        Tier.REBUILD,
        Tier.RECOVERY,
        Tier.RECOVERY,
        Tier.GROWTH,
        Tier.GROWTH,
        Tier.AGGRESSIVE,
        Tier.AGGRESSIVE,
        Tier.MAXIMUM,
        Tier.MAXIMUM,
      ]

      balances.forEach((balance, index) => {
        expect(calculateTier(balance)).toBe(expectedTiers[index])
      })
    })
  })
})

describe('getTierName', () => {
  it('returns correct name for Tier 1 (REBUILD)', () => {
    expect(getTierName(Tier.REBUILD)).toBe('REBUILD')
  })

  it('returns correct name for Tier 2 (RECOVERY)', () => {
    expect(getTierName(Tier.RECOVERY)).toBe('RECOVERY')
  })

  it('returns correct name for Tier 3 (GROWTH)', () => {
    expect(getTierName(Tier.GROWTH)).toBe('GROWTH')
  })

  it('returns correct name for Tier 4 (AGGRESSIVE PROFIT)', () => {
    expect(getTierName(Tier.AGGRESSIVE)).toBe('AGGRESSIVE PROFIT')
  })

  it('returns correct name for Tier 5 (MAXIMUM EXTRACTION)', () => {
    expect(getTierName(Tier.MAXIMUM)).toBe('MAXIMUM EXTRACTION')
  })
})

describe('getTierConfig', () => {
  it('returns complete config for Tier 1 (REBUILD)', () => {
    const config = getTierConfig(Tier.REBUILD)
    expect(config.tier).toBe(Tier.REBUILD)
    expect(config.name).toBe('REBUILD')
    expect(config.minBalance).toBe(0)
    expect(config.maxBalance).toBe(1)
    expect(config.baseCashoutPercent).toBe(5)
    expect(config.description).toBe('Fear, overtrading zone')
    expect(config.color).toBe('#ef4444')
  })

  it('returns complete config for Tier 3 (GROWTH)', () => {
    const config = getTierConfig(Tier.GROWTH)
    expect(config.tier).toBe(Tier.GROWTH)
    expect(config.name).toBe('GROWTH')
    expect(config.minBalance).toBe(3)
    expect(config.maxBalance).toBe(7)
    expect(config.baseCashoutPercent).toBe(25)
    expect(config.description).toBe('Balanced, confident')
  })

  it('returns complete config for Tier 5 (MAXIMUM)', () => {
    const config = getTierConfig(Tier.MAXIMUM)
    expect(config.tier).toBe(Tier.MAXIMUM)
    expect(config.name).toBe('MAXIMUM EXTRACTION')
    expect(config.minBalance).toBe(10)
    expect(config.maxBalance).toBeNull()
    expect(config.baseCashoutPercent).toBe(60)
  })

  it('returns unique colors for each tier', () => {
    const colors = [
      getTierConfig(Tier.REBUILD).color,
      getTierConfig(Tier.RECOVERY).color,
      getTierConfig(Tier.GROWTH).color,
      getTierConfig(Tier.AGGRESSIVE).color,
      getTierConfig(Tier.MAXIMUM).color,
    ]

    const uniqueColors = new Set(colors)
    expect(uniqueColors.size).toBe(5)
  })
})
