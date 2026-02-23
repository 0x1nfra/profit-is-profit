// convex/userState.ts
import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getUserState = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("userState")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
  },
});

export const getUserStateInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userState")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const getOrCreateUserState = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userState")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (existing) return existing;

    const id = await ctx.db.insert("userState", {
      userId: identity.subject,
      currentLosingStreak: 0,
    });
    return await ctx.db.get(id);
  },
});
