"""
Convex-backed data store for escrows and transactions.
Replaces the in-memory store with Convex HTTP API calls.
"""

import base64
import json
import os
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv

from app.config import settings

_BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(_BACKEND_DIR / ".env")
load_dotenv(_BACKEND_DIR / ".env.local")

CONVEX_URL = os.getenv("NEXT_PUBLIC_CONVEX_URL") or os.getenv("CONVEX_URL")
if not CONVEX_URL:
    raise RuntimeError("Set NEXT_PUBLIC_CONVEX_URL or CONVEX_URL in backend/.env.local")

CONVEX_API = CONVEX_URL.rstrip("/")
CONVEX_INTERNAL_API_KEY = (settings.convex_internal_api_key or "").strip()
if not CONVEX_INTERNAL_API_KEY:
    raise RuntimeError("Set CONVEX_INTERNAL_API_KEY in backend/.env.local")
_ESCROW_META_PREFIX = "__ssmeta_v1__:"
_ESCROW_INSERT_FIELDS = {
    "public_key",
    "secret_key",
    "label",
    "recipient_address",
    "sender_address",
    "expected_amount_lamports",
    "status",
    "finalize_nonce",
    "last_intent_hash",
    "settled_signature",
    "failure_reason",
}
_ESCROW_UPDATE_FIELDS = {
    "label",
    "recipient_address",
    "sender_address",
    "expected_amount_lamports",
    "status",
    "finalize_nonce",
    "last_intent_hash",
    "settled_signature",
    "failure_reason",
}
_ESCROW_META_FIELDS = {
    "public_id",
    "creator_user_id",
    "payer_user_id",
    "payee_user_id",
    "sender_claimed_at",
    "recipient_claimed_at",
    "join_token_hash",
    "join_expires_at",
    "invite_token_hash",
    "invite_expires_at",
    "invite_used_at",
    "accepted_at",
    "funded_at",
    "service_marked_complete_at",
    "disputed_at",
    "dispute_reason",
    "version",
}

_HTTP_TIMEOUT = httpx.Timeout(timeout=10.0, connect=3.0)
_HTTP_CLIENT = httpx.Client(timeout=_HTTP_TIMEOUT)


def _clean_args(args: Optional[dict]) -> dict:
    if not args:
        return {}
    return {k: v for k, v in args.items() if v is not None}


def _convex_error_message(kind: str, function: str, data: dict) -> str:
    base = f"Convex {kind} error in {function}: {data}"
    error_message = str(data.get("errorMessage", ""))
    mismatch_markers = (
        "Could not find public function",
        "ArgumentValidationError",
        "Object contains extra field",
        "Value does not match validator",
    )
    if any(marker in error_message for marker in mismatch_markers):
        return (
            f"{base}\nDeployment/function mismatch detected. "
            "Run `npx convex dev` or `npx convex deploy` for this project and ensure "
            "the backend env points to that deployment URL."
        )
    return base


def _is_missing_function_error(exc: Exception) -> bool:
    text = str(exc)
    return (
        "Could not find public function" in text
        or "is not a public function" in text
    )


def _encode_escrow_label(label: Optional[str], meta: dict) -> str:
    compact_meta = {k: v for k, v in meta.items() if v is not None}
    payload = {"label": label, "meta": compact_meta}
    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=True)
    token = base64.urlsafe_b64encode(raw.encode("utf-8")).decode("ascii").rstrip("=")
    return f"{_ESCROW_META_PREFIX}{token}"


def _decode_escrow_label(raw_label: Optional[str]) -> tuple[Optional[str], dict]:
    if not isinstance(raw_label, str) or not raw_label.startswith(_ESCROW_META_PREFIX):
        return raw_label, {}

    token = raw_label[len(_ESCROW_META_PREFIX) :]
    padded = token + ("=" * ((4 - len(token) % 4) % 4))
    try:
        decoded = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
        payload = json.loads(decoded)
    except Exception:
        return raw_label, {}

    label = payload.get("label")
    meta = payload.get("meta")
    if not isinstance(meta, dict):
        meta = {}
    return label, meta


