// convex/userState.ts
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
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

/**
 * Updates the user's losing streak. Called from sync action after processing trades.
 * Upserts userState row if it doesn't exist (matches getOrCreateUserState pattern).
 *
 * NOT public — only callable from server-side actions/mutations via internal.* api.
 * No auth check needed: caller must already have validated identity.
 */
export const updateLosingStreak = internalMutation({
  args: { userId: v.string(), newStreak: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userState")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { currentLosingStreak: args.newStreak });
    } else {
      await ctx.db.insert("userState", {
        userId: args.userId,
        currentLosingStreak: args.newStreak,
      });
    }
  },
});
