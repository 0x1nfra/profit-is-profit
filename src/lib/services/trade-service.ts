// =============================================
// Profit is Profit (PisP) - Trade Service
// src/lib/services/trade-service.ts
// =============================================

import type { ParsedTrade, SyncResult, Trade, Wallet } from "@/types";
import { ApiError, TradeStatus, WalletType } from "@/types";
import { supabaseAdmin } from "../supabase";
import {
  getSolBalance,
  getSwapHistory,
  backfillSwapHistory,
  getTokenBalances,
} from "../helius-client";
import { parseTrades, updatePositionClosureStatus } from "../trade-parser";
import { isValidSolanaAddress } from "../helpers/helius-helpers";
import { calculateTier } from "../tier-calculator";
import { calculateCashout } from "../cashout-calculator";
import { getSolUsdPrice } from "./price-service";

// =============================================
// SYNC TRADES
// =============================================

/**
 * Syncs trades from Helius for a wallet and saves them to the database
 * This is the main orchestration function that:
 * 1. Fetches new transactions from Helius (backfill or incremental)
 * 2. Parses them into trades
 * 3. Detects position closures via token balances
 * 4. Saves closed trades to the database (idempotent)
 * 5. Updates wallet balances with USD conversion
 *
 * @param walletAddress - The trading wallet address to sync
 * @param userId - The user ID who owns the wallet
 * @returns SyncResult with new trades and updated balances
 * @throws ApiError on sync failures
 */
