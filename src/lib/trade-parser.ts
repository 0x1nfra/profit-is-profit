// =============================================
// Profit is Profit (PisP) - Trade Parser
// src/lib/trade-parser.ts
// =============================================

import type {
  AggregatedTrade,
  HeliusTransaction,
  ParsedTrade,
  TokenBalance,
} from "@/types";
import { ValidationError } from "@/types";
import { isValidSolanaAddress } from "./helpers/helius-helpers";
import {
  calculateNetProfit,
  calculateTradeROI,
  extractNativeTransfers,
  extractTokenTransfers,
  extractUniqueTokenMints,
  getTransactionsByTokenMint,
  getFirstTransactionTime,
  getLastTransactionTime,
  handleDustAmounts,
  isSwapTransaction,
  normalizeAmount,
  sortTransactionsByTime,
} from "./helpers/trade-helpers";

// =============================================
// MAIN PARSING FUNCTIONS
// =============================================

/**
 * Parses an array of Helius transactions into trades
 * Groups transactions by token mint and aggregates entry/exit amounts
 *
 * @param transactions - Array of Helius transactions from the blockchain
 * @param walletAddress - The wallet address these transactions belong to
 * @returns Array of parsed trades
 * @throws ValidationError if wallet address is invalid
 */
export function parseTrades(
  transactions: HeliusTransaction[],
  walletAddress: string,
): ParsedTrade[] {
  // Validate wallet address
  if (!isValidSolanaAddress(walletAddress)) {
    throw new ValidationError("Invalid wallet address", "walletAddress");
  }

  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Debug: Log first transaction to understand structure
  if (transactions.length > 0) {
    const firstTx = transactions[0];
    console.log('[Parser] First transaction:', {
      signature: firstTx.signature?.substring(0, 20) + '...',
      type: firstTx.type,
      source: firstTx.source,
      hasTokenTransfers: !!firstTx.tokenTransfers?.length,
      hasNativeTransfers: !!firstTx.nativeTransfers?.length,
      hasSwap: !!firstTx.swap,
    });
  }

  // Get all unique token mints from transactions
  const tokenMints = extractUniqueTokenMints(transactions);
  console.log(`[Parser] Found ${tokenMints.length} unique token mints`);

  // Aggregate trades for each token mint
  const parsedTrades: ParsedTrade[] = [];

  for (const mint of tokenMints) {
    console.log(`[Parser] Processing mint: ${mint.substring(0, 15)}...`);
    const aggregated = aggregateTokenTransactions(
      transactions,
      mint,
      walletAddress,
    );

    if (aggregated) {
      console.log(`[Parser] Aggregated trade: entry=${aggregated.totalEntrySol}, exit=${aggregated.totalExitSol}, closed=${aggregated.positionClosed}`);
      parsedTrades.push({
        tokenMint: aggregated.tokenMint,
        tokenSymbol: aggregated.tokenSymbol,
        totalEntry: aggregated.totalEntrySol,
        totalExit: aggregated.totalExitSol,
        netProfit: aggregated.netProfitSol,
        roi: aggregated.roi,
        positionClosed: aggregated.positionClosed,
        positionOpenedAt: aggregated.firstTransactionAt,
        positionClosedAt: aggregated.lastTransactionAt,
      });
    } else {
      console.log(`[Parser] No aggregated trade for mint`);
    }
  }

  // Sort by closed date (most recent first)
  return parsedTrades.sort(
    (a, b) => b.positionClosedAt.getTime() - a.positionClosedAt.getTime(),
  );
}

/**
 * Aggregates all transactions for a specific token mint into a single trade
 * Calculates total entry SOL, total exit SOL, net profit, and ROI
 *
 * Example from Section 4.1:
 * - Entry: 3.2 SOL (2 + 1.2)
 * - Exit: 7.3 SOL (3 + 3.5 + 0.8)
 * - Net Profit: 4.1 SOL
 * - ROI: 128.125%
 *
 * @param transactions - Array of all Helius transactions
 * @param tokenMint - The specific token mint to aggregate
 * @param walletAddress - The wallet address
 * @returns Aggregated trade data or null if no relevant transactions
 */
