"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { listEscrows } from "@/app/lib/api";
import type { Escrow, EscrowStatus } from "@/app/lib/types";
import EscrowCard from "@/app/components/EscrowCard";
import BackButton from "@/app/components/BackButton";

const TABS: { label: string; value: EscrowStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Roles Pending", value: "roles_pending" },
  { label: "Roles Claimed", value: "roles_claimed" },
  { label: "Funded", value: "funded" },
  { label: "Service Complete", value: "service_complete" },
  { label: "Released", value: "released" },
  { label: "Disputed", value: "disputed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function EscrowsPage() {
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn, user } = useUser();
  const statusParam = searchParams.get("status");
  const scopeParam = searchParams.get("scope");
  const initialTab =
    statusParam && TABS.some((tab) => tab.value === statusParam)
      ? (statusParam as EscrowStatus)
      : "all";
  const requestedScope = scopeParam === "all" ? "all" : "mine";
  const userRole =
    typeof user?.publicMetadata?.role === "string"
      ? user.publicMetadata.role.toLowerCase()
      : "";
  const isAdmin = userRole === "admin";
  const scope = requestedScope === "all" && isAdmin ? "all" : "mine";

  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<EscrowStatus | "all">(initialTab);
  const unauthenticated = isLoaded && !isSignedIn;

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const status = activeTab === "all" ? undefined : activeTab;
    listEscrows(status, scope)
      .then((res) => {
        setEscrows(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        setEscrows([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [activeTab, isLoaded, isSignedIn, scope]);

  return (
    <div className="min-h-screen bg-[#1d1d1d] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="mb-6">
          <BackButton fallbackHref="/dashboard" />
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.webp"
            alt="Secure Shuttle"
            width={50}
            height={50}
            className="rounded"
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Payment Escrows
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              {total} escrow{total !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-neutral-600 mt-1">
              Scope: {scope === "all" ? "All escrows" : "My escrows"}
            </p>
            {requestedScope === "all" && !isAdmin ? (
              <p className="text-xs text-amber-400 mt-1">
                Admin permissions required for all-escrow scope.
              </p>
            ) : null}
          </div>
          <Link
            href="/pay"
            className="bg-[#0070f3] hover:bg-[#005bc4] transition-colors px-5 py-2.5 rounded-lg text-sm font-medium"
          >
            + New Payment
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-neutral-800">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setLoading(true);
                setActiveTab(tab.value);
              }}
              className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === tab.value
                  ? "text-white border-b-2 border-[#0070f3]"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {unauthenticated ? (
          <div className="text-center py-20 text-neutral-500">
            Sign in to view your escrows.
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20 text-neutral-400">
            <svg
              className="size-5 animate-spin mr-3"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Loading...
          </div>
        ) : escrows.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-neutral-500 mb-4">No escrows found</p>
            <Link
              href="/pay"
              className="text-[#0070f3] hover:text-[#339af0] text-sm"
            >
              Create your first payment
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {escrows.map((escrow) => (
              <EscrowCard key={escrow.id} escrow={escrow} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
