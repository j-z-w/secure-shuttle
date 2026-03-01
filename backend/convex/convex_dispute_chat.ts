import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertInternalKey } from "./_internalAuth";

export const listByEscrow = query({
  args: { internal_key: v.string(), escrow_id: v.id("escrows") },
  handler: async (ctx, args) => {
    assertInternalKey(args.internal_key);
    const docs = await ctx.db
      .query("dispute_messages")
      .withIndex("by_escrow_id", (q) => q.eq("escrow_id", args.escrow_id))
      .order("asc")
      .collect();

    return await Promise.all(
      docs.map(async (doc) => {
        const attachments = await Promise.all(
          (doc.attachments ?? []).map(async (attachment) => {
            const storage_url = await ctx.storage.getUrl(attachment.storage_id as any);
            return {
              ...attachment,
              storage_url: storage_url ?? null,
            };
          })
        );

        return {
          ...doc,
          attachments,
        };
      })
    );
  },
});

export const insert = mutation({
  args: {
    internal_key: v.string(),
    escrow_id: v.id("escrows"),
    sender_user_id: v.string(),
    sender_role: v.string(),
    body: v.optional(v.string()),
    attachments: v.optional(
      v.array(
        v.object({
          storage_id: v.string(),
          file_name: v.optional(v.string()),
          content_type: v.optional(v.string()),
          size_bytes: v.optional(v.number()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    assertInternalKey(args.internal_key);
    const { internal_key: _internalKey, ...message } = args;
    const id = await ctx.db.insert("dispute_messages", {
      ...message,
      created_at: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const generateUploadUrl = mutation({
  args: { internal_key: v.string() },
  handler: async (ctx, args) => {
    assertInternalKey(args.internal_key);
    return await ctx.storage.generateUploadUrl();
  },
});
