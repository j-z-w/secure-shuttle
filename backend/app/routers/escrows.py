from typing import Optional

from fastapi import APIRouter, Query

from app.schemas.escrow import (
    BalanceOut,
    CancelOut,
    EscrowCreate,
    EscrowListOut,
    EscrowOut,
    EscrowUpdate,
    ReconcileOut,
    ReleaseOut,
    ReleaseRequest,
)
from app.schemas.transaction import TransactionOut
from app.services import escrow_service, solana_service

router = APIRouter(prefix="/escrows", tags=["Escrows"])


@router.post("/", response_model=EscrowOut, status_code=201)
def create_escrow(data: EscrowCreate):
    return escrow_service.create_escrow(data)


@router.get("/", response_model=EscrowListOut)
def list_escrows(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    total, items = escrow_service.list_escrows(status, limit, offset)
    return EscrowListOut(total=total, items=items)


@router.get("/{escrow_id}", response_model=EscrowOut)
def get_escrow(escrow_id: int):
    return escrow_service.get_escrow(escrow_id)


@router.patch("/{escrow_id}", response_model=EscrowOut)
def update_escrow(escrow_id: int, data: EscrowUpdate):
    return escrow_service.update_escrow(escrow_id, data)


@router.delete("/{escrow_id}", response_model=CancelOut)
def cancel_escrow(
    escrow_id: int,
    return_funds: bool = Query(False),
    refund_address: Optional[str] = Query(None),
):
    escrow, refund_sig = escrow_service.cancel_escrow(
        escrow_id,
        return_funds,
        refund_address,
    )
    return CancelOut(cancelled=True, refund_signature=refund_sig, escrow=escrow)


@router.get("/{escrow_id}/balance", response_model=BalanceOut)
def get_balance(escrow_id: int):
    escrow = escrow_service.get_escrow(escrow_id)
    lamports = solana_service.get_balance(escrow["public_key"])
    return BalanceOut(
        public_key=escrow["public_key"],
        balance_lamports=lamports,
        balance_sol=lamports / 1_000_000_000,
    )


@router.post("/{escrow_id}/release", response_model=ReleaseOut)
def release_funds(escrow_id: int, data: ReleaseRequest):
    result = escrow_service.release_funds(
        escrow_id,
        data.recipient_address,
        data.amount_lamports,
        data.idempotency_key,
    )
    return ReleaseOut(**result)


@router.get("/{escrow_id}/transactions", response_model=list[TransactionOut])
def get_escrow_transactions(escrow_id: int):
    escrow_service.get_escrow(escrow_id)  # verify exists
    return escrow_service.list_transactions(escrow_id)


@router.post("/{escrow_id}/reconcile", response_model=ReconcileOut)
def reconcile_escrow(escrow_id: int):
    return escrow_service.reconcile_escrow(escrow_id)
