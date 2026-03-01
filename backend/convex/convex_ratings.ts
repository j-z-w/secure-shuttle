import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertInternalKey } from "./_internalAuth";

export const listByEscrow = query({
  args: { internal_key: v.string(), escrow_id: v.id("escrows") },
  handler: async (ctx, args) => {
    assertInternalKey(args.internal_key);
    const rows = await ctx.db
      .query("escrow_ratings")
      .withIndex("by_escrow_id", (q) => q.eq("escrow_id", args.escrow_id))
      .collect();
    rows.sort((a, b) => (b.updated_at ?? b._creationTime) - (a.updated_at ?? a._creationTime));
    return rows;
  },
});

export const getByEscrowAndUsers = query({
  args: {
    internal_key: v.string(),
    escrow_id: v.id("escrows"),
    from_user_id: v.string(),
    to_user_id: v.string(),
  },
  handler: async (ctx, args) => {
    assertInternalKey(args.internal_key);
    return await ctx.db
      .query("escrow_ratings")
      .withIndex("by_escrow_from_to", (q) =>
        q
          .eq("escrow_id", args.escrow_id)
          .eq("from_user_id", args.from_user_id)
          .eq("to_user_id", args.to_user_id)
      )
      .first();
  },
});

export const upsert = mutation({
  args: {
    internal_key: v.string(),
    escrow_id: v.id("escrows"),
    from_user_id: v.string(),
    to_user_id: v.string(),
    score: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertInternalKey(args.internal_key);
    const now = Date.now();
    const existing = await ctx.db
      .query("escrow_ratings")
      .withIndex("by_escrow_from_to", (q) =>
        q
          .eq("escrow_id", args.escrow_id)
          .eq("from_user_id", args.from_user_id)
          .eq("to_user_id", args.to_user_id)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        score: args.score,
        comment: args.comment,
        updated_at: now,
      });
      return await ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("escrow_ratings", {
      escrow_id: args.escrow_id,
      from_user_id: args.from_user_id,
      to_user_id: args.to_user_id,
      score: args.score,
      comment: args.comment,
      created_at: now,
      updated_at: now,
    });
    return await ctx.db.get(id);
  },
});
