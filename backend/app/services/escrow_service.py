import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from app import store
from app.config import settings
from app.exceptions import (
    EscrowCancelledError,
    EscrowNotFoundError,
    ForbiddenActionError,
    InsufficientFundsError,
    InvalidAddressError,
    InvalidEscrowStateError,
    InviteTokenError,
)
from app.schemas.escrow import EscrowCreate, EscrowUpdate
from app.schemas.transaction import TransactionCreate
from app.services import solana_service

TERMINAL_ESCROW_STATES = {"released", "cancelled"}


def create_escrow(data: EscrowCreate, actor_user_id: str) -> dict:
    public_key, secret_key = solana_service.generate_keypair()
    join_token = secrets.token_urlsafe(32)
    join_token_hash = _hash_token(join_token)
    join_expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.escrow_join_ttl_minutes
    )

    escrow = store.insert_escrow(
        {
            "public_key": public_key,
            "secret_key": secret_key,
            "label": data.label,
            "recipient_address": data.recipient_address,
            "sender_address": data.sender_address,
            "expected_amount_lamports": data.expected_amount_lamports,
            "creator_user_id": actor_user_id,
            "join_token_hash": join_token_hash,
            "join_expires_at": join_expires_at,
        }
    )
    escrow["join_token"] = join_token
    escrow["claim_link"] = (
        f"?public_id={escrow['public_id']}&join_token={join_token}"
    )
    return escrow


def list_escrows(
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    actor_user_id: Optional[str] = None,
    mine_only: bool = True,
) -> tuple[int, list[dict]]:
    return store.list_escrows(
        status_filter=status_filter,
        limit=limit,
        offset=offset,
        actor_user_id=actor_user_id,
        mine_only=mine_only,
    )


def get_escrow(escrow_id: str, actor_user_id: Optional[str] = None) -> dict:
    escrow = store.get_escrow(escrow_id)
    if not escrow:
        raise EscrowNotFoundError(escrow_id)
    if actor_user_id:
        _require_view_access(escrow, actor_user_id)
    return escrow


def get_escrow_by_public_id(public_id: str, actor_user_id: Optional[str] = None) -> dict:
    escrow = store.get_escrow_by_public_id(public_id)
    if not escrow:
        raise EscrowNotFoundError(public_id)
    if actor_user_id:
        _require_view_access(escrow, actor_user_id)
    return escrow


def update_escrow(escrow_id: str, data: EscrowUpdate, actor_user_id: str) -> dict:
    escrow = get_escrow(escrow_id)
    _require_sender_or_creator(escrow, actor_user_id)
    _ensure_not_terminal(escrow)

    allowed = {"label", "expected_amount_lamports"}
    update_data = data.model_dump(exclude_unset=True)
    updates = {k: v for k, v in update_data.items() if k in allowed}
    updated = store.update_escrow(escrow_id, updates)
    if not updated:
        raise EscrowNotFoundError(escrow_id)
    return updated


def claim_role(
    public_id: str,
    actor_user_id: str,
    role: str,
    join_token: str,
) -> dict:
    escrow = _get_escrow_by_public_id(public_id)
    _ensure_not_terminal(escrow)
    _verify_join_token(escrow, join_token)

    now = datetime.now(timezone.utc)
    updates: dict = {"failure_reason": None}

    if role == "sender":
        if escrow.get("payee_user_id") == actor_user_id:
            raise ForbiddenActionError("Recipient account cannot also claim sender role.")
        current = escrow.get("payer_user_id")
        if current and current != actor_user_id:
            raise ForbiddenActionError("Sender role is already claimed by another account.")
        updates["payer_user_id"] = actor_user_id
        updates["sender_claimed_at"] = now
    elif role == "recipient":
        if escrow.get("payer_user_id") == actor_user_id:
            raise ForbiddenActionError("Sender account cannot also claim recipient role.")
        current = escrow.get("payee_user_id")
        if current and current != actor_user_id:
            raise ForbiddenActionError("Recipient role is already claimed by another account.")
        updates["payee_user_id"] = actor_user_id
        updates["recipient_claimed_at"] = now
        updates["accepted_at"] = now
    else:
        raise InvalidEscrowStateError("Role must be 'sender' or 'recipient'.")

    next_sender = updates.get("payer_user_id", escrow.get("payer_user_id"))
    next_recipient = updates.get("payee_user_id", escrow.get("payee_user_id"))
    if next_sender and next_recipient and escrow.get("status") in {"open", "roles_pending"}:
        updates["status"] = "roles_claimed"

    updated = store.update_escrow(escrow["id"], updates)
    if not updated:
        raise EscrowNotFoundError(public_id)
    return updated