export function aggregateTokenTransactions(
  transactions: HeliusTransaction[],
  tokenMint: string,
  walletAddress: string,
): AggregatedTrade | null {
  // Get all transactions for this token
  const tokenTxs = getTransactionsByTokenMint(transactions, tokenMint);

  if (tokenTxs.length === 0) {
    return null;
  }

  // Sort by timestamp (oldest first) to track position over time
  const sortedTxs = sortTransactionsByTime(tokenTxs);

  let totalEntrySol = 0;
  let totalExitSol = 0;

  for (const tx of sortedTxs) {
    // Get token transfers for this wallet
    const tokenTransfers = extractTokenTransfers(tx, walletAddress);
    
    // Debug: Log transaction details
    const isSwap = isSwapTransaction(tx);
    const nativeTransfer = extractNativeTransfers(tx, walletAddress);
    console.log(`[Parser] TX ${tx.signature?.substring(0, 10)}... swaps=${isSwap}, tokenTransfers=${tokenTransfers.length}, nativeTransfer=${nativeTransfer.toFixed(4)} SOL`);

    for (const transfer of tokenTransfers) {
      // If we're receiving tokens (incoming), we spent SOL to get them
      if (transfer.direction === "in") {
        // For swaps, we need to calculate how much SOL was spent
        if (isSwap) {
          const solSpent = Math.abs(nativeTransfer);
          if (!handleDustAmounts(solSpent)) {
            totalEntrySol += normalizeAmount(solSpent);
            console.log(`[Parser]   Entry: +${solSpent.toFixed(4)} SOL`);
          }
        }
      }

      // If we're sending tokens (outgoing), we received SOL for them
      if (transfer.direction === "out") {
        // For swaps, we need to calculate how much SOL was received
        if (isSwap) {
          const solReceived = nativeTransfer;
          if (solReceived > 0 && !handleDustAmounts(solReceived)) {
            totalExitSol += normalizeAmount(solReceived);
            console.log(`[Parser]   Exit: +${solReceived.toFixed(4)} SOL`);
          }
        }
      }
    }
  }

  // Calculate net profit and ROI
  const netProfitSol = calculateNetProfit(totalEntrySol, totalExitSol);
  const roi = calculateTradeROI(totalEntrySol, totalExitSol);

  // Get timestamps
  const firstTransactionAt = getFirstTransactionTime(sortedTxs)!;
  const lastTransactionAt = getLastTransactionTime(sortedTxs)!;

  // Determine if position is likely closed based on transaction pattern
  // A position is considered closed if:
  // 1. There were outgoing transfers (sells), AND
  // 2. The last transaction was an outgoing transfer (suggesting complete exit)
  let positionClosed = false;
  if (sortedTxs.length > 0) {
    const lastTx = sortedTxs[sortedTxs.length - 1];
    const lastTxTransfers = extractTokenTransfers(lastTx, walletAddress);
    const hasOutgoingTransfers = lastTxTransfers.some(
      (t) => t.direction === "out"
    );
    // Position is closed if the last transaction had outgoing transfers (sell)
    // and we have some exit value recorded
    positionClosed = hasOutgoingTransfers && totalExitSol > 0;
  }

  return {
    tokenMint,
    tokenSymbol: undefined, // Would need token metadata lookup
    totalEntrySol: normalizeAmount(totalEntrySol),
    totalExitSol: normalizeAmount(totalExitSol),
    netProfitSol: normalizeAmount(netProfitSol),
    roi,
    transactions: sortedTxs,
    positionClosed,
    firstTransactionAt,
    lastTransactionAt,
  };
}

/**
 * Detects if a position has been fully closed (balance = 0)
 *
 * @param balances - Current token balances
 * @param tokenMint - The token mint to check
 * @returns True if the balance is 0 or dust
 */
export function detectPositionClosure(
  balances: TokenBalance[],
  tokenMint: string,
): boolean {
  const balance = balances.find((b) => b.mint === tokenMint);

  if (!balance) {
    // No balance found means position is closed
    return true;
  }

  // Check if balance is 0 or dust
  return handleDustAmounts(balance.amount) || balance.amount === 0;
}

/**
 * Updates aggregated trades with position closure status
 * Should be called after fetching current balances
 *
 * @param aggregatedTrades - Array of aggregated trades
 * @param currentBalances - Current token balances
 * @returns Updated trades with positionClosed flag
 */
export function updatePositionClosureStatus(
  aggregatedTrades: AggregatedTrade[],
  currentBalances: TokenBalance[],
): AggregatedTrade[] {
  return aggregatedTrades.map((trade) => ({
    ...trade,
    positionClosed: detectPositionClosure(currentBalances, trade.tokenMint),
  }));
}

// Re-export helper functions for convenience
export { calculateTradeROI, handleDustAmounts };
