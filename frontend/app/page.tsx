"use client";

import Image from "next/image";
import { useUser, SignOutButton } from "@clerk/nextjs";
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
            Description description description description description
            description description
          </p>
          <a
            href="/signin"
            style={{
              padding: "0.75rem 2rem",
              background: "#0070f3",
              color: "#fff",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "1rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
              marginBottom: "1rem",
              display: "inline-block",
            }}
          >
            Sign In
          </a>

          <a
            href="/newEscrow"
            style={{
              padding: "0.75rem 2rem",
              background: "#0070f3",
              color: "#fff",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "1rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
              marginBottom: "1rem",
              display: "inline-block",
            }}
          >
            Create New Escrow
          </a>

          {user?.publicMetadata?.role === "admin" && (
            <a
              href="/dashboard"
              style={{
                padding: "0.75rem 2rem",
                background: "#0070f3",
                color: "#fff",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "1rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                marginBottom: "1rem",
                display: "inline-block",
              }}
            >
              Dashboard
            </a>
          )}

          <SignOutButton>
          <button  
              style={{
                padding: "0.75rem 2rem",
                background: "#0070f3",
                color: "#fff",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "1rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                marginBottom: "1rem",
                display: "inline-block",
              }}
            >
              Log Out
            </button>
          </SignOutButton>
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