def set_recipient_address(
    public_id: str,
    actor_user_id: str,
    join_token: str,
    recipient_address: str,
) -> dict:
    escrow = _get_escrow_by_public_id(public_id)
    _ensure_not_terminal(escrow)
    _verify_join_token(escrow, join_token)
    _require_recipient(escrow, actor_user_id)
    solana_service.validate_address(recipient_address)

    updated = store.update_escrow(
        escrow["id"],
        {
            "recipient_address": recipient_address,
            "failure_reason": None,
        },
    )
    if not updated:
        raise EscrowNotFoundError(public_id)
    return updated


def sync_funding(
    public_id: str,
    actor_user_id: str,
    join_token: Optional[str] = None,
) -> dict:
    escrow = _get_escrow_by_public_id(public_id)
    _ensure_not_terminal(escrow)

    if join_token:
        _verify_join_token(escrow, join_token)
    else:
        _require_view_access(escrow, actor_user_id)

    latest_funding_tx = _sync_recent_address_signatures(escrow)
    balance = solana_service.get_balance(escrow["public_key"])
    minimum_required = _minimum_required_funding_lamports(escrow)
    funding_tx_confirmed = False
    if latest_funding_tx and not latest_funding_tx.get("raw_error"):
        funding_tx_confirmed = solana_service.commitment_satisfied(
            latest_funding_tx.get("status"),
            "confirmed",
        )
    elif escrow.get("funded_at"):
        # Backward-compatible fallback for previously funded escrows with no tracked deposit tx.
        funding_tx_confirmed = True

    has_required_balance = balance >= minimum_required
    funding_eligible = has_required_balance and funding_tx_confirmed
    updated_escrow = escrow

    if funding_eligible and not escrow.get("funded_at"):
        updates = {
            "funded_at": datetime.now(timezone.utc),
            "failure_reason": None,
        }
        if escrow.get("status") in {"open", "roles_pending", "roles_claimed"}:
            updates["status"] = "funded"
        updated_escrow = store.update_escrow(escrow["id"], updates) or escrow

    return {
        "escrow": updated_escrow,
        "balance_lamports": balance,
        "funded": bool(updated_escrow.get("funded_at")),
        "funding_transaction_signature": latest_funding_tx.get("signature") if latest_funding_tx else None,
        "funding_transaction_status": latest_funding_tx.get("status") if latest_funding_tx else None,
        "funding_transaction_confirmed": funding_tx_confirmed,
        "minimum_required_lamports": minimum_required,
    }


def mark_service_complete(
    public_id: str,
    actor_user_id: str,
    join_token: str,
) -> dict:
    escrow = _get_escrow_by_public_id(public_id)
    _ensure_not_terminal(escrow)
    _verify_join_token(escrow, join_token)
    _require_recipient(escrow, actor_user_id)

    if not escrow.get("funded_at"):
        raise InvalidEscrowStateError("Escrow is not funded yet.")

    updates = {
        "service_marked_complete_at": datetime.now(timezone.utc),
        "failure_reason": None,
    }
    if escrow.get("status") not in {"released", "cancelled"}:
        updates["status"] = "service_complete"

    updated = store.update_escrow(escrow["id"], updates)
    if not updated:
        raise EscrowNotFoundError(public_id)
    return updated


