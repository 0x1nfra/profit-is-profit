// =============================================
// Profit is Profit (PisP) - Trade Helpers
// src/lib/helpers/trade-helpers.ts
// =============================================

import type { HeliusTransaction, EnhancedTransaction, TokenTransfer, SwapAmounts } from "@/types";
import { WSOL_MINT } from "../constants";

// =============================================
// ENHANCED API - SWAP AMOUNT EXTRACTION
// =============================================

/**
 * Extracts swap amounts from Enhanced API events.swap data
 * Uses events.swap as primary source, NOT nativeTransfers (to avoid double-counting)
 *
 * @param tx - The Enhanced transaction
 * @param walletAddress - The wallet address
 * @returns SwapAmounts with SOL spent/received, token mint, and fee
 */
export function extractSwapAmounts(
  tx: EnhancedTransaction,
  walletAddress: string,
): SwapAmounts {
  const fee = tx.fee / 1e9; // Convert lamports to SOL

  // Fallback if no swap events
  if (!tx.events?.swap) {
    return {
      solSpent: 0,
      solReceived: 0,
      tokenMint: '',
      fee,
    };
  }

  const swap = tx.events.swap;
  let solSpent = 0;
  let solReceived = 0;
  let tokenMint = '';

  // Extract SOL spent (buying tokens)
  if (swap.nativeInput && swap.nativeInput.account === walletAddress) {
    solSpent = parseFloat(swap.nativeInput.amount) / 1e9;
  }

  // Extract SOL received (selling tokens)
  if (swap.nativeOutput && swap.nativeOutput.account === walletAddress) {
    solReceived = parseFloat(swap.nativeOutput.amount) / 1e9;
  }

  // Extract token mint - prefer tokenOutputs (buy), fallback to tokenInputs (sell)
  // Skip wSOL mint
  if (swap.tokenOutputs && swap.tokenOutputs.length > 0) {
    for (const output of swap.tokenOutputs) {
      if (output.mint !== WSOL_MINT) {
        tokenMint = output.mint;
        break;
      }
    }
  }

  if (!tokenMint && swap.tokenInputs && swap.tokenInputs.length > 0) {
    for (const input of swap.tokenInputs) {
      if (input.mint !== WSOL_MINT) {
        tokenMint = input.mint;
        break;
      }
    }
  }

  return {
    solSpent,
    solReceived,
    tokenMint,
    fee,
  };
}

// =============================================
// SWAP DETECTION
// =============================================

/**
 * Determines if a transaction is a swap (DEX trade) vs a simple transfer
 * Swaps involve token exchanges, while transfers just move tokens
 *
 * @param tx - The Helius transaction to check
 * @returns True if the transaction is a swap
 */
export function isSwapTransaction(tx: HeliusTransaction): boolean {
  if (!tx) return false;

  // Check for swap-specific fields from Helius
  if (tx.type === "SWAP" || tx.type === "swap") {
    return true;
  }

  // Check for swap metadata
  if (tx.swap && (tx.swap.tokenInputs || tx.swap.tokenOutputs)) {
    return true;
  }

  // Check if transaction has both token transfers and native transfers
  // This is often indicative of a swap
  const hasTokenTransfers =
    tx.tokenTransfers && tx.tokenTransfers.length > 0;
  const hasNativeTransfers =
    tx.nativeTransfers && tx.nativeTransfers.length > 0;

  // If we have both token and native transfers, it's likely a swap
  if (hasTokenTransfers && hasNativeTransfers) {
    return true;
  }

  // Check for common DEX program IDs in the source field
  const dexSources = [
    "JUPITER",
    "RAYDIUM",
    "ORCA",
    "METEORA",
    "PHOENIX",
    "LIFINITY",
    "DRIFT",
    "MANGO",
  ];

  if (tx.source && dexSources.some((dex) => tx.source?.includes(dex))) {
    return true;
  }

  return false;
}

// =============================================
// TOKEN TRANSFER EXTRACTION
// =============================================

/**
 * Extracts token transfers relevant to a specific wallet address
 * Filters transfers to/from the wallet and calculates net flow
 *
 * @param tx - The Helius transaction
 * @param walletAddress - The wallet address to extract transfers for
 * @returns Array of token transfers with direction indicator
 */
export function extractTokenTransfers(
  tx: HeliusTransaction,
  walletAddress: string,
): Array<TokenTransfer & { direction: "in" | "out" | "self"; netAmount: number }> {
  if (!tx?.tokenTransfers || tx.tokenTransfers.length === 0) {
    return [];
  }

  return tx.tokenTransfers
    .filter((transfer) => {
      // Only include transfers involving the wallet address
      return (
        transfer.fromUserAccount === walletAddress ||
        transfer.toUserAccount === walletAddress
      );
    })
    .map((transfer) => {
      const isOutgoing = transfer.fromUserAccount === walletAddress;
      const isIncoming = transfer.toUserAccount === walletAddress;

      // Check for self-transfer first (same from and to address)
      if (
        transfer.fromUserAccount === walletAddress &&
        transfer.toUserAccount === walletAddress
      ) {
        return {
          ...transfer,
          direction: "self",
          netAmount: 0,
        };
      }

      return {
        ...transfer,
        direction: isOutgoing ? "out" : "in",
        netAmount: isIncoming
          ? transfer.tokenAmount
          : isOutgoing
            ? -transfer.tokenAmount
            : 0,
      };
    });
}

