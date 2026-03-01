"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { claimRole, syncFunding } from "@/app/lib/api";
import { loadJoinToken, saveJoinToken } from "@/app/lib/joinTokenStore";
import type { Escrow } from "@/app/lib/types";
import CopyButton from "@/app/components/CopyButton";

const AUTO_REFRESH_INTERVAL_MS = 15_000;

export default function ClaimRolePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const publicId = searchParams.get("public_id")?.trim() ?? "";
  const rawJoinToken = searchParams.get("join_token")?.trim() ?? "";
  const searchParamsString = searchParams.toString();
  const { isLoaded, isSignedIn, user } = useUser();
  const actorUserId = user?.id ?? "";

  const [origin, setOrigin] = useState("");
  const [joinToken, setJoinToken] = useState("");
  const [hashJoinToken, setHashJoinToken] = useState("");
  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [loadingState, setLoadingState] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"sender" | "recipient" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showTechnicalIds, setShowTechnicalIds] = useState(false);
  const refreshInFlightRef = useRef(false);
  const authRetryScheduledRef = useRef(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const hashToken = hashParams.get("join_token")?.trim() ?? "";
    if (hashToken) {
      setHashJoinToken(hashToken);
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`
      );
    }
  }, []);

  useEffect(() => {
    if (!publicId) return;
    const token = rawJoinToken || hashJoinToken || loadJoinToken(publicId);
    if (token) {
      setJoinToken(token);
      saveJoinToken(publicId, token);
    } else {
      setJoinToken("");
    }

    if (rawJoinToken) {
      const qs = new URLSearchParams(searchParamsString);
      qs.delete("join_token");
      const next = qs.toString();
      router.replace(next ? `/claim?${next}` : "/claim");
    }
  }, [hashJoinToken, publicId, rawJoinToken, router, searchParamsString]);

  const refreshClaimState = useCallback(async (silent = false) => {
    if (!publicId || !joinToken || !isLoaded || !isSignedIn) return;
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    if (!silent) {
      setLoadingState(true);
    }
    try {
      const data = await syncFunding(publicId, { join_token: joinToken });
      setEscrow(data.escrow);
      setStateError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load claim state";
      const isAuthBootstrapRace =
        silent && message.toLowerCase().includes("authentication required");

      if (isAuthBootstrapRace) {
        // On shared-link/new-tab loads Clerk user state can be ready before JWT minting.
        // Treat this as transient and retry shortly without flashing a red banner.
        if (!authRetryScheduledRef.current && document.visibilityState === "visible") {
          authRetryScheduledRef.current = true;
          window.setTimeout(() => {
            authRetryScheduledRef.current = false;
            void refreshClaimState(true);
          }, 900);
        }
      } else {
        setStateError(message);
      }
    } finally {
      refreshInFlightRef.current = false;
      if (!silent) {
        setLoadingState(false);
      }
    }
  }, [isLoaded, isSignedIn, joinToken, publicId]);

  useEffect(() => {
    if (!publicId || !joinToken || !isLoaded || !isSignedIn) return;
    const runRefresh = () => {
      if (document.visibilityState === "visible") {
        void refreshClaimState(true);
      }
    };

    runRefresh();
    const timer = window.setInterval(runRefresh, AUTO_REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", runRefresh);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", runRefresh);
    };
  }, [isLoaded, isSignedIn, joinToken, publicId, refreshClaimState]);

  const sharedClaimLink = useMemo(() => {
    if (!origin || !publicId || !joinToken) return "";
    return `${origin}/claim?public_id=${encodeURIComponent(publicId)}#join_token=${encodeURIComponent(
      joinToken
    )}`;
  }, [joinToken, origin, publicId]);

  const senderClaimedBy = escrow?.payer_user_id ?? null;
  const recipientClaimedBy = escrow?.payee_user_id ?? null;
  const actorIsSender = senderClaimedBy === actorUserId;
  const actorIsRecipient = recipientClaimedBy === actorUserId;
  const actorDisplayName =
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Signed-in account";

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
    router.push(`/escrow/${encodeURIComponent(publicId)}/${role}`);
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
    <div className="relative min-h-screen text-white">
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/backgroundStars.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="bg-neutral-900/60 backdrop-blur rounded-2xl p-6 border border-neutral-800 mb-4">
          <h1 className="text-2xl font-bold tracking-tight">Claim Role</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Both users open this same link, then claim sender or recipient. Claimed roles lock.
          </p>
        </div>

        {(!publicId || !joinToken) && (
          <div className="bg-red-950/40 border border-red-800/30 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-300">
              Invalid claim session. Open the original claim link again to restore access.
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

        <section className="bg-neutral-900/60 backdrop-blur rounded-2xl p-5 border border-neutral-800 mb-4">
          <h2 className="text-lg font-semibold mb-3">Shared Link</h2>
          <div className="flex items-center gap-2 bg-neutral-800/70 border border-neutral-700 rounded-lg px-3 py-2">
            <span className="text-xs text-neutral-200 font-mono truncate flex-1">
              {sharedClaimLink || "Link unavailable"}
            </span>
            {sharedClaimLink && <CopyButton value={sharedClaimLink} />}
          </div>
        </section>

        <section className="bg-neutral-900/60 backdrop-blur rounded-2xl p-5 border border-neutral-800 mb-4">
          <h2 className="text-lg font-semibold mb-3">Your Account</h2>
          <div className="flex items-center gap-2 bg-neutral-800/70 border border-neutral-700 rounded-lg px-3 py-2">
            <span className="text-sm text-neutral-200 truncate flex-1">
              {actorUserId ? actorDisplayName : isLoaded ? "Not signed in" : "Loading..."}
            </span>
            <button
              onClick={() => setShowTechnicalIds((prev) => !prev)}
              className="px-3 py-2 text-xs rounded-lg bg-neutral-700 hover:bg-neutral-600"
            >
              {showTechnicalIds ? "Hide IDs" : "Show IDs"}
            </button>
            <button
              onClick={refreshClaimState}
              disabled={actionLoading !== null || loadingState || !isLoaded || !isSignedIn}
              className="px-3 py-2 text-xs rounded-lg bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50"
            >
              {loadingState ? "Syncing..." : "Sync"}
            </button>
          </div>
          {showTechnicalIds && (
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">User ID:</span>
                <span className="font-mono text-neutral-300 truncate flex-1">{actorUserId || "-"}</span>
                {actorUserId ? <CopyButton value={actorUserId} /> : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">Escrow ID:</span>
                <span className="font-mono text-neutral-300 truncate flex-1">{publicId || "-"}</span>
                {publicId ? <CopyButton value={publicId} /> : null}
              </div>
            </div>
          )}
        </section>

        <div className="grid sm:grid-cols-2 gap-4">
          <section
            className={`rounded-2xl p-5 border backdrop-blur ${
              senderLocked ? "bg-neutral-950/40 border-neutral-800 opacity-50" : "bg-neutral-900/60 border-neutral-800"
            }`}
          >
            <h3 className="text-lg font-semibold">Sender</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Claimed by:{" "}
              <span className="text-neutral-300">
                {actorIsSender ? "You" : senderClaimedBy ? "Sender account claimed" : "Unclaimed"}
              </span>
            </p>
            {showTechnicalIds && senderClaimedBy ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-neutral-500">ID:</span>
                <span className="text-xs font-mono text-neutral-300 truncate flex-1">{senderClaimedBy}</span>
                <CopyButton value={senderClaimedBy} />
              </div>
            ) : null}
            {actorIsRecipient && (
              <p className="text-xs text-yellow-300 mt-2">
                You already claimed recipient, so sender is blocked for this account.
              </p>
            )}
            <button
              onClick={() => handleClaim("sender")}
              disabled={senderDisabled}
              className="mt-4 w-full px-3 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-50 transition-colors"
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
            className={`rounded-2xl p-5 border backdrop-blur ${
              recipientLocked ? "bg-neutral-950/40 border-neutral-800 opacity-50" : "bg-neutral-900/60 border-neutral-800"
            }`}
          >
            <h3 className="text-lg font-semibold">Recipient</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Claimed by:{" "}
              <span className="text-neutral-300">
                {actorIsRecipient
                  ? "You"
                  : recipientClaimedBy
                  ? "Recipient account claimed"
                  : "Unclaimed"}
              </span>
            </p>
            {showTechnicalIds && recipientClaimedBy ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-neutral-500">ID:</span>
                <span className="text-xs font-mono text-neutral-300 truncate flex-1">{recipientClaimedBy}</span>
                <CopyButton value={recipientClaimedBy} />
              </div>
            ) : null}
            {actorIsSender && (
              <p className="text-xs text-yellow-300 mt-2">
                You already claimed sender, so recipient is blocked for this account.
              </p>
            )}
            <button
              onClick={() => handleClaim("recipient")}
              disabled={recipientDisabled}
              className="mt-4 w-full px-3 py-2 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-50 transition-colors"
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
