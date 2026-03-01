"use client";

import Image from "next/image";
import { useUser, SignOutButton } from "@clerk/nextjs";
import ZigZag from './instructions';
//homepage
export default function Home() {
  const { user } = useUser();
  console.log(user?.publicMetadata?.role);
  return (
    <main
      style={{
        minHeight: "200vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          minHeight: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 0,
            backgroundImage: "url('/backgroundStars.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* Top-right buttons */}
        <div
          style={{
            position: "absolute",
            top: "1.5rem",
            right: "1.5rem",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          {!user && (
            <a href="/signin">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sign-in.svg"
                alt="Sign In"
                style={{ height: "2.5rem", display: "block" }}
              />
            </a>
          )}

          <a href="/newEscrow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/create-new-escrow.svg"
              alt="Create New Escrow"
              style={{ height: "2.5rem", display: "block" }}
            />
          </a>

          {user?.publicMetadata?.role === "admin" && (
            <a href="/dashboard">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/dashboard.svg"
                alt="Dashboard"
                style={{ height: "2.5rem", display: "block" }}
              />
            </a>
          )}

          <SignOutButton>
            <button
              className="cursor-pointer"
              style={{ background: "none", border: "none", padding: 0 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/log_out.webp"
                alt="Log Out"
                style={{ height: "2.5rem", display: "block" }}
              />
            </button>
          </SignOutButton>
        </div>

        {/* Centered logo + description */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div className="mb-8 flex items-center gap-3">
            <Image
              src="/logo.webp"
              alt="Logo"
              width={500}
              height={500}
              className="rounded"
              priority
            />
          </div>
          <p
            style={{
              fontSize: "1.2rem",
              color: "#f5f5f5",
              marginBottom: "2rem",
              maxWidth: 500,
              textAlign: "center",
              textShadow: "0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            SecureShuttle is the safer way to handle peer-to-peer transactions. Sending money to a stranger and hoping for the best is a gamble no one should have to take, so SecureShuttle holds payments in escrow on the Solana blockchain until both parties confirm everything went as agreed. Fast, transparent, and fully protected, it ensures that buyers get what they paid for and sellers get paid for what they deliver.
          </p>
        </div>
      </div>
      <div
        style={{
          minHeight: "100vh",
          width: "100vw",
          backgroundImage: "url('/backgroundLower.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      
    </main>
  );
}
