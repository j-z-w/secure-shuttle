"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { listEscrows } from "@/app/lib/api";
import type { Escrow } from "@/app/lib/types";
import EscrowStatusBadge from "@/app/components/EscrowStatusBadge";

const ACTIVE_STATUSES = new Set([
  "open",
  "roles_pending",
  "roles_claimed",
  "funded",
  "service_complete",
  "release_pending",
  "active",
  "refund_pending",
]);

const HISTORY_STATUSES = new Set(["released", "cancelled", "disputed"]);

function lamportsToSol(lamports: number) {
  return lamports / 1_000_000_000;
}

function formatTime(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatShort(value: string | null) {
  if (!value) return "-";
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function Dashboard() {
  const { isLoaded, user } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setEscrows([]);
      setError("Authentication required");
      setLoading(false);
      return;
    }

    let active = true;

    async function loadEscrows() {
      setLoading(true);
      setError(null);
      try {
        const res = await listEscrows(undefined, "all");
        if (!active) return;
        const sorted = [...res.items].sort(
          (a, b) =>
            new Date(b.updated_at ?? b.created_at).getTime() -
            new Date(a.updated_at ?? a.created_at).getTime(),
        );
        setEscrows(sorted);
      } catch (err) {
        if (!active) return;
        setEscrows([]);
        setError(
          err instanceof Error ? err.message : "Failed to load escrows.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadEscrows();

    return () => {
      active = false;
    };
  }, [isLoaded, user]);

  const activeEscrows = useMemo(
    () => escrows.filter((escrow) => ACTIVE_STATUSES.has(escrow.status)),
    [escrows],
  );
  const historyEscrows = useMemo(
    () => escrows.filter((escrow) => HISTORY_STATUSES.has(escrow.status)),
    [escrows],
  );
  const recentEscrows = useMemo(() => escrows.slice(0, 5), [escrows]);

  const pendingLamports = useMemo(
    () =>
      activeEscrows.reduce(
        (sum, escrow) => sum + (escrow.expected_amount_lamports ?? 0),
        0,
      ),
    [activeEscrows],
  );
  const releasedLamports = useMemo(
    () =>
      escrows
        .filter((escrow) => escrow.status === "released")
        .reduce(
          (sum, escrow) => sum + (escrow.expected_amount_lamports ?? 0),
          0,
        ),
    [escrows],
  );

  const uniqueCounterparties = useMemo(() => {
    const ids = new Set<string>();
    for (const escrow of escrows) {
      if (escrow.payer_user_id) ids.add(escrow.payer_user_id);
      if (escrow.payee_user_id) ids.add(escrow.payee_user_id);
    }
    return ids.size;
  }, [escrows]);

  const disputeRate = escrows.length
    ? (
        (escrows.filter((escrow) => escrow.status === "disputed").length /
          escrows.length) *
        100
      ).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Top Bar */}
      <header className="w-full bg-gray-800 shadow-md z-10 relative flex items-center px-6 py-3">
        {/* Logo — absolutely centered across the full header width */}
        <div className="absolute inset-x-0 flex justify-center pointer-events-none">
          <Link href="/" aria-label="Home" className="pointer-events-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.webp"
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
          </Link>
        </div>

        {/* New Escrow button — pinned to the right with ml-auto */}
        <Link href="/newEscrow" className="ml-auto relative z-10">
          <img
            src="/create-new-escrow.svg"
            alt="New Escrow"
            className="h-9 object-contain"
          />
        </Link>
      </header>

      {/* Sidebar */}
      <aside
        className={`z-20 fixed top-0 left-0 h-screen bg-gray-800 transition-all duration-300 flex-shrink-0 p-4 ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        <div className="flex items-center gap-2 mb-6">
          <button
            className="text-gray-400 hover:text-white focus:outline-none"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Toggle sidebar"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          {sidebarOpen && (
            <span className="text-lg font-bold tracking-tight truncate">
              My Account
            </span>
          )}
        </div>

        <nav className="space-y-1">
          {sidebarOpen && (
            <div className="text-gray-400 uppercase text-xs mb-2 px-3">
              Dashboards
            </div>
          )}
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 py-2 px-3 rounded font-semibold bg-gray-700 ${!sidebarOpen && "justify-center"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons-overview.webp"
              alt="Overview"
              className="w-4 h-4 shrink-0 object-contain"
            />
            {sidebarOpen && "Overview"}
          </Link>

          {sidebarOpen && (
            <div className="text-gray-400 uppercase text-xs mt-5 mb-2 px-3">
              Escrow
            </div>
          )}
          <Link
            href="/newEscrow"
            className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-700 ${!sidebarOpen && "justify-center"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons-escrow.webp"
              alt="New Escrow"
              className="w-4 h-4 shrink-0 object-contain"
            />
            {sidebarOpen && "New Escrow"}
          </Link>
          <Link
            href="/escrows?scope=all"
            className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-700 ${!sidebarOpen && "justify-center"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons-escrow.webp"
              alt="Escrows"
              className="w-4 h-4 shrink-0 object-contain"
            />
            {sidebarOpen && "Escrows"}
          </Link>

          {sidebarOpen && (
            <div className="text-gray-400 uppercase text-xs mt-5 mb-2 px-3">
              Account
            </div>
          )}
          <Link
            href="/profile"
            className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-700 ${!sidebarOpen && "justify-center"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons-user.webp"
              alt="User Profile"
              className="w-4 h-4 shrink-0 object-contain"
            />
            {sidebarOpen && "User Profile"}
          </Link>
          <Link
            href="/settings"
            className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-700 ${!sidebarOpen && "justify-center"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons-settings.webp"
              alt="Settings"
              className="w-4 h-4 shrink-0 object-contain"
            />
            {sidebarOpen && "Settings"}
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 p-6 pt-4 ${
          sidebarOpen ? "md:ml-64" : "md:ml-16"
        }`}
      >
        {/* Page Title */}
        <h1 className="text-xl font-bold mb-4 text-gray-100">
          Dashboard Overview
        </h1>

        {error && (
          <div className="mb-4 rounded border border-red-800 bg-red-900/30 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="bg-gray-800 rounded-lg p-4 flex flex-col">
            <div className="text-gray-400 text-xs uppercase mb-1">
              Available Balance
            </div>
            <div className="text-2xl font-bold text-green-400">
              {lamportsToSol(releasedLamports).toFixed(4)} SOL
            </div>
            <div className="text-gray-500 text-xs mt-1">Released escrows</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 flex flex-col">
            <div className="text-gray-400 text-xs uppercase mb-1">
              Pending in Escrow
            </div>
            <div className="text-2xl font-bold text-yellow-400">
              {lamportsToSol(pendingLamports).toFixed(4)} SOL
            </div>
            <div className="text-gray-500 text-xs mt-1">Awaiting release</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 flex flex-col">
            <div className="text-gray-400 text-xs uppercase mb-1">
              Active Escrows
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {activeEscrows.length}
            </div>
            <div className="text-gray-500 text-xs mt-1">In progress</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 flex flex-col">
            <div className="text-gray-400 text-xs uppercase mb-1">
              Completed
            </div>
            <div className="text-2xl font-bold text-gray-100">
              {
                historyEscrows.filter((escrow) => escrow.status === "released")
                  .length
              }
            </div>
            <div className="text-gray-500 text-xs mt-1">All time</div>
          </div>
        </div>

        {/* Balance chart + Active escrows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <div className="bg-gray-800 rounded-lg p-5 col-span-2">
            <div className="font-semibold mb-1 text-gray-200">
              Transaction History
            </div>
            <div className="text-xs text-gray-500 mb-3">Balance over time</div>
            <div className="h-36 flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded">
              {loading
                ? "Loading..."
                : `${escrows.length} total escrows tracked in this account`}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-5">
            <div className="font-semibold mb-1 text-gray-200">
              Active Escrows
            </div>
            <div className="text-xs text-gray-500 mb-3">
              Currently in progress
            </div>
            <div className="h-36 overflow-y-auto text-sm border border-dashed border-gray-700 rounded p-2">
              {loading ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  Loading...
                </div>
              ) : activeEscrows.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No active escrows
                </div>
              ) : (
                <div className="space-y-2">
                  {activeEscrows.slice(0, 4).map((escrow) => (
                    <Link
                      key={escrow.id}
                      href={`/escrow/${escrow.public_id}`}
                      className="flex items-center justify-between rounded bg-gray-900 px-2 py-1.5 hover:bg-gray-700"
                    >
                      <span className="truncate pr-2">
                        {escrow.label || formatShort(escrow.public_id)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {lamportsToSol(
                          escrow.expected_amount_lamports ?? 0,
                        ).toFixed(3)}{" "}
                        SOL
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-gray-800 rounded-lg p-5">
            <div className="font-semibold mb-1 text-gray-200">Dispute Rate</div>
            <div className="text-xs text-gray-500 mb-3">
              Escrows flagged for dispute
            </div>
            <div className="h-28 flex items-center justify-center text-gray-300 border border-dashed border-gray-700 rounded">
              {disputeRate}% disputed
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-5">
            <div className="font-semibold mb-1 text-gray-200">
              Counterparties
            </div>
            <div className="text-xs text-gray-500 mb-3">
              Buyers & sellers by account
            </div>
            <div className="h-28 flex items-center justify-center text-gray-300 border border-dashed border-gray-700 rounded">
              {uniqueCounterparties} unique users
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-5">
            <div className="font-semibold mb-1 text-gray-200">
              Recent Activity
            </div>
            <div className="text-xs text-gray-500 mb-3">
              Latest escrow events
            </div>
            <div className="h-28 overflow-y-auto border border-dashed border-gray-700 rounded p-2">
              {loading ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  Loading...
                </div>
              ) : recentEscrows.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No recent activity
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {recentEscrows.map((escrow) => (
                    <div
                      key={escrow.id}
                      className="flex items-center justify-between gap-2 rounded bg-gray-900 px-2 py-1.5"
                    >
                      <span className="truncate">
                        {escrow.label || formatShort(escrow.public_id)}
                      </span>
                      <EscrowStatusBadge status={escrow.status} />
                      <span className="text-gray-400">
                        {formatTime(escrow.updated_at ?? escrow.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