export async function syncTrades(
  walletAddress: string,
  userId: string,
): Promise<SyncResult> {
  try {
    // Validate inputs
    if (!isValidSolanaAddress(walletAddress)) {
      throw new ApiError("Invalid wallet address", 400, "INVALID_ADDRESS");
    }

    if (!userId) {
      throw new ApiError("User ID is required", 400, "MISSING_USER_ID");
    }

    // Get wallet record
    const wallet = await getWalletByAddress(walletAddress, userId);
    if (!wallet) {
      throw new ApiError(
        "Wallet not found for this user",
        404,
        "WALLET_NOT_FOUND",
      );
    }

    // Check last sync timestamp to determine backfill vs incremental
    const lastSync = await getLastSyncTimestamp(walletAddress);
    const lastSyncTimestamp = lastSync ? new Date(lastSync).getTime() / 1000 : null;

    // Fetch swap transactions from Helius Enhanced API
    let allSwaps;
    if (!lastSync) {
      // First sync: backfill up to 500 swap transactions
      allSwaps = await backfillSwapHistory(walletAddress, 500);
    } else {
      // Incremental: fetch recent swaps, filter by timestamp > lastSync
      allSwaps = await getSwapHistory(walletAddress);
      if (lastSyncTimestamp) {
        allSwaps = allSwaps.filter((tx) => tx.timestamp > lastSyncTimestamp);
      }
    }

    // Get SOL/USD price for conversion
    const solPrice = await getSolUsdPrice();

    if (allSwaps.length === 0) {
      // No new transactions found, just return current state
      const solBalance = await getSolBalance(walletAddress);
      await updateWalletBalance(wallet.id, solBalance, solPrice);
      const balances = await fetchWalletBalances(userId);

      const syncTimestamp = new Date().toISOString();
      await updateLastSyncTimestamp(wallet.id, syncTimestamp);

      return {
        success: true,
        newTrades: [],
        updatedBalances: balances,
        lastSyncTimestamp: syncTimestamp,
        closedTradesCount: 0,
        totalProfitSol: 0,
        totalProfitUsd: 0,
        solPrice,
      };
    }

    // Parse transactions into trades
    const parsedTrades = parseTrades(allSwaps, walletAddress);

    // Detect position closures via token balances
    const currentBalances = await getTokenBalances(walletAddress);
    const aggregatedTrades = parsedTrades.map((trade) => ({
      tokenMint: trade.tokenMint,
      tokenSymbol: trade.tokenSymbol,
      totalEntrySol: trade.totalEntry,
      totalExitSol: trade.totalExit,
      netProfitSol: trade.netProfit,
      roi: trade.roi,
      totalFeesSol: trade.totalFeesSol,
      transactions: allSwaps.filter((tx) =>
        tx.events.swap?.tokenInputs.some((t) => t.mint === trade.tokenMint) ||
        tx.events.swap?.tokenOutputs.some((t) => t.mint === trade.tokenMint)
      ),
      positionClosed: trade.positionClosed,
      firstTransactionAt: trade.positionOpenedAt || trade.positionClosedAt,
      lastTransactionAt: trade.positionClosedAt,
    }));

    const tradesWithClosureStatus = updatePositionClosureStatus(
      aggregatedTrades,
      currentBalances,
    );

    // Only save CLOSED trades
    const closedTrades = parsedTrades.filter((parsed) => {
      const aggregated = tradesWithClosureStatus.find(
        (t) => t.tokenMint === parsed.tokenMint,
      );
      return aggregated?.positionClosed;
    });

    // Filter out trades that already exist in the database and save new ones
    const newTrades: Trade[] = [];
    let totalProfitSol = 0;

    for (const parsed of closedTrades) {
      // Check if trade already exists (by token mint and close date)
      const existing = await findExistingTrade(
        userId,
        parsed.tokenMint,
        parsed.positionClosedAt,
      );

      if (!existing) {
        // Calculate USD values
        const netProfitUsd = parsed.netProfit * solPrice;

        // Save new trade
        const saved = await saveTrade(
          { ...parsed, netProfitUsd },
          userId,
          wallet.id,
          solPrice,
        );
        newTrades.push(saved);
        totalProfitSol += parsed.netProfit;
      }
    }

    // Update wallet balance with SOL and USD
    const solBalance = await getSolBalance(walletAddress);
    await updateWalletBalance(wallet.id, solBalance, solPrice);

    // Update last sync timestamp
    const syncTimestamp = new Date().toISOString();
    await updateLastSyncTimestamp(wallet.id, syncTimestamp);

    // Get updated balances
    const balances = await fetchWalletBalances(userId);

    const totalProfitUsd = totalProfitSol * solPrice;

    return {
      success: true,
      newTrades,
      updatedBalances: balances,
      lastSyncTimestamp: syncTimestamp,
      closedTradesCount: newTrades.length,
      totalProfitSol,
      totalProfitUsd,
      solPrice,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error("Trade sync failed:", error);
    throw new ApiError(
      `Failed to sync trades: ${error instanceof Error ? error.message : "Unknown error"}`,
      500,
      "SYNC_FAILED",
    );
  }
}

// =============================================
// SAVE TRADE
// =============================================

/**
 * Saves a parsed trade to the database
 * Calculates tier, cashout percentage, and all related fields
 *
 * @param trade - The parsed trade data
 * @param userId - The user ID who owns the trade
 * @param walletId - The trading wallet ID
 * @param solPrice - Current SOL/USD price
 * @returns The saved Trade record
 * @throws ApiError on save failures
 */
export async function saveTrade(
  trade: ParsedTrade,
  userId: string,
  walletId: string,
  solPrice: number,
): Promise<Trade> {
  try {
    // Get user's current tier and state
    const wallet = await getWalletById(walletId);
    if (!wallet) {
      throw new ApiError("Wallet not found", 404, "WALLET_NOT_FOUND");
    }

    const currentTier = wallet.current_tier || calculateTier(wallet.balance_sol);

    // Get user's losing streak
    const userState = await getUserState(userId);
    const losingStreak = userState?.current_losing_streak || 0;

    // Get goal boost (if any)
    const goalBoost = await getGoalBoost(userId);

    // Calculate cashout recommendation
    const cashoutInput = {
      tier: currentTier,
      netProfitSOL: trade.netProfit,
      roiPercent: trade.roi,
      losingStreak,
      goalBoostPercent: goalBoost,
    };

    const cashoutResult = calculateCashout(cashoutInput);

    // Create trade record with new fields
    const tradeData = {
      user_id: userId,
      trading_wallet_id: walletId,
      token_mint: trade.tokenMint,
      token_symbol: trade.tokenSymbol || null,
      total_entry_sol: trade.totalEntry,
      total_exit_sol: trade.totalExit,
      net_profit_sol: trade.netProfit,
      roi_percent: trade.roi,
      total_fees_sol: trade.totalFeesSol,
      net_profit_usd: trade.netProfitUsd,
      roi_multiplier: trade.roiMultiplier,
      tier_at_trade: currentTier,
      losing_streak_at_trade: losingStreak,
      base_cashout_percent: cashoutResult.breakdown.baseRate,
      roi_bonus_percent: cashoutResult.breakdown.roiBonus,
      streak_multiplier: cashoutResult.breakdown.streakMultiplier,
      goal_boost_multiplier: cashoutResult.breakdown.goalBoostMultiplier,
      final_cashout_percent: cashoutResult.finalCashoutPercent,
      recommended_cashout_sol: cashoutResult.cashoutAmountSOL,
      status: TradeStatus.CONFIRMED, // Auto-confirmed for now
      position_opened_at: trade.positionOpenedAt?.toISOString() || null,
      position_closed_at: trade.positionClosedAt.toISOString(),
    };

    const { data, error } = await (supabaseAdmin
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("trades") as any)
      .insert(tradeData)
      .select()
      .single();

    if (error) {
      throw new ApiError(
        `Failed to save trade: ${error.message}`,
        500,
        "DB_ERROR",
      );
    }

    return data as Trade;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      `Failed to save trade: ${error instanceof Error ? error.message : "Unknown error"}`,
      500,
      "SAVE_FAILED",
    );
  }
}

// =============================================
// UPDATE WALLET BALANCE
// =============================================

/**
 * Updates a wallet's SOL balance in the database
 *
 * @param walletId - The wallet ID to update
 * @param newBalance - The new SOL balance
 * @param solPrice - Current SOL/USD price
 * @returns The updated Wallet record
 * @throws ApiError on update failures
 */
