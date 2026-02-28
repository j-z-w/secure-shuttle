"""
In-memory data store for escrows and transactions.

This module is the only storage boundary. To migrate to Convex later,
replace this file (and, if needed, escrow_service.py) while keeping
routers and schemas stable.
"""

from datetime import datetime, timezone
from threading import Lock
from typing import Optional


_escrows: dict[int, dict] = {}
_transactions: dict[int, dict] = {}
_escrow_seq = 0
_tx_seq = 0
_lock = Lock()


def _next_escrow_id() -> int:
    global _escrow_seq
    _escrow_seq += 1
    return _escrow_seq


def _next_tx_id() -> int:
    global _tx_seq
    _tx_seq += 1
    return _tx_seq


def insert_escrow(data: dict) -> dict:
    with _lock:
        eid = _next_escrow_id()
        now = datetime.now(timezone.utc)
        record = {
            "id": eid,
            "public_key": data["public_key"],
            "secret_key": data["secret_key"],
            "label": data.get("label"),
            "recipient_address": data.get("recipient_address"),
            "sender_address": data.get("sender_address"),
            "expected_amount_lamports": data.get("expected_amount_lamports"),
            "status": "active",
            "finalize_nonce": 0,
            "last_intent_hash": None,
            "settled_signature": None,
            "failure_reason": None,
            "created_at": now,
            "updated_at": now,
        }
        _escrows[eid] = record
        return dict(record)


def get_escrow(escrow_id: int) -> Optional[dict]:
    return dict(_escrows[escrow_id]) if escrow_id in _escrows else None


def list_escrows(
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[int, list[dict]]:
    items = list(_escrows.values())
    if status_filter:
        items = [e for e in items if e["status"] == status_filter]
    total = len(items)
    items = sorted(items, key=lambda e: e["created_at"], reverse=True)
    items = items[offset : offset + limit]
    return total, [dict(e) for e in items]


def update_escrow(escrow_id: int, updates: dict) -> Optional[dict]:
    if escrow_id not in _escrows:
        return None

    with _lock:
        for k, v in updates.items():
            if v is not None:
                _escrows[escrow_id][k] = v
        _escrows[escrow_id]["updated_at"] = datetime.now(timezone.utc)
        return dict(_escrows[escrow_id])


def insert_transaction(data: dict) -> dict:
    with _lock:
        tid = _next_tx_id()
        now = datetime.now(timezone.utc)
        record = {
            "id": tid,
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
            "recorded_at": now,
        }
        _transactions[tid] = record
        return dict(record)


def list_transactions(escrow_id: int) -> list[dict]:
    items = [t for t in _transactions.values() if t["escrow_id"] == escrow_id]
    items = sorted(items, key=lambda t: t["recorded_at"], reverse=True)
    return [dict(t) for t in items]


def get_transaction_by_signature(signature: str) -> Optional[dict]:
    for t in _transactions.values():
        if t["signature"] == signature:
            return dict(t)
    return None


def update_transaction_status(signature: str, status: str) -> Optional[dict]:
    return update_transaction(signature, {"status": status})


def update_transaction(signature: str, updates: dict) -> Optional[dict]:
    with _lock:
        for t in _transactions.values():
            if t["signature"] == signature:
                for k, v in updates.items():
                    if v is not None:
                        t[k] = v
                return dict(t)
    return None
