import type {
  Escrow,
  EscrowListResponse,
  BalanceResponse,
  ReleaseResponse,
  CancelResponse,
  CreateEscrowPayload,
  EscrowStatus,
  InviteResponse,
  ClaimRolePayload,
  RecipientAddressPayload,
  FundingSyncPayload,
  FundingSyncResponse,
  ServiceCompletePayload,
  DisputePayload,
  EscrowTransaction,
  TransactionStatusResponse,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
type ClerkUser = {
  id?: string | null;
};

type ClerkSession = {
  getToken?: () => Promise<string | null>;
};

type BrowserClerk = {
  user?: ClerkUser | null;
  session?: ClerkSession | null;
};

function getBrowserClerk(): BrowserClerk | null {
  if (typeof window === "undefined") return null;
  const win = window as Window & { Clerk?: BrowserClerk };
  return win.Clerk ?? null;
}

export function getUserId(): string {
  return getBrowserClerk()?.user?.id?.trim() ?? "";
}

// Backward-compatible no-op for legacy call sites.
export function setUserId(_id: string) {}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const clerk = getBrowserClerk();
  const userId = clerk?.user?.id?.trim();
  if (userId) {
    headers["X-User-Id"] = userId;
  }

  if (clerk?.session?.getToken) {
    try {
      const token = await clerk.session.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // If token retrieval fails, backend will reject unauthenticated calls.
    }
  }

  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      ...headers,
      ...(options?.headers as Record<string, string> | undefined),
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export async function createEscrow(
  payload: CreateEscrowPayload
): Promise<Escrow> {
  return request<Escrow>("/api/v1/escrows/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getEscrow(id: string): Promise<Escrow> {
  return request<Escrow>(`/api/v1/escrows/${id}`);
}

export async function getEscrowByPublicId(publicId: string): Promise<Escrow> {
  return request<Escrow>(`/api/v1/escrows/public/${publicId}`);
}

export async function listEscrows(
  status?: EscrowStatus
): Promise<EscrowListResponse> {
  const params = status ? `?status=${status}` : "";
  return request<EscrowListResponse>(`/api/v1/escrows/${params}`);
}

export async function getBalance(id: string): Promise<BalanceResponse> {
  return request<BalanceResponse>(`/api/v1/escrows/${id}/balance`);
}

export async function releaseFunds(
  id: string,
  recipientAddress?: string,
  amountLamports?: number,
  idempotencyKey?: string
): Promise<ReleaseResponse> {
  return request<ReleaseResponse>(`/api/v1/escrows/${id}/release`, {
    method: "POST",
    body: JSON.stringify({
      recipient_address: recipientAddress,
      amount_lamports: amountLamports,
      idempotency_key: idempotencyKey,
    }),
  });
}

export async function releaseFundsByPublicId(
  publicId: string,
  recipientAddress?: string,
  amountLamports?: number,
  idempotencyKey?: string
): Promise<ReleaseResponse> {
  return request<ReleaseResponse>(
    `/api/v1/escrows/public/${publicId}/release`,
    {
      method: "POST",
      body: JSON.stringify({
        recipient_address: recipientAddress,
        amount_lamports: amountLamports,
        idempotency_key: idempotencyKey,
      }),
    }
  );
}

export async function cancelEscrow(
  id: string,
  returnFunds = false,
  refundAddress?: string
): Promise<CancelResponse> {
  const params = new URLSearchParams();
  if (returnFunds) params.set("return_funds", "true");
  if (refundAddress) params.set("refund_address", refundAddress);
  const query = params.toString() ? `?${params}` : "";
  return request<CancelResponse>(`/api/v1/escrows/${id}${query}`, {
    method: "DELETE",
  });
}

export async function createInvite(publicId: string): Promise<InviteResponse> {
  return request<InviteResponse>(
    `/api/v1/escrows/public/${publicId}/invite`,
    { method: "POST" }
  );
}

export async function acceptInvite(inviteToken: string): Promise<Escrow> {
  return request<Escrow>("/api/v1/escrows/accept-invite", {
    method: "POST",
    body: JSON.stringify({ invite_token: inviteToken }),
  });
}

export async function markFunded(publicId: string): Promise<Escrow> {
  return request<Escrow>(`/api/v1/escrows/public/${publicId}/mark-funded`, {
    method: "POST",
  });
}

export async function claimRole(
  publicId: string,
  payload: ClaimRolePayload
): Promise<Escrow> {
  return request<Escrow>(`/api/v1/escrows/public/${publicId}/claim-role`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function setRecipientAddress(
  publicId: string,
  payload: RecipientAddressPayload
): Promise<Escrow> {
  return request<Escrow>(
    `/api/v1/escrows/public/${publicId}/recipient-address`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function syncFunding(
  publicId: string,
  payload: FundingSyncPayload = {}
): Promise<FundingSyncResponse> {
  return request<FundingSyncResponse>(
    `/api/v1/escrows/public/${publicId}/sync-funding`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function markServiceComplete(
  publicId: string,
  payload: ServiceCompletePayload
): Promise<Escrow> {
  return request<Escrow>(
    `/api/v1/escrows/public/${publicId}/service-complete`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function openDispute(
  publicId: string,
  payload: DisputePayload
): Promise<Escrow> {
  return request<Escrow>(`/api/v1/escrows/public/${publicId}/dispute`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getEscrowTransactions(
  escrowId: string
): Promise<EscrowTransaction[]> {
  return request<EscrowTransaction[]>(`/api/v1/escrows/${escrowId}/transactions`);
}

export async function checkTransactionStatus(
  signature: string,
  escrowId?: string
): Promise<TransactionStatusResponse> {
  return request<TransactionStatusResponse>("/api/v1/transactions/status", {
    method: "POST",
    body: JSON.stringify({
      signature,
      escrow_id: escrowId,
    }),
  });
}
