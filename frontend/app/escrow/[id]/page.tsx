"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ChatBox from "./chat";
import { useUser } from "@clerk/nextjs";
import { cancelEscrowByPublicId } from "@/app/lib/api";
import { saveJoinToken } from "@/app/lib/joinTokenStore";

export default function EscrowRouteHubPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const publicId = String(params.id);
  const joinTokenFromUrl = searchParams.get("join_token")?.trim() ?? "";
  const { isLoaded, isSignedIn, user } = useUser();

  const [cancelBehavior, setCancelBehavior] = useState<
    "cancel_only" | "refund_sender" | "pay_recipient"
  >("cancel_only");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const role =
    typeof user?.publicMetadata?.role === "string"
      ? user.publicMetadata.role.toLowerCase()
      : "";
  const isAdmin = role === "admin";

  useEffect(() => {
    if (!joinTokenFromUrl) return;
    saveJoinToken(publicId, joinTokenFromUrl);
    router.replace(`/escrow/${encodeURIComponent(publicId)}`);
  }, [joinTokenFromUrl, publicId, router]);

  const claimHref = `/claim?public_id=${encodeURIComponent(publicId)}`;
  const senderHref = `/escrow/${encodeURIComponent(publicId)}/sender`;
  const recipientHref = `/escrow/${encodeURIComponent(publicId)}/recipient`;

  function shortSig(sig: string): string {
    if (sig.length <= 20) return sig;
    return `${sig.slice(0, 8)}...${sig.slice(-8)}`;
  }

  async function handleAdminCancel() {
    if (!isSignedIn) {
      setActionError("Sign in is required for admin settlement actions.");
      return;
    }
    if (!isAdmin) {
      setActionError("Admin role is required for settlement actions.");
      return;
    }
    setActionLoading(true);
    setActionError(null);
    setActionNotice(null);
    try {
      let settlement: "none" | "refund_sender" | "pay_recipient" = "none";
      if (cancelBehavior === "refund_sender") settlement = "refund_sender";
      if (cancelBehavior === "pay_recipient") settlement = "pay_recipient";
      const result = await cancelEscrowByPublicId(publicId, settlement);
      if (settlement === "pay_recipient" && result.refund_signature) {
        setActionNotice(`Escrow terminated and paid to recipient: ${shortSig(result.refund_signature)}`);
      } else if (settlement === "refund_sender" && result.refund_signature) {
        setActionNotice(`Escrow cancelled and refunded to sender: ${shortSig(result.refund_signature)}`);
      } else if (settlement === "pay_recipient") {
        setActionNotice("Escrow terminated.");
      } else if (settlement === "refund_sender") {
        setActionNotice("Escrow cancelled.");
      } else {
        setActionNotice("Escrow cancelled without payout.");
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Cancel action failed.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen text-white flex items-center justify-center px-4">
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/backgroundStars.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="relative z-10 w-full max-w-xl bg-neutral-900/60 backdrop-blur border border-neutral-800 rounded-2xl p-6">
        <h1 className="text-2xl font-bold">Escrow Route Hub</h1>
        <p className="text-sm text-neutral-400 mt-2">
          Public ID: <span className="font-mono text-neutral-200">{publicId}</span>
        </p>
        <p className="text-sm text-neutral-400 mt-1">
          Continue through the shared claim page, then each user goes to sender or recipient workspace.
        </p>

        <div className="mt-5 grid gap-2">
          <Link
            href={claimHref}
            className="w-full text-center bg-indigo-600 hover:bg-indigo-500 rounded-lg px-3 py-2 text-sm transition-colors"
          >
            Open Shared Claim Page
          </Link>
          <Link
            href={senderHref}
            className="w-full text-center bg-neutral-800/70 hover:bg-neutral-700 rounded-lg px-3 py-2 text-sm transition-colors"
          >
            Open Sender Workspace
          </Link>
          <Link
            href={recipientHref}
            className="w-full text-center bg-neutral-800/70 hover:bg-neutral-700 rounded-lg px-3 py-2 text-sm transition-colors"
          >
            Open Recipient Workspace
          </Link>
        </div>

        <section className="mt-6 border-t border-neutral-800 pt-5">
          <h2 className="text-lg font-semibold">Admin Settlement Controls</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Per-transaction cancellation is managed here for admins.
          </p>

          {actionError ? (
            <div className="mt-3 bg-red-950/40 border border-red-800/30 rounded-lg p-3">
              <p className="text-sm text-red-300">{actionError}</p>
            </div>
          ) : null}
          {actionNotice ? (
            <div className="mt-3 bg-emerald-950/30 border border-emerald-800/30 rounded-lg p-3">
              <p className="text-sm text-emerald-300">{actionNotice}</p>
            </div>
          ) : null}

          <div className="mt-4 grid gap-2 text-sm">
            <label className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/70 px-3 py-2">
              <input
                type="radio"
                name="cancel-behavior"
                checked={cancelBehavior === "cancel_only"}
                onChange={() => setCancelBehavior("cancel_only")}
              />
              <span>Cancel only (no payout)</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/70 px-3 py-2">
              <input
                type="radio"
                name="cancel-behavior"
                checked={cancelBehavior === "refund_sender"}
                onChange={() => setCancelBehavior("refund_sender")}
              />
              <span>Return to sender</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/70 px-3 py-2">
              <input
                type="radio"
                name="cancel-behavior"
                checked={cancelBehavior === "pay_recipient"}
                onChange={() => setCancelBehavior("pay_recipient")}
              />
              <span>Terminate and send to recipient</span>
            </label>
          </div>

          <button
            onClick={handleAdminCancel}
            disabled={actionLoading || !isLoaded || !isSignedIn || !isAdmin}
            className="mt-3 w-full text-center bg-amber-700 hover:bg-amber-600 disabled:opacity-50 rounded-lg px-3 py-2 text-sm"
          >
            {actionLoading ? "Applying..." : "Apply Admin Settlement Action"}
          </button>

          {!isLoaded ? (
            <p className="text-xs text-neutral-500 mt-2">Checking authentication...</p>
          ) : !isSignedIn ? (
            <p className="text-xs text-yellow-300 mt-2">Sign in as admin to use these controls.</p>
          ) : !isAdmin ? (
            <p className="text-xs text-yellow-300 mt-2">Your account is not an admin account.</p>
          ) : (
            <p className="text-xs text-neutral-500 mt-2">Admin mode enabled.</p>
          )}
        </section>
      </div>
      <ChatBox publicId={publicId} isDisputed />
    </div>
  );
}
