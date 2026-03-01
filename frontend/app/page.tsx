"use client";

import Image from "next/image";
import { useUser, SignOutButton } from "@clerk/nextjs";
import ZigZag from "./instructions";

export default function Home() {
  const { user } = useUser();

  return (
    <main className="w-screen overflow-x-hidden bg-black text-white">
      {/* ─── HERO SECTION ─── */}
      <section className="relative min-h-screen w-full flex flex-col">
        {/* Background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url('/backgroundStars.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* Nav bar */}
        <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.webp"
              alt="Secure Shuttle"
              width={40}
              height={40}
              className="rounded"
            />
            <span className="text-lg font-semibold tracking-tight hidden sm:inline">
              SecureShuttle
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!user && (
              <a
                href="/signin"
                className="hover:scale-105 transition-transform"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/sign-in.svg" alt="Sign In" className="h-11 block" />
              </a>
            )}

            {user?.publicMetadata?.role === "admin" && (
              <a
                href="/dashboard"
                className="hover:scale-105 transition-transform"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/dashboard.svg"
                  alt="Dashboard"
                  className="h-11 block"
                />
              </a>
            )}

            {user && (
              <SignOutButton>
                <button className="cursor-pointer hover:scale-105 transition-transform bg-transparent border-none p-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/log_out.webp"
                    alt="Log Out"
                    className="h-11 block"
                  />
                </button>
              </SignOutButton>
            )}

            {/* Profile picture */}
            {user && (
              <a
                href="/profile"
                className="hover:scale-105 transition-transform ml-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.imageUrl}
                  alt="Profile"
                  className="h-11 w-11 rounded-full object-cover ring-2 ring-neutral-600 hover:ring-indigo-500 transition-all"
                />
              </a>
            )}
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center gap-6 animate-fade-in">
          <Image
            src="/logo.webp"
            alt="Secure Shuttle"
            width={500}
            height={500}
            className="rounded drop-shadow-[0_0_80px_rgba(99,102,241,0.3)]"
            priority
          />

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight max-w-3xl">
            Peer-to-peer escrow,
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              powered by Solana
            </span>
          </h1>

          <p className="text-neutral-300 text-lg sm:text-xl max-w-2xl leading-relaxed">
            Stop sending money on faith. SecureShuttle holds payments in escrow
            on-chain until both parties confirm — fast, transparent, and fully
            protected.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-4">
            <a
              href="/newEscrow"
              className="hover:scale-105 transition-transform"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/create-new-escrow.svg"
                alt="Create New Escrow"
                className="h-[2.85rem] sm:h-[3.25rem] block"
              />
            </a>
            <a
              href="#features"
              className="hover:scale-105 transition-transform"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/learn%20more.svg"
                alt="Learn More"
                className="h-[2.85rem] sm:h-[3.25rem] block"
              />
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="relative z-10 flex justify-center pb-8 animate-bounce">
          <svg
            className="w-6 h-6 text-neutral-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </section>

      {/* ─── FEATURES SECTION ─── */}
      <section
        id="features"
        className="relative min-h-screen w-full"
        style={{
          backgroundImage: "url('/backgroundLower.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 py-24 sm:py-32">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Why SecureShuttle?
          </h2>
          <p className="text-neutral-400 text-center max-w-xl mx-auto mb-16 text-lg">
            Built for trust in a trustless world
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="group rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur p-8 hover:border-indigo-500/50 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center mb-5">
                <svg
                  className="w-6 h-6 text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Escrow Protection</h3>
              <p className="text-neutral-400 leading-relaxed">
                Funds are locked on-chain in a Solana escrow account. Neither
                party can withdraw until both confirm the deal is complete.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur p-8 hover:border-cyan-500/50 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-cyan-600/20 flex items-center justify-center mb-5">
                <svg
                  className="w-6 h-6 text-cyan-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
              <p className="text-neutral-400 leading-relaxed">
                Solana settles in under a second with fees under a cent. No
                waiting days for confirmation — your escrow is live instantly.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur p-8 hover:border-emerald-500/50 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center mb-5">
                <svg
                  className="w-6 h-6 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Dispute Resolution</h3>
              <p className="text-neutral-400 leading-relaxed">
                If something goes wrong, either party can raise a dispute. Funds
                stay locked until the issue is resolved fairly.
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="mt-24">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
              How It Works
            </h2>
            <p className="text-neutral-400 text-center max-w-xl mx-auto mb-16 text-lg">
              Three simple steps to a safe transaction
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-2xl font-bold text-indigo-300">
                  1
                </div>
                <h4 className="text-lg font-semibold">Create an Escrow</h4>
                <p className="text-neutral-400 text-sm max-w-xs">
                  Set the amount, add a label, and generate a shareable link for
                  your counterparty.
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center text-2xl font-bold text-cyan-300">
                  2
                </div>
                <h4 className="text-lg font-semibold">Fund & Deliver</h4>
                <p className="text-neutral-400 text-sm max-w-xs">
                  The buyer funds the escrow. The seller delivers the goods or
                  service. Everything is tracked.
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-2xl font-bold text-emerald-300">
                  3
                </div>
                <h4 className="text-lg font-semibold">Release Payment</h4>
                <p className="text-neutral-400 text-sm max-w-xs">
                  Once both parties confirm, funds are released instantly to the
                  seller&apos;s wallet.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-24 text-center">
            <a
              href="/newEscrow"
              className="inline-block px-10 py-4 rounded-full bg-indigo-600 hover:bg-indigo-500 font-semibold text-lg transition-all hover:shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:scale-105"
            >
              Get Started — It&apos;s Free
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
