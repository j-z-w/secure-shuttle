from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class EscrowCreate(BaseModel):
    label: Optional[str] = None
    recipient_address: Optional[str] = None
    sender_address: Optional[str] = None
    expected_amount_lamports: Optional[int] = None


class EscrowUpdate(BaseModel):
    label: Optional[str] = None
    recipient_address: Optional[str] = None
    sender_address: Optional[str] = None
    expected_amount_lamports: Optional[int] = None
    status: Optional[str] = None


class EscrowOut(BaseModel):
    id: int
    public_key: str
    label: Optional[str]
    recipient_address: Optional[str]
    sender_address: Optional[str]
    expected_amount_lamports: Optional[int]
    status: str
    finalize_nonce: int
    settled_signature: Optional[str]
    failure_reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EscrowListOut(BaseModel):
    total: int
    items: list[EscrowOut]


class BalanceOut(BaseModel):
    public_key: str
    balance_lamports: int
    balance_sol: float


class ReleaseRequest(BaseModel):
    recipient_address: Optional[str] = None
    amount_lamports: Optional[int] = None
    idempotency_key: Optional[str] = None


class ReleaseOut(BaseModel):
    signature: str
    from_address: str
    to_address: str
    amount_lamports: int
    status: str
    commitment_target: Optional[str] = None


class CancelOut(BaseModel):
    cancelled: bool
    refund_signature: Optional[str]
    escrow: EscrowOut


class ReconcileOut(BaseModel):
    escrow_id: int
    escrow_status: str
    updated_transactions: int