def open_dispute(
    public_id: str,
    actor_user_id: str,
    join_token: str,
    reason: Optional[str] = None,
) -> dict:
    escrow = _get_escrow_by_public_id(public_id)
    _ensure_not_terminal(escrow)
    _verify_join_token(escrow, join_token)
    _require_view_access(escrow, actor_user_id)

    updated = store.update_escrow(
        escrow["id"],
        {
            "disputed_at": datetime.now(timezone.utc),
            "dispute_reason": reason,
            "status": "disputed",
        },
    )
    if not updated:
        raise EscrowNotFoundError(public_id)
    return updated


def create_invite(public_id: str, actor_user_id: str) -> dict:
    escrow = _get_escrow_by_public_id_for_write(public_id, actor_user_id)
    _ensure_not_terminal(escrow)

    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.escrow_invite_ttl_minutes
    )

    store.update_escrow(
        escrow["id"],
        {
            "join_token_hash": token_hash,
            "join_expires_at": expires_at,
            "invite_token_hash": token_hash,
            "invite_expires_at": expires_at,
            "invite_used_at": None,
            "failure_reason": None,
        },
    )
    return {
        "escrow_public_id": escrow["public_id"],
        "invite_token": token,
        "expires_at": expires_at,
    }


def accept_invite(invite_token: str, actor_user_id: str) -> dict:
    token_hash = _hash_token(invite_token)
    escrow = store.get_escrow_by_invite_hash(token_hash)
    if not escrow:
        raise InviteTokenError("Invite token is invalid.")

    expires_at = escrow.get("invite_expires_at")
    now = datetime.now(timezone.utc)
    if not expires_at or expires_at < now:
        raise InviteTokenError("Invite token is expired.")

    updated = claim_role(
        escrow["public_id"],
        actor_user_id,
        "recipient",
        invite_token,
    )
    store.update_escrow(
        updated["id"],
        {
            "invite_used_at": now,
            "accepted_at": now,
        },
    )
    return get_escrow(updated["id"], actor_user_id)


def mark_funded(public_id: str, actor_user_id: str) -> dict:
    result = sync_funding(public_id, actor_user_id, None)
    return result["escrow"]


def cancel_escrow(
    escrow_id: str,
    actor_user_id: str,
    return_funds: bool = False,
    refund_address: Optional[str] = None,
    settlement: str = "none",
    payout_address: Optional[str] = None,
    actor_is_admin: bool = False,
) -> tuple[dict, Optional[str]]:
    escrow = get_escrow(escrow_id)
    _require_sender_or_creator(escrow, actor_user_id, actor_is_admin)

    if escrow["status"] == "cancelled":
        raise EscrowCancelledError(escrow_id)
    if escrow["status"] == "released":
        raise InvalidEscrowStateError("Released escrow cannot be cancelled.")

    # Backward compatibility with existing query params.
    if return_funds and settlement == "none":
        settlement = "refund_sender"
    if refund_address and not payout_address:
        payout_address = refund_address

    if settlement not in {"none", "refund_sender", "pay_recipient"}:
        raise InvalidEscrowStateError("Invalid settlement mode.")

    target_address: Optional[str] = None
    tx_type = "refund"
    pending_status = "refund_pending"
    final_status = "cancelled"
    intent_prefix = "refund"

    if settlement == "refund_sender":
        target_address = payout_address or escrow.get("sender_address")
        tx_type = "refund"
        pending_status = "refund_pending"
        final_status = "cancelled"
        intent_prefix = "refund"
        if not target_address:
            raise InvalidAddressError("Sender address is not set for refund.")
    elif settlement == "pay_recipient":
        target_address = payout_address or escrow.get("recipient_address")
        tx_type = "release"
        pending_status = "release_pending"
        final_status = "released"
        intent_prefix = "release"
        if not target_address:
            raise InvalidAddressError("Recipient payout address is not set.")

    refund_sig = None
    if target_address:
        solana_service.validate_address(target_address)
        balance = solana_service.get_balance(escrow["public_key"])
        fee = solana_service.TRANSFER_FEE_LAMPORTS
        if balance > fee:
            refund_amount = balance - fee
            intent_hash = _build_intent_hash(
                escrow_id=escrow["id"],
                recipient=target_address,
                amount_lamports=refund_amount,
                idempotency_key=f"{intent_prefix}:{escrow['finalize_nonce'] + 1}",
            )

            store.update_escrow(
                escrow_id,
                {
                    "status": pending_status,
                    "last_intent_hash": intent_hash,
                    "failure_reason": None,
                },
            )

            try:
                transfer_result = solana_service.send_transfer_with_confirmation(
                    escrow["secret_key"],
                    target_address,
                    refund_amount,
                )
            except Exception as exc:
                store.update_escrow(
                    escrow_id,
                    {
                        "status": _derive_non_terminal_status(escrow),
                        "failure_reason": str(exc),
                    },
                )
                raise

            refund_sig = transfer_result["signature"]
            record_transaction(
                TransactionCreate(
                    escrow_id=escrow["id"],
                    signature=refund_sig,
                    tx_type=tx_type,
                    amount_lamports=refund_amount,
                    from_address=escrow["public_key"],
                    to_address=target_address,
                    status=transfer_result["status"],
                    intent_hash=intent_hash,
                    commitment_target=transfer_result["commitment_target"],
                    last_valid_block_height=transfer_result["last_valid_block_height"],
                    rpc_endpoint=transfer_result["rpc_endpoint"],
                )
            )
            store.update_escrow(
                escrow_id,
                {
                    "settled_signature": refund_sig,
                    "finalize_nonce": escrow["finalize_nonce"] + 1,
                },
            )

    result = store.update_escrow(
        escrow_id,
        {
            "status": final_status if (refund_sig or settlement == "none") else "cancelled",
            "failure_reason": None,
        },
    )
    return result or escrow, refund_sig


