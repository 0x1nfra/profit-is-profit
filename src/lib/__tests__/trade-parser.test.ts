// =============================================
// Profit is Profit (PisP) - Trade Parser Tests
// src/lib/__tests__/trade-parser.test.ts
// =============================================

import { describe, it, expect } from 'vitest'
import {
  parseTrades,
  aggregateTokenTransactions,
  detectPositionClosure,
  updatePositionClosureStatus,
} from '../trade-parser'
import { extractSwapAmounts, extractUniqueTokenMints } from '../helpers/trade-helpers'
import { HeliusTransaction, EnhancedTransaction, TokenBalance, TokenTransfer, AggregatedTrade } from '@/types'
import { ValidationError } from '@/types'
import { WSOL_MINT } from '../constants'

// =============================================
// TEST FIXTURES
// =============================================

const walletAddress = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH'
const otherAddress = 'So11111111111111111111111111111111111111112'

const createMockTx = (overrides: Partial<HeliusTransaction> = {}): HeliusTransaction => ({
  signature: 'mock-sig-' + Math.random().toString(36).substring(7),
  timestamp: Date.now() / 1000,
  type: 'SWAP',
  source: 'JUPITER',
  fee: 0.000005,
  feePayer: walletAddress,
  slot: 123456789,
  ...overrides,
})

const createTokenTransfer = (overrides: Partial<TokenTransfer> = {}): TokenTransfer => ({
  fromUserAccount: otherAddress,
  toUserAccount: walletAddress,
  fromTokenAccount: 'from-acc',
  toTokenAccount: 'to-acc',
  tokenAmount: 100,
  mint: 'token-mint',
  tokenStandard: 'Fungible',
  ...overrides,
})

// =============================================
// PARSE TRADES TESTS
// =============================================

