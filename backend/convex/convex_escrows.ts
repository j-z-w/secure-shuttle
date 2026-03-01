import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertInternalKey } from "./_internalAuth";

export const insert = mutation({
  args: {
    internal_key: v.string(),
    public_id: v.string(),
    public_key: v.string(),
    secret_key: v.string(),
    label: v.optional(v.string()),
    recipient_address: v.optional(v.string()),
    sender_address: v.optional(v.string()),
    expected_amount_lamports: v.optional(v.number()),
    status: v.string(),
    creator_user_id: v.string(),
    payer_user_id: v.optional(v.string()),
    payee_user_id: v.optional(v.string()),
    join_token_hash: v.optional(v.string()),
    join_expires_at: v.optional(v.number()),
    finalize_nonce: v.number(),
    version: v.number(),
    last_intent_hash: v.optional(v.string()),
    settled_signature: v.optional(v.string()),
    failure_reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertInternalKey(args.internal_key);
    const { internal_key: _internalKey, ...escrow } = args;
    const now = Date.now();
    const id = await ctx.db.insert("escrows", { ...escrow, updated_at: now });
    return await ctx.db.get(id);
  },
});

export const get = query({
  args: { internal_key: v.string(), id: v.id("escrows") },
  handler: async (ctx, args) => {
    assertInternalKey(args.internal_key);
    return await ctx.db.get(args.id);
  },
});

export const getByPublicId = query({
  args: { internal_key: v.string(), public_id: v.string() },
  handler: async (ctx, args) => {
    assertInternalKey(args.internal_key);
    return await ctx.db
      .query("escrows")
      .withIndex("by_public_id", (q) => q.eq("public_id", args.public_id))
      .first();
  },
});

export const getByInviteHash = query({
  args: { internal_key: v.string(), invite_token_hash: v.string() },
  handler: async (ctx, args) => {
    assertInternalKey(args.internal_key);
    return await ctx.db
      .query("escrows")
      .withIndex("by_invite_token_hash", (q) =>
        q.eq("invite_token_hash", args.invite_token_hash)
      )
      .first();
  },
});

export const list = query({
  args: {
    internal_key: v.string(),
    status_filter: v.optional(v.string()),
    limit: v.number(),
    offset: v.number(),
    actor_user_id: v.optional(v.string()),
    mine_only: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    assertInternalKey(args.internal_key);
    let results;

    if (args.mine_only && args.actor_user_id) {
      const actor = args.actor_user_id;
      const [created, paying, payee] = await Promise.all([
        ctx.db
          .query("escrows")
          .withIndex("by_creator", (q) => q.eq("creator_user_id", actor))
          .collect(),
        ctx.db
          .query("escrows")
          .withIndex("by_payer", (q) => q.eq("payer_user_id", actor))
          .collect(),
        ctx.db
          .query("escrows")
          .withIndex("by_payee", (q) => q.eq("payee_user_id", actor))
          .collect(),
      ]);

      const merged = [...created, ...paying, ...payee];
      const deduped = new Map(merged.map((e) => [e._id, e]));
      results = Array.from(deduped.values());
      if (args.status_filter) {
        results = results.filter((e) => e.status === args.status_filter);
      }
      results.sort(
        (a, b) =>
          (b.updated_at ?? b._creationTime) - (a.updated_at ?? a._creationTime)
      );
    } else if (args.status_filter) {
      results = await ctx.db
        .query("escrows")
        .withIndex("by_status", (q) => q.eq("status", args.status_filter!))
        .collect();
    } else {
      results = await ctx.db.query("escrows").collect();
    }

    const total = results.length;
    const page = results.slice(args.offset, args.offset + args.limit);
    return { total, items: page };
  },
});

export const update = mutation({
  args: {
    internal_key: v.string(),
    id: v.id("escrows"),
    updates: v.object({
      label: v.optional(v.string()),
      recipient_address: v.optional(v.string()),
      sender_address: v.optional(v.string()),
      expected_amount_lamports: v.optional(v.number()),
      status: v.optional(v.string()),
      creator_user_id: v.optional(v.string()),
      payer_user_id: v.optional(v.string()),
      payee_user_id: v.optional(v.string()),
      sender_claimed_at: v.optional(v.number()),
      recipient_claimed_at: v.optional(v.number()),
      join_token_hash: v.optional(v.string()),
      join_expires_at: v.optional(v.number()),
      invite_token_hash: v.optional(v.string()),
      invite_expires_at: v.optional(v.number()),
      invite_used_at: v.optional(v.number()),
      accepted_at: v.optional(v.number()),
      funded_at: v.optional(v.number()),
      service_marked_complete_at: v.optional(v.number()),
      disputed_at: v.optional(v.number()),
      dispute_reason: v.optional(v.string()),
      finalize_nonce: v.optional(v.number()),
      last_intent_hash: v.optional(v.string()),
      settled_signature: v.optional(v.string()),
      failure_reason: v.optional(v.string()),
      version: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    assertInternalKey(args.internal_key);
    const now = Date.now();
    await ctx.db.patch(args.id, { ...args.updates, updated_at: now });
    return await ctx.db.get(args.id);
  },
});
