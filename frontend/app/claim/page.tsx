"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { claimRole, syncFunding } from "@/app/lib/api";
import type { Escrow } from "@/app/lib/types";
import CopyButton from "@/app/components/CopyButton";

const AUTO_REFRESH_INTERVAL_MS = 5_000;

function shortUserId(value: string | null | undefined): string {
  if (!value) return "-";
  if (value.length <= 14) return value;
  return `${value.slice(0, 7)}...${value.slice(-5)}`;
}

export default function ClaimRolePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const publicId = searchParams.get("public_id")?.trim() ?? "";
  const joinToken = searchParams.get("join_token")?.trim() ?? "";
  const { isLoaded, isSignedIn, user } = useUser();
  const actorUserId = user?.id ?? "";

  const [origin, setOrigin] = useState("");
  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [loadingState, setLoadingState] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"sender" | "recipient" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const refreshClaimState = useCallback(async () => {
    if (!publicId || !joinToken) return;
    setLoadingState(true);
    try {
      const data = await syncFunding(publicId, { join_token: joinToken });
      setEscrow(data.escrow);
      setStateError(null);
    } catch (err) {
      setStateError(err instanceof Error ? err.message : "Failed to load claim state");
    } finally {
      setLoadingState(false);
    }
  }, [joinToken, publicId]);

  useEffect(() => {
    if (!publicId || !joinToken) return;
    const runRefresh = () => {
      if (document.visibilityState === "visible") {
        void refreshClaimState();
      }
    };

    runRefresh();
    const timer = window.setInterval(runRefresh, AUTO_REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", runRefresh);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", runRefresh);
    };
  }, [joinToken, publicId, refreshClaimState]);

  const sharedClaimLink = useMemo(() => {
    if (!origin || !publicId || !joinToken) return "";
    return `${origin}/claim?public_id=${encodeURIComponent(
      publicId
    )}&join_token=${encodeURIComponent(joinToken)}`;
  }, [joinToken, origin, publicId]);

  const senderClaimedBy = escrow?.payer_user_id ?? null;
  const recipientClaimedBy = escrow?.payee_user_id ?? null;
  const actorIsSender = senderClaimedBy === actorUserId;
  const actorIsRecipient = recipientClaimedBy === actorUserId;

  const senderLocked = !!senderClaimedBy && !actorIsSender;
  const recipientLocked = !!recipientClaimedBy && !actorIsRecipient;

  const senderDisabled =
    actionLoading !== null ||
    !publicId ||
    !joinToken ||
    senderLocked ||
    actorIsRecipient ||
    !actorUserId;
  const recipientDisabled =
    actionLoading !== null ||
    !publicId ||
    !joinToken ||
    recipientLocked ||
    actorIsSender ||
    !actorUserId;

  function goToRolePage(role: "sender" | "recipient") {
    router.push(
      `/escrow/${encodeURIComponent(publicId)}/${role}?join_token=${encodeURIComponent(joinToken)}`
    );
  }

  async function handleClaim(role: "sender" | "recipient") {
    if (!actorUserId) {
      setActionError("You must be signed in to claim a role.");
      return;
    }
    if (!publicId || !joinToken) {
      setActionError("Claim link is missing required parameters.");
      return;
    }

    if ((role === "sender" && actorIsSender) || (role === "recipient" && actorIsRecipient)) {
      goToRolePage(role);
      return;
    }

    setActionLoading(role);
    setActionError(null);
    try {
      const updated = await claimRole(publicId, {
        role,
        join_token: joinToken,
      });
      setEscrow(updated);
      goToRolePage(role);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to claim role.");
      await refreshClaimState();
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#1d1d1d] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex justify-center mb-6">
          <Image src="/logo.webp" alt="Secure Shuttle" width={80} height={80} className="rounded" />
        </div>

        <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 mb-4">
          <h1 className="text-2xl font-bold tracking-tight">Claim Role</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Both users open this same link, then claim sender or recipient. Claimed roles lock.
          </p>
        </div>

        {(!publicId || !joinToken) && (
          <div className="bg-red-950/40 border border-red-800/30 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-300">
              Invalid claim link. Expected `public_id` and `join_token` query params.
            </p>
          </div>
        )}

        {stateError && (
          <div className="bg-red-950/40 border border-red-800/30 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-300">{stateError}</p>
          </div>
        )}

        {actionError && (
          <div className="bg-red-950/40 border border-red-800/30 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-300">{actionError}</p>
          </div>
        )}

        {isLoaded && !isSignedIn && (
          <div className="bg-yellow-950/40 border border-yellow-800/30 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-300">Sign in to claim a sender or recipient role.</p>
          </div>
        )}

        <section className="bg-neutral-900 rounded-xl p-5 border border-neutral-800 mb-4">
          <h2 className="text-lg font-semibold mb-3">Shared Link</h2>
          <div className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2">
            <span className="text-xs text-neutral-200 font-mono truncate flex-1">
              {sharedClaimLink || "Link unavailable"}
            </span>
            {sharedClaimLink && <CopyButton value={sharedClaimLink} />}
          </div>
        </section>

        <section className="bg-neutral-900 rounded-xl p-5 border border-neutral-800 mb-4">
          <h2 className="text-lg font-semibold mb-3">Your Account</h2>
          <div className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2">
            <span className="text-xs text-neutral-200 font-mono truncate flex-1">
              {actorUserId || (isLoaded ? "Not signed in" : "Loading...")}
            </span>
            <button
              onClick={refreshClaimState}
              disabled={actionLoading !== null || loadingState}
              className="px-3 py-2 text-xs rounded-lg bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50"
            >
              {loadingState ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            Escrow: <span className="font-mono text-neutral-300">{publicId || "-"}</span>
          </p>
        </section>

        <div className="grid sm:grid-cols-2 gap-4">
          <section
            className={`rounded-xl p-5 border ${
              senderLocked ? "bg-neutral-950 border-neutral-800 opacity-50" : "bg-neutral-900 border-neutral-800"
            }`}
          >
            <h3 className="text-lg font-semibold">Sender</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Claimed by: <span className="font-mono">{shortUserId(senderClaimedBy)}</span>
            </p>
            {actorIsRecipient && (
              <p className="text-xs text-yellow-300 mt-2">
                You already claimed recipient, so sender is blocked for this account.
              </p>
            )}
            <button
              onClick={() => handleClaim("sender")}
              disabled={senderDisabled}
              className="mt-4 w-full px-3 py-2 rounded-lg text-sm bg-[#0070f3] hover:bg-[#005bc4] disabled:opacity-50"
            >
              {actorIsSender
                ? "Continue As Sender"
                : actionLoading === "sender"
                ? "Claiming..."
                : senderLocked
                ? "Sender Already Claimed"
                : "Claim Sender"}
            </button>
          </section>

          <section
            className={`rounded-xl p-5 border ${
              recipientLocked ? "bg-neutral-950 border-neutral-800 opacity-50" : "bg-neutral-900 border-neutral-800"
            }`}
          >
            <h3 className="text-lg font-semibold">Recipient</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Claimed by: <span className="font-mono">{shortUserId(recipientClaimedBy)}</span>
            </p>
            {actorIsSender && (
              <p className="text-xs text-yellow-300 mt-2">
                You already claimed sender, so recipient is blocked for this account.
              </p>
            )}
            <button
              onClick={() => handleClaim("recipient")}
              disabled={recipientDisabled}
              className="mt-4 w-full px-3 py-2 rounded-lg text-sm bg-[#0a8458] hover:bg-[#076e49] disabled:opacity-50"
            >
              {actorIsRecipient
                ? "Continue As Recipient"
                : actionLoading === "recipient"
                ? "Claiming..."
                : recipientLocked
                ? "Recipient Already Claimed"
                : "Claim Recipient"}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