export async function updateWalletBalance(
  walletId: string,
  newBalance: number,
  solPrice: number,
): Promise<Wallet> {
  try {
    const balanceUsd = newBalance * solPrice;

    const { data, error } = await (supabaseAdmin
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("wallets") as any)
      .update({
        balance_sol: newBalance,
        balance_usd: balanceUsd,
        updated_at: new Date().toISOString(),
      })
      .eq("id", walletId)
      .select()
      .single();

    if (error) {
      throw new ApiError(
        `Failed to update wallet balance: ${error.message}`,
        500,
        "DB_ERROR",
      );
    }

    return data as Wallet;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      `Failed to update wallet: ${error instanceof Error ? error.message : "Unknown error"}`,
      500,
      "UPDATE_FAILED",
    );
  }
}

// =============================================
// SYNC TRACKING
// =============================================

/**
 * Gets the last sync timestamp for a wallet
 * Returns null if wallet has never been synced
 *
 * @param walletAddress - The wallet address
 * @returns ISO timestamp string or null
 */
export async function getLastSyncTimestamp(
  walletAddress: string,
): Promise<string | null> {
  try {
    const { data, error } = await (supabaseAdmin
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("wallets") as any)
      .select("last_synced_at")
      .eq("address", walletAddress)
      .single();

    if (error || !data) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any).last_synced_at;
  } catch {
    return null;
  }
}

/**
 * Updates the last sync timestamp for a wallet
 *
 * @param walletId - The wallet ID
 * @param timestamp - ISO timestamp string
 * @throws ApiError on update failures
 */
async function updateLastSyncTimestamp(
  walletId: string,
  timestamp: string,
): Promise<void> {
  try {
    const { data, error } = await (supabaseAdmin
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("wallets") as any)
      .update({ last_synced_at: timestamp })
      .eq("id", walletId)
      .select();

    if (error) {
      throw new ApiError(
        `Failed to update sync timestamp: ${error.message}`,
        500,
        "DB_ERROR",
      );
    }

    // Verify that a row was actually updated
    if (!data || data.length === 0) {
      throw new ApiError(
        `Wallet not found for sync timestamp update: ${walletId}`,
        404,
        "WALLET_NOT_FOUND",
      );
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      `Failed to update sync timestamp: ${error instanceof Error ? error.message : "Unknown error"}`,
      500,
      "UPDATE_FAILED",
    );
  }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Finds an existing trade by user, token mint, and close date
 * Used for idempotency - prevents duplicate trade creation
 *
 * @param userId - The user ID
 * @param tokenMint - The token mint address
 * @param closedAt - The position close date
 * @returns Existing trade or null
 */
async function findExistingTrade(
  userId: string,
  tokenMint: string,
  closedAt: Date,
): Promise<Trade | null> {
  const { data, error } = await (supabaseAdmin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("trades") as any)
    .select("*")
    .eq("user_id", userId)
    .eq("token_mint", tokenMint)
    .eq("position_closed_at", closedAt.toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return data as Trade;
}

/**
 * Gets a wallet by address and user ID
 *
 * @param address - Wallet address
 * @param userId - User ID
 * @returns Wallet or null
 */
async function getWalletByAddress(
  address: string,
  userId: string,
): Promise<Wallet | null> {
  const { data, error } = await (supabaseAdmin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("wallets") as any)
    .select("*")
    .eq("address", address)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Wallet;
}

/**
 * Gets a wallet by ID
 *
 * @param walletId - Wallet ID
 * @returns Wallet or null
 */
async function getWalletById(walletId: string): Promise<Wallet | null> {
  const { data, error } = await (supabaseAdmin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("wallets") as any)
    .select("*")
    .eq("id", walletId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Wallet;
}

/**
 * Gets user state (losing streak, etc.)
 *
 * @param userId - User ID
 * @returns User state or null
 */
async function getUserState(
  userId: string,
): Promise<{ current_losing_streak: number } | null> {
  const { data, error } = await (supabaseAdmin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("user_state") as any)
    .select("current_losing_streak")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as { current_losing_streak: number };
}

/**
 * Gets active goal boost percentage
 *
 * @param userId - User ID
 * @returns Boost percentage or 0
 */
async function getGoalBoost(userId: string): Promise<number> {
  const { data, error } = await (supabaseAdmin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("goal_settings") as any)
    .select("boost_percent, boost_active, boost_expires_at")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return 0;
  }

  // Check if boost is active and not expired
  if (data.boost_active && data.boost_expires_at) {
    const expiresAt = new Date(data.boost_expires_at);
    if (expiresAt > new Date()) {
      return data.boost_percent || 0;
    }
  }

  return 0;
}

/**
 * Fetches both trading and vault wallet balances for a user
 *
 * @param userId - User ID
 * @returns Object with trading and vault balances
 */
async function fetchWalletBalances(userId: string): Promise<{
  trading: number;
  vault: number;
}> {
  const { data, error } = await (supabaseAdmin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("wallets") as any)
    .select("wallet_type, balance_sol")
    .eq("user_id", userId);

  if (error || !data) {
    return { trading: 0, vault: 0 };
  }

  const trading =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.find((w: any) => w.wallet_type === WalletType.TRADING)?.balance_sol ||
    0;
  const vault =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.find((w: any) => w.wallet_type === WalletType.VAULT)?.balance_sol || 0;

  return { trading, vault };
}
