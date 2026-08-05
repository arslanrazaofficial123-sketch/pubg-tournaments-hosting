"use client";

import { useEffect } from "react";

function sendReport(payload: {
  source: string;
  message: string;
  stack?: string;
  url?: string;
}) {
  const base =
    typeof window !== "undefined"
      ? window.location.hostname.includes("localhost")
        ? "http://localhost:5000/api"
        : "https://pubg-tournaments-backend.onrender.com/api"
      : null;
  if (!base) return;
  void fetch(`${base}/error-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: payload.source,
      message: payload.message,
      stack: payload.stack,
      url: payload.url || (typeof window !== "undefined" ? window.location.href : ""),
    }),
  }).catch(() => {
    // Silently ignore reporting failures.
  });
}

export function ErrorMonitor() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      sendReport({
        source: "Frontend / JS Runtime",
        message: event.message || "Unknown JS error",
        stack: event.error?.stack,
        url: event.filename || undefined,
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { message?: string; stack?: string } | Error;
      sendReport({
        source: "Frontend / Unhandled Promise",
        message: reason?.message || String(event.reason),
        stack: (reason as Error)?.stack,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}