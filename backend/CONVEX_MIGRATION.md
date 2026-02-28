# Migrating from In-Memory Store to Convex

## Overview

The backend currently uses `backend/app/store.py` as its only storage layer — a simple in-memory Python dict. **This is the only file you need to replace** to wire in Convex. Everything else (routers, schemas, Solana service) stays the same.

## Current Architecture

```
Routers (escrows.py, transactions.py)
   ↓
escrow_service.py  (business logic — calls store + solana_service)
   ↓
store.py           ← YOU REPLACE THIS
```

All data flows through `store.py` as plain Python dicts. No ORM objects, no SQL.

## Functions to Implement

Your Convex backend needs to expose these 9 functions (same signatures, same dict shapes):

### Escrow Functions

```python
# Insert a new escrow, return the full record as a dict
insert_escrow(data: dict) -> dict

# Get one escrow by its integer ID, or None
get_escrow(escrow_id: int) -> Optional[dict]

# List escrows with optional status filter + pagination
# Returns (total_count, list_of_escrow_dicts)
list_escrows(status_filter: str | None, limit: int, offset: int) -> tuple[int, list[dict]]

# Partial update — only set keys present in `updates`
update_escrow(escrow_id: int, updates: dict) -> Optional[dict]
```

### Transaction Functions

```python
# Insert a new transaction record, return full record
insert_transaction(data: dict) -> dict

# List transactions for a given escrow, sorted newest-first
list_transactions(escrow_id: int) -> list[dict]

# Find a transaction by its Solana signature string
get_transaction_by_signature(signature: str) -> Optional[dict]

# Update just the status field of a transaction (by signature)
update_transaction_status(signature: str, status: str) -> Optional[dict]

# Partial update of a transaction (by signature)
update_transaction(signature: str, updates: dict) -> Optional[dict]
```

## Data Shapes

### Escrow dict

```python
{
    "id": int,                          # Convex _id
    "public_key": str,                  # Solana pubkey (base58)
    "secret_key": str,                  # base58 secret (devnet only!)
    "label": str | None,
    "recipient_address": str | None,
    "sender_address": str | None,
    "expected_amount_lamports": int | None,
    "status": str,                      # "active" | "funded" | "released" | "cancelled" | "release_pending" | "refund_pending"
    "finalize_nonce": int,              # starts at 0, increments on each release/refund
    "last_intent_hash": str | None,     # SHA-256 for idempotency
    "settled_signature": str | None,    # tx sig of last settled operation
    "failure_reason": str | None,
    "created_at": datetime,
    "updated_at": datetime,
}
```

### Transaction dict

```python
{
    "id": int,                          # Convex _id
    "escrow_id": int,                   # FK to escrow
    "signature": str,                   # Solana tx signature (unique)
    "tx_type": str,                     # "deposit" | "release" | "refund" | "unknown"
    "amount_lamports": int | None,
    "from_address": str | None,
    "to_address": str | None,
    "status": str,                      # "pending" | "processed" | "confirmed" | "finalized" | "failed"
    "intent_hash": str | None,
    "commitment_target": str | None,
    "last_valid_block_height": int | None,
    "rpc_endpoint": str | None,
    "raw_error": str | None,
    "memo": str | None,
    "recorded_at": datetime,
}
```

## Convex Schema (suggested)

```typescript
// convex/schema.ts
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
```

## Migration Steps

1. Set up Convex in the project (`npx convex dev`)
2. Create the schema above
3. Create Convex mutations/queries that match the 9 functions
4. Replace `store.py` — either:
   - **Option A:** Call Convex HTTP API from Python (via `httpx`)
   - **Option B:** Move the entire backend to Convex functions (TypeScript) and keep Python only for the Solana signing (`solana_service.py`)
5. Test with the same API calls — the routers and response shapes don't change

## Notes

- `created_at` / `updated_at` / `recorded_at` — Convex has `_creationTime` built-in. You can use that instead of `created_at`. For `updated_at`, set it manually in your mutation.
- The `id` field maps to Convex's `_id`. You may need to adapt `escrow_service.py` to use string IDs instead of integers if using Convex IDs directly.
- `secret_key` storage: For devnet this is fine in Convex. For production, encrypt before storing.
