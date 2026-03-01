from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class EscrowRatingCreateRequest(BaseModel):
    score: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=1000)


class EscrowRatingOut(BaseModel):
    id: str
    escrow_id: str
    from_user_id: str
    to_user_id: str
    score: int
    comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EscrowRatingStateOut(BaseModel):
    can_rate: bool
    terminal: bool
    escrow_status: str
    counterpart_user_id: Optional[str] = None
    my_rating: Optional[EscrowRatingOut] = None
    received_rating: Optional[EscrowRatingOut] = None
