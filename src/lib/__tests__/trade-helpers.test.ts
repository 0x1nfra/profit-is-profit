// =============================================
// Profit is Profit (PisP) - Trade Helpers Tests
// src/lib/__tests__/trade-helpers.test.ts
// =============================================

import { describe, it, expect } from 'vitest'
import {
  isSwapTransaction,
  extractTokenTransfers,
  extractNativeTransfers,
  classifyTradeOutcome,
  calculateNetProfit,
  calculateTradeROI,
  handleDustAmounts,
  normalizeAmount,
  extractUniqueTokenMints,
  getTransactionsByTokenMint,
  sortTransactionsByTime,
  getFirstTransactionTime,
  getLastTransactionTime,
} from '../helpers/trade-helpers'
import { HeliusTransaction, TokenTransfer } from '@/types'

// =============================================
// TEST FIXTURES
// =============================================

const createMockTransaction = (overrides: Partial<HeliusTransaction> = {}): HeliusTransaction => ({
  signature: 'mock-sig-' + Math.random().toString(36).substring(7),
  timestamp: Date.now() / 1000,
  type: 'TRANSFER',
  source: 'SYSTEM',
  fee: 0.000005,
  feePayer: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
  slot: 123456789,
  ...overrides,
})

const createMockTokenTransfer = (overrides: Partial<TokenTransfer> = {}): TokenTransfer => ({
  fromUserAccount: 'from-address',
  toUserAccount: 'to-address',
  fromTokenAccount: 'from-token-acc',
  toTokenAccount: 'to-token-acc',
  tokenAmount: 100,
  mint: 'token-mint-123',
  tokenStandard: 'Fungible',
  ...overrides,
})

// =============================================
// SWAP DETECTION TESTS
// =============================================

describe('isSwapTransaction', () => {
  it('returns true for SWAP type', () => {
    const tx = createMockTransaction({ type: 'SWAP' })
    expect(isSwapTransaction(tx)).toBe(true)
  })

  it('returns true for swap type (lowercase)', () => {
    const tx = createMockTransaction({ type: 'swap' })
    expect(isSwapTransaction(tx)).toBe(true)
  })

  it('returns true when swap metadata exists', () => {
    const tx = createMockTransaction({
      type: 'TRANSFER',
      swap: {
        tokenInputs: [{ userAccount: 'user', tokenAccount: 'acc', mint: 'mint', amount: '100' }],
      },
    })
    expect(isSwapTransaction(tx)).toBe(true)
  })

  it('returns true when both token and native transfers exist', () => {
    const tx = createMockTransaction({
      type: 'TRANSFER',
      tokenTransfers: [createMockTokenTransfer()],
      nativeTransfers: [{ fromUserAccount: 'a', toUserAccount: 'b', amount: 1000000 }],
    })
    expect(isSwapTransaction(tx)).toBe(true)
  })

  it('returns true for DEX sources', () => {
    const dexSources = ['JUPITER', 'RAYDIUM', 'ORCA', 'METEORA', 'PHOENIX']
    
    dexSources.forEach(source => {
      const tx = createMockTransaction({ source })
      expect(isSwapTransaction(tx)).toBe(true)
    })
  })

  it('returns false for simple transfers', () => {
    const tx = createMockTransaction({
      type: 'TRANSFER',
      source: 'SYSTEM',
      tokenTransfers: [createMockTokenTransfer()],
    })
    expect(isSwapTransaction(tx)).toBe(false)
  })

  it('returns false for null/undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isSwapTransaction(null as any)).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isSwapTransaction(undefined as any)).toBe(false)
  })
})

// =============================================
// TOKEN TRANSFER EXTRACTION TESTS
// =============================================

