// convex/trades.ts
import { query, mutation, internalMutation } from "./_generated/server";
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

/**
 * Confirms a cashout after the user has manually transferred SOL to their vault.
 * Patches trade.status to "confirmed" and updates wallet balances optimistically.
 *
 * Security mitigations:
 * - T-03-01 (IDOR): verifies trade.userId === identity.subject before patching
 * - T-03-02 (Replay): rejects if trade.status === "confirmed" already
 * - T-03-03 (Overextraction): validates 0 < actualCashoutSol <= recommendedCashoutSol
 * - T-03-04 (Price manipulation): does NOT update balanceUsd from client price;
 *   balanceUsd is reconciled on next sync via Helius (display-only impact).
 */
export const confirmCashout = mutation({
  args: {
    tradeId: v.id("trades"),
    actualCashoutSol: v.number(),
  },
  handler: async (ctx, args) => {
    // T-03-01: Auth check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // T-03-01: Ownership check (prevent cross-user IDOR)
    const trade = await ctx.db.get(args.tradeId);
    if (!trade || trade.userId !== identity.subject) {
      throw new Error("Trade not found");
    }

    // T-03-02: Replay protection (prevent double-confirm or actioning overridden trades)
    if (trade.status !== "pending") {
      throw new Error("Trade is not in a pending state");
    }

    // T-03-03: Input bounds (prevent overextraction via inflated client value)
    if (args.actualCashoutSol <= 0) {
      throw new Error("Cashout amount must be positive");
    }
    if (args.actualCashoutSol > trade.recommendedCashoutSol) {
      throw new Error("Cashout amount exceeds recommended amount");
    }

    // Patch trade to confirmed
    await ctx.db.patch(args.tradeId, {
      status: "confirmed",
      actualCashoutSol: args.actualCashoutSol,
    });

    // Update trading wallet balance (subtract; floor at 0)
    const tradingWallet = await ctx.db.get(trade.tradingWalletId);
    if (tradingWallet) {
      await ctx.db.patch(tradingWallet._id, {
        balanceSol: Math.max(0, tradingWallet.balanceSol - args.actualCashoutSol),
      });
    }

    // Update vault wallet balance (add) — use compound index, not .filter()
    const vaultWallet = await ctx.db
      .query("wallets")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", identity.subject).eq("walletType", "vault")
      )
      .first();
    if (vaultWallet) {
      await ctx.db.patch(vaultWallet._id, {
        balanceSol: vaultWallet.balanceSol + args.actualCashoutSol,
      });
    }
  },
});
