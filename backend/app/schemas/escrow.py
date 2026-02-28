from datetime import datetime
from typing import Literal, Optional

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
    public_id: str
    public_key: str
    label: Optional[str]
    recipient_address: Optional[str]
    sender_address: Optional[str]
    expected_amount_lamports: Optional[int]
    status: str
    creator_user_id: str
    payer_user_id: Optional[str]
    payee_user_id: Optional[str]
    sender_claimed_at: Optional[datetime]
    recipient_claimed_at: Optional[datetime]
    invite_expires_at: Optional[datetime]
    accepted_at: Optional[datetime]
    funded_at: Optional[datetime]
    service_marked_complete_at: Optional[datetime]
    disputed_at: Optional[datetime]
    dispute_reason: Optional[str]
    finalize_nonce: int
    settled_signature: Optional[str]
    failure_reason: Optional[str]
    version: int
    created_at: datetime
    updated_at: datetime
    join_token: Optional[str] = None
    claim_link: Optional[str] = None

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


class InviteCreateOut(BaseModel):
    escrow_public_id: str
    invite_token: str
    expires_at: datetime


class InviteAcceptRequest(BaseModel):
    invite_token: str


class ClaimRoleRequest(BaseModel):
    role: Literal["sender", "recipient"]
    join_token: str


class RecipientAddressRequest(BaseModel):
    join_token: str
    recipient_address: str


class FundingSyncRequest(BaseModel):
    join_token: Optional[str] = None


class FundingSyncOut(BaseModel):
    escrow: EscrowOut
    balance_lamports: int
    funded: bool


class ServiceCompleteRequest(BaseModel):
    join_token: str


class DisputeRequest(BaseModel):
    join_token: str
    reason: Optional[str] = None