describe('extractTokenTransfers', () => {
  const walletAddress = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH'
  const otherAddress = 'OtherAddress111111111111111111111111111111111'

  it('extracts incoming transfers', () => {
    const tx = createMockTransaction({
      tokenTransfers: [
        createMockTokenTransfer({
          fromUserAccount: otherAddress,
          toUserAccount: walletAddress,
          tokenAmount: 100,
        }),
      ],
    })

    const transfers = extractTokenTransfers(tx, walletAddress)
    
    expect(transfers).toHaveLength(1)
    expect(transfers[0].direction).toBe('in')
    expect(transfers[0].netAmount).toBe(100)
  })

  it('extracts outgoing transfers', () => {
    const tx = createMockTransaction({
      tokenTransfers: [
        createMockTokenTransfer({
          fromUserAccount: walletAddress,
          toUserAccount: otherAddress,
          tokenAmount: 50,
        }),
      ],
    })

    const transfers = extractTokenTransfers(tx, walletAddress)
    
    expect(transfers).toHaveLength(1)
    expect(transfers[0].direction).toBe('out')
    expect(transfers[0].netAmount).toBe(-50)
  })

  it('filters out unrelated transfers', () => {
    const tx = createMockTransaction({
      tokenTransfers: [
        createMockTokenTransfer({
          fromUserAccount: otherAddress,
          toUserAccount: 'third-address',
          tokenAmount: 100,
        }),
      ],
    })

    const transfers = extractTokenTransfers(tx, walletAddress)
    
    expect(transfers).toHaveLength(0)
  })

  it('handles multiple transfers', () => {
    const tx = createMockTransaction({
      tokenTransfers: [
        createMockTokenTransfer({
          fromUserAccount: otherAddress,
          toUserAccount: walletAddress,
          tokenAmount: 100,
          mint: 'mint-1',
        }),
        createMockTokenTransfer({
          fromUserAccount: walletAddress,
          toUserAccount: otherAddress,
          tokenAmount: 50,
          mint: 'mint-2',
        }),
      ],
    })

    const transfers = extractTokenTransfers(tx, walletAddress)
    
    expect(transfers).toHaveLength(2)
    expect(transfers[0].direction).toBe('in')
    expect(transfers[1].direction).toBe('out')
  })

  it('returns empty array for transactions without token transfers', () => {
    const tx = createMockTransaction()
    const transfers = extractTokenTransfers(tx, walletAddress)
    
    expect(transfers).toEqual([])
  })
})

// =============================================
// NATIVE TRANSFER EXTRACTION TESTS
// =============================================

describe('extractNativeTransfers', () => {
  const walletAddress = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH'
  const otherAddress = 'OtherAddress111111111111111111111111111111111'

  it('extracts incoming SOL', () => {
    const tx = createMockTransaction({
      nativeTransfers: [
        { fromUserAccount: otherAddress, toUserAccount: walletAddress, amount: 1000000000 }, // 1 SOL
      ],
    })

    const netSol = extractNativeTransfers(tx, walletAddress)
    
    expect(netSol).toBe(1) // Converted from lamports to SOL
  })

  it('extracts outgoing SOL', () => {
    const tx = createMockTransaction({
      nativeTransfers: [
        { fromUserAccount: walletAddress, toUserAccount: otherAddress, amount: 500000000 }, // 0.5 SOL
      ],
    })

    const netSol = extractNativeTransfers(tx, walletAddress)
    
    expect(netSol).toBe(-0.5)
  })

  it('calculates net SOL from multiple transfers', () => {
    const tx = createMockTransaction({
      nativeTransfers: [
        { fromUserAccount: otherAddress, toUserAccount: walletAddress, amount: 2000000000 }, // 2 SOL in
        { fromUserAccount: walletAddress, toUserAccount: otherAddress, amount: 500000000 }, // 0.5 SOL out
      ],
    })

    const netSol = extractNativeTransfers(tx, walletAddress)
    
    expect(netSol).toBe(1.5)
  })

  it('returns 0 for transactions without native transfers', () => {
    const tx = createMockTransaction()
    const netSol = extractNativeTransfers(tx, walletAddress)
    
    expect(netSol).toBe(0)
  })
})

// =============================================
// TRADE OUTCOME CLASSIFICATION TESTS
// =============================================

describe('classifyTradeOutcome', () => {
  it('classifies positive ROI as win', () => {
    expect(classifyTradeOutcome(1)).toBe('win')
    expect(classifyTradeOutcome(100)).toBe('win')
    expect(classifyTradeOutcome(0.01)).toBe('win')
  })

  it('classifies negative ROI as loss', () => {
    expect(classifyTradeOutcome(-1)).toBe('loss')
    expect(classifyTradeOutcome(-50)).toBe('loss')
    expect(classifyTradeOutcome(-0.01)).toBe('loss')
  })

  it('classifies zero ROI as breakeven', () => {
    expect(classifyTradeOutcome(0)).toBe('breakeven')
    expect(classifyTradeOutcome(-0)).toBe('breakeven')
  })
})

