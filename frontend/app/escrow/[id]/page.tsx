"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  getEscrowByPublicId,
  getBalance,
  releaseFunds,
  cancelEscrow,
  createInvite,
  acceptInvite,
  markFunded,
} from "@/app/lib/api";
import type { Escrow, BalanceResponse } from "@/app/lib/types";
import EscrowStatusBadge from "@/app/components/EscrowStatusBadge";
import CopyButton from "@/app/components/CopyButton";

// Hardcoded to match api.ts — in prod this comes from auth
const CURRENT_USER_ID = "dev-user-1";

function truncateAddress(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function EscrowDetailPage() {
  const params = useParams();
  const publicId = params.id as string;

  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Invite state
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  const isPayer = escrow?.payer_user_id === CURRENT_USER_ID;
  const isPayee = escrow?.payee_user_id === CURRENT_USER_ID;
  const isParticipant = isPayer || isPayee;
  const isTerminal =
    escrow?.status === "released" || escrow?.status === "cancelled";

  const fetchEscrow = useCallback(async () => {
    try {
      const data = await getEscrowByPublicId(publicId);
      setEscrow(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load escrow");
    } finally {
      setLoading(false);
    }
  }, [publicId]);

  const fetchBalance = useCallback(async () => {
    if (!escrow) return;
    try {
      const data = await getBalance(escrow.id);
      setBalance(data);
    } catch {
      // non-critical
    }
  }, [escrow]);

  useEffect(() => {
    fetchEscrow();
  }, [fetchEscrow]);

  useEffect(() => {
    if (escrow) fetchBalance();
  }, [escrow, fetchBalance]);

  async function handleCreateInvite() {
    setActionLoading("invite");
    setActionError(null);
    try {
      const res = await createInvite(publicId);
      setInviteToken(res.invite_token);
      const link = `${window.location.origin}/escrow/${publicId}?token=${res.invite_token}`;
      setInviteLink(link);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to create invite"
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAcceptInvite() {
    // Try to get token from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token") || inviteToken;
    if (!token) {
      setActionError("No invite token found");
      return;
    }
    setActionLoading("accept");
    setActionError(null);
    try {
      await acceptInvite(token);
      await fetchEscrow();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to accept invite"
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkFunded() {
    setActionLoading("fund");
    setActionError(null);
    try {
      await markFunded(publicId);
      await fetchEscrow();
      await fetchBalance();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to mark as funded"
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRelease() {
    if (!escrow) return;
    setActionLoading("release");
    setActionError(null);
    try {
      await releaseFunds(escrow.id);
      await fetchEscrow();
      await fetchBalance();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Release failed"
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel() {
    if (!escrow) return;
    setActionLoading("cancel");
    setActionError(null);
    try {
      await cancelEscrow(escrow.id);
      await fetchEscrow();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Cancel failed"
      );
    } finally {
      setActionLoading(null);
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#1d1d1d] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-400">
          <svg className="size-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading escrow...
        </div>
      </div>
    );
  }

  // Error
  if (error || !escrow) {
    return (
      <div className="min-h-screen bg-[#1d1d1d] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Escrow not found"}</p>
          <Link href="/pay" className="text-[#0070f3] hover:text-[#339af0] text-sm">
            Create a new escrow
          </Link>
        </div>
      </div>
    );
  }

  const solAmount = escrow.expected_amount_lamports
    ? (escrow.expected_amount_lamports / 1_000_000_000).toFixed(4)
    : null;

  // Check if the viewer has an invite token in the URL (they're being invited)
  const urlToken =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token")
      : null;
  const hasInviteToken = !!urlToken;
  const isNewVisitor = !isParticipant && hasInviteToken;

  return (
    <div className="min-h-screen bg-[#1d1d1d] text-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image src="/logo.webp" alt="Secure Shuttle" width={80} height={80} className="rounded" />
        </div>

        {/* Title */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {escrow.label || "Escrow Payment"}
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Created {timeAgo(escrow.created_at)}
            </p>
          </div>
          <EscrowStatusBadge status={escrow.status} />
        </div>

        {/* Amount card */}
        <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 mb-4 text-center">
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Amount</p>
          <p className="text-3xl font-bold font-[family-name:var(--font-geist-mono)]">
            {solAmount ? `${solAmount} SOL` : "—"}
          </p>
          {escrow.expected_amount_lamports && (
            <p className="text-xs text-neutral-500 font-[family-name:var(--font-geist-mono)] mt-1">
              {escrow.expected_amount_lamports.toLocaleString()} lamports
            </p>
          )}
        </div>

        {/* ──────────────────────────────────────────────── */}
        {/* VISITOR VIEW: Accept invite */}
        {/* ──────────────────────────────────────────────── */}
        {isNewVisitor && (
          <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 mb-4">
            <h2 className="text-lg font-semibold mb-2">You&apos;ve been invited</h2>
            <p className="text-sm text-neutral-400 mb-5">
              Someone wants to send you a payment through this escrow. Accept the
              invite to join as the recipient.
            </p>

            {actionError && (
              <div className="bg-red-950/40 border border-red-800/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-300">{actionError}</p>
              </div>
            )}

            <button
              onClick={handleAcceptInvite}
              disabled={actionLoading !== null}
              className="w-full bg-[#0070f3] hover:bg-[#005bc4] disabled:bg-[#003d80] transition-colors py-3 rounded-lg font-semibold cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {actionLoading === "accept" ? "Accepting..." : "Accept Invite"}
            </button>
          </div>
        )}

        {/* ──────────────────────────────────────────────── */}
        {/* PAYER VIEW */}
        {/* ──────────────────────────────────────────────── */}
        {isPayer && (
          <>
            {/* Share / Invite */}
            {!escrow.payee_user_id && !isTerminal && (
              <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 mb-4">
                <h2 className="text-lg font-semibold mb-2">Invite Recipient</h2>
                <p className="text-sm text-neutral-400 mb-4">
                  Generate a link and send it to the person you&apos;re paying.
                </p>

                {inviteLink ? (
                  <div>
                    <p className="text-xs text-neutral-500 mb-2">Share this link:</p>
                    <div className="flex items-center gap-2 bg-neutral-800 rounded-lg p-3">
                      <span className="text-sm font-[family-name:var(--font-geist-mono)] text-neutral-200 truncate flex-1">
                        {inviteLink}
                      </span>
                      <CopyButton value={inviteLink} />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleCreateInvite}
                    disabled={actionLoading !== null}
                    className="w-full bg-[#0070f3] hover:bg-[#005bc4] disabled:bg-[#003d80] transition-colors py-3 rounded-lg font-semibold cursor-pointer disabled:cursor-not-allowed"
                  >
                    {actionLoading === "invite" ? "Generating..." : "Generate Invite Link"}
                  </button>
                )}
              </div>
            )}

            {/* Payee joined */}
            {escrow.payee_user_id && (
              <div className="bg-green-950/30 border border-green-800/30 rounded-xl p-4 mb-4 flex items-center gap-3">
                <svg className="size-5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-300">Recipient has joined the escrow</p>
              </div>
            )}

            {/* Escrow wallet + deposit info */}
            <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 mb-4">
              <h2 className="text-lg font-semibold mb-4">Escrow Wallet</h2>
              <p className="text-xs text-neutral-500 mb-2">Send SOL to this address to fund the escrow:</p>
              <div className="flex items-center gap-2 bg-neutral-800 rounded-lg p-3 mb-4">
                <span className="text-sm font-[family-name:var(--font-geist-mono)] text-neutral-200 truncate flex-1">
                  {escrow.public_key}
                </span>
                <CopyButton value={escrow.public_key} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Current Balance</p>
                  {balance ? (
                    <p className="text-xl font-bold font-[family-name:var(--font-geist-mono)]">
                      {balance.balance_sol} SOL
                    </p>
                  ) : (
                    <p className="text-neutral-600">—</p>
                  )}
                </div>
                <button
                  onClick={fetchBalance}
                  className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                >
                  Refresh
                </button>
              </div>

              {/* Mark as funded button */}
              {!escrow.funded_at && !isTerminal && escrow.payee_user_id && (
                <button
                  onClick={handleMarkFunded}
                  disabled={actionLoading !== null}
                  className="w-full mt-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-colors py-2.5 rounded-lg text-sm font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === "fund" ? "Marking..." : "Mark as Funded"}
                </button>
              )}

              {escrow.funded_at && (
                <div className="mt-3 flex items-center gap-2 text-green-400 text-xs">
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Escrow is funded
                </div>
              )}
            </div>

            {/* Release / Cancel */}
            {!isTerminal && (
              <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 mb-4">
                <h2 className="text-lg font-semibold mb-4">Actions</h2>

                {actionError && (
                  <div className="bg-red-950/40 border border-red-800/30 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-300">{actionError}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleRelease}
                    disabled={actionLoading !== null}
                    className="flex-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 transition-colors py-3 rounded-lg font-medium cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {actionLoading === "release" ? "Releasing..." : "Release Funds"}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading !== null}
                    className="flex-1 bg-red-900 hover:bg-red-800 disabled:opacity-50 transition-colors py-3 rounded-lg font-medium cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {actionLoading === "cancel" ? "Cancelling..." : "Cancel Escrow"}
                  </button>
                </div>
                <p className="text-xs text-neutral-600 mt-3 text-center">
                  Release sends SOL to the recipient. Cancel returns funds to you.
                </p>
              </div>
            )}
          </>
        )}

        {/* ──────────────────────────────────────────────── */}
        {/* PAYEE VIEW */}
        {/* ──────────────────────────────────────────────── */}
        {isPayee && (
          <>
            <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 mb-4">
              <h2 className="text-lg font-semibold mb-4">Payment Status</h2>

              <div className="space-y-4">
                {/* Step indicators */}
                <div className="space-y-3">
                  <StepRow done={!!escrow.accepted_at} label="Invite accepted" />
                  <StepRow done={!!escrow.funded_at} label="Escrow funded by payer" />
                  <StepRow
                    done={escrow.status === "released"}
                    label="Funds released to you"
                  />
                </div>

                {escrow.status === "released" && escrow.settled_signature && (
                  <div className="mt-4 pt-4 border-t border-neutral-800">
                    <p className="text-xs text-neutral-500 mb-2">Transaction Signature</p>
                    <div className="flex items-center gap-2">
                      <span className="font-[family-name:var(--font-geist-mono)] text-sm text-neutral-200 truncate">
                        {truncateAddress(escrow.settled_signature)}
                      </span>
                      <CopyButton value={escrow.settled_signature} />
                    </div>
                  </div>
                )}

                {escrow.status === "cancelled" && (
                  <div className="bg-red-950/40 border border-red-800/30 rounded-lg p-3 mt-4">
                    <p className="text-sm text-red-300">This escrow has been cancelled by the payer.</p>
                  </div>
                )}

                {!isTerminal && !escrow.funded_at && (
                  <p className="text-sm text-neutral-400 mt-2">
                    Waiting for the payer to fund the escrow...
                  </p>
                )}

                {!isTerminal && escrow.funded_at && escrow.status !== "release_pending" && (
                  <p className="text-sm text-neutral-400 mt-2">
                    Escrow is funded. Waiting for the payer to release...
                  </p>
                )}

                {escrow.status === "release_pending" && (
                  <p className="text-sm text-yellow-300 mt-2">
                    Release is in progress...
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Settled signature (visible to all) */}
        {isTerminal && escrow.settled_signature && isPayer && (
          <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 mb-4">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Transaction Signature</p>
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--font-geist-mono)] text-sm text-neutral-200 truncate">
                {truncateAddress(escrow.settled_signature)}
              </span>
              <CopyButton value={escrow.settled_signature} />
            </div>
          </div>
        )}

        {/* Failure reason */}
        {escrow.failure_reason && (
          <div className="bg-red-950/40 border border-red-800/30 rounded-lg p-4 mb-4">
            <p className="text-xs text-red-400 uppercase tracking-wider mb-1">Error</p>
            <p className="text-sm text-red-300">{escrow.failure_reason}</p>
          </div>
        )}

        {/* Back link */}
        <div className="text-center mt-8">
          <Link
            href="/pay"
            className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Create another escrow
          </Link>
        </div>
      </div>
    </div>
  );
}

function StepRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`size-6 rounded-full flex items-center justify-center shrink-0 ${
          done ? "bg-green-700" : "bg-neutral-700"
        }`}
      >
        {done ? (
          <svg className="size-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <div className="size-2 rounded-full bg-neutral-500" />
        )}
      </div>
      <span className={`text-sm ${done ? "text-white" : "text-neutral-500"}`}>
        {label}
      </span>
    </div>
  );
}
