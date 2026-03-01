from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DisputeAttachmentIn(BaseModel):
    storage_id: str
    file_name: Optional[str] = None
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None


class DisputeAttachmentOut(BaseModel):
    storage_id: str
    file_name: Optional[str] = None
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    storage_url: Optional[str] = None


class DisputeMessageCreate(BaseModel):
    body: Optional[str] = None
    attachments: list[DisputeAttachmentIn] = Field(default_factory=list)

    @model_validator(mode="after")
    def ensure_payload(self):
        has_body = bool(self.body and self.body.strip())
        has_attachments = bool(self.attachments)
        if not has_body and not has_attachments:
            raise ValueError("Message body or attachments are required.")
        return self


class DisputeMessageOut(BaseModel):
    id: str
    escrow_id: str
    sender_user_id: str
    sender_role: str
    body: Optional[str] = None
    attachments: list[DisputeAttachmentOut] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DisputeUploadUrlOut(BaseModel):
    upload_url: str
