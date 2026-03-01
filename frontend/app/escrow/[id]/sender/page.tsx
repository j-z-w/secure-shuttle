"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  checkTransactionStatus,
  getBalance,
  getEscrowByPublicId,
  getEscrowTransactions,
  getEscrowRatingState,
  openDispute,
  releaseFundsByPublicId,
  submitEscrowRating,
  syncFunding,
} from "@/app/lib/api";
import ChatBox from "../chat";
import type {
  BalanceResponse,
  Escrow,
  EscrowRatingStateResponse,
  EscrowTransaction,
} from "@/app/lib/types";
import EscrowStatusBadge from "@/app/components/EscrowStatusBadge";
import CopyButton from "@/app/components/CopyButton";
import TransactionStatusWheel, { type StatusStep } from "@/app/components/TransactionStatusWheel";
import { loadJoinToken, saveJoinToken } from "@/app/lib/joinTokenStore";

const AUTO_SCAN_FAST_MS = 5_000;
const AUTO_SCAN_SLOW_MS = 15_000;
const TX_STATUS_CHECK_COOLDOWN_MS = 8_000;
const TERMINAL_ESCROW_STATUSES = new Set(["released", "cancelled"]);
const COMPLETION_NOTICE_SEEN_KEY = "ss_completion_notice_seen";

function autoScanIntervalMs(escrow: Escrow | null): number {
  if (!escrow) return AUTO_SCAN_FAST_MS;
  if (!escrow.funded_at) return AUTO_SCAN_FAST_MS;
  if (escrow.status === "release_pending" || escrow.status === "refund_pending") {
    return AUTO_SCAN_FAST_MS;
  }
  return AUTO_SCAN_SLOW_MS;
}