describe('parseTrades', () => {
  it('returns empty array for empty transactions', () => {
    const trades = parseTrades([], walletAddress)
    expect(trades).toEqual([])
  })

  it('throws ValidationError for invalid wallet address', () => {
    expect(() => {
      parseTrades([], 'invalid-address')
    }).toThrow(ValidationError)
  })

  it('parses single token trade correctly', () => {
    const tokenMint = 'test-token-mint'
    const txs = [
      createMockTx({
        timestamp: 1000,
        type: 'SWAP',
        tokenTransfers: [
          createTokenTransfer({
            mint: tokenMint,
            toUserAccount: walletAddress,
            fromUserAccount: otherAddress,
            tokenAmount: 1000,
          }),
        ],
        nativeTransfers: [
          { fromUserAccount: walletAddress, toUserAccount: otherAddress, amount: 2000000000 }, // 2 SOL
        ],
      }),
      createMockTx({
        timestamp: 2000,
        type: 'SWAP',
        tokenTransfers: [
          createTokenTransfer({
            mint: tokenMint,
            fromUserAccount: walletAddress,
            toUserAccount: otherAddress,
            tokenAmount: 1000,
          }),
        ],
        nativeTransfers: [
          { fromUserAccount: otherAddress, toUserAccount: walletAddress, amount: 5000000000 }, // 5 SOL
        ],
      }),
    ]

    const trades = parseTrades(txs, walletAddress)

    expect(trades).toHaveLength(1)
    expect(trades[0].tokenMint).toBe(tokenMint)
    expect(trades[0].totalEntry).toBe(2)
    expect(trades[0].totalExit).toBe(5)
    expect(trades[0].netProfit).toBe(3)
    expect(trades[0].roi).toBe(150)
  })

  it('handles multiple different tokens', () => {
    const txs = [
      createMockTx({
        tokenTransfers: [createTokenTransfer({ mint: 'token-a' })],
        nativeTransfers: [{ fromUserAccount: walletAddress, toUserAccount: otherAddress, amount: 1000000000 }],
      }),
      createMockTx({
        tokenTransfers: [createTokenTransfer({ mint: 'token-b' })],
        nativeTransfers: [{ fromUserAccount: walletAddress, toUserAccount: otherAddress, amount: 2000000000 }],
      }),
    ]

    const trades = parseTrades(txs, walletAddress)

    expect(trades).toHaveLength(2)
    const mints = trades.map(t => t.tokenMint)
    expect(mints).toContain('token-a')
    expect(mints).toContain('token-b')
  })

  it('sorts trades by closed date (most recent first)', () => {
    const txs = [
      createMockTx({
        timestamp: 1000,
        tokenTransfers: [createTokenTransfer({ mint: 'token-a' })],
        nativeTransfers: [{ fromUserAccount: otherAddress, toUserAccount: walletAddress, amount: 1000000000 }],
      }),
      createMockTx({
        timestamp: 2000,
        tokenTransfers: [createTokenTransfer({ mint: 'token-b' })],
        nativeTransfers: [{ fromUserAccount: otherAddress, toUserAccount: walletAddress, amount: 1000000000 }],
      }),
    ]

    const trades = parseTrades(txs, walletAddress)

    expect(trades[0].tokenMint).toBe('token-b')
    expect(trades[1].tokenMint).toBe('token-a')
  })

  it('aggregates multiple buys and sells for same token (Section 4.1)', () => {
    const tokenMint = 'section-4-1-token'
    // Example from Section 4.1:
    // Entry: 3.2 SOL (2 + 1.2)
    // Exit: 7.3 SOL (3 + 3.5 + 0.8)
    // Net Profit: 4.1 SOL
    // ROI: 128.125%
    const txs = [
      createMockTx({
        timestamp: 1000,
        type: 'SWAP',
        tokenTransfers: [
          createTokenTransfer({
            mint: tokenMint,
            toUserAccount: walletAddress,
            fromUserAccount: otherAddress,
            tokenAmount: 500,
          }),
        ],
        nativeTransfers: [{ fromUserAccount: walletAddress, toUserAccount: otherAddress, amount: 2000000000 }], // 2 SOL
      }),
      createMockTx({
        timestamp: 1100,
        type: 'SWAP',
        tokenTransfers: [
          createTokenTransfer({
            mint: tokenMint,
            toUserAccount: walletAddress,
            fromUserAccount: otherAddress,
            tokenAmount: 300,
          }),
        ],
        nativeTransfers: [{ fromUserAccount: walletAddress, toUserAccount: otherAddress, amount: 1200000000 }], // 1.2 SOL
      }),
      createMockTx({
        timestamp: 2000,
        type: 'SWAP',
        tokenTransfers: [
          createTokenTransfer({
            mint: tokenMint,
            fromUserAccount: walletAddress,
            toUserAccount: otherAddress,
            tokenAmount: 400,
          }),
        ],
        nativeTransfers: [{ fromUserAccount: otherAddress, toUserAccount: walletAddress, amount: 3000000000 }], // 3 SOL
      }),
      createMockTx({
        timestamp: 2100,
        type: 'SWAP',
        tokenTransfers: [
          createTokenTransfer({
            mint: tokenMint,
            fromUserAccount: walletAddress,
            toUserAccount: otherAddress,
            tokenAmount: 250,
          }),
        ],
        nativeTransfers: [{ fromUserAccount: otherAddress, toUserAccount: walletAddress, amount: 3500000000 }], // 3.5 SOL
      }),
      createMockTx({
        timestamp: 2200,
        type: 'SWAP',
        tokenTransfers: [
          createTokenTransfer({
            mint: tokenMint,
            fromUserAccount: walletAddress,
            toUserAccount: otherAddress,
            tokenAmount: 150,
          }),
        ],
        nativeTransfers: [{ fromUserAccount: otherAddress, toUserAccount: walletAddress, amount: 800000000 }], // 0.8 SOL
      }),
    ]

    const trades = parseTrades(txs, walletAddress)

    expect(trades).toHaveLength(1)
    expect(trades[0].totalEntry).toBe(3.2) // 2 + 1.2
    expect(trades[0].totalExit).toBe(7.3) // 3 + 3.5 + 0.8
    expect(trades[0].netProfit).toBe(4.1)
    expect(trades[0].roi).toBeCloseTo(128.125, 3)
  })
})

// =============================================
// AGGREGATE TOKEN TRANSACTIONS TESTS
// =============================================

