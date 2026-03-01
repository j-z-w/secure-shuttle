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
  DisputeMessage,
  DisputeMessageCreatePayload,
  DisputeUploadUrlResponse,
  EscrowRating,
  EscrowRatingCreatePayload,
  EscrowRatingStateResponse,
  EscrowTransaction,
  TransactionStatusResponse,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
type ClerkUser = {
  id?: string | null;
  publicMetadata?: {
    role?: unknown;
  };
};

type ClerkSession = {
  getToken?: (options?: { skipCache?: boolean }) => Promise<string | null>;
};

type BrowserClerk = {
  loaded?: boolean;
  user?: ClerkUser | null;
  session?: ClerkSession | null;
};

const CLERK_READY_WAIT_MS = 1_800;
const CLERK_RETRY_WAIT_MS = 3_500;
const CLERK_READY_POLL_MS = 50;
const TOKEN_CACHE_TTL_MS = 15_000;

let cachedToken: string | null = null;
let cachedTokenAtMs = 0;

function getCachedToken(): string | null {
  if (!cachedToken) return null;
  if (Date.now() - cachedTokenAtMs > TOKEN_CACHE_TTL_MS) {
    cachedToken = null;
    cachedTokenAtMs = 0;
    return null;
  }
  return cachedToken;
}

function setCachedToken(token: string): void {
  cachedToken = token;
  cachedTokenAtMs = Date.now();
}

function clearCachedToken(): void {
  cachedToken = null;
  cachedTokenAtMs = 0;
}

function getBrowserClerk(): BrowserClerk | null {
  if (typeof window === "undefined") return null;
  const win = window as Window & { Clerk?: BrowserClerk };
  return win.Clerk ?? null;
}

export function getUserId(): string {
  return getBrowserClerk()?.user?.id?.trim() ?? "";
}

// Backward-compatible no-op for legacy call sites.
export function setUserId(id: string) {
  void id;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForClerkReady(timeoutMs: number): Promise<BrowserClerk | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const clerk = getBrowserClerk();
    if (clerk?.loaded || clerk?.user?.id) {
      return clerk;
    }
    await sleep(CLERK_READY_POLL_MS);
  }
  return getBrowserClerk();
}

async function authHeaders(
  waitMs = CLERK_READY_WAIT_MS,
  forceFreshToken = false
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!forceFreshToken) {
    const cached = getCachedToken();
    if (cached) {
      headers.Authorization = `Bearer ${cached}`;
      return headers;
    }
  }

  const clerk = await waitForClerkReady(waitMs);
  if (clerk?.session?.getToken) {
    try {
      const token = await clerk.session.getToken(
        forceFreshToken ? { skipCache: true } : undefined
      );
      if (token) {
        setCachedToken(token);
        headers.Authorization = `Bearer ${token}`;
      } else if (forceFreshToken) {
        clearCachedToken();
      }
    } catch {
      if (forceFreshToken) {
        clearCachedToken();
      }
      // If token retrieval fails, backend will reject unauthenticated calls.
    }
  }

  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const initialAuthHeaders = await authHeaders();
  const buildInit = (auth: Record<string, string>): RequestInit => ({
    headers: {
      ...auth,
      ...(options?.headers as Record<string, string> | undefined),
    },
    cache: "no-store",
    ...options,
  });

  let res = await fetch(`${BASE}${path}`, buildInit(initialAuthHeaders));

  // New tabs can race Clerk hydration/token minting; retry once with a fresh token attempt.
  if (res.status === 401) {
    clearCachedToken();
    const retryAuthHeaders = await authHeaders(CLERK_RETRY_WAIT_MS, true);
    if (retryAuthHeaders.Authorization) {
      res = await fetch(`${BASE}${path}`, buildInit(retryAuthHeaders));
    }
  }

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
  status?: EscrowStatus,
  scope: "mine" | "all" = "mine",
  options?: { limit?: number; offset?: number }
): Promise<EscrowListResponse> {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  query.set("scope", scope);
  if (typeof options?.limit === "number") {
    query.set("limit", String(options.limit));
  }
  if (typeof options?.offset === "number") {
    query.set("offset", String(options.offset));
  }
  const params = query.toString() ? `?${query.toString()}` : "";
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
  settlement: "none" | "refund_sender" | "pay_recipient" = "none",
  payoutAddress?: string
): Promise<CancelResponse> {
  const params = new URLSearchParams();
  params.set("settlement", settlement);
  if (payoutAddress) params.set("payout_address", payoutAddress);
  const query = params.toString() ? `?${params}` : "";
  return request<CancelResponse>(`/api/v1/escrows/${id}${query}`, {
    method: "DELETE",
  });
}

export async function cancelEscrowByPublicId(
  publicId: string,
  settlement: "none" | "refund_sender" | "pay_recipient" = "none",
  payoutAddress?: string
): Promise<CancelResponse> {
  const params = new URLSearchParams();
  params.set("settlement", settlement);
  if (payoutAddress) params.set("payout_address", payoutAddress);
  const query = params.toString() ? `?${params}` : "";
  return request<CancelResponse>(`/api/v1/escrows/public/${publicId}/cancel${query}`, {
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

export async function listDisputeMessages(
  publicId: string
): Promise<DisputeMessage[]> {
  return request<DisputeMessage[]>(
    `/api/v1/escrows/public/${publicId}/dispute/messages`
  );
}

export async function createDisputeMessage(
  publicId: string,
  payload: DisputeMessageCreatePayload
): Promise<DisputeMessage> {
  return request<DisputeMessage>(
    `/api/v1/escrows/public/${publicId}/dispute/messages`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function createDisputeUploadUrl(
  publicId: string
): Promise<DisputeUploadUrlResponse> {
  return request<DisputeUploadUrlResponse>(
    `/api/v1/escrows/public/${publicId}/dispute/upload-url`,
    {
      method: "POST",
    }
  );
}

export async function getEscrowRatingState(
  publicId: string
): Promise<EscrowRatingStateResponse> {
  return request<EscrowRatingStateResponse>(
    `/api/v1/escrows/public/${publicId}/ratings`
  );
}

export async function submitEscrowRating(
  publicId: string,
  payload: EscrowRatingCreatePayload
): Promise<EscrowRating> {
  return request<EscrowRating>(`/api/v1/escrows/public/${publicId}/ratings`, {
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