/**
 * Extracts native SOL transfers relevant to a specific wallet address
 *
 * @param tx - The Helius transaction
 * @param walletAddress - The wallet address to extract transfers for
 * @returns Net SOL amount (positive = incoming, negative = outgoing)
 */
export function extractNativeTransfers(
  tx: HeliusTransaction,
  walletAddress: string,
): number {
  if (!tx?.nativeTransfers || tx.nativeTransfers.length === 0) {
    return 0;
  }

  let netSol = 0;

  for (const transfer of tx.nativeTransfers) {
    if (transfer.fromUserAccount === walletAddress) {
      // Outgoing SOL (convert lamports to SOL)
      netSol -= transfer.amount / 1e9;
    }
    if (transfer.toUserAccount === walletAddress) {
      // Incoming SOL
      netSol += transfer.amount / 1e9;
    }
  }

  return netSol;
}

// =============================================
// TRADE OUTCOME CLASSIFICATION
// =============================================

/**
 * Classifies a trade outcome based on ROI percentage
 *
 * @param roi - The ROI percentage
 * @returns 'win' if ROI > 0, 'loss' if ROI < 0, 'breakeven' if ROI = 0
 */
export function classifyTradeOutcome(
  roi: number,
): "win" | "loss" | "breakeven" {
  if (roi > 0) {
    return "win";
  } else if (roi < 0) {
    return "loss";
  } else {
    return "breakeven";
  }
}

// =============================================
// PROFIT CALCULATIONS
// =============================================

/**
 * Calculates net profit from entry and exit SOL amounts
 *
 * @param entrySol - Total SOL spent entering the position
 * @param exitSol - Total SOL received exiting the position
 * @returns Net profit in SOL (can be negative)
 */
export function calculateNetProfit(entrySol: number, exitSol: number): number {
  return exitSol - entrySol;
}

/**
 * Calculates ROI percentage from entry and exit SOL amounts
 *
 * @param entrySol - Total SOL spent entering the position
 * @param exitSol - Total SOL received exiting the position
 * @returns ROI as a percentage (e.g., 128.125 for 128.125%)
 */
export function calculateTradeROI(entrySol: number, exitSol: number): number {
  if (entrySol <= 0) {
    return 0;
  }

  const netProfit = calculateNetProfit(entrySol, exitSol);
  const roi = (netProfit / entrySol) * 100;

  return roi;
}

// =============================================
// DUST AMOUNT HANDLING
// =============================================

import { CALCULATION } from "../constants";

/**
 * Checks if an amount is considered "dust" (negligible)
 * Dust amounts are treated as 0 for calculations
 *
 * @param amount - The amount to check
 * @returns True if amount is less than dust threshold
 */
export function handleDustAmounts(amount: number): boolean {
  return Math.abs(amount) < CALCULATION.DUST_THRESHOLD;
}

/**
 * Normalizes an amount by treating dust as 0
 *
 * @param amount - The amount to normalize
 * @returns The normalized amount (0 if dust, otherwise original)
 */
export function normalizeAmount(amount: number): number {
  if (handleDustAmounts(amount)) {
    return 0;
  }
  return amount;
}

// =============================================
// TOKEN MINT IDENTIFICATION
// =============================================

/**
 * Extracts unique token mints from a list of transactions
 * Filters out wSOL mint to prevent false trades
 *
 * @param transactions - Array of Helius or Enhanced transactions
 * @returns Array of unique token mint addresses (excluding wSOL)
 */
export function extractUniqueTokenMints(
  transactions: HeliusTransaction[] | EnhancedTransaction[],
): string[] {
  const mints = new Set<string>();

  for (const tx of transactions) {
    if (tx.tokenTransfers) {
      for (const transfer of tx.tokenTransfers) {
        // Skip wSOL mint
        if (transfer.mint !== WSOL_MINT) {
          mints.add(transfer.mint);
        }
      }
    }
  }

  return Array.from(mints);
}

/**
 * Gets all transactions involving a specific token mint
 *
 * @param transactions - Array of Helius transactions
 * @param tokenMint - The token mint to filter by
 * @returns Filtered array of transactions
 */
export function getTransactionsByTokenMint(
  transactions: HeliusTransaction[],
  tokenMint: string,
): HeliusTransaction[] {
  return transactions.filter((tx) => {
    if (!tx.tokenTransfers) return false;
    return tx.tokenTransfers.some((transfer) => transfer.mint === tokenMint);
  });
}

// =============================================
// TRANSACTION SORTING
// =============================================

/**
 * Sorts transactions by timestamp (oldest first)
 *
 * @param transactions - Array of Helius transactions
 * @returns Sorted array
 */
export function sortTransactionsByTime(
  transactions: HeliusTransaction[],
): HeliusTransaction[] {
  return [...transactions].sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Gets the first transaction timestamp
 *
 * @param transactions - Array of Helius transactions
 * @returns Date of first transaction, or undefined if empty
 */
export function getFirstTransactionTime(
  transactions: HeliusTransaction[],
): Date | undefined {
  if (transactions.length === 0) return undefined;

  const sorted = sortTransactionsByTime(transactions);
  return new Date(sorted[0].timestamp * 1000);
}

/**
 * Gets the last transaction timestamp
 *
 * @param transactions - Array of Helius transactions
 * @returns Date of last transaction, or undefined if empty
 */
export function getLastTransactionTime(
  transactions: HeliusTransaction[],
): Date | undefined {
  if (transactions.length === 0) return undefined;

  const sorted = sortTransactionsByTime(transactions);
  return new Date(sorted[sorted.length - 1].timestamp * 1000);
}
