import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  user_profiles: defineTable({
    user_id: v.string(),
    wallet_address: v.optional(v.string()),
    created_at: v.optional(v.number()),
    updated_at: v.optional(v.number()),
  }).index("by_user_id", ["user_id"]),

  escrows: defineTable({
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
    finalize_nonce: v.number(),
    last_intent_hash: v.optional(v.string()),
    settled_signature: v.optional(v.string()),
    failure_reason: v.optional(v.string()),
    version: v.number(),
    updated_at: v.optional(v.number()),
  })
    .index("by_public_key", ["public_key"])
    .index("by_public_id", ["public_id"])
    .index("by_status", ["status"])
    .index("by_creator", ["creator_user_id"])
    .index("by_payer", ["payer_user_id"])
    .index("by_payee", ["payee_user_id"])
    .index("by_invite_token_hash", ["invite_token_hash"]),

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