def _query_escrow_list_page(
    *,
    status_filter: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
) -> tuple[int, list[dict]]:
    args = {"limit": int(limit), "offset": int(offset)}
    if status_filter:
        args["status_filter"] = status_filter

    result = _query("convex_escrows:list", args)
    if isinstance(result, dict) and "items" in result:
        items = result.get("items") or []
        total = int(result.get("total", len(items)))
        return total, list(items)
    if isinstance(result, list):
        return len(result), result
    return 0, []


def _list_all_escrow_docs(status_filter: Optional[str] = None) -> list[dict]:
    batch = 200
    offset = 0
    docs: list[dict] = []

    while True:
        total, items = _query_escrow_list_page(
            status_filter=status_filter,
            limit=batch,
            offset=offset,
        )
        if not items:
            break
        docs.extend(items)
        offset += len(items)
        if len(items) < batch:
            break
        if total and offset >= total:
            break
    return docs


def _query(function: str, args: Optional[dict] = None):
    payload_args = _clean_args(args)
    payload_args["internal_key"] = CONVEX_INTERNAL_API_KEY
    r = _HTTP_CLIENT.post(
        f"{CONVEX_API}/api/query",
        json={"path": function, "args": payload_args},
    )
    r.raise_for_status()
    data = r.json()
    if data.get("status") != "success":
        raise RuntimeError(_convex_error_message("query", function, data))
    return data["value"]


def _mutation(function: str, args: Optional[dict] = None):
    payload_args = _clean_args(args)
    payload_args["internal_key"] = CONVEX_INTERNAL_API_KEY
    r = _HTTP_CLIENT.post(
        f"{CONVEX_API}/api/mutation",
        json={"path": function, "args": payload_args},
    )
    r.raise_for_status()
    data = r.json()
    if data.get("status") != "success":
        raise RuntimeError(_convex_error_message("mutation", function, data))
    return data["value"]


def _to_datetime(ts) -> datetime:
    """Convert Convex timestamp (ms since epoch) to datetime."""
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts / 1000, tz=timezone.utc)
    return datetime.now(timezone.utc)


def _to_datetime_optional(ts) -> Optional[datetime]:
    """Convert optional Convex timestamp to datetime or None."""
    if ts is None:
        return None
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts / 1000, tz=timezone.utc)
    return None


def _dt_to_ms(dt) -> Optional[float]:
    """Convert a Python datetime to epoch ms for Convex storage."""
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.timestamp() * 1000
    if isinstance(dt, (int, float)):
        return float(dt)
    return None


def _generate_public_id() -> str:
    """Generate a short, URL-safe public identifier."""
    return secrets.token_urlsafe(12)


