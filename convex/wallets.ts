// convex/wallets.ts
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getUserWallets = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const getWalletByAddress = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("wallets")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();
  },
});

export const createWallets = mutation({
  args: {
    tradingWallet: v.string(),
    vaultWallet: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject; // wallet public key

    // Check for existing wallets for this user
    const existing = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existing.length > 0) {
      // Upsert: update existing wallet addresses
      for (const wallet of existing) {
        const newAddress =
          wallet.walletType === "trading"
            ? args.tradingWallet
            : args.vaultWallet;
        await ctx.db.patch(wallet._id, { address: newAddress });
      }

      // If somehow only one wallet exists, insert the missing type
      const hasTrading = existing.some((w) => w.walletType === "trading");
      const hasVault = existing.some((w) => w.walletType === "vault");

      if (!hasTrading) {
        await ctx.db.insert("wallets", {
          userId,
          walletType: "trading",
          address: args.tradingWallet,
          balanceSol: 0,
          balanceUsd: 0,
        });
      }
      if (!hasVault) {
        await ctx.db.insert("wallets", {
          userId,
          walletType: "vault",
          address: args.vaultWallet,
          balanceSol: 0,
          balanceUsd: 0,
        });
      }
    } else {
      // New user: insert both wallet records
      await ctx.db.insert("wallets", {
        userId,
        walletType: "trading",
        address: args.tradingWallet,
        balanceSol: 0,
        balanceUsd: 0,
      });
      await ctx.db.insert("wallets", {
        userId,
        walletType: "vault",
        address: args.vaultWallet,
        balanceSol: 0,
        balanceUsd: 0,
      });
    }
  },
});

export const getWalletByAddressInternal = internalQuery({
  args: { address: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wallets")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
  },
});

export const updateWalletBalance = internalMutation({
  args: {
    walletId: v.id("wallets"),
    balanceSol: v.number(),
    balanceUsd: v.number(),
    lastSyncedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.walletId, {
      balanceSol: args.balanceSol,
      balanceUsd: args.balanceUsd,
      ...(args.lastSyncedAt ? { lastSyncedAt: args.lastSyncedAt } : {}),
    });
  },
});
