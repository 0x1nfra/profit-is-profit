"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { CashoutResult } from "../src/lib/helpers/cashout-helpers";
import {
  getSolBalance,
  getSwapHistory,
  backfillSwapHistory,
  getTokenBalances,
} from "../src/lib/helius-client";
import { parseTrades, updatePositionClosureStatus } from "../src/lib/trade-parser";
import { isValidSolanaAddress } from "../src/lib/helpers/helius-helpers";
import { calculateTier } from "../src/lib/tier-calculator";
import { calculateCashout } from "../src/lib/cashout-calculator";
import { getSolUsdPrice } from "../src/lib/services/price-service";

type SyncResult = {
  success: boolean;
  newTradesCount: number;
  totalProfitSol: number;
};

type TradeRecord = {
  tokenMint: string;
  tokenSymbol: string | undefined;
  totalEntrySol: number;
  totalExitSol: number;
  netProfitSol: number;
  roiPercent: number;
  totalFeesSol: number;
  netProfitUsd: number;
  roiMultiplier: number | undefined;
  tierAtTrade: number;
  losingStreakAtTrade: number;
  baseCashoutPercent: number;
  roiBonusPercent: number;
  streakMultiplier: number;
  goalBoostMultiplier: number;
  finalCashoutPercent: number;
  recommendedCashoutSol: number;
  status: "confirmed";
  positionOpenedAt: string | undefined;
  positionClosedAt: string;
};

