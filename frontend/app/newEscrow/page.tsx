export default function NewEscrow() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f6fa",
      }}
    >
      <h1 style={{ fontSize: "2.2rem", color: "#222", marginBottom: "1.5rem" }}>
        Create New Escrow
      </h1>
      <p
        style={{
          color: "#555",
          marginBottom: "2rem",
          maxWidth: 500,
          textAlign: "center",
        }}
      >
        Fill out the form below to start a new escrow transaction.
      </p>
      {/* Placeholder for escrow form */}
      <form
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          minWidth: 320,
        }}
      >
        <input
          type="text"
          placeholder="Recipient"
          style={{
            padding: "0.75rem",
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />
        <input
          type="number"
          placeholder="Amount"
          style={{
            padding: "0.75rem",
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />
        <textarea
          placeholder="Description"
          style={{
            padding: "0.75rem",
            borderRadius: 6,
            border: "1px solid #ccc",
            minHeight: 80,
          }}
        />
        <button
          type="submit"
          style={{
            padding: "0.75rem",
            background: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
            fontSize: "1rem",
          }}
        >
          Create Escrow
        </button>
      </form>
    </main>
  );
}
