import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const insert = mutation({
  args: {
    public_key: v.string(),
    secret_key: v.string(),
    label: v.optional(v.string()),
    recipient_address: v.optional(v.string()),
    sender_address: v.optional(v.string()),
    expected_amount_lamports: v.optional(v.number()),
    status: v.string(),
    finalize_nonce: v.number(),
    last_intent_hash: v.optional(v.string()),
    settled_signature: v.optional(v.string()),
    failure_reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("escrows", args);
    return await ctx.db.get(id);
  },
});
//glorg
export const get = query({
  args: { id: v.id("escrows") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const list = query({
  args: {
    status_filter: v.optional(v.string()),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("escrows");
    if (args.status_filter) {
      q = q.withIndex("by_status", (q) => q.eq("status", args.status_filter!));
    }
    const all = await q.collect();
    const total = all.length;
    const page = all.slice(args.offset, args.offset + args.limit);
    return { total, items: page };
  },
});

export const update = mutation({
  args: {
    id: v.id("escrows"),
    updates: v.object({
      label: v.optional(v.string()),
      recipient_address: v.optional(v.string()),
      sender_address: v.optional(v.string()),
      expected_amount_lamports: v.optional(v.number()),
      status: v.optional(v.string()),
      finalize_nonce: v.optional(v.number()),
      last_intent_hash: v.optional(v.string()),
      settled_signature: v.optional(v.string()),
      failure_reason: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.updates);
    return await ctx.db.get(args.id);
  },
});