// =============================================
// PROFIT CALCULATION TESTS
// =============================================

describe('calculateNetProfit', () => {
  it('calculates positive profit', () => {
    expect(calculateNetProfit(3.2, 7.3)).toBe(4.1)
  })

  it('calculates negative profit (loss)', () => {
    expect(calculateNetProfit(5, 3)).toBe(-2)
  })

  it('calculates breakeven', () => {
    expect(calculateNetProfit(5, 5)).toBe(0)
  })

  it('handles zero entry', () => {
    expect(calculateNetProfit(0, 5)).toBe(5)
  })

  it('handles zero exit', () => {
    expect(calculateNetProfit(5, 0)).toBe(-5)
  })
})

describe('calculateTradeROI', () => {
  it('calculates ROI for Section 4.1 example', () => {
    // Entry: 3.2 SOL, Exit: 7.3 SOL
    // Net Profit: 4.1 SOL
    // ROI: (4.1 / 3.2) * 100 = 128.125%
    const roi = calculateTradeROI(3.2, 7.3)
    expect(roi).toBeCloseTo(128.125, 3)
  })

  it('calculates positive ROI', () => {
    // 50% gain
    expect(calculateTradeROI(2, 3)).toBe(50)
  })

  it('calculates negative ROI (loss)', () => {
    // 50% loss
    expect(calculateTradeROI(2, 1)).toBe(-50)
  })

  it('returns 0 for breakeven', () => {
    expect(calculateTradeROI(5, 5)).toBe(0)
  })

  it('returns 0 for zero entry (avoid division by zero)', () => {
    expect(calculateTradeROI(0, 5)).toBe(0)
  })

  it('handles very small numbers', () => {
    expect(calculateTradeROI(0.000001, 0.000002)).toBe(100)
  })
})

// =============================================
// DUST AMOUNT TESTS
// =============================================

describe('handleDustAmounts', () => {
  it('returns true for amounts below threshold (0.000001)', () => {
    expect(handleDustAmounts(0.0000001)).toBe(true)
    expect(handleDustAmounts(0.0000005)).toBe(true)
    expect(handleDustAmounts(0.0000009)).toBe(true)
  })

  it('returns false for amounts at threshold', () => {
    expect(handleDustAmounts(0.000001)).toBe(false)
  })

  it('returns false for amounts above threshold', () => {
    expect(handleDustAmounts(0.000002)).toBe(false)
    expect(handleDustAmounts(1)).toBe(false)
    expect(handleDustAmounts(100)).toBe(false)
  })

  it('handles negative amounts (absolute value)', () => {
    expect(handleDustAmounts(-0.0000001)).toBe(true)
    expect(handleDustAmounts(-0.000001)).toBe(false)
    expect(handleDustAmounts(-1)).toBe(false)
  })

  it('handles zero', () => {
    expect(handleDustAmounts(0)).toBe(true)
  })
})

describe('normalizeAmount', () => {
  it('returns 0 for dust amounts', () => {
    expect(normalizeAmount(0.0000001)).toBe(0)
    expect(normalizeAmount(0.0000005)).toBe(0)
  })

  it('returns original value for non-dust amounts', () => {
    expect(normalizeAmount(0.000001)).toBe(0.000001)
    expect(normalizeAmount(1)).toBe(1)
    expect(normalizeAmount(100)).toBe(100)
  })

  it('handles negative dust amounts', () => {
    expect(normalizeAmount(-0.0000001)).toBe(0)
  })

  it('handles negative non-dust amounts', () => {
    expect(normalizeAmount(-1)).toBe(-1)
  })
})

// =============================================
// TOKEN MINT EXTRACTION TESTS
// =============================================

