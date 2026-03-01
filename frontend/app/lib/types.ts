export type EscrowStatus =
  | "open"
  | "roles_pending"
  | "roles_claimed"
  | "funded"
  | "service_complete"
  | "disputed"
  | "release_pending"
  | "released"
  | "cancelled"
  | "active"
  | "refund_pending";

export interface Escrow {
  id: string;
  public_id: string;
  public_key: string;
  label: string | null;
  recipient_address: string | null;
  sender_address: string | null;
  expected_amount_lamports: number | null;
  status: EscrowStatus;
  creator_user_id: string;
  payer_user_id: string | null;
  payee_user_id: string | null;
  sender_claimed_at: string | null;
  recipient_claimed_at: string | null;
  invite_expires_at: string | null;
  accepted_at: string | null;
  funded_at: string | null;
  service_marked_complete_at: string | null;
  disputed_at: string | null;
  dispute_reason: string | null;
  finalize_nonce: number;
  settled_signature: string | null;
  failure_reason: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  join_token?: string | null;
  claim_link?: string | null;
}

export interface EscrowListResponse {
  total: number;
  items: Escrow[];
}

export interface BalanceResponse {
  public_key: string;
  balance_lamports: number;
  balance_sol: number;
}

export interface ReleaseResponse {
  signature: string;
  from_address: string;
  to_address: string;
  amount_lamports: number;
  status: string;
  commitment_target: string | null;
}

export interface CancelResponse {
  cancelled: boolean;
  refund_signature: string | null;
  escrow: Escrow;
}

export interface CreateEscrowPayload {
  label?: string;
  sender_address?: string;
  recipient_address?: string;
  expected_amount_lamports?: number;
}

export interface InviteResponse {
  escrow_public_id: string;
  invite_token: string;
  expires_at: string;
}

export interface ClaimRolePayload {
  role: "sender" | "recipient";
  join_token: string;
}

export interface RecipientAddressPayload {
  join_token: string;
  recipient_address: string;
}

export interface FundingSyncPayload {
  join_token?: string;
}

export interface FundingSyncResponse {
  escrow: Escrow;
  balance_lamports: number;
  funded: boolean;
  funding_transaction_signature?: string | null;
  funding_transaction_status?: string | null;
  funding_transaction_confirmed?: boolean;
  minimum_required_lamports?: number | null;
}

export interface ServiceCompletePayload {
  join_token: string;
}

export interface DisputePayload {
  join_token: string;
  reason?: string;
}

export interface EscrowTransaction {
  id: string;
  escrow_id: string;
  signature: string;
  tx_type: string;
  amount_lamports: number | null;
  from_address: string | null;
  to_address: string | null;
  status: string;
  intent_hash: string | null;
  commitment_target: string | null;
  last_valid_block_height: number | null;
  rpc_endpoint: string | null;
  raw_error: string | null;
  memo: string | null;
  recorded_at: string;
}

export interface TransactionStatusResponse {
  signature: string;
  status: string;
  slot: number | null;
  confirmations: number | null;
  err: string | null;
}
