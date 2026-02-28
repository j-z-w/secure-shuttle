import Image from "next/image";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#1d1d1d",
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
          color: "#b5b5b5",
          marginBottom: "2rem",
          maxWidth: 500,
          textAlign: "center",
        }}
      >
        Your secure and seamless way to manage your shuttle experience. Sign in
        to get started!
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
        }}
      >
        Sign In
      </a>
    </main>
  );
}