describe('extractUniqueTokenMints', () => {
  it('extracts unique mints from transactions', () => {
    const txs = [
      createMockTransaction({
        tokenTransfers: [
          createMockTokenTransfer({ mint: 'mint-a' }),
          createMockTokenTransfer({ mint: 'mint-b' }),
        ],
      }),
      createMockTransaction({
        tokenTransfers: [
          createMockTokenTransfer({ mint: 'mint-b' }), // duplicate
          createMockTokenTransfer({ mint: 'mint-c' }),
        ],
      }),
    ]

    const mints = extractUniqueTokenMints(txs)
    
    expect(mints).toHaveLength(3)
    expect(mints).toContain('mint-a')
    expect(mints).toContain('mint-b')
    expect(mints).toContain('mint-c')
  })

  it('returns empty array for transactions without transfers', () => {
    const txs = [createMockTransaction(), createMockTransaction()]
    const mints = extractUniqueTokenMints(txs)
    
    expect(mints).toEqual([])
  })

  it('returns empty array for empty input', () => {
    const mints = extractUniqueTokenMints([])
    expect(mints).toEqual([])
  })
})

describe('getTransactionsByTokenMint', () => {
  it('filters transactions by token mint', () => {
    const targetMint = 'target-mint'
    const txs = [
      createMockTransaction({
        tokenTransfers: [createMockTokenTransfer({ mint: targetMint })],
      }),
      createMockTransaction({
        tokenTransfers: [createMockTokenTransfer({ mint: 'other-mint' })],
      }),
      createMockTransaction({
        tokenTransfers: [
          createMockTokenTransfer({ mint: targetMint }),
          createMockTokenTransfer({ mint: 'another-mint' }),
        ],
      }),
    ]

    const filtered = getTransactionsByTokenMint(txs, targetMint)
    
    expect(filtered).toHaveLength(2)
  })

  it('returns empty array when no matches found', () => {
    const txs = [
      createMockTransaction({
        tokenTransfers: [createMockTokenTransfer({ mint: 'mint-a' })],
      }),
    ]

    const filtered = getTransactionsByTokenMint(txs, 'non-existent')
    
    expect(filtered).toEqual([])
  })

  it('handles transactions without token transfers', () => {
    const txs = [
      createMockTransaction(),
      createMockTransaction({
        tokenTransfers: [createMockTokenTransfer({ mint: 'mint-a' })],
      }),
    ]

    const filtered = getTransactionsByTokenMint(txs, 'mint-a')
    
    expect(filtered).toHaveLength(1)
  })
})

// =============================================
// TRANSACTION SORTING TESTS
// =============================================

describe('sortTransactionsByTime', () => {
  it('sorts by timestamp (oldest first)', () => {
    const txs = [
      createMockTransaction({ timestamp: 3000 }),
      createMockTransaction({ timestamp: 1000 }),
      createMockTransaction({ timestamp: 2000 }),
    ]

    const sorted = sortTransactionsByTime(txs)
    
    expect(sorted[0].timestamp).toBe(1000)
    expect(sorted[1].timestamp).toBe(2000)
    expect(sorted[2].timestamp).toBe(3000)
  })

  it('does not mutate original array', () => {
    const txs = [
      createMockTransaction({ timestamp: 3000 }),
      createMockTransaction({ timestamp: 1000 }),
    ]

    sortTransactionsByTime(txs)
    
    expect(txs[0].timestamp).toBe(3000)
    expect(txs[1].timestamp).toBe(1000)
  })
})

describe('getFirstTransactionTime', () => {
  it('returns date of first transaction', () => {
    const txs = [
      createMockTransaction({ timestamp: 3000 }),
      createMockTransaction({ timestamp: 1000 }),
      createMockTransaction({ timestamp: 2000 }),
    ]

    const first = getFirstTransactionTime(txs)
    
    expect(first).toBeInstanceOf(Date)
    expect(first?.getTime()).toBe(1000000) // timestamp * 1000
  })

  it('returns undefined for empty array', () => {
    const first = getFirstTransactionTime([])
    expect(first).toBeUndefined()
  })
})

describe('getLastTransactionTime', () => {
  it('returns date of last transaction', () => {
    const txs = [
      createMockTransaction({ timestamp: 3000 }),
      createMockTransaction({ timestamp: 1000 }),
      createMockTransaction({ timestamp: 2000 }),
    ]

    const last = getLastTransactionTime(txs)
    
    expect(last).toBeInstanceOf(Date)
    expect(last?.getTime()).toBe(3000000)
  })

  it('returns undefined for empty array', () => {
    const last = getLastTransactionTime([])
    expect(last).toBeUndefined()
  })
})