def cancel_escrow_by_public_id(
    public_id: str,
    actor_user_id: str,
    return_funds: bool = False,
    refund_address: Optional[str] = None,
    settlement: str = "none",
    payout_address: Optional[str] = None,
    actor_is_admin: bool = False,
) -> tuple[dict, Optional[str]]:
    escrow = _get_escrow_by_public_id(public_id)
    return cancel_escrow(
        escrow_id=escrow["id"],
        actor_user_id=actor_user_id,
        return_funds=return_funds,
        refund_address=refund_address,
        settlement=settlement,
        payout_address=payout_address,
        actor_is_admin=actor_is_admin,
    )


def release_funds(
    escrow_id: str,
    actor_user_id: str,
    recipient_override: Optional[str] = None,
    amount_override: Optional[int] = None,
    idempotency_key: Optional[str] = None,
) -> dict:
    escrow = get_escrow(escrow_id)
    _require_sender(escrow, actor_user_id)
    _ensure_release_allowed(escrow)

    if escrow["status"] == "released":
        latest_release = _latest_transaction_for_type(escrow["id"], "release")
        if latest_release:
            return {
                "signature": latest_release["signature"],
                "from_address": latest_release.get("from_address") or escrow["public_key"],
                "to_address": latest_release.get("to_address") or "",
                "amount_lamports": latest_release.get("amount_lamports") or 0,
                "status": latest_release["status"],
                "commitment_target": latest_release.get("commitment_target"),
            }
        if escrow["settled_signature"]:
            return {
                "signature": escrow["settled_signature"],
                "from_address": escrow["public_key"],
                "to_address": escrow.get("recipient_address") or "",
                "amount_lamports": amount_override or 0,
                "status": "released",
                "commitment_target": None,
            }

    recipient = recipient_override or escrow.get("recipient_address")
    if not recipient:
        raise InvalidAddressError("Recipient has not submitted a payout address yet.")
    if escrow.get("recipient_address") and recipient_override and recipient_override != escrow.get(
        "recipient_address"
    ):
        raise ForbiddenActionError("Cannot override recipient payout address.")

    balance = solana_service.get_balance(escrow["public_key"])
    fee = solana_service.TRANSFER_FEE_LAMPORTS

    if amount_override is not None:
        amount = amount_override
        if balance < amount + fee:
            raise InsufficientFundsError(escrow["public_key"], balance, amount + fee)
    else:
        if balance <= fee:
            raise InsufficientFundsError(escrow["public_key"], balance, fee + 1)
        amount = balance - fee

    intent_hash = _build_intent_hash(
        escrow_id=escrow["id"],
        recipient=recipient,
        amount_lamports=amount,
        idempotency_key=idempotency_key or f"release:{escrow['finalize_nonce'] + 1}",
    )
    if escrow["last_intent_hash"] == intent_hash and escrow["settled_signature"]:
        existing = get_transaction_by_signature(escrow["settled_signature"])
        if existing:
            return {
                "signature": existing["signature"],
                "from_address": existing.get("from_address") or escrow["public_key"],
                "to_address": existing.get("to_address") or recipient,
                "amount_lamports": existing.get("amount_lamports") or amount,
                "status": existing["status"],
                "commitment_target": existing.get("commitment_target"),
            }

    previous = _find_transaction_by_intent(escrow["id"], "release", intent_hash)
    if previous:
        store.update_escrow(
            escrow_id,
            {
                "status": "released",
                "settled_signature": previous["signature"],
                "failure_reason": None,
            },
        )
        return {
            "signature": previous["signature"],
            "from_address": previous.get("from_address") or escrow["public_key"],
            "to_address": previous.get("to_address") or recipient,
            "amount_lamports": previous.get("amount_lamports") or amount,
            "status": previous["status"],
            "commitment_target": previous.get("commitment_target"),
        }

    store.update_escrow(
        escrow_id,
        {
            "status": "release_pending",
            "last_intent_hash": intent_hash,
            "failure_reason": None,
        },
    )

    try:
        transfer_result = solana_service.send_transfer_with_confirmation(
            escrow["secret_key"],
            recipient,
            amount,
        )
    except Exception as exc:
        store.update_escrow(
            escrow_id,
            {
                "status": _derive_non_terminal_status(escrow),
                "failure_reason": str(exc),
            },
        )
        raise

    record_transaction(
        TransactionCreate(
            escrow_id=escrow["id"],
            signature=transfer_result["signature"],
            tx_type="release",
            amount_lamports=amount,
            from_address=escrow["public_key"],
            to_address=recipient,
            status=transfer_result["status"],
            intent_hash=intent_hash,
            commitment_target=transfer_result["commitment_target"],
            last_valid_block_height=transfer_result["last_valid_block_height"],
            rpc_endpoint=transfer_result["rpc_endpoint"],
        )
    )

    store.update_escrow(
        escrow_id,
        {
            "status": "released",
            "finalize_nonce": escrow["finalize_nonce"] + 1,
            "settled_signature": transfer_result["signature"],
            "failure_reason": None,
        },
    )

    escrow = get_escrow(escrow_id)
    return {
        "signature": transfer_result["signature"],
        "from_address": escrow["public_key"],
        "to_address": recipient,
        "amount_lamports": amount,
        "status": transfer_result["status"],
        "commitment_target": transfer_result["commitment_target"],
    }


