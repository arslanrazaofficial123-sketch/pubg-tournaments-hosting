"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface AlertContextType {
  showAlert: (message: string, type?: ToastType) => void;
  showConfirm: (message: string, onConfirm: () => void, onCancel?: () => void) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

  const showAlert = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss toast after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const showConfirm = useCallback((message: string, onConfirm: () => void, onCancel?: () => void) => {
    setConfirm({ message, onConfirm, onCancel });
  }, []);

  const handleConfirmAction = () => {
    if (confirm) {
      confirm.onConfirm();
      setConfirm(null);
    }
  };

  const handleCancelAction = () => {
    if (confirm) {
      if (confirm.onCancel) confirm.onCancel();
      setConfirm(null);
    }
  };

  // Close confirm modal on Escape key
  useEffect(() => {
    if (!confirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancelAction();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirm]);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* Toast Notifications Container */}
      <div className="fixed top-4 right-4 z-[9999] flex w-full max-w-sm flex-col gap-2 p-4 sm:p-0">
        {toasts.map((toast) => {
          const Icon = {
            success: CheckCircle2,
            error: AlertCircle,
            info: Info,
            warning: AlertTriangle,
          }[toast.type];

          const typeStyles = {
            success: "border-emerald-500/30 bg-emerald-950/80 text-emerald-200 shadow-emerald-500/10",
            error: "border-red-500/30 bg-red-950/80 text-red-200 shadow-red-500/10",
            warning: "border-amber-500/30 bg-amber-950/80 text-amber-200 shadow-amber-500/10",
            info: "border-accent/30 bg-bg-secondary/90 text-text-primary shadow-accent/10",
          }[toast.type];

          const iconColor = {
            success: "text-emerald-400",
            error: "text-red-400",
            warning: "text-amber-400",
            info: "text-accent",
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-md transition-all duration-300 animate-fade-in-up",
                typeStyles
              )}
              role="alert"
            >
              <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", iconColor)} />
              <div className="flex-1 text-sm font-medium leading-5">{toast.message}</div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-current opacity-60 transition-opacity hover:opacity-100"
                aria-label="Dismiss toast"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog Modal */}
      {confirm && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-bg-primary/80 backdrop-blur-sm" onClick={handleCancelAction} />

          {/* Dialog Card */}
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-border bg-bg-secondary p-6 shadow-2xl shadow-accent/10 animate-fade-in-up">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-text-primary">Confirm Action</h3>
              <p className="text-sm text-text-primary/70 leading-relaxed">{confirm.message}</p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelAction}
                className="flex-1 rounded-lg border border-border bg-bg-primary px-4 py-2 text-sm font-semibold text-text-primary hover:bg-white/5 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 shadow-lg shadow-red-600/25 transition-colors duration-200"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}
