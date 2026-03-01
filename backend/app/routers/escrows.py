from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.auth import get_actor_is_admin, get_actor_user_id
from app.exceptions import ForbiddenActionError
from app.schemas.chat import (
    DisputeMessageCreate,
    DisputeMessageOut,
    DisputeUploadUrlOut,
)
from app.schemas.escrow import (
    BalanceOut,
    CancelOut,
    ClaimRoleRequest,
    DisputeRequest,
    EscrowCreate,
    EscrowListOut,
    EscrowOut,
    FundingSyncOut,
    FundingSyncRequest,
    InviteAcceptRequest,
    InviteCreateOut,
    RecipientAddressRequest,
    EscrowUpdate,
    ReconcileOut,
    ServiceCompleteRequest,
    ReleaseOut,
    ReleaseRequest,
)
from app.schemas.transaction import TransactionOut
from app.services import escrow_service, solana_service

router = APIRouter(prefix="/escrows", tags=["Escrows"])


@router.post("/", response_model=EscrowOut, status_code=201)
def create_escrow(data: EscrowCreate, actor_user_id: str = Depends(get_actor_user_id)):
    return escrow_service.create_escrow(data, actor_user_id)


@router.get("/", response_model=EscrowListOut)
def list_escrows(
    status: Optional[str] = Query(None),
    scope: str = Query("mine", pattern="^(mine|all)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    actor_user_id: str = Depends(get_actor_user_id),
    actor_is_admin: bool = Depends(get_actor_is_admin),
):
    if scope == "all" and not actor_is_admin:
        raise ForbiddenActionError("Only admins can request all escrows.")

    mine_only = scope != "all"
    total, items = escrow_service.list_escrows(
        status,
        limit,
        offset,
        actor_user_id,
        mine_only,
    )
    return EscrowListOut(total=total, items=items)


@router.get("/{escrow_id}", response_model=EscrowOut)
def get_escrow(escrow_id: str, actor_user_id: str = Depends(get_actor_user_id)):
    return escrow_service.get_escrow(escrow_id, actor_user_id)


@router.get("/public/{public_id}", response_model=EscrowOut)
def get_escrow_by_public_id(
    public_id: str,
    actor_user_id: str = Depends(get_actor_user_id),
):
    return escrow_service.get_escrow_by_public_id(public_id, actor_user_id)


@router.patch("/{escrow_id}", response_model=EscrowOut)
def update_escrow(
    escrow_id: str,
    data: EscrowUpdate,
    actor_user_id: str = Depends(get_actor_user_id),
):
    return escrow_service.update_escrow(escrow_id, data, actor_user_id)


@router.delete("/{escrow_id}", response_model=CancelOut)
def cancel_escrow(
    escrow_id: str,
    return_funds: bool = Query(False),
    refund_address: Optional[str] = Query(None),
    settlement: str = Query("none", pattern="^(none|refund_sender|pay_recipient)$"),
    payout_address: Optional[str] = Query(None),
    actor_user_id: str = Depends(get_actor_user_id),
    actor_is_admin: bool = Depends(get_actor_is_admin),
):
    escrow, refund_sig = escrow_service.cancel_escrow(
        escrow_id,
        actor_user_id,
        return_funds,
        refund_address,
        settlement,
        payout_address,
        actor_is_admin,
    )
    return CancelOut(cancelled=True, refund_signature=refund_sig, escrow=escrow)


@router.delete("/public/{public_id}/cancel", response_model=CancelOut)
def cancel_escrow_by_public_id(
    public_id: str,
    return_funds: bool = Query(False),
    refund_address: Optional[str] = Query(None),
    settlement: str = Query("none", pattern="^(none|refund_sender|pay_recipient)$"),
    payout_address: Optional[str] = Query(None),
    actor_user_id: str = Depends(get_actor_user_id),
    actor_is_admin: bool = Depends(get_actor_is_admin),
):
    escrow, refund_sig = escrow_service.cancel_escrow_by_public_id(
        public_id,
        actor_user_id,
        return_funds,
        refund_address,
        settlement,
        payout_address,
        actor_is_admin,
    )
    return CancelOut(cancelled=True, refund_signature=refund_sig, escrow=escrow)


@router.get("/{escrow_id}/balance", response_model=BalanceOut)
def get_balance(escrow_id: str, actor_user_id: str = Depends(get_actor_user_id)):
    escrow = escrow_service.get_escrow(escrow_id, actor_user_id)
    lamports = solana_service.get_balance(escrow["public_key"])
    return BalanceOut(
        public_key=escrow["public_key"],
        balance_lamports=lamports,
        balance_sol=lamports / 1_000_000_000,
    )


@router.post("/{escrow_id}/release", response_model=ReleaseOut)
def release_funds(
    escrow_id: str,
    data: ReleaseRequest,
    actor_user_id: str = Depends(get_actor_user_id),
):
    result = escrow_service.release_funds(
        escrow_id,
        actor_user_id,
        data.recipient_address,
        data.amount_lamports,
        data.idempotency_key,
    )
    return ReleaseOut(**result)


@router.post("/public/{public_id}/claim-role", response_model=EscrowOut)
def claim_role(
    public_id: str,
    data: ClaimRoleRequest,
    actor_user_id: str = Depends(get_actor_user_id),
):
    return escrow_service.claim_role(public_id, actor_user_id, data.role, data.join_token)


@router.post("/public/{public_id}/recipient-address", response_model=EscrowOut)
def set_recipient_address(
    public_id: str,
    data: RecipientAddressRequest,
    actor_user_id: str = Depends(get_actor_user_id),
):
    return escrow_service.set_recipient_address(
        public_id,
        actor_user_id,
        data.join_token,
        data.recipient_address,
    )


@router.post("/public/{public_id}/sync-funding", response_model=FundingSyncOut)
def sync_funding(
    public_id: str,
    data: FundingSyncRequest,
    actor_user_id: str = Depends(get_actor_user_id),
):
    return escrow_service.sync_funding(public_id, actor_user_id, data.join_token)


@router.post("/public/{public_id}/service-complete", response_model=EscrowOut)
def mark_service_complete(
    public_id: str,
    data: ServiceCompleteRequest,
    actor_user_id: str = Depends(get_actor_user_id),
):
    return escrow_service.mark_service_complete(public_id, actor_user_id, data.join_token)


@router.post("/public/{public_id}/dispute", response_model=EscrowOut)
def open_dispute(
    public_id: str,
    data: DisputeRequest,
    actor_user_id: str = Depends(get_actor_user_id),
):
    return escrow_service.open_dispute(public_id, actor_user_id, data.join_token, data.reason)


@router.get("/public/{public_id}/dispute/messages", response_model=list[DisputeMessageOut])
def list_dispute_messages(
    public_id: str,
    actor_user_id: str = Depends(get_actor_user_id),
    actor_is_admin: bool = Depends(get_actor_is_admin),
):
    return escrow_service.list_dispute_messages_by_public_id(
        public_id,
        actor_user_id,
        actor_is_admin,
    )


@router.post("/public/{public_id}/dispute/messages", response_model=DisputeMessageOut)
def create_dispute_message(
    public_id: str,
    data: DisputeMessageCreate,
    actor_user_id: str = Depends(get_actor_user_id),
    actor_is_admin: bool = Depends(get_actor_is_admin),
):
    return escrow_service.create_dispute_message_by_public_id(
        public_id,
        actor_user_id,
        data.body,
        [attachment.model_dump() for attachment in data.attachments],
        actor_is_admin,
    )


@router.post("/public/{public_id}/dispute/upload-url", response_model=DisputeUploadUrlOut)
def create_dispute_upload_url(
    public_id: str,
    actor_user_id: str = Depends(get_actor_user_id),
    actor_is_admin: bool = Depends(get_actor_is_admin),
):
    upload_url = escrow_service.create_dispute_upload_url_by_public_id(
        public_id,
        actor_user_id,
        actor_is_admin,
    )
    return DisputeUploadUrlOut(upload_url=upload_url)


@router.post("/public/{public_id}/release", response_model=ReleaseOut)
def release_funds_by_public_id(
    public_id: str,
    data: ReleaseRequest,
    actor_user_id: str = Depends(get_actor_user_id),
):
    result = escrow_service.release_funds_by_public_id(
        public_id,
        actor_user_id,
        data.recipient_address,
        data.amount_lamports,
        data.idempotency_key,
    )
    return ReleaseOut(**result)


@router.post("/public/{public_id}/invite", response_model=InviteCreateOut)
def create_invite(public_id: str, actor_user_id: str = Depends(get_actor_user_id)):
    return escrow_service.create_invite(public_id, actor_user_id)


@router.post("/accept-invite", response_model=EscrowOut)
def accept_invite(
    data: InviteAcceptRequest,
    actor_user_id: str = Depends(get_actor_user_id),
):
    return escrow_service.accept_invite(data.invite_token, actor_user_id)


@router.post("/public/{public_id}/mark-funded", response_model=EscrowOut)
def mark_funded(public_id: str, actor_user_id: str = Depends(get_actor_user_id)):
    return escrow_service.mark_funded(public_id, actor_user_id)


@router.get("/{escrow_id}/transactions", response_model=list[TransactionOut])
def get_escrow_transactions(
    escrow_id: str,
    actor_user_id: str = Depends(get_actor_user_id),
):
    escrow_service.get_escrow(escrow_id, actor_user_id)  # verify exists and access
    return escrow_service.list_transactions(escrow_id, actor_user_id)


@router.post("/{escrow_id}/reconcile", response_model=ReconcileOut)
def reconcile_escrow(escrow_id: str, actor_user_id: str = Depends(get_actor_user_id)):
    return escrow_service.reconcile_escrow(escrow_id, actor_user_id)
