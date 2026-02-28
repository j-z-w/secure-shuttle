import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  escrows: defineTable({
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
  })
    .index("by_public_key", ["public_key"])
    .index("by_status", ["status"]),

  transactions: defineTable({
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
  })
    .index("by_escrow_id", ["escrow_id"])
    .index("by_signature", ["signature"])
    .index("by_intent_hash", ["intent_hash"]),
});