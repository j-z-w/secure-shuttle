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
      </section>
    </main>
  );
}