def release_funds_by_public_id(
    public_id: str,
    actor_user_id: str,
    recipient_override: Optional[str] = None,
    amount_override: Optional[int] = None,
    idempotency_key: Optional[str] = None,
) -> dict:
    escrow = _get_escrow_by_public_id(public_id)
    _require_sender(escrow, actor_user_id)
    return release_funds(
        escrow["id"],
        actor_user_id,
        recipient_override,
        amount_override,
        idempotency_key,
    )


def record_transaction(data: TransactionCreate) -> dict:
    return store.insert_transaction(
        {
            "escrow_id": data.escrow_id,
            "signature": data.signature,
            "tx_type": data.tx_type,
            "amount_lamports": data.amount_lamports,
            "from_address": data.from_address,
            "to_address": data.to_address,
            "status": data.status or "pending",
            "intent_hash": data.intent_hash,
            "commitment_target": data.commitment_target,
            "last_valid_block_height": data.last_valid_block_height,
            "rpc_endpoint": data.rpc_endpoint,
            "raw_error": data.raw_error,
            "memo": data.memo,
        }
    )


def list_transactions(escrow_id: str, actor_user_id: Optional[str] = None) -> list[dict]:
    escrow = get_escrow(escrow_id)
    if actor_user_id:
        _require_view_access(escrow, actor_user_id)
    return store.list_transactions(escrow_id)


