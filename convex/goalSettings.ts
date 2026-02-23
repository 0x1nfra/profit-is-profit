// convex/goalSettings.ts
import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getGoalSettings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("goalSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
  },
});

export const getGoalSettingsInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("goalSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const initializeGoalSettings = mutation({
  args: { monthlyGoalUsd: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("goalSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (existing) return existing;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const id = await ctx.db.insert("goalSettings", {
      userId: identity.subject,
      monthlyGoalUsd: args.monthlyGoalUsd ?? 400,
      currentMonthProgressUsd: 0,
      currentMonth,
      boostActive: false,
      boostPercent: 0,
    });
    return await ctx.db.get(id);
  },
});
