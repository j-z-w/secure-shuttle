from fastapi import APIRouter, HTTPException

from app.schemas.transaction import (
    TransactionCreate,
    TransactionOut,
    TransactionStatusOut,
    TransactionStatusRequest,
)
from app.services import escrow_service, solana_service
from app import store

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.post("/status", response_model=TransactionStatusOut)
def check_transaction_status(data: TransactionStatusRequest):
    result = solana_service.get_transaction_status(data.signature)

    # If an escrow_id was provided, update the local record if it exists
    if data.escrow_id:
        tx = escrow_service.get_transaction_by_signature(data.signature)
        if tx:
            store.update_transaction_status(data.signature, result["status"])

    return TransactionStatusOut(
        signature=data.signature,
        status=result["status"],
        slot=result["slot"],
        confirmations=result["confirmations"],
        err=result["err"],
    )


@router.post("/record", response_model=TransactionOut, status_code=201)
def record_transaction(data: TransactionCreate):
    # Verify the escrow exists
    escrow_service.get_escrow(data.escrow_id)
    return escrow_service.record_transaction(data)


@router.get("/{signature}", response_model=TransactionOut)
def get_transaction(signature: str):
    tx = escrow_service.get_transaction_by_signature(signature)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found in local database")
    return tx
