"use client";

/** Last-resort boundary for errors thrown in the root layout itself. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: 24,
          background: "#eef2f1",
          color: "#16201d",
        }}
      >
        <main>
          <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>VOC Artificial Lift is unavailable</h1>
          <p style={{ margin: "0 0 16px" }}>
            The app failed to load{error.digest ? ` (reference ${error.digest})` : ""}.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#2E8B57",
              color: "#fff",
              border: 0,
              borderRadius: 6,
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