export const syncWalletTrades = action({
  args: { walletAddress: v.string() },
  returns: v.object({
    success: v.boolean(),
    newTradesCount: v.number(),
    totalProfitSol: v.number(),
  }),
  handler: async (ctx, args): Promise<SyncResult> => {
    // Auth check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId: string = identity.subject;

    // Validate address
    if (!isValidSolanaAddress(args.walletAddress)) {
      throw new Error("Invalid wallet address");
    }

    // Get wallet record from Convex
    const wallet = await ctx.runQuery(internal.wallets.getWalletByAddressInternal, {
      address: args.walletAddress,
      userId,
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    // Determine backfill vs incremental
    const lastSync: string | null = wallet.lastSyncedAt || null;
    const lastSyncTimestamp: number | null = lastSync
      ? new Date(lastSync).getTime() / 1000
      : null;

    // Fetch swaps from Helius
    let allSwaps;
    if (!lastSync) {
      allSwaps = await backfillSwapHistory(args.walletAddress, 500);
    } else {
      allSwaps = await getSwapHistory(args.walletAddress);
      if (lastSyncTimestamp) {
        allSwaps = allSwaps.filter((tx) => tx.timestamp > lastSyncTimestamp);
      }
    }

    // Get SOL/USD price
    const solPrice: number = await getSolUsdPrice();
    const syncTimestamp: string = new Date().toISOString();

    if (allSwaps.length === 0) {
      // Update balance and sync timestamp even with no new swaps
      const solBalance: number = await getSolBalance(args.walletAddress);
      await ctx.runMutation(internal.wallets.updateWalletBalance, {
        walletId: wallet._id,
        balanceSol: solBalance,
        balanceUsd: solBalance * solPrice,
        lastSyncedAt: syncTimestamp,
      });
      return { success: true, newTradesCount: 0, totalProfitSol: 0 };
    }

    // Parse transactions into trades
    const parsedTrades = parseTrades(allSwaps, args.walletAddress);

    // Detect position closures via live token balances
    const currentBalances = await getTokenBalances(args.walletAddress);
    const aggregated = parsedTrades.map((trade) => ({
      tokenMint: trade.tokenMint,
      tokenSymbol: trade.tokenSymbol,
      totalEntrySol: trade.totalEntry,
      totalExitSol: trade.totalExit,
      netProfitSol: trade.netProfit,
      roi: trade.roi,
      totalFeesSol: trade.totalFeesSol,
      transactions: allSwaps.filter(
        (tx) =>
          tx.events?.swap?.tokenInputs?.some((t) => t.mint === trade.tokenMint) ||
          tx.events?.swap?.tokenOutputs?.some((t) => t.mint === trade.tokenMint)
      ),
      positionClosed: trade.positionClosed,
      firstTransactionAt: trade.positionOpenedAt || trade.positionClosedAt,
      lastTransactionAt: trade.positionClosedAt,
    }));

    const tradesWithStatus = updatePositionClosureStatus(aggregated, currentBalances);

    const closedTrades = parsedTrades.filter((parsed) => {
      const agg = tradesWithStatus.find((t) => t.tokenMint === parsed.tokenMint);
      return agg?.positionClosed;
    });

    // Get user context for cashout calculations
    const userState = await ctx.runQuery(internal.userState.getUserStateInternal, { userId });
    const goalSettings = await ctx.runQuery(internal.goalSettings.getGoalSettingsInternal, { userId });
    const losingStreak: number = userState?.currentLosingStreak ?? 0;
    const goalBoost: number = (() => {
      if (!goalSettings?.boostActive || !goalSettings?.boostExpiresAt) return 0;
      return new Date(goalSettings.boostExpiresAt) > new Date()
        ? goalSettings.boostPercent
        : 0;
    })();

    // Build trade records with cashout calculations
    const currentTier = calculateTier(wallet.balanceSol);
    const tradesToSave: TradeRecord[] = closedTrades.map((parsed) => {
      let cashoutResult: CashoutResult | null = null;
      if (parsed.netProfit > 0) {
        cashoutResult = calculateCashout({
          tier: currentTier,
          netProfitSOL: parsed.netProfit,
          roiPercent: parsed.roi,
          losingStreak,
          goalBoostPercent: goalBoost || undefined,
        });
      }

      return {
        tokenMint: parsed.tokenMint,
        tokenSymbol: parsed.tokenSymbol ?? undefined,
        totalEntrySol: parsed.totalEntry,
        totalExitSol: parsed.totalExit,
        netProfitSol: parsed.netProfit,
        roiPercent: parsed.roi,
        totalFeesSol: parsed.totalFeesSol,
        netProfitUsd: parsed.netProfit * solPrice,
        roiMultiplier: parsed.roiMultiplier ?? undefined,
        tierAtTrade: currentTier,
        losingStreakAtTrade: losingStreak,
        baseCashoutPercent: cashoutResult?.breakdown.baseRate ?? 0,
        roiBonusPercent: cashoutResult?.breakdown.roiBonus ?? 0,
        streakMultiplier: cashoutResult?.breakdown.streakMultiplier ?? 1,
        goalBoostMultiplier: cashoutResult?.breakdown.goalBoostMultiplier ?? 1,
        finalCashoutPercent: cashoutResult?.finalCashoutPercent ?? 0,
        recommendedCashoutSol: cashoutResult?.cashoutAmountSOL ?? 0,
        status: "confirmed" as const,
        positionOpenedAt: parsed.positionOpenedAt?.toISOString() ?? undefined,
        positionClosedAt: parsed.positionClosedAt.toISOString(),
      };
    });

    // Save trades atomically via internalMutation
    await ctx.runMutation(internal.trades.saveSyncedTrades, {
      userId,
      tradingWalletId: wallet._id,
      trades: tradesToSave,
    });

    // Update wallet balance and sync timestamp
    const solBalance: number = await getSolBalance(args.walletAddress);
    await ctx.runMutation(internal.wallets.updateWalletBalance, {
      walletId: wallet._id,
      balanceSol: solBalance,
      balanceUsd: solBalance * solPrice,
      lastSyncedAt: syncTimestamp,
    });

    const totalProfitSol: number = tradesToSave.reduce(
      (sum: number, t: TradeRecord) => sum + t.netProfitSol,
      0
    );

    return {
      success: true,
      newTradesCount: tradesToSave.length,
      totalProfitSol,
    };
  },
});