describe('aggregateTokenTransactions', () => {
  it('returns null for empty transactions', () => {
    const result = aggregateTokenTransactions([], 'mint', walletAddress)
    expect(result).toBeNull()
  })

  it('returns null when token mint not found', () => {
    const txs = [
      createMockTx({
        tokenTransfers: [createTokenTransfer({ mint: 'different-mint' })],
      }),
    ]

    const result = aggregateTokenTransactions(txs, 'target-mint', walletAddress)
    expect(result).toBeNull()
  })

  it('aggregates entry and exit amounts correctly', () => {
    const tokenMint = 'test-mint'
    const txs = [
      createMockTx({
        timestamp: 1000,
        type: 'SWAP',
        tokenTransfers: [
          createTokenTransfer({
            mint: tokenMint,
            fromUserAccount: otherAddress,
            toUserAccount: walletAddress
          }),
        ],
        nativeTransfers: [{ fromUserAccount: walletAddress, toUserAccount: otherAddress, amount: 1000000000 }],
      }),
      createMockTx({
        timestamp: 2000,
        type: 'SWAP',
        tokenTransfers: [
          createTokenTransfer({
            mint: tokenMint,
            fromUserAccount: walletAddress,
            toUserAccount: otherAddress
          }),
        ],
        nativeTransfers: [{ fromUserAccount: otherAddress, toUserAccount: walletAddress, amount: 2000000000 }],
      }),
    ]

    const result = aggregateTokenTransactions(txs, tokenMint, walletAddress)

    expect(result).not.toBeNull()
    expect(result!.totalEntrySol).toBe(1)
    expect(result!.totalExitSol).toBe(2)
    expect(result!.netProfitSol).toBe(1)
    expect(result!.roi).toBe(100)
  })

  it('sets positionClosed to false by default', () => {
    const tokenMint = 'test-mint'
    const txs = [
      createMockTx({
        tokenTransfers: [createTokenTransfer({ mint: tokenMint })],
        nativeTransfers: [{ fromUserAccount: otherAddress, toUserAccount: walletAddress, amount: 1000000000 }],
      }),
    ]

    const result = aggregateTokenTransactions(txs, tokenMint, walletAddress)
    expect(result!.positionClosed).toBe(false)
  })

  it('sets correct timestamps', () => {
    const tokenMint = 'test-mint'
    const txs = [
      createMockTx({
        timestamp: 2000,
        tokenTransfers: [createTokenTransfer({ mint: tokenMint })],
      }),
      createMockTx({
        timestamp: 1000,
        tokenTransfers: [createTokenTransfer({ mint: tokenMint })],
      }),
      createMockTx({
        timestamp: 3000,
        tokenTransfers: [createTokenTransfer({ mint: tokenMint })],
      }),
    ]

    const result = aggregateTokenTransactions(txs, tokenMint, walletAddress)

    expect(result!.firstTransactionAt.getTime()).toBe(1000000)
    expect(result!.lastTransactionAt.getTime()).toBe(3000000)
  })
})

// =============================================
// POSITION CLOSURE DETECTION TESTS
// =============================================

describe('detectPositionClosure', () => {
  it('returns true when balance is zero', () => {
    const balances: TokenBalance[] = [
      { mint: 'token-a', amount: 0, decimals: 9 },
    ]

    expect(detectPositionClosure(balances, 'token-a')).toBe(true)
  })

  it('returns true when balance is dust (< 0.000001)', () => {
    const balances: TokenBalance[] = [
      { mint: 'token-a', amount: 0.0000001, decimals: 9 },
    ]

    expect(detectPositionClosure(balances, 'token-a')).toBe(true)
  })

  it('returns true when token not in balances', () => {
    const balances: TokenBalance[] = [
      { mint: 'token-a', amount: 100, decimals: 9 },
    ]

    expect(detectPositionClosure(balances, 'token-b')).toBe(true)
  })

  it('returns false when balance is significant', () => {
    const balances: TokenBalance[] = [
      { mint: 'token-a', amount: 100, decimals: 9 },
    ]

    expect(detectPositionClosure(balances, 'token-a')).toBe(false)
  })

  it('returns false at dust threshold boundary', () => {
    const balances: TokenBalance[] = [
      { mint: 'token-a', amount: 0.000001, decimals: 9 },
    ]

    expect(detectPositionClosure(balances, 'token-a')).toBe(false)
  })
})

// =============================================
// UPDATE POSITION CLOSURE STATUS TESTS
// =============================================

