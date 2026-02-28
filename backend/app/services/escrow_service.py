import hashlib
from typing import Optional

from app.exceptions import (
    EscrowCancelledError,
    EscrowNotFoundError,
    InsufficientFundsError,
)
from app.schemas.escrow import EscrowCreate, EscrowUpdate
from app.schemas.transaction import TransactionCreate
from app.services import solana_service
from app import store


def create_escrow(data: EscrowCreate) -> dict:
    public_key, secret_key = solana_service.generate_keypair()
    escrow = store.insert_escrow({
        "public_key": public_key,
        "secret_key": secret_key,
        "label": data.label,
        "recipient_address": data.recipient_address,
        "sender_address": data.sender_address,
        "expected_amount_lamports": data.expected_amount_lamports,
    })
    return escrow


def list_escrows(
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[int, list[dict]]:
    return store.list_escrows(status_filter, limit, offset)


def get_escrow(escrow_id: int) -> dict:
    escrow = store.get_escrow(escrow_id)
    if not escrow:
        raise EscrowNotFoundError(escrow_id)
    return escrow


def update_escrow(escrow_id: int, data: EscrowUpdate) -> dict:
    get_escrow(escrow_id)  # verify exists
    updates = data.model_dump(exclude_unset=True)
    return store.update_escrow(escrow_id, updates)


def cancel_escrow(
    escrow_id: int,
    return_funds: bool = False,
    refund_address: Optional[str] = None,
) -> tuple[dict, Optional[str]]:
    escrow = get_escrow(escrow_id)
    if escrow["status"] == "cancelled":
        raise EscrowCancelledError(escrow_id)

    refund_sig = None

    if return_funds:
        if not refund_address:
            from app.exceptions import InvalidAddressError
            raise InvalidAddressError("refund_address is required when return_funds=true")

        balance = solana_service.get_balance(escrow["public_key"])
        fee = solana_service.TRANSFER_FEE_LAMPORTS
        if balance > fee:
            refund_amount = balance - fee
            intent_hash = _build_intent_hash(
                escrow_id=escrow["id"],
                recipient=refund_address,
                amount_lamports=refund_amount,
                idempotency_key=f"refund:{escrow['finalize_nonce'] + 1}",
            )

            store.update_escrow(escrow_id, {
                "status": "refund_pending",
                "last_intent_hash": intent_hash,
                "failure_reason": None,
            })

            try:
                transfer_result = solana_service.send_transfer_with_confirmation(
                    escrow["secret_key"],
                    refund_address,
                    refund_amount,
                )
            except Exception as exc:
                store.update_escrow(escrow_id, {
                    "status": "active",
                    "failure_reason": str(exc),
                })
                raise

            refund_sig = transfer_result["signature"]
            record_transaction(TransactionCreate(
                escrow_id=escrow["id"],
                signature=refund_sig,
                tx_type="refund",
                amount_lamports=refund_amount,
                from_address=escrow["public_key"],
                to_address=refund_address,
                status=transfer_result["status"],
                intent_hash=intent_hash,
                commitment_target=transfer_result["commitment_target"],
                last_valid_block_height=transfer_result["last_valid_block_height"],
                rpc_endpoint=transfer_result["rpc_endpoint"],
            ))
            store.update_escrow(escrow_id, {
                "settled_signature": refund_sig,
                "finalize_nonce": escrow["finalize_nonce"] + 1,
            })

    result = store.update_escrow(escrow_id, {
        "status": "cancelled",
        "failure_reason": None,
    })
    return result, refund_sig


def release_funds(
    escrow_id: int,
    recipient_override: Optional[str] = None,
    amount_override: Optional[int] = None,
    idempotency_key: Optional[str] = None,
) -> dict:
    escrow = get_escrow(escrow_id)
    if escrow["status"] == "cancelled":
        raise EscrowCancelledError(escrow_id)
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
                "to_address": recipient_override or escrow["recipient_address"] or "",
                "amount_lamports": amount_override or 0,
                "status": "released",
                "commitment_target": None,
            }

    recipient = recipient_override or escrow["recipient_address"]
    if not recipient:
        from app.exceptions import InvalidAddressError
        raise InvalidAddressError("No recipient address configured or provided")

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

    # Check for previous transaction with same intent hash
    previous = _find_transaction_by_intent(escrow["id"], "release", intent_hash)
    if previous:
        store.update_escrow(escrow_id, {
            "status": "released",
            "settled_signature": previous["signature"],
            "failure_reason": None,
        })
        return {
            "signature": previous["signature"],
            "from_address": previous.get("from_address") or escrow["public_key"],
            "to_address": previous.get("to_address") or recipient,
            "amount_lamports": previous.get("amount_lamports") or amount,
            "status": previous["status"],
            "commitment_target": previous.get("commitment_target"),
        }

    store.update_escrow(escrow_id, {
        "status": "release_pending",
        "last_intent_hash": intent_hash,
        "failure_reason": None,
    })

    try:
        transfer_result = solana_service.send_transfer_with_confirmation(
            escrow["secret_key"],
            recipient,
            amount,
        )
    except Exception as exc:
        store.update_escrow(escrow_id, {
            "status": "active",
            "failure_reason": str(exc),
        })
        raise

    record_transaction(TransactionCreate(
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
    ))

    store.update_escrow(escrow_id, {
        "status": "released",
        "finalize_nonce": escrow["finalize_nonce"] + 1,
        "settled_signature": transfer_result["signature"],
        "failure_reason": None,
    })

    escrow = get_escrow(escrow_id)

    return {
        "signature": transfer_result["signature"],
        "from_address": escrow["public_key"],
        "to_address": recipient,
        "amount_lamports": amount,
        "status": transfer_result["status"],
        "commitment_target": transfer_result["commitment_target"],
    }


