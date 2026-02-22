// convex/schema.ts
// Source: https://docs.convex.dev/database/schemas
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  wallets: defineTable({
    userId: v.string(),              // Convex tokenIdentifier (wallet public key from JWT sub)
    walletType: v.union(v.literal("trading"), v.literal("vault")),
    address: v.string(),
    balanceSol: v.number(),
    balanceUsd: v.number(),
    currentTier: v.optional(v.number()),
    lastSyncedAt: v.optional(v.string()),  // ISO timestamp
  })
    .index("by_user", ["userId"])
    .index("by_address", ["address"])
    .index("by_user_type", ["userId", "walletType"]),

  trades: defineTable({
    userId: v.string(),
    tradingWalletId: v.id("wallets"),
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
    actualCashoutSol: v.optional(v.number()),
    positionOpenedAt: v.optional(v.string()),  // ISO timestamp
    positionClosedAt: v.string(),               // ISO timestamp
  })
    .index("by_user", ["userId"])
    .index("by_user_token", ["userId", "tokenMint"])
    .index("by_wallet", ["tradingWalletId"]),

  userState: defineTable({
    userId: v.string(),
    currentLosingStreak: v.number(),
    lastTradeAt: v.optional(v.string()),  // ISO timestamp
  })
    .index("by_user", ["userId"]),

  goalSettings: defineTable({
    userId: v.string(),
    monthlyGoalUsd: v.number(),
    currentMonthProgressUsd: v.number(),
    currentMonth: v.string(),  // "YYYY-MM" format
    boostActive: v.boolean(),
    boostPercent: v.number(),
    boostActivatedAt: v.optional(v.string()),
    boostExpiresAt: v.optional(v.string()),
    lastSundayCheck: v.optional(v.string()),
  })
    .index("by_user", ["userId"]),
});