function qrUrl(text: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(
    text
  )}`;
}

function formatSol(lamports: number | null | undefined): string {
  if (!lamports || lamports <= 0) return "0";
  return (lamports / 1_000_000_000).toFixed(6);
}

function shortSig(sig: string): string {
  if (sig.length <= 20) return sig;
  return `${sig.slice(0, 8)}...${sig.slice(-8)}`;
}

function normalizedTxStatus(status: string | null | undefined): "pending" | "confirmed" | "failed" | "waiting" {
  if (!status) return "waiting";
  const s = status.toLowerCase();
  if (s.includes("fail") || s.includes("err")) return "failed";
  if (s === "confirmed" || s === "finalized" || s === "released") return "confirmed";
  if (s === "pending" || s === "processed" || s === "not_found" || s.includes("pending")) return "pending";
  return "waiting";
}

function latestReleaseTransaction(transactions: EscrowTransaction[]): EscrowTransaction | null {
  const releases = transactions.filter((tx) => tx.tx_type === "release");
  releases.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
  return releases[0] ?? null;
}

function latestDepositTransaction(transactions: EscrowTransaction[]): EscrowTransaction | null {
  const deposits = transactions.filter((tx) => tx.tx_type === "deposit");
  deposits.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
  return deposits[0] ?? null;
}

export default function SenderEscrowPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const publicId = String(params.id);
  const joinTokenFromUrl = searchParams.get("join_token")?.trim() ?? "";
  const { isLoaded, isSignedIn, user } = useUser();
  const actorUserId = user?.id ?? "";

  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [lastScanAt, setLastScanAt] = useState<string | null>(null);

  const [joinToken, setJoinToken] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [showTechnicalIds, setShowTechnicalIds] = useState(false);
  const [joinTokenReady, setJoinTokenReady] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [ratingState, setRatingState] = useState<EscrowRatingStateResponse | null>(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingNotice, setRatingNotice] = useState<string | null>(null);

  const scanInFlightRef = useRef(false);
  const lastTxStatusCheckAtRef = useRef(0);
  const previousStatusRef = useRef<string | null>(null);

  useEffect(() => {
    const token = joinTokenFromUrl || loadJoinToken(publicId);
    if (token) {
      setJoinToken(token);
      saveJoinToken(publicId, token);
    } else {
      setJoinToken("");
    }
    if (joinTokenFromUrl) {
      router.replace(`/escrow/${encodeURIComponent(publicId)}/sender`);
    }
    setJoinTokenReady(true);
  }, [joinTokenFromUrl, publicId, router]);

  const fetchEscrowCore = useCallback(async (syncFundingState = false): Promise<Escrow> => {
    const token = joinToken.trim();
    try {
      const current = await getEscrowByPublicId(publicId);
      if (!syncFundingState) {
        return current;
      }
      if (
        TERMINAL_ESCROW_STATUSES.has(current.status) ||
        current.status === "disputed" ||
        current.funded_at
      ) {
        return current;
      }
      try {
        const synced = await syncFunding(publicId, token ? { join_token: token } : {});
        return synced.escrow;
      } catch {
        return current;
      }
    } catch (directErr) {
      if (!token) throw directErr;
      const synced = await syncFunding(publicId, { join_token: token });
      return synced.escrow;
    }
  }, [joinToken, publicId]);

  const fetchBalanceAndTransactions = useCallback(
    async (escrowId: string) => {
      const [balRes, txRes] = await Promise.all([
        getBalance(escrowId).catch(() => null),
        getEscrowTransactions(escrowId).catch(() => [] as EscrowTransaction[]),
      ]);
      setBalance(balRes);
      setTransactions(txRes);

      const latestRelease = latestReleaseTransaction(txRes);
      if (!latestRelease) return txRes;

      const latestState = normalizedTxStatus(latestRelease.status);
      if (latestState === "pending" || latestState === "waiting") {
        const now = Date.now();
        if (now - lastTxStatusCheckAtRef.current < TX_STATUS_CHECK_COOLDOWN_MS) {
          return txRes;
        }
        lastTxStatusCheckAtRef.current = now;
        await checkTransactionStatus(latestRelease.signature, escrowId).catch(() => null);
        const refreshedTx = await getEscrowTransactions(escrowId).catch(() => txRes);
        setTransactions(refreshedTx);
        return refreshedTx;
      }
      return txRes;
    },
    []
  );

  const loadEscrow = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEscrowCore(false);
      setEscrow(data);
      setError(null);
      await fetchBalanceAndTransactions(data.id);
      setLastScanAt(new Date().toISOString());
    } catch (err) {
      setEscrow(null);
      setBalance(null);
      setTransactions([]);
      setError(err instanceof Error ? err.message : "Failed to load escrow");
    } finally {
      setLoading(false);
    }
  }, [fetchBalanceAndTransactions, fetchEscrowCore]);

  const scanChain = useCallback(
    async (manual = false) => {
      if (scanInFlightRef.current && !manual) return;
      scanInFlightRef.current = true;
      if (manual) setScanLoading(true);
      try {
      const data = await fetchEscrowCore(true);
      setEscrow(data);
      await fetchBalanceAndTransactions(data.id);
      setLastScanAt(new Date().toISOString());
      if (manual) setActionError(null);
      } catch (err) {
        if (manual) setActionError(err instanceof Error ? err.message : "Chain scan failed");
      } finally {
        scanInFlightRef.current = false;
        if (manual) setScanLoading(false);
      }
    },
    [fetchBalanceAndTransactions, fetchEscrowCore]
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    if (!joinTokenReady) return;
    void loadEscrow();
  }, [isLoaded, isSignedIn, joinTokenReady, loadEscrow]);

  useEffect(() => {
    const runScan = () => {
      if (document.visibilityState !== "visible") return;
      if (
        escrow &&
        (TERMINAL_ESCROW_STATUSES.has(escrow.status) || escrow.status === "disputed")
      ) {
        return;
      }
      void scanChain(false);
    };

    if (!isLoaded || !isSignedIn || !joinTokenReady) return;
    const intervalMs = autoScanIntervalMs(escrow);

    const timer = window.setInterval(runScan, intervalMs);
    document.addEventListener("visibilitychange", runScan);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", runScan);
    };
  }, [escrow, scanChain, isLoaded, isSignedIn, joinTokenReady]);

  const withAction = useCallback(async (name: string, fn: () => Promise<void>) => {
    setActionLoading(name);
    setActionError(null);
    setActionNotice(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setActionLoading(null);
    }
  }, []);

  const actorIsSender = escrow?.payer_user_id === actorUserId;
  const actorDisplayName =
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Signed-in account";
  const minimumRequiredLamports =
    escrow?.expected_amount_lamports && escrow.expected_amount_lamports > 0
      ? escrow.expected_amount_lamports
      : 1;
  const hasFundingBalance = (balance?.balance_lamports ?? 0) >= minimumRequiredLamports;
  const latestDepositTx = latestDepositTransaction(transactions);
  const fundingConfirmed = !!escrow?.funded_at;
  const serviceProvided = !!escrow?.service_marked_complete_at;
  const latestReleaseTx = latestReleaseTransaction(transactions);
  const releaseTxState = normalizedTxStatus(latestReleaseTx?.status);
  const releaseSubmitted = !!latestReleaseTx || !!escrow?.settled_signature;
  const releaseConfirmed =
    escrow?.status === "released" || releaseTxState === "confirmed" || !!escrow?.settled_signature;
  const releaseFailed = releaseTxState === "failed";
  const recipientReceived = releaseConfirmed;
  const depositUri = useMemo(() => {
    if (!escrow?.public_key) return "";
    const expected = escrow.expected_amount_lamports;
    if (!expected || expected <= 0) {
      return `solana:${escrow.public_key}`;
    }
    const amount = (expected / 1_000_000_000).toFixed(9).replace(/\.?0+$/, "");
    return `solana:${escrow.public_key}?amount=${amount}`;
  }, [escrow?.expected_amount_lamports, escrow?.public_key]);

  const summaryStatus = useMemo(() => {
    if (!escrow) return "Loading";
    if (escrow.status === "disputed") return "Disputed";
    if (!hasFundingBalance && !fundingConfirmed && !latestDepositTx) return "Waiting For Funding";
    if ((hasFundingBalance || latestDepositTx) && !fundingConfirmed) {
      return "Funding Detected";
    }
    if (fundingConfirmed && !serviceProvided) {
      return "Funding Confirmed On-Chain";
    }
    if (serviceProvided && !releaseSubmitted) return "Service Provided - Waiting For Release";
    if (releaseFailed) return "Release Failed";
    if (releaseSubmitted && !releaseConfirmed) return "Release Pending On-Chain";
    if (recipientReceived) return "Recipient Received";
    return "Waiting";
  }, [
    escrow,
    fundingConfirmed,
    hasFundingBalance,
    latestDepositTx,
    recipientReceived,
    releaseConfirmed,
    releaseFailed,
    releaseSubmitted,
    serviceProvided,
  ]);

  const progressSteps: StatusStep[] = useMemo(
    () => [
      {
        label: "Waiting For Funding",
        state: !hasFundingBalance && !fundingConfirmed && !latestDepositTx ? "current" : "done",
      },
      {
        label: "Funding Detected",
        state: hasFundingBalance || fundingConfirmed || !!latestDepositTx ? "done" : "todo",
        detail: latestDepositTx
          ? `Tx ${shortSig(latestDepositTx.signature)} - ${latestDepositTx.status}`
          : balance
          ? `${balance.balance_sol} SOL in escrow wallet`
          : undefined,
      },
      {
        label: "Funding Confirmed On-Chain",
        state:
          fundingConfirmed ? "done" : hasFundingBalance || !!latestDepositTx ? "current" : "todo",
      },
      {
        label: "Service Provided",
        state: serviceProvided ? "done" : fundingConfirmed ? "current" : "todo",
      },
      {
        label: "Release Pending On-Chain",
        state: releaseFailed
          ? "error"
          : releaseConfirmed
          ? "done"
          : releaseSubmitted
          ? "current"
          : serviceProvided
          ? "todo"
          : "todo",
        detail: latestReleaseTx
          ? `Tx ${shortSig(latestReleaseTx.signature)} - ${latestReleaseTx.status}`
          : undefined,
      },
      {
        label: "Recipient Received",
        state: recipientReceived ? "done" : releaseSubmitted ? "current" : "todo",
      },
    ],
    [
      balance,
      fundingConfirmed,
      hasFundingBalance,
      latestDepositTx,
      latestReleaseTx,
      recipientReceived,
      releaseConfirmed,
      releaseFailed,
      releaseSubmitted,
      serviceProvided,
    ]
  );

  const loadRatingState = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    try {
      const next = await getEscrowRatingState(publicId);
      setRatingState(next);
      if (next.my_rating) {
        setRatingScore(next.my_rating.score);
        setRatingComment(next.my_rating.comment ?? "");
      }
      setRatingError(null);
    } catch (err) {
      setRatingError(err instanceof Error ? err.message : "Failed to load rating state.");
    }
  }, [isLoaded, isSignedIn, publicId]);

  useEffect(() => {
    if (!escrow) return;
    const status = escrow.status;
    const terminal = TERMINAL_ESCROW_STATUSES.has(status);
    const previous = previousStatusRef.current;
    const wasTerminal = previous ? TERMINAL_ESCROW_STATUSES.has(previous) : false;

    if (terminal && !wasTerminal) {
      const noticeKey = `${COMPLETION_NOTICE_SEEN_KEY}:${publicId}:${status}`;
      const seen = typeof window !== "undefined" && window.sessionStorage.getItem(noticeKey) === "1";
      if (!seen) {
        setShowCompletionModal(true);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(noticeKey, "1");
        }
      }
    }
    previousStatusRef.current = status;
  }, [escrow, publicId]);

  useEffect(() => {
    if (!escrow || !TERMINAL_ESCROW_STATUSES.has(escrow.status)) return;
    if (!isLoaded || !isSignedIn) return;
    void loadRatingState();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadRatingState();
      }
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [escrow, isLoaded, isSignedIn, loadRatingState]);

  async function handleSubmitRating() {
    if (!ratingState?.can_rate) {
      setRatingError("You can only rate once the escrow is completed.");
      return;
    }
    setRatingLoading(true);
    setRatingError(null);
    setRatingNotice(null);
    try {
      await submitEscrowRating(publicId, {
        score: ratingScore,
        comment: ratingComment.trim() || undefined,
      });
      setRatingNotice("Rating submitted.");
      await loadRatingState();
    } catch (err) {
      setRatingError(err instanceof Error ? err.message : "Failed to submit rating.");
    } finally {
      setRatingLoading(false);
    }
  }

  async function handleRelease() {
    if (!actorUserId) {
      setActionError("You must be signed in to release funds.");
      return;
    }
    await withAction("release", async () => {
      await releaseFundsByPublicId(publicId);
      setActionNotice("Release submitted.");
      void scanChain(false);
    });
  }

  async function handleDispute() {
    if (!actorUserId) {
      setActionError("You must be signed in to open a dispute.");
      return;
    }
    await withAction("dispute", async () => {
      const token = joinToken.trim();
      if (!token) throw new Error("Join token is required to open a dispute.");
      const data = await openDispute(publicId, {
        join_token: token,
        reason: disputeReason.trim() || undefined,
      });
      setEscrow(data);
      setActionNotice("Dispute opened.");
      void scanChain(false);
    });
  }

  return (
    <div className="min-h-screen bg-[#1d1d1d] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sender Workspace</h1>
            <p className="text-sm text-neutral-400 mt-1">
              Escrow: <span className="font-mono text-neutral-300">{publicId}</span>
            </p>
          </div>
          {escrow ? <EscrowStatusBadge status={escrow.status} /> : null}
        </div>

        {(error || actionError) && (
          <div className="bg-red-950/40 border border-red-800/30 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-300">{actionError ?? error}</p>
          </div>
        )}

        {actionNotice && (
          <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-lg p-4 mb-4">
            <p className="text-sm text-emerald-300">{actionNotice}</p>
          </div>
        )}

        {isLoaded && !isSignedIn && (
          <div className="bg-yellow-950/40 border border-yellow-800/30 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-300">Sign in with Clerk to perform sender actions.</p>
          </div>
        )}

        {!actorIsSender && escrow && (
          <div className="bg-yellow-950/40 border border-yellow-800/30 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-300">
              Current actor is not the sender for this escrow. Sender actions may fail.
            </p>
          </div>
        )}

        <TransactionStatusWheel
          title="Transaction Progress"
          summaryLabel="Current Status"
          summaryValue={summaryStatus}
          steps={progressSteps}
        />

        <section className="bg-neutral-900 rounded-xl p-5 border border-neutral-800 mt-4 mb-4">
          <h2 className="text-lg font-semibold mb-3">Your Account</h2>
          <div className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2">
            <span className="text-sm text-neutral-200 truncate flex-1">
              {actorUserId ? actorDisplayName : isLoaded ? "Not signed in" : "Loading..."}
            </span>
            <button
              onClick={() => setShowTechnicalIds((prev) => !prev)}
              className="bg-neutral-700 hover:bg-neutral-600 rounded-lg px-3 py-2 text-xs"
            >
              {showTechnicalIds ? "Hide IDs" : "Show IDs"}
            </button>
          </div>
          {showTechnicalIds ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-neutral-500">User ID</span>
              <span className="text-xs text-neutral-300 font-mono truncate flex-1">{actorUserId || "-"}</span>
              {actorUserId ? <CopyButton value={actorUserId} /> : null}
            </div>
          ) : null}
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={loadEscrow}
              className="bg-neutral-800 hover:bg-neutral-700 rounded-lg px-3 py-2 text-sm"
            >
              {loading ? "Syncing..." : "Sync Now"}
            </button>
            <span className="text-xs text-neutral-500">
              {escrow?.status === "disputed"
                ? "Auto-sync paused during dispute"
                : `Auto-sync every ${Math.round(autoScanIntervalMs(escrow) / 1000)}s`}
            </span>
          </div>
          {showTechnicalIds ? (
            <div className="mt-2">
              <label className="block text-xs text-neutral-500 mb-1">Join Token (advanced)</label>
              <input
                value={joinToken}
                onChange={(e) => {
                  const next = e.target.value;
                  setJoinToken(next);
                  saveJoinToken(publicId, next);
                }}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-[#0070f3]"
                placeholder="Join token"
              />
            </div>
          ) : null}
        </section>

        <div className="grid lg:grid-cols-2 gap-4">
          <section className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
            <h2 className="text-lg font-semibold mb-3">Funding Monitor</h2>
            <div className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2">
              <span className="text-xs text-neutral-200 font-mono truncate flex-1">
                {escrow?.public_key ?? "-"}
              </span>
              {escrow?.public_key ? <CopyButton value={escrow.public_key} /> : null}
            </div>
            <p className="text-sm text-neutral-400 mt-2">
              Expected amount:{" "}
              <span className="font-mono text-neutral-200">
                {formatSol(escrow?.expected_amount_lamports)} SOL
              </span>
            </p>
            <p className="text-sm text-neutral-400 mt-1">
              Current balance:{" "}
              <span className="font-mono text-neutral-200">
                {balance ? `${balance.balance_sol} SOL` : "-"}
              </span>
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <a
                href={
                  escrow?.public_key
                    ? `https://explorer.solana.com/address/${encodeURIComponent(
                        escrow.public_key
                      )}?cluster=devnet`
                    : "#"
                }
                target="_blank"
                rel="noreferrer"
                className={`px-3 py-2 rounded-lg text-sm ${
                  escrow?.public_key
                    ? "bg-neutral-800 hover:bg-neutral-700"
                    : "bg-neutral-900 text-neutral-600 pointer-events-none"
                }`}
              >
                Open In Devnet Explorer
              </a>
              <button
                onClick={() => scanChain(true)}
                disabled={scanLoading}
                className="bg-[#0070f3] hover:bg-[#005bc4] disabled:opacity-50 rounded-lg px-3 py-2 text-sm"
              >
                {scanLoading ? "Scanning..." : "Scan Chain Now"}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              {escrow?.status === "disputed"
                ? "Auto-scanning paused during dispute"
                : `Auto-scanning every ${Math.round(autoScanIntervalMs(escrow) / 1000)}s`}
              {lastScanAt ? ` - Last scan ${new Date(lastScanAt).toLocaleTimeString()}` : ""}
            </p>
          </section>

          <section className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
            <h2 className="text-lg font-semibold mb-3">Payment QR</h2>
            {depositUri ? (
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                <Image
                  src={qrUrl(depositUri)}
                  alt="Deposit payment QR code"
                  width={224}
                  height={224}
                  unoptimized
                  className="w-56 h-56 rounded bg-white mx-auto"
                />
                <p className="text-xs text-neutral-500 mt-2 font-mono break-all">{depositUri}</p>
              </div>
            ) : (
              <p className="text-sm text-neutral-600">Escrow address not available yet.</p>
            )}
            <div className="mt-3 flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2">
              <span className="text-xs text-neutral-200 font-mono truncate flex-1">
                {escrow?.public_key ?? "-"}
              </span>
              {escrow?.public_key ? <CopyButton value={escrow.public_key} /> : null}
            </div>
          </section>

          <section className="bg-neutral-900 rounded-xl p-5 border border-neutral-800 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-3">Escrow Info</h2>
            <div className="grid sm:grid-cols-2 gap-y-2 text-sm">
              <p className="text-neutral-500">Sender</p>
              <p className="text-right">
                {escrow?.payer_user_id
                  ? escrow.payer_user_id === actorUserId
                    ? "You (Sender)"
                    : "Sender account claimed"
                  : "Unclaimed"}
              </p>
              <p className="text-neutral-500">Recipient</p>
              <p className="text-right">{escrow?.payee_user_id ? "Recipient account claimed" : "Unclaimed"}</p>
              <p className="text-neutral-500">Deposit Wallet</p>
              <div className="flex items-center justify-end gap-2">
                <span className="font-mono text-right truncate">{escrow?.public_key ?? "-"}</span>
                {escrow?.public_key ? <CopyButton value={escrow.public_key} /> : null}
              </div>
              <p className="text-neutral-500">Payout Address</p>
              <p className="font-mono text-right">{escrow?.recipient_address ?? "-"}</p>
              <p className="text-neutral-500">Current Balance</p>
              <p className="font-mono text-right">{balance ? `${balance.balance_sol} SOL` : "-"}</p>
            </div>
            {showTechnicalIds ? (
              <div className="mt-4 grid sm:grid-cols-2 gap-y-2 text-xs border-t border-neutral-800 pt-3">
                <p className="text-neutral-500">Sender User ID</p>
                <div className="flex items-center justify-end gap-2">
                  <span className="font-mono truncate">{escrow?.payer_user_id ?? "-"}</span>
                  {escrow?.payer_user_id ? <CopyButton value={escrow.payer_user_id} /> : null}
                </div>
                <p className="text-neutral-500">Recipient User ID</p>
                <div className="flex items-center justify-end gap-2">
                  <span className="font-mono truncate">{escrow?.payee_user_id ?? "-"}</span>
                  {escrow?.payee_user_id ? <CopyButton value={escrow.payee_user_id} /> : null}
                </div>
              </div>
            ) : null}
          </section>

          <section className="bg-neutral-900 rounded-xl p-5 border border-neutral-800 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-3">Release</h2>
            <button
              onClick={handleRelease}
              disabled={actionLoading !== null}
              className="w-full rounded-lg px-3 py-2 text-sm disabled:opacity-50 bg-[#0a8458] hover:bg-[#076e49]"
            >
              {actionLoading === "release" ? "Releasing..." : "Release Funds"}
            </button>

            <h3 className="text-sm font-semibold mt-5 mb-2">Dispute</h3>
            <input
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0070f3]"
            />
            <button
              onClick={handleDispute}
              disabled={actionLoading !== null}
              className="mt-2 w-full rounded-lg px-3 py-2 text-sm disabled:opacity-50 bg-red-900 hover:bg-red-800"
            >
              {actionLoading === "dispute" ? "Submitting..." : "Open Dispute"}
            </button>
            <p className="text-xs text-neutral-500 mt-4">
              Escrow cancellation and settlement controls are handled on the admin route hub.
            </p>
          </section>

          {escrow && TERMINAL_ESCROW_STATUSES.has(escrow.status) ? (
            <section id="deal-review" className="bg-neutral-900 rounded-xl p-5 border border-neutral-800 lg:col-span-2">
              <h2 className="text-lg font-semibold mb-2">Deal Review</h2>
              <p className="text-sm text-neutral-400">
                This escrow is {escrow.status === "released" ? "released" : "cancelled"}.
                Sender and recipient can rate each other.
              </p>

              {ratingError ? (
                <div className="bg-red-950/40 border border-red-800/30 rounded-lg p-3 mt-3">
                  <p className="text-sm text-red-300">{ratingError}</p>
                </div>
              ) : null}
              {ratingNotice ? (
                <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-lg p-3 mt-3">
                  <p className="text-sm text-emerald-300">{ratingNotice}</p>
                </div>
              ) : null}

              {ratingState?.my_rating ? (
                <div className="mt-3">
                  <p className="text-sm text-neutral-300">Your rating for recipient:</p>
                  <p className="text-yellow-300 text-lg mt-1">
                    {"★★★★★".slice(0, ratingState.my_rating.score)}
                    {"☆☆☆☆☆".slice(0, 5 - ratingState.my_rating.score)}
                  </p>
                  {ratingState.my_rating.comment ? (
                    <p className="text-sm text-neutral-400 mt-1">{ratingState.my_rating.comment}</p>
                  ) : null}
                </div>
              ) : ratingState?.can_rate ? (
                <div className="mt-3">
                  <p className="text-sm text-neutral-300">Rate recipient:</p>
                  <div className="flex items-center gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRatingScore(value)}
                        className={`text-2xl leading-none ${
                          value <= ratingScore ? "text-yellow-300" : "text-neutral-600"
                        }`}
                      >
                        {value <= ratingScore ? "★" : "☆"}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    maxLength={1000}
                    placeholder="Optional feedback"
                    className="mt-3 w-full min-h-20 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0070f3]"
                  />
                  <button
                    onClick={handleSubmitRating}
                    disabled={ratingLoading}
                    className="mt-3 bg-[#0070f3] hover:bg-[#005bc4] disabled:opacity-50 rounded-lg px-3 py-2 text-sm"
                  >
                    {ratingLoading ? "Submitting..." : "Submit Rating"}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-neutral-500 mt-3">
                  Ratings are available only to the sender and recipient once the escrow is complete.
                </p>
              )}

              {ratingState?.received_rating ? (
                <div className="mt-5 border-t border-neutral-800 pt-3">
                  <p className="text-sm text-neutral-300">Recipient&apos;s rating for you:</p>
                  <p className="text-yellow-300 text-lg mt-1">
                    {"★★★★★".slice(0, ratingState.received_rating.score)}
                    {"☆☆☆☆☆".slice(0, 5 - ratingState.received_rating.score)}
                  </p>
                  {ratingState.received_rating.comment ? (
                    <p className="text-sm text-neutral-400 mt-1">{ratingState.received_rating.comment}</p>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <div className="text-center mt-6">
          <Link
            href={`/claim?public_id=${encodeURIComponent(publicId)}`}
            className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Back To Claim Page
          </Link>
        </div>
        <ChatBox
          publicId={publicId}
          isDisputed={escrow?.status === "disputed"}
          payerUserId={escrow?.payer_user_id}
          payeeUserId={escrow?.payee_user_id}
        />

        {showCompletionModal && escrow && TERMINAL_ESCROW_STATUSES.has(escrow.status) ? (
          <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-xl p-5">
              <h3 className="text-xl font-semibold">Escrow Complete</h3>
              <p className="text-sm text-neutral-300 mt-2">
                This escrow has been {escrow.status === "released" ? "released" : "cancelled"}.
                You can now submit a review for the recipient.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                {ratingState?.can_rate && !ratingState.my_rating ? (
                  <button
                    onClick={() => {
                      setShowCompletionModal(false);
                      const section = document.getElementById("deal-review");
                      section?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="px-3 py-2 rounded-lg bg-[#0070f3] hover:bg-[#005bc4] text-sm"
                  >
                    Rate Recipient
                  </button>
                ) : null}
                <button
                  onClick={() => setShowCompletionModal(false)}
                  className="px-3 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

