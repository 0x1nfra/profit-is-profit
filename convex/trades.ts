// convex/trades.ts
import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getUserTrades = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("trades")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const saveSyncedTrades = internalMutation({
  args: {
    userId: v.string(),
    tradingWalletId: v.id("wallets"),
    trades: v.array(
      v.object({
        tokenMint: v.string(),
        tokenSymbol: v.optional(v.string()),
        totalEntrySol: v.number(),
        totalExitSol: v.number(),
        netProfitSol: v.number(),
        roiPercent: v.number(),
        totalFeesSol: v.number(),
        netProfitUsd: v.optional(v.number()),
        roiMultiplier: v.optional(v.number()),
        tierAtTrade: v.number(),
        losingStreakAtTrade: v.number(),
        baseCashoutPercent: v.number(),
        roiBonusPercent: v.number(),
        streakMultiplier: v.number(),
        goalBoostMultiplier: v.number(),
        finalCashoutPercent: v.number(),
        recommendedCashoutSol: v.number(),
        status: v.union(
          v.literal("pending"),
          v.literal("confirmed"),
          v.literal("overridden")
        ),
        positionOpenedAt: v.optional(v.string()),
        positionClosedAt: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const trade of args.trades) {
      // Idempotency: skip if already exists (same user + token + close date)
      const existing = await ctx.db
        .query("trades")
        .withIndex("by_user_token", (q) =>
          q.eq("userId", args.userId).eq("tokenMint", trade.tokenMint)
        )
        .filter((q) =>
          q.eq(q.field("positionClosedAt"), trade.positionClosedAt)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("trades", {
          userId: args.userId,
          tradingWalletId: args.tradingWalletId,
          ...trade,
        });
      }
    }
  },
});
