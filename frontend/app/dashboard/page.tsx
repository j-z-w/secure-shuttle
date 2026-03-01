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

function safeLamports(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return value;
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

function dateKey(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function dateLabelFromKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const { isLoaded, user } = useUser();
  const userRole =
    typeof user?.publicMetadata?.role === "string"
      ? user.publicMetadata.role.toLowerCase()
      : "";
  const isAdmin = userRole === "admin";
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredHistoryIndex, setHoveredHistoryIndex] = useState<number | null>(null);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
        const res = await listEscrows(undefined, isAdmin ? "all" : "mine");
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
  }, [isAdmin, isLoaded, user]);

  const activeEscrows = useMemo(
    () => escrows.filter((escrow) => ACTIVE_STATUSES.has(escrow.status)),
    [escrows],
  );
  const historyEscrows = useMemo(
    () => escrows.filter((escrow) => HISTORY_STATUSES.has(escrow.status)),
    [escrows],
  );
  const recentEscrows = useMemo(() => escrows.slice(0, 5), [escrows]);

  const openDisputes = useMemo(
    () => escrows.filter((escrow) => escrow.status === "disputed").length,
    [escrows],
  );

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
  const processedLamports = useMemo(
    () =>
      escrows.reduce(
        (sum, escrow) => sum + (escrow.expected_amount_lamports ?? 0),
        0,
      ),
    [escrows],
  );

  const participantStats = useMemo(() => {
    const ids = new Set<string>();
    const activity = new Map<string, number>();
    for (const escrow of escrows) {
      if (escrow.payer_user_id) {
        ids.add(escrow.payer_user_id);
        activity.set(
          escrow.payer_user_id,
          (activity.get(escrow.payer_user_id) ?? 0) + 1,
        );
      }
      if (escrow.payee_user_id) {
        ids.add(escrow.payee_user_id);
        activity.set(
          escrow.payee_user_id,
          (activity.get(escrow.payee_user_id) ?? 0) + 1,
        );
      }
    }
    const top = Array.from(activity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const oneDeal = Array.from(activity.values()).filter((count) => count === 1)
      .length;
    const repeatDeal = Array.from(activity.values()).filter((count) => count > 1)
      .length;

    return {
      unique: ids.size,
      top,
      oneDeal,
      repeatDeal,
    };
  }, [escrows]);

  const disputeRateValue = escrows.length
    ? (openDisputes / escrows.length) * 100
    : 0;
  const disputeRate = disputeRateValue.toFixed(1);

  const historySeries = useMemo(() => {
    const days = 14;
    const now = new Date();
    const dayKeys: string[] = [];

    for (let i = days - 1; i >= 0; i -= 1) {
      const day = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i,
      );
      dayKeys.push(
        `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(
          day.getDate(),
        ).padStart(2, "0")}`,
      );
    }

    const volumeMap = new Map<string, number>(dayKeys.map((key) => [key, 0]));
    const countMap = new Map<string, number>(dayKeys.map((key) => [key, 0]));

    for (const escrow of escrows) {
      const key = dateKey(escrow.updated_at || escrow.created_at);
      if (!volumeMap.has(key)) continue;
      const escrowLamports = safeLamports(escrow.expected_amount_lamports);
      const nextVolume = (volumeMap.get(key) ?? 0) + lamportsToSol(escrowLamports);
      volumeMap.set(
        key,
        Number.isFinite(nextVolume) ? nextVolume : volumeMap.get(key) ?? 0,
      );
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    }

    const points = dayKeys.map((key) => ({
      key,
      label: dateLabelFromKey(key),
      volume: volumeMap.get(key) ?? 0,
      count: countMap.get(key) ?? 0,
    }));

    const maxVolume = Math.max(
      1,
      ...points.map((point) =>
        Number.isFinite(point.volume) && point.volume > 0 ? point.volume : 0,
      ),
    );
    const maxCount = Math.max(1, ...points.map((point) => point.count));

    return { points, maxVolume, maxCount };
  }, [escrows]);

  const historyLinePath = useMemo(() => {
    const { points, maxVolume } = historySeries;
    if (points.length < 2 || !Number.isFinite(maxVolume) || maxVolume <= 0) {
      return "";
    }
    const width = 100;
    const height = 100;
    const normalized = points.map((point, index) => {
      const clampedVolume =
        Number.isFinite(point.volume) && point.volume > 0 ? point.volume : 0;
        const x = (index / Math.max(1, points.length - 1)) * width;
      const y = height - (clampedVolume / maxVolume) * height;
      const safeY = Number.isFinite(y) ? Math.min(height, Math.max(0, y)) : height;
      return { x, y: safeY };
    });

    return normalized
      .map((point, index) => {
        return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      })
      .join(" ");
  }, [historySeries]);

  const hoveredHistoryPoint = useMemo(() => {
    if (hoveredHistoryIndex === null) return null;
    return historySeries.points[hoveredHistoryIndex] ?? null;
  }, [historySeries.points, hoveredHistoryIndex]);

  const hoveredHistoryLeftPercent = useMemo(() => {
    if (hoveredHistoryIndex === null) return 0;
    if (historySeries.points.length <= 1) return 50;
    return (hoveredHistoryIndex / (historySeries.points.length - 1)) * 100;
  }, [historySeries.points.length, hoveredHistoryIndex]);

  const topCounterpartyMax = useMemo(() => {
    if (participantStats.top.length === 0) return 1;
    return Math.max(1, ...participantStats.top.map((entry) => entry[1]));
  }, [participantStats.top]);

  return (
    <div className="relative min-h-screen text-white flex flex-col overflow-hidden">
      {/* Background — same as homepage */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/backgroundStars.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`z-20 fixed top-0 left-0 h-screen bg-neutral-900/80 backdrop-blur-lg border-r border-neutral-800 transition-all duration-300 flex-shrink-0 overflow-hidden ${
          sidebarOpen
            ? "w-64 p-4"
            : "w-0 p-0 md:w-16 md:p-4 -translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-2 mb-6">
          <button
            className="hidden md:block text-neutral-400 hover:text-white focus:outline-none"
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
            <Link href="/" className="hover:scale-105 transition-transform">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-icon.webp"
                alt="Home"
                className="h-8 w-8 object-contain"
              />
            </Link>
          )}
        </div>

        <nav className="space-y-1">
          {sidebarOpen && (
            <div className="text-neutral-500 uppercase text-xs mb-2 px-3">
              Dashboard
            </div>
          )}
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 py-2 px-3 rounded-lg font-semibold bg-indigo-600/20 border border-indigo-500/30 ${!sidebarOpen && "justify-center"}`}
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
            <div className="text-neutral-500 uppercase text-xs mt-5 mb-2 px-3">
              Escrow Activity
            </div>
          )}
          <Link
            href="/newEscrow"
            className={`flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-neutral-800/60 transition-colors ${!sidebarOpen && "justify-center"}`}
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
            href={isAdmin ? "/escrows?scope=all" : "/escrows"}
            className={`flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-neutral-800/60 transition-colors ${!sidebarOpen && "justify-center"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons-escrow.webp"
              alt="Escrow Activity"
              className="w-4 h-4 shrink-0 object-contain"
            />
            {sidebarOpen && "Escrow Activity"}
          </Link>

          {sidebarOpen && (
            <div className="text-neutral-500 uppercase text-xs mt-5 mb-2 px-3">
              Account
            </div>
          )}
          <Link
            href="/profile"
            className={`flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-neutral-800/60 transition-colors ${!sidebarOpen && "justify-center"}`}
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
            className={`flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-neutral-800/60 transition-colors ${!sidebarOpen && "justify-center"}`}
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
        className={`relative z-10 flex-1 transition-all duration-300 p-4 sm:p-6 pt-16 md:pt-4 ${
          sidebarOpen ? "md:ml-64" : "md:ml-16"
        }`}
      >
        {/* Mobile top bar */}
        <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-neutral-900/70 backdrop-blur border-b border-neutral-800 md:hidden">
          <button
            className="text-neutral-400 hover:text-white"
            onClick={() => setSidebarOpen((o) => !o)}
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
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-icon.webp"
              alt="Home"
              className="h-8 w-8 object-contain"
            />
          </Link>
          <div className="w-6" />
          {/* spacer */}
        </div>

        {/* Page Title */}
        <h1 className="text-xl font-bold mb-4 text-white">
          Dashboard Overview
        </h1>

        {error && (
          <div className="mb-4 rounded-lg border border-red-800/40 bg-red-950/40 backdrop-blur p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="bg-neutral-900/60 backdrop-blur rounded-2xl border border-neutral-800 p-4 flex flex-col">
            <div className="text-neutral-500 text-xs uppercase mb-1">
              Total Escrows
            </div>
            <div className="text-lg sm:text-2xl font-bold text-white truncate">
              {escrows.length}
            </div>
            <div className="text-neutral-600 text-xs mt-1">
              All tracked deals
            </div>
          </div>
          <div className="bg-neutral-900/60 backdrop-blur rounded-2xl border border-neutral-800 p-4 flex flex-col">
            <div className="text-neutral-500 text-xs uppercase mb-1">
              In Progress
            </div>
            <div className="text-lg sm:text-2xl font-bold text-indigo-400 truncate">
              {activeEscrows.length}
            </div>
            <div className="text-neutral-600 text-xs mt-1">
              Open workflows
            </div>
          </div>
          <div className="bg-neutral-900/60 backdrop-blur rounded-2xl border border-neutral-800 p-4 flex flex-col">
            <div className="text-neutral-500 text-xs uppercase mb-1">
              Open Disputes
            </div>
            <div className="text-lg sm:text-2xl font-bold text-amber-300 truncate">
              {openDisputes}
            </div>
            <div className="text-neutral-600 text-xs mt-1">
              Needs attention
            </div>
          </div>
          <div className="bg-neutral-900/60 backdrop-blur rounded-2xl border border-neutral-800 p-4 flex flex-col">
            <div className="text-neutral-500 text-xs uppercase mb-1">
              Locked Volume
            </div>
            <div className="text-lg sm:text-2xl font-bold text-yellow-400 truncate">
              {lamportsToSol(pendingLamports).toFixed(4)} SOL
            </div>
            <div className="text-neutral-600 text-xs mt-1">
              Value currently active
            </div>
          </div>
        </div>

        {/* Activity chart + Active escrows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <div className="bg-neutral-900/60 backdrop-blur rounded-2xl border border-neutral-800 p-5 md:col-span-2">
            <div className="font-semibold mb-1 text-white">
              Escrow Activity (Last 14 Days)
            </div>
            <div className="text-xs text-neutral-500 mb-3">
              Daily volume (line) and deal count (bars)
            </div>
            <div className="h-44 border border-dashed border-neutral-700 rounded-lg p-3">
              {loading ? (
                <div className="h-full flex items-center justify-center text-neutral-500">
                  Loading...
                </div>
              ) : historySeries.points.length === 0 ? (
                <div className="h-full flex items-center justify-center text-neutral-500">
                  No chart data yet
                </div>
              ) : (
                <div className="relative h-full flex flex-col justify-between">
                  {hoveredHistoryPoint ? (
                    <div className="pointer-events-none absolute left-0 right-0 -top-0.5 z-20">
                      <div
                        className="absolute -translate-x-1/2 -translate-y-full rounded-md border border-neutral-700 bg-neutral-900/95 px-2 py-1 text-[11px] leading-4 text-neutral-200 shadow-lg whitespace-nowrap"
                        style={{ left: `${hoveredHistoryLeftPercent}%` }}
                      >
                        <div className="font-medium text-white">{hoveredHistoryPoint.label}</div>
                        <div>{hoveredHistoryPoint.count} escrows</div>
                        <div>{hoveredHistoryPoint.volume.toFixed(3)} SOL</div>
                      </div>
                    </div>
                  ) : null}

                  <div
                    className="relative h-[112px] rounded-md bg-neutral-950/60 border border-neutral-800 px-2 pt-2 pb-1 overflow-hidden"
                    onMouseLeave={() => setHoveredHistoryIndex(null)}
                  >
                    <div className="absolute inset-x-2 bottom-1 h-[96px] flex items-end gap-1">
                      {historySeries.points.map((point, index) => (
                        <div
                          key={point.key}
                          className="flex-1 flex items-end"
                          onMouseEnter={() => setHoveredHistoryIndex(index)}
                        >
                          <div
                            className="w-full bg-indigo-500/40 rounded-sm"
                            style={{
                              height: `${Math.max(
                                6,
                                (point.count / historySeries.maxCount) * 96,
                              )}px`,
                            }}
                            title={`${point.label}: ${point.count} escrows`}
                          />
                        </div>
                      ))}
                    </div>
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute inset-2 pointer-events-none overflow-hidden"
                    >
                      {historyLinePath ? (
                        <path
                          d={historyLinePath}
                          fill="none"
                          stroke="rgb(52 211 153)"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : null}
                    </svg>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-2">
                    <span>{historySeries.points[0]?.label}</span>
                    <span>{historySeries.points[Math.floor(historySeries.points.length / 2)]?.label}</span>
                    <span>{historySeries.points[historySeries.points.length - 1]?.label}</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    14d volume:{" "}
                    <span className="text-neutral-300">
                      {historySeries.points
                        .reduce((sum, point) => sum + point.volume, 0)
                        .toFixed(3)}{" "}
                      SOL
                    </span>{" "}
                    · 14d deals:{" "}
                    <span className="text-neutral-300">
                      {historySeries.points.reduce((sum, point) => sum + point.count, 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="bg-neutral-900/60 backdrop-blur rounded-2xl border border-neutral-800 p-5">
            <div className="font-semibold mb-1 text-white">Active Escrows</div>
            <div className="text-xs text-neutral-500 mb-3">
              Currently in progress
            </div>
            <div className="h-36 overflow-y-auto text-sm border border-dashed border-neutral-700 rounded-lg p-2">
              {loading ? (
                <div className="h-full flex items-center justify-center text-neutral-500">
                  Loading...
                </div>
              ) : activeEscrows.length === 0 ? (
                <div className="h-full flex items-center justify-center text-neutral-500">
                  No active escrows
                </div>
              ) : (
                <div className="space-y-2">
                  {activeEscrows.slice(0, 4).map((escrow) => (
                    <Link
                      key={escrow.id}
                      href={`/escrow/${escrow.public_id}`}
                      className="flex items-center justify-between rounded-lg bg-neutral-800/60 px-2 py-1.5 hover:bg-neutral-700/60 transition-colors"
                    >
                      <span className="truncate pr-2">
                        {escrow.label || formatShort(escrow.public_id)}
                      </span>
                      <span className="text-xs text-neutral-400">
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
          <div className="bg-neutral-900/60 backdrop-blur rounded-2xl border border-neutral-800 p-5">
            <div className="font-semibold mb-1 text-white">Dispute Rate</div>
            <div className="text-xs text-neutral-500 mb-3">
              Escrows flagged for dispute
            </div>
            <div className="h-28 border border-dashed border-neutral-700 rounded-lg flex items-center justify-center gap-4 px-3">
              <div
                className="h-16 w-16 rounded-full"
                style={{
                  background: `conic-gradient(rgb(251 113 133) ${disputeRateValue * 3.6}deg, rgb(38 38 38) 0deg)`,
                }}
              >
                <div className="h-full w-full rounded-full scale-[0.72] bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[10px] text-neutral-300">
                  {disputeRate}%
                </div>
              </div>
              <div className="text-xs text-neutral-400 leading-5">
                <div>
                  Open disputes: <span className="text-neutral-200">{openDisputes}</span>
                </div>
                <div>
                  Total escrows: <span className="text-neutral-200">{escrows.length}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-neutral-900/60 backdrop-blur rounded-2xl border border-neutral-800 p-5">
            <div className="font-semibold mb-1 text-white">Counterparties</div>
            <div className="text-xs text-neutral-500 mb-3">
              Buyers & sellers by account
            </div>
            <div className="h-28 border border-dashed border-neutral-700 rounded-lg p-2 overflow-y-auto">
              {loading ? (
                <div className="h-full flex items-center justify-center text-neutral-500 text-xs">
                  Loading...
                </div>
              ) : participantStats.top.length === 0 ? (
                <div className="h-full flex items-center justify-center text-neutral-500 text-xs">
                  No participant data
                </div>
              ) : (
                <div className="space-y-1.5">
                  {participantStats.top.map(([id, count]) => (
                    <div key={id} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-300">{formatShort(id)}</span>
                        <span className="text-neutral-500">{count}</span>
                      </div>
                      <div className="h-1.5 rounded bg-neutral-800">
                        <div
                          className="h-full rounded bg-cyan-400/70"
                          style={{
                            width: `${Math.max(
                              12,
                              (count / topCounterpartyMax) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-[11px] text-neutral-500 mt-2">
              {participantStats.unique} unique users · {participantStats.repeatDeal} repeat
              participants
            </div>
          </div>
          <div className="bg-neutral-900/60 backdrop-blur rounded-2xl border border-neutral-800 p-5">
            <div className="font-semibold mb-1 text-white">Recent Activity</div>
            <div className="text-xs text-neutral-500 mb-3">
              Latest escrow events
            </div>
            <div className="h-28 overflow-y-auto border border-dashed border-neutral-700 rounded-lg p-2">
              {loading ? (
                <div className="h-full flex items-center justify-center text-neutral-500">
                  Loading...
                </div>
              ) : recentEscrows.length === 0 ? (
                <div className="h-full flex items-center justify-center text-neutral-500">
                  No recent activity
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {recentEscrows.map((escrow) => (
                    <div
                      key={escrow.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-neutral-800/60 px-2 py-1.5"
                    >
                      <span className="truncate">
                        {escrow.label || formatShort(escrow.public_id)}
                      </span>
                      <EscrowStatusBadge status={escrow.status} />
                      <span className="text-neutral-400">
                        {formatTime(escrow.updated_at ?? escrow.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 text-xs text-neutral-500">
          Processed volume (all statuses):{" "}
          <span className="text-neutral-300">
            {lamportsToSol(processedLamports).toFixed(3)} SOL
          </span>{" "}
          · Released volume:{" "}
          <span className="text-neutral-300">
            {lamportsToSol(releasedLamports).toFixed(3)} SOL
          </span>{" "}
          · Terminal escrows:{" "}
          <span className="text-neutral-300">{historyEscrows.length}</span>
        </div>
      </main>
    </div>
  );
}
