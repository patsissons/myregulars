"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          fontFamily: "system-ui, sans-serif",
          background: "#fbfbfa",
          color: "#111",
          padding: 24,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Something went wrong.</p>
        <p style={{ fontSize: 13, color: "#6b6b6b", margin: 0 }}>{error.message}</p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 8,
            padding: "8px 16px",
            borderRadius: 10,
            border: "1px solid rgba(15,15,15,0.16)",
            background: "transparent",
            fontSize: 13,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
