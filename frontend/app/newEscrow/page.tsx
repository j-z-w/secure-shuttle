"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AmountInput from "@/app/components/AmountInput";
import { createEscrow } from "@/app/lib/api";

function validateAmount(value: string): string | null {
  if (!value) return "Amount is required";
  const num = parseFloat(value);
  if (isNaN(num)) return "Enter a valid number";
  if (num <= 0) return "Amount must be greater than 0";
  return null;
}

export default function NewEscrowPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [label, setLabel] = useState("");
  const [solAmount, setSolAmount] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const lamports =
    !isNaN(parseFloat(solAmount)) && parseFloat(solAmount) > 0
      ? Math.round(parseFloat(solAmount) * 1_000_000_000)
      : 0;

  async function handleSubmit() {
    const err = validateAmount(solAmount);
    if (err) {
      setAmountError(err);
      return;
    }
    setAmountError(null);
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const escrow = await createEscrow({
        label: label.trim() || undefined,
        expected_amount_lamports: lamports,
      });
      if (escrow.join_token) {
        const qs = new URLSearchParams({
          public_id: escrow.public_id,
          join_token: escrow.join_token,
        });
        router.push(`/claim?${qs.toString()}`);
      } else {
        router.push(`/escrow/${escrow.public_id}`);
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Top Bar */}
      <header className="w-full bg-gray-800 shadow-md z-10 relative flex items-center px-6 py-3">
        {/* Logo — absolutely centered across the full header width */}
        <div className="absolute inset-x-0 flex justify-center pointer-events-none">
          <a href="/" aria-label="Home" className="pointer-events-auto">
            <img
              src="/logo.webp"
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
          </a>
        </div>

        {/* New Escrow button — pinned to the right with ml-auto */}
        <a
          href="/newEscrow"
          className="ml-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded transition relative z-10"
        >
          + New Escrow
        </a>
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
          <a
            href="/dashboard"
            className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-700 ${!sidebarOpen && "justify-center"}`}
          >
            <img
              src="/icons-overview.webp"
              alt="Overview"
              className="w-4 h-4 shrink-0 object-contain"
            />
            {sidebarOpen && "Overview"}
          </a>

          {sidebarOpen && (
            <div className="text-gray-400 uppercase text-xs mt-5 mb-2 px-3">
              Escrow
            </div>
          )}
          <a
            href="/newEscrow"
            className={`flex items-center gap-3 py-2 px-3 rounded font-semibold bg-gray-700 ${!sidebarOpen && "justify-center"}`}
          >
            <img
              src="/icons-overview.webp"
              alt="New Escrow"
              className="w-4 h-4 shrink-0 object-contain"
            />
            {sidebarOpen && "New Escrow"}
          </a>
          <a
            href="#"
            className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-700 ${!sidebarOpen && "justify-center"}`}
          >
            <img
              src="/icons-overview.webp"
              alt="Active Escrows"
              className="w-4 h-4 shrink-0 object-contain"
            />
            {sidebarOpen && "Active Escrows"}
          </a>
          <a
            href="#"
            className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-700 ${!sidebarOpen && "justify-center"}`}
          >
            <img
              src="/icons-overview.webp"
              alt="Escrow History"
              className="w-4 h-4 shrink-0 object-contain"
            />
            {sidebarOpen && "Escrow History"}
          </a>

          {sidebarOpen && (
            <div className="text-gray-400 uppercase text-xs mt-5 mb-2 px-3">
              Account
            </div>
          )}
          <a
            href="/profile"
            className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-700 ${!sidebarOpen && "justify-center"}`}
          >
            <img
              src="/icons-account.webp"
              alt="User Profile"
              className="w-4 h-4 shrink-0 object-contain"
            />
            {sidebarOpen && "User Profile"}
          </a>
          <a
            href="#"
            className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-700 ${!sidebarOpen && "justify-center"}`}
          >
            <img
              src="/icons-account.webp"
              alt="Settings"
              className="w-4 h-4 shrink-0 object-contain"
            />
            {sidebarOpen && "Settings"}
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 p-6 pt-4 ${
          sidebarOpen ? "md:ml-64" : "md:ml-16"
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center overflow-hidden">
          <div className="w-[600px] h-[400px] bg-[#0070f3]/6 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-lg mx-auto px-4 sm:px-6 py-12 sm:py-20">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.webp"
              alt="Secure Shuttle"
              width={120}
              height={120}
              className="rounded"
            />
          </div>

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Create Escrow
            </h1>
            <p className="mt-3 text-neutral-400">
              Set up a payment — you&apos;ll get a link to share with the other
              party
            </p>
          </div>

          {/* Form */}
          <div className="bg-neutral-900 rounded-xl p-6 sm:p-8 border border-neutral-800">
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-neutral-400 mb-1.5">
                  Label <span className="text-neutral-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Vancouver → Whistler shuttle"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-500 outline-none transition-colors focus:border-[#0070f3]"
                />
              </div>

              <AmountInput
                value={solAmount}
                onChange={(v) => {
                  setSolAmount(v);
                  if (amountError) setAmountError(null);
                }}
                error={amountError}
              />

              {submitError && (
                <div className="bg-red-950/40 border border-red-800/30 rounded-lg p-4">
                  <p className="text-sm text-red-300">{submitError}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-[#0070f3] hover:bg-[#005bc4] disabled:bg-[#003d80] transition-colors py-3 rounded-lg font-semibold cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="size-4 animate-spin"
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
                    Creating...
                  </>
                ) : (
                  "Create Escrow"
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
