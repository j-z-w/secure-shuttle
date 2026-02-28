"""
Convex-backed data store for escrows and transactions.
Replaces the in-memory store with Convex HTTP API calls.
"""

import os
from datetime import datetime, timezone
from typing import Optional

import httpx
from dotenv import load_dotenv

load_dotenv(".env.local")

CONVEX_URL = os.getenv("NEXT_PUBLIC_CONVEX_URL")
if not CONVEX_URL:
    raise RuntimeError("NEXT_PUBLIC_CONVEX_URL not set")

CONVEX_API = CONVEX_URL.rstrip("/")


def _query(function: str, args: dict = {}):
    r = httpx.post(
        f"{CONVEX_API}/api/query",
        json={"path": function, "args": args},
    )
    r.raise_for_status()
    data = r.json()
    if data.get("status") != "success":
        raise RuntimeError(f"Convex query error: {data}")
    return data["value"]


def _mutation(function: str, args: dict = {}):
    r = httpx.post(
        f"{CONVEX_API}/api/mutation",
        json={"path": function, "args": args},
    )
    r.raise_for_status()
    data = r.json()
    if data.get("status") != "success":
        raise RuntimeError(f"Convex mutation error: {data}")
    return data["value"]


def _to_datetime(ts) -> datetime:
    """Convert Convex _creationTime (ms timestamp) to datetime."""
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts / 1000, tz=timezone.utc)
    return datetime.now(timezone.utc)


def _format_escrow(doc: dict) -> dict:
    if doc is None:
        return None
    return {
        "id": doc["_id"],
        "public_key": doc["public_key"],
        "secret_key": doc["secret_key"],
        "label": doc.get("label"),
        "recipient_address": doc.get("recipient_address"),
        "sender_address": doc.get("sender_address"),
        "expected_amount_lamports": doc.get("expected_amount_lamports"),
        "status": doc["status"],
        "finalize_nonce": doc["finalize_nonce"],
        "last_intent_hash": doc.get("last_intent_hash"),
        "settled_signature": doc.get("settled_signature"),
        "failure_reason": doc.get("failure_reason"),
        "created_at": _to_datetime(doc.get("_creationTime")),
        "updated_at": _to_datetime(doc.get("updated_at") or doc.get("_creationTime")),
    }


def _format_transaction(doc: dict) -> dict:
    if doc is None:
        return None
    return {
        "id": doc["_id"],
        "escrow_id": doc["escrow_id"],
        "signature": doc["signature"],
        "tx_type": doc["tx_type"],
        "amount_lamports": doc.get("amount_lamports"),
        "from_address": doc.get("from_address"),
        "to_address": doc.get("to_address"),
        "status": doc["status"],
        "intent_hash": doc.get("intent_hash"),
        "commitment_target": doc.get("commitment_target"),
        "last_valid_block_height": doc.get("last_valid_block_height"),
        "rpc_endpoint": doc.get("rpc_endpoint"),
        "raw_error": doc.get("raw_error"),
        "memo": doc.get("memo"),
        "recorded_at": _to_datetime(doc.get("_creationTime")),
    }


# ── Escrow functions ──────────────────────────────────────────────────────────

def insert_escrow(data: dict) -> dict:
    doc = _mutation("escrows:insert", {
        "public_key": data["public_key"],
        "secret_key": data["secret_key"],
        "label": data.get("label"),
        "recipient_address": data.get("recipient_address"),
        "sender_address": data.get("sender_address"),
        "expected_amount_lamports": data.get("expected_amount_lamports"),
        "status": "active",
        "finalize_nonce": 0,
    })
    return _format_escrow(doc)


def get_escrow(escrow_id: str) -> Optional[dict]:
    doc = _query("escrows:get", {"id": escrow_id})
    return _format_escrow(doc) if doc else None


def list_escrows(
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[int, list[dict]]:
    result = _query("escrows:list", {
        "status_filter": status_filter,
        "limit": limit,
        "offset": offset,
    })
    return result["total"], [_format_escrow(e) for e in result["items"]]


def update_escrow(escrow_id: str, updates: dict) -> Optional[dict]:
    clean = {k: v for k, v in updates.items() if v is not None}
    doc = _mutation("escrows:update", {"id": escrow_id, "updates": clean})
    return _format_escrow(doc) if doc else None


# ── Transaction functions ─────────────────────────────────────────────────────

def insert_transaction(data: dict) -> dict:
    doc = _mutation("transactions:insert", {
        "escrow_id": data["escrow_id"],
        "signature": data["signature"],
        "tx_type": data["tx_type"],
        "amount_lamports": data.get("amount_lamports"),
        "from_address": data.get("from_address"),
        "to_address": data.get("to_address"),
        "status": data.get("status", "pending"),
        "intent_hash": data.get("intent_hash"),
        "commitment_target": data.get("commitment_target"),
        "last_valid_block_height": data.get("last_valid_block_height"),
        "rpc_endpoint": data.get("rpc_endpoint"),
        "raw_error": data.get("raw_error"),
        "memo": data.get("memo"),
    })
    return _format_transaction(doc)


def list_transactions(escrow_id: str) -> list[dict]:
    docs = _query("transactions:listByEscrow", {"escrow_id": escrow_id})
    return [_format_transaction(t) for t in docs]


def get_transaction_by_signature(signature: str) -> Optional[dict]:
    doc = _query("transactions:getBySignature", {"signature": signature})
    return _format_transaction(doc) if doc else None


def update_transaction_status(signature: str, status: str) -> Optional[dict]:
    doc = _mutation("transactions:updateStatus", {
        "signature": signature,
        "status": status,
    })
    return _format_transaction(doc) if doc else None


def update_transaction(signature: str, updates: dict) -> Optional[dict]:
    clean = {k: v for k, v in updates.items() if v is not None}
    doc = _mutation("transactions:update", {
        "signature": signature,
        "updates": clean,
    })
    return _format_transaction(doc) if doc else None