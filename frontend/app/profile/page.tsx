"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import BackButton from "@/app/components/BackButton";
import ProfileImageUpload from "@/app/components/ProfileImageUpload";
import { getEscrowRatingState, listEscrows } from "@/app/lib/api";
import type { Escrow } from "@/app/lib/types";

const TERMINAL_STATUSES = new Set(["released", "cancelled"]);
const ESCROW_PAGE_SIZE = 100;
const RATING_FETCH_CONCURRENCY = 6;

type DealHistoryRow = {
  escrow: Escrow;
  receivedScore: number | null;
};

function formatSol(lamports: number | null | undefined): string {
  if (!lamports || lamports <= 0) return "-";
  return `${(lamports / 1_000_000_000).toFixed(4)} SOL`;
}

function formatDate(value: string): string {
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return "-";
  return new Date(ts).toLocaleString();
}

function roleForDeal(escrow: Escrow, userId: string): string {
  const isSender = escrow.payer_user_id === userId;
  const isRecipient = escrow.payee_user_id === userId;
  if (isSender && isRecipient) return "Sender + Recipient";
  if (isSender) return "Sender";
  if (isRecipient) return "Recipient";
  if (escrow.creator_user_id === userId) return "Creator";
  return "Participant";
}

function outcomeForDeal(escrow: Escrow): string {
  if (escrow.status === "released") return "Released";
  if (escrow.status === "cancelled") return "Cancelled";
  return escrow.status;
}

function dealTimestampMs(escrow: Escrow): number {
  const updated = Date.parse(escrow.updated_at);
  if (!Number.isNaN(updated)) return updated;
  const created = Date.parse(escrow.created_at);
  if (!Number.isNaN(created)) return created;
  return 0;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const out: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      out[current] = await worker(items[current]);
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length)) },
    () => runWorker(),
  );
  await Promise.all(workers);
  return out;
}

async function fetchAllMineEscrows(): Promise<Escrow[]> {
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  const results: Escrow[] = [];

  while (offset < total) {
    const page = await listEscrows(undefined, "mine", {
      limit: ESCROW_PAGE_SIZE,
      offset,
    });
    total = page.total;
    if (!page.items.length) break;
    results.push(...page.items);
    offset += page.items.length;
  }

  const uniqueById = new Map<string, Escrow>();
  for (const escrow of results) {
    uniqueById.set(escrow.id, escrow);
  }
  return Array.from(uniqueById.values());
}

export default function ProfilePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dealRows, setDealRows] = useState<DealHistoryRow[]>([]);
  const [reviewAverage, setReviewAverage] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);

  const actorUserId = user?.id ?? "";
  const displayName =
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "User";

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/signin");
      return;
    }
    if (!actorUserId) return;

    let cancelled = false;
    setLoadingDeals(true);
    setLoadError(null);

    async function loadHistoryAndRatings() {
      try {
        const allMine = await fetchAllMineEscrows();
        const terminalDeals = allMine
          .filter((escrow) => TERMINAL_STATUSES.has(escrow.status))
          .sort((a, b) => dealTimestampMs(b) - dealTimestampMs(a));

        const rows = await mapWithConcurrency(
          terminalDeals,
          RATING_FETCH_CONCURRENCY,
          async (escrow): Promise<DealHistoryRow> => {
            try {
              const ratingState = await getEscrowRatingState(escrow.public_id);
              return {
                escrow,
                receivedScore: ratingState.received_rating?.score ?? null,
              };
            } catch {
              return { escrow, receivedScore: null };
            }
          },
        );

        if (cancelled) return;

        const receivedScores = rows
          .map((row) => row.receivedScore)
          .filter((score): score is number => typeof score === "number");

        const avg =
          receivedScores.length > 0
            ? receivedScores.reduce((sum, score) => sum + score, 0) /
              receivedScores.length
            : null;

        setDealRows(rows);
        setReviewCount(receivedScores.length);
        setReviewAverage(avg);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof Error
            ? err.message
            : "Failed to load profile history.",
        );
      } finally {
        if (!cancelled) {
          setLoadingDeals(false);
        }
      }
    }

    void loadHistoryAndRatings();
    return () => {
      cancelled = true;
    };
  }, [actorUserId, isLoaded, isSignedIn, router]);

  const reviewScoreLabel = useMemo(() => {
    if (reviewAverage == null) return "No ratings yet";
    return `${reviewAverage.toFixed(2)} / 5`;
  }, [reviewAverage]);

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white px-6 pt-24 pb-12">
        <div className="max-w-5xl mx-auto text-sm text-neutral-400">
          Loading profile...
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white px-6 pt-24 pb-12">
        <div className="max-w-5xl mx-auto text-sm text-neutral-400">
          Redirecting to sign in...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-6 pt-24 pb-12">
      <div className="max-w-5xl mx-auto mb-4">
        <BackButton fallbackHref="/dashboard" />
      </div>

      <div className="max-w-5xl mx-auto rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-lg">
        <h1 className="text-3xl font-semibold mb-6">Profile</h1>

        <div className="flex items-center gap-4 mb-8">
          <ProfileImageUpload currentImageUrl={user?.imageUrl ?? ""} />
          <div>
            <p className="text-lg font-medium">{displayName}</p>
            <p className="text-neutral-400 text-sm">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Completed Deals
            </p>
            <p className="text-2xl font-semibold mt-1">{dealRows.length}</p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Review Score
            </p>
            <p className="text-2xl font-semibold mt-1">{reviewScoreLabel}</p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Ratings Received
            </p>
            <p className="text-2xl font-semibold mt-1">{reviewCount}</p>
          </div>
        </div>

        <section className="rounded-lg border border-neutral-800 bg-neutral-950">
          <div className="px-4 py-3 border-b border-neutral-800">
            <h2 className="text-lg font-semibold">Past Deals</h2>
            <p className="text-sm text-neutral-400 mt-1">
              Date, amount, your role, and final outcome.
            </p>
          </div>

          {loadError ? (
            <div className="m-4 rounded-lg border border-red-800/30 bg-red-950/30 p-3">
              <p className="text-sm text-red-300">{loadError}</p>
            </div>
          ) : null}

          {loadingDeals ? (
            <div className="px-4 py-6 text-sm text-neutral-400">
              Loading deal history...
            </div>
          ) : dealRows.length === 0 ? (
            <div className="px-4 py-6 text-sm text-neutral-400">
              No completed deals yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-neutral-400">
                  <tr className="border-b border-neutral-800">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Outcome</th>
                    <th className="px-4 py-3 font-medium">Escrow</th>
                  </tr>
                </thead>
                <tbody>
                  {dealRows.map((row) => (
                    <tr
                      key={row.escrow.id}
                      className="border-b border-neutral-800/70 last:border-b-0"
                    >
                      <td className="px-4 py-3 text-neutral-200">
                        {formatDate(row.escrow.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-neutral-200 font-mono">
                        {formatSol(row.escrow.expected_amount_lamports)}
                      </td>
                      <td className="px-4 py-3 text-neutral-200">
                        {roleForDeal(row.escrow, actorUserId)}
                      </td>
                      <td className="px-4 py-3 text-neutral-200">
                        {outcomeForDeal(row.escrow)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-neutral-200 font-mono">
                          {row.escrow.public_id}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