describe('updatePositionClosureStatus', () => {
  it('updates positionClosed flag based on balances', () => {
    const trades: AggregatedTrade[] = [
      {
        tokenMint: 'token-a',
        totalEntrySol: 1,
        totalExitSol: 2,
        netProfitSol: 1,
        roi: 100,
        totalFeesSol: 0,
        transactions: [],
        positionClosed: false,
        firstTransactionAt: new Date(),
        lastTransactionAt: new Date(),
      },
      {
        tokenMint: 'token-b',
        totalEntrySol: 1,
        totalExitSol: 2,
        netProfitSol: 1,
        roi: 100,
        totalFeesSol: 0,
        transactions: [],
        positionClosed: false,
        firstTransactionAt: new Date(),
        lastTransactionAt: new Date(),
      },
    ]

    const balances: TokenBalance[] = [
      { mint: 'token-a', amount: 0, decimals: 9 }, // closed
      { mint: 'token-b', amount: 100, decimals: 9 }, // open
    ]

    const updated = updatePositionClosureStatus(trades, balances)

    expect(updated[0].positionClosed).toBe(true)
    expect(updated[1].positionClosed).toBe(false)
  })

  it('does not modify other trade properties', () => {
    const trade: AggregatedTrade = {
      tokenMint: 'token-a',
      totalEntrySol: 1,
      totalExitSol: 2,
      netProfitSol: 1,
      roi: 100,
      totalFeesSol: 0,
      transactions: [],
      positionClosed: false,
      firstTransactionAt: new Date('2024-01-01'),
      lastTransactionAt: new Date('2024-01-02'),
    }

    const balances: TokenBalance[] = [{ mint: 'token-a', amount: 0, decimals: 9 }]

    const [updated] = updatePositionClosureStatus([trade], balances)

    expect(updated.tokenMint).toBe('token-a')
    expect(updated.totalEntrySol).toBe(1)
    expect(updated.totalExitSol).toBe(2)
    expect(updated.netProfitSol).toBe(1)
    expect(updated.roi).toBe(100)
  })
})

// =============================================
// ENHANCED API - extractSwapAmounts TESTS
// =============================================

const createEnhancedTx = (overrides: Partial<EnhancedTransaction> = {}): EnhancedTransaction => ({
  description: 'Test swap',
  type: 'SWAP',
  source: 'JUPITER',
  fee: 5000, // lamports
  feePayer: walletAddress,
  signature: 'test-sig-' + Math.random().toString(36).substring(7),
  slot: 123456,
  timestamp: Date.now() / 1000,
  nativeTransfers: [],
  tokenTransfers: [],
  events: {},
  ...overrides,
})

describe('extractSwapAmounts', () => {
  it('extracts solSpent from events.swap.nativeInput when account matches wallet', () => {
    const tx = createEnhancedTx({
      fee: 5000,
      events: {
        swap: {
          nativeInput: {
            account: walletAddress,
            amount: '1000000000', // 1 SOL in lamports
          },
          tokenOutputs: [
            {
              userAccount: walletAddress,
              tokenAccount: 'token-acc',
              mint: 'token-mint',
              rawTokenAmount: { tokenAmount: '1000', decimals: 6 },
            },
          ],
          tokenInputs: [],
          tokenFees: [],
          nativeFees: [],
          innerSwaps: [],
        },
      },
    })

    const amounts = extractSwapAmounts(tx, walletAddress)
    expect(amounts.solSpent).toBe(1) // 1000000000 / 1e9 = 1 SOL
    expect(amounts.solReceived).toBe(0)
    expect(amounts.tokenMint).toBe('token-mint')
    expect(amounts.fee).toBe(0.000005) // 5000 / 1e9
  })

  it('extracts solReceived from events.swap.nativeOutput when account matches wallet', () => {
    const tx = createEnhancedTx({
      fee: 5000,
      events: {
        swap: {
          nativeOutput: {
            account: walletAddress,
            amount: '2000000000', // 2 SOL in lamports
          },
          tokenInputs: [
            {
              userAccount: walletAddress,
              tokenAccount: 'token-acc',
              mint: 'token-mint-sell',
              rawTokenAmount: { tokenAmount: '500', decimals: 6 },
            },
          ],
          tokenOutputs: [],
          tokenFees: [],
          nativeFees: [],
          innerSwaps: [],
        },
      },
    })

    const amounts = extractSwapAmounts(tx, walletAddress)
    expect(amounts.solSpent).toBe(0)
    expect(amounts.solReceived).toBe(2) // 2000000000 / 1e9 = 2 SOL
    expect(amounts.tokenMint).toBe('token-mint-sell')
    expect(amounts.fee).toBe(0.000005)
  })

  it('extracts tokenMint from tokenOutputs (buy) when available', () => {
    const tx = createEnhancedTx({
      events: {
        swap: {
          nativeInput: { account: walletAddress, amount: '1000000000' },
          tokenOutputs: [
            {
              userAccount: walletAddress,
              tokenAccount: 'token-acc',
              mint: 'bought-token-mint',
              rawTokenAmount: { tokenAmount: '100', decimals: 9 },
            },
          ],
          tokenInputs: [],
          tokenFees: [],
          nativeFees: [],
          innerSwaps: [],
        },
      },
    })

    const amounts = extractSwapAmounts(tx, walletAddress)
    expect(amounts.tokenMint).toBe('bought-token-mint')
  })

  it('extracts tokenMint from tokenInputs (sell) when available', () => {
    const tx = createEnhancedTx({
      events: {
        swap: {
          nativeOutput: { account: walletAddress, amount: '2000000000' },
          tokenInputs: [
            {
              userAccount: walletAddress,
              tokenAccount: 'token-acc',
              mint: 'sold-token-mint',
              rawTokenAmount: { tokenAmount: '500', decimals: 6 },
            },
          ],
          tokenOutputs: [],
          tokenFees: [],
          nativeFees: [],
          innerSwaps: [],
        },
      },
    })

    const amounts = extractSwapAmounts(tx, walletAddress)
    expect(amounts.tokenMint).toBe('sold-token-mint')
  })

  it('returns zeros when events.swap is missing (graceful fallback)', () => {
    const tx = createEnhancedTx({
      fee: 5000,
      events: {},
    })

    const amounts = extractSwapAmounts(tx, walletAddress)
    expect(amounts.solSpent).toBe(0)
    expect(amounts.solReceived).toBe(0)
    expect(amounts.tokenMint).toBe('')
    expect(amounts.fee).toBe(0.000005)
  })

  it('skips wSOL mint when extracting token mint', () => {
    const tx = createEnhancedTx({
      events: {
        swap: {
          nativeInput: { account: walletAddress, amount: '1000000000' },
          tokenOutputs: [
            {
              userAccount: walletAddress,
              tokenAccount: 'wsol-acc',
              mint: WSOL_MINT,
              rawTokenAmount: { tokenAmount: '1000', decimals: 9 },
            },
            {
              userAccount: walletAddress,
              tokenAccount: 'token-acc',
              mint: 'real-token-mint',
              rawTokenAmount: { tokenAmount: '500', decimals: 6 },
            },
          ],
          tokenInputs: [],
          tokenFees: [],
          nativeFees: [],
          innerSwaps: [],
        },
      },
    })

    const amounts = extractSwapAmounts(tx, walletAddress)
    // Should skip wSOL and use the real token
    expect(amounts.tokenMint).toBe('real-token-mint')
  })
})

