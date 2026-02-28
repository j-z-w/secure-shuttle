export type EscrowStatus =
  | "active"
  | "release_pending"
  | "released"
  | "refund_pending"
  | "cancelled";

export interface Escrow {
  id: number;
  public_id: string;
  public_key: string;
  label: string | null;
  recipient_address: string | null;
  sender_address: string | null;
  expected_amount_lamports: number | null;
  status: EscrowStatus;
  payer_user_id: string;
  payee_user_id: string | null;
  invite_expires_at: string | null;
  accepted_at: string | null;
  funded_at: string | null;
  finalize_nonce: number;
  settled_signature: string | null;
  failure_reason: string | null;
  version: number;
  created_at: string;
  updated_at: string;
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
