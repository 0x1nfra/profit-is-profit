import { describe, it, expect } from 'vitest'
import {
  isValidTier,
  getNextTier,
  formatTierDisplay,
  getTierDisplayInfo,
} from '../helpers/tier-helpers'
import { Tier } from '@/types'

describe('isValidTier', () => {
  it('returns true for valid tiers 1-5', () => {
    expect(isValidTier(1)).toBe(true)
    expect(isValidTier(2)).toBe(true)
    expect(isValidTier(3)).toBe(true)
    expect(isValidTier(4)).toBe(true)
    expect(isValidTier(5)).toBe(true)
  })

  it('returns false for invalid tier numbers', () => {
    expect(isValidTier(0)).toBe(false)
    expect(isValidTier(6)).toBe(false)
    expect(isValidTier(-1)).toBe(false)
    expect(isValidTier(100)).toBe(false)
  })

  it('returns false for non-integer values', () => {
    expect(isValidTier(1.5)).toBe(false)
    expect(isValidTier(2.7)).toBe(false)
  })
})

describe('getNextTier', () => {
  it('returns Tier 2 for Tier 1', () => {
    expect(getNextTier(Tier.REBUILD)).toBe(Tier.RECOVERY)
  })

  it('returns Tier 3 for Tier 2', () => {
    expect(getNextTier(Tier.RECOVERY)).toBe(Tier.GROWTH)
  })

  it('returns Tier 4 for Tier 3', () => {
    expect(getNextTier(Tier.GROWTH)).toBe(Tier.AGGRESSIVE)
  })

  it('returns Tier 5 for Tier 4', () => {
    expect(getNextTier(Tier.AGGRESSIVE)).toBe(Tier.MAXIMUM)
  })

  it('returns null for Tier 5 (maximum)', () => {
    expect(getNextTier(Tier.MAXIMUM)).toBeNull()
  })

  it('returns correct progression chain', () => {
    let current: Tier | null = Tier.REBUILD
    const progression: (Tier | null)[] = []

    while (current !== null) {
      progression.push(current)
      current = getNextTier(current)
    }

    expect(progression).toEqual([
      Tier.REBUILD,
      Tier.RECOVERY,
      Tier.GROWTH,
      Tier.AGGRESSIVE,
      Tier.MAXIMUM,
    ])
  })
})

describe('formatTierDisplay', () => {
  it('formats Tier 1 correctly', () => {
    expect(formatTierDisplay(Tier.REBUILD)).toBe('Tier 1: REBUILD')
  })

  it('formats Tier 2 correctly', () => {
    expect(formatTierDisplay(Tier.RECOVERY)).toBe('Tier 2: RECOVERY')
  })

  it('formats Tier 3 correctly', () => {
    expect(formatTierDisplay(Tier.GROWTH)).toBe('Tier 3: GROWTH')
  })

  it('formats Tier 4 correctly', () => {
    expect(formatTierDisplay(Tier.AGGRESSIVE)).toBe('Tier 4: AGGRESSIVE PROFIT')
  })

  it('formats Tier 5 correctly', () => {
    expect(formatTierDisplay(Tier.MAXIMUM)).toBe('Tier 5: MAXIMUM EXTRACTION')
  })
})

describe('getTierDisplayInfo', () => {
  it('returns complete display info for Tier 1', () => {
    const info = getTierDisplayInfo(Tier.REBUILD)
    expect(info.label).toBe('Tier 1: REBUILD')
    expect(info.description).toBe('Fear, overtrading zone')
    expect(info.priority).toBe('Rebuild wallet fast, minimal vault deposits')
  })

  it('returns complete display info for Tier 3', () => {
    const info = getTierDisplayInfo(Tier.GROWTH)
    expect(info.label).toBe('Tier 3: GROWTH')
    expect(info.description).toBe('Balanced, confident')
    expect(info.priority).toBe('Balanced growth of wallet + vault')
  })

  it('returns complete display info for Tier 5', () => {
    const info = getTierDisplayInfo(Tier.MAXIMUM)
    expect(info.label).toBe('Tier 5: MAXIMUM EXTRACTION')
    expect(info.description).toBe('Above target capacity')
    expect(info.priority).toBe('Aggressively secure profits')
  })

  it('returns unique descriptions for each tier', () => {
    const descriptions = [
      getTierDisplayInfo(Tier.REBUILD).description,
      getTierDisplayInfo(Tier.RECOVERY).description,
      getTierDisplayInfo(Tier.GROWTH).description,
      getTierDisplayInfo(Tier.AGGRESSIVE).description,
      getTierDisplayInfo(Tier.MAXIMUM).description,
    ]

    const uniqueDescriptions = new Set(descriptions)
    expect(uniqueDescriptions.size).toBe(5)
  })
})