def record_transaction(data: TransactionCreate) -> dict:
    return store.insert_transaction({
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
    })


def list_transactions(escrow_id: int) -> list[dict]:
    return store.list_transactions(escrow_id)


def get_transaction_by_signature(signature: str) -> Optional[dict]:
    return store.get_transaction_by_signature(signature)


def reconcile_escrow(escrow_id: int) -> dict:
    escrow = get_escrow(escrow_id)
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

        if not chain["err"] and tx["tx_type"] == "release" and solana_service.commitment_satisfied(
            chain["status"], "confirmed"
        ):
            store.update_escrow(escrow_id, {
                "status": "released",
                "settled_signature": tx["signature"],
                "failure_reason": None,
            })
        if not chain["err"] and tx["tx_type"] == "refund" and solana_service.commitment_satisfied(
            chain["status"], "confirmed"
        ):
            store.update_escrow(escrow_id, {
                "status": "cancelled",
                "settled_signature": tx["signature"],
                "failure_reason": None,
            })

    escrow = get_escrow(escrow_id)
    return {
        "escrow_id": escrow["id"],
        "escrow_status": escrow["status"],
        "updated_transactions": updated,
    }


def _latest_transaction_for_type(escrow_id: int, tx_type: str) -> Optional[dict]:
    txs = store.list_transactions(escrow_id)
    for tx in txs:  # already sorted by recorded_at desc
        if tx["tx_type"] == tx_type:
            return tx
    return None


def _find_transaction_by_intent(escrow_id: int, tx_type: str, intent_hash: str) -> Optional[dict]:
    txs = store.list_transactions(escrow_id)
    for tx in txs:
        if tx["tx_type"] == tx_type and tx.get("intent_hash") == intent_hash:
            return tx
    return None


def _build_intent_hash(
    *,
    escrow_id: int,
    recipient: str,
    amount_lamports: int,
    idempotency_key: str,
) -> str:
    raw = f"{escrow_id}:{recipient}:{amount_lamports}:{idempotency_key}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