def _format_escrow(doc: dict) -> dict:
    if doc is None:
        return None
    return {
        "id": doc["_id"],
        "public_id": doc.get("public_id", ""),
        "public_key": doc["public_key"],
        "secret_key": doc["secret_key"],
        "label": doc.get("label"),
        "recipient_address": doc.get("recipient_address"),
        "sender_address": doc.get("sender_address"),
        "expected_amount_lamports": doc.get("expected_amount_lamports"),
        "status": doc["status"],
        "creator_user_id": doc.get("creator_user_id", ""),
        "payer_user_id": doc.get("payer_user_id"),
        "payee_user_id": doc.get("payee_user_id"),
        "sender_claimed_at": _to_datetime_optional(doc.get("sender_claimed_at")),
        "recipient_claimed_at": _to_datetime_optional(doc.get("recipient_claimed_at")),
        "join_token_hash": doc.get("join_token_hash"),
        "join_expires_at": _to_datetime_optional(doc.get("join_expires_at")),
        "invite_token_hash": doc.get("invite_token_hash"),
        "invite_expires_at": _to_datetime_optional(doc.get("invite_expires_at")),
        "invite_used_at": _to_datetime_optional(doc.get("invite_used_at")),
        "accepted_at": _to_datetime_optional(doc.get("accepted_at")),
        "funded_at": _to_datetime_optional(doc.get("funded_at")),
        "service_marked_complete_at": _to_datetime_optional(doc.get("service_marked_complete_at")),
        "disputed_at": _to_datetime_optional(doc.get("disputed_at")),
        "dispute_reason": doc.get("dispute_reason"),
        "finalize_nonce": doc.get("finalize_nonce", 0),
        "last_intent_hash": doc.get("last_intent_hash"),
        "settled_signature": doc.get("settled_signature"),
        "failure_reason": doc.get("failure_reason"),
        "version": doc.get("version", 0),
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


def _format_dispute_message(doc: dict) -> dict:
    if doc is None:
        return None
    return {
        "id": doc["_id"],
        "escrow_id": doc["escrow_id"],
        "sender_user_id": doc["sender_user_id"],
        "sender_role": doc["sender_role"],
        "body": doc.get("body"),
        "attachments": doc.get("attachments") or [],
        "created_at": _to_datetime_optional(doc.get("created_at")) or _to_datetime(
            doc.get("_creationTime")
        ),
    }


def _format_rating(doc: dict) -> dict:
    if doc is None:
        return None
    created_at = _to_datetime_optional(doc.get("created_at")) or _to_datetime(
        doc.get("_creationTime")
    )
    updated_at = _to_datetime_optional(doc.get("updated_at")) or created_at
    return {
        "id": doc["_id"],
        "escrow_id": doc["escrow_id"],
        "from_user_id": doc["from_user_id"],
        "to_user_id": doc["to_user_id"],
        "score": doc["score"],
        "comment": doc.get("comment"),
        "created_at": created_at,
        "updated_at": updated_at,
    }


def _prepare_escrow_updates(updates: dict) -> dict:
    """Convert datetime values in updates dict to epoch ms for Convex."""
    converted = {}
    datetime_fields = {
        "sender_claimed_at", "recipient_claimed_at",
        "join_expires_at", "invite_expires_at", "invite_used_at",
        "accepted_at", "funded_at", "service_marked_complete_at",
        "disputed_at",
    }
    for k, v in updates.items():
        if v is None:
            continue
        if k in datetime_fields:
            converted[k] = _dt_to_ms(v)
        else:
            converted[k] = v
    return converted


# ── Escrow functions ──────────────────────────────────────────────────────────

def insert_escrow(data: dict) -> dict:
    public_id = _generate_public_id()

    insert_args = {
        "public_id": public_id,
        "public_key": data["public_key"],
        "secret_key": data["secret_key"],
        "label": data.get("label"),
        "recipient_address": data.get("recipient_address"),
        "sender_address": data.get("sender_address"),
        "expected_amount_lamports": data.get("expected_amount_lamports"),
        "status": "open",
        "creator_user_id": data.get("creator_user_id", ""),
        "finalize_nonce": 0,
        "version": 0,
    }

    if data.get("join_token_hash"):
        insert_args["join_token_hash"] = data["join_token_hash"]
    if data.get("join_expires_at"):
        insert_args["join_expires_at"] = _dt_to_ms(data["join_expires_at"])
    if data.get("payer_user_id"):
        insert_args["payer_user_id"] = data["payer_user_id"]
    if data.get("payee_user_id"):
        insert_args["payee_user_id"] = data["payee_user_id"]

    doc = _mutation("convex_escrows:insert", insert_args)
    return _format_escrow(doc)


def get_escrow(escrow_id: str) -> Optional[dict]:
    doc = _query("convex_escrows:get", {"id": escrow_id})
    return _format_escrow(doc) if doc else None


def get_escrow_by_public_id(public_id: str) -> Optional[dict]:
    doc = _query("convex_escrows:getByPublicId", {"public_id": public_id})
    return _format_escrow(doc) if doc else None


def get_escrow_by_invite_hash(invite_token_hash: str) -> Optional[dict]:
    doc = _query("convex_escrows:getByInviteHash", {"invite_token_hash": invite_token_hash})
    return _format_escrow(doc) if doc else None


def list_escrows(
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    actor_user_id: Optional[str] = None,
    mine_only: bool = False,
) -> tuple[int, list[dict]]:
    result = _query("convex_escrows:list", {
        "status_filter": status_filter,
        "limit": limit,
        "offset": offset,
        "actor_user_id": actor_user_id,
        "mine_only": mine_only,
    })
    return result["total"], [_format_escrow(e) for e in result["items"]]


def update_escrow(escrow_id: str, updates: dict) -> Optional[dict]:
    clean = _prepare_escrow_updates(updates)
    if not clean:
        return get_escrow(escrow_id)
    doc = _mutation("convex_escrows:update", {"id": escrow_id, "updates": clean})
    return _format_escrow(doc) if doc else None


# ── Transaction functions ─────────────────────────────────────────────────────

def insert_transaction(data: dict) -> dict:
    doc = _mutation("convex_transactions:insert", {
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
    docs = _query("convex_transactions:listByEscrow", {"escrow_id": escrow_id})
    return [_format_transaction(t) for t in docs]


def get_transaction_by_signature(signature: str) -> Optional[dict]:
    doc = _query("convex_transactions:getBySignature", {"signature": signature})
    return _format_transaction(doc) if doc else None


def update_transaction_status(signature: str, status: str) -> Optional[dict]:
    doc = _mutation("convex_transactions:updateStatus", {
        "signature": signature,
        "status": status,
    })
    return _format_transaction(doc) if doc else None


def update_transaction(signature: str, updates: dict) -> Optional[dict]:
    clean = {k: v for k, v in updates.items() if v is not None}
    doc = _mutation("convex_transactions:update", {
        "signature": signature,
        "updates": clean,
    })
    return _format_transaction(doc) if doc else None


def list_dispute_messages(escrow_id: str) -> list[dict]:
    docs = _query("convex_dispute_chat:listByEscrow", {"escrow_id": escrow_id})
    return [_format_dispute_message(doc) for doc in docs]


def insert_dispute_message(data: dict) -> dict:
    doc = _mutation(
        "convex_dispute_chat:insert",
        {
            "escrow_id": data["escrow_id"],
            "sender_user_id": data["sender_user_id"],
            "sender_role": data["sender_role"],
            "body": data.get("body"),
            "attachments": data.get("attachments") or [],
        },
    )
    return _format_dispute_message(doc)


def generate_dispute_upload_url() -> str:
    return _mutation("convex_dispute_chat:generateUploadUrl", {})


def list_ratings(escrow_id: str) -> list[dict]:
    docs = _query("convex_ratings:listByEscrow", {"escrow_id": escrow_id})
    return [_format_rating(doc) for doc in docs]


def get_rating_by_users(escrow_id: str, from_user_id: str, to_user_id: str) -> Optional[dict]:
    doc = _query(
        "convex_ratings:getByEscrowAndUsers",
        {
            "escrow_id": escrow_id,
            "from_user_id": from_user_id,
            "to_user_id": to_user_id,
        },
    )
    return _format_rating(doc) if doc else None


def upsert_rating(
    escrow_id: str,
    from_user_id: str,
    to_user_id: str,
    score: int,
    comment: Optional[str] = None,
) -> dict:
    doc = _mutation(
        "convex_ratings:upsert",
        {
            "escrow_id": escrow_id,
            "from_user_id": from_user_id,
            "to_user_id": to_user_id,
            "score": score,
            "comment": comment,
        },
    )
    return _format_rating(doc)