def get_transaction_by_signature(signature: str) -> Optional[dict]:
    return store.get_transaction_by_signature(signature)


def reconcile_escrow(escrow_id: str, actor_user_id: str) -> dict:
    escrow = get_escrow(escrow_id)
    _require_sender_or_creator(escrow, actor_user_id)

    txs = store.list_transactions(escrow["id"])
    updated = 0
    for tx in txs:
        chain = solana_service.get_transaction_status(tx["signature"])
        if chain["status"] == "not_found":
            continue

        store.update_transaction(
            tx["signature"],
            {
                "status": chain["status"],
                "raw_error": chain["err"],
            },
        )
        updated += 1

        if (
            not chain["err"]
            and tx["tx_type"] == "release"
            and solana_service.commitment_satisfied(chain["status"], "confirmed")
        ):
            store.update_escrow(
                escrow_id,
                {
                    "status": "released",
                    "settled_signature": tx["signature"],
                    "failure_reason": None,
                },
            )
        if (
            not chain["err"]
            and tx["tx_type"] == "refund"
            and solana_service.commitment_satisfied(chain["status"], "confirmed")
        ):
            store.update_escrow(
                escrow_id,
                {
                    "status": "cancelled",
                    "settled_signature": tx["signature"],
                    "failure_reason": None,
                },
            )

    escrow = get_escrow(escrow_id)
    return {
        "escrow_id": escrow["id"],
        "escrow_status": escrow["status"],
        "updated_transactions": updated,
    }


def _latest_transaction_for_type(escrow_id: str, tx_type: str) -> Optional[dict]:
    txs = store.list_transactions(escrow_id)
    for tx in txs:  # already sorted by recorded_at desc
        if tx["tx_type"] == tx_type:
            return tx
    return None


def _find_transaction_by_intent(escrow_id: str, tx_type: str, intent_hash: str) -> Optional[dict]:
    txs = store.list_transactions(escrow_id)
    for tx in txs:
        if tx["tx_type"] == tx_type and tx.get("intent_hash") == intent_hash:
            return tx
    return None


def _build_intent_hash(
    *,
    escrow_id: str,
    recipient: str,
    amount_lamports: int,
    idempotency_key: str,
) -> str:
    raw = f"{escrow_id}:{recipient}:{amount_lamports}:{idempotency_key}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _minimum_required_funding_lamports(escrow: dict) -> int:
    expected = escrow.get("expected_amount_lamports")
    if isinstance(expected, int) and expected > 0:
        return expected
    return max(1, int(settings.escrow_funding_min_lamports))


def _sync_recent_address_signatures(escrow: dict) -> Optional[dict]:
    """Upsert recent on-chain signatures for escrow address and return latest deposit tx."""
    try:
        signatures = solana_service.list_recent_signatures_for_address(
            escrow["public_key"],
            limit=max(1, int(settings.funding_signature_scan_limit)),
        )
    except Exception:
        return _latest_transaction_for_type(escrow["id"], "deposit")

    latest_deposit: Optional[dict] = None

    for sig in signatures:
        signature = sig["signature"]
        existing = get_transaction_by_signature(signature)

        if existing:
            updates = {}
            if sig.get("status") and existing.get("status") != sig["status"]:
                updates["status"] = sig["status"]
            if existing.get("raw_error") != sig.get("err"):
                updates["raw_error"] = sig.get("err")
            if sig.get("memo") and existing.get("memo") != sig.get("memo"):
                updates["memo"] = sig.get("memo")
            if updates:
                existing = store.update_transaction(signature, updates) or existing
        else:
            existing = record_transaction(
                TransactionCreate(
                    escrow_id=escrow["id"],
                    signature=signature,
                    tx_type="deposit",
                    amount_lamports=None,
                    from_address=None,
                    to_address=escrow["public_key"],
                    status=sig.get("status") or "processed",
                    commitment_target="confirmed",
                    rpc_endpoint=settings.solana_rpc_url,
                    raw_error=sig.get("err"),
                    memo=sig.get("memo"),
                )
            )

        if (
            existing
            and existing.get("escrow_id") == escrow["id"]
            and existing.get("tx_type") == "deposit"
            and latest_deposit is None
        ):
            latest_deposit = existing

    if latest_deposit:
        return latest_deposit
    return _latest_transaction_for_type(escrow["id"], "deposit")


