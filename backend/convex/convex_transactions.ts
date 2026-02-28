import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const insert = mutation({
  args: {
    escrow_id: v.id("escrows"),
    signature: v.string(),
    tx_type: v.string(),
    amount_lamports: v.optional(v.number()),
    from_address: v.optional(v.string()),
    to_address: v.optional(v.string()),
    status: v.string(),
    intent_hash: v.optional(v.string()),
    commitment_target: v.optional(v.string()),
    last_valid_block_height: v.optional(v.number()),
    rpc_endpoint: v.optional(v.string()),
    raw_error: v.optional(v.string()),
    memo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("transactions", args);
    return await ctx.db.get(id);
  },
});

export const listByEscrow = query({
  args: { escrow_id: v.id("escrows") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_escrow_id", (q) => q.eq("escrow_id", args.escrow_id))
      .order("desc")
      .collect();
  },
});

export const getBySignature = query({
  args: { signature: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_signature", (q) => q.eq("signature", args.signature))
      .first();
  },
});

export const updateStatus = mutation({
  args: { signature: v.string(), status: v.string() },
  handler: async (ctx, args) => {
    const tx = await ctx.db
      .query("transactions")
      .withIndex("by_signature", (q) => q.eq("signature", args.signature))
      .first();
    if (!tx) return null;
    await ctx.db.patch(tx._id, { status: args.status });
    return await ctx.db.get(tx._id);
  },
});

export const update = mutation({
  args: {
    signature: v.string(),
    updates: v.object({
      tx_type: v.optional(v.string()),
      amount_lamports: v.optional(v.number()),
      from_address: v.optional(v.string()),
      to_address: v.optional(v.string()),
      status: v.optional(v.string()),
      intent_hash: v.optional(v.string()),
      commitment_target: v.optional(v.string()),
      last_valid_block_height: v.optional(v.number()),
      rpc_endpoint: v.optional(v.string()),
      raw_error: v.optional(v.string()),
      memo: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const tx = await ctx.db
      .query("transactions")
      .withIndex("by_signature", (q) => q.eq("signature", args.signature))
      .first();
    if (!tx) return null;
    await ctx.db.patch(tx._id, args.updates);
    return await ctx.db.get(tx._id);
  },
});