from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class TransactionCreate(BaseModel):
    escrow_id: int
    signature: str
    tx_type: str  # deposit, release, refund, unknown
    amount_lamports: Optional[int] = None
    from_address: Optional[str] = None
    to_address: Optional[str] = None
    status: Optional[str] = None
    intent_hash: Optional[str] = None
    commitment_target: Optional[str] = None
    last_valid_block_height: Optional[int] = None
    rpc_endpoint: Optional[str] = None
    raw_error: Optional[str] = None
    memo: Optional[str] = None


class TransactionOut(BaseModel):
    id: int
    escrow_id: int
    signature: str
    tx_type: str
    amount_lamports: Optional[int]
    from_address: Optional[str]
    to_address: Optional[str]
    status: str
    intent_hash: Optional[str]
    commitment_target: Optional[str]
    last_valid_block_height: Optional[int]
    rpc_endpoint: Optional[str]
    raw_error: Optional[str]
    memo: Optional[str]
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TransactionStatusRequest(BaseModel):
    signature: str
    escrow_id: Optional[int] = None


class TransactionStatusOut(BaseModel):
    signature: str
    status: str
    slot: Optional[int]
    confirmations: Optional[int]
    err: Optional[str]