def _hash_token(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _require_view_access(escrow: dict, actor_user_id: str) -> None:
    if actor_user_id not in {
        escrow.get("creator_user_id"),
        escrow.get("payer_user_id"),
        escrow.get("payee_user_id"),
    }:
        raise ForbiddenActionError("You are not authorized to view this escrow.")


def _require_sender(escrow: dict, actor_user_id: str) -> None:
    if escrow.get("payer_user_id") != actor_user_id:
        raise ForbiddenActionError("Only the sender can perform this action.")


def _require_recipient(escrow: dict, actor_user_id: str) -> None:
    if escrow.get("payee_user_id") != actor_user_id:
        raise ForbiddenActionError("Only the recipient can perform this action.")


def _require_sender_or_creator(
    escrow: dict,
    actor_user_id: str,
    actor_is_admin: bool = False,
) -> None:
    if actor_is_admin:
        return
    if actor_user_id not in {escrow.get("payer_user_id"), escrow.get("creator_user_id")}:
        raise ForbiddenActionError("Only the sender or creator can perform this action.")


def _ensure_not_terminal(escrow: dict) -> None:
    if escrow.get("status") in TERMINAL_ESCROW_STATES:
        raise InvalidEscrowStateError(f"Escrow is already {escrow['status']}.")


def _ensure_release_allowed(escrow: dict) -> None:
    if escrow["status"] == "cancelled":
        raise EscrowCancelledError(escrow["id"])
    if escrow["status"] == "released":
        return
    if escrow.get("status") == "disputed":
        raise InvalidEscrowStateError("Escrow is disputed and cannot be released.")
    if not escrow.get("payer_user_id"):
        raise InvalidEscrowStateError("Sender has not claimed role yet.")
    if not escrow.get("payee_user_id"):
        raise InvalidEscrowStateError("Recipient has not claimed role yet.")
    if escrow.get("payee_user_id") == escrow.get("payer_user_id"):
        raise InvalidEscrowStateError("Sender and recipient must be different accounts.")
    if not escrow.get("recipient_address"):
        raise InvalidEscrowStateError("Recipient payout address is not set.")
    if not escrow.get("funded_at"):
        raise InvalidEscrowStateError("Escrow is not funded yet.")
    if not escrow.get("service_marked_complete_at"):
        raise InvalidEscrowStateError("Recipient has not marked service complete yet.")


def _verify_join_token(escrow: dict, join_token: str) -> None:
    token_hash = escrow.get("join_token_hash")
    if not token_hash:
        raise InviteTokenError("Escrow join token is missing.")
    if _hash_token(join_token) != token_hash:
        raise InviteTokenError("Join token is invalid.")

    expires_at = escrow.get("join_expires_at")
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise InviteTokenError("Join token is expired.")


def _derive_non_terminal_status(escrow: dict) -> str:
    if escrow.get("status") in {"open", "roles_pending", "roles_claimed", "funded", "service_complete", "disputed"}:
        return escrow.get("status")
    if escrow.get("disputed_at"):
        return "disputed"
    if escrow.get("service_marked_complete_at"):
        return "service_complete"
    if escrow.get("funded_at"):
        return "funded"
    if escrow.get("payer_user_id") and escrow.get("payee_user_id"):
        return "roles_claimed"
    return "open"


def _get_escrow_by_public_id(public_id: str) -> dict:
    escrow = store.get_escrow_by_public_id(public_id)
    if not escrow:
        raise EscrowNotFoundError(public_id)
    return escrow


def _get_escrow_by_public_id_for_write(public_id: str, actor_user_id: str) -> dict:
    escrow = _get_escrow_by_public_id(public_id)
    _require_sender_or_creator(escrow, actor_user_id)
    return escrow
