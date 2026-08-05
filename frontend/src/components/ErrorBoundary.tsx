"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

const API_URL = "https://pubg-tournaments-backend.onrender.com/api";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    void fetch(`${API_URL}/error-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "Frontend / React Render",
        message: error.message || String(error),
        stack: error.stack,
        url: typeof window !== "undefined" ? window.location.href : "",
      }),
    }).catch(() => {
      // Silently ignore reporting failures.
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-lg font-bold text-text-primary">
            Something went wrong on this page.
          </p>
          <p className="max-w-md text-sm text-text-primary/60">
            Our team has been notified automatically. Please refresh the page or try again.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="mt-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-bg-primary transition-colors hover:bg-accent-hover"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}