"use client";

import { useEffect, useRef, useState } from "react";

interface GoogleSignInButtonProps {
  clientId: string;
  onSuccess: (credential: string) => void;
  onError?: (message: string) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

// GSI only needs initialize() once per client ID per page load.
let initializedClientId: string | null = null;
// The GSI script calls back into whatever closure initialized it, so route every
// event through the refs below to always reach the latest handlers.
let latestSuccess: (credential: string) => void = () => {};
let latestError: (message: string) => void = () => {};

function ensureInitialized(clientId: string) {
  if (initializedClientId === clientId) return;
  if (!window.google?.accounts?.id) return;

  window.google.accounts.id.initialize({
    client_id: clientId,
    ux_mode: "popup",
    auto_select: false,
    cancel_on_tap_outside: true,
    callback: (response: { credential?: string }) => {
      if (response?.credential) {
        latestSuccess(response.credential);
      } else {
        latestError("Google sign-in did not return a credential.");
      }
    },
    error_callback: (error: { type?: string }) => {
      const type = error?.type || "unknown";
      if (type === "popup_closed" || type === "user_cancel") {
        latestError("Google sign-in was closed. Please try again.");
      } else if (type === "popup_failed_to_open") {
        latestError("Your browser blocked the Google popup. Allow popups and try again.");
      } else {
        latestError(`Google sign-in failed (${type}). Please try again.`);
      }
    },
  });
  initializedClientId = clientId;
}

export function GoogleSignInButton({
  clientId,
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptError, setScriptError] = useState(false);

  latestSuccess = onSuccess;
  latestError = onError || (() => {});

  useEffect(() => {
    let cancelled = false;

    const renderButton = () => {
      const container = containerRef.current;
      if (!container || !window.google?.accounts?.id) return;

      ensureInitialized(clientId);
      // Re-rendering into the same node stacks buttons, so clear it first.
      container.innerHTML = "";
      window.google.accounts.id.renderButton(container, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "signin_with",
        width: 340,
      });
    };

    if (window.google?.accounts?.id) {
      renderButton();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", renderButton);
      return () => existing.removeEventListener("load", renderButton);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!cancelled) renderButton();
    };
    script.onerror = () => {
      if (!cancelled) setScriptError(true);
    };
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (scriptError) {
    return (
      <p className="text-xs text-red-400">
        Google sign-in failed to load. Check your connection or use email and password below.
      </p>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
}