// =============================================
// ENHANCED API - extractUniqueTokenMints TESTS
// =============================================

describe('extractUniqueTokenMints - wSOL filtering', () => {
  it('filters out wSOL mint from results', () => {
    const txs = [
      createEnhancedTx({
        tokenTransfers: [
          {
            fromUserAccount: walletAddress,
            toUserAccount: otherAddress,
            fromTokenAccount: 'acc1',
            toTokenAccount: 'acc2',
            tokenAmount: 100,
            mint: WSOL_MINT,
          },
          {
            fromUserAccount: walletAddress,
            toUserAccount: otherAddress,
            fromTokenAccount: 'acc3',
            toTokenAccount: 'acc4',
            tokenAmount: 200,
            mint: 'real-token-mint',
          },
        ],
      }),
    ]

    const mints = extractUniqueTokenMints(txs as any)
    expect(mints).toEqual(['real-token-mint'])
    expect(mints).not.toContain(WSOL_MINT)
  })

  it('returns only non-wSOL token mints', () => {
    const txs = [
      createEnhancedTx({
        tokenTransfers: [
          {
            fromUserAccount: walletAddress,
            toUserAccount: otherAddress,
            fromTokenAccount: 'acc1',
            toTokenAccount: 'acc2',
            tokenAmount: 100,
            mint: 'token-a',
          },
        ],
      }),
      createEnhancedTx({
        tokenTransfers: [
          {
            fromUserAccount: walletAddress,
            toUserAccount: otherAddress,
            fromTokenAccount: 'acc3',
            toTokenAccount: 'acc4',
            tokenAmount: 200,
            mint: 'token-b',
          },
        ],
      }),
      createEnhancedTx({
        tokenTransfers: [
          {
            fromUserAccount: walletAddress,
            toUserAccount: otherAddress,
            fromTokenAccount: 'acc5',
            toTokenAccount: 'acc6',
            tokenAmount: 300,
            mint: WSOL_MINT,
          },
        ],
      }),
    ]

    const mints = extractUniqueTokenMints(txs as any)
    expect(mints).toHaveLength(2)
    expect(mints).toContain('token-a')
    expect(mints).toContain('token-b')
    expect(mints).not.toContain(WSOL_MINT)
  })
})
