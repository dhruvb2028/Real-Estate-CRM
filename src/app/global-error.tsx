"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches failures in the root layout itself, where the
 * normal error boundary and app chrome are unavailable. Must render its own
 * <html>/<body> and cannot rely on app styles.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

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
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          background: "#FAFAF9",
          color: "#1C1917",
        }}
      >
        <h1 style={{ fontSize: "1.4rem", fontWeight: 600, margin: 0 }}>
          The app failed to start
        </h1>
        <p style={{ margin: 0, maxWidth: 380, fontSize: "0.9rem", color: "#57534E" }}>
          Please refresh the page. If this keeps happening, contact your administrator.
        </p>
        <button
          onClick={reset}
          style={{
            minHeight: 44,
            padding: "0 1.25rem",
            borderRadius: 12,
            border: "none",
            background: "#CA8A04",
            color: "#1C1917",
            fontWeight: 600,
            fontSize: "0.95rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
