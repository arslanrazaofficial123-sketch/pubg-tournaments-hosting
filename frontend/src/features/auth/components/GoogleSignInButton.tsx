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

// GSI requires initialize() once per client ID per page load. Calling it on
// every mount makes Google log "[GSI_LOGGER]: ... is called multiple times".
let initializedClientId: string | null = null;

export function GoogleSignInButton({
  clientId,
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptError, setScriptError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const renderButton = () => {
      if (!containerRef.current || !window.google?.accounts?.id) return;
      if (initializedClientId !== clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: "popup",
          callback: (response: { credential?: string }) => {
            if (response?.credential) {
              onSuccess(response.credential);
            } else {
              onError?.("Google sign-in did not return a credential.");
            }
          },
        });
        initializedClientId = clientId;
      }
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "signin_with",
        width: 340,
      });
    };

    const loadGis = () => {
      if (window.google?.accounts?.id) {
        renderButton();
        return;
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
    };

    loadGis();

    return () => {
      cancelled = true;
    };
  }, [clientId, onSuccess, onError]);

  if (scriptError) {
    return (
      <p className="text-xs text-red-400">
        Google sign-in failed to load. Please try again later.
      </p>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
}